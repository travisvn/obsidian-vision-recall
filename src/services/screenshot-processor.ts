import { App, Notice, TFile, TFolder, normalizePath } from 'obsidian';
import Tesseract, { createWorker, Worker } from 'tesseract.js';
import { VisionRecallPluginSettings } from '@/types/settings-types';
import { VISION_LLM_PROMPT, callLLMAPI, llmSuggestTags } from '@/services/llm-service';
import VisionRecallPlugin from '@/main';
import { checkOCRText } from '@/lib/ocr-validation';
import { formatTags, tagsToCommaString } from '@/lib/tag-utils';
import { useQueueStore } from '@/stores/queueStore';
import { PluginLogger } from '@/lib/Logger';
import { base64EncodeImage } from '@/lib/encode';
import { visionLLMResponseCategoriesMap } from '@/data/reference';
import { shouldProcessImage } from '@/lib/image-utils';

export type DeleteScreenshotMetadataParams = {
  identity: string;
  identityType: 'id' | 'timestamp';
}

class ProgressManager {
  private notice: Notice | null = null;
  private progress: number = 0;

  constructor(private plugin: VisionRecallPlugin) { }

  setIsProcessingStopped(stopped: boolean) {
    if (stopped) {
      useQueueStore.getState().actions.stopProcessing();
    } else {
      useQueueStore.getState().actions.resumeProcessing();
    }
  }

  updateProgress(message: string, increment: number) {
    const { status, actions } = useQueueStore.getState();
    if (status.isStopped) return;

    this.progress = Math.min(this.progress + increment, 100);
    actions.updateStatus({
      isProcessing: true,
      message,
      progress: this.progress,
      minimized: this.plugin.dataManager.getMinimizedProgressDisplay()
    });

    if (this.notice) {
      this.notice.setMessage(message);
    }
  }

  startProgress(initialMessage: string) {
    this.progress = 0;
    useQueueStore.getState().actions.resumeProcessing();
    this.notice = new Notice(initialMessage, 0);
  }

  endProgress(success: boolean = true) {
    if (this.notice) {
      this.notice.hide();
    }

    const { status, actions } = useQueueStore.getState();
    if (!status.isStopped) {
      actions.updateStatus({
        isProcessing: false,
        message: '',
        progress: 0
      });
    }
    this.notice = null;
  }

  isStoppedByUser(): boolean {
    return useQueueStore.getState().status.isStopped;
  }
}

export class ScreenshotProcessor {
  app: App;
  plugin: VisionRecallPlugin;
  private worker: Worker | null = null;
  private progressManager: ProgressManager;
  private logger: PluginLogger;

  constructor(
    app: App,
    private settings: VisionRecallPluginSettings,
    plugin: VisionRecallPlugin
  ) {
    this.app = app;
    this.plugin = plugin;
    this.logger = plugin.logger;
    this.progressManager = new ProgressManager(plugin);
    // this.initializeWorker();
  }

  setIsProcessingStopped(stopped: boolean) {
    this.progressManager.setIsProcessingStopped(stopped);
  }

  async initializeWorker() {
    try {
      this.worker = await createWorker();
      this.logger.debug('Tesseract worker initialized.');
    } catch (error) {
      this.logger.error('Error initializing Tesseract worker:', error);
      new Notice('Failed to initialize OCR worker. See console for details.');
      this.worker = null;
    }
  }

  async terminateWorker() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.logger.debug('Tesseract worker terminated.');
    }
  }

  private async initializeProcessing(imageFile: TFile): Promise<boolean> {
    if (this.worker === null) {
      new Notice('Initializing Tesseract worker...');
      await this.initializeWorker();
    }

    // Remove redundant processing check since queue system handles this
    return true;
  }

  private async checkDuplicateFile(imageFile: TFile): Promise<boolean> {
    if (!this.plugin.settings.disableDuplicateFileCheck) {
      try {
        if (!(await shouldProcessImage(this.plugin, imageFile, true))) {
          this.logger.debug(`Skipping screenshot: ${imageFile.path} — Duplicate or already processed.`);
          return false;
        }
      } catch (error) {
        this.logger.error('Error checking if image should be processed:', error);
        return false;
      }
    }
    return true;
  }

  private async processImageContent(imageFile: TFile): Promise<{
    ocrText: string;
    visionLLMResponse: string;
    generatedNotes: string;
    extractedTags: string[];
    formattedTags: string;
  } | null> {
    this.progressManager.updateProgress('Performing OCR...', 10);
    if (this.progressManager.isStoppedByUser()) return null;

    const ocrText = await this.performOCR(imageFile);
    if (!ocrText || this.progressManager.isStoppedByUser()) return null;

    let validOCRText = await checkOCRText(ocrText);
    if (!validOCRText) validOCRText = '';
    if (this.progressManager.isStoppedByUser()) return null;

    this.progressManager.updateProgress('Analyzing image...', 30);
    if (this.progressManager.isStoppedByUser()) return null;

    const visionLLMResponse = await this.performVisionAnalysis(imageFile, validOCRText);
    if (!visionLLMResponse || this.progressManager.isStoppedByUser()) return null;

    this.progressManager.updateProgress('Generating notes...', 20);
    if (this.progressManager.isStoppedByUser()) return null;

    const generatedNotes = await this.generateNotes(validOCRText, visionLLMResponse);
    if (!generatedNotes || this.progressManager.isStoppedByUser()) return null;

    this.progressManager.updateProgress('Generating tags...', 20);
    if (this.progressManager.isStoppedByUser()) return null;

    const extractedTags = await this.generateTags(generatedNotes);
    if (this.progressManager.isStoppedByUser()) return null;

    const formattedTags = tagsToCommaString(formatTags(extractedTags));
    this.logger.debug('Formatted Tags:', formattedTags);

    return {
      ocrText: validOCRText,
      visionLLMResponse,
      generatedNotes,
      extractedTags,
      formattedTags
    };
  }

  private async prepareFilePaths(imageFile: TFile, skipUniqueName: boolean): Promise<{
    screenshotStorageFolder: string;
    uniqueName: string;
    uniqueScreenshotFilename: string;
    newScreenshotPath: string;
  }> {
    const screenshotStorageFolder = normalizePath(await this.plugin.getFolderFromSettingsKey('screenshotStorageFolderPath'));
    if (!await this.app.vault.adapter.exists(screenshotStorageFolder)) {
      await this.app.vault.adapter.mkdir(screenshotStorageFolder);
    }

    const timestamp = Date.now();
    let uniqueName = skipUniqueName ? imageFile.basename : `${imageFile.basename}-${timestamp}`;
    uniqueName = uniqueName.replace(/ /g, '_');
    const uniqueScreenshotFilename = `${uniqueName}.${imageFile.extension}`;
    const newScreenshotPath = normalizePath(`${screenshotStorageFolder}/${uniqueScreenshotFilename}`);

    return {
      screenshotStorageFolder,
      uniqueName,
      uniqueScreenshotFilename,
      newScreenshotPath
    };
  }

  async processScreenshot(imageFile: TFile, returnSuccess: boolean = false, skipUniqueName: boolean = false): Promise<boolean | void> {
    if (!await this.initializeProcessing(imageFile)) {
      return false;
    }

    this.progressManager.startProgress("Processing screenshot...");

    try {
      if (!await this.checkDuplicateFile(imageFile)) {
        this.progressManager.endProgress();
        this.plugin.dataManager.setCurrentlyProcessing(false);
        return false;
      }

      const entryId = crypto.randomUUID();
      const processedContent = await this.processImageContent(imageFile);
      if (!processedContent) {
        return false;
      }

      const {
        ocrText,
        visionLLMResponse,
        generatedNotes,
        extractedTags,
        formattedTags
      } = processedContent;

      const paths = await this.prepareFilePaths(imageFile, skipUniqueName);
      if (this.progressManager.isStoppedByUser()) return false;

      this.progressManager.updateProgress('Saving results...', 20);
      if (this.progressManager.isStoppedByUser()) return false;

      const noteInfo = await this.createObsidianNote(
        imageFile,
        paths.newScreenshotPath,
        ocrText,
        visionLLMResponse,
        generatedNotes,
        extractedTags,
        formattedTags,
        entryId,
        paths.uniqueName
      );
      if (!noteInfo || this.progressManager.isStoppedByUser()) return false;

      await this.saveScreenshotAndMetadata(
        imageFile,
        paths.newScreenshotPath,
        paths.uniqueName,
        paths.uniqueScreenshotFilename,
        ocrText,
        visionLLMResponse,
        generatedNotes,
        extractedTags,
        formattedTags,
        noteInfo,
        entryId
      );
      if (this.progressManager.isStoppedByUser()) return false;

      this.logger.debug('Screenshot processing completed.');
      this.progressManager.endProgress(true);

      // Update metadata
      await this.plugin.loadScreenshotMetadata();

      this.plugin.dataManager.setCurrentlyProcessing(false);
      return returnSuccess ? true : undefined;

    } catch (error) {
      this.logger.error('Error processing screenshot:', error);
      new Notice('Error processing screenshot. Please check console.');
      this.progressManager.endProgress(false);
      return returnSuccess ? false : undefined;
    } finally {
      this.plugin.dataManager.setCurrentlyProcessing(false);
    }
  }

  private async performOCR(imageFile: TFile): Promise<string | null> {
    if (!this.worker) {
      this.logger.warn('Tesseract worker not initialized. OCR will not be performed.');
      new Notice('OCR worker is not ready.');
      return null;
    }

    try {
      const imageBuffer = await this.app.vault.readBinary(imageFile);
      if (this.progressManager.isStoppedByUser()) return null;
      const result = await this.worker.recognize(
        imageBuffer as Tesseract.ImageLike
      );
      const ocrText = result.data.text;
      this.logger.debug('OCR Text:', ocrText ? ocrText.substring(0, 100) + '...' : 'No text extracted');
      return ocrText;
    } catch (error) {
      this.logger.error('OCR Error:', error);
      new Notice('OCR processing failed. See console for details.');
      return null;
    }
  }

  private async performVisionAnalysis(imageFile: TFile, ocrText: string): Promise<string | null> {
    try {
      const imageBuffer = await this.app.vault.readBinary(imageFile);
      const base64Image = base64EncodeImage(imageBuffer);

      const visionPayload = {
        model: this.settings.visionModelName,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: VISION_LLM_PROMPT },
              { type: "image_url", image_url: { url: `data:image/png;base64,${base64Image}`, detail: "high" } },
            ],
          }
        ],
        max_tokens: 300,
      };

      if (this.progressManager.isStoppedByUser()) return null;
      const visionLLMResponse = await callLLMAPI(
        this.settings,
        '/chat/completions',
        visionPayload
      );

      this.logger.debug('Vision LLM Response:', visionLLMResponse ? visionLLMResponse.substring(0, 200) + '...' : 'API call failed or no response');
      return visionLLMResponse;

    } catch (error) {
      this.logger.error('Vision LLM API Error:', error);
      new Notice('Vision LLM API call failed. See console for details.');
      return null;
    }
  }

  private async generateNotes(ocrText: string, visionLLMResponse: string): Promise<string | null> {
    try {
      let endpointPrompt = `The following text is from a screenshot. Summarize the text and identify key information.`;

      const visionLLMCategories = Object.keys(visionLLMResponseCategoriesMap);

      const visionLLMCategory = visionLLMCategories.find(category => visionLLMResponse.toLowerCase().includes(category));

      if (visionLLMCategory) {
        endpointPrompt = visionLLMResponseCategoriesMap[visionLLMCategory];
      }

      endpointPrompt += `\n\nOCR Text:\n${ocrText}\n\nVision Analysis:\n${visionLLMResponse}`

      const endpointPayload = {
        model: this.settings.endpointLlmModelName,
        messages: [
          { role: "user", content: endpointPrompt }
        ],
        max_tokens: this.settings.maxTokens,
      };

      if (this.progressManager.isStoppedByUser()) return null;
      const generatedNotes = await callLLMAPI(
        this.settings,
        '/chat/completions',
        endpointPayload
      );

      this.logger.debug('Generated Notes:', generatedNotes ? generatedNotes.substring(0, 300) + '...' : 'API call failed or no notes generated');
      return generatedNotes;

    } catch (error) {
      this.logger.error('Endpoint LLM API Error:', error);
      new Notice('Endpoint LLM API call failed. See console for details.');
      return null;
    }
  }

  private async generateTags(generatedNotes: string): Promise<string[]> {
    try {
      if (this.progressManager.isStoppedByUser()) return [];
      const extractedTags = await llmSuggestTags(this.settings, generatedNotes);
      this.logger.debug('LLM Suggested Tags:', extractedTags);
      return extractedTags;
    } catch (error) {
      this.logger.error('Tag Generation Error:', error);
      new Notice('Tag generation failed. See console for details.');
      return [];
    }
  }

  private async createObsidianNote(
    imageFile: TFile,
    newScreenshotPath: string,
    ocrText: string,
    visionLLMResponse: string,
    generatedNotes: string,
    extractedTags: string[],
    formattedTags: string,
    id: string,
    uniqueName: string
  ): Promise<{ notePath: string; noteTitle: string } | null> {
    try {
      const outputNotesFolder = normalizePath(await this.plugin.getFolderFromSettingsKey('outputNotesFolderPath'));

      const noteTitleBase = imageFile.basename;
      let noteTitle = `${noteTitleBase}-notes.md`;
      let notePath = normalizePath(`${outputNotesFolder}/${noteTitle}`);

      let counter = 1;
      while (this.app.vault.getAbstractFileByPath(notePath) && counter < 100) {
        noteTitle = `${noteTitleBase}-notes (${counter}).md`;
        notePath = normalizePath(`${outputNotesFolder}/${noteTitle}`);
        counter++;
      }

      if (counter >= 100) {
        new Notice('Failed to create note. Too many notes with the same name.');
        return null;
      }

      // Truncate text if needed
      const truncatedOcrText = this.settings.truncateOcrText > 0
        ? ocrText.substring(0, this.settings.truncateOcrText)
        : ocrText;

      const truncatedVisionLLMResponse = this.settings.truncateVisionLLMResponse > 0
        ? visionLLMResponse.substring(0, this.settings.truncateVisionLLMResponse)
        : visionLLMResponse;

      const ocrTitle = this.settings.truncateOcrText > 0
        ? `OCR Text (truncated to ${this.settings.truncateOcrText} characters)`
        : 'OCR Text';

      const visionTitle = this.settings.truncateVisionLLMResponse > 0
        ? `Vision LLM Context (truncated to ${this.settings.truncateVisionLLMResponse} characters)`
        : 'Vision LLM Context';

      // Main note content
      const noteContent = `# Notes from Screenshot: ${noteTitleBase}\n\n${generatedNotes}`;

      const linkingTag = `#${this.settings.tagPrefix}/${uniqueName}`;

      const metadataContent = `\n\n---\n*Screenshot Filename:* [[${newScreenshotPath}]]\n*${ocrTitle}*:\n\`\`\`\n${truncatedOcrText}...\n\`\`\`\n*${visionTitle}*:\n\`\`\`\n${truncatedVisionLLMResponse}...\n\`\`\`\n\n*Tags:* ${formattedTags}\n\n${linkingTag}\n`;

      const finalNoteContent = this.settings.includeMetadataInNote
        ? `${noteContent}\n\n${metadataContent}`
        : noteContent;

      if (this.progressManager.isStoppedByUser()) return null;
      // Write note file
      await this.app.vault.create(notePath, finalNoteContent);
      this.logger.debug(`Obsidian note created: ${notePath}`);
      new Notice(`Note created: ${noteTitle}`);

      return { notePath, noteTitle };
    } catch (error) {
      this.logger.error('Error creating Obsidian note:', error);
      new Notice('Error creating Obsidian note. See console for details.');
      return null;
    }
  }


  private async saveScreenshotAndMetadata(
    imageFile: TFile,
    newScreenshotPath: string,
    uniqueName: string,
    uniqueScreenshotFilename: string,
    ocrText: string,
    visionLLMResponse: string,
    generatedNotes: string,
    extractedTags: string[],
    formattedTags: string,
    noteInfo: { notePath: string; noteTitle: string },
    entryId: string
  ): Promise<void> {
    try {

      await this.app.vault.copy(imageFile, newScreenshotPath);
      this.logger.debug(`Screenshot saved to: ${newScreenshotPath}`);

      const metadataFilename = `${uniqueName}.json`;
      const metadataPath = normalizePath(`${await this.plugin.getFolderFromSettingsKey('screenshotStorageFolderPath')}/${metadataFilename}`);

      const linkingTag = `#${this.settings.tagPrefix}/${uniqueName}`;

      const metadata = {
        id: entryId,
        originalFilename: imageFile.name,
        screenshotFilename: uniqueScreenshotFilename,
        screenshotStoragePath: newScreenshotPath,
        notePath: noteInfo.notePath,
        noteTitle: noteInfo.noteTitle,
        ocrText,
        visionLLMResponse,
        generatedNotes,
        extractedTags: extractedTags,
        formattedTags: formattedTags,
        timestamp: new Date().toISOString(),
        metadataFilename: metadataFilename,
        metadataPath: metadataPath,
        uniqueName: uniqueName,
        uniqueTag: linkingTag
      };

      const dataStoreEntry = {
        ...metadata,
      }

      delete dataStoreEntry.generatedNotes;

      if (this.progressManager.isStoppedByUser()) return;
      await this.app.vault.create(metadataPath, JSON.stringify(metadata, null, 2));
      this.logger.debug(`Metadata saved to: ${metadataPath}`);

      // Update the metadata in the DataManager
      await this.plugin.dataManager.addOrUpdateEntry(dataStoreEntry);

    } catch (error) {
      this.logger.error('Error saving screenshot or metadata:', error);
      new Notice('Error saving screenshot or metadata. See console for details.');
    }
  }


  async deleteScreenshotMetadata(params: DeleteScreenshotMetadataParams): Promise<void> {
    const screenshotStorageFolder = normalizePath(this.settings.screenshotStorageFolderPath);

    let metadata = this.plugin.metadata;

    let metadataToDelete;
    if (params.identityType === 'id') {
      metadataToDelete = metadata.find(item => item.id === params.identity);
    } else if (params.identityType === 'timestamp') {
      metadataToDelete = metadata.find(item => item.timestamp === params.identity);
    }

    if (!metadataToDelete) {
      metadata = this.plugin.dataManager.getAllEntries();
      if (params.identityType === 'id') {
        metadataToDelete = metadata.find(item => item.id === params.identity);
      } else if (params.identityType === 'timestamp') {
        metadataToDelete = metadata.find(item => item.timestamp === params.identity);
      }
    }

    await this.plugin.dataManager.removeEntry(metadataToDelete.id);

    if (metadataToDelete) {
      const currentMetadata = metadataToDelete;
      this.logger.debug(`Current Metadata: ${JSON.stringify(currentMetadata, null, 2)}`);

      this.logger.debug(`Deleting metadata for ${params.identity}`);
      if (currentMetadata?.metadataPath) {
        await this.app.vault.adapter.trashLocal(currentMetadata.metadataPath);
      } else {
        const screenshotFilename = currentMetadata.screenshotFilename.split('.').slice(0, -1).join('.');
        const metadataFilename = `${screenshotFilename}.json`;

        const metadataPath = normalizePath(`${screenshotStorageFolder}/${metadataFilename}`);
        await this.app.vault.adapter.trashLocal(metadataPath);
      }

      if (currentMetadata?.screenshotStoragePath) {
        await this.app.vault.adapter.trashLocal(currentMetadata.screenshotStoragePath);
      }
    }
  }

  async updateScreenshotMetadata(updatedMetadata: any): Promise<void> {
    try {
      await this.plugin.dataManager.addOrUpdateEntry(updatedMetadata);
    } catch (error) {
      this.logger.error('Error updating screenshot metadata:', error);
      new Notice('Failed to update screenshot metadata. See console for details.');
      throw error;
    }
  }

  async updateScreenshotMetadataOriginal(updatedMetadata: any): Promise<void> {
    try {
      // Get the path to the metadata file
      const metadataPath = updatedMetadata.metadataPath;
      if (!metadataPath) {
        throw new Error('Metadata path not found in the metadata object');
      }

      // Read the existing metadata file
      const file = this.app.vault.getAbstractFileByPath(metadataPath);
      if (!file || !(file instanceof TFile)) {
        throw new Error(`Metadata file not found at path: ${metadataPath}`);
      }

      // Update the note content if notes were changed
      if (updatedMetadata.notePath) {
        const noteFile = this.app.vault.getAbstractFileByPath(updatedMetadata.notePath);
        if (noteFile instanceof TFile) {
          const currentNoteContent = await this.app.vault.read(noteFile);

          // Replace the tags section in the note
          const formattedTags = tagsToCommaString(formatTags(updatedMetadata.extractedTags));
          const updatedNoteContent = currentNoteContent.replace(
            /\*Tags:\*.*/,
            `*Tags:* ${formattedTags}`
          );

          // Replace the notes section (everything between the title and the first ---)
          const titleAndNotes = updatedNoteContent.split('---')[0];
          const restOfContent = updatedNoteContent.split('---').slice(1).join('---');
          const updatedTitleAndNotes = titleAndNotes.replace(
            /# Notes from Screenshot:.*?\n\n(.*?)\n\n/s,
            `# Notes from Screenshot: ${updatedMetadata.noteTitle.replace('.md', '')}\n\n${updatedMetadata.generatedNotes}\n\n`
          );
          const finalNoteContent = `${updatedTitleAndNotes}---${restOfContent}`;

          await this.app.vault.modify(noteFile, finalNoteContent);
        }
      }

      // Save the updated metadata to the JSON file
      await this.app.vault.modify(file, JSON.stringify(updatedMetadata, null, 2));

      new Notice('Screenshot metadata updated successfully');
    } catch (error) {
      this.logger.error('Error updating screenshot metadata:', error);
      new Notice('Failed to update screenshot metadata. See console for details.');
      throw error;
    }
  }

  private async handleClipboardImage(): Promise<{ blob: Blob; type: string } | null> {
    if (!navigator.clipboard || !navigator.clipboard.read) {
      new Notice('Clipboard API is not supported in this browser.');
      return null;
    }

    try {
      const clipboardItems = await navigator.clipboard.read();
      const imageItem = clipboardItems.find(item =>
        item.types.some(type => type.startsWith('image/'))
      );

      if (!imageItem) {
        new Notice('No image found in clipboard.');
        return null;
      }

      const imageType = imageItem.types.find(type => type.startsWith('image/')) || 'image/png';
      const blob = await imageItem.getType(imageType);
      return { blob, type: imageType };
    } catch (error) {
      this.logger.error('Error reading from clipboard:', error);
      new Notice('Failed to read image from clipboard.');
      return null;
    }
  }

  private async saveImageToVault(blob: Blob, type: string, folderPath: string): Promise<TFile | null> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
      const extension = type.split('/')[1];
      const fileName = `clipboard-image-${timestamp}.${extension}`;

      if (!await this.app.vault.adapter.exists(folderPath)) {
        await this.app.vault.adapter.mkdir(folderPath);
      }

      const filePath = normalizePath(`${folderPath}/${fileName}`);
      const arrayBuffer = await blob.arrayBuffer();

      return await this.app.vault.createBinary(filePath, new Uint8Array(arrayBuffer));
    } catch (error) {
      this.logger.error('Error saving image to vault:', error);
      new Notice('Failed to save image to vault.');
      return null;
    }
  }

  async uploadImageFromClipboard(onlyTempFile: boolean = false, returnFilePath: boolean = false): Promise<TFile | null> {
    const clipboardData = await this.handleClipboardImage();
    if (!clipboardData) return null;

    const folderPath = onlyTempFile
      ? await this.plugin.getFolderFromSettingsKey('tempFolderPath')
      : await this.plugin.getFolderFromSettingsKey('screenshotIntakeFolderPath');

    const file = await this.saveImageToVault(clipboardData.blob, clipboardData.type, folderPath);
    if (file) {
      new Notice('Image upload from clipboard complete.');
      return returnFilePath ? file : null;
    }
    return null;
  }

  async uploadAndProcessScreenshotFromClipboard(): Promise<void> {
    try {
      const { actions } = useQueueStore.getState();
      actions.updateStatus({
        message: 'Uploading from clipboard...',
        progress: 20
      });

      const file = await this.uploadImageFromClipboard(true, true);
      if (!file) {
        actions.updateStatus({
          message: '',
          progress: 0
        });
        return;
      }

      if (!this.plugin.settings.disableDuplicateFileCheck) {
        if (!(await shouldProcessImage(this.plugin, file, true))) {
          this.logger.debug(`Skipping screenshot: ${file.path} — Duplicate or already processed.`);
          return;
        }
      }

      // Add to queue and let queue system handle the processing
      this.plugin.processingQueue.addToQueue(file);

    } catch (error) {
      this.logger.error('Error uploading and processing screenshot from clipboard:', error);
      new Notice('Failed to upload and process screenshot from clipboard.');
    }
  }

  async deleteFile(filePath: string) {
    await this.app.vault.adapter.trashLocal(filePath);
  }

  async processIntakeFolderAuto() {
    const intakeDir = await this.plugin.getFolderFromSettingsKey('screenshotIntakeFolderPath');

    if (!intakeDir) {
      this.plugin.logger.warn('Intake directory not configured');
      return;
    }

    const normalizedIntakeDir = normalizePath(intakeDir);
    const allFiles = this.plugin.app.vault.getFiles();

    const files = allFiles.filter(file => {
      const ext = file.extension.toLowerCase();
      return file.path.startsWith(normalizedIntakeDir) &&
        ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'heif', 'avif'].includes(ext);
    });

    if (files.length > 0) {
      for (const file of files) {
        if (file instanceof TFile) {
          if (await shouldProcessImage(this.plugin, file)) {
            this.plugin.processingQueue.addToQueue(file);
          }
        }
      }
    }
  }

  async processIntakeFolder() {
    let notice = new Notice("Running screenshot intake...", 0);

    const folderPath = await this.plugin.getFolderFromSettingsKey('screenshotIntakeFolderPath');
    const files = this.app.vault.getFolderByPath(folderPath);
    if (files instanceof TFolder) {
      for (const file of files.children) {
        if (file instanceof TFile) {
          this.plugin.processingQueue.addToQueue(file);
        }
      }
    }

    if (notice) {
      notice.hide();
    }

    new Notice('Screenshots have been added to the processing queue.');
  }
} 
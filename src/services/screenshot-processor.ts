import { App, FileManager, Notice, TFile, TFolder, arrayBufferToBase64, normalizePath } from 'obsidian';
import Tesseract, { createWorker, Worker } from 'tesseract.js';
import { VisionRecallPluginSettings } from '@/types/settings-types';
import { DEFAULT_TAGS_AND_TITLE, TagsAndTitle, VISION_LLM_PROMPT, callLLMAPI, getNotesLLMPrompt, getVisionLLMPrompt } from '@/services/llm-service';
import VisionRecallPlugin from '@/main';
import { checkOCRText } from '@/lib/ocr-validation';
import { formatTags, sanitizeObsidianTag, tagsToCommaString } from '@/lib/tag-utils';
import { useQueueStore } from '@/stores/queueStore';
import { visionLLMResponseCategoriesMap } from '@/data/reference';
import { computeFileHash, shouldProcessImage } from '@/lib/image-utils';
import { sanitizeFilename, sanitizeObsidianTitle } from './shared-functions';
import { generateTagsWithRetries } from './tag-service';
import { IMAGE_EXTENSIONS } from '@/constants';
import { cleanOCRResultLanguageSpecific, getLanguagePromptModifierIfIndicated, getLanguageSetting } from '@/lib/languages';

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
  settings: VisionRecallPluginSettings;
  tesseractLanguage: string | null;
  private worker: Worker | null = null;
  private progressManager: ProgressManager;
  // private logger: PluginLogger;

  constructor(
    app: App,
    settings: VisionRecallPluginSettings,
    plugin: VisionRecallPlugin
  ) {
    this.app = app;
    this.plugin = plugin;
    this.settings = settings;
    this.tesseractLanguage = settings.addLanguageConvertToPrompt ? settings.tesseractLanguage : 'eng';
    // this.plugin.logger = plugin.logger;
    this.progressManager = new ProgressManager(plugin);
    // this.initializeWorker();
  }

  setIsProcessingStopped(stopped: boolean) {
    this.progressManager.setIsProcessingStopped(stopped);
  }

  async initializeWorker() {
    let currentTesseractLanguage = this.settings.addLanguageConvertToPrompt ? this.settings.tesseractLanguage : 'eng';
    try {
      this.worker = await createWorker(currentTesseractLanguage);
      this.plugin.logger.debug('Tesseract worker initialized.');
      this.tesseractLanguage = currentTesseractLanguage;
    } catch (error) {
      this.plugin.logger.error('Error initializing Tesseract worker:', error);
      new Notice('Failed to initialize OCR worker. See console for details.');
      this.worker = null;
    }
  }

  async terminateWorker() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.plugin.logger.debug('Tesseract worker terminated.');
    }
  }

  async reinitializeWorker() {
    await this.terminateWorker();
    await this.initializeWorker();
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
          this.plugin.logger.debug(`Skipping screenshot: ${imageFile.path} — Duplicate or already processed.`);
          return false;
        }
      } catch (error) {
        this.plugin.logger.error('Error checking if image should be processed:', error);
        return false;
      }
    }
    return true;
  }

  private async processImageContent(imageFile: TFile): Promise<{
    ocrText: string;
    visionLLMResponse: string;
    generatedNotes: string;
    tagsAndTitle: TagsAndTitle;
    formattedTags: string;
  } | null> {
    const currentLanguageSetting = getLanguageSetting(this.settings);
    this.plugin.logger.debug('Current language setting:', currentLanguageSetting);

    this.progressManager.updateProgress('Performing OCR...', 10);
    if (this.progressManager.isStoppedByUser()) return null;

    let ocrText = await this.performOCR(imageFile, currentLanguageSetting);
    if (!ocrText || this.progressManager.isStoppedByUser()) return null;

    ocrText = cleanOCRResultLanguageSpecific(ocrText, currentLanguageSetting || 'eng') || '';
    this.plugin.logger.debug('ocrText (after cleaning)', ocrText);
    if (!ocrText) return null;

    let validOCRText = await checkOCRText(ocrText, currentLanguageSetting || 'eng');
    if (!validOCRText) validOCRText = '';
    if (this.progressManager.isStoppedByUser()) return null;

    this.progressManager.updateProgress('Analyzing image...', 30);
    if (this.progressManager.isStoppedByUser()) return null;

    const visionLLMResponse = await this.performVisionAnalysis(imageFile, validOCRText, this.settings.tesseractLanguage);
    if (!visionLLMResponse || this.progressManager.isStoppedByUser()) return null;

    this.progressManager.updateProgress('Generating notes...', 20);
    if (this.progressManager.isStoppedByUser()) return null;

    const generatedNotes = await this.generateNotes(validOCRText, visionLLMResponse, this.settings);
    if (!generatedNotes || this.progressManager.isStoppedByUser()) return null;

    this.progressManager.updateProgress('Generating tags...', 20);
    if (this.progressManager.isStoppedByUser()) return null;

    const tagsAndTitle = await this.generateTags(generatedNotes);
    if (this.progressManager.isStoppedByUser()) return null;

    const formattedTags = tagsToCommaString(formatTags(tagsAndTitle.tags));
    this.plugin.logger.debug('Formatted tags:', formattedTags);

    return {
      ocrText: validOCRText,
      visionLLMResponse,
      generatedNotes,
      tagsAndTitle,
      formattedTags
    };
  }

  private async prepareFilePaths(imageFile: TFile, skipUniqueName: boolean, noteTitle: string): Promise<{
    screenshotStorageFolder: string;
    uniqueName: string;
    uniqueScreenshotFilename: string;
    newScreenshotPath: string;
  }> {
    const screenshotStorageFolder = normalizePath(await this.plugin.getFolderFromSettingsKey('screenshotStorageFolderPath'));
    const screenshotStorageFolderExists = this.app.vault.getFolderByPath(screenshotStorageFolder);
    if (!screenshotStorageFolderExists) {
      await this.app.vault.createFolder(screenshotStorageFolder);
    }

    // const timestamp = Date.now();
    // let uniqueName = skipUniqueName ? imageFile.basename : `${imageFile.basename}-${timestamp}`;
    // uniqueName = uniqueName.replace(/ /g, '_');
    const uniqueName = sanitizeFilename(noteTitle).replace(/ /g, '_');
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
        tagsAndTitle,
        formattedTags
      } = processedContent;

      const noteTitle = await this.generateNoteTitle(imageFile, tagsAndTitle);
      if (!noteTitle || this.progressManager.isStoppedByUser()) return false;

      const paths = await this.prepareFilePaths(imageFile, skipUniqueName, noteTitle);
      if (this.progressManager.isStoppedByUser()) return false;

      this.progressManager.updateProgress('Saving results...', 20);
      if (this.progressManager.isStoppedByUser()) return false;

      const tagPath = sanitizeObsidianTag(paths.uniqueName, this.settings);
      const linkingTag = `#${this.settings.tagPrefix}/${tagPath}`;

      const noteInfo = await this.createObsidianNote(
        imageFile,
        paths.newScreenshotPath,
        ocrText,
        visionLLMResponse,
        generatedNotes,
        tagsAndTitle,
        formattedTags,
        entryId,
        paths.uniqueName,
        linkingTag
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
        tagsAndTitle,
        formattedTags,
        noteInfo,
        entryId,
        linkingTag
      );
      if (this.progressManager.isStoppedByUser()) return false;

      this.plugin.logger.debug('Screenshot processing completed.');
      this.progressManager.endProgress(true);

      // Update metadata
      await this.plugin.loadScreenshotMetadata();

      this.plugin.dataManager.setCurrentlyProcessing(false);
      return returnSuccess ? true : undefined;

    } catch (error) {
      this.plugin.logger.error('Error processing screenshot:', error);
      new Notice('Error processing screenshot. Please check console.');
      this.progressManager.endProgress(false);
      return returnSuccess ? false : undefined;
    } finally {
      this.plugin.dataManager.setCurrentlyProcessing(false);
    }
  }

  private async performOCR(imageFile: TFile, language: string | null = null): Promise<string | null> {
    if (!this.worker) {
      this.plugin.logger.warn('Tesseract worker not initialized. OCR will not be performed.');
      new Notice('OCR worker is not ready.');
      return null;
    }

    if ((language != null && language != this.tesseractLanguage) || (language == null && this.tesseractLanguage != 'eng')) {
      this.plugin.logger.warn('Tesseract language mismatch. Reinitializing Tesseract worker.');
      await this.reinitializeWorker();
    }

    try {
      const imageBuffer = await this.app.vault.readBinary(imageFile);
      if (this.progressManager.isStoppedByUser()) return null;
      const result = await this.worker.recognize(
        imageBuffer as Tesseract.ImageLike
      );
      const ocrText = result.data.text;
      this.plugin.logger.debug('OCR text:', ocrText ? ocrText.substring(0, 100) + '...' : 'No text extracted');
      return ocrText;
    } catch (error) {
      this.plugin.logger.error('OCR error:', error);
      new Notice('OCR processing failed. See console for details.');
      return null;
    }
  }

  private async performVisionAnalysis(imageFile: TFile, ocrText: string, language: string | null = null): Promise<string | null> {
    try {
      const imageBuffer = await this.app.vault.readBinary(imageFile);
      const base64Image = arrayBufferToBase64(imageBuffer);

      let languagePromptModifier = '';
      if (language) {
        // languagePromptModifier = `\n\nThe response should be in ${language}.`;
        languagePromptModifier = getLanguagePromptModifierIfIndicated(this.settings, true);
      }

      let textPayload = getVisionLLMPrompt(this.plugin.dataManager.getConfig()) + languagePromptModifier;
      this.plugin.logger.debug('Vision LLM prompt:', textPayload);

      const visionPayload = {
        model: this.settings.visionModelName,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: textPayload },
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

      this.plugin.logger.debug('Vision LLM response:', visionLLMResponse ? visionLLMResponse.substring(0, 200) + '...' : 'API call failed or no response');
      return visionLLMResponse;

    } catch (error) {
      this.plugin.logger.error('Vision LLM API error:', error);
      new Notice('Vision LLM API call failed. See console for details.');
      return null;
    }
  }

  private async generateNotes(ocrText: string, visionLLMResponse: string, settings: VisionRecallPluginSettings): Promise<string | null> {
    try {
      const config = this.plugin.dataManager.getConfig();
      const languagePromptModifier = getLanguagePromptModifierIfIndicated(settings, true);

      let endpointPrompt = getNotesLLMPrompt(config);

      if (config.enableCategoryDetection) {
        const visionLLMCategories = Object.keys(visionLLMResponseCategoriesMap);

        const visionLLMCategory = visionLLMCategories.find(category => visionLLMResponse.toLowerCase().includes(category));

        if (visionLLMCategory) {
          endpointPrompt = visionLLMResponseCategoriesMap[visionLLMCategory];
        }
      }

      this.plugin.logger.debug('Generate Notes LLM prompt (without added language modifier, OCR text, or vision analysis that are added later):', endpointPrompt);

      endpointPrompt += `${languagePromptModifier}\n\nOCR text:\n${ocrText}\n\nVision analysis:\n${visionLLMResponse}`

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

      this.plugin.logger.debug('Generated notes:', generatedNotes ? generatedNotes.substring(0, 300) + '...' : 'API call failed or no notes generated');

      return generatedNotes;
    } catch (error) {
      this.plugin.logger.error('Endpoint LLM API error:', error);
      new Notice('Endpoint LLM API call failed. See console for details.');
      return null;
    }
  }

  private async generateTags(generatedNotes: string): Promise<TagsAndTitle> {
    try {
      if (this.progressManager.isStoppedByUser()) return DEFAULT_TAGS_AND_TITLE;
      // const tagsAndTitle = await llmSuggestTagsAndTitle(this.settings, generatedNotes);
      const tagsAndTitle = await generateTagsWithRetries(generatedNotes, this.settings);
      this.plugin.logger.debug('LLM suggested tags:', tagsAndTitle);
      return tagsAndTitle;
    } catch (error) {
      this.plugin.logger.error('Tag generation error:', error);
      new Notice('Tag generation failed. See console for details.');
      return DEFAULT_TAGS_AND_TITLE;
    }
  }

  private async generateNoteTitle(imageFile: TFile, tagsAndTitle: TagsAndTitle): Promise<string | null> {
    try {
      const outputNotesFolder = normalizePath(await this.plugin.getFolderFromSettingsKey('outputNotesFolderPath'));

      const noteTitle = sanitizeFilename(tagsAndTitle.title || imageFile.basename);
      let noteFileName = `${noteTitle} Notes`;
      let notePath = normalizePath(`${outputNotesFolder}/${noteFileName}.md`);

      let counter = 1;
      while (this.app.vault.getAbstractFileByPath(notePath) && counter < 100) {
        noteFileName = `${noteTitle} Notes (${counter})`;
        notePath = normalizePath(`${outputNotesFolder}/${noteFileName}.md`);
        counter++;
      }

      if (counter >= 100) {
        new Notice('Failed to create note. Too many notes with the same name.');
        return null;
      }

      return noteFileName.replace('.md', '');
    } catch (error) {
      this.plugin.logger.error('Error generating note title:', error);
      new Notice('Error generating note title. See console for details.');
      return null;
    }
  }

  private async createObsidianNote(
    imageFile: TFile,
    newScreenshotPath: string,
    ocrText: string,
    visionLLMResponse: string,
    generatedNotes: string,
    tagsAndTitle: TagsAndTitle,
    formattedTags: string,
    id: string,
    uniqueName: string,
    linkingTag: string
  ): Promise<{ notePath: string; noteTitle: string } | null> {
    try {
      const outputNotesFolder = normalizePath(await this.plugin.getFolderFromSettingsKey('outputNotesFolderPath'));

      const noteTitleBase = sanitizeObsidianTitle(tagsAndTitle.title || imageFile.basename);
      let noteTitle = `${noteTitleBase} Notes.md`;
      let notePath = normalizePath(`${outputNotesFolder}/${noteTitle}`);

      let counter = 1;
      while (this.app.vault.getAbstractFileByPath(notePath) && counter < 100) {
        this.plugin.logger.debug(`Note title already exists: ${noteTitle}. Incrementing counter and trying again.`);
        noteTitle = `${noteTitleBase} Notes (${counter}).md`;
        notePath = normalizePath(`${outputNotesFolder}/${noteTitle}`);
        counter++;
      }

      if (counter >= 100) {
        new Notice('Failed to create note. Too many notes with the same name.');
        return null;
      }

      const titleWithoutExtension = noteTitle.replace('.md', '').replace(/ /g, '_');
      const uniqueTag = `#${this.settings.tagPrefix}/${titleWithoutExtension}`;

      // Truncate text if needed
      const truncatedOcrText = this.settings.truncateOcrText > 0
        ? ocrText.substring(0, this.settings.truncateOcrText)
        : ocrText;

      const truncatedVisionLLMResponse = this.settings.truncateVisionLLMResponse > 0
        ? visionLLMResponse.substring(0, this.settings.truncateVisionLLMResponse)
        : visionLLMResponse;

      const ocrTitle = this.settings.truncateOcrText > 0
        ? `OCR text (truncated to ${this.settings.truncateOcrText} characters)`
        : 'OCR text';

      const visionTitle = this.settings.truncateVisionLLMResponse > 0
        ? `Vision LLM context (truncated to ${this.settings.truncateVisionLLMResponse} characters)`
        : 'Vision LLM context';

      // Main note content
      const noteContent = `# Notes from screenshot: ${noteTitleBase}\n\n${generatedNotes}`;

      const metadataContent = `\n\n---\n*Screenshot filename:* [[${newScreenshotPath}]]\n*${ocrTitle}*:\n\`\`\`\n${truncatedOcrText}...\n\`\`\`\n*${visionTitle}*:\n\`\`\`\n${truncatedVisionLLMResponse}...\n\`\`\`\n\n*Tags:* ${formattedTags}\n\n${uniqueTag}\n`;

      const finalNoteContent = this.settings.includeMetadataInNote
        ? `${noteContent}\n\n${metadataContent}`
        : noteContent;

      if (this.progressManager.isStoppedByUser()) return null;
      // Write note file
      await this.app.vault.create(notePath, finalNoteContent);
      this.plugin.logger.debug(`Obsidian note created: ${notePath}`);
      new Notice(`Note created: ${noteTitle}`);

      return { notePath, noteTitle };
    } catch (error) {
      this.plugin.logger.error('Error creating Obsidian note:', error);
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
    tagsAndTitle: TagsAndTitle,
    formattedTags: string,
    noteInfo: { notePath: string; noteTitle: string },
    entryId: string,
    linkingTag: string
  ): Promise<void> {
    try {

      await this.app.vault.copy(imageFile, newScreenshotPath);
      this.plugin.logger.debug(`Screenshot saved to: ${newScreenshotPath}`);

      const hash = await computeFileHash(this.plugin, imageFile);

      const metadataFilename = `${uniqueName}.json`;
      const metadataPath = normalizePath(`${await this.plugin.getFolderFromSettingsKey('screenshotStorageFolderPath')}/${metadataFilename}`);

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
        title: tagsAndTitle.title,
        extractedTags: tagsAndTitle.tags,
        formattedTags: formattedTags,
        timestamp: new Date().toISOString(),
        metadataFilename: metadataFilename,
        metadataPath: metadataPath,
        uniqueName: uniqueName,
        uniqueTag: linkingTag,
        hash: hash,
        size: imageFile.stat.size,
        mtime: imageFile.stat.mtime
      };

      const dataStoreEntry = {
        ...metadata,
      }

      delete dataStoreEntry.generatedNotes;

      if (this.progressManager.isStoppedByUser()) return;
      await this.app.vault.create(metadataPath, JSON.stringify(metadata, null, 2));
      this.plugin.logger.debug(`Metadata saved to: ${metadataPath}`);

      // Update the metadata in the DataManager
      await this.plugin.dataManager.addOrUpdateEntry(dataStoreEntry);

    } catch (error) {
      this.plugin.logger.error('Error saving screenshot or metadata:', error);
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
      this.plugin.logger.debug(`Current Metadata: ${JSON.stringify(currentMetadata, null, 2)}`);

      this.plugin.logger.debug(`Deleting metadata for ${params.identity}`);
      if (currentMetadata?.metadataPath) {
        const metadataFile = this.app.vault.getAbstractFileByPath(currentMetadata.metadataPath);
        if (metadataFile instanceof TFile) {
          await this.app.fileManager.trashFile(metadataFile);
        }
      } else {
        const screenshotFilename = currentMetadata.screenshotFilename.split('.').slice(0, -1).join('.');
        const metadataFilename = `${screenshotFilename}.json`;

        const metadataPath = normalizePath(`${screenshotStorageFolder}/${metadataFilename}`);
        const metadataFile = this.app.vault.getAbstractFileByPath(metadataPath);
        if (metadataFile instanceof TFile) {
          await this.app.fileManager.trashFile(metadataFile);
        }
      }

      if (currentMetadata?.screenshotStoragePath) {
        const screenshotFile = this.app.vault.getAbstractFileByPath(currentMetadata.screenshotStoragePath);
        if (screenshotFile instanceof TFile) {
          await this.app.fileManager.trashFile(screenshotFile);
        }
      }
    }
  }

  async updateScreenshotMetadata(updatedMetadata: any): Promise<void> {
    try {
      await this.plugin.dataManager.addOrUpdateEntry(updatedMetadata);
    } catch (error) {
      this.plugin.logger.error('Error updating screenshot metadata:', error);
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
          this.app.vault.process(noteFile, (data: string) => {
            const currentNoteContent = data;

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
              /# Notes from screenshot:.*?\n\n(.*?)\n\n/s,
              `# Notes from screenshot: ${updatedMetadata.noteTitle.replace('.md', '')}\n\n${updatedMetadata.generatedNotes}\n\n`
            );
            const finalNoteContent = `${updatedTitleAndNotes}---${restOfContent}`;

            return finalNoteContent;
          });
        }
      }

      // Save the updated metadata to the JSON file
      this.app.vault.process(file, (data: string) => {
        return JSON.stringify(updatedMetadata, null, 2);
      });

      new Notice('Screenshot metadata updated successfully');
    } catch (error) {
      this.plugin.logger.error('Error updating screenshot metadata:', error);
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
      this.plugin.logger.error('Error reading from clipboard:', error);
      new Notice('Failed to read image from clipboard.');
      return null;
    }
  }

  private async saveImageToVault(blob: Blob, type: string, folderPath: string): Promise<TFile | null> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
      const extension = type.split('/')[1];
      const fileName = `clipboard-image-${timestamp}.${extension}`;

      const screenshotStorageFolder = this.app.vault.getFolderByPath(folderPath);
      if (!screenshotStorageFolder) {
        await this.app.vault.createFolder(folderPath);
      }

      const filePath = normalizePath(`${folderPath}/${fileName}`);
      const arrayBuffer = await blob.arrayBuffer();

      return await this.app.vault.createBinary(filePath, new Uint8Array(arrayBuffer));
    } catch (error) {
      this.plugin.logger.error('Error saving image to vault:', error);
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
          progress: 0,
          isProcessing: false
        });
        return;
      }

      if (!this.plugin.settings.disableDuplicateFileCheck) {
        if (!(await shouldProcessImage(this.plugin, file, true))) {
          this.plugin.logger.debug(`Skipping screenshot: ${file.path} — Duplicate or already processed.`);
          return;
        }
      }

      // Add to queue and let queue system handle the processing
      this.plugin.processingQueue.addToQueue(file);

    } catch (error) {
      this.plugin.logger.error('Error uploading and processing screenshot from clipboard:', error);
      new Notice('Failed to upload and process screenshot from clipboard.');
    }
  }

  async deleteFile(filePath: string) {
    const fileToDelete = this.app.vault.getAbstractFileByPath(filePath);
    if (fileToDelete instanceof TFile) {
      await this.app.fileManager.trashFile(fileToDelete);
    }
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
        IMAGE_EXTENSIONS.includes(ext);
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

    let addedToQueue = 0;

    if (files instanceof TFolder) {
      for (const file of files.children) {
        if (file instanceof TFile) {
          this.plugin.processingQueue.addToQueue(file);
          addedToQueue++;
        }
      }
    }

    if (notice) {
      notice.hide();
    }

    if (addedToQueue > 0) {
      new Notice(`${addedToQueue} screenshots have been added to the processing queue.`);
    } else {
      new Notice('No screenshots found in the intake folder.');
    }
  }
} 
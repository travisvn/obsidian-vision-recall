import VisionRecallPlugin from '@/main';
import { App, PluginSettingTab, Setting } from 'obsidian';

export default class VisionRecallSettingTab extends PluginSettingTab {
  plugin: VisionRecallPlugin;

  constructor(app: App, plugin: VisionRecallPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl).setName('LLM').setHeading();

    new Setting(containerEl)
      .setName('LLM provider')
      .setDesc('Which provider to use for LLM calls: OpenAI or Ollama.')
      .addDropdown(dropdown => dropdown
        .addOptions({
          'openai': 'OpenAI',
          'ollama': 'Ollama'
        })
        .setValue(this.plugin.settings.llmProvider)
        .onChange(async (value: 'openai' | 'ollama') => {
          this.plugin.settings.llmProvider = value;
          await this.plugin.saveSettings();
          this.display();
        })
      );

    if (this.plugin.settings.llmProvider != 'ollama') {
      new Setting(containerEl)
        .setName('API key')
        .setDesc('OpenAI API key (not needed for Ollama).')
        .addText(text => text
          .setPlaceholder('Enter your API key')
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
          })
        );
    }

    new Setting(containerEl)
      .setName('API base URL')
      .setDesc('Custom API base URL for OpenAI-compatible endpoints or Ollama. Leave empty for defaults.')
      .addText(text => text
        .setPlaceholder('Leave empty for default')
        .setValue(this.plugin.settings.apiBaseUrl)
        .onChange(async (value) => {
          this.plugin.settings.apiBaseUrl = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Vision model name')
      .setDesc('Name of the Vision LLM model for screenshot analysis.')
      .addText(text => text
        .setPlaceholder('e.g., gpt-4o-mini')
        .setValue(this.plugin.settings.visionModelName)
        .onChange(async (value) => {
          this.plugin.settings.visionModelName = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Endpoint LLM model name')
      .setDesc('Name of the LLM model for generating notes from OCR text & vision LLM response.')
      .addText(text => text
        .setPlaceholder('e.g., gpt-4o-mini')
        .setValue(this.plugin.settings.endpointLlmModelName)
        .onChange(async (value) => {
          this.plugin.settings.endpointLlmModelName = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl).setName('Storage').setHeading();

    new Setting(containerEl)
      .setName('Use parent folder')
      .setDesc('Use a parent folder to store screenshots and notes.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.useParentFolder)
        .onChange(async (value) => {
          this.plugin.settings.useParentFolder = value;
          await this.plugin.saveSettings();
          this.display();
        })
      );

    if (this.plugin.settings.useParentFolder) {
      new Setting(containerEl)
        .setName('Parent folder path')
        .setDesc('Path to the parent folder. Optional if not using parent folder organization.')
        .addText(text => text
          .setPlaceholder('e.g., VisionRecall')
          .setValue(this.plugin.settings.parentFolderPath)
          .onChange(async (value) => {
            this.plugin.settings.parentFolderPath = value;
            await this.plugin.saveSettings();
          })
        );
    }

    new Setting(containerEl)
      .setName('Add prefix to folder names')
      .setDesc('Add a prefix to the folder names.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.addPrefixToFolderNames)
        .onChange(async (value) => {
          this.plugin.settings.addPrefixToFolderNames = value;
          await this.plugin.saveSettings();
          this.display();
        })
      );

    if (this.plugin.settings.addPrefixToFolderNames) {
      new Setting(containerEl)
        .setName('Prefix to add to folder names')
        .setDesc('Prefix for folder names. Optional.')
        .addText(text => text
          .setPlaceholder('e.g., VisionRecall-')
          .setValue(this.plugin.settings.prefixToAddToFolderNames)
          .onChange(async (value) => {
            this.plugin.settings.prefixToAddToFolderNames = value;
            await this.plugin.saveSettings();
          })
        );
    }

    new Setting(containerEl)
      .setName('Screenshot storage folder')
      .setDesc('Folder within your vault for storing original screenshot files.')
      .addText(text => text
        .setPlaceholder('e.g., VisionRecall-Screenshots or Screenshots')
        .setValue(this.plugin.settings.screenshotStorageFolderPath)
        .onChange(async (value) => {
          this.plugin.settings.screenshotStorageFolderPath = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Screenshot intake folder')
      .setDesc('Folder for placing screenshots for automatic processing.')
      .addText(text => text
        .setPlaceholder('e.g., VisionRecall-Intake or Intake')
        .setValue(this.plugin.settings.screenshotIntakeFolderPath)
        .onChange(async (value) => {
          this.plugin.settings.screenshotIntakeFolderPath = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Output notes folder')
      .setDesc('Folder for generated Obsidian notes.')
      .addText(text => text
        .setPlaceholder('e.g., VisionRecall-Notes or Notes')
        .setValue(this.plugin.settings.outputNotesFolderPath)
        .onChange(async (value) => {
          this.plugin.settings.outputNotesFolderPath = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Temp folder')
      .setDesc('Folder for temporary files.')
      .addText(text => text
        .setPlaceholder('e.g., VisionRecall-Temp or Temp')
        .setValue(this.plugin.settings.tempFolderPath)
        .onChange(async (value) => {
          this.plugin.settings.tempFolderPath = value;
          await this.plugin.saveSettings();
        })
      );



    new Setting(containerEl).setName('Output note').setHeading();

    new Setting(containerEl)
      .setName('Max response tokens')
      .setDesc('Maximum token limit for LLM responses (default: 500).')
      .addText(text => text
        .setPlaceholder('500')
        .setValue(this.plugin.settings.maxTokens.toString())
        .onChange(async (value) => {
          const parsedValue = parseInt(value);
          if (!isNaN(parsedValue)) {
            this.plugin.settings.maxTokens = parsedValue;
            await this.plugin.saveSettings();
          }
        })
      );

    new Setting(containerEl)
      .setName('Truncate OCR text')
      .setDesc('Character limit for OCR text display. 0 to disable truncation.')
      .addText(text => text
        .setPlaceholder('500')
        .setValue(this.plugin.settings.truncateOcrText.toString())
        .onChange(async (value) => {
          this.plugin.settings.truncateOcrText = parseInt(value);
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Truncate Vision LLM response')
      .setDesc('Character limit for Vision LLM response display. 0 to disable truncation.')
      .addText(text => text
        .setPlaceholder('500')
        .setValue(this.plugin.settings.truncateVisionLLMResponse.toString())
        .onChange(async (value) => {
          this.plugin.settings.truncateVisionLLMResponse = parseInt(value);
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Include metadata in note')
      .setDesc('Whether to include metadata in the Obsidian note.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.includeMetadataInNote)
        .onChange(async (value) => {
          this.plugin.settings.includeMetadataInNote = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Linking tag prefix')
      .setDesc('Parent prefix for note-linking tags.')
      .addText(text => text
        .setPlaceholder('e.g., VisionRecall')
        .setValue(this.plugin.settings.tagPrefix)
        .onChange(async (value) => {
          this.plugin.settings.tagPrefix = value;
          await this.plugin.saveSettings();
        })
      );



    new Setting(containerEl).setName('Other').setHeading();

    new Setting(containerEl)
      .setName('Disable duplicate file check')
      .setDesc('Disable the duplicate file check (which is based on a hash of the file content).')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.disableDuplicateFileCheck)
        .onChange(async (value) => {
          this.plugin.settings.disableDuplicateFileCheck = value;
          await this.plugin.saveSettings();
        })
      );


    new Setting(containerEl)
      .setName('Show stop button in status bar')
      .setDesc('Status bar button for stopping processing.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showStatusBarButton)
        .onChange(async (value) => {
          this.plugin.settings.showStatusBarButton = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Enable debug mode')
      .setDesc('Detailed debugging information in console.')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.debugMode)
          .onChange(async (value) => {
            this.plugin.settings.debugMode = value;
            await this.plugin.saveSettings();
          }));

    new Setting(containerEl)
      .setName('Enable deep link screenshot intake')
      .setDesc('Screenshot intake functionality via deep links.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.allowDeepLinkScreenshotIntake)
        .onChange(async (value) => {
          this.plugin.settings.allowDeepLinkScreenshotIntake = value;
          await this.plugin.saveSettings();
        })
      );
  }
}
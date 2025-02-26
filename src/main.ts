import { normalizePath, Notice, Plugin, TAbstractFile, TFile, WorkspaceLeaf } from 'obsidian';
import MainView, { MAIN_VIEW_TYPE } from '@/views/MainView';
import { PLUGIN_ICON, PLUGIN_NAME } from '@/constants';
import ScreenshotKBSettingTab from '@/settings/SettingsPage';
import { VisionRecallPluginSettings, DEFAULT_SETTINGS } from '@/types/settings-types';
import { ScreenshotProcessor } from '@/services/screenshot-processor';
import "@/styles/global.scss";
import { DataManager, StoredData } from './data/DataManager';
import { PluginLogger } from '@/lib/Logger';
import { shouldProcessImage } from '@/lib/image-utils';
import { ProcessingQueue } from '@/services/ProcessingQueue';
import { ProcessingQueueModal } from '@/components/modals/ProcessingQueueModal';
import { saveBase64ImageInVault } from './lib/ingest';
import { useQueueStore } from '@/stores/queueStore';
import { StatusBarManager } from './lib/StatusBarManager';
import { debounce } from 'obsidian';
import { customParse } from './lib/json-utils';
import { DefaultConfig } from './types/config-types';

export default class VisionRecallPlugin extends Plugin {
	settings: VisionRecallPluginSettings;
	screenshotProcessor: ScreenshotProcessor;
	dataManager: DataManager;
	logger: PluginLogger;
	processingQueue: ProcessingQueue;
	statusBarManager: StatusBarManager;

	metadata: any[] = [];
	debouncedOnCreateHandler: (file: TAbstractFile) => void;

	async onload() {
		try {
			await this.loadSettings();  // Load Obsidian settings *before* DataManager init
			this.logger = new PluginLogger(this);
			this.dataManager = new DataManager(this);
			await this.initializeDataManagement(); // Initialize DataManager (must be after loadSettings)
			this.screenshotProcessor = new ScreenshotProcessor(this.app, this.settings, this);
			this.processingQueue = new ProcessingQueue(this, useQueueStore);
			this.statusBarManager = new StatusBarManager(this);

			this.initializeUI();
			await this.registerEventListeners();
			this.registerCommands();
			this.registerProtocolHandler();
			await this.loadScreenshotMetadata();
			this.logger.info('Plugin loaded successfully');

		} catch (error) {
			console.error('Failed to load plugin:', error);
			new Notice('Failed to load Vision Recall plugin. Check console for details.');
		}
	}

	private async initializeDataManagement() {
		await this.dataManager.init();
	}

	private initializeUI() {
		this.statusBarManager.initialize();

		this.registerView(
			MAIN_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => new MainView(leaf, this, this.dataManager)
		);

		this.addSettingTab(new ScreenshotKBSettingTab(this.app, this));

		this.addRibbonIcon(PLUGIN_ICON, `Open ${PLUGIN_NAME}`, (evt: MouseEvent) => {
			this.openView();
		});
	}

	private async registerEventListeners() {
		// Debounce the file creation handler
		this.debouncedOnCreateHandler = debounce(this.onFileCreated.bind(this), 500, true);

		this.registerEvent(
			this.app.vault.on('create', this.debouncedOnCreateHandler)
		);

		if (await this.periodicProcessingEnabled()) {
			const config = this.dataManager.getConfig();
			// consider intakeFolderPollingInterval as seconds (so convert to ms)
			const interval = (config.intakeFolderPollingInterval || DefaultConfig.intakeFolderPollingInterval) * 1000;


			if (interval < 30000) {
				this.logger.warn('DataManager: Intake folder polling interval is less than 30 seconds. This is not recommended.');
				return;
			}

			this.registerEvent(
				window.setInterval(
					() => this.screenshotProcessor.processIntakeFolderAuto(),
					interval
				)
			)
		}

		this.dataManager.on('unprocessed-images-found', async () => {
			await this.screenshotProcessor.processIntakeFolderAuto();
		});
	}

	private registerCommands() {
		this.addCommand({
			id: 'open-main-view',
			name: 'Open main view',
			callback: async () => this.openView()
		});

		this.addCommand({
			id: 'export-user-data',
			name: 'Export user data',
			callback: async () => {
				try {
					const blob = await this.dataManager.exportUserData();
					const url = URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = url;
					a.download = 'obsidian_userdata.json';
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					URL.revokeObjectURL(url);
					new Notice('User data exported successfully.');
				} catch (error) {
					console.error('Export failed:', error);
					new Notice('Failed to export user data.');
				}
			}
		});

		this.addCommand({
			id: 'import-user-data',
			name: 'Import user data',
			callback: async () => {
				const input = document.createElement('input');
				input.type = 'file';
				input.accept = 'application/json';

				input.addEventListener('change', async (event: Event) => {
					const fileInput = event.target as HTMLInputElement;
					if (!fileInput.files || fileInput.files.length === 0) return;

					const file = fileInput.files[0];
					const reader = new FileReader();

					reader.onload = async (e) => {
						if (!e.target?.result) return;
						try {
							await this.dataManager.importUserData(e.target?.result as string);
							new Notice('User data imported successfully.');
						} catch (error) {
							console.error('Import failed:', error);
							new Notice('Failed to import user data. Invalid file format.');
						}
					};

					reader.readAsText(file);
				});

				input.click();
			}
		});
	}

	private registerProtocolHandler(): void {
		if (!this.settings.allowDeepLinkScreenshotIntake) return;

		this.registerObsidianProtocolHandler('screenshot', async (e) => {
			if (!this.settings.allowDeepLinkScreenshotIntake) return;
			const screenshotStorageFolder = await this.getFolderFromSettingsKey('screenshotIntakeFolderPath');
			if (!screenshotStorageFolder) return;

			const file = await saveBase64ImageInVault(this, e.data, screenshotStorageFolder);
		});
	}

	openProcessingQueueModal() {
		const modal = new ProcessingQueueModal({ app: this.app, plugin: this });
		modal.open();
	}

	async autoProcessingEnabled(): Promise<boolean> {
		const config = this.dataManager.getConfig();
		return config.enableAutoIntakeFolderProcessing;
	}

	async periodicProcessingEnabled(): Promise<boolean> {
		const config = this.dataManager.getConfig();
		return config.enablePeriodicIntakeFolderProcessing;
	}

	async onFileCreated(file: TAbstractFile) {
		const autoProcessingEnabled = await this.autoProcessingEnabled();
		if (!autoProcessingEnabled) return;

		if (!(file instanceof TFile)) return;

		const screenshotIntakeFolderPath = await this.getFolderFromSettingsKey('screenshotIntakeFolderPath');
		if (!file.path.startsWith(screenshotIntakeFolderPath)) return;

		if (await shouldProcessImage(this, file)) {
			this.logger.info(`Processing new image: ${file.path}`);
			this.processingQueue.addToQueue(file);
		} else {
			this.logger.info(`Skipping already processed image: ${file.path}`);
		}
	}

	onunload() {
		if (this.screenshotProcessor) {
			this.screenshotProcessor.terminateWorker();
		}
		this.statusBarManager.removeStatusBarButton();
	}

	async setMetadata(newMetadata: any[]) {
		this.metadata = newMetadata;
	}

	async openView() {
		const existingLeaves = this.app.workspace.getLeavesOfType(MAIN_VIEW_TYPE);
		if (existingLeaves.length > 0) {
			await this.app.workspace.revealLeaf(existingLeaves[0]);
			return;
		}
		await this.app.workspace.getLeaf(true).setViewState({
			type: MAIN_VIEW_TYPE,
			active: true,
		});
	}

	async loadSettings() {
		const loadedData = await this.loadData();
		const parsedData = customParse(loadedData) as Partial<StoredData>;

		// Create settings object by only including keys that exist in DEFAULT_SETTINGS
		const settingsData = Object.keys(DEFAULT_SETTINGS).reduce((acc, key) => {
			if (parsedData && key in parsedData) {
				acc[key] = parsedData[key];
			}
			return acc;
		}, {} as Partial<VisionRecallPluginSettings>);

		// Merge filtered settings with defaults
		this.settings = { ...DEFAULT_SETTINGS, ...settingsData };
	}

	async saveSettings() {
		// Get all data from data manager
		const allData = this.dataManager.getAllData();

		// Merge settings into allData
		const mergedData = {
			...allData,  // All data from DataManager (includes 'config')
			...this.settings, // Obsidian settings (overrides any matching keys)
		};

		// Save the merged data
		await this.saveData(mergedData);
	}

	async loadScreenshotMetadata(): Promise<void> {
		this.metadata = this.dataManager.getAllEntries();
	}

	async loadScreenshotMetadataAndReturn(): Promise<any[]> {
		this.metadata = this.dataManager.getAllEntries();
		return this.metadata;
	}

	async fetchScreenshotMetadata(): Promise<any[]> {
		const metadataArray: any[] = [];
		const screenshotStorageFolder = await this.getFolderWithPrefixIfEnabled(this.settings.screenshotStorageFolderPath);

		let availableTags: Set<string> = new Set();
		let tagCounts: Record<string, number> = {};
		try {
			const folder = this.app.vault.getFolderByPath(screenshotStorageFolder);
			if (!folder) {
				this.logger.warn(`Screenshot storage folder not found: ${screenshotStorageFolder}`);
				return []; // Return empty array if folder not found
			}

			const children = folder.children;
			for (const child of children) {
				if (child instanceof TFile && child.extension === 'json') {
					try {
						const metadataContent = await this.app.vault.cachedRead(child);
						const metadata = JSON.parse(metadataContent);
						metadataArray.push(metadata);
						metadata?.extractedTags?.forEach(tag => {
							availableTags.add(tag);
							tagCounts[tag] = (tagCounts[tag] || 0) + 1;
						});
					} catch (jsonError) {
						this.logger.error(`Error parsing metadata file: ${child.path}`, jsonError);
					}
				}
			}
		} catch (folderError) {
			this.logger.error(`Error reading screenshot storage folder: ${screenshotStorageFolder}`, folderError);
		}

		await this.dataManager.setAvailableTags(availableTags);
		await this.dataManager.setTagCounts(tagCounts);
		return metadataArray;
	}

	getSettingsKey = (key: string) => {
		return Object.keys(this.settings).find(x => x == key);
	}

	getFolderFromSettingsKey = async (key: string) => {
		return await this.getFolderWithPrefixIfEnabled(this.settings[this.getSettingsKey(key)]);
	}

	getFolderWithPrefixIfEnabled = async (folderPath: string, createIfNotExists: boolean = false) => {
		let newFolderPath = folderPath;

		if (this.settings.addPrefixToFolderNames) {
			newFolderPath = `${this.settings.prefixToAddToFolderNames}${folderPath}`;
		}

		if (this.settings.useParentFolder) {
			if (this.settings.parentFolderPath) {
				if (!this.app.vault.getFolderByPath(this.settings.parentFolderPath)) {
					if (createIfNotExists) {
						await this.app.vault.createFolder(this.settings.parentFolderPath);
					}
				}
				newFolderPath = normalizePath(`${this.settings.parentFolderPath}/${newFolderPath}`);
			}
		}

		return newFolderPath;
	}
}
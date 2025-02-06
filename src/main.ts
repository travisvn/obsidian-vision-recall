import { normalizePath, Notice, Plugin, setIcon, setTooltip, TAbstractFile, TFile, WorkspaceLeaf } from 'obsidian';
import MainView, { MAIN_VIEW_TYPE } from '@/views/MainView';
import { PLUGIN_ICON, PLUGIN_NAME } from '@/constants';
import ScreenshotKBSettingTab from '@/settings/SettingsPage';
import { VisionRecallPluginSettings, DEFAULT_SETTINGS } from '@/types/settings-types';
import { ScreenshotProcessor } from '@/services/screenshot-processor';
import "@/styles/global.css";
import { DataManager, StoredData } from './data/DataManager';
import { PluginLogger } from '@/lib/Logger';
import { shouldProcessImage } from '@/lib/image-utils';
import { ProcessingQueue } from '@/services/ProcessingQueue';
import { ProcessingQueueModal } from '@/components/modals/ProcessingQueueModal';
import { saveBase64ImageInVault } from './lib/ingest';
import { useQueueStore } from '@/stores/queueStore';
import { customParse } from './lib/json-utils';

export default class VisionRecallPlugin extends Plugin {
	settings: VisionRecallPluginSettings;
	screenshotProcessor: ScreenshotProcessor;
	dataManager: DataManager;
	logger: PluginLogger;
	processingQueue: ProcessingQueue;

	metadata: any[] = []; // Plugin-level metadata state

	statusBarEl: HTMLElement | null = null;
	statusBarProcessingQueueEl: HTMLElement | null = null;
	statusBarControlsEl: HTMLElement | null = null;

	async onload() {
		try {
			// 1. Load core settings first
			await this.loadSettings();
			this.logger = new PluginLogger(this.settings);

			// 2. Initialize data management
			this.dataManager = new DataManager(this);
			await this.dataManager.init();

			// 3. Initialize processing components
			this.screenshotProcessor = new ScreenshotProcessor(this.app, this.settings, this);
			this.processingQueue = new ProcessingQueue(this, useQueueStore);

			// 4. Initialize UI components
			this.statusBarControlsEl = this.addStatusBarItem();
			this.statusBarProcessingQueueEl = this.addStatusBarItem();
			this.updateStatusBarControls();
			if (this.settings.showStatusBarButton) {
				this.updateProcessingQueueStatusBar();
			}

			// Subscribe to queue store changes
			const unsubscribe = useQueueStore.subscribe(
				(state) => {
					this.updateStatusBarControls();
					this.updateProcessingQueueStatusBar();
				}
			);

			// Clean up subscription on plugin unload
			this.register(() => unsubscribe());

			// 5. Register views and commands
			this.registerView(
				MAIN_VIEW_TYPE,
				(leaf: WorkspaceLeaf) => new MainView(leaf, this, this.dataManager)
			);

			this.addSettingTab(new ScreenshotKBSettingTab(this.app, this));
			this.registerCommands();
			this.registerProtocolHandler();

			this.addRibbonIcon(PLUGIN_ICON, `Open ${PLUGIN_NAME}`, (evt: MouseEvent) => {
				this.openView();
			});

			// 6. Register event listeners
			this.registerEvent(
				this.app.vault.on('create', (file) => this.onFileCreated(this, file))
			);

			// 7. Load metadata and start background processes
			await this.loadScreenshotMetadata();

			// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
			this.registerInterval(
				window.setInterval(() => this.logger.debug('Interval check'), 5 * 60 * 1000)
			);

			// Start polling after all initialization is complete
			await this.dataManager.startIntakeDirectoryPolling();

			// Listen for unprocessed images after polling is started
			this.dataManager.on('unprocessed-images-found', async () => {
				await this.screenshotProcessor.processIntakeFolderAuto();
			});

			this.logger.info('Plugin loaded successfully');
		} catch (error) {
			console.error('Failed to load plugin:', error);
			new Notice('Failed to load Vision Recall plugin. Check console for details.');
		}
	}

	private registerCommands() {
		// Register all commands
		this.addCommand({
			id: 'open-main-view',
			name: 'Open Main View',
			callback: async () => this.activateView()
		});

		this.addCommand({
			id: 'export-user-data',
			name: 'Export User Data',
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
			name: 'Import User Data',
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
							await this.dataManager.importUserData(e.target.result as string);
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

	openProcessingQueueModal() {
		const modal = new ProcessingQueueModal({ app: this.app, plugin: this });
		modal.open();
	}

	updateProcessingQueueStatusBar() {
		this.statusBarProcessingQueueEl?.empty();
		const queueIndicator = createEl('span', {
			cls: 'queue-indicator',
		});

		const { isProcessing, isPaused } = useQueueStore.getState().status;

		let icon = 'list';
		if (isProcessing) {
			icon = isPaused ? 'pause' : 'loader-2';
		}

		setIcon(queueIndicator, icon);
		setTooltip(this.statusBarProcessingQueueEl, 'Processing Queue', { placement: 'top' });
		queueIndicator.onclick = () => this.openProcessingQueueModal();

		if (isProcessing && !isPaused) {
			queueIndicator.addClass('rotating');
		} else {
			queueIndicator.removeClass('rotating');
		}

		this.statusBarProcessingQueueEl?.appendChild(queueIndicator);
	}

	removeStatusBarButton(): void {
		if (this.statusBarControlsEl) {
			this.statusBarControlsEl?.remove();
			this.statusBarControlsEl = null;
		}

		if (this.statusBarProcessingQueueEl) {
			this.statusBarProcessingQueueEl?.remove();
			this.statusBarProcessingQueueEl = null;
		}
	}

	updateStatusBarControls() {
		if (!this.statusBarControlsEl) return;
		if (!this.settings.showStatusBarButton) {
			this.removeStatusBarButton();
			return;
		}

		const { status } = useQueueStore.getState();
		const hasPendingItems = status.queue.some(item => item.status === 'pending');
		const shouldShowControls = status.isProcessing || status.isPaused || hasPendingItems || status.isStopped;

		this.statusBarControlsEl.empty();
		const controlsContainer = createEl('div', { cls: 'vision-recall-status-bar-controls' });

		if (shouldShowControls) {
			if (status.isProcessing) {
				// Stop button
				const stopButton = createEl('span', { cls: 'vision-recall-status-bar-control' });
				setTooltip(stopButton, 'Stop processing', { placement: 'top' });
				setIcon(stopButton, 'circle-stop');
				stopButton.onclick = () => this.screenshotProcessor.setIsProcessingStopped(true);

				// Pause button
				const pauseButton = createEl('span', { cls: 'vision-recall-status-bar-control' });
				setTooltip(pauseButton, 'Pause processing', { placement: 'top' });
				setIcon(pauseButton, 'pause');
				pauseButton.onclick = () => this.processingQueue.pauseProcessing();

				controlsContainer.appendChild(stopButton);
				controlsContainer.appendChild(pauseButton);
			} else if (status.isPaused || status.isStopped) {
				// Resume button
				const resumeButton = createEl('span', { cls: 'vision-recall-status-bar-control' });
				setTooltip(resumeButton, 'Resume processing', { placement: 'top' });
				setIcon(resumeButton, 'play');
				resumeButton.onclick = () => {
					this.processingQueue.resumeProcessing();
					this.processingQueue.processQueue();
				};

				controlsContainer.appendChild(resumeButton);
			} else if (hasPendingItems) {
				// Start button
				const startButton = createEl('span', { cls: 'vision-recall-status-bar-control' });
				setTooltip(startButton, 'Start processing', { placement: 'top' });
				setIcon(startButton, 'play');
				startButton.onclick = () => this.processingQueue.processQueue();

				controlsContainer.appendChild(startButton);
			}
		}

		this.statusBarControlsEl.appendChild(controlsContainer);
	}

	async autoProcessingEnabled(): Promise<boolean> {
		const config = await this.dataManager.getConfig();
		return config.enableAutoIntakeFolderProcessing || false;
	}

	async periodicProcessingEnabled(): Promise<boolean> {
		const config = await this.dataManager.getConfig();
		return config.enablePeriodicIntakeFolderProcessing || false;
	}

	async onFileCreated(plugin: VisionRecallPlugin, file: TAbstractFile) {
		const autoProcessingEnabled = await plugin.autoProcessingEnabled();
		if (!autoProcessingEnabled) return;

		// Make sure we're dealing with a file, not a folder.
		if (!(file instanceof TFile)) return;

		const screenshotIntakeFolderPath = await this.getFolderFromSettingsKey('screenshotIntakeFolderPath');
		if (!file.path.startsWith(screenshotIntakeFolderPath)) return;

		// Check whether we should process this file.
		if (await shouldProcessImage(this, file)) {
			this.logger.info(`Processing new image: ${file.path}`);
			// Add to processing queue instead of direct processing
			this.processingQueue.addToQueue(file);
		} else {
			this.logger.info(`Skipping already processed image: ${file.path}`);
		}
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(MAIN_VIEW_TYPE); // Detach view on plugin unload
		if (this.screenshotProcessor) {
			this.screenshotProcessor.terminateWorker(); // Terminate worker on plugin unload
		}
		this.removeStatusBarButton();
	}

	async setMetadata(newMetadata: any[]) {
		this.metadata = newMetadata;
	}

	async openView() {
		// Check if view is already open
		const existingLeaves = this.app.workspace.getLeavesOfType(MAIN_VIEW_TYPE);
		if (existingLeaves.length > 0) {
			// Reveal and focus the first existing leaf
			await this.app.workspace.revealLeaf(existingLeaves[0]);
			return;
		}

		// If no existing leaf, create and activate a new one
		await this.app.workspace.getLeaf(true).setViewState({
			type: MAIN_VIEW_TYPE,
			active: true,
		});
	}

	async activateViewOfficial() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(MAIN_VIEW_TYPE);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getRightLeaf(false);
			await leaf.setViewState({ type: MAIN_VIEW_TYPE, active: true });
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		workspace.revealLeaf(leaf);
	}

	// old function
	async activateView() {
		this.app.workspace.detachLeavesOfType(MAIN_VIEW_TYPE);

		// Metadata is now loaded in the provider and updated reactively
		await this.app.workspace.getLeaf(true).setViewState({
			type: MAIN_VIEW_TYPE,
			active: true,
			// state: { metadata: this.metadata }, // No need to pass metadata as state anymore
		});

		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(MAIN_VIEW_TYPE)[0]
		);
	}

	toggleView() {
		const leaves = this.app.workspace.getLeavesOfType(MAIN_VIEW_TYPE);
		if (leaves.length > 0) {
			this.deactivateView();
		} else {
			this.openView();
		}
	}

	async deactivateView() {
		this.app.workspace.detachLeavesOfType(MAIN_VIEW_TYPE);
	}

	async loadSettings() {
		const existingData = (await this.loadData()) || {}; // Load existing data or default to empty object
		const parsedExistingData = customParse(existingData) as StoredData;

		// Start with default settings
		this.settings = { ...DEFAULT_SETTINGS };

		// Only override with existing settings that match our defaults structure
		if (parsedExistingData && typeof parsedExistingData === 'object') {
			for (const key of Object.keys(DEFAULT_SETTINGS)) {
				if (key in parsedExistingData) {
					this.settings[key] = parsedExistingData[key];
				}
			}
		}
	}

	async saveMergedSettings() {
		const existingData = await this.loadData() || {} // Load existing data or default to empty object
		const updatedData = { ...existingData, ...this.dataManager.getAllData(), ...this.settings } // Merge settings

		await this.saveData(updatedData) // Save merged data
	}

	async saveSettings() {
		// await this.saveData(this.settings);
		await this.saveMergedSettings();
	}

	async loadScreenshotMetadata(): Promise<void> {
		this.metadata = await this.fetchScreenshotMetadata();
	}

	async loadScreenshotMetadataAndReturn(): Promise<any[]> {
		const fetchedMetadata = await this.fetchScreenshotMetadata();
		this.metadata = fetchedMetadata;
		return fetchedMetadata;
	}

	async fetchScreenshotMetadata(): Promise<any[]> {
		const metadataArray: any[] = [];
		const screenshotStorageFolder = await this.getFolderWithPrefixIfEnabled(this.settings.screenshotStorageFolderPath);

		// let availableTags: string[] = [];
		let availableTags: Set<string> = new Set();
		let tagCounts: Record<string, number> = {};
		try {
			const folder = this.app.vault.getFolderByPath(screenshotStorageFolder);
			if (!folder) {
				this.logger.warn(`Screenshot storage folder not found: ${screenshotStorageFolder}`);
				return []; // Return empty array if folder not found
			}

			const children = folder.children;
			// this.logger.info(children);
			for (const child of children) {
				if (child instanceof TFile && child.extension === 'json') {
					try {
						const metadataContent = await this.app.vault.read(child);
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

		// this.logger.info(metadataArray);

		this.dataManager.setAvailableTags(availableTags);
		this.dataManager.setTagCounts(tagCounts);
		// this.logger.info(`Available tags: ${Array.from(availableTags)}`);
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

	private registerProtocolHandler(): void {
		if (!this.settings.allowDeepLinkScreenshotIntake) return;

		this.registerObsidianProtocolHandler('screenshot', async (e) => {
			if (!this.settings.allowDeepLinkScreenshotIntake) return;
			const screenshotStorageFolder = await this.getFolderFromSettingsKey('screenshotIntakeFolderPath');
			if (!screenshotStorageFolder) return;

			const file = await saveBase64ImageInVault(this, e.data, screenshotStorageFolder);

			// const fileType = e.data.split(';')[0];
			// this.logger.info(`File type: ${fileType}`);
			// const fileExtension = base64ToExtension(e.data);
			// this.logger.info(`File extension: ${fileExtension}`);
			// const filePath = normalizePath(`${screenshotStorageFolder}/screenshot-${Date.now()}.${fileExtension}`);
			// this.logger.info(`File path: ${filePath}`);
			// const file = await this.app.vault.create(filePath, decodeBase64(e.data));
			// await this.screenshotProcessor.processScreenshot(file);
		});
	}
}


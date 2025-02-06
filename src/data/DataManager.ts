import VisionRecallPlugin from '@/main';
import { Low, Memory } from 'lowdb';
import { DateTime } from 'luxon';
import { Events, normalizePath } from 'obsidian';
import { Config, DefaultConfig } from '@/types/config-types';
import { ProcessedFileRecord } from '@/types/processing-types';
import { customParse, customStringify } from '@/lib/json-utils';
import { DEFAULT_SETTINGS, VisionRecallPluginSettings } from '@/types/settings-types';
import { useQueueStore } from '@/stores/queueStore';

/** Defines the structure of a single user data entry (metadata) */
export interface UserData {
  id: string; // The only required field (unique identifier)

  originalFilename?: string;
  screenshotFilename?: string;
  screenshotStoragePath?: string;
  notePath?: string;
  noteTitle?: string;
  ocrText?: string | null;
  visionLLMResponse?: string | null;
  generatedNotes?: string | null;
  extractedTags?: string[];
  // formattedTags?: string[];
  formattedTags?: string;
  // settingsUsed?: Record<string, any>; // Snapshot of settings used
  timestamp?: string; // ISO date string

  metadataFilename?: string;
  metadataPath?: string;

  uniqueName?: string;
  uniqueTag?: string;

  /** Allows additional key-value pairs for extensibility */
  [key: string]: unknown;
}

/** Defines the structure of stored data, keeping list/map for efficient lookups */
export interface StoredData extends VisionRecallPluginSettings {
  userData: {
    list: string[]; // Maintains entry order
    map: Record<string, UserData>; // Maps ID -> entry for quick lookup
  };
  config: Config;
  availableTags: Set<string>;
  tagCounts: Record<string, number>;
  processedFileRecords: Record<string, ProcessedFileRecord>;
  processedHashes: Set<string>;
  minimizedProgressDisplay: boolean;
  [key: string]: unknown;
}

/** Default empty structure to initialize LowDB */
const DEFAULT_DATA: StoredData = {
  ...DEFAULT_SETTINGS,
  userData: {
    list: [],
    map: {}
  },
  config: DefaultConfig,
  availableTags: new Set(),
  tagCounts: {},
  processedFileRecords: {},
  processedHashes: new Set(),
  minimizedProgressDisplay: false
};

/** Manages persistent user data using LowDB and Obsidian's saveData */
export class DataManager extends Events {
  private db: Low<StoredData>;
  plugin: VisionRecallPlugin;
  private pollIntervalId: number | null = null;

  constructor(plugin: VisionRecallPlugin) {
    super();
    this.plugin = plugin;
    this.db = new Low(new Memory(), DEFAULT_DATA);

    // Cleanup interval when plugin unloads
    plugin.register(() => this.stopIntakeDirectoryPolling());
  }

  /** Initialize and load user data, preserving other settings */
  async init() {
    try {
      const savedData = await this.plugin.loadData();
      const parsedData = customParse(savedData) as StoredData;

      // Initialize with default data structure
      this.db.data = { ...DEFAULT_DATA };

      // Carefully merge saved data with defaults
      if (parsedData) {
        // Merge userData
        if (parsedData.userData) {
          this.db.data.userData = {
            list: Array.isArray(parsedData.userData.list) ? parsedData.userData.list : [],
            map: typeof parsedData.userData.map === 'object' ? parsedData.userData.map : {}
          };
        }

        // Merge config
        if (parsedData.config) {
          this.db.data.config = {
            ...DefaultConfig,
            ...parsedData.config
          };
        }

        // Merge sets and maps
        if (parsedData.processedFileRecords) {
          this.db.data.processedFileRecords = parsedData.processedFileRecords;
        }

        if (parsedData.processedHashes) {
          this.db.data.processedHashes = new Set(Array.from(parsedData.processedHashes));
        }

        if (parsedData.availableTags) {
          this.db.data.availableTags = new Set(Array.from(parsedData.availableTags));
        }

        if (parsedData.tagCounts) {
          this.db.data.tagCounts = parsedData.tagCounts;
        }

        this.db.data.minimizedProgressDisplay = !!parsedData.minimizedProgressDisplay;
      }

      await this.db.write();
      this.plugin.logger.info('DataManager initialized successfully');
    } catch (error) {
      this.plugin.logger.error('Failed to initialize DataManager:', error);
      throw error; // Re-throw to be caught by the plugin's error handler
    }
  }

  getAllData() {
    return this.db.data;
  }

  /** Convert UserData into a JSON-safe format */
  private sanitizeForSaving(entry: UserData): Record<string, any> {
    return JSON.parse(
      JSON.stringify(entry, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString(); // Convert Date to string
        }
        if (typeof value === 'undefined') {
          return null; // Convert undefined to null
        }
        return value; // Default case
      })
    );
  }

  /** Convert loaded JSON back into UserData with correct types */
  private restoreFromLoad(data: Record<string, any>): UserData {
    const restored = { ...data } as UserData;

    // Ensure timestamp is restored as a string (or null)
    if (typeof restored.timestamp === 'string') {
      restored.timestamp = restored.timestamp; // Already valid
    }

    return restored;
  }

  /** Get all user entries, restoring from JSON format */
  getAllEntries(): UserData[] {
    return this.db.data.userData.list.map(id =>
      this.restoreFromLoad(this.db.data.userData.map[id])
    );
  }

  /** Get a single entry by ID */
  getEntry(id: string): UserData | undefined {
    const entry = this.db.data.userData.map[id];
    return entry ? this.restoreFromLoad(entry) : undefined;
  }

  /** Add or update an entry, ensuring JSON safety */
  async addOrUpdateEntry(entry: UserData) {
    if (!this.db.data.userData.map[entry.id]) {
      this.db.data.userData.list.push(entry.id); // Maintain order
    }
    this.db.data.userData.map[entry.id] = this.sanitizeForSaving(entry) as UserData;

    await this.persist();
  }

  /** Remove an entry */
  async removeEntry(id: string) {
    if (!this.db.data.userData.map[id]) return;

    this.db.data.userData.list = this.db.data.userData.list.filter(existingId => existingId !== id);
    delete this.db.data.userData.map[id];

    await this.persist();
  }

  /** Persist changes while preserving other settings */
  private async persist() {
    const existingData = await this.plugin.loadData();
    const parsedExistingData = customParse(existingData) as StoredData;

    const dataToPersist = {
      ...parsedExistingData, // Keep other settings unchanged
      userData: this.db.data.userData, // Update only userData
      config: this.db.data.config, // Update config
      availableTags: this.db.data.availableTags,
      tagCounts: this.db.data.tagCounts,
      processedFileRecords: this.db.data.processedFileRecords,
      processedHashes: this.db.data.processedHashes,
      minimizedProgressDisplay: this.db.data.minimizedProgressDisplay
    }

    await this.plugin.saveData(customStringify(dataToPersist));

    this.trigger('data-updated'); // Notify listeners

    // await this.persistDataToFile(); // Persist data to file
  }

  async persistDataToFile(backup: boolean = false) {
    if (!this.db.data.userData || Object.keys(this.db.data.userData.map).length == 0) {
      this.plugin.logger.warn('DataManager: No user data to persist.');
      return;
    }

    const dataToSave = {
      userData: this.db.data.userData, // Update only userData
      config: this.db.data.config, // Update config
      availableTags: this.db.data.availableTags,
      tagCounts: this.db.data.tagCounts,
      processedFileRecords: this.db.data.processedFileRecords,
      processedHashes: this.db.data.processedHashes,
      minimizedProgressDisplay: this.db.data.minimizedProgressDisplay
    };

    const dataStr = customStringify(dataToSave, true);
    const filename = backup ? 'userData_backup.json' : 'userData.json';

    const screenshotStorageFolder = this.plugin.getFolderFromSettingsKey('screenshotStorageFolderPath');
    const persistFileLocation = normalizePath(`${screenshotStorageFolder}/${filename}`);

    if (!this.plugin.app.vault.getAbstractFileByPath(persistFileLocation)) {
      await this.plugin.app.vault.create(persistFileLocation, dataStr);
      this.plugin.logger.info("created new file", persistFileLocation);
    } else {
      const file = this.plugin.app.vault.getFileByPath(persistFileLocation);
      if (file) { // If the file exists, rename it and create a new one with the current date
        const newLocationForExistingFile = normalizePath(`${screenshotStorageFolder}/${filename}_${DateTime.now().toFormat('yyyy-MM-dd')}`);
        this.plugin.logger.info("newLocationForExistingFile", newLocationForExistingFile);

        // Essentially creates a daily backup
        if (!this.plugin.app.vault.getAbstractFileByPath(newLocationForExistingFile)) {
          const currentFileContent = await this.plugin.app.vault.read(file);
          await this.plugin.app.vault.create(newLocationForExistingFile, currentFileContent);
          this.plugin.logger.info("created new backup file", newLocationForExistingFile);
        }

        await this.plugin.app.vault.modify(file, dataStr);
        this.plugin.logger.info("modified existing file", file.path);
      }
    }
  }

  /** Export userData as a JSON file */
  async exportUserData(): Promise<Blob> {
    if (!this.db.data.userData) {
      this.plugin.logger.warn('DataManager: No user data to export.');
      return new Blob(['{}'], { type: 'application/json' });
    }

    const dataToSave = {
      userData: this.db.data.userData, // Update only userData
      config: this.db.data.config, // Update config
      availableTags: this.db.data.availableTags,
      tagCounts: this.db.data.tagCounts,
      processedFileRecords: this.db.data.processedFileRecords,
      processedHashes: this.db.data.processedHashes,
      minimizedProgressDisplay: this.db.data.minimizedProgressDisplay
    };

    const dataStr = customStringify(dataToSave, true);
    return new Blob([dataStr], { type: 'application/json' });
  }

  /** Import userData from a JSON file */
  async importUserData(jsonData: string) {
    try {
      const parsedData = customParse(jsonData) as StoredData;

      // Ensure the imported data has the right structure
      // if (!parsedData || typeof parsedData !== 'object' || !Array.isArray(parsedData.userData.list) || typeof parsedData.userData.map !== 'object') {
      //   throw new Error('Invalid userData format.');
      // }

      // Merge new user data with the existing database
      // this.db.data.userData = parsedData.userData;
      this.db.data = parsedData;
      await this.persist();
    } catch (error) {
      this.plugin.logger.error('Failed to import userData:', error);
      throw new Error('Invalid JSON file. Please ensure it is correctly formatted.');
    }
  }

  async getConfig() {
    return this.db.data.config || {};
  }

  getConfigSynchronous() {
    return this.db.data.config || {};
  }

  async updateConfig(updatedConfig: Partial<Config>) {
    this.db.data.config = {
      ...this.db.data.config,
      ...updatedConfig
    };
    await this.persist();
  }

  getProcessedFileRecords() {
    return this.db.data.processedFileRecords;
  }

  getProcessedHashes() {
    return this.db.data.processedHashes;
  }

  async addProcessedFileRecord(filePath: string, record: ProcessedFileRecord) {
    this.db.data.processedFileRecords[filePath] = record;
    await this.persist();
  }

  async removeProcessedFileRecord(filePath: string) {
    delete this.db.data.processedFileRecords[filePath];
    await this.persist();
  }

  async addProcessedHash(hash: string) {
    this.db.data.processedHashes.add(hash);
    await this.persist();
  }

  async removeProcessedHash(hash: string) {
    this.db.data.processedHashes.delete(hash);
    await this.persist();
  }

  async addProcessedFileRecordAndHash(filePath: string, record: ProcessedFileRecord, hash: string) {
    this.db.data.processedFileRecords[filePath] = record;
    this.db.data.processedHashes.add(hash);
    await this.persist();
  }

  async removeProcessedFileRecordAndHash(filePath: string, hash: string) {
    delete this.db.data.processedFileRecords[filePath];
    this.db.data.processedHashes.delete(hash);
    await this.persist();
  }

  async startIntakeDirectoryPolling() {
    // consider intakeFolderPollingInterval as seconds (so convert to ms)
    const interval = (this.db.data.config.intakeFolderPollingInterval || DefaultConfig.intakeFolderPollingInterval) * 1000;

    if (interval < 30000) {
      this.plugin.logger.warn('DataManager: Intake folder polling interval is less than 30 seconds. This is not recommended.');
      return;
    }

    this.pollIntervalId = window.setInterval(
      () => this.plugin.screenshotProcessor.processIntakeFolderAuto(),
      interval
    );
  }

  stopIntakeDirectoryPolling() {
    if (this.pollIntervalId) {
      window.clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  private async checkForUnprocessedImages() {
    const periodicProcessingEnabled = await this.plugin.periodicProcessingEnabled();
    if (!periodicProcessingEnabled) return;

    const intakeDir = await this.plugin.getFolderFromSettingsKey('screenshotIntakeFolderPath');
    const storageDir = await this.plugin.getFolderFromSettingsKey('screenshotStorageFolderPath');

    if (!intakeDir || !storageDir) {
      this.plugin.logger.warn('Intake or storage directory not configured');
      return;
    }

    const normalizedIntakeDir = normalizePath(intakeDir);
    const allFiles = this.plugin.app.vault.getFiles();

    // Simplified check - any image in intake directory is considered unprocessed
    const unprocessed = allFiles.filter(file => {
      const ext = file.extension.toLowerCase();
      return file.path.startsWith(normalizedIntakeDir) &&
        ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
    });

    if (unprocessed.length > 0) {
      this.plugin.logger.info(`Found ${unprocessed.length} new images to process`);
      this.trigger('unprocessed-images-found', unprocessed);
    }
  }

  getCurrentlyProcessing() {
    return useQueueStore.getState().status.isProcessing;
  }

  async setCurrentlyProcessing(processing: boolean) {
    useQueueStore.getState().actions.updateStatus({ isProcessing: processing });
  }

  getMinimizedProgressDisplay() {
    return this.db.data.minimizedProgressDisplay;
  }

  async setMinimizedProgressDisplay(minimized: boolean) {
    this.db.data.minimizedProgressDisplay = minimized;
    await this.persist();
  }

  getAvailableTags() {
    return this.db.data.availableTags;
  }

  async setAvailableTags(tags: Set<string>) {
    this.db.data.availableTags = tags;
    await this.persist();
  }

  getTagCounts() {
    return this.db.data.tagCounts;
  }

  async setTagCounts(counts: Record<string, number>) {
    this.db.data.tagCounts = counts;
    await this.persist();
  }
}

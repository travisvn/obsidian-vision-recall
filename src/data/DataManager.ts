import VisionRecallPlugin from '@/main';
import { Low, Memory } from 'lowdb';
import { DateTime } from 'luxon';
import { Events, normalizePath, TFile } from 'obsidian';
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
  title: string;
  extractedTags?: string[];
  // formattedTags?: string[];
  formattedTags?: string;
  // settingsUsed?: Record<string, any>; // Snapshot of settings used
  timestamp?: string; // ISO date string

  metadataFilename?: string;
  metadataPath?: string;

  uniqueName?: string;
  uniqueTag?: string;

  hash?: string;
  size?: number;
  mtime?: number;

  /** Allows additional key-value pairs for extensibility */
  [key: string]: unknown;
}

export interface OtherData {
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
}

/** Defines the structure of stored data, keeping list/map for efficient lookups */
export interface StoredData extends VisionRecallPluginSettings, OtherData {
  [key: string]: unknown;
}

const DEFAULT_OTHER_DATA: OtherData = {
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
}

/** Default empty structure to initialize LowDB */
const DEFAULT_STORED_DATA: StoredData = {
  ...DEFAULT_SETTINGS,
  ...DEFAULT_OTHER_DATA,
};

/** Manages persistent user data using LowDB and Obsidian's saveData */
export class DataManager extends Events {
  private db: Low<StoredData>;
  plugin: VisionRecallPlugin;

  constructor(plugin: VisionRecallPlugin) {
    super();
    this.plugin = plugin;
    this.db = new Low(new Memory(), DEFAULT_STORED_DATA);
  }

  // Add a helper to check for valid config in the loaded data.
  private isValidConfig(config: any): config is Config {
    return config && typeof config === 'object';
  }

  // Initialize and load user data and config, NOT settings.
  async init() {
    try {
      const savedData = await this.plugin.loadData();
      const parsedData = customParse(savedData) as StoredData;

      // Initialize with default data structure
      this.db.data = { ...DEFAULT_STORED_DATA };

      // Carefully merge saved data with defaults
      if (parsedData) {
        // Merge userData
        if (parsedData.userData) {
          this.db.data.userData = {
            list: Array.isArray(parsedData.userData.list) ? parsedData.userData.list : [],
            map: typeof parsedData.userData.map === 'object' ? parsedData.userData.map : {}
          };
        }

        // Merge config - only if the loaded config is valid!
        if (this.isValidConfig(parsedData.config)) {
          this.db.data.config = { ...DefaultConfig, ...parsedData.config };
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


  async updateConfig(updatedConfig: Partial<Config>) {
    // Only update the 'config' part of the data.
    this.db.data.config = {
      ...this.db.data.config, // Existing config
      ...updatedConfig,      // New config values (overwrites existing)
    };
    await this.persist();
    this.trigger('config-updated'); // Emit config-updated event
  }


  /** Initialize and load user data, preserving other settings */
  /** Keeping for posterity sake as the application needs change */
  async initOLD() {
    try {
      const savedData = await this.plugin.loadData();
      const parsedData = customParse(savedData) as StoredData;

      // Initialize with default data structure
      this.db.data = { ...DEFAULT_STORED_DATA };

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

  /** Cleanup old processed records based on retention policy */
  private async cleanupProcessedRecords() {
    const now = DateTime.now();
    const retentionDays = 30; // Keep records for 30 days

    // Cleanup processedFileRecords
    const recordsToDelete: string[] = [];
    for (const [filePath, record] of Object.entries(this.db.data.processedFileRecords)) {
      if (!record?.mtime || !record?.size) {
        recordsToDelete.push(filePath);
        continue;
      }

      const recordDate = DateTime.fromMillis(record.mtime);
      if (now.diff(recordDate, 'days').days > retentionDays) {
        recordsToDelete.push(filePath);
      }
    }

    recordsToDelete.forEach(filePath => {
      delete this.db.data.processedFileRecords[filePath];
    });

    // Cleanup processedHashes if they're not referenced in processedFileRecords
    const activeHashes = new Set(
      Object.values(this.db.data.processedFileRecords)
        .map(record => record.hash)
        .filter(hash => hash !== undefined)
    );

    this.db.data.processedHashes = new Set(
      [...this.db.data.processedHashes].filter(hash => activeHashes.has(hash))
    );

    if (recordsToDelete.length > 0) {
      await this.persist();
      this.plugin.logger.info(`Cleaned up ${recordsToDelete.length} old processed records`);
    }
  }

  /** Calculate and update available tags and tag counts from all entries */
  private calculateTags() {
    const newAvailableTags = new Set<string>();
    const newTagCounts: Record<string, number> = {};

    // Process all entries
    for (const id of this.db.data.userData.list) {
      const entry = this.db.data.userData.map[id];
      if (entry.extractedTags) {
        for (const tag of entry.extractedTags) {
          newAvailableTags.add(tag);
          newTagCounts[tag] = (newTagCounts[tag] || 0) + 1;
        }
      }
    }

    this.db.data.availableTags = newAvailableTags;
    this.db.data.tagCounts = newTagCounts;
  }

  /** Add or update an entry, ensuring JSON safety */
  async addOrUpdateEntry(entry: UserData) {
    if (!this.db.data.userData.map[entry.id]) {
      this.db.data.userData.list.push(entry.id); // Maintain order
    }
    this.db.data.userData.map[entry.id] = this.sanitizeForSaving(entry) as UserData;
    this.addProcessedFileRecordAndHash(entry.id, { size: entry.size, mtime: entry.mtime, hash: entry.hash } as ProcessedFileRecord, entry.hash);

    // Recalculate tags whenever an entry is added or updated
    this.calculateTags();

    await this.cleanupProcessedRecords(); // Run cleanup when adding new entries
    await this.persist();
  }

  /** Remove an entry */
  async removeEntry(id: string) {
    if (!this.db.data.userData.map[id]) return;

    // Remove the entry from the processedFileRecords
    this.removeProcessedFileRecordAndHash(id, this.db.data.processedFileRecords[id].hash);
    this.db.data.userData.list = this.db.data.userData.list.filter(existingId => existingId !== id);
    delete this.db.data.userData.map[id];

    // Recalculate tags after removing an entry
    this.calculateTags();

    await this.persist();
  }

  // Persist changes while preserving other settings
  private async persist() {
    // NO LONGER get settings from the plugin here.
    const dataToPersist = {
      ...this.db.data, // ALL data from DataManager
      ...this.plugin.settings, // Merge in Obsidian settings.
    };

    await this.plugin.saveData(customStringify(dataToPersist)); // Save all data
    this.trigger('data-updated');
  }

  /** Persist changes while preserving other settings */
  private async persistOLD() {
    // Get current settings from the plugin
    const currentSettings = this.plugin.settings;

    const dataToPersist = {
      ...currentSettings, // Use current settings instead of defaults
      userData: this.db.data.userData,
      config: this.db.data.config,
      availableTags: this.db.data.availableTags,
      tagCounts: this.db.data.tagCounts,
      processedFileRecords: this.db.data.processedFileRecords,
      processedHashes: this.db.data.processedHashes,
      minimizedProgressDisplay: this.db.data.minimizedProgressDisplay
    }

    await this.plugin.saveData(customStringify(dataToPersist));
    this.trigger('data-updated');
  }

  async persistDataToFile(backup: boolean = false) {
    if (!this.db.data.userData || Object.keys(this.db.data.userData.map).length == 0) {
      this.plugin.logger.warn('DataManager: No user data to persist.');
      return;
    }

    const dataToSave = {
      userData: this.db.data.userData,
      config: this.db.data.config,
      availableTags: this.db.data.availableTags,
      tagCounts: this.db.data.tagCounts,
      processedFileRecords: this.db.data.processedFileRecords,
      processedHashes: this.db.data.processedHashes,
      minimizedProgressDisplay: this.db.data.minimizedProgressDisplay
    };

    const dataStr = customStringify(dataToSave, true);
    const filename = backup ? 'userData_backup.json' : 'userData.json';

    const screenshotStorageFolder = await this.plugin.getFolderFromSettingsKey('screenshotStorageFolderPath');
    const persistFileLocation = normalizePath(`${screenshotStorageFolder}/${filename}`);

    if (!this.plugin.app.vault.getAbstractFileByPath(persistFileLocation)) {
      await this.plugin.app.vault.create(persistFileLocation, dataStr);
      this.plugin.logger.info("created new file", persistFileLocation);
    } else {
      const file = this.plugin.app.vault.getFileByPath(persistFileLocation);
      if (file) {
        // Create a backup with date
        const backupDate = DateTime.now();
        const newLocationForExistingFile = normalizePath(
          `${screenshotStorageFolder}/${filename}_${backupDate.toFormat('yyyy-MM-dd')}`
        );

        // Only create a new backup if one doesn't exist for today
        if (!this.plugin.app.vault.getAbstractFileByPath(newLocationForExistingFile)) {
          const currentFileContent = await this.plugin.app.vault.cachedRead(file);
          await this.plugin.app.vault.create(newLocationForExistingFile, currentFileContent);
          this.plugin.logger.info("created new backup file", newLocationForExistingFile);

          // Cleanup old backups (keep last 7 days)
          const backupRetentionDays = 7;
          const files = this.plugin.app.vault.getFiles();
          const backupFiles = files.filter(f => {
            const path = f.path;
            return path.startsWith(screenshotStorageFolder) &&
              path.includes('userData_backup') &&
              path.match(/\d{4}-\d{2}-\d{2}/);
          });

          for (const backupFile of backupFiles) {
            const dateMatch = backupFile.path.match(/(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
              const backupFileDate = DateTime.fromFormat(dateMatch[1], 'yyyy-MM-dd');
              if (backupDate.diff(backupFileDate, 'days').days > backupRetentionDays) {
                await this.plugin.app.fileManager.trashFile(backupFile);
                this.plugin.logger.info("deleted old backup file", backupFile.path);
              }
            }
          }
        }

        this.plugin.app.vault.modify(file, dataStr);
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
      this.db.data = parsedData;
      await this.persist();
    } catch (error) {
      this.plugin.logger.error('Failed to import userData:', error);
      throw new Error('Invalid JSON file. Please ensure it is correctly formatted.');
    }
  }

  getConfig() {
    return this.db.data.config || {};
  }

  getProcessedFileRecords() {
    return this.db.data.processedFileRecords;
  }

  getProcessedHashes() {
    return this.db.data.processedHashes;
  }

  async addProcessedFileRecord(id: string, record: ProcessedFileRecord) {
    this.db.data.processedFileRecords[id] = record;
    await this.persist();
  }

  async removeProcessedFileRecord(id: string, hash: string = '') {
    if (!this.db.data.processedFileRecords[id]) {
      this.plugin.logger.warn('DataManager: Record not found in processedFileRecords');
      if (hash != '' && this.db.data.processedFileRecords[hash]) {
        this.plugin.logger.warn('DataManager: Hash found in processedFileRecords');
        delete this.db.data.processedFileRecords[hash];
      } else {
        return;
      }
    } else {
      delete this.db.data.processedFileRecords[id];
    }
    await this.persist();
  }

  async addProcessedHash(hash: string) {
    this.db.data.processedHashes.add(hash);
    await this.persist();
  }

  async removeProcessedHash(hash: string) {
    if (!this.db.data.processedHashes.has(hash)) {
      this.plugin.logger.warn('DataManager: Hash not found in processedHashes');
      return;
    }
    this.db.data.processedHashes.delete(hash);
    await this.persist();
  }

  async addProcessedFileRecordAndHash(id: string, record: ProcessedFileRecord, hash: string) {
    this.db.data.processedFileRecords[id] = record;
    this.db.data.processedHashes.add(hash);
    await this.persist();
  }

  async removeProcessedFileRecordAndHash(id: string, hash: string) {
    if (!this.db.data.processedFileRecords[id]) {
      this.plugin.logger.warn('DataManager: Record not found in processedFileRecords');
      if (this.db.data.processedFileRecords[hash]) {
        this.plugin.logger.warn('DataManager: Hash found in processedFileRecords');
        delete this.db.data.processedFileRecords[hash];
      }
    } else {
      delete this.db.data.processedFileRecords[id];
    }

    this.db.data.processedHashes.delete(hash);
    await this.persist();
  }

  /** Check for unprocessed images and trigger processing */
  /** Keeping for posterity sake as the application needs change */
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

  /** Perform a comprehensive cleanup of the database */
  async cleanupDatabase(): Promise<{ message: string; details: Record<string, number> }> {
    const stats = {
      removedEntries: 0,
      removedProcessedRecords: 0,
      removedHashes: 0,
      fixedTags: 0
    };

    // 1. Clean up entries with missing files
    for (const id of [...this.db.data.userData.list]) {
      const entry = this.db.data.userData.map[id];
      if (!entry) continue;

      let shouldRemove = false;

      // Check if screenshot file exists
      if (entry.screenshotStoragePath) {
        const screenshotExists = this.plugin.app.vault.getAbstractFileByPath(entry.screenshotStoragePath);
        if (screenshotExists instanceof TFile) {
          shouldRemove = true;
        }
      }

      // Check if note file exists
      if (entry.notePath) {
        const noteExists = this.plugin.app.vault.getAbstractFileByPath(entry.notePath);
        if (noteExists instanceof TFile) {
          shouldRemove = true;
        }
      }

      // Check if metadata file exists
      if (entry.metadataPath) {
        const metadataExists = this.plugin.app.vault.getAbstractFileByPath(entry.metadataPath);
        if (metadataExists instanceof TFile) {
          shouldRemove = true;
        }
      }

      if (shouldRemove) {
        await this.removeEntry(id);
        stats.removedEntries++;
      }
    }

    // 2. Run the standard cleanup of processed records
    const beforeRecords = Object.keys(this.db.data.processedFileRecords).length;
    const beforeHashes = this.db.data.processedHashes.size;
    await this.cleanupProcessedRecords();
    stats.removedProcessedRecords = beforeRecords - Object.keys(this.db.data.processedFileRecords).length;
    stats.removedHashes = beforeHashes - this.db.data.processedHashes.size;

    // 3. Recalculate all tags
    const beforeTagCount = this.db.data.availableTags.size;
    this.calculateTags();
    stats.fixedTags = Math.abs(beforeTagCount - this.db.data.availableTags.size);

    // 4. Save changes
    await this.persist();

    // Return cleanup summary
    return {
      message: 'Database cleanup completed successfully',
      details: stats
    };
  }

  async deleteAllEntries() {
    try {
      this.db.data = { ...this.db.data, ...DEFAULT_STORED_DATA };
      await this.persist();
      return true;
    } catch (error) {
      this.plugin.logger.error('Failed to delete all entries:', error);
      return false;
    }
  }
}

import { SelectImagesModal } from '@/components/modals/SelectImagesModal';
import { IMAGE_EXTENSIONS } from '@/constants';
import { shouldProcessImage } from '@/lib/image-utils';
import VisionRecallPlugin from '@/main';
import { FolderWithPath } from '@/types/shared-types';
import { App, TFile, TFolder } from 'obsidian';


export class HelperService {
  plugin: VisionRecallPlugin;
  app: App;

  constructor(
    plugin: VisionRecallPlugin,
  ) {
    this.plugin = plugin;
    this.app = plugin.app;
  }

  async retrieveFolders(folder: TFolder): Promise<TFolder[]> {
    const allFiles = folder.children;
    return allFiles.filter(file => file instanceof TFolder);
  }

  /**
   * Retrieves all folders in the vault recursively
   * @returns An array of TFolder objects representing all directories in the vault
   */
  async retrieveAllFolders(): Promise<TFolder[]> {
    const rootFolder = this.app.vault.getRoot();
    const allFolders: TFolder[] = [rootFolder];

    // Helper function to recursively collect all folders
    const collectFolders = async (folder: TFolder) => {
      const subFolders = await this.retrieveFolders(folder);
      allFolders.push(...subFolders);

      for (const subFolder of subFolders) {
        await collectFolders(subFolder);
      }
    };

    await collectFolders(rootFolder);
    return allFolders;
  }

  /**
   * Retrieves all folders in the vault with their paths
   * @returns An array of objects containing the folder and its path
   */
  async retrieveAllFoldersWithPaths(): Promise<FolderWithPath[]> {
    const folders = await this.retrieveAllFolders();
    return folders.map(folder => {
      return {
        folder: folder,
        path: folder.path === '/' ? '/' : folder.path
      };
    });
  }

  async retrieveImagesFromFolder(folder: TFolder, shouldProcessCheck: boolean = true): Promise<TFile[]> {
    if (!folder) {
      this.plugin.logger.warn('Folder not configured');
      return [];
    }

    const allFiles = folder.children;

    const files = allFiles.filter(file => {
      if (!(file instanceof TFile)) return false;
      const ext = file.extension.toLowerCase();
      return IMAGE_EXTENSIONS.includes(ext);
    });

    let selectedFiles: TFile[] = [];

    if (files.length > 0) {
      for (const file of files) {
        if (file instanceof TFile) {
          if (shouldProcessCheck && await shouldProcessImage(this.plugin, file)) {
            selectedFiles.push(file);
          } else {
            selectedFiles.push(file);
          }
        }
      }
    }

    return selectedFiles;
  }

  async retrieveImagesFromVaultRoot(): Promise<TFile[]> {
    const vaultFolder: TFolder = this.app.vault.getRoot();
    return this.retrieveImagesFromFolder(vaultFolder);
  }

  async selectImages(folder: TFolder) {
    const modal = new SelectImagesModal(this.plugin.app, this.plugin, folder, (selectedImages) => {
      this.plugin.processingQueue.addMultipleToQueue(selectedImages);
    });
    modal.open();
  }
}
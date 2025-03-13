import VisionRecallPlugin from '@/main';
import { normalizePath } from 'obsidian';

export async function initializeFolders(plugin: VisionRecallPlugin) {
  try {
    const screenshotStorageFolder = await plugin.getFolderWithPrefixIfEnabled(plugin.settings.screenshotStorageFolderPath);
    const screenshotIntakeFolder = await plugin.getFolderWithPrefixIfEnabled(plugin.settings.screenshotIntakeFolderPath);
    const tempFolder = await plugin.getFolderWithPrefixIfEnabled(plugin.settings.tempFolderPath);
    const outputNotesFolder = await plugin.getFolderWithPrefixIfEnabled(plugin.settings.outputNotesFolderPath);

    if (!plugin.app.vault.getFolderByPath(screenshotStorageFolder)) {
      await plugin.app.vault.createFolder(screenshotStorageFolder);
    }

    if (!plugin.app.vault.getFolderByPath(screenshotIntakeFolder)) {
      await plugin.app.vault.createFolder(screenshotIntakeFolder);
    }

    if (!plugin.app.vault.getFolderByPath(tempFolder)) {
      await plugin.app.vault.createFolder(tempFolder);
    }

    if (!plugin.app.vault.getFolderByPath(outputNotesFolder)) {
      await plugin.app.vault.createFolder(outputNotesFolder);
    }

    return true;
  } catch (error) {
    this.logger.error('Error initializing folders:', error);
    return false;
  }
}

/**
 * Sanitizes a filename by replacing problematic characters with an empty string
 *  This is used in addition to normalizePath() (which is used 20+ times in this project)
 * @param input - The filename to sanitize
 * @returns The sanitized filename
 */
export function sanitizeFilename(input: string): string {
  // Define a regex pattern to match problematic filename characters
  const forbiddenChars = /[<>:"\/\\|?*\x00-\x1F]/g

  // Replace them with an empty string
  return normalizePath(input.replace(forbiddenChars, ''))
}

/**
 * Sanitizes a string to be used as an Obsidian title
 *    (may be redundant wrt above function)
 * 
 * @param title - The title to sanitize
 * @returns The sanitized title
 */
export function sanitizeObsidianTitle(title: string): string {
  return title.replace(/[\\/:]/g, '');
}
import { TFile, normalizePath, Vault } from 'obsidian';
import { base64ToExtension } from './encode';
import VisionRecallPlugin from '@/main';

export async function saveBase64ImageInVault(plugin: VisionRecallPlugin, base64: string, folderPath: string, fileName?: string): Promise<TFile | null> {
  try {
    // Extract the file extension from the base64 string
    // const match = base64.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
    // const ext = match ? match[1] : 'png'; // Default to PNG if no MIME type is found
    const ext = base64ToExtension(base64);

    // Generate a filename if not provided
    const name = fileName ?? `screenshot-${Date.now()}.${ext}`;
    const filePath = normalizePath(`${folderPath}/${name}`);

    // Remove the base64 header
    const base64Data = base64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Get the Obsidian filesystem
    const vault = plugin.app.vault;
    if (!(vault instanceof Vault)) {
      plugin.logger.error("This Obsidian instance does not support file writing.");
      return null;
    }

    // Ensure the folder exists
    const folderExists = vault.getFolderByPath(folderPath);
    if (!folderExists) {
      // await adapter.mkdir(folderPath);
      return null;
    }

    // Write the file
    await vault.createBinary(filePath, buffer);

    // Return the saved file
    const file = plugin.app.vault.getAbstractFileByPath(filePath);
    if (file instanceof TFile) {
      return file;
    } else {
      return null;
    }
  } catch (error) {
    plugin.logger.error("Error saving base64 image in vault:", error);
    return null;
  }
}

import VisionRecallPlugin from '@/main';

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
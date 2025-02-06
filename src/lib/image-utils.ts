import VisionRecallPlugin from '@/main';
import { TFile } from 'obsidian';

export async function computeFileHash(plugin: VisionRecallPlugin, file: TFile): Promise<string> {
  // Read the binary content of the file.
  const arrayBuffer = await plugin.app.vault.readBinary(file);

  // Compute a SHA-256 hash of the file's content.
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);

  // Convert the hash to a hex string.
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Determines whether the image file should be processed.
 * 
 * First, it checks if there's already a record for the file's path and if the
 * file's metadata (size and last modified time) is unchanged. If so, it assumes
 * the file has already been processed.
 * 
 * If metadata differs or no record exists, it computes the file's hash and checks
 * whether that hash has been seen before (even if the file was renamed or moved).
 *
 * @param file A TFile representing an image in your target directory.
 * @returns A promise that resolves to true if the file should be processed,
 *          or false if it's already been handled.
 */
export async function shouldProcessImage(plugin: VisionRecallPlugin, file: TFile, onlyCheckHash: boolean = false): Promise<boolean> {
  const stat = file.stat;

  if (!onlyCheckHash) {
    const existingRecord = (await plugin.dataManager.getProcessedFileRecords())[file.path];

    // 1. Preliminary check: If we've seen this file path and its size & modified
    //    timestamp haven't changed, assume it's already been processed.
    if (existingRecord && existingRecord.size === stat.size && existingRecord.mtime === stat.mtime) {
      return false;
    }
  }

  // 2. Since we either haven't seen this file or its metadata changed,
  //    compute the file's content hash.
  const hash = await computeFileHash(plugin, file);

  // 3. Check if the hash has already been processed.
  const processedHashes = plugin.dataManager.getProcessedHashes();
  plugin.logger.debug(`Checking if hash ${JSON.stringify(processedHashes, null, 2)} has already been processed.`);
  if (processedHashes?.has(hash)) {
    // Update (or add) the record for this file path with the current metadata.
    plugin.dataManager.addProcessedFileRecord(file.path, { size: stat.size, mtime: stat.mtime, hash });
    return false;
  }

  // 4. If the hash is new, mark the file as processed.
  plugin.dataManager.addProcessedFileRecordAndHash(file.path, { size: stat.size, mtime: stat.mtime, hash }, hash);
  return true;
}
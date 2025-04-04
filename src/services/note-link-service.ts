import VisionRecallPlugin from '@/main';
import { Notice, Plugin, TFile } from 'obsidian';

export const findNotesWithTagInline = async (plugin: VisionRecallPlugin, tag: string): Promise<string[]> => {
  const matchingFiles: string[] = [];

  for (const file of plugin.app.vault.getMarkdownFiles()) {
    const content = await plugin.app.vault.cachedRead(file);
    if (content.includes(tag)) {
      matchingFiles.push(file.path);
    }
  }

  return matchingFiles;
}

// --- Helper Functions for Note Linking by Full Unique Tag (Using metadataCache) ---

export async function getNoteByUniqueTagOrCreateTag(plugin: VisionRecallPlugin, noteName: string, parentTagPrefix: string): Promise<TFile | null> {
  const { vault, metadataCache, workspace } = plugin.app;
  let targetFile = vault.getAbstractFileByPath(`${noteName}.md`);

  if (!targetFile || !(targetFile instanceof TFile)) {
    // If not found by name, try to find by unique nested tag using metadataCache
    // We need to generate the unique tag first to search for it
    const uniqueId = generateUniqueId();
    const fullUniqueTag = `#${parentTagPrefix}/${uniqueId}`;
    targetFile = await findNoteByUniqueTag(plugin, fullUniqueTag); // Pass the full unique tag
    if (targetFile && targetFile instanceof TFile) {
      return targetFile;
    } else {
      return null;
    }
  }

  // File found by name (or was just created if you have note creation logic elsewhere)
  const uniqueTag = await ensureUniqueTagExists(plugin, targetFile, parentTagPrefix);
  if (!uniqueTag) {
    plugin.logger.error("Failed to ensure unique tag exists for file:", targetFile.path);
    return null;
  }
  return targetFile;
}


export async function findNoteByUniqueTag(plugin: VisionRecallPlugin, fullUniqueTag: string): Promise<TFile | null> { // Now accepts fullUniqueTag
  const { vault, metadataCache } = plugin.app;
  const allFiles = vault.getMarkdownFiles();

  for (const file of allFiles) {
    const metadata = metadataCache.getFileCache(file); // Get cached metadata for the file
    if (metadata && metadata.tags) { // Check if metadata and tags exist
      const tags = metadata.tags;
      for (const tagCache of tags) { // Iterate through the tags in the cache
        if (tagCache.tag === fullUniqueTag) { // Check for exact match with fullUniqueTag
          return file; // Found a file with the exact unique tag
        }
      }
    }
  }
  return null; // No note found with the exact unique tag
}


export async function ensureUniqueTagExists(plugin: VisionRecallPlugin, file: TFile, parentTagPrefix: string): Promise<string | null> {
  const { vault } = plugin.app;
  let fileContent = await vault.cachedRead(file);
  const existingTag = await findUniqueTagInContent(fileContent, parentTagPrefix);

  if (existingTag) {
    return existingTag;
  } else {
    // Generate a new unique tag - now with nested structure #parent/child
    const newUniqueId = generateUniqueId();
    const newUniqueTag = `#${parentTagPrefix}/${newUniqueId}`; // Construct nested tag

    // Append the new tag to the end of the file content
    const updatedContent = fileContent.trimEnd() + `\n\n${newUniqueTag}`;

    vault.process(file, (data: string) => {
      return updatedContent;
    });

    return newUniqueTag;
  }
}

export async function findUniqueTagInContent(content: string, parentTagPrefix: string): Promise<string | null> {
  const tagRegex = new RegExp(`#${parentTagPrefix}/([a-zA-Z0-9-]+)`, 'g');
  const matches = content.matchAll(tagRegex);
  for (const match of matches) {
    if (match && match[0]) {
      return match[0];
    }
  }
  return null;
}


export function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export const searchForFirstNoteWithContent = async (plugin: VisionRecallPlugin, tag: string): Promise<string | null> => {
  const files = plugin.app.vault.getMarkdownFiles();
  for (const file of files) {
    const content = await plugin.app.vault.cachedRead(file);
    if (content.includes(tag)) {
      return file.path;
    }
  }
  return null;
}

export const openNoteWithContent = async (plugin: VisionRecallPlugin, content: string): Promise<void> => {
  plugin.logger.info(`openNoteWithContent: content: ${content}`);
  const file = await searchForFirstNoteWithContent(plugin, content);
  if (file) {
    await plugin.app.workspace.openLinkText(file, '', false, { active: true });
  } else {
    plugin.logger.info(`No notes found with content ${content}`);
  }
}


export const openNoteWithTag = async (plugin: VisionRecallPlugin, tag: string): Promise<void> => {
  plugin.logger.info(`openNoteWithTag: tag: ${tag}`);
  // const searchContent = `#${plugin.settings.tagPrefix}/${tag}`;
  let searchContent = tag;
  if (!tag.includes('#')) {
    searchContent = `#${plugin.settings.tagPrefix}/${tag}`;
  }
  const file = await searchForFirstNoteWithContent(plugin, searchContent);
  if (file) {
    await plugin.app.workspace.openLinkText(file, '', false, { active: true });
  } else {
    plugin.logger.info(`No notes found with tag ${tag}`);
    new Notice(`Could not find note with identifying tag: ${searchContent}`);
  }
}

export const findNoteByTag = async (plugin: VisionRecallPlugin, tag: string): Promise<TFile | null> => {
  plugin.logger.info(`findNoteByTag: tag: ${tag}`);
  // const searchContent = `#${plugin.settings.tagPrefix}/${tag}`;
  let searchContent = tag;
  if (!tag.includes('#')) {
    searchContent = `#${plugin.settings.tagPrefix}/${tag}`;
  }
  const file = await searchForFirstNoteWithContent(plugin, searchContent);
  if (file) {
    const filePath = plugin.app.vault.getAbstractFileByPath(file);
    if (filePath instanceof TFile) {
      return filePath;
    } else {
      return null;
    }
  }
  return null;
}
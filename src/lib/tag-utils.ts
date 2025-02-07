import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
// Define the Zod schema
export const TagsSchema = z.object({
  title: z.string(),
  tags: z.array(z.string()),
});

// Convert Zod schema to JSON Schema
// export const tagsJsonSchema = TagsSchema.toJSON();
export const tagsJsonSchema = zodToJsonSchema(TagsSchema);

export function formatTags(tags: string[]): string[] {
  return tags.map((tag) => {
    let formattedTag = tag.replace(/ /g, '_');
    return `#${formattedTag}`;
  });
}

export function formatTagsWithoutPrefix(tags: string[]): string[] {
  return tags.map((tag) => {
    let formattedTag = tag.replace(/ /g, '_');
    return formattedTag;
  });
}

export function parseTags(tags: string[]): string[] {
  return tags.map((tag) => {
    let formattedTag = tag.replace(/_/g, ' ');
    return formattedTag;
  });
}

export function tagsToCommaString(tags: string[]): string {
  return tags.join(', ');
}

export function tagsFromCommaString(tags: string): string[] {
  return tags.split(',').map(tag => tag.trim());
}

export function sanitizeObsidianTag(tag: string): string | null {
  // Replace spaces with underscores to maintain readability
  tag = tag.replace(/\s+/g, '_');

  // Remove all disallowed characters (keep letters, numbers, _, -, /)
  tag = tag.replace(/[^a-zA-Z0-9_\/-]/g, '');

  // Ensure there's at least one non-numeric character
  if (!/[a-zA-Z_\/-]/.test(tag)) {
    return null; // Return null if there's no valid non-numeric character
  }

  // Convert to lowercase to ensure case insensitivity
  // return tag.toLowerCase();
  return tag;
}
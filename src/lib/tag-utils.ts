import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
// Define the Zod schema
export const TagsSchema = z.object({
  tags: z.array(z.string()), // Ensures an array of strings
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
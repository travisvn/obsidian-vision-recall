import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { callLLMAPI } from '@/services/llm-service';
import { VisionRecallPluginSettings } from '@/types/settings-types';
import { getLanguagePromptModifierIfIndicated } from '@/lib/languages';

// Define the Zod schema for tags and title
export const TagsSchema = z.object({
  title: z.string(),
  tags: z.array(z.string()),
});

// Convert Zod schema to JSON Schema
export const tagsJsonSchema = zodToJsonSchema(TagsSchema);

// Define the TagsAndTitle type
export type TagsAndTitle = {
  tags: string[];
  title: string;
};

// Default tags and title
export const DEFAULT_TAGS_AND_TITLE: TagsAndTitle = {
  tags: [],
  title: 'Untitled Screenshot'
};

/**
 * Formats tags by replacing spaces with underscores and adding # prefix
 */
export function formatTags(tags: string[]): string[] {
  return tags.map((tag) => {
    let formattedTag = tag.replace(/ /g, '_');
    return `#${formattedTag}`;
  });
}

/**
 * Formats tags by replacing spaces with underscores without adding # prefix
 */
export function formatTagsWithoutPrefix(tags: string[]): string[] {
  return tags.map((tag) => {
    let formattedTag = tag.replace(/ /g, '_');
    return formattedTag;
  });
}

/**
 * Parses tags by replacing underscores with spaces
 */
export function parseTags(tags: string[]): string[] {
  return tags.map((tag) => {
    let formattedTag = tag.replace(/_/g, ' ');
    return formattedTag;
  });
}

/**
 * Converts an array of tags to a comma-separated string
 */
export function tagsToCommaString(tags: string[]): string {
  return tags.join(', ');
}

/**
 * Converts a comma-separated string to an array of tags
 */
export function tagsFromCommaString(tags: string): string[] {
  return tags.split(',').map(tag => tag.trim());
}

/**
 * Sanitizes a tag for Obsidian compatibility
 */
export function sanitizeObsidianTag(tag: string): string | null {
  // Replace spaces with underscores to maintain readability
  tag = tag.replace(/\s+/g, '_');

  // Remove all disallowed characters (keep letters, numbers, _, -, /)
  tag = tag.replace(/[^a-zA-Z0-9_\/-]/g, '');

  // Ensure there's at least one non-numeric character
  if (!/[a-zA-Z_\/-]/.test(tag)) {
    return null; // Return null if there's no valid non-numeric character
  }

  return tag;
}

/**
 * Generates tags and title from notes with retries
 */
export async function generateTagsWithRetries(
  generatedNotes: string,
  settings: VisionRecallPluginSettings,
  maxAttempts: number = 3
): Promise<TagsAndTitle> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const tagsAndTitle = await generateTags(generatedNotes, settings);

      if (!tagsAndTitle || !tagsAndTitle.tags || !tagsAndTitle.title) {
        console.error(`generateTagsWithRetries: Failed to generate tags. Retrying ${i + 1} of ${maxAttempts}`);
        continue;
      }

      const formattedTags = tagsToCommaString(formatTags(tagsAndTitle.tags));
      if (formattedTags.length > 0) {
        return tagsAndTitle;
      }
    } catch (error) {
      console.error(`generateTagsWithRetries: Error generating tags. Retrying ${i + 1} of ${maxAttempts}`, error);
    }
  }

  return DEFAULT_TAGS_AND_TITLE;
}

/**
 * Generates tags and title from notes
 */
export async function generateTags(generatedNotes: string, settings: VisionRecallPluginSettings): Promise<TagsAndTitle> {
  try {
    const languagePromptModifier = getLanguagePromptModifierIfIndicated(settings)
    const prompt = `
Based on the following notes, suggest a concise title and relevant tags.
The title should be brief but descriptive.
The tags should be single words or short phrases that categorize the content.
${languagePromptModifier}

Notes:
${generatedNotes}

Respond with a JSON object in the following format:
{
  "title": "A concise title",
  "tags": ["tag1", "tag2", "tag3"]
}
`;

    const payload = {
      model: settings.endpointLlmModelName,
      messages: [
        { role: "user", content: prompt }
      ],
      max_tokens: settings.maxTokens,
      response_format: { type: "json_object" }
    };

    const chatEndpoint = '/chat/completions';

    const response = await callLLMAPI(
      settings,
      chatEndpoint,
      payload
    );

    if (!response) {
      console.error('Tag generation failed: No response from LLM');
      return DEFAULT_TAGS_AND_TITLE;
    }

    try {
      const parsedResponse = JSON.parse(response);

      if (!parsedResponse.title || !Array.isArray(parsedResponse.tags)) {
        console.error('Tag generation failed: Invalid response format', parsedResponse);
        return DEFAULT_TAGS_AND_TITLE;
      }

      return {
        title: parsedResponse.title,
        tags: parsedResponse.tags
      };
    } catch (parseError) {
      console.error('Tag generation failed: Error parsing response', parseError);
      return DEFAULT_TAGS_AND_TITLE;
    }
  } catch (error) {
    console.error('Tag generation failed:', error);
    return DEFAULT_TAGS_AND_TITLE;
  }
} 
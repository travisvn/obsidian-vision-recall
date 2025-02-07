import { OPENROUTER_HEADERS } from '@/constants';
import { tagsJsonSchema, TagsSchema } from '@/lib/tag-utils';
import { VisionRecallPluginSettings } from '@/types/settings-types';

export const VISION_LLM_PROMPT = "Analyze this screenshot and describe its content and identify the type of screenshot if possible.";

export function adjustEndpoint(apiEndpointUrl: string, shouldRemove: boolean): string {
  const suffix = '/v1'

  if (shouldRemove) {
    return apiEndpointUrl.endsWith(suffix)
      ? apiEndpointUrl.slice(0, -suffix.length)
      : apiEndpointUrl
  } else {
    return apiEndpointUrl.endsWith(suffix)
      ? apiEndpointUrl
      : apiEndpointUrl + suffix
  }
}

export async function callLLMAPI(
  settings: VisionRecallPluginSettings,
  apiEndpoint: string,
  payload: any
): Promise<string | null> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (settings.llmProvider === 'openai' && settings.apiKey) {
    headers['Authorization'] = `Bearer ${settings.apiKey}`;
  }

  const baseUrl = settings.apiBaseUrl || (settings.llmProvider === 'ollama' ? 'http://localhost:11434/v1' : 'https://api.openai.com/v1');

  // Add OpenRouter specific headers if the baseUrl contains "openrouter"
  if (baseUrl.toLowerCase().includes('openrouter')) {
    headers['HTTP-Referer'] = OPENROUTER_HEADERS['HTTP-Referer'];
    headers['X-Title'] = OPENROUTER_HEADERS['X-Title'];
  }

  try {
    const response = await fetch(`${baseUrl}${apiEndpoint}`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`LLM API Error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (settings.llmProvider === 'openai' || settings.llmProvider === 'ollama') {
      return data?.choices?.[0]?.message?.content || null;
    }

    return null;
  } catch (error) {
    console.error('LLM API Call Failed:', error);
    return null;
  }
}

function sanitizeTags(rawTags: any): string[] {
  // If input is a string, try to parse it if it looks like JSON
  if (typeof rawTags === 'string') {
    // Remove any leading/trailing whitespace and common wrapper characters
    const trimmed = rawTags.trim().replace(/^[\[\({]|[\]\)}]$/g, '');

    try {
      // Attempt to parse if it looks like JSON
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        rawTags = JSON.parse(trimmed);
      } else {
        // Split by common delimiters if it's a plain string
        rawTags = trimmed.split(/[,;\n]/).map(tag => tag.trim());
      }
    } catch {
      // If parsing fails, split by common delimiters
      rawTags = trimmed.split(/[,;\n]/).map(tag => tag.trim());
    }
  }

  // Ensure we're working with an array
  if (!Array.isArray(rawTags)) {
    rawTags = [String(rawTags)];
  }

  return rawTags
    .map(tag => {
      if (typeof tag !== 'string') return String(tag);
      return tag
        // Remove unwanted characters
        .replace(/[\[\]*/\\`'")(}{\n]/g, '')
        // Remove extra spaces
        .trim()
        // Convert multiple spaces to single space
        .replace(/\s+/g, ' ');
    })
    // Filter out empty tags
    .filter(tag => tag && tag.length > 0)
    // Take only first 5 tags
    .slice(0, 5);
}

export const DEFAULT_TAGS_AND_TITLE = {
  tags: [],
  title: 'Untitled'
}

export type TagsAndTitle = {
  tags: string[];
  title: string;
}

export async function llmSuggestTagsAndTitle(settings: VisionRecallPluginSettings, notesText: string | null): Promise<TagsAndTitle> {
  if (!notesText) {
    return DEFAULT_TAGS_AND_TITLE;
  }

  try {
    const tagPrompt = `Please suggest exactly 5 relevant tags or keywords to categorize the following notes as well as a title for the notes. Return ONLY a JSON object with the following properties: tags (array of strings), title (string). Example format: { title: 'Title of the notes', tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'] }\n\nNotes:\n${notesText}`;

    const tagPayload = {
      model: settings.endpointLlmModelName,
      messages: [
        { role: "user", content: tagPrompt }
      ],
      max_tokens: 140,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'titleAndTags',
          ...tagsJsonSchema
        },
        strict: true,
      }
    };

    const llmResponseText = await callLLMAPI(
      settings,
      '/chat/completions',
      tagPayload
    );

    if (!llmResponseText) {
      return DEFAULT_TAGS_AND_TITLE;
    }

    console.log('LLM Response Text:', llmResponseText);

    // Attempt Zod parsing first
    try {
      const parsedResponse = JSON.parse(llmResponseText);
      const result = TagsSchema.safeParse(parsedResponse);

      if (result.success) {
        return {
          tags: sanitizeTags(result.data.tags),
          title: result.data.title.replace(/[\\"]/g, '').trim() || 'Untitled'
        };
      }
    } catch (e) {
      // JSON parse failed, fall through to legacy handling
    }

    // Fallback handling for non-JSON responses or invalid schemas
    let title = 'Untitled';
    const titleMatch = llmResponseText.match(/"title":\s*"?(.*?)"?([,}]|$)/i) ||
      llmResponseText.match(/title:\s*"?(.*?)"?([,}]|$)/i) ||
      llmResponseText.match(/'title':\s*"?(.*?)"?([,}]|$)/i) ||
      llmResponseText.match(/title:\s*(.*?)[,}]/i);

    if (titleMatch) {
      title = titleMatch[1].trim().replace(/[\\"]/g, '') || 'Untitled';
    }

    return {
      tags: sanitizeTags(llmResponseText),
      title: title.substring(0, 200) // Limit title length
    };
  } catch (error) {
    console.error('LLM Tag Suggestion Error:', error);
    return DEFAULT_TAGS_AND_TITLE;
  }
}

export async function fetchLLMAPIGet(
  settings: VisionRecallPluginSettings,
  apiEndpoint: string,
  removeSuffix: boolean = false
): Promise<string | null> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (settings.llmProvider === 'openai' && settings.apiKey) {
    headers['Authorization'] = `Bearer ${settings.apiKey}`;
  }

  let baseUrl = settings.apiBaseUrl || (settings.llmProvider === 'ollama' ? 'http://localhost:11434/v1' : 'https://api.openai.com/v1');

  if (removeSuffix) {
    baseUrl = adjustEndpoint(baseUrl, true)
  }

  try {
    const response = await fetch(`${baseUrl}${apiEndpoint}`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      console.error(`LLM API Error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error('LLM API Call Failed:', error);
    return null;
  }
}

type OllamaModelDetails = {
  parent_model: string;
  format: string;
  family: string;
  families: string[];
  parameter_size: string;
  quantization_level: string;
};

type OllamaModel = {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: OllamaModelDetails;
};

type OllamaApiResponse = {
  models: OllamaModel[];
};

/**
 * Fetches models from the Ollama API.
 * @param endpointUrl - The base URL of the Ollama API (without `/api/tags`).
 * @returns A promise resolving to an array of Ollama models.
 */
async function fetchOllamaModels(endpointUrl: string): Promise<OllamaModel[]> {
  try {
    let endpoint = adjustEndpoint(endpointUrl, true)
    const response = await fetch(`${endpoint}/api/tags`);

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }

    const data: OllamaApiResponse = await response.json();
    return data.models;
  } catch (error) {
    console.error("Error fetching Ollama models:", error);
    return [];
  }
}

type OpenAIModel = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
};

type OpenAIModelsResponse = {
  object: string;
  data: OpenAIModel[];
};

/**
 * Fetches models from an OpenAI-compatible API.
 * @param endpointUrl - The base URL of the OpenAI API (without `/v1/models`).
 * @returns A promise resolving to an array of OpenAI models.
 */
async function fetchOpenAIModels(endpointUrl: string, apiKey: string): Promise<OpenAIModel[]> {
  try {
    let endpoint = adjustEndpoint(endpointUrl, true)
    const response = await fetch(`${endpoint}/v1/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }

    const data: OpenAIModelsResponse = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching OpenAI models:", error);
    return [];
  }
}

export async function getModels(settings: VisionRecallPluginSettings): Promise<string[]> {
  if (!settings.apiBaseUrl) {
    return [];
  }

  let models: string[] = [];
  if (settings.llmProvider === 'openai') {
    models = (await fetchOpenAIModels(settings.apiBaseUrl, settings.apiKey)).map(model => model.id);
  } else if (settings.llmProvider === 'ollama') {
    models = (await fetchOllamaModels(settings.apiBaseUrl)).map(model => model.name);
  }

  return models;
}
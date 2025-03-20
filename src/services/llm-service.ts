import { OPENROUTER_HEADERS } from '@/constants';
import { getLanguagePromptModifierIfIndicated } from '@/lib/languages';
import { tagsJsonSchema, TagsSchema } from '@/lib/tag-utils';
import { Config } from '@/types/config-types';
import { VisionRecallPluginSettings } from '@/types/settings-types';
import { requestUrl, RequestUrlParam, RequestUrlResponse } from 'obsidian';

export const VISION_LLM_PROMPT = "Analyze this screenshot and describe its content and identify the type of screenshot if possible.";

export const NOTES_LLM_PROMPT = "The following OCR text and vision analysis are from a screenshot. Summarize and synthesize the text and vision analysis and identify key information.";

export const getVisionLLMPrompt = (config: Config) => {
  if (config.visionLLMPrompt && config.visionLLMPrompt.trim() !== '') {
    return config.visionLLMPrompt;
  }

  return VISION_LLM_PROMPT;
}

export const getNotesLLMPrompt = (config: Config) => {
  if (config.notesLLMPrompt && config.notesLLMPrompt.trim() !== '') {
    return config.notesLLMPrompt;
  }

  return NOTES_LLM_PROMPT;
}

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
    const request: RequestUrlParam = {
      url: `${baseUrl}${apiEndpoint}`,
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
    };

    const response: RequestUrlResponse = await requestUrl(request);

    if (response.status !== 200) {
      console.error(`LLM API Error: ${response.status}`);
      return null;
    }

    // const data = await response.json();
    const data = response.json;

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
  title: 'Untitled',
  tags: [],
}

export type TagsAndTitle = {
  title: string;
  tags: string[];
}

export async function llmSuggestTagsAndTitle(settings: VisionRecallPluginSettings, notesText: string | null): Promise<TagsAndTitle> {
  if (!notesText) {
    return DEFAULT_TAGS_AND_TITLE;
  }

  try {
    const languagePromptModifier = getLanguagePromptModifierIfIndicated(settings)
    const tagPrompt = `Please suggest exactly 5 relevant tags or keywords to categorize the following notes as well as a title for the notes. Return ONLY a JSON object with the following properties: tags (array of strings), title (string). Example format: { title: 'Title of the notes', tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'] }${languagePromptModifier}\n\nNotes:\n${notesText}`;

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

    try {
      const { title, tags } = extractTitleAndTags(llmResponseText);
      return {
        tags: sanitizeTags(tags),
        title: title || 'Untitled'
      };
    } catch (e) {
      // JSON parse failed, fall through to legacy handling

      try {
        const jsonString = extractJSONFromResponse(llmResponseText);
        const parsedResponse = JSON.parse(jsonString);
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
    }
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
    const request: RequestUrlParam = {
      url: `${baseUrl}${apiEndpoint}`,
      method: 'GET',
      headers: headers,
    };

    const response = await requestUrl(request);

    if (response.status !== 200) {
      console.error(`LLM API Error: ${response.status}`);
      return null;
    }

    const data = response.json;

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
    const response = await requestUrl(`${endpoint}/api/tags`);

    if (response.status !== 200) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data: OllamaApiResponse = response.json;
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
    const request: RequestUrlParam = {
      url: `${endpoint}/v1/models`,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    const response = await requestUrl(request);

    if (response.status !== 200) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data: OpenAIModelsResponse = response.json;
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

function extractJSONFromResponse(responseText: string): string {
  // Handle markdown code blocks
  const withoutBackticks = responseText.replace(/```(json)?/g, '');

  // Find first { and last } accounting for potential whitespace
  const firstBrace = withoutBackticks.indexOf('{');
  const lastBrace = withoutBackticks.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) return responseText;

  // Include everything from first { to last }
  let jsonCandidate = withoutBackticks.slice(firstBrace, lastBrace + 1);

  // Clean common LLM artifacts
  jsonCandidate = jsonCandidate
    .replace(/,\s*}/g, '}') // Remove trailing commas
    .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
    .replace(/\\"/g, '"')   // Unescape quotes
    .replace(/\n/g, '');    // Remove newlines

  return jsonCandidate;
}

function extractFlexibleJSONFromResponse(response: string): Record<string, any> | null {
  // Step 1: Match a JSON block wrapped in backticks or a standalone JSON object
  const match = response.match(/```(?:json)?([\s\S]*?)```|{[\s\S]*}/);
  if (!match) return null;

  let jsonString = match[1] || match[0];

  // Step 2: Cleanup strategies
  jsonString = jsonString
    .replace(/\\"/g, '"') // Unescape quotes
    .replace(/\\n/g, '')  // Remove literal '\n' characters
    .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
    .replace(/(?<!")(\b\w+\b)(?=\s*:)/g, '"$1"') // Add quotes around unquoted keys
    .trim();

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to parse JSON after cleanup:', error);
  }

  return null;
}

function extractTitleAndTags(response: string): { title: string | null; tags: string[] } {
  const parsedJSON = extractFlexibleJSONFromResponse(response);

  if (parsedJSON && typeof parsedJSON === 'object') {
    const title = typeof parsedJSON.title === 'string' ? parsedJSON.title : null;
    const tags = Array.isArray(parsedJSON.tags) ? parsedJSON.tags.filter(tag => typeof tag === 'string') : [];
    return { title, tags };
  }

  return { title: null, tags: [] };
}

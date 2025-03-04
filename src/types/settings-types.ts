// options  | 'gemini' | 'claude' | 'groq' | 'azure'

export interface VisionRecallPluginSettings {
  llmProvider: 'openai' | 'ollama';
  apiKey: string;
  apiBaseUrl: string;
  visionModelName: string;
  endpointLlmModelName: string;

  useParentFolder: boolean;
  parentFolderPath: string;

  addPrefixToFolderNames: boolean;
  prefixToAddToFolderNames: string;
  screenshotStorageFolderPath: string;
  screenshotIntakeFolderPath: string;
  outputNotesFolderPath: string;

  intakeFromVaultFolder: boolean;
  limitIntakeToCSV: string;

  maxTokens: number;
  truncateOcrText: number;
  truncateVisionLLMResponse: number;
  includeMetadataInNote: boolean;

  tempFolderPath: string;

  tagPrefix: string;

  disableDuplicateFileCheck: boolean;

  showStatusBarButton: boolean;

  debugMode: boolean;

  allowDeepLinkScreenshotIntake: boolean;
}

export const DEFAULT_SETTINGS: VisionRecallPluginSettings = {
  llmProvider: 'openai',
  apiKey: '',
  apiBaseUrl: '',
  visionModelName: 'gpt-4o-mini',
  endpointLlmModelName: 'gpt-4o-mini',

  useParentFolder: true,
  parentFolderPath: 'VisionRecall',

  addPrefixToFolderNames: false,
  prefixToAddToFolderNames: 'VisionRecall-',

  screenshotStorageFolderPath: 'Screenshots',
  screenshotIntakeFolderPath: 'Intake',
  outputNotesFolderPath: 'Notes',

  intakeFromVaultFolder: false,
  limitIntakeToCSV: '',

  maxTokens: 500,
  truncateOcrText: 500,
  truncateVisionLLMResponse: 500,
  includeMetadataInNote: true,

  tempFolderPath: 'Temp',

  tagPrefix: 'VisionRecall',

  disableDuplicateFileCheck: false,

  showStatusBarButton: true,

  debugMode: false,

  allowDeepLinkScreenshotIntake: false,
}

export type SettingsKey = keyof VisionRecallPluginSettings;


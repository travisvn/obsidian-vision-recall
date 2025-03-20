import { VISION_LLM_PROMPT, NOTES_LLM_PROMPT } from '@/services/llm-service';

export interface Config {
  enableAutoIntakeFolderProcessing?: boolean;

  enablePeriodicIntakeFolderProcessing?: boolean;
  intakeFolderPollingInterval?: number;

  enableAdvancedLogging?: boolean;

  defaultMinimizedProgressDisplay?: boolean;

  experimentalFeatures?: string[];

  visionLLMPrompt?: string;

  enableCategoryDetection?: boolean; // this is rudimentarily implemented, so defaulting to false

  notesLLMPrompt?: string;

  [key: string]: unknown;
}

export const DefaultConfig: Config = {
  enableAutoIntakeFolderProcessing: false,
  enablePeriodicIntakeFolderProcessing: false,
  intakeFolderPollingInterval: 300, // 300 seconds, or 5 minutes
  defaultMinimizedProgressDisplay: false, // Currently not functional
  experimentalFeatures: [],
  visionLLMPrompt: VISION_LLM_PROMPT,
  enableCategoryDetection: false,
  notesLLMPrompt: NOTES_LLM_PROMPT,
}; 
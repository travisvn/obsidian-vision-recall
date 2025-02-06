export interface Config {
  enableAutoIntakeFolderProcessing?: boolean;

  enablePeriodicIntakeFolderProcessing?: boolean;
  intakeFolderPollingInterval?: number;

  enableAdvancedLogging?: boolean;

  defaultMinimizedProgressDisplay?: boolean;

  experimentalFeatures?: string[];

  [key: string]: unknown;
}

export const DefaultConfig: Config = {
  enableAutoIntakeFolderProcessing: false,
  enablePeriodicIntakeFolderProcessing: false,
  intakeFolderPollingInterval: 300, // 300 seconds, or 5 minutes
  defaultMinimizedProgressDisplay: false, // Currently not functional
  experimentalFeatures: []
}; 
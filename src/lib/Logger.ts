// import VisionRecallPlugin from '@/main';
import { IS_DEV, PLUGIN_NAME } from '@/constants';
import VisionRecallPlugin from '@/main';
// import { VisionRecallPluginSettings } from '@/types/settings-types';

export class PluginLogger {
  private plugin: VisionRecallPlugin;
  // settings: VisionRecallPluginSettings;

  constructor(plugin: VisionRecallPlugin) {
    this.plugin = plugin;
  }

  private shouldLog(): boolean {
    return IS_DEV || this.plugin.settings.debugMode;
  }

  info(...args: any[]): void {
    if (this.shouldLog()) {
      console.info(`[${PLUGIN_NAME}] INFO:`, ...args);
    }
  }

  debug(...args: any[]): void {
    if (this.shouldLog()) {
      console.debug(`[${PLUGIN_NAME}] DEBUG:`, ...args);
    }
  }

  warn(...args: any[]): void {
    console.warn(`[${PLUGIN_NAME}] WARN:`, ...args);
  }

  error(...args: any[]): void {
    console.error(`[${PLUGIN_NAME}] ERROR:`, ...args);
  }
} 
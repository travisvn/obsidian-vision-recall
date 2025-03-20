import { App, Modal, Notice } from 'obsidian';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import VisionRecallPlugin from '@/main';
import { DateTime } from 'luxon';
import { DataManager } from '@/data/DataManager';
import { getModels } from '@/services/llm-service';

interface TestSetupModalProps {
  dataManager: DataManager;
  plugin: VisionRecallPlugin;
  onClose: () => void;
}

const TestSetupView: React.FC<TestSetupModalProps> = ({ dataManager, plugin, onClose }) => {
  const settings = plugin.settings;

  const [models, setModels] = useState<string[]>([]);
  // const [error, setError] = useState<string | null>('duke');
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    try {
      const models = await getModels(settings);
      setModels(models);
      plugin.logger.info(models);
    } catch (error) {
      plugin.logger.error(error);
      setError(error as string);
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Optional: Add some visual feedback
    plugin.logger.info(`Copied ${text} to clipboard`);
    new Notice('Copied to clipboard');
  };

  return (
    <div className='flex flex-col gap-4 items-center justify-center vision-recall-styling'>
      <details className='w-full'>
        <summary
          aria-label='Expand LLM configuration'
          className='text-lg font-bold cursor-pointer text-center mx-auto'
        >
          LLM configuration
        </summary>
        <div className="settings-display">
          <div className="setting-item">
            <div className="setting-label">Provider:</div>
            <div className="setting-value">{settings.llmProvider}</div>
          </div>

          <div className="setting-item">
            <div className="setting-label">API key:</div>
            <div className="setting-value">
              {settings.apiKey ? '********' : 'Not set'}
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-label">API base URL:</div>
            <div className="setting-value">
              {settings.apiBaseUrl || 'Default'}
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-label">Vision model:</div>
            <div className="setting-value">
              {settings.visionModelName}
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-label">Endpoint LLM model:</div>
            <div className="setting-value">
              {settings.endpointLlmModelName}
            </div>
          </div>
        </div>
      </details>

      <div className='flex flex-col gap-4 items-center justify-center'>
        <button
          type="button"
          onClick={() => testConnection()}
          className='cursor-pointer'
        >
          Test connection — Retrieve models
        </button>
      </div>

      <div className='flex flex-col gap-4 items-center justify-center w-full'>
        <h3 className='text-lg/0 p-0 m-0'>Models</h3>
        <div className='relative block min-w-full overflow-y-auto h-48'>
          {error && (
            <div className='text-center text-sm text-text-muted w-full mb-8'>
              <div className='text-red'>Connection unsuccessful.<br /><br />Error message:</div>
              {error}
            </div>
          )}
          {models.length > 0 ? (
            <div className='flex flex-col gap-1 items-center justify-center w-full'>
              {models.map((model) => (
                <div
                  key={model}
                  aria-label={'Copy to clipboard'}
                  data-tooltip-delay={0}
                  onClick={() => copyToClipboard(model)}
                  className="model-item"
                >
                  {model}
                </div>
              ))}
            </div>
          ) : (
            <div className='text-center text-sm text-text-muted'>No models found</div>
          )}
        </div>
      </div>
      <div className="button-group">
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export class TestSetupModal extends Modal {
  private metadata: any;
  private plugin: VisionRecallPlugin;

  constructor(app: App, plugin: VisionRecallPlugin, metadata: any) {
    super(app);
    this.metadata = metadata;
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl, titleEl } = this;
    titleEl.setText('Test your setup');
    const root = createRoot(contentEl);

    root.render(
      <TestSetupView
        dataManager={this.plugin.dataManager}
        plugin={this.plugin}
        onClose={() => this.close()}
      />
    );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

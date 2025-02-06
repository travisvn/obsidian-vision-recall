import { App, Modal, Notice } from 'obsidian';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import VisionRecallPlugin from '@/main';
import { DateTime } from 'luxon';
import { DataManager } from '@/data/DataManager';
import { getModels } from '@/services/llm-service';

interface TestConfigModalProps {
  dataManager: DataManager;
  plugin: VisionRecallPlugin;
  onClose: () => void;
}

const TestConfigView: React.FC<TestConfigModalProps> = ({ dataManager, plugin, onClose }) => {
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
    <div className='flex flex-col gap-4 items-center justify-center'>
      <details className='w-full'>
        <summary
          aria-label='Expand LLM Configuration'
          className='text-lg font-bold cursor-pointer text-center mx-auto'
        >
          LLM Configuration
        </summary>
        <div className="settings-display">
          <div className="setting-item">
            <div className="setting-label">Provider:</div>
            <div className="setting-value">{settings.llmProvider}</div>
          </div>

          <div className="setting-item">
            <div className="setting-label">API Key:</div>
            <div className="setting-value">
              {settings.apiKey ? '********' : 'Not set'}
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-label">API Base URL:</div>
            <div className="setting-value">
              {settings.apiBaseUrl || 'Default'}
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-label">Vision Model:</div>
            <div className="setting-value">
              {settings.visionModelName}
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-label">Endpoint LLM Model:</div>
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
          Test Connection — Retrieve Models
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

export class TestConfigModal extends Modal {
  private metadata: any;
  private plugin: VisionRecallPlugin;

  constructor(app: App, plugin: VisionRecallPlugin, metadata: any) {
    super(app);
    this.metadata = metadata;
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl, titleEl } = this;
    titleEl.setText('Test Config');
    const root = createRoot(contentEl);

    root.render(
      <TestConfigView
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

// Add some CSS styles
// const styles = `

// `;

// // Add styles to document
// const styleSheet = document.createElement('style');
// styleSheet.innerText = styles;
// document.head.appendChild(styleSheet); 
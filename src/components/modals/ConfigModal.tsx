import React, { useEffect, useState } from 'react';
import { Modal } from 'obsidian';
import { DataManager } from '@/data/DataManager';
import { Plugin } from 'obsidian';
import { Config, DefaultConfig } from '@/types/config-types';
import { createRoot } from 'react-dom/client';

const ConfigModalContent = ({
  dataManager,
  onClose,
}: {
  dataManager: DataManager;
  onClose: () => void;
}) => {
  const [initialized, setInitialized] = useState(false);
  const [config, setConfig] = useState<Config>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (initialized) return;
    const loadConfig = async () => {
      const currentConfig = dataManager.getConfig();
      setConfig(currentConfig);
      setInitialized(true);
    };
    loadConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await dataManager.updateConfig(config);
    onClose();
  };

  const updateConfig = (updates: Partial<Config>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setDirty(true);
  };

  if (!initialized) {
    return <div>Loading...</div>;
  }

  return (
    <div className="vr config-modal-container">
      <form onSubmit={handleSubmit} className="config-modal-form">
        <div className='flex flex-col items-center justify-center gap-2 mb-4'>
          <span className='text-sm italic opacity-50 hover:opacity-100 duration-300 text-center'>
            Most settings are in the Obsidian settings menu
          </span>
        </div>

        <div className="config-field">
          <label className="config-field-checkbox-label">
            <input
              type="checkbox"
              defaultChecked={config.enableAutoIntakeFolderProcessing || DefaultConfig.enableAutoIntakeFolderProcessing}
              onChange={e => updateConfig({ enableAutoIntakeFolderProcessing: e.target.checked })}
            />
            Enable auto intake folder processing
          </label>
        </div>

        <div className="config-field">
          <label className="config-field-checkbox-label">
            <input
              type="checkbox"
              defaultChecked={config.enablePeriodicIntakeFolderProcessing || DefaultConfig.enablePeriodicIntakeFolderProcessing}
              onChange={e => updateConfig({ enablePeriodicIntakeFolderProcessing: e.target.checked })}
            />
            Enable periodic intake folder processing
          </label>
        </div>

        <div className="config-field">
          <label>
            Intake folder polling (seconds)
          </label>
          <input
            type="number"
            min="30"
            max="86400"
            defaultValue={config.intakeFolderPollingInterval || DefaultConfig.intakeFolderPollingInterval}
            onChange={e => updateConfig({ intakeFolderPollingInterval: Number(e.target.value) })}
          />
        </div>

        <div className="config-field">
          <label className="config-field-checkbox-label">
            <input
              type="checkbox"
              defaultChecked={config.enableAdvancedLogging || DefaultConfig.enableAdvancedLogging}
              onChange={e => updateConfig({ enableAdvancedLogging: e.target.checked })}
            />
            Enable advanced logging
          </label>
        </div>


        {/* <div className="config-field">
          <label className="config-field-checkbox-label">
            <input
              type="checkbox"
              defaultChecked={config.defaultMinimizedProgressDisplay || DefaultConfig.defaultMinimizedProgressDisplay}
              onChange={e => updateConfig({ defaultMinimizedProgressDisplay: e.target.checked })}
            />
            Default minimized progress display
          </label>
        </div> */}


        <div className="config-modal-controls">
          <button type="submit" className="mod-cta cursor-pointer" disabled={!dirty}>
            Save changes
          </button>
          <button type="button" className="mod-warning cursor-pointer" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export class ConfigModal extends Modal {
  dataManager: DataManager;
  root: any;

  constructor(
    app: any,
    plugin: Plugin,
    dataManager: DataManager,
  ) {
    super(app);
    this.dataManager = dataManager;
  }

  async onOpen() {
    const { contentEl, titleEl } = this;
    titleEl.setText('Advanced configuration');

    this.root = createRoot(contentEl);
    this.root.render(
      <ConfigModalContent
        dataManager={this.dataManager}
        onClose={() => this.close()}
      />
    );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
} 
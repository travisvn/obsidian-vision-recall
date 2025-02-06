import React, { useEffect, useState } from 'react';
import { Modal } from 'obsidian';
import { DataManager } from '@/data/DataManager';
import { Plugin } from 'obsidian';
import { Config, DefaultConfig } from '@/types/config-types';
import { createRoot } from 'react-dom/client';
import VisionRecallPlugin from '@/main';

const DebugOperationsView = ({
  plugin,
  onClose,
}: {
  plugin: VisionRecallPlugin;
  onClose: () => void;
}) => {

  return (
    <div className="config-modal-container">
      <div className='flex flex-row gap-2 justify-center items-center flex-wrap'>
        <button
          className='cursor-pointer'
          onClick={() => {

          }}
        >
          Generate Image Hashes
        </button>
      </div>
    </div>
  );
};

export class DebugOperationsModal extends Modal {
  plugin: VisionRecallPlugin;
  root: any;

  constructor(
    app: any,
    plugin: VisionRecallPlugin,
  ) {
    super(app);
    this.plugin = plugin;
  }

  async onOpen() {
    const { contentEl, titleEl } = this;
    titleEl.setText('Debug Operations');

    this.root = createRoot(contentEl);
    this.root.render(
      <DebugOperationsView
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
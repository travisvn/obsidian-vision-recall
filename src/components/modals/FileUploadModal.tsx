import React, { StrictMode } from 'react';
import { Modal, App, Notice, TFile, normalizePath } from 'obsidian';
import VisionRecallPlugin from '@/main'; // Import your plugin main class
import { ObsidianAppContext, PluginContext } from '@/context';
import { Root, createRoot } from 'react-dom/client';
import { useState } from 'react';
import { ProcessingStatus } from '@/stores/queueStore';

interface FileUploadModalProps {
  app: App;
  plugin: VisionRecallPlugin; // Pass the plugin instance
  refreshMetadata: () => Promise<void>;
  updateStatus: (status: Partial<ProcessingStatus>) => void;
}

interface FileUploadViewProps extends FileUploadModalProps {
  onFileUpload: (file: File) => Promise<void>;
  closeFunction: () => void;
}

const FileUploadView = (props: FileUploadViewProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] || null);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      new Notice('Please select an image file.');
      return;
    }

    try {
      props.onFileUpload(selectedFile)
        .then(async () => {
          await props.refreshMetadata();
        })
        .catch((error) => {
          props.plugin.logger.error('File upload or processing error:', error);
          new Notice(`Error processing ${selectedFile.name}. See console for details.`);
        });
      props.closeFunction();
    } catch (error) {
      props.plugin.logger.error('File upload error:', error);
      new Notice('File upload failed. See console for details.');
    }
  };

  const handleClipboardUpload = async () => {
    try {
      props.plugin.screenshotProcessor.uploadAndProcessScreenshotFromClipboard()
        .then(async () => {
          await props.refreshMetadata();
        }, (error) => {
          props.updateStatus({ isProcessing: false, message: '', progress: 0 });
          console.error('Clipboard upload or processing error:', error);
          new Notice('Clipboard upload failed. See console for details.');
        });
      props.closeFunction();
    } catch (error) {
      props.updateStatus({ isProcessing: false, message: '', progress: 0 });
      console.error('Clipboard upload error:', error);
      new Notice('Clipboard upload failed. See console for details.');
    }
  };

  return (
    <div className="vr file-upload-modal-content">
      <div className="file-upload-container">
        <input
          type="file"
          className="file-input"
          accept="image/*"
          onChange={handleFileChange}
        />
        <button className="upload-button" onClick={handleFileUpload}>
          Process screenshot from file
        </button>
      </div>
      <div className="clipboard-upload-button-container">
        <button className="upload-button" onClick={handleClipboardUpload}>
          Upload from clipboard
        </button>
      </div>
    </div>
  );
};

export class FileUploadModal extends Modal {
  root: Root;
  plugin: VisionRecallPlugin;

  fileInput: React.RefObject<HTMLInputElement>;
  fileInputElement: HTMLInputElement;
  refreshMetadata: () => Promise<void>;
  updateStatus: (status: Partial<ProcessingStatus>) => void;

  constructor({ app, plugin, refreshMetadata, updateStatus }: FileUploadModalProps) {
    super(app);
    this.plugin = plugin;
    this.app = app;
    this.fileInput = React.createRef<HTMLInputElement>();
    this.refreshMetadata = refreshMetadata;
    this.updateStatus = updateStatus;
  }

  onOpen() {
    const { contentEl, modalEl } = this;
    this.setTitle('Add a new screenshot');

    this.root = createRoot(contentEl);
    this.root.render(
      <StrictMode>
        <ObsidianAppContext.Provider value={this.app}>
          <PluginContext.Provider value={this.plugin}>
            <FileUploadView
              app={this.app}
              plugin={this.plugin}
              closeFunction={() => this.close()}
              refreshMetadata={this.refreshMetadata}
              updateStatus={this.updateStatus}
              onFileUpload={this.handleFileUpload.bind(this)}
            />
          </PluginContext.Provider>
        </ObsidianAppContext.Provider>
      </StrictMode>,
    );
  }

  onClose() {
    this.root?.unmount();
    const { contentEl } = this;
    contentEl?.empty();
  }

  async handleFileUpload(file: File) {
    try {
      new Notice(`Processing ${file.name}...`);

      const arrayBuffer = await file.arrayBuffer();

      const intakeFolderPath = await this.plugin.getFolderFromSettingsKey('screenshotIntakeFolderPath');

      const newFilePath = normalizePath(`${intakeFolderPath}/${file.name}`);

      // Ensure intake folder exists - important to avoid errors
      if (!this.app.vault.getFolderByPath(intakeFolderPath)) {
        await this.app.vault.createFolder(intakeFolderPath);
      }

      // Create a temporary file in the vault
      const tempFile = await this.app.vault.createBinary(newFilePath, arrayBuffer);

      if (tempFile instanceof TFile) {
        this.plugin.processingQueue.addToQueue(tempFile);
        new Notice(`${file.name} added to processing queue!`);
      } else {
        new Notice('Failed to create image file in intake folder.');
      }
    } catch (error) {
      this.plugin.logger.error('File upload or processing error:', error);
      new Notice(`Error processing ${file.name}. See console for details.`);
    }
  }
} 
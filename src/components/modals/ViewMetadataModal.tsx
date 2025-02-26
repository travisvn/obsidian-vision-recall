import { App, Modal } from 'obsidian';
import React from 'react';
import { createRoot } from 'react-dom/client';
import VisionRecallPlugin from '@/main';
import { DateTime } from 'luxon';

interface ViewMetadataModalProps {
  metadata: any; // TODO: Add proper type
  onClose: () => void;
}

const ViewMetadataForm: React.FC<ViewMetadataModalProps> = ({ metadata, onClose }) => {
  return (
    <div className="vr view-metadata-modal select-text">

      <div className="metadata-section">
        <h4>File information</h4>
        <div className="metadata-group">
          <label>Screenshot filename:</label>
          <div className="metadata-value">{metadata.screenshotFilename}</div>
        </div>
        <div className="metadata-group">
          <label>Note path:</label>
          <div className="metadata-value">{metadata.notePath}</div>
        </div>
        <div className="metadata-group">
          <label>Created:</label>
          <div className="metadata-value">
            {DateTime.fromISO(metadata.timestamp).toFormat('yyyy/MM/dd HH:mm:ss')}
          </div>
        </div>
      </div>

      <div className="metadata-section">
        <h4>Content analysis</h4>
        {metadata.ocrText && (
          <div className="metadata-group">
            <label>OCR text:</label>
            <div className="metadata-value scrollable">{metadata.ocrText}</div>
          </div>
        )}
        {metadata.visionLLMResponse && (
          <div className="metadata-group">
            <label>Vision analysis:</label>
            <div className="metadata-value scrollable">{metadata.visionLLMResponse}</div>
          </div>
        )}
        {metadata.generatedNotes && (
          <div className="metadata-group">
            <label>Generated notes:</label>
            <div className="metadata-value scrollable">{metadata.generatedNotes}</div>
          </div>
        )}
      </div>

      <div className="metadata-section">
        <h4>Tags</h4>
        <div className="metadata-group">
          <div className="metadata-value tags">
            {metadata.extractedTags && metadata.extractedTags.length > 0
              ? metadata.extractedTags.map((tag: string, index: number) => (
                <span key={index} className="tag">#{tag}</span>
              ))
              : <span className="no-tags">No tags</span>
            }
          </div>
        </div>
      </div>

      <div className="button-group">
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export class ViewMetadataModal extends Modal {
  private metadata: any;
  private plugin: VisionRecallPlugin;

  constructor(app: App, plugin: VisionRecallPlugin, metadata: any) {
    super(app);
    this.metadata = metadata;
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl, titleEl } = this;
    titleEl.setText('Screenshot details');
    const root = createRoot(contentEl);

    root.render(
      <ViewMetadataForm
        metadata={this.metadata}
        onClose={() => this.close()}
      />
    );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
} 
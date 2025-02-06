import { App, Modal } from 'obsidian';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import VisionRecallPlugin from '@/main';
import { tagsToCommaString } from '@/lib/tag-utils';
import { formatTags } from '@/lib/tag-utils';

interface EditMetadataModalProps {
  metadata: any; // TODO: Add proper type
  onSave: (updatedMetadata: any) => Promise<void>;
  onClose: () => void;
}

const EditMetadataForm: React.FC<EditMetadataModalProps> = ({ metadata, onSave, onClose }) => {
  const [tags, setTags] = useState(metadata.extractedTags?.join(', ') || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updatedMetadata = {
      ...metadata,
      extractedTags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      formattedTags: tagsToCommaString(formatTags(tags.split(',').map(tag => tag.trim()))),
    };

    await onSave(updatedMetadata);
    onClose();
  };

  return (
    <div className="edit-metadata-modal">

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="tags">Tags (comma-separated):</label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Enter tags separated by commas"
          />
        </div>

        <div className="button-group">
          <button type="submit">Save Changes</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export class EditMetadataModal extends Modal {
  private metadata: any;
  private plugin: VisionRecallPlugin;
  private onSaveCallback: () => Promise<void>;

  constructor(app: App, plugin: VisionRecallPlugin, metadata: any, onSave: () => Promise<void>) {
    super(app);
    this.metadata = metadata;
    this.plugin = plugin;
    this.onSaveCallback = onSave;
  }

  onOpen() {
    const { contentEl, titleEl } = this;
    titleEl.setText('Edit Screenshot Metadata');
    const root = createRoot(contentEl);

    const handleSave = async (updatedMetadata: any) => {
      await this.plugin.screenshotProcessor.updateScreenshotMetadata(updatedMetadata);
      await this.onSaveCallback();
    };

    root.render(
      <EditMetadataForm
        metadata={this.metadata}
        onSave={handleSave}
        onClose={() => this.close()}
      />
    );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
} 
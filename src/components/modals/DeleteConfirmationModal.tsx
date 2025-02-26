import { App, Modal } from 'obsidian';
import React from 'react';
import { createRoot } from 'react-dom/client';
import VisionRecallPlugin from '@/main';

interface DeleteConfirmationModalProps {
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}

const DeleteConfirmationForm: React.FC<DeleteConfirmationModalProps> = ({ message, onConfirm, onClose }) => {
  return (
    <div className="vr vr-delete-confirmation-modal">
      <div className="message">{message}</div>

      <div className="button-group">
        <button type="button" onClick={onClose}>Close</button>
        <button type="button" onClick={onConfirm}>Confirm</button>
      </div>
    </div>
  );
};

export class DeleteConfirmationModal extends Modal {
  private message: string;
  private handleConfirm: () => Promise<void>;
  private handleClose: () => void;
  private plugin: VisionRecallPlugin;

  constructor(
    app: App,
    plugin: VisionRecallPlugin,
    message: string,
    onConfirm: () => Promise<void>,
    onClose?: () => void
  ) {
    super(app);
    this.message = message;
    this.handleConfirm = onConfirm;
    this.handleClose = onClose;
    this.plugin = plugin;
  }

  async handleConfirmWrapper() {
    await this.handleConfirm();
    this.close();
  }

  onOpen() {
    const { contentEl, titleEl } = this;
    titleEl.setText('Confirm deletion');
    const root = createRoot(contentEl);

    root.render(
      <DeleteConfirmationForm
        message={this.message}
        onConfirm={() => this.handleConfirmWrapper()}
        onClose={() => this.handleClose()}
      />
    );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
} 
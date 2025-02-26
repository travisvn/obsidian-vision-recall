import { Modal, App, TFile } from 'obsidian';

interface ScreenshotModalProps {
  imagePath: string;
  onClose: () => void;
}

export class ScreenshotModal extends Modal {
  imagePath: string;

  constructor(app: App, imagePath: string) {
    super(app);
    this.imagePath = imagePath;
    this.app = app;
  }

  onOpen() {
    const { contentEl } = this;
    this.setTitle('Screenshot preview');

    contentEl.addClass('screenshot-modal-content');

    // Create a link element
    const linkEl = contentEl.createEl('a', { cls: 'vr screenshot-modal-link' });

    // Set the link to open the image in Obsidian
    const file = this.app.vault.getAbstractFileByPath(this.imagePath);
    if (file instanceof TFile) {
      linkEl.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.app.workspace.openLinkText(this.imagePath, '', true);
        this.close();
      });

      // Create and append the image to the link
      const imgEl = linkEl.createEl('img', { cls: 'screenshot-modal-image' });
      const imageUrl = this.app.vault.getResourcePath(file);
      imgEl.src = imageUrl;
    } else {
      console.error('File is not an instance of TFile:', file);
    }

    // Append the link (containing the image) to the modal
    contentEl.appendChild(linkEl);
  }

  onClose() {
    this.contentEl.empty();
  }
} 
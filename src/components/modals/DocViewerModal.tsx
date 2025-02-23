import { App, MarkdownRenderer, Modal } from 'obsidian';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import VisionRecallPlugin from '@/main';

interface DocViewerFormProps {
  docPath: string;
  onClose: () => void;
  app: App;
  plugin: VisionRecallPlugin;
}

const DOC_PATHS = {
  OLLAMA_SETUP: 'ollama-setup.md',
  REFERENCE_GUIDE: 'reference.md',
}

const DocViewerForm: React.FC<DocViewerFormProps> = ({ docPath, onClose, app, plugin }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadDocument = async () => {
      try {
        const fileContent = await app.vault.adapter.read(docPath);
        setContent(fileContent);
      } catch (err) {
        console.error('Error loading document:', err);
        setError('Failed to load document');
      }
    };

    loadDocument();
  }, [docPath, app.vault]);

  useEffect(() => {
    if (!containerRef.current || !content) return;

    const el = containerRef.current;
    MarkdownRenderer.render(app, content, el, '', plugin);

    return () => {
      el.empty();
    };
  }, [content, app, plugin]);

  return (
    <div className="doc-viewer-modal">
      <div className='flex flex-row gap-2 justify-center items-center'>
        <button
          type='button'
          className='cursor-pointer'
          onClick={async () => {
            const newDocPath = `${plugin.manifest.dir}/docs/${DOC_PATHS.OLLAMA_SETUP}`;
            const fileContent = await app.vault.adapter.read(newDocPath);
            setContent(fileContent);
          }}
        >
          Ollama setup
        </button>
        <button
          type='button'
          className='cursor-pointer'
          onClick={async () => {
            const newDocPath = `${plugin.manifest.dir}/docs/${DOC_PATHS.REFERENCE_GUIDE}`;
            const fileContent = await app.vault.adapter.read(newDocPath);
            setContent(fileContent);
          }}
        >
          Reference guide
        </button>
      </div>
      {error && <div className="error-message">{error}</div>}
      <div ref={containerRef} className="markdown-content" />
      <div className="button-group">
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export class DocViewerModal extends Modal {
  private docPath: string;
  private plugin: VisionRecallPlugin;

  constructor(app: App, plugin: VisionRecallPlugin, docName: string) {
    super(app);
    this.plugin = plugin;
    this.docPath = `${plugin.manifest.dir}/docs/${docName}.md`;
  }

  onOpen() {
    const { contentEl, titleEl } = this;
    titleEl.setText('Documentation');
    const root = createRoot(contentEl);

    root.render(
      <DocViewerForm
        docPath={this.docPath}
        onClose={() => this.close()}
        app={this.app}
        plugin={this.plugin}
      />
    );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
} 
import { App, MarkdownRenderer, Modal, requestUrl } from 'obsidian';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import VisionRecallPlugin from '@/main';
// import ollamaSetup from './ollama-setup.md';
// import referenceGuide from './reference.md';
import ollamaSetup from '@/docs/ollama-setup.md';
import referenceGuide from '@/docs/reference.md';
import { ExternalLink } from 'lucide-react';

interface DocViewerFormProps {
  onClose: () => void;
  app: App;
  plugin: VisionRecallPlugin;
}

const DOC_LOCATIONS = {
  'ollama-setup': ollamaSetup,
  'reference-guide': referenceGuide,
}

const DocViewerForm: React.FC<DocViewerFormProps> = ({ onClose, app, plugin }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedDoc, setSelectedDoc] = useState<string>('ollama-setup');
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string>('');

  // const fetchContent = async (url: string) => {
  //   try {
  //     // const response = await fetch(url);
  //     const response = await requestUrl(url);
  //     if (response.status !== 200) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }
  //     const text = response.text;
  //     return text;
  //   } catch (error) {
  //     console.error('Error fetching content:', error);
  //     setError('Failed to fetch content');
  //     return '';
  //   }
  // }

  useEffect(() => {
    const fetchContentEffect = async () => {
      // const content = await fetchContent(DOC_LOCATIONS[selectedDoc]);
      const content = DOC_LOCATIONS[selectedDoc];
      setContent(content);
    }
    fetchContentEffect();
  }, [selectedDoc]);

  useEffect(() => {
    if (!containerRef.current || !content) return;

    const el = containerRef.current;
    MarkdownRenderer.render(app, content, el, '', plugin);

    return () => {
      el.empty();
    };
  }, [content, app, plugin]);

  return (
    <div className="vr doc-viewer-modal">
      <div className='flex flex-row gap-2 justify-center items-center'>
        <button
          type='button'
          className='cursor-pointer'
          onClick={async () => {
            setSelectedDoc('ollama-setup');
          }}
        >
          Ollama setup
        </button>
        <button
          type='button'
          className='cursor-pointer'
          onClick={async () => {
            setSelectedDoc('reference-guide');
          }}
        >
          Reference guide
        </button>
        <div className='flex flex-row gap-2 justify-center items-center'>
          <a
            href={'https://github.com/travisvn/obsidian-vision-recall/wiki'}
            target='_blank'
            className='cursor-pointer inline-flex flex-row items-center gap-2'
            aria-label={'Open the wiki on GitHub for more information'}
          >
            Wiki <ExternalLink className='w-4 h-4' />
          </a>
        </div>
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
  private plugin: VisionRecallPlugin;

  constructor(app: App, plugin: VisionRecallPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl, titleEl } = this;
    titleEl.setText('Documentation');
    const root = createRoot(contentEl);

    root.render(
      <DocViewerForm
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
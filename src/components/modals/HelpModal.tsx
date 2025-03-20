import { App, Modal } from 'obsidian';
import React from 'react';
import { createRoot } from 'react-dom/client';
import VisionRecallPlugin from '@/main';
import { ExternalLink } from 'lucide-react';

interface HelpModalProps {
  plugin: VisionRecallPlugin;
  onClose: () => void;
}

const HelpView: React.FC<HelpModalProps> = ({ plugin, onClose }) => {

  return (
    <div className='flex flex-col gap-4 items-center justify-center vision-recall-styling'>
      <div className='flex flex-col gap-4 items-center justify-center'>
        <h3 className='text-lg/0 p-0 m-0'>Need help?</h3>
        <p>
          If you need help, please refer to the <a
            href='https://github.com/travisvn/obsidian-vision-recall/wiki'
            target='_blank'
            rel='noopener noreferrer'
            className='cursor-pointer inline-flex flex-row items-center gap-1'
            aria-label={'Open the wiki on GitHub for more information'}
          >
            wiki <ExternalLink className='w-3 h-3' />
          </a>
        </p>
      </div>


      <h3 className='text-lg/0 p-0 m-0'>Troubleshooting, support, & community</h3>

      <div className='flex flex-col gap-4 items-center justify-center'>
        <a
          href='https://visionrecall.com/discord'
          target='_blank'
          rel='noopener noreferrer'
          className='cursor-pointer inline-flex flex-row items-center gap-1'
          aria-label={'Join the Discord server'}
        >
          Join the new Discord server <ExternalLink className='w-3 h-3' />
        </a>
      </div>

      <div className="flex flex-row justify-end items-center w-full">
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export class HelpModal extends Modal {
  private plugin: VisionRecallPlugin;

  constructor(app: App, plugin: VisionRecallPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl, titleEl } = this;
    // titleEl.setText('Help');
    const root = createRoot(contentEl);

    root.render(
      <HelpView
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

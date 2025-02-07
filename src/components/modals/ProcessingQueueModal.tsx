import React, { useState, useEffect, StrictMode } from 'react';
import { Root, createRoot } from 'react-dom/client';
import { App, Modal } from 'obsidian';
import VisionRecallPlugin from '@/main';
import { ObsidianAppContext, PluginContext, usePlugin } from '@/context';
import { cn } from '@/lib/utils';
import { QueueItem } from '@/services/ProcessingQueue';
import { useQueueStore } from '@/stores/queueStore';
import { ProcessingQueue } from '@/services/ProcessingQueue';
import { CheckCircle2, XCircle, Pause, Play, Square } from 'lucide-react';
// import { ProcessingDisplay } from '@/components/ProcessingDisplay';

const QueueControls: React.FC = () => {
  const { status, actions } = useQueueStore();
  const plugin = usePlugin();

  const hasPendingItems = status.queue.some(item => item.status === 'pending');
  const shouldShowControls = status.isProcessing || status.isPaused || hasPendingItems || status.isStopped;

  const handleResume = () => {
    plugin.processingQueue.resumeProcessing();
    plugin.processingQueue.processQueue();
  };

  return (
    <div className="queue-controls flex flex-row items-center gap-2 mb-4 mx-auto justify-center">
      {shouldShowControls ? (
        <>
          {status.isProcessing ? (
            // Show Pause + Stop when actively processing
            <>
              <button
                onClick={() => plugin.processingQueue.pauseProcessing()}
                className="queue-control-button flex items-center gap-2"
                aria-label="Pause processing"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
              <button
                onClick={() => plugin.processingQueue.stopProcessing()}
                className="queue-control-button flex items-center gap-2"
                aria-label="Stop processing"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            </>
          ) : status.isPaused || status.isStopped ? (
            // Show Resume when paused or stopped
            <button
              onClick={handleResume}
              className="queue-control-button flex items-center gap-2"
              aria-label="Resume processing"
            >
              <Play className="w-4 h-4" />
              Resume
            </button>
          ) : hasPendingItems ? (
            // Show Start when neither processing, paused, nor stopped
            <button
              onClick={() => plugin.processingQueue.processQueue()}
              className="queue-control-button flex items-center gap-2"
              aria-label="Start processing"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

const QueueStatus: React.FC = () => {
  const { status } = useQueueStore();

  return (
    <div className="queue-status mb-4 mx-auto justify-center">
      <div className="text-sm font-medium">
        {status.isProcessing ? (
          status.isPaused ? (
            <span className="text-yellow-500">⏸ Processing Paused</span>
          ) : (
            <span className="text-green-500">▶ Processing Active</span>
          )
        ) : status.queue.some(item => item.status === 'pending') ? (
          <span className="text-muted">⏹ Processing Stopped</span>
        ) : (
          <span className="text-muted">Queue Empty</span>
        )}
      </div>
    </div>
  );
};

const ProcessingQueueView: React.FC = () => {
  const { status, actions } = useQueueStore();
  const plugin = usePlugin();

  useEffect(() => {
    plugin.processingQueue = new ProcessingQueue(plugin, useQueueStore);
  }, []);

  return (
    <div className="processing-queue-modal w-full">

      <div className="queue-stats flex flex-row items-center justify-between gap-1 w-full mb-4 p-2 bg-secondary rounded">
        <div>Total: {status.queue.length}</div>
        <div>Processing: {status.queue.filter(i => i.status === 'processing').length}</div>
        <div>Pending: {status.queue.filter(i => i.status === 'pending').length}</div>
        <div>Completed: {status.queue.filter(i => i.status === 'completed').length}</div>
        <div>Failed: {status.queue.filter(i => i.status === 'failed').length}</div>
      </div>

      <div className="queue-items mb-4">
        {status.queue.map((item, index) => (
          <div
            key={index + '-queue-item'}
            className={cn(
              'flex flex-row items-center justify-start gap-4 overflow-hidden p-2 rounded-m',
              item.status === 'processing' && 'status-processing',
              item.status === 'completed' && 'status-completed',
              item.status === 'failed' && 'status-failed'
            )}>
            <div className="flex items-center">
              {item.status === 'processing' && <span className="loading-spinner"></span>}
              {item.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
              {item.status === 'failed' && <XCircle className="w-4 h-4" />}
              {item.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-muted"></div>}
            </div>
            <div className="item-name flex-1">{item.file.name}</div>
            {item.error && <div className="item-error text-error text-sm">{item.error}</div>}
          </div>
        ))}
      </div>

      <QueueStatus />
      <QueueControls />

      {/* Only show ProcessingDisplay if we're processing and not paused */}
      {/* {status.isProcessing && !status.isPaused && <ProcessingDisplay />} */}
    </div>
  );
};

interface ProcessingQueueModalProps {
  app: App;
  plugin: VisionRecallPlugin;
}

export class ProcessingQueueModal extends Modal {
  root: Root;
  plugin: VisionRecallPlugin;

  constructor({ app, plugin }: ProcessingQueueModalProps) {
    super(app);
    this.app = app;
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl, titleEl } = this;
    titleEl.setText('Processing Queue');

    this.root = createRoot(contentEl);

    this.root.render(
      <StrictMode>
        <ObsidianAppContext.Provider value={this.app}>
          <PluginContext.Provider value={this.plugin}>
            <ProcessingQueueView />
          </PluginContext.Provider>
        </ObsidianAppContext.Provider>
      </StrictMode>
    );
  }

  onClose() {
    this.root?.unmount();
    const { contentEl } = this;
    contentEl?.empty();
  }
}
import { Events, TFile } from 'obsidian';
import VisionRecallPlugin from '@/main';
import { useQueueStore } from '@/stores/queueStore';

export interface QueueItem {
  file: TFile;
  status: 'pending' | 'processing' | 'completed' | 'failed' | string;
  error?: string;
}

export class ProcessingQueue extends Events {
  private store: typeof useQueueStore;
  plugin: VisionRecallPlugin;

  constructor(
    plugin: VisionRecallPlugin,
    store: typeof useQueueStore
  ) {
    super();
    this.plugin = plugin;
    this.store = store;
  }

  addToQueue(file: TFile) {
    const { actions, status } = this.store.getState();
    actions.addToQueue(file);

    // Start processing if not already processing and not paused
    if (!status.isProcessing && !status.isPaused) {
      this.processQueue();
    }
  }

  async processQueue() {
    const { actions, status } = this.store.getState();

    if (status.queue.length === 0 || status.isStopped) {
      actions.updateStatus({ isProcessing: false });
      return;
    }

    // If already processing or paused, don't start another processing cycle
    if (status.isProcessing || status.isPaused) {
      return;
    }

    actions.updateStatus({ isProcessing: true });

    try {
      for (const [index, item] of status.queue.entries()) {
        // Check for stop or pause before starting a new item
        const currentStatus = this.store.getState().status;
        if (currentStatus.isStopped) break;
        if (currentStatus.isPaused) {
          actions.updateStatus({ isProcessing: false });
          return;
        }

        // Skip non-pending items
        if (item.status !== 'pending') continue;

        actions.updateStatus({
          currentFile: item.file,
          progress: index + 1
        });

        actions.updateItemStatus(item.file.path, 'processing');
        this.trigger('queueUpdated', status.queue);

        try {
          const success = await this.plugin.screenshotProcessor.processScreenshot(item.file, true);
          actions.updateItemStatus(item.file.path, success ? 'completed' : 'failed');

          if (success) {
            await this.plugin.app.fileManager.trashFile(item.file);
          }
        } catch (error) {
          actions.updateItemStatus(item.file.path, 'failed', error.message);
          this.plugin.logger.error(`Failed to process ${item.file.path}: ${error.message}`);
        }

        this.trigger('queueUpdated', this.store.getState().status.queue);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if we should pause after completing this item
        if (this.store.getState().status.isPaused) {
          actions.updateStatus({ isProcessing: false });
          return;
        }
      }
    } finally {
      const currentStatus = this.store.getState().status;

      if (!currentStatus.isStopped && !currentStatus.isPaused) {
        actions.updateStatus({
          isProcessing: false,
          currentFile: undefined
        });

        // Check for any remaining pending items and process them
        if (currentStatus.queue.some(item => item.status === 'pending')) {
          await this.processQueue();
        }
      }
    }
  }

  addMultipleToQueue(files: TFile[]) {
    const { actions, status } = this.store.getState();
    actions.addMultipleToQueue(files);
    this.trigger('queueUpdated', status.queue);

    if (!status.isProcessing && !status.isPaused) {
      this.processQueue();
    }
  }

  clearQueue() {
    this.store.getState().actions.clearQueue();
  }

  stopProcessing() {
    this.store.getState().actions.stopProcessing();
  }

  pauseProcessing() {
    this.store.getState().actions.pauseProcessing();
  }

  resumeProcessing() {
    const { actions, status } = this.store.getState();
    actions.resumeProcessing();

    if (status.queue.some(item => item.status === 'pending')) {
      this.processQueue();
    }
  }

  unpauseProcessing() {
    const { actions, status } = this.store.getState();
    actions.unpauseProcessing();

    if (status.queue.some(item => item.status === 'pending')) {
      this.processQueue();
    }
  }
} 
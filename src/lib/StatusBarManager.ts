// src/lib/StatusBarManager.ts
import { setIcon, setTooltip, Notice, Plugin } from 'obsidian';
import VisionRecallPlugin from '@/main';
import { useQueueStore } from '@/stores/queueStore';

export class StatusBarManager {
  private plugin: VisionRecallPlugin;
  private statusBarEl: HTMLElement | null = null;
  private statusBarProcessingQueueEl: HTMLElement | null = null;
  private statusBarControlsEl: HTMLElement | null = null;
  private unsubscribe: () => void;


  constructor(plugin: VisionRecallPlugin) {
    this.plugin = plugin;
  }

  initialize() {
    this.statusBarControlsEl = this.plugin.addStatusBarItem();
    this.statusBarProcessingQueueEl = this.plugin.addStatusBarItem();
    this.updateStatusBarControls(); // Initial setup
    this.updateProcessingQueueStatusBar(); // Initial setup

    // Subscribe and store the unsubscribe function
    this.unsubscribe = useQueueStore.subscribe(
      (state) => {
        this.updateStatusBarControls();
        this.updateProcessingQueueStatusBar();
      }
    );

    // Clean up subscription on plugin unload. This happens only once.
    this.plugin.register(() => this.unsubscribe?.());

    // Restore status on init (e.g., if was processing when Obsidian was closed.)
    this.updateStatusBarControls();
    this.updateProcessingQueueStatusBar();

  }

  private setStatusBarIcon(element: HTMLElement, iconName: string) {
    setIcon(element, iconName);
  }

  updateProcessingQueueStatusBar() {
    if (!this.statusBarProcessingQueueEl) return;

    this.statusBarProcessingQueueEl.empty();
    const queueIndicator = createEl('span', {
      cls: 'queue-indicator',
    });

    const { isProcessing, isPaused } = useQueueStore.getState().status;

    let icon = 'list';
    if (isProcessing) {
      icon = isPaused ? 'pause' : 'loader-2';
    }

    this.setStatusBarIcon(queueIndicator, icon);
    setTooltip(this.statusBarProcessingQueueEl, 'Processing queue', { placement: 'top' });
    queueIndicator.onclick = () => this.plugin.openProcessingQueueModal();

    if (isProcessing && !isPaused) {
      queueIndicator.addClass('rotating');
    } else {
      queueIndicator.removeClass('rotating');
    }

    this.statusBarProcessingQueueEl.appendChild(queueIndicator);
  }


  removeStatusBarButton(): void {
    if (this.statusBarControlsEl) {
      this.statusBarControlsEl?.remove();
      this.statusBarControlsEl = null;
    }

    if (this.statusBarProcessingQueueEl) {
      this.statusBarProcessingQueueEl?.remove();
      this.statusBarProcessingQueueEl = null;
    }
  }

  updateStatusBarControls() {
    if (!this.statusBarControlsEl) return;

    const { status } = useQueueStore.getState();
    const hasPendingItems = status.queue.some(item => item.status === 'pending');
    const shouldShowControls = status.isProcessing || status.isPaused || hasPendingItems || status.isStopped;


    this.statusBarControlsEl.empty();
    const controlsContainer = createEl('div', { cls: 'vision-recall-status-bar-controls' });

    if (shouldShowControls) {
      if (status.isProcessing) {
        // Stop button
        const stopButton = createEl('span', { cls: 'vision-recall-status-bar-control' });
        setTooltip(stopButton, 'Stop processing', { placement: 'top' });
        this.setStatusBarIcon(stopButton, 'circle-stop');
        stopButton.onclick = () => this.plugin.processingQueue.stopProcessing();

        // Pause button
        const pauseButton = createEl('span', { cls: 'vision-recall-status-bar-control' });
        setTooltip(pauseButton, 'Pause processing', { placement: 'top' });
        this.setStatusBarIcon(pauseButton, 'pause');
        pauseButton.onclick = () => this.plugin.processingQueue.pauseProcessing();

        controlsContainer.appendChild(stopButton);
        controlsContainer.appendChild(pauseButton);
      } else if (status.isPaused || status.isStopped) {
        // Resume button
        const resumeButton = createEl('span', { cls: 'vision-recall-status-bar-control' });
        setTooltip(resumeButton, 'Resume processing', { placement: 'top' });
        this.setStatusBarIcon(resumeButton, 'play');
        resumeButton.onclick = () => {
          this.plugin.processingQueue.resumeProcessing();
          this.plugin.processingQueue.processQueue();
        };

        controlsContainer.appendChild(resumeButton);
      } else if (hasPendingItems) {
        // Start button
        const startButton = createEl('span', { cls: 'vision-recall-status-bar-control' });
        setTooltip(startButton, 'Start processing', { placement: 'top' });
        this.setStatusBarIcon(startButton, 'play');
        startButton.onclick = () => this.plugin.processingQueue.processQueue();

        controlsContainer.appendChild(startButton);
      }
    }

    this.statusBarControlsEl.appendChild(controlsContainer);
  }
}
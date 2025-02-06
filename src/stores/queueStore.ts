import { create } from 'zustand';
import { QueueItem } from '@/services/ProcessingQueue';
import { TFile } from 'obsidian';

export type ProcessingStatus = {
  isProcessing: boolean;
  currentFile?: TFile;
  progress: number;
  total: number;
  queue: QueueItem[];
  message: string;
  minimized: boolean;
  maximized: boolean;
  isStopped: boolean;
  isPaused: boolean;
  processingError?: string;
};

type QueueStore = {
  status: ProcessingStatus;
  actions: {
    updateStatus: (status: Partial<ProcessingStatus>) => void;
    addToQueue: (file: TFile) => void;
    addMultipleToQueue: (files: TFile[]) => void;
    clearQueue: () => void;
    setMessage: (message: string) => void;
    toggleMinimized: () => void;
    toggleMaximized: () => void;
    stopProcessing: () => void;
    resumeProcessing: () => void;
    pauseProcessing: () => void;
    unpauseProcessing: () => void;
    updateItemStatus: (filePath: string, status: QueueItem['status'], error?: string) => void;
    removeFromQueue: (filePath: string) => void;
  };
};

const DEFAULT_STATUS: ProcessingStatus = {
  isProcessing: false,
  progress: 0,
  total: 0,
  queue: [],
  message: '',
  minimized: false,
  maximized: false,
  isStopped: false,
  isPaused: false,
  processingError: undefined
};

export const useQueueStore = create<QueueStore>((set, get) => ({
  status: DEFAULT_STATUS,
  actions: {
    updateStatus: (status) => set((state) => ({
      status: { ...state.status, ...status }
    })),
    addToQueue: (file) => set((state) => ({
      status: {
        ...state.status,
        queue: [...state.status.queue, { file, status: 'pending' }],
        total: state.status.total + 1
      }
    })),
    addMultipleToQueue: (files) => set((state) => ({
      status: {
        ...state.status,
        queue: [
          ...state.status.queue,
          ...files.map(file => ({ file, status: 'pending' }))
        ],
        total: state.status.total + files.length
      }
    })),
    clearQueue: () => set({ status: DEFAULT_STATUS }),
    setMessage: (message) => set((state) => ({
      status: { ...state.status, message }
    })),
    toggleMinimized: () => set((state) => ({
      status: { ...state.status, minimized: !state.status.minimized, maximized: false }
    })),
    toggleMaximized: () => set((state) => ({
      status: { ...state.status, maximized: !state.status.maximized, minimized: false }
    })),
    stopProcessing: () => set((state) => ({
      status: { ...state.status, isStopped: true, isProcessing: false, isPaused: false }
    })),
    resumeProcessing: () => set((state) => ({
      status: {
        ...state.status,
        isStopped: false,
        isPaused: false
      }
    })),
    pauseProcessing: () => set((state) => ({
      status: { ...state.status, isPaused: true }
    })),
    unpauseProcessing: () => set((state) => ({
      status: { ...state.status, isPaused: false }
    })),
    updateItemStatus: (filePath: string, status: QueueItem['status'], error?: string) =>
      set((state) => ({
        status: {
          ...state.status,
          queue: state.status.queue.map(item =>
            item.file.path === filePath
              ? { ...item, status, error }
              : item
          )
        }
      })),
    removeFromQueue: (filePath: string) => set((state) => ({
      status: {
        ...state.status,
        queue: state.status.queue.filter(item => item.file.path !== filePath),
        total: state.status.total - 1
      }
    }))
  },
})); 
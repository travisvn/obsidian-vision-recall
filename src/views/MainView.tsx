import { ItemView, WorkspaceLeaf } from 'obsidian';
import * as React from 'react';
import { Root, createRoot } from 'react-dom/client';
import { DataProvider } from '@/data/DataContext';
import { ObsidianAppContext, PluginContext, usePlugin } from '@/context';
import ListView from './ListView';
import GalleryView from './GalleryView';
import VisionRecallPlugin from '@/main';
import { DataManager } from '@/data/DataManager';
import { PLUGIN_ICON, PLUGIN_NAME } from '@/constants';
import { StrictMode } from 'react';
import { ProcessingDisplay } from '@/components/ProcessingDisplay';

export const MAIN_VIEW_TYPE = 'vision-recall-view';

export default class MainView extends ItemView {
  root: Root | null = null;
  plugin: VisionRecallPlugin;
  dataManager: DataManager;

  constructor(leaf: WorkspaceLeaf, plugin: VisionRecallPlugin, dataManager: DataManager) {
    super(leaf);
    this.plugin = plugin;
    this.dataManager = dataManager;
  }

  getViewType() {
    return MAIN_VIEW_TYPE;
  }

  getDisplayText() {
    return 'Vision Recall';
  }

  getTitle(): string {
    return PLUGIN_NAME;
  }

  getIcon(): string {
    return PLUGIN_ICON;
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    const metadata = this.plugin.dataManager.getAllEntries();

    // Create wrapper div for React
    const reactContainer = container.createDiv();

    // Create React root and render app
    this.root = createRoot(reactContainer);
    this.root.render(
      <StrictMode>
        <ObsidianAppContext.Provider value={this.app}>
          <PluginContext.Provider value={this.plugin}>
            <DataProvider dataManager={this.dataManager}>
              {/* <ProcessingDisplay /> */}
              <ViewContainer initialMetadata={metadata} />
            </DataProvider>
          </PluginContext.Provider>
        </ObsidianAppContext.Provider>
      </StrictMode>
    );
  }

  async onClose() {
    if (this.root) {
      this.root.unmount();
    }
  }
}

const ViewContainer = ({ initialMetadata }) => {
  const plugin = usePlugin<VisionRecallPlugin>();

  const [viewMode, setViewMode] = React.useState<'list' | 'gallery'>(() => {
    try {
      const saved = localStorage.getItem('vision-recall-view-mode');
      return saved === 'gallery' ? 'gallery' : 'list';
    } catch {
      // return 'list';
      return 'gallery';
    }
  });

  const handleViewModeChange = (mode: 'list' | 'gallery') => {
    setViewMode(mode);
    try {
      localStorage.setItem('vision-recall-view-mode', mode);
    } catch (e) {
      plugin.logger.error('Failed to save view mode preference:', e);
    }
  }

  return viewMode === 'list' ? (
    <ListView
      initialMetadata={initialMetadata}
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
    />
  ) : (
    <GalleryView
      initialMetadata={initialMetadata}
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
    />
  );
};
import { useObsidianApp, usePlugin } from '@/context';
import { FileUploadModal } from '@/components/modals/FileUploadModal';
import { FolderSync, Info, LoaderPinwheel, Plus, RefreshCcw, Settings2, LayoutGrid, List, Bug, Maximize2, Hash, PencilRuler } from 'lucide-react';
import { Notice } from 'obsidian';
import React from 'react';
import { DocViewerModal } from '@/components/modals/DocViewerModal';
import { ConfigModal } from '@/components/modals/ConfigModal';
import { cn } from '@/lib/utils';
import { useDataContext } from '@/data/DataContext';
import { TestConfigModal } from './modals/TestConfigModal';
import { ProcessingQueueModal } from './modals/ProcessingQueueModal';
import { useQueueStore } from '@/stores/queueStore';
import { DebugOperationsModal } from './modals/DebugOperationsModal';

interface MainViewHeaderProps {
  metadata: any[];
  refreshMetadata: () => Promise<void>;
  viewMode?: 'list' | 'gallery';
  onViewModeChange?: (mode: 'list' | 'gallery') => void;
}

export const MainViewHeader = ({ metadata, refreshMetadata, viewMode = 'list', onViewModeChange }: MainViewHeaderProps) => {
  const plugin = usePlugin();
  const app = useObsidianApp();
  const dataManager = useDataContext();
  const { status, actions } = useQueueStore();

  // const [showProcessing, setShowProcessing] = useState(false);
  // const [showMaximize, setShowMaximize] = useState(false);

  // useEffect(() => {
  //   if (status.isProcessing && status.minimized) {
  //     setShowProcessing(true);
  //   } else {
  //     setShowProcessing(false);
  //   }
  // }, [status.isProcessing, status.minimized]);

  // useEffect(() => {
  //   if (!status.maximized) {
  //     setShowMaximize(true);
  //   } else {
  //     setShowMaximize(false);
  //   }
  // }, [status.maximized]);

  return (
    <>
      <div className='@container/header flex flex-row justify-between items-center'>
        <h2 className='m-0'>Vision Recall</h2>

        {onViewModeChange && (
          <div className="flex items-center gap-2">
            <button
              className={cn(
                'p-2 rounded hover:bg-background-modifier-hover cursor-pointer',
                viewMode === 'list' ? 'bg-background-modifier-hover' : '',
              )}
              onClick={() => onViewModeChange('list')}
              aria-label="List view"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              className={cn(
                'p-2 rounded hover:bg-background-modifier-hover cursor-pointer',
                viewMode === 'gallery' ? 'bg-background-modifier-hover' : '',
              )}
              onClick={() => onViewModeChange('gallery')}
              aria-label="Gallery view"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className='flex flex-row items-center gap-2 flex-wrap justify-end'>
          <button
            className='cursor-pointer flex flex-row items-center gap-2'
            aria-label='Add a new screenshot'
            onClick={() => {
              new FileUploadModal({
                app,
                plugin,
                refreshMetadata,
                updateStatus: actions.updateStatus
              }).open();
            }}
          >
            <Plus className='w-4 h-4' />
            <div className='hidden @3xl/header:block'>
              Add new screenshot
            </div>
          </button>
          <button
            className='cursor-pointer flex flex-row items-center gap-2'
            aria-label='Process the intake folder'
            onClick={async () => {
              await plugin.screenshotProcessor.processIntakeFolder();
              await refreshMetadata();
            }}
          >
            <FolderSync className='w-4 h-4' />
            <div className='hidden @3xl/header:block'>
              Process intake
            </div>
          </button>
          <button
            className='cursor-pointer flex flex-row items-center gap-2'
            aria-label='Refresh the screenshots'
            onClick={async () => {
              await refreshMetadata();
              new Notice('Refreshed screenshots');
            }}
          >
            <RefreshCcw className='w-4 h-4' />
            <div className='hidden @3xl/header:block'>
              Refresh
            </div>
          </button>
        </div>
      </div>

      <div className='@container/subheader flex flex-row justify-between items-center my-4'>
        <div className='flex flex-row gap-2'>
          <button
            aria-label='Information'
            className='cursor-pointer flex flex-row items-center gap-2'
            onClick={() => {
              new DocViewerModal(
                app,
                plugin,
                'reference'
              ).open();
            }}
          >
            <Info className='w-4 h-4' />
            <div className='hidden @3xl/subheader:block'>
              Information
            </div>
          </button>

          <button
            aria-label='Test config'
            className='cursor-pointer flex flex-row items-center gap-2'
            onClick={() => {
              new TestConfigModal(
                app,
                plugin,
                dataManager
              ).open();
            }}
          >
            <Bug className='w-4 h-4' />
            <div className='hidden @3xl/subheader:block'>
              Test config
            </div>
          </button>
        </div>

        <div className='flex flex-row gap-2'>
          {status.isProcessing ? (
            <button
              aria-label='View processing queue'
              className='cursor-pointer flex flex-row items-center gap-2'
              onClick={() => {
                new ProcessingQueueModal({
                  app: app,
                  plugin: plugin
                }).open();
              }}
            >
              <LoaderPinwheel className='w-4 h-4 animate-spin-slower' />
              <div className='hidden @3xl/subheader:block'>
                Processing...
              </div>
            </button>
          ) : (
            <button
              aria-label='View processing queue'
              className='cursor-pointer flex flex-row items-center gap-2'
              onClick={() => {
                new ProcessingQueueModal({
                  app: app,
                  plugin: plugin
                }).open();
              }}
            >
              <LoaderPinwheel className='w-4 h-4' />
              <div className='hidden @4xl/subheader:block'>
                Processing queue
              </div>
            </button>
          )}
          {/* {showMaximize && (
            <button
              aria-label='Maximize progress display'
              className='cursor-pointer flex flex-row items-center gap-2'
              onClick={() => actions.toggleMaximized()}
            >
              <Maximize2 className='w-4 h-4' />
              <div className='hidden @4xl/subheader:block'>
                Maximize
              </div>
            </button>
          )} */}

          {/* Debug Modal */}
          {plugin.settings.debugMode && (
            <button
              aria-label='Debug modal'
              className='cursor-pointer flex flex-row items-center gap-2'
              onClick={() => {
                new DebugOperationsModal(app, plugin).open();
              }}
            >
              <PencilRuler className='w-4 h-4' />
              <div className='hidden @4xl/subheader:block'>
                Debug modal
              </div>
            </button>
          )}
        </div>

        <button
          aria-label='Config'
          className='cursor-pointer flex flex-row items-center gap-2'
          onClick={() => {
            new ConfigModal(app, plugin, plugin.dataManager).open();
          }}
        >
          <Settings2 className='w-4 h-4' />
          <div className='hidden @3xl/subheader:block'>
            Settings
          </div>
        </button>
      </div>
    </>
  );
};

// export default MainViewHeader;
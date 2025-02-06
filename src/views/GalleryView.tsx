import React from 'react';
import { TFile, getLinkpath } from 'obsidian';
import { ScreenshotModal } from '../components/modals/ScreenshotModal';
import { ArrowDown, ArrowUp, Edit, Eye, NotepadText, Trash2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { EditMetadataModal } from '../components/modals/EditMetadataModal';
import { MainViewHeader } from '@/components/MainViewHeader';
import { ViewMetadataModal } from '../components/modals/ViewMetadataModal';
import { openNoteWithTag } from '@/services/note-link-service';
import { BaseViewProps, useBaseView } from './BaseView';

const GalleryView = (props: BaseViewProps) => {
  const {
    app,
    plugin,
    metadata,
    filteredMetadata,
    refreshMetadata,
    renderEmptyState,
    renderFilters,
    paginationState,
    renderPagination,
    sortCriteria,
    handleSort,
  } = useBaseView(props);

  const openNote = async (notePath: string, uniqueIdentifier: string | null) => {
    const file = app.vault.getAbstractFileByPath(notePath);
    if (file instanceof TFile) {
      await app.workspace.openLinkText(getLinkpath(file.path), '', false, { active: true });
    } else if (uniqueIdentifier) {
      await openNoteWithTag(plugin, uniqueIdentifier);
    }
  };

  if (!metadata || metadata.length === 0) {
    return renderEmptyState();
  }

  return (
    <div className="vision-recall-view">
      <MainViewHeader
        metadata={metadata}
        refreshMetadata={refreshMetadata}
        viewMode={props.viewMode}
        onViewModeChange={props.onViewModeChange}
      />
      {renderFilters()}
      <div className="flex flex-row justify-between">
        <div className='flex flex-row items-center gap-2'>
          <div className='flex flex-row items-center gap-2'>
            Sort by:
          </div>
          <select
            className='cursor-pointer'
            value={sortCriteria.column}
            onChange={(e) => handleSort(e.target.value)}
          >
            <option value="timestamp">Date & Time</option>
            <option value="screenshotFilename">Screenshot Filename</option>
            <option value="notePath">Note Path</option>
          </select>
          <button
            aria-label={`Sort by ${sortCriteria.column} ${sortCriteria.direction === 'desc' ? 'ascending' : 'descending'}`}
            className='cursor-pointer'
            onClick={() => handleSort(sortCriteria.column)}
          >
            {sortCriteria.direction === 'asc' ? <ArrowUp className='w-4 h-4' /> : <ArrowDown className='w-4 h-4' />}
          </button>
        </div>
      </div>
      <div className="gallery-grid">
        {paginationState.currentItems.map((item, index) => (
          <div key={index} className="gallery-item">
            <div className="gallery-image-container">
              <img
                src={app.vault.adapter.getResourcePath(item.screenshotStoragePath)}
                alt={item.screenshotFilename}
                onClick={() => {
                  new ScreenshotModal(app, item.screenshotStoragePath).open();
                }}
                className="gallery-image cursor-pointer"
                aria-label={`Open screenshot: ${item.screenshotFilename}`}
                data-tooltip-position="top"
              />
              <div className="gallery-overlay">
                <div className="flex flex-col items-center justify-center pointer-events-auto">
                  <button
                    onClick={() => openNote(item.notePath, item?.uniqueTag || item?.uniqueName || null)}
                    className="gallery-button"
                  >
                    Open Note
                  </button>
                  <div className="gallery-actions">
                    <span
                      aria-label="View screenshot"
                      className="w-5 h-5 cursor-pointer"
                      onClick={() => {
                        new ScreenshotModal(app, item.screenshotStoragePath).open();
                      }}
                    >
                      <Eye />
                    </span>
                    <span
                      aria-label="View metadata"
                      className="w-5 h-5 cursor-pointer"
                      onClick={() => {
                        new ViewMetadataModal(app, plugin, item).open();
                      }}
                    >
                      <NotepadText />
                    </span>
                    <span
                      aria-label="Edit tags"
                      className="w-5 h-5 cursor-pointer"
                      onClick={() => {
                        new EditMetadataModal(app, plugin, item, refreshMetadata).open();
                      }}
                    >
                      <Edit />
                    </span>
                    <span
                      aria-label="Delete screenshot"
                      className="w-5 h-5 cursor-pointer"
                      onClick={async () => {
                        const shouldDelete = window.confirm('Are you sure you want to delete this screenshot and its metadata?');
                        if (shouldDelete) {
                          await plugin.screenshotProcessor.deleteScreenshotMetadata({
                            identity: item.timestamp,
                            identityType: 'timestamp'
                          });
                          await refreshMetadata();
                        }
                      }}
                    >
                      <Trash2 />
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="gallery-info">
              <div
                // aria-label={`Open note: ${item.notePath}`}
                aria-label={'Open note'}
                data-tooltip-position="top"
                className="gallery-filename cursor-pointer"
                onClick={() => {
                  openNote(item.notePath, item?.uniqueTag || item?.uniqueName || null);
                }}
              >
                {item.screenshotFilename}
              </div>
              <div className="gallery-date">
                {DateTime.fromISO(item.timestamp).toFormat('yyyy/MM/dd HH:mm')}
              </div>
              <div className="gallery-tags">
                {item.extractedTags ? item.extractedTags.join(', ') : 'No Tags'}
              </div>
            </div>
          </div>
        ))}
      </div>
      {renderPagination()}
    </div>
  );
};

export default GalleryView; 
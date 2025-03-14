import React from 'react';
import { TFile, getLinkpath } from 'obsidian';
import { ScreenshotModal } from '../components/modals/ScreenshotModal';
import { Trash2, Edit, Eye } from 'lucide-react';
import { DateTime } from 'luxon';
import { EditMetadataModal } from '../components/modals/EditMetadataModal';
import { MainViewHeader } from '@/components/MainViewHeader';
import { ViewMetadataModal } from '../components/modals/ViewMetadataModal';
import { openNoteWithTag } from '@/services/note-link-service';
import { BaseViewProps, useBaseView } from './BaseView';
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal';

const ListView = (props: BaseViewProps) => {
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
    } else {
      plugin.logger.info(`Note "${notePath}" not found.`);

      if (!uniqueIdentifier) {
        plugin.logger.info(`Note "${notePath}" not found.`);
        return;
      }

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
      <ul className="metadata-list pb-10">
        <li className="list-header">
          <strong
            aria-label='Sort by screenshot filename'
            onClick={() => handleSort('screenshotFilename')}
            style={{ cursor: 'pointer' }}
          >
            Screenshot {sortCriteria.column === 'screenshotFilename' && (sortCriteria.direction === 'asc' ? '▲' : '▼')}
          </strong>
          <strong
            aria-label='Sort by note path'
            onClick={() => handleSort('title')}
            style={{ cursor: 'pointer' }}
          >
            Note {sortCriteria.column === 'title' && (sortCriteria.direction === 'asc' ? '▲' : '▼')}
          </strong>
          <strong
            aria-label='Sort by date & time'
            onClick={() => handleSort('timestamp')}
            style={{ cursor: 'pointer' }}
          >
            Date & time {sortCriteria.column === 'timestamp' && (sortCriteria.direction === 'asc' ? '▲' : '▼')}
          </strong>
          <strong>Tags</strong>
          <strong>Actions</strong>
        </li>
        {paginationState.currentItems.map((item, index) => (
          <li key={index} className="list-item rounded-none">
            <span
              aria-label='View screenshot'
              onClick={() => {
                new ScreenshotModal(
                  app,
                  item.screenshotStoragePath
                ).open();
              }}
              className='link'
            >
              {item.screenshotFilename}
            </span>
            <span
              aria-label='Open note'
              onClick={() => openNote(item.notePath, item?.uniqueTag || item?.uniqueName || null)}
              className='link'
            >
              {/* {item.notePath.split('/').pop()} */}
              {item.title}
            </span>
            <span>{DateTime.fromISO(item.timestamp).toFormat('yyyy/MM/dd HH:mm')}</span>
            <span>{item.extractedTags ? item.extractedTags.join(', ') : 'No tags'}</span>
            <span className='flex flex-row items-center gap-2'>
              <button
                aria-label='View metadata'
                className='cursor-pointer'
                onClick={() => {
                  new ViewMetadataModal(
                    app,
                    plugin,
                    item,
                  ).open();
                }}
              >
                <Eye className='w-4 h-4' />
              </button>

              <button
                aria-label='Edit metadata'
                className='cursor-pointer'
                onClick={() => {
                  new EditMetadataModal(
                    app,
                    plugin,
                    item,
                    refreshMetadata
                  ).open();
                }}
              >
                <Edit className='w-4 h-4' />
              </button>

              <button
                aria-label='Delete screenshot'
                className='cursor-pointer'
                onClick={async () => {
                  const modal = new DeleteConfirmationModal(app, plugin, 'Are you sure you want to delete this screenshot and its metadata?', async () => {
                    await plugin.screenshotProcessor.deleteScreenshotMetadata({
                      identity: item.timestamp,
                      identityType: 'timestamp'
                    });
                    await refreshMetadata();
                  },
                    () => {
                      modal.close();
                    }
                  );
                  modal.open();
                }}>
                <Trash2 className='w-4 h-4' />
              </button>
            </span>
          </li>
        ))}
      </ul>
      {renderPagination()}
    </div>
  );
};

export default ListView;
import React, { useState } from 'react';
import { Modal, Notice } from 'obsidian';
import { createRoot } from 'react-dom/client';
import VisionRecallPlugin from '@/main';

interface CleanupResults {
  message: string;
  details: Record<string, number>;
}

const DebugOperationsView = ({
  plugin,
  onClose,
}: {
  plugin: VisionRecallPlugin;
  onClose: () => void;
}) => {
  const [cleanupResults, setCleanupResults] = useState<CleanupResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteAllEntriesResults, setDeleteAllEntriesResults] = useState<boolean | null>(null);

  const handleCleanup = async () => {
    try {
      setIsLoading(true);
      const results = await plugin.dataManager.cleanupDatabase();
      setCleanupResults(results);
      new Notice('Database cleanup completed');
    } catch (error) {
      plugin.logger.error('Error during cleanup:', error);
      new Notice('Error during cleanup. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAllEntries = async () => {
    const results = await plugin.dataManager.deleteAllEntries();
    setDeleteAllEntriesResults(results);
  };

  return (
    <div className="config-modal-container">
      <div className="debug-operations-content">
        <button
          className="mod-warning cursor-pointer"
          onClick={handleDeleteAllEntries}
        >
          Delete all entries
        </button>
        {deleteAllEntriesResults && (
          <div className="debug-results">
            <h4>Delete all entries results</h4>
            <div className="results-details">
              <span>{deleteAllEntriesResults ? 'Success' : 'Failed'}</span>
            </div>
          </div>
        )}
        <div className="debug-section">
          <h3>Database maintenance</h3>
          <div className="debug-description">
            Clean up the database by removing orphaned entries, recalculating tags, and performing other maintenance tasks.
          </div>
          <button
            className="mod-warning cursor-pointer"
            onClick={handleCleanup}
            disabled={isLoading}
          >
            {isLoading ? 'Cleaning...' : 'Clean database'}
          </button>
        </div>

        {cleanupResults && (
          <div className="debug-results">
            <h4>Cleanup results</h4>
            <div className="results-details">
              <div className="result-item">
                <span>Removed entries:</span>
                <span>{cleanupResults.details.removedEntries}</span>
              </div>
              <div className="result-item">
                <span>Removed processed records:</span>
                <span>{cleanupResults.details.removedProcessedRecords}</span>
              </div>
              <div className="result-item">
                <span>Removed hashes:</span>
                <span>{cleanupResults.details.removedHashes}</span>
              </div>
              <div className="result-item">
                <span>Fixed tags:</span>
                <span>{cleanupResults.details.fixedTags}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="config-modal-controls">
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export class DebugOperationsModal extends Modal {
  plugin: VisionRecallPlugin;
  root: any;

  constructor(app: any, plugin: VisionRecallPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl, titleEl } = this;
    titleEl.setText('Debug operations');

    this.root = createRoot(contentEl);
    this.root.render(
      <DebugOperationsView
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
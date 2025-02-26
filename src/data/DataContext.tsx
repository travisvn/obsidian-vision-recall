import React, { createContext, useContext, useEffect, useState } from 'react';
import { DataManager, UserData } from './DataManager';
import { Config } from '@/types/config-types';
import { customStringify } from '@/lib/json-utils';

interface DataContextType {
  entries: UserData[];
  addEntry: (entry: UserData) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  refreshEntries: () => Promise<void>;
  getConfig: () => Config;
  setConfig: (config: Config) => Promise<void>;
  getAvailableTags: () => Set<string>;
  setAvailableTags: (tags: Set<string>) => Promise<void>;
  getTagCounts: () => Record<string, number>;
  setTagCounts: (counts: Record<string, number>) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useDataContext must be used within a DataProvider');
  return context;
};

export const DataProvider: React.FC<{ dataManager: DataManager; children: React.ReactNode }> = ({ dataManager, children }) => {
  const [entries, setEntries] = useState<UserData[]>([]);

  // Function to update state properly
  const refreshEntries = async () => {
    const updatedEntries = dataManager.getAllEntries();
    setEntries(updatedEntries);
    dataManager.plugin.logger.info(`🔄 DataProvider: Updated Entries`, updatedEntries.length);
  };

  useEffect(() => {
    dataManager.plugin.logger.info(`Processed Hashes: ${customStringify(dataManager.getProcessedHashes())}`);
  }, [dataManager]);

  useEffect(() => {
    refreshEntries(); // Load initial data

    const updateEntries = () => {
      dataManager.plugin.logger.info(`📢 DataProvider: "data-updated" event received`);
      refreshEntries();
    };

    dataManager.on('data-updated', updateEntries); // Listen for updates

    return () => {
      dataManager.off('data-updated', updateEntries); // Cleanup
    };
  }, [dataManager]); // Runs when `dataManager` changes

  const addEntry = async (entry: UserData) => {
    await dataManager.addOrUpdateEntry(entry);
    await refreshEntries(); // Ensure immediate UI update
  };

  const removeEntry = async (id: string) => {
    await dataManager.removeEntry(id);
    await refreshEntries(); // Ensure immediate UI update
  };

  const getConfig = () => {
    return dataManager.getConfig();
  };

  const setConfig = async (config: Config) => {
    await dataManager.updateConfig(config);
  };

  const getAvailableTags = () => {
    return dataManager.getAvailableTags();
  };

  const setAvailableTags = async (tags: Set<string>) => {
    await dataManager.setAvailableTags(tags);
  };

  const getTagCounts = () => {
    return dataManager.getTagCounts();
  };

  const setTagCounts = async (counts: Record<string, number>) => {
    await dataManager.setTagCounts(counts);
  };

  return (
    <DataContext.Provider
      value={{
        entries,
        addEntry,
        removeEntry,
        refreshEntries,
        getConfig,
        setConfig,
        getAvailableTags,
        setAvailableTags,
        getTagCounts,
        setTagCounts
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

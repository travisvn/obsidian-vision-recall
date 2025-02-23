// This is a component that initializes the folders for the plugin.

import { STORAGE_KEYS } from '@/constants';
import { usePlugin } from '@/context';
import { initializeFolders } from '@/services/shared-functions';
import { FolderPlusIcon } from 'lucide-react';
import React from 'react';

interface InitializeFoldersProps {
  foldersInitialized: boolean;
  setFoldersInitialized: (value: boolean) => void;
}

export const InitializeFolders = ({ foldersInitialized, setFoldersInitialized }: InitializeFoldersProps) => {
  const plugin = usePlugin();

  const runInitializeFolders = async () => {
    const success = await initializeFolders(plugin);
    if (success) {
      setFoldersInitialized(true);

      localStorage.setItem(STORAGE_KEYS.INITIALIZE_FOLDERS, 'true');
    }
  }

  if (foldersInitialized) {
    return null;
  }

  return (
    <>
      <button
        className='inline-flex items-center gap-2'
        onClick={runInitializeFolders}
      >
        <FolderPlusIcon className='w-4 h-4' /> Initialize folders
      </button>
    </>
  );
};
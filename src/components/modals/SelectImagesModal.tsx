import { App, Modal, TFolder, TFile } from 'obsidian';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import VisionRecallPlugin from '@/main';
import { DateTime } from 'luxon';
import { FolderWithPath } from '@/types/shared-types';
import { cn } from '@/lib/utils';

interface SelectImagesModalProps {
  plugin: VisionRecallPlugin;
  folder: TFolder;
  onClose: () => void;
  onSelect: (images: TFile[]) => any;
}

const SelectImagesForm: React.FC<SelectImagesModalProps> = ({ plugin, folder, onClose, onSelect }) => {
  const [initialized, setInitialized] = useState<boolean>(false);

  const [selectedFolder, setSelectedFolder] = useState<TFolder | null>(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(folder?.path || null);
  const [selectedImages, setSelectedImages] = useState<TFile[]>([]);
  const [folders, setFolders] = useState<FolderWithPath[]>([]);
  const [foldersLoading, setFoldersLoading] = useState<boolean>(false);

  const [imagesLoading, setImagesLoading] = useState<boolean>(false);
  const [images, setImages] = useState<TFile[]>([]);


  async function fetchImages(fetchFolder: TFolder) {
    console.log('fetchImages', fetchFolder);
    const newImages = await plugin.helperService.retrieveImagesFromFolder(fetchFolder, false);
    setImages(newImages);
    setImagesLoading(false);
  }

  useEffect(() => {
    if (!initialized) return;
    console.log('selectedFolderPath', selectedFolderPath);

    async function fetchImagesInternal(newSelectedFolder: TFolder) {
      setImagesLoading(true);
      await fetchImages(newSelectedFolder);
    }

    const newSelectedFolder = folders.find((folder) => folder.path === selectedFolderPath);
    setSelectedFolder(newSelectedFolder?.folder || null);

    fetchImagesInternal(newSelectedFolder?.folder || null);
  }, [selectedFolderPath, initialized]);

  useEffect(() => {
    if (initialized) return;

    const fetchFolders = async () => {
      setFoldersLoading(true);
      const folders = await plugin.helperService.retrieveAllFoldersWithPaths();
      setFolders(folders);
      setFoldersLoading(false);
      setInitialized(true);
    }

    fetchFolders();
  }, [plugin]);

  const handleImageClick = (image: TFile) => {
    if (selectedImages.includes(image)) {
      setSelectedImages(selectedImages.filter((img) => img !== image));
    } else {
      setSelectedImages([...selectedImages, image]);
    }
  }

  return (
    <div className="vr select-images-modal flex flex-col gap-2">
      <div className='flex flex-row items-center gap-2 w-full'>
        <select
          className='flex-1 w-full cursor-pointer'
          onChange={async (e) => {
            setSelectedFolderPath(e.target.value);
            // await sleep(300);
            // await fetchImages(selectedFolder);
          }}
        >
          {folders.map((folder: FolderWithPath) => (
            <option
              key={folder.path}
              value={folder.path}
            // onClick={async () => {
            //   setSelectedFolderPath(folder.path);
            //   await sleep(300);
            //   await fetchImages();
            // }}
            >
              {folder.path}
            </option>
          ))}
        </select>
      </div>
      <div className='text-text-muted'>
        {folder.name}
      </div>

      {images.length === 0 ? (
        <div className='text-text-muted text-center mt-2'>
          No images found
        </div>
      ) : (
        <div className='text-text-muted text-center mt-2'>
          {selectedImages.length} images selected
        </div>
      )}

      <div className='gallery-grid overflow-y-auto max-h-[calc(90vh-270px)]'>
        {images.map((image) => (
          <div key={image.path} className="gallery-item group">
            <div className="gallery-image-container relative">
              <img
                src={plugin.app.vault.adapter.getResourcePath(image.path)}
                alt={image.name}
                onClick={() => {
                  handleImageClick(image);
                }}
                className={cn('gallery-image cursor-pointer', {
                  'opacity-50': selectedImages.includes(image),
                })}
                aria-label={`Select screenshot: ${image.name}`}
                data-tooltip-position="top"
              />

              {selectedImages.includes(image) && (
                <div className="gallery-overlay-content-display">
                  <div className="flex flex-col items-center justify-center pointer-events-auto group-hover:hidden duration-0">
                    Selected
                  </div>
                </div>
              )}
              <div className="gallery-overlay">
                <div className="flex flex-col items-center justify-center pointer-events-auto">
                  {selectedImages.includes(image) ? 'Deselect' : 'Select'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-row gap-4 justify-end items-center">
        <button
          type="button"
          onClick={onClose}
          className='cursor-pointer'
        >
          Close
        </button>
        <button
          className='cursor-pointer'
          type="submit"
          onClick={() => {
            onSelect(selectedImages);
            onClose();
          }}
        >
          Select and process
        </button>
      </div>
    </div >
  );
};

export class SelectImagesModal extends Modal {
  private folder: TFolder;
  private plugin: VisionRecallPlugin;
  private onSelect: (images: TFile[]) => any;

  constructor(
    app: App,
    plugin: VisionRecallPlugin,
    folder?: TFolder,
    onSelect?: (images: TFile[]) => any
  ) {
    super(app);
    this.plugin = plugin;
    this.folder = folder;
    this.onSelect = onSelect;

  }

  async fetchFolders() {
    const folders = await this.plugin.helperService.retrieveAllFoldersWithPaths();
    return folders;
  }

  onOpen() {
    const { contentEl, titleEl, modalEl } = this;
    modalEl.addClass('vr-select-images-modal');
    titleEl.setText('Select images from folder');
    const root = createRoot(contentEl);

    root.render(
      <SelectImagesForm
        plugin={this.plugin}
        folder={this.folder}
        onClose={() => this.close()}
        onSelect={this.onSelect}
      />
    );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
} 
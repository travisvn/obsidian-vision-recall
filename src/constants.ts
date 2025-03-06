export const PLUGIN_NAME = 'Vision Recall'
export const PLUGIN_ICON = 'image'
export const IS_DEV = process.env.NODE_ENV === 'development'

export const STORAGE_KEYS = {
  ITEMS_PER_PAGE: 'vision-recall-items-per-page',
  SORT_CRITERIA: 'vision-recall-sort-criteria',
  INITIALIZE_FOLDERS: 'vision-recall-initialize-folders',
  VIEW_MODE: 'vision-recall-view-mode'
};

export const DEFAULT_ITEMS_PER_PAGE = 12;

export const OPENROUTER_HEADERS = {
  'HTTP-Referer': 'https://visionrecall.com',
  'X-Title': 'Vision Recall'
}

export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'heif', 'avif'];
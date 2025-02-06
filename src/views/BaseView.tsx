import React, { useState, useEffect } from 'react';
import { useObsidianApp, usePlugin } from '@/context';
import VisionRecallPlugin from '@/main';
import { MainViewHeader } from '@/components/MainViewHeader';
import { InitializeFolders } from '@/components/InitializeFolders';
import { useDataContext } from '@/data/DataContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { STORAGE_KEYS, DEFAULT_ITEMS_PER_PAGE } from '@/constants';
import TagCombobox from '@/components/ui/tag-combobox';

export interface BaseViewProps {
  initialMetadata: any[];
  viewMode: 'list' | 'gallery';
  onViewModeChange: (mode: 'list' | 'gallery') => void;
}

export interface FilterState {
  searchQuery: string;
  tagFilterQuery: string[];
  tagsInclusive: boolean;
  startDate: string | null;
  endDate: string | null;
}

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  currentItems: any[];
}

// Define sort criteria type
type SortCriteria = {
  // column: keyof typeof metadata[0] | null; // Column to sort by
  column: any; // Column to sort by
  direction: 'asc' | 'desc'; // Sorting direction
};

export const useBaseView = ({ initialMetadata, viewMode, onViewModeChange }: BaseViewProps) => {
  const app = useObsidianApp();
  const plugin = usePlugin<VisionRecallPlugin>();
  const dataManager = useDataContext();

  const [metadata, setMetadata] = useState(initialMetadata);
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    tagFilterQuery: [],
    tagsInclusive: true,
    startDate: null,
    endDate: null,
  });

  const [filteredMetadata, setFilteredMetadata] = useState([]);
  const [foldersInitialized, setFoldersInitialized] = useState<boolean>(() => {
    const saved = localStorage.getItem('vision-recall-initialize-folders');
    return saved ? saved === 'true' : false;
  });

  const allAvailableTags = dataManager.getAvailableTags();
  const [filterTags, setFilterTags] = useState<string[]>([]); // To store the selected tags for filtering

  const handleTagFilterChange = (tags: string[]) => {
    setFilterTags(tags);
    // setFilters(prev => ({ ...prev, tagFilterQuery: tags.join(',') }));
    // Now you can use 'tags' to filter your screenshot data
    // console.log("Selected filter tags:", tags);
    // ... your filtering logic here ...
  };

  useEffect(() => {
    setFilters(prev => ({ ...prev, tagFilterQuery: filterTags }));
  }, [filterTags]);

  const handleTagFilterInclusiveChange = (inclusive: boolean) => {
    setFilters(prev => ({ ...prev, tagsInclusive: inclusive }));
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ITEMS_PER_PAGE);
      const parsed = saved ? Number(saved) : DEFAULT_ITEMS_PER_PAGE;
      return isNaN(parsed) ? DEFAULT_ITEMS_PER_PAGE : parsed;
    } catch (e) {
      console.warn('Failed to load items per page preference:', e);
      return DEFAULT_ITEMS_PER_PAGE;
    }
  });

  const [sortCriteria, setSortCriteria] = useState<SortCriteria>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SORT_CRITERIA);
      const parsed = saved ? JSON.parse(saved) : {
        column: 'timestamp',
        direction: 'desc'
      };
      return parsed;
    } catch (e) {
      console.warn('Failed to load sort criteria:', e);
      return {
        column: 'timestamp',
        direction: 'desc'
      };
    }
  });

  // Function to handle column header clicks for sorting
  const handleSort = (columnName: keyof typeof metadata[0]) => {
    try {
      const newSortCriteria = {
        column: columnName,
        direction: sortCriteria.column === columnName && sortCriteria.direction === 'asc' ? 'desc' : 'asc', // Toggle direction if same column is clicked
      } as SortCriteria;
      setSortCriteria(newSortCriteria);
      localStorage.setItem(STORAGE_KEYS.SORT_CRITERIA, JSON.stringify(newSortCriteria));
    } catch (e) {
      console.warn('Failed to save sort criteria:', e);
    }
  };

  // Filter metadata based on search query and tags
  useEffect(() => {
    let currentMetadata = [...metadata];

    // if (filters.searchQuery || filters.tagFilterQuery || filters.startDate || filters.endDate) {
    //   currentMetadata = currentMetadata.filter(item => {
    //     const matchesSearch = !filters.searchQuery ||
    //       item.originalFilename.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
    //       (item.ocrText && item.ocrText.toLowerCase().includes(filters.searchQuery.toLowerCase())) ||
    //       (item.generatedNotes && item.generatedNotes.toLowerCase().includes(filters.searchQuery.toLowerCase()));

    //     const matchesTags = !filters.tagFilterQuery ||
    //       (item.extractedTags && item.extractedTags.some(tag =>
    //         tag.toLowerCase().includes(filters.tagFilterQuery.toLowerCase())
    //       ));

    //     const itemDate = new Date(item.timestamp);
    //     const matchesDateRange = (!filters.startDate || itemDate >= new Date(filters.startDate)) &&
    //       (!filters.endDate || itemDate <= new Date(filters.endDate));

    //     return matchesSearch && matchesTags && matchesDateRange;
    //   });
    // }


    // 1. Search Query Filter
    if (filters.searchQuery) {
      const lowerCaseQuery = filters.searchQuery.toLowerCase();
      currentMetadata = currentMetadata.filter(item => {
        return (
          item.originalFilename.toLowerCase().includes(lowerCaseQuery) ||
          (item.ocrText && item.ocrText.toLowerCase().includes(lowerCaseQuery)) ||
          (item.generatedNotes && item.generatedNotes.toLowerCase().includes(lowerCaseQuery)) ||
          (item.visionLLMResponse && item.visionLLMResponse.toLowerCase().includes(lowerCaseQuery)) ||
          (item.extractedTags && item.extractedTags.some(tag => tag.toLowerCase().includes(lowerCaseQuery)))
        );
      });
    }

    // 2. Tag Filter
    if (filters.tagFilterQuery.length > 0) {
      const lowerCaseTags = filters.tagFilterQuery.map(tag => tag.toLowerCase());
      currentMetadata = currentMetadata.filter(item => {
        if (!item.extractedTags) return false; // Skip if no tags
        return filters.tagsInclusive ?
          item.extractedTags.some(tag => lowerCaseTags.includes(tag.toLowerCase())) :
          lowerCaseTags.every(tag => item.extractedTags.map(t => t.toLowerCase()).includes(tag));
      });
    }

    // 3. Date Range Filter
    if (filters.startDate || filters.endDate) {
      currentMetadata = currentMetadata.filter(item => {
        const itemDate = new Date(item.timestamp);
        const start = filters.startDate ? new Date(filters.startDate) : null;
        const end = filters.endDate ? new Date(filters.endDate) : null;

        if (start) {
          start.setUTCHours(0, 0, 0, 0); // Set time to midnight
        }
        if (end) {
          end.setUTCHours(23, 59, 59, 999); // Set time to end of day, to include the whole end date
        }

        if (start && end) {
          return itemDate >= start && itemDate <= end;
        } else if (start) {
          return itemDate >= start;
        } else if (end) {
          return itemDate <= end;
        }
        return true; // No date filter applied if start or end is not set
      });
    }

    // 4. Sorting
    if (sortCriteria.column) {
      currentMetadata.sort((a, b) => {
        const column = sortCriteria.column as keyof typeof a; // Type assertion for column
        const direction = sortCriteria.direction;

        let valueA = a[column];
        let valueB = b[column];

        if (typeof valueA === 'string' && typeof valueB === 'string') {
          valueA = valueA.toLowerCase();
          valueB = valueB.toLowerCase();
        } else if (column === 'timestamp') { // Compare timestamps as dates
          valueA = new Date(valueA as string).getTime();
          valueB = new Date(valueB as string).getTime();
        }

        if (valueA < valueB) return direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredMetadata(currentMetadata);
  }, [metadata, filters, sortCriteria]);

  async function refreshMetadata() {
    setMetadata(plugin.dataManager.getAllEntries());
  }

  useEffect(() => {
    refreshMetadata();
  }, [dataManager]);

  const getPaginationState = (): PaginationState => {
    const totalPages = Math.ceil(filteredMetadata.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredMetadata.slice(startIndex, endIndex);

    return {
      currentPage,
      itemsPerPage,
      totalPages,
      startIndex,
      endIndex,
      currentItems,
    };
  };

  const handlePageChange = (newPage: number) => {
    const totalPages = Math.ceil(filteredMetadata.length / itemsPerPage);
    setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  const handleItemsPerPageChange = (newValue: number) => {
    try {
      setItemsPerPage(newValue);
      setCurrentPage(1);
      localStorage.setItem(STORAGE_KEYS.ITEMS_PER_PAGE, newValue.toString());
    } catch (e) {
      console.warn('Failed to save items per page preference:', e);
    }
  };

  const renderPagination = () => {
    const { currentPage, itemsPerPage, totalPages, startIndex, endIndex } = getPaginationState();

    return (
      <div className="pagination-controls flex flex-row justify-between items-center mt-4">
        <div className="flex items-center gap-2">
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            className="items-per-page-select"
          >
            <option value="3">3 per page</option>
            <option value="6">6 per page</option>
            <option value="12">12 per page</option>
            <option value="24">24 per page</option>
            <option value="48">48 per page</option>
            {/* <option value="5">5 per page</option>
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
            <option value="50">50 per page</option> */}
          </select>
          <span className="text-text-muted">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredMetadata.length)} of {filteredMetadata.length} items
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`pagination-button flex items-center ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`pagination-button flex items-center ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className='vision-recall-view h-full'>
      <MainViewHeader
        metadata={metadata}
        refreshMetadata={refreshMetadata}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
      <div className='flex flex-col gap-4 justify-center items-center h-full'>
        No screenshots found.
        <InitializeFolders
          foldersInitialized={foldersInitialized}
          setFoldersInitialized={setFoldersInitialized}
        />
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className="view-filters mb-4">
      <input
        type="text"
        placeholder="Search..."
        value={filters.searchQuery}
        onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
        className="w-full mb-2"
      />
      <div className='flex flex-row justify-between items-center gap-2'>
        <TagCombobox
          availableTags={Array.from(allAvailableTags)}
          tagCounts={dataManager.getTagCounts()}
          onTagChange={handleTagFilterChange}
          initialTags={[]} // Optionally pre-select tags
          isInclusive={filters.tagsInclusive}
          onInclusiveChange={handleTagFilterInclusiveChange}
        />
        {/* <input
          type="text"
          placeholder="Filter by tags (comma-separated)"
          value={filters.tagFilterQuery}
          onChange={(e) => setFilters(prev => ({ ...prev, tagFilterQuery: e.target.value }))}
          className="flex-1"
        /> */}
        <div className='flex flex-row h-full items-center gap-2 justify-center'>
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value || null }))}
          />
          <span className='text-text-muted'>to</span>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value || null }))}
          />
        </div>
      </div>
    </div>
  );

  return {
    app,
    plugin,
    metadata,
    filteredMetadata,
    refreshMetadata,
    foldersInitialized,
    renderEmptyState,
    renderFilters,
    paginationState: getPaginationState(),
    handlePageChange,
    handleItemsPerPageChange,
    renderPagination,
    sortCriteria,
    handleSort,
  };
}; 
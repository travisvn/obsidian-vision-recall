import { X } from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface TagComboboxProps {
  availableTags: string[]; // Array of all possible tags
  tagCounts: Record<string, number>; // Record of tag counts
  onTagChange: (selectedTags: string[]) => void; // Callback when tags change
  initialTags?: string[]; // Optional: Initial tags to pre-select
  isInclusive: boolean; // Whether the tags are inclusive or exclusive
  onInclusiveChange: (inclusive: boolean) => void; // Callback when inclusive changes
}

const TagCombobox: React.FC<TagComboboxProps> = ({
  availableTags,
  tagCounts,
  onTagChange,
  initialTags = [],
  isInclusive,
  onInclusiveChange
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);

  // ... (rest of the component logic will go here)
  useEffect(() => {
    onTagChange(selectedTags); // Call the callback whenever selectedTags changes
  }, [selectedTags, onTagChange]); // Dependency array ensures effect runs when these change

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);

    // Filter suggestions based on input value
    const filteredSuggestions = availableTags.filter(
      (tag) => tag.toLowerCase().includes(value.toLowerCase()) && !selectedTags.includes(tag) // Don't suggest already selected tags
    );
    setSuggestions(filteredSuggestions.sort((a, b) => tagCounts[b] - tagCounts[a]));
  };

  const handleSelectSuggestion = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
    setInputValue(''); // Clear input after selecting a tag
    setSuggestions([]); // Hide suggestions
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter((tag) => tag !== tagToRemove));
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent form submission if inside a form

      if (inputValue.trim() !== "") {
        // Treat the input value as a new tag if it's not empty and not already selected
        const newTag = inputValue.trim();
        if (!selectedTags.includes(newTag) && availableTags.includes(newTag)) { // Optional: Only allow tags from availableTags or allow free-form tags
          handleSelectSuggestion(newTag);
        } else if (!selectedTags.includes(newTag) && !availableTags.includes(newTag)) {
          //Optionally allow free-form tags that are not in availableTags
          handleSelectSuggestion(newTag);
        }
      }
    }
  };

  return (
    <div className="tag-combobox w-full">
      <div className="flex flex-row items-center gap-2 w-full justify-center">
        <input
          type="text"
          className=" w-full"
          placeholder="Type to add tags..."
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown} // For handling Enter key
        />

        <button
          // aria-label={`Make tags ${isInclusive ? "exclusive" : "inclusive"}`}
          aria-label={`Switch to ${isInclusive ? "ALL tags (exclusive)" : "ANY tag (inclusive)"}`}
          className="cursor-pointer"
          onClick={() => onInclusiveChange(!isInclusive)}
        >
          {isInclusive ? "ANY tag" : "ALL tags"}
        </button>
      </div>

      {suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((suggestion) => (
            <li key={suggestion} onClick={() => handleSelectSuggestion(suggestion)}>
              {suggestion} ({tagCounts[suggestion]})
            </li>
          ))}
        </ul>
      )}

      <div className="selected-tags">
        {selectedTags.map((tag) => (
          <span key={tag} className="tag-pill">
            {tag}
            <button
              aria-label={`Remove tag`}
              className="remove-tag-button"
              onClick={() => handleRemoveTag(tag)}
            >
              <X className="w-4 h-4" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default TagCombobox;
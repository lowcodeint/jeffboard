// Multi-select tag selector component

import { TagPill } from './TagPill';

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

// Valid tags from docs/agent-routing-taxonomy.md
const AVAILABLE_TAGS = [
  'frontend',
  'backend',
  'api',
  'database',
  'security',
  'ui-design',
  'infrastructure',
  'testing',
  'documentation',
  'devops',
] as const;

/**
 * TagSelector component
 * Multi-select tag picker with colored pills
 *
 * @param selectedTags - Currently selected tags
 * @param onTagsChange - Callback when tags change
 */
export function TagSelector({ selectedTags, onTagsChange }: TagSelectorProps) {
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {AVAILABLE_TAGS.map((tag) => {
        const isSelected = selectedTags.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`
              px-3 py-1.5 rounded-full text-xs font-medium
              transition-all duration-200
              ${
                isSelected
                  ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900 scale-105'
                  : 'opacity-60 hover:opacity-100 hover:scale-105'
              }
            `}
          >
            <TagPill tag={tag} size="md" />
          </button>
        );
      })}
    </div>
  );
}

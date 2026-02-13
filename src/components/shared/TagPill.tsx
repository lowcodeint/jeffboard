// Tag pill component for displaying story tags

interface TagPillProps {
  tag: string;
  size?: 'sm' | 'md';
}

// Tag colors from docs/agent-routing-taxonomy.md
const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  frontend: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  backend: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  api: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300' },
  database: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  security: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  'ui-design': { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300' },
  infrastructure: { bg: 'bg-slate-100 dark:bg-slate-700/30', text: 'text-slate-700 dark:text-slate-300' },
  testing: { bg: 'bg-lime-100 dark:bg-lime-900/30', text: 'text-lime-700 dark:text-lime-300' },
  documentation: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300' },
  devops: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
};

const DEFAULT_COLOR = { bg: 'bg-gray-100 dark:bg-gray-700/30', text: 'text-gray-700 dark:text-gray-300' };

/**
 * TagPill component
 * Displays a colored tag pill based on the tag taxonomy
 *
 * @param tag - Tag name (e.g., 'frontend', 'backend')
 * @param size - Pill size (sm or md)
 */
export function TagPill({ tag, size = 'sm' }: TagPillProps) {
  const colors = TAG_COLORS[tag] || DEFAULT_COLOR;
  const sizeClasses = size === 'sm'
    ? 'px-1.5 py-0.5 text-[10px]'
    : 'px-2 py-1 text-xs';

  return (
    <span
      className={`inline-block rounded-full font-medium ${colors.bg} ${colors.text} ${sizeClasses}`}
      title={tag}
    >
      {tag}
    </span>
  );
}

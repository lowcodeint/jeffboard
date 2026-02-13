// Priority badge component (P0-P3)

import { PRIORITY_COLORS, PRIORITY_NAMES } from '../../utils/constants';
import type { Priority } from '../../types';

interface PriorityBadgeProps {
  priority: Priority;
  showLabel?: boolean;
  className?: string;
}

/**
 * PriorityBadge component
 * Displays a colored pill badge with priority level
 *
 * @param priority - Priority level (P0-P3)
 * @param showLabel - Whether to show full label (e.g., "Critical") instead of just "P0"
 * @param className - Additional CSS classes
 */
export function PriorityBadge({
  priority,
  showLabel = false,
  className = ''
}: PriorityBadgeProps) {
  const colorClass = PRIORITY_COLORS[priority];
  const label = showLabel ? PRIORITY_NAMES[priority] : priority;

  return (
    <span
      className={`
        inline-flex items-center
        px-2 py-0.5
        rounded-full
        text-xs font-semibold
        ${colorClass}
        ${className}
      `}
    >
      {label}
    </span>
  );
}

// Heartbeat status summary component for the board header

import { useMemo } from 'react';
import type { Story } from '../../types';
import { getHeartbeatStatus } from '../../hooks/useStuckDetection';

interface HeartbeatSummaryProps {
  stories: Story[];
  onStatusClick?: (status: 'green' | 'yellow' | 'red') => void;
}

interface StatusCounts {
  green: number;
  yellow: number;
  red: number;
}

/**
 * HeartbeatSummary component
 * Shows a compact status summary in the board header
 *
 * Displays counts of stories in active statuses (in-progress, in-design):
 * - Green (healthy): heartbeat within 5 minutes
 * - Yellow (slow): no heartbeat for 5-15 minutes
 * - Red (stuck): no heartbeat for 15+ minutes
 *
 * Format: "3 active, 1 slow, 0 stuck"
 * Colors match the dot indicators from HeartbeatIndicator
 *
 * @param stories - All stories from Firestore
 * @param onStatusClick - Optional callback when a status count is clicked
 */
export function HeartbeatSummary({
  stories,
  onStatusClick
}: HeartbeatSummaryProps) {
  // Calculate status counts for active stories
  const statusCounts = useMemo((): StatusCounts => {
    const counts: StatusCounts = { green: 0, yellow: 0, red: 0 };

    stories
      .filter((story) => story.status === 'in-progress' || story.status === 'in-design' || story.status === 'in-review')
      .forEach((story) => {
        const status = getHeartbeatStatus(story.lastHeartbeat);
        if (status) {
          counts[status]++;
        }
      });

    return counts;
  }, [stories]);

  // Don't render if there are no active stories
  const totalActive = statusCounts.green + statusCounts.yellow + statusCounts.red;
  if (totalActive === 0) {
    return null;
  }

  // Format count with label
  const formatCount = (count: number, label: string): string => {
    return `${count} ${label}`;
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Green count - active */}
      <button
        onClick={() => onStatusClick?.('green')}
        className={`
          px-2 py-1 rounded transition-colors
          ${statusCounts.green > 0
            ? 'text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950'
            : 'text-gray-400 dark:text-gray-600 cursor-default'
          }
        `}
        disabled={statusCounts.green === 0}
        title={`${statusCounts.green} ${statusCounts.green === 1 ? 'story' : 'stories'} with recent heartbeat`}
      >
        {formatCount(statusCounts.green, 'active')}
      </button>

      <span className="text-gray-300 dark:text-gray-700">|</span>

      {/* Yellow count - slow */}
      <button
        onClick={() => onStatusClick?.('yellow')}
        className={`
          px-2 py-1 rounded transition-colors
          ${statusCounts.yellow > 0
            ? 'text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950'
            : 'text-gray-400 dark:text-gray-600 cursor-default'
          }
        `}
        disabled={statusCounts.yellow === 0}
        title={`${statusCounts.yellow} ${statusCounts.yellow === 1 ? 'story' : 'stories'} with slow progress (5-15 min)`}
      >
        {formatCount(statusCounts.yellow, 'slow')}
      </button>

      <span className="text-gray-300 dark:text-gray-700">|</span>

      {/* Red count - stuck */}
      <button
        onClick={() => onStatusClick?.('red')}
        className={`
          px-2 py-1 rounded transition-colors
          ${statusCounts.red > 0
            ? 'text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950'
            : 'text-gray-400 dark:text-gray-600 cursor-default'
          }
        `}
        disabled={statusCounts.red === 0}
        title={`${statusCounts.red} ${statusCounts.red === 1 ? 'story' : 'stories'} stuck (15+ min)`}
      >
        {formatCount(statusCounts.red, 'stuck')}
      </button>
    </div>
  );
}

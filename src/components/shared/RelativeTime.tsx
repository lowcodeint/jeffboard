// Relative time display component with auto-update

import { useState, useEffect } from 'react';
import { formatRelativeTime } from '../../utils/formatting';
import type { Timestamp } from 'firebase/firestore';

interface RelativeTimeProps {
  timestamp: Timestamp | Date | null;
  className?: string;
}

/**
 * RelativeTime component
 * Displays a timestamp as relative time (e.g., "2h ago")
 * Updates automatically every minute to keep times fresh
 *
 * @param timestamp - Firestore Timestamp or Date object
 * @param className - Additional CSS classes
 */
export function RelativeTime({ timestamp, className = '' }: RelativeTimeProps) {
  const [formattedTime, setFormattedTime] = useState(() =>
    formatRelativeTime(timestamp)
  );

  useEffect(() => {
    if (!timestamp) return;

    // Update immediately
    setFormattedTime(formatRelativeTime(timestamp));

    // Update every minute to keep relative time fresh
    const interval = setInterval(() => {
      setFormattedTime(formatRelativeTime(timestamp));
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [timestamp]);

  if (!timestamp) return null;

  return <span className={className}>{formattedTime}</span>;
}

// Utility functions for formatting dates, text, and other display values

import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

/**
 * Format a Firestore timestamp as a relative time string
 * @param timestamp Firestore Timestamp
 * @returns Formatted string like "2h ago" or "just now"
 */
export function formatRelativeTime(timestamp: Timestamp | Date | null): string {
  if (!timestamp) return '';

  try {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    const now = Date.now();
    const diff = now - date.getTime();

    // Less than 1 minute ago
    if (diff < 60 * 1000) {
      return 'just now';
    }

    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '';
  }
}

/**
 * Truncate text to a maximum length with ellipsis
 * @param text Text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Format a timestamp as a full date string
 * @param timestamp Firestore Timestamp
 * @returns Formatted date string
 */
export function formatFullDate(timestamp: Timestamp | Date | null): string {
  if (!timestamp) return '';

  try {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

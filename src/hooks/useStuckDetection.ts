// Real-time stuck agent detection with browser notifications

import { useEffect, useRef, useCallback } from 'react';
import type { Story } from '../types';

const YELLOW_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
const RED_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const CHECK_INTERVAL_MS = 30 * 1000; // Re-check every 30 seconds

interface UseStuckDetectionOptions {
  stories: Story[];
  enabled?: boolean;
  onStuckDetected?: (story: Story) => void;
}

/**
 * Hook to monitor in-progress and in-design stories for heartbeat staleness
 * and trigger browser notifications when agents get stuck (15+ min)
 *
 * Runs checks both when stories change (Firestore update) and on a
 * 30-second interval to catch time-based threshold crossings.
 *
 * @param options - Configuration options
 * @param options.stories - All stories from Firestore
 * @param options.enabled - Whether notifications are enabled (default: true)
 * @param options.onStuckDetected - Optional callback when a story goes red
 */
export function useStuckDetection({
  stories,
  enabled = true,
  onStuckDetected
}: UseStuckDetectionOptions) {
  // Track which stories have already triggered a red notification
  const notifiedStories = useRef<Set<string>>(new Set());

  // Track previous heartbeat states to detect yellow->red transitions
  const previousStates = useRef<Map<string, 'green' | 'yellow' | 'red'>>(new Map());

  // Keep latest stories/callback in refs so the interval callback uses fresh data
  const storiesRef = useRef(stories);
  storiesRef.current = stories;

  const onStuckDetectedRef = useRef(onStuckDetected);
  onStuckDetectedRef.current = onStuckDetected;

  // Core check logic extracted so it can be called by both effect and interval
  const checkStories = useCallback(() => {
    const currentStories = storiesRef.current;
    const now = Date.now();

    currentStories
      .filter((story) => story.status === 'in-progress' || story.status === 'in-design' || story.status === 'in-review')
      .forEach((story) => {
        if (!story.lastHeartbeat) {
          return;
        }

        const heartbeatTime = story.lastHeartbeat.toMillis();
        const timeSinceHeartbeat = now - heartbeatTime;

        let currentState: 'green' | 'yellow' | 'red';

        if (timeSinceHeartbeat >= RED_THRESHOLD_MS) {
          currentState = 'red';
        } else if (timeSinceHeartbeat >= YELLOW_THRESHOLD_MS) {
          currentState = 'yellow';
        } else {
          currentState = 'green';
        }

        const previousState = previousStates.current.get(story.id);

        // Detect transition to red from yellow (or from untracked, which
        // means the story was already past yellow when we started watching)
        if (
          currentState === 'red' &&
          (previousState === 'yellow' || previousState === undefined) &&
          !notifiedStories.current.has(story.id)
        ) {
          fireStuckNotification(story, timeSinceHeartbeat);
          notifiedStories.current.add(story.id);

          if (onStuckDetectedRef.current) {
            onStuckDetectedRef.current(story);
          }
        }

        previousStates.current.set(story.id, currentState);

        // Clear notification flag if story recovers to green
        if (currentState === 'green' && notifiedStories.current.has(story.id)) {
          notifiedStories.current.delete(story.id);
        }
      });

    // Clean up tracking for stories no longer active
    const activeIds = new Set(
      currentStories
        .filter((s) => s.status === 'in-progress' || s.status === 'in-design')
        .map((s) => s.id)
    );

    for (const id of notifiedStories.current) {
      if (!activeIds.has(id)) {
        notifiedStories.current.delete(id);
      }
    }

    for (const id of previousStates.current.keys()) {
      if (!activeIds.has(id)) {
        previousStates.current.delete(id);
      }
    }
  }, []);

  // Request notification permission once on first enable
  useEffect(() => {
    if (!enabled) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch((error) => {
        console.error('Failed to request notification permission:', error);
      });
    }
  }, [enabled]);

  // Run check when stories change
  useEffect(() => {
    if (!enabled) return;
    checkStories();
  }, [stories, enabled, checkStories]);

  // Periodic polling to catch time-based threshold crossings
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(checkStories, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled, checkStories]);
}

/**
 * Fire a browser notification for a stuck agent
 */
function fireStuckNotification(story: Story, timeSinceHeartbeat: number) {
  // Check if Notification API is available and permission is granted
  if (!('Notification' in window)) {
    console.warn('Browser notifications not supported');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }

  const minutes = Math.floor(timeSinceHeartbeat / 60000);
  const agentName = story.heartbeatAgent || story.assignedAgent || 'Unknown agent';

  const notification = new Notification('Agent Stuck - JeffBoard', {
    body: `${story.shortId}: ${story.title}\n${agentName} - ${minutes} min since last heartbeat`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: `stuck-${story.id}`, // Replace previous notification for same story
    requireInteraction: false,
    silent: false
  });

  // Focus JeffBoard tab when notification is clicked
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

/**
 * Format time duration in human-readable form
 */
export function formatTimeSinceHeartbeat(timeSinceHeartbeat: number): string {
  const minutes = Math.floor(timeSinceHeartbeat / 60000);

  if (minutes < 1) {
    return 'just now';
  } else if (minutes === 1) {
    return '1 min ago';
  } else if (minutes < 60) {
    return `${minutes} min ago`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else {
      return `${hours}h ${remainingMinutes}m ago`;
    }
  }
}

/**
 * Get heartbeat status color
 */
export function getHeartbeatStatus(
  lastHeartbeat: Story['lastHeartbeat']
): 'green' | 'yellow' | 'red' | null {
  if (!lastHeartbeat) {
    return null;
  }

  const now = Date.now();
  const heartbeatTime = lastHeartbeat.toMillis();
  const timeSinceHeartbeat = now - heartbeatTime;

  if (timeSinceHeartbeat >= RED_THRESHOLD_MS) {
    return 'red';
  } else if (timeSinceHeartbeat >= YELLOW_THRESHOLD_MS) {
    return 'yellow';
  } else {
    return 'green';
  }
}

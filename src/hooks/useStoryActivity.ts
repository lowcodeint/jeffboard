// Fetch activity subcollection for a story

import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db, COLLECTIONS } from '../services/firestore';
import type { Activity } from '../types';

/**
 * Hook for fetching activity history for a specific story
 * Fetches the activity subcollection and returns sorted by timestamp (most recent first)
 *
 * @param storyId - Story document ID
 * @returns Object with activity array, loading state, and error
 */
export function useStoryActivity(storyId: string | null) {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!storyId) {
      setActivity([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchActivity() {
      try {
        const activityRef = collection(
          db,
          `${COLLECTIONS.STORIES}/${storyId}/${COLLECTIONS.ACTIVITY}`
        );

        const q = query(activityRef, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);

        const activityData: Activity[] = [];
        snapshot.forEach((doc) => {
          activityData.push({
            id: doc.id,
            ...doc.data()
          } as Activity);
        });

        if (isMounted) {
          setActivity(activityData);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching activity:', err);
        if (isMounted) {
          setError(err as Error);
          setLoading(false);
        }
      }
    }

    fetchActivity();

    return () => {
      isMounted = false;
    };
  }, [storyId]);

  return { activity, loading, error };
}

// Fetch activity across all stories for a project

import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db, COLLECTIONS } from '../services/firestore';
import type { Activity, Story } from '../types';

export interface StoryActivity {
  storyId: string;
  shortId: string;
  storyTitle: string;
  activity: Activity[];
}

/**
 * Hook for fetching all activity across multiple stories.
 * Iterates over each story and fetches its activity subcollection.
 */
export function useAllActivity(stories: Story[]) {
  const [allActivity, setAllActivity] = useState<StoryActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (stories.length === 0) {
      setAllActivity([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchAllActivity() {
      try {
        setLoading(true);
        const results = await Promise.all(
          stories.map(async (story) => {
            const activityRef = collection(
              db,
              `${COLLECTIONS.STORIES}/${story.id}/${COLLECTIONS.ACTIVITY}`
            );
            const q = query(activityRef, orderBy('timestamp', 'desc'));
            const snapshot = await getDocs(q);

            const activityData: Activity[] = [];
            snapshot.forEach((doc) => {
              activityData.push({
                id: doc.id,
                ...doc.data(),
              } as Activity);
            });

            return {
              storyId: story.id,
              shortId: story.shortId,
              storyTitle: story.title,
              activity: activityData,
            };
          })
        );

        if (isMounted) {
          setAllActivity(results);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching all activity:', err);
        if (isMounted) {
          setError(err as Error);
          setLoading(false);
        }
      }
    }

    fetchAllActivity();

    return () => {
      isMounted = false;
    };
  }, [stories.map((s) => s.id).join(',')]);

  return { allActivity, loading, error };
}

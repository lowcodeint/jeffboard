// Real-time Firestore listener for stories collection

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '../services/firestore';
import type { Story } from '../types';

/**
 * Real-time hook for fetching stories from Firestore
 * Subscribes to updates and automatically reflects changes
 *
 * @param projectId - Project ID to filter stories, or null for all projects
 * @returns Object with stories array, loading state, and error
 */
export function useStories(projectId: string | null) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      // Build query based on whether we're filtering by project
      const storiesRef = collection(db, COLLECTIONS.STORIES);

      const q = projectId
        ? query(
            storiesRef,
            where('projectId', '==', projectId),
            orderBy('updatedAt', 'desc')
          )
        : query(storiesRef, orderBy('updatedAt', 'desc'));

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const storiesData: Story[] = [];

          snapshot.forEach((doc) => {
            storiesData.push({
              id: doc.id,
              ...doc.data()
            } as Story);
          });

          setStories(storiesData);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error fetching stories:', err);
          setError(err as Error);
          setLoading(false);
        }
      );

      // Cleanup listener on unmount
      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up stories listener:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, [projectId]);

  return { stories, loading, error };
}

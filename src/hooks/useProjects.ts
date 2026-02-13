// Real-time Firestore listener for projects collection

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '../services/firestore';
import type { Project } from '../types';

/**
 * Real-time hook for fetching active projects from Firestore
 * Subscribes to updates and automatically reflects changes
 *
 * @returns Object with projects array, loading state, and error
 */
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const projectsRef = collection(db, COLLECTIONS.PROJECTS);

      // Only fetch non-archived projects, sorted by most recently updated
      const q = query(
        projectsRef,
        where('isArchived', '==', false),
        orderBy('updatedAt', 'desc')
      );

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const projectsData: Project[] = [];

          snapshot.forEach((doc) => {
            projectsData.push({
              id: doc.id,
              ...doc.data()
            } as Project);
          });

          setProjects(projectsData);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error fetching projects:', err);
          setError(err as Error);
          setLoading(false);
        }
      );

      // Cleanup listener on unmount
      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up projects listener:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, []);

  return { projects, loading, error };
}

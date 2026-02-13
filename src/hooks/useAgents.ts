// Fetch agents collection (one-time fetch with cache)

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, COLLECTIONS } from '../services/firestore';
import type { Agent } from '../types';

/**
 * Hook for fetching agents from Firestore
 * Fetches once and caches the result (agents rarely change)
 *
 * @returns Object with agents array, loading state, and error
 */
export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchAgents() {
      try {
        const agentsRef = collection(db, COLLECTIONS.AGENTS);
        const snapshot = await getDocs(agentsRef);

        const agentsData: Agent[] = [];
        snapshot.forEach((doc) => {
          agentsData.push({
            id: doc.id,
            ...doc.data()
          } as Agent);
        });

        if (isMounted) {
          setAgents(agentsData);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching agents:', err);
        if (isMounted) {
          setError(err as Error);
          setLoading(false);
        }
      }
    }

    fetchAgents();

    return () => {
      isMounted = false;
    };
  }, []);

  return { agents, loading, error };
}

// Real-time Firestore listener for scheduler status

import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../services/firestore';

export interface SchedulerStatus {
  runningCount: number;
  maxConcurrentSessions: number;
  slotsAvailable: number;
  runningSessions: { storyShortId: string; agentType: string; startedAt: string }[];
  lastUpdated: Date | null;
}

const DEFAULT_STATUS: SchedulerStatus = {
  runningCount: 0,
  maxConcurrentSessions: 3,
  slotsAvailable: 3,
  runningSessions: [],
  lastUpdated: null,
};

/**
 * Real-time hook for scheduler status from config/scheduler doc
 */
export function useSchedulerStatus() {
  const [status, setStatus] = useState<SchedulerStatus>(DEFAULT_STATUS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, COLLECTIONS.CONFIG, 'scheduler');

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setStatus(DEFAULT_STATUS);
          setLoading(false);
          return;
        }

        const data = snapshot.data();
        setStatus({
          runningCount: data.runningCount ?? 0,
          maxConcurrentSessions: data.maxConcurrentSessions ?? 3,
          slotsAvailable: data.slotsAvailable ?? 0,
          runningSessions: data.runningSessions ?? [],
          lastUpdated: data.lastUpdated?.toDate() ?? null,
        });
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to scheduler status:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateMaxConcurrent = async (newMax: number) => {
    const docRef = doc(db, COLLECTIONS.CONFIG, 'scheduler');
    await updateDoc(docRef, { maxConcurrentSessions: newMax });
  };

  return { status, loading, updateMaxConcurrent };
}

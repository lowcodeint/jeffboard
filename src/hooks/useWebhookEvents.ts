// Real-time Firestore listener for webhook events collection

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '../services/firestore';
import type { WebhookEvent } from '../types';

/**
 * Real-time hook for fetching webhook events from Firestore
 * Subscribes to updates and automatically reflects changes
 *
 * @param projectId - Project ID to filter webhook events, or null for all projects
 * @returns Object with webhookEvents array, loading state, and error
 */
export function useWebhookEvents(projectId: string | null) {
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Don't set up listener if no project is selected
    if (!projectId) {
      setWebhookEvents([]);
      setLoading(false);
      return;
    }

    try {
      const webhookEventsRef = collection(db, COLLECTIONS.WEBHOOK_EVENTS);

      // Query webhook events for the selected project
      // Ordered by createdAt desc, limited to last 50 events
      const q = query(
        webhookEventsRef,
        where('projectId', '==', projectId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const eventsData: WebhookEvent[] = [];

          snapshot.forEach((doc) => {
            eventsData.push({
              id: doc.id,
              ...doc.data()
            } as WebhookEvent);
          });

          setWebhookEvents(eventsData);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error fetching webhook events:', err);
          setError(err as Error);
          setLoading(false);
        }
      );

      // Cleanup listener on unmount
      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up webhook events listener:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, [projectId]);

  return { webhookEvents, loading, error };
}

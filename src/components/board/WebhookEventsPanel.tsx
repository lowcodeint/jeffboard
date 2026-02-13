// Webhook events log panel component

import { useState } from 'react';
import type { WebhookEvent } from '../../types';
import { RelativeTime } from '../shared/RelativeTime';

interface WebhookEventsPanelProps {
  webhookEvents: WebhookEvent[];
  loading: boolean;
}

/**
 * WebhookEventsPanel component
 * Displays a collapsible log of recent webhook events
 * - Shows story shortId, status change, delivery status, timestamp
 * - Failed events highlighted in red
 * - Real-time updates via Firestore onSnapshot
 */
export function WebhookEventsPanel({ webhookEvents, loading }: WebhookEventsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Count failed/retrying events for the badge
  const failedCount = webhookEvents.filter((e) => e.status === 'failed' || e.status === 'retrying').length;

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Webhook Events
          </span>
          {failedCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              {failedCount} failed
            </span>
          )}
          {loading && (
            <span className="text-xs text-gray-500 dark:text-gray-400">Loading...</span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Event list - shown when expanded */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-800 max-h-64 overflow-y-auto">
          {webhookEvents.length === 0 && !loading && (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No webhook events yet
            </div>
          )}

          {webhookEvents.map((event) => (
            <div
              key={event.id}
              className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Story and status change */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {event.shortId}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {event.oldStatus} → {event.newStatus}
                    </span>
                  </div>
                  {event.assignedAgent && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {event.assignedAgent}
                    </div>
                  )}
                  {event.error && (
                    <div className="text-xs text-red-600 dark:text-red-400 mt-1 truncate">
                      {event.error}
                    </div>
                  )}
                </div>

                {/* Delivery status and timestamp */}
                <div className="flex flex-col items-end gap-1">
                  <DeliveryStatusBadge status={event.status} attempts={event.attempts} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    <RelativeTime timestamp={event.createdAt} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * DeliveryStatusBadge component
 * Shows webhook delivery status with appropriate color coding
 */
function DeliveryStatusBadge({ status, attempts }: { status: WebhookEvent['status']; attempts: number }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    retrying: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
  };

  const labels = {
    pending: 'Pending',
    delivered: 'Delivered',
    failed: 'Failed',
    retrying: `Retrying (${attempts})`
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

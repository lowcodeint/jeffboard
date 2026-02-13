// Scheduler status indicator showing agent throughput

import { useState } from 'react';
import type { SchedulerStatus as SchedulerStatusType } from '../../hooks/useSchedulerStatus';

interface SchedulerStatusProps {
  status: SchedulerStatusType;
  onUpdateMaxConcurrent: (newMax: number) => Promise<void>;
}

/**
 * Compact scheduler throughput indicator for the app header.
 * Shows running/max agents with a color-coded bar.
 * Click to expand and edit maxConcurrent.
 */
export function SchedulerStatus({ status, onUpdateMaxConcurrent }: SchedulerStatusProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(status.maxConcurrentSessions));
  const [saving, setSaving] = useState(false);

  const { runningCount, maxConcurrentSessions, slotsAvailable } = status;

  // Color based on utilization
  const utilization = maxConcurrentSessions > 0 ? runningCount / maxConcurrentSessions : 0;
  const barColor = utilization === 0
    ? 'bg-gray-300 dark:bg-gray-600'
    : utilization < 0.67
    ? 'bg-green-500'
    : utilization < 1
    ? 'bg-yellow-500'
    : 'bg-red-500';

  const dotColor = utilization === 0
    ? 'bg-gray-400'
    : utilization < 1
    ? 'bg-green-500'
    : 'bg-red-500';

  const handleSave = async () => {
    const newMax = parseInt(editValue, 10);
    if (isNaN(newMax) || newMax < 1 || newMax > 10) return;

    setSaving(true);
    try {
      await onUpdateMaxConcurrent(newMax);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update max concurrent:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditValue(String(maxConcurrentSessions));
      setIsEditing(false);
    }
  };

  return (
    <div className="relative">
      {/* Compact indicator */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs"
        title={`${runningCount} of ${maxConcurrentSessions} agent slots in use (${slotsAvailable} available)`}
      >
        {/* Pulsing dot */}
        <span className={`w-2 h-2 rounded-full ${dotColor} ${runningCount > 0 ? 'animate-pulse' : ''}`} />

        {/* Agent count */}
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {runningCount}/{maxConcurrentSessions}
        </span>

        {/* Mini utilization bar */}
        <div className="w-8 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(utilization * 100, 100)}%` }}
          />
        </div>
      </button>

      {/* Expanded dropdown */}
      {isExpanded && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-3">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Agent Scheduler
          </div>

          {/* Stats */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Running</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{runningCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Max concurrent</span>
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-12 px-1 py-0.5 text-right text-sm border border-blue-400 dark:border-blue-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                    disabled={saving}
                  />
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditValue(String(maxConcurrentSessions));
                    setIsEditing(true);
                  }}
                  className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  title="Click to edit"
                >
                  {maxConcurrentSessions}
                </button>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Available</span>
              <span className={`font-medium ${slotsAvailable === 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {slotsAvailable}
              </span>
            </div>
          </div>

          {/* Utilization bar */}
          <div className="mt-3">
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${Math.min(utilization * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Running sessions */}
          {status.runningSessions.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Active sessions
              </div>
              <div className="space-y-1">
                {status.runningSessions.map((session) => (
                  <div key={session.storyShortId} className="flex justify-between text-xs">
                    <span className="font-mono text-gray-700 dark:text-gray-300">{session.storyShortId}</span>
                    <span className="text-gray-500 dark:text-gray-400">{session.agentType}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last updated */}
          {status.lastUpdated && (
            <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              Updated {formatTimeAgo(status.lastUpdated)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

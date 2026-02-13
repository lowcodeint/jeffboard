// Interactive burst mode toggle for the app header

import { useState } from 'react';
import type { Project, Story } from '../../types';
import { updateProjectBurstMode } from '../../services/projects';
import { useToastStore } from '../../stores/toastStore';

interface BurstModeToggleProps {
  project: Project;
  stories: Story[];
}

/**
 * Toggle button for burst mode (parallel story execution).
 * - Purple theme when ON, gray/muted when OFF
 * - Loading spinner during Firestore write
 * - Confirmation dialog when turning OFF with parallel stories running
 * - Hidden when "All Projects" is selected (caller handles this)
 * - On mobile, shows bolt icon instead of "BURST" text
 */
export function BurstModeToggle({ project, stories }: BurstModeToggleProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { addToast } = useToastStore();

  const isOn = project.burstMode ?? false;

  // Count in-progress stories for this project (parallel detection)
  const parallelInProgress = stories.filter(
    (s) => s.projectId === project.id && s.status === 'in-progress',
  ).length;

  const handleToggle = () => {
    if (isUpdating) return;

    // If turning OFF and there are multiple in-progress stories, confirm first
    if (isOn && parallelInProgress > 1) {
      setShowConfirm(true);
      return;
    }

    performToggle(!isOn);
  };

  const performToggle = async (enabled: boolean) => {
    setShowConfirm(false);
    setIsUpdating(true);

    try {
      await updateProjectBurstMode(project.id, enabled);
      addToast(
        enabled ? 'Burst mode enabled' : 'Burst mode disabled',
        'success',
      );
    } catch (error) {
      console.error('Failed to toggle burst mode:', error);
      addToast('Failed to update burst mode', 'warning');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <button
        onClick={handleToggle}
        disabled={isUpdating}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
          isOn
            ? 'border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 shadow-[0_0_0_2px_rgba(124,58,237,0.15)]'
            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
        } ${isUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}
        title={
          isOn
            ? 'Burst mode enabled - click to disable'
            : 'Burst mode disabled - click to enable'
        }
        aria-label={`Burst mode ${isOn ? 'on' : 'off'}`}
      >
        {/* Desktop: "BURST" text, Mobile: bolt icon */}
        <span
          className={`hidden sm:inline text-xs font-medium ${
            isOn
              ? 'text-purple-700 dark:text-purple-300'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          BURST
        </span>
        <svg
          className={`sm:hidden w-3.5 h-3.5 ${
            isOn
              ? 'text-purple-600 dark:text-purple-400'
              : 'text-gray-400 dark:text-gray-500'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>

        {/* Toggle switch track */}
        <div
          className={`relative w-8 h-4 rounded-full transition-colors ${
            isOn
              ? 'bg-purple-600 dark:bg-purple-500'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          {isUpdating ? (
            <svg
              className="animate-spin absolute top-0 left-2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <div
              className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${
                isOn ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          )}
        </div>
      </button>

      {/* Confirmation dialog overlay */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm w-full mx-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-yellow-600 dark:text-yellow-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Disable Burst Mode?
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {parallelInProgress} stories are currently running in
                  parallel. They will continue, but no new parallel assignments
                  will be made.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => performToggle(false)}
                className="px-3 py-1.5 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
              >
                Disable
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Audio alert toggle button for header

import { useAudioAlert } from '../../hooks/useAudioAlert';

/**
 * AudioAlertToggle component
 * Button to toggle audio alerts on/off
 * Shows speaker icon with visual indicator of enabled/disabled state
 */
export function AudioAlertToggle() {
  const { enabled, toggle } = useAudioAlert();

  return (
    <button
      onClick={toggle}
      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      aria-label={enabled ? 'Disable audio alerts' : 'Enable audio alerts'}
      title={enabled ? 'Audio alerts enabled' : 'Audio alerts disabled'}
    >
      {enabled ? (
        // Speaker icon (enabled)
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
      ) : (
        // Speaker muted icon (disabled)
        <svg
          className="w-5 h-5 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
          />
        </svg>
      )}
    </button>
  );
}

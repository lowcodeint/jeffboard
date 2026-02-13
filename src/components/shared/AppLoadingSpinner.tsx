// Full-page loading spinner for initial app load

/**
 * AppLoadingSpinner component
 * Displays a centered loading spinner with the app logo
 * Used during initial Firebase data fetching
 */
export function AppLoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 dark:bg-blue-500 rounded-2xl shadow-lg">
          <svg
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
        </div>

        {/* Spinner */}
        <svg
          className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-500"
          xmlns="http://www.w3.org/2000/svg"
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
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>

        {/* Loading text */}
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          Loading board...
        </p>
      </div>
    </div>
  );
}

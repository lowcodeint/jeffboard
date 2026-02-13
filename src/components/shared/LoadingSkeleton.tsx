// Loading skeleton for story cards

/**
 * LoadingSkeleton component
 * Displays a placeholder card while stories are loading
 * Uses pulsing animation to indicate loading state
 * Optimized for light and dark mode with proper contrast
 */
export function LoadingSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 animate-pulse border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </div>
        <div className="w-10 h-5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      </div>
      <div className="flex items-center justify-between">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
      </div>
    </div>
  );
}

interface LoadingSkeletonListProps {
  count?: number;
}

/**
 * LoadingSkeletonList component
 * Displays multiple skeleton cards for column loading state
 *
 * @param count - Number of skeleton cards to show (default: 3)
 */
export function LoadingSkeletonList({ count = 3 }: LoadingSkeletonListProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingSkeleton key={i} />
      ))}
    </div>
  );
}

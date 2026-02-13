// Red banner for blocked stories

interface BlockedBannerProps {
  blockedCount: number;
  onClick: () => void;
}

/**
 * BlockedBanner component
 * Red banner at top of board when there are blocked stories
 * Clicking jumps to the Blocked column
 * Animates in/out smoothly when blocked count changes
 *
 * @param blockedCount - Number of blocked stories
 * @param onClick - Handler to navigate to blocked column
 */
export function BlockedBanner({ blockedCount, onClick }: BlockedBannerProps) {
  if (blockedCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className="w-full bg-red-500 dark:bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-600 dark:hover:bg-red-700 active:bg-red-700 dark:active:bg-red-800 transition-all duration-300 ease-in-out animate-slide-down shadow-md"
    >
      <div className="flex items-center justify-center gap-2">
        <span className="text-lg animate-pulse">⚠️</span>
        <span className="font-semibold">
          {blockedCount} {blockedCount === 1 ? 'story' : 'stories'} blocked
        </span>
        <span className="text-xs opacity-90">• Tap to view</span>
      </div>
    </button>
  );
}

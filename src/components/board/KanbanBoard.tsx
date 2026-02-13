// Main Kanban board component with horizontal swipe

import { useRef, useEffect } from 'react';
import type { Story } from '../../types';
import { COLUMN_ORDER } from '../../utils/constants';
import { groupByStatus, filterByAgent, filterByPriority, getSearchMatchIds } from '../../utils/sorting';
import { useBoardStore } from '../../stores/boardStore';
import { KanbanColumn } from './KanbanColumn';
import { ColumnTabs } from './ColumnTabs';
import { LoadingSkeletonList } from '../shared/LoadingSkeleton';

interface KanbanBoardProps {
  stories: Story[];
  loading?: boolean;
}

/**
 * KanbanBoard component
 * Main board layout with swipeable columns for mobile
 * Uses CSS scroll-snap for smooth column navigation
 * Filters stories by agent and priority from store
 *
 * @param stories - All stories to display on the board
 * @param loading - Loading state
 */
export function KanbanBoard({ stories, loading = false }: KanbanBoardProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const {
    activeColumnIndex,
    setActiveColumnIndex,
    agentFilter,
    priorityFilter,
    searchQuery,
    setSelectedStoryId
  } = useBoardStore();

  // Apply filters
  let filteredStories = stories;
  if (agentFilter.size > 0) {
    filteredStories = filterByAgent(filteredStories, agentFilter);
  }
  if (priorityFilter.size > 0) {
    filteredStories = filterByPriority(filteredStories, priorityFilter);
  }

  // Compute search match IDs (empty set = no search active)
  const searchMatchIds = getSearchMatchIds(filteredStories, searchQuery);

  // Group stories by status
  const groupedStories = groupByStatus(filteredStories);

  // Calculate story counts for each column
  const storyCounts = COLUMN_ORDER.reduce(
    (acc, status) => {
      acc[status] = groupedStories.get(status)?.length || 0;
      return acc;
    },
    {} as Record<string, number>
  );

  // Handle tab click - scroll to column
  const handleTabClick = (index: number) => {
    setActiveColumnIndex(index);

    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const columnWidth = container.offsetWidth;
      container.scrollTo({
        left: columnWidth * index,
        behavior: 'smooth'
      });
    }
  };

  // Handle card click - open detail sheet
  const handleCardClick = (story: Story) => {
    setSelectedStoryId(story.id);
  };

  // Sync active column index on scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const columnWidth = container.offsetWidth;
      const scrollLeft = container.scrollLeft;
      const newIndex = Math.round(scrollLeft / columnWidth);

      if (newIndex !== activeColumnIndex) {
        setActiveColumnIndex(newIndex);
      }
    };

    // Debounce scroll event for performance
    let timeoutId: number;
    const debouncedHandleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(handleScroll, 100);
    };

    container.addEventListener('scroll', debouncedHandleScroll);

    return () => {
      container.removeEventListener('scroll', debouncedHandleScroll);
      clearTimeout(timeoutId);
    };
  }, [activeColumnIndex, setActiveColumnIndex]);

  // Scroll to active column on mount or when it changes externally
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const columnWidth = container.offsetWidth;
      container.scrollTo({
        left: columnWidth * activeColumnIndex,
        behavior: 'auto' // No animation on initial load
      });
    }
  }, []); // Only on mount

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <ColumnTabs
          activeIndex={activeColumnIndex}
          storyCounts={storyCounts}
          onTabClick={handleTabClick}
        />
        <div className="flex-1 overflow-hidden px-4 py-3">
          <LoadingSkeletonList count={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Column tabs navigation */}
      <ColumnTabs
        activeIndex={activeColumnIndex}
        storyCounts={storyCounts}
        onTabClick={handleTabClick}
      />

      {/* Swipeable columns container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide"
        style={{
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none' // IE/Edge
        }}
      >
        <div className="flex h-full" style={{ width: `${COLUMN_ORDER.length * 100}%` }}>
          {COLUMN_ORDER.map((status) => (
            <div
              key={status}
              className="snap-start h-full"
              style={{ width: `${100 / COLUMN_ORDER.length}%` }}
            >
              <KanbanColumn
                status={status}
                stories={groupedStories.get(status) || []}
                onCardClick={handleCardClick}
                searchQuery={searchQuery}
                searchMatchIds={searchMatchIds}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

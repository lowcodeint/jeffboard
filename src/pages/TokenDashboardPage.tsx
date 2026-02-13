// Token Dashboard Page

import { useState, useMemo } from 'react';
import { useStories } from '../hooks/useStories';
import { useProjects } from '../hooks/useProjects';
import { useBoardStore } from '../stores/boardStore';
import { AppHeader } from '../components/layout/AppHeader';
import { AppLoadingSpinner } from '../components/shared/AppLoadingSpinner';
import { TokenSummaryCards } from '../components/dashboard/TokenSummaryCards';
import { CostByComplexity } from '../components/dashboard/CostByComplexity';
import { CostComplexityAnalysis } from '../components/dashboard/CostComplexityAnalysis';
import { CostPerStoryChart } from '../components/dashboard/CostPerStoryChart';
import { TokenFilterBar } from '../components/dashboard/TokenFilterBar';
import { TokenStoryTable } from '../components/dashboard/TokenStoryTable';
import type { Priority, Complexity } from '../types';

/**
 * TokenDashboardPage component
 * Displays token usage analytics and cost breakdowns
 * - Real-time Firestore updates
 * - Filter by epic, priority, complexity, date range
 * - Sortable table
 * - Cost visualizations
 */
export function TokenDashboardPage() {
  const { activeProjectId, setActiveProjectId } = useBoardStore();
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [epicFilter, setEpicFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<Set<Priority>>(new Set());
  const [complexityFilter, setComplexityFilter] = useState<Set<Complexity>>(new Set());
  const [sortColumn, setSortColumn] = useState<'id' | 'title' | 'complexity' | 'tokens' | 'cost' | 'sessions'>('tokens');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch data
  const { projects, loading: projectsLoading } = useProjects();
  const { stories, loading: storiesLoading } = useStories(activeProjectId);

  // Filter and sort stories
  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      // Date range filter
      const storyDate = story.updatedAt.toDate();
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include full end date
      if (storyDate < start || storyDate > end) return false;

      // Epic filter
      if (epicFilter && story.epicName !== epicFilter) return false;

      // Priority filter
      if (priorityFilter.size > 0 && !priorityFilter.has(story.priority)) return false;

      // Complexity filter
      if (complexityFilter.size > 0 && !complexityFilter.has(story.complexity)) return false;

      return true;
    });
  }, [stories, startDate, endDate, epicFilter, priorityFilter, complexityFilter]);

  // Sort stories
  const sortedStories = useMemo(() => {
    const sorted = [...filteredStories].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortColumn) {
        case 'id':
          aVal = a.shortId;
          bVal = b.shortId;
          break;
        case 'title':
          aVal = a.title;
          bVal = b.title;
          break;
        case 'complexity':
          aVal = ['S', 'M', 'L', 'XL'].indexOf(a.complexity);
          bVal = ['S', 'M', 'L', 'XL'].indexOf(b.complexity);
          break;
        case 'tokens':
          aVal = a.tokenUsage?.totalTokens || 0;
          bVal = b.tokenUsage?.totalTokens || 0;
          break;
        case 'cost':
          aVal = a.tokenUsage?.estimatedCostUsd || 0;
          bVal = b.tokenUsage?.estimatedCostUsd || 0;
          break;
        case 'sessions':
          aVal = a.tokenUsage?.sessions || 0;
          bVal = b.tokenUsage?.sessions || 0;
          break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      // Both must be numbers at this point
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [filteredStories, sortColumn, sortDirection]);

  // Paginate stories
  const paginatedStories = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedStories.slice(start, start + itemsPerPage);
  }, [sortedStories, currentPage]);

  const totalPages = Math.ceil(sortedStories.length / itemsPerPage);

  // Get unique epics for filter dropdown
  const epics = useMemo(() => {
    const uniqueEpics = new Set(stories.map((s) => s.epicName).filter(Boolean));
    return Array.from(uniqueEpics).sort();
  }, [stories]);

  // Toggle filters
  const togglePriority = (priority: Priority) => {
    const newSet = new Set(priorityFilter);
    if (newSet.has(priority)) {
      newSet.delete(priority);
    } else {
      newSet.add(priority);
    }
    setPriorityFilter(newSet);
    setCurrentPage(1); // Reset to first page
  };

  const toggleComplexity = (complexity: Complexity) => {
    const newSet = new Set(complexityFilter);
    if (newSet.has(complexity)) {
      newSet.delete(complexity);
    } else {
      newSet.add(complexity);
    }
    setComplexityFilter(newSet);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setEpicFilter('');
    setPriorityFilter(new Set());
    setComplexityFilter(new Set());
    setCurrentPage(1);
  };

  const activeFilterCount =
    (epicFilter ? 1 : 0) + priorityFilter.size + complexityFilter.size;

  // Handle sort
  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const loading = projectsLoading || storiesLoading;

  // Find active project for burst mode indicator
  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  if (!stories.length && loading) {
    return <AppLoadingSpinner />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 animate-fade-in">
      {/* Header */}
      <AppHeader
        projects={projects}
        stories={stories}
        activeProjectId={activeProjectId}
        activeProject={activeProject}
        onProjectSelect={setActiveProjectId}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          {/* Page title + date range */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Token Usage
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Cost and consumption across all stories
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Summary cards */}
          <TokenSummaryCards stories={filteredStories} />

          {/* Cost by complexity */}
          <CostByComplexity stories={filteredStories} />

          {/* Cost-per-complexity analysis with outlier detection */}
          <CostComplexityAnalysis stories={filteredStories} />

          {/* Cost per story chart */}
          <CostPerStoryChart stories={filteredStories} />

          {/* Filter bar */}
          <TokenFilterBar
            epics={epics}
            epicFilter={epicFilter}
            onEpicChange={setEpicFilter}
            priorityFilter={priorityFilter}
            onTogglePriority={togglePriority}
            complexityFilter={complexityFilter}
            onToggleComplexity={toggleComplexity}
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
          />

          {/* Story table */}
          <TokenStoryTable
            stories={paginatedStories}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            currentPage={currentPage}
            totalPages={totalPages}
            totalStories={sortedStories.length}
            onPageChange={setCurrentPage}
          />
        </div>
      </main>
    </div>
  );
}

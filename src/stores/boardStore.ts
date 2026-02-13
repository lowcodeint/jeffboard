// Zustand store for board state (active project, column, filters)

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Priority } from '../types';

interface BoardState {
  // Active project
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;

  // Active column (for mobile swipe position)
  activeColumnIndex: number;
  setActiveColumnIndex: (index: number) => void;

  // Filters
  agentFilter: Set<string>;
  toggleAgentFilter: (agentId: string) => void;

  priorityFilter: Set<Priority>;
  togglePriorityFilter: (priority: Priority) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  clearFilters: () => void;

  // Selected story (for detail sheet)
  selectedStoryId: string | null;
  setSelectedStoryId: (id: string | null) => void;
}

export const useBoardStore = create<BoardState>()(
  persist(
    (set) => ({
      // Initial state
      activeProjectId: null,
      activeColumnIndex: 0,
      agentFilter: new Set<string>(),
      priorityFilter: new Set<Priority>(),
      searchQuery: '',
      selectedStoryId: null,

      // Actions
      setActiveProjectId: (id) => set({ activeProjectId: id }),

      setActiveColumnIndex: (index) => set({ activeColumnIndex: index }),

      toggleAgentFilter: (agentId) =>
        set((state) => {
          const newSet = new Set(state.agentFilter);
          if (newSet.has(agentId)) {
            newSet.delete(agentId);
          } else {
            newSet.add(agentId);
          }
          return { agentFilter: newSet };
        }),

      togglePriorityFilter: (priority) =>
        set((state) => {
          const newSet = new Set(state.priorityFilter);
          if (newSet.has(priority)) {
            newSet.delete(priority);
          } else {
            newSet.add(priority);
          }
          return { priorityFilter: newSet };
        }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      clearFilters: () =>
        set({
          agentFilter: new Set<string>(),
          priorityFilter: new Set<Priority>(),
          searchQuery: ''
        }),

      setSelectedStoryId: (id) => set({ selectedStoryId: id })
    }),
    {
      name: 'agentboard-storage',
      partialize: (state) => ({
        // Only persist these fields
        activeProjectId: state.activeProjectId,
        activeColumnIndex: state.activeColumnIndex
      })
    }
  )
);

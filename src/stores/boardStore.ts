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
  agentFilter: string | null;
  setAgentFilter: (agent: string | null) => void;

  priorityFilter: Set<Priority>;
  togglePriorityFilter: (priority: Priority) => void;
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
      agentFilter: null,
      priorityFilter: new Set<Priority>(),
      selectedStoryId: null,

      // Actions
      setActiveProjectId: (id) => set({ activeProjectId: id }),

      setActiveColumnIndex: (index) => set({ activeColumnIndex: index }),

      setAgentFilter: (agent) => set({ agentFilter: agent }),

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

      clearFilters: () =>
        set({
          agentFilter: null,
          priorityFilter: new Set<Priority>()
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

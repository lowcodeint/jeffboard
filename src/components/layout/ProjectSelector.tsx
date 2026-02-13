// Project selector dropdown

import { useState, useRef, useEffect } from 'react';
import type { Project } from '../../types';

interface ProjectSelectorProps {
  projects: Project[];
  activeProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
}

/**
 * ProjectSelector component
 * Dropdown to switch between projects or view all projects
 *
 * @param projects - List of available projects
 * @param activeProjectId - Currently selected project ID (null = all projects)
 * @param onProjectSelect - Handler when a project is selected
 */
export function ProjectSelector({
  projects,
  activeProjectId,
  onProjectSelect
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find active project
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const displayName = activeProject?.name || 'All Projects';

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (projectId: string | null) => {
    onProjectSelect(projectId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
          {displayName}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            {/* All Projects option */}
            <button
              onClick={() => handleSelect(null)}
              className={`
                w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                ${activeProjectId === null ? 'bg-blue-50 dark:bg-blue-950' : ''}
              `}
            >
              <div className="font-medium text-gray-900 dark:text-gray-100">
                All Projects
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                View stories from all projects
              </div>
            </button>

            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* Individual projects */}
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSelect(project.id)}
                className={`
                  w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                  ${activeProjectId === project.id ? 'bg-blue-50 dark:bg-blue-950' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {project.name}
                  </div>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {project.shortCode}
                  </span>
                </div>
                {project.description && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {project.description}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

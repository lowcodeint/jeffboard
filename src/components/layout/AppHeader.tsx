// App header with title, project selector, and sign-out

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Project, Story } from '../../types';
import type { SchedulerStatus as SchedulerStatusType } from '../../hooks/useSchedulerStatus';
import { ProjectSelector } from './ProjectSelector';
import { BurstModeToggle } from './BurstModeToggle';
import { NotificationBell } from './NotificationBell';
import { AudioAlertToggle } from './AudioAlertToggle';
import { HeartbeatSummary } from '../shared/HeartbeatSummary';
import { SchedulerStatus } from '../shared/SchedulerStatus';
import { signOut } from '../../services/auth';
import { useAuth } from '../auth/AuthProvider';

interface AppHeaderProps {
  projects: Project[];
  stories: Story[];
  activeProjectId: string | null;
  activeProject?: Project | null;
  onProjectSelect: (projectId: string | null) => void;
  onCreateStory?: () => void;
  onHeartbeatStatusClick?: (status: 'green' | 'yellow' | 'red') => void;
  schedulerStatus?: SchedulerStatusType | null;
  onUpdateMaxConcurrent?: (newMax: number) => Promise<void>;
}

/**
 * AppHeader component
 * Top bar with app branding, project selector, and sign-out button
 * Includes safe area insets for iPhone notch
 * Integrates with Firebase auth for user display and sign-out
 *
 * @param projects - Available projects
 * @param activeProjectId - Currently selected project
 * @param onProjectSelect - Handler for project selection
 */
export function AppHeader({
  projects,
  stories,
  activeProjectId,
  activeProject,
  onProjectSelect,
  onCreateStory,
  onHeartbeatStatusClick,
  schedulerStatus,
  onUpdateMaxConcurrent,
}: AppHeaderProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const currentPath = location.pathname;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      setIsSigningOut(false);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-700 pt-safe-top shadow-sm">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        {/* App title */}
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex-shrink-0">
          JeffBoard
        </h1>

        {/* Project selector - centered */}
        <div className="flex-1 flex justify-center items-center gap-2 overflow-visible">
          <ProjectSelector
            projects={projects}
            activeProjectId={activeProjectId}
            onProjectSelect={onProjectSelect}
          />
          {/* Burst mode toggle - only shown when a specific project is selected */}
          {activeProject && (
            <BurstModeToggle project={activeProject} stories={stories} />
          )}
        </div>

        {/* Heartbeat summary - hidden on mobile */}
        <div className="hidden sm:block flex-shrink-0">
          <HeartbeatSummary
            stories={stories}
            onStatusClick={onHeartbeatStatusClick}
          />
        </div>

        {/* Scheduler status - hidden on mobile */}
        {schedulerStatus && onUpdateMaxConcurrent && (
          <div className="hidden sm:block flex-shrink-0">
            <SchedulerStatus
              status={schedulerStatus}
              onUpdateMaxConcurrent={onUpdateMaxConcurrent}
            />
          </div>
        )}

        {/* Actions and user */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Navigation toggle: Board / Tokens / Activity - hidden on mobile */}
          <nav className="hidden sm:flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {[
              { path: '/', label: 'Board' },
              { path: '/tokens', label: 'Tokens' },
              { path: '/activity', label: 'Activity' },
            ].map(({ path, label }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  currentPath === path
                    ? 'text-white bg-blue-600 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {onCreateStory && (
            <button
              onClick={onCreateStory}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              aria-label="Create story"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
          <span className="hidden sm:inline-flex"><AudioAlertToggle /></span>
          <NotificationBell stories={stories} />

          {/* User avatar - hidden on mobile */}
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User'}
              className="hidden sm:block w-7 h-7 rounded-full border-2 border-gray-200 dark:border-gray-700"
            />
          ) : (
            <div className="hidden sm:flex w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-700 items-center justify-center">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {user?.email?.[0].toUpperCase()}
              </span>
            </div>
          )}

          {/* Sign out button */}
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50 transition-colors"
            aria-label="Sign out"
          >
            {isSigningOut ? (
              <svg
                className="animate-spin h-5 w-5"
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
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

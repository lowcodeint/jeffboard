// Main board page component

import { useEffect, useRef, useState } from 'react';
import { useStories } from '../hooks/useStories';
import { useProjects } from '../hooks/useProjects';
import { useAgents } from '../hooks/useAgents';
import { useWebhookEvents } from '../hooks/useWebhookEvents';
import { useStuckDetection } from '../hooks/useStuckDetection';
import { useSchedulerStatus } from '../hooks/useSchedulerStatus';
import { useAudioAlert } from '../hooks/useAudioAlert';
import { useBoardStore } from '../stores/boardStore';
import { useToastStore } from '../stores/toastStore';
import { KanbanBoard } from '../components/board/KanbanBoard';
import { StoryDetailSheet } from '../components/board/StoryDetailSheet';
import { CreateStorySheet } from '../components/board/CreateStorySheet';
import { WebhookEventsPanel } from '../components/board/WebhookEventsPanel';
import { AppHeader } from '../components/layout/AppHeader';
import { BlockedBanner } from '../components/layout/BlockedBanner';
import { AgentSummaryBar, FilterBar } from '../components/filters';
import { ToastContainer } from '../components/layout/ToastContainer';
import { AppLoadingSpinner } from '../components/shared/AppLoadingSpinner';
import { COLUMN_ORDER } from '../utils/constants';

/**
 * BoardPage component
 * Main page showing the Kanban board with all features
 * - Real-time Firestore updates
 * - Project filtering
 * - Swipeable columns on mobile
 * - Story detail sheets
 * - Toast notifications
 */
export function BoardPage() {
  const {
    activeProjectId,
    setActiveProjectId,
    selectedStoryId,
    setSelectedStoryId,
    setActiveColumnIndex,
    toggleAgentFilter
  } = useBoardStore();
  const { addToast } = useToastStore();
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  // Fetch data with real-time listeners
  const { projects, loading: projectsLoading } = useProjects();
  const { stories, loading: storiesLoading } = useStories(activeProjectId);
  const { agents } = useAgents();
  const { webhookEvents, loading: webhookEventsLoading } = useWebhookEvents(activeProjectId);

  // Scheduler status
  const { status: schedulerStatus, updateMaxConcurrent } = useSchedulerStatus();

  // Audio alert for stuck detection
  const { play: playAudioAlert } = useAudioAlert();

  // Monitor for stuck agents and fire notifications
  useStuckDetection({
    stories,
    enabled: !storiesLoading,
    onStuckDetected: (story) => {
      playAudioAlert();
      console.log('Stuck agent detected:', story.shortId);
    }
  });

  // Calculate blocked stories count
  const blockedStories = stories.filter((s) => s.status === 'blocked');

  // Find selected story for detail sheet
  const selectedStory = stories.find((s) => s.id === selectedStoryId) || null;

  // Navigate to blocked column
  const handleBlockedBannerClick = () => {
    const blockedIndex = COLUMN_ORDER.indexOf('blocked');
    setActiveColumnIndex(blockedIndex);
  };

  // Navigate to in-progress column when heartbeat status is clicked
  const handleHeartbeatStatusClick = (_status: 'green' | 'yellow' | 'red') => {
    const inProgressIndex = COLUMN_ORDER.indexOf('in-progress');
    setActiveColumnIndex(inProgressIndex);
    // TODO: Could add filtering by heartbeat status here in the future
  };

  // Handle project selection
  const handleProjectSelect = (projectId: string | null) => {
    setActiveProjectId(projectId);
    setActiveColumnIndex(0); // Reset to first column
  };

  // Handle agent click from summary bar - toggles agent filter
  const handleAgentClick = (agentId: string) => {
    toggleAgentFilter(agentId);
  };

  // Mark initial load as complete after first data arrives
  useEffect(() => {
    if (!projectsLoading && !storiesLoading && !initialLoadComplete) {
      setInitialLoadComplete(true);
    }
  }, [projectsLoading, storiesLoading, initialLoadComplete]);

  // Track which story status transitions we've already toasted for
  const toastedStatusRef = useRef<Map<string, string>>(new Map());

  // Show toast notifications when stories move to Done or Blocked
  useEffect(() => {
    // Don't show toasts on initial load
    if (storiesLoading) return;

    stories.forEach((story) => {
      const lastUpdate = story.updatedAt.toMillis();
      const now = Date.now();
      const timeSinceUpdate = now - lastUpdate;
      const toastedStatus = toastedStatusRef.current.get(story.id);

      // Only show toast if update was in the last 5 seconds and we haven't
      // already toasted for this story being in this status
      if (timeSinceUpdate < 5000 && toastedStatus !== story.status) {
        if (story.status === 'blocked' && story.previousStatus !== 'blocked') {
          addToast(`${story.shortId} is blocked`, 'warning');
          toastedStatusRef.current.set(story.id, story.status);
        }
      }
    });
  }, [stories, storiesLoading, addToast]);

  const loading = projectsLoading || storiesLoading;

  // Find active project for burst mode indicator
  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  // Show full-page spinner on initial load
  if (!initialLoadComplete) {
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
        onProjectSelect={handleProjectSelect}
        onCreateStory={() => setCreateSheetOpen(true)}
        onHeartbeatStatusClick={handleHeartbeatStatusClick}
        schedulerStatus={schedulerStatus}
        onUpdateMaxConcurrent={updateMaxConcurrent}
      />

      {/* Blocked stories banner */}
      <BlockedBanner
        blockedCount={blockedStories.length}
        onClick={handleBlockedBannerClick}
      />

      {/* Agent summary bar */}
      {!loading && (
        <AgentSummaryBar
          agents={agents}
          stories={stories}
          onAgentClick={handleAgentClick}
        />
      )}

      {/* Filter bar */}
      {!loading && <FilterBar stories={stories} />}

      {/* Main board */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden">
          <KanbanBoard stories={stories} loading={loading} />
        </div>

        {/* Webhook events panel */}
        <WebhookEventsPanel webhookEvents={webhookEvents} loading={webhookEventsLoading} />
      </div>

      {/* Story detail sheet */}
      <StoryDetailSheet
        story={selectedStory}
        agents={agents}
        onClose={() => setSelectedStoryId(null)}
      />

      {/* Create story sheet */}
      <CreateStorySheet
        isOpen={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        projects={projects}
        agents={agents}
        activeProjectId={activeProjectId}
      />

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}

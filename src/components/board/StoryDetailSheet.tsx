// Story detail sheet (bottom sheet / modal)

import { useEffect, useRef, useState } from 'react';
import type { Story, StoryStatus, Agent, Priority, Complexity } from '../../types';
import { PRIORITIES, COMPLEXITIES } from '../../types';
import { STATUS_NAMES, COLUMN_ORDER, PRIORITY_NAMES } from '../../utils/constants';
import { formatFullDate } from '../../utils/formatting';
import { AgentAvatar } from '../shared/AgentAvatar';
import { PriorityBadge } from '../shared/PriorityBadge';
import { useStoryActivity } from '../../hooks/useStoryActivity';
import { useAuth } from '../auth/AuthProvider';
import { useToastStore } from '../../stores/toastStore';
import { addNote, updateStoryStatus, updateStoryFields, addNoteReaction, removeNoteReaction } from '../../services/stories';
import type { NoteReaction } from '../../types';

const inputClass = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

interface StoryDetailSheetProps {
  story: Story | null;
  agents: Agent[];
  onClose: () => void;
}

export function StoryDetailSheet({ story, agents, onClose }: StoryDetailSheetProps) {
  const { activity, loading: activityLoading } = useStoryActivity(story?.id || null);
  const { user } = useAuth();
  const addToast = useToastStore((s) => s.addToast);
  const [noteText, setNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<StoryStatus | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const reasonInputRef = useRef<HTMLInputElement>(null);
  const [assignmentDropdownOpen, setAssignmentDropdownOpen] = useState(false);
  const [assignmentUpdating, setAssignmentUpdating] = useState(false);
  const assignmentDropdownRef = useRef<HTMLDivElement>(null);
  const isOpen = !!story;

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('P2');
  const [editComplexity, setEditComplexity] = useState<Complexity>('M');
  const [editAssignedAgent, setEditAssignedAgent] = useState('');
  const [editEpicName, setEditEpicName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editUserStory, setEditUserStory] = useState('');

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editing) {
          setEditing(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, editing, onClose]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close status dropdown on outside click
  useEffect(() => {
    if (!statusDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
        setPendingStatus(null);
        setReasonText('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [statusDropdownOpen]);

  // Close assignment dropdown on outside click
  useEffect(() => {
    if (!assignmentDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (assignmentDropdownRef.current && !assignmentDropdownRef.current.contains(e.target as Node)) {
        setAssignmentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [assignmentDropdownOpen]);

  // Focus reason input when pending status requires one
  useEffect(() => {
    if (pendingStatus) reasonInputRef.current?.focus();
  }, [pendingStatus]);

  // Reset all inputs when story changes
  useEffect(() => {
    setNoteText('');
    setSubmitting(false);
    setStatusDropdownOpen(false);
    setPendingStatus(null);
    setReasonText('');
    setAssignmentDropdownOpen(false);
    setEditing(false);
    setSaving(false);
  }, [story?.id]);

  // Populate edit fields when entering edit mode
  const enterEditMode = () => {
    if (!story) return;
    setEditTitle(story.title);
    setEditPriority(story.priority);
    setEditComplexity(story.complexity);
    setEditAssignedAgent(story.assignedAgent || '');
    setEditEpicName(story.epicName || '');
    setEditDescription(story.description || '');
    setEditUserStory(story.userStory || '');
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!story || saving || !editTitle.trim()) return;
    setSaving(true);

    // Build diff — only send changed fields
    const changes: Record<string, unknown> = {};
    if (editTitle.trim() !== story.title) changes.title = editTitle.trim();
    if (editPriority !== story.priority) changes.priority = editPriority;
    if (editComplexity !== story.complexity) changes.complexity = editComplexity;
    const newAgent = editAssignedAgent || null;
    if (newAgent !== story.assignedAgent) changes.assignedAgent = newAgent;
    if (editEpicName.trim() !== (story.epicName || '')) changes.epicName = editEpicName.trim();
    if (editDescription.trim() !== (story.description || '')) changes.description = editDescription.trim();
    if (editUserStory.trim() !== (story.userStory || '')) changes.userStory = editUserStory.trim();

    if (Object.keys(changes).length === 0) {
      setEditing(false);
      setSaving(false);
      return;
    }

    try {
      await updateStoryFields(story.id, changes);
      addToast('Story updated', 'success');
      setEditing(false);
    } catch (err) {
      console.error('Failed to update story:', err);
      addToast('Failed to update story', 'warning');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitNote = async () => {
    if (!story || !noteText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const authorName = user?.displayName || user?.email || 'Unknown';
      await addNote(story.id, noteText.trim(), authorName);
      setNoteText('');
      addToast('Note added', 'success');
    } catch (err) {
      console.error('Failed to add note:', err);
      addToast('Failed to add note', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusSelect = (newStatus: StoryStatus) => {
    if (newStatus === 'blocked' || newStatus === 'cancelled') {
      setPendingStatus(newStatus);
      setReasonText('');
    } else {
      commitStatusChange(newStatus);
    }
  };

  const commitStatusChange = async (newStatus: StoryStatus, reason?: string) => {
    if (!story || statusUpdating) return;
    setStatusUpdating(true);
    try {
      const authorName = user?.displayName || user?.email || 'Unknown';
      await updateStoryStatus(story.id, newStatus, story.status, authorName, reason);
      addToast(`Status changed to ${STATUS_NAMES[newStatus]}`, 'success');
    } catch (err) {
      console.error('Failed to update status:', err);
      addToast('Failed to update status', 'warning');
    } finally {
      setStatusUpdating(false);
      setStatusDropdownOpen(false);
      setPendingStatus(null);
      setReasonText('');
    }
  };

  const handleAssignmentChange = async (agentId: string | null) => {
    if (!story || assignmentUpdating || agentId === story.assignedAgent) {
      setAssignmentDropdownOpen(false);
      return;
    }
    setAssignmentUpdating(true);
    try {
      await updateStoryFields(story.id, { assignedAgent: agentId });
      const agentName = agentId ? (agents.find(a => a.id === agentId)?.displayName || agentId) : 'Unassigned';
      addToast(`Assigned to ${agentName}`, 'success');
    } catch (err) {
      console.error('Failed to update assignment:', err);
      addToast('Failed to update assignment', 'warning');
    } finally {
      setAssignmentUpdating(false);
      setAssignmentDropdownOpen(false);
    }
  };

  if (!story) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/50 dark:bg-black/70 z-40
          transition-opacity duration-300
          backdrop-blur-sm
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-white dark:bg-gray-900
          rounded-t-2xl
          shadow-2xl
          max-h-[90vh]
          overflow-hidden flex flex-col
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {story.shortId}
                </span>
                {!editing && <PriorityBadge priority={story.priority} />}
              </div>
              {editing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={inputClass + ' text-lg font-bold'}
                  placeholder="Story title"
                  autoFocus
                />
              ) : (
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {story.title}
                </h2>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!editing && (
                <button
                  onClick={enterEditMode}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  aria-label="Edit story"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => { if (editing) setEditing(false); else onClose(); }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-xl"
                aria-label={editing ? 'Cancel editing' : 'Close'}
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 min-h-0 px-6 py-4 space-y-6">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status — always interactive via dropdown, not part of edit mode */}
            <div className="relative" ref={statusDropdownRef}>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Status
              </div>
              <button
                onClick={() => { setStatusDropdownOpen(!statusDropdownOpen); setPendingStatus(null); setReasonText(''); }}
                disabled={statusUpdating || editing}
                className="flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
              >
                {STATUS_NAMES[story.status]}
                {!editing && (
                  <svg
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {statusDropdownOpen && !editing && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                  {pendingStatus ? (
                    <div className="p-3">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Reason for {STATUS_NAMES[pendingStatus].toLowerCase()}
                      </div>
                      <input
                        ref={reasonInputRef}
                        type="text"
                        value={reasonText}
                        onChange={(e) => setReasonText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && reasonText.trim()) {
                            commitStatusChange(pendingStatus, reasonText.trim());
                          } else if (e.key === 'Escape') {
                            setPendingStatus(null);
                            setReasonText('');
                          }
                        }}
                        placeholder="Enter reason..."
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => { setPendingStatus(null); setReasonText(''); }}
                          className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => commitStatusChange(pendingStatus, reasonText.trim())}
                          disabled={!reasonText.trim() || statusUpdating}
                          className="flex-1 px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {statusUpdating ? 'Saving...' : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto py-1">
                      {COLUMN_ORDER.filter((s) => s !== story.status).map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusSelect(status)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          {STATUS_NAMES[status]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Priority
              </div>
              {editing ? (
                <div className="flex gap-1">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      onClick={() => setEditPriority(p)}
                      className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                        editPriority === p
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {PRIORITY_NAMES[story.priority]}
                </div>
              )}
            </div>

            {/* Complexity */}
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Complexity
              </div>
              {editing ? (
                <div className="flex gap-1">
                  {COMPLEXITIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditComplexity(c)}
                      className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                        editComplexity === c
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {story.complexity}
                </div>
              )}
            </div>

            {/* Assigned Agent — always interactive via dropdown, not part of edit mode */}
            <div className="relative" ref={assignmentDropdownRef}>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Assigned Agent
              </div>
              <button
                onClick={() => setAssignmentDropdownOpen(!assignmentDropdownOpen)}
                disabled={assignmentUpdating || editing}
                className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
              >
                <AgentAvatar agentId={story.assignedAgent} size="sm" />
                <span>{story.assignedAgent ? (agents.find(a => a.id === story.assignedAgent)?.displayName || story.assignedAgent) : 'Unassigned'}</span>
                {!editing && (
                  <svg
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform ${assignmentDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {assignmentDropdownOpen && !editing && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                  <div className="max-h-64 overflow-y-auto py-1">
                    {/* Unassigned option */}
                    <button
                      onClick={() => handleAssignmentChange(null)}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                        story.assignedAgent === null
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <AgentAvatar agentId={null} size="sm" />
                      <span className="flex-1">Unassigned</span>
                      {story.assignedAgent === null && (
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                    {/* Agent options */}
                    {agents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => handleAssignmentChange(agent.id)}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                          story.assignedAgent === agent.id
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <AgentAvatar agentId={agent.id} size="sm" />
                        <span className="flex-1">{agent.displayName}</span>
                        {story.assignedAgent === agent.id && (
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Epic */}
          {(editing || story.epicName) && (
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Epic
              </div>
              {editing ? (
                <input
                  type="text"
                  value={editEpicName}
                  onChange={(e) => setEditEpicName(e.target.value)}
                  placeholder="Epic name"
                  className={inputClass}
                />
              ) : (
                <div className="text-sm text-gray-900 dark:text-gray-100">
                  {story.epicName}
                </div>
              )}
            </div>
          )}

          {/* Blocked / Cancelled reason */}
          {!editing && story.blockedReason && (
            <div className={`${
              story.status === 'cancelled'
                ? 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700'
                : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
            } rounded-lg p-4`}>
              <div className="flex items-start gap-2">
                <span className={`${story.status === 'cancelled' ? 'text-slate-500' : 'text-red-500'} text-lg`}>
                  {story.status === 'cancelled' ? '❌' : '⚠️'}
                </span>
                <div className="flex-1">
                  <div className={`text-sm font-semibold mb-1 ${
                    story.status === 'cancelled'
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-red-900 dark:text-red-100'
                  }`}>
                    {story.status === 'cancelled' ? 'Cancelled' : 'Blocked'}
                  </div>
                  <div className={`text-sm ${
                    story.status === 'cancelled'
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {story.blockedReason}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User story */}
          {(editing || story.userStory) && (
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                User Story
              </div>
              {editing ? (
                <textarea
                  value={editUserStory}
                  onChange={(e) => setEditUserStory(e.target.value)}
                  placeholder="As a... I want... So that..."
                  rows={3}
                  className={inputClass + ' resize-none'}
                />
              ) : (
                <div className="text-sm text-gray-700 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  {story.userStory}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {(editing || story.description) && (
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Description
              </div>
              {editing ? (
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description"
                  rows={4}
                  className={inputClass + ' resize-none'}
                />
              ) : (
                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {story.description}
                </div>
              )}
            </div>
          )}

          {/* Below here: read-only sections hidden in edit mode */}
          {!editing && (
            <>
              {/* Acceptance Criteria */}
              {story.acceptanceCriteria.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Acceptance Criteria
                  </div>
                  <div className="space-y-2">
                    {story.acceptanceCriteria.map((criterion, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div
                          className={`
                            flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5
                            ${
                              criterion.completed
                                ? 'bg-green-500 border-green-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }
                          `}
                        >
                          {criterion.completed && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <span
                          className={`
                            text-sm flex-1
                            ${
                              criterion.completed
                                ? 'line-through text-gray-500 dark:text-gray-500'
                                : 'text-gray-700 dark:text-gray-300'
                            }
                          `}
                        >
                          {criterion.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status History */}
              {!activityLoading && activity.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
                    Status History
                  </div>
                  <div className="space-y-3">
                    {activity.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-3 text-sm"
                      >
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2" />
                        <div className="flex-1">
                          <div className="text-gray-900 dark:text-gray-100">
                            Moved from <strong>{item.fromStatus ? STATUS_NAMES[item.fromStatus] : 'New'}</strong> to{' '}
                            <strong>{STATUS_NAMES[item.toStatus]}</strong>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {item.agent} • {formatFullDate(item.timestamp)}
                          </div>
                          {item.note && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">
                              "{item.note}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {story.notes.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
                    Notes
                  </div>
                  <div className="space-y-3">
                    {story.notes.map((note, index) => {
                      const reactions = (story.noteReactions || []).filter(
                        (r: NoteReaction) => r.noteId === note.id
                      );
                      const currentUserName = user?.displayName || user?.email || '';
                      const hasReacted = reactions.some(
                        (r: NoteReaction) => r.author === currentUserName
                      );
                      const isFromOthers = note.author !== currentUserName;
                      const isUnacknowledged = note.id && isFromOthers && !hasReacted;

                      return (
                        <div
                          key={note.id || index}
                          className={`rounded-lg p-3 ${
                            isUnacknowledged
                              ? 'bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 border-l-4 border-l-amber-400 dark:border-l-amber-500'
                              : 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800'
                          }`}
                        >
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {note.text}
                          </div>
                          {note.imageUrl && (
                            <a href={note.imageUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
                              <img
                                src={note.imageUrl}
                                alt="Note attachment"
                                className="max-h-64 rounded-lg border border-gray-200 dark:border-gray-700 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                              />
                            </a>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {note.author} • {formatFullDate(note.createdAt)}
                            </div>
                            {note.id && (
                              <button
                                onClick={async () => {
                                  try {
                                    if (hasReacted) {
                                      const myReaction = reactions.find(
                                        (r: NoteReaction) => r.author === currentUserName
                                      );
                                      if (myReaction) {
                                        await removeNoteReaction(story.id, myReaction);
                                      }
                                    } else {
                                      await addNoteReaction(story.id, note.id!, currentUserName);
                                    }
                                  } catch (err) {
                                    console.error('Failed to toggle reaction:', err);
                                    addToast('Failed to update reaction', 'warning');
                                  }
                                }}
                                title={reactions.length > 0 ? reactions.map((r: NoteReaction) => r.author).join(', ') : 'Acknowledge'}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                                  hasReacted
                                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                <span>👍</span>
                                {reactions.length > 0 && <span>{reactions.length}</span>}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>Created: {formatFullDate(story.createdAt)}</div>
                <div>Last updated: {formatFullDate(story.updatedAt)}</div>
              </div>
            </>
          )}
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-3">
          {editing ? (
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editTitle.trim() || saving}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSubmitNote();
                  }
                }}
                placeholder="Add a note..."
                rows={1}
                className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSubmitNote}
                disabled={submitting || !noteText.trim()}
                className="flex-shrink-0 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Sending...' : 'Send'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Create story bottom sheet form

import { useEffect, useState } from 'react';
import type { Agent, Project, Priority, Complexity } from '../../types';
import { PRIORITIES, COMPLEXITIES } from '../../types';
import { PRIORITY_NAMES } from '../../utils/constants';
import { createStory } from '../../services/stories';
import { useToastStore } from '../../stores/toastStore';
import { TagSelector } from '../shared/TagSelector';
import { AgentRecommendation } from '../shared/AgentRecommendation';
import { getRecommendedAgent } from '../../utils/agentRouting';

interface CreateStorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  agents: Agent[];
  activeProjectId: string | null;
}

export function CreateStorySheet({
  isOpen,
  onClose,
  projects,
  agents,
  activeProjectId,
}: CreateStorySheetProps) {
  const addToast = useToastStore((s) => s.addToast);

  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(activeProjectId || '');
  const [priority, setPriority] = useState<Priority>('P2');
  const [complexity, setComplexity] = useState<Complexity>('M');
  const [assignedAgent, setAssignedAgent] = useState('');
  const [epicName, setEpicName] = useState('');
  const [userStory, setUserStory] = useState('');
  const [description, setDescription] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Sync projectId when activeProjectId changes or sheet opens
  useEffect(() => {
    if (isOpen && activeProjectId) {
      setProjectId(activeProjectId);
    }
  }, [isOpen, activeProjectId]);

  // Reset form when sheet opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setPriority('P2');
      setComplexity('M');
      setAssignedAgent('');
      setEpicName('');
      setUserStory('');
      setDescription('');
      setAcceptanceCriteria([]);
      setTags([]);
      setSubmitting(false);
    }
  }, [isOpen]);

  // Auto-select recommended agent when tags change
  useEffect(() => {
    if (tags.length > 0) {
      const recommendation = getRecommendedAgent(tags);
      if (recommendation) {
        setAssignedAgent(recommendation.agentId);
      }
    }
  }, [tags]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!title.trim() || !projectId || submitting) return;
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    setSubmitting(true);
    try {
      const ac = acceptanceCriteria
        .map(t => t.trim())
        .filter(Boolean)
        .map(text => ({ text, completed: false }));
      const result = await createStory({
        projectId,
        shortCode: project.shortCode,
        title: title.trim(),
        description: description.trim(),
        userStory: userStory.trim(),
        epicName: epicName.trim(),
        acceptanceCriteria: ac.length > 0 ? ac : undefined,
        priority,
        complexity,
        assignedAgent: assignedAgent || null,
        tags: tags.length > 0 ? tags : undefined,
      });
      addToast(`Created ${result.shortId}`, 'success');
      onClose();
    } catch (err) {
      console.error('Failed to create story:', err);
      addToast('Failed to create story', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 transition-opacity duration-300 backdrop-blur-sm opacity-100"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col transition-transform duration-300 ease-out translate-y-0">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              New Story
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-xl"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable form */}
        <div className="overflow-y-auto flex-1 min-h-0 px-6 py-4 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Story title"
              autoFocus
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* User Story */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              User Story
            </label>
            <textarea
              value={userStory}
              onChange={(e) => setUserStory(e.target.value)}
              placeholder="As a [role], I want [feature] so that [benefit]"
              rows={2}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Project */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Project <span className="text-red-500">*</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select project...</option>
              {projects.filter((p) => !p.isArchived).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Priority
            </label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    priority === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {p} <span className="hidden sm:inline text-xs opacity-75">({PRIORITY_NAMES[p]})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Complexity */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Complexity
            </label>
            <div className="flex gap-2">
              {COMPLEXITIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setComplexity(c)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    complexity === c
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Assigned Agent */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Assigned Agent
            </label>
            <select
              value={assignedAgent}
              onChange={(e) => setAssignedAgent(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.displayName}</option>
              ))}
            </select>
          </div>

          {/* Epic Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Epic Name
            </label>
            <input
              type="text"
              value={epicName}
              onChange={(e) => setEpicName(e.target.value)}
              placeholder="Optional epic name"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Tags
            </label>
            <TagSelector selectedTags={tags} onTagsChange={setTags} />
            {tags.length > 0 && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Selected: {tags.join(', ')}
              </p>
            )}
          </div>

          {/* Agent Recommendation */}
          <div>
            <AgentRecommendation tags={tags} agents={agents} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What should this look and feel like? Include context, references, and what's out of scope."
              rows={5}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            {title.trim() && !description.trim() && !userStory.trim() && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Stories without context often need rework. Consider adding a description or user story.
              </p>
            )}
          </div>

          {/* Acceptance Criteria */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Acceptance Criteria
            </label>
            <div className="space-y-2">
              {acceptanceCriteria.map((criterion, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={criterion}
                    onChange={(e) => {
                      const updated = [...acceptanceCriteria];
                      updated[index] = e.target.value;
                      setAcceptanceCriteria(updated);
                    }}
                    placeholder="Given [context], when [action], then [result]"
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => {
                      setAcceptanceCriteria(acceptanceCriteria.filter((_, i) => i !== index));
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                    aria-label="Remove criterion"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => setAcceptanceCriteria([...acceptanceCriteria, ''])}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                + Add criterion
              </button>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-3">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || !projectId || submitting}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Story'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

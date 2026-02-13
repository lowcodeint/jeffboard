// Meeting command: Create and manage meeting records

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Timestamp } from 'firebase-admin/firestore';
import { createMeeting, listMeetings, getMeeting, getOpenActionItems, listMeetingsSimple, getOpenActionItemsSimple, getBoardMetrics, getAgentActivity, updateActionItem, findStoryByShortId, VALID_MEETING_TYPES } from '../lib/firestore.js';
import type { MeetingType, MeetingData, AgendaItem, Decision, ActionItem, LinkedChange, BoardMetrics } from '../lib/firestore.js';
import { validateRequired } from '../lib/validators.js';
import { getProjectId } from '../lib/config.js';

/**
 * Parse a JSON string, providing a clear error message on failure
 */
function parseJsonOption(value: string, label: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Invalid JSON for --${label}: ${value}`);
  }
}

/**
 * Read and parse a JSON file
 */
function readJsonFile(filePath: string): unknown {
  const absolutePath = resolve(filePath);
  try {
    const content = readFileSync(absolutePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`File not found: ${absolutePath}`);
    }
    throw new Error(`Failed to parse JSON file ${absolutePath}: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Validate meeting type
 */
function validateMeetingType(type: string): asserts type is MeetingType {
  if (!VALID_MEETING_TYPES.includes(type as MeetingType)) {
    throw new Error(`Invalid meeting type: ${type}. Valid types: ${VALID_MEETING_TYPES.join(', ')}`);
  }
}

/**
 * Validate agenda items array structure
 */
function validateAgenda(items: unknown[]): AgendaItem[] {
  return items.map((item: any, i: number) => {
    if (!item.topic || typeof item.topic !== 'string') {
      throw new Error(`Agenda item ${i}: "topic" (string) is required`);
    }
    return {
      topic: item.topic,
      presenter: item.presenter ?? null,
      notes: item.notes ?? '',
      resolved: item.resolved ?? false
    };
  });
}

/**
 * Validate decisions array structure
 */
function validateDecisions(items: unknown[]): Decision[] {
  const validCategories = ['process', 'technical', 'product'];
  return items.map((item: any, i: number) => {
    if (!item.text || typeof item.text !== 'string') {
      throw new Error(`Decision ${i}: "text" (string) is required`);
    }
    if (!item.category || !validCategories.includes(item.category)) {
      throw new Error(`Decision ${i}: "category" must be one of: ${validCategories.join(', ')}`);
    }
    return {
      text: item.text,
      rationale: item.rationale ?? '',
      category: item.category
    };
  });
}

/**
 * Validate action items array structure
 */
function validateActionItems(items: unknown[]): ActionItem[] {
  return items.map((item: any, i: number) => {
    if (!item.text || typeof item.text !== 'string') {
      throw new Error(`Action item ${i}: "text" (string) is required`);
    }
    if (!item.owner || typeof item.owner !== 'string') {
      throw new Error(`Action item ${i}: "owner" (string) is required`);
    }
    return {
      id: item.id ?? '',
      text: item.text,
      owner: item.owner,
      status: item.status === 'done' ? 'done' as const : 'open' as const,
      dueBy: item.dueBy ? Timestamp.fromDate(new Date(item.dueBy)) : null,
      linkedStoryId: item.linkedStoryId ?? null
    };
  });
}

/**
 * Validate linked changes array structure
 */
function validateLinkedChanges(items: unknown[]): LinkedChange[] {
  const validTypes = ['story', 'commit', 'deploy', 'config-change'];
  return items.map((item: any, i: number) => {
    if (!item.type || !validTypes.includes(item.type)) {
      throw new Error(`Linked change ${i}: "type" must be one of: ${validTypes.join(', ')}`);
    }
    if (!item.refId || typeof item.refId !== 'string') {
      throw new Error(`Linked change ${i}: "refId" (string) is required`);
    }
    return {
      type: item.type,
      refId: item.refId,
      description: item.description ?? ''
    };
  });
}

/**
 * Build MeetingData from a file's JSON content
 */
function buildMeetingDataFromFile(fileData: any, projectId: string): MeetingData {
  // type is required
  if (!fileData.type) {
    throw new Error('File JSON must include "type" (retro|planning|ad-hoc)');
  }
  validateMeetingType(fileData.type);

  // summary is required
  if (!fileData.summary || typeof fileData.summary !== 'string') {
    throw new Error('File JSON must include "summary" (string)');
  }

  const meetingData: MeetingData = {
    projectId,
    type: fileData.type,
    summary: fileData.summary,
    sprintNumber: fileData.sprintNumber != null ? Number(fileData.sprintNumber) : null,
    participants: Array.isArray(fileData.participants) ? fileData.participants : [],
    date: fileData.date ? new Date(fileData.date) : undefined
  };

  if (Array.isArray(fileData.agenda)) {
    meetingData.agenda = validateAgenda(fileData.agenda);
  }
  if (Array.isArray(fileData.decisions)) {
    meetingData.decisions = validateDecisions(fileData.decisions);
  }
  if (Array.isArray(fileData.actionItems)) {
    meetingData.actionItems = validateActionItems(fileData.actionItems);
  }
  if (Array.isArray(fileData.linkedChanges)) {
    meetingData.linkedChanges = validateLinkedChanges(fileData.linkedChanges);
  }

  return meetingData;
}

function createMeetingCreateCommand(): Command {
  return new Command('create')
    .description('Create a new meeting record')
    .option('-p, --project <projectId>', 'Project ID (auto-detected from .claude/jeffboard.json)')
    .option('--type <type>', 'Meeting type (retro|planning|ad-hoc)')
    .option('--summary <text>', 'Meeting summary')
    .option('--sprint <number>', 'Sprint number')
    .option('--date <date>', 'Meeting date (ISO 8601, defaults to now)')
    .option('--participants <list>', 'Comma-separated participant names')
    .option('--agenda <json>', 'Agenda items as JSON array')
    .option('--decisions <json>', 'Decisions as JSON array')
    .option('--action-items <json>', 'Action items as JSON array')
    .option('--linked-changes <json>', 'Linked changes as JSON array')
    .option('--file <path>', 'Read meeting data from a JSON file')
    .action(async (options) => {
      try {
        const projectId = getProjectId(options.project);

        let meetingData: MeetingData;

        if (options.file) {
          // File mode: read all data from file, project ID from config/flag
          const fileData = readJsonFile(options.file);
          meetingData = buildMeetingDataFromFile(fileData, projectId);

          // CLI flags can override file values
          if (options.type) {
            validateMeetingType(options.type);
            meetingData.type = options.type;
          }
          if (options.summary) {
            meetingData.summary = options.summary;
          }
          if (options.sprint != null) {
            meetingData.sprintNumber = Number(options.sprint);
          }
          if (options.date) {
            meetingData.date = new Date(options.date);
          }
          if (options.participants) {
            meetingData.participants = options.participants.split(',').map((p: string) => p.trim()).filter(Boolean);
          }
        } else {
          // Flag mode: require --type and --summary
          validateRequired(options.type, 'Type (--type)');
          validateMeetingType(options.type);
          validateRequired(options.summary, 'Summary (--summary)');

          meetingData = {
            projectId,
            type: options.type,
            summary: options.summary,
            sprintNumber: options.sprint != null ? Number(options.sprint) : null,
            participants: options.participants
              ? options.participants.split(',').map((p: string) => p.trim()).filter(Boolean)
              : [],
            date: options.date ? new Date(options.date) : undefined
          };

          // Parse optional JSON arrays from flags
          if (options.agenda) {
            const raw = parseJsonOption(options.agenda, 'agenda') as unknown[];
            meetingData.agenda = validateAgenda(raw);
          }
          if (options.decisions) {
            const raw = parseJsonOption(options.decisions, 'decisions') as unknown[];
            meetingData.decisions = validateDecisions(raw);
          }
          if (options.actionItems) {
            const raw = parseJsonOption(options.actionItems, 'action-items') as unknown[];
            meetingData.actionItems = validateActionItems(raw);
          }
          if (options.linkedChanges) {
            const raw = parseJsonOption(options.linkedChanges, 'linked-changes') as unknown[];
            meetingData.linkedChanges = validateLinkedChanges(raw);
          }
        }

        // Validate date if provided
        if (meetingData.date && isNaN(meetingData.date.getTime())) {
          throw new Error('Invalid date format. Use ISO 8601 (e.g., 2026-02-10T18:00:00Z)');
        }

        // Validate sprint number if provided
        if (meetingData.sprintNumber != null && (isNaN(meetingData.sprintNumber) || meetingData.sprintNumber < 0)) {
          throw new Error('Sprint number must be a non-negative number');
        }

        const result = await createMeeting(meetingData);

        // Print formatted summary
        console.log(`\n✓ Created ${meetingData.type} meeting (${result.id})`);
        console.log(`  Project:  ${projectId}`);
        console.log(`  Type:     ${meetingData.type}`);
        if (meetingData.sprintNumber != null) {
          console.log(`  Sprint:   ${meetingData.sprintNumber}`);
        }
        console.log(`  Summary:  ${meetingData.summary.substring(0, 100)}${meetingData.summary.length > 100 ? '...' : ''}`);

        const counts = [];
        if (meetingData.agenda?.length) counts.push(`${meetingData.agenda.length} agenda items`);
        if (meetingData.decisions?.length) counts.push(`${meetingData.decisions.length} decisions`);
        if (meetingData.actionItems?.length) counts.push(`${meetingData.actionItems.length} action items`);
        if (meetingData.linkedChanges?.length) counts.push(`${meetingData.linkedChanges.length} linked changes`);
        if (counts.length > 0) {
          console.log(`  Contents: ${counts.join(', ')}`);
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}

/**
 * Format a Firestore Timestamp or date-like value to a readable string
 */
function formatDate(val: any): string {
  if (!val) return 'N/A';
  const d = val.toDate ? val.toDate() : new Date(val);
  return d.toISOString().split('T')[0];
}

/**
 * Truncate a string to a max length, appending '...' if truncated
 */
function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.substring(0, max - 3) + '...' : str;
}

function createMeetingListCommand(): Command {
  return new Command('list')
    .description('List recent meetings')
    .option('-p, --project <projectId>', 'Project ID (auto-detected from .claude/jeffboard.json)')
    .option('--type <type>', 'Filter by meeting type (retro|planning|ad-hoc)')
    .option('--limit <n>', 'Number of meetings to show (default: 10)', '10')
    .option('--open-actions', 'Show all unresolved action items across all meetings')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const projectId = getProjectId(options.project);

        // --open-actions mode: find all unresolved action items
        if (options.openActions) {
          const openItems = await getOpenActionItems(projectId);

          if (options.json) {
            console.log(JSON.stringify(openItems, null, 2));
            return;
          }

          if (openItems.length === 0) {
            console.log('\nNo open action items found.');
            return;
          }

          console.log(`\n  Open Action Items (${openItems.length})`);
          console.log('  ' + '─'.repeat(70));
          for (const entry of openItems) {
            const date = formatDate(entry.meetingDate);
            const due = entry.actionItem.dueBy ? ` (due: ${formatDate(entry.actionItem.dueBy)})` : '';
            const linked = entry.actionItem.linkedStoryId ? ` → ${entry.actionItem.linkedStoryId}` : '';
            console.log(`  [${date} ${entry.meetingType}] ${entry.actionItem.owner}: ${entry.actionItem.text}${due}${linked}`);
          }
          console.log('');
          return;
        }

        // Normal list mode
        if (options.type) {
          validateMeetingType(options.type);
        }

        const limit = parseInt(options.limit, 10);
        if (isNaN(limit) || limit < 1) {
          throw new Error('--limit must be a positive number');
        }

        const meetings = await listMeetings(projectId, {
          type: options.type,
          limit
        });

        if (options.json) {
          console.log(JSON.stringify(meetings, null, 2));
          return;
        }

        if (meetings.length === 0) {
          const typeFilter = options.type ? ` of type "${options.type}"` : '';
          console.log(`\nNo meetings found${typeFilter}.`);
          return;
        }

        console.log(`\n  Meetings (${meetings.length})`);
        console.log('  ' + '─'.repeat(70));
        for (const m of meetings) {
          const date = formatDate(m.date);
          const sprint = m.sprintNumber != null ? ` S${m.sprintNumber}` : '';
          const summary = truncate(m.summary, 80);
          console.log(`  ${m.id}  ${date}  ${m.type}${sprint}  ${summary}`);
        }
        console.log('');
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}

function createMeetingGetCommand(): Command {
  return new Command('get')
    .description('Get full details of a meeting')
    .requiredOption('--id <meetingId>', 'Meeting ID')
    .option('--decisions-only', 'Show only decisions')
    .option('--action-items-only', 'Show only action items')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const meeting = await getMeeting(options.id);

        if (!meeting) {
          console.error(`Error: Meeting not found: ${options.id}`);
          process.exit(1);
        }

        // JSON output
        if (options.json) {
          if (options.decisionsOnly) {
            console.log(JSON.stringify(meeting.decisions || [], null, 2));
          } else if (options.actionItemsOnly) {
            console.log(JSON.stringify(meeting.actionItems || [], null, 2));
          } else {
            console.log(JSON.stringify(meeting, null, 2));
          }
          return;
        }

        // --decisions-only
        if (options.decisionsOnly) {
          const decisions = meeting.decisions || [];
          if (decisions.length === 0) {
            console.log('\nNo decisions recorded for this meeting.');
            return;
          }
          console.log(`\n  Decisions (${decisions.length})`);
          console.log('  ' + '─'.repeat(60));
          for (const d of decisions) {
            console.log(`  [${d.category}] ${d.text}`);
            if (d.rationale) {
              console.log(`    Rationale: ${d.rationale}`);
            }
          }
          console.log('');
          return;
        }

        // --action-items-only
        if (options.actionItemsOnly) {
          const items = meeting.actionItems || [];
          if (items.length === 0) {
            console.log('\nNo action items recorded for this meeting.');
            return;
          }
          console.log(`\n  Action Items (${items.length})`);
          console.log('  ' + '─'.repeat(60));
          const now = new Date();
          for (let i = 0; i < items.length; i++) {
            const a = items[i];
            const status = a.status === 'done' ? '✓' : '○';
            const due = a.dueBy ? ` (due: ${formatDate(a.dueBy)})` : '';
            const linked = a.linkedStoryId ? ` → ${a.linkedStoryId}` : '';
            let overdue = '';
            if (a.status === 'open' && a.dueBy) {
              const dueDate = a.dueBy.toDate ? a.dueBy.toDate() : new Date(a.dueBy);
              if (dueDate < now) overdue = ' ⚠ OVERDUE';
            }
            console.log(`  ${i + 1}. ${status} ${a.owner}: ${a.text}${due}${overdue}${linked}`);
            if (a.id) {
              console.log(`     id: ${a.id}`);
            }
          }
          console.log('');
          return;
        }

        // Full meeting details
        const date = formatDate(meeting.date);
        const sprint = meeting.sprintNumber != null ? `  Sprint: ${meeting.sprintNumber}` : '';

        console.log('');
        console.log('  ' + '═'.repeat(60));
        console.log(`  ${meeting.type.toUpperCase()} MEETING — ${date}${sprint}`);
        console.log('  ' + '═'.repeat(60));
        console.log(`  ID:           ${meeting.id}`);
        console.log(`  Project:      ${meeting.projectId}`);
        if (meeting.participants?.length > 0) {
          console.log(`  Participants: ${meeting.participants.join(', ')}`);
        }

        // Summary
        console.log('');
        console.log('  Summary');
        console.log('  ' + '─'.repeat(60));
        console.log(`  ${meeting.summary}`);

        // Agenda
        const agenda = meeting.agenda || [];
        if (agenda.length > 0) {
          console.log('');
          console.log(`  Agenda (${agenda.length})`);
          console.log('  ' + '─'.repeat(60));
          for (const a of agenda) {
            const resolved = a.resolved ? ' ✓' : '';
            const presenter = a.presenter ? ` (${a.presenter})` : '';
            console.log(`  • ${a.topic}${presenter}${resolved}`);
            if (a.notes) {
              console.log(`    ${a.notes}`);
            }
          }
        }

        // Decisions
        const decisions = meeting.decisions || [];
        if (decisions.length > 0) {
          console.log('');
          console.log(`  Decisions (${decisions.length})`);
          console.log('  ' + '─'.repeat(60));
          for (const d of decisions) {
            console.log(`  [${d.category}] ${d.text}`);
            if (d.rationale) {
              console.log(`    Rationale: ${d.rationale}`);
            }
          }
        }

        // Action Items
        const actionItems = meeting.actionItems || [];
        if (actionItems.length > 0) {
          console.log('');
          console.log(`  Action Items (${actionItems.length})`);
          console.log('  ' + '─'.repeat(60));
          const now = new Date();
          for (let i = 0; i < actionItems.length; i++) {
            const a = actionItems[i];
            const status = a.status === 'done' ? '✓' : '○';
            const due = a.dueBy ? ` (due: ${formatDate(a.dueBy)})` : '';
            const linked = a.linkedStoryId ? ` → ${a.linkedStoryId}` : '';
            let overdue = '';
            if (a.status === 'open' && a.dueBy) {
              const dueDate = a.dueBy.toDate ? a.dueBy.toDate() : new Date(a.dueBy);
              if (dueDate < now) overdue = ' ⚠ OVERDUE';
            }
            console.log(`  ${i + 1}. ${status} ${a.owner}: ${a.text}${due}${overdue}${linked}`);
          }
        }

        // Linked Changes
        const linkedChanges = meeting.linkedChanges || [];
        if (linkedChanges.length > 0) {
          console.log('');
          console.log(`  Linked Changes (${linkedChanges.length})`);
          console.log('  ' + '─'.repeat(60));
          for (const lc of linkedChanges) {
            const desc = lc.description ? ` — ${lc.description}` : '';
            console.log(`  [${lc.type}] ${lc.refId}${desc}`);
          }
        }

        console.log('');
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}

// ─── Prep command types ─────────────────────────────────────────────────

interface PrepData {
  generatedAt: string;
  lookbackSince: string;
  isFirstRetro: boolean;
  boardMetrics: {
    completedCount: number;
    completedStories: Array<{ shortId: string; title: string }>;
    blockedCount: number;
    blockedStories: Array<{ shortId: string; title: string; reason: string }>;
    inProgressCount: number;
    inProgressStories: Array<{ shortId: string; title: string; agent: string }>;
    averageCycleTimeDays: number | null;
    priorityBreakdown: Record<string, number>;
  };
  pastDecisions: Array<{ meetingDate: string; meetingType: string; decisions: Array<{ text: string; category: string; rationale: string }> }>;
  openActionItems: Array<{ meetingDate: string; meetingType: string; owner: string; text: string; dueBy: string | null; linkedStoryId: string | null }>;
  agentActivity: Array<{ agent: string; stories: Array<{ shortId: string; title: string; status: string; sessions: number; totalTokens: number }> }>;
}

function formatPrepBriefing(data: PrepData): string {
  const lines: string[] = [];
  const hr = '─'.repeat(70);

  lines.push('');
  lines.push('  ' + '═'.repeat(70));
  lines.push('  PRE-MEETING BRIEFING');
  lines.push('  ' + '═'.repeat(70));
  lines.push(`  Generated: ${data.generatedAt}`);
  lines.push(`  Lookback:  since ${data.lookbackSince}`);

  if (data.isFirstRetro) {
    lines.push('');
    lines.push('  NOTE: No previous retro meetings found. Showing board metrics only.');
  }

  // ── Board Metrics ──
  lines.push('');
  lines.push('  BOARD METRICS');
  lines.push('  ' + hr);

  // Completed
  lines.push(`  Stories completed: ${data.boardMetrics.completedCount}`);
  if (data.boardMetrics.completedCount === 0) {
    lines.push('    (none)');
  } else {
    for (const s of data.boardMetrics.completedStories) {
      lines.push(`    ${s.shortId}  ${s.title}`);
    }
  }

  // Blocked
  lines.push('');
  lines.push(`  Stories blocked: ${data.boardMetrics.blockedCount}`);
  if (data.boardMetrics.blockedCount === 0) {
    lines.push('    (none)');
  } else {
    for (const s of data.boardMetrics.blockedStories) {
      const reason = s.reason ? ` — ${s.reason}` : '';
      lines.push(`    ${s.shortId}  ${s.title}${reason}`);
    }
  }

  // In-progress
  lines.push('');
  lines.push(`  Stories in-progress: ${data.boardMetrics.inProgressCount}`);
  if (data.boardMetrics.inProgressCount === 0) {
    lines.push('    (none)');
  } else {
    for (const s of data.boardMetrics.inProgressStories) {
      lines.push(`    ${s.shortId}  ${s.title}  (${s.agent})`);
    }
  }

  // Cycle time
  lines.push('');
  if (data.boardMetrics.averageCycleTimeDays != null) {
    lines.push(`  Average cycle time: ${data.boardMetrics.averageCycleTimeDays.toFixed(1)} days`);
  } else {
    lines.push('  Average cycle time: N/A (no completed stories in window)');
  }

  // Priority breakdown
  lines.push('');
  lines.push('  Priority breakdown (all active stories):');
  const priorities = Object.entries(data.boardMetrics.priorityBreakdown).sort(([a], [b]) => a.localeCompare(b));
  if (priorities.length === 0) {
    lines.push('    (no stories)');
  } else {
    for (const [priority, count] of priorities) {
      lines.push(`    ${priority}: ${count}`);
    }
  }

  // ── Past Decisions ──
  lines.push('');
  lines.push('  PAST DECISIONS');
  lines.push('  ' + hr);

  if (data.pastDecisions.length === 0) {
    lines.push('  (no past meetings with decisions found)');
  } else {
    for (const meeting of data.pastDecisions) {
      if (meeting.decisions.length === 0) continue;
      lines.push(`  [${meeting.meetingDate} ${meeting.meetingType}]`);
      for (const d of meeting.decisions) {
        lines.push(`    [${d.category}] ${d.text}`);
        if (d.rationale) {
          lines.push(`      Rationale: ${d.rationale}`);
        }
      }
      lines.push('');
    }
  }

  // ── Open Action Items ──
  lines.push('');
  lines.push('  UNRESOLVED ACTION ITEMS');
  lines.push('  ' + hr);

  if (data.openActionItems.length === 0) {
    lines.push('  (no open action items)');
  } else {
    for (const item of data.openActionItems) {
      const due = item.dueBy ? ` (due: ${item.dueBy})` : '';
      const linked = item.linkedStoryId ? ` → ${item.linkedStoryId}` : '';
      lines.push(`  [${item.meetingDate} ${item.meetingType}] ${item.owner}: ${item.text}${due}${linked}`);
    }
  }

  // ── Agent Activity ──
  lines.push('');
  lines.push('  AGENT ACTIVITY');
  lines.push('  ' + hr);

  if (data.agentActivity.length === 0) {
    lines.push('  (no agent activity in this window)');
  } else {
    for (const entry of data.agentActivity) {
      const totalSessions = entry.stories.reduce((sum, s) => sum + s.sessions, 0);
      const totalTokens = entry.stories.reduce((sum, s) => sum + s.totalTokens, 0);
      const tokensStr = totalTokens > 0 ? ` (${totalSessions} sessions, ${totalTokens.toLocaleString()} tokens)` : totalSessions > 0 ? ` (${totalSessions} sessions)` : ' (no session data)';
      lines.push(`  ${entry.agent}${tokensStr}`);
      for (const s of entry.stories) {
        lines.push(`    ${s.shortId}  ${s.title}  [${s.status}]`);
      }
      lines.push('');
    }
  }

  // ── Model Selection Review ──
  lines.push('');
  lines.push('  MODEL SELECTION REVIEW');
  lines.push('  ' + hr);
  lines.push('  Review the following during the retro (see CLAUDE.md > Model Selection');
  lines.push('  Guidelines > Metrics to Track for definitions):');
  lines.push('');

  // Token usage summary by agent (derived from agent activity data)
  lines.push('  1. Token usage by agent/model');
  if (data.agentActivity.length === 0) {
    lines.push('     (no agent activity — skip this section)');
  } else {
    for (const entry of data.agentActivity) {
      const totalTokens = entry.stories.reduce((sum, s) => sum + s.totalTokens, 0);
      const storyCount = entry.stories.length;
      if (totalTokens > 0) {
        const avgPerStory = Math.round(totalTokens / storyCount);
        lines.push(`     ${entry.agent}: ${totalTokens.toLocaleString()} tokens across ${storyCount} stories (avg ${avgPerStory.toLocaleString()}/story)`);
      } else {
        lines.push(`     ${entry.agent}: ${storyCount} stories (no token data)`);
      }
    }
  }

  lines.push('');
  lines.push('  2. Rework rates — were any stories sent back from in-review?');
  lines.push('     Review completed stories above. Were any bounced back before');
  lines.push('     completion? If so, note which agent/model tier was involved.');
  lines.push('');
  lines.push('  3. Upgrade/downgrade recommendations');
  lines.push('     Based on the data above, should any agent be moved to a');
  lines.push('     different model tier? (opus/sonnet/haiku)');
  lines.push('');
  lines.push('  4. New metrics or observations since last retro');
  lines.push('     Any new patterns in cost, quality, or speed to capture?');

  lines.push('');
  return lines.join('\n');
}

function createMeetingPrepCommand(): Command {
  return new Command('prep')
    .description('Generate pre-meeting briefing data')
    .option('-p, --project <projectId>', 'Project ID (auto-detected from .claude/jeffboard.json)')
    .option('--since <date>', 'Lookback start date (ISO 8601). Default: date of last retro, or 14 days ago')
    .option('--past-retros <n>', 'Number of past retros for decisions section (default: 3)', '3')
    .option('--format <format>', 'Output format: text (default) or json', 'text')
    .action(async (options) => {
      try {
        const projectId = getProjectId(options.project);
        const pastRetroCount = parseInt(options.pastRetros, 10) || 3;

        // Determine lookback date
        let sinceDate: Date;
        let isFirstRetro = false;

        if (options.since) {
          sinceDate = new Date(options.since);
          if (isNaN(sinceDate.getTime())) {
            throw new Error('Invalid --since date. Use ISO 8601 format (e.g., 2026-02-01)');
          }
        } else {
          // Find the last retro meeting to use as lookback anchor
          // Uses listMeetingsSimple to avoid composite index requirement
          const retros = await listMeetingsSimple(projectId, { type: 'retro', limit: 1 });
          if (retros.length > 0) {
            const lastRetroDate = retros[0].date;
            sinceDate = lastRetroDate.toDate ? lastRetroDate.toDate() : new Date(lastRetroDate);
          } else {
            // No previous retros — default to 14 days ago
            sinceDate = new Date();
            sinceDate.setDate(sinceDate.getDate() - 14);
            isFirstRetro = true;
          }
        }

        // Fetch all data in parallel
        // Uses *Simple variants to avoid composite index requirements
        const [metrics, openItems, retroMeetings, agentActivity] = await Promise.all([
          getBoardMetrics(projectId, sinceDate),
          getOpenActionItemsSimple(projectId),
          listMeetingsSimple(projectId, { type: 'retro', limit: pastRetroCount }),
          getAgentActivity(projectId, sinceDate)
        ]);

        const pastDecisions = retroMeetings.map((m: any) => ({
          meetingDate: formatDate(m.date),
          meetingType: m.type,
          decisions: (m.decisions || []).map((d: any) => ({
            text: d.text,
            category: d.category,
            rationale: d.rationale || ''
          }))
        }));

        // Build open action items
        const openActionItemsFormatted = openItems.map((item: any) => ({
          meetingDate: formatDate(item.meetingDate),
          meetingType: item.meetingType,
          owner: item.actionItem.owner,
          text: item.actionItem.text,
          dueBy: item.actionItem.dueBy ? formatDate(item.actionItem.dueBy) : null,
          linkedStoryId: item.actionItem.linkedStoryId || null
        }));

        // Build prep data structure
        const prepData: PrepData = {
          generatedAt: new Date().toISOString(),
          lookbackSince: sinceDate.toISOString().split('T')[0],
          isFirstRetro,
          boardMetrics: {
            completedCount: metrics.completedStories.length,
            completedStories: metrics.completedStories.map(s => ({
              shortId: s.shortId,
              title: s.title
            })),
            blockedCount: metrics.blockedStories.length,
            blockedStories: metrics.blockedStories.map(s => ({
              shortId: s.shortId,
              title: s.title,
              reason: s.blockedReason || ''
            })),
            inProgressCount: metrics.inProgressStories.length,
            inProgressStories: metrics.inProgressStories.map(s => ({
              shortId: s.shortId,
              title: s.title,
              agent: s.assignedAgent || 'unassigned'
            })),
            averageCycleTimeDays: metrics.averageCycleTimeDays,
            priorityBreakdown: metrics.priorityBreakdown
          },
          pastDecisions,
          openActionItems: openActionItemsFormatted,
          agentActivity: agentActivity.map(entry => ({
            agent: entry.agent,
            stories: entry.stories
          }))
        };

        // Output
        if (options.format === 'json') {
          console.log(JSON.stringify(prepData, null, 2));
        } else {
          console.log(formatPrepBriefing(prepData));
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}

// ─── Banner command ─────────────────────────────────────────────────

type BannerMeetingType = 'retro' | 'planning' | 'ad-hoc';
const VALID_BANNER_TYPES: BannerMeetingType[] = ['retro', 'planning', 'ad-hoc'];

// ANSI color helpers
const ansi = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  // Meeting type colors
  retro: '\x1b[36m',       // cyan
  planning: '\x1b[33m',    // yellow
  'ad-hoc': '\x1b[35m',    // magenta
  green: '\x1b[32m',
  white: '\x1b[37m',
};

interface BannerOptions {
  type: BannerMeetingType;
  projectName?: string;
  sprint?: number;
  agenda?: string[];
  width: number;
  noColor: boolean;
  close?: boolean;
  decisions?: number;
  actions?: number;
}

/**
 * Get terminal width, clamped to 80-120
 */
function getTerminalWidth(): number {
  const cols = process.stdout.columns || 80;
  return Math.max(80, Math.min(120, cols));
}

/**
 * Apply ANSI color code, or return plain text if --no-color
 */
function color(text: string, code: string, noColor: boolean): string {
  if (noColor) return text;
  return `${code}${text}${ansi.reset}`;
}

/**
 * Center text within a given width
 */
function centerText(text: string, width: number): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(pad) + text;
}

/**
 * Truncate text to fit within max length
 */
function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + '...';
}

/**
 * Get the display label for a meeting type
 */
function typeLabel(type: BannerMeetingType): string {
  switch (type) {
    case 'retro': return 'RETROSPECTIVE';
    case 'planning': return 'SPRINT PLANNING';
    case 'ad-hoc': return 'AD-HOC MEETING';
  }
}

/**
 * Get a decorative border character pattern per meeting type
 */
function borderPattern(type: BannerMeetingType): { top: string; side: string; bottom: string } {
  switch (type) {
    case 'retro':
      return { top: '=', side: '|', bottom: '=' };
    case 'planning':
      return { top: '#', side: '#', bottom: '#' };
    case 'ad-hoc':
      return { top: '-', side: '|', bottom: '-' };
  }
}

/**
 * Build an opening banner
 */
function buildOpeningBanner(opts: BannerOptions): string {
  const { type, width, noColor } = opts;
  const bp = borderPattern(type);
  const typeColor = ansi[type];
  const lines: string[] = [];
  const innerWidth = width - 4; // 2 chars border + space each side

  const topBorder = bp.top.repeat(width);
  const bottomBorder = bp.bottom.repeat(width);
  const emptyLine = `${bp.side}${' '.repeat(width - 2)}${bp.side}`;

  // Build content lines
  const formatLine = (text: string): string => {
    const truncated = truncateText(text, innerWidth);
    const padRight = innerWidth - truncated.length;
    return `${bp.side} ${truncated}${' '.repeat(padRight)} ${bp.side}`;
  };

  const formatCentered = (text: string): string => {
    const truncated = truncateText(text, innerWidth);
    const totalPad = innerWidth - truncated.length;
    const padLeft = Math.floor(totalPad / 2);
    const padRight = totalPad - padLeft;
    return `${bp.side} ${' '.repeat(padLeft)}${truncated}${' '.repeat(padRight)} ${bp.side}`;
  };

  // Top border
  lines.push(color(topBorder, typeColor, noColor));
  lines.push(color(emptyLine, typeColor, noColor));

  // Meeting type label (centered, bold)
  const label = typeLabel(type);
  const labelLine = formatCentered(label);
  lines.push(color(labelLine, `${ansi.bold}${typeColor}`, noColor));

  lines.push(color(emptyLine, typeColor, noColor));

  // Project name
  if (opts.projectName) {
    const projText = truncateText(opts.projectName, innerWidth);
    lines.push(color(formatCentered(`Project: ${projText}`), typeColor, noColor));
  }

  // Date
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
  lines.push(color(formatCentered(`${dateStr}  ${timeStr}`), typeColor, noColor));

  // Sprint number
  if (opts.sprint != null) {
    lines.push(color(formatCentered(`Sprint ${opts.sprint}`), typeColor, noColor));
  }

  lines.push(color(emptyLine, typeColor, noColor));

  // Separator
  const sepLine = `${bp.side} ${bp.top.repeat(innerWidth)} ${bp.side}`;
  lines.push(color(sepLine, typeColor, noColor));
  lines.push(color(emptyLine, typeColor, noColor));

  // Agenda section
  lines.push(color(formatLine('AGENDA'), `${ansi.bold}${typeColor}`, noColor));
  lines.push(color(formatLine('-'.repeat(Math.min(6, innerWidth))), ansi.dim, noColor));

  const agenda = opts.agenda && opts.agenda.length > 0 ? opts.agenda : ['Open discussion'];
  for (let i = 0; i < agenda.length; i++) {
    const item = `  ${i + 1}. ${agenda[i]}`;
    lines.push(color(formatLine(item), ansi.white, noColor));
  }

  lines.push(color(emptyLine, typeColor, noColor));

  // Bottom border
  lines.push(color(bottomBorder, typeColor, noColor));

  return lines.join('\n');
}

/**
 * Build a closing banner
 */
function buildClosingBanner(opts: BannerOptions): string {
  const { type, width, noColor } = opts;
  const bp = borderPattern(type);
  const typeColor = ansi[type];
  const lines: string[] = [];
  const innerWidth = width - 4;

  const topBorder = bp.bottom.repeat(width);
  const bottomBorder = bp.bottom.repeat(width);
  const emptyLine = `${bp.side}${' '.repeat(width - 2)}${bp.side}`;

  const formatLine = (text: string): string => {
    const truncated = truncateText(text, innerWidth);
    const padRight = innerWidth - truncated.length;
    return `${bp.side} ${truncated}${' '.repeat(padRight)} ${bp.side}`;
  };

  const formatCentered = (text: string): string => {
    const truncated = truncateText(text, innerWidth);
    const totalPad = innerWidth - truncated.length;
    const padLeft = Math.floor(totalPad / 2);
    const padRight = totalPad - padLeft;
    return `${bp.side} ${' '.repeat(padLeft)}${truncated}${' '.repeat(padRight)} ${bp.side}`;
  };

  // Top border
  lines.push(color(topBorder, typeColor, noColor));
  lines.push(color(emptyLine, typeColor, noColor));

  // Closing label
  const label = `${typeLabel(type)} - CLOSED`;
  lines.push(color(formatCentered(label), `${ansi.bold}${typeColor}`, noColor));

  lines.push(color(emptyLine, typeColor, noColor));

  // Project name
  if (opts.projectName) {
    const projText = truncateText(opts.projectName, innerWidth);
    lines.push(color(formatCentered(`Project: ${projText}`), typeColor, noColor));
  }

  // Date/time
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
  lines.push(color(formatCentered(`Closed: ${dateStr}  ${timeStr}`), typeColor, noColor));

  lines.push(color(emptyLine, typeColor, noColor));

  // Outcomes section
  const sepLine = `${bp.side} ${bp.bottom.repeat(innerWidth)} ${bp.side}`;
  lines.push(color(sepLine, typeColor, noColor));
  lines.push(color(emptyLine, typeColor, noColor));

  lines.push(color(formatLine('OUTCOMES'), `${ansi.bold}${typeColor}`, noColor));
  lines.push(color(formatLine('-'.repeat(Math.min(8, innerWidth))), ansi.dim, noColor));

  const decisionCount = opts.decisions ?? 0;
  const actionCount = opts.actions ?? 0;

  lines.push(color(formatLine(`  Decisions recorded:  ${decisionCount}`), ansi.white, noColor));
  lines.push(color(formatLine(`  Action items created: ${actionCount}`), ansi.white, noColor));

  if (decisionCount === 0 && actionCount === 0) {
    lines.push(color(formatLine('  (no outcomes recorded)'), ansi.dim, noColor));
  }

  lines.push(color(emptyLine, typeColor, noColor));

  // Bottom border
  lines.push(color(bottomBorder, typeColor, noColor));

  return lines.join('\n');
}

function createMeetingBannerCommand(): Command {
  return new Command('banner')
    .description('Display ASCII meeting banner (opening or closing)')
    .option('--type <type>', 'Meeting type: retro, planning, or ad-hoc')
    .option('--project-name <name>', 'Project name to display in banner')
    .option('--sprint <number>', 'Sprint number')
    .option('--agenda <items>', 'Comma-separated agenda items')
    .option('--close', 'Display closing banner instead of opening')
    .option('--decisions <n>', 'Number of decisions recorded (closing banner)')
    .option('--actions <n>', 'Number of action items created (closing banner)')
    .option('--width <n>', 'Banner width (80-120, default: auto-detect)')
    .option('--no-color', 'Disable ANSI color output')
    .action(async (options) => {
      try {
        // Determine type
        const meetingType = options.type || 'ad-hoc';
        if (!VALID_BANNER_TYPES.includes(meetingType as BannerMeetingType)) {
          throw new Error(`Invalid meeting type: ${meetingType}. Valid types: ${VALID_BANNER_TYPES.join(', ')}`);
        }

        // Determine width
        let width: number;
        if (options.width) {
          width = parseInt(options.width, 10);
          if (isNaN(width)) {
            throw new Error('--width must be a number');
          }
          width = Math.max(80, Math.min(120, width));
        } else {
          width = getTerminalWidth();
        }

        // Parse agenda
        let agenda: string[] | undefined;
        if (options.agenda) {
          agenda = options.agenda.split(',').map((s: string) => s.trim()).filter(Boolean);
        }

        // noColor: commander auto-strips the 'no-' prefix for boolean options
        const noColor = options.color === false;

        const bannerOpts: BannerOptions = {
          type: meetingType as BannerMeetingType,
          projectName: options.projectName,
          sprint: options.sprint != null ? parseInt(options.sprint, 10) : undefined,
          agenda,
          width,
          noColor,
          close: !!options.close,
          decisions: options.decisions != null ? parseInt(options.decisions, 10) : undefined,
          actions: options.actions != null ? parseInt(options.actions, 10) : undefined,
        };

        let output: string;
        if (options.close) {
          output = buildClosingBanner(bannerOpts);
        } else {
          if (!options.type) {
            throw new Error('--type is required for opening banners. Use: retro, planning, or ad-hoc');
          }
          output = buildOpeningBanner(bannerOpts);
        }

        console.log(output);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}

function createMeetingActionCommand(): Command {
  return new Command('action')
    .description('Update an action item status or link it to a story')
    .requiredOption('--meeting <meetingId>', 'Meeting ID')
    .requiredOption('--item <indexOrId>', 'Action item index (1-based) or UUID')
    .option('--status <status>', 'New status: open or done')
    .option('--link-story <shortId>', 'Link to a story by short ID (e.g., JB-5)')
    .option('--unlink', 'Remove linked story')
    .action(async (options) => {
      try {
        // Validate at least one update is provided
        if (!options.status && !options.linkStory && !options.unlink) {
          throw new Error('Provide at least one update: --status, --link-story, or --unlink');
        }

        // Validate status if provided
        if (options.status && options.status !== 'open' && options.status !== 'done') {
          throw new Error(`Invalid status: ${options.status}. Valid values: open, done`);
        }

        // Build updates
        const updates: { status?: 'open' | 'done'; linkedStoryId?: string | null } = {};

        if (options.status) {
          updates.status = options.status;
        }

        if (options.linkStory) {
          // Verify story exists (warn but allow if not found)
          const storyDoc = await findStoryByShortId(options.linkStory);
          if (!storyDoc) {
            console.warn(`WARNING: Story ${options.linkStory} not found. Linking anyway.`);
          }
          updates.linkedStoryId = options.linkStory;
        } else if (options.unlink) {
          updates.linkedStoryId = null;
        }

        const result = await updateActionItem(options.meeting, options.item, updates);

        // Check if it was a no-op (already done)
        if (result.alreadyDone) {
          console.log(`\n  Action item is already done — no changes made.`);
          console.log(`  ${result.actionItem.owner}: ${result.actionItem.text}`);
          console.log('');
          return;
        }

        // Print result
        console.log(`\n✓ Updated action item in meeting ${options.meeting}`);
        const status = result.actionItem.status === 'done' ? '✓' : '○';
        const due = result.actionItem.dueBy ? ` (due: ${formatDate(result.actionItem.dueBy)})` : '';
        const linked = result.actionItem.linkedStoryId ? ` → ${result.actionItem.linkedStoryId}` : '';
        console.log(`  ${status} ${result.actionItem.owner}: ${result.actionItem.text}${due}${linked}`);
        console.log('');
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}

function createMeetingActionsCommand(): Command {
  return new Command('actions')
    .description('List open action items across meetings')
    .option('-p, --project <projectId>', 'Project ID (auto-detected from .claude/jeffboard.json)')
    .option('--open', 'Show only open (unresolved) action items (default)')
    .option('--all', 'Show all action items including done')
    .option('--owner <name>', 'Filter by owner name')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const projectId = getProjectId(options.project);
        const showAll = !!options.all;
        const now = new Date();

        // Fetch all meetings for the project
        const meetings = await listMeetingsSimple(projectId, { limit: 100 });

        // Collect action items
        const items: Array<{
          meetingId: string;
          meetingDate: any;
          meetingType: string;
          actionItem: ActionItem;
        }> = [];

        for (const m of meetings) {
          const actionItems: ActionItem[] = m.actionItems || [];
          for (const item of actionItems) {
            if (!showAll && item.status === 'done') continue;
            if (options.owner && item.owner.toLowerCase() !== options.owner.toLowerCase()) continue;
            items.push({
              meetingId: m.id,
              meetingDate: m.date,
              meetingType: m.type,
              actionItem: item
            });
          }
        }

        if (options.json) {
          console.log(JSON.stringify(items, null, 2));
          return;
        }

        if (items.length === 0) {
          const qualifier = showAll ? '' : 'open ';
          const ownerFilter = options.owner ? ` for ${options.owner}` : '';
          console.log(`\nNo ${qualifier}action items found${ownerFilter}.`);
          return;
        }

        const qualifier = showAll ? 'All' : 'Open';
        console.log(`\n  ${qualifier} Action Items (${items.length})`);
        console.log('  ' + '─'.repeat(70));

        for (const entry of items) {
          const date = formatDate(entry.meetingDate);
          const due = entry.actionItem.dueBy ? formatDate(entry.actionItem.dueBy) : null;
          const linked = entry.actionItem.linkedStoryId ? ` → ${entry.actionItem.linkedStoryId}` : '';
          const statusIcon = entry.actionItem.status === 'done' ? '✓' : '○';

          // Check if overdue
          let overdue = '';
          if (entry.actionItem.status === 'open' && entry.actionItem.dueBy) {
            const dueDate = entry.actionItem.dueBy.toDate ? entry.actionItem.dueBy.toDate() : new Date(entry.actionItem.dueBy as any);
            if (dueDate < now) {
              overdue = ' ⚠ OVERDUE';
            }
          }

          const dueStr = due ? ` (due: ${due}${overdue})` : '';
          console.log(`  ${statusIcon} [${date} ${entry.meetingType}] ${entry.actionItem.owner}: ${entry.actionItem.text}${dueStr}${linked}`);

          // Show item ID for easier referencing
          if (entry.actionItem.id) {
            console.log(`    id: ${entry.actionItem.id}  meeting: ${entry.meetingId}`);
          }
        }
        console.log('');
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}

export function createMeetingCommand(): Command {
  const meeting = new Command('meeting')
    .description('Manage meeting records');

  meeting.addCommand(createMeetingCreateCommand());
  meeting.addCommand(createMeetingListCommand());
  meeting.addCommand(createMeetingGetCommand());
  meeting.addCommand(createMeetingPrepCommand());
  meeting.addCommand(createMeetingBannerCommand());
  meeting.addCommand(createMeetingActionCommand());
  meeting.addCommand(createMeetingActionsCommand());

  return meeting;
}

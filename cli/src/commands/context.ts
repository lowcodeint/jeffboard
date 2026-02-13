// Context command: Read and write project context

import { Command } from 'commander';
import { getProjectId } from '../lib/config.js';
import { readProjectContext, writeProjectContextEntry } from '../lib/firestore.js';
import { validateRequired } from '../lib/validators.js';

// Valid section names from the schema
const VALID_SECTIONS = [
  'tech-stack',
  'architecture-decisions',
  'file-organization',
  'data-model',
  'known-gotchas',
  'active-conventions',
  'recent-changes',
  'agent-notes'
] as const;

type ContextSection = (typeof VALID_SECTIONS)[number];

export function createContextCommand() {
  const context = new Command('context')
    .description('Read or write project context (shared knowledge across agents)');

  // context read command
  context
    .command('read')
    .description('Read the full project context or a specific section')
    .option('-p, --project <projectId>', 'Project ID (auto-detected from .claude/jeffboard.json if not provided)')
    .option('-s, --section <section>', `Section name (${VALID_SECTIONS.join(', ')})`)
    .action(async (options) => {
      try {
        const projectId = getProjectId(options.project);

        // Validate section if provided
        if (options.section && !VALID_SECTIONS.includes(options.section)) {
          throw new Error(`Invalid section name. Valid sections: ${VALID_SECTIONS.map(s => `${s} (${formatSectionName(s)})`).join(', ')}`);
        }

        const contextData = await readProjectContext(projectId, options.section);

        if (contextData.length === 0) {
          console.log('No context data found.');
          return;
        }

        // Format output with section headers
        for (const section of contextData) {
          console.log(`\n## ${formatSectionName(section.sectionName)}\n`);

          if (section.entries.length === 0) {
            console.log('(empty)\n');
          } else {
            for (const entry of section.entries) {
              const date = entry.timestamp?.toDate().toISOString().split('T')[0] || 'unknown';
              console.log(`- [${date}] (${entry.agent}): ${entry.text}`);
            }
            console.log();
          }
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // context write command
  context
    .command('write')
    .description('Append an entry to a project context section')
    .option('-p, --project <projectId>', 'Project ID (auto-detected from .claude/jeffboard.json if not provided)')
    .requiredOption('-s, --section <section>', `Section name (${VALID_SECTIONS.join(', ')})`)
    .requiredOption('-t, --text <text>', 'Text content to append')
    .requiredOption('-a, --agent <agent>', 'Agent name making the entry')
    .action(async (options) => {
      try {
        const projectId = getProjectId(options.project);

        validateRequired(options.section, 'Section');
        validateRequired(options.text, 'Text');
        validateRequired(options.agent, 'Agent');

        // Validate section name
        if (!VALID_SECTIONS.includes(options.section)) {
          throw new Error(`Invalid section name. Valid sections: ${VALID_SECTIONS.map(s => `${s} (${formatSectionName(s)})`).join(', ')}`);
        }

        await writeProjectContextEntry(
          projectId,
          options.section as ContextSection,
          options.text,
          options.agent
        );

        console.log(`✓ Added entry to ${formatSectionName(options.section)} section`);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // context inject command
  context
    .command('inject')
    .description('Format project context for injection into agent startup prompt')
    .option('-p, --project <projectId>', 'Project ID (auto-detected from .claude/jeffboard.json if not provided)')
    .option('-a, --agent <agent>', 'Agent name (filters agent-notes to only this agent)')
    .option('-b, --budget <tokens>', 'Token budget for output (default: 2000, ~4 chars per token)', '2000')
    .action(async (options) => {
      try {
        const projectId = getProjectId(options.project);
        const tokenBudget = parseInt(options.budget, 10);

        if (isNaN(tokenBudget) || tokenBudget <= 0) {
          throw new Error('Token budget must be a positive number');
        }

        // Character budget (~4 chars per token)
        const charBudget = tokenBudget * 4;

        // Sections to inject (relevant for all agents)
        const sectionsToInject: ContextSection[] = [
          'architecture-decisions',
          'known-gotchas',
          'active-conventions',
          'data-model'
        ];

        // If agent specified, also include their notes from agent-notes
        const agentName = options.agent;

        const contextData = await readProjectContext(projectId);

        // Filter to relevant sections
        const relevantSections = contextData.filter(section =>
          sectionsToInject.includes(section.sectionName as ContextSection)
        );

        // Handle agent-notes separately if agent specified
        if (agentName) {
          const agentNotesSection = contextData.find(s => s.sectionName === 'agent-notes');
          if (agentNotesSection) {
            // Filter agent-notes entries to only the specified agent
            const agentEntries = agentNotesSection.entries.filter(e => e.agent === agentName);
            if (agentEntries.length > 0) {
              relevantSections.push({
                sectionName: 'agent-notes',
                entries: agentEntries
              });
            }
          }
        }

        if (relevantSections.length === 0) {
          console.log('# Project Context\n\nNo context available.\n');
          console.error('[inject] No sections found');
          return;
        }

        // Build output with budget tracking
        let output = '# Project Context\n\n';
        let totalChars = output.length;
        const sectionOutputs: { section: string; chars: number; truncated: boolean }[] = [];

        for (const section of relevantSections) {
          const sectionHeader = `## ${formatSectionName(section.sectionName)}\n\n`;
          let sectionContent = '';

          if (section.entries.length === 0) {
            sectionContent = '(empty)\n\n';
          } else {
            for (const entry of section.entries) {
              const date = entry.timestamp?.toDate().toISOString().split('T')[0] || 'unknown';
              const line = `- [${date}] (${entry.agent}): ${entry.text}\n`;
              sectionContent += line;
            }
            sectionContent += '\n';
          }

          const sectionTotal = sectionHeader + sectionContent;
          const sectionChars = sectionTotal.length;

          // Check if adding this section would exceed budget
          if (totalChars + sectionChars > charBudget) {
            // Try to fit partial section
            const remaining = charBudget - totalChars;
            if (remaining > sectionHeader.length + 50) { // Only include if we have room for header + at least one entry
              output += sectionHeader;
              const contentBudget = remaining - sectionHeader.length - 15; // -15 for "[truncated]\n\n"
              output += sectionContent.substring(0, contentBudget) + '\n[truncated]\n\n';
              const actualChars = sectionHeader.length + contentBudget + 15;
              totalChars += actualChars;
              sectionOutputs.push({ section: section.sectionName, chars: actualChars, truncated: true });
            }
            break; // Budget exhausted
          }

          output += sectionTotal;
          totalChars += sectionChars;
          sectionOutputs.push({ section: section.sectionName, chars: sectionChars, truncated: false });
        }

        // Output the formatted context
        console.log(output.trimEnd());

        // Log summary to stderr
        console.error(`[inject] Included ${sectionOutputs.length} sections, ${totalChars} chars (~${Math.ceil(totalChars / 4)} tokens):`);
        for (const s of sectionOutputs) {
          const truncatedFlag = s.truncated ? ' [TRUNCATED]' : '';
          console.error(`  - ${s.section}: ${s.chars} chars${truncatedFlag}`);
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // context capture command
  context
    .command('capture')
    .description('Auto-capture key decisions from agent session to appropriate context sections')
    .option('-p, --project <projectId>', 'Project ID (auto-detected from .claude/jeffboard.json if not provided)')
    .requiredOption('-s, --story <shortId>', 'Story short ID (e.g., JB-14)')
    .requiredOption('-a, --agent <agent>', 'Agent name making the entry')
    .requiredOption('--summary <text>', 'Summary of key decisions, gotchas, or changes')
    .action(async (options) => {
      try {
        const projectId = getProjectId(options.project);

        validateRequired(options.story, 'Story short ID');
        validateRequired(options.agent, 'Agent');
        validateRequired(options.summary, 'Summary');

        // Read existing context to check for duplicates
        const contextData = await readProjectContext(projectId);

        // Categorize summary into sections based on keywords
        const sections = categorizeSummary(options.summary);

        // Check for duplicates and write to each section
        let entriesWritten = 0;
        for (const section of sections) {
          // Check for duplicate in this section
          const sectionData = contextData.find(s => s.sectionName === section);
          const isDuplicate = sectionData?.entries.some(entry =>
            isSimilar(entry.text, options.summary)
          );

          if (isDuplicate) {
            console.error(`[capture] Skipping duplicate entry in ${section}`);
            continue;
          }

          // Format entry with story attribution
          const entryText = `[${options.story}] ${options.summary}`;

          await writeProjectContextEntry(
            projectId,
            section as ContextSection,
            entryText,
            options.agent
          );

          console.error(`[capture] Added entry to ${formatSectionName(section)}`);
          entriesWritten++;
        }

        if (entriesWritten === 0) {
          console.log(`✓ No new entries added (all duplicates or no categorization match)`);
        } else {
          console.log(`✓ Captured ${entriesWritten} context ${entriesWritten === 1 ? 'entry' : 'entries'} for ${options.story}`);
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return context;
}

/**
 * Categorize summary text into one or more context sections based on keywords
 */
function categorizeSummary(summary: string): string[] {
  const lowerText = summary.toLowerCase();
  const sections: string[] = [];

  // Check for architecture decisions
  if (
    lowerText.includes('decided') ||
    lowerText.includes('chose') ||
    lowerText.includes('architecture') ||
    lowerText.includes('design pattern') ||
    lowerText.includes('approach')
  ) {
    sections.push('architecture-decisions');
  }

  // Check for gotchas
  if (
    lowerText.includes('gotcha') ||
    lowerText.includes('bug') ||
    lowerText.includes('watch out') ||
    lowerText.includes('careful') ||
    lowerText.includes('pitfall') ||
    lowerText.includes('beware') ||
    lowerText.includes('caveat') ||
    lowerText.includes('warning')
  ) {
    sections.push('known-gotchas');
  }

  // Check for recent changes
  if (
    lowerText.includes('changed') ||
    lowerText.includes('added') ||
    lowerText.includes('removed') ||
    lowerText.includes('updated') ||
    lowerText.includes('refactored') ||
    lowerText.includes('migrated')
  ) {
    sections.push('recent-changes');
  }

  // Default fallback: agent-notes
  if (sections.length === 0) {
    sections.push('agent-notes');
  }

  return sections;
}

/**
 * Check if two text strings are similar (simple duplicate detection)
 */
function isSimilar(text1: string, text2: string): boolean {
  // Normalize text: lowercase and remove punctuation/whitespace
  const normalize = (text: string) =>
    text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

  const normalized1 = normalize(text1);
  const normalized2 = normalize(text2);

  // Exact match after normalization
  if (normalized1 === normalized2) {
    return true;
  }

  // Check if one contains the other (for substring duplicates)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }

  return false;
}

/**
 * Convert section name from kebab-case to Title Case for display
 */
function formatSectionName(sectionName: string): string {
  return sectionName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

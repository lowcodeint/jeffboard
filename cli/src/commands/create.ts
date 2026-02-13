// Create command: Create a new story

import { Command } from 'commander';
import { createStory } from '../lib/firestore.js';
import { validateRequired, validatePriority, validateComplexity } from '../lib/validators.js';
import { getProjectId } from '../lib/config.js';

// Valid tag taxonomy (from docs/agent-routing-taxonomy.md)
const VALID_TAGS = [
  'frontend',
  'backend',
  'api',
  'database',
  'security',
  'ui-design',
  'infrastructure',
  'testing',
  'documentation',
  'devops'
] as const;

/**
 * Validate and warn about unknown tags
 * @param tags Array of tag strings
 * @returns Array of tags (unchanged - warnings only)
 */
function validateTags(tags: string[]): string[] {
  const unknownTags = tags.filter(tag => !VALID_TAGS.includes(tag as any));

  if (unknownTags.length > 0) {
    console.warn(`\nWARNING: Unknown tags: ${unknownTags.join(', ')}`);
    console.warn(`Valid tags: ${VALID_TAGS.join(', ')}\n`);
  }

  return tags;
}

export function createCreateCommand() {
  return new Command('create')
    .description('Create a new story')
    .option('-p, --project <projectId>', 'Project ID (auto-detected from .claude/jeffboard.json if not provided)')
    .requiredOption('-t, --title <title>', 'Story title')
    .option('-d, --description <description>', 'Story description')
    .option('-u, --user-story <userStory>', 'User story (As a... I want... So that...)')
    .option('-e, --epic <epicName>', 'Epic name')
    .requiredOption('--priority <priority>', 'Priority (P0|P1|P2|P3)')
    .option('-c, --complexity <complexity>', 'Complexity (S|M|L|XL)', 'M')
    .option('-a, --agent <agent>', 'Assigned agent')
    .option('--tags <tags>', 'Comma-separated tags (e.g., frontend,api)')
    .action(async (options) => {
      try {
        // Get project ID from option or config file
        const projectId = getProjectId(options.project);

        validateRequired(options.title, 'Title');
        validateRequired(options.priority, 'Priority');
        validatePriority(options.priority);

        if (options.complexity) {
          validateComplexity(options.complexity);
        }

        // Parse and validate tags
        let tags: string[] | undefined = undefined;
        if (options.tags) {
          const parsedTags = options.tags
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean);
          if (parsedTags.length > 0) {
            validateTags(parsedTags);
            tags = parsedTags;
          }
        }

        const storyData: any = {
          projectId,
          title: options.title,
          description: options.description,
          userStory: options.userStory,
          epicName: options.epic,
          priority: options.priority,
          complexity: options.complexity,
          assignedAgent: options.agent
        };

        if (tags) {
          storyData.tags = tags;
        }

        const result = await createStory(storyData);

        console.log(`✓ Created story ${result.shortId} (${result.id})`);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}

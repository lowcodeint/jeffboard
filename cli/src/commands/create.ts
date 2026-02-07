// Create command: Create a new story

import { Command } from 'commander';
import { createStory } from '../lib/firestore.js';
import { validateRequired, validatePriority, validateComplexity } from '../lib/validators.js';

export function createCreateCommand() {
  return new Command('create')
    .description('Create a new story')
    .requiredOption('-p, --project <projectId>', 'Project ID')
    .requiredOption('-t, --title <title>', 'Story title')
    .option('-d, --description <description>', 'Story description')
    .option('-u, --user-story <userStory>', 'User story (As a... I want... So that...)')
    .option('-e, --epic <epicName>', 'Epic name')
    .requiredOption('--priority <priority>', 'Priority (P0|P1|P2|P3)')
    .option('-c, --complexity <complexity>', 'Complexity (S|M|L|XL)', 'M')
    .option('-a, --agent <agent>', 'Assigned agent')
    .action(async (options) => {
      try {
        validateRequired(options.project, 'Project ID');
        validateRequired(options.title, 'Title');
        validateRequired(options.priority, 'Priority');
        validatePriority(options.priority);

        if (options.complexity) {
          validateComplexity(options.complexity);
        }

        const result = await createStory({
          projectId: options.project,
          title: options.title,
          description: options.description,
          userStory: options.userStory,
          epicName: options.epic,
          priority: options.priority,
          complexity: options.complexity,
          assignedAgent: options.agent
        });

        console.log(`✓ Created story ${result.shortId} (${result.id})`);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}

// Config command: Update project configuration settings

import { Command } from 'commander';
import { getDb } from '../lib/firebase.js';
import { COLLECTIONS } from '../lib/firestore.js';
import { getProjectId } from '../lib/config.js';

export function createConfigCommand() {
  return new Command('config')
    .description('Update project configuration settings')
    .option('-p, --project <projectId>', 'Project ID (auto-detected from .claude/jeffboard.json)')
    .option('-w, --webhook-url <url>', 'Set webhook URL for status change notifications')
    .option('--clear-webhook-url', 'Clear the webhook URL')
    .option('-b, --burst-mode <value>', 'Enable or disable burst mode (on|off)')
    .option('--max-parallel <n>', 'Set maximum parallel stories (default: 3)', parseInt)
    .action(async (options) => {
      try {
        // Validate that at least one update option is provided
        if (!options.webhookUrl && !options.clearWebhookUrl && !options.burstMode && !options.maxParallel) {
          console.error('Error: No configuration update specified.');
          console.error('Use --webhook-url <url> to set webhook URL, --clear-webhook-url to remove it, --burst-mode on|off to toggle burst mode, or --max-parallel <n> to set max parallel stories.');
          process.exit(1);
        }

        // Validate burst mode value if provided
        if (options.burstMode && !['on', 'off'].includes(options.burstMode)) {
          console.error('Error: Invalid burst mode value. Use "on" or "off".');
          process.exit(1);
        }

        // Validate max parallel value if provided
        if (options.maxParallel !== undefined && (isNaN(options.maxParallel) || options.maxParallel < 1)) {
          console.error('Error: Invalid max parallel value. Must be a positive integer.');
          process.exit(1);
        }

        // Get project ID
        const projectId = getProjectId(options.project);

        // Get project document
        const db = getDb();
        const projectRef = db.collection(COLLECTIONS.PROJECTS).doc(projectId);
        const projectDoc = await projectRef.get();

        if (!projectDoc.exists) {
          throw new Error(`Project not found: ${projectId}`);
        }

        const projectData = projectDoc.data();

        // Build update object
        const updateData: Record<string, unknown> = {
          updatedAt: new Date()
        };

        if (options.clearWebhookUrl) {
          updateData.webhookUrl = null;
        } else if (options.webhookUrl) {
          updateData.webhookUrl = options.webhookUrl;
        }

        if (options.burstMode) {
          updateData.burstMode = options.burstMode === 'on';
        }

        if (options.maxParallel !== undefined) {
          updateData.maxParallelStories = options.maxParallel;
        }

        // Update project
        await projectRef.update(updateData);

        console.log(`✓ Project configuration updated: ${projectData?.name || projectId}`);
        if (options.clearWebhookUrl) {
          console.log('  Webhook URL: (cleared)');
        } else if (options.webhookUrl) {
          console.log(`  Webhook URL: ${options.webhookUrl}`);
        }
        if (options.burstMode) {
          console.log(`  Burst Mode: ${options.burstMode === 'on' ? 'Enabled' : 'Disabled'}`);
        }
        if (options.maxParallel !== undefined) {
          console.log(`  Max Parallel Stories: ${options.maxParallel}`);
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}

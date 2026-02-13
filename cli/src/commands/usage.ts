// Usage command: Report token usage for a story

import { Command } from 'commander';
import { FieldValue } from 'firebase-admin/firestore';
import { findStoryByShortId } from '../lib/firestore.js';
import { validateRequired } from '../lib/validators.js';

/**
 * Validate that a value is a positive number
 * @param value Value to validate
 * @param fieldName Field name for error message
 * @throws Error if not a positive number
 */
function validatePositiveNumber(value: string | undefined, fieldName: string): number {
  if (!value) {
    throw new Error(`${fieldName} is required`);
  }

  const num = parseFloat(value);
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a number`);
  }
  if (num < 0) {
    throw new Error(`${fieldName} must be a positive number`);
  }

  return num;
}

export function createUsageCommand() {
  return new Command('usage')
    .description('Report token usage for a story')
    .requiredOption('-s, --story <storyId>', 'Story ID or short ID (e.g., JB-10)')
    .requiredOption('-i, --input-tokens <number>', 'Number of input tokens used')
    .requiredOption('-o, --output-tokens <number>', 'Number of output tokens used')
    .requiredOption('-c, --cost <usd>', 'Estimated cost in USD')
    .action(async (options) => {
      try {
        validateRequired(options.story, 'Story ID');

        // Validate inputs are positive numbers
        const inputTokens = validatePositiveNumber(options.inputTokens, 'Input tokens');
        const outputTokens = validatePositiveNumber(options.outputTokens, 'Output tokens');
        const cost = validatePositiveNumber(options.cost, 'Cost');

        // Find the story
        const storyDoc = await findStoryByShortId(options.story);
        if (!storyDoc) {
          throw new Error(`Story not found: ${options.story}`);
        }

        const storyRef = storyDoc.ref;
        const currentData = storyDoc.data();

        // Calculate total tokens for this session
        const totalTokens = inputTokens + outputTokens;

        // Use FieldValue.increment() to atomically accumulate values
        await storyRef.update({
          'tokenUsage.inputTokens': FieldValue.increment(inputTokens),
          'tokenUsage.outputTokens': FieldValue.increment(outputTokens),
          'tokenUsage.totalTokens': FieldValue.increment(totalTokens),
          'tokenUsage.estimatedCostUsd': FieldValue.increment(cost),
          'tokenUsage.sessions': FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp()
        });

        // Calculate running totals for display
        const previousUsage = currentData?.tokenUsage || {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          estimatedCostUsd: 0,
          sessions: 0
        };

        const newInputTotal = previousUsage.inputTokens + inputTokens;
        const newOutputTotal = previousUsage.outputTokens + outputTokens;
        const newTotalTokens = previousUsage.totalTokens + totalTokens;
        const newCostTotal = previousUsage.estimatedCostUsd + cost;
        const newSessionsTotal = previousUsage.sessions + 1;

        console.log(`✓ Updated token usage for ${options.story}`);
        console.log(`\nSession:`);
        console.log(`  Input tokens:  ${inputTokens.toLocaleString()}`);
        console.log(`  Output tokens: ${outputTokens.toLocaleString()}`);
        console.log(`  Total tokens:  ${totalTokens.toLocaleString()}`);
        console.log(`  Cost:          $${cost.toFixed(4)}`);
        console.log(`\nRunning totals:`);
        console.log(`  Input tokens:  ${newInputTotal.toLocaleString()}`);
        console.log(`  Output tokens: ${newOutputTotal.toLocaleString()}`);
        console.log(`  Total tokens:  ${newTotalTokens.toLocaleString()}`);
        console.log(`  Cost:          $${newCostTotal.toFixed(4)}`);
        console.log(`  Sessions:      ${newSessionsTotal}`);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}

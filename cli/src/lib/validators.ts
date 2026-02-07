// Input validation functions

import { VALID_STATUSES, type StoryStatus } from './firestore.js';

const VALID_PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
const VALID_COMPLEXITIES = ['S', 'M', 'L', 'XL'];

/**
 * Validate story status
 * @param status Status string to validate
 * @throws Error if invalid
 */
export function validateStatus(status: string): asserts status is StoryStatus {
  if (!VALID_STATUSES.includes(status as any)) {
    throw new Error(
      `Invalid status: ${status}. Valid statuses: ${VALID_STATUSES.join(', ')}`
    );
  }
}

/**
 * Validate priority
 * @param priority Priority string to validate
 * @throws Error if invalid
 */
export function validatePriority(priority: string): void {
  if (!VALID_PRIORITIES.includes(priority)) {
    throw new Error(
      `Invalid priority: ${priority}. Valid priorities: ${VALID_PRIORITIES.join(', ')}`
    );
  }
}

/**
 * Validate complexity
 * @param complexity Complexity string to validate
 * @throws Error if invalid
 */
export function validateComplexity(complexity: string): void {
  if (!VALID_COMPLEXITIES.includes(complexity)) {
    throw new Error(
      `Invalid complexity: ${complexity}. Valid complexities: ${VALID_COMPLEXITIES.join(', ')}`
    );
  }
}

/**
 * Validate required field is present
 * @param value Value to check
 * @param fieldName Field name for error message
 * @throws Error if missing
 */
export function validateRequired(value: any, fieldName: string): void {
  if (!value) {
    throw new Error(`${fieldName} is required`);
  }
}

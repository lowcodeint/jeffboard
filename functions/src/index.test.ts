/**
 * Unit tests for JeffBoard Cloud Functions
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { didStatusChange, extractWebhookPayload } from './index.js';
import { Story, StoryStatus } from './types.js';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Helper to create a mock story snapshot
 */
function createMockStory(overrides: Partial<Story> = {}): Story {
  const now = Timestamp.now();
  return {
    id: 'story-123',
    shortId: 'JB-1',
    projectId: 'project-456',
    epicName: 'Test Epic',
    status: 'backlog',
    assignedAgent: 'lead-engineer',
    updatedAt: now,
    ...overrides
  };
}

describe('didStatusChange', () => {
  it('should return true when status changes', () => {
    const before = createMockStory({ status: 'backlog' });
    const after = createMockStory({ status: 'in-progress' });

    const result = didStatusChange(before, after);
    assert.strictEqual(result, true);
  });

  it('should return false when status does not change', () => {
    const before = createMockStory({ status: 'in-progress' });
    const after = createMockStory({ status: 'in-progress' });

    const result = didStatusChange(before, after);
    assert.strictEqual(result, false);
  });

  it('should return false when before snapshot is undefined', () => {
    const after = createMockStory({ status: 'in-progress' });

    const result = didStatusChange(undefined, after);
    assert.strictEqual(result, false);
  });

  it('should return false when after snapshot is undefined', () => {
    const before = createMockStory({ status: 'backlog' });

    const result = didStatusChange(before, undefined);
    assert.strictEqual(result, false);
  });

  it('should return false when both snapshots are undefined', () => {
    const result = didStatusChange(undefined, undefined);
    assert.strictEqual(result, false);
  });
});

describe('extractWebhookPayload', () => {
  it('should extract correct payload for status change', () => {
    const before = createMockStory({ status: 'backlog' });
    const after = createMockStory({ status: 'in-progress' });

    const payload = extractWebhookPayload(before, after);

    assert.strictEqual(payload.eventType, 'status-changed');
    assert.strictEqual(payload.storyId, 'story-123');
    assert.strictEqual(payload.shortId, 'JB-1');
    assert.strictEqual(payload.projectId, 'project-456');
    assert.strictEqual(payload.oldStatus, 'backlog');
    assert.strictEqual(payload.newStatus, 'in-progress');
    assert.strictEqual(payload.assignedAgent, 'lead-engineer');
    assert.strictEqual(payload.epicName, 'Test Epic');
    assert.strictEqual(payload.status, 'pending');
    assert.strictEqual(payload.attempts, 0);
  });

  it('should handle null assignedAgent', () => {
    const before = createMockStory({ status: 'backlog', assignedAgent: null });
    const after = createMockStory({ status: 'in-progress', assignedAgent: null });

    const payload = extractWebhookPayload(before, after);

    assert.strictEqual(payload.assignedAgent, null);
  });

  it('should handle empty epicName', () => {
    const before = createMockStory({ status: 'backlog', epicName: '' });
    const after = createMockStory({ status: 'in-progress', epicName: '' });

    const payload = extractWebhookPayload(before, after);

    assert.strictEqual(payload.epicName, null);
  });

  it('should extract payload for blocked status', () => {
    const before = createMockStory({ status: 'in-progress' });
    const after = createMockStory({ status: 'blocked' });

    const payload = extractWebhookPayload(before, after);

    assert.strictEqual(payload.oldStatus, 'in-progress');
    assert.strictEqual(payload.newStatus, 'blocked');
  });

  it('should extract payload for done status', () => {
    const before = createMockStory({ status: 'in-review' });
    const after = createMockStory({ status: 'done' });

    const payload = extractWebhookPayload(before, after);

    assert.strictEqual(payload.oldStatus, 'in-review');
    assert.strictEqual(payload.newStatus, 'done');
  });

  it('should handle all status transitions', () => {
    const statuses: StoryStatus[] = [
      'backlog',
      'in-design',
      'in-progress',
      'in-review',
      'done',
      'blocked',
      'cancelled'
    ];

    for (let i = 0; i < statuses.length - 1; i++) {
      const before = createMockStory({ status: statuses[i] });
      const after = createMockStory({ status: statuses[i + 1] });

      const payload = extractWebhookPayload(before, after);

      assert.strictEqual(payload.oldStatus, statuses[i]);
      assert.strictEqual(payload.newStatus, statuses[i + 1]);
    }
  });
});

describe('Webhook Event Structure', () => {
  it('should create payload with correct structure', () => {
    const before = createMockStory({ status: 'backlog' });
    const after = createMockStory({ status: 'in-progress' });

    const payload = extractWebhookPayload(before, after);

    // Verify all required fields are present
    assert.ok(payload.eventType);
    assert.ok(payload.storyId);
    assert.ok(payload.shortId);
    assert.ok(payload.projectId);
    assert.ok(payload.oldStatus);
    assert.ok(payload.newStatus);
    assert.strictEqual(typeof payload.assignedAgent, 'string');
    assert.strictEqual(typeof payload.epicName, 'string');
    assert.ok(payload.status);
    assert.strictEqual(typeof payload.attempts, 'number');
  });

  it('should have pending status for new events', () => {
    const before = createMockStory({ status: 'backlog' });
    const after = createMockStory({ status: 'in-progress' });

    const payload = extractWebhookPayload(before, after);

    assert.strictEqual(payload.status, 'pending');
  });

  it('should initialize attempts to 0', () => {
    const before = createMockStory({ status: 'backlog' });
    const after = createMockStory({ status: 'in-progress' });

    const payload = extractWebhookPayload(before, after);

    assert.strictEqual(payload.attempts, 0);
  });
});

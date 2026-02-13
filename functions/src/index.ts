/**
 * Firebase Cloud Functions for JeffBoard
 *
 * This module contains Firestore triggers that fire when story documents are updated.
 * When a story's status field changes, a webhook event is written to the webhookEvents collection.
 */

import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { Story, WebhookEvent, StoryStatus } from './types.js';

// Initialize Firebase Admin SDK (only once)
initializeApp();

const db = getFirestore();

// Export webhook dispatcher
export { dispatchWebhookEvent } from './webhook-dispatcher.js';

/**
 * Firestore trigger: fires when a story document is updated
 *
 * Detects status field changes and writes a webhook event to the webhookEvents collection.
 * Ignores updates where the status field did not change.
 */
export const onStoryStatusChange = onDocumentUpdated(
  {
    document: 'stories/{storyId}',
    region: 'us-central1'
  },
  async (event) => {
    const beforeData = event.data?.before.data() as Story | undefined;
    const afterData = event.data?.after.data() as Story | undefined;

    // Safety check: ensure both snapshots exist
    if (!beforeData || !afterData) {
      console.log('Missing before or after data, skipping');
      return;
    }

    const oldStatus = beforeData.status;
    const newStatus = afterData.status;

    // Ignore updates where status did not change
    if (oldStatus === newStatus) {
      console.log(`Story ${afterData.shortId}: status unchanged (${newStatus}), skipping webhook event`);
      return;
    }

    console.log(`Story ${afterData.shortId}: status changed from ${oldStatus} to ${newStatus}`);

    // Extract webhook event payload
    const webhookEvent: Omit<WebhookEvent, 'id'> = {
      eventType: 'status-changed',
      storyId: afterData.id,
      shortId: afterData.shortId,
      projectId: afterData.projectId,
      oldStatus,
      newStatus,
      assignedAgent: afterData.assignedAgent || null,
      epicName: afterData.epicName || null,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp() as any,
      attempts: 0
    };

    // Write webhook event to webhookEvents collection
    try {
      const eventRef = db.collection('webhookEvents').doc();
      await eventRef.set({
        id: eventRef.id,
        ...webhookEvent
      });

      console.log(`Webhook event ${eventRef.id} created for story ${afterData.shortId}`);
    } catch (error) {
      console.error('Failed to write webhook event:', error);
      // Don't throw - we don't want to block the story update if webhook event creation fails
    }
  }
);

/**
 * Detect if a status field changed between two story snapshots
 * @param before Story snapshot before update
 * @param after Story snapshot after update
 * @returns True if status changed, false otherwise
 */
export function didStatusChange(
  before: { status: StoryStatus } | undefined,
  after: { status: StoryStatus } | undefined
): boolean {
  if (!before || !after) return false;
  return before.status !== after.status;
}

/**
 * Extract webhook event payload from story update
 * @param before Story snapshot before update
 * @param after Story snapshot after update
 * @returns Webhook event payload (without id field)
 */
export function extractWebhookPayload(
  before: Story,
  after: Story
): Omit<WebhookEvent, 'id' | 'createdAt' | 'attemptedAt'> {
  return {
    eventType: 'status-changed',
    storyId: after.id,
    shortId: after.shortId,
    projectId: after.projectId,
    oldStatus: before.status,
    newStatus: after.status,
    assignedAgent: after.assignedAgent || null,
    epicName: after.epicName || null,
    status: 'pending',
    attempts: 0
  };
}

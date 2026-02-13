/**
 * Webhook dispatcher for JeffBoard
 *
 * This module handles HTTP POST delivery of webhook events to external systems.
 * Implements retry logic with exponential backoff and HMAC signature verification.
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { createHmac } from 'crypto';
import { WebhookEvent, Project } from './types.js';

// Define secret for HMAC signing (configured via Firebase CLI: firebase functions:secrets:set WEBHOOK_SECRET)
const webhookSecret = defineSecret('WEBHOOK_SECRET');

/**
 * Get Firestore instance (lazy initialization to avoid test errors)
 */
function getDb() {
  return getFirestore();
}

/**
 * Maximum number of retry attempts for failed webhook deliveries
 */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Base delay in milliseconds for exponential backoff (first retry after 1 second)
 */
const BASE_RETRY_DELAY_MS = 1000;

/**
 * Timeout for webhook HTTP requests in milliseconds (10 seconds)
 */
const WEBHOOK_TIMEOUT_MS = 10000;

/**
 * Firestore trigger: fires when a webhook event is created
 *
 * Reads the project's webhookUrl, sends an HTTP POST with HMAC signature,
 * and updates the event status based on the result.
 */
export const dispatchWebhookEvent = onDocumentCreated(
  {
    document: 'webhookEvents/{eventId}',
    region: 'us-central1',
    secrets: [webhookSecret]
  },
  async (event) => {
    const eventData = event.data?.data() as WebhookEvent | undefined;

    if (!eventData) {
      console.log('Missing event data, skipping');
      return;
    }

    console.log(`Processing webhook event ${eventData.id} for story ${eventData.shortId}`);

    // Fetch project to get webhook URL
    const db = getDb();
    const projectDoc = await db.collection('projects').doc(eventData.projectId).get();
    if (!projectDoc.exists) {
      console.error(`Project ${eventData.projectId} not found, marking event as failed`);
      await markEventFailed(eventData.id, 'Project not found');
      return;
    }

    const project = projectDoc.data() as Project;
    if (!project.webhookUrl) {
      console.log(`Project ${project.name} has no webhookUrl configured, skipping delivery`);
      // Don't mark as failed - just ignore events for projects without webhooks
      return;
    }

    // Attempt delivery with retries
    await deliverWebhookWithRetries(eventData, project.webhookUrl);
  }
);

/**
 * Deliver webhook event to the configured URL with retry logic
 *
 * @param event Webhook event to deliver
 * @param webhookUrl Target URL for HTTP POST
 */
async function deliverWebhookWithRetries(
  event: WebhookEvent,
  webhookUrl: string
): Promise<void> {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${MAX_RETRY_ATTEMPTS} for event ${event.id}`);

      await deliverWebhook(event, webhookUrl);

      // Success - mark as delivered
      console.log(`Webhook event ${event.id} delivered successfully`);
      await markEventDelivered(event.id);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(`Attempt ${attempt} failed for event ${event.id}:`, lastError);

      // Update event with retry status
      await markEventRetrying(event.id, attempt, lastError);

      // If not the last attempt, wait before retrying with exponential backoff
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`Waiting ${delayMs}ms before retry...`);
        await sleep(delayMs);
      }
    }
  }

  // All retries exhausted - mark as failed
  console.error(`All retry attempts exhausted for event ${event.id}`);
  await markEventFailed(event.id, lastError || 'Unknown error');
}

/**
 * Send HTTP POST request to webhook URL with HMAC signature
 *
 * @param event Webhook event to deliver
 * @param webhookUrl Target URL for HTTP POST
 * @throws Error if delivery fails (non-2xx status or timeout)
 */
async function deliverWebhook(event: WebhookEvent, webhookUrl: string): Promise<void> {
  // Build payload for external system
  const payload = {
    shortId: event.shortId,
    projectId: event.projectId,
    oldStatus: event.oldStatus,
    newStatus: event.newStatus,
    assignedAgent: event.assignedAgent,
    epicName: event.epicName,
    timestamp: event.createdAt.toDate().toISOString()
  };

  const payloadJson = JSON.stringify(payload);

  // Generate HMAC signature
  const signature = generateHmacSignature(payloadJson);

  // Send HTTP POST with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-JeffBoard-Signature': signature,
        'X-JeffBoard-Event-Type': event.eventType
      },
      body: payloadJson,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Check for 5xx errors or timeout - these are retryable
    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    // 4xx errors are NOT retryable - they indicate a client problem
    if (response.status >= 400) {
      throw new Error(`Client error: ${response.status} ${response.statusText} (not retrying)`);
    }

    // 2xx and 3xx are considered success
    if (!response.ok) {
      throw new Error(`Unexpected status: ${response.status} ${response.statusText}`);
    }

    console.log(`Webhook delivered successfully: ${response.status} ${response.statusText}`);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${WEBHOOK_TIMEOUT_MS}ms`);
    }

    throw error;
  }
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 *
 * @param payload JSON string payload
 * @returns Hex-encoded HMAC signature
 */
export function generateHmacSignature(payload: string): string {
  const secret = webhookSecret.value();
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * Mark webhook event as delivered
 */
async function markEventDelivered(eventId: string): Promise<void> {
  const db = getDb();
  await db.collection('webhookEvents').doc(eventId).update({
    status: 'delivered',
    attemptedAt: FieldValue.serverTimestamp()
  });
}

/**
 * Mark webhook event as retrying after a failed attempt
 */
async function markEventRetrying(eventId: string, attempts: number, error: string): Promise<void> {
  const db = getDb();
  await db.collection('webhookEvents').doc(eventId).update({
    status: 'retrying',
    attempts,
    error,
    attemptedAt: FieldValue.serverTimestamp()
  });
}

/**
 * Mark webhook event as failed after all retries exhausted
 */
async function markEventFailed(eventId: string, error: string): Promise<void> {
  const db = getDb();
  await db.collection('webhookEvents').doc(eventId).update({
    status: 'failed',
    error,
    attemptedAt: FieldValue.serverTimestamp()
  });
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

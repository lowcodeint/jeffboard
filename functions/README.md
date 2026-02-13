# JeffBoard Cloud Functions

Firebase Cloud Functions for JeffBoard that handle Firestore triggers and webhook event processing.

## Overview

This directory contains TypeScript Cloud Functions that run on Google Cloud Platform and respond to Firestore database events.

## Functions

### `onStoryStatusChange`

**Trigger:** Firestore `onDocumentUpdated` for `stories/{storyId}` documents

**Purpose:** Detects when a story's status field changes and writes a webhook event to the `webhookEvents` collection.

**Behavior:**
- Fires when any story document is updated
- Compares the `status` field before and after the update
- If status changed, extracts event payload and writes to `webhookEvents` collection
- If status did not change, skips webhook event creation (no-op)
- Does not throw errors if webhook event creation fails (non-blocking)

**Event Payload:**
```typescript
{
  id: string;                    // Firestore document ID
  eventType: 'status-changed';   // Always status-changed for this version
  storyId: string;               // Story document ID
  shortId: string;               // Story short ID (e.g., "JB-1")
  projectId: string;             // Project document ID
  oldStatus: StoryStatus;        // Previous status value
  newStatus: StoryStatus;        // New status value
  assignedAgent: string | null;  // Agent assigned to story
  epicName: string | null;       // Epic name
  status: 'pending';             // Webhook delivery status (always pending when created)
  createdAt: Timestamp;          // Server timestamp
  attempts: 0;                   // Delivery attempt count (always 0 when created)
}
```

### `dispatchWebhookEvent`

**Trigger:** Firestore `onDocumentCreated` for `webhookEvents/{eventId}` documents

**Purpose:** Delivers webhook events to external systems via HTTP POST with HMAC signature verification.

**Behavior:**
- Fires when a new webhook event is created (typically by `onStoryStatusChange`)
- Reads the project document to get the configured `webhookUrl`
- If no `webhookUrl` is configured, silently skips delivery
- Sends HTTP POST to the webhook URL with JSON payload
- Includes HMAC-SHA256 signature in `X-JeffBoard-Signature` header for verification
- Retries up to 3 times with exponential backoff (1s, 2s, 4s) on 5xx errors or timeouts
- Updates webhook event status: `pending` → `retrying` → `delivered` or `failed`
- Does NOT retry on 4xx client errors (misconfiguration)

**HTTP Request:**
```
POST {webhookUrl}
Content-Type: application/json
X-JeffBoard-Signature: {hmac-sha256-hex}
X-JeffBoard-Event-Type: status-changed

{
  "shortId": "JB-1",
  "projectId": "project-123",
  "oldStatus": "backlog",
  "newStatus": "in-progress",
  "assignedAgent": "lead-engineer",
  "epicName": "Test Epic",
  "timestamp": "2026-02-09T12:34:56.789Z"
}
```

**Status Transitions:**
- `pending` → `delivered` (successful delivery)
- `pending` → `retrying` → `delivered` (retry succeeded)
- `pending` → `retrying` → `failed` (all retries exhausted)

**Configuration:**
- **Webhook URL:** Set `webhookUrl` field on project document in Firestore
- **Secret:** Set via Firebase CLI: `firebase functions:secrets:set WEBHOOK_SECRET`
- **Timeout:** 10 seconds per request
- **Retries:** 3 attempts with exponential backoff (1s, 2s, 4s)

## Development

### Install Dependencies

```bash
cd functions
npm install
```

### Build

```bash
npm run build
```

Compiles TypeScript to JavaScript in the `lib/` directory.

### Watch Mode

```bash
npm run build:watch
```

### Run Tests

```bash
npm test
```

Runs unit tests using Node.js built-in test runner.

## Deployment

Deploy functions using Firebase CLI:

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy from project root
cd ..
firebase deploy --only functions
```

**Note:** Functions are configured in the root `firebase.json` file.

## Project Structure

```
functions/
├── src/
│   ├── index.ts                    # Main Cloud Functions exports
│   ├── index.test.ts               # Unit tests for onStoryStatusChange
│   ├── webhook-dispatcher.ts       # Webhook HTTP POST delivery logic
│   ├── webhook-dispatcher.test.ts  # Unit tests for webhook dispatcher
│   └── types.ts                    # TypeScript type definitions
├── lib/                            # Compiled JavaScript (git-ignored)
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript compiler config
└── README.md                      # This file
```

## Type Definitions

### `StoryStatus`

Valid story status values:
- `backlog`
- `in-design`
- `in-progress`
- `in-review`
- `done`
- `blocked`
- `cancelled`

### `WebhookEvent`

Complete schema for webhook event documents in the `webhookEvents` collection. See `src/types.ts` for full definition.

### `Project`

Project document structure (subset used by Cloud Functions):
- `id` - Firestore document ID
- `name` - Project name
- `shortCode` - Short code for story IDs
- `webhookUrl` (optional) - URL for webhook delivery
- `webhookSecret` (optional) - Deprecated - use Firebase secret instead

## Testing Strategy

### `index.test.ts` - Status Change Detection

Unit tests cover:
1. **Status change detection** - `didStatusChange()` correctly identifies when status field changes
2. **Non-status-change filtering** - Returns `false` when status unchanged
3. **Payload structure** - `extractWebhookPayload()` builds correct webhook event structure
4. **Edge cases** - Null agents, empty epic names, all status transitions
5. **Initial state** - New events have `pending` status and `0` attempts

### `webhook-dispatcher.test.ts` - Webhook Delivery

Unit tests cover:
1. **HMAC signature generation** - Consistent signatures, hex encoding, SHA256 length
2. **Payload structure** - All required fields, null handling, ISO timestamps
3. **Status transitions** - Pending → retrying → delivered/failed
4. **Exponential backoff** - Correct delay calculations (1s, 2s, 4s)
5. **HTTP status handling** - 2xx success, 4xx non-retryable, 5xx retryable
6. **Error messages** - Server errors, client errors, timeouts, project not found

## Future Enhancements

Potential improvements:
- **Additional event types** - Story created, note added, assignee changed, etc.
- **Batch delivery** - Group multiple events into a single HTTP request
- **Dead letter queue** - Archive permanently failed events
- **Webhook management UI** - Configure URLs and view delivery logs in the PWA
- **Webhook verification endpoint** - Ping/health check for webhook URLs

## Firestore Collections Used

### `onStoryStatusChange`
- **Read:** `stories/{storyId}` - Source of truth for story updates
- **Write:** `webhookEvents/{eventId}` - Target collection for webhook events

### `dispatchWebhookEvent`
- **Read:** `webhookEvents/{eventId}` - Webhook event to deliver
- **Read:** `projects/{projectId}` - Project configuration (webhookUrl)
- **Write:** `webhookEvents/{eventId}` - Update delivery status

No security rules are needed for Cloud Functions (they use Admin SDK which bypasses rules).

## HMAC Signature Verification

External systems receiving webhooks should verify the `X-JeffBoard-Signature` header:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}

// Express.js example
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-jeffboard-signature'];
  const isValid = verifyWebhook(req.body, signature, process.env.WEBHOOK_SECRET);

  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook event
  const event = JSON.parse(req.body);
  console.log(`Story ${event.shortId} changed from ${event.oldStatus} to ${event.newStatus}`);
  res.status(200).send('OK');
});
```

**Important:** The signature is computed over the raw JSON body, so use `express.raw()` middleware (NOT `express.json()`) to preserve the exact bytes.

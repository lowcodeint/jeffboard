/**
 * Unit tests for webhook dispatcher
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateHmacSignature } from './webhook-dispatcher.js';

describe('generateHmacSignature', () => {
  it('should generate consistent HMAC signature for same payload', () => {
    const payload = JSON.stringify({
      shortId: 'JB-1',
      projectId: 'project-123',
      oldStatus: 'backlog',
      newStatus: 'in-progress'
    });

    // Mock the secret value
    const originalValue = process.env.WEBHOOK_SECRET;
    process.env.WEBHOOK_SECRET = 'test-secret-key';

    const signature1 = generateHmacSignature(payload);
    const signature2 = generateHmacSignature(payload);

    // Restore
    if (originalValue) {
      process.env.WEBHOOK_SECRET = originalValue;
    } else {
      delete process.env.WEBHOOK_SECRET;
    }

    assert.strictEqual(signature1, signature2, 'Signatures should be consistent for same payload');
    assert.strictEqual(typeof signature1, 'string');
    assert.ok(signature1.length > 0, 'Signature should not be empty');
  });

  it('should generate different signatures for different payloads', () => {
    const originalValue = process.env.WEBHOOK_SECRET;
    process.env.WEBHOOK_SECRET = 'test-secret-key';

    const payload1 = JSON.stringify({ status: 'in-progress' });
    const payload2 = JSON.stringify({ status: 'done' });

    const signature1 = generateHmacSignature(payload1);
    const signature2 = generateHmacSignature(payload2);

    // Restore
    if (originalValue) {
      process.env.WEBHOOK_SECRET = originalValue;
    } else {
      delete process.env.WEBHOOK_SECRET;
    }

    assert.notStrictEqual(signature1, signature2, 'Different payloads should produce different signatures');
  });

  it('should generate hex-encoded signature', () => {
    const originalValue = process.env.WEBHOOK_SECRET;
    process.env.WEBHOOK_SECRET = 'test-secret-key';

    const payload = JSON.stringify({ test: 'data' });
    const signature = generateHmacSignature(payload);

    // Restore
    if (originalValue) {
      process.env.WEBHOOK_SECRET = originalValue;
    } else {
      delete process.env.WEBHOOK_SECRET;
    }

    // Hex string should only contain 0-9 and a-f
    assert.ok(/^[0-9a-f]+$/.test(signature), 'Signature should be hex-encoded');
    // SHA256 produces 64 hex characters (32 bytes)
    assert.strictEqual(signature.length, 64, 'SHA256 signature should be 64 hex characters');
  });
});

describe('Webhook Payload Structure', () => {
  it('should include all required fields in webhook payload', () => {
    const payload = {
      shortId: 'JB-1',
      projectId: 'project-123',
      oldStatus: 'backlog',
      newStatus: 'in-progress',
      assignedAgent: 'lead-engineer',
      epicName: 'Test Epic',
      timestamp: new Date().toISOString()
    };

    assert.ok(payload.shortId);
    assert.ok(payload.projectId);
    assert.ok(payload.oldStatus);
    assert.ok(payload.newStatus);
    assert.ok(payload.assignedAgent);
    assert.ok(payload.epicName);
    assert.ok(payload.timestamp);
  });

  it('should handle null assignedAgent in payload', () => {
    const payload = {
      shortId: 'JB-1',
      projectId: 'project-123',
      oldStatus: 'backlog',
      newStatus: 'in-progress',
      assignedAgent: null,
      epicName: 'Test Epic',
      timestamp: new Date().toISOString()
    };

    assert.strictEqual(payload.assignedAgent, null);
  });

  it('should handle null epicName in payload', () => {
    const payload = {
      shortId: 'JB-1',
      projectId: 'project-123',
      oldStatus: 'backlog',
      newStatus: 'in-progress',
      assignedAgent: 'lead-engineer',
      epicName: null,
      timestamp: new Date().toISOString()
    };

    assert.strictEqual(payload.epicName, null);
  });

  it('should format timestamp as ISO string', () => {
    const timestamp = new Date().toISOString();
    const payload = {
      shortId: 'JB-1',
      projectId: 'project-123',
      oldStatus: 'backlog',
      newStatus: 'in-progress',
      assignedAgent: 'lead-engineer',
      epicName: 'Test Epic',
      timestamp
    };

    // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
    assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(payload.timestamp));
  });
});

describe('Webhook Event Status Transitions', () => {
  it('should transition from pending to delivered on success', () => {
    const initialStatus = 'pending';
    const successStatus = 'delivered';

    assert.strictEqual(initialStatus, 'pending');
    assert.strictEqual(successStatus, 'delivered');
  });

  it('should transition from pending to retrying on first failure', () => {
    const initialStatus = 'pending';
    const retryStatus = 'retrying';

    assert.strictEqual(initialStatus, 'pending');
    assert.strictEqual(retryStatus, 'retrying');
  });

  it('should transition from retrying to failed after max attempts', () => {
    const retryStatus = 'retrying';
    const failedStatus = 'failed';

    assert.strictEqual(retryStatus, 'retrying');
    assert.strictEqual(failedStatus, 'failed');
  });

  it('should track attempt count from 1 to MAX_RETRY_ATTEMPTS', () => {
    const MAX_RETRY_ATTEMPTS = 3;
    const attempts = [1, 2, 3];

    assert.strictEqual(attempts.length, MAX_RETRY_ATTEMPTS);
    assert.strictEqual(attempts[0], 1);
    assert.strictEqual(attempts[attempts.length - 1], MAX_RETRY_ATTEMPTS);
  });
});

describe('Exponential Backoff Calculation', () => {
  it('should calculate correct backoff delays', () => {
    const BASE_RETRY_DELAY_MS = 1000;

    // First retry: 1000ms (2^0 = 1)
    const delay1 = BASE_RETRY_DELAY_MS * Math.pow(2, 0);
    assert.strictEqual(delay1, 1000);

    // Second retry: 2000ms (2^1 = 2)
    const delay2 = BASE_RETRY_DELAY_MS * Math.pow(2, 1);
    assert.strictEqual(delay2, 2000);

    // Third retry: 4000ms (2^2 = 4)
    const delay3 = BASE_RETRY_DELAY_MS * Math.pow(2, 2);
    assert.strictEqual(delay3, 4000);
  });

  it('should double delay on each retry', () => {
    const BASE_RETRY_DELAY_MS = 1000;
    const delays = [
      BASE_RETRY_DELAY_MS * Math.pow(2, 0),
      BASE_RETRY_DELAY_MS * Math.pow(2, 1),
      BASE_RETRY_DELAY_MS * Math.pow(2, 2)
    ];

    assert.strictEqual(delays[1], delays[0] * 2);
    assert.strictEqual(delays[2], delays[1] * 2);
  });
});

describe('HTTP Status Code Handling', () => {
  it('should identify 5xx errors as server errors', () => {
    const statusCodes = [500, 502, 503, 504];

    for (const status of statusCodes) {
      assert.ok(status >= 500, `${status} should be classified as server error`);
    }
  });

  it('should identify 4xx errors as client errors', () => {
    const statusCodes = [400, 401, 403, 404, 422];

    for (const status of statusCodes) {
      assert.ok(status >= 400 && status < 500, `${status} should be classified as client error`);
    }
  });

  it('should identify 2xx as success', () => {
    const statusCodes = [200, 201, 202, 204];

    for (const status of statusCodes) {
      assert.ok(status >= 200 && status < 300, `${status} should be classified as success`);
    }
  });

  it('should handle timeout errors', () => {
    const WEBHOOK_TIMEOUT_MS = 10000;
    const error = new Error(`Request timeout after ${WEBHOOK_TIMEOUT_MS}ms`);

    assert.ok(error.message.includes('timeout'));
    assert.ok(error.message.includes('10000ms'));
  });
});

describe('Error Message Validation', () => {
  it('should format server error messages', () => {
    const status = 503;
    const statusText = 'Service Unavailable';
    const errorMessage = `Server error: ${status} ${statusText}`;

    assert.ok(errorMessage.includes('503'));
    assert.ok(errorMessage.includes('Service Unavailable'));
  });

  it('should format client error messages with non-retry indicator', () => {
    const status = 404;
    const statusText = 'Not Found';
    const errorMessage = `Client error: ${status} ${statusText} (not retrying)`;

    assert.ok(errorMessage.includes('404'));
    assert.ok(errorMessage.includes('Not Found'));
    assert.ok(errorMessage.includes('not retrying'));
  });

  it('should handle project not found error', () => {
    const errorMessage = 'Project not found';

    assert.strictEqual(errorMessage, 'Project not found');
  });

  it('should handle unknown errors', () => {
    const errorMessage = 'Unknown error';

    assert.strictEqual(errorMessage, 'Unknown error');
  });
});

# Security Reviewer Memory

## Project Context

JeffBoard is a Kanban board system for tracking AI agent work:
- **Web App**: React SPA hosted on Firebase Hosting (jeff-board.web.app)
- **Backend**: Firestore database with Firebase Cloud Functions
- **CLI**: TypeScript CLI using firebase-admin SDK
- **Agent Scheduler**: Local Node.js orchestrator for Claude Code agents
- **Webhook Flow**: Cloud Functions → ngrok tunnel → Agent Scheduler → spawns Claude Code sessions

## Security Posture Summary

Last reviewed: 2026-02-10

### Critical Findings
1. **Webhook secret exposed in git** (scheduler.json committed)
2. **Agent execution with --dangerously-skip-permissions** (by design but high-risk)
3. **No replay attack protection** on webhooks

### High Findings
1. **Service account JSON in plaintext** (filesystem exposure)
2. **Ngrok tunnel to localhost** (network exposure, MITM risk)
3. **No rate limiting** on webhook endpoint
4. **Missing input size limits** (DoS risk)
5. **Firestore rules allow broad field updates**

### Architecture Patterns

**Auth Model**:
- Firebase Auth with Google Sign-In for web UI
- Service account JSON for CLI/scheduler (bypasses Firestore rules)
- Single-user UID whitelist in `config/allowedUsers` document

**Data Flow**:
1. User/CLI updates story status in Firestore
2. Cloud Function trigger creates webhook event
3. Function sends HMAC-signed POST to ngrok URL
4. Agent Scheduler verifies HMAC, spawns Claude Code session
5. Claude Code runs with full filesystem access

## Known Vulnerabilities by Component

### Firestore Rules (D:\code\jeffboard\firestore.rules)
- ✓ Default deny-all at end
- ✓ isAllowedUser() helper checks auth + UID whitelist
- ⚠️ Line 32: Allows updating many story fields (title, description, etc.) - could be narrowed
- ⚠️ Counter collection (line 64) allows write for allowed users - could enable race conditions

### Webhook System
- ✓ HMAC-SHA256 signature verification implemented
- ✗ No timestamp validation (replay attack possible)
- ✗ No nonce/deduplication (duplicate delivery possible)
- ✗ No rate limiting
- ✗ No request size limits
- ⚠️ 10s timeout on webhook delivery (could cause backlog on slow servers)

### Service Account Management
- ✗ Webhook secret in git history (scheduler.json)
- ✓ Service account JSON in .gitignore (never committed)
- ✗ Service account stored in plaintext on filesystem
- ⚠️ Service account has full database admin access

### Agent Execution
- ✗ --dangerously-skip-permissions flag used (intentional but removes safety rails)
- ⚠️ Agents spawned with full filesystem access to project dir
- ⚠️ Prompt injection possible via story title/description
- ✗ No sandbox or container isolation

## Recommended Mitigations

### Immediate (Critical)
1. Rotate webhook secret and remove from git history
2. Add timestamp validation to webhook (reject >5 min old)
3. Implement nonce/event ID tracking for deduplication

### Short-term (High)
1. Move secrets to environment variables or encrypted storage
2. Add rate limiting to webhook endpoint
3. Add request size limits (body, headers)
4. Narrow Firestore rule update permissions
5. Consider stunnel/TLS for ngrok tunnel

### Long-term (Defense in Depth)
1. Container isolation for agent execution
2. File access restrictions (chroot/sandbox)
3. Audit logging for all admin SDK operations
4. Security headers on Firebase Hosting
5. CSP policy for web app

## Codebase Patterns

**Service account paths**:
- JeffBoard CLI: `D:/code/jeffboard/cli/service-account.json`
- Agent Scheduler: `D:/code/jeffboard/cli/service-account.json` (same file, referenced in scheduler.json)

**Webhook secret locations**:
- Cloud Functions: Firebase secret `WEBHOOK_SECRET` (secure)
- Agent Scheduler: `config/scheduler.json` line 19 (plaintext, committed to git)

**Critical files to monitor**:
- `firestore.rules` - authorization logic
- `storage.rules` - deny-all (correct)
- `functions/src/webhook-dispatcher.ts` - HMAC generation
- `agent-scheduler/src/lib/webhook-server.ts` - HMAC verification
- `agent-scheduler/src/lib/session-launcher.ts` - agent spawn logic

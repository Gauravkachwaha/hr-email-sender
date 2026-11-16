# Implementation plan

## Architecture

```text
Browser: React + Tailwind
  compose → validate → preview → confirm
                 |
       multipart POST /api/send-email
                 |
Express: host/origin checks → rate/concurrency limits
       → bounded upload parser → Zod + PDF checks
       → email service → Nodemailer → Gmail SMTP
                              |
                       injected mock in tests
```

Use one root npm package with JavaScript ES modules, client/ for Vite and server/ for Express. A shared validation module can provide text rules to both sides; the backend remains authoritative. Separate createApp({ transport, ... }) from the startup entry point so Supertest never loads real credentials, opens a listening port, or creates a real SMTP transport.

Proposed structure (created during implementation):

```text
client/
  index.html
  src/                 # composer, preview dialog, status feedback, styles
server/
  app.js               # Express factory and middleware
  index.js             # dotenv, configuration, transport, listener
  config.js
  email.js             # fixed sender and message construction
  validation.js        # upload checks
shared/
  email-schema.js
tests/                 # backend and frontend tests; PDF fixtures
package.json
vite.config.js
vitest.config.js
README.md
```

Development uses Vite with an /api proxy to the loopback Express server; production builds are served locally by Express. Only server/index.js initializes the real Nodemailer transport. No network SMTP verification runs automatically. The root .env is outside the frontend root and never uses VITE_ secret variables.

## Phase 0 — inspect and plan
- [x] Inspect repository and applicable instructions: workspace is empty; no ancestor AGENTS.md found.
- [x] Write AGENTS.md, PRD.md, PLAN.md, and .env.example.
- [x] Establish architecture, API contract, security boundaries, and test strategy.
- [x] Add .gitignore to prevent accidental credential/artifact commits.
- Stop this initial turn here as requested. Application implementation is not started.

## Phase 1 — project foundation
- [ ] Create root package and client/server structure with React, Vite, Tailwind, and Express.
- [ ] Add dotenv and validated configuration; fail clearly on missing production credentials.
- [ ] Configure loopback dev servers, API proxy, scripts, and local built-asset serving.
- [ ] Add README setup instructions and explain Gmail App Password prerequisites.
- [ ] Verify installation, frontend build, and startup/configuration behavior without SMTP traffic.

## Phase 2 — protected email endpoint
- [ ] Implement text schema and bounded multipart handling (Multer or equivalent maintained Express middleware).
- [ ] Validate one recipient and one optional PDF; reject unexpected/repeated inputs.
- [ ] Implement host/origin checks, security headers, request timeout/size limits, rate limiting, and concurrency limits.
- [ ] Implement Nodemailer service with fixed sender, TLS, sanitized attachment name, and timeouts.
- [ ] Return sanitized, consistent responses; never automatically retry sends.
- [ ] Add Vitest + Supertest tests using an injected mock transport; verify no real SMTP calls.

## Phase 3 — composer and confirmation
- [ ] Implement responsive form, attachment controls, and client-side validation.
- [ ] Add accessible text preview dialog with explicit confirmation.
- [ ] Submit FormData only on confirmation; disable duplicate sends and editing while pending.
- [ ] Show success/errors and preserve the draft on failure, including ambiguous-timeout guidance.
- [ ] Test form validation, preview/cancel, confirmation, pending-state behavior, and feedback with Vitest, React Testing Library, and mocked fetch.

## Phase 4 — integration and handoff
- [ ] Run full test suite and production build.
- [ ] Verify responsive layout and keyboard flow locally where browser tooling is available; report any unverified checks.
- [ ] Review built assets for backend-secret exposure using dummy configuration, never real secrets.
- [ ] Finalize README commands, request limits, privacy behavior, troubleshooting, and restricted-use constraints.
- [ ] Report checks and remaining setup. Real email smoke testing requires explicit user permission and is not an automated acceptance gate.

## Test matrix
- Valid plain-text email, optional PDF, exact fixed sender and recipient, one transport call per request.
- Missing/blank/overlong text; recipient lists; CR/LF header attempts; unknown/repeated fields.
- Invalid extension/MIME/signature; multiple attachments; oversized file/field/request; malformed multipart.
- Invalid host/origin, missing origin, rate exhaustion, concurrent sends, and cleanup after failures/aborts.
- SMTP rejection and timeout return safe responses; mock transport only.
- Preview never sends, cancellation returns to editing, confirmation sends once, duplicate clicks are blocked, errors preserve drafts.

## Decisions and limits
- Plain text avoids HTML injection and keeps composition simple.
- Bounded memory uploads avoid disk cleanup and a database; the 5 MiB file and single-send limits bound resource use.
- No durable idempotency store in this MVP: the UI blocks concurrent duplicate clicks, but ambiguous SMTP outcomes require checking Sent before retrying.
- Local binding is the primary access boundary. Browser checks and rate limits provide additional protection without adding a login interface.

## Verification record
Phase 0: inspected the empty directory and ancestor instruction files. Planning files only; no application, dependencies, executable tests, build, or email sends yet.

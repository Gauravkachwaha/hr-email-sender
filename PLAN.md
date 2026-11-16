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
- [x] Create root package and client/server structure with React, Vite, Tailwind, and Express.
- [x] Add dotenv and validated configuration; fail clearly on missing production credentials.
- [x] Configure loopback dev servers, API proxy, scripts, and local built-asset serving.
- [x] Add README setup instructions and explain Gmail App Password prerequisites.
- [x] Verify installation, frontend build, and startup/configuration behavior without SMTP traffic.
- [x] Add Vitest + Supertest infrastructure and foundation tests.
- User authorized completion of all remaining phases on 2026-11-16.

## Phase 2 — protected email endpoint
- [x] Implement text schema and bounded multipart handling (Multer or equivalent maintained Express middleware).
- [x] Validate one recipient and one optional PDF; reject unexpected/repeated inputs.
- [x] Implement host/origin checks, security headers, request timeout/size limits, rate limiting, and concurrency limits.
- [x] Implement Nodemailer service with fixed sender, TLS, sanitized attachment name, and timeouts.
- [x] Return sanitized, consistent responses; never automatically retry sends.
- [x] Add Vitest + Supertest tests using an injected mock transport; verify no real SMTP calls.

## Phase 3 — composer and confirmation
- [x] Implement responsive form, attachment controls, and client-side validation.
- [x] Add accessible text preview dialog with explicit confirmation.
- [x] Submit FormData only on confirmation; disable duplicate sends and editing while pending.
- [x] Show success/errors and preserve the draft on failure, including ambiguous-timeout guidance.
- [x] Test form validation, preview/cancel, confirmation, pending-state behavior, and feedback with Vitest, React Testing Library, and mocked fetch.

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

Phase 1 (2026-11-16):
- Installed dependencies with Node 24.22.1 / npm 11.19.1; lockfile committed for reproducibility. npm reported zero known vulnerabilities at installation.
- `npm test`: 15 tests passed across 2 files. Covered configuration defaults/rejection/redaction, health response, absent send endpoint, and production static/API route boundaries.
- `npm run build`: successful; generated HTML, JavaScript, and Tailwind CSS in ignored dist/.
- Started `npm run dev` with dummy environment values. HTTP checks passed for Vite on 127.0.0.1:5173, Express on 127.0.0.1:5000, the proxied health endpoint, and transformed React entry module.
- Started `npm start` and verified the built page, referenced JS/CSS assets, and health endpoint on 127.0.0.1:5000.
- Verified missing configuration exits with status 1 and field names only. Scanned built assets for SMTP configuration/dummy password exposure; none found.
- Stopped all verification servers. No real credentials, SMTP transport, or email sends were used. No .env was created.
- HTTP/module/build checks verify startup; visual browser rendering and keyboard interaction were not tested in this phase.
- Concurrently emitted an environment-specific Snap warning; both child processes started and stopped successfully despite it.
- Git remote is configured as origin for Gauravkachwaha/hr-email-sender, branch main. Push remains subject to explicit approval.

Implementation decisions: configuration is validated on all server startups (dummy placeholders suffice for Phase 1 because no SMTP connection exists); the UI is a responsive foundation/status screen only. Email composition and sending remain in their planned later phases. Use `npm start` for integrated built-frontend serving rather than a standalone Vite preview server.

Phase 2: 36 backend/configuration tests passed using mock transports only. Added bounded memory PDF parsing, strict shared text schema, fixed sender, local origin/host checks, Helmet, in-memory rate/concurrency limits, SMTP timeouts, and safe error responses. No SMTP network verification performed.

Phase 3: 43 tests passed across four files; production build passed. Added responsive composer, shared validation, PDF controls, native modal preview, explicit confirmation, in-flight locking, safe feedback, and draft preservation. Frontend tests mock fetch; no emails sent.

# HR Email Sender — contributor instructions

## Scope
- Build a beginner-friendly local application using React, Vite, Tailwind CSS, Node.js, Express, Nodemailer, dotenv, Zod, Vitest, and Supertest.
- Follow PRD.md for requirements and PLAN.md for implementation phases. Complete and verify one phase before moving to the next; update the plan with results.
- No login, signup, OAuth UI, database, or public deployment of the unauthenticated sending endpoint.
- Keep code small and readable. Prefer JavaScript ES modules and explicit functions over extra frameworks or abstractions.

## Security and delivery
- Load SMTP credentials only in the backend. Never use VITE_ variables for secrets or include secrets in source, responses, logs, or test fixtures.
- Bind servers to 127.0.0.1 by default. Any remote operation requires an externally enforced access restriction; CORS and rate limits are not access control.
- Validate all input on the server. Fix the sender from SMTP_USER; accept exactly one recipient and no client-controlled headers, CC, or BCC.
- Limit request sizes, upload counts, field counts, request rates, and concurrent SMTP sends. Validate PDF metadata and signature; never execute or render uploaded PDFs.
- Keep attachments in bounded memory only; do not persist email content or attachments.
- All automated tests must inject a mock email transport. Never send real test emails or verify SMTP credentials over the network without explicit user permission.
- Do not automatically retry SMTP sends: a timeout may occur after Gmail accepted a message.

## Workflow and verification
- Explain significant decisions and phase results. Do not claim checks passed unless executed.
- Test validation failures, transport behavior, upload restrictions, abuse protections, and frontend confirmation/submission behavior.
- Run appropriate tests and a production build once implementation exists.
- Keep setup documentation and .env.example aligned with actual configuration. Never commit .env.

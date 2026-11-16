# HR Email Sender

## Objective
Compose and send an email to one HR recipient from a Gmail account configured once on the backend. Provide a clean, responsive interface without accounts, OAuth screens, or a database.

## Primary flow
1. Enter one HR email address, a subject, and plain-text email content.
2. Optionally select one PDF resume and show its name, size, and removal control.
3. Click **Send Email** to open a preview showing recipient, subject, complete content, and attachment details.
4. Choose **Back to edit** or **Confirm and send**. Preview alone never calls the sending endpoint.
5. While sending, show a loading state and disable editing and submission controls.
6. Show success after SMTP acceptance, or a useful error. Preserve the draft on failure; allow an explicit new draft after success.

## Interface
- Professional neutral palette with one accent color, clear typography, spacious composer, and responsive single-column layout on small screens.
- Visible labels, field errors, keyboard-accessible confirmation dialog, focus management, and announced loading/success/error states.
- Render previews as escaped text with preserved line breaks. Do not support HTML email or render the uploaded PDF.
- Do not store drafts in browser storage for the MVP.

## API contract
`POST /api/send-email` receives `multipart/form-data` with:

| Field | Rule |
| --- | --- |
| recipient | Required single plain email address, maximum 254 characters; reject recipient lists and CR/LF |
| subject | Required, trimmed, 1–200 characters; reject CR/LF |
| content | Required non-whitespace plain text, maximum 20,000 characters; preserve intentional line breaks |
| resume | Optional single file, maximum 5 MiB; .pdf extension, application/pdf MIME type, and PDF signature required |

Reject unexpected or repeated fields, extra files, and client-supplied sender/CC/BCC/header fields. Zod validates text fields; bounded multipart parsing and file checks validate attachments. Signature checks detect obvious mismatches but do not establish that a PDF is harmless.

Success: HTTP 200 with `{ "success": true, "message": "Email accepted for delivery." }`. SMTP acceptance does not guarantee inbox delivery.

Errors: consistent `{ "success": false, "error": { "code": "...", "message": "...", "fields": {} } }` responses; field details are optional. Use 400 for invalid input, 403 for rejected origins/hosts, 413 for size limits, 415 for unsupported request content type, 429 for rate/concurrency limits, and 502/504 for SMTP failure/timeout. Never return credentials or raw SMTP errors.

## Backend and access constraints
- SMTP host smtp.gmail.com, port 465, TLS enabled; sender fixed to SMTP_USER, authenticated with SMTP_APP_PASSWORD.
- dotenv loads a root .env; Zod validates configuration at startup. Missing credentials produce a clear local startup error without revealing values.
- Gmail setup documentation must explain App Password prerequisites and availability; never ask users to put their normal Gmail password into configuration.
- Default PORT=5000 and host 127.0.0.1. Vite also binds to 127.0.0.1 and proxies /api to Express.
- Built frontend is served by Express for a same-origin local production mode.
- Enforce an explicit loopback Host/origin allowlist, reject cross-site browser sends, and do not enable permissive CORS. Require the expected browser Origin on the send route; test requests provide it explicitly.
- Apply an in-memory per-IP rate limit (initially 5 send attempts per 15 minutes) and a process-wide limit of one active SMTP send. Rate-limit before multipart parsing; reject excess concurrent sends before buffering files. Release slots on every completion/error/abort path.
- Set bounded multipart fields/parts/file sizes and request/SMTP timeouts. Disable proxy trust by default. Use security headers and sanitized attachment filenames.
- In-memory limits reset on restart and apply to a single process. They supplement localhost or external access restrictions, not authentication.
- No public hosting, tunnels, or binding to all interfaces in the default setup. Any remote use needs separately configured access restrictions such as a private network and an access-controlled reverse proxy.
- Do not log recipient addresses, subjects, bodies, attachments, or secrets. No automatic send retries; after an ambiguous timeout, advise checking Gmail Sent before manually retrying.

## Acceptance criteria
- Valid confirmed submissions send one plain-text message through an injected Nodemailer transport, with the optional PDF attached.
- Invalid recipients, headers, content, files, and oversized/malformed requests cannot reach the transport.
- Repeated clicks cannot issue concurrent frontend requests; confirmation is required before each send.
- Success, validation errors, rate limits, network errors, and ambiguous delivery failures have clear UI feedback.
- Backend secrets are absent from client code and artifacts. Automated tests make no SMTP connections.
- Tests and production build pass; README explains setup, Gmail App Password configuration, local usage, limits, and troubleshooting.

## Out of scope
Bulk sending, contact lists, templates, email tracking, inbox access, scheduled sends, persistent send history, rich HTML, user accounts, and public deployment.

<div align="center">

# ✉️ HR Email Sender

**Thoughtful outreach. One email at a time.**

Compose a personal introduction, attach your resume, and send through your own Gmail account—with a preview before every send.

`React` · `Vite` · `Tailwind CSS` · `Express` · `Nodemailer`

[Quick start](#quick-start) · [Gmail setup](#gmail-setup) · [How it works](#how-it-works) · [Development](#development) · [Troubleshooting](#troubleshooting)

</div>

---

## At a glance

| A focused writing experience | A simple local setup |
| --- | --- |
| One recipient, a subject, and a plain-text message | One preconfigured Gmail sender |
| Optional PDF resume attachment | Backend-only environment credentials |
| Preview and explicit confirmation | No login, signup, or OAuth interface |
| Loading, success, and error feedback | No database or persistent drafts |
| Responsive layout and keyboard-accessible dialog | Mocked email delivery in automated tests |

> **Built for local use.** Keep this application on your computer or behind an externally enforced access restriction. Its email endpoint has no user authentication.

## Quick start

Use Node.js 24 and npm. With nvm, run `nvm install` and `nvm use`. If Node is not found, first run `source "$HOME/.nvm/nvm.sh"`.

```bash
git clone https://github.com/Gauravkachwaha/hr-email-sender.git
cd hr-email-sender
npm ci
```

Already have the repository? Run `npm ci` from its root and skip cloning.

Create `.env` **only if it does not already exist**:

```bash
cp -n .env.example .env
```

Edit the root `.env` locally:

```dotenv
SMTP_USER=your_email@gmail.com
SMTP_APP_PASSWORD=your_app_password
PORT=5000
```

Replace the placeholders with your Gmail address and App Password, then:

```bash
npm run dev
```

Open **http://127.0.0.1:5173**. Express runs on **http://127.0.0.1:5000**. Both servers bind to loopback. Ctrl+C stops them. Credentials are validated locally at startup; Gmail is contacted only after **Confirm and send**. Placeholders can start the app for UI inspection but cannot deliver email.

<details>
<summary><strong>Run the production build locally</strong></summary>

Stop development first, then run:

```bash
npm run build
npm start
```

Open **http://127.0.0.1:5000**. Express serves the built frontend and API together.

</details>

## Gmail setup

Enable 2-Step Verification and create an App Password in your Google account settings. Use that App Password, not your normal Google password. App Passwords may be unavailable for organization accounts, security-key-only verification, or Advanced Protection. See [Google's instructions](https://support.google.com/accounts/answer/185833). No Google authentication screen is embedded in this application.

Never commit `.env`, share credentials in chat, or use `VITE_` variables for secrets. Existing shell variables override `.env`. Restart both servers after changing configuration. PORT must be 1–65535; avoid the frontend port 5173.

## How it works

1. Enter one HR email address, a subject, and your message.
2. Optionally attach one PDF resume (up to 5 MiB).
3. Select **Send Email** to review the recipient, text, and attachment.
4. Select **Confirm and send**, or go back to edit.
5. Wait for feedback. On success, select **Write another email** for a blank draft.

Success means Gmail accepted the message, not guaranteed inbox delivery. If the connection fails or delivery is uncertain, **check Gmail Sent before retrying**. There are no automatic retries or durable duplicate detection. Editing and duplicate clicks are disabled during an active submission. Closing the tab does not cancel an email Gmail may already have accepted.

Drafts stay in the tab and are lost on refresh. Attachments are held temporarily in bounded server memory, never saved to disk. Preview renders plain text, never HTML or the PDF itself. Attachments are sent with the safe filename `resume.pdf`.

## Development

### Everyday commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite + Express with change watching |
| `npm run dev:client` / `npm run dev:server` | Run either development process separately |
| `npm test` | Vitest + Supertest and React interaction tests |
| `npm run test:watch` | Watch tests |
| `npm run build` | Build frontend into dist/ |
| `npm start` | Serve the built app and API locally |

### Project map

```text
hr-email-sender/
├── client/src/           # React composer, preview dialog, and styles
├── server/
│   ├── app.js            # Express app factory and static serving
│   ├── config.js         # Safe environment validation
│   ├── email.js          # Fixed-sender message construction
│   ├── index.js          # Gmail transport and local listener
│   └── send-route.js     # Validation, uploads, limits, and responses
├── shared/               # Shared Zod schema and attachment limit
├── tests/                # API, configuration, and UI tests
├── .env.example          # Configuration template; no real credentials
├── PRD.md                # Product requirements
├── PLAN.md               # Implementation phases and verification record
└── AGENTS.md             # Contributor instructions
```

### Verification

```bash
npm test
npm run build
```

The suite covers configuration, validation, attachments, access checks, rate and concurrency limits, aborted uploads, and the preview/confirmation flow. Email transports and browser requests are mocked: **automated tests never send real emails**.

See [PLAN.md](PLAN.md) for recorded test and browser verification results.

Tailwind uses its [Vite integration](https://tailwindcss.com/docs/installation/using-vite). Nodemailer uses [SMTP with TLS](https://nodemailer.com/smtp) on smtp.gmail.com:465. Transport initialization does not verify credentials over the network.

## API & safeguards

`POST /api/send-email` accepts multipart fields `recipient`, `subject`, `content`, and optional `resume`. Unknown/repeated fields and extra files are rejected. The sender cannot be overridden.

- One email address, up to 254 characters; subject 1–200 characters without line breaks; nonblank content up to 20,000 characters.
- PDF extension, MIME type, and `%PDF-` signature required; 5 MiB maximum. Signature validation is not malware scanning.
- Five attempts per IP per 15 minutes, including validation failures after access checks. One active upload/send per server process.
- Uploads have bounded fields/parts, a total byte budget, and a 30-second receive deadline. Oversized streamed or stalled uploads may have their connection closed.
- SMTP connection/greeting timeouts are 15 seconds; socket inactivity timeout is 30 seconds. Limits reset when the single server process restarts.
- Explicit localhost/127.0.0.1 host and HTTP origin allowlists; cross-site sends rejected. No permissive CORS or proxy trust.
- Errors use safe messages; email content, recipients, attachments, and credentials are not logged.

**Local or externally access-restricted use only.** Do not expose this unauthenticated endpoint through public hosting or tunnels. Rate limiting and origin checks are not authentication. Remote deployment would require a separately enforced access boundary and deliberate origin/host configuration changes.

## Troubleshooting

<details>
<summary><strong>Common issues and fixes</strong></summary>

- **Invalid configuration:** check the reported field names in your root `.env`; do not paste values into reports.
- **Port already in use:** stop the other instance or change PORT and restart both servers.
- **Delivery could not be confirmed:** check Gmail Sent first, then verify your App Password and connectivity locally. Do not retry blindly.
- **Too many attempts:** wait 15 minutes. **Another email is being processed:** wait for the active request to finish.
- **Resume rejected:** select an actual PDF exported by your document editor, within the size limit.
- **Frontend build missing:** run `npm run build` before `npm start`.
- **Snap warning from concurrently:** the verified environment emitted this warning but started both processes successfully; separate development commands are also available.

</details>



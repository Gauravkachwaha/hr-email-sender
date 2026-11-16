# HR Email Sender

A local React + Express application for individual HR outreach. **Phase 1 is complete: the frontend shell, health endpoint, configuration, and test infrastructure exist. Email sending is not implemented.**

## Run locally

Use Node.js 24 and npm. If using nvm, run `nvm install` then `nvm use` in this directory. If your terminal cannot find Node, load nvm with `source "$HOME/.nvm/nvm.sh"` first.

```bash
npm ci
cp .env.example .env
npm run dev
```

Do not overwrite an existing `.env`. The example placeholders are sufficient for Phase 1 startup checks: validation checks configuration shape, not Gmail connectivity. No SMTP transport exists and nothing is sent.

Open **http://127.0.0.1:5173**. The page should show **Backend connected**. Express runs at **http://127.0.0.1:5000**, with health information at `/api/health`. Stop both processes with Ctrl+C.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run Vite and Express together with change watching |
| `npm run dev:client` | Run only Vite |
| `npm run dev:server` | Run only Express |
| `npm test` | Run Vitest + Supertest once |
| `npm run test:watch` | Run tests during development |
| `npm run build` | Build the frontend into dist/ |
| `npm start` | Serve the built frontend and API locally from Express |

For the local production mode, run `npm run build` then `npm start`, and open **http://127.0.0.1:5000**. Stop development first to free the API port. The Vite preview command is not the integrated application server; use `npm start` to serve the built app with its API.

## Backend configuration

The backend loads `.env` from the repository root with dotenv. Existing shell environment variables take precedence. Zod validates configuration before listening; error messages show field names without values.

| Variable | Meaning |
| --- | --- |
| SMTP_USER | Sender email address; required and email-shaped |
| SMTP_APP_PASSWORD | Non-empty Gmail App Password; required |
| PORT | Backend port, 1–65535; defaults to 5000 |

Changing `PORT` also changes Vite's proxy target. Restart `npm run dev` after changing `.env`. Avoid the frontend's reserved development port 5173. Both servers bind to `127.0.0.1`.

Before email sending is implemented, no real credentials are needed. When configuring Gmail later, enable 2-Step Verification and generate an App Password; use that password rather than your normal Google password. The App Password option may be unavailable for organization accounts, security-key-only verification, or Advanced Protection. See [Google's App Password instructions](https://support.google.com/accounts/answer/185833). Credential setup occurs in Google account settings; the application has no login or OAuth interface.

Never commit `.env`, share credentials in chat, or prefix secrets with `VITE_`. The frontend root is `client/`; production serves only `dist/`. The root `.env` is excluded from Git. Do not publish or tunnel this unauthenticated application: it is intended for localhost or separately enforced restricted access.

## Project structure

- `client/src/`: React landing screen and Tailwind styling. Its only API call is the health check.
- `server/app.js`: side-effect-free Express factory, health endpoint, optional static serving, and 404 handling.
- `server/index.js`: dotenv loading, startup validation, local listener, and shutdown handling.
- `server/config.js`: configuration schema and safe validation errors.
- `vite.config.js`: React/Tailwind plugins, loopback server, and API proxy. Tailwind uses its [official Vite integration](https://tailwindcss.com/docs/installation/using-vite).
- `vitest.config.js`, `tests/`: isolated tests for configuration, public health responses, route boundaries, and static serving. Tests never read `.env` or connect to Gmail.
- `PRD.md`, `PLAN.md`, `AGENTS.md`: requirements, phased work, and contributor rules.

No database, email transport, upload handler, or sending endpoint exists yet. Phase 2 will add the protected endpoint and mocked transport tests; Phase 3 will add the composer and confirmation dialog.

## Troubleshooting

- **Invalid or missing configuration:** copy `.env.example` to `.env` if missing, then fix the reported fields. Do not paste their values into bug reports.
- **Port already in use:** stop the other local instance or select an unused backend PORT and restart both servers. Vite fails instead of silently moving off port 5173.
- **Backend unavailable:** inspect the API terminal output and visit `/api/health` on the backend port. Confirm both processes are running.
- **Frontend build missing:** run `npm run build` before `npm start`.

## Git workflow

Use Conventional Commits, run relevant tests, review `git status` and `git diff`, and check staged files for secrets before committing. Push only after explicit approval of the commit summary. Never force-push or change repository visibility without permission.

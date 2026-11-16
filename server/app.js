import express from 'express';
import path from 'node:path';

export function createApp({ staticDirectory } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);

  app.get('/api/health', (_req, res) => {
    res.set('Cache-Control', 'no-store').json({ status: 'ok', service: 'hr-email-sender' });
  });

  // Unknown API routes must not fall through to the frontend.
  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'API route not found.' } });
  });

  if (staticDirectory) {
    app.use(express.static(staticDirectory));
    app.get('/', (_req, res) => res.sendFile(path.join(staticDirectory, 'index.html')));
  }

  app.use((_req, res) => res.status(404).send('Not found'));
  app.use((_error, _req, res, _next) => {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
  });
  return app;
}

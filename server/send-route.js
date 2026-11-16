import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { emailSchema, MAX_PDF_BYTES } from '../shared/email-schema.js';
import { buildMessage } from './email.js';

const upload = multer({ storage: multer.memoryStorage(), limits: {
  fileSize: MAX_PDF_BYTES, files: 1, fields: 3, parts: 5, fieldSize: 80000, fieldNameSize: 100,
} }).single('resume');
const fail = (res, status, code, message, fields) => res.status(status).json({ success: false, error: { code, message, ...(fields && { fields }) } });

export function addSendRoute(app, { transport, sender, port = 5000, rateMax = 5 }) {
  const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`, '127.0.0.1:5173', 'localhost:5173']);
  const origins = new Set([...hosts].map(host => `http://${host}`));
  let busy = false;
  const limit = rateLimit({ windowMs: 15 * 60 * 1000, limit: rateMax, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (_req, res) => fail(res, 429, 'RATE_LIMIT', 'Too many attempts. Try again in 15 minutes.') });
  app.post('/api/send-email', (req, res, next) => {
    if (!hosts.has(req.get('host')) || !origins.has(req.get('origin')) || req.get('sec-fetch-site') === 'cross-site') {
      return fail(res, 403, 'FORBIDDEN', 'Open this application from its local address.');
    }
    next();
  }, limit, (req, res) => {
    if (!req.is('multipart/form-data')) return fail(res, 415, 'CONTENT_TYPE', 'Use multipart/form-data.');
    if (Number(req.get('content-length')) > MAX_PDF_BYTES + 100000) return fail(res, 413, 'TOO_LARGE', 'Request is too large.');
    if (busy) return fail(res, 429, 'BUSY', 'Another email is being processed. Please wait.');
    busy = true;
    let sending = false;
    let expired = false;
    let released = false;
    const release = () => { if (!released) { released = true; busy = false; clearTimeout(timer); } };
    const timer = setTimeout(() => {
      expired = true;
      if (!sending) { release(); req.destroy(); }
    }, 30000);
    let bytes = 0;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > MAX_PDF_BYTES + 100000) { expired = true; release(); req.destroy(); }
    });
    req.once('aborted', () => { expired = true; if (!sending) release(); });
    upload(req, res, async (error) => {
      if (expired || req.aborted) { release(); return; }
      if (error) {
        release();
        return fail(res, ['LIMIT_FILE_SIZE', 'LIMIT_FIELD_VALUE'].includes(error.code) ? 413 : 400, 'INVALID_UPLOAD', 'Upload one PDF up to 5 MiB and the three required text fields.');
      }
      const parsed = emailSchema.safeParse(req.body);
      if (!parsed.success) {
        release();
        const fields = Object.fromEntries(parsed.error.issues.filter(i => i.path.length).map(i => [i.path[0], i.message]));
        return fail(res, 400, 'INVALID_INPUT', 'Check the email fields.', fields);
      }
      const file = req.file;
      if (file && (!/\.pdf$/i.test(file.originalname) || file.mimetype !== 'application/pdf' || !file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-')))) {
        release(); return fail(res, 400, 'INVALID_PDF', 'Resume must be a PDF file.');
      }
      sending = true;
      clearTimeout(timer);
      try {
        const result = await transport.sendMail(buildMessage(sender, parsed.data, file));
        if (!result.accepted?.includes(parsed.data.recipient)) throw new Error('Not accepted');
        if (!res.destroyed) res.json({ success: true, message: 'Email accepted for delivery.' });
      } catch (error) {
        if (!res.destroyed) fail(res, error.code === 'ETIMEDOUT' ? 504 : 502, 'DELIVERY_ERROR', 'Delivery could not be confirmed. Check Gmail Sent before trying again.');
      } finally { release(); }
    });
  });
}

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server/app.js';

describe('foundation API', () => {
  const app = createApp();
  it('returns only public health information without credentials or SMTP', async () => {
    const response = await request(app).get('/api/health').expect(200);
    expect(response.body).toEqual({ status: 'ok', service: 'hr-email-sender' });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(app.get('trust proxy')).toBe(false);
  });
  it('does not enable sending without an injected transport', async () => {
    const response = await request(app).post('/api/send-email').send({}).expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('local production frontend', () => {
  let directory;
  let app;
  beforeAll(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'hr-email-sender-'));
    await writeFile(path.join(directory, 'index.html'), '<!doctype html><title>HR Email Sender fixture</title>');
    await writeFile(path.join(directory, 'app.js'), '/* fixture asset */');
    app = createApp({ staticDirectory: directory });
  });
  afterAll(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });
  it('serves the built page and assets', async () => {
    const response = await request(app).get('/').expect(200).expect('Content-Type', /html/);
    expect(response.text).toContain('HR Email Sender fixture');
    await request(app).get('/app.js').expect(200);
  });
  it('keeps missing API routes and assets separate from the page', async () => {
    await request(app).get('/api/missing').expect(404).expect('Content-Type', /json/);
    await request(app).get('/missing.js').expect(404);
    await request(app).get('/.env').expect(404);
  });
});

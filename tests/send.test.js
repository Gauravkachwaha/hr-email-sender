import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import http from 'node:http';
import { createApp } from '../server/app.js';
const data = { recipient: 'hr@example.com', subject: 'Application', content: 'Hello\nThank you' };
function setup(options = {}) {
  const transport = { sendMail: vi.fn().mockResolvedValue({ accepted: [data.recipient] }) };
  const app = createApp({ transport, sender: 'sender@example.com', rateMax: 100, ...options });
  const post = (fields = data) => {
    const req = request(app).post('/api/send-email').set('Host', '127.0.0.1:5000').set('Origin', 'http://127.0.0.1:5173');
    for (const [key, value] of Object.entries(fields)) req.field(key, value);
    return req;
  };
  return { app, transport, post };
}
describe('protected email endpoint with mock transport', () => {
  it('sends a single plain-text message with a fixed sender', async () => {
    const { post, transport } = setup();
    await post().expect(200);
    expect(transport.sendMail).toHaveBeenCalledOnce();
    expect(transport.sendMail.mock.calls[0][0]).toMatchObject({ from: 'sender@example.com', to: data.recipient, text: data.content, subject: data.subject, attachments: [], disableFileAccess: true });
  });
  it('attaches a PDF buffer with a safe filename', async () => {
    const { post, transport } = setup();
    await post().attach('resume', Buffer.from('%PDF-1.7\nfixture'), { filename: 'my resume.pdf', contentType: 'application/pdf' }).expect(200);
    expect(transport.sendMail.mock.calls[0][0].attachments[0].filename).toBe('resume.pdf');
  });
  it.each([
    { ...data, recipient: 'a@example.com,b@example.com' }, { ...data, subject: 'x\r\nBcc: a@example.com' },
    { ...data, content: '  ' }, { ...data, content: 'a'.repeat(20001) }, { ...data, subject: 'a'.repeat(201) },
    { recipient: data.recipient, subject: data.subject }, { ...data, from: 'evil@example.com' },
  ])('rejects invalid input without sending', async fields => {
    const { post, transport } = setup(); await post(fields).expect(400); expect(transport.sendMail).not.toHaveBeenCalled();
  });
  it('rejects repeated fields', async () => { const { post } = setup(); await post().field('recipient', 'other@example.com').expect(400); });
  it.each([
    ['resume.txt', 'application/pdf', '%PDF-1.7'], ['resume.pdf', 'text/plain', '%PDF-1.7'], ['resume.pdf', 'application/pdf', 'not a PDF'],
  ])('rejects invalid attachment %s %s', async (filename, contentType, body) => {
    const { post, transport } = setup(); await post().attach('resume', Buffer.from(body), { filename, contentType }).expect(400); expect(transport.sendMail).not.toHaveBeenCalled();
  });
  it('limits file size', async () => { const { post } = setup(); await post().attach('resume', Buffer.alloc(5 * 1024 * 1024 + 1), 'resume.pdf').expect(413); });
  it('rejects extra files', async () => { const { post } = setup(); await post().attach('resume', Buffer.from('%PDF-1'), 'a.pdf').attach('resume', Buffer.from('%PDF-1'), 'b.pdf').expect(400); });
  it('checks origin and host', async () => {
    const { post } = setup(); await post().set('Origin', 'https://evil.example').expect(403);
    await post().set('Host', 'evil.example').expect(403); await post().unset('Origin').expect(403);
  });
  it('rejects JSON and malformed multipart', async () => {
    const { app, post } = setup();
    await request(app).post('/api/send-email').set('Host', 'localhost:5000').set('Origin', 'http://localhost:5000').send(data).expect(415);
    await post({}).set('Content-Type', 'multipart/form-data; boundary=missing').send('broken').expect(400);
  });
  it('limits attempts', async () => { const { post } = setup({ rateMax: 1 }); await post().expect(200); await post().expect(429); });
  it.each(['EAUTH', 'ETIMEDOUT'])('sanitizes %s and releases the slot', async code => {
    const { post, transport } = setup(); transport.sendMail.mockRejectedValueOnce(Object.assign(new Error('secret'), { code }));
    const res = await post().expect(code === 'ETIMEDOUT' ? 504 : 502); expect(JSON.stringify(res.body)).not.toContain('secret'); await post().expect(200);
  });
  it('blocks concurrent sends and releases after completion', async () => {
    const { post, transport } = setup(); let resolve;
    transport.sendMail.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const pending = post().then(res => res);
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'));
    await post().expect(429); resolve({ accepted: [data.recipient] }); expect((await pending).status).toBe(200); await post().expect(200);
  });
  it('releases the upload slot after a client abort', async () => {
    const { app, post } = setup();
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    let client;
    try {
      const started = new Promise(resolve => server.once('request', () => setImmediate(resolve)));
      client = http.request({ host: '127.0.0.1', port: server.address().port, path: '/api/send-email', method: 'POST', headers: {
        Host: '127.0.0.1:5000', Origin: 'http://127.0.0.1:5173', 'Content-Type': 'multipart/form-data; boundary=fixture',
      } });
      client.on('error', () => {});
      client.write('--fixture\r\nContent-Disposition: form-data; name="content"\r\n\r\npartial');
      await started;
      await post().expect(429);
      client.destroy();
      await vi.waitFor(async () => { const response = await post(); expect(response.status).toBe(200); });
    } finally { client?.destroy(); await new Promise(resolve => server.close(resolve)); }
  });

});

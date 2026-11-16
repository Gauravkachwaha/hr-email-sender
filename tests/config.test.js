import { describe, expect, it } from 'vitest';
import { parsePort, readConfig } from '../server/config.js';

// Deliberately fake values: configuration tests do not contact Gmail.
const env = { SMTP_USER: 'fixture@example.com', SMTP_APP_PASSWORD: 'test-only-not-a-credential' };

describe('backend configuration', () => {
  it('uses a loopback host and default port', () => {
    expect(readConfig(env)).toMatchObject({ host: '127.0.0.1', PORT: 5000 });
  });
  it('accepts a custom port and ignores unrelated environment variables', () => {
    expect(readConfig({ ...env, PORT: '5100', EXTRA: 'ignored' })).toEqual({ ...env, PORT: 5100, host: '127.0.0.1' });
  });
  it.each(['', 'abc', '0', '-1', '65536', '5000.5'])('rejects invalid port %j', (PORT) => {
    expect(() => readConfig({ ...env, PORT })).toThrow('PORT');
    expect(() => parsePort(PORT)).toThrow('PORT');
  });
  it('fails clearly when credentials are missing', () => {
    expect(() => readConfig({})).toThrow('SMTP_USER, SMTP_APP_PASSWORD');
  });
  it('rejects blank passwords', () => {
    expect(() => readConfig({ ...env, SMTP_APP_PASSWORD: '   ' })).toThrow('SMTP_APP_PASSWORD');
  });
  it('never includes input values in configuration errors', () => {
    const invalidValue = 'private-value-not-an-email';
    try {
      readConfig({ ...env, SMTP_USER: invalidValue });
      expect.fail('Expected configuration rejection');
    } catch (error) {
      expect(error.message).toContain('SMTP_USER');
      expect(error.message).not.toContain(invalidValue);
      expect(error.message).not.toContain(env.SMTP_APP_PASSWORD);
    }
  });
});

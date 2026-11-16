import { z } from 'zod';

const portSchema = z.coerce.number().int().min(1).max(65535).default(5000);
const configSchema = z.object({
  SMTP_USER: z.email(),
  SMTP_APP_PASSWORD: z.string().trim().min(1),
  PORT: portSchema,
});

export function parsePort(value) {
  const result = portSchema.safeParse(value);
  if (!result.success) throw new Error('Invalid PORT: use an integer from 1 to 65535.');
  return result.data;
}

export function readConfig(env) {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path[0]))];
    // Report field names only; validation errors must never echo credentials.
    throw new Error(`Invalid or missing configuration: ${fields.join(', ')}. Check your root .env file against .env.example.`);
  }
  return { ...result.data, host: '127.0.0.1' };
}

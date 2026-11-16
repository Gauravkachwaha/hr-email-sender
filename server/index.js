import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { readConfig } from './config.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

try {
  const config = readConfig(process.env);
  const production = process.argv.includes('--production') || process.env.NODE_ENV === 'production';
  const staticDirectory = fileURLToPath(new URL('../dist/', import.meta.url));
  if (production && !existsSync(`${staticDirectory}/index.html`)) {
    throw new Error('Frontend build missing. Run npm run build before npm start.');
  }
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: config.SMTP_USER, pass: config.SMTP_APP_PASSWORD },
    connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000,
    dnsTimeout: 10000, disableFileAccess: true, disableUrlAccess: true,
  });
  const app = createApp({ staticDirectory: production ? staticDirectory : undefined,
    transport, sender: config.SMTP_USER, port: config.PORT });
  const server = app.listen(config.PORT, config.host, () => {
    console.log(`HR Email Sender ${production ? 'application' : 'API'}: http://${config.host}:${config.PORT}`);
    console.log('Local access only. Gmail is contacted only when you confirm a send.');
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE'
      ? `Port ${config.PORT} is already in use. Stop the other process or change PORT in .env.`
      : 'Could not start the local server. Check your port and network permissions.');
    process.exitCode = 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => server.close());
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

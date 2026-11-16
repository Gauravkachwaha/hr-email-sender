import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { parsePort } from './server/config.js';

// Read configuration for the proxy only; never define client-side SMTP values.
dotenv.config({ path: fileURLToPath(new URL('.env', import.meta.url)), quiet: true });
const port = parsePort(process.env.PORT);

export default defineConfig({
  root: 'client',
  envDir: 'client',
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${port}` },
  },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: { outDir: '../dist', emptyOutDir: true },
});

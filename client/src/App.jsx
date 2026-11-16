import { useEffect, useState } from 'react';

export default function App() {
  const [status, setStatus] = useState('Checking backend connection…');

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let active = true;
    async function checkHealth() {
      try {
        const response = await fetch('/api/health', { signal: controller.signal });
        if (!response.ok) throw new Error('Health check failed');
        const data = await response.json();
        if (data.status !== 'ok' || data.service !== 'hr-email-sender') throw new Error('Unexpected response');
        if (active) setStatus('Backend connected');
      } catch {
        if (active) setStatus('Backend unavailable. Check that the API server is running.');
      } finally {
        clearTimeout(timeout);
      }
    }
    checkHealth();
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <a href="/" className="flex items-center gap-3 font-semibold tracking-tight">
            <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-xl text-white">↗</span>
            HR Email Sender
          </a>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Local workspace</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">A thoughtful first impression</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Your next opportunity starts with an email.</h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">A simple workspace for reaching out to HR, one conversation at a time.</p>
        <section aria-labelledby="workspace-heading" className="mt-10 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="workspace-heading" className="text-xl font-semibold">Workspace foundation</h2>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">Phase 1</span>
          </div>
          <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">The application is set up. Email composition, resume attachments, and sending will arrive in the next implementation phases.</p>
          <p role="status" className="mt-6 border-t border-slate-100 pt-5 text-sm font-medium text-slate-700">{status}</p>
        </section>
        <p className="mt-6 text-sm text-slate-500">Runs on your computer. No account or signup required.</p>
      </main>
    </div>
  );
}

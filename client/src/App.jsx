import { useEffect, useRef, useState } from 'react';
import { emailSchema, MAX_PDF_BYTES } from '../../shared/email-schema.js';

const emptyDraft = { recipient: '', subject: '', content: '' };
export default function App() {
  const [draft, setDraft] = useState(emptyDraft);
  const [resume, setResume] = useState(null);
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const dialog = useRef(null);
  const fileInput = useRef(null);
  const sendButton = useRef(null);
  const locked = useRef(false);
  const completed = result?.success;

  useEffect(() => {
    if (preview) dialog.current.showModal();
    else if (dialog.current?.open) { dialog.current.close(); sendButton.current?.focus(); }
  }, [preview]);

  function review(event) {
    event.preventDefault();
    if (locked.current || completed) return;
    setResult(null);
    const parsed = emailSchema.safeParse(draft);
    const nextErrors = parsed.success ? {} : Object.fromEntries(parsed.error.issues.map(i => [i.path[0], i.message]));
    if (resume && (resume.size > MAX_PDF_BYTES || !/\.pdf$/i.test(resume.name) || resume.type !== 'application/pdf')) nextErrors.resume = 'Select one PDF, up to 5 MiB.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      document.getElementById(Object.keys(nextErrors)[0])?.focus();
      return;
    }
    setPreview(parsed.data);
  }

  async function send() {
    if (locked.current || !preview) return;
    locked.current = true;
    setSending(true);
    const body = new FormData();
    Object.entries(preview).forEach(([key, value]) => body.append(key, value));
    if (resume) body.append('resume', resume);
    try {
      const response = await fetch('/api/send-email', { method: 'POST', body });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setResult({ success: false, message: data.error?.message || 'Delivery could not be confirmed. Check Gmail Sent before retrying.' });
        setErrors(data.error?.fields || {});
      } else setResult({ success: true, message: 'Email accepted for delivery. Gmail will handle delivery to the recipient.' });
    } catch {
      setResult({ success: false, message: 'Connection lost. Delivery could not be confirmed. Check Gmail Sent before retrying.' });
    } finally {
      locked.current = false;
      setSending(false);
      setPreview(null);
    }
  }

  function reset() {
    setDraft(emptyDraft); setResume(null); setErrors({}); setResult(null);
    fileInput.current.value = '';
    document.getElementById('recipient').focus();
  }
  const inputClass = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 disabled:bg-slate-50';
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <span className="flex items-center gap-3 font-semibold tracking-tight"><span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-xl text-white">↗</span>HR Email Sender</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">Local workspace</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Make a thoughtful first impression</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Start your next conversation.</h1>
        <p className="mt-3 text-slate-600">Write a personal introduction. Review it, then send with confidence.</p>
        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_240px]">
          <form onSubmit={review} noValidate className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold">Compose email</h2>
            <fieldset disabled={sending || completed} className="mt-6 space-y-5">
              {['recipient', 'subject', 'content'].map(name => <div key={name}>
                <label htmlFor={name} className="text-sm font-medium">{name === 'recipient' ? 'HR email address' : name === 'subject' ? 'Subject' : 'Email content'}</label>
                {name === 'content' ? <textarea id={name} rows={9} maxLength={20000} value={draft[name]} onChange={e => setDraft({ ...draft, [name]: e.target.value })} className={inputClass + ' resize-y'} placeholder="Hello, I’m reaching out about…" aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} />
                  : <input id={name} type={name === 'recipient' ? 'email' : 'text'} maxLength={name === 'recipient' ? 254 : 200} value={draft[name]} onChange={e => setDraft({ ...draft, [name]: e.target.value })} className={inputClass} placeholder={name === 'recipient' ? 'hr@company.com' : 'Application for…'} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} />}
                {errors[name] && <p id={`${name}-error`} className="mt-2 text-sm text-red-700">{errors[name]}</p>}
              </div>)}
              <div className="rounded-xl border border-dashed border-slate-300 p-4">
                <label htmlFor="resume" className="block text-sm font-medium">Resume <span className="font-normal text-slate-500">(optional)</span></label>
                <p id="resume-help" className="mt-1 text-xs text-slate-500">One PDF, up to 5 MiB</p>
                <input ref={fileInput} id="resume" type="file" accept=".pdf,application/pdf" onChange={e => setResume(e.target.files[0] || null)} aria-describedby="resume-help resume-error" className="mt-3 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-indigo-700" />
                {resume && <p className="mt-3 break-all text-sm">{resume.name} · {(resume.size / 1024).toFixed(1)} KiB <button type="button" onClick={() => { setResume(null); fileInput.current.value = ''; }} className="ml-2 text-indigo-700 underline">Remove</button></p>}
                <p id="resume-error" className="mt-1 text-sm text-red-700">{errors.resume}</p>
              </div>
              <button ref={sendButton} type="submit" className="primary w-full sm:w-auto">Send Email <span aria-hidden="true">↗</span></button>
              <p className="text-xs text-slate-500">You’ll review and confirm before anything is sent.</p>
            </fieldset>
            {result && <div role={result.success ? 'status' : 'alert'} className={`mt-5 rounded-xl p-4 text-sm ${result.success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
              {result.message}
              {result.success && <button type="button" className="mt-3 block font-semibold underline" onClick={reset}>Write another email</button>}
            </div>}
          </form>
          <aside className="self-start rounded-2xl bg-indigo-50 p-6 text-sm leading-relaxed text-indigo-950">
            <h2 className="font-semibold">A little care goes a long way</h2>
            <ul className="mt-4 space-y-4 text-indigo-900"><li>Use a clear, specific subject.</li><li>Keep your introduction personal and concise.</li><li>Double-check the recipient and your resume.</li></ul>
            <p className="mt-6 border-t border-indigo-100 pt-5 text-xs">Your draft stays in this tab. Closing or refreshing the page clears it.</p>
          </aside>
        </div>
      </main>
      <dialog ref={dialog} aria-labelledby="preview-title" onCancel={e => { e.preventDefault(); if (!locked.current) setPreview(null); }} className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl backdrop:bg-slate-950/50 sm:p-8">
        <h2 id="preview-title" className="text-xl font-semibold">Review your email</h2>
        {preview && <><dl className="mt-5 space-y-3 break-words text-sm"><div><dt className="text-slate-500">To</dt><dd>{preview.recipient}</dd></div><div><dt className="text-slate-500">Subject</dt><dd className="font-medium">{preview.subject}</dd></div></dl>
          <p className="my-5 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-relaxed">{preview.content}</p>
          <p className="break-all text-sm text-slate-600">Attachment: {resume ? `${resume.name} (${(resume.size / 1024).toFixed(1)} KiB)` : 'None'}</p>
          <div className="mt-6 flex flex-wrap justify-end gap-3"><button autoFocus type="button" disabled={sending} onClick={() => setPreview(null)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">Back to edit</button><button type="button" disabled={sending} onClick={send} className="primary">{sending && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}{sending ? 'Sending…' : 'Confirm and send'}</button></div>
          <p role="status" className="mt-3 text-sm text-slate-500">{sending ? 'Sending your email. Please keep this tab open.' : ''}</p>
        </>}
      </dialog>
    </div>
  );
}

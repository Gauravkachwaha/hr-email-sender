// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../client/src/App.jsx';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function fill() {
  render(<App />);
  fireEvent.change(screen.getByLabelText('HR email address'), { target: { value: 'hr@example.com' } });
  fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Application' } });
  fireEvent.change(screen.getByLabelText('Email content'), { target: { value: 'Hello\nThank you' } });
  await userEvent.click(screen.getByRole('button', { name: /Send Email/ }));
}
describe('composer', () => {
  it('validates before preview and never sends an invalid form', async () => {
    render(<App />); await userEvent.click(screen.getByRole('button', { name: /Send Email/ }));
    expect(screen.getByLabelText('HR email address').getAttribute('aria-invalid')).toBe('true'); expect(fetch).not.toHaveBeenCalled();
  });
  it('previews and cancels without sending', async () => {
    await fill(); expect(screen.getByRole('dialog')).toBeTruthy(); expect(fetch).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Back to edit' }));
    expect(screen.queryByRole('dialog')).toBeNull(); expect(screen.getByLabelText('Subject').value).toBe('Application');
  });
  it('sends only after confirmation and allows a new draft', async () => {
    await fill(); await userEvent.click(screen.getByRole('button', { name: 'Confirm and send' }));
    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = fetch.mock.calls[0]; expect(url).toBe('/api/send-email'); expect(options.body.get('recipient')).toBe('hr@example.com');
    await userEvent.click(await screen.findByRole('button', { name: 'Write another email' }));
    expect(screen.getByLabelText('Subject').value).toBe('');
  });
  it('blocks repeated submission while sending', async () => {
    let resolve; fetch.mockReturnValue(new Promise(r => { resolve = r; }));
    await fill(); const button = screen.getByRole('button', { name: 'Confirm and send' });
    fireEvent.click(button); fireEvent.click(button); expect(fetch).toHaveBeenCalledOnce(); expect(button.disabled).toBe(true);
    resolve({ ok: true, json: async () => ({ success: true }) });
    await screen.findByRole('button', { name: 'Write another email' });
  });
  it('preserves draft after a network failure', async () => {
    fetch.mockRejectedValue(new Error('offline')); await fill(); await userEvent.click(screen.getByRole('button', { name: 'Confirm and send' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Check Gmail Sent'); expect(screen.getByLabelText('Subject').value).toBe('Application');
  });
  it('shows server errors without losing the draft', async () => {
    fetch.mockResolvedValue({ ok: false, json: async () => ({ error: { message: 'Too many attempts.' } }) });
    await fill(); await userEvent.click(screen.getByRole('button', { name: 'Confirm and send' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Too many attempts.');
  });
  it('rejects invalid PDFs before preview', async () => {
    render(<App />); fireEvent.change(screen.getByLabelText(/Resume/), { target: { files: [new File(['bad'], 'resume.txt', { type: 'text/plain' })] } });
    await userEvent.click(screen.getByRole('button', { name: /Send Email/ }));
    expect(screen.getByText('Select one PDF, up to 5 MiB.')).toBeTruthy(); expect(fetch).not.toHaveBeenCalled();
  });
});

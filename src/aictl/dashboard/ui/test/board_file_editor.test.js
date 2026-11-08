// The file drawer's editor: Edit file reads the text through /api/settings/file,
// Save sends it back with the mtime it was read at, a conflict shows the server's
// message with a Reload, and a .context.toml offers the deploy command.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/preact';
import { html } from 'htm/preact';
import Drawer from '../src/components/board/Drawer.js';
import FileEditor, { serverMessage } from '../src/components/board/FileEditor.js';

const PATH = '/home/u/proj/.claude/settings.json';
const FILE = { path: PATH, text: '{\n  "env": {"KEY": "<redacted>"},\n  "a": 1\n}\n', masked: true, mtime: 1779000000.25, size: 40 };

function json(body, status = 200) {
  return { ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body), headers: new Headers() };
}

function stubFetch(onPut) {
  const calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
    const u = String(url);
    const method = opts?.method || 'GET';
    const body = opts?.body ? JSON.parse(opts.body) : null;
    calls.push({ url: u, method, body });
    if (u.startsWith('/api/settings/file') && method === 'PUT') return onPut ? onPut(body) : json({ ...FILE, text: body.text, mtime: 1779000100, backup_path: PATH + '.bak.20260101000000' });
    if (u.startsWith('/api/settings/file')) return json(FILE);
    if (u.startsWith('/api/board/excerpt')) return json({ path: PATH, line: 3, lines: [{ n: 3, text: '"a": 1' }] });
    if (u.startsWith('/api/board/file')) return json({ path: PATH, edits: [], diff: null });
    return json({ error: 'no route ' + u }, 404);
  }));
  return calls;
}

function mountDrawer(path = PATH, extra = {}) {
  const act = { openDrawer: vi.fn(), drawerBack: vi.fn(), drawerClose: vi.fn(), copy: vi.fn(), runCommand: vi.fn(), ...extra };
  const ctx = { data: { agents: [], capture_mode: 'full' }, stopped: {}, toolName: x => x, refreshKey: 1, query: '' };
  return { ...render(html`<${Drawer} stack=${[{ type: 'file', path, line: 3 }]} ctx=${ctx} act=${act}/>`), act };
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('file drawer editing', () => {
  it('Edit file reads the text, Save sends it with the mtime and shows the backup', async () => {
    const calls = stubFetch();
    const { findByRole, getByRole, findByTestId } = mountDrawer();
    fireEvent.click(await findByRole('button', { name: 'Edit file' }));
    const area = await findByRole('textbox', { name: 'File text' });
    expect(calls.some(c => c.url === '/api/settings/file?path=' + encodeURIComponent(PATH))).toBe(true);
    expect(area.value).toBe(FILE.text);
    expect(getByRole('note').textContent).toContain('keeps its real value');
    expect(getByRole('button', { name: 'Save' }).disabled).toBe(true);
    fireEvent.input(area, { target: { value: FILE.text.replace('"a": 1', '"a": 2') } });
    expect(getByRole('button', { name: 'Save' }).disabled).toBe(false);
    fireEvent.click(getByRole('button', { name: 'Save' }));
    const saved = await findByTestId('bd-fedit-saved');
    expect(saved.textContent).toContain('Backup: ' + PATH + '.bak.20260101000000');
    const put = calls.find(c => c.method === 'PUT');
    expect(put.url).toBe('/api/settings/file');
    expect(put.body).toEqual({ path: PATH, text: FILE.text.replace('"a": 1', '"a": 2'), expected_mtime: 1779000000.25 });
    // The saved text is the new base, and the excerpt is read again.
    expect(getByRole('button', { name: 'Save' }).disabled).toBe(true);
    await waitFor(() => expect(calls.filter(c => c.url.startsWith('/api/board/excerpt')).length).toBe(2));
  });

  it('shows the server message on a conflict, without the HTTP prefix, and Reload reads the file again', async () => {
    const calls = stubFetch(() => json({ error: 'The file changed since it was loaded. Reload it and make the change again.' }, 409));
    const { findByRole, getByRole, findByTestId } = mountDrawer();
    fireEvent.click(await findByRole('button', { name: 'Edit file' }));
    const area = await findByRole('textbox', { name: 'File text' });
    fireEvent.input(area, { target: { value: '{}' } });
    fireEvent.click(getByRole('button', { name: 'Save' }));
    const err = await findByTestId('bd-fedit-error');
    expect(err.textContent).toBe('The file changed since it was loaded. Reload it and make the change again.');
    const reads = calls.filter(c => c.url.startsWith('/api/settings/file?') && c.method === 'GET').length;
    fireEvent.click(getByRole('button', { name: 'Reload' }));
    await waitFor(() => expect(calls.filter(c => c.url.startsWith('/api/settings/file?') && c.method === 'GET').length).toBe(reads + 1));
    await waitFor(() => expect(getByRole('textbox', { name: 'File text' }).value).toBe(FILE.text));
  });

  it('a file aictl did not find cannot be edited, and the editor says why', async () => {
    stubFetch();
    vi.mocked(fetch).mockImplementation(async (url, opts) => (String(url).startsWith('/api/settings/file') && !(opts?.method)
      ? json({ error: 'aictl has not found this file in a scan.' }, 403) : json({ path: PATH, edits: [], diff: null })));
    const { findByRole } = mountDrawer();
    fireEvent.click(await findByRole('button', { name: 'Edit file' }));
    const alert = await findByRole('alert');
    expect(alert.textContent).toBe('aictl has not found this file in a scan.');
  });

  it('a .context.toml offers the deploy command through the confirm dialog', async () => {
    stubFetch();
    const { findByRole, act } = mountDrawer('/home/u/proj/.context.toml');
    fireEvent.click(await findByRole('button', { name: 'Deploy the context' }));
    expect(act.runCommand).toHaveBeenCalledTimes(1);
    expect(act.runCommand.mock.calls[0][0]).toMatchObject({ action: 'ctx-deploy', command: 'aictl ctx deploy' });
  });

  it('Discard changes closes the editor and the standalone component keeps its own state', async () => {
    stubFetch();
    const onClose = vi.fn();
    const { findByRole, getByRole } = render(html`<${FileEditor} path=${PATH} onClose=${onClose}/>`);
    const area = await findByRole('textbox', { name: 'File text' });
    expect(getByRole('button', { name: 'Close editor' })).toBeTruthy();
    fireEvent.input(area, { target: { value: 'x' } });
    fireEvent.click(getByRole('button', { name: 'Discard changes' }));
    expect(onClose).toHaveBeenCalled();
    expect(serverMessage(new Error('HTTP 409 /api/settings/file: taken'))).toBe('taken');
  });
});

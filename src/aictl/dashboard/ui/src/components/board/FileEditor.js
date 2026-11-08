// ─── The file editor in the file drawer ─────────────────────────
// Opens the text of a settings file aictl has found and writes it back through
// /api/settings/file. Values that look like secrets arrive masked; a line left
// as shown keeps its real value on the server. Save sends the mtime the text
// was read at, so a file changed meanwhile is refused with the server's message
// and a Reload. A saved file keeps a backup next to it.
import { html } from 'htm/preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import * as api from '../../api.js';

/** The server's own message from an api error ("HTTP 409 /api/…: message"). */
export function serverMessage(err) {
  const m = String(err?.message || err || '');
  return m.replace(/^HTTP \d+ \S+: /, '') || 'The request failed';
}

export default function FileEditor({ path, onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);

  const load = useCallback(() => {
    let live = true;
    setLoading(true);
    setError(null);
    setSaved(null);
    api.getSettingsFile(path).then((r) => {
      if (!live) return;
      setFile(r);
      setText(r.text);
      setLoading(false);
    }, (e) => {
      if (!live) return;
      setError({ message: serverMessage(e), fatal: true });
      setLoading(false);
    });
    return () => { live = false; };
  }, [path]);
  useEffect(load, [load]);

  const dirty = !!file && text !== file.text;
  const save = () => {
    if (!file || !dirty) return;
    setSaving(true);
    setError(null);
    api.saveSettingsFile(path, text, file.mtime).then((r) => {
      setFile(r);
      setText(r.text);
      setSaved(r);
      setSaving(false);
      onSaved?.(r);
    }, (e) => {
      setError({ message: serverMessage(e), conflict: e?.status === 409 });
      setSaving(false);
    });
  };
  const lines = Math.min(40, Math.max(8, text.split('\n').length + 1));
  return html`<div class="bd-fedit" data-testid="bd-file-editor">
    ${file?.masked ? html`<div class="bd-note" role="note">Values that look like secrets show as ${'<redacted>'}. A line you leave as it is keeps its real value; type the whole value on a line you change.</div>` : null}
    ${loading ? html`<div class="bd-empty" role="status">Reading the file...</div>`
      : error?.fatal ? html`<div class="bd-empty" role="alert">${error.message}</div>`
      : html`<textarea class="bd-fedit-area" aria-label="File text" spellcheck="false" rows=${lines} value=${text} disabled=${saving}
          onInput=${e => { setText(e.currentTarget.value); setSaved(null); }}/>`}
    <div class="bd-acts">
      ${!error?.fatal ? html`<button type="button" class="bd-btn bd-p" disabled=${!dirty || saving || loading} onClick=${save}>${saving ? 'Saving...' : 'Save'}</button>` : null}
      <button type="button" class="bd-btn" onClick=${onClose}>${dirty ? 'Discard changes' : 'Close editor'}</button>
      ${error?.conflict || error?.fatal ? html`<button type="button" class="bd-btn" onClick=${load}>Reload</button>` : null}
      ${error && !error.fatal ? html`<span class="bd-ag-bad" role="alert" data-testid="bd-fedit-error">${error.message}</span>` : null}
      ${saved ? html`<span class="bd-fedit-saved" role="status" data-testid="bd-fedit-saved">${'Saved. Backup: ' + saved.backup_path}</span>` : null}
      ${dirty && !error && !saved ? html`<span class="bd-ag-dim">Not saved yet</span>` : null}
    </div>
  </div>`;
}

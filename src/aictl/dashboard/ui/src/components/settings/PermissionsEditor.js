// The Claude Code permissions editor inside the inspector: the allow, deny and
// ask rules of one project settings file (project or project-local), one rule
// per line, with the pending diff, a JSON preview and the file it writes.
// Save sends the file's mtime as read, so a file changed meanwhile is refused
// with the server's message and a Reload; a saved file keeps a backup.
import { useCallback, useEffect, useState } from 'preact/hooks';
import { html } from 'htm/preact';
import * as api from '../../api.js';
import { listDiff, listToText, parseLines } from './permissions.js';

const BUCKETS = [
  { id: 'allow', label: 'Allow', hint: 'run without asking' },
  { id: 'deny', label: 'Deny', hint: 'always refused' },
  { id: 'ask', label: 'Ask', hint: 'always ask first' },
];

/** The server's own message from an api error ("HTTP 409 /api/…: message"). */
export function serverMessage(err) {
  const m = String(err?.message || err || '');
  return m.replace(/^HTTP \d+ \S+: /, '') || 'The request failed';
}

const textsOf = cfg => Object.fromEntries(BUCKETS.map(b => [b.id, listToText(cfg?.permissions?.[b.id])]));

export function DiffChips({ title, diff }) {
  const changed = diff.added.length || diff.removed.length;
  return html`<div class="st-diff" data-bucket=${title}>
    <span class="st-diff__name">${title}</span>
    <span class="st-diff__chips">
      ${changed
        ? html`${diff.added.map(x => html`<code key=${'a' + x} class="st-diff__chip is-added">+ ${x}</code>`)}
          ${diff.removed.map(x => html`<code key=${'r' + x} class="st-diff__chip is-removed">- ${x}</code>`)}`
        : html`<span class="st-dim">no change</span>`}
    </span>
  </div>`;
}

export default function PermissionsEditor({ tool, target, refresh, onClose }) {
  const [config, setConfig] = useState(null);
  const [texts, setTexts] = useState(() => textsOf(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);

  const load = useCallback(() => {
    let live = true;
    setLoading(true);
    setError(null);
    api.getToolConfig(tool, target.scope).then(
      data => {
        if (!live) return;
        setConfig(data);
        setTexts(textsOf(data));
        setLoading(false);
      },
      err => {
        if (!live) return;
        setError({ message: serverMessage(err), conflict: true });
        setLoading(false);
      },
    );
    return () => { live = false; };
  }, [tool, target.scope]);
  useEffect(() => load(), [load]);

  const next = Object.fromEntries(BUCKETS.map(b => [b.id, parseLines(texts[b.id])]));
  const current = Object.fromEntries(BUCKETS.map(b => [b.id, config?.permissions?.[b.id] || []]));
  const diffs = Object.fromEntries(BUCKETS.map(b => [b.id, listDiff(current[b.id], next[b.id])]));
  const changed = BUCKETS.some(b => JSON.stringify(current[b.id]) !== JSON.stringify(next[b.id]));
  const preview = JSON.stringify({ permissions: next }, null, 2);
  const path = config?.path || target.path;

  const save = () => {
    setSaving(true);
    setError(null);
    setSaved(null);
    api.updateToolConfig(tool, { scope: target.scope, expected_mtime: config?.mtime ?? null, permissions: next }).then(
      data => {
        setConfig(data);
        setTexts(textsOf(data));
        setSaved({ backup: data?.backup_path || '' });
        setSaving(false);
        if (typeof refresh === 'function') refresh();
      },
      err => {
        setError({ message: serverMessage(err), conflict: err?.status === 409 });
        setSaving(false);
      },
    );
  };
  const reload = () => { setSaved(null); load(); };

  return html`<section class="st-insp__sec st-editor" data-testid="st-perm-editor" aria-label="Edit permissions">
    <h4 class="st-insp__h">Edit permissions · ${target.label}</h4>
    <p class="st-hint st-editor__target" data-testid="st-editor-target">
      Writes <span class="st-mono" title=${path}>${path}</span> (${target.label})${config && !config.exists ? ', a new file' : ''}
    </p>
    ${error && html`<div class="st-editor__error" role="alert" data-testid="st-editor-error">
      <span>${error.message}</span>
      ${error.conflict && html`<button type="button" class="st-btn" onClick=${reload}>Reload</button>`}
    </div>`}
    ${saved && html`<div class="st-editor__saved" role="status" data-testid="st-editor-saved">
      ${saved.backup ? html`Saved. Backup: <span class="st-mono" title=${saved.backup}>${saved.backup}</span>` : 'Saved. The file was new, so there is no backup.'}
    </div>`}
    ${loading ? html`<p class="st-hint">Loading the file…</p>` : config && html`
      <div class="st-editor__fields">
        ${BUCKETS.map(b => html`<label key=${b.id} class="st-editor__field">
          <span class="st-editor__label">${b.label} <span class="st-dim">· ${b.hint}, one rule per line</span></span>
          <textarea class="st-editor__area" data-bucket=${b.id} rows="4" spellcheck="false" value=${texts[b.id]}
            onInput=${e => setTexts({ ...texts, [b.id]: e.currentTarget.value })}></textarea>
        </label>`)}
      </div>
      <div class="st-editor__diff" data-testid="st-editor-diff">
        <div class="st-insp__h">Pending diff</div>
        ${BUCKETS.map(b => html`<${DiffChips} key=${b.id} title=${b.id} diff=${diffs[b.id]}/>`)}
      </div>
      <pre class="st-editor__json" data-testid="st-editor-json">${preview}</pre>`}
    <div class="st-actions">
      <button type="button" class="st-btn st-btn--primary" onClick=${save} disabled=${loading || saving || !config || !changed}>${saving ? 'Saving…' : 'Save'}</button>
      <button type="button" class="st-btn" onClick=${onClose}>Cancel</button>
    </div>
  </section>`;
}

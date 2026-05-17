import { useState, useContext, useMemo, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import * as api from '../api.js';

const VIEWS = [
  { id: 'prompts',   label: 'Prompts' },
  { id: 'workflows', label: 'Workflows' },
];

// Collect prompt files from snap.tools[*].files
function collectPrompts(snap) {
  const out = [];
  for (const t of (snap?.tools || [])) {
    for (const f of (t.files || [])) {
      const path = f.path || '';
      const kind = f.kind || '';
      const isPrompt =
        path.endsWith('.prompt.md') ||
        kind === 'prompt' ||
        (kind === 'command' && path.toLowerCase().includes('/prompts/'));
      if (isPrompt) {
        const name = path.split('/').pop().replace(/\.prompt\.md$/, '').replace(/\.md$/, '');
        out.push({
          id: path,
          name,
          path,
          kind,
          tool: t.tool,
          toolLabel: t.label,
          size: f.size || 0,
          tokens: f.tokens || 0,
          mtime: f.mtime || 0,
        });
      }
    }
  }
  // Deduplicate by path
  const seen = new Set();
  return out.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
}

function fmtSize(n) {
  if (!n) return '';
  if (n < 1024) return n + 'B';
  return (n / 1024).toFixed(1) + 'K';
}

function fmtAgo(ts) {
  if (!ts) return '';
  const secs = Math.floor(Date.now() / 1000 - ts);
  if (secs < 60) return secs + 's ago';
  const m = Math.floor(secs / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

// ─── Prompt detail ───────────────────────────────────────────────
function PromptDetail({ prompt }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!prompt) { setContent(null); return; }
    let live = true;
    setLoading(true);
    setContent(null);
    api.getFile(prompt.path)
      .then(r => r.text())
      .then(text => { if (live) { setContent(text); setLoading(false); } })
      .catch(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [prompt?.path]);

  if (!prompt) {
    return html`<div class="cprompts-detail-empty">
      <div class="cprompts-detail-empty-label">Nothing selected</div>
      <div>Select a prompt from the list to view its content.</div>
    </div>`;
  }

  return html`<div class="cprompts-detail-view">
    <div class="cprompts-detail-overline">Prompt</div>
    <div class="cprompts-detail-title">${prompt.name}</div>
    <div class="cprompts-detail-meta">
      <span class="cprompts-meta-tool">${prompt.toolLabel}</span>
      ${prompt.size > 0 && html`<span> \u00b7 ${fmtSize(prompt.size)}</span>`}
      ${prompt.tokens > 0 && html`<span> \u00b7 ${prompt.tokens}t</span>`}
      ${prompt.mtime > 0 && html`<span> \u00b7 ${fmtAgo(prompt.mtime)}</span>`}
    </div>
    <div class="cprompts-detail-path">${prompt.path}</div>
    <div class="cprompts-detail-body">
      ${loading
        ? html`<div class="cprompts-loading">Loading\u2026</div>`
        : content === null
          ? html`<div class="cprompts-loading">No content available.</div>`
          : html`<pre class="cprompts-code">${content}</pre>`}
    </div>
  </div>`;
}

// ─── Empty state ─────────────────────────────────────────────────
function EmptyState({ view, hasSnap }) {
  const isPrompts = view === 'prompts';
  return html`<div class="cprompts-empty">
    <div class="cprompts-empty-icon" aria-hidden="true">${isPrompts ? '\u270F' : '\u2699\uFE0F'}</div>
    <div class="cprompts-empty-title">No ${isPrompts ? 'prompts' : 'workflows'} yet</div>
    <div class="cprompts-empty-body">
      ${isPrompts
        ? 'Save frequently-used prompts here for one-click re-use across any agent.'
        : 'Workflows chain multiple agent steps into a single automated run.'}
    </div>
    <div class="cprompts-empty-note">
      ${isPrompts && hasSnap
        ? 'No .prompt.md files found in tracked tool workspaces. Create one in your project\'s .github/prompts/ directory.'
        : `Storage backend coming soon \u2014 this tab will list and edit ${isPrompts ? '.prompt.md' : '.workflow.md'} files from your workspace.`}
    </div>
  </div>`;
}

// ─── CPromptsTab ─────────────────────────────────────────────────
export default function CPromptsTab() {
  const ctx  = useContext(SnapContext);
  const snap = ctx?.snap;

  const [view,     setView]     = useState('prompts');
  const [filter,   setFilter]   = useState('');
  const [selected, setSelected] = useState(null);

  const prompts = useMemo(() => collectPrompts(snap), [snap]);

  const filtered = useMemo(() => {
    if (view !== 'prompts') return [];
    if (!filter) return prompts;
    const q = filter.toLowerCase();
    return prompts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.path.toLowerCase().includes(q) ||
      p.toolLabel.toLowerCase().includes(q)
    );
  }, [prompts, filter, view]);

  const selectedPrompt = view === 'prompts'
    ? (filtered.find(p => p.id === selected) ?? null)
    : null;

  const handleViewSwitch = (v) => { setView(v); setFilter(''); setSelected(null); };

  return html`<div class="cprompts-shell">
    <!-- Toolbar -->
    <div class="cprompts-toolbar">
      <div class="cprompts-seg" role="group" aria-label="View selector">
        ${VIEWS.map(v => html`<button key=${v.id} type="button"
          class=${'cprompts-seg-btn' + (view === v.id ? ' is-active' : '')}
          onClick=${() => handleViewSwitch(v.id)}
          aria-pressed=${view === v.id ? 'true' : 'false'}
        >${v.label}</button>`)}
      </div>

      <div class="cprompts-filter-wrap">
        <span class="cprompts-filter-icon" aria-hidden="true">\u2315</span>
        <input class="cprompts-filter-input" type="text"
          placeholder=${'Search ' + view + '\u2026'}
          aria-label=${'Filter ' + view}
          value=${filter}
          onInput=${e => setFilter(e.target.value)}/>
      </div>

      <span style="flex:1"></span>
      <span class="cprompts-toolbar-count">${view === 'prompts' ? filtered.length : 0} ${view}</span>
    </div>

    <!-- Split pane: list + detail -->
    <div class="cprompts-body">
      <div class="cprompts-list">
        ${view === 'workflows' || filtered.length === 0
          ? html`<${EmptyState} view=${view} hasSnap=${!!snap}/>`
          : filtered.map(p => html`<div key=${p.id}
              class=${'cprompts-prompt-row' + (p.id === selected ? ' is-selected' : '')}
              onClick=${() => setSelected(p.id === selected ? null : p.id)}
              role="button" tabIndex=${0}
              onKeyDown=${e => e.key === 'Enter' && setSelected(p.id === selected ? null : p.id)}>
              <div class="cprompts-prompt-name">${p.name}</div>
              <div class="cprompts-prompt-meta">
                ${p.toolLabel}
                ${p.size > 0 ? ` \u00b7 ${fmtSize(p.size)}` : ''}
              </div>
            </div>`)}
      </div>
      <div class="cprompts-detail">
        <${PromptDetail} prompt=${selectedPrompt}/>
      </div>
    </div>
  </div>`;
}

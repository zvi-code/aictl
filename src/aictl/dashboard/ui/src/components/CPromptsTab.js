import { useState } from 'preact/hooks';
import { html } from 'htm/preact';

// CPromptsTab — Prompts & Workflows library placeholder.
// No backend storage exists yet for user prompts/workflows.
// Renders the full editorial chrome (toolbar, split-pane layout)
// with an informative empty state so the tab fits the direction-c shell.

const VIEWS = [
  { id: 'prompts',   label: 'Prompts' },
  { id: 'workflows', label: 'Workflows' },
];

function EmptyState({ view }) {
  const isPrompts = view === 'prompts';
  return html`<div class="cprompts-empty">
    <div class="cprompts-empty-icon" aria-hidden="true">${isPrompts ? '\u270F' : '\u2699\uFE0F'}</div>
    <div class="cprompts-empty-title">
      No ${isPrompts ? 'prompts' : 'workflows'} yet
    </div>
    <div class="cprompts-empty-body">
      ${isPrompts
        ? 'Save frequently-used prompts here for one-click re-use across any agent.'
        : 'Workflows chain multiple agent steps into a single automated run.'}
    </div>
    <div class="cprompts-empty-note">
      Storage backend coming soon — this tab will list and edit
      ${isPrompts ? '.prompt.md' : '.workflow.md'} files from your workspace.
    </div>
  </div>`;
}

export default function CPromptsTab() {
  const [view, setView] = useState('prompts');
  const [filter, setFilter] = useState('');

  return html`<div class="cprompts-shell">
    <!-- Toolbar -->
    <div class="cprompts-toolbar">
      <div class="cprompts-seg" role="group" aria-label="View selector">
        ${VIEWS.map(v => html`<button key=${v.id} type="button"
          class=${'cprompts-seg-btn' + (view === v.id ? ' is-active' : '')}
          onClick=${() => { setView(v.id); setFilter(''); }}
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
      <span class="cprompts-toolbar-count">0 ${view}</span>
    </div>

    <!-- Split pane: list + detail -->
    <div class="cprompts-body">
      <div class="cprompts-list">
        <${EmptyState} view=${view}/>
      </div>
      <div class="cprompts-detail">
        <div class="cprompts-detail-empty">
          <div class="cprompts-detail-empty-label">Nothing selected</div>
          <div>Select a ${view === 'prompts' ? 'prompt' : 'workflow'} from the list to view its content.</div>
        </div>
      </div>
    </div>
  </div>`;
}

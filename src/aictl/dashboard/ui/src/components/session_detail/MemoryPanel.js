import { useState, useContext, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../../context.js';
import { fmtK, esc } from '../../utils.js';
import { getSessionMemoryDiff } from '../../api.js';

function MemoryEntryRow({mem: m}) {
  const [expanded, setExpanded] = useState(false);
  const name = m.name || (m.file || '').replace(/\\\\/g,'/').split('/').pop() || 'entry';
  const preview = (m.content || '').slice(0, 300);
  return html`<div class="sd-memory-entry" style="cursor:pointer" onClick=${() => setExpanded(!expanded)}>
    <div class="flex-row gap-sm" style="align-items:center">
      <span class="badge text-xs">${m.type || m.source || 'file'}</span>
      <strong title=${m.file || m.path || ''}>${esc(name)}</strong>
      ${m.tokens ? html`<span class="text-muted">${fmtK(m.tokens)} tok</span>` : null}
      ${m.lines ? html`<span class="text-muted">${m.lines}ln</span>` : null}
      ${m.profile ? html`<span class="text-muted">${esc(m.profile)}</span>` : null}
      <span class="text-muted" style="margin-left:auto;font-size:var(--fs-2xs)">${expanded ? '\u25B2' : '\u25BC'}</span>
    </div>
    ${expanded && preview ? html`<pre class="text-muted" style="margin:var(--sp-2) 0 0;padding:var(--sp-2) var(--sp-3);
      background:var(--bg);border-radius:3px;white-space:pre-wrap;word-break:break-word;
      max-height:10rem;overflow-y:auto;font-size:var(--fs-xs);line-height:1.4">${esc(m.content)}${m.content && m.content.length > 300 ? '' : ''}</pre>` : null}
  </div>`;
}

export default function MemoryPanel({session}) {
  const {snap: s} = useContext(SnapContext);
  const memories = (s && s.agent_memory) || [];

  const project = session.project || '';
  const relevant = project
    ? memories.filter(m => {
        const mProject = m.project || m.tool || '';
        return !project || mProject.includes(project.replace(/\\/g,'/').split('/').pop());
      })
    : memories;

  return html`<div>
    <${MemoryDiffSection} sessionId=${session.session_id}/>
    ${!relevant.length
      ? html`<p class="empty-state">No memory entries found${project ? ' for this project' : ''}.</p>`
      : html`<div class="mono text-xs" style="max-height:20rem;overflow-y:auto">
          ${relevant.map((m, i) => html`<${MemoryEntryRow} key=${i} mem=${m}/>`)}
        </div>`}
  </div>`;
}

// ─── Memory diff (session start vs end) ────────────────────────

const _CHANGE_ICON = { added: '\u002B', modified: '\u25CF', removed: '\u2212' };
const _CHANGE_LABEL = { added: 'added', modified: 'modified', removed: 'removed' };

function MemoryDiffRow({file: f}) {
  const [open, setOpen] = useState(false);
  const icon = _CHANGE_ICON[f.change] || '\u00B7';
  return html`<div class="sd-memdiff-row" data-change=${f.change}>
    <div class="flex-row gap-sm" style="align-items:center;cursor:pointer;padding:var(--sp-1) 0"
         onClick=${() => setOpen(!open)} role="button" aria-expanded=${open}>
      <span class="badge text-xs" title=${_CHANGE_LABEL[f.change] || f.change}>${icon}</span>
      <code class="text-xs" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${esc(f.path)}</code>
      <span class="text-xs" style="color:var(--positive, #4caf50)">+${f.added_lines || 0}</span>
      <span class="text-xs" style="color:var(--negative, #f44336)">-${f.removed_lines || 0}</span>
      <span class="text-muted" style="font-size:var(--fs-2xs)">${open ? '\u25B2' : '\u25BC'}</span>
    </div>
    ${open && f.unified_diff ? html`<pre class="diff" style="margin:var(--sp-1) 0 var(--sp-2);padding:var(--sp-2) var(--sp-3);
      background:var(--bg);border-radius:3px;white-space:pre;overflow-x:auto;max-height:20rem;overflow-y:auto;
      font-size:var(--fs-xs);line-height:1.4;font-family:var(--font-mono, monospace)">${esc(f.unified_diff)}</pre>` : null}
  </div>`;
}

function MemoryDiffSection({sessionId}) {
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) { setDiff(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    getSessionMemoryDiff(sessionId).then((d) => {
      if (!cancelled) { setDiff(d || {files: [], summary: {}}); setLoading(false); }
    }).catch(() => {
      if (!cancelled) { setDiff({files: [], summary: {}}); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [sessionId]);

  const files = (diff && diff.files) || [];
  const summary = (diff && diff.summary) || {added: 0, modified: 0, removed: 0};

  return html`<div class="sd-memdiff" style="margin-bottom:var(--sp-3)">
    <div class="flex-row gap-sm" style="align-items:center;margin-bottom:var(--sp-2)">
      <strong class="text-sm">Memory changes this session</strong>
      ${!loading && files.length ? html`<span class="text-muted text-xs">
        ${summary.added || 0} added \u00B7 ${summary.modified || 0} modified \u00B7 ${summary.removed || 0} removed
      </span>` : null}
    </div>
    ${loading ? html`<p class="text-muted text-xs">Loading\u2026</p>`
      : !files.length ? html`<p class="empty-state text-xs">No memory changes recorded for this session.</p>`
      : html`<div class="mono text-xs">${files.map((f, i) => html`<${MemoryDiffRow} key=${f.path + i} file=${f}/>`)}</div>`}
  </div>`;
}

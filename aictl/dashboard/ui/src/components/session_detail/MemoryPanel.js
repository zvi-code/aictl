import { useState, useContext } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../../context.js';
import { fmtK, esc } from '../../utils.js';

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

  if (!relevant.length) {
    return html`<p class="empty-state">No memory entries found${project ? ' for this project' : ''}.</p>`;
  }

  return html`<div class="mono text-xs" style="max-height:20rem;overflow-y:auto">
    ${relevant.map((m, i) => html`<${MemoryEntryRow} key=${i} mem=${m}/>`)}
  </div>`;
}

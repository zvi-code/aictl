import { useContext } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../../context.js';
import { fmtK, fmtPct, esc } from '../../utils.js';
import { MODEL_WINDOWS, BASE_COMPONENTS, COMPACTION_PCT } from './helpers.js';

export default function ContextPanel({session}) {
  const {snap: s} = useContext(SnapContext);
  const filesLoaded = session.files_loaded || [];

  const model = (s?.tool_configs || []).map(c => c.model).filter(Boolean)[0] || '';
  const capacity = MODEL_WINDOWS[model] || 200000;

  const memEntries = (s && s.agent_memory) || [];
  const memTokens = memEntries.reduce((a, m) => a + (m.tokens || 0), 0);
  const fileTokens = filesLoaded.length * 150;
  const baseOverhead = BASE_COMPONENTS.reduce((a, c) => a + c.tokens, 0);
  const totalEstimated = baseOverhead + memTokens + fileTokens;
  const fillPct = Math.min((totalEstimated / capacity) * 100, 100);
  const compactionLine = COMPACTION_PCT;

  const segments = [
    ...BASE_COMPONENTS,
    {name: 'Memory', tokens: memTokens, color: 'var(--cat-memory, var(--orange))'},
    {name: 'Loaded files', tokens: fileTokens, color: 'var(--green)'},
  ].filter(seg => seg.tokens > 0);

  return html`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files in Context</div><div class="value">${filesLoaded.length}</div></div>
      <div class="es-kv-card"><div class="label">Est. Tokens Used</div><div class="value">${fmtK(totalEstimated)}</div></div>
      <div class="es-kv-card"><div class="label">Window</div><div class="value">${fmtK(capacity)}</div></div>
      <div class="es-kv-card"><div class="label">Fill</div><div class="value" style="color:${
        fillPct > 80 ? 'var(--orange)' : fillPct > 50 ? 'var(--yellow)' : 'var(--green)'
      }">${fmtPct(fillPct)}</div></div>
    </div>

    <div style="margin-bottom:var(--sp-4)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-1)">Context fill gauge</div>
      <div style="position:relative;height:16px;border-radius:4px;background:var(--border);overflow:hidden">
        <div class="flex-row" style="height:100%;position:absolute;inset:0">
          ${segments.map(seg => {
            const pct = (seg.tokens / capacity * 100).toFixed(1);
            return html`<div key=${seg.name} style="width:${pct}%;background:${seg.color};min-width:${seg.tokens > 0 ? '1px' : '0'}"
              title="${seg.name}: ~${fmtK(seg.tokens)} tokens"></div>`;
          })}
        </div>
        <div style="position:absolute;left:${compactionLine}%;top:0;bottom:0;width:1px;background:var(--red);opacity:0.7"
          title="Compaction threshold (${compactionLine}%)"></div>
      </div>
      <div class="flex-row flex-wrap gap-sm" style="margin-top:var(--sp-2)">
        ${segments.map(seg => html`<span key=${seg.name} class="text-xs">
          <span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${seg.color};margin-right:2px"></span>
          ${seg.name} ${fmtK(seg.tokens)}
        </span>`)}
        <span class="text-xs text-red">| compaction at ${compactionLine}%</span>
      </div>
    </div>

    ${filesLoaded.length > 0 && html`<div class="mono text-xs" style="max-height:10rem;overflow-y:auto">
      ${filesLoaded.map(f => html`<div key=${f} class="text-muted" style="padding:2px 0">${esc(f)}</div>`)}
    </div>`}
    ${!filesLoaded.length && html`<p class="empty-state">No context file tracking available yet. Enable hook events for full context visibility.</p>`}
  </div>`;
}

import { useMemo, useContext, useState } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { fmtK, esc, COLORS, ICONS, shortDir, normPath } from '../utils.js';

const CAT_COLORS = {
  instructions: 'var(--accent)', config: 'var(--yellow)', rules: 'var(--orange)',
  commands: 'var(--cat-commands)', skills: 'var(--cat-skills)', agent: 'var(--cat-agent)', memory: 'var(--cat-memory)',
  prompt: 'var(--cat-prompt)', transcript: 'var(--fg2)', temp: 'var(--cat-temp)',
  runtime: 'var(--cat-runtime)', credentials: 'var(--red)', extensions: 'var(--cat-extensions)',
};

const SCOPE_ORDER = ['project', 'global', 'shadow', 'session', 'external'];

// Distinct colors for individual items within a project tab
const ITEM_PALETTE = [
  '#4dc9f6', '#f67019', '#f53794', '#537bc4', '#acc236',
  '#166a8f', '#00a950', '#8549ba', '#e6194b', '#3cb44b',
  '#ffe119', '#4363d8', '#f58231', '#42d4f4', '#fabed4',
];

/** Extract top-level project name from a file path */
function getProject(path, root) {
  const p = normPath(path), r = normPath(root);
  if (!p) return '(unknown)';
  if (r && p.startsWith(r + '/')) {
    const first = p.slice(r.length + 1).split('/')[0];
    if (first.startsWith('.')) return '(root)';
    return first;
  }
  if (p.includes('/.claude/projects/')) return '(shadow)';
  if (p.includes('/.claude/') || p.includes('/.config/') || p.includes('/Library/') || p.includes('/AppData/')) return '(global)';
  return '(other)';
}

/** Short filename without extension; for generic sentinel files use parent dir */
function shortName(path) {
  if (!path) return 'unknown';
  const parts = normPath(path).split('/');
  const fname = parts.pop() || 'unknown';
  const dot = fname.lastIndexOf('.');
  const base = dot > 0 ? fname.slice(0, dot) : fname;
  // SKILL.md, index.md, README.md — identity comes from parent directory
  if (/^(SKILL|skill|index|INDEX|README|readme)$/.test(base)) {
    const parent = parts.pop();
    if (parent) return parent;
  }
  return base;
}

export default function ContextMap() {
  const { snap: s } = useContext(SnapContext);
  const [activeTab, setActiveTab] = useState(null);

  const data = useMemo(() => {
    if (!s) return null;
    const tools = s.tools.filter(t => t.tool !== 'aictl' && t.tool !== 'any');
    if (!tools.length) return null;
    const root = s.root || '';

    const byCat = {};
    const byScope = {};
    const byProj = {};
    const byPolicy = { yes: 0, 'on-demand': 0, conditional: 0, no: 0 };
    let totalTokens = 0;

    for (const t of tools) {
      for (const f of t.files) {
        const cat = f.kind || 'other';
        const scope = f.scope || 'external';
        const policy = (f.sent_to_llm || 'no').toLowerCase();
        const tok = f.tokens || 0;
        const proj = getProject(f.path, root);
        const item = shortName(f.path);

        // By category (overview bars)
        if (!byCat[cat]) byCat[cat] = { tokens: 0, files: 0, projects: {} };
        byCat[cat].tokens += tok;
        byCat[cat].files += 1;
        if (!byCat[cat].projects[proj]) byCat[cat].projects[proj] = { tokens: 0, count: 0 };
        byCat[cat].projects[proj].tokens += tok;
        byCat[cat].projects[proj].count += 1;

        // By project → category → item (tab drill-down)
        if (!byProj[proj]) byProj[proj] = { tokens: 0, count: 0, cats: {} };
        byProj[proj].tokens += tok;
        byProj[proj].count += 1;
        if (!byProj[proj].cats[cat]) byProj[proj].cats[cat] = { tokens: 0, count: 0, items: {} };
        byProj[proj].cats[cat].tokens += tok;
        byProj[proj].cats[cat].count += 1;
        if (!byProj[proj].cats[cat].items[item]) byProj[proj].cats[cat].items[item] = 0;
        byProj[proj].cats[cat].items[item] += tok;

        // By scope
        if (!byScope[scope]) byScope[scope] = { tokens: 0, files: 0 };
        byScope[scope].tokens += tok;
        byScope[scope].files += 1;

        // By policy
        if (byPolicy[policy] !== undefined) byPolicy[policy] += tok;
        else byPolicy.no += tok;

        totalTokens += tok;
      }
    }

    const cats = Object.entries(byCat).sort((a, b) => b[1].tokens - a[1].tokens);
    const scopes = SCOPE_ORDER.filter(sc => byScope[sc]).map(sc => [sc, byScope[sc]]);
    const projList = Object.entries(byProj).sort((a, b) => b[1].tokens - a[1].tokens);

    const perTool = tools
      .map(t => ({
        tool: t.tool, label: t.label,
        tokens: t.files.reduce((a, f) => a + f.tokens, 0),
        files: t.files.length,
        sentYes: t.files.filter(f => (f.sent_to_llm || '').toLowerCase() === 'yes')
          .reduce((a, f) => a + f.tokens, 0),
      }))
      .filter(t => t.tokens > 0)
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 8);

    return { cats, scopes, byPolicy, totalTokens, perTool, byCat, byProj, projList };
  }, [s]);

  if (!data) return html`<p class="empty-state">No file data available.</p>`;
  if (!data.totalTokens) return html`<p class="empty-state">No token data collected yet.</p>`;

  const maxCatTok = Math.max(...data.cats.map(([, v]) => v.tokens), 1);

  return html`<div class="diag-card" role="region" aria-label="Context window map">
    <h3 style=${{marginBottom:'var(--sp-5)'}}>Context Window Map</h3>

    <!-- Policy summary -->
    <div class="flex-row flex-wrap gap-md mb-md">
      <span class="badge--accent badge" data-dp="overview.context_map.sent_to_llm" style="background:var(--green);color:var(--bg)">
        Sent to LLM: ${fmtK(data.byPolicy.yes)} tok</span>
      <span class="badge" data-dp="overview.context_map.on_demand" style="background:var(--yellow);color:var(--bg)">
        On-demand: ${fmtK(data.byPolicy['on-demand'])} tok</span>
      <span class="badge" data-dp="overview.context_map.conditional" style="background:var(--orange);color:var(--bg)">
        Conditional: ${fmtK(data.byPolicy.conditional)} tok</span>
      <span class="badge--muted badge" data-dp="overview.context_map.not_sent">
        Not sent: ${fmtK(data.byPolicy.no)} tok</span>
    </div>

    <!-- Top stacked bar: tokens by category -->
    <div class="mb-md">
      <div class="es-section-title">Tokens by Category (${fmtK(data.totalTokens)} total)</div>
      <div class="overflow-hidden" style="display:flex;height:24px;border-radius:4px;background:var(--bg)">
        ${data.cats.map(([cat, v]) => {
          const pct = (v.tokens / data.totalTokens) * 100;
          if (pct < 0.5) return null;
          return html`<div key=${cat} style="width:${pct}%;background:${CAT_COLORS[cat] || 'var(--fg2)'};
            position:relative;min-width:2px"
            title="${cat}: ${fmtK(v.tokens)} tokens (${v.files} files)">
            ${pct > 8 ? html`<span class="text-ellipsis text-bold" style="position:absolute;inset:0;display:flex;align-items:center;
              justify-content:center;font-size:var(--fs-2xs);color:var(--bg);padding:0 2px">${cat}</span>` : null}
          </div>`;
        })}
      </div>
    </div>

    <!-- Per-category bars with project sub-segments -->
    <div class="mb-md">
      ${data.cats.map(([cat, v]) => {
        const projs = Object.entries(v.projects).sort((a, b) => b[1].tokens - a[1].tokens);
        const barW = (v.tokens / maxCatTok) * 100;
        return html`<div key=${cat} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);font-size:var(--fs-base)">
          <span class="text-bold text-right" style="width:80px;color:${CAT_COLORS[cat] || 'var(--fg2)'};flex-shrink:0">${cat}</span>
          <div class="flex-1 overflow-hidden" style="height:16px;background:var(--bg);border-radius:2px">
            <div style="width:${barW}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
              ${projs.map(([name, p], i) => {
                const elPct = v.tokens > 0 ? (p.tokens / v.tokens) * 100 : 0;
                if (elPct < 0.5) return null;
                const highlighted = !activeTab || activeTab === name;
                return html`<div key=${name} style="width:${elPct}%;height:100%;
                  background:${CAT_COLORS[cat] || 'var(--fg2)'};
                  opacity:${highlighted ? Math.max(0.3, 1 - i * 0.12) : 0.12};
                  border-right:1px solid var(--bg);
                  display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:1px;
                  cursor:pointer;transition:opacity 0.15s"
                  title="${name}: ${fmtK(p.tokens)} tok (${p.count} files)"
                  onClick=${() => setActiveTab(activeTab === name ? null : name)}>
                  ${elPct > 12 && barW > 15 ? html`<span style="font-size:9px;color:var(--bg);
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px;font-weight:600">${name}</span>` : null}
                </div>`;
              })}
            </div>
          </div>
          <span class="text-right text-muted" style="min-width:55px">${fmtK(v.tokens)} tok</span>
          <span class="text-right text-muted" style="min-width:40px">${v.files} f</span>
        </div>`;
      })}
    </div>

    <!-- Project sub-tabs -->
    <div class="flex-row flex-wrap gap-sm" style="border-bottom:1px solid var(--border);padding-bottom:var(--sp-2);margin-bottom:var(--sp-4)">
      ${data.projList.map(([proj, pd]) => {
        const isActive = activeTab === proj;
        return html`<button key=${proj}
          style="cursor:pointer;padding:var(--sp-1) var(--sp-3);font-size:var(--fs-sm);
            background:${isActive ? 'var(--accent)' : 'transparent'};
            color:${isActive ? 'var(--bg)' : 'var(--fg2)'};
            border:1px solid ${isActive ? 'var(--accent)' : 'var(--border)'};
            border-radius:4px 4px 0 0;font-weight:${isActive ? 600 : 400};border-bottom:none"
          onClick=${() => setActiveTab(isActive ? null : proj)}>
          ${proj} (${fmtK(pd.tokens)})
        </button>`;
      })}
    </div>

    <!-- Tab content: per-category bars with item sub-segments -->
    ${activeTab && data.byProj[activeTab] ? (() => {
      const pd = data.byProj[activeTab];
      const catEntries = Object.entries(pd.cats).sort((a, b) => b[1].tokens - a[1].tokens);
      const maxCT = Math.max(...catEntries.map(([, v]) => v.tokens), 1);
      return html`<div class="mb-md" style="background:var(--bg2);border-radius:6px;padding:var(--sp-4)">
        <div class="es-section-title">${activeTab} \u2014 ${fmtK(pd.tokens)} tokens across ${pd.count} files</div>
        ${catEntries.map(([cat, cd]) => {
          const allItems = Object.entries(cd.items).sort((a, b) => b[1] - a[1]);
          const top = allItems.slice(0, 15);
          const restTok = allItems.slice(15).reduce((a, [, t]) => a + t, 0);
          if (restTok > 0) top.push(['(other)', restTok]);
          const barW = (cd.tokens / maxCT) * 100;
          return html`<div key=${cat} style="margin-bottom:var(--sp-3)">
            <div class="flex-row gap-sm" style="font-size:var(--fs-base)">
              <span class="text-bold text-right" style="width:80px;color:${CAT_COLORS[cat] || 'var(--fg2)'};flex-shrink:0">${cat}</span>
              <div class="flex-1 overflow-hidden" style="height:18px;background:var(--bg);border-radius:2px">
                <div style="width:${barW}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
                  ${top.map(([name, tok], i) => {
                    const pct = cd.tokens > 0 ? (tok / cd.tokens) * 100 : 0;
                    if (pct < 0.3) return null;
                    const color = ITEM_PALETTE[i % ITEM_PALETTE.length];
                    return html`<div key=${name} style="width:${pct}%;height:100%;background:${color};
                      border-right:1px solid var(--bg);
                      display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:1px"
                      title="${name}: ${fmtK(tok)} tok">
                      ${pct > 10 && barW > 20 ? html`<span style="font-size:9px;color:#111;
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px;font-weight:700">${name}</span>` : null}
                    </div>`;
                  })}
                </div>
              </div>
              <span class="text-right text-muted" style="min-width:55px">${fmtK(cd.tokens)} tok</span>
              <span class="text-right text-muted" style="min-width:30px">${cd.count}f</span>
            </div>
            <!-- Item legend -->
            <div style="padding-left:88px;display:flex;flex-wrap:wrap;gap:var(--sp-1) var(--sp-3);margin-top:3px">
              ${top.map(([name, tok], i) => html`<span key=${name}
                style="font-size:var(--fs-xs);display:inline-flex;align-items:center;gap:3px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;
                  background:${ITEM_PALETTE[i % ITEM_PALETTE.length]};flex-shrink:0"></span>
                <span class="text-muted">${name} ${fmtK(tok)}</span>
              </span>`)}
            </div>
          </div>`;
        })}
      </div>`;
    })() : null}

    <!-- Scope + Per-tool side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-8)">
      <div>
        <div class="es-section-title">By Scope</div>
        ${data.scopes.map(([scope, v]) => html`<div key=${scope} class="flex-between"
          style="padding:var(--sp-1) var(--sp-4);font-size:var(--fs-base);background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
          <span class="text-bold">${scope}</span>
          <span class="text-muted">${v.files} files \u00B7 ${fmtK(v.tokens)} tok</span>
        </div>`)}
      </div>
      <div>
        <div class="es-section-title">By Tool</div>
        ${data.perTool.map(t => html`<div key=${t.tool} class="flex-between"
          style="padding:var(--sp-1) var(--sp-4);font-size:var(--fs-base);background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
          <span><span style="color:${COLORS[t.tool] || 'var(--fg2)'}">${ICONS[t.tool] || '\u{1F539}'}</span> ${esc(t.label)}</span>
          <span class="text-muted">${fmtK(t.sentYes)} sent \u00B7 ${fmtK(t.tokens)} total</span>
        </div>`)}
      </div>
    </div>
  </div>`;
}

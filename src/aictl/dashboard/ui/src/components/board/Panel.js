// ─── Board panel — header, fold, menu, drag, resize, and the panel body ─
// A chart with its own range (days, a memory history) does not follow the board's
// time and cannot select one. A body `view` is a component with its own state.
import { html } from 'htm/preact';
import { memo } from 'preact/compat';
import { useCallback, useMemo, useState } from 'preact/hooks';
import Chart from './Chart.js';
import { Ico, PATHS } from './icons.js';
import { HEIGHT, TITLES, WIDTHS } from './layout.js';
import { buildPanel } from './panels.js';
import Table from './Table.js';

export function Stats({ stats }) {
  return html`<div class="bd-stats">${stats.map(st => html`<div key=${st.label} class=${st.cls ? 'bd-' + st.cls : null} title=${st.title || st.label}>
    <span class="bd-l">${st.label}</span><span class="bd-v">${st.value}</span>${st.sub ? html`<span class="bd-d">${st.sub}</span>` : null}
  </div>`)}</div>`;
}

export function Segbar({ segbar }) {
  return html`<div class="bd-segbar">${segbar.parts.filter(sg => sg.w > 0.01).map(sg => html`<span key=${sg.label} class="bd-segpart" title=${sg.title} style=${{ flex: sg.w + ' 1 0', background: sg.c }}>${sg.text}</span>`)}</div>
  <div class="bd-legend">${segbar.parts.map(sg => html`<span class="bd-li" key=${sg.label}><i class="bd-sw" style=${{ background: sg.c }}></i>${sg.label}</span>`)}</div>`;
}

/** One bar per CPU core, whole machine. */
export function CoreBars({ cores }) {
  return html`<div class="bd-cores" role="img" aria-label=${cores.label}>${cores.list.map(c => html`<span key=${c.i} class=${'bd-core bd-' + c.level} title=${c.title}><b style=${{ height: c.h + '%' }}></b></span>`)}</div>`;
}

export function Actions({ actions }) {
  return html`<div class="bd-acts">${actions.map(a => (a.href
    ? html`<a key=${a.label} class="bd-btn" href=${a.href}>${a.label}</a>`
    : html`<button key=${a.label} type="button" class=${'bd-btn' + (a.cls ? ' bd-' + a.cls : '')} onClick=${a.go}>${a.label}</button>`))}</div>`;
}

const noop = {};

function PanelImpl({ pn, ctx, hiddenCols, menuOpen, over, dragging, act, sections }) {
  const { id } = pn;
  const [modes, setModes] = useState(noop);
  const [tableView, setTableView] = useState(false);
  const [folded, setFolded] = useState(noop);
  const setFold = useCallback((key, on) => setFolded(f => ({ ...f, [key]: on })), []);
  const local = useMemo(() => ({
    mode: (key, def) => modes[key] || def, tableView, folded, setFold,
  }), [modes, tableView, folded, setFold]);
  const growth = pn.h || 0;
  const body = useMemo(() => buildPanel(id, ctx, local, pn), [id, ctx, local, growth]);
  const title = TITLES[id];
  const onColToggle = k => act.toggleCol(id, k);
  const colMenu = body.table && body.hasCols
    ? body.table.cols.filter(c => !c.fixed).map(c => ({ k: c.k, label: c.l, on: !(hiddenCols || noop)[c.k] }))
    : null;
  const movableSections = sections.filter(s => s.id !== act.sectionOf(id));
  const cls = 'bd-panel' + (pn.open ? '' : ' bd-folded') + (over ? ' bd-over-' + over : '') + (dragging ? ' bd-dragging' : '');
  const pbStyle = { height: pn.open && pn.h ? pn.h + 'px' : 'auto', maxHeight: pn.open && !pn.h ? (HEIGHT[id] || 'none') : 'none' };
  return html`<section class=${cls} id=${'p-' + id} style=${{ gridColumn: 'span ' + pn.span }} aria-label=${title}
    onDragOver=${e => act.dragOverPanel(e, id)} onDrop=${e => act.dropOnPanel(e, id)}>
    <div class="bd-ph" draggable="true" onDragStart=${e => act.dragStart(e, id)} onDragEnd=${act.dragEnd}>
      <span class="bd-grip" title="Drag this header to move the panel"><${Ico} d=${PATHS.grip} sw="2"/></span>
      <h3>${title}</h3>
      <span class="bd-psub" title=${body.sub}>${body.sub}</span>
      ${(body.modes || []).map(md => {
        const cur = modes[md.key] || md.def;
        return html`<div key=${md.key} class="bd-seg bd-seg-sm" role="group" aria-label=${md.label}>
          ${md.items.map(([mid, label]) => html`<button key=${mid} type="button" aria-pressed=${cur === mid ? 'true' : 'false'} onClick=${() => setModes({ ...modes, [md.key]: mid })}>${label}</button>`)}
        </div>`;
      })}
      <div class="bd-anch">
        <button type="button" class="bd-ib-btn" aria-label=${'Options for ' + title} aria-expanded=${menuOpen ? 'true' : 'false'} onClick=${() => act.toggleMenu('panel:' + id)}><${Ico} d=${PATHS.dots} sw="2"/></button>
        ${menuOpen ? html`<div class="bd-menu" style="right:0;top:28px">
          <h4>Width</h4>
          <div class="bd-menuseg"><div class="bd-seg">${WIDTHS.map(w => html`<button key=${w} type="button" aria-pressed=${pn.span === w ? 'true' : 'false'} onClick=${() => act.setSpan(id, w)}>${w === 12 ? 'Full' : w + '/12'}</button>`)}</div></div>
          <button type="button" class="bd-mi" onClick=${() => act.step(id, -1)}>Move earlier</button>
          <button type="button" class="bd-mi" onClick=${() => act.step(id, 1)}>Move later</button>
          <button type="button" class="bd-mi" onClick=${() => act.growBy(id, 40)}>Make taller</button>
          <button type="button" class="bd-mi" onClick=${() => act.growBy(id, -40)}>Make shorter</button>
          ${body.canTable ? html`<button type="button" class="bd-mi" onClick=${() => { setTableView(v => !v); act.closeMenu(); }}>${tableView ? 'Show as chart' : 'Show as table'}</button>` : null}
          ${colMenu ? html`<div class="bd-mdiv"></div><h4>Columns</h4>
            ${colMenu.map(cm => html`<button key=${cm.k} type="button" class="bd-mi" role="menuitemcheckbox" aria-checked=${cm.on ? 'true' : 'false'} onClick=${() => onColToggle(cm.k)}><span class=${'bd-check' + (cm.on ? ' bd-on' : '')}>${cm.on ? html`<${Ico} d=${PATHS.check}/>` : null}</span>${cm.label}</button>`)}` : null}
          <div class="bd-mdiv"></div><h4>Move to a section</h4>
          ${movableSections.map(s => html`<button key=${s.id} type="button" class="bd-mi" onClick=${() => act.moveToSection(id, s.id)}>${s.title}</button>`)}
          <div class="bd-mdiv"></div>
          <button type="button" class="bd-mi" onClick=${() => act.hide(id)}>Hide this panel</button>
        </div>` : null}
      </div>
      <button type="button" class="bd-ib-btn" aria-label=${pn.open ? 'Fold this panel' : 'Unfold this panel'} title=${pn.open ? 'Fold this panel' : 'Unfold this panel'} aria-expanded=${pn.open ? 'true' : 'false'} onClick=${() => act.toggleFold(id)}><${Ico} d=${PATHS.chev} cls=${'bd-chev' + (pn.open ? ' bd-open' : '')}/></button>
    </div>
    ${pn.open ? html`<div class="bd-pb" style=${pbStyle}>
      ${body.banner ? html`<div class="bd-pbanner" role="alert" title=${body.banner}><${Ico} d=${PATHS.warn}/>${body.banner}</div>` : null}
      ${body.stats ? html`<${Stats} stats=${body.stats}/>` : null}
      ${body.segbar ? html`<${Segbar} segbar=${body.segbar}/>` : null}
      ${body.view ? html`<${body.view.C} ...${body.view.props} ctx=${ctx}/>` : null}
      ${body.chart ? (body.chart.range
        ? html`<${Chart} ...${body.chart} sel=${null} onSelect=${null}/>`
        : html`<${Chart} ...${body.chart} range=${ctx.chartRange} sel=${ctx.sel} onSelect=${act.select}/>`) : null}
      ${body.cores ? html`<${CoreBars} cores=${body.cores}/>` : null}
      ${body.table ? html`<${Table} def=${body.table} hidden=${hiddenCols} label=${title}/>` : null}
      ${body.actions ? html`<${Actions} actions=${body.actions}/>` : null}
      ${body.note ? html`<div class="bd-note" title=${body.note}>${body.note}</div>` : null}
    </div><span class="bd-rz" title="Drag to resize" onMouseDown=${e => act.startResize(e, id, pn.span)}></span>` : null}
  </section>`;
}

export default memo(PanelImpl);

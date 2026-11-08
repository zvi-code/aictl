// ─── Board table — the same behaviour in every panel and in the drawer ─
import { html } from 'htm/preact';
import { useMemo, useState } from 'preact/hooks';
import { useColumnWidths } from './colWidths.js';
import { tailPath } from './format.js';
import { Ico, PATHS } from './icons.js';
import { nextSort, tableModel } from './tableModel.js';

const stop = fn => e => { e.stopPropagation(); fn(e); };

function Cell({ col, x, go, primary }) {
  const cls = 'bd-' + [col.n ? 'n' : '', col.m ? 'm' : '', x.cls || ''].join(' ').trim().split(/\s+/).join(' bd-');
  const title = x.title != null ? x.title : String(x.v == null ? '' : x.v);
  // A path keeps its end: the file name is what a person looks for.
  const text = x.path ? tailPath(x.v, x.keep || 3) : x.v;
  const label = x.go || (primary && go)
    ? html`<button type="button" class="bd-lnk" onClick=${stop(x.go || go)}>${text}</button>`
    : text;
  const rich = x.foldOn || x.foldSp || x.sw || x.dot || x.warn || x.sub || x.pad || x.chips || x.links;
  let body;
  if (x.barOn) {
    body = html`<div class="bd-ibw"><span class="bd-ib" style="max-width:70px"><b style=${{ width: x.bar + '%', background: x.barC }}></b></span><span>${x.v}</span></div>`;
  } else if (x.spark !== undefined) {
    body = html`<svg class="bd-sp16" viewBox="0 0 60 16" preserveAspectRatio="none" aria-hidden="true" stroke=${x.sparkC}><path d=${x.spark}></path></svg>`;
  } else if (rich) {
    body = html`<div class="bd-cellrow" style=${x.pad ? { paddingLeft: x.pad + 'px' } : null}>
      ${x.foldOn && html`<button type="button" class="bd-foldb" aria-label=${x.foldLabel} aria-expanded=${x.foldOpen ? 'true' : 'false'} onClick=${stop(x.fold)}><${Ico} d=${PATHS.chev} cls=${'bd-chev' + (x.foldOpen ? ' bd-open' : '')}/></button>`}
      ${x.foldSp && html`<span class="bd-foldsp"></span>`}
      ${x.sw && html`<i class="bd-sw" style=${{ background: x.sw }}></i>`}
      ${x.dot && html`<span class="bd-st"><i style=${{ background: x.dot }}></i></span>`}
      ${x.warn && html`<${Ico} d=${PATHS.warn} style="color:var(--warnink)"/>`}
      ${x.chips ? x.chips.map((c, i) => html`<span key=${i} class=${'bd-tag bd-tag-' + (c.sev || 'info')} title=${c.title || c.text}>${c.text}</span>`) : null}
      <span class="bd-tx">${x.links ? x.links.map((l, i) => html`<a key=${i} class="bd-lnk bd-pr" href=${l.href} target="_blank" rel="noreferrer" title=${l.title || l.text} onClick=${e => e.stopPropagation()}>${l.text}</a>`) : label}${x.sub ? html`<span class="bd-subv">${x.sub}</span>` : null}</span>
    </div>`;
  } else body = label;
  return html`<td class=${cls} title=${title}>${body}</td>`;
}

/** A table definition plus its own sort and "show all" state. */
export default function Table({ def, hidden, sort: sortProp, onSort, label }) {
  const [localSort, setLocalSort] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const sort = sortProp !== undefined ? sortProp : localSort;
  const m = useMemo(() => tableModel(def, { sort, hidden: hidden || {}, showAll }), [def, sort, hidden, showAll]);
  const setSort = onSort || setLocalSort;
  const primaryKey = def.primary && m.cols.some(c => c.k === def.primary) ? def.primary : (m.cols.length ? m.cols[0].k : null);
  // Widths dragged by the person win; the table then lays out at exactly those widths.
  const cw = useColumnWidths(def.key || label || null);
  const pxOf = c => cw.widths[c.k] || parseInt(c.width, 10) || c.minw || 130;
  const tableStyle = cw.set
    ? { tableLayout: 'fixed', width: m.cols.reduce((s, c) => s + pxOf(c), 0) + 'px' }
    : { minWidth: m.min + 'px' };
  return html`<div class="bd-tw">
    ${m.rows.length || !m.none ? html`<table class=${'bd-t' + (cw.set ? ' bd-fixed' : '')} style=${tableStyle}>
      ${label ? html`<caption>${label}</caption>` : null}
      <thead><tr>${m.cols.map(c => html`<th key=${c.k} scope="col" class=${(c.n ? 'bd-n ' : '') + (c.on ? 'bd-on' : '')} data-col=${c.k} style=${{ width: cw.set ? pxOf(c) + 'px' : c.width }} title=${c.t || c.l}
        aria-sort=${c.on ? (c.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        ${c.sortable
          ? html`<button type="button" onClick=${() => setSort(nextSort(c, m.sorted))}>${c.l}<span aria-hidden="true">${c.on ? (c.dir === 'asc' ? ' ↑' : ' ↓') : ''}</span></button>`
          : html`<span class="bd-thx" title=${(c.t || c.l) + '. This column shows a picture and does not sort.'}>${c.l}</span>`}${cw.grip(c.k)}
      </th>`)}</tr></thead>
      <tbody>${m.rows.map((r, idx) => html`<tr key=${r.id != null ? r.id : idx}
        class=${[r.go ? 'bd-rowgo' : '', r.level ? 'bd-child' : '', r.group ? 'bd-group' : ''].join(' ').trim() || null}
        onClick=${r.go || null}>
        ${m.cols.map(c => html`<${Cell} key=${c.k} col=${c} x=${r.cells[c.k] || { v: '' }} go=${r.go} primary=${c.k === primaryKey}/>`)}
      </tr>`)}</tbody>
    </table>` : null}
    ${m.none ? html`<div class="bd-empty">${m.none}</div>` : null}
    ${m.limited ? html`<button type="button" class="bd-more" onClick=${() => setShowAll(true)}>Showing ${m.limit} of ${m.total}. Show all</button>` : null}
    ${showAll && m.total > (def.limit || Infinity) ? html`<button type="button" class="bd-more" onClick=${() => setShowAll(false)}>Show the first ${def.limit}</button>` : null}
  </div>`;
}

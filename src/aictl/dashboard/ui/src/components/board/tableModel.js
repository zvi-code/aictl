// ─── tableModel — sort, tree, group, limit and width for every board table ─
// A row: {id, parentId, level, go, sort: {colKey: value}, cells: {colKey: cell}}.
// Sorting uses row.sort. A null sort value goes last in either direction.

const nullish = v => v === null || v === undefined;

function compare(k, dir) {
  const sgn = dir === 'asc' ? 1 : -1;
  return (a, b) => {
    const x = a.sort?.[k];
    const y = b.sort?.[k];
    if (x === y) return 0;
    if (nullish(x)) return 1;
    if (nullish(y)) return -1;
    return (x > y ? 1 : -1) * sgn;
  };
}

function sortRows(rows, sorted, tree) {
  if (!sorted) return rows;
  const cmp = compare(sorted.k, sorted.dir);
  if (!tree) return [...rows].sort(cmp);
  const roots = rows.filter(r => !r.level).sort(cmp);
  const byParent = new Map();
  for (const r of rows) {
    if (!r.level) continue;
    if (!byParent.has(r.parentId)) byParent.set(r.parentId, []);
    byParent.get(r.parentId).push(r);
  }
  const out = [];
  for (const rt of roots) {
    out.push(rt);
    const kids = byParent.get(rt.id);
    if (kids) out.push(...kids);
  }
  return out;
}

export function widthOf(col, sortedHere) {
  const px = parseInt(col.w, 10);
  if (!px) return 0;
  return Math.max(px, Math.ceil(col.l.length * 6.6) + 12 + (sortedHere ? 13 : 0));
}

/** Next sort after a click on a header. Numbers start high to low, text low to high. */
export function nextSort(col, current) {
  const on = current && current.k === col.k;
  if (col.n) return { k: col.k, dir: on && current.dir === 'desc' ? 'asc' : 'desc' };
  return { k: col.k, dir: on && current.dir === 'asc' ? 'desc' : 'asc' };
}

export function tableModel(def, { sort = null, hidden = {}, showAll = false } = {}) {
  const { cols, rows, sort: defaultSort = null, tree = false, limit = 0, groupRow = null, none = 'Nothing matches these filters.', columns = false } = def;
  const sorted = sort || defaultSort;
  const shown = cols.filter(c => !hidden[c.k]);
  let list = sortRows(rows, sorted, tree);
  const total = list.length;
  const limited = !!limit && !showAll && list.length > limit;
  if (limited) list = list.slice(0, limit);
  if (groupRow) {
    const keys = [...new Set(list.map(r => r.groupKey))];
    const out = [];
    for (const k of keys) {
      const members = list.filter(r => r.groupKey === k);
      const g = groupRow(k, members);
      out.push(g);
      if (!g.folded) out.push(...members);
    }
    list = out;
  }
  const min = shown.reduce((s, c) => s + (widthOf(c, sorted && sorted.k === c.k) || c.minw || 130), 0);
  return {
    cols: shown.map(c => {
      const on = !!sorted && sorted.k === c.k;
      const px = widthOf(c, on);
      return { ...c, on, dir: on ? sorted.dir : null, width: px ? px + 'px' : 'auto' };
    }),
    rows: list,
    min,
    none: list.length ? null : none,
    total,
    limited,
    limit,
    sorted,
    colMenu: columns ? cols.filter(c => !c.fixed).map(c => ({ k: c.k, label: c.l, on: !hidden[c.k] })) : null,
  };
}

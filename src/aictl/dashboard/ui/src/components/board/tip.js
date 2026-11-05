// ─── One tooltip for every chart ──────────────────────────────────
// Written straight to one element, so moving over a chart renders no component.
let el = null;
export const bindTip = node => { el = node; };

export function showTip(x, y, tip) {
  if (!el) return;
  el.textContent = '';
  const h = document.createElement('h5');
  h.textContent = tip.title;
  el.appendChild(h);
  for (const r of tip.rows) {
    const row = document.createElement('div');
    const name = document.createElement('span');
    const mark = document.createElement('i');
    mark.style.background = r.c;
    name.appendChild(mark);
    name.appendChild(document.createTextNode(r.label));
    const val = document.createElement('b');
    val.textContent = r.value;
    row.appendChild(name);
    row.appendChild(val);
    el.appendChild(row);
  }
  const w = window.innerWidth;
  const hgt = window.innerHeight;
  const est = 40 + tip.rows.length * 18;
  el.style.left = (x + 260 > w ? x - 250 : x + 12) + 'px';
  el.style.top = (y + est + 12 > hgt ? y - est - 8 : y + 12) + 'px';
  el.hidden = false;
}
export function hideTip() { if (el) el.hidden = true; }

// ─── Board icons — small inline strokes, drawn in the text color ─
import { html } from 'htm/preact';

export const PATHS = {
  top: 'M2.5 2.5h4.5v5H2.5zM9 2.5h4.5v3H9zM9 7.5h4.5v6H9zM2.5 9.5h4.5v4H2.5z',
  agents: 'M8 2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM3 13.5c.6-2.8 2.5-4 5-4s4.4 1.2 5 4',
  usage: 'M3 13.5V8M8 13.5V3M13 13.5V6',
  prompts: 'M2.5 3.5h11v7h-6l-3 3v-3h-2z',
  tools: 'M10 2.5a3.5 3.5 0 0 0-3.3 4.7L2.5 11.4l2.1 2.1 4.2-4.2A3.5 3.5 0 0 0 13.2 5l-2 2-2-2 2-2a3.5 3.5 0 0 0-1.2-.5z',
  changes: 'M4 2.5v7M4 12v1.5M12 2.5v11M9.5 5l2.5-2.5L14.5 5M1.5 7.5L4 10l2.5-2.5',
  resources: 'M3 3.5h10v9H3zM6 6.5h4v3H6z',
  effect: 'M3 2.5v11M8 2.5v11M13 2.5v11M1.5 5h3M6.5 10.5h3M11.5 6.5h3',
  sources: 'M2.5 4c0-1 2.5-1.5 5.5-1.5s5.5.5 5.5 1.5-2.5 1.5-5.5 1.5S2.5 5 2.5 4zM2.5 4v8c0 1 2.5 1.5 5.5 1.5s5.5-.5 5.5-1.5V4M2.5 8c0 1 2.5 1.5 5.5 1.5s5.5-.5 5.5-1.5',
  menu: 'M2.5 3.5h11M2.5 8h11M2.5 12.5h11',
  search: 'M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM11 11l3 3',
  layout: 'M2.5 2.5h4.5v6H2.5zM9.5 2.5h4v3.5h-4zM9.5 8.5h4v5h-4zM2.5 11h4.5v2.5H2.5z',
  down: 'M4 6l4 4 4-4',
  close: 'M4 4l8 8M12 4l-8 8',
  chev: 'M6 3.5L10.5 8 6 12.5',
  dots: 'M3 8v.01M8 8v.01M13 8v.01',
  grip: 'M6 3v.01M10 3v.01M6 8v.01M10 8v.01M6 13v.01M10 13v.01',
  back: 'M10 3L5 8l5 5',
  up: 'M8 13V3M4 7l4-4 4 4',
  dn: 'M8 3v10M4 9l4 4 4-4',
  warn: 'M8 2.5l6.5 11h-13zM8 6.5v3.5M8 12v.01',
  check: 'M3.5 8.5l3 3 6-7',
  detail: 'M3 3h10v10H3zM3 6.5h10M6.5 6.5V13',
};
export const Ico = ({ d, cls = '', sw, style }) => html`<svg class=${'bd-i ' + cls} viewBox="0 0 16 16" aria-hidden="true" style=${style} stroke-width=${sw}><path d=${d}></path></svg>`;

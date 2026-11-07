import { useState } from 'preact/hooks';
import { html } from 'htm/preact';
import { Markdown } from './Markdown.js';
import './markdown.css';

const STORE_KEY = 'aictl-text-view';
const MD_EXT = /\.(md|markdown|mdx)$/i;

export function looksLikeMarkdown(path, text) {
  if (path) return MD_EXT.test(String(path));
  const t = String(text || '');
  if (t.startsWith('---')) return true;
  const first = t.split('\n').find((l) => l.trim() !== '');
  return !!first && first.startsWith('#');
}

function readStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}

function writeChoice(kind, value) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ ...readStore(), [kind]: value })); } catch { /* storage unavailable */ }
}

export function TextView({ text, path, source, prefer = null }) {
  const kind = looksLikeMarkdown(path, text) ? 'markdown' : 'text';
  const [choice, setChoice] = useState(null);
  const stored = readStore()[kind];
  // `prefer` (a file opened at a line asks for source) wins over the stored choice until the user picks one here.
  const mode = choice || prefer || (stored === 'rendered' || stored === 'source' ? stored : (kind === 'markdown' ? 'rendered' : 'source'));
  const pick = (m) => { setChoice(m); writeChoice(kind, m); };
  const btn = (m, label) => html`<button type="button" class=${'tv-btn' + (mode === m ? ' on' : '')}
    aria-pressed=${mode === m} onClick=${() => pick(m)}>${label}</button>`;
  return html`<div class="tv">
    <div class="tv-head"><span class="tv-seg" role="group" aria-label="Text view">${btn('rendered', 'Rendered')}${btn('source', 'Source')}</span></div>
    ${mode === 'rendered' ? html`<${Markdown} text=${text}/>` : source}
  </div>`;
}

export default TextView;

import { h } from 'preact';
import { html } from 'htm/preact';
import './markdown.css';

// Markdown to Preact vnodes. Every piece of file text becomes a text node,
// so raw HTML in the text is shown as text and never parsed.

const SAFE_HREF = /^(https?:|mailto:)/i;
const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)/;
const HEADING = /^ {0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
const HRULE = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const QUOTE = /^ {0,3}>\s?(.*)$/;
const TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const BARE_URL = /https?:\/\/[^\s<>]+/y;
const isBlank = (l) => l.trim() === '';
const indentOf = (l) => l.match(/^\s*/)[0].replace(/\t/g, '    ').length;

function safeHref(url) {
  const u = (url || '').trim();
  return SAFE_HREF.test(u) ? u : null;
}

function link(href, children) {
  return h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, children);
}

// Index of the closing delimiter for an emphasis run, or -1.
function findClose(s, from, delim) {
  let i = from;
  while (i < s.length) {
    if (s[i] === '\\') { i += 2; continue; }
    if (s[i] === '`') {
      const end = s.indexOf('`', i + 1);
      i = end === -1 ? i + 1 : end + 1;
      continue;
    }
    if (s.startsWith(delim, i)) {
      if (delim.length === 1 && (s[i + 1] === delim || s[i - 1] === delim)) { i += 1; continue; }
      if (i > from) return i;
    }
    i += 1;
  }
  return -1;
}

// Index of the bracket that closes the one at `open`, or -1.
function matchBracket(s, open, o, c) {
  let depth = 0;
  for (let i = open; i < s.length; i += 1) {
    if (s[i] === '\\') { i += 1; continue; }
    if (s[i] === o) depth += 1;
    else if (s[i] === c) { depth -= 1; if (depth === 0) return i; }
  }
  return -1;
}

function inline(s) {
  const out = [];
  let buf = '';
  const flush = () => { if (buf) { out.push(buf); buf = ''; } };
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '\\' && i + 1 < s.length && /[\\`*_{}[\]()#+\-.!|~<>]/.test(s[i + 1])) {
      buf += s[i + 1]; i += 2; continue;
    }
    if (ch === '\n') {
      if (buf.endsWith('  ') || buf.endsWith('\\')) {
        buf = buf.replace(/( {2,}|\\)$/, '');
        flush(); out.push(h('br', null));
      } else buf += ' ';
      i += 1; continue;
    }
    if (ch === '`') {
      let n = 1;
      while (s[i + n] === '`') n += 1;
      const run = '`'.repeat(n);
      const end = s.indexOf(run, i + n);
      if (end !== -1) {
        flush();
        out.push(h('code', { class: 'md-icode' }, s.slice(i + n, end).replace(/^ (.*) $/, '$1')));
        i = end + n; continue;
      }
      buf += run; i += n; continue;
    }
    if ((ch === '!' && s[i + 1] === '[') || ch === '[') {
      const isImg = ch === '!';
      const open = isImg ? i + 1 : i;
      const close = matchBracket(s, open, '[', ']');
      if (close !== -1 && s[close + 1] === '(') {
        const pEnd = matchBracket(s, close + 1, '(', ')');
        if (pEnd !== -1) {
          flush();
          const label = s.slice(open + 1, close);
          const url = s.slice(close + 2, pEnd).trim().split(/\s+/)[0] || '';
          if (isImg) {
            out.push(h('span', { class: 'md-image', title: url }, 'image: ' + label + ' (' + url + ')'));
          } else {
            const href = safeHref(url);
            const kids = inline(label);
            out.push(href ? link(href, kids) : h('span', null, kids));
          }
          i = pEnd + 1; continue;
        }
      }
    }
    if (ch === 'h' && (i === 0 || /[\s(]/.test(s[i - 1]))) {
      BARE_URL.lastIndex = i;
      const m = BARE_URL.exec(s);
      if (m) {
        const url = m[0].replace(/[.,;:!?)\]'"]+$/, '');
        flush(); out.push(link(url, url));
        i += url.length; continue;
      }
    }
    if (ch === '*' || ch === '_' || ch === '~') {
      const wide = s.startsWith(ch + ch, i);
      const delim = ch === '~' ? (wide ? '~~' : null) : (wide ? ch + ch : ch);
      const wordBefore = i > 0 && /\w/.test(s[i - 1]);
      if (delim && !(ch === '_' && wordBefore) && !/\s/.test(s[i + delim.length] || ' ')) {
        const end = findClose(s, i + delim.length, delim);
        if (end !== -1) {
          flush();
          const kids = inline(s.slice(i + delim.length, end));
          const tag = ch === '~' ? 'del' : delim.length === 2 ? 'strong' : 'em';
          out.push(h(tag, null, kids));
          i = end + delim.length; continue;
        }
      }
    }
    buf += ch; i += 1;
  }
  flush();
  return out;
}

function splitRow(line) {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|') && !t.endsWith('\\|')) t = t.slice(0, -1);
  return t.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
}

function frontMatter(lines) {
  if (lines[0] !== '---') return null;
  let end = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') { end = i; break; }
  }
  if (end === -1) return null;
  const rows = [];
  for (const l of lines.slice(1, end)) {
    if (isBlank(l)) continue;
    const m = l.match(/^([A-Za-z0-9_.-]+):\s*(.*)$/);
    if (m) rows.push([m[1], m[2]]);
    else if (rows.length) rows[rows.length - 1][1] += (rows[rows.length - 1][1] ? '\n' : '') + l.trim();
  }
  return { rows, end };
}

function startsBlock(l) {
  return FENCE.test(l) || HEADING.test(l) || HRULE.test(l) || QUOTE.test(l) || ITEM.test(l);
}

function parseList(lines, start) {
  const first = lines[start].match(ITEM);
  const base = indentOf(lines[start]);
  const ordered = /\d/.test(first[2]);
  const items = [];
  let i = start;
  while (i < lines.length) {
    const m = lines[i].match(ITEM);
    if (!m || indentOf(lines[i]) !== base || /\d/.test(m[2]) !== ordered) break;
    const body = [m[3]];
    i += 1;
    while (i < lines.length) {
      const l = lines[i];
      if (isBlank(l)) {
        let j = i;
        while (j < lines.length && isBlank(lines[j])) j += 1;
        if (j < lines.length && indentOf(lines[j]) > base) { body.push(''); i += 1; continue; }
        break;
      }
      if (indentOf(l) > base) { body.push(l.replace(/^\s{1,4}/, '')); i += 1; continue; }
      break;
    }
    items.push(body);
    while (i < lines.length && isBlank(lines[i])) {
      const j = lines.slice(i).findIndex((x) => !isBlank(x));
      if (j !== -1 && ITEM.test(lines[i + j]) && indentOf(lines[i + j]) === base
          && /\d/.test(lines[i + j].match(ITEM)[2]) === ordered) i += j; else break;
    }
  }
  const lis = items.map((body) => {
    let text = body[0];
    let task = null;
    const t = text.match(/^\[([ xX])\]\s+(.*)$/);
    if (t) { task = t[1] !== ' '; text = t[2]; }
    const blocks = blocksOf([text, ...body.slice(1)]);
    const glyph = task === null ? null
      : h('span', { class: 'md-task', 'aria-label': task ? 'done' : 'not done' }, task ? '☑' : '☐');
    return h('li', { class: task === null ? null : 'md-task-item' }, glyph, blocks);
  });
  return { node: h(ordered ? 'ol' : 'ul', null, lis), next: i };
}

function blocksOf(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (isBlank(l)) { i += 1; continue; }
    const f = l.match(FENCE);
    if (f) {
      const marker = f[1];
      const body = [];
      i += 1;
      while (i < lines.length && !new RegExp('^ {0,3}' + marker[0] + '{' + marker.length + ',}\\s*$').test(lines[i])) {
        body.push(lines[i]); i += 1;
      }
      i += 1;
      out.push(h('div', { class: 'md-codeblock' },
        f[2] ? h('span', { class: 'md-lang' }, f[2]) : null,
        h('pre', null, h('code', null, body.join('\n')))));
      continue;
    }
    const hm = l.match(HEADING);
    if (hm) { out.push(h('h' + hm[1].length, null, inline(hm[2]))); i += 1; continue; }
    if (HRULE.test(l)) { out.push(h('hr', null)); i += 1; continue; }
    if (QUOTE.test(l)) {
      const body = [];
      while (i < lines.length && QUOTE.test(lines[i])) { body.push(lines[i].match(QUOTE)[1]); i += 1; }
      out.push(h('blockquote', null, blocksOf(body)));
      continue;
    }
    if (ITEM.test(l)) {
      const r = parseList(lines, i);
      out.push(r.node); i = r.next; continue;
    }
    if (l.includes('|') && i + 1 < lines.length && lines[i + 1].includes('-') && TABLE_SEP.test(lines[i + 1])
        && lines[i + 1].includes('|')) {
      const head = splitRow(l);
      const aligns = splitRow(lines[i + 1]).map((c) => (c.startsWith(':') && c.endsWith(':') ? 'center'
        : c.endsWith(':') ? 'right' : c.startsWith(':') ? 'left' : null));
      const rows = [];
      i += 2;
      while (i < lines.length && !isBlank(lines[i]) && lines[i].includes('|')) { rows.push(splitRow(lines[i])); i += 1; }
      const cell = (tag, c, k) => h(tag, { style: aligns[k] ? 'text-align:' + aligns[k] : null }, inline(c));
      out.push(h('div', { class: 'md-table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, head.map((c, k) => cell('th', c, k)))),
        h('tbody', null, rows.map((r) => h('tr', null, head.map((_, k) => cell('td', r[k] || '', k))))))));
      continue;
    }
    if (indentOf(l) >= 4) {
      const body = [];
      while (i < lines.length && (indentOf(lines[i]) >= 4 || (isBlank(lines[i]) && i + 1 < lines.length && indentOf(lines[i + 1]) >= 4))) {
        body.push(lines[i].replace(/^( {4}|\t)/, '')); i += 1;
      }
      out.push(h('div', { class: 'md-codeblock' }, h('pre', null, h('code', null, body.join('\n')))));
      continue;
    }
    const para = [l.replace(/^\s+/, '')];
    i += 1;
    while (i < lines.length && !isBlank(lines[i]) && !startsBlock(lines[i])) { para.push(lines[i].replace(/^\s+/, '')); i += 1; }
    out.push(h('p', null, inline(para.join('\n'))));
  }
  return out;
}

export function Markdown({ text }) {
  const lines = String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n');
  const fm = frontMatter(lines);
  const body = fm ? lines.slice(fm.end + 1) : lines;
  return html`<div class="md">
    ${fm && fm.rows.length ? h('table', { class: 'md-fm' },
      h('caption', null, 'Front matter'),
      h('tbody', null, fm.rows.map(([k, v]) => h('tr', null, h('th', null, k), h('td', null, v))))) : null}
    ${blocksOf(body)}
  </div>`;
}

export default Markdown;

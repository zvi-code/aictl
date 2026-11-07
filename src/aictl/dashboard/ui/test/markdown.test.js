import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/preact';
import { html } from 'htm/preact';
import { Markdown } from '../src/components/ui/Markdown.js';
import { TextView, looksLikeMarkdown } from '../src/components/ui/TextView.js';

beforeEach(() => { cleanup(); try { localStorage.clear(); } catch { /* none */ } });
afterEach(() => cleanup());

const md = (text) => render(html`<${Markdown} text=${text}/>`).container;

describe('Markdown', () => {
  it('renders headings 1-6', () => {
    const c = md('# A\n\n### C\n\n###### F');
    expect(c.querySelector('h1').textContent).toBe('A');
    expect(c.querySelector('h3').textContent).toBe('C');
    expect(c.querySelector('h6').textContent).toBe('F');
  });

  it('renders nested lists and task glyphs', () => {
    const c = md('- one\n  - inner\n- two\n\n1. first\n2. second\n\n- [x] done\n- [ ] todo');
    expect(c.querySelector('ul > li > ul > li').textContent).toBe('inner');
    expect(c.querySelectorAll('ol > li').length).toBe(2);
    expect(c.querySelectorAll('.md-task').length).toBe(2);
    expect(c.querySelector('input')).toBeNull();
  });

  it('renders fenced code with a language label', () => {
    const c = md('```js\nconst a = 1;\n```');
    expect(c.querySelector('.md-lang').textContent).toBe('js');
    expect(c.querySelector('pre code').textContent).toBe('const a = 1;');
  });

  it('renders inline formatting', () => {
    const c = md('**b** *i* ~~s~~ `code`');
    expect(c.querySelector('strong').textContent).toBe('b');
    expect(c.querySelector('em').textContent).toBe('i');
    expect(c.querySelector('del').textContent).toBe('s');
    expect(c.querySelector('code.md-icode').textContent).toBe('code');
  });

  it('links http but turns javascript: into text', () => {
    const c = md('[ok](https://example.com) and [bad](javascript:alert(1)) and https://x.org/p.');
    const links = [...c.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['https://example.com', 'https://x.org/p']);
    expect(links[0].getAttribute('rel')).toBe('noopener noreferrer');
    expect(links[0].getAttribute('target')).toBe('_blank');
    expect(c.textContent).toContain('bad');
  });

  it('does not load images', () => {
    const c = md('![logo](https://example.com/a.png)');
    expect(c.querySelector('img')).toBeNull();
    expect(c.querySelector('.md-image').textContent).toBe('image: logo (https://example.com/a.png)');
  });

  it('renders a table with three aligned columns', () => {
    const c = md('| a | b | c |\n|:--|:-:|--:|\n| 1 | 2 | 3 |');
    expect(c.querySelectorAll('th').length).toBe(3);
    expect(c.querySelectorAll('td').length).toBe(3);
    expect(c.querySelectorAll('th')[1].getAttribute('style')).toContain('center');
    expect(c.querySelectorAll('td')[2].getAttribute('style')).toContain('right');
  });

  it('renders front matter as a table', () => {
    const c = md('---\nname: demo\ndescription: A thing\n---\n\n# Body');
    const rows = c.querySelectorAll('table.md-fm tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toBe('namedemo');
    expect(c.querySelector('caption').textContent).toBe('Front matter');
    expect(c.querySelector('h1').textContent).toBe('Body');
  });

  it('shows raw HTML as text', () => {
    const c = md('<img src=x onerror=alert(1)>');
    expect(c.querySelector('img')).toBeNull();
    expect(c.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('renders blockquote, rule and hard break', () => {
    const c = md('> quoted\n\n---\n\nline  \nnext');
    expect(c.querySelector('blockquote').textContent).toContain('quoted');
    expect(c.querySelector('hr')).not.toBeNull();
    expect(c.querySelector('br')).not.toBeNull();
  });
});

describe('looksLikeMarkdown', () => {
  it('goes by extension when a path is given', () => {
    expect(looksLikeMarkdown('/a/CLAUDE.MD', 'x')).toBe(true);
    expect(looksLikeMarkdown('/a/b.mdx', 'x')).toBe(true);
    expect(looksLikeMarkdown('/a/b.js', '# heading')).toBe(false);
  });
  it('goes by content without a path', () => {
    expect(looksLikeMarkdown(null, '\n# Title')).toBe(true);
    expect(looksLikeMarkdown(undefined, '---\na: b\n---')).toBe(true);
    expect(looksLikeMarkdown(null, 'plain text')).toBe(false);
  });
});

describe('TextView', () => {
  const view = (path, text = '# Hi') => render(html`<${TextView} text=${text} path=${path}
    source=${html`<pre class="src">SRC</pre>`}/>`).container;

  it('defaults to rendered for markdown and toggles to source', () => {
    const c = view('/x/SKILL.md');
    expect(c.querySelector('.md h1')).not.toBeNull();
    expect(c.querySelector('.src')).toBeNull();
    fireEvent.click([...c.querySelectorAll('button')].find((b) => b.textContent === 'Source'));
    expect(c.querySelector('.src')).not.toBeNull();
    expect(c.querySelector('.md')).toBeNull();
  });

  it('defaults to source for other files and remembers the choice per kind', () => {
    const mem = {};
    vi.stubGlobal('localStorage', {
      getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, clear: () => {},
    });
    const c = view('/x/a.py');
    expect(c.querySelector('.src')).not.toBeNull();
    cleanup();
    fireEvent.click(view('/y/B.md').querySelectorAll('button')[1]);
    cleanup();
    expect(view('/z/C.md').querySelector('.src')).not.toBeNull();
    cleanup();
    expect(view('/z/d.txt').querySelector('.src')).not.toBeNull();
    vi.unstubAllGlobals();
  });
});

// ─── Agent drawer: Commits — commits made in the session, with their pull requests ─
import { html } from 'htm/preact';
import { useMemo } from 'preact/hooks';
import { FixedPanel } from '../Drawer.js';
import { NA, fmtN, stamp } from '../format.js';
import Table from '../Table.js';

const STATE = { OPEN: 'open', MERGED: 'merged', CLOSED: 'closed' };

export function commitsDef(commits) {
  return {
    key: 'agent.commits',
    cols: [
      { k: 'sha', l: 'Commit', w: '80px' },
      { k: 'subject', l: 'Subject', minw: 220 },
      { k: 'author', l: 'Author', w: '120px' },
      { k: 'ts', l: 'Time', w: '110px' },
      { k: 'prs', l: 'Pull requests', minw: 180 },
    ],
    primary: 'subject',
    rows: commits.map((c, i) => ({
      id: c.sha || i,
      sort: { sha: c.short_sha || c.sha, subject: c.subject, author: c.author_name, ts: c.ts, prs: c.prs.length },
      cells: {
        sha: { v: c.short_sha || String(c.sha || '').slice(0, 7), cls: 'm', title: c.sha },
        subject: { v: c.subject || NA, title: c.subject },
        author: { v: c.author_name || NA, cls: 'dim' },
        ts: { v: stamp(c.ts, true), cls: 'dim', title: c.ts ? new Date(c.ts * 1000).toLocaleString() : '' },
        prs: c.prs.length
          ? { v: c.prs.map(p => '#' + p.number).join(' '), links: c.prs.map(p => ({ text: '#' + p.number + ' ' + (p.title || '') + ' (' + (STATE[p.state] || String(p.state || 'unknown').toLowerCase()) + ')', href: p.url, title: p.title + ', ' + (STATE[p.state] || p.state) })) }
          : { v: NA, cls: 'dim', title: 'No pull request found for this commit' },
      },
    })),
    sort: { k: 'ts', dir: 'desc' },
    none: 'No commit is stored for this session.',
  };
}

export default function CommitsTab({ data }) {
  const commits = data.commits || [];
  const def = useMemo(() => commitsDef(commits), [data]);
  const prs = commits.reduce((n, c) => n + c.prs.length, 0);
  return html`<${FixedPanel} id="cms" title="Commits" sub=${fmtN(commits.length) + ' commits, ' + fmtN(prs) + ' pull requests'}>
    <${Table} def=${def} label="Commits"/>
    ${data.prs_note ? html`<div class="bd-note" role="status">Pull requests are missing: ${data.prs_note}</div>` : null}
  </${FixedPanel}>`;
}

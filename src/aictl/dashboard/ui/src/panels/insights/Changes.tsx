import { For, Show, untrack } from 'solid-js'
import { fmtLines, fmtNum, fmtShare, fmtUsd } from '../../design/format'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { share, toolLabel } from './insightsModel'
import { Bars, Columns } from './WorkCharts'
import {
  CHANGE_SMALL, changeBinChart, changeFilesChart, changeFinding, changeHero, changeKindChart, changePerCommitChart, changeRepoKindChart,
  changeSessionsChart, changeWritesChart, kindsText, perCommit, reworkedChart, SHOWN, smallText, type ChangeBody, type ChangeRepo,
} from './workModel'
import styles from './Insights.module.css'
import own from './Work.module.css'

function RepoFacts(props: { repo: ChangeRepo }) {
  const facts = (repo: ChangeRepo): [string, string][] => [
    ['Files changed', `${fmtNum(repo.files)} (${share(repo.files_share)} of all)`],
    ['Kinds of files', kindsText(repo)],
    ['Lines', fmtLines(repo.lines_added, repo.lines_removed) + (repo.lines_unknown ? ` (${fmtNum(repo.lines_unknown)} writes without a count)` : '')],
    ['Written in 3+ sessions or 5+ times in one', `${fmtNum(repo.reworked)} files`],
    ['Writes a commit followed', `${fmtNum(repo.committed_writes)} of ${fmtNum(repo.writes)} (${share(repo.committed_share)})`],
    ['Sessions that changed files', `${fmtNum(repo.change_sessions)} of ${fmtNum(repo.sessions)}, ${fmtNum(repo.uncommitted_sessions)} with no commit`],
    ['Commits', `${fmtNum(repo.commits)} on ${fmtNum(repo.commit_days)} days, in ${fmtNum(repo.commit_sessions)} sessions`],
    ['Per commit', perCommit(repo)],
  ]
  return <div class={own.detail} data-repo-detail>
    <dl class={own.facts}><For each={facts(props.repo)}>{([label, value]) => <div><dt>{label}</dt><dd>{value}</dd></div>}</For></dl>
  </div>
}

function Visual(props: { body: ChangeBody }) {
  const shown = () => props.body.repos.filter(repo => repo.writes || repo.commits).slice(0, SHOWN)
  return <>
    <Bars chart={changeFilesChart(props.body)} />
    <Bars chart={changeKindChart(props.body)} />
    <Bars chart={changeRepoKindChart(props.body)} />
    <Bars chart={changeWritesChart(props.body)} />
    <Bars chart={changeSessionsChart(props.body)} />
    <Bars chart={changePerCommitChart(props.body)} />
    <Show when={smallText(props.body.summary.small, CHANGE_SMALL)}>{text => <p class={styles.note} data-small-list>{text()}</p>}</Show>
    <h3 class={styles.subhead}>Over the period</h3>
    <Show when={props.body.bins.length} fallback={<p class={styles.note}>No agent commit or file write in this period.</p>}>
      <Columns chart={changeBinChart(props.body, 'commits')} />
      <Columns chart={changeBinChart(props.body, 'writes')} />
    </Show>
    <h3 class={styles.subhead}>Files written in 3 or more sessions or 5 or more times in one</h3>
    <Show when={props.body.files.length} fallback={<p class={styles.note}>No file was written in 3 sessions or 5 times in one.</p>}>
      <Bars chart={reworkedChart(props.body)} />
    </Show>
    <h3 class={styles.subhead}>Each repository: every change figure</h3>
    <ol class={own.rows} aria-label="Changed files per repository">
      <For each={shown()}>{repo => <li><details class={own.row} data-repo={repo.name} data-small={repo.small ? '' : undefined}>
        <summary>
          <span class={own.name}>{repo.name}</span><span class={own.kind}>{repo.kind}</span>
          <span class={own.rowText}>{fmtNum(repo.files)} files · {fmtNum(repo.writes)} writes · {fmtNum(repo.commits)} commits</span>
        </summary>
        <RepoFacts repo={repo} />
      </details></li>}</For>
    </ol>
    <p class={styles.note}>Whether a test ran before each commit: see the card "Verified before commit".</p>
  </>
}

type Row = Record<string, unknown>

const NOTE = 'A change is a file write event of the period that an agent made (a change the tool reports as made outside ' +
  'the session is left out); files are distinct paths. Lines are as the tool reported them; a write without a count is ' +
  'counted apart. Written in 3 or more sessions or 5 or more times in one session: listed among the rewritten files. Kind ' +
  'of file, by its path: memory and instructions (an instruction or memory file the store recognizes), tests (a tests, ' +
  'test, __tests__ or spec folder, or a test_, _test., .test. or .spec. name), docs (.md, .mdx, .rst, .txt, .adoc or a docs ' +
  'folder), config and data (.json, .yaml, .toml, .ini, .cfg, .conf, .lock, .env, .xml, .csproj, .props, dotfiles, ' +
  'Dockerfile, Makefile), source (code, query, style and markup files by extension), else other. A commit is a successful ' +
  'shell call that runs git commit (not a dry run, not printed or searched for); commits made outside an agent\'s shell ' +
  '(a person, a script, a tool\'s own commit button) are not seen, so "no commit followed" means no agent commit of the same ' +
  'session followed the write. A commit followed a write when the same session committed at or after it. Spend and ' +
  'working time per commit are the repository\'s spend at list price and agent working time divided by its commits, and need 3 ' +
  'commits. Bins are UTC days, or whole days so the period has at most 31 bins (all history: a year). Too little data: a ' +
  'repository with fewer than 20 writes and fewer than 3 commits is drawn grey. Charts show the first 15 repositories by ' +
  'changed files. Whether a test ran between the last source change and each commit is the card "Verified before commit". ' +
  'Not measured: changes to stored data or schemas made by commands (Kusto management commands, SQL, migrations); no stored ' +
  'field marks them. The page\'s project, tool and model filters apply.'

export default function Changes(props: CardProps) {
  untrack(() => props.ctx)
  return <InsightCard<ChangeBody> {...props} card="changes" title="What the agents changed" tab="flow" filtered
    hero={changeHero}
    finding={changeFinding}
    visual={body => <Show when={body.repos.length} fallback={<p class={styles.note}>No session in this period.</p>}>
      <Visual body={body} />
    </Show>}
    note={NOTE}
    table={{
      label: 'What the agents changed by repository',
      rows: body => body.repos.map((repo): Row => ({
        id: repo.repo, name: repo.name, files: repo.files, writes: repo.writes, committed_share: repo.committed_share ?? undefined,
        lines_added: repo.lines_added, lines_removed: repo.lines_removed, reworked: repo.reworked, commits: repo.commits,
        commit_days: repo.commit_days, source: repo.kinds.source, tests: repo.kinds.tests, docs: repo.kinds.docs,
        config: repo.kinds.config, cost_per_commit: repo.cost_per_commit ?? undefined, uncommitted_sessions: repo.uncommitted_sessions,
        small: repo.small ? 'too small' : '',
      })),
      fields: [textField('name', 'Repository or folder'), numberField('files', 'Files changed', fmtNum),
        numberField('writes', 'Writes', fmtNum), numberField('committed_share', 'Committed', fmtShare),
        numberField('lines_added', 'Lines added', fmtNum), numberField('lines_removed', 'Lines removed', fmtNum),
        numberField('reworked', 'Reworked files', fmtNum), numberField('commits', 'Commits', fmtNum),
        numberField('commit_days', 'Days with a commit', fmtNum), numberField('source', 'Source files', fmtNum),
        numberField('tests', 'Test files', fmtNum), numberField('docs', 'Docs', fmtNum), numberField('config', 'Config and data', fmtNum),
        numberField('cost_per_commit', 'Spend per commit', fmtUsd), numberField('uncommitted_sessions', 'Sessions with no commit', fmtNum),
        textField('small', 'Evidence')],
    }}
    sessionFields={[textField('tool', 'Tool', row => toolLabel(String(row.tool ?? ''))),
      textField('repo', 'Repository', row => String(row.repo ?? '')),
      numberField('writes', 'Writes', fmtNum), numberField('committed_writes', 'Committed', fmtNum),
      numberField('files', 'Files', fmtNum), numberField('commits', 'Commits', fmtNum)]} />
}

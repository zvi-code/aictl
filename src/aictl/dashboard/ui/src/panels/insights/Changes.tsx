import { For, Show, untrack } from 'solid-js'
import { fmtLines, fmtNum, fmtShare, fmtUsd, stamp } from '../../design/format'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { share, toolLabel } from './insightsModel'
import { changeFinding, changeHero, FILE_KINDS, fileName, perCommit, smallText, type ChangeBody, type ChangeRepo } from './workModel'
import styles from './Insights.module.css'
import own from './Work.module.css'

const SHOWN = 15
const kindsText = (repo: Pick<ChangeRepo, 'kinds'>) =>
  FILE_KINDS.filter(kind => repo.kinds[kind.id]).map(kind => `${fmtNum(repo.kinds[kind.id])} ${kind.label}`).join(' · ') || 'no file'

/** One row per repository: its changed files, and its writes split into committed and never committed. */
function RepoChanges(props: { body: ChangeBody }) {
  const largest = () => Math.max(0, ...props.body.repos.map(repo => repo.writes))
  const facts = (repo: ChangeRepo): [string, string][] => [
    ['Files changed', `${fmtNum(repo.files)} (${share(repo.files_share)} of all)`],
    ['Kinds of files', kindsText(repo)],
    ['Lines', fmtLines(repo.lines_added, repo.lines_removed) + (repo.lines_unknown ? ` (${fmtNum(repo.lines_unknown)} writes without a count)` : '')],
    ['Written again and again', `${fmtNum(repo.reworked)} files`],
    ['Writes that ended in a commit', `${fmtNum(repo.committed_writes)} of ${fmtNum(repo.writes)} (${share(repo.committed_share)})`],
    ['Sessions that changed files', `${fmtNum(repo.change_sessions)} of ${fmtNum(repo.sessions)}, ${fmtNum(repo.uncommitted_sessions)} with no commit`],
    ['Commits', `${fmtNum(repo.commits)} on ${fmtNum(repo.commit_days)} days, in ${fmtNum(repo.commit_sessions)} sessions`],
    ['Per commit', perCommit(repo)],
  ]
  return <>
    <ul class={styles.legend}>
      <li><span class={`${styles.swatch} ${own.spend}`} />Writes that ended in a commit in the same session</li>
      <li><span class={`${styles.swatch} ${own.alt}`} />Writes no agent commit of the session followed</li>
    </ul>
    <ol class={own.rows} aria-label="Changed files per repository">
      <For each={props.body.repos.filter(repo => repo.writes || repo.commits).slice(0, SHOWN)}>{repo => <li>
        <details class={own.row} data-repo={repo.name} data-small={repo.small ? '' : undefined}>
          <summary>
            <span class={own.name}>{repo.name}<span class={own.kind}>{repo.kind}</span>
              <small>{fmtNum(repo.files)} files · {fmtNum(repo.commits)} commits</small></span>
            <span class={own.figures}>
              <span class={own.meter}>
                <span class={own.track} role="img" aria-label={`${repo.name}: ${fmtNum(repo.committed_writes)} writes committed, ` +
                  `${fmtNum(repo.writes - repo.committed_writes)} not`} style={{ display: 'flex' }}>
                  <span class={repo.small ? own.muted : own.spend}
                    style={{ 'inline-size': `${largest() ? (repo.committed_writes / largest() * 100).toFixed(1) : 0}%` }} />
                  <span class={repo.small ? own.muted : own.alt}
                    style={{ 'inline-size': `${largest() ? ((repo.writes - repo.committed_writes) / largest() * 100).toFixed(1) : 0}%` }} />
                </span>
                <span>{fmtNum(repo.writes)} writes · {share(repo.committed_share)} committed</span>
              </span>
              <small>{kindsText(repo)} · {fmtNum(repo.reworked)} reworked</small>
            </span>
          </summary>
          <div class={own.detail} data-repo-detail>
            <dl class={own.facts}><For each={facts(repo)}>{([label, value]) => <div><dt>{label}</dt><dd>{value}</dd></div>}</For></dl>
          </div>
        </details>
      </li>}</For>
    </ol>
    <Show when={props.body.summary.small.length}>
      <p class={styles.note} data-small-list>{smallText(props.body.summary.small).replace('fewer than 50 model requests',
        'fewer than 20 file writes and 3 commits')}</p>
    </Show>
  </>
}

/** Commits and writes per day (or longer bin) of the period. */
function Days(props: { body: ChangeBody }) {
  const largest = () => Math.max(0, ...props.body.bins.map(bin => bin.commits))
  return <Show when={props.body.bins.some(bin => bin.commits)} fallback={<p class={styles.note}>No agent commit in this period.</p>}>
    <ol class={own.weeks} aria-label="Commits per day">
      <For each={props.body.bins}>{bin => <li title={`From ${stamp(bin.start, true)}: ${fmtNum(bin.commits)} commits, ${fmtNum(bin.writes)} writes`}>
        <span style={{ 'block-size': `${largest() ? (bin.commits / largest() * 100).toFixed(1) : 0}%` }} />
      </li>}</For>
    </ol>
  </Show>
}

function Reworked(props: { body: ChangeBody }) {
  return <Show when={props.body.files.length} fallback={<p class={styles.note}>No file was written in 3 sessions or 5 times in one.</p>}>
    <ol class={styles.rankList} aria-label="Files written again and again">
      <For each={props.body.files}>{file => <li data-file={fileName(file.path)} title={file.path}>
        <span>{fileName(file.path)} <small>({file.kind}, {file.repo_name})</small></span>
        <span>{fmtNum(file.writes)} writes in {fmtNum(file.sessions)} sessions, at most {fmtNum(file.most_in_session)} in one</span>
      </li>}</For>
    </ol>
  </Show>
}

type Row = Record<string, unknown>

const NOTE = 'A change is a file write event of the period that an agent made (a change the tool reports as made outside ' +
  'the session is left out); files are distinct paths. Lines are as the tool reported them; a write without a count is ' +
  'counted apart. Written again and again: a file written in 3 or more sessions, or 5 or more times in one session. Kind ' +
  'of file, by its path: memory and instructions (an instruction or memory file the store recognizes), tests (a tests, ' +
  'test, __tests__ or spec folder, or a test_, _test., .test. or .spec. name), docs (.md, .mdx, .rst, .txt, .adoc or a docs ' +
  'folder), config and data (.json, .yaml, .toml, .ini, .cfg, .conf, .lock, .env, .xml, .csproj, .props, dotfiles, ' +
  'Dockerfile, Makefile), source (code, query, style and markup files by extension), else other. A commit is a successful ' +
  'shell call that runs git commit (not a dry run, not printed or searched for); commits made outside an agent\'s shell ' +
  '(a person, a script, a tool\'s own commit button) are not seen, so "never committed" means no agent commit of the same ' +
  'session followed the write. A write ended in a commit when the same session committed at or after it. Spend and ' +
  'working time per commit need 3 commits. Too little data: a repository with fewer than 20 writes and fewer than 3 ' +
  'commits is drawn grey and never leads the finding. Whether a test ran between the last source change and each commit ' +
  'is the card "Verified before commit". Not measured: changes to stored data or schemas made by commands (Kusto ' +
  'management commands, SQL, migrations); no stored field marks them. The page\'s project, tool and model filters apply.'

export default function Changes(props: CardProps) {
  untrack(() => props.ctx)
  return <InsightCard<ChangeBody> {...props} card="changes" title="What the agents changed" tab="flow" filtered
    hero={changeHero}
    finding={changeFinding}
    visual={body => <Show when={body.repos.length} fallback={<p class={styles.note}>No session in this period.</p>}>
      <RepoChanges body={body} />
      <h3 class={styles.subhead}>Commits per day</h3>
      <Days body={body} />
      <h3 class={styles.subhead}>Files written again and again</h3>
      <Reworked body={body} />
      <p class={styles.note}>Whether a test ran before each commit: see the card "Verified before commit".</p>
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

import { For, Show, untrack } from 'solid-js'
import { fmtNum, fmtShare, fmtUsd, stamp } from '../../design/format'
import type { PanelContext } from '../types'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { count, share, toolLabel } from './insightsModel'
import { agentTime, repoFinding, repoHero, repoLines, repoName, smallText, startedText, type Repo, type RepoBody } from './workModel'
import styles from './Insights.module.css'
import own from './Work.module.css'

const SHOWN = 15
const money = (value: number | null) => value == null ? 'not reported' : fmtUsd(value)

/** A repository's weeks (or longer bins): spend as columns, commits under each. */
function Bins(props: { repo: Repo }) {
  const largest = () => Math.max(0, ...props.repo.bins.map(bin => bin.cost_usd))
  return <Show when={props.repo.bins.length} fallback={<p class={styles.note}>No spend or commit in a bin of this period.</p>}>
    <ol class={own.weeks} aria-label={`${props.repo.name}: spend per bin`}>
      <For each={props.repo.bins}>{bin => <li title={`From ${stamp(bin.start, true)}: ${fmtUsd(bin.cost_usd)}, ` +
        `${fmtNum(bin.commits)} commits, ${fmtNum(bin.sessions)} sessions`}>
        <span style={{ 'block-size': `${largest() ? (bin.cost_usd / largest() * 100).toFixed(1) : 0}%` }} />
      </li>}</For>
    </ol>
    <ol class={own.weeksAxis} aria-hidden="true">
      <For each={props.repo.bins}>{bin => <li>{fmtNum(bin.commits)} c</li>}</For>
    </ol>
  </Show>
}

/** What one repository row opens to: its figures, models, bins and its costliest sessions. */
function RepoDetail(props: { repo: Repo; ctx: PanelContext }) {
  const repo = () => props.repo
  const facts = (): [string, string][] => [
    ['Folders in it', fmtNum(repo().projects)],
    ['Model requests', fmtNum(repo().requests)],
    ['Unpriced requests', fmtNum(repo().unpriced)],
    ['Agent working time', agentTime(repo().agent_ms)],
    ['Sessions started', startedText(repo())],
    ['Sessions that changed nothing', `${fmtNum(repo().idle_sessions)} of ${fmtNum(repo().sessions)}`],
    ['Tool calls failed', `${fmtNum(repo().failed)} of ${fmtNum(repo().calls)} (${share(repo().failed_share)})`],
    ['Test runs', fmtNum(repo().test_runs)],
    ['Files changed', `${fmtNum(repo().files)} (${fmtNum(repo().writes)} writes)`],
    ['Lines', repoLines(repo()) + (repo().lines_unknown ? ` (${fmtNum(repo().lines_unknown)} writes without a count)` : '')],
    ['Commits', `${fmtNum(repo().commits)} in ${fmtNum(repo().commit_sessions)} sessions`],
    ['Spend per commit', repo().cost_per_commit == null ? 'fewer than 3 commits' : fmtUsd(repo().cost_per_commit)],
    ['Spend per changed file', repo().cost_per_file == null ? 'fewer than 5 files' : fmtUsd(repo().cost_per_file)],
  ]
  return <div class={own.detail} data-repo-detail>
    <dl class={own.facts}><For each={facts()}>{([label, value]) => <div><dt>{label}</dt><dd>{value}</dd></div>}</For></dl>
    <p class={styles.note}>Models: {repo().models.map(model => `${model.model ?? 'not reported'} ${fmtNum(model.requests)} requests, ` +
      money(model.cost_usd)).join(' · ') || 'none'}</p>
    <h4 class={styles.subhead}>Spend by time (column) and commits (under it)</h4>
    <Bins repo={repo()} />
    <h4 class={styles.subhead}>Costliest sessions</h4>
    <ol class={own.sessions}>
      <For each={repo().top_sessions}>{session => <li>
        <button type="button" onClick={() => props.ctx.openAgent(session.session_id, 'flow')}>{session.session_id}</button>
        <span>{toolLabel(String(session.tool ?? ''))}</span>
        <span>{money(session.cost_usd)}</span>
        <span>{fmtNum(session.commits)} commits · {fmtNum(session.files)} files · {agentTime(session.agent_ms)} working</span>
        <Show when={session.scripted != null}><span>{session.scripted ? 'started by a script' : 'started by a person'}</span></Show>
      </li>}</For>
    </ol>
  </div>
}

/** One row per repository, by spend: a bar of its share of the spend, what it produced, open for the rest. */
function RepoRows(props: { body: RepoBody; ctx: PanelContext }) {
  const shown = () => props.body.repos.slice(0, SHOWN)
  const largest = () => Math.max(0, ...props.body.repos.map(repo => repo.cost_share ?? 0))
  return <>
    <ol class={own.rows} aria-label="Repositories and folders by spend">
      <For each={shown()}>{repo => <li><details class={own.row} data-repo={repo.name} data-small={repo.small ? '' : undefined}>
        <summary>
          <span class={own.name}>{repo.name}<span class={own.kind}>{repo.kind}</span>
            <small>{fmtNum(repo.sessions)} sessions · {startedText(repo)}</small></span>
          <span class={own.figures}>
            <span class={own.meter}>
              <span class={own.track}><span class={repo.small ? own.muted : own.spend}
                style={{ 'inline-size': `${largest() ? ((repo.cost_share ?? 0) / largest() * 100).toFixed(1) : 0}%` }} /></span>
              <span>{money(repo.cost_usd)} · {share(repo.cost_share)}</span>
            </span>
            <small>{fmtNum(repo.commits)} commits · {fmtNum(repo.files)} files {repoLines(repo)} · {agentTime(repo.agent_ms)} working
              · {fmtNum(repo.idle_sessions)} changed nothing</small>
          </span>
        </summary>
        <RepoDetail repo={repo} ctx={props.ctx} />
      </details></li>}</For>
    </ol>
    <Show when={props.body.repos.length > SHOWN}>
      <p class={styles.note}>{fmtNum(props.body.repos.length - SHOWN)} more in the data table.</p>
    </Show>
    <Show when={smallText(props.body.summary.small)}>{text => <p class={styles.note} data-small-list>{text()}</p>}</Show>
  </>
}

type Row = Record<string, unknown>

const NOTE = 'A session counts when it made a model request or a tool call in the period; its figures are those of the ' +
  'period. A repository holds its folders, worktrees and sub-folders: a folder belongs to the repository its node\'s Index ' +
  'found on disk for it (git), else to the root a commit made there was filed under, else to the session folder whose agent ' +
  'worked in it as a worktree, else to the folder above .claude/worktrees/<name> or .worktrees/<name>. A folder with no such ' +
  'evidence and no git branch recorded is shown as a folder. Spend is list price, not a bill; a request stored at $0 with ' +
  'tokens is unpriced and not counted. Agent working time is the sum of each turn from its first to its last line (at most ' +
  '24 hours per turn): a session left open between turns adds nothing. Files changed are distinct paths the agents wrote ' +
  '(file write events; a change made outside the session is left out); lines as the tool reported them. A commit is a ' +
  'successful shell call that runs git commit (not a dry run, not printed by echo or searched for by grep); commits made ' +
  'outside an agent\'s shell are not seen. A session changed nothing when it wrote no file and made no commit. Started by a ' +
  'script: the first prompt to the main agent starts with <scheduled-task, or its first 100 characters (at least 20, not a ' +
  'slash command) or its first 40 (digits made equal) open 3 or more sessions of the same node and tool in the period; or ' +
  'the first turn did not come from a person (its origin, where the tool records one, is not human). There is no launch-mode ' +
  'record, so a loop that types a new prompt each time reads as a person. Too little data: a repository with fewer than 50 ' +
  'model requests is listed but never leads the finding and is drawn grey; spend per commit needs 3 commits, per file 5 files. ' +
  'The page\'s project, tool and model filters apply (a model: the sessions that used it, all their figures).'

export default function Repositories(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  return <InsightCard<RepoBody> {...props} card="repos" title="Work by repository" tab="flow" filtered
    hero={repoHero}
    finding={repoFinding}
    visual={body => <Show when={body.repos.length} fallback={<p class={styles.note}>No session in this period.</p>}>
      <RepoRows body={body} ctx={ctx} />
    </Show>}
    note={NOTE}
    table={{
      label: 'Work by repository',
      rows: body => body.repos.map((repo): Row => ({
        id: repo.repo, name: repoName(repo), path: repo.repo, sessions: repo.sessions, scripted: repo.scripted, person: repo.person,
        cost_usd: repo.cost_usd ?? undefined, cost_share: repo.cost_share ?? undefined, requests: repo.requests,
        agent_ms: repo.agent_ms ?? undefined, files: repo.files, lines_added: repo.lines_added, lines_removed: repo.lines_removed,
        commits: repo.commits, idle_sessions: repo.idle_sessions, failed_share: repo.failed_share ?? undefined,
        test_runs: repo.test_runs, cost_per_commit: repo.cost_per_commit ?? undefined,
        models: repo.models.map(model => model.model ?? 'not reported').join(', '), small: repo.small ? 'too small' : '',
      })),
      fields: [textField('name', 'Repository or folder'), textField('path', 'Path'),
        numberField('sessions', 'Sessions', fmtNum), numberField('scripted', 'By a script', fmtNum), numberField('person', 'By a person', fmtNum),
        numberField('cost_usd', 'Spend', fmtUsd), numberField('cost_share', 'Share of spend', fmtShare),
        numberField('requests', 'Requests', fmtNum), numberField('agent_ms', 'Agent working time', value => agentTime(value)),
        numberField('files', 'Files changed', fmtNum), numberField('lines_added', 'Lines added', fmtNum),
        numberField('lines_removed', 'Lines removed', fmtNum), numberField('commits', 'Commits', fmtNum),
        numberField('idle_sessions', 'Changed nothing', fmtNum), numberField('failed_share', 'Failed calls', fmtShare),
        numberField('test_runs', 'Test runs', count), numberField('cost_per_commit', 'Spend per commit', fmtUsd),
        textField('models', 'Models'), textField('small', 'Evidence')],
    }}
    sessionFields={[textField('tool', 'Tool', row => toolLabel(String(row.tool ?? ''))),
      textField('repo', 'Repository', row => String(row.repo ?? '')),
      numberField('cost_usd', 'Spend', fmtUsd), numberField('commits', 'Commits', fmtNum),
      numberField('files', 'Files changed', fmtNum), numberField('agent_ms', 'Agent working time', value => agentTime(value))]} />
}

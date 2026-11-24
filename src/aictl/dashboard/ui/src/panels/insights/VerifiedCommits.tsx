import { For, Show, untrack } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { fmtNum, fmtShare, stamp } from '../../design/format'
import type { Field } from '../../ui/tableModel'
import { Tooltip } from '../../ui/Tooltip'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { Bars } from './Bars'
import { NOT_REPORTED, toolLabel, type Label } from './insightsModel'
import { RepoLegend } from './RepoLegend'
import { hasOther } from './repoSplit'
import {
  commitRepoRows, SEGMENTS, passMissingText, segmentHover, segmentText, sessionHover, sessionRepoRows, sessionSplit, shareText,
  untestedText, verifiedFinding, verifiedHero, type VerifiedBody, type VerifiedTool,
} from './verifiedModel'
import styles from './Insights.module.css'
import own from './VerifiedCommits.module.css'

const PASS_TOOLS = 'Copilot CLI and the Copilot app'
/** A segment narrower than this share keeps its value for screen readers and in the line under the bar. */
const WIDE = 0.1

/** One mark of an HTML bar: its value written on it (visually hidden when the mark is too narrow), its detail on hover. */
function Mark(props: { class: string; style?: JSX.CSSProperties; text: string; hover: string; wide: boolean; attrs: Record<string, string> }) {
  return <span class={`${props.class} ${own.mark}`} style={props.style} {...props.attrs}>
    <Tooltip label={props.text} text={props.hover} class={own.hit} onClick={() => {}}>
      <span class={props.wide ? undefined : own.clip}>{props.text}</span>
    </Tooltip>
  </span>
}

const width = (part: number, whole: number) => whole ? `${(part / whole * 100).toFixed(2)}%` : '0%'

/** Per tool: one stacked bar of its commits by class, with each class's count and share written and on hover. */
function CommitBars(props: { body: VerifiedBody; label: Label }) {
  const shown = () => props.body.tools.filter(tool => tool.commits !== 0)
  const idle = () => props.body.tools.filter(tool => tool.commits === 0)
  const parts = (tool: VerifiedTool) => SEGMENTS.filter(segment => segment.count(tool))
  return <>
    <RepoLegend split={props.body} other={hasOther([...props.body.tools,
      ...props.body.tools.map(tool => ({ repos: tool.session_repos }))])} />
    <h3 class={styles.subhead}>Agent commits per tool, by what test runs saw before each commit (commits; share of the tool's commits)</h3>
    <ul class={styles.legend}>
      <For each={SEGMENTS}>{segment => <li><span class={`${styles.swatch} ${own[segment.id]}`} />{segment.label}</li>}</For>
    </ul>
    <Show when={shown().length} fallback={<p class={styles.note}>No agent commit in this period.</p>}>
      <ol class={styles.bars} aria-label="Agent commits per tool by what test runs saw before each commit">
        <For each={shown()}>{tool => <li class={styles.barRow} data-tool={tool.tool}>
          <span class={styles.barName}>{props.label(tool.tool)} · {tool.commits == null ? `${NOT_REPORTED} commits` : `${fmtNum(tool.commits)} commits`}
            <small data-share>{shareText(tool)}</small>
            <Show when={tool.commits != null && tool.passed == null}><small data-pass>{passMissingText(tool)}</small></Show>
          </span>
          <span class={styles.barTrack}>
            <Show when={tool.commits != null} fallback={<span class={own.missing} data-missing>commits not reported: command text not kept</span>}>
              <span class={own.stack} role="group" aria-label={`${props.label(tool.tool)}: ` + SEGMENTS.map(segment =>
                `${segment.label} ${segment.count(tool) == null ? NOT_REPORTED : fmtNum(segment.count(tool))}`).join(', ')}>
                <For each={parts(tool)}>{segment => {
                  const n = segment.count(tool) ?? 0
                  return <Mark class={own[segment.id]} attrs={{ 'data-segment': segment.id }} style={{ 'inline-size': width(n, tool.commits ?? 0) }}
                    wide={n / (tool.commits || 1) >= WIDE} text={segmentText(tool, n)} hover={segmentHover(tool, segment, props.label)} />
                }}</For>
              </span>
              <ul class={own.values} data-values>
                <For each={parts(tool)}>{segment => <li>
                  <span class={`${styles.swatch} ${own[segment.id]}`} />{segment.label} {segmentText(tool, segment.count(tool) ?? 0)}
                </li>}</For>
              </ul>
            </Show>
          </span>
        </li>}</For>
      </ol>
    </Show>
    <Bars name="verified-commits-repos" title="Agent commits per tool, by repository (commits)"
      axis="Length: agent commits, one linear scale for every tool from 0; a segment per repository. Hover a segment for its commits by class."
      rows={commitRepoRows(props.body, props.label)} />
    <Show when={idle().length}>
      <p class={styles.note}>No commit in this period by {idle().map(tool => props.label(tool.tool)).join(', ')}.</p>
    </Show>
    <SessionBars body={props.body} label={props.label} />
  </>
}

/** Per tool: the sessions that changed source files, split by whether a recognised test ran in them. */
function SessionBars(props: { body: VerifiedBody; label: Label }) {
  const rows = () => props.body.tools
  return <Show when={rows().length}>
    <h3 class={styles.subhead}>Sessions that changed source files, per tool, by whether a recognised test ran (sessions; share)</h3>
    <ul class={styles.legend}>
      <li><span class={`${styles.swatch} ${own.tested}`} />Ran a recognised test</li>
      <li><span class={`${styles.swatch} ${own.untestedPart}`} />Ran no recognised test</li>
    </ul>
    <ol class={styles.bars} aria-label="Sessions that changed source files, per tool, by whether a recognised test ran">
      <For each={rows()}>{tool => <li class={styles.barRow} data-sessions-tool={tool.tool}>
        <span class={styles.barName}>{props.label(tool.tool)}
          <small>{tool.edit_sessions == null ? NOT_REPORTED : `${fmtNum(tool.edit_sessions)} sessions changed source files`}</small></span>
        <span class={styles.barTrack}>
          <Show when={sessionSplit(tool)}>{split => <span class={own.stack} role="group" aria-label={untestedText(tool)}>
            <Show when={split().tested}><Mark class={own.tested} attrs={{ 'data-part': 'tested' }}
              style={{ 'inline-size': width(split().tested, split().total) }} wide={split().tested / split().total >= WIDE}
              text={`${fmtNum(split().tested)} · ${fmtShare(split().tested / split().total)}`} hover={sessionHover(tool, 'tested', props.label)} /></Show>
            <Show when={split().untested}><Mark class={own.untestedPart} attrs={{ 'data-part': 'untested' }}
              style={{ 'inline-size': width(split().untested, split().total) }} wide={split().untested / split().total >= WIDE}
              text={`${fmtNum(split().untested)} · ${fmtShare(split().untested / split().total)}`} hover={sessionHover(tool, 'untested', props.label)} /></Show>
          </span>}</Show>
          <span class={own.untested} data-untested>{untestedText(tool)}</span>
        </span>
      </li>}</For>
    </ol>
    <Bars name="verified-sessions-repos" title="Sessions that changed source files, per tool, by repository (sessions)"
      axis="Length: sessions that changed source files, one linear scale for every tool from 0; a segment per repository."
      rows={sessionRepoRows(props.body, props.label)} />
  </Show>
}

type Row = Record<string, unknown>
/** A count column: a count the tool does not record reads "not reported". */
const countField = (id: string, label: string): Field<Row> => ({
  id, label, numeric: true,
  read: row => typeof row[id] === 'number' ? row[id] as number : NOT_REPORTED,
  format: value => typeof value === 'number' ? fmtNum(value) : String(value),
})

const NOTE = 'What is counted. A commit is a successful shell call that runs git commit, with git by name, by path or as ' +
  'git.exe; a dry run, a commit that is only printed or searched for, and text in a heredoc are not commits, and commits ' +
  'after `ssh host` are left out (commits over ssh). A test run is a known runner at a command position (after ; && || | ( { ' +
  'then do, inside bash -c, PowerShell -Command and cmd /c), or a call of VS Code\'s runTests tool; runs that only list ' +
  'tests are not counted; a runTests call and a call with no command text have no recorded result. A source change ' +
  'is an edit-tool write to a file that is not documentation or data (md, txt, ' +
  'json, yaml, csv, toml, lock, log and the like), or an in-place shell edit (sed -i, perl -i, Get-Content -replace | ' +
  'Set-Content, git apply, restore or checkout --, patch). Redirects and whole-file writes (cat >, Out-File, Set-Content, ' +
  'Add-Content) are not counted. An edit with no file name is unknown and never decides a commit by itself. ' +
  'Order. By time; events in one command line keep their order; at equal times a test run does not see a change. A ' +
  'change stays unseen until a test run, so a later commit with no new change since the one before it counts as unseen ' +
  'too. All agents of a session count together; "own agent" repeats the split with the committing agent\'s own edits ' +
  'and tests only. A commit counts in the period it falls in; the session\'s history before it counts at any time. ' +
  'Classified. A commit is classified when the tool records the session\'s edits and its deciding change names a file. ' +
  'A tool\'s share is shown only when at least half of its commits are classified; otherwise it reads "not classified: ' +
  'edits not recorded" and all its commits count as not checked. The lead figure pools the classified commits of the ' +
  'tools that are shown with a share. ' +
  `Limits. "Passed" needs a recorded exit code of 0, so only ${PASS_TOOLS} (since October 2026) report it, and only ` +
  'in a period where a test run in a session whose edits are recorded has a recorded result. Claude Code reports success when a background run starts, and ' +
  'VS Code keeps exit codes only for failures: their passes are not reported. Piping the runner (| tail, | Select-Object) ' +
  'without pipefail hides the result for every tool. Copilot CLI and app transcript rows before October 2026 have no ' +
  'exit code (session-store.db rows do, but their sessions\' commits are not classified), so their results are not ' +
  'recorded and failed results are a floor; a failed git commit of that time can be stored as a ' +
  'success. Commits of Copilot sessions known only from session-store.db cannot be checked: that file keeps no edit ' +
  'calls. VS Code edit calls sometimes record no file (always for multi_replace_string_in_file), and apply_patch ' +
  'records only its first file. Session ' +
  'scope counts a subagent\'s tests in another worktree as seeing the tree; the own-agent figure is beside it. Commits ' +
  'outside a shell (an IDE button, an API, a merge) are not seen. Command text is cut at 500 characters; a multi-line ' +
  'script is stored as one line, so a runner on a later line counts as never tested; quoted text after | or && can be ' +
  'read as a command. Sessions whose shell calls carry no command text are left out and counted apart; a tool with no ' +
  'command text reports no commits. A tool\'s figures can rest on a few sessions: the table gives the largest session\'s ' +
  'commits.'

export default function VerifiedCommits(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<VerifiedBody> {...props} card="verified" title="Verified before commit" tab="flow"
    hero={verifiedHero}
    finding={body => verifiedFinding(body, label)}
    visual={body => <CommitBars body={body} label={label} />}
    note={NOTE}
    table={{
      label: 'Verified before commit by tool',
      rows: body => body.tools.map((tool): Row => ({
        ...tool, id: tool.tool, tool: label(tool.tool),
        text: tool.commands == null ? NOT_REPORTED : `${fmtNum(tool.commands_with_text)} of ${fmtNum(tool.commands)}`,
      })),
      fields: [textField('tool', 'Tool'), countField('commits', 'Commits'), countField('passed', 'Tested, passed'),
        countField('unreported', 'Tested, result not recorded'), countField('failed', 'Tested, failed'),
        countField('changed_after', 'Changed after last test'), countField('never_tested', 'Never tested'),
        countField('no_change', 'No code change'), countField('not_recorded', 'Not classified: edits not recorded'),
        countField('unknown_change', 'Not classified: file unknown'), countField('by_subagent', 'Made by subagents'),
        countField('own_unseen', 'Own agent: no test saw'), countField('remote_commits', 'Commits over ssh (left out)'),
        countField('commit_sessions', 'Sessions with commits'), countField('top_session_commits', "Largest session's commits"),
        countField('edit_sessions', 'Sessions that changed source files'), countField('untested_sessions', 'Of those, never ran a test'),
        countField('sessions_no_text', 'Sessions without command text'),
        countField('sessions_edits_unrecorded', 'Sessions whose edits are not recorded'),
        countField('test_runs', 'Test runs'), countField('test_results', 'Test runs with a recorded result (sessions whose edits are recorded)'),
        textField('text', 'Command lines with text'), countField('edits_no_file', 'Edit calls with no file')],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      numberField('commits', 'Commits', fmtNum), numberField('unseen', 'No test saw', fmtNum),
      numberField('never_tested', 'Never tested', fmtNum), numberField('own_unseen', 'Own agent: no test saw', fmtNum),
      numberField('by_subagent', 'Made by subagents', fmtNum),
      numberField('last_commit', 'Last commit', value => stamp(value, true))]} />
}

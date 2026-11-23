import { For, Show, untrack } from 'solid-js'
import { fmtNum, fmtShare, stamp } from '../../design/format'
import type { Field } from '../../ui/tableModel'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { NOT_REPORTED, toolLabel, type Label } from './insightsModel'
import { SEGMENTS, passMissingText, shareText, untestedText, verifiedFinding, verifiedHero, type VerifiedBody, type VerifiedTool } from './verifiedModel'
import styles from './Insights.module.css'
import own from './VerifiedCommits.module.css'

const PASS_TOOLS = 'Copilot CLI and the Copilot app'

/** Per tool: one 100% bar of its commits by what the last test run saw; a tool without command text says so instead. */
function CommitBars(props: { body: VerifiedBody; label: Label }) {
  const shown = () => props.body.tools.filter(tool => tool.commits !== 0)
  const idle = () => props.body.tools.filter(tool => tool.commits === 0)
  const width = (tool: VerifiedTool, n: number | null) => tool.commits && n ? `${(n / tool.commits * 100).toFixed(2)}%` : '0%'
  return <>
    <ul class={styles.legend}>
      <For each={SEGMENTS}>{segment => <li><span class={`${styles.swatch} ${own[segment.id]}`} />{segment.label}</li>}</For>
    </ul>
    <Show when={shown().length} fallback={<p class={styles.note}>No agent commit in this period.</p>}>
      <ol class={styles.bars} aria-label="Agent commits per tool by what the last test run saw">
        <For each={shown()}>{tool => <li class={styles.barRow} data-tool={tool.tool}>
          <span class={styles.barName}>{props.label(tool.tool)} · {tool.commits == null ? `${NOT_REPORTED} commits` : `${fmtNum(tool.commits)} commits`}
            <small data-share>{shareText(tool)}</small>
            <Show when={tool.commits != null && tool.passed == null}><small data-pass>{passMissingText(tool)}</small></Show>
          </span>
          <span class={styles.barTrack}>
            <Show when={tool.commits != null} fallback={<span class={own.missing} data-missing>commits not reported: command text not kept</span>}>
              <span class={styles.split} role="img" aria-label={`${props.label(tool.tool)}: ` + SEGMENTS.map(segment =>
                `${segment.label} ${segment.count(tool) == null ? NOT_REPORTED : fmtNum(segment.count(tool))}`).join(', ')}>
                <For each={SEGMENTS.filter(segment => segment.count(tool))}>{segment => {
                  const n = segment.count(tool) ?? 0
                  return <span class={own[segment.id]} data-segment={segment.id} style={{ 'inline-size': width(tool, n) }}
                    title={`${segment.label}: ${fmtNum(n)}, ${fmtShare(n / (tool.commits ?? 1))} of all commits`} />
                }}</For>
              </span>
            </Show>
            <span class={own.untested} data-untested>{untestedText(tool)}</span>
          </span>
        </li>}</For>
      </ol>
    </Show>
    <Show when={idle().length}>
      <p class={styles.note}>No commit in this period by {idle().map(tool => props.label(tool.tool)).join(', ')}.</p>
    </Show>
  </>
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

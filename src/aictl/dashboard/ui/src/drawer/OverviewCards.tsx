import { createMemo, createSignal, For, Show, untrack } from 'solid-js'
import type { DetailAgent, DetailSessionCommits } from '../data/contract.gen'
import { fmtBytes, fmtN } from '../design/format'
import { Meter } from '../ui/Meter'
import { labelOf, number, records, Resource, Rows, Section, sessionPath, Stats, text, type TabProps } from './shared'
import styles from './drawer.module.css'

type Props = { data: DetailAgent; tab: TabProps }
const preview = 5
const fileName = (path: string) => path.replaceAll('\\', '/').split('/').at(-1) || path
const bytes = (value?: number | null) => value == null ? undefined : fmtBytes(value)

export function ContextCards(props: Props) {
  const context = () => props.data.context
  const breakdown = () => context()?.breakdown
  const parts = () => records(breakdown()?.parts)
  const limit = () => number(breakdown()?.limit) ?? context()?.prompt_limit ?? undefined
  const total = () => number(breakdown()?.total) ?? context()?.last
  const scale = () => Math.max(total() ?? 0, limit() ?? 0)
  const additions = createMemo(() => records(breakdown()?.heaviest)?.filter(row => number(row.tokens) != null)
    .sort((a, b) => number(b.tokens)! - number(a.tokens)!).slice(0, preview))
  const results = createMemo(() => props.data.tool_calls?.filter(row => row.output_bytes != null)
    .sort((a, b) => b.output_bytes! - a.output_bytes!).slice(0, preview))
  return <>
    <Section title="Context size">
      <Stats items={[
        { label: 'First context', value: context()?.first, unit: 'tokens' },
        { label: 'Last context', value: context()?.last, unit: 'tokens' },
        { label: 'Peak context', value: context()?.peak, unit: 'tokens' },
        { label: 'Prompt limit', value: limit(), unit: 'tokens' },
        { label: 'Compactions', value: context()?.compactions?.length },
        { label: 'Request body', value: bytes(context()?.request_bytes_last) },
      ]} />
      <Show when={limit() != null && limit()! > 0 && context()?.last != null}>
        <Meter label="Context window used" value={Math.min(context()!.last!, limit()!)} max={limit()}
          display={`${fmtN(context()?.last)} / ${fmtN(limit())} tokens`}
          tone={context()!.last! / limit()! >= .85 ? 'warning' : 'neutral'} />
      </Show>
      <Show when={parts()?.length}>
        <div class={styles.stats}><For each={parts()}>{row =>
          <Meter compact label={`${text(row.label) ?? 'Context'}${row.estimated === true ? ' (estimated)' : ''}`}
            value={number(row.tokens)} max={scale() || undefined}
            display={number(row.tokens) == null ? undefined : `${fmtN(number(row.tokens))} tokens`} />
        }</For></div>
      </Show>
      <div class={styles.bar}><button type="button" class={styles.button} onClick={() => props.tab.shell.changeTab('context')}>Open Context</button></div>
    </Section>
    <Section title="Largest additions">
      <Show when={additions()?.length} fallback={
        <Rows label="Largest tool responses" rows={results()} identity={['ts', 'name', 'target']}
          columns={['name', 'target', ['output_bytes', 'Response size', 'bytes'], ['ts', 'Time', 'time']]}
          empty="No tool result sizes were recorded." action={{ label: row => `Inspect tool calls for ${row.name}`,
            run: () => props.tab.shell.changeTab('tools') }} />
      }>
        <Rows label="Largest measured additions" rows={additions()} identity={['ts', 'kind', 'name']}
          columns={['kind', 'name', ['tokens', 'Tokens added', 'number'], ['ts', 'Time', 'time']]}
          action={{ label: row => `Inspect ${text(row.name) || text(row.kind) || 'context addition'}`,
            run: row => props.tab.shell.changeTab(row.kind === 'Tool results' ? 'tools' : 'turns') }} />
      </Show>
    </Section>
  </>
}

export function OutputsCard(props: Props) {
  const local = () => props.tab.shell.ctx.scope() === 'local'
  const rows = createMemo(() => {
    const { files, artifacts } = props.data
    if (!files && !artifacts) return
    const changed = (files ?? []).slice().sort((a, b) =>
      (b.lines_added ?? 0) + (b.lines_removed ?? 0) - (a.lines_added ?? 0) - (a.lines_removed ?? 0))
      .slice(0, preview).map(row => ({ ...row, name: fileName(row.path), kind: 'Changed', viewable: true, size_bytes: undefined }))
    const written = (artifacts ?? []).filter(row => text(row.path)).slice().sort((a, b) =>
      Number(b.kind === 'written') - Number(a.kind === 'written') || (number(b.mtime) ?? 0) - (number(a.mtime) ?? 0))
      .slice(0, preview - changed.length).map(row => ({
        path: text(row.path)!, name: text(row.name) || fileName(text(row.path)!),
        kind: row.kind === 'written' ? 'Written' : 'Session folder', size_bytes: number(row.size_bytes),
        viewable: row.viewable === true && row.exists !== false, lines_added: undefined, lines_removed: undefined,
      }))
    return [...changed, ...written]
  })
  return <Section title="Outputs">
    <Stats items={[
      { label: 'Files changed', value: props.data.files?.length },
      { label: 'Artifacts', value: props.data.artifacts_total, detail: bytes(props.data.artifacts_bytes) },
      { label: 'Commits', value: props.data.commits?.length },
    ]} />
    <Rows label="Output files" rows={rows()} identity={['kind', 'path']}
      columns={[[ 'name', 'File' ], 'kind', ['lines_added', 'Added', 'number'], ['lines_removed', 'Removed', 'number'],
        ['size_bytes', 'Artifact size', 'bytes']]} empty="No changed file or artifact was recorded."
      action={{ label: row => row.kind === 'Changed' || (row.viewable && local())
        ? `Open ${row.name}` : `Inspect ${row.name} in Artifacts`,
      run: row => {
        if (row.kind === 'Changed') props.tab.shell.open({ type: 'file', path: row.path, record: props.tab.entry.id })
        else if (row.viewable && local()) props.tab.shell.open({ type: 'file', path: row.path })
        else props.tab.shell.changeTab('artifacts')
      } }} />
    <div class={styles.bar}><For each={[['changes', 'Changes'], ['artifacts', 'Artifacts'], ['commits', 'Commits']]}>
      {([tab, label]) => <button type="button" class={styles.button} onClick={() => props.tab.shell.changeTab(tab)}>{label}</button>}
    </For></div>
  </Section>
}

export function InstructionsCard(props: Props) {
  const sources = () => props.data.context_files
  const files = createMemo(() => {
    const observed = sources()?.loaded
    if (!observed) return
    const groups = new Map<string, { path: string; name: string; ts?: number; methods: Set<string> }>()
    for (const row of observed) {
      const path = text(row.path)
      if (!path) continue
      const ts = number(row.ts), how = text(row.how)
      const group = groups.get(path) ?? { path, name: text(row.name) || fileName(path), methods: new Set<string>() }
      if (ts != null && (group.ts == null || ts < group.ts)) group.ts = ts
      if (how) group.methods.add(labelOf(how))
      groups.set(path, group)
    }
    return [...groups.values()].sort((a, b) => (a.ts ?? Infinity) - (b.ts ?? Infinity))
  })
  const visible = createMemo(() => files()?.slice(0, preview).map(row => ({
    path: row.path, name: row.name, ts: row.ts, how: [...row.methods].join(', ') || undefined,
  })))
  return <Section title="Instructions">
    <Stats items={[{ label: 'Observed files', value: files()?.length },
      { label: 'Applicable files', value: sources()?.read ? sources()?.total : undefined }]} />
    <Rows label="Observed instruction loads" rows={visible()} identity={['path']}
      columns={[[ 'name', 'File' ], [ 'how', 'Load method' ], [ 'ts', 'First observed', 'time' ]]}
      empty="No instruction load was recorded."
      action={props.tab.shell.ctx.scope() === 'local' ? {
        label: row => `Open ${row.name}`, run: row => props.tab.shell.open({ type: 'file', path: row.path, line: 1 }),
      } : undefined} />
    <div class={styles.bar}><button type="button" class={styles.button} onClick={() => props.tab.shell.changeTab('instructions')}>
      Open Instructions
    </button></div>
  </Section>
}

export function GitCard(props: Props) {
  const [expanded, setExpanded] = createSignal(false)
  const ctx = untrack(() => props.tab.shell.ctx)
  const git = () => props.data.git
  const canLook = () => ctx.scope() === 'local' && !props.data.agent?.parent_id && !!props.tab.session() &&
    ((git()?.commits_in_session ?? 0) > 0 || (!!git()?.branch && props.data.agent?.ended_at != null))
  const read = ctx.detail<DetailSessionCommits>(createMemo(() => expanded() && canLook()
    ? sessionPath(props.tab, '/api/session-commits') : undefined))
  return <Show when={git()?.branch || git()?.commit || canLook()}>
    <Section title="Git">
      <Stats items={[
        { label: 'Commits during session', value: read()?.data?.commits.length ?? git()?.commits_in_session },
        { label: 'Starting branch', value: git()?.branch },
        { label: 'Starting commit', value: git()?.commit?.slice(0, 7), detail: git()?.commit ?? undefined },
      ]} />
      <div class={styles.bar}>
        <Show when={canLook()}><button type="button" class={styles.button} aria-expanded={expanded() ? 'true' : 'false'}
          onClick={() => setExpanded(value => !value)}>{expanded() ? 'Hide Git lookup' : 'Look for commits'}</button></Show>
        <button type="button" class={styles.button} onClick={() => props.tab.shell.changeTab('commits')}>Inspect commits</button>
      </div>
      <Show when={canLook() && expanded()}><Resource read={read}>{data =>
        <Rows label="Commits during session" rows={data().commits.map(row => ({ ...row,
          branch: data().branch && !row.current_branch_match ? `Not on ${data().branch}` : data().branch || undefined,
        }))} identity={['sha']} columns={['short_sha', 'subject', 'author_name', 'branch', ['ts', 'Time', 'time']]}
          empty="No commits were found in this session’s time window." />
      }</Resource></Show>
    </Section>
  </Show>
}

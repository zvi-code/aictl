import { createEffect, createMemo, createSignal, onCleanup, Show, untrack } from 'solid-js'
import type { DetailContextAudit } from '../data/contract.gen'
import { stamp } from '../design/format'
import type { DrawerProps } from '../shell/drawerTypes'
import { PanelState } from '../ui/PanelState'
import { path, records, Rows, Section, Stats, text, labelOf, type Measure } from './shared'
import styles from './drawer.module.css'

type Audit = Extract<DetailContextAudit, { scanned_at: number }>
const inProgress = (value: DetailContextAudit): value is Extract<DetailContextAudit, { status: string }> =>
  'status' in value && value.status === 'scanning'

export default function Hidden(props: { shell: DrawerProps }) {
  const ctx = untrack(() => props.shell.ctx)
  const local = () => ctx.scope() === 'local'
  // The audit reads one project's folder: it follows the project filter when exactly one project is chosen.
  const project = () => ctx.filters().projects.length === 1 ? ctx.filters().projects[0] : undefined
  const target = () => local() ? path(ctx, '/api/context-audit', {
    nowait: 1, project: project(), tool: ctx.tools()?.length === 1 ? ctx.tools()?.[0] : undefined,
  }) : undefined
  const initial = ctx.detail<DetailContextAudit>(createMemo(target))
  const [result, setResult] = createSignal<{ target: string; value: Audit }>()
  const [phase, setPhase] = createSignal('')
  const [error, setError] = createSignal('')
  let controller: AbortController | undefined
  onCleanup(() => controller?.abort())
  const scan = async (refresh: boolean, pending?: DetailContextAudit) => {
    const url = target()
    if (!url || phase()) return
    controller?.abort()
    const { signal } = controller = new AbortController()
    setError(''); setPhase('Starting scan…')
    const load = async (target: string) => {
      const response = await fetch(target, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json() as Promise<DetailContextAudit>
    }
    try {
      let value = pending ?? await load(refresh ? `${url}&refresh=1` : url)
      const deadline = Date.now() + 600_000
      while (inProgress(value)) {
        if (Date.now() >= deadline) throw new Error('The scan did not finish in time.')
        setPhase(`${value.step} · ${value.elapsed_s}s`)
        await new Promise(resolve => setTimeout(resolve, 2000))
        signal.throwIfAborted()
        value = await load(url)
      }
      if (!signal.aborted && 'scanned_at' in value) setResult({ target: url, value })
    } catch (reason) { if (!signal.aborted) setError(String(reason)) }
    finally { if (!signal.aborted) setPhase('') }
  }
  createEffect(target, () => {
    controller?.abort()
    setPhase(''); setError('')
  })
  createEffect(() => initial()?.data, value => {
    if (value && inProgress(value)) void scan(false, value)
  })
  const data = () => {
    const value = initial()?.data
    const last = result()
    return last && last.target === target() ? last.value : value && 'scanned_at' in value ? value : undefined
  }
  const included = (tool?: unknown, tools?: readonly unknown[]) => {
    const active = ctx.tools()
    return !active || (active.length > 0 && (!tool && !tools?.length || active.some(id => id === tool || tools?.includes(id))))
  }
  const open = (file: unknown, line?: unknown) => {
    if (typeof file === 'string') props.shell.open({ type: 'file', path: file, line: typeof line === 'number' ? line : undefined })
  }
  return <Show when={local()} fallback={<PanelState state="unavailable" />}>
    <Section title="Hidden context">
      <div class={styles.bar}>
        <button type="button" class={styles.button} disabled={!!phase()} onClick={() => void scan(true)}>Scan again</button>
        <button type="button" class={styles.button} onClick={() => { props.shell.close(); ctx.navigate({ screen: 'settings', pivot: 'files' }) }}>Open settings</button>
      </div>
      <Show when={phase()}><PanelState state={data() ? 'stale' : 'loading'} message={phase()} /></Show>
      <Show when={error()}><PanelState state="error" message={error()} onRetry={() => void scan(true)} /></Show>
      <Show when={data()} fallback={<Show when={!phase() && !error()}>
        <PanelState state={initial()?.status === 'error' ? 'error' : 'loading'} onRetry={initial.retry} />
      </Show>}>{audit => <>
        <Stats items={[{ label: 'Transcripts read', value: audit().transcripts_read },
          { label: 'Scan duration', value: audit().duration_ms, unit: 'ms' },
          ...Object.entries(audit().counts).map(([key, value]): Measure => ({ label: labelOf(key), value, detail: 'Entire scan' }))]} />
        <p class={styles.muted}>{audit().project} · {stamp(audit().scanned_at, true)}</p>
        <Show when={project() && project() !== audit().project}><PanelState state="stale"
          message={`The Project filter is ${project()}. This scan covers ${audit().project}.`} /></Show>
        <Show when={audit().failed_steps.length || audit().incomplete.length}><PanelState state="stale"
          message={`Partial scan: ${[...audit().failed_steps, ...audit().incomplete].join(', ')}`} /></Show>
        <Rows label="Findings" rows={audit().findings.filter(row => included(row.tool, row.tools))}
          identity={['rule', 'tool', 'path', 'line', 'session_id']} columns={['severity', 'rule', 'path', 'why', 'action']}
          action={{ label: row => `Inspect ${row.rule}`, run: row => open(row.path, row.line) }} />
      </>}</Show>
    </Section>
    <Show when={data()}>{audit => <>
      <Section title="Sources and estimates"><Rows label="Sources and estimates" rows={audit().sources.filter(row => included(row.tool))}
        identity={['tool', 'path']} columns={['tool', 'scope', 'loading', 'bytes', ['est_tokens', 'Estimated tokens'], 'loaded_sessions', 'git_state', ['path', 'Path', 'path']]}
        actionColumn="path" action={{ label: row => `Open ${row.path}`, run: row => open(row.path) }} /></Section>
      <Section title="Effective models"><Rows label="Effective models" rows={Object.entries(audit().effective_models).filter(([id]) => included(id)).map(([id, value]) => ({
        id, ...(value && typeof value === 'object' && !Array.isArray(value) ? value : {}),
      }))} identity={['id']} columns={['id', 'value', 'source', ['why_in_effect', 'Why in effect'], 'limited']}
        action={{ label: row => `Inspect ${row.id}`, run: row => open((row as Record<string, unknown>).source, (row as Record<string, unknown>).line) }} /></Section>
      <Section title="Unexplained context"><Rows label="Unexplained context" rows={audit().unattributed.filter(row => included(row.tool))} identity={['session_id', 'tool', 'agent_id']}
        columns={['session_id', 'tool', 'tokens', 'estimated', 'method']} /></Section>
      <Section title="Changes since the last scan">
        <Show when={audit().drift.baseline_created}><p>Baseline established; no earlier scan to compare.</p></Show>
        <Rows label="Scan changes" rows={['new', 'changed', 'removed', 'agent_writes'].flatMap(kind =>
          (records(audit().drift[kind]) ?? []).map(row => ({ ...row, kind, path: text(row.path) })))}
          identity={['kind', 'path']} columns={['kind', ['path', 'Path', 'path']]} actionColumn="path"
          action={{ label: row => row.kind === 'removed' ? '' : `Inspect ${row.path}`, run: row => open(row.path) }} />
      </Section>
    </>}</Show>
  </Show>
}

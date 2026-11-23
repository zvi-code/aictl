import { createMemo, createSignal, lazy, Loading, Match, Show, Switch, untrack } from 'solid-js'
import type { DetailError, DetailExcerpt, DetailFile, DetailPrompt, DetailSkill, DetailTool } from '../data/contract.gen'
import { boardQuery, windowOf } from '../data/filters'
import type { Detail, PanelContext } from '../panels/types'
import type { DrawerProps } from '../shell/drawerTypes'
import { createBoxes, HiddenBoxes } from '../ui/Box'
import { CodeView } from '../ui/CodeView'
import { Drawer } from '../ui/Drawer'
import { Markdown } from '../ui/Markdown'
import { PanelState } from '../ui/PanelState'
import { MemoryVersions } from './MemoryViews'
import { path, Resource, Rows, Section, Stats } from './shared'
import styles from './drawer.module.css'

const FileEditor = lazy(() => import('./FileEditor'))
const Hidden = lazy(() => import('./Hidden'))
const McpDetail = lazy(() => import('./McpDetail'))
type Props = { shell: DrawerProps; entry: Detail }

function rangeQuery(ctx: PanelContext) {
  const picked = ctx.filters().sel
  const range = ctx.board('range')
  return Object.fromEntries(new URLSearchParams(boardQuery(ctx.filters(), ctx.tools(), picked
    ? { ...picked, buckets: 48 } : range ? { ...range, buckets: range.bucket_starts.length } : windowOf(ctx.filters().range, ctx.startedAt))))
}

function File(props: Props) {
  const ctx = untrack(() => props.shell.ctx)
  const local = () => ctx.scope() === 'local'
  const [editing, edit] = createSignal(false)
  const read = ctx.detail<DetailFile>(createMemo(() => path(ctx, '/api/board/file', { ...rangeQuery(ctx), path: props.entry.path, record: props.entry.record })))
  const excerpt = ctx.detail<DetailExcerpt>(createMemo(() => local() && props.entry.line ? path(ctx, '/api/board/excerpt', { path: props.entry.path, line: props.entry.line }) : undefined))
  const boxes = createBoxes('aictl-pref-file-boxes')
  return <>
    <HiddenBoxes boxes={boxes} />
    <Show when={local()}>
      <Show when={editing()} fallback={<div class={styles.bar}>
        <button type="button" class={styles.button} onClick={() => edit(true)}>Edit file</button>
        <Show when={/(^|[\\/])\.context\.toml$/.test(props.entry.path ?? '')}>
          <button type="button" class={styles.button} onClick={() => ctx.runCommand({
            title: 'Deploy context files', lead: 'Write tools’ native context files from the project configuration.',
            command: 'aictl ctx deploy', action: 'ctx-deploy', done: 'Deployed context files', applyLabel: 'Deploy',
          })}>Deploy the context</button>
        </Show>
      </div>}>
        <Loading fallback={<PanelState state="loading" />}><FileEditor path={props.entry.path ?? ''} ctx={ctx} close={() => edit(false)}
          saved={() => { excerpt.retry(); read.retry() }} /></Loading>
      </Show>
    </Show>
    <Show when={local() && props.entry.line}><Section title={`Line ${props.entry.line}`}>
      <Resource read={excerpt}>{value =>
        <CodeView label="File excerpt" text={value().lines.map(line => line.text).join('\n')}
          firstLine={value().lines[0]?.n} highlight={[value().line]} wrap />
      }</Resource>
    </Section></Show>
    <Resource read={read}>{data => <>
      <Show when={data().diff || !props.entry.line}>
        <Section title="Diff"><Show when={data().diff} fallback={<PanelState state="unavailable" message="No diff is stored for this file." />}>{diff =>
          <CodeView label="Recorded diff" text={diff().map(row => `${row.kind === 'add' ? '+' : row.kind === 'del' ? '−' : ' '} ${row.text}`).join('\n')} wrap />
        }</Show></Section>
      </Show>
      <Section title="Edits in this time">
        <Stats items={[{ label: 'Edits', value: data().edits?.length }]} />
        <Rows label="Edits in this time" rows={data().edits} identity={['agent_id', 'ts']}
          columns={[[ 'ts', 'Time', 'time' ], 'title', 'lines_added', 'lines_removed']}
          action={{ label: row => `Open ${row.title}`, run: row => props.shell.open({ type: 'agent', id: row.agent_id, tab: 'changes' }) }} />
      </Section>
    </>}</Resource>
    <Show when={props.entry.path}>{file => <MemoryVersions shell={props.shell} boxes={boxes} path={file()} record={props.entry.record} />}</Show>
  </>
}

function Prompt(props: Props) {
  const ctx = untrack(() => props.shell.ctx)
  const read = ctx.detail<DetailPrompt>(createMemo(() => path(ctx, '/api/board/prompt', { ts: props.entry.ts, session_id: props.entry.session_id })))
  const [source, setSource] = createSignal(false)
  return <Resource read={read}>{data => <>
    <Section title="Prompt totals">
      <Stats items={[{ label: 'Model calls', value: data().calls }, { label: 'Tool calls', value: data().tool_calls },
        { label: 'Input', value: data().input, unit: 'tokens' }, { label: 'Output', value: data().output, unit: 'tokens' },
        { label: 'Cache read', value: data().cache_read, unit: 'tokens' }, { label: 'Cache write', value: data().cache_write, unit: 'tokens' },
        { label: 'Cost', value: data().cost_usd, unit: 'USD' }, { label: 'Model time', value: data().reply_ms, unit: 'ms' }]} />
    </Section>
    <Section title="Full text">
      <Show when={data().text} fallback={<PanelState state="unavailable" message="Prompt text was not retained." />}>{value => <>
        <button type="button" class={styles.button} aria-pressed={source() ? 'true' : 'false'} onClick={() => setSource(v => !v)}>Source</button>
        <Show when={source()} fallback={<Markdown text={value()} />}><CodeView text={value()} label="Prompt source" wrap /></Show>
      </>}</Show>
      <div class={styles.bar}>
        <Show when={props.entry.session_id}>{id => <button type="button" class={styles.button}
          onClick={() => props.shell.open({ type: 'agent', id: id(), tab: 'flow' })}>Open session</button>}</Show>
        <Show when={data().prompt_file}>{file => <button type="button" class={styles.button}
          onClick={() => props.shell.open({ type: 'file', path: file(), line: 1 })}>Open prompt file</button>}</Show>
      </div>
    </Section>
  </>}</Resource>
}

function Tool(props: Props) {
  const ctx = untrack(() => props.shell.ctx)
  const read = ctx.detail<DetailTool>(createMemo(() => path(ctx, '/api/board/tool', { ...rangeQuery(ctx), name: props.entry.name })))
  return <Resource read={read}>{data => <Section title="Recorded tool calls">
    <Stats items={[{ label: 'Calls', value: data().total }, { label: 'Failed calls shown', value: data().calls.filter(call => call.failed).length }]} />
    <Rows label="Recorded tool calls" rows={data().calls} identity={['ts', 'agent_id', 'target']}
      columns={[[ 'ts', 'Time', 'time' ], 'target', 'title', 'duration_ms', 'failed', 'confirm']}
      action={{ label: row => `Open ${row.title}`, run: row => props.shell.open({ type: 'agent', id: row.agent_id, tab: 'tools' }) }} />
  </Section>}</Resource>
}

function Failure(props: Props) {
  const ctx = untrack(() => props.shell.ctx)
  const read = ctx.detail<DetailError>(createMemo(() => path(ctx, '/api/board/error', { ...rangeQuery(ctx), key: props.entry.key })))
  return <Resource read={read}>{data => <Section title="Recorded failures">
    <Stats items={[{ label: 'Failures shown', value: data().items.length }]} />
    <Rows label="Recorded failures" rows={data().items} identity={['ts', 'agent_id']} columns={[[ 'ts', 'Time', 'time' ], 'title', 'detail']}
      action={{ label: row => `Open ${row.title}`, run: row => props.shell.open({ type: 'agent', id: row.agent_id, tab: 'errors' }) }} />
  </Section>}</Resource>
}

function Skill(props: Props) {
  const ctx = untrack(() => props.shell.ctx)
  const read = ctx.detail<DetailSkill>(createMemo(() => path(ctx, '/api/board/skill', { ...rangeQuery(ctx), name: props.entry.name })))
  const [location, inspect] = createSignal<string>()
  return <Resource read={read}>{data => <>
    <Section title="Skill usage">
      <Stats items={[{ label: 'Uses in range', value: data().uses }, { label: 'Total uses', value: data().total_uses },
        { label: 'Agents', value: data().agents }, { label: 'File reads', value: data().file_reads }]} />
      <Rows label="Skill calls" rows={data().calls} identity={['agent_id', 'ts']} columns={[[ 'ts', 'Time', 'time' ], 'title', 'project', 'tool', 'trigger']}
        action={{ label: row => `Open ${row.title}`, run: row => props.shell.open({ type: 'agent', id: row.agent_id, tab: 'flow', initialSkills: true }) }} />
    </Section>
    <Section title="Skill locations">
      <Rows label="Skill locations" rows={data().locations} identity={['path', 'scope']}
        columns={[['path', 'Path', 'path'], 'scope', 'owner', 'reach', 'git_state']} actionColumn="path"
        action={{ label: row => `Inspect ${row.path}`, run: row => inspect(row.path) }} />
      <Show when={data().locations?.find(row => row.path === location())}>{row => <>
        <Markdown text={row().content || row().description || 'No retained text.'} />
        <Show when={ctx.scope() === 'local'}><button type="button" class={styles.button}
          onClick={() => props.shell.open({ type: 'file', path: row().path, line: 1 })}>Open skill file</button></Show>
      </>}</Show>
    </Section>
  </>}</Resource>
}

export default function OtherDetail(props: Props) {
  const title = () => props.entry.type === 'hidden' ? 'Hidden context' : props.entry.type === 'prompt' ? 'Prompt' :
    props.entry.type === 'mcp' ? (props.entry.name === 'builtin' ? 'Built-in tools' : props.entry.name === 'unknown'
      ? 'Unknown MCP server' : `MCP server ${props.entry.name?.replace(/^mcp:/, '')}`) :
    props.entry.path ?? props.entry.name ?? props.entry.key ?? 'Detail'
  return <Drawer open id="drawer" title={title()} onClose={props.shell.close} onEscape={props.shell.back} resizable
    actions={<Show when={props.shell.stack.length > 1}><button type="button" class={styles.button} onClick={props.shell.back}>Back</button></Show>}>
    <div class={styles.body}>
      <Switch>
        <Match when={props.entry.type === 'file'}><File {...props} /></Match>
        <Match when={props.entry.type === 'prompt'}><Prompt {...props} /></Match>
        <Match when={props.entry.type === 'error'}><Failure {...props} /></Match>
        <Match when={props.entry.type === 'tool'}><Tool {...props} /></Match>
        <Match when={props.entry.type === 'skill'}><Skill {...props} /></Match>
        <Match when={props.entry.type === 'mcp'}><Loading fallback={<PanelState state="loading" />}><McpDetail {...props} /></Loading></Match>
        <Match when={props.entry.type === 'hidden'}><Loading fallback={<PanelState state="loading" />}><Hidden shell={props.shell} /></Loading></Match>
      </Switch>
    </div>
  </Drawer>
}

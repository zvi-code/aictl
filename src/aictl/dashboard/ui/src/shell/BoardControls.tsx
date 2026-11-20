import { createSignal, For, Show, untrack } from 'solid-js'
import { RANGES, STATUSES, canClear } from '../data/filters'
import { toolsToParams } from '../data/urlState'
import type { PanelContext } from '../panels/types'
import { Dialog } from '../ui/Dialog'
import { Popover } from '../ui/Popover'
import styles from './Shell.module.css'

export function BoardControls(props: {
  ctx: PanelContext; find: (element: HTMLInputElement) => void; clear: () => void
  custom: boolean; setCustom: (open: boolean) => void; text: string; search: (text: string) => void
}) {
  const ctx = untrack(() => props.ctx)
  const [error, setError] = createSignal('')
  const options = () => ctx.board('options')
  const scope = () => ctx.board('scope')
  const tools = () => options()?.tools ?? []
  const chooseTool = (id: string, checked: boolean) => {
    const next = new Set(ctx.tools() ?? tools().map(tool => tool.id))
    if (checked) next.add(id)
    else next.delete(id)
    ctx.navigate(toolsToParams([...next]))
  }
  const date = (seconds: number | undefined) => {
    if (!seconds) return ''
    const time = new Date(seconds * 1000)
    return new Date(time.getTime() - time.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }
  return <>
    <div class={styles.controls} role="group" aria-label="Overview filters">
      <label>Time range <select class={styles.input} value={ctx.filters().range.id} onChange={event => {
        const range = event.currentTarget.value
        if (range === 'custom') { setError(''); props.setCustom(true); event.currentTarget.value = ctx.filters().range.id }
        else ctx.navigate({ range, since: null, until: null, sel: null })
      }}>
        <For each={RANGES}>{range => <option value={range.id}>{range.label}</option>}</For>
        <option value="custom">Custom</option>
      </select></label>
      <Show when={ctx.filters().range.id === 'custom'}><button class={styles.button} type="button"
        onClick={() => { setError(''); props.setCustom(true) }}>Edit custom range</button></Show>
      <label>Find <input ref={props.find} class={styles.input} type="search" value={props.text}
        placeholder="Agents, prompts, files, tools" onInput={event => props.search(event.currentTarget.value)} /></label>
      <Popover label={`Tool: ${ctx.tools() == null ? 'All' : ctx.tools()!.length || 'None'}`} title="Filter tools">
        <div class={styles.controls}>
          <button type="button" class={styles.button} onClick={() => ctx.navigate({ tools: null })}>All tools</button>
          <button type="button" class={styles.button} onClick={() => ctx.navigate({ tools: '' })}>No tools</button>
        </div>
        <Show when={options()} fallback={<p>Tool choices are not available yet.</p>}>
          <For each={tools()} keyed={tool => tool.id}>{tool => <label class={styles.choice}>
            <input type="checkbox" checked={ctx.tools() == null || ctx.tools()!.includes(tool().id)}
              onChange={event => chooseTool(tool().id, event.currentTarget.checked)} /> {tool().label || tool().id}
          </label>}</For>
        </Show>
      </Popover>
      <For each={['project', 'model'] as const}>{key => {
        const rows = () => options()?.[key === 'project' ? 'projects' : 'models'] ?? []
        return <label>{key === 'project' ? 'Project' : 'Model'} <select class={styles.input} value={ctx.filters()[key]}
          onChange={event => ctx.navigate({ [key]: event.currentTarget.value === 'all' ? null : event.currentTarget.value })}>
          <option value="all">All</option>
          <Show when={ctx.filters()[key] !== 'all' && !rows().some(row => row.id === ctx.filters()[key])}>
            <option value={ctx.filters()[key]}>{ctx.filters()[key]}</option>
          </Show>
          <For each={rows()} keyed={row => row.id}>{row => <option value={row().id}>{row().id}</option>}</For>
        </select></label>
      }}</For>
      <label>Status <select class={styles.input} value={ctx.filters().status}
        onChange={event => ctx.navigate({ status: event.currentTarget.value === 'all' ? null : event.currentTarget.value })}>
        <For each={STATUSES}>{([id, label]) => <option value={id}>{label}</option>}</For>
      </select></label>
      <Show when={ctx.filters().sel}>
        <span>Time selected: {date(ctx.filters().sel?.since)} to {date(ctx.filters().sel?.until)}</span>
        <button class={styles.button} type="button" onClick={() => ctx.select(null)}>Clear time selection</button>
      </Show>
      <Show when={canClear(ctx.filters(), ctx.tools())}>
        <button class={styles.button} type="button" onClick={() => props.clear()}>Clear filters</button>
      </Show>
      <Show when={scope()}>
        <span>{scope()!.shown_agents} of {scope()!.all_agents} agents</span>
      </Show>
    </div>
    <Dialog title="Custom time range" open={props.custom} onClose={() => props.setCustom(false)}>
      <form class={styles.form} onSubmit={event => {
        event.preventDefault()
        const values = new FormData(event.currentTarget)
        const since = Math.floor(new Date(String(values.get('since'))).getTime() / 1000)
        const until = Math.floor(new Date(String(values.get('until'))).getTime() / 1000)
        if (!(since > 0 && until > since)) { setError('Enter an end time after the start time.'); return }
        ctx.navigate({ range: 'custom', since, until, sel: null })
        props.setCustom(false)
      }}>
        <label>Start <input class={styles.input} type="datetime-local" name="since" value={date(ctx.filters().range.since)} required /></label>
        <label>End <input class={styles.input} type="datetime-local" name="until" value={date(ctx.filters().range.until)} required /></label>
        <Show when={error()}><span role="alert">{error()}</span></Show>
        <button class={styles.button} type="submit">Apply range</button>
      </form>
    </Dialog>
  </>
}

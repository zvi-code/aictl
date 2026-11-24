import { For, Show, untrack } from 'solid-js'
import { STATUSES, canClear, modelReportedAs } from '../data/filters'
import { toolsToParams } from '../data/urlState'
import type { PanelContext } from '../panels/types'
import { Icon } from '../ui/Icon'
import { Popover } from '../ui/Popover'
import styles from './Shell.module.css'

export function BoardControls(props: {
  ctx: PanelContext; find: (element: HTMLInputElement) => void; clear: () => void
  text: string; search: (text: string) => void
  rail: boolean; toggleRail: () => void
}) {
  const ctx = untrack(() => props.ctx)
  const options = () => ctx.board('options')
  const scope = () => ctx.board('scope')
  const tools = () => options()?.tools ?? []
  const chooseTool = (id: string, checked: boolean) => {
    const next = new Set(ctx.tools() ?? tools().map(tool => tool.id))
    if (checked) next.add(id)
    else next.delete(id)
    ctx.navigate(toolsToParams([...next]))
  }
  // A model's menu entry is its canonical id; the hover names each spelling the tools stored.
  const toolLabel = (id: string) => tools().find(tool => tool.id === id)?.label || id
  const date = (seconds: number | undefined) => {
    if (!seconds) return ''
    const time = new Date(seconds * 1000)
    return new Date(time.getTime() - time.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }
  return <>
    <div class={styles.filters} role="group" aria-label="Overview filters">
      <button class={styles.iconButton} type="button" aria-label="Sections" title={props.rail ? 'Hide the section list' : 'Show the section list'}
        aria-controls="overview-sections" aria-expanded={props.rail ? 'true' : 'false'} onClick={() => props.toggleRail()}>
        <Icon glyph="menu" /></button>
      <label class={styles.search}><Icon glyph="search" /><span class={styles.srOnly}>Find</span>
        <input ref={props.find} type="search" value={props.text} placeholder="Find agents, prompts, files, tools"
          onInput={event => props.search(event.currentTarget.value)} /><kbd aria-hidden="true">/</kbd></label>
      <span class={styles.toolTrigger} data-active={ctx.tools() != null ? '' : undefined}>
        <Popover label={`Tool: ${ctx.tools() == null ? 'All' : ctx.tools()!.length || 'None'}`} title="Filter tools" glyph="tools"
          text={`Tool: ${ctx.tools() == null ? 'All' : ctx.tools()!.length || 'None'}`}>
          <div class={styles.controls}>
            <button type="button" class={styles.secondary} onClick={() => ctx.navigate({ tools: null })}>All tools</button>
            <button type="button" class={styles.secondary} onClick={() => ctx.navigate({ tools: '' })}>No tools</button>
          </div>
          <Show when={options()} fallback={<p>Tool choices are not available yet.</p>}>
            <For each={tools()} keyed={tool => tool.id}>{tool => <label class={styles.choice}>
              <input type="checkbox" checked={ctx.tools() == null || ctx.tools()!.includes(tool().id)}
                onChange={event => chooseTool(tool().id, event.currentTarget.checked)} /> {tool().label || tool().id}
            </label>}</For>
          </Show>
        </Popover>
      </span>
      {/* The project filter is in the top bar: it applies to every screen, not to the board only. */}
      {(() => {
        const rows = () => options()?.models ?? []
        return <label class={styles.filter} data-active={ctx.filters().model !== 'all' ? '' : undefined}>
          <span>Model</span>
          <select value={ctx.filters().model}
            onChange={event => ctx.navigate({ model: event.currentTarget.value === 'all' ? null : event.currentTarget.value })}>
            <option value="all">All</option>
            <Show when={ctx.filters().model !== 'all' && !rows().some(row => row.id === ctx.filters().model)}>
              <option value={ctx.filters().model}>{ctx.filters().model}</option>
            </Show>
            <For each={rows()} keyed={row => row.id}>{row => <option value={row().id} title={modelReportedAs(row(), toolLabel)}>{row().id}</option>}</For>
          </select><Icon glyph="down" small /></label>
      })()}
      <label class={styles.filter} data-active={ctx.filters().status !== 'all' ? '' : undefined}><span>Status</span>
        <select value={ctx.filters().status}
          onChange={event => ctx.navigate({ status: event.currentTarget.value === 'all' ? null : event.currentTarget.value })}>
          <For each={STATUSES}>{([id, label]) => <option value={id}>{label}</option>}</For>
        </select><Icon glyph="down" small /></label>
      <Show when={ctx.filters().sel}>
        <span class={styles.chip}>Time selected: {date(ctx.filters().sel?.since)} to {date(ctx.filters().sel?.until)}
          <button class={styles.chipClose} type="button" aria-label="Clear time selection" title="Clear time selection" onClick={() => ctx.select(null)}>
            <Icon glyph="close" small /></button></span>
      </Show>
      <Show when={canClear(ctx.filters(), ctx.tools())}>
        <button class={styles.small} type="button" onClick={() => props.clear()}><Icon glyph="close" small />Clear filters</button>
      </Show>
      <Show when={scope()}>
        <span class={styles.count}>{scope()!.shown_agents} of {scope()!.all_agents} agents</span>
      </Show>
    </div>
  </>
}

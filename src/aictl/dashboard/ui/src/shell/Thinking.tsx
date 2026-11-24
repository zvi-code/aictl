import { createMemo, createSignal, For, Show, untrack } from 'solid-js'
import type { DetailThinking, DetailThinkingSearch } from '../data/contract.gen'
import { fmtNum, stamp, toolDisplayName } from '../design/format'
import { nodeCell } from '../data/nodeNames'
import { blockNote } from '../drawer/thinkingModel'
import { detailPath, detailRead } from '../panels/data'
import { insightWindow } from '../panels/insights/insightsModel'
import { States } from '../panels/kinds/States'
import {
  flowTarget, PAGE_SIZE, pageText, searchQuery, searchSummary, shareText, snippetText,
  type SearchBlock, type SearchSort, type SearchState,
} from '../panels/thinking/thinkingSearchModel'
import type { PanelContext } from '../panels/types'
import { Chart } from '../ui/Chart'
import { CodeView } from '../ui/CodeView'
import { Icon } from '../ui/Icon'
import { Table } from '../ui/Table'
import type { Field } from '../ui/tableModel'
import styles from './Thinking.module.css'

const rowKey = (block: SearchBlock) => JSON.stringify([block.node_id, block.session_id, block.thinking_key])

/**
 * Search and browse the thinking text of model calls: whole-term search over the page's period, tools, model,
 * projects and nodes, with the count of matching blocks, their split by tool, model and day, and one page of blocks.
 */
export default function Thinking(props: { ctx: PanelContext; search: string }) {
  const ctx = untrack(() => props.ctx)
  const period = createMemo(() => insightWindow(props.search, ctx.startedAt))
  const [draft, setDraft] = createSignal('')
  const [state, setState] = createSignal<SearchState>({ q: '', sort: 'ts', ascending: false, offset: 0 })
  const [open, setOpen] = createSignal<SearchBlock>()
  const read = ctx.detail<DetailThinkingSearch>(createMemo(() => detailPath(ctx, '/api/board/thinking/search',
    searchQuery(state(), period(), ctx.tools(), ctx.filters().model))))
  const data = () => read()?.data
  const result = () => detailRead(read(), data(), false, 'the thinking search')
  const full = ctx.detail<DetailThinking>(createMemo(() => {
    const block = open()
    return block && detailPath(ctx, '/api/board/thinking', new URLSearchParams({ session_id: block.session_id, key: block.thinking_key }))
  }))
  const submit = (event: SubmitEvent) => {
    event.preventDefault()
    setOpen(undefined)
    setState(old => ({ ...old, q: draft(), offset: 0 }))
  }
  const page = (step: number) => setState(old => ({ ...old, offset: Math.max(0, old.offset + step * PAGE_SIZE) }))
  const sortBy = (sort: SearchSort) => setState(old => ({
    ...old, sort, ascending: old.sort === sort ? !old.ascending : false, offset: 0,
  }))
  const openFlow = (block: SearchBlock) => {
    const target = flowTarget(block)
    ctx.openAgent(target.id, 'flow', target.extra)
  }
  const fields: Field<SearchBlock>[] = [
    { id: 'ts', label: 'Time', read: block => block.ts, format: value => stamp(Number(value), true), numeric: true },
    { id: 'node_id', label: 'Node', ...nodeCell<SearchBlock>(block => block.node_id), sortable: false },
    { id: 'tool', label: 'Tool', read: block => toolDisplayName(block.tool), sortable: false },
    { id: 'model', label: 'Model', read: block => block.model, sortable: false },
    { id: 'title', label: 'Session', read: block => block.title || block.session_id, sortable: false,
      hint: block => `Session ${block.session_id}${block.agent_id ? `, subagent ${block.agent_id}` : ''}` },
    { id: 'chars', label: 'Characters', read: block => block.chars, format: value => fmtNum(Number(value)), numeric: true },
    { id: 'snippet', label: 'Text', read: block => snippetText(block) || (data()?.text_kept ? 'Text no longer kept' : 'Text not kept on this node'),
      sortable: false, title: 'The text around the first match; select Show text for the whole block.',
      action: { label: () => 'Show text', run: block => setOpen(block) } },
  ]
  const describe = () => period().id === 'all' ? `All stored history up to ${stamp(period().until, true)}`
    : `${stamp(period().since, true)} to ${stamp(period().until, true)}`

  return <div data-screen="thinking" class={styles.screen}>
    <header class={styles.heading}>
      <h1>Search: thinking text</h1>
      <p>{describe()}. The visible thinking text of model calls, for the chosen tools, model, projects and nodes.</p>
    </header>

    <form class={styles.search} role="search" aria-label="Search thinking text" onSubmit={submit}>
      <label class={styles.box}>
        <Icon glyph="search" small />
        <input type="search" maxlength={400} value={draft()} placeholder='Whole words, or "an exact phrase"'
          aria-label="Search thinking text" onInput={event => setDraft(event.currentTarget.value)} />
      </label>
      <button class={styles.searchButton} type="submit">Search</button>
      <span class={styles.hint}>Words match whole terms, all of them; a quoted phrase matches as written. An empty search lists the newest blocks.</span>
    </form>

    <States result={result} retry={read.retry}>
      <Show when={data()}>{body => <>
        <section class={styles.summary} aria-label="Matching blocks">
          <p class={styles.total}><strong>{fmtNum(body().total)}</strong>
            <span>{searchSummary(body().search)} · {fmtNum(body().chars)} characters
              {body().first_ts != null ? ` · ${stamp(body().first_ts!, true)} to ${stamp(body().last_ts!, true)}` : ''}</span></p>
          <Show when={!body().text_kept}>
            <p class={styles.note}>This node keeps no text: blocks are listed with their size, and text is not searched.</p>
          </Show>
          <div class={styles.splits}>
            <For each={[['By tool', body().by_tool, toolDisplayName], ['By model', body().by_model, (name: string) => name || 'No model id']] as const}>
              {([title, items, name]) => <div>
                <h2>{title}</h2>
                <ul class={styles.split}><For each={items}>{item =>
                  <li title={`${fmtNum(item.chars)} characters`}>
                    <span class={styles.name}>{name(item.name)}</span>
                    <span class={styles.bar} style={{ 'inline-size': `${body().total ? item.blocks / body().total * 100 : 0}%` }} />
                    <span class={styles.value}>{shareText(item.blocks, body().total)}</span>
                  </li>
                }</For></ul>
              </div>}
            </For>
          </div>
          <Show when={body().by_day.length > 1}>
            <Chart label="Matching blocks per day" description="Matching blocks per UTC day." xAxis="time"
              series={[{ label: 'Blocks', color: 0 }]} points={body().by_day.map(day => ({ x: day.day, values: [day.blocks] }))} />
          </Show>
        </section>

        <section class={styles.results} aria-label="Blocks">
          <div class={styles.pager}>
            <span>{pageText(body().search.offset, body().blocks.length, body().total)}</span>
            <button class={styles.smallButton} type="button" disabled={body().search.offset === 0} onClick={() => page(-1)}>Newer page</button>
            <button class={styles.smallButton} type="button" disabled={body().search.offset + body().blocks.length >= body().total} onClick={() => page(1)}>Next page</button>
          </div>
          <Table label="Thinking blocks" tableId="thinking-blocks" fields={fields} rows={body().blocks} rowId={rowKey}
            sorted={{ sort: { id: state().sort, desc: !state().ascending },
              onSort: field => { if (field.id === 'ts' || field.id === 'chars') sortBy(field.id) } }}
            action={{ label: block => block.call_ts != null ? 'Open call in flow' : 'Open session flow', run: openFlow }} />
        </section>

        <Show when={open()}>{block => <section class={styles.text} aria-label="Block text">
          <header>
            <h2>{toolDisplayName(block().tool)} · {block().model} · {stamp(block().ts, true)} · {fmtNum(block().chars)} characters</h2>
            <button class={styles.smallButton} type="button" onClick={() => openFlow(block())}>{block().call_ts != null ? 'Open call in flow' : 'Open session flow'}</button>
            <button class={styles.smallButton} type="button" aria-label="Close block text" onClick={() => setOpen(undefined)}><Icon glyph="close" small /></button>
          </header>
          <Show when={full()?.data} fallback={<p class={styles.note}>Loading the text…</p>}>{detail =>
            <For each={detail().blocks} fallback={<p class={styles.note}>This block is no longer stored.</p>}>{item =>
              <Show when={item.text} fallback={<p class={styles.note}>{blockNote(item)}</p>}>
                <CodeView label="Thinking block" text={item.text} wrap copy />
              </Show>
            }</For>
          }</Show>
        </section>}</Show>
      </>}</Show>
    </States>
  </div>
}

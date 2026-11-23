import { createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import { fmtBytes, fmtN, stamp } from '../../design/format'
import type { Row } from '../../panels/types'
import { CodeView } from '../../ui/CodeView'
import { Meter } from '../../ui/Meter'
import { PanelState } from '../../ui/PanelState'
import { Segmented } from '../../ui/Segmented'
import { createBoxes, HiddenBoxes } from '../../ui/Box'
import { Checkpoints } from '../MemoryViews'
import { clip, number, openAgent, records, Resource, Rows, Section, Series, Stats, text, type TabProps } from '../shared'
import { EvidenceBrowser } from './Evidence'
import styles from '../drawer.module.css'

const groups = [{ id: 'measurements', label: 'Measurements' }, { id: 'model_input', label: 'Model input' },
  { id: 'skills_mcp', label: 'Skills and MCP' }, { id: 'changes', label: 'Changes' }]
const shortChars = 600
const shortLines = 12

function shortText(value: string) {
  const lines = value.split('\n')
  const sliced = lines.slice(0, shortLines).join('\n')
  const trimmed = sliced.length > shortChars ? sliced.slice(0, shortChars) : sliced
  return trimmed.length < value.length ? `${trimmed}…` : value
}

function itemDetail(row: Row) {
  return text(row.detail) || text(row.path) || (row.basis === 'call delta'
    ? 'Estimated from model call growth' : row.estimated ? 'Estimated from section size' : 'Measured by tool')
}

export default function Context(props: TabProps) {
  const [group, setGroup] = createSignal('measurements')
  const [basis, setBasis] = createSignal('last')
  const [category, selectCategory] = createSignal<string>()
  const [pickedItem, setPickedItem] = createSignal<Row>()
  const [fullItem, setFullItem] = createSignal(false)
  const [pickedAddition, setPickedAddition] = createSignal<Row>()
  const [fullAddition, setFullAddition] = createSignal(false)
  const [pickedResponse, setPickedResponse] = createSignal<Row>()
  const [fullResponse, setFullResponse] = createSignal(false)
  createEffect(category, () => { setPickedItem(undefined); setFullItem(false) })
  const boxes = createBoxes('aictl-pref-context-boxes')
  return <>
    <HiddenBoxes boxes={boxes} />
    <Resource read={props.detail}>{data => {
      const context = () => data().context
      const observed = () => data().otel?.context
      const largest = createMemo(() => data().tool_calls?.filter(row => row.output_bytes != null)
        .sort((a, b) => b.output_bytes! - a.output_bytes!).slice(0, 12))
      const breakdown = () => context()?.breakdown
      const report = () => {
        const value = breakdown()?.reported
        return value != null && typeof value === 'object' && !Array.isArray(value) ? value : undefined
      }
      const measures = () => basis() === 'reported' ? report() : breakdown()
      const parts = () => records(measures()?.parts)
      const denominator = () => Math.max(number(measures()?.limit) ?? 0, number(measures()?.total) ?? 0)
      const selected = () => parts()?.find(row => row.key === category())
      const items = createMemo((): Row[] | undefined => records(selected()?.items)?.map(row => ({ ...row, detail: itemDetail(row) })))
      const heaviest = createMemo((): Row[] | undefined => records(breakdown()?.heaviest)?.map(row => ({
        ...row, name: text(row.name) || text(row.kind) || 'Context addition',
      })))
      const matchAdditionText = (row: Row) => {
        const ts = number(row.ts)
        const name = text(row.name)
        if (row.kind === 'Tool results') {
          const call = data().tool_calls?.find(item => (!name || item.name === name) && (ts == null || Math.abs(item.ts - ts) <= 120))
            ?? data().tool_calls?.find(item => item.name === name)
          if (call) {
            const parts = [
              call.target ? `Target: ${call.target}` : '',
              call.output_bytes != null ? `Output: ${fmtBytes(call.output_bytes)}` : '',
              call.input_bytes != null ? `Input: ${fmtBytes(call.input_bytes)}` : '',
              call.duration_ms != null ? `Duration: ${call.duration_ms} ms` : '',
            ].filter(Boolean)
            if (parts.length) return parts.join('\n')
          }
        }
        const turn = data().turns?.find(item => ts != null && Math.abs(item.ts - ts) <= 120)
        if (turn?.text) return turn.text
        return `${text(row.kind) ?? 'Context addition'}${name ? ` · ${name}` : ''} (+${fmtN(number(row.tokens))} tokens at ${stamp(ts, true)})`
      }
      return <>
        <Section title="Context size">
          <Stats items={[
            { label: 'Current', value: context()?.last, unit: 'tokens' }, { label: 'First', value: context()?.first, unit: 'tokens' },
            { label: 'Peak', value: context()?.peak, unit: 'tokens' }, { label: 'Model calls', value: context()?.calls },
            { label: 'Tool definitions', value: context()?.tool_tokens, unit: 'tokens' },
            { label: 'Last request', value: context()?.request_bytes_last == null ? undefined : fmtBytes(context()?.request_bytes_last) },
          ]} />
          <Meter label="Context window used" value={context()?.prompt_limit ? context()?.last : undefined} max={context()?.prompt_limit ?? undefined}
            display={context()?.last == null ? undefined : `${context()!.last?.toLocaleString()} tokens`}
            tone={(context()?.limit_share ?? 0) > .85 ? 'warning' : 'neutral'} />
          <Show when={number(observed()?.current) != null}>
            <Meter label="Current context from OTel" value={number(observed()?.current)} max={number(observed()?.limit)}
              display={`${number(observed()?.current)?.toLocaleString()} tokens`} />
          </Show>
          <Series label="Context sent by model call" values={context()?.series} unit="tokens" />
        </Section>
        <Section title="Context breakdown">
          <Show when={report()}>
            <Segmented label="Context source" value={basis()} onChange={value => { setBasis(value); selectCategory(undefined) }}
              options={[{ id: 'last', label: 'Last model call' }, { id: 'reported', label: 'Tool context report' }]} />
            <Show when={basis() === 'reported'}><p class={styles.muted}>{text(report()?.source)} · {text(report()?.model)} · {stamp(number(report()?.ts), true)}</p></Show>
          </Show>
          <Show when={parts()?.length} fallback={<PanelState state={parts() ? 'empty' : 'unavailable'} />}>
            <div class={styles.stats}><For each={parts()}>{row => <div class={styles.stack}>
              <Meter label={`${text(row.label) ?? 'Context'}${row.estimated ? ' (estimated)' : ''}`} value={number(row.tokens)}
                max={denominator()} display={number(row.tokens)?.toLocaleString()} />
              <Show when={records(row.items)?.length}><button type="button" class={styles.button} aria-pressed={category() === row.key ? 'true' : 'false'}
                onClick={() => selectCategory(category() === row.key ? undefined : text(row.key))}>Inspect {text(row.label)}</button></Show>
            </div>}</For></div>
            <Show when={selected()}>{row => <>
              <Rows label={text(row().label) ?? 'Context items'} rows={items()}
                identity={['name', 'detail']} columns={['name', 'detail', 'tokens']} actionColumn="name"
                action={{ label: item => `Inspect ${text(item.name) ?? 'context item'}`, run: item => {
                  const same = pickedItem()?.name === item.name && pickedItem()?.detail === item.detail
                  setPickedItem(same ? undefined : item)
                  setFullItem(false)
                } }} />
              <Show when={pickedItem()}>{item => {
                const body = () => text(item().text) || text(item().detail) || itemDetail(item())
                const hasMore = () => shortText(body()) !== body()
                return <Section title={`${text(item().name) ?? 'Context item'} · ${fmtN(number(item().tokens))} tokens`}>
                  <Show when={text(item().path)}>{p => <p class={styles.muted}>{p()}</p>}</Show>
                  <CodeView label={text(item().name) ?? 'Context item'} text={fullItem() ? body() : shortText(body())} wrap />
                  <div class={styles.bar}>
                    <Show when={hasMore()}>
                      <button type="button" class={styles.button} aria-pressed={fullItem() ? 'true' : 'false'}
                        onClick={() => setFullItem(v => !v)}>{fullItem() ? 'Show short preview' : 'Show full view'}</button>
                    </Show>
                    <Show when={props.shell.ctx.scope() === 'local' ? text(item().path) : undefined}>{p =>
                      <button type="button" class={styles.button} onClick={() => props.shell.open({ type: 'file', path: p(), line: 1 })}>Open file</button>
                    }</Show>
                    <Show when={text(item().name)?.startsWith('Tool results')}>
                      <button type="button" class={styles.button} onClick={() => props.shell.changeTab('tools')}>Open Tool calls</button>
                    </Show>
                    <Show when={text(item().name)?.startsWith('User prompts') || text(item().name)?.startsWith('Replies')}>
                      <button type="button" class={styles.button} onClick={() => props.shell.changeTab('turns')}>Open Turns</button>
                    </Show>
                    <button type="button" class={styles.button} onClick={() => setPickedItem(undefined)}>Close preview</button>
                  </div>
                </Section>
              }}</Show>
            </>}</Show>
          </Show>
          <Rows label="Largest measured additions" rows={heaviest()} identity={['ts', 'name']}
            columns={[[ 'ts', 'Time', 'time' ], 'kind', 'name', 'tokens']} actionColumn="name"
            action={{ label: row => `Inspect ${text(row.name) || text(row.kind) || 'context addition'}`, run: row => {
              const same = pickedAddition()?.ts === row.ts && pickedAddition()?.name === row.name
              setPickedAddition(same ? undefined : row)
              setFullAddition(false)
            } }} />
          <Show when={pickedAddition()}>{row => {
            const body = () => matchAdditionText(row())
            const hasMore = () => shortText(body()) !== body()
            return <Section title={`${text(row().kind) ?? 'Addition'} · ${text(row().name)} · +${fmtN(number(row().tokens))} tokens`}>
              <CodeView label={text(row().name) ?? 'Context addition'} text={fullAddition() ? body() : shortText(body())} wrap />
              <div class={styles.bar}>
                <Show when={hasMore()}>
                  <button type="button" class={styles.button} aria-pressed={fullAddition() ? 'true' : 'false'}
                    onClick={() => setFullAddition(v => !v)}>{fullAddition() ? 'Show short preview' : 'Show full view'}</button>
                </Show>
                <button type="button" class={styles.button}
                  onClick={() => props.shell.changeTab(row().kind === 'Tool results' ? 'tools' : 'turns')}>
                  {row().kind === 'Tool results' ? 'Open Tool calls' : 'Open Turns'}
                </button>
                <button type="button" class={styles.button} onClick={() => setPickedAddition(undefined)}>Close preview</button>
              </div>
            </Section>
          }}</Show>
          <Rows label="Context by agent" rows={context()?.by_agent} identity={['agent_id']} columns={['agent_id', 'calls', 'first', 'peak', 'last']}
            action={{ label: row => `Open ${row.agent_id || 'main agent'}`, run: row => {
              // The address carries the session: an agent id alone can name agents of several sessions.
              const id = text(row.address) ?? text(row.agent_id)
              if (id) openAgent(props, id, 'context')
            } }} />
        </Section>
        <Section title="Compactions">
          <Rows label="Compactions" rows={context()?.compactions} identity={['ts', 'trigger']}
            columns={[[ 'ts', 'Time', 'time' ], 'trigger', 'before', 'after', 'freed', ['duration_ms', 'Duration (ms)', 'number']]} />
        </Section>
        <Checkpoints tab={props} boxes={boxes} rows={data().checkpoints} />
        <Section title="Largest tool responses">
          <Rows label="Largest tool responses" rows={largest()} identity={['ts', 'name', 'target']}
            columns={['name', 'target', 'output_bytes', 'input_bytes', ['ts', 'Time', 'time']]} actionColumn="name"
            action={{ label: row => `Inspect ${row.name} (${clip(row.target, 40) || 'tool call'})`, run: row => {
              const same = pickedResponse()?.ts === row.ts && pickedResponse()?.name === row.name && pickedResponse()?.target === row.target
              setPickedResponse(same ? undefined : row)
              setFullResponse(false)
            } }} />
          <Show when={pickedResponse()}>{row => {
            const outBytes = () => number(row().output_bytes)
            const inBytes = () => number(row().input_bytes)
            const name = () => text(row().name) ?? 'Tool call'
            const body = () => [
              row().target ? `Target: ${String(row().target)}` : '',
              outBytes() != null ? `Output: ${fmtBytes(outBytes()!)}` : '',
              inBytes() != null ? `Input: ${fmtBytes(inBytes()!)}` : '',
              row().result_summary ? `Result:\n${String(row().result_summary)}` : '',
              row().input ? `Input:\n${String(row().input)}` : '',
            ].filter(Boolean).join('\n\n') || name()
            const hasMore = () => shortText(body()) !== body()
            return <Section title={`${name()} · ${outBytes() == null ? '' : fmtBytes(outBytes()!)}`}>
              <CodeView label={name()} text={fullResponse() ? body() : shortText(body())} wrap />
              <div class={styles.bar}>
                <Show when={hasMore()}>
                  <button type="button" class={styles.button} aria-pressed={fullResponse() ? 'true' : 'false'}
                    onClick={() => setFullResponse(v => !v)}>{fullResponse() ? 'Show short preview' : 'Show full view'}</button>
                </Show>
                <button type="button" class={styles.button} onClick={() => props.shell.changeTab('tools')}>Open Tool calls</button>
                <button type="button" class={styles.button} onClick={() => setPickedResponse(undefined)}>Close preview</button>
              </div>
            </Section>
          }}</Show>
        </Section>
      </>
    }}</Resource>
    <Section title="Context history">
      <Segmented label="Context history group" options={groups} value={group()} onChange={setGroup} />
      <Show keyed when={group()}>{value => <EvidenceBrowser tab={props} contextOnly={value === 'measurements'}
        contextGroup={value === 'measurements' ? undefined : value} />}</Show>
    </Section>
  </>
}

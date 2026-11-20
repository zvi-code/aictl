import { createMemo, createSignal, For, Show } from 'solid-js'
import { fmtBytes, stamp } from '../../design/format'
import { Meter } from '../../ui/Meter'
import { PanelState } from '../../ui/PanelState'
import { Segmented } from '../../ui/Segmented'
import { number, openAgent, records, Resource, Rows, Section, Series, Stats, text, type TabProps } from '../shared'
import { EvidenceBrowser } from './Evidence'
import styles from '../drawer.module.css'

const groups = [{ id: 'measurements', label: 'Measurements' }, { id: 'model_input', label: 'Model input' },
  { id: 'skills_mcp', label: 'Skills and MCP' }, { id: 'changes', label: 'Changes' }]

export default function Context(props: TabProps) {
  const [group, setGroup] = createSignal('measurements')
  const [basis, setBasis] = createSignal('last')
  const [category, selectCategory] = createSignal<string>()
  return <>
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
            <Show when={selected()}>{row => <Rows label={text(row().label) ?? 'Context items'} rows={records(row().items)}
              identity={['name', 'detail']} columns={['name', 'detail', 'tokens']} />}</Show>
          </Show>
          <Rows label="Largest measured additions" rows={records(breakdown()?.heaviest)} identity={['ts', 'name']}
            columns={[[ 'ts', 'Time', 'time' ], 'kind', 'name', 'tokens']} />
          <Rows label="Context by agent" rows={context()?.by_agent} identity={['agent_id']} columns={['agent_id', 'calls', 'first', 'peak', 'last']}
            action={{ label: row => `Open ${row.agent_id || 'main agent'}`, run: row => {
              const id = text(row.agent_id)
              if (id) openAgent(props, id, 'context')
            } }} />
        </Section>
        <Section title="Compactions">
          <Rows label="Compactions" rows={context()?.compactions} identity={['ts', 'trigger']}
            columns={[[ 'ts', 'Time', 'time' ], 'trigger', 'before', 'after', 'freed', ['duration_ms', 'Duration (ms)', 'number']]} />
        </Section>
        <Section title="Largest tool responses">
          <Rows label="Largest tool responses" rows={largest()} identity={['ts', 'name', 'target']}
            columns={['name', 'target', 'output_bytes', 'input_bytes', ['ts', 'Time', 'time']]} />
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

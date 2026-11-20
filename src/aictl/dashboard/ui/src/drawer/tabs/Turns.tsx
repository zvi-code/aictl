import { createSignal, Show } from 'solid-js'
import { Markdown } from '../../ui/Markdown'
import { openAgent, Resource, Rows, Section, Stats, type TabProps } from '../shared'

export default function Turns(props: TabProps) {
  const [turn, pick] = createSignal<number>()
  return <Resource read={props.detail}>{data => <>
    <Section title="Turns">
      <Stats items={[{ label: 'Turns', value: data().turns?.length }]} />
      <Rows label="Turns" rows={data().turns} identity={['ts']} columns={[[ 'ts', 'Time', 'time' ], ['text', 'Prompt'], 'model',
        'input', 'output', 'cache_read', 'cache_write', 'tools', ['reply_ms', 'Model time (ms)', 'number'], 'cost_usd']}
        action={{ label: row => `Inspect turn at ${row.ts}`, run: row => pick(row.ts) }} />
    </Section>
    <Show when={data().turns?.find(row => row.ts === turn() || String(row.ts) === props.entry.turnId)}>{row =>
      <Section title="Turn detail">
        <Markdown text={row().text || 'Text not retained.'} />
        <button type="button" onClick={() => openAgent(props, props.entry.id, 'transcript')}>Open transcript</button>
      </Section>
    }</Show>
  </>}</Resource>
}

import { createSignal, Show } from 'solid-js'
import { Markdown } from '../../ui/Markdown'
import { numberedTurns } from '../turnModel'
import { openAgent, Resource, Rows, Section, Stats, type TabProps } from '../shared'

export default function Turns(props: TabProps) {
  const [turn, pick] = createSignal<number>()
  return <Resource read={props.detail}>{data => {
    const rows = () => numberedTurns(data().turns, props.agent()?.msgs?.user)
    return <>
    <Section title="Turns">
      <Stats items={[{ label: 'Turns', value: data().turns?.length }]} />
      <Rows label="Turns" rows={rows()} identity={['ts']} actionColumn="n"
        columns={[['n', 'Turn'], ['ts', 'Time', 'timeSec'], ['text', 'Prompt'], 'model', ['reply_ms', 'Reply time'],
          ['subagent_calls', 'Subagent calls'], ['tools', 'Tool calls'], 'input', 'output', 'cache_read', 'cache_write', 'cost_usd']}
        action={{ label: row => `Inspect turn ${row.n}`, run: row => pick(row.ts) }} />
    </Section>
    <Show when={data().turns?.find(row => row.ts === turn() || String(row.ts) === props.entry.turnId)}>{row =>
      <Section title="Turn detail">
        <Markdown text={row().text || 'Text not retained.'} />
        <button type="button" onClick={() => openAgent(props, props.entry.id, 'transcript')}>Open transcript</button>
      </Section>
    }</Show>
  </>}}</Resource>
}

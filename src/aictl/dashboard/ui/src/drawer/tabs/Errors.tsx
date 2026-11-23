import { Show } from 'solid-js'
import { fmtUsd, stampSec } from '../../design/format'
import { failureRow } from '../failureModel'
import { openAgent, Resource, Rows, Section, Stats, type TabProps } from '../shared'

export default function Errors(props: TabProps) {
  return <Resource read={props.detail}>{data => <Section title="Failures and loops">
    <Stats items={[{ label: 'Failures', value: data().errors?.length }, { label: 'Loop', value: data().loop ? 1 : data().loop === null ? 0 : undefined }]} />
    <Show when={data().loop}>{loop => <>
      <Stats items={[{ label: 'Repeats', value: loop().repeats }, { label: 'Loop tokens', value: loop().tokens },
        { label: 'Loop cost', value: loop().cost_usd != null ? fmtUsd(loop().cost_usd) : undefined }]} />
      <p role="status">{loop().pattern}</p>
    </>}</Show>
    <Rows label="Failures" rows={data().errors?.slice().sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0)).map(failureRow)} identity={['ts', 'key']}
      columns={[['ts', 'Time', 'timeSec'], 'tool', 'message']} actionColumn="ts"
      action={{ label: row => `Open the step of the failure at ${stampSec(row.ts)} in Flow`,
        run: row => openAgent(props, props.entry.id, 'flow', { failedAt: row.ts }) }}
      columnActions={{ message: { label: row => `Open all failures like this one: ${row.tool ?? row.key}`,
        run: row => props.shell.open({ type: 'error', key: row.key }) } }} />
  </Section>}</Resource>
}

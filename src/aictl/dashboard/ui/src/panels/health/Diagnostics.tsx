import { createMemo, For, Show } from 'solid-js'
import type { PanelProps } from '../types'
import { PanelState } from '../../ui/PanelState'
import { useHealth } from './healthData'
import { healthSources, healthStatus, ingesterState, MISSING, otelConfig } from './healthModel'
import { Detail, HealthBody } from './HealthParts'
import { StatTiles } from './HealthVisuals'

export default function Diagnostics(props: PanelProps) {
  const health = useHealth()
  return <HealthBody ctx={props.ctx}>{data => {
    const status = createMemo(() => healthStatus(data(), null, health.now()))
    const sources = createMemo(() => healthSources(data()))
    const issueList = (items: string[]) => <ul><For each={items}>{item => <li>{item}</li>}</For></ul>
    return <>
      <StatTiles items={[
        { label: 'Needs action', value: status().issues.length, tone: status().issues.length ? 'warning' : 'positive' },
        { label: 'Pending', value: status().pending.length },
        { label: 'Known limitations', value: status().limitations.length },
        { label: 'Reporting tools', value: sources().length || (data().pipeline?.freshness ? 0 : undefined) },
      ]} />
      <Show when={status().issues.length} fallback={
        <Show when={!status().pending.length && !status().limitations.length}>
          <PanelState state="empty" inline message="No current health issues reported." />
        </Show>
      }>
        <Detail label={`Problems that need action (${status().issues.length})`} open>{issueList(status().issues)}</Detail>
      </Show>
      <Show when={status().pending.length}><Detail label={`Pending measurements (${status().pending.length})`}>
        {issueList(status().pending)}
      </Detail></Show>
      <Show when={status().limitations.length}><Detail label={`Known limitations (${status().limitations.length})`}>
        {issueList(status().limitations)}
      </Detail></Show>
      <Detail label="Sources">
        <Show when={sources().length} fallback={<p>{data().pipeline?.freshness ? 'No source rows.' : MISSING}</p>}>
          <ul><For each={sources()} keyed={source => source.tool}>{source => <li>
            <strong>{source().label ?? source().tool}</strong> — {source().last_data_ts
              ? health.now() - source().last_data_ts! > 3600 ? 'No recent activity' : 'Active' : MISSING}
            <Show when={otelConfig(data().pipeline, source().tool, health.now())}>{config => <p>{config().detail}</p>}</Show>
            <Show when={source().last_error}>{error => <p>{error()}</p>}</Show>
          </li>}</For></ul>
        </Show>
      </Detail>
      <Detail label="Collectors"><Show when={data().monitor?.collectors?.length} fallback={<p>{data().monitor?.collectors ? 'No collector reports.' : MISSING}</p>}>
        <ul><For each={data().monitor?.collectors} keyed={row => row.name}>{row => <li>{row().name}: {row().status} {row().detail}</li>}</For></ul>
      </Show></Detail>
      <Detail label="Ingesters"><Show when={data().pipeline?.ingesters?.length} fallback={<p>{data().pipeline?.ingesters ? 'No ingester reports.' : MISSING}</p>}>
        <ul><For each={data().pipeline?.ingesters} keyed={row => row.name}>{row => <li>{row().name}: {ingesterState(row()).status} {row().error}</li>}</For></ul>
      </Show></Detail>
    </>
  }}</HealthBody>
}

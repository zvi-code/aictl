import { createMemo, For, Show } from 'solid-js'
import type { PanelProps } from '../types'
import { stamp } from '../../design/format'
import { useHealth } from './healthData'
import { healthSources, healthStatus, ingesterState, NA, otelConfig, REPORTING_WINDOW, sourceActivity } from './healthModel'
import { Detail, HealthBody, Reasons } from './HealthParts'
import { StatTiles } from './HealthVisuals'

export default function Diagnostics(props: PanelProps) {
  const health = useHealth()
  return <HealthBody ctx={props.ctx} def={props.def}>{data => {
    const status = createMemo(() => healthStatus(data(), null, health.now(), health.window()))
    const sources = createMemo(() => healthSources(data()))
    const activity = createMemo(() => sourceActivity(sources(), health.now()))
    const known = () => data().pipeline?.freshness != null
    return <>
      <StatTiles items={[
        { label: 'Reasons', value: status().reasons.length, tone: status().reasons.length ? 'warning' : 'positive', detail: status().label },
        { label: 'Reporting tools', value: known() ? activity().reporting.length : undefined, detail: `sent data in the ${REPORTING_WINDOW}` },
        { label: 'Installed, no data', value: known() ? activity().silent.length : undefined,
          detail: activity().silent.map(row => row.label ?? row.tool).join(', ') || undefined },
      ]} />
      <Reasons reasons={status().reasons} />
      <Detail label="Sources">
        <Show when={sources().length} fallback={<p>{known() ? 'No source rows.' : NA}</p>}>
          <ul><For each={sources()} keyed={source => source.tool}>{source => <li>
            <strong>{source().label ?? source().tool}</strong> — {source().last_data_ts
              ? `last data ${stamp(source().last_data_ts, true)}` : 'installed, no data'}
            <Show when={otelConfig(data().pipeline, source().tool, health.now())}>{config => <p>{config().detail}</p>}</Show>
            <Show when={source().last_error}>{error => <p>{error()}</p>}</Show>
          </li>}</For></ul>
        </Show>
      </Detail>
      <Detail label="Collectors"><Show when={data().monitor?.collectors?.length} fallback={<p>{data().monitor?.collectors ? 'none reported' : NA}</p>}>
        <ul><For each={data().monitor?.collectors} keyed={row => row.name}>{row =>
          <li>{row().name}: {row().status}{row().detail ? ` — ${row().detail}` : ''}</li>}</For></ul>
      </Show></Detail>
      <Detail label="Ingesters"><Show when={data().pipeline?.ingesters?.length} fallback={<p>{data().pipeline?.ingesters ? 'none reported' : NA}</p>}>
        <ul><For each={data().pipeline?.ingesters} keyed={row => row.name}>{row =>
          <li>{row().name}: {ingesterState(row()).status}{row().error ? ` — ${row().error}` : ''}</li>}</For></ul>
      </Show></Detail>
    </>
  }}</HealthBody>
}

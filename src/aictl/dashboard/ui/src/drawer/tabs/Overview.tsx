import { createSignal, For, Show } from 'solid-js'
import { fmtDur, fmtUsd, stamp } from '../../design/format'
import { Meter } from '../../ui/Meter'
import { OtelSections } from '../OtelSections'
import { ContextCards, GitCard, InstructionsCard, OutputsCard } from '../OverviewCards'
import { median, runDelta } from '../overviewModel'
import { ResourceCharts } from '../ResourceCharts'
import { openAgent, Resource, Rows, Section, Series, Stats, type TabProps } from '../shared'
import styles from '../drawer.module.css'

const sum = (values: readonly (number | null | undefined)[]) => values.some(value => value != null)
  ? values.reduce<number>((total, value) => total + (value ?? 0), 0) : undefined

export default function Overview(props: TabProps) {
  const [runs, setRuns] = createSignal(false)
  return <Resource read={props.detail}>{data => {
    const agent = () => data().agent
    const context = () => data().context
    const live = props.runtime
    const start = () => agent()?.started_at
    const end = () => live()?.running ? Date.now() / 1000 : agent()?.ended_at ?? (data().turns.at(-1)?.ts ?? start())
    const prior = () => data().runs?.filter(run => !run.current) ?? []
    const current = () => data().runs?.find(run => run.current)
    return <>
      <Section title="Session totals">
        <Stats items={[
          { label: 'Tokens', value: sum([agent()?.input, agent()?.output, agent()?.cache_read, agent()?.cache_write]) },
          { label: 'Cost', value: agent()?.cost_usd == null ? undefined : fmtUsd(agent()?.cost_usd) },
          { label: 'Duration', value: agent()?.started_at == null ? undefined : fmtDur((agent()?.ended_at ?? Date.now() / 1000) - agent()!.started_at!) },
          { label: 'Messages', value: sum([agent()?.msgs?.user, agent()?.msgs?.assistant, agent()?.msgs?.tool]) },
          { label: 'Tool calls', value: agent()?.tool_calls }, { label: 'Failures', value: agent()?.failures },
          { label: 'Model calls', value: context()?.calls },
        ]} />
        <Meter label="Cache share" value={agent()?.cached_share == null ? undefined : agent()!.cached_share! * 100} />
        <Show when={context()?.series?.length}><Series label="Context growth" values={context()?.series} unit="tokens" /></Show>
        <div class={styles.bar}>
          <button type="button" class={styles.button} onClick={() => props.shell.ctx.copy(props.session() ?? props.entry.id)}>Copy ID</button>
          <button type="button" class={styles.button} onClick={() => props.shell.ctx.copy(location.href)}>Copy link to this agent</button>
          <button type="button" class={styles.button} onClick={() => props.shell.changeTab('evidence')}>Search execution evidence</button>
        </div>
        <Show when={(live()?.status ?? agent()?.status) === 'waiting' && agent()?.pending}>{pending =>
          <div role="status">
            <Stats items={[{ label: 'Waiting for', value: fmtDur(Math.max(0, Date.now() / 1000 - pending().since_ts)) }]} />
            <p>Confirmation pending for {pending().name}{pending().target ? `: ${pending().target}` : ''}. Answer in the requesting tool.</p>
          </div>}
        </Show>
        <Show when={data().loop || data().errors?.length}>
          <div class={styles.bar} role="status"><span>{data().errors?.length} recorded failures
            {data().loop ? ` · ${data().loop?.repeats} repetitions of ${data().loop?.pattern}` : ''}</span>
            <button type="button" class={styles.button} onClick={() => props.shell.changeTab('errors')}>Inspect failures and loops</button>
          </div>
        </Show>
      </Section>
      <ContextCards data={data()} tab={props} />
      <OutputsCard data={data()} tab={props} />
      <Show when={!agent()?.parent_id}><InstructionsCard data={data()} tab={props} /></Show>
      <GitCard data={data()} tab={props} />
      <Section title="Usage by model"><Rows label="Usage by model" rows={data().by_model} identity={['model']}
        columns={['model', ['msgs', 'Calls'], 'input', 'output', 'cache_read', 'cache_write', ['cost_usd', 'Cost (USD)', 'number']]} /></Section>
      <Section title="Session resources">
        <Stats items={[
          { label: 'CPU', value: live()?.cpu_percent ?? data().process?.cpu_percent, unit: '%' },
          { label: 'Memory', value: live()?.mem_mb ?? data().process?.mem_mb, unit: 'MB' },
          { label: 'Processes', value: (live()?.pids ?? data().process?.pids)?.length },
          { label: 'Started', value: start() == null ? undefined : stamp(start(), true) },
          { label: 'Ended', value: !live()?.running && agent()?.ended_at != null ? stamp(agent()?.ended_at, true) : undefined },
        ]} />
        <div class={styles.bar}><For each={[
          ['procs', 'Processes'], ['evidence', 'Execution evidence'], ['context', 'Context'], ['tools', 'Tool calls'],
          ['instructions', 'Instructions'], ['team', 'Team'], ['otel', 'OTel'], ['errors', 'Failures and loops'],
        ]}>{([tab, label]) => <button type="button" class={styles.button} onClick={() => props.shell.changeTab(tab)}>{label}</button>}</For></div>
      </Section>
      <Section title="Skills">
        <Stats items={[
          { label: 'Skills used', value: data().skills?.length },
          { label: 'Skill uses', value: data().skills?.reduce((total, skill) => total + skill.uses, 0) },
        ]} />
        <Rows label="Skills" rows={data().skills} identity={['name']} columns={['name', 'uses', 'started_by', ['last_ts', 'Last use', 'time']]}
          action={{ label: row => `Open skill ${row.name}`, run: row => props.shell.open({ type: 'skill', name: row.name }) }} />
      </Section>
      <Section title="Agents over time">
        <Stats items={[{ label: 'Subagents', value: data().subagents?.length }]} />
        <Show when={start() != null && end() != null && end()! > start()!}>
          <For each={data().subagents?.filter(row => row.started_at != null).slice().sort((a, b) => a.started_at! - b.started_at!).slice(0, 8)}>{row => {
            const span = () => end()! - start()!
            const left = () => Math.min(100, Math.max(0, (row.started_at! - start()!) / span() * 100))
            const right = () => Math.min(100, Math.max(left(), ((row.ended_at ?? end()!) - start()!) / span() * 100))
            return <div class={styles.agentLane}><span>{row.title}</span><div class={styles.timeTrack}>
              <button type="button" style={{ left: `${left()}%`, width: `${right() - left()}%` }}
                aria-label={`Open ${row.title}, ${fmtDur((row.ended_at ?? end()!) - row.started_at!)}`}
                onClick={() => openAgent(props, row.id, 'overview')} />
            </div></div>
          }}</For>
        </Show>
        <Rows label="Subagents" rows={data().subagents} identity={['id']} columns={['title', 'role', 'status', ['started_at', 'Started', 'time'], ['ended_at', 'Ended', 'time']]}
          action={{ label: row => `Open ${row.title}`, run: row => openAgent(props, row.id, 'overview') }} />
        <div class={styles.bar}>
          <button type="button" class={styles.button} onClick={() => props.shell.changeTab('timeline')}>Open Timeline</button>
          <button type="button" class={styles.button} onClick={() => props.shell.changeTab('team')}>Open Team</button>
        </div>
      </Section>
      <Section title="Project run history">
        <Show when={prior().length >= 2}>
          <Stats items={(['duration_s', 'tokens', 'file_churn'] as const).map((field, index) => {
            const value = current()?.[field], base = median(prior().map(run => run[field]))
            return { label: ['Duration', 'Tokens', 'Changed files'][index], unit: index === 0 ? 's' : undefined,
              value, detail: runDelta(value, base) }
          })} />
        </Show>
        <Show when={data().runs?.some(row => row.started_at != null)}>
          <Series label="Run token trend" time x={data().runs.filter(row => row.started_at != null).map(row => row.started_at!)}
            values={data().runs.filter(row => row.started_at != null).map(row => row.tokens)} />
        </Show>
        <button type="button" class={styles.button} aria-expanded={runs() ? 'true' : 'false'}
          onClick={() => setRuns(value => !value)}>{runs() ? 'Hide runs' : 'Show runs'}</button>
        <Show when={runs()}><Rows label="Project runs" rows={data().runs} identity={['session_id']}
          columns={[[ 'started_at', 'Started', 'time' ], ['duration_s', 'Duration (s)', 'number'], 'tokens', 'file_churn', 'cost_usd', 'current']}
          action={{ label: row => `Open run ${row.session_id}`, run: row => openAgent(props, row.session_id, 'overview') }} /></Show>
      </Section>
      <Show when={start() != null && end() != null}>
        <Section title="Resources over time"><ResourceCharts tab={props} data={data()} bounds={[start()!, end()!]} /></Section>
      </Show>
      <Show when={!agent()?.parent_id && (data().sources || data().otel)}><OtelSections data={data} /></Show>
    </>
  }}</Resource>
}

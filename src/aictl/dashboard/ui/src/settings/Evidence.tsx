import { createMemo, createSignal, Show, untrack } from 'solid-js'
import type { TopicConfigurationLoaded } from '../data/contract.gen'
import { isStoredToolSelected } from '../utils/toolScope.js'
import { PanelState } from '../ui/PanelState'
import { Stat } from '../ui/Stat'
import { Table } from '../ui/Table'
import { MISSING, plainValue } from './model'
import type { Workspace } from './workspaceState'
import styles from './Settings.module.css'

export function RuntimeConfiguration(props: { w: Workspace }) {
  const [expanded, setExpanded] = createSignal(false)
  return <section aria-label="Loaded configuration evidence" class={styles.evidence}>
    <details onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary>Effective runtime configuration</summary>
      <Show when={expanded()}><Evidence w={props.w} /></Show>
    </details>
  </section>
}

function Evidence(props: { w: Workspace }) {
  const w = untrack(() => props.w)
  const status = () => w.ctx.read({ topic: 'configuration.loaded' })
  const noRecords = () => {
    const state = status().state
    return state === 'ready' || state === 'stale' ? 'empty' : state
  }
  const records = createMemo(() => [...(w.ctx.client.store.topic('configuration.loaded')?.values() ?? [])]
    .map(entity => ({ id: entity.id, data: entity.data as TopicConfigurationLoaded }))
    .filter(row => isStoredToolSelected(row.data.tool, w.ctx.tools())))
  const [session, setSession] = createSignal('')
  const selected = () => records().find(row => row.id === session())
  return <div class={styles.stack}>
    <div class={styles.stats}>
      <Stat label="Sessions reporting evidence" value={records().length || (status().state === 'empty' ? 0 : undefined)} />
      <Stat label="Effective values known" value={records().length ? records().filter(row => row.data.effective_known === true).length : undefined} />
    </div>
    <p>Launch flags are not current runtime values. Configured files are not runtime evidence.</p>
    <Show when={status().state === 'stale'}><PanelState inline state="stale" message={status().message} /></Show>
    <Show when={records().length} fallback={<PanelState inline state={noRecords()}
      message={noRecords() === 'empty' ? 'No effective runtime values reported.' : status().message} />}>
      <Table label="Runtime configuration sessions" rows={records()} rowId={row => row.id}
        fields={[{ id: 'tool', label: 'Tool', read: row => row.data.tool },
          { id: 'session', label: 'Session', read: row => row.data.session_id },
          { id: 'known', label: 'Current values', read: row => row.data.effective_known == null ? undefined
            : row.data.effective_known ? 'Reported' : 'Unknown' },
          { id: 'evidence', label: 'Evidence items', read: row => row.data.evidence?.length },
          { id: 'unknown', label: 'Unknown values', read: row => row.data.unknown?.length }]}
        action={{ label: row => `${session() === row.id ? 'Hide' : 'Show'} evidence for ${row.data.session_id ?? row.id}`,
          run: row => setSession(session() === row.id ? '' : row.id) }} />
      <Show when={selected()}>{row =>
        <section class={styles.stack} aria-label={`Evidence for ${row().data.session_id ?? row().id}`}>
          <Show when={row().data.evidence?.length} fallback={<PanelState inline state="unavailable" />}>
            <Table label="Observed settings" rows={row().data.evidence} rowId={item => `${item.key}\u0001${item.source}\u0001${item.observed_at}`}
              fields={[{ id: 'key', label: 'Setting', read: item => item.key },
                { id: 'value', label: 'Observed value', read: item => plainValue(item.value) },
                { id: 'source', label: 'Evidence source', read: item => item.source },
                { id: 'time', label: 'Observed at', read: item => item.observed_at,
                  format: value => new Date(Number(value) * 1000).toLocaleString() }]} />
          </Show>
          <p>Unknown: {row().data.unknown?.join(', ') || (row().data.unknown ? 'None reported' : MISSING)}</p>
        </section>}
      </Show>
    </Show>
  </div>
}

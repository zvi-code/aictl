import { createMemo } from 'solid-js'
import { Table } from '../../ui/Table'
import type { Field } from '../../ui/tableModel'
import { entityKey, type Replay, type RuntimeData } from './replay'

type Row = { key: string; read: () => RuntimeData | undefined }
type TableTopic = 'runtime.agent' | 'runtime.process'

const fields: Record<TableTopic, Field<Row>[]> = {
  'runtime.agent': [
    { id: 'tool', label: 'Tool', read: row => row.read()?.tool },
    { id: 'status', label: 'Status', read: row => row.read()?.status },
    { id: 'cpu', label: 'CPU (%)', read: row => row.read()?.cpu_percent },
    { id: 'memory', label: 'Memory (MB)', read: row => row.read()?.mem_mb },
  ],
  'runtime.process': [
    { id: 'name', label: 'Process', read: row => row.read()?.name },
    { id: 'pid', label: 'PID', read: row => row.read()?.pid },
    { id: 'cpu', label: 'CPU (%)', read: row => row.read()?.cpu_percent },
    { id: 'memory', label: 'RSS (bytes)', read: row => row.read()?.memory_rss_bytes },
  ],
}

export function ReplayTable(props: { replay: Replay; topic: TableTopic; size?: number; label: string }) {
  const rows = createMemo(() => {
    const ids = props.replay.roster()?.get(props.topic) ?? []
    return Array.from({ length: props.size ?? ids.length }, (_, index): Row => {
      const id = ids[index] ?? `spike-placeholder-${index}`
      const key = entityKey(props.topic, id)
      return { key, read: () => props.replay.values[key] }
    })
  })
  return <Table label={props.label} fields={fields[props.topic]} rows={rows()} rowId={row => row.key} />
}

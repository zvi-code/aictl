import type { Accessor, Component } from 'solid-js'
import type { BoardFields, LiveTopicData } from '../data/contract.gen'
import type { LiveClient } from '../data/live'
import type { boardNodeScope, TimeWindow, UrlPatch } from '../data/urlState'
import type { Filters } from '../data/filters'
import type { JSX } from '@solidjs/web'

export type NodeScope = ReturnType<typeof boardNodeScope>
export type BoardSource = { field: keyof BoardFields; path?: string; wholeRange?: boolean }
export type Source = BoardSource | { topic: keyof LiveTopicData; entity?: string; path?: string } |
  { route: '/api/board/context' | '/api/board/sessions' | '/api/board/nodes'; path?: string }
export type FieldRef = { path: string; label?: string; datapoint?: string; format?: 'timestamp'; scale?: number }
export type Row = Readonly<Record<string, unknown>>
export type Read = {
  state: 'loading' | 'empty' | 'error' | 'unavailable' | 'stale' | 'ready'
  value?: unknown
  rowKeys?: readonly string[]
  message?: string
}
export type DetailState<T> = {
  data: T | undefined; status: 'loading' | 'ready' | 'refreshing' | 'error' | 'stale'; error: unknown
}
export type DetailResource<T> = Accessor<DetailState<T> | undefined> & { retry: () => void }
export type Command = { title: string; lead: string; command: string; action: string; args?: Row; done: string; applyLabel?: string }
export type Detail = { type: 'file' | 'tool' | 'skill' | 'prompt' | 'error' | 'hidden'; path?: string; name?: string; key?: string; session_id?: string; ts?: number; record?: string; line?: number }
export type PanelAction =
  | { kind: 'agent'; field: string; tab?: string; tabs?: { field: string; values: Record<string, string> }; label?: string; excludeStopped?: boolean; when?: (row: Row) => boolean }
  | { kind: 'filter'; field: string; filter: 'model' | 'project' | 'status'; label: string }
  | { kind: 'detail'; field: string; type: 'file' | 'prompt' | 'skill'; localOnly?: boolean; timestamp?: string }

export type KeyedRow = { id: string; row: Row; parent?: string; folded?: boolean }
export type RowOptions = {
  result: Accessor<Read>
  rows?: Accessor<readonly KeyedRow[]>
  controls?: JSX.Element
  description?: JSX.Element
  empty?: Accessor<string | undefined>
  retry?: () => void
}
export type ChartOptions = {
  x: Source; description: string; time?: boolean; stack?: boolean; select?: boolean; namedControls?: boolean
  setup?: (props: PanelProps) => {
    columns?: Accessor<readonly FieldRef[]>
    read?: Accessor<Read>
    axis?: Accessor<Read>
    controls?: JSX.Element
    summary?: JSX.Element
    table?: () => JSX.Element
    retry?: () => void
  }
}

export type PanelDef = {
  id: string
  title: string
  sources: readonly Source[]
  columns: readonly FieldRef[]
  actions: readonly PanelAction[]
  defaultSize: 'small' | 'medium' | 'large'
  requiredCapabilities: readonly string[]
  empty?: string
  load?: PanelLoader
} & (
  | { kind: 'table' | 'list'; rowIdentity?: readonly string[]; setup?: (props: PanelProps) => RowOptions }
  | { kind: 'stat' }
  | { kind: 'chart'; chart: ChartOptions }
  | { kind: 'custom'; load: PanelLoader }
)

type PanelLoader = () => Promise<{ default: Component<PanelProps> }>

export interface PanelContext {
  client: LiveClient
  scope: Accessor<NodeScope>
  nodeId: Accessor<string | null>
  filters: Accessor<Filters>
  tools: Accessor<string[] | null>
  paused: Accessor<boolean>
  startedAt: number
  revision: Accessor<number>
  board<K extends keyof BoardFields>(field: K, wholeRange?: boolean): BoardFields[K] | undefined
  read(source: Source): Read
  detail<T>(path: Accessor<string | undefined>, format?: 'text'): DetailResource<T>
  metadata(key: string): { label?: string; unit?: string; format?: string } | undefined
  navigate(patch: UrlPatch): void
  jump(section: string): void
  select(window: TimeWindow | null): void
  openAgent(id: string, tab?: string): void
  openDetail(detail: Detail): void
  stopped(id: string): boolean
  stopAgent(agent: { id: string; title: string; parent_id?: string | null; role?: string | null; pids?: readonly number[] }): void
  runCommand(command: Command): void
  copy(text: string): void
  refresh(): void
}

export type PanelProps = { def: PanelDef; ctx: PanelContext; params: Readonly<Record<string, unknown>> }

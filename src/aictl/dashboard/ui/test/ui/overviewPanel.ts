// A panel of the Overview board with a fake context: reads, board fields, a detail answer and the scope.
import { overviewB } from '../../src/panels/overview/b'
import type { DetailState, PanelProps, Read } from '../../src/panels/types'

export const def = (id: string) => overviewB.find(panel => panel.id === id)!
export type Fake = { reads?: Read[]; board?: Record<string, unknown>; scope?: 'local' | 'fleet'; detail?: () => DetailState<unknown> | undefined }
export function panel(id: string, fake: Fake) {
  const opened: unknown[] = []
  const agents: string[] = []
  const ctx = {
    read: (source: unknown) => fake.reads?.[def(id).sources.indexOf(source as never)] ?? { state: 'ready', value: undefined },
    board: (name: string) => fake.board?.[name],
    metadata: () => undefined,
    scope: () => fake.scope ?? 'local', nodeId: () => null, tools: () => null, paused: () => false,
    filters: () => ({ range: { id: '24h' }, projects: [], model: 'all', status: 'all', q: '', sel: null }),
    startedAt: 1_800_000_000,
    detail: () => Object.assign(() => fake.detail?.(), { retry() {} }),
    openDetail: (detail: unknown) => opened.push(detail), openAgent: (agent: string) => agents.push(agent),
    stopped: () => false, refresh() {}, copy() {},
  } as unknown as PanelProps['ctx']
  return { props: { ctx, def: def(id) } as PanelProps, opened, agents }
}
export const pairs = (host: Element, group: string) => Array.from(host.querySelectorAll(`[aria-label="${group}"] dl`))
  .map(dl => [dl.querySelector('dt')?.textContent, dl.querySelector('dd')?.textContent])


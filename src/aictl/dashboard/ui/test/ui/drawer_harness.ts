// A drawer shell for tab tests: reads answer from `routes` (by route, without the query) and every path asked is recorded.
import type { Accessor } from 'solid-js'
import type { BoardAgentRow, DetailAgent, TopicRuntimeAgent } from '../../src/data/contract.gen'
import type { TabProps } from '../../src/drawer/shared'
import type { PanelContext } from '../../src/panels/types'
import type { DrawerEntry, DrawerProps } from '../../src/shell/drawerTypes'

export type Routes = Record<string, (query: URLSearchParams) => unknown>
export type Options = {
  tab?: string; scope?: string; session?: string | null; agent?: Partial<BoardAgentRow>; runtime?: Partial<TopicRuntimeAgent>
  detail?: Partial<DetailAgent>; topics?: Record<string, readonly unknown[]>
}

/** A route that answers with an error: the read shows the error state with this message. */
export const failure = (message: string) => () => new Error(message)

export function harness(routes: Routes, options: Options = {}) {
  const asked: string[] = []
  const opened: DrawerEntry[] = []
  const retried: string[] = []
  const ctx = {
    scope: () => options.scope ?? 'local', nodeId: () => null,
    copy: () => {},
    client: { store: { topic: (name: string) => options.topics?.[name] ? new Map(options.topics[name].map((data, index) => [String(index), { data }])) : undefined } },
    detail: <T,>(target: Accessor<string | undefined>) => {
      const read = () => {
        const value = target()
        if (!value) return undefined
        if (!asked.includes(value)) asked.push(value)
        const [route, query = ''] = value.split('?')
        const answer = routes[route]?.(new URLSearchParams(query))
        if (answer instanceof Error) return { data: undefined, status: 'error' as const, error: answer }
        return { data: answer as T, status: 'ready' as const, error: null }
      }
      return Object.assign(read, { retry: () => { const value = target(); if (value) retried.push(value) } })
    },
  } as unknown as PanelContext
  const shell = { ctx, stack: [], open: (entry: DrawerEntry) => opened.push(entry), back() {}, close() {}, changeTab() {} } as DrawerProps
  const agent = options.agent ? { id: 'sess-1', tool: 'copilot-cli', ...options.agent } as BoardAgentRow : undefined
  const runtime = options.runtime ? { id: 'sess-1', ...options.runtime } as TopicRuntimeAgent : undefined
  const detail = Object.assign(
    () => options.detail ? { data: options.detail as DetailAgent, status: 'ready' as const, error: null } : undefined,
    { retry: () => {} })
  const session = options.session === null ? undefined : options.session ?? 'sess-1'
  const tab = { shell, entry: { type: 'agent', id: 'sess-1', tab: options.tab ?? 'overview' }, detail,
    agent: () => agent, runtime: () => runtime, session: () => session } as unknown as TabProps
  return { asked, opened, retried, shell, tab }
}

export const cellTexts = (row: Element) => Array.from(row.querySelectorAll('td')).map(td => td.textContent)
export const cell = (row: Element, column: string) => row.querySelector(`td[data-col="${column}"]`)
export const headers = (host: Element) => Array.from(host.querySelectorAll('th[data-col]')).map(th => th.getAttribute('data-col'))
export const textOf = (host: Element) => host.textContent ?? ''

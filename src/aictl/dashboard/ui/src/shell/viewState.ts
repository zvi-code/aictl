import { mergeSearch, type UrlPatch } from '../data/urlState'
import type { DrawerEntry } from './drawerTypes'

export const clearDrawer = { agent: null, tab: null, show: null, detail: null, record: null, detail_ts: null, detail_session: null } as const

export function readDrawer(search: string): DrawerEntry | undefined {
  const q = new URLSearchParams(search)
  if (q.get('tab') === 'hidden') return { type: 'hidden' }
  const id = q.get('agent')
  if (id) return { type: 'agent', id, tab: q.get('tab') || 'flow', initialPrompts: q.get('show') === 'prompts', initialSkills: q.get('show') === 'skills' }
  const type = q.get('detail'), record = q.get('record')
  if (!record) return
  if (type === 'file') return { type, path: record, record: q.get('detail_session') ?? undefined }
  if (type === 'tool' || type === 'skill' || type === 'mcp') return { type, name: record }
  if (type === 'error') return { type, key: record }
  if (type === 'prompt') return { type, session_id: record, ts: Number(q.get('detail_ts')) }
}

export function drawerPatch(detail?: DrawerEntry): UrlPatch {
  if (!detail) return clearDrawer
  if (detail.type === 'hidden') return { ...clearDrawer, tab: 'hidden' }
  if (detail.type === 'agent') return { ...clearDrawer, agent: detail.id, tab: detail.tab,
    show: detail.initialPrompts ? 'prompts' : detail.initialSkills ? 'skills' : null }
  return { ...clearDrawer, detail: detail.type, record: detail.path ?? detail.name ?? detail.key ?? detail.session_id,
    detail_ts: detail.ts, detail_session: detail.record }
}

// Read the detail encoded in the shell URL.
export function nextAddress(patch: UrlPatch) {
  return location.pathname + mergeSearch(location.search, patch) + location.hash
}

export function stored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try { return allowed.find(value => value === localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
export function remember(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* The current session still works. */ }
}

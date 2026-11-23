import type { NodeScope, PanelDef, Source } from './types'

// Which board panels can say something outside "This node". A live topic is this node's own
// stream, so a panel whose every source is a topic has nothing in fleet or node scope. The two
// lists below are the only exceptions, for panels whose declared sources do not tell.

/** Panels with a recorded source but whose component reads only this node's own endpoints. */
export const LOCAL_ONLY: Readonly<Record<string, string>> = {
  findings: 'reads the local settings audit, hooks and OTel status',
  settings: 'reads the local settings audit and effective models',
  daemon: 'shows this daemon; other nodes report only a process ID',
}

/** Panels with only live-topic sources whose component reads a recorded view of each node. */
export const RECORDED: Readonly<Record<string, string>> = {
  traffic: 'reads the last host samples of each node',
}

export const liveOnly = (sources: readonly Source[]) => sources.length > 0 && sources.every(source => 'topic' in source)

/** True when the panel can show data in this scope; "This node" shows every panel. */
export function shownInScope(def: Pick<PanelDef, 'id' | 'sources'>, scope: NodeScope): boolean {
  if (scope === 'local') return true
  if (Object.hasOwn(LOCAL_ONLY, def.id)) return false
  if (Object.hasOwn(RECORDED, def.id)) return true
  return !liveOnly(def.sources)
}

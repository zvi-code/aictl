import type { CardId } from './insightsModel'

/** The analyses of the Insights screen: each is a view of its own, opened from the list at the left
    (`screen=insights&view=<id>`). The title is written once here; the list and the view's heading read it. */
export type InsightView = { id: CardId; title: string; group: string }

export const INSIGHT_VIEWS: readonly InsightView[] = [
  { id: 'pause', title: 'Pause tax', group: 'Cost and context' },
  { id: 'carry', title: 'Context carry', group: 'Cost and context' },
  { id: 'context', title: 'Context weight', group: 'Cost and context' },
  { id: 'fixed', title: 'Fixed context overhead', group: 'Cost and context' },
  { id: 'subagents', title: 'Spend in subagents', group: 'Cost and context' },
  { id: 'time', title: 'Where the time goes', group: 'Time' },
  { id: 'durations', title: 'Where session time goes', group: 'Time' },
  { id: 'autonomy', title: 'Work per instruction', group: 'Time' },
  { id: 'failures', title: 'After a failure', group: 'Tool calls' },
  { id: 'rereads', title: 'Repeated file reads', group: 'Tool calls' },
  { id: 'skills', title: 'Skills', group: 'Tool calls' },
  { id: 'mcp', title: 'MCP servers', group: 'Tool calls' },
  { id: 'kql', title: 'Kusto queries', group: 'Tool calls' },
  { id: 'flows', title: 'Flows', group: 'Sessions and changes' },
  { id: 'problems', title: 'Problem sessions', group: 'Sessions and changes' },
  { id: 'changes', title: 'What the agents changed', group: 'Sessions and changes' },
  { id: 'verified', title: 'Verified before commit', group: 'Sessions and changes' },
  { id: 'orientation', title: 'Orientation cost by repository', group: 'Sessions and changes' },
  { id: 'repos', title: 'Work by repository', group: 'Repositories and models' },
  { id: 'models', title: 'Model report on your own work', group: 'Repositories and models' },
]

/** The views whose queries take the page's coding tool and model filters. The others take the period and the project
    and repository filters only, and say so when one of the two is set. */
export const TOOL_FILTERED: readonly CardId[] = ['repos', 'durations', 'changes']

/** The view an address names; the first one when it names none or one that does not exist. */
export const insightView = (id: string | null | undefined): InsightView =>
  INSIGHT_VIEWS.find(view => view.id === id) ?? INSIGHT_VIEWS[0]

/** The views in list order, under their group names. */
export function insightGroups(): { group: string; views: InsightView[] }[] {
  const groups: { group: string; views: InsightView[] }[] = []
  for (const view of INSIGHT_VIEWS) {
    const last = groups.at(-1)
    if (last?.group === view.group) last.views.push(view)
    else groups.push({ group: view.group, views: [view] })
  }
  return groups
}

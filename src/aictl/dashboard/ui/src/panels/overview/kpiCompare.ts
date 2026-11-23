import type { BoardKpis } from '../../data/contract.gen'

const day = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const moment = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const at = (seconds: number) => new Date(seconds * 1000)

/**
 * What a KPI tile says about the period before the selected one. A change in percent only when the
 * store covers that whole period; when it does not, the date its collected data starts.
 * Undefined when there is nothing to say, so the tile shows its other detail.
 */
export function previousText(prev: BoardKpis['prev'] | undefined, previous: unknown, current: unknown) {
  if (!prev || typeof prev.since !== 'number' || typeof prev.until !== 'number') return
  const period = `${moment.format(at(prev.since))} – ${moment.format(at(prev.until))}`
  if (!prev.covered) {
    if (prev.data_since == null) return
    return {
      text: `collected since ${day.format(at(prev.data_since))}`,
      title: `Period before: ${period}. Collected data starts ${moment.format(at(prev.data_since))}.`,
    }
  }
  if (typeof previous !== 'number' || !previous || typeof current !== 'number') return
  const delta = Math.round(((current - previous) / previous) * 100)
  return { text: `${delta > 0 ? '+' : ''}${delta}% vs before`, title: `Compared with ${period}` }
}

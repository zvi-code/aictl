import { createMemo, createSignal, type Accessor } from 'solid-js'
import { at } from '../data'
import type { FieldRef, PanelContext, Read, Source } from '../types'
import { Choice } from './aControls'
import { field } from './aFields'

/** The one split of the usage panels (Tokens, Cache hit rate, Cost, Messages); the model first. The server
 * sums the groups (board series.split): the page only picks which split to draw. */
export const usageSplits = [['model', 'Model'], ['vendor', 'Vendor'], ['project', 'Project'], ['tool', 'Tool']] as const
export type UsageSplit = typeof usageSplits[number][0]
export type SplitMeasure = 'tokens' | 'cached_share' | 'cost' | 'requests'
export type SplitEntry = { key: string | null; other?: number; members?: string[]; models?: string[]; values: (number | null)[] }

const NAMED = 3
const listed = (names: readonly string[]) =>
  names.slice(0, NAMED).map(name => name || 'no model id').join(', ') + (names.length > NAMED ? ` and ${names.length - NAMED} more` : '')

/** A group's name on the chart: the folded groups are "Other (n)"; a vendor no rule knows names its models. */
export function splitLabel(split: UsageSplit, entry: SplitEntry, toolLabels?: Readonly<Record<string, string>>) {
  if (entry.key === null) return `Other (${entry.other ?? 0})`
  if (split === 'tool') return toolLabels?.[entry.key] ?? entry.key
  if (split === 'model') return entry.key || 'Model not reported'
  if (split === 'project') return entry.key || 'No project'
  return entry.key === 'Other' && entry.models?.length ? `Other vendor (${listed(entry.models)})` : entry.key
}

export function splitEntries(value: unknown): SplitEntry[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.filter((entry): entry is SplitEntry => entry !== null && typeof entry === 'object' && Array.isArray(entry.values))
}

/** The split control and the series it draws. *fallback* is the panel's own series (token kinds, message
 * roles), offered after the four splits; *lead* is a line drawn before the groups, such as all input. */
export function usageSplit<X extends string = never>(ctx: PanelContext, options: {
  source: Source; measure: SplitMeasure; datapoint: string; label: string
  fallback?: { id: X; name: string; read: Accessor<Read>; columns: Accessor<readonly FieldRef[]> }
  lead?: { field: FieldRef; values: Accessor<unknown> }
}) {
  const [split, setSplit] = createSignal<UsageSplit | X>('model')
  const items = [...usageSplits, ...(options.fallback ? [[options.fallback.id, options.fallback.name] as const] : [])]
  const base = createMemo(() => ctx.read(options.source))
  const grouped = (): UsageSplit | undefined => usageSplits.some(([id]) => id === split()) ? split() as UsageSplit : undefined
  const entries = createMemo(() => {
    const by = grouped()
    return by ? splitEntries(at(base().value, `${by}.${options.measure}`)) : undefined
  })
  const columns = createMemo<readonly FieldRef[]>(() => {
    const by = grouped()
    if (!by) return options.fallback!.columns()
    const labels = by === 'tool' ? ctx.board('tool_labels') : undefined
    return [...(options.lead ? [options.lead.field] : []),
      ...(entries() ?? []).map((entry, i) => field(String(i), splitLabel(by, entry, labels), options.datapoint))]
  })
  const read = (): Read => {
    if (!grouped()) return options.fallback!.read()
    if (base().state !== 'ready' && base().state !== 'stale') return base()
    const found = entries()
    if (!found) return { state: 'unavailable' }
    return { ...base(), value: {
      ...(options.lead ? { [options.lead.field.path]: options.lead.values() } : {}),
      ...Object.fromEntries(found.map(({ values }, i) => [i, values])),
    } }
  }
  return { split, read, columns,
    controls: <Choice label={options.label} items={items} value={split} change={value => setSplit(() => value)} /> }
}

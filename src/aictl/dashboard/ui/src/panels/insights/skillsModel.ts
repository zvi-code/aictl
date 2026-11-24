// ─── Skills — the payload of /api/board/insights/skills, the sentence it states and the rows of its charts ─
// A skill with fewer than 5 uses or 3 sessions is too small to compare: it is listed apart and gets no bar.
import { fmtN, fmtNum, projectName } from '../../design/format'
import { axisText, barTop, type BarLegend, type BarRow } from './flowBarModel'
import { money, plural, segmentValue, share, type Base, type Hero, type Label } from './insightsModel'
import { hasSplit, repoBarParts } from './repoBarParts'
import type { RepoSegment } from './repoSplit'

type Num = number | null
export type SkillRow = {
  name: string; uses: number; sessions: number; projects: number; tools: string[]; turns: number; turn_tokens: Num
  cost_usd: Num; cost_share: Num; with_turn: number; after_edit: Num; after_test: Num; after_commit: Num
  /** Its parts per repository (uses, cost_usd, after_edit, after_test, after_commit), repoSplit.ts. */
  repos?: RepoSegment[]
}
type Split = { repos?: RepoSegment[] }
export type SkillsBody = Base<'skills'> & {
  skills: SkillRow[]; small_skills: SkillRow[]
  unused: ({ tool: string; name: string; sessions: number; list_tokens: number } & Split)[]
  listings: { tool: string; listed: number; unused: number; sessions: number; list_tokens: number; unused_tokens: number }[]
  tools: ({ tool: string; uses: number; skills: number; sessions: number; with_turn: number } & Split)[]
  projects: ({ project: string; uses: number; skills: number; sessions: number } & Split)[]
  summary: {
    uses: number; skills: number; sessions: number; cost_usd: Num; top: SkillRow | null; use_tools: string[]; listing_tools: string[]
    listed: number; unused: number; unused_tokens: Num; listed_sessions: number; small_skills: number; small_projects: string[]
  }
}

const SHOWN = 8
const ratio = (part: number, whole: number) => whole ? part / whole : null

/** The uses, skills and sessions of the period, and the skills listed to the model and not used: counts only. */
export function skillsFinding(body: SkillsBody, label: Label) {
  const s = body.summary
  if (!s.uses && !s.listed) return 'No skill was used or listed in this period.'
  const uses = s.uses ? `${plural(s.uses, 'skill use')} of ${plural(s.skills, 'skill')} in ${plural(s.sessions, 'session')}` +
    (s.use_tools.length ? ` (${s.use_tools.map(label).join(', ')}).` : '.') +
    (body.skills.length ? '' : ' No skill has 5 uses in 3 sessions, the least the card compares.') : 'No skill use in this period.'
  const listed = s.listed
    ? ` ${s.listing_tools.map(label).join(', ')} listed ${plural(s.listed, 'skill')} to the model in ${plural(s.listed_sessions, 'session')}; ` +
      `${fmtNum(s.unused)} of them were not used in the period; their listing took an estimated ${fmtN(s.unused_tokens ?? 0)} tokens ` +
      'over the sessions that listed them.'
    : ''
  return (uses + listed).trim()
}

/** The line under the title: what is measured, in technical terms. */
export const skillsMeasured = 'Skill uses (skill_uses records, any trigger) per skill, project and tool; the list price of the turns they ' +
  'ran in; what followed in the same turn; skills listed to the model.'

/** Whether the answer carries a repository split on any bar. */
export const skillsSplit = (body: SkillsBody) => hasSplit(body.repo_order, body.skills, body.unused, body.projects, body.tools)

export const skillsHero = (body: SkillsBody): Hero | undefined => body.summary.uses
  ? { value: fmtNum(body.summary.uses), label: `skill uses in ${plural(body.summary.sessions, 'session')}` } : undefined

/** Per skill: its uses, with sessions and projects. */
export function skillUseRows(body: SkillsBody, label: Label): BarRow[] {
  return body.skills.slice(0, SHOWN).map(item => {
    const hover = `${item.name}: ${plural(item.uses, 'use')} in ${plural(item.sessions, 'session')} of ${plural(item.projects, 'project')}` +
      (item.tools.length ? `, from ${item.tools.map(label).join(', ')}` : '') + `; ${fmtNum(item.with_turn)} of the uses belong to a recorded turn`
    return { key: item.name, name: item.name, sub: `${plural(item.sessions, 'session')} · ${plural(item.projects, 'project')}`,
      parts: item.repos?.length ? repoBarParts(body.repo_order, item.repos, 'uses', value => plural(value, 'use'), item.name, 'skill uses', hover)
        : [{ value: item.uses, tone: 'c1', hover }], text: plural(item.uses, 'use'), hover }
  })
}

/** Hover text of a skill's turn cost: turns, tokens, list price and its share of the period's cost. */
export function skillCostHover(body: SkillsBody, item: SkillRow) {
  return `${item.name}: ${plural(item.turns, 'turn')}, ${item.turn_tokens == null ? 'tokens not reported' : `${fmtN(item.turn_tokens)} tokens`}, ` +
    `${money(item.cost_usd)} at list price, ${share(item.cost_share)} of the period's ${money(body.summary.cost_usd)}. ` +
    'Turns of different skills can overlap; their costs do not add up.'
}

/** Per skill: the list price of the turns it ran in. */
export function skillCostRows(body: SkillsBody): BarRow[] {
  return body.skills.slice(0, SHOWN).map(item => {
    const hover = skillCostHover(body, item)
    return { key: item.name, name: item.name, sub: plural(item.turns, 'turn'),
      parts: item.repos?.length ? repoBarParts(body.repo_order, item.repos, 'cost_usd', value => money(value), `${item.name}, turn cost`,
        'turn cost', hover, segment => `${plural(segmentValue(segment, 'uses') ?? 0, 'use')} in this repository.`)
        : [{ value: item.cost_usd ?? 0, tone: 'c2', hover }],
      text: `${money(item.cost_usd)} (${share(item.cost_share)})`, hover }
  })
}

export type After = 'after_edit' | 'after_test' | 'after_commit'
export const AFTER: After[] = ['after_edit', 'after_test', 'after_commit']
export const AFTER_LABELS: Record<After, string> = { after_edit: 'Then edited a file', after_test: 'Then ran tests', after_commit: 'Then committed' }
const AFTER_VERB: Record<After, string> = { after_edit: 'an edit', after_test: 'a test run', after_commit: 'a commit' }
const AFTER_TONE = { after_edit: 'c1', after_test: 'c3', after_commit: 'c4' } as const

/** Hover text of what followed a skill's uses: the count, its share and the uses with a recorded turn. */
export function afterHover(item: SkillRow, after: After) {
  const value = item[after]
  const count = value == null ? null : Math.round(value * item.with_turn)
  return value == null ? `${item.name}: no use with a recorded turn` : `${item.name}: ${fmtNum(count)} of ${plural(item.with_turn, 'use')} with a ` +
    `recorded turn were followed by ${AFTER_VERB[after]} in the same turn (${share(value)})`
}

/** Per skill: the share of its uses followed by an edit, a test run or a commit, on a 0 to 100% scale. */
export function afterRows(body: SkillsBody, after: After): BarRow[] {
  return body.skills.slice(0, SHOWN).map(item => {
    const hover = afterHover(item, after)
    return { key: item.name, name: item.name, sub: plural(item.with_turn, 'use') + ' with a turn',
      parts: item.repos?.length ? repoBarParts(body.repo_order, item.repos, after, value => share(value), `${item.name}, ${AFTER_LABELS[after].toLowerCase()}`,
        `share of uses followed by ${AFTER_VERB[after]}`, hover, segment => `${plural(segmentValue(segment, 'uses') ?? 0, 'use')} in this repository.`)
        : [{ value: item[after] ?? 0, tone: AFTER_TONE[after], hover }], text: share(item[after]), hover }
  })
}

/** Neutral tones: the listings are not split by repository, and are drawn beside bars in repository colours. */
export const listingLegend: BarLegend = [{ tone: 'ink', label: 'Used in the period' }, { tone: 'muted', label: 'Listed, not used' }]

/** Per tool that reports listings: the skills listed to the model, split into used and not used. */
export function listingRows(body: SkillsBody, label: Label): BarRow[] {
  return body.listings.map(item => {
    const used = Math.max(0, item.listed - item.unused)
    const hover = `${label(item.tool)}: ${plural(item.listed, 'skill')} listed to the model in ${plural(item.sessions, 'session')}; ` +
      `${fmtNum(used)} used, ${fmtNum(item.unused)} not used in the period. Listing tokens ${fmtN(item.list_tokens)}, of which ` +
      `${fmtN(item.unused_tokens)} for the skills not used (estimated from size, once per session that listed the skill)`
    return { key: item.tool, name: label(item.tool), sub: plural(item.sessions, 'session'),
      parts: [{ value: used, tone: 'ink', hover: `${label(item.tool)}: ${fmtNum(used)} of ${plural(item.listed, 'listed skill')} used (${share(ratio(used, item.listed))})` },
        { value: item.unused, tone: 'muted', hover: `${label(item.tool)}: ${fmtNum(item.unused)} of ${plural(item.listed, 'listed skill')} not used ` +
          `(${share(ratio(item.unused, item.listed))}), ${fmtN(item.unused_tokens)} listing tokens` }],
      text: `${fmtNum(used)} used · ${fmtNum(item.unused)} not used`, hover }
  })
}

/** The skills listed and not used, by the tokens their listing took. */
export function unusedRows(body: SkillsBody, label: Label): BarRow[] {
  return body.unused.slice(0, SHOWN).map(item => {
    const hover = `${item.name} (${label(item.tool)}): listed in ${plural(item.sessions, 'session')} and not used; listing tokens ` +
      `${fmtN(item.list_tokens)} (estimated from size, once per session)`
    return { key: `${item.tool}:${item.name}`, name: item.name, sub: plural(item.sessions, 'session'),
      parts: item.repos?.length ? repoBarParts(body.repo_order, item.repos, 'list_tokens', value => `${fmtN(value)} tokens`, item.name,
        'listing tokens', hover) : [{ value: item.list_tokens, tone: 'muted', hover }], text: `${fmtN(item.list_tokens)} tokens`, hover }
  })
}

/** Per project with 5 or more uses, and per tool: the skill uses. */
export function skillProjectRows(body: SkillsBody): BarRow[] {
  return body.projects.slice(0, SHOWN).map(row => {
    const name = projectName(row.project)
    const hover = `${name}: ${plural(row.uses, 'skill use')} of ${plural(row.skills, 'skill')} in ${plural(row.sessions, 'session')}`
    return { key: row.project, name, sub: `${plural(row.skills, 'skill')} · ${plural(row.sessions, 'session')}`,
      parts: row.repos?.length ? repoBarParts(body.repo_order, row.repos, 'uses', value => plural(value, 'use'), name, 'skill uses', hover)
        : [{ value: row.uses, tone: 'c1', hover }], text: plural(row.uses, 'use'), hover }
  })
}
export function skillToolRows(body: SkillsBody, label: Label): BarRow[] {
  return body.tools.map(row => {
    const hover = `${label(row.tool)}: ${plural(row.uses, 'skill use')} of ${plural(row.skills, 'skill')} in ${plural(row.sessions, 'session')}, ` +
      `${fmtNum(row.with_turn)} with a recorded turn`
    return { key: row.tool, name: label(row.tool), sub: `${plural(row.skills, 'skill')} · ${plural(row.sessions, 'session')}`,
      parts: row.repos?.length ? repoBarParts(body.repo_order, row.repos, 'uses', value => plural(value, 'use'), label(row.tool), 'skill uses', hover)
        : [{ value: row.uses, tone: 'c1', hover }], text: plural(row.uses, 'use'), hover }
  })
}
export const countAxis = (rows: BarRow[], unit: string) => axisText(unit, fmtNum(barTop(rows)))

/** Which tools report skill uses and listings, and the groups too small to compare, in one line. */
export function skillsCoverage(body: SkillsBody, label: Label) {
  const s = body.summary
  const listing = `${s.listing_tools.map(label).join(', ')} reports which skills are listed to the model; for other tools, ` +
    'listed and not used is not measured.'
  const uses = s.use_tools.length ? ` Skill uses come from ${s.use_tools.map(label).join(', ')}.` : ''
  const small = [
    s.small_skills ? `${plural(s.small_skills, 'skill')} with fewer than 5 uses or 3 sessions` : '',
    s.small_projects.length ? `${plural(s.small_projects.length, 'project')} with fewer than 5 uses` : '',
  ].filter(Boolean)
  return listing + uses + (small.length ? ` Too small to compare: ${small.join('; ')}.` : '')
}

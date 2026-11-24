// ─── Skills — the payload of /api/board/insights/skills and the finding it states ─
// A skill with fewer than 5 uses or 3 sessions is too small to compare: it is listed apart and never leads.
import { fmtN, fmtNum } from '../../design/format'
import { money, plural, share, type Base, type Hero, type Label } from './insightsModel'

type Num = number | null
export type SkillRow = {
  name: string; uses: number; sessions: number; projects: number; tools: string[]; turns: number; turn_tokens: Num
  cost_usd: Num; cost_share: Num; with_turn: number; after_edit: Num; after_test: Num; after_commit: Num
}
export type SkillsBody = Base<'skills'> & {
  skills: SkillRow[]; small_skills: SkillRow[]
  unused: { tool: string; name: string; sessions: number; list_tokens: number }[]
  listings: { tool: string; listed: number; unused: number; sessions: number; list_tokens: number; unused_tokens: number }[]
  tools: { tool: string; uses: number; skills: number; sessions: number; with_turn: number }[]
  projects: { project: string; uses: number; skills: number; sessions: number }[]
  summary: {
    uses: number; skills: number; sessions: number; cost_usd: Num; top: SkillRow | null; use_tools: string[]; listing_tools: string[]
    listed: number; unused: number; unused_tokens: Num; listed_sessions: number; small_skills: number; small_projects: string[]
  }
}

/** The skill whose turns cost most, what followed it, and the skills listed and never used. */
export function skillsFinding(body: SkillsBody, label: Label) {
  const s = body.summary
  if (!s.uses && !s.listed) return 'No skill was used or listed in this period.'
  const top = s.top
  const lead = top
    ? `The skill ${top.name} ran in ${plural(top.turns, 'turn')} of ${plural(top.sessions, 'session')} in ${plural(top.projects, 'project')}; ` +
      `those turns cost ${money(top.cost_usd)} at list price (${share(top.cost_share)} of the period's cost). After it, in the same turn, ` +
      `${share(top.after_edit)} of its uses edited a file, ${share(top.after_test)} ran tests and ${share(top.after_commit)} committed.`
    : s.uses ? `${plural(s.uses, 'skill use')} in this period, but no skill has 5 uses in 3 sessions: too few to compare.` : ''
  const unused = s.listed
    ? ` ${s.listing_tools.map(label).join(', ')} listed ${plural(s.listed, 'skill')} to the model; ${fmtNum(s.unused)} were never used, ` +
      `and their listing took ${fmtN(s.unused_tokens ?? 0)} tokens (estimated from size) over the sessions that listed them.`
    : ''
  return (lead + unused).trim()
}

export const skillsHero = (body: SkillsBody): Hero | undefined => body.summary.top?.cost_share != null
  ? { value: share(body.summary.top.cost_share), label: `of the period's cost was in turns that ran ${body.summary.top.name}` } : undefined

/** Which tools report skill uses and listings, and the groups too small to compare, in one line. */
export function skillsCoverage(body: SkillsBody, label: Label) {
  const s = body.summary
  const listing = `Only ${s.listing_tools.map(label).join(', ')} reports which skills are listed to the model; ` +
    'for other tools, listed and never used cannot be measured.'
  const uses = s.use_tools.length ? ` Skill uses come from ${s.use_tools.map(label).join(', ')}.` : ''
  const small = [
    s.small_skills ? `${plural(s.small_skills, 'skill')} with fewer than 5 uses or 3 sessions` : '',
    s.small_projects.length ? `${plural(s.small_projects.length, 'project')} with fewer than 5 uses` : '',
  ].filter(Boolean)
  return listing + uses + (small.length ? ` Too small to compare: ${small.join('; ')}.` : '')
}

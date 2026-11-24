import { Show, untrack } from 'solid-js'
import { fmtN, fmtNum } from '../../design/format'
import { Bars, type BarRow } from './Bars'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import {
  FIXED_KINDS, FIXED_LABELS, fixedFileHover, fixedFinding, fixedHero, fixedKindHover, fixedListingHover, fixedRepoMore, fixedSkillHover,
  fixedToolHover, NOT_REPORTED, NOT_SPLIT, plural, repoPartsWith, share, tokens, toolLabel, type FixedBody, type Label,
} from './insightsModel'
import { RepoLegend } from './RepoLegend'
import { hasOther, notSplitNote } from './repoSplit'
import styles from './Insights.module.css'

const TONE = [0, 2, 4, 1, 3, 6, 5]
const legend = FIXED_KINDS.map((kind, i) => ({ label: FIXED_LABELS[kind], tone: TONE[i] }))
const short = (value: number | null) => value == null ? '' : fmtN(value)

/** One bar per tool: the average fixed context of its sessions, stacked by kind, on one scale for all tools. */
function kindRows(body: FixedBody, label: Label): BarRow[] {
  return body.tools.map(tool => {
    const missing = tool.kinds.filter(cell => !cell.reported).map(cell => FIXED_LABELS[cell.kind])
    return {
      key: tool.tool, label: label(tool.tool),
      sub: `median ${tokens(tool.p50_tokens)} · 90th percentile ${tokens(tool.p90_tokens)} · ${plural(tool.sessions, 'session')}` +
        (tool.estimated ? ' · estimated' : '') + (missing.length ? ` · ${NOT_REPORTED}: ${missing.join(', ')}` : ''),
      total: `average ${tokens(tool.avg_tokens)}`,
      parts: tool.kinds.filter(cell => cell.reported).map(cell => ({
        key: cell.kind, label: FIXED_LABELS[cell.kind], value: cell.avg_tokens, tone: TONE[FIXED_KINDS.indexOf(cell.kind)],
        text: short(cell.avg_tokens), hover: fixedKindHover(tool, cell, label),
      })),
    }
  })
}

/**
 * Per tool: its average fixed context in a segment per repository, then each kind's average the same way, on one
 * scale; the split by kind is the bar above. A repository's average is its tokens / all the tool's sessions.
 */
function repoRows(body: FixedBody, label: Label): BarRow[] {
  return body.tools.filter(tool => tool.repos?.length).flatMap(tool => [
    { key: tool.tool, label: label(tool.tool), sub: `all kinds · ${plural(tool.sessions, 'session')}`, total: `average ${tokens(tool.avg_tokens)}`,
      parts: repoPartsWith(tool.repos, 'avg_tokens', body.repo_order, value => tokens(value), `${label(tool.tool)}, average fixed context`,
        'average fixed context', fixedToolHover(tool, label), segment => fixedRepoMore(tool, segment)) },
    ...tool.kinds.filter(cell => cell.reported && cell.repos?.length).map(cell => ({
      key: `${tool.tool}:${cell.kind}`, label: `${label(tool.tool)}: ${FIXED_LABELS[cell.kind]}`, total: `average ${tokens(cell.avg_tokens)}`,
      parts: repoPartsWith(cell.repos, 'avg_tokens', body.repo_order, value => tokens(value),
        `${label(tool.tool)}, ${FIXED_LABELS[cell.kind].toLowerCase()}, average per session`, 'average per session',
        `${fixedKindHover(tool, cell, label)} ${notSplitNote('median')}`, segment => fixedRepoMore(tool, segment)),
    })),
  ])
}

const split = (body: FixedBody) => body.tools.some(tool => tool.repos?.length)
const unsplit = (body: FixedBody, hover: string) => split(body) ? `${hover} ${NOT_SPLIT}` : hover

function listingRows(body: FixedBody, label: Label): BarRow[] {
  return body.skills.filter(row => row.listing_tokens != null).map(row => ({
    key: row.tool, label: label(row.tool), sub: `${fmtNum(row.used)} of ${fmtNum(row.listed)} skills used`, total: tokens(row.listing_tokens),
    parts: [
      { key: 'used', label: 'skills used', value: row.listing_tokens! - (row.unused_tokens ?? 0), tone: 2,
        text: short(row.listing_tokens! - (row.unused_tokens ?? 0)), hover: unsplit(body, fixedListingHover(row, 'used', label)) },
      { key: 'unused', label: 'skills not used', value: row.unused_tokens, tone: 7, text: short(row.unused_tokens),
        hover: unsplit(body, fixedListingHover(row, 'unused', label)) },
    ],
  }))
}

function fileRows(body: FixedBody, label: Label): BarRow[] {
  return body.files.map(row => ({
    key: `${row.tool}:${row.file}`, label: row.file, sub: `${label(row.tool)} · largest ${tokens(row.max_tokens)} · ${plural(row.sessions, 'session')}`,
    total: `${tokens(row.avg_tokens)} per load`,
    parts: [{ key: 'avg', label: 'tokens per load', value: row.avg_tokens, tone: 0, text: short(row.avg_tokens), hover: unsplit(body, fixedFileHover(row, label)) }],
  }))
}

function skillRows(body: FixedBody, label: Label): BarRow[] {
  return body.top_skills.map(row => ({
    key: `${row.tool}:${row.name}`, label: row.name, sub: `${label(row.tool)} · ${plural(row.sessions, 'session')}`,
    total: `${tokens(row.tokens)} · ${row.uses ? plural(row.uses, 'use') : 'no use in the period'}`,
    parts: [{ key: 'tokens', label: 'listing tokens', value: row.tokens, tone: row.uses ? 1 : 7, text: short(row.tokens), hover: unsplit(body, fixedSkillHover(row, label)) }],
  }))
}

function KindBars(props: { body: FixedBody; label: Label }) {
  return <>
    <RepoLegend split={props.body} other={hasOther([...props.body.tools, ...props.body.tools.flatMap(tool => tool.kinds)])} />
    <Bars name="fixed-kinds" title="Average fixed context of a session by kind, per tool (estimated tokens)" legend={legend}
      axis="Length: estimated tokens per session, one linear scale for every tool from 0." rows={kindRows(props.body, props.label)} />
    <Show when={split(props.body)}>
      <Bars name="fixed-kinds-repos" title="Average fixed context of a session per tool and per kind, by repository (estimated tokens)"
        axis={'Length: estimated tokens per session, one linear scale from 0; a segment per repository: its tokens divided by all ' +
          'the tool\'s sessions, so the segments add up to the average; under each tool its kinds.'}
        rows={repoRows(props.body, props.label)} />
      <p class={styles.note} data-not-split>Not split by repository: the medians, the skill listing, the files and the skills below.</p>
    </Show>
    <Show when={listingRows(props.body, props.label).length}>
      <Bars name="fixed-listing" title="Skill listing tokens: skills used and not used in the period, per tool" scale="whole"
        legend={[{ label: 'Skills used', tone: 2 }, { label: 'Skills not used', tone: 7 }]}
        axis="Bar: the tool's listing tokens in the period (100%, estimated)." rows={listingRows(props.body, props.label)} />
    </Show>
    <Show when={props.body.files.length} fallback={<p class={styles.note}>No instruction or memory file in this period.</p>}>
      <Bars name="fixed-files" title="Instruction and memory files with the most tokens" axis="Length: estimated tokens per load, linear from 0."
        rows={fileRows(props.body, props.label)} />
    </Show>
    <Show when={props.body.top_skills.length} fallback={<p class={styles.note}>No tool in this period reports the skills it lists.</p>}>
      <Bars name="fixed-skills" title="Skills by listing tokens (grey: no use in the period)"
        axis="Length: estimated listing tokens in all sessions, linear from 0." rows={skillRows(props.body, props.label)} />
    </Show>
    <Show when={props.body.summary.listing_not_reported.length}>
      <p class={styles.note}>Skill listing {NOT_REPORTED} by {props.body.summary.listing_not_reported.map(props.label).join(', ')};
        {' '}their uses are not compared.</p>
    </Show>
  </>
}

type Row = Record<string, unknown>

export default function FixedContext(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<FixedBody> {...props} card="fixed" tab="context"
    hero={fixedHero}
    finding={body => fixedFinding(body, label)}
    visual={body => <KindBars body={body} label={label} />}
    note={'A session\'s fixed context is what the tool puts in its main agent\'s context before any work: memory and ' +
      'instruction files, the skill listing, MCP instructions, custom agents, the deferred tool list and the other system ' +
      'prompt sections. Each item counts once, as its newest record; an item removed, or recorded before a later reset of ' +
      'its kind (a compaction or a new system prompt sends everything again), does not count, so a re-listing is not counted ' +
      'twice. Subagents and the /context report are left out. Tokens are estimated from the size of each item. A kind no ' +
      'session of a tool records is not reported, not 0; a session that records only some kinds has a smaller total. Bars ' +
      'stack the average per session; the tables give medians. A skill is used when the same tool called it in the period, ' +
      'by any trigger (the agent, the user, or the tool loading its body). A file is the last part of its path. A session ' +
      'counts in the period its earliest counted item falls in.'}
    table={{
      label: 'Fixed context by tool and kind',
      rows: body => body.tools.flatMap(tool => tool.kinds.map((cell): Row => ({
        id: `${tool.tool}:${cell.kind}`, tool: label(tool.tool), kind: FIXED_LABELS[cell.kind],
        sessions: cell.sessions ?? undefined, session_share: cell.session_share ?? undefined, p50: cell.p50_tokens ?? undefined,
        avg: cell.avg_tokens ?? undefined, items: cell.p50_items ?? undefined,
      }))),
      fields: [textField('tool', 'Tool'), textField('kind', 'Kind'), numberField('sessions', 'Sessions that report it', fmtNum),
        numberField('session_share', 'Share of the tool\'s sessions', value => share(value)),
        numberField('p50', 'Median tokens (estimated)', value => tokens(value)),
        numberField('avg', 'Average per session (estimated)', value => tokens(value)),
        numberField('items', 'Median items', fmtNum)],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      numberField('tokens', 'Fixed context (estimated tokens)', fmtNum),
      numberField('skills', 'Skills listed', fmtNum)]} />
}

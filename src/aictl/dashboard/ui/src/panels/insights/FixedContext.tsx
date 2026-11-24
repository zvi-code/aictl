import { Show, untrack } from 'solid-js'
import { fmtN, fmtNum } from '../../design/format'
import { Bars } from './Bars'
import { ColourBy, useColourBy, type ColourMode } from './charts/ColourBy'
import { MarkStrip } from './charts/MarkStrip'
import charts from './charts/Charts.module.css'
import {
  FIXED_LEGEND, fixedFileRows, fixedKindRows, fixedLine, fixedListingRows, fixedSkillRows, fixedSplit, fixedStripRows,
} from './costModel'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { FIXED_LABELS, fixedHero, NOT_REPORTED, share, tokens, toolLabel, type FixedBody, type Label } from './insightsModel'
import { RepoLegend } from './RepoLegend'
import { hasOther } from './repoSplit'

function Visual(props: { body: FixedBody; label: Label; by: ColourMode; setBy: (by: ColourMode) => void }) {
  const split = () => fixedSplit(props.body)
  const by = (): ColourMode => split() ? props.by : 'parts'
  const repo = () => by() === 'repo'
  const unsplit = () => repo() ? '; not split by repository' : ''
  return <>
    <ColourBy parts="Kind" value={by()} onChange={props.setBy} split={split()} />
    <Show when={repo()}>
      <RepoLegend split={props.body} other={hasOther([...props.body.tools, ...props.body.tools.flatMap(tool => tool.kinds)])} />
    </Show>
    <Bars name="fixed-kinds" title={repo() ? 'Average fixed context per session, per tool and kind' : 'Average fixed context per session, by kind'}
      legend={repo() ? undefined : FIXED_LEGEND}
      axis={repo() ? 'Estimated tokens per session, one scale from 0; a segment per repository (its tokens / all the tool\'s sessions); ' +
        'under each tool its kinds.' : 'Estimated tokens per session, one scale from 0 for every tool.'}
      rows={fixedKindRows(props.body, by(), props.label)} />
    <div class={charts.gridWide}>
      <MarkStrip name="fixed-spread" title="Fixed context per session: median, 90th percentile, average"
        axis={`Estimated tokens, one axis from 0 for every tool; beside it the median and 90th percentile${unsplit()}.`}
        legend={[{ label: 'Median', shape: 'dot' }, { label: '90th percentile', shape: 'tick' }, { label: 'Average', shape: 'ring' }]}
        format={value => fmtN(value)} rows={fixedStripRows(props.body, by(), props.label)} />
      <Show when={fixedListingRows(props.body, by(), props.label).length}>
        <Bars name="fixed-listing" title="Skill listing: skills used and not used" scale="whole"
          legend={[{ label: 'Skills used', tone: 2 }, { label: 'Skills not used', tone: 7 }]}
          axis={`Bar: the tool's listing tokens in the period (100%, estimated)${unsplit()}.`}
          rows={fixedListingRows(props.body, by(), props.label)} />
      </Show>
      <Show when={props.body.files.length} fallback={<p class={charts.note}>No instruction or memory file in this period.</p>}>
        <Bars name="fixed-files" title="Instruction and memory files with the most tokens"
          axis={`Estimated tokens per load, one scale from 0${unsplit()}.`} rows={fixedFileRows(props.body, by(), props.label)} />
      </Show>
      <Show when={props.body.top_skills.length} fallback={<p class={charts.note}>No tool in this period reports the skills it lists.</p>}>
        <Bars name="fixed-skills" title={repo() ? 'Skills by listing tokens' : 'Skills by listing tokens (grey: no use in the period)'}
          axis={`Estimated listing tokens in all sessions, one scale from 0${unsplit()}.`} rows={fixedSkillRows(props.body, by(), props.label)} />
      </Show>
    </div>
    <Show when={props.body.summary.listing_not_reported.length}>
      <p class={charts.note} data-listing-not-reported>Skill listing {NOT_REPORTED} by {props.body.summary.listing_not_reported
        .map(props.label).join(', ')}; their uses are not compared.</p>
    </Show>
  </>
}

type Row = Record<string, unknown>

export default function FixedContext(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  const [by, setBy] = useColourBy()
  return <InsightCard<FixedBody> {...props} card="fixed" tab="context"
    hero={fixedHero}
    finding={fixedLine}
    visual={body => <Visual body={body} label={label} by={by()} setBy={setBy} />}
    note={'A session\'s fixed context is what the tool puts in its main agent\'s context before any work: memory and ' +
      'instruction files, the skill listing, MCP instructions, custom agents, the deferred tool list and the other system ' +
      'prompt sections. Each item counts once, as its newest record; an item removed, or recorded before a later reset of ' +
      'its kind (a compaction or a new system prompt sends everything again), does not count, so a re-listing is not counted ' +
      'twice. Subagents and the /context report are left out. Tokens are estimated from the size of each item. A kind no ' +
      'session of a tool records is not reported, not 0; a session that records only some kinds has a smaller total. Bars ' +
      'stack the average per session; the strip marks the median, 90th percentile and average of the whole; the data table ' +
      'gives the medians per kind. A skill is used when the same tool called it in the period, by any trigger (the agent, the ' +
      'user, or the tool loading its body). A file is the last part of its path. A session counts in the period its earliest ' +
      'counted item falls in. Colour by Repository: the averages split into one segment per repository (its tokens divided ' +
      'by all the tool\'s sessions, so the segments add up to the average); medians, the skill listing, the files and the ' +
      'skills are not split and are drawn grey where one colour would read as a repository.'}
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

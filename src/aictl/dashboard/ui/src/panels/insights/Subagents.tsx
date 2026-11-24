import { For, Show, untrack } from 'solid-js'
import { fmtNum } from '../../design/format'
import { Bars } from './Bars'
import { ColourBy, useColourBy, type ColourMode } from './charts/ColourBy'
import { opening, opens, type Opens } from './charts/Open'
import { toolAction } from './costModel'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { subagentHero, money, share, toolLabel, type Label, type SubagentBody } from './insightsModel'
import { RepoLegend } from './RepoLegend'
import {
  sessionRows, sideRepoRows, sideRows, SIDE_LEGEND, subagentLine, subagentNote, subagentOther, subagentSplit, SUBAGENT_SESSIONS,
} from './subagentsModel'
import bars from './Bars.module.css'
import base from './Insights.module.css'
import styles from './Subagents.module.css'

/** What the names open: a coding tool narrows the page to it, a session opens its team. */
const links = (open: Opens, label: Label) => ({
  tools: <T extends { tool: string }>(rows: T[]) => opening(rows, row => open.product(row.tool, label(row.tool))),
  sessions: <T extends { session: string; sessionName: string }>(rows: T[]) =>
    opening(rows, row => open.session(row.session, row.sessionName, 'team')),
})
type Links = ReturnType<typeof links>

function Visual(props: { body: SubagentBody; label: Label; link: Links; mode: ColourMode; setMode: (mode: ColourMode) => void }) {
  const split = () => subagentSplit(props.body)
  const repo = () => split() && props.mode === 'repo'
  const rows = (of: 'cost' | 'requests') => props.link.tools(repo() ? sideRepoRows(props.body, props.label, of) : sideRows(props.body, props.label, of))
  return <>
    <ColourBy parts="Main agent / subagents" value={repo() ? 'repo' : 'parts'} onChange={props.setMode} split={split()} />
    <Show when={repo()} fallback={<ul class={bars.legend} aria-label="Main agent and subagents: colours of the bar segments" data-side-legend>
      <For each={SIDE_LEGEND}>{item => <li><span class={`${bars.swatch} ${bars[`t${item.tone}`]}`} />{item.label}</li>}</For>
    </ul>}>
      <RepoLegend split={props.body} other={subagentOther(props.body)} />
    </Show>
    <div class={styles.grid}>
      <Bars name="subagent-cost" title={repo() ? 'Cost per tool and side (US dollars)' : 'Cost per tool (US dollars)'}
        axis="Length: list price, one linear scale from $0 for every bar." rows={rows('cost')} />
      <Bars name="subagent-requests" title={repo() ? 'Requests per tool and side' : 'Requests per tool'}
        scale={repo() ? 'shared' : 'whole'}
        axis={repo() ? 'Length: requests, one linear scale from 0 for every bar.' : 'Each bar: the tool\'s requests (100%).'}
        rows={rows('requests')} />
      <div class={styles.wide}>
        <Bars name="subagent-sessions" title={`Sessions with the largest subagent cost (top ${SUBAGENT_SESSIONS})`}
          axis="Length: the session's subagent cost at list price, linear from $0." rows={props.link.sessions(sessionRows(props.body, props.label, repo() ? 'repo' : 'parts'))} />
      </div>
    </div>
    <p class={base.note} data-note>{subagentNote(props.body)}</p>
  </>
}

export default function Subagents(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  const [mode, setMode] = useColourBy()
  const open = opens(ctx)
  const link = links(open, label)
  return <InsightCard<SubagentBody> {...props} card="subagents" tab="team"
    hero={subagentHero}
    finding={subagentLine}
    visual={body => <Visual body={body} label={label} link={link} mode={mode()} setMode={setMode} />}
    note={'A subagent request has an agent id that is set and differs from its session id. Cost is list price, not a bill; ' +
      'a tool whose requests carry no price shows "not reported". Only requests in the period count. "Colour by: Repository" ' +
      'draws each tool\'s main agent and subagents as two bars, each split by the repository of the session.'}
    table={{
      label: 'Spend in subagents by tool',
      rows: body => body.tools.map(tool => ({
        id: tool.tool, tool: label(tool.tool), tool_id: tool.tool, main_requests: tool.main.requests, main_cost: tool.main.cost_usd ?? undefined,
        sub_requests: tool.subagents.requests, sub_cost: tool.subagents.cost_usd ?? undefined, agents: tool.subagents.agents,
        share: tool.subagent_share ?? undefined,
      })),
      fields: [{ ...textField('tool', 'Tool'), action: toolAction<Record<string, unknown>>(open, label, 'tool_id') }, numberField('main_requests', 'Main agent requests', fmtNum),
        numberField('main_cost', 'Main agent cost (list price)', value => money(value)),
        numberField('sub_requests', 'Subagent requests', fmtNum), numberField('sub_cost', 'Subagent cost (list price)', value => money(value)),
        numberField('agents', 'Subagents', fmtNum), numberField('share', 'Subagent share of cost', value => share(value))],
    }}
    sessionFields={[{ ...textField('tool', 'Tool', row => label(String(row.tool ?? ''))), action: toolAction(open, label, 'tool') },
      numberField('agents', 'Subagents', fmtNum), numberField('requests', 'Subagent requests', fmtNum),
      numberField('cost_usd', 'Subagent cost (list price)', value => money(value)),
      numberField('main_cost', 'Main agent cost (list price)', value => money(value))]} />
}

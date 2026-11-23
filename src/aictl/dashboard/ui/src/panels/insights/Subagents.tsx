import { For, untrack } from 'solid-js'
import { fmtNum } from '../../design/format'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { money, share, subagentFinding, toolLabel, type Label, type SubagentBody } from './insightsModel'
import styles from './Insights.module.css'

/** Per tool: one bar split into the cost of the main agent and the cost of its subagents. */
function SplitBars(props: { body: SubagentBody; label: Label }) {
  const part = (tool: SubagentBody['tools'][number], side: 'main' | 'subagents') => {
    const total = (tool.main.cost_usd ?? 0) + (tool.subagents.cost_usd ?? 0)
    return total > 0 ? `${((tool[side].cost_usd ?? 0) / total * 100).toFixed(2)}%` : '0%'
  }
  return <>
    <ul class={styles.legend}>
      <li><span class={`${styles.swatch} ${styles.main}`} />Main agent</li>
      <li><span class={`${styles.swatch} ${styles.sub}`} />Subagents</li>
    </ul>
    <ol class={styles.bars} aria-label="Cost of the main agent and of subagents per tool">
      <For each={props.body.tools}>{tool => <li class={styles.barRow}>
        <span class={styles.barName}>{props.label(tool.tool)}<small>{fmtNum(tool.subagents.agents)} subagents · {share(tool.subagent_share)} of cost</small></span>
        <span class={styles.barTrack}>
          <span class={styles.split} role="img" aria-label={`${props.label(tool.tool)}: main agent ${money(tool.main.cost_usd)}, subagents ${money(tool.subagents.cost_usd)}`}>
            <span class={styles.main} style={{ 'inline-size': part(tool, 'main') }} />
            <span class={styles.sub} style={{ 'inline-size': part(tool, 'subagents') }} />
          </span>
          <span class={styles.splitText}>main {money(tool.main.cost_usd)} ({fmtNum(tool.main.requests)} requests) · subagents {money(tool.subagents.cost_usd)} ({fmtNum(tool.subagents.requests)} requests)</span>
        </span>
      </li>}</For>
    </ol>
  </>
}

export default function Subagents(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<SubagentBody> {...props} card="subagents" title="Spend in subagents" tab="team"
    finding={body => subagentFinding(body, label)}
    visual={body => <SplitBars body={body} label={label} />}
    note={'A subagent request has an agent id that is set and differs from its session id. Cost is list price, not a bill; ' +
      'a tool whose requests carry no price shows "not reported". Only requests in the period count.'}
    table={{
      label: 'Spend in subagents by tool',
      rows: body => body.tools.map(tool => ({
        id: tool.tool, tool: label(tool.tool), main_requests: tool.main.requests, main_cost: tool.main.cost_usd ?? undefined,
        sub_requests: tool.subagents.requests, sub_cost: tool.subagents.cost_usd ?? undefined, agents: tool.subagents.agents,
        share: tool.subagent_share ?? undefined,
      })),
      fields: [textField('tool', 'Tool'), numberField('main_requests', 'Main agent requests', fmtNum),
        numberField('main_cost', 'Main agent cost (list price)', value => money(value)),
        numberField('sub_requests', 'Subagent requests', fmtNum), numberField('sub_cost', 'Subagent cost (list price)', value => money(value)),
        numberField('agents', 'Subagents', fmtNum), numberField('share', 'Subagent share of cost', value => share(value))],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      numberField('agents', 'Subagents', fmtNum), numberField('requests', 'Subagent requests', fmtNum),
      numberField('cost_usd', 'Subagent cost (list price)', value => money(value)),
      numberField('main_cost', 'Main agent cost (list price)', value => money(value))]} />
}

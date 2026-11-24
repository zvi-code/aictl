import { For, untrack } from 'solid-js'
import { fmtN, fmtNum, projectName } from '../../design/format'
import { BarChart } from './FlowsBars'
import { axisText, barTop } from './flowBarModel'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { money, share, toolLabel, type Label } from './insightsModel'
import {
  AFTER, AFTER_LABELS, afterRows, countAxis, listingLegend, listingRows, skillCostRows, skillProjectRows, skillsCoverage, skillsFinding,
  skillsHero, skillToolRows, skillUseRows, unusedRows, type SkillRow, type SkillsBody,
} from './skillsModel'
import styles from './Insights.module.css'

function Visual(props: { body: SkillsBody; label: Label }) {
  const empty = 'No skill with 5 uses in 3 sessions.'
  return <>
    <div class={styles.lists}>
      <BarChart data="uses" title="Uses per skill" rows={skillUseRows(props.body, props.label)} axis={countAxis(skillUseRows(props.body, props.label), 'uses')} empty={empty} />
      <BarChart data="cost" title="List price of the turns each skill ran in (share of the period's cost)" rows={skillCostRows(props.body)}
        axis={axisText('list price of the turns', money(barTop(skillCostRows(props.body))))} empty={empty} />
    </div>
    <h3 class={styles.subhead}>What followed a use in the same turn (share of the skill's uses with a recorded turn)</h3>
    <div class={styles.lists} data-after>
      <For each={AFTER}>{after => <BarChart data={after} title={AFTER_LABELS[after]} rows={afterRows(props.body, after)} top={1}
        axis={axisText('share of uses', '100%')} empty={empty} />}</For>
    </div>
    <div class={styles.lists}>
      <BarChart data="listings" title="Skills listed to the model, used and not used (skills)" rows={listingRows(props.body, props.label)}
        legend={listingLegend} axis={countAxis(listingRows(props.body, props.label), 'listed skills')}
        empty="No tool reported a skill listing in this period." />
      <BarChart data="unused" title="Listed and not used: listing tokens per skill" rows={unusedRows(props.body, props.label)}
        axis={axisText('listing tokens (estimated from size)', fmtN(barTop(unusedRows(props.body, props.label))))}
        empty="No listed skill went unused, or no tool reports listings." />
    </div>
    <div class={styles.lists}>
      <BarChart data="projects" title="Skill uses per project" rows={skillProjectRows(props.body)}
        axis={countAxis(skillProjectRows(props.body), 'uses')} empty="No project with 5 skill uses." />
      <BarChart data="tools" title="Skill uses per tool" rows={skillToolRows(props.body, props.label)}
        axis={countAxis(skillToolRows(props.body, props.label), 'uses')} empty="No skill use in this period." />
    </div>
    <p class={styles.note} data-coverage>{skillsCoverage(props.body, props.label)}</p>
  </>
}

type Row = Record<string, unknown>
const skillRow = (item: SkillRow, small: boolean): Row => ({
  id: item.name, name: item.name, uses: item.uses, sessions: item.sessions, projects: item.projects, turns: item.turns,
  tokens: item.turn_tokens ?? undefined, cost: item.cost_usd ?? undefined, edit: item.after_edit ?? undefined,
  test: item.after_test ?? undefined, commit: item.after_commit ?? undefined, small: small ? 'too few to compare' : '',
})

export default function Skills(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<SkillsBody> {...props} card="skills" title="Skills" tab="flow"
    hero={skillsHero}
    finding={body => skillsFinding(body, label)}
    visual={body => <Visual body={body} label={label} />}
    note={'A use is a skill_uses record in the period, any trigger (the agent invoked it, the person ran it, or the tool loaded ' +
      'it). A turn is the person\'s instruction the use belongs to; its tokens and list price are those of the requests of that ' +
      'turn in the period, each turn once per skill. A Copilot CLI turn is often a whole session, so the turns of different skills ' +
      'overlap and their costs do not add up. After a use: an edit (edit tools, create), a test run (the stored test-run flag) or a ' +
      'commit (git commit) of the same session and turn, after the use; the share is over the uses with a recorded turn, and one ' +
      'use can be followed by more than one. Listed and not used: the skills a session\'s main agent was told of in the period, ' +
      'each once per session; tokens are estimated from size and counted once per session that listed the skill. Too small to ' +
      'compare: a skill with fewer than 5 uses or 3 sessions, a project with fewer than 5 uses. A project is the last folder of ' +
      'the working folder. Cost is list price, not a bill.'}
    table={{
      label: 'Skills',
      rows: body => [...body.skills.map(item => skillRow(item, false)), ...body.small_skills.map(item => skillRow(item, true))],
      fields: [textField('name', 'Skill'), numberField('uses', 'Uses', fmtNum), numberField('sessions', 'Sessions', fmtNum),
        numberField('projects', 'Projects', fmtNum), numberField('turns', 'Turns', fmtNum), numberField('tokens', 'Turn tokens', fmtN),
        numberField('cost', 'Turn cost (list price)', value => money(value)),
        numberField('edit', 'Then edited', value => share(value)), numberField('test', 'Then tested', value => share(value)),
        numberField('commit', 'Then committed', value => share(value)), textField('small', 'Evidence')],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      textField('project_name', 'Project', row => row.project_name ? projectName(row.project_name) : ''),
      numberField('uses', 'Skill uses', fmtNum),
      textField('skills', 'Skills', row => Array.isArray(row.skills) ? row.skills.join(', ') : '')]} />
}


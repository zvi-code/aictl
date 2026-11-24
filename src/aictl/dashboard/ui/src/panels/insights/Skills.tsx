import { For, Show, untrack } from 'solid-js'
import { fmtN, fmtNum, fmtShare, projectName } from '../../design/format'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { money, plural, share, toolLabel, type Label } from './insightsModel'
import { skillsCoverage, skillsFinding, skillsHero, type SkillRow, type SkillsBody } from './skillsModel'
import styles from './Insights.module.css'

const SHOWN = 8

/** Per skill: the cost of the turns it ran in as a bar, with uses, sessions and what followed it in the same turn. */
function SkillBars(props: { body: SkillsBody }) {
  const largest = () => Math.max(0, ...props.body.skills.map(item => item.cost_usd ?? 0))
  return <section class={styles.flow} data-skills>
    <h3 class={styles.subhead}>Skills by the cost of the turns they ran in</h3>
    <Show when={props.body.skills.length} fallback={<p class={styles.note}>No skill with 5 uses in 3 sessions.</p>}>
      <ul class={styles.bars}>
        <For each={props.body.skills.slice(0, SHOWN)}>{item => <li class={styles.barRow} data-skill={item.name}>
          <span class={styles.barName}>{item.name}<small>{plural(item.uses, 'use')} · {plural(item.sessions, 'session')} · {plural(item.projects, 'project')}</small></span>
          <span class={styles.barTrack}>
            <span class={styles.bar} title={`${item.name}: ${plural(item.turns, 'turn')}, ${fmtN(item.turn_tokens ?? 0)} tokens, ` +
              `${money(item.cost_usd)} at list price`}>
              <span class={`${styles.fill} ${styles.carried}`}
                style={{ 'inline-size': `${largest() ? Math.max(2, (item.cost_usd ?? 0) / largest() * 100) : 0}%` }} />
              {money(item.cost_usd)} ({share(item.cost_share)})
            </span>
            <span class={styles.splitText}>then edit {fmtShare(item.after_edit)} · test {fmtShare(item.after_test)} · commit {fmtShare(item.after_commit)}</span>
          </span>
        </li>}</For>
      </ul>
    </Show>
  </section>
}

function Lists(props: { body: SkillsBody }) {
  return <div class={styles.lists}>
    <section>
      <h3 class={styles.subhead}>Listed and never used</h3>
      <Show when={props.body.unused.length} fallback={<p class={styles.note}>No listed skill went unused, or no tool reports listings.</p>}>
        <ol class={styles.rankList} data-unused>
          <For each={props.body.unused.slice(0, 6)}>{item => <li>
            <span>{item.name}</span><span>{plural(item.sessions, 'session')} · {fmtN(item.list_tokens)} tokens</span></li>}</For>
        </ol>
      </Show>
    </section>
    <section>
      <h3 class={styles.subhead}>By project</h3>
      <Show when={props.body.projects.length} fallback={<p class={styles.note}>No project with 5 skill uses.</p>}>
        <ol class={styles.rankList} data-projects>
          <For each={props.body.projects.slice(0, 8)}>{row => <li>
            <span>{projectName(row.project)}</span>
            <span>{plural(row.uses, 'use')} of {plural(row.skills, 'skill')} · {plural(row.sessions, 'session')}</span></li>}</For>
        </ol>
      </Show>
    </section>
  </div>
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
    visual={body => <>
      <SkillBars body={body} />
      <Lists body={body} />
      <p class={styles.note} data-coverage>{skillsCoverage(body, label)}</p>
    </>}
    note={'A use is a skill_uses record in the period, any trigger (the agent invoked it, the person ran it, or the tool loaded ' +
      'it). A turn is the person\'s instruction the use belongs to; its tokens and list price are those of the requests of that ' +
      'turn in the period, each turn once per skill. A Copilot CLI turn is often a whole session, so the turns of different skills ' +
      'overlap and their costs do not add up. After a use: an edit (edit tools, create), a test run (the stored test-run flag) or a ' +
      'commit (git commit) of the same session and turn, after the use. Listed and never used: the skills a session\'s main agent ' +
      'was told of in the period, each once per session; tokens are estimated from size and counted once per session that listed ' +
      'the skill. Too small to compare: a skill with fewer than 5 uses or 3 sessions, a project with fewer than 5 uses. A ' +
      'project is the last folder of the working folder. Cost is list price, not a bill.'}
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

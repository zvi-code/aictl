import { For, Show, untrack } from 'solid-js'
import { fmtNum } from '../../design/format'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import {
  FIXED_KINDS, FIXED_LABELS, fixedFinding, fixedHero, NOT_REPORTED, plural, share, tokens, toolLabel,
  type FixedBody, type FixedTool, type Label,
} from './insightsModel'
import styles from './Insights.module.css'

/** One bar per tool: the average fixed context of its sessions, stacked by kind, on one scale for all tools. */
function KindBars(props: { body: FixedBody; label: Label }) {
  const largest = () => Math.max(0, ...props.body.tools.map(tool => tool.avg_tokens ?? 0))
  const part = (value: number | null) => `${(largest() > 0 ? (value ?? 0) / largest() * 100 : 0).toFixed(2)}%`
  const missing = (tool: FixedTool) => tool.kinds.filter(cell => !cell.reported).map(cell => FIXED_LABELS[cell.kind])
  return <>
    <ul class={styles.legend} aria-label="Kinds of fixed context">
      <For each={FIXED_KINDS}>{(kind, i) => <li><span class={`${styles.swatch} ${styles[`k${i()}`]}`} />{FIXED_LABELS[kind]}</li>}</For>
    </ul>
    <ol class={styles.bars} aria-label="Average fixed context of a session by kind, per tool">
      <For each={props.body.tools}>{tool => <li class={styles.barRow} data-tool={tool.tool}>
        <span class={styles.barName}>{props.label(tool.tool)}<small>median {tokens(tool.p50_tokens)} · 90th percentile{' '}
          {tokens(tool.p90_tokens)} · {plural(tool.sessions, 'session')}{tool.estimated ? ' · estimated' : ''}</small></span>
        <span class={styles.barTrack}>
          <span class={styles.split} role="img" aria-label={`${props.label(tool.tool)}, average fixed context by kind: ` +
            tool.kinds.filter(cell => cell.reported).map(cell => `${FIXED_LABELS[cell.kind]} ${tokens(cell.avg_tokens)}`).join(', ')}>
            <For each={tool.kinds}>{(cell, i) => <Show when={cell.reported}>
              <span class={styles[`k${i()}`]} style={{ 'inline-size': part(cell.avg_tokens) }}
                title={`${FIXED_LABELS[cell.kind]}: average ${tokens(cell.avg_tokens)}, median ${tokens(cell.p50_tokens)} in ` +
                  `${fmtNum(cell.sessions)} sessions (${share(cell.session_share)})`} />
            </Show>}</For>
          </span>
          <span class={styles.splitText}>average {tokens(tool.avg_tokens)}
            {missing(tool).length ? ` · ${NOT_REPORTED}: ${missing(tool).join(', ')}` : ''}</span>
        </span>
      </li>}</For>
    </ol>
    <div class={styles.lists}>
      <section>
        <h3 class={styles.subhead}>Costliest instruction and memory files</h3>
        <Show when={props.body.files.length} fallback={<p class={styles.note}>No instruction or memory file in this period.</p>}>
          <ol class={styles.rankList} data-files>
            <For each={props.body.files}>{row => <li>
              <span>{row.file} <small>{props.label(row.tool)}</small></span>
              <span>{tokens(row.avg_tokens)} per load · largest {tokens(row.max_tokens)} · {plural(row.sessions, 'session')}</span>
            </li>}</For>
          </ol>
        </Show>
      </section>
      <section>
        <h3 class={styles.subhead}>Skills by listing tokens</h3>
        <Show when={props.body.top_skills.length} fallback={<p class={styles.note}>No tool in this period reports the skills it lists.</p>}>
          <ol class={styles.rankList} data-skills>
            <For each={props.body.top_skills}>{row => <li data-unused={row.uses ? undefined : ''}>
              <span>{row.name} <small>{props.label(row.tool)}</small></span>
              <span>{tokens(row.tokens)} · {plural(row.sessions, 'session')} · {row.uses ? plural(row.uses, 'use') : 'never used'}</span>
            </li>}</For>
          </ol>
        </Show>
        <Show when={props.body.summary.listing_not_reported.length}>
          <p class={styles.note}>Skill listing {NOT_REPORTED} by {props.body.summary.listing_not_reported.map(props.label).join(', ')};
            {' '}their uses are not compared.</p>
        </Show>
      </section>
    </div>
  </>
}

type Row = Record<string, unknown>

export default function FixedContext(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<FixedBody> {...props} card="fixed" title="Fixed context overhead" tab="context"
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

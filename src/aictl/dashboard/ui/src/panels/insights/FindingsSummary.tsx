import { createMemo, For, Show, untrack } from 'solid-js'
import { fmtUsd } from '../../design/format'
import type { Boxes } from '../../ui/Box'
import { detailPath, detailRead, scopeConfirmed } from '../data'
import { States } from '../kinds/States'
import type { PanelContext, Read } from '../types'
import { findingText, linkText, reveal, shareText, stakeText, whereText, type Finding, type SummaryBody } from './summaryModel'
import styles from './Summary.module.css'

const CARD_TITLES: Record<string, string> = {
  problems: 'Problem sessions', orientation: 'Orientation cost by repository', context: 'Context weight', pause: 'Pause tax',
  subagents: 'Spend in subagents',
  verified: 'Verified before commit', rereads: 'Repeated file reads', failures: 'After a failure',
}

/** Bring a finding's card into view; the card opens its session list once it has loaded. */
function show(item: Finding, ctx: PanelContext, boxes: Boxes) {
  if (item.opens === 'session' && item.session) {
    ctx.openAgent(item.session.session_id)
    return
  }
  const id = `insight-${item.card}`
  boxes.send({ type: 'restore', id })
  if (boxes.is('fold', id)) boxes.send({ type: 'fold', id })
  reveal({ card: item.card, sessions: item.opens === 'sessions' })
  document.querySelector<HTMLElement>(`[data-box="${id}"]`)?.scrollIntoView({ block: 'start' })
}

/** The findings of the period, ranked by what is at stake, at the top of Insights: one request, answered from the cards' views. */
export function FindingsSummary(props: { ctx: PanelContext; boxes: Boxes; since: number; until: number }) {
  const ctx = untrack(() => props.ctx)
  const path = createMemo(() => detailPath(ctx, '/api/board/insights/summary',
    new URLSearchParams({ since: String(props.since), until: String(props.until) })))
  const read = untrack(() => ctx.detail<SummaryBody>(path))
  const data = () => {
    const value = read()?.data
    return value && scopeConfirmed(ctx, value.node_scope as never) ? value : undefined
  }
  const result = (): Read => {
    if (read()?.data && !data()) return { state: 'error', message: 'The server did not confirm the requested node scope.' }
    const value = detailRead(read(), data(), false, 'the findings')
    return value.state === 'error' ? { ...value, message: `Could not load the findings: ${value.message ?? 'The request failed.'}` } : value
  }
  const body = () => data()!
  return <section class={styles.summary} data-summary aria-labelledby="insight-findings">
    <h2 id="insight-findings">What matters most in this period</h2>
    <States result={result} retry={read.retry}>
      <Show when={body().findings.length} fallback={<p class={styles.note}>No card found anything with a stake in this period.</p>}>
        <p class={styles.note} data-overlap>
          Ranked by what is at stake: dollars at list price first{body().total_usd != null ? ` (the period cost ${fmtUsd(body().total_usd)})` : ''},
          then counts that have no price. The findings overlap (one session can be in several), so do not add them up.
        </p>
        <ol class={styles.list}>
          <For each={body().findings}>{item => <li class={styles.item} data-finding-kind={item.kind}
            title={`From the ${CARD_TITLES[item.card] ?? item.card} card. ${shareText(item)}`.trim()}>
            <strong class={styles.stake} data-stake>{stakeText(item)}</strong>
            <span class={styles.text}>
              <span>{findingText(item)}</span>
              <small>{[shareText(item), whereText(item)].filter(Boolean).join(' · ')}</small>
            </span>
            <button type="button" class={styles.link} onClick={() => show(item, ctx, props.boxes)}>{linkText(item)}</button>
          </li>}</For>
        </ol>
      </Show>
      <Show when={body().missing.length}>
        <p class={styles.note} data-missing>Not included, the card could not be read: {body().missing.map(card => CARD_TITLES[card] ?? card).join(', ')}.</p>
      </Show>
    </States>
  </section>
}

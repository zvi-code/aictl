import { createMemo, For, Show, untrack } from 'solid-js'
import { fmtShare, fmtUsd } from '../../design/format'
import type { Boxes } from '../../ui/Box'
import { Tooltip } from '../../ui/Tooltip'
import { detailPath, detailRead, scopeConfirmed } from '../data'
import { States } from '../kinds/States'
import type { PanelContext, Read } from '../types'
import {
  cardTitle, findingHover, findingText, linkText, reveal, shareText, shareWhole, stakeText, whereText, type Finding, type SummaryBody,
} from './summaryModel'
import styles from './Summary.module.css'

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

/** The share of its whole a finding's amount is: a bar from 0 to 100%, its value written beside it, its figures on hover. */
function ShareBar(props: { item: Finding; total: number | null }) {
  return <Show when={props.item.share != null}>
    <span class={styles.share} data-share>
      <span class={styles.track}>
        <Tooltip class={styles.fill} label={`${fmtShare(props.item.share)} of ${shareWhole(props.item, props.total)}`}
          text={findingHover(props.item, props.total)} onClick={() => undefined}>
          <span class={styles.bar} style={{ 'inline-size': `${(Math.min(1, Math.max(0, props.item.share!)) * 100).toFixed(2)}%` }} />
        </Tooltip>
      </span>
      <span class={styles.shareText}>{fmtShare(props.item.share)}</span>
    </span>
  </Show>
}

/** The largest amounts the cards measured in the period, one line per measure: one request, answered from the cards' views. */
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
    <h2 id="insight-findings">Largest amounts measured in this period, one per card measure</h2>
    <States result={result} retry={read.retry}>
      <Show when={body().findings.length} fallback={<p class={styles.note}>No card measured an amount above zero in this period.</p>}>
        <p class={styles.note} data-overlap>
          Ordered by amount: amounts in dollars at list price first, largest first
          {body().total_usd != null ? ` (all requests of the period cost ${fmtUsd(body().total_usd)})` : ''}, then counts that have no
          price, by their share. The bar is the amount's share of its whole (hover for the figures). One session can be counted in
          several lines, so the amounts overlap and are not to be added.
        </p>
        <ol class={styles.list}>
          <For each={body().findings}>{item => <li class={styles.item} data-finding-kind={item.kind}>
            <strong class={styles.stake} data-stake>{stakeText(item)}</strong>
            <span class={styles.text}>
              <span>{findingText(item)}</span>
              <ShareBar item={item} total={body().total_usd} />
              <small>{[shareText(item), whereText(item), `from ${cardTitle(item.card)}`].filter(Boolean).join(' · ')}</small>
            </span>
            <button type="button" class={styles.link} data-open onClick={() => show(item, ctx, props.boxes)}>{linkText(item)}</button>
          </li>}</For>
        </ol>
      </Show>
      <Show when={body().missing.length}>
        <p class={styles.note} data-missing>Not included, the card could not be read: {body().missing.map(cardTitle).join(', ')}.</p>
      </Show>
    </States>
  </section>
}

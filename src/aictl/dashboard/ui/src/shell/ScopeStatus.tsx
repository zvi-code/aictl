import { createEffect, createMemo, untrack } from 'solid-js'
import { scopeBadge, statusPath, statusRows, type LiveLink } from '../panels/health/nodeStatus'
import type { PanelContext } from '../panels/types'
import { Tooltip } from '../ui/Tooltip'
import { scopeLabel } from './NodePicker'
import styles from './Shell.module.css'

const REFRESH_MS = 60000

/** The one status mark of the top row: how many nodes in scope report, a ring while any of them still reads its
    history, and this node's live link. The sentences are on hover; a click opens Health, where the progress is. */
export function ScopeStatus(props: { ctx: PanelContext; live?: LiveLink }) {
  const ctx = untrack(() => props.ctx)
  const path = createMemo(() => statusPath(ctx.scope(), ctx.nodeId()))
  const status = untrack(() => ctx.detail<unknown>(path))
  createEffect(path, key => {
    if (!key) return
    const timer = setInterval(() => { if (!document.hidden) status.retry() }, REFRESH_MS)
    return () => clearInterval(timer)
  })
  const badge = createMemo(() => scopeBadge(statusRows(status()?.data), scopeLabel(ctx.scope(), ctx.nodeId()), props.live))
  return <Tooltip class={styles.scopeStatus} label={badge().lines.join(' ')} text={badge().lines.join('\n')}
    onClick={() => ctx.navigate({ screen: 'health' })}>
    <span class={styles.scopeCount} data-scope-status data-tone={badge().tone} data-reading={badge().reading ? '' : undefined}>
      {badge().count}</span>
  </Tooltip>
}

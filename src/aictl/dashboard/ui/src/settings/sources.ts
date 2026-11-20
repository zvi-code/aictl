import { createEffect, createMemo, createSignal } from 'solid-js'
import type { DetailContextAudit } from '../data/contract.gen'
import { json } from '../panels/data'
import type { Audit } from './model'

type Progress = Extract<DetailContextAudit, { status: string }>
type Scan = { audit?: Audit; progress?: Progress; error?: string; pending?: boolean }

function delay(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const stop = () => { clearTimeout(timer); reject(signal.reason) }
    const timer = setTimeout(() => { signal.removeEventListener('abort', stop); resolve() }, 2000)
    if (signal.aborted) stop()
    else signal.addEventListener('abort', stop, { once: true })
  })
}

export function auditSource(active: () => boolean, refreshFiles: () => void) {
  const [scan, setScan] = createSignal<Scan>({})
  const [generation, increment] = createSignal(0)
  const rescan = () => {
    setScan(old => ({ audit: old.audit, pending: true }))
    increment(n => n + 1)
  }
  const request = createMemo(() => active() ? generation() : -1)
  createEffect(request, (now, before) => {
    if (now < 0) return
    const controller = new AbortController()
    const { signal } = controller
    const base = '/api/context-audit?nowait=1'
    setScan(old => ({ audit: old.audit, pending: true }))
    void (async () => {
      try {
        const deadline = Date.now() + 600_000
        const refresh = before != null && before >= 0 && now > before
        let value = await json<DetailContextAudit>(base + (refresh ? '&refresh=1' : ''), { signal })
        while ('status' in value && value.status === 'scanning') {
          setScan(old => ({ audit: old.audit, pending: true, progress: value as Progress }))
          if (Date.now() > deadline) throw new Error('The scan did not finish in time.')
          await delay(signal)
          value = await json<DetailContextAudit>(base, { signal })
        }
        signal.throwIfAborted()
        if (!('findings' in value) || !Array.isArray(value.findings)) throw new Error('The source did not return an audit.')
        setScan({ audit: value })
        refreshFiles()
      } catch (error) {
        if (!signal.aborted) setScan(old => ({ audit: old.audit, error: error instanceof Error ? error.message : String(error) }))
      }
    })()
    return () => controller.abort()
  })
  return { scan, rescan }
}

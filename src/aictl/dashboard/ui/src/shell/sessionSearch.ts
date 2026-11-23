// ─── Palette session search — debounced, the stale request cancelled ─
// Each keystroke restarts the delay and aborts the request still in flight, so only the
// answer for the newest text is shown. Timers are injected so tests need no clock.

export type Timers = {
  set: (run: () => void, ms: number) => unknown
  clear: (handle: unknown) => void
}
export type SearchState<T> =
  | { state: 'idle' }
  | { state: 'loading'; text: string }
  | { state: 'ready'; text: string; rows: readonly T[]; total: number }
  | { state: 'error'; text: string; message: string }

const realTimers: Timers = {
  set: (run, ms) => setTimeout(run, ms),
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

export function sessionSearcher<T>(options: {
  load: (text: string, signal: AbortSignal) => Promise<{ rows: readonly T[]; total: number }>
  update: (state: SearchState<T>) => void
  delay?: number
  minLength?: number
  timers?: Timers
}) {
  const timers = options.timers ?? realTimers
  const delay = options.delay ?? 200
  const minLength = options.minLength ?? 2
  let timer: unknown
  let controller: AbortController | undefined
  const stop = () => {
    if (timer !== undefined) timers.clear(timer)
    timer = undefined
    controller?.abort()
    controller = undefined
  }
  return {
    query(raw: string) {
      stop()
      const text = raw.trim()
      if (text.length < minLength) { options.update({ state: 'idle' }); return }
      options.update({ state: 'loading', text })
      timer = timers.set(() => {
        timer = undefined
        const current = new AbortController()
        controller = current
        options.load(text, current.signal).then(
          answer => { if (!current.signal.aborted) options.update({ state: 'ready', text, rows: answer.rows, total: answer.total }) },
          error => {
            if (!current.signal.aborted) {
              options.update({ state: 'error', text, message: error instanceof Error ? error.message : String(error) })
            }
          },
        )
      }, delay)
    },
    dispose: stop,
  }
}

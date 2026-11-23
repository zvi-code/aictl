// The command palette searches every session through the API: each keystroke waits for a
// pause, and a newer text cancels the request still running for an older one.
import { describe, expect, it } from 'vitest'
import { sessionSearcher, type SearchState, type Timers } from '../src/shell/sessionSearch'

function manualTimers() {
  const pending = new Map<number, () => void>()
  let next = 0
  const timers: Timers = {
    set: run => { pending.set(++next, run); return next },
    clear: handle => { pending.delete(handle as number) },
  }
  return { timers, pending, fire: () => { const runs = [...pending.values()]; pending.clear(); runs.forEach(run => run()) } }
}

function setup() {
  const clock = manualTimers()
  const states: SearchState<string>[] = []
  const calls: { text: string; signal: AbortSignal; resolve: (rows: string[]) => void; reject: (error: Error) => void }[] = []
  const searcher = sessionSearcher<string>({
    timers: clock.timers,
    update: state => states.push(state),
    load: (text, signal) => new Promise((resolve, reject) => {
      calls.push({ text, signal, resolve: rows => resolve({ rows, total: rows.length + 10 }), reject })
    }),
  })
  return { clock, states, calls, searcher }
}

const settle = () => new Promise(resolve => queueMicrotask(() => resolve(undefined)))

describe('palette session search', () => {
  it('sends one request after typing stops, for the last text only', async () => {
    const { clock, states, calls, searcher } = setup()
    for (const text of ['pa', 'par', 'parser']) searcher.query(text)
    expect(calls).toHaveLength(0)
    expect(clock.pending.size).toBe(1)
    clock.fire()
    expect(calls.map(call => call.text)).toEqual(['parser'])
    calls[0].resolve(['Fix the parser'])
    await settle()
    expect(states.at(-1)).toEqual({ state: 'ready', text: 'parser', rows: ['Fix the parser'], total: 11 })
  })

  it('cancels the request in flight when the text changes, and ignores its late answer', async () => {
    const { clock, states, calls, searcher } = setup()
    searcher.query('alpha')
    clock.fire()
    searcher.query('beta')
    expect(calls[0].signal.aborted).toBe(true)
    calls[0].resolve(['old'])
    clock.fire()
    calls[1].resolve(['new'])
    await settle()
    expect(states.filter(state => state.state === 'ready')).toEqual([{ state: 'ready', text: 'beta', rows: ['new'], total: 11 }])
  })

  it('does not search one character, reports a failure, and stops on dispose', async () => {
    const { clock, states, calls, searcher } = setup()
    searcher.query(' a ')
    expect(states.at(-1)).toEqual({ state: 'idle' })
    expect(clock.pending.size).toBe(0)
    searcher.query('agent')
    clock.fire()
    calls[0].reject(new Error('HTTP 503'))
    await settle()
    expect(states.at(-1)).toEqual({ state: 'error', text: 'agent', message: 'HTTP 503' })
    searcher.query('again')
    searcher.dispose()
    expect(clock.pending.size).toBe(0)
  })
})

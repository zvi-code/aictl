import { createEffect, createMemo, createSignal, For, onCleanup, Show } from 'solid-js'
import { Dialog } from '../ui/Dialog'
import { sessionSearcher, type SearchState } from './sessionSearch'
import { remember } from './viewState'
import styles from './Shell.module.css'

export type PaletteCommand = { id: string; label: string; run: () => void }
/** Sessions that match a text, from the session search API; any stored session, not only this window's agents. */
export type SessionLookup = (text: string, signal: AbortSignal) => Promise<{ rows: readonly PaletteCommand[]; total: number }>
const key = 'aictl-shell-recent-commands'
function recent(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(value) ? value.filter(id => typeof id === 'string') : []
  } catch { return [] }
}

export function Palette(props: { open: boolean; close: () => void; commands: () => PaletteCommand[]; sessions?: SessionLookup }) {
  const [found, setFound] = createSignal<SearchState<PaletteCommand>>({ state: 'idle' })
  const searcher = sessionSearcher<PaletteCommand>({
    load: (text, signal) => props.sessions ? props.sessions(text, signal) : Promise.resolve({ rows: [], total: 0 }),
    update: setFound,
  })
  onCleanup(searcher.dispose)
  const [find, setFind] = createSignal('')
  const [index, setIndex] = createSignal(0)
  const [ids, setIds] = createSignal(recent())
  const [shown, setShown] = createSignal(false)
  const matches = createMemo(() => {
    // Let native dialog focus run before adding the option DOM. Both happen
    // before paint, but the focus layout does not have to lay out the list.
    if (!props.open || !shown()) return []
    const commands = props.commands()
    const query = find().trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
    const all = query.length ? commands.filter(command => query.every(term => command.label.toLocaleLowerCase().includes(term))) :
      [...ids().flatMap(id => commands.find(command => command.id === id) ?? []), ...commands.filter(command => !ids().includes(command.id))]
    const sessions = found()
    const extra = sessions.state === 'ready' && sessions.text === find().trim() ? sessions.rows : []
    return [...all.slice(0, 80), ...extra.filter(row => !all.some(command => command.id === row.id))]
  })
  const sessionNote = () => {
    const sessions = found()
    if (!props.sessions || sessions.state === 'idle') return props.sessions ? 'Type 2 or more characters to search all sessions.' : undefined
    if (sessions.state === 'loading') return `Searching all sessions for “${sessions.text}”…`
    if (sessions.state === 'error') return `Could not search sessions: ${sessions.message}`
    return `${sessions.rows.length} of ${sessions.total.toLocaleString()} matching sessions shown.`
  }
  createEffect(() => props.open, visible => {
    if (!visible) {
      setShown(false)
      setFind('')
      setIndex(0)
      searcher.query('')
    }
  })
  const run = (command?: PaletteCommand) => {
    if (!command) return
    const next = [command.id, ...ids().filter(id => id !== command.id)].slice(0, 10)
    setIds(next)
    remember(key, JSON.stringify(next))
    props.close()
    command.run()
  }
  const active = () => Math.min(index(), Math.max(0, matches().length - 1))
  return <Dialog title="Command palette" open={props.open} onClose={props.close} onShow={() => setShown(true)}>
    <input class={styles.input} autofocus role="combobox" aria-label="Search commands"
      aria-controls="shell-commands" aria-expanded="true" aria-autocomplete="list"
      aria-activedescendant={matches().length ? `command-${active()}` : undefined}
      value={find()} onInput={event => { setFind(event.currentTarget.value); setIndex(0); searcher.query(event.currentTarget.value) }}
      onKeyDown={event => {
        const size = matches().length
        if (!size) return
        const next = event.key === 'ArrowDown' ? (active() + 1) % size :
          event.key === 'ArrowUp' ? (active() + size - 1) % size :
          event.ctrlKey && event.key === 'Home' ? 0 : event.ctrlKey && event.key === 'End' ? size - 1 : undefined
        if (next !== undefined) {
          event.preventDefault()
          setIndex(next)
          document.getElementById(`command-${next}`)?.scrollIntoView({ block: 'nearest' })
        } else if (event.key === 'Enter') { event.preventDefault(); run(matches()[active()]) }
      }} />
    <Show when={!matches().length}><p role="status">No matching commands.</p></Show>
    <Show when={sessionNote()}><p role="status" class={styles.paletteNote}>{sessionNote()}</p></Show>
    <div class={styles.commandList} id="shell-commands" role="listbox" aria-label="Commands">
      <For each={matches()} keyed={command => command.id}>{(command, i) =>
        <div id={`command-${i()}`} role="option" aria-selected={active() === i() ? 'true' : 'false'}
          onPointerMove={() => setIndex(i())} onClick={() => run(command())}>
          {command().label}{!find() && ids().includes(command().id) ? ' · Recent' : ''}
        </div>}</For>
    </div>
  </Dialog>
}

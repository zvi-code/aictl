import { createEffect, createMemo, createSignal, For, Show, untrack } from 'solid-js'
import { ago, fmtN, projectName } from '../design/format'
import { detailPath, json } from '../panels/data'
import type { PanelContext } from '../panels/types'
import { Icon } from '../ui/Icon'
import styles from './Shell.module.css'

/** One entry of `GET /api/board/projects`: a project value as stored, its sessions and its last activity. */
export type ProjectEntry = { project: string; name: string; sessions: number; last_ts: number | null; nodes: number }
export type ProjectCatalog = { projects: ProjectEntry[]; truncated: boolean }

// The list draws this many matches at most; typing narrows it.
const SHOWN = 200

/** The entries that match the typed text, by short name or full path, most recently active first as listed. */
export function matchProjects(entries: readonly ProjectEntry[], text: string): ProjectEntry[] {
  const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return words.length ? entries.filter(entry => words.every(word => entry.project.toLowerCase().includes(word))) : [...entries]
}

/** The project filter of the whole page, in the top bar: every project the store knows for the node scope. */
export function ProjectPicker(props: { ctx: PanelContext }) {
  const ctx = untrack(() => props.ctx)
  const [open, setOpen] = createSignal(false)
  const [typed, setTyped] = createSignal('')
  const [catalog, setCatalog] = createSignal<{ key: string; value?: ProjectCatalog; error?: string }>()
  let popup!: HTMLElement, trigger!: HTMLButtonElement, input: HTMLInputElement | undefined
  // The list of the current node scope; read each time the picker opens, so a new project shows at once.
  const path = createMemo(() => detailPath(ctx, '/api/board/projects'))
  createEffect(() => open() ? path() : undefined, key => {
    if (!key) return
    const request = new AbortController()
    void json<ProjectCatalog>(key, { signal: request.signal }).then(value => {
      if (!Array.isArray(value?.projects)) throw new Error('The server sent no project list.')
      if (!request.signal.aborted) setCatalog({ key, value })
    }).catch(error => {
      if (!request.signal.aborted) setCatalog({ key, error: error instanceof Error ? error.message : String(error) })
    })
    return () => request.abort()
  })
  const current = () => catalog()?.key === path() ? catalog() : undefined
  const matches = createMemo(() => matchProjects(current()?.value?.projects ?? [], typed()))
  const chosen = () => ctx.filters().projects
  const label = () => chosen().length === 0 ? 'All' : chosen().length === 1 ? projectName(chosen()[0]) : `${chosen().length} projects`
  const choose = (projects: readonly string[]) => {
    popup.hidePopover()
    trigger.focus()
    ctx.navigate({ project: projects.length ? [...projects] : null, sel: null })
  }
  return <>
    <button ref={trigger} class={styles.button} type="button" popovertarget="project-picker" data-active={chosen().length ? '' : undefined}
      title={chosen().length ? chosen().join('\n') : 'Every project'} aria-controls="project-picker" aria-expanded={open() ? 'true' : 'false'}>
      <Icon glyph="branch" /><span><span class={styles.srOnly}>Project filter: </span>Project: {label()}</span><Icon glyph="down" small /></button>
    <section ref={popup} id="project-picker" class={`${styles.popup} ${styles.projectPopup}`} popover="auto" aria-label="Choose projects"
      onToggle={event => {
        setOpen(event.newState === 'open')
        if (event.newState === 'open') requestAnimationFrame(() => input?.focus())
      }}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); popup.hidePopover(); trigger.focus() }
      }}>
      <label class={styles.search}><Icon glyph="search" /><span class={styles.srOnly}>Find a project</span>
        <input ref={element => { input = element }} type="search" value={typed()} placeholder="Type a name or a path"
          onInput={event => setTyped(event.currentTarget.value)} /></label>
      <div class={styles.controls}>
        <button class={styles.secondary} type="button" disabled={!chosen().length} onClick={() => choose([])}>All projects</button>
      </div>
      <Show when={current()?.error}>{message => <p role="alert">Could not list the projects: {message()}</p>}</Show>
      <Show when={!current()}><p role="status">Reading the projects…</p></Show>
      <Show when={current()?.value}>{value => <>
        <p class={styles.projectNote} role="status">
          {matches().length === value().projects.length ? `${fmtN(value().projects.length)} projects` :
            `${fmtN(matches().length)} of ${fmtN(value().projects.length)} projects`}, most recently active first
          {value().truncated ? '. Only the most recent are listed; type to find others by name.' : ''}</p>
        <ul class={styles.projectList} aria-label="Projects">
          <For each={matches().slice(0, SHOWN)} keyed={entry => entry.project}>{entry =>
            <li><button class={styles.projectEntry} type="button" title={entry().project}
              aria-pressed={chosen().includes(entry().project) ? 'true' : 'false'} onClick={() => choose([entry().project])}>
              <span class={styles.projectName}>{entry().name}</span>
              <span class={styles.projectPath}>{entry().project}</span>
              <span class={styles.projectFacts}>{fmtN(entry().sessions)} {entry().sessions === 1 ? 'session' : 'sessions'}
                {' · '}{ago(entry().last_ts)}{entry().nodes > 1 ? ` · ${fmtN(entry().nodes)} nodes` : ''}</span>
            </button></li>}</For>
        </ul>
        <Show when={matches().length > SHOWN}><p class={styles.projectNote}>{fmtN(matches().length - SHOWN)} more: type to narrow the list.</p></Show>
        <Show when={!matches().length}><p>No project matches “{typed()}”.</p></Show>
      </>}</Show>
    </section>
  </>
}

/** The chosen projects, named on every screen, so a filtered figure is never read as a total. */
export function ProjectChips(props: { ctx: PanelContext; applies: boolean }) {
  const ctx = untrack(() => props.ctx)
  return <Show when={ctx.filters().projects.length}>
    <div class={styles.projectChips} role="status" aria-label="Project filter">
      <For each={ctx.filters().projects}>{project => <span class={styles.chip} title={project}>
        Project: {projectName(project)}
        <button class={styles.chipClose} type="button" aria-label={`Remove the project ${project} from the filter`}
          title="Remove from the filter"
          onClick={() => ctx.navigate({ project: ctx.filters().projects.filter(value => value !== project) })}>
          <Icon glyph="close" small /></button></span>}</For>
      <span class={styles.projectNote}>{props.applies ? 'Every figure on this screen is for the chosen projects only.'
        : 'This screen is not per project: the project filter does not apply here.'}</span>
    </div>
  </Show>
}

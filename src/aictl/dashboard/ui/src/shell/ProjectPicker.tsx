import { createEffect, createMemo, createSignal, For, Show, untrack } from 'solid-js'
import { ago, fmtN, projectName } from '../design/format'
import { chosenCount } from '../data/filters'
import { detailPath, json } from '../panels/data'
import type { PanelContext } from '../panels/types'
import { Icon } from '../ui/Icon'
import styles from './Shell.module.css'

/** One entry of `GET /api/board/projects`: a project value as stored, its sessions and its last activity. */
export type ProjectEntry = { project: string; name: string; sessions: number; last_ts: number | null; nodes: number; node_ids: string[] }
/** A repository with two or more stored projects: its folder, its worktrees and folders, and why each belongs. */
export type RepoMember = { project: string; name: string; sessions: number; last_ts: number | null; evidence: string; node_ids: string[] }
export type RepoEntry = { root: string; name: string; members: RepoMember[]; sessions: number; last_ts: number | null; node_ids: string[] }
export type ProjectCatalog = { projects: ProjectEntry[]; repos: RepoEntry[]; truncated: boolean }

// The list draws this many matches at most; typing narrows it.
const SHOWN = 200

const matches = (path: string, words: readonly string[]) => words.every(word => path.toLowerCase().includes(word))
const wordsOf = (text: string) => text.trim().toLowerCase().split(/\s+/).filter(Boolean)

/** The entries that match the typed text, by short name or full path, most recently active first as listed. */
export function matchProjects(entries: readonly ProjectEntry[], text: string): ProjectEntry[] {
  const words = wordsOf(text)
  return entries.filter(entry => matches(entry.project, words))
}

/** The repositories that match the typed text by their folder or any member's. */
export function matchRepos(entries: readonly RepoEntry[], text: string): RepoEntry[] {
  const words = wordsOf(text)
  return entries.filter(entry => matches(entry.root, words) || entry.members.some(member => matches(member.project, words)))
}

/** The nodes an entry's sessions ran on, by name. Written only when the list holds more than one node: the same
    path on two nodes is one entry, and without the names nothing tells two nodes' folders apart. */
export function nodeNote(nodeIds: readonly string[], several: boolean) {
  if (!several || !nodeIds.length) return ''
  return nodeIds.length === 1 ? ` · on ${nodeIds[0]}` : ` · on ${fmtN(nodeIds.length)} nodes: ${nodeIds.join(', ')}`
}

/** The address after one entry is switched on or off; the other chosen entries stay. */
export function toggled(list: readonly string[], value: string): string[] | null {
  const next = list.includes(value) ? list.filter(item => item !== value) : [...list, value].sort()
  return next.length ? next : null
}

/** The project filter of the whole page, in the top bar: every project and repository the store knows for the node scope. */
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
  const projects = createMemo(() => matchProjects(current()?.value?.projects ?? [], typed()))
  const repos = createMemo(() => matchRepos(current()?.value?.repos ?? [], typed()))
  const several = createMemo(() => new Set((current()?.value?.projects ?? []).flatMap(entry => entry.node_ids)).size > 1)
  const chosen = () => ctx.filters()
  const label = () => {
    const { projects, repos } = chosen()
    const count = chosenCount(chosen())
    return count === 0 ? 'All' : count > 1 ? `${count} chosen` : projectName(projects[0] ?? repos[0])
  }
  const close = () => { popup.hidePopover(); trigger.focus() }
  // Several entries can be chosen: each click switches one, and the list stays open.
  const toggleProject = (project: string) => ctx.navigate({ project: toggled(chosen().projects, project), sel: null })
  const toggleRepo = (root: string) => ctx.navigate({ repo: toggled(chosen().repos, root), sel: null })
  const facts = (entry: { sessions: number; last_ts: number | null }) =>
    `${fmtN(entry.sessions)} ${entry.sessions === 1 ? 'session' : 'sessions'} · ${ago(entry.last_ts)}`
  return <>
    <button ref={trigger} class={styles.button} type="button" popovertarget="project-picker" data-active={chosenCount(chosen()) ? '' : undefined}
      title={chosenCount(chosen()) ? [...chosen().repos.map(repo => `Repository ${repo}`), ...chosen().projects].join('\n') : 'Every project'}
      aria-controls="project-picker" aria-expanded={open() ? 'true' : 'false'}>
      <Icon glyph="branch" /><span><span class={styles.srOnly}>Project filter: </span>Project: {label()}</span><Icon glyph="down" small /></button>
    <section ref={popup} id="project-picker" class={`${styles.popup} ${styles.projectPopup}`} popover="auto" aria-label="Choose projects"
      onToggle={event => {
        setOpen(event.newState === 'open')
        if (event.newState === 'open') requestAnimationFrame(() => input?.focus())
      }}
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() } }}>
      <label class={styles.search}><Icon glyph="search" /><span class={styles.srOnly}>Find a project</span>
        <input ref={element => { input = element }} type="search" value={typed()} placeholder="Type a name or a path"
          onInput={event => setTyped(event.currentTarget.value)} /></label>
      <div class={styles.controls}>
        <button class={styles.secondary} type="button" disabled={!chosenCount(chosen())}
          onClick={() => ctx.navigate({ project: null, repo: null, sel: null })}>All projects</button>
        <button class={styles.primary} type="button" onClick={close}>Done</button>
      </div>
      <Show when={current()?.error}>{message => <p role="alert">Could not list the projects: {message()}</p>}</Show>
      <Show when={!current()}><p role="status">Reading the projects…</p></Show>
      <Show when={current()?.value}>{value => <>
        <Show when={repos().length}>
          <h3 class={styles.projectHeading}>Repositories, with their worktrees and folders</h3>
          <ul class={styles.projectList} aria-label="Repositories">
            <For each={repos().slice(0, SHOWN)} keyed={repo => repo.root}>{repo => <li>
              <label class={styles.projectEntry} title={repo().root}>
                <input type="checkbox" checked={chosen().repos.includes(repo().root)} onChange={() => toggleRepo(repo().root)} />
                <span class={styles.projectName}>{repo().name} <span class={styles.projectFacts}>
                  · {fmtN(repo().members.length)} folders · {facts(repo())}{nodeNote(repo().node_ids, several())}</span></span>
                <span class={styles.projectPath}>{repo().root}</span>
              </label>
              {/* Folded: a repository can hold dozens of worktrees, and the list must stay scannable. */}
              <details class={styles.projectMembers}>
                <summary>{fmtN(repo().members.length)} folders and why each belongs</summary>
                <ul aria-label={`Folders of ${repo().name}`}>
                  <For each={repo().members} keyed={member => member.project}>{member =>
                    <li class={styles.projectMember} title={`${member().project}\n${member().evidence}`}>
                      <span>{member().project}</span>
                      <span class={styles.projectFacts}>{facts(member())}{nodeNote(member().node_ids, several())} · {member().evidence}</span>
                    </li>}</For>
                </ul>
              </details>
            </li>}</For>
          </ul>
        </Show>
        <h3 class={styles.projectHeading}>Projects</h3>
        <p class={styles.projectNote} role="status">
          {projects().length === value().projects.length ? `${fmtN(value().projects.length)} projects` :
            `${fmtN(projects().length)} of ${fmtN(value().projects.length)} projects`}, most recently active first
          {value().truncated ? '. Only the most recent are listed; type to find others by name.' : ''}</p>
        <ul class={styles.projectList} aria-label="Projects">
          <For each={projects().slice(0, SHOWN)} keyed={entry => entry.project}>{entry =>
            <li><label class={styles.projectEntry} title={entry().project}>
              <input type="checkbox" checked={chosen().projects.includes(entry().project)} onChange={() => toggleProject(entry().project)} />
              <span class={styles.projectName}>{entry().name}</span>
              <span class={styles.projectPath}>{entry().project}</span>
              <span class={styles.projectFacts}>{facts(entry())}{nodeNote(entry().node_ids, several())}</span>
            </label></li>}</For>
        </ul>
        <Show when={projects().length > SHOWN}><p class={styles.projectNote}>{fmtN(projects().length - SHOWN)} more: type to narrow the list.</p></Show>
        <Show when={!projects().length && !repos().length}><p>No project matches “{typed()}”.</p></Show>
      </>}</Show>
    </section>
  </>
}

/** The chosen repositories and projects, named on every screen, so a filtered figure is never read as a total. */
export function ProjectChips(props: { ctx: PanelContext; applies: boolean }) {
  const ctx = untrack(() => props.ctx)
  const chip = (kind: 'repo' | 'project', value: string) => <span class={styles.chip}
    title={kind === 'repo' ? `${value}, with its worktrees and folders` : value}>
    {kind === 'repo' ? 'Repository' : 'Project'}: {projectName(value)}
    <button class={styles.chipClose} type="button" aria-label={`Remove the ${kind === 'repo' ? 'repository' : 'project'} ${value} from the filter`}
      title="Remove from the filter"
      onClick={() => ctx.navigate({ [kind]: (kind === 'repo' ? ctx.filters().repos : ctx.filters().projects).filter(item => item !== value) })}>
      <Icon glyph="close" small /></button></span>
  return <Show when={chosenCount(ctx.filters())}>
    <div class={styles.projectChips} role="status" aria-label="Project filter">
      <For each={ctx.filters().repos}>{repo => chip('repo', repo)}</For>
      <For each={ctx.filters().projects}>{project => chip('project', project)}</For>
      <span class={styles.projectNote}>{props.applies ? 'Every figure read from history on this screen is for the chosen projects only; the runtime counts are marked where they are not.'
        : 'This screen is not per project: the project filter does not apply here.'}</span>
    </div>
  </Show>
}

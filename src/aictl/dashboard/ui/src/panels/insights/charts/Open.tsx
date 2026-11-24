// A name in an Insights chart is a way in: a skill opens its detail, a session its flow, a repository filters the
// page. A chart row carries what its name opens (`open`); a name with nothing to open stays plain text.
import { createContext, Show, useContext } from 'solid-js'
import { toolsToParams } from '../../../data/urlState'
import type { PanelContext } from '../../types'
import { projectName } from '../../../design/format'
import styles from './Open.module.css'

/** What a click on a name does, and how a screen reader and the hover say it. */
export type Open = { label: string; run: () => void }

/** A row's name: a button when it opens something, else the text. `title` is the hover of a plain name. */
export function Name(props: { text: string; open?: Open; title?: string }) {
  return <Show when={props.open} fallback={<span title={props.title}>{props.text}</span>}>{open =>
    <button type="button" class={styles.open} title={open().label} aria-label={open().label} data-open
      onClick={event => { event.stopPropagation(); open().run() }}>{props.text}</button>}</Show>
}

/** The rows of a chart, each with what its name opens. A row whose name opens nothing comes back unchanged. */
export const opening = <T extends object>(rows: readonly T[], open: (row: T) => Open | undefined): (T & { open?: Open })[] =>
  rows.map(row => ({ ...row, open: open(row) }))

/** What each kind of name opens. One place, so every view sends a skill, a session or a repository the same way. */
export function opens(ctx: PanelContext) {
  const detail = (type: 'skill' | 'tool' | 'mcp', name: string, label: string): Open | undefined =>
    name ? { label, run: () => ctx.openDetail({ type, name }) } : undefined
  return {
    /** The skill's detail: its uses and sessions in the period, where it is installed, its text. */
    skill: (name: string) => detail('skill', name, `Open skill ${name}: uses, sessions and its text`),
    /** A tool by the name agents call it (Bash, Read, view): its calls, failures and sessions. */
    tool: (name: string) => detail('tool', name, `Open tool ${name}: calls, failures and sessions`),
    /** An MCP server: its tools, calls and sessions. `id` is the server's id as the store names it. */
    mcp: (id: string, name = id) => detail('mcp', id, `Open MCP server ${name}: tools, calls and sessions`),
    /** A file an agent read or wrote: its versions and the sessions that touched it. */
    file: (path: string): Open | undefined => path
      ? { label: `Open file ${path}`, run: () => ctx.openDetail({ type: 'file', path }) } : undefined,
    /** A session: its flow, or the drawer tab named. */
    session: (id: string, name: string, tab = 'flow'): Open | undefined => id
      ? { label: `Open session ${name}`, run: () => ctx.openAgent(id, tab) } : undefined,
    /** A repository: the whole page, every view, narrowed to it. */
    repo: (root: string): Open | undefined => root
      ? { label: `Show only the repository ${projectName(root)} (${root}) on every view`, run: () => ctx.navigate({ repo: [root], project: null, sel: null }) }
      : undefined,
    /** A project folder: the whole page narrowed to it. */
    project: (path: string): Open | undefined => path
      ? { label: `Show only the project ${projectName(path)} (${path}) on every view`, run: () => ctx.navigate({ project: [path], repo: null, sel: null }) }
      : undefined,
    /** A coding tool (Claude Code, Copilot CLI): the whole page narrowed to it. */
    product: (tool: string, name: string): Open | undefined => tool
      ? { label: `Show only ${name} on every view`, run: () => ctx.navigate(toolsToParams([tool])) } : undefined,
    /** A model: the whole page narrowed to it. */
    model: (model: string): Open | undefined => model
      ? { label: `Show only the model ${model} on every view`, run: () => ctx.navigate({ model }) } : undefined,
  }
}
export type Opens = ReturnType<typeof opens>

/** The openers of the view being drawn, for a shared piece (the repository legend) that every view places. */
export const OpensContext = createContext<Opens | null>(null)
/** Undefined outside a view: the piece then draws its names as text. */
export const useOpens = () => useContext(OpensContext) ?? undefined

// ─── The name of a session on the Insights cards: what it is about, not its id ─
// Every session row of an Insights answer may carry the session's stored title, git_branch and project_path
// (insights.session_names on the server). A row whose session has no stored row carries none of them.
import { nodeTitle } from '../../data/nodeNames'

export type NamedSession = {
  session_id: string; node_id?: string | null; tool?: string | null
  title?: unknown; git_branch?: unknown; project_path?: unknown
}

const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null

/** The node and the session of an id. In All nodes scope an id is the JSON pair ["node","session"]. */
export function sessionParts(id: string): { node: string | null; session: string } {
  if (id.startsWith('[')) {
    try {
      const parts: unknown = JSON.parse(id)
      if (Array.isArray(parts) && parts.length === 2 && parts.every(part => typeof part === 'string')) {
        return { node: parts[0] as string, session: parts[1] as string }
      }
    } catch { /* not a pair: the id as it is */ }
  }
  return { node: null, session: id }
}

/** The first characters of the session part of an id, enough to tell two sessions apart. */
export function shortSessionId(id: string): string {
  const { session } = sessionParts(id)
  return session.length > 12 ? session.slice(0, 8) : session
}

/** The session's title, else its short id. */
export const sessionName = (row: NamedSession) => text(row.title) ?? shortSessionId(row.session_id)

/** The session's branch, or '' when it is not known. */
export const sessionBranch = (row: NamedSession) => text(row.git_branch) ?? ''

/** A bar or row label: `Claude Code · Fix the login page · on feature/login`. */
export function sessionLabel(row: NamedSession, label: (tool: string) => string): string {
  const branch = sessionBranch(row)
  return [label(String(row.tool ?? '')), sessionName(row), branch ? `on ${branch}` : ''].filter(Boolean).join(' · ')
}

/** The hover of a session: its full title, branch, folder, node (`[n] host`) and full session id, one per line. */
export function sessionHover(row: NamedSession): string {
  const { node, session } = sessionParts(row.session_id)
  const nodeId = text(row.node_id) ?? node
  return [
    text(row.title) ?? 'No stored title',
    sessionBranch(row) ? `Branch: ${sessionBranch(row)}` : '',
    text(row.project_path) ? `Folder: ${text(row.project_path)}` : '',
    nodeId ? `Node: ${nodeTitle(nodeId)}` : '',
    `Session id: ${session}`,
  ].filter(Boolean).join('\n')
}

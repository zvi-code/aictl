import { beforeEach, describe, expect, it } from 'vitest'
import { setNodes } from '../../src/data/nodeNames'
import { sessionBranch, sessionHover, sessionLabel, sessionName, sessionParts, shortSessionId } from '../../src/panels/insights/sessionName'

const label = (tool: string) => tool === 'claude-code' ? 'Claude Code' : tool
const PAIR = JSON.stringify(['host-b', '0f3c9a12-7777-4b1e-9c1d-1234567890ab'])

beforeEach(() => { setNodes('host-a', ['host-a', 'host-b']) })

describe('INS-NAME · a session row is shown by its name, never by the JSON of its id', () => {
  it('reads the session part of a node-qualified id and shortens it', () => {
    expect(sessionParts(PAIR)).toEqual({ node: 'host-b', session: '0f3c9a12-7777-4b1e-9c1d-1234567890ab' })
    expect(sessionParts('plain-id')).toEqual({ node: null, session: 'plain-id' })
    expect(sessionParts('[not json')).toEqual({ node: null, session: '[not json' })
    expect(shortSessionId(PAIR)).toBe('0f3c9a12')
    expect(shortSessionId('s-short')).toBe('s-short')
  })

  it('names a session by its title, else by its short id, with the branch and the tool', () => {
    const titled = { session_id: PAIR, node_id: 'host-b', tool: 'claude-code', title: 'Fix the login page', git_branch: 'feature/login' }
    expect(sessionName(titled)).toBe('Fix the login page')
    expect(sessionLabel(titled, label)).toBe('Claude Code · Fix the login page · on feature/login')
    const bare = { session_id: PAIR, tool: 'claude-code', title: null, git_branch: null }
    expect(sessionName(bare)).toBe('0f3c9a12')
    expect(sessionBranch(bare)).toBe('')
    expect(sessionLabel(bare, label)).toBe('Claude Code · 0f3c9a12')
    expect(sessionLabel(bare, label)).not.toContain('["')
  })

  it('hovers with the full title, branch, folder, node and full session id', () => {
    expect(sessionHover({ session_id: PAIR, node_id: 'host-b', title: 'Fix the login page', git_branch: 'feature/login',
      project_path: '/work/app' })).toBe('Fix the login page\nBranch: feature/login\nFolder: /work/app\nNode: [1] host-b\n' +
      'Session id: 0f3c9a12-7777-4b1e-9c1d-1234567890ab')
    // No node_id on the row: the node comes from the pair. No title: said so.
    expect(sessionHover({ session_id: PAIR })).toBe('No stored title\nNode: [1] host-b\nSession id: 0f3c9a12-7777-4b1e-9c1d-1234567890ab')
    expect(sessionHover({ session_id: 's1' })).toBe('No stored title\nSession id: s1')
  })
})

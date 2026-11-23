import { describe, expect, it } from 'vitest'
import type { DetailSettingsTools, SettingsToolConfig } from '../src/data/contract.gen'
import {
  isRecent, labelOf, mergeFiles, MISSING, nextSettings, pinWins, readSettingsUrl, rowFilter, rowValue, setIn, settingsParams,
  settingsSummary, toolEntries, topicMatrix, withFindingIds,
} from '../src/settings/model'
import { derivePermissions, listDiff, parseLines, permissionEdit } from '../src/settings/permissions'

const settings = '/work/.claude/settings.local.json'
const projectScope = { id: 'project-local', path: settings, exists: true, changeable: true }
const cfg: SettingsToolConfig = {
  tool: 'claude-code',
  config_files: [settings],
  scopes: [projectScope, { id: 'managed', path: '/policy/managed.json', exists: false, changeable: false }],
  sections: [
    { id: 'model', rows: [{ key: 'model', label: 'Model', value: 'active', set: true, source: 'env:CLAUDE_MODEL' },
      { key: 'threads', value: 0, source: settings }, { key: 'unreported' }] },
    { id: 'autonomy', rows: [{ key: 'permissions', value: { allow: ['Bash', 'Write(repo/**)'], deny: ['WebFetch'], ask: [] },
      danger: true, documented: false, scope: 'project-local', source: settings, line: 12, wins: 1, chain: [
        { scope: 'user', source: '/home/user/settings.json', value: { deny: ['Read'] }, set: true },
        { scope: 'project-local', source: settings, line: 12, value: { allow: ['Bash', 'Write(repo/**)'], deny: ['WebFetch'] } },
      ] }] },
    { id: 'agents', rows: [{ key: 'agent/reviewer', label: 'Reviewer', value: 'haiku', source: settings,
      agent: { pinned_in: settings, defined_in: '/work/reviewer.md', tools: ['Read'] }, wins: 0,
      chain: [{ scope: 'project-local', source: settings, value: 'haiku' }] }] },
  ],
}

describe('settings contract projections', () => {
  it('says where a value comes from: file and line, variable, derived origin or default', () => {
    expect(setIn({ source: '/home/u/.config/Code/User/settings.json', line: 731, scope: 'user' })).toBe('settings.json, line 731')
    expect(setIn({ source: 'env:COPILOT_MODEL', scope: 'env' })).toBe('Environment variable COPILOT_MODEL')
    expect(setIn({ source: 'detected', scope: 'detected' })).toBe('Reported by the installed tool')
    expect(setIn({ source: 'unknown', scope: 'unknown' })).toBe('Origin not known')
    expect(setIn({ source: '', scope: 'default' })).toBe('Default')
  })

  it('uses reported tool labels and preserves names while tool details load', () => {
    const detail: DetailSettingsTools = {
      generated_at: 1, tools: [{ tool: 'copilot-desktop', label: 'Work Copilot' }],
      tool_configs: [], monitor: { diagnostics: {}, state_paths: [], workspace_paths: [] },
    }
    expect(labelOf('copilot-desktop', detail)).toBe('Work Copilot')
    expect(labelOf('copilot-desktop')).toBe('Copilot Desktop')
    expect(labelOf('copilot365', detail)).toBe('Microsoft 365 Copilot')
  })

  it('SET-01/02/04/05/12/13: does not replace stream values with local detail, and preserves distinct reported states', () => {
    const detail: DetailSettingsTools = {
      generated_at: 1, tools: [], monitor: { diagnostics: {}, state_paths: [], workspace_paths: [] },
      tool_configs: [{ tool: 'claude-code',
        sections: [{ id: 'model', rows: [{ key: 'model', value: 'obsolete', set: true },
          { key: 'default-only', value: 'default', set: false, scope: 'default' }] }],
        env_vars: [{ name: 'CLAUDE_MODEL', set: true, masked: true, value: 'redacted' }] }],
    }
    const [entry] = toolEntries([cfg], detail)
    const row = (key: string) => entry.rows.find(item => item.key === key)!
    expect(row('model').value).toBe('active')
    expect(rowValue(row('threads'))).toBe('0')
    expect(rowValue(row('unreported'))).toBe(MISSING)
    expect(entry.envVars[0]).toMatchObject({ masked: true, drives: [{ key: 'model' }] })
    expect(row('permissions')).toMatchObject({ risky: true, undocumented: true, line: 12, wins: 1 })
    expect(settingsSummary([entry])).toMatchObject({ unset: 1, knowsSet: true, risky: 1, agents: 1 })
    expect(entry.rows.filter(rowFilter('settings.local', true, true, true)).map(item => item.key)).toEqual(['permissions'])
    expect(entry.rows.filter(rowFilter('', false, false, false))).not.toContain(row('default-only'))
    expect(pinWins(row('agent/reviewer'))).toBe(true)
  })

  it('SET-03: pairs comparable settings without inventing absent tool values', () => {
    const entries = toolEntries([cfg, { tool: 'vscode', sections: [
      { id: 'model', rows: [{ key: 'github.copilot.model', label: 'Model', value: 'codex' }] },
    ] }])
    const matrix = topicMatrix(entries, 'model', rowFilter('', false, false, false))
    expect(matrix.rows.find(row => row.label === 'Model')?.cells.size).toBe(2)
    expect(matrix.rows.find(row => row.label === 'threads')?.cells.get('vscode')).toBeUndefined()
  })

  it('SET-06/15: derives mixed permissions, keeps scope provenance, and guards writes to locked layers', () => {
    const [entry] = toolEntries([cfg])
    const matrix = derivePermissions(entry)!
    const cell = (cap: string) => matrix.cells.find(cell => cell.cap === cap)
    expect(cell('shell')).toMatchObject({ state: 'allowed', key: 'permissions' })
    expect(cell('web')?.state).toBe('denied')
    expect(cell('write')).toMatchObject({ state: 'mixed', rules: [{ where: ['Project local'] }] })
    const row = entry.rows.find(row => row.key === 'permissions')!
    expect(permissionEdit(row, entry.scopes)).toMatchObject({ ok: true, path: settings })
    expect(permissionEdit({ ...row, locked: true }, entry.scopes)).toMatchObject({ ok: false })
    expect(permissionEdit({ ...row, wins: 0 }, entry.scopes)).toMatchObject({ ok: false })
    expect(listDiff(['Bash', 'Read'], parseLines(' Bash \n\n Glob '))).toEqual({ added: ['Glob'], removed: ['Read'] })
  })

  it('SET-09/14: keeps known paths and absent managed locations without fabricating file metadata', () => {
    const files = mergeFiles(undefined, toolEntries([cfg]), null)
    const file = files.find(item => item.path === settings)!
    expect(file.rows.map(item => item.key)).toEqual(expect.arrayContaining(['permissions', 'threads']))
    expect(file.bytes).toBeUndefined()
    expect(isRecent(file, 100)).toBe(false)
    expect(files.find(item => item.scope === 'managed')).toMatchObject({ exists: false })
  })

  it('SET-10: finding IDs do not change when the tool filter removes an earlier result', () => {
    const same = { rule: 'ignored', path: settings, line: 3, severity: 'high' }
    const findings = [same, { ...same, tools: ['claude-code'] }]
    const ids = withFindingIds(findings, ['claude-code']).map(row => row.id)
    expect(ids[1]).toBe(`${ids[0]}#1`)
    expect(withFindingIds(findings, ['vscode']).map(row => row.id)).toEqual([ids[0]])
  })

  it('SET-01/09: clears incompatible URL facets and does not replace the shell scope', () => {
    const state = readSettingsUrl('?scope=fleet&pivot=files&group=purpose&tool=claude-code&sec=home&purpose=settings&recent=1')
    const params = settingsParams(nextSettings(state, { view: 'findings' }), false)
    expect(params).toMatchObject({ pivot: 'findings', tool: null, sec: null, group: null, recent: null, purpose: null })
    expect(params).not.toHaveProperty('scope')
  })
})

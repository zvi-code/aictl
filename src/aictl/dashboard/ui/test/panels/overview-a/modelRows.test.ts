import { describe, expect, it } from 'vitest'
import { MODEL_NOT_REPORTED, modelCoverage, usageRow } from '../../../src/panels/overview/agentRows'
import { overviewA } from '../../../src/panels/overview/a'
import { rowAction } from '../../../src/panels/kinds/model'

describe('The usage table by model, vendor or project', () => {
  const def = overviewA.find(panel => panel.id === 'byModel')!
  const navigated: unknown[] = []
  const ctx = { filters: () => ({ projects: [] as string[] }), navigate: (patch: unknown) => navigated.push(patch) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const action = (row: Record<string, unknown>) => rowAction(def as any, ctx as any, row)

  it('opens the board filtered to a model row or a project row, and never to a vendor or folded row', () => {
    action(usageRow('model', { key: 'claude-opus-5-5' }, { p95_ms: 900, agent_ids: ['a'] }))?.run()
    action(usageRow('project', { key: '/p/alpha' }))?.run()
    expect(navigated).toEqual([{ model: 'claude-opus-5-5' }, { project: ['/p/alpha'] }])
    expect(action(usageRow('vendor', { key: 'Anthropic', models: ['claude-opus-5-5'] }))).toBeUndefined()
    expect(action(usageRow('model', { key: null, other: 4 }))).toBeUndefined()
    expect(action(usageRow('model', { key: '' }))).toBeUndefined()
  })

  it('names each row and carries a model row its reply time', () => {
    expect(usageRow('model', { key: 'gpt-6.1-sol' }, { p95_ms: 1200 })).toMatchObject({ name: 'gpt-6.1-sol', p95_ms: 1200 })
    expect(usageRow('model', { key: '' }).name).toBe(MODEL_NOT_REPORTED)
    expect(usageRow('project', { key: null, other: 3 })).toMatchObject({ name: 'Other (3)', p95_ms: null })
    expect(usageRow('vendor', { key: 'Other', models: ['unknown'] })).toMatchObject({
      name: 'Other vendor (unknown)', models_text: 'unknown' })
  })

  it('shows requests, cache, cost, its share, reply time and failures from the usage section', () => {
    const paths = def.columns.map(column => column.path)
    expect(paths).toEqual(expect.arrayContaining(['name', 'requests', 'input', 'cache_read', 'cached_share', 'output',
      'cost_usd', 'cost_share', 'cost_per_request', 'p95_ms', 'error_share']))
    expect(def.sources.map(source => 'field' in source && source.field)).toContain('usage_by')
  })
})

describe('Usage by model', () => {
  it('says how many listed agents the model rows cover and why the rest are not in them', () => {
    const agents = [{ id: 'a', models: ['opus'] }, { id: 'b', models: ['opus', 'sonnet'] }, { id: 'c', models: [] }]
    const coverage = modelCoverage(agents, [{ model: 'opus', agent_ids: ['a'] }])
    expect(coverage).toMatchObject({ listed: 3, inRows: 1, none: 1, several: 1 })
    expect(coverage.text).toBe('1 of 3 listed agents are in a model row · 1 recorded no model usage in the selected time'
      + ' · 1 used more than one model: their usage per model is not reported')
  })

  it('offers no filter for a model the source did not report', () => {
    const def = { actions: [{ kind: 'filter', field: 'model', filter: 'model', label: 'Toggle model filter' }] }
    const ctx = { filters: () => ({}), navigate: () => undefined }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const action = (row: Record<string, unknown>) => rowAction(def as any, ctx as any, row)
    expect(action({ model: MODEL_NOT_REPORTED, model_reported: false })).toBeUndefined()
    expect(action({ model: 'opus' })?.label).toBe('Toggle model filter')
  })
})

import { describe, expect, it } from 'vitest'
import { MODEL_NOT_REPORTED, modelCoverage } from '../../../src/panels/overview/agentRows'
import { rowAction } from '../../../src/panels/kinds/model'

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

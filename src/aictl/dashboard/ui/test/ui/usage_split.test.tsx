// @vitest-environment jsdom
import { flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import { overviewA } from '../../src/panels/overview/a'
import { cacheOptions } from '../../src/panels/overview/cacheOptions'
import { costOptions, messagesOptions, tokenOptions } from '../../src/panels/overview/usageOptions'
import { splitLabel, usageSplits } from '../../src/panels/overview/usageSplit'
import type { FieldRef, PanelProps, Read } from '../../src/panels/types'
import { installDom, mount } from './dom'

const split = {
  model: {
    tokens: [{ key: 'claude-opus-5-5', values: [10, 20] }, { key: 'gpt-6.1-sol', values: [5, 0] }],
    cached_share: [{ key: 'claude-opus-5-5', values: [0.9, null] }],
    cost: [{ key: 'claude-opus-5-5', values: [1, 2] }, { key: null, other: 3, members: ['a', 'b', 'c'], values: [0.5, null] }],
    requests: [{ key: 'claude-opus-5-5', values: [1, 2] }],
  },
  vendor: {
    tokens: [{ key: 'Anthropic', models: ['claude-opus-5-5'], values: [10, 20] }, { key: 'Other', models: ['unknown'], values: [1, 0] }],
    cached_share: [], cost: [{ key: 'Anthropic', models: ['claude-opus-5-5'], values: [1, 2] }], requests: [],
  },
  project: { tokens: [{ key: '/p/alpha', values: [15, 20] }], cached_share: [], cost: [], requests: [] },
  tool: { tokens: [{ key: 'copilot-cli', values: [15, 20] }], cached_share: [], cost: [], requests: [] },
}
const kinds = { cache_read: [1, 2], input: [3, 4], cache_write: [0, 0], output: [5, 6] }

function panel(id: string) {
  const def = overviewA.find(entry => entry.id === id)!
  const own = id === 'tokens' ? kinds : id === 'cacheRate' ? [0.8, 0.7] : { user: [1, 1] }
  const reads = new Map<unknown, Read>(def.sources.map(source => [source,
    { state: 'ready', value: 'path' in source && source.path === 'split' ? split : own }]))
  const ctx = {
    read: (source: unknown) => reads.get(source) ?? { state: 'ready', value: undefined },
    board: (name: string) => name === 'tool_labels' ? { 'copilot-cli': 'Copilot CLI' } : undefined,
    metadata: () => undefined,
  } as unknown as PanelProps['ctx']
  return { ctx, def, params: {} } as PanelProps
}

type Setup = { read: () => Read; columns: () => readonly FieldRef[]; controls: unknown }
function open(options: (props: PanelProps) => Setup, id: string) {
  let setup!: Setup
  const view = mount(() => { setup = options(panel(id)); return setup.controls as never })
  const choices = () => Array.from(view.host.querySelectorAll('[role="radio"]'))
  const pick = (label: string) => { (choices().find(button => button.textContent === label) as HTMLElement).click(); flush() }
  return { setup, choices, pick, labels: () => setup.columns().map(column => column.label), dispose: view.dispose }
}

describe('The split of the usage panels', () => {
  beforeEach(installDom)

  it('lists Model, Vendor, Project, Tool in that order, Model chosen, on all four panels', () => {
    expect(usageSplits.map(([, label]) => label)).toEqual(['Model', 'Vendor', 'Project', 'Tool'])
    const panels = [[tokenOptions, 'tokens', ['Kind']], [cacheOptions, 'cacheRate', []], [costOptions, 'cost', []],
      [messagesOptions, 'messages', ['Role']]] as const
    for (const [options, id, extra] of panels) {
      const view = open(options as never, id)
      expect(view.choices().map(button => button.textContent), id).toEqual(['Model', 'Vendor', 'Project', 'Tool', ...extra])
      expect(view.choices().find(button => button.getAttribute('aria-checked') === 'true')?.textContent, id).toBe('Model')
      view.dispose()
    }
  })

  it('draws the server groups of the chosen split and names the folded ones', () => {
    const view = open(costOptions as never, 'cost')
    expect(view.labels()).toEqual(['claude-opus-5-5', 'Other (3)'])
    expect(view.setup.read().value).toEqual({ 0: [1, 2], 1: [0.5, null] })
    view.pick('Vendor')
    expect(view.labels()).toEqual(['Anthropic'])
    view.pick('Tool')
    expect(view.setup.read().state).toBe('ready')
    view.dispose()
  })

  it('keeps the token kinds as the last choice and the rate of all input before the groups', () => {
    const tokens = open(tokenOptions as never, 'tokens')
    tokens.pick('Kind')
    expect(tokens.labels()).toEqual(['Cache read', 'Input', 'Cache write', 'Output'])
    expect(tokens.setup.read().value).toEqual(kinds)
    tokens.pick('Tool')
    expect(tokens.labels()).toEqual(['Copilot CLI'])
    tokens.dispose()
    const cache = open(cacheOptions as never, 'cacheRate')
    expect(cache.labels()).toEqual(['All input', 'claude-opus-5-5'])
    expect(cache.setup.read().value).toEqual({ all: [0.8, 0.7], 0: [0.9, null] })
    cache.dispose()
  })

  it('names a vendor no rule knows by its models, and an empty model id', () => {
    expect(splitLabel('vendor', { key: 'Other', models: ['unknown', '', 'x', 'y'], values: [] }))
      .toBe('Other vendor (unknown, no model id, x and 1 more)')
    expect(splitLabel('model', { key: '', values: [] })).toBe('Model not reported')
    expect(splitLabel('project', { key: null, other: 2, values: [] })).toBe('Other (2)')
  })
})

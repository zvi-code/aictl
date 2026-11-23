// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { Rows } from '../../src/drawer/shared'
import { tableKey } from '../../src/ui/columnState'
import { headerTexts, installDom, layoutHeaders, mount } from './dom'

const rows = [{ path: '/a/b.md', size: 120, kind: 'file' }, { path: '/c.md', size: 40, kind: 'file' }]

beforeEach(() => { installDom(); layoutHeaders() })

describe('TBL-COL-30 · drawer lists use the shared table', () => {
  it('render the shared column controls, with no second set of grips', () => {
    const { host, dispose } = mount(() => <Rows label="Files" rows={rows} identity={['path']}
      columns={[['path', 'Path', 'path'], ['size', 'Size', 'bytes'], 'kind']} />)
    expect(headerTexts(host)).toEqual(['path', 'size', 'kind'])
    expect(host.querySelectorAll('th [role="separator"]').length).toBe(3)
    expect(host.querySelectorAll('button[data-columns]').length).toBe(1)
    dispose()
  })

  it('carry widths saved by the old drawer resize over to the new layout', () => {
    localStorage.setItem(`aictl.drawer.columns.v1:${JSON.stringify(['Files', ['path', 'size', 'kind'], true])}`, JSON.stringify([300, 80, 60, 90]))
    const { host, dispose } = mount(() => <Rows label="Files" rows={rows} identity={['path']} columns={['path', 'size', 'kind']}
      action={{ label: () => 'Open', run: () => {} }} />)
    const widths = Array.from(host.querySelectorAll<HTMLElement>('colgroup col')).map(col => [col.dataset.col, col.style.inlineSize])
    expect(widths).toEqual([['path', '300px'], ['size', '80px'], ['kind', '60px'], ['@actions', '90px']])
    expect(localStorage.getItem(tableKey('Files'))).toBeNull()
    dispose()
  })
})

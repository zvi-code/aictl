// @vitest-environment jsdom
import { createSignal, flush } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import { DroppedNotice, OlderButtons } from '../../src/drawer/FlowParts'
import { installDom, mount } from './dom'

beforeEach(() => { installDom() })

function paging(dropped = false) {
  const [isDropped, setDropped] = createSignal(dropped)
  const asked: Array<number | undefined> = []
  return {
    asked, setDropped, dropped: isDropped,
    more: () => true, complete: () => false, loading: () => false, unloaded: () => 0,
    loadOlder: (target?: number) => { asked.push(target); return Promise.resolve() },
  }
}

describe('FLOW-DROPPED · A dropped window is said, and no button does nothing', () => {
  it('offers the older-event buttons only while no window is dropped', () => {
    const pages = paging()
    const { host, dispose } = mount(() => <OlderButtons pages={pages} />)
    expect([...host.querySelectorAll('button')].map(b => b.textContent)).toEqual(['Load older', 'Load all'])
    host.querySelector('button')!.click()
    expect(pages.asked).toEqual([undefined])
    pages.setDropped(true)
    flush()
    expect(host.querySelectorAll('button')).toHaveLength(0)
    dispose()
  })

  it('shows a short notice with a Retry that calls the retry, and nothing when no window is dropped', () => {
    const pages = paging(true)
    let retried = 0
    const { host, dispose } = mount(() => <DroppedNotice dropped={pages.dropped} retry={() => { retried++; pages.setDropped(false) }} />)
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('The server read this flow again')
    host.querySelector('button')!.click()
    flush()
    expect(retried).toBe(1)
    expect(host.querySelector('[role="alert"]')).toBeNull()
    dispose()
  })
})

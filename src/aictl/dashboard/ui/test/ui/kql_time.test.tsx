// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createSignal, flush } from 'solid-js'
import { isoOf, secondsOf, TimeField } from '../../src/drawer/kqlTime'
import { installDom, mount } from './dom'

beforeEach(() => installDom())

describe('KQL-TIME · the KQL tab takes and shows date-times, and sends Unix seconds', () => {
  it('reads an ISO date-time as UTC, with or without a zone, and a plain count of seconds', () => {
    expect(secondsOf('2026-11-23T10:15:30Z')).toBe(1795428930)
    expect(secondsOf('2026-11-23 10:15:30')).toBe(1795428930)
    expect(secondsOf('2026-11-23')).toBe(1795392000)
    expect(secondsOf('2026-11-23T12:15:30+02:00')).toBe(1795428930)
    expect(secondsOf('1795428930')).toBe(1795428930)
    expect(secondsOf('1795428930.5')).toBe(1795428930.5)
    expect(secondsOf('yesterday')).toBeUndefined()
    expect(secondsOf('')).toBeUndefined()
  })

  it('shows seconds as an ISO date-time, and an unset bound as empty', () => {
    expect(isoOf('1795428930')).toBe('2026-11-23T10:15:30Z')
    expect(isoOf(1795428930.25)).toBe('2026-11-23T10:15:30.250Z')
    expect(isoOf('')).toBe('')
    expect(isoOf(undefined)).toBe('')
  })

  it('prefills the field with the date-time of the seconds it was given', () => {
    const { host, dispose } = mount(() => <TimeField label="Since (UTC)" seconds="1795428930" change={() => {}} />)
    expect(host.querySelector('input')!.value).toBe('2026-11-23T10:15:30Z')
    expect(host.textContent).toContain('Since (UTC)')
    dispose()
  })

  it('hands on seconds when a date-time or a raw number is typed, and shows the raw number as a date-time on leaving', () => {
    const changes: string[] = []
    const [seconds, setSeconds] = createSignal('')
    const { host, dispose } = mount(() => <TimeField label="Since (UTC)" seconds={seconds()} change={value => { changes.push(value); setSeconds(value) }} />)
    const input = host.querySelector('input')!
    const type = (value: string) => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); flush() }
    type('2026-11-23T10:15:30Z')
    expect(changes.at(-1)).toBe('1795428930')
    expect(input.getAttribute('aria-invalid')).toBeNull()
    type('1795428931')
    expect(changes.at(-1)).toBe('1795428931')
    input.dispatchEvent(new FocusEvent('blur'))
    flush()
    expect(input.value).toBe('2026-11-23T10:15:31Z')
    dispose()
  })

  it('marks text that is no time, sends nothing for it, and sends an empty bound when cleared', () => {
    const changes: string[] = []
    const { host, dispose } = mount(() => <TimeField label="Until (UTC)" seconds="1795428930" open="no end" change={value => changes.push(value)} />)
    const input = host.querySelector('input')!
    const type = (value: string) => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); flush() }
    type('next week')
    expect(changes).toEqual([])
    expect(input.getAttribute('aria-invalid')).toBe('true')
    type('')
    expect(changes).toEqual([''])
    expect(input.getAttribute('aria-invalid')).toBeNull()
    expect(input.placeholder).toBe('no end')
    dispose()
  })
})

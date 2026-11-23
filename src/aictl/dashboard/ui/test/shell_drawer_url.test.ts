import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { drawerStack } from '../src/drawer/navigation'
import { drawerPatch } from '../src/shell/viewState'
import { mergeSearch } from '../src/data/urlState'

// A fresh load of "/" opened the running session's Flow without writing ?agent= to the URL, so the
// address did not say what was on screen and a reload or a shared link showed something else.
describe('SHL-URL-10 · the URL is the one record of an open drawer', () => {
  const shell = readFileSync(join(__dirname, '../src/shell/Shell.tsx'), 'utf8')

  it('opens, changes and closes drawers only through the function that writes the URL', () => {
    const calls = [...shell.matchAll(/setStack\(([^\n]*)\)\n/g)].map(match => match[1])
    // showDrawers sets the stack and writes the URL; the other calls clear the drawers with the
    // drawer parameters, or read the stack back from the URL.
    expect(calls.sort()).toEqual([
      '[]', '[]', 'drawerStack(location.search, history.state)', 'entry ? [entry] : []', 'next',
    ])
    const writer = shell.match(/const showDrawers = [^\n]*\n {4}setStack\(next\)\n {4}go\(nextAddress\(drawerPatch\(next\.at\(-1\)\)\), replace, next\)/)
    expect(writer).not.toBeNull()
  })

  it('reads back the landing drawer from the address it writes', () => {
    const landing = { type: 'agent' as const, id: 'b9ab60d9-fc0b-43af-80d8-7f447a913e92', tab: 'flow' }
    const search = mergeSearch('', drawerPatch(landing))
    expect(new URLSearchParams(search).get('agent')).toBe(landing.id)
    expect(drawerStack(search, null)).toEqual([{ ...landing, initialPrompts: false, initialSkills: false }])
    expect(mergeSearch(search, drawerPatch(undefined))).toBe('')
  })
})

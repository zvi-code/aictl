import { render as renderSolid } from '@solidjs/web'
import { html } from 'htm/preact'
import { render as renderPreact } from 'preact'
import { expect, test } from 'vitest'
import { SolidSmoke } from '../src/SolidSmoke'

test('Solid TSX and Preact htm render in separate roots', () => {
  const host = document.createElement('main')
  const solidRoot = host.appendChild(document.createElement('div'))
  const preactIsland = host.appendChild(document.createElement('div'))
  const dispose = renderSolid(() => <SolidSmoke label="Solid" />, solidRoot)
  try {
    renderPreact(html`<span>Preact</span>`, preactIsland)
    expect(solidRoot.querySelector('span')?.textContent).toBe('Solid')
    expect(preactIsland.querySelector('span')?.textContent).toBe('Preact')
  } finally {
    renderPreact(null, preactIsland)
    dispose()
  }
})

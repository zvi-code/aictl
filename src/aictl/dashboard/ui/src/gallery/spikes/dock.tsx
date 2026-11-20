import { createEffect, createSignal, getOwner, onCleanup, runWithOwner } from 'solid-js'
import { render } from '@solidjs/web'
import type { IContentRenderer, SerializedDockview } from 'dockview-core'
import '../../design/tokens.css'
import { cpuLabel, createReplay, machineKey, spikeReady } from './replay'
import styles from './Spike.module.css'

// Version 8.9.0 ships the stylesheet in its browser bundle, not as a CSS file.
const { createDockview, themeLight } = (window as Window & {
  'dockview-core'?: typeof import('dockview-core')
})['dockview-core']!
const replay = createReplay(['runtime.machine'])
const root = document.querySelector<HTMLElement>('#spike')!
document.body.classList.add(styles.page)
replay.observe(root)

const screen = 'dockview-spike'
const storageKey = `aictl.${screen}`
type Layout = { version: 1; screen: typeof screen; tree: SerializedDockview }
const panelId = (core: number) => `core-${core + 1}`
const panelTitle = (core: number) => `Core ${core + 1}`

function content(core: number, owner: ReturnType<typeof getOwner>): IContentRenderer {
  const element = document.createElement('div')
  let dispose: (() => void) | undefined
  const hide = () => { dispose?.(); dispose = undefined }
  return {
    element,
    init() {},
    onShow() {
      dispose ??= runWithOwner(owner, () => render(() =>
        <section class={styles.dockContent} tabindex={0} aria-label={`${panelTitle(core)} CPU`}>
          <h2>{panelTitle(core)}</h2>
          <p>CPU: <span data-live-key={machineKey}>{cpuLabel(replay.values[machineKey]?.cpu_per_core?.[core])}</span></p>
        </section>, element))
    },
    onHide: hide,
    dispose: hide,
  }
}

function Dock() {
  const owner = getOwner()
  const [host, setHost] = createSignal<HTMLElement>()
  const [status, setStatus] = createSignal('Default layout')
  const [commands, setCommands] = createSignal<{ save: () => void; restore: () => void; reset: () => void }>()
  createEffect(host, element => {
    if (!element) return
    const api = createDockview(element, {
      theme: themeLight,
      defaultRenderer: 'onlyWhenVisible',
      createComponent: ({ id }) => content(Number(id.slice('core-'.length)) - 1, owner),
    })
    for (let group = 0; group < 6; group++) {
      const first = group * 5
      api.addPanel({
        id: panelId(first), title: panelTitle(first), component: 'cpu',
        ...(group > 0 && { position: group < 3
          ? { referencePanel: panelId(first - 5), direction: 'right' }
          : { referencePanel: panelId(first - 15), direction: 'below' } }),
      })
      for (let core = first + 1; core < first + 5; core++) {
        api.addPanel({
          id: panelId(core), title: panelTitle(core), component: 'cpu', inactive: true,
          position: { referencePanel: panelId(first), direction: 'within' },
        })
      }
    }
    api.getPanel(panelId(0))?.api.setActive()
    const defaultTree = api.toJSON()
    setCommands({
      save() {
        const layout: Layout = { version: 1, screen, tree: api.toJSON() }
        localStorage.setItem(storageKey, JSON.stringify(layout))
        setStatus('Layout saved')
      },
      restore() {
        const raw = localStorage.getItem(storageKey)
        if (!raw) { setStatus('No saved layout'); return }
        try {
          const layout = JSON.parse(raw) as Layout
          if (layout.version !== 1 || layout.screen !== screen) throw new Error('Unsupported layout')
          api.fromJSON(layout.tree)
          setStatus('Layout restored')
        } catch {
          setStatus('Could not restore the layout')
        }
      },
      reset() {
        api.fromJSON(defaultTree)
        setStatus('Default layout')
      },
    })
    return () => api.dispose()
  })
  createEffect(replay.roster, roster => { if (roster) spikeReady(root) })
  return <>
    <header class={styles.toolbar}>
      <h1>Dockview replay spike</h1>
      <a href="/gallery.html">Primitive gallery</a>
      <button class={styles.button} type="button" onClick={() => commands()?.save()}>Save layout</button>
      <button class={styles.button} type="button" onClick={() => commands()?.reset()}>Reset layout</button>
      <button class={styles.button} type="button" onClick={() => commands()?.restore()}>Restore layout</button>
      <span role="status">{status()}</span>
    </header>
    <main ref={setHost} class={styles.dock} aria-label="CPU panels" />
  </>
}

const dispose = render(() => { onCleanup(() => replay.close()); return <Dock /> }, root)
window.addEventListener('pagehide', dispose, { once: true })

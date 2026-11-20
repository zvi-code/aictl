import { createEffect, createSignal, For, Show } from 'solid-js'
import { render } from '@solidjs/web'
import '../../design/tokens.css'
import { Panel } from '../../ui/Panel'
import { cpuLabel, createReplay, machineKey, measureInput, spikeReady } from './replay'
import { ReplayTable } from './table'
import styles from './Spike.module.css'

const replay = createReplay(['runtime.agent', 'runtime.process', 'runtime.machine'])
const count = new URLSearchParams(location.search).get('rows') === '500' ? 500 : 5000
const cores = Array.from({ length: 18 }, (_, index) => index)
const root = document.querySelector<HTMLElement>('#spike')!
document.body.classList.add(styles.page)
replay.observe(root)

function Board() {
  const [showNotes, setShowNotes] = createSignal(false)
  createEffect(replay.roster, roster => { if (roster) spikeReady(root) })
  return <>
    <header class={styles.toolbar}>
      <h1>Solid replay spike</h1>
      <a href="/gallery.html">Primitive gallery</a>
      <button class={styles.button} type="button" aria-pressed={showNotes() ? 'true' : 'false'} onClick={event => {
        setShowNotes(value => !value)
        measureInput(event)
      }}>Toggle board note</button>
      <span data-note>{showNotes() ? 'Busy recording' : 'Note hidden'}</span>
    </header>
    <div class={styles.tables}>
      <Panel title="Agents" observeViewport={false}>
        <Show when={replay.roster()}><ReplayTable replay={replay} topic="runtime.agent" size={count} label="Agents" /></Show>
      </Panel>
      <Panel title="Processes" observeViewport={false}>
        <Show when={replay.roster()}><ReplayTable replay={replay} topic="runtime.process" size={count} label="Processes" /></Show>
      </Panel>
    </div>
    <div class={styles.tiles}>
      <For each={cores}>{core =>
        <Panel title={`CPU core ${core}`} size="small" observeViewport={false}>
          <span data-live-key={machineKey}>{cpuLabel(replay.values[machineKey]?.cpu_per_core?.[core])}</span>
        </Panel>
      }</For>
    </div>
  </>
}

const dispose = render(() => <Board />, root)
window.addEventListener('pagehide', () => { dispose(); replay.close() }, { once: true })

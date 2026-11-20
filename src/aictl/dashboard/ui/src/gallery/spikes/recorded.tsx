import { createEffect, createSignal } from 'solid-js'
import { render } from '@solidjs/web'
import '../../design/tokens.css'
import { Chart } from '../../ui/Chart'
import type { ChartPoint } from '../../ui/chartData'
import { Panel } from '../../ui/Panel'
import { createReplay, machineKey, measureInput, spikeReady } from './replay'
import { ReplayTable } from './table'
import styles from './Spike.module.css'

const replay = createReplay(['runtime.process', 'runtime.machine'])
const root = document.querySelector<HTMLElement>('#spike')!
document.body.classList.add(styles.page)
replay.observe(root)
const series = [{ label: 'Core 0' }, { label: 'Core 1' }]
const range = [0, 100] as const

function RecordedGallery() {
  const [narrow, setNarrow] = createSignal(false)
  const [points, setPoints] = createSignal<ChartPoint[]>([])
  createEffect(() => {
    const data = replay.values[machineKey]
    return data?.generated_at == null || !data.cpu_per_core
      ? undefined
      : { x: data.generated_at, values: data.cpu_per_core.slice(0, series.length) }
  }, point => {
    if (point) setPoints(previous => [...previous.slice(-119), point])
  })
  createEffect(replay.roster, roster => { if (roster) spikeReady(root) })
  return <>
    <header class={styles.toolbar}>
      <h1>Gallery live chart and table</h1>
      <a href="/gallery.html">Primitive gallery</a>
      <button class={styles.button} type="button" onClick={event => { setNarrow(value => !value); measureInput(event) }}>Resize chart</button>
      <span data-live-key={machineKey}>CPU samples: {points().length}</span>
    </header>
    <main>
      <div class={narrow() ? styles.narrow : styles.plot}>
        <Panel title="Host CPU" observeViewport={false}>
          <Chart label="Recorded CPU" description="Busy recording, in percent" series={series}
            points={points()} xAxis="time" unit="%" yRange={range} />
        </Panel>
      </div>
      <Panel title="Processes" observeViewport={false}>
        <ReplayTable replay={replay} topic="runtime.process" label="Processes" />
      </Panel>
    </main>
  </>
}

const dispose = render(() => <RecordedGallery />, root)
window.addEventListener('pagehide', () => { dispose(); replay.close() }, { once: true })

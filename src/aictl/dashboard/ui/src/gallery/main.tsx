import { createMemo, createSignal, For, lazy, Show } from 'solid-js'
import { render, type JSX } from '@solidjs/web'
import { Activity, CircleAlert } from 'lucide'
import '../design/tokens.css'
import { AppShell } from '../ui/AppShell'
import { Chart } from '../ui/Chart'
import { CodeView } from '../ui/CodeView'
import { Dialog } from '../ui/Dialog'
import { Drawer } from '../ui/Drawer'
import { Icon } from '../ui/Icon'
import { Markdown } from '../ui/Markdown'
import { Menu } from '../ui/Menu'
import { Panel } from '../ui/Panel'
import { PanelState, type PanelStatus } from '../ui/PanelState'
import { Popover } from '../ui/Popover'
import { Segmented } from '../ui/Segmented'
import { Stat } from '../ui/Stat'
import { Table } from '../ui/Table'
import type { Field } from '../ui/tableModel'
import { Tabs } from '../ui/Tabs'
import { Tooltip } from '../ui/Tooltip'
import fixture from '../../test/fixtures/gallery/recording.json'
import layout from './layout.json'
import styles from './gallery.module.css'

function GallerySection(props: { name: string; children: JSX.Element }) {
  return <section class={styles.section} data-gallery={props.name} aria-labelledby={`gallery-${props.name}`}>
    <h2 id={`gallery-${props.name}`}>{props.name}</h2>
    <div class={styles.grid}>{props.children}</div>
  </section>
}

function State(props: { name: string; children: JSX.Element; wide?: boolean }) {
  return <div class={styles.state} data-state={props.name} data-wide={props.wide || undefined}>
    <h3 class={styles.stateName}>{props.name}</h3>
    {props.children}
  </div>
}

const statuses: readonly PanelStatus[] = ['loading', 'empty', 'error', 'unavailable', 'stale']
const windows = [{ id: 'quiet', label: 'Quiet window' }, { id: 'busy', label: 'Busy window' }] as const
const options = [...windows, { id: 'fleet', label: 'Fleet', disabled: true }]
const chartSeries = [{ label: 'Core 0' }, { label: 'Core 1' }]
const cpuRange = [0, 100] as const
const fields: Field<(typeof fixture.busy.agents)[number]>[] = [
  { id: 'tool', label: 'Tool', read: row => row.tool },
  { id: 'msgs.user', label: 'User messages', read: row => row.msgs?.user },
  { id: 'input', label: 'Input tokens', read: row => row.input },
  { id: 'output', label: 'Output tokens', read: row => row.output },
]
const tabs = [
  { ...windows[0], content: () => <Stat label="Agent rows in sample" value={fixture.quiet.agents.length} /> },
  { ...windows[1], content: () => <Stat label="Agent rows in sample" value={fixture.busy.agents.length} /> },
  { id: 'fleet', label: 'Fleet', disabled: true, content: () => <PanelState state="unavailable" /> },
]
const markdown = [
  '---', 'source: quiet recording', '---', '# Recorded values', '',
  '> This example uses a sample, not the full window.', '',
  '- [x] Show **recorded rows**', '  - Keep `tool` in the table', '- [ ] Show the full window', '',
  '| Window | Rows |', '| :--- | ---: |', `| Quiet | ${fixture.quiet.agents.length} |`,
  `| Busy | ${fixture.busy.agents.length} |`, '', '~~~json', fixture.quiet.excerpt[0].text, '~~~', '',
  'See [uPlot on GitHub](https://github.com/leeoniya/uPlot). Raw HTML stays text: <b>sample</b>.',
].join('\n')

function LoadingPanel() {
  let resolve!: (label: string) => void
  const pending = new Promise<string>(done => { resolve = done })
  const label = createMemo(() => pending)
  return <Panel title="First load" size="small" observeViewport={false}
    actions={<button type="button" class={styles.button} onClick={() => resolve('Recorded data is ready')}>Finish loading</button>}>
    <span>{label()}</span>
  </Panel>
}

function ErrorPanel() {
  let attempts = 0
  function Content() {
    if (attempts++ === 0) throw new Error('Gallery example: read failed')
    return <Stat label="Agent rows in sample" value={fixture.busy.agents.length} />
  }
  return <Panel title="Read failure" size="small" observeViewport={false}><Content /></Panel>
}

const registry = {
  'recorded-cpu': {
    title: 'Recorded CPU sample',
    kind: 'stat',
    sources: ['runtime.machine'],
    requiredCapabilities: ['runtime.machine'],
    module: lazy(() => import('./ExamplePanel')),
  },
}

function Seam(props: { capabilities: readonly string[] }) {
  return <For each={layout.tree.panels}>{placement => {
    const entry = registry[placement.id as keyof typeof registry]
    return <Show when={entry && entry.requiredCapabilities.every(capability => props.capabilities.includes(capability))}
      fallback={<PanelState state="unavailable" message="This layout panel requires machine data." />}>
      <Panel title={entry.title} size="small" observeViewport={false}><entry.module /></Panel>
    </Show>
  }}</For>
}

const initialTheme = new URLSearchParams(location.search).get('theme') === 'dark' ? 'dark' : 'light'
document.documentElement.dataset.theme = initialTheme

function Gallery() {
  const [theme, setTheme] = createSignal(initialTheme)
  const [window, setWindow] = createSignal('quiet')
  const [chartWindow, setChartWindow] = createSignal<'quiet' | 'busy'>('quiet')
  const [tab, setTab] = createSignal('quiet')
  const [restrictedTab, setRestrictedTab] = createSignal('quiet')
  const [drawer, setDrawer] = createSignal(false)
  const [dialog, setDialog] = createSignal(false)
  const [result, setResult] = createSignal('')
  const [selection, select] = createSignal('')
  const changeTheme = () => {
    const next = theme() === 'light' ? 'dark' : 'light'
    document.documentElement.dataset.theme = next
    setTheme(next)
  }
  const menuItems = [
    { id: 'quiet', label: 'Quiet window', onSelect: () => setResult('Selected quiet recording') },
    { id: 'busy', label: 'Busy window', onSelect: () => setResult('Selected busy recording') },
    { id: 'fleet', label: 'Fleet (unavailable)', disabled: true, onSelect: () => {} },
  ]
  return <AppShell title="aictl" actions={<button type="button" class={styles.button} aria-pressed={theme() === 'dark' ? 'true' : 'false'}
    onClick={changeTheme}>Dark theme</button>}
    navigation={<nav aria-label="Gallery"><a href="#primitives">Primitives</a></nav>}
    status="Phase 1 • Local component gallery">
    <div class={styles.gallery} id="primitives">
      <div class={styles.hero}>
        <p>Dashboard design system</p>
        <h1>Primitive gallery</h1>
        <p>Examples use small samples of the quiet and busy recordings.</p>
      </div>
      <GallerySection name="AppShell">
        <State name="default" wide><p>This page uses AppShell. Try the skip link, navigation, and theme control.</p></State>
      </GallerySection>
      <GallerySection name="Panel">
        <State name="ready"><Panel title="Agent activity" size="small" observeViewport={false}>
          <Stat label="Agent rows in sample" value={fixture.quiet.agents.length} />
        </Panel></State>
        <State name="loading"><LoadingPanel /></State>
        <State name="error"><ErrorPanel /></State>
        <State name="inactive"><Panel title="Inactive panel" size="small" active={false}>
          <p>Inactive content must not mount.</p>
        </Panel></State>
      </GallerySection>
      <GallerySection name="PanelState">
        <For each={statuses}>{state => <State name={state}>
          <Panel title={`Recorded activity: ${state}`} size="small" observeViewport={false}>
            <PanelState state={state}><Stat label="Agent rows in sample" value={fixture.quiet.agents.length} /></PanelState>
          </Panel>
        </State>}</For>
      </GallerySection>
      <GallerySection name="Stat">
        <State name="default"><Stat label="Input tokens" value={fixture.busy.agents[0].input} unit="tokens" /></State>
        <State name="positive"><Stat label="Recorded CPU samples" value={fixture.quiet.cpu.length} tone="positive" /></State>
        <State name="warning"><Stat label="Last sample, core 0" value={fixture.busy.cpu.at(-1)?.values[0]} unit="%" tone="warning" /></State>
        <State name="unavailable"><Stat label="Fleet total" /></State>
      </GallerySection>
      <GallerySection name="Table">
        <State name="default" wide>
          <Panel title="Busy window" observeViewport={false}>
            <Table label="Recorded agents" fields={fields} rows={fixture.busy.agents} rowId={row => row.key}
              action={{ label: row => `Inspect ${row.tool}`, run: row => select(`Selected ${row.tool} agent`) }} />
          </Panel>
          <p role="status">{selection()}</p>
        </State>
        <State name="empty"><Panel title="No matching agents" size="small" observeViewport={false}>
          <Table label="Matching agents" fields={fields} rows={[]} rowId={row => row.key} />
        </Panel></State>
      </GallerySection>
      <GallerySection name="Chart">
        <State name="default" wide>
          <Panel title="Host CPU samples" observeViewport={false}
            actions={<button type="button" class={styles.button}
              onClick={() => setChartWindow(current => current === 'quiet' ? 'busy' : 'quiet')}>Switch recording</button>}>
            <Chart label={`${chartWindow() === 'quiet' ? 'Quiet' : 'Busy'} window`}
              description="Recorded CPU utilization for cores 0 and 1, in percent."
              series={chartSeries} points={fixture[chartWindow()].cpu} xAxis="time" unit="%" yRange={cpuRange} />
          </Panel>
        </State>
        <State name="empty"><Panel title="No CPU samples" size="small" observeViewport={false}>
          <Chart label="Core CPU" description="No samples" series={chartSeries} points={[]} />
        </Panel></State>
      </GallerySection>
      <GallerySection name="Segmented">
        <State name="default"><Segmented label="Recording window" options={options} value={window()} onChange={setWindow} /></State>
        <State name="disabled"><Segmented label="Fixed window" options={windows} value="quiet" onChange={setWindow} disabled /></State>
      </GallerySection>
      <GallerySection name="Tabs">
        <State name="default" wide><Tabs label="Recording samples" items={tabs} value={tab()} onChange={setTab} /></State>
        <State name="disabled" wide><Tabs label="Unavailable fleet tabs" items={tabs} value={restrictedTab()} onChange={setRestrictedTab} /></State>
      </GallerySection>
      <GallerySection name="Menu">
        <State name="closed"><Menu label="Recording actions" items={menuItems} /></State>
        <State name="open"><Menu label="Choose recording" items={menuItems} /><p role="status">{result()}</p></State>
        <State name="disabled"><Menu label="Unavailable actions" items={menuItems} disabled /></State>
      </GallerySection>
      <GallerySection name="Popover">
        <State name="closed"><Popover label="More about the gallery" title="Gallery help"><p>Examples use recorded data.</p></Popover></State>
        <State name="open"><Popover label="Show recording details" title="Recording details">
          <p>Select Quiet or Busy to compare a sample of each capture.</p>
          <a href="#gallery-Chart">Go to the chart</a>
        </Popover></State>
        <State name="disabled"><Popover label="Unavailable details" title="Details" disabled><p>No details.</p></Popover></State>
      </GallerySection>
      <GallerySection name="Tooltip">
        <State name="closed"><Tooltip label="Recording sample" text="This chart uses recorded CPU values."
          onClick={() => setChartWindow('quiet')} /></State>
        <State name="open"><Tooltip label="Reset to quiet window" text="Hover or focus to show this hint. Escape dismisses it."
          onClick={() => setChartWindow('quiet')} /></State>
      </GallerySection>
      <GallerySection name="Drawer">
        <State name="closed"><p>The drawer does not block the rest of the page.</p></State>
        <State name="open">
          <button type="button" class={styles.button} aria-controls="sample-drawer" aria-expanded={drawer() ? 'true' : 'false'}
            onClick={() => setDrawer(!drawer())}>Open drawer</button>
          <Drawer id="sample-drawer" title="Recording excerpt" open={drawer()} onClose={() => setDrawer(false)}>
            <CodeView label="Busy recording excerpt" text={fixture.busy.excerpt.map(line => line.text).join('\n')}
              firstLine={fixture.busy.excerpt[0].n} wrap />
          </Drawer>
        </State>
      </GallerySection>
      <GallerySection name="Dialog">
        <State name="closed"><p>The dialog keeps focus inside while open.</p></State>
        <State name="open">
          <button type="button" class={styles.button} aria-haspopup="dialog" aria-controls="sample-dialog"
            onClick={() => setDialog(true)}>Open dialog</button>
          <Dialog id="sample-dialog" title="Confirm recording selection" open={dialog()} onClose={() => setDialog(false)}
            actions={<button type="button" class={styles.button} onClick={() => { setChartWindow('busy'); setDialog(false) }}>Use busy window</button>}>
            <p>Replace the chart sample with the busy window?</p>
          </Dialog>
        </State>
      </GallerySection>
      <GallerySection name="Icon">
        <State name="decorative"><span class={styles.inline}><Icon data={Activity} /> Recorded activity</span></State>
        <State name="labelled"><Icon data={CircleAlert} label="Attention required" /></State>
      </GallerySection>
      <GallerySection name="Markdown">
        <State name="default" wide><Markdown headingOffset={3} text={markdown} /></State>
        <State name="empty"><Markdown text="" /></State>
      </GallerySection>
      <GallerySection name="CodeView">
        <State name="default" wide><CodeView label="Quiet recording excerpt" language="Text"
          text={fixture.quiet.excerpt.map(line => line.text).join('\n')} copy /></State>
        <State name="highlighted" wide><CodeView label="Busy recording excerpt" language="Text"
          text={fixture.busy.excerpt.map(line => line.text).join('\n')}
          firstLine={fixture.busy.excerpt[0].n} highlight={[fixture.busy.excerpt[1].n]} wrap /></State>
        <State name="empty"><CodeView text="" copy /></State>
      </GallerySection>
      <GallerySection name="FutureSeam">
        <State name="enabled"><Seam capabilities={fixture.quiet.topics} /></State>
        <State name="unavailable"><Seam capabilities={[]} /></State>
      </GallerySection>
    </div>
  </AppShell>
}

if (import.meta.env.DEV) render(() => <Gallery />, document.getElementById('gallery')!)

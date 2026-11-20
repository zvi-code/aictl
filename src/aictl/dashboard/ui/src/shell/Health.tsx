import { createSignal, untrack } from 'solid-js'
import DockScreen from '../panels/DockScreen'
import type { PanelContext } from '../panels/types'
import { healthPanels } from '../panels/health'
import { healthData, HealthContext } from '../panels/health/healthData'
import styles from '../panels/health/Health.module.css'

export default function Health(props: { ctx: PanelContext; reset: () => number; order: (order: string[]) => void }) {
  const [all, setAll] = createSignal(false)
  const original = untrack(() => props.ctx)
  const health = untrack(() => healthData(original))
  const ctx: PanelContext = {
    ...original,
    jump: id => {
      if (id !== 'health-metrics') return original.jump(id)
      setAll(true)
      requestAnimationFrame(() => {
        const section = document.getElementById('sec-health-metrics')
        section?.scrollIntoView()
        section?.focus({ preventScroll: true })
      })
    },
  }
  return <HealthContext value={health}>
    <div data-screen="health" data-all-metrics={all() ? '' : undefined} class={styles.screen}>
      <header class={styles.heading}>
        <h1>aictl Health</h1>
        <label><input type="checkbox" checked={all()} aria-controls="sec-health-metrics"
          onChange={event => setAll(event.currentTarget.checked)} /> Show all metrics</label>
      </header>
      <DockScreen {...props} screen="health" definitions={healthPanels} ctx={ctx} />
    </div>
  </HealthContext>
}

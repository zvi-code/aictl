import DockScreen from '../panels/DockScreen'
import { overviewA } from '../panels/overview/a'
import { overviewB } from '../panels/overview/b'
import type { PanelContext } from '../panels/types'
import styles from './Shell.module.css'

const definitions = [...overviewA, ...overviewB]

export default function Overview(props: { ctx: PanelContext; order: (order: string[]) => void }) {
  return <div data-screen="board" class={styles.overview}>
    <DockScreen screen="board" definitions={definitions} heading={<h1>Overview</h1>} {...props} />
  </div>
}

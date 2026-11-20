import DockScreen from '../panels/DockScreen'
import { overviewA } from '../panels/overview/a'
import { overviewB } from '../panels/overview/b'
import type { PanelContext } from '../panels/types'

const definitions = [...overviewA, ...overviewB]

export default function Overview(props: { ctx: PanelContext; reset: () => number; order: (order: string[]) => void }) {
  return <div data-screen="board"><h1>Overview</h1><DockScreen screen="board" definitions={definitions} {...props} /></div>
}

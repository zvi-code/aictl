import type { ChartOptions, PanelProps } from '../types'
import type { VisualRowOptions } from './Rows'

export async function loadRows(options: Promise<(panel: PanelProps) => VisualRowOptions>) {
  const [{ default: Rows }, setup] = await Promise.all([import('./Rows'), options])
  return { default: (props: PanelProps) => <Rows {...props} setup={setup} /> }
}

export async function loadSeries(options: Promise<NonNullable<ChartOptions['setup']>>) {
  const [{ default: Series }, setup] = await Promise.all([import('./Series'), options])
  return { default: (props: PanelProps) => <Series {...props} setup={setup} /> }
}

import { createMemo, lazy, Loading } from 'solid-js'
import { Chart } from '../../ui/Chart'

type Props = Omit<Parameters<typeof Chart>[0], 'series'> & { seriesLabel?: string }

const Plot = lazy(() => import('uplot').then(({ default: UPlot }) => {
  const paths = UPlot.paths.bars!({ size: [0.65, 36] })
  return { default: (props: Props) => {
    const series = createMemo(() => [{ label: props.seriesLabel ?? props.label, paths }])
    return <Chart {...props} series={series()} />
  } }
}))

export function BarPlot(props: Props) {
  return <Loading fallback={null}><Plot {...props} /></Loading>
}

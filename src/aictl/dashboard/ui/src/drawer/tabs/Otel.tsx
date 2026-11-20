import { OtelSections } from '../OtelSections'
import { Resource, type TabProps } from '../shared'

export default function Otel(props: TabProps) {
  return <Resource read={props.detail}>{data => <OtelSections data={data} />}</Resource>
}

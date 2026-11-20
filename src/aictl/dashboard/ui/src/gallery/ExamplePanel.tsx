import { Stat } from '../ui/Stat'
import fixture from '../../test/fixtures/gallery/recording.json'

export default function ExamplePanel() {
  return <Stat label="Recorded CPU samples" value={fixture.quiet.cpu.length} detail="Quiet window, runtime.machine" />
}

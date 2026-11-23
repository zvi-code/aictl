import { createBoxes, HiddenBoxes } from '../../ui/Box'
import { MemoryChanges } from '../MemoryViews'
import { Resource, Rows, Section, Stats, type TabProps } from '../shared'

export default function Changes(props: TabProps) {
  const boxes = createBoxes('aictl-pref-changes-boxes')
  return <Resource read={props.detail}>{data => {
    const lines = (key: 'lines_added' | 'lines_removed') => {
      const files = data().files
      return files?.some(row => row[key] != null) ? files.reduce((total, row) => total + (row[key] ?? 0), 0) : undefined
    }
    return <>
    <HiddenBoxes boxes={boxes} />
    <Section title="Files changed">
      <Stats items={[{ label: 'Files', value: data().files?.length }, { label: 'Tests', value: data().tests?.length },
        { label: 'Recorded added lines', value: lines('lines_added') }, { label: 'Recorded removed lines', value: lines('lines_removed') }]} />
      <Rows label="Changed files" rows={data().files} identity={['path']}
        columns={[['path', 'Path', 'path'], 'lines_added', 'lines_removed', 'edits']} actionColumn="path"
        action={{ label: row => `Open ${row.path}`, run: row => props.shell.open({ type: 'file', path: row.path, record: props.entry.id }) }} />
    </Section>
    <MemoryChanges tab={props} boxes={boxes} rows={data().memory_changes} />
    <Section title="Test runs"><Rows label="Test runs" rows={data().tests} identity={['ts', 'command']}
      columns={[[ 'ts', 'Time', 'time' ], 'command', 'passed', ['duration_ms', 'Duration (ms)', 'number']]} /></Section>
    </>
  }}</Resource>
}

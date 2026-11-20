import { createSignal, For, Show } from 'solid-js'
import { stamp } from '../../design/format'
import { Resource, records, Rows, Section, Stats, text, type TabProps } from '../shared'
import styles from '../drawer.module.css'

function safeLink(value: unknown) {
  try { const url = new URL(String(value)); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined }
  catch { return undefined }
}

export default function Commits(props: TabProps) {
  const [sha, pick] = createSignal<unknown>()
  return <Resource read={props.detail}>{data => {
    const selected = () => data().commits?.find(row => row.sha === sha())
    return <Section title="Commits">
      <Stats items={[{ label: 'Commits', value: data().commits?.length }, { label: 'Branch', value: data().git?.branch },
        { label: 'Pull requests', value: data().commits?.reduce((count, row) => count + (records(row.prs)?.length ?? 0), 0) }]} />
      <Rows label="Commits" rows={data().commits} identity={['sha']}
        columns={[[ 'ts', 'Time', 'time' ], ['short_sha', 'Commit'], 'subject', 'author_name', 'branch']}
        action={{ label: row => `Inspect commit ${row.short_sha ?? row.sha}`, run: row => pick(row.sha) }} />
      <Show when={selected()}>{row => <Section title={text(row().subject) ?? 'Commit detail'}>
        <p>{text(row().sha)} · {typeof row().ts === 'number' && stamp(Number(row().ts), true)}</p>
        <div class={styles.bar}><For each={records(row().prs)}>{pr => <Show when={safeLink(pr.url)}>{href =>
          <a class={styles.button} href={href()} target="_blank" rel="noopener noreferrer">#{text(pr.number) ?? String(pr.number)} {text(pr.title)} · {text(pr.state)}</a>
        }</Show>}</For></div>
      </Section>}</Show>
      <Show when={data().prs_note}><p class={styles.muted}>{data().prs_note}</p></Show>
    </Section>
  }}</Resource>
}

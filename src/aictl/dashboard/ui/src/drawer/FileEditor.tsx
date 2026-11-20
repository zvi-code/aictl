import { createEffect, createMemo, createSignal, Show, untrack } from 'solid-js'
import type { DetailSettingsFile } from '../data/contract.gen'
import type { PanelContext } from '../panels/types'
import { PanelState } from '../ui/PanelState'
import { path, Resource } from './shared'
import styles from './drawer.module.css'

export default function FileEditor(props: { path: string; ctx: PanelContext; close: () => void; saved: () => void }) {
  const ctx = untrack(() => props.ctx)
  const read = ctx.detail<DetailSettingsFile>(createMemo(() => path(ctx, '/api/settings/file', { path: props.path })))
  const [draft, setDraft] = createSignal('')
  const [original, setOriginal] = createSignal<DetailSettingsFile>()
  const [pending, setPending] = createSignal(false)
  const [error, setError] = createSignal<{ message: string; conflict: boolean }>()
  const [backup, setBackup] = createSignal('')
  const dirty = () => original() != null && draft() !== original()?.text
  createEffect(() => read()?.data, value => {
    if (value) { setOriginal(value); setDraft(value.text); setError(undefined) }
  })
  const save = async () => {
    const file = original()
    if (!file || !dirty() || pending() || props.ctx.scope() !== 'local') return
    setPending(true); setError(undefined); setBackup('')
    try {
      const response = await fetch('/api/settings/file', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: props.path, text: draft(), expected_mtime: file.mtime }),
      })
      const result = await response.json() as DetailSettingsFile & { backup_path?: string; error?: string }
      if (!response.ok) {
        setError({ message: result.error ?? `HTTP ${response.status}: Save failed.`, conflict: response.status === 409 }); return
      }
      setOriginal(result); setDraft(result.text); setBackup(result.backup_path ?? ''); props.saved()
    } catch (reason) {
      setError({ message: String(reason), conflict: false })
    } finally { setPending(false) }
  }
  return <div class={styles.stack}>
    <Resource read={read}>{() => <>
      <Show when={original()?.masked}><p class={styles.muted}>Secrets are masked. Unchanged lines keep their stored values.</p></Show>
      <label class={styles.field}>File text<textarea class={styles.code} spellcheck={false} aria-label="File text" value={draft()}
        disabled={pending()} onInput={event => { setDraft(event.currentTarget.value); setBackup('') }} /></label>
      <Show when={error()}>{failure => <PanelState state="error" message={failure().message}
        onRetry={failure().conflict ? read.retry : undefined} />}</Show>
      <Show when={backup()}><div role="status">Saved. Backup: {backup()}</div></Show>
      <div class={styles.bar}>
        <button type="button" class={styles.button} disabled={!dirty() || pending() || read()?.status === 'refreshing'}
          onClick={() => void save()}>{pending() ? 'Saving…' : 'Save'}</button>
        <Show when={error()?.conflict}><button type="button" class={styles.button} onClick={() => read.retry()}>Reload</button></Show>
        <button type="button" class={styles.button} disabled={pending()} onClick={() => props.close()}>{dirty() ? 'Discard changes' : 'Close editor'}</button>
      </div>
    </>}</Resource>
    <Show when={!original()}><button type="button" class={styles.button} onClick={() => props.close()}>Close editor</button></Show>
  </div>
}

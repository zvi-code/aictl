import { createEffect, createSignal, For, Show, untrack } from 'solid-js'
import type { DetailToolConfig, SettingsPermissionWrite } from '../data/contract.gen'
import type { PanelContext } from '../panels/types'
import { CodeView } from '../ui/CodeView'
import { Dialog } from '../ui/Dialog'
import { PanelState } from '../ui/PanelState'
import { Stat } from '../ui/Stat'
import { Table } from '../ui/Table'
import { title } from './model'
import { listDiff, parseLines } from './permissions'
import styles from './Settings.module.css'

const buckets = ['allow', 'ask', 'deny'] as const
type Bucket = typeof buckets[number]
type Draft = Record<Bucket, string>
const blank: Draft = { allow: '', ask: '', deny: '' }

export function PermissionEditor(props: {
  ctx: PanelContext; tool: string; scope: string; label: string; onClose: () => void
  choices?: { id: string; label: string }[]
}) {
  const [scope, setScope] = createSignal(untrack(() => props.scope))
  const label = () => props.choices?.find(choice => choice.id === scope())?.label ?? props.label
  const path = () => `/api/tool-config/${encodeURIComponent(props.tool)}`
  const detailPath = () => `${path()}?${new URLSearchParams({ scope: scope() })}`
  const config = untrack(() => props.ctx.detail<DetailToolConfig>(detailPath))
  const [base, setBase] = createSignal<DetailToolConfig>()
  const [draft, setDraft] = createSignal<Draft>(blank)
  const [saving, setSaving] = createSignal(false)
  const [conflict, setConflict] = createSignal(false)
  const [error, setError] = createSignal('')
  const [saved, setSaved] = createSignal<DetailToolConfig>()
  const [preview, setPreview] = createSignal(false)
  const [reloadPending, setReloadPending] = createSignal(false)
  const apply = (value: DetailToolConfig) => {
    setBase(value)
    setDraft({ allow: (value.permissions?.allow ?? []).join('\n'), ask: (value.permissions?.ask ?? []).join('\n'),
      deny: (value.permissions?.deny ?? []).join('\n') })
  }
  createEffect(() => config()?.data, value => {
    if (value && value.scope === scope() && value.tool === props.tool && (!base() || reloadPending() || base()?.scope !== scope())) {
      apply(value)
      setConflict(false)
      setReloadPending(false)
    }
  })
  createEffect(() => config()?.status, status => {
    if (reloadPending() && (status === 'error' || status === 'stale')) {
      setReloadPending(false)
      setError('Could not reload permissions. Try again.')
    }
  })
  const permissions = () => ({ allow: parseLines(draft().allow), ask: parseLines(draft().ask), deny: parseLines(draft().deny) })
  const diff = (bucket: Bucket) => listDiff(base()?.permissions?.[bucket] ?? [], permissions()[bucket])
  const changed = () => buckets.some(bucket => JSON.stringify(base()?.permissions?.[bucket] ?? []) !== JSON.stringify(permissions()[bucket]))
  const editable = () => buckets.every(bucket => base()?.editable_fields?.includes(`permissions.${bucket}`))
    && (base()?.mtime != null || base()?.exists === false)
  let running: AbortController | undefined
  createEffect(() => true, () => () => running?.abort())
  const reload = () => {
    setError('')
    setReloadPending(true)
    config.retry()
  }
  const save = async () => {
    if (!editable() || saving() || conflict() || !changed()) return
    const body: SettingsPermissionWrite = { scope: scope(), expected_mtime: base()?.mtime ?? null, permissions: permissions() }
    const controller = new AbortController()
    running = controller
    setSaving(true)
    setError('')
    setSaved(undefined)
    try {
      const response = await fetch(path(), { method: 'PUT', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!response.ok) {
        setConflict(response.status === 409)
        const detail: { error?: string } = await response.json().catch(() => ({}))
        throw new Error(detail.error || `Could not save permissions (HTTP ${response.status}).`)
      }
      const data: DetailToolConfig = await response.json()
      controller.signal.throwIfAborted()
      apply(data)
      setSaved(data)
      props.ctx.refresh()
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      if (!controller.signal.aborted) setSaving(false)
    }
  }
  return <Dialog title="Edit permissions" open onClose={props.onClose} blockClose={saving()} actions={
    <button class={styles.button} type="button" disabled={!editable() || !changed() || saving() || conflict() || reloadPending()}
      onClick={() => void save()}>{saving() ? 'Saving…' : 'Save permissions'}</button>
  }>
    <div class={styles.stack}>
      <Show when={(props.choices?.length ?? 0) > 1}>
        <label class={styles.control}>Scope to edit
          <select value={scope()} disabled={saving()} onChange={event => {
            setScope(event.currentTarget.value)
            setSaved(undefined)
            setError('')
          }}>
            <For each={props.choices}>{choice => <option value={choice.id}>{choice.label}</option>}</For>
          </select>
        </label>
      </Show>
      <Show when={base()?.scope === scope() && base()} fallback={
        <PanelState inline state={config()?.status === 'error' ? 'error' : config()?.status === 'ready' ? 'unavailable' : 'loading'}
          message={config()?.status === 'error' ? String(config()?.error) : undefined}
          onRetry={config()?.status === 'error' ? config.retry : undefined} />}>{value => <>
        <p><strong>{label()}</strong> · <code>{value().path}</code></p>
        <Show when={!editable()}><PanelState inline state="unavailable" message="This scope did not report editable permissions." /></Show>
        <div class={styles.metrics}>
          <For each={buckets}>{bucket =>
            <label class={styles.control}>{title(bucket)}
              <textarea rows={4} value={draft()[bucket]} disabled={!editable() || saving() || reloadPending()}
                onInput={event => {
                  const text = event.currentTarget.value
                  setDraft(old => ({ ...old, [bucket]: text }))
                  setSaved(undefined)
                }} />
            </label>}
          </For>
        </div>
        <div class={styles.stats}>
          <Stat label="Rules added" value={buckets.reduce((n, bucket) => n + diff(bucket).added.length, 0)} />
          <Stat label="Rules removed" value={buckets.reduce((n, bucket) => n + diff(bucket).removed.length, 0)} />
        </div>
        <Show when={changed()}>
          <details><summary>Rule changes</summary>
            <Table label="Permission rule changes" rows={buckets.flatMap(bucket => [
              ...diff(bucket).added.map(rule => ({ bucket, rule, change: 'Added' })),
              ...diff(bucket).removed.map(rule => ({ bucket, rule, change: 'Removed' })),
            ])} rowId={row => `${row.bucket}\u0001${row.change}\u0001${row.rule}`}
              fields={[{ id: 'list', label: 'List', read: row => title(row.bucket) },
                { id: 'change', label: 'Change', read: row => row.change },
                { id: 'rule', label: 'Rule', read: row => row.rule }]} />
          </details>
        </Show>
        <details onToggle={event => setPreview(event.currentTarget.open)}><summary>JSON preview</summary>
          <Show when={preview()}>
            <CodeView label="Permissions JSON preview" language="JSON" wrap
              text={JSON.stringify({ ...value().raw, permissions: { ...value().permissions, ...permissions() } }, null, 2)} />
          </Show>
        </details>
      </>}</Show>
      <Show when={saving()}><PanelState inline state="loading" message="Saving permissions…" /></Show>
      <Show when={error()}>{message => <PanelState inline state="error" message={message()} />}</Show>
      <Show when={conflict()}><button type="button" disabled={reloadPending()} onClick={reload}>
        {reloadPending() ? 'Reloading…' : 'Reload file'}
      </button></Show>
      <Show when={saved()}>{value => <p role="status">Saved permissions.
        <Show when={value().backup_path}>{backup => <> Backup: <code>{backup()}</code></>}</Show>
      </p>}</Show>
    </div>
  </Dialog>
}

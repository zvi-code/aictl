import { Show, untrack } from 'solid-js'
import type { TopicConfigurationFile } from '../data/contract.gen'
import type { PanelContext } from '../panels/types'
import SettingsWorkspace from '../settings/SettingsWorkspace'
import { PanelState } from '../ui/PanelState'

export default function Settings(props: { ctx: PanelContext }) {
  const ctx = untrack(() => props.ctx)
  const status = () => ctx.read({ topic: 'configuration.file', entity: 'current' })
  const pending = () => {
    const state = status().state
    return state === 'ready' || state === 'empty' ? 'unavailable' : state
  }
  const config = () => ctx.scope() === 'local' ? status().value as TopicConfigurationFile | undefined : undefined
  return <>
    <h1>Settings</h1>
    <Show when={ctx.scope() === 'local'} fallback={<PanelState state="unavailable"
      message="Tool configuration files and policy findings are not reported for this scope." />}>
      <Show when={config()} fallback={<PanelState state={pending()} message={status().message}
        onRetry={status().state === 'error' ? ctx.refresh : undefined} />}>{data => <>
        <Show when={status().state === 'stale'}>
          <PanelState inline state="stale" message={status().message} onRetry={ctx.refresh} />
        </Show>
        <SettingsWorkspace ctx={ctx} config={data()} />
      </>}</Show>
    </Show>
  </>
}

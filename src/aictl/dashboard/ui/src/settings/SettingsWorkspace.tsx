import { createEffect, Match, Show, Switch, untrack } from 'solid-js'
import type { TopicConfigurationFile } from '../data/contract.gen'
import type { PanelContext } from '../panels/types'
import { PanelState } from '../ui/PanelState'
import { Segmented } from '../ui/Segmented'
import { Stat } from '../ui/Stat'
import { RuntimeConfiguration } from './Evidence'
import { Inspector } from './Inspector'
import { FilesView, FindingsView } from './InventoryViews'
import { PIVOTS, type Pivot } from './model'
import { ToolView, TopicView } from './ToolViews'
import { workspaceState } from './workspaceState'
import styles from './Settings.module.css'

export default function SettingsWorkspace(props: { ctx: PanelContext; config: TopicConfigurationFile }) {
  const config = () => props.config
  const w = untrack(() => workspaceState(props.ctx, config))
  let search: HTMLInputElement | undefined
  createEffect(() => true, () => {
    const shortcuts = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && w.inspector() && !document.querySelector('dialog[open]')) w.close()
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]')) return
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.matches('input, textarea, select'))) return
      event.preventDefault()
      search?.focus()
    }
    window.addEventListener('keydown', shortcuts)
    return () => window.removeEventListener('keydown', shortcuts)
  })

  return <div class={`${styles.workspace} ${styles.stack}`} role="region" aria-label="Settings workspace">
    <div class={styles.stats} role="group" aria-label="Settings totals">
      <Stat label="Tools" value={w.entries().length} />
      <Stat label="Files" value={w.files().length} detail={w.fileDetail()?.data ? undefined : 'Known sources'} />
      <Stat label="Settings" value={w.totals().set} />
      <Stat label="Agents" value={w.totals().agents} />
      <Stat label="Unset" value={w.totals().knowsSet ? w.totals().unset : undefined} />
      <Stat label="Risky" value={w.totals().risky} tone={w.totals().risky ? 'warning' : 'neutral'} />
      <Stat label="Findings" value={w.findings()?.length} />
    </div>
    <div class={styles.controls}>
      <Segmented label="Settings view" options={PIVOTS} value={w.state().view}
        onChange={view => w.change({ view: view as Pivot })} />
      <label class={styles.search}>
        <span class={styles.visuallyHidden}>Find a setting, value, key or file</span>
        <input ref={search} type="search" value={w.query()} placeholder="Find a setting, value, key or file"
          onInput={event => w.setQuery(event.currentTarget.value)} />
        <kbd aria-hidden="true">/</kbd>
      </label>
      <button type="button" aria-pressed={w.nonDefault() ? 'true' : 'false'} onClick={() => w.setNonDefault(value => !value)}>Only non-default</button>
      <button type="button" aria-pressed={w.risky() ? 'true' : 'false'} onClick={() => w.setRisky(value => !value)}>Only risky</button>
      <button type="button" aria-pressed={w.state().unset ? 'true' : 'false'} disabled={!w.totals().knowsSet}
        onClick={() => w.change({ unset: !w.state().unset })}>Show unset knobs</button>
      <Show when={w.state().row && !w.inspector()}>
        <button type="button" aria-controls="settings-inspector" onClick={w.showInspector}>Open inspector</button>
      </Show>
    </div>
    <Show when={w.toolDetails()?.status === 'error'}>
      <PanelState inline state="unavailable" message="Local settings details are not available from this source." onRetry={w.toolDetails.retry} />
    </Show>
    <Show when={w.toolDetails()?.status === 'stale'}>
      <PanelState inline state="stale" message="Showing earlier local settings details." onRetry={w.toolDetails.retry} />
    </Show>
    <div class={styles.panel}>
      <Switch>
        <Match when={w.state().view === 'tool'}><ToolView w={w} /></Match>
        <Match when={w.state().view === 'topic'}><TopicView w={w} /></Match>
        <Match when={w.state().view === 'files'}><FilesView w={w} /></Match>
        <Match when={w.state().view === 'findings'}><FindingsView w={w} /></Match>
      </Switch>
    </div>
    <RuntimeConfiguration w={w} />
    <Inspector w={w} />
  </div>
}

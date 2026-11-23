import { createSignal, Match, Show, Switch, untrack } from 'solid-js'
import type { JSX } from '@solidjs/web'
import type { DetailFile } from '../data/contract.gen'
import { CodeView } from '../ui/CodeView'
import { Drawer } from '../ui/Drawer'
import { PanelState } from '../ui/PanelState'
import { Stat } from '../ui/Stat'
import { Table } from '../ui/Table'
import {
  agentInherits, agentTools, basename, DAEMON_ENV, fileCounts, envName, findingTools, isFileSource, isLockedEntry, MISSING, pinWins, plainValue,
  purposeLabel, rowState, rowValue, samePath, scopeLabel, title, type ConfigFile, type Environment, type Finding, type Setting,
} from './model'
import { permissionEdit } from './permissions'
import { PermissionEditor } from './PermissionEditor'
import { environmentValue } from './ToolViews'
import type { Workspace } from './workspaceState'
import styles from './Settings.module.css'

export function Disclosure(props: { label: string; children: () => JSX.Element }) {
  const [open, setOpen] = createSignal(false)
  return <details onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{props.label}</summary>
    <Show when={open()}>{props.children()}</Show>
  </details>
}

function Source(props: { w: Workspace; path?: string | null; line?: number; tool?: string; label?: string }) {
  const env = () => envName(props.path)
  return <Show when={props.path} fallback={<span>{MISSING}</span>}>{path =>
    <Show when={env() || isFileSource(path())} fallback={<span>{scopeLabel(path())}</span>}>
      <button type="button" class={styles.link} title={path()}
        onClick={() => props.w.openSource(path(), props.line, props.tool)}>
        {props.label ?? (env() ? `Inspect ${env()}` : `Open ${basename(path())}${props.line ? `:${props.line}` : ''}`)}
      </button>
    </Show>}
  </Show>
}

function FileHistory(props: { w: Workspace; path?: string | null; mtime?: number | null }) {
  return <Disclosure label="File history" children={() => <HistoryRows {...props} />} />
}
function HistoryRows(props: { w: Workspace; path?: string | null; mtime?: number | null }) {
  const path = () => isFileSource(props.path) ? `/api/board/file?${new URLSearchParams({ path: props.path })}` : undefined
  const res = untrack(() => props.w.ctx.detail<DetailFile>(path))
  return <div class={styles.stack}>
    <Show when={props.mtime != null}><p>Last modified: {new Date(props.mtime! * 1000).toLocaleString()}</p></Show>
    <Show when={res()?.status === 'loading'}><PanelState inline state="loading" message="Loading file history…" /></Show>
    <Show when={res()?.status === 'stale' || res()?.status === 'refreshing'}>
      <PanelState inline state="stale" onRetry={res()?.status === 'stale' ? res.retry : undefined} />
    </Show>
    <Show when={res()?.data?.edits} fallback={<Show when={res()?.status !== 'loading'}>
      <PanelState inline state="unavailable" onRetry={res()?.status === 'error' ? res.retry : undefined} /></Show>}>
      {edits => <Table label="File change history" rows={edits()} rowId={row => `${row.ts}\u0001${row.agent_id}`}
        fields={[{ id: 'time', label: 'Time', read: row => row.ts, format: ts => new Date(Number(ts) * 1000).toLocaleString() },
          { id: 'title', label: 'Session', read: row => row.title }, { id: 'added', label: 'Added', read: row => row.lines_added },
          { id: 'removed', label: 'Removed', read: row => row.lines_removed }]} />}
    </Show>
  </div>
}

function RelatedFindings(props: { w: Workspace; path?: string | null }) {
  const related = () => props.w.findings()?.filter(finding => samePath(finding.path, props.path))
  return <Show when={related()?.length}>
    <Disclosure label={`Related findings (${related()?.length})`} children={() =>
      <Table label="Related findings" rows={related() ?? []} rowId={row => row.id}
        fields={[{ id: 'rule', label: 'Rule', read: row => row.rule }, { id: 'severity', label: 'Severity', read: row => row.severity }]}
        action={{ label: row => `Inspect ${title(row.rule || 'finding')}`, run: row => props.w.select({ view: 'findings', row: row.id }) }} />
    } />
  </Show>
}

function SettingDetail(props: { w: Workspace; row: Setting }) {
  const w = untrack(() => props.w)
  const [editing, setEditing] = createSignal(false)
  const scopes = () => w.selectedEntry()?.scopes
  const edit = () => permissionEdit(props.row, scopes())
  const locked = () => props.row.locked || isLockedEntry(props.row.chain[props.row.wins], scopes())
  const source = () => props.row.source
  return <div class={styles.stack}>
    <header>
      <h2>{props.row.label}</h2>
      <code>{props.row.key}</code>
    </header>
    <div class={styles.controls}>
      <span>{w.label(props.row.tool)}</span>
      <span>{scopeLabel(props.row.scope, scopes())}</span>
      <Show when={props.row.risky}><strong data-tone="danger">Risky</strong></Show>
      <Show when={locked()}><strong data-tone="warning">Locked policy</strong></Show>
      <strong>{rowState(props.row)}</strong>
    </div>
    <Show when={!props.row.unset && props.row.value && typeof props.row.value === 'object'} fallback={
      <Stat label={props.row.unset ? 'Not set' : 'Value'} value={rowValue(props.row)} />}>
      <CodeView label="Value" text={JSON.stringify(props.row.value, null, 2)} language="JSON" wrap />
    </Show>
    <Show when={props.row.default !== undefined}>
      <Stat label="Documented default" value={plainValue(props.row.default)} />
    </Show>
    <Show when={props.row.tip}><p>{props.row.tip}</p></Show>
    <section class={styles.stack} aria-label="Precedence">
      <h3>Precedence</h3>
      <Show when={props.row.chain.length} fallback={<PanelState inline state="unavailable" />}>
        <Table label="Precedence chain" rows={props.row.chain.map((layer, index) => ({ layer, index }))}
          rowId={row => `${row.layer.scope ?? ''}\u0001${row.layer.source ?? ''}\u0001${row.index}`}
          fields={[
            { id: 'scope', label: 'Scope', read: row => scopeLabel(row.layer.scope, scopes()), sortable: false },
            { id: 'value', label: 'Value', read: row => row.layer.set === false ? 'Unset' : plainValue(row.layer.value), sortable: false },
            { id: 'winner', label: 'Precedence', read: row => row.index === props.row.wins ? 'Wins'
              : row.layer.set === false ? 'Not set' : props.row.wins >= 0 ? 'Overridden' : MISSING, sortable: false },
            { id: 'lock', label: 'Policy', read: row => isLockedEntry(row.layer, scopes()) ? 'Locked' : '—', sortable: false },
          ]} action={{ label: row => row.layer.source && (envName(row.layer.source) || isFileSource(row.layer.source))
            ? `Open ${envName(row.layer.source) || basename(row.layer.source)}${row.layer.line ? `:${row.layer.line}` : ''}` : '',
            run: row => { if (row.layer.source) w.openSource(row.layer.source, row.layer.line, props.row.tool) } }} />
        <Show when={props.row.chain[props.row.wins]}>{winner =>
          <p>Winner: {scopeLabel(winner().scope, scopes())}{isLockedEntry(winner(), scopes()) ? ' · policy locked' : ''}.</p>}
        </Show>
      </Show>
    </section>
    <section class={styles.stack} aria-label="Source and actions">
      <h3>Set in</h3>
      <Source w={w} path={source()} line={props.row.line} tool={props.row.tool} />
      <Show when={props.row.unset}>
        <p>Set this in a writable scope. {scopes()?.filter(scope => scope.changeable && scope.path)
          .map(scope => scopeLabel(scope.id, scopes())).join(', ') || MISSING}</p>
      </Show>
      <button type="button" disabled={!edit().ok} onClick={() => setEditing(true)}>Edit permissions</button>
      <Show when={!edit().ok}><p>{(edit() as { hint?: string }).hint}</p></Show>
      <Show when={editing() && edit().ok && edit()}>{value => <PermissionEditor ctx={w.ctx} tool={props.row.tool}
        scope={value().ok ? value().scope! : ''} label={value().ok ? value().label! : ''} onClose={() => setEditing(false)} />}</Show>
    </section>
    <FileHistory w={w} path={source()} mtime={w.files().find(file => samePath(file.path, source()))?.mtime} />
    <RelatedFindings w={w} path={source()} />
  </div>
}

function AgentDetail(props: { w: Workspace; row: Setting }) {
  const agent = () => props.row.agent!
  const pin = () => props.row.chain.find(layer => samePath(layer.source, agent().pinned_in))
  return <div class={styles.stack}>
    <header><h2>{agent().name || props.row.label}</h2><p>{agent().description}</p></header>
    <div class={styles.metrics}>
      <Stat label="Effective model" value={rowValue(props.row)} />
      <Stat label="Available tools" value={agentTools(props.row)} />
    </div>
    <section class={styles.stack} aria-label="Model decision">
      <h3>Model decision</h3>
      <dl class={styles.facts}>
        <dt>Winner</dt><dd>{agentInherits(props.row) ? 'Session model (inherited)' : pinWins(props.row) ? 'Settings pin'
          : agent().model_policy === 'required' ? 'Agent file (required)' : agent().model ? 'Agent file' : MISSING}</dd>
        <dt>Agent file model</dt><dd>{agent().model || MISSING}</dd>
        <dt>Pinned model</dt><dd>{pin() ? plainValue(pin()?.value) : MISSING}</dd>
        <dt>Model policy</dt><dd>{agent().model_policy || MISSING}</dd>
        <dt>Effort</dt><dd>{agent().effort || MISSING}</dd>
        <dt>Context tier</dt><dd>{agent().context_tier || MISSING}</dd>
        <dt>Target</dt><dd>{agent().target || MISSING}</dd>
        <dt>Scope</dt><dd>{scopeLabel(agent().scope_defined || props.row.scope)}</dd>
        <dt>Defined in</dt><dd><Source w={props.w} path={agent().defined_in} line={agent().defined_line} /></dd>
        <dt>Pinned in</dt><dd><Source w={props.w} path={agent().pinned_in} line={agent().pinned_line} /></dd>
      </dl>
      <Show when={props.row.note}><p>{props.row.note}</p></Show>
    </section>
    <Show when={agent().tools} fallback={<PanelState inline state="unavailable" message={agent().tools_all
      ? 'The definition has no tools field, so the agent can use every tool.' : 'Tool list not available from this source.'} />}>{tools =>
      <Disclosure label={`Tools (${tools().length})`} children={() =>
        <Table label="Agent tools" rows={[...new Set(tools())].map(name => ({ name }))}
          rowId={row => row.name} fields={[{ id: 'tool', label: 'Tool', read: row => row.name }]} />} />}
    </Show>
    <FileHistory w={props.w} path={agent().defined_in || props.row.source} />
  </div>
}

function EnvironmentDetail(props: { w: Workspace; value: Environment }) {
  const env = () => props.value
  const origins = () => [...(env().persisted ?? []),
    ...(env().in_process ? [{ kind: 'daemon', origin: DAEMON_ENV, value: env().process }] : [])]
  return <div class={styles.stack}>
    <header><h2>{env().name}</h2><p>{env().description}</p></header>
    <Stat label="Value for new sessions" value={environmentValue(env())} />
    <Show when={origins().length} fallback={<PanelState inline state={env().set === false ? 'empty' : 'unavailable'}
      message={env().set === false ? 'No origins reported for this unset variable.' : undefined} />}>
      <Table label="Environment origins" rows={origins()} rowId={row => `${row.kind}\u0001${row.origin}`}
        fields={[{ id: 'origin', label: 'Origin', read: row => row.origin },
          { id: 'kind', label: 'Kind', read: row => row.kind === 'daemon' ? 'Not the session' : title(row.kind) },
          { id: 'value', label: 'Value', read: row => env().masked !== false ? env().masked ? 'Masked' : undefined : row.value }]}
        action={{ label: row => row.kind === 'settings' ? 'Open origin file' : '',
          run: row => props.w.openSource(row.origin) }} />
    </Show>
    <Show when={env().drives}>{drives => <Table label="Driven settings" rows={drives()} rowId={row => row.key}
      fields={[{ id: 'label', label: 'Setting', read: row => row.label }]}
      action={{ label: row => `Inspect ${row.label}`, run: row => {
        const setting = props.w.entries().find(entry => entry.id === env().tool)?.rows.find(item => item.key === row.key)
        if (setting) props.w.selectSetting(setting)
      } }} />}</Show>
  </div>
}

function FileDetail(props: { w: Workspace; file: ConfigFile }) {
  const file = () => props.file
  return <div class={styles.stack}>
    <header><h2>{file().name}</h2><code>{file().path}</code></header>
    <div class={styles.metrics}>
      <Stat label="Bytes" value={file().bytes} />
      <Stat label="Top-level keys" value={fileCounts(file()).top} />
      <Stat label="Settings" value={fileCounts(file()).settings} />
      <Stat label="Readers" value={file().tools.length} />
    </div>
    <dl class={styles.facts}>
      <dt>State</dt><dd>{file().exists == null ? MISSING : file().exists ? 'Present' : 'Not present'}</dd>
      <dt>Purpose</dt><dd>{purposeLabel(file().kind)}</dd>
      <dt>Scope</dt><dd>{scopeLabel(file().scope)}</dd>
      <dt>Git</dt><dd>{file().git_state || MISSING}</dd>
      <dt>Read by</dt><dd>{file().tools.map(props.w.label).join(', ') || MISSING}</dd>
    </dl>
    <Show when={file().exists !== false && !file().is_dir}>
      <Source w={props.w} path={file().path} label="Open file" />
    </Show>
    <Show when={file().rows.length}><Table label="Settings from this file" rows={file().rows}
      fields={[{ id: 'label', label: 'Setting', read: row => row.label }, { id: 'line', label: 'Line', read: row => row.line }]}
      rowId={row => row.uid} action={{ label: row => `Inspect ${row.label}`, run: props.w.selectSetting }} /></Show>
    <FileHistory w={props.w} path={file().is_dir || file().exists === false ? undefined : file().path} mtime={file().mtime} />
    <RelatedFindings w={props.w} path={file().path} />
  </div>
}

function FindingDetail(props: { w: Workspace; finding: Finding }) {
  const finding = () => props.finding
  return <div class={styles.stack}>
    <header><h2>{title(finding().rule || 'Finding')}</h2></header>
    <div class={styles.metrics}><Stat label="Severity" value={finding().severity} tone={finding().severity === 'high' ? 'warning' : 'neutral'} />
      <Stat label="Tools" value={findingTools(finding()).length} /></div>
    <p>{finding().why || MISSING}</p>
    <p>{finding().action}</p>
    <Show when={finding().snippet}><CodeView label="Finding excerpt" text={finding().snippet!} wrap /></Show>
    <Source w={props.w} path={finding().path} line={finding().line} tool={finding().tool} />
  </div>
}

export function Inspector(props: { w: Workspace }) {
  const w = untrack(() => props.w)
  const settingView = () => w.state().view === 'tool' || w.state().view === 'topic'
  return <Drawer id="settings-inspector" title="Inspector" open={w.inspector()} onClose={w.close}>
    <div class={`${styles.workspace} ${styles.stack}`} role="region" aria-label="Settings inspector" tabindex={0}>
      <Switch fallback={<PanelState inline state="unavailable" message="Selected item not available from this source." />}>
        <Match when={settingView() && w.selectedEnv()}>{value => <EnvironmentDetail w={w} value={value()} />}</Match>
        <Match when={settingView() && w.selectedSetting()?.agent && w.selectedSetting()}>{row => <AgentDetail w={w} row={row()} />}</Match>
        <Match when={settingView() && w.selectedSetting()}>{row => <SettingDetail w={w} row={row()} />}</Match>
        <Match when={w.state().view === 'files' && w.selectedFile()}>{file => <FileDetail w={w} file={file()} />}</Match>
        <Match when={w.state().view === 'findings' && w.selectedFinding()}>{finding => <FindingDetail w={w} finding={finding()} />}</Match>
      </Switch>
    </div>
  </Drawer>
}

import { html } from 'htm/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { getBoardNodeView } from '../../api.js';

export function useNodeView({ view, scope, nodeId, sessionId, since, until, enabled = true }, revision = 0) {
  const [result, setResult] = useState(null);
  const key = JSON.stringify([view, scope, nodeId, sessionId, since, until, revision]);
  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    const put = state => { if (!ctrl.signal.aborted) setResult({ key, ...state }); };
    getBoardNodeView({ view, scope, nodeId, sessionId, since, until }, { signal: ctrl.signal })
      .then(data => put({ data }), error => put({ error }));
    return () => ctrl.abort();
  }, [key, view, scope, nodeId, sessionId, since, until, enabled]);
  // Do not paint the previous node even for the render before effect cleanup.
  return enabled && result?.key === key ? result : {};
}

export const scopeLabel = (scope, nodeId) => scope === 'local' ? 'This node' : scope === 'fleet' ? 'All nodes' : nodeId || 'Named node';

export function LocalNodeIdentity() {
  const { data, error } = useNodeView({ view: 'identity', scope: 'local' });
  const local = data?.local_node;
  return html`<p class="bd-identity"><strong>This node</strong> · ${local?.node_id
    ? html`Node ID: <code>${local.node_id}</code> · Source: ${local.source || 'unknown'}`
    : error || data ? 'Node identity unavailable' : 'Reading node identity…'}</p>`;
}

function ScopeChoices({ scope, nodeId, visited, select }) {
  const { data, error } = useNodeView({ view: 'nodes', scope: 'fleet' });
  const [typed, setTyped] = useState(nodeId || '');
  const ids = [...new Set([...visited, ...(data?.rows || []).map(r => r.node_id), 'legacy'])];
  const pick = (s, id) => select(s, id);
  const choice = (s, id) => html`<button key=${JSON.stringify([s, id])} type="button" class="bd-mi"
    aria-pressed=${s === scope && (s !== 'node' || id === nodeId)} onClick=${() => pick(s, id)}>${scopeLabel(s, id)}</button>`;
  return html`<div class="bd-menu bd-nodemenu" role="group" aria-label="Choose node scope">
    ${choice('local')}${choice('fleet')}
    <form onSubmit=${e => { e.preventDefault(); if (typed.trim()) pick('node', typed.trim().toLowerCase()); }}>
      <label>Node ID<input type="text" value=${typed} placeholder="Enter a node ID" onInput=${e => setTyped(e.currentTarget.value)}/></label>
      <button class="bd-btn" type="submit" disabled=${!typed.trim()}>Open node</button>
    </form>
    ${error ? html`<p role="status">Could not list nodes. You can still enter a node ID.</p>`
      : !data ? html`<p role="status">Finding nodes…</p>`
      : !data.fleet_available ? html`<p>Fleet history requires a shared Kusto store.</p>`
      : data.truncated ? html`<p>Not all nodes are listed. Enter any node ID above.</p>` : null}
    ${ids.map(id => choice('node', id))}
  </div>`;
}

export function NodeScopePicker({ scope, nodeId, visited, onSelect }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const outside = e => { if (!root.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
    };
  }, [open]);
  return html`<div class="bd-anch bd-nodepicker" ref=${root} onKeyDown=${e => {
    if (open) {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); trigger.current?.focus(); }
    }
  }}>
    <button class="bd-ctl" type="button" ref=${trigger} aria-expanded=${open} onClick=${() => setOpen(v => !v)}>
      <span class="bd-k">Node scope:</span> ${scopeLabel(scope, nodeId)}
    </button>
    ${open && html`<${ScopeChoices} scope=${scope} nodeId=${nodeId} visited=${visited} select=${(s, id) => {
      setOpen(false); trigger.current?.focus();
      if (s !== scope || (s === 'node' && id !== nodeId)) onSelect(s, id);
    }}/>`}
  </div>`;
}

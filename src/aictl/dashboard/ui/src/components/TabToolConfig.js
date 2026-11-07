// The Configuration tab: the Settings workspace on the older screens. The board
// opens `?tab=config` as its own Settings screen, so this stays as a fallback route.
import { html } from 'htm/preact';
import { useCallback, useContext, useEffect, useMemo, useState } from 'preact/hooks';
import { SnapContext } from '../context.js';
import { getContextAudit } from '../api.js';
import SettingsWorkspace from './settings/SettingsWorkspace.js';

/** The context audit for this screen; `rescan` asks the server to scan again. */
function useAudit() {
  const [gen, setGen] = useState(0);
  const [res, setRes] = useState({ loading: true, audit: null, scan: null, error: null });
  useEffect(() => {
    let live = true;
    setRes(s => ({ ...s, loading: true, error: null }));
    getContextAudit(gen > 0, scan => { if (live) setRes(s => ({ ...s, scan })); }).then(
      audit => { if (live) setRes({ loading: false, audit, scan: null, error: null }); },
      e => { if (live) setRes(s => ({ ...s, loading: false, scan: null, error: String(e?.message || e) })); },
    );
    return () => { live = false; };
  }, [gen]);
  const rescan = useCallback(() => setGen(g => g + 1), []);
  return useMemo(() => ({ ...res, rescan }), [res, rescan]);
}

export default function TabToolConfig() {
  const { snap, openViewer, enabledTools = null, recentFiles } = useContext(SnapContext) || {};
  const findings = useAudit();
  // A tab change inside the older screens lands here; the router then opens the board's Settings screen.
  useEffect(() => { window.dispatchEvent(new Event('aictl:route')); }, []);
  const openFile = useCallback((path, line) => {
    if (path && openViewer) openViewer(path, line > 0 ? { line } : {});
  }, [openViewer]);
  const source = useMemo(() => ({
    toolConfigs: snap ? (Array.isArray(snap.tool_configs) ? snap.tool_configs : []) : null,
    tools: snap?.tools || [],
    monitor: snap?.live_monitor || {},
    root: snap?.root || '',
    enabledTools,
    recentFiles,
    openFile,
    findings,
  }), [snap, enabledTools, recentFiles, openFile, findings]);
  return html`<${SettingsWorkspace} source=${source}/>`;
}

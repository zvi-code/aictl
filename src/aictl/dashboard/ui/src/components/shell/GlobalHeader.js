import { html } from 'htm/preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { Menu, Command as CommandIcon, Save, Trash2 } from 'lucide-preact';
import Button from '../ui/Button.js';
import Kbd from '../ui/Kbd.js';
import Popover from '../ui/Popover.js';
import Segmented from '../ui/Segmented.js';
import Dialog from '../ui/Dialog.js';
import { Icon } from '../ui/index.js';
import RangeBar from '../RangeBar.js';
import ToolFilterBar from '../ToolFilterBar.js';

// Data age past which the snapshot is considered stale. SSE pushes arrive
// every few seconds and the safety-net refresh runs every 30s — anything
// older means the refresh loop is dead even if the SSE socket looks "live".
const STALE_AFTER_S = 30;

/** Age of the last data snapshot, shown next to the connection pill.
 *  Ticks on a 5s interval so the age keeps counting even when SSE stops
 *  delivering messages (the exact failure this element exists to expose). */
export function SnapshotAge({ timestamp }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, []);
  if (!timestamp) return null;
  const age = Math.max(0, Math.floor(Date.now() / 1000 - timestamp));
  const stale = age > STALE_AFTER_S;
  return html`<span class=${'conn ' + (stale ? 'stale' : 'ok')} role="status" aria-live="polite"
    title=${'Last data snapshot received ' + age + 's ago'
      + (stale ? ' — the refresh loop may be stalled' : '')}>
    ● ${stale ? 'stale ' + age + 's' : age + 's'}
    <span class="sr-only">${stale ? ' — data is stale' : ' — data age'}</span>
  </span>`;
}

export default function GlobalHeader({
  // Filter/search
  searchRef, searchQuery, onSearchChange,
  // Theme + density
  theme, cycleTheme,
  density, setDensity,
  // Connection
  otelActive, connected,
  // Range
  globalRange, onPreset, onApplyCustom,
  // Tool filter (for mobile overflow)
  snap, enabledTools, onToggleTool, onSetAllTools,
  // Views
  views = [], matchingView = null, onApplyView, onDeleteView, onSaveView,
  // Command palette
  onOpenPalette,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const commitSave = useCallback(() => {
    const t = newName.trim();
    if (!t) return;
    onSaveView && onSaveView(t);
    setNewName('');
    setSaveDialogOpen(false);
  }, [newName, onSaveView]);

  const densityOptions = [
    { value: 'compact',  label: 'Compact' },
    { value: 'normal',   label: 'Normal' },
    { value: 'spacious', label: 'Spacious' },
  ];

  const viewsTrigger = html`<button class="hdr-btn" type="button"
    aria-label="Saved views" title="Saved views">
    Views${matchingView ? ': ' + matchingView.name : ''} ▾
  </button>`;

  return html`<header role="banner">
    <h1>aictl <span>live dashboard</span></h1>
    <div class="hdr-right">
      <!-- Mobile overflow toggle -->
      <button class="hdr-btn hdr-mobile-only" type="button" aria-label="Menu"
        aria-expanded=${mobileOpen ? 'true' : 'false'}
        onClick=${() => setMobileOpen(v => !v)}>
        <${Menu} size="16" aria-hidden="true"/>
      </button>

      <input type="text" ref=${searchRef} class="search-box hdr-desktop-only"
        placeholder="Filter... ( / )" aria-label="Filter tools"
        value=${searchQuery} onInput=${e => onSearchChange(e.target.value)}/>

      <!-- Command palette trigger -->
      <button class="hdr-cmdk" type="button"
        onClick=${onOpenPalette} aria-label="Open command palette">
        <${CommandIcon} size="14" aria-hidden="true"/>
        <span class="hdr-desktop-only">Search</span>
        <${Kbd}>⌘K</${Kbd}>
      </button>

      <!-- Views dropdown -->
      <${Popover} trigger=${viewsTrigger} placement="bottom">
        <div class="hdr-views-menu" role="group" aria-label="Saved views">
          ${views.length === 0
            ? html`<div class="hdr-views-empty text-muted">No saved views</div>`
            : views.map(v => html`<div key=${v.id} class="hdr-views-row">
                <button class="hdr-views-apply" type="button"
                  onClick=${() => onApplyView && onApplyView(v.id)}
                  aria-label=${'Apply view ' + v.name}>${v.name}</button>
                <button class="hdr-views-del" type="button"
                  aria-label=${'Delete view ' + v.name}
                  onClick=${() => onDeleteView && onDeleteView(v.id)}>
                  <${Trash2} size="12" aria-hidden="true"/>
                </button>
              </div>`)
          }
          <hr class="hdr-views-sep"/>
          <${Button} variant="ghost" size="sm"
            onClick=${() => setSaveDialogOpen(true)}>
            <${Save} size="12" aria-hidden="true"/> Save current view…
          </${Button}>
        </div>
      </${Popover}>

      <!-- Density picker -->
      <${Segmented}
        ariaLabel="Density"
        value=${density}
        options=${densityOptions}
        onChange=${setDensity}
        class="hdr-desktop-only"/>

      <!-- Theme toggle -->
      <button class="theme-btn" type="button" onClick=${cycleTheme}
        aria-label=${'Toggle theme: ' + theme} title=${'Theme: ' + theme}>
        <${Icon} name=${theme === 'light' ? 'sun' : theme === 'editorial' ? 'pen' : 'moon'} size="16"/>
      </button>

      ${otelActive
        ? html`<span class="conn ok" title="OTel receiver active">OTel</span>`
        : html`<span class="conn off" title="OTel receiver inactive — enable with: aictl otel enable">OTel off</span>`}
      <${SnapshotAge} timestamp=${snap?.timestamp}/>
      <span class=${'conn ' + (connected ? 'ok' : 'err')} role="status" aria-live="polite">
        ${connected ? 'live' : 'reconnecting...'}
        <span class="sr-only">${connected ? ' — connected' : ' — connection lost, reconnecting'}</span>
      </span>
    </div>

    ${mobileOpen && html`<div class="hdr-mobile-overflow hdr-mobile-only">
      <input type="text" class="search-box" placeholder="Filter..."
        aria-label="Filter tools"
        value=${searchQuery} onInput=${e => onSearchChange(e.target.value)}/>
      <${RangeBar} globalRange=${globalRange}
        onPreset=${onPreset} onApplyCustom=${onApplyCustom}/>
      <${ToolFilterBar} snap=${snap} enabledTools=${enabledTools}
        onToggle=${onToggleTool} onSetAll=${onSetAllTools}/>
    </div>`}

    ${saveDialogOpen && html`<${Dialog} open=${true}
      onClose=${() => setSaveDialogOpen(false)} ariaLabel="Save view">
      <h3 style="margin-bottom:var(--sp-5)">Save current view</h3>
      <input type="text" class="search-box" style="width:100%"
        placeholder="View name" value=${newName}
        onInput=${e => setNewName(e.target.value)}
        onKeyDown=${e => e.key === 'Enter' && commitSave()}
        autoFocus=${true}/>
      <div style="display:flex;gap:var(--sp-3);margin-top:var(--sp-6);justify-content:flex-end">
        <${Button} variant="ghost" onClick=${() => setSaveDialogOpen(false)}>Cancel</${Button}>
        <${Button} variant="primary" onClick=${commitSave}>Save</${Button}>
      </div>
    </${Dialog}>`}
  </header>`;
}

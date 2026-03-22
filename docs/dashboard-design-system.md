# aictl Web Dashboard — Design System

Design tokens, component patterns, and accessibility status for the
`aictl serve` web dashboard UI only. This does not cover the CLI, plugin
system, collectors, or other parts of the aictl project.

Living document maintained by `/ui-review`. Last updated: 2026-03-27.

## Color Tokens

### Theme Variables (dashboard.css)

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--bg` | `#0f172a` | `#f8fafc` | Page background |
| `--bg2` | `#1e293b` | `#ffffff` | Card / elevated surface |
| `--bg3` | `#162032` | `#f1f5f9` | Hover / active state |
| `--fg` | `#e2e8f0` | `#1e293b` | Primary text |
| `--fg2` | `#94a3b8` | `#64748b` | Secondary / muted text |
| `--accent` | `#38bdf8` | `#0284c7` | Links, active tab, primary action |
| `--border` | `#334155` | `#e2e8f0` | Borders and dividers |
| `--green` | `#34d399` | `#059669` | Success, running, positive |
| `--red` | `#f87171` | `#dc2626` | Error, anomaly, critical |
| `--orange` | `#fb923c` | `#ea580c` | Warning, moderate concern |
| `--yellow` | `#fbbf24` | `#d97706` | Caution, on-demand |

### Category Colors (added 2026-03-28, commit d22795a)

| Token | Value | Usage |
|-------|-------|-------|
| `--cat-commands` | `#a78bfa` | Command files in ContextMap |
| `--cat-skills` | `#34d399` | Skill files |
| `--cat-agent` | `#f472b6` | Agent files |
| `--cat-memory` | `#60a5fa` | Memory files |
| `--cat-prompt` | `#c084fc` | Prompt files |
| `--cat-temp` | `#6b7280` | Temp files |
| `--cat-runtime` | `#64748b` | Runtime files |
| `--cat-extensions` | `#818cf8` | Extension files |

### Model Colors (added 2026-03-28, commit d22795a)

| Token | Value | Usage |
|-------|-------|-------|
| `--model-5` | `#e879f9` | MODEL_PALETTE index 4 |
| `--model-7` | `#67e8f9` | MODEL_PALETTE index 6 |
| `--model-8` | `#a78bfa` | MODEL_PALETTE index 7 |
| `--model-switch` | `#e879f9` (dark) / `#d946ef` (light) | model_switch events in EventTimeline |

### Resolved Color Issues

| Issue | Status |
|-------|--------|
| ContextMap CAT_COLORS hardcoded hex | FIXED — uses `--cat-*` variables |
| TabBudget MODEL_PALETTE hardcoded hex | FIXED — uses `--model-*` variables |
| Fallback `#94a3b8` in 10 files | FIXED — replaced with `var(--fg2)` |
| `#000`/`#fff` in badges/buttons | FIXED — replaced with `var(--bg)` |
| `utils.js` EVENT_COLORS | FIXED — `model_switch` now uses `var(--model-switch)` |
| Last `#fff` in ToolCard error badge | FIXED — replaced with `var(--bg)` |

## Typography

### Font Stack
- **Primary**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace`
- **Monospace** (`.mono` class): `'SF Mono', Menlo, Consolas, monospace`

### Current Font Size Usage (14 distinct values)

| Value | Occurrences | Used for |
|-------|-------------|----------|
| 0.55rem | ~5 | Tiny badges, sparkline labels |
| 0.6rem | ~10 | Category labels, small badges |
| 0.62rem | ~3 | Group headers |
| 0.65rem | ~5 | Metric labels |
| 0.68rem | ~2 | Small body text |
| 0.7rem | ~3 | Card metadata |
| 0.72rem | ~8 | Table cells, body text |
| 0.75rem | ~12 | Standard body text |
| 0.78rem | ~3 | Medium text |
| 0.8rem | ~5 | Section headers |
| 0.85rem | ~5 | Tool names, card headers |
| 0.9rem | ~2 | Large labels |
| 0.95rem | ~2 | Metric values |
| 1.1rem | ~3 | Chart values, page title |

### Typography Scale (CSS variables defined, migration in progress)

8-tier purpose-driven scale. CSS custom properties in `dashboard.css:32-40`:

| Tier | Variable | Value | CSS class | Usage |
|------|----------|-------|-----------|-------|
| 2xs | `--fs-2xs` | 0.55rem | — | Chart annotations, ref labels |
| xs | `--fs-xs` | 0.6rem | `.text-xs` | Badges, icons, uppercase labels |
| sm | `--fs-sm` | 0.65rem | `.text-sm` | Tooltips, event details, small controls |
| base | `--fs-base` | 0.72rem | — | Section titles, meta text, legends |
| md | `--fs-md` | 0.78rem | `.text-md` | Tables, file items, code, search |
| lg | `--fs-lg` | 0.85rem | — | Body text, tab buttons, interactive |
| xl | `--fs-xl` | 0.95rem | — | Card titles, metric values |
| 2xl | `--fs-2xl` | 1.1rem | — | Page heading, chart hero values |

**Migration status**: Variables defined and consumed by **CSS rules** (dashboard.css
uses them throughout). However, **inline styles in component JS files** still use
14+ distinct hardcoded rem values. Worst offender: `TabSessions.js` (8 sizes).
Next step: replace hardcoded inline font-sizes with `var(--fs-*)` references.

## Spacing

### Spacing Scale (CSS variables defined, partially consumed)

11-tier scale defined in `dashboard.css:42-51`:

| Token | Value | Usage |
|-------|-------|-------|
| `--sp-1` | 0.15rem | Tight: badge/process-row padding |
| `--sp-2` | 0.25rem | Compact: small padding, legend gap |
| `--sp-3` | 0.3rem | Small: range gap, metrics gap |
| `--sp-4` | 0.4rem | Medium: chart gap, standard gap |
| `--sp-5` | 0.5rem | Standard: cell padding, header gap |
| `--sp-6` | 0.6rem | Section: card padding, layout gap |
| `--sp-8` | 0.8rem | Large: tab margin, card padding |
| `--sp-10` | 1rem | XLarge: column gap |
| `--sp-12` | 1.2rem | Header: page padding |

**Migration status**: CSS rules fully consume `--sp-*` variables. Inline styles
in component JS files still use some hardcoded values (0.1rem, 0.2rem, etc.),
particularly in `TabSessions.js`, `ProcRow.js`, and `TabBudget.js`.

## Component Patterns

### Card Variants

| Class | Background | Border | Radius | Used in |
|-------|-----------|--------|--------|---------|
| `.tcard` | `var(--bg2)` | left accent + `var(--border)` | 6px | ToolCard |
| `.diag-card` | `var(--bg2)` | `var(--border)` | 6px | TabLive diagnostics |
| `.budget-card` | `var(--bg2)` | `var(--border)` | 6px | TabBudget |
| `.chart-box` | `var(--bg2)` | `var(--border)` | 4px | ChartCard |
| `.metric-chip` | `var(--bg2)` | `var(--border)` | 4px | Metric display |

### Badge (`.badge`)
- Background: `var(--bg3)` default, `var(--green/red/orange/yellow)` variants
- Border-radius: 3px
- Font-size: 0.6rem
- Padding: 0.1rem 0.35rem

### State Indicators (added 2026-03-28, commit 550c4b7)

| Class | Font-size | Color | Padding | Used for |
|-------|-----------|-------|---------|----------|
| `.empty-state` | 0.75rem | `var(--fg2)` | 0.4rem | No data / empty collections |
| `.loading-state` | 0.75rem | `var(--fg2)` | 0.4rem | Data loading / connecting |
| `.error-state` | 0.75rem | `var(--red)` | 0.4rem | Errors / failures |

All 9 tab components use these instead of inline styles.

### Section Title Pattern
- Text-transform: uppercase
- Letter-spacing: 0.03em
- Font-size: 0.6rem
- Color: var(--fg2)
- Classes: `.es-section-title`, `.metric-group-label`, `.rbar-title`
  (inconsistently named — should converge on one)

## Interaction Patterns

### Expand/Collapse
- Indicator: Unicode `\u25B6` (right triangle) rotating via inline transform
- State: `aria-expanded` attribute (inconsistently applied)
- Animation: CSS `max-height` transition

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| 1-9 | Switch tabs |
| / | Focus search |
| Escape | Close file viewer |

### Focus Management
- `focus-visible` outline on buttons (dashboard.css)
- Skip-to-content link added (commit d22795a)
- FileViewer: focus trap on open, focus restore on close, `aria-modal="true"` (added 2026-03-28)

## Accessibility Status

### Implemented
- `role="tablist"` + `aria-selected` on tab navigation
- `role="table"` on some data tables
- `aria-label` on some sections
- `focus-visible` button outline
- Error boundary for rendering crashes
- Skip-to-content link (added 2026-03-28)
- `prefers-reduced-motion` media query (added 2026-03-28)
- `.sr-only` utility class (added 2026-03-28)
- All colors use CSS variables (no hardcoded hex in components, fixed 2026-03-28)
- `role="img"` + `aria-label` on ChartCard, MiniChart, and ToolCard sparklines (added 2026-03-28)
- `aria-hidden="true"` on ToolCard canvas elements (added 2026-03-28)
- Standardized `.empty-state`, `.loading-state`, `.error-state` CSS classes across all tabs (added 2026-03-28)
- Connection status: `role="status"` + `aria-live="polite"` with sr-only description (added 2026-03-28)
- ResourceBar, EventTimeline, ContextMap: ARIA roles and descriptive labels (added 2026-03-28)
- FileViewer focus trap + `aria-modal="true"` (added 2026-03-28)
- Zero hardcoded hex colors in any JS file (verified 2026-03-28)

### Known Bugs (as of 2026-03-28)
- `var(--blue)` and `var(--fg3)` referenced in `TabSessions.js:21,24`,
  `SessionDetail.js:55,60`, `TeamTree.js:20-21,102` — never defined in CSS.
  Badges and event dots render invisible. **Scope widened**: 3 files, not 1.
- Floating-point in Live Traffic legend — `ResourceBar.js:35` string coercion
  issue when API returns string-typed rate values (screenshot evidence from 2026-03-26)
- `fmtDur` duplicated identically in `TabSessions.js:8`, `SessionDetail.js:8`,
  `TeamTree.js:6` — should be in `utils.js`

### Missing (ordered by impact)
1. `ProcessNode` expand toggle is `<span>` not `<button>` — keyboard-inaccessible
2. `role="alert"` on `ErrorBoundary.js` error fallback UI
3. `aria-label` on `ProcRow.js` anomaly icon and copy button
4. Consistent `aria-expanded` on all collapsible sections — missing on
   `TabSessions.js` ProcessNode
5. Screen reader text for icon-only buttons (Unicode arrows lack `aria-hidden`)
6. Touch targets: `.range-btn` and `.header-toggle` at 32px, below WCAG 44px
7. `aria-live` regions for more SSE-updated data elements (NOT on tabpanel — too noisy)
8. Color-only status indicators in progress bars / memory bars (WCAG 1.4.1)
9. `ToolCardSections.js:131` error badge click handler without button semantics
10. `TeamTree.js` columns and items lack ARIA roles/labels
11. `MiniChart.js:66` generic aria-label "Sparkline chart" for all charts

## Layout Structure

```
header
  ├── title + search + theme toggle + connection status
  ├── range selector (Live, 1h, 6h, 24h, 7d)
  ├── sparkline row (4 charts)
  ├── collapsible detail section
  │   ├── inventory metrics (2-col grid)
  │   ├── live monitor metrics (2-col grid)
  │   ├── resource bars
  │   └── event timeline
  └── collapse toggle

main
  ├── tab bar (9 tabs with keyboard shortcuts)
  └── tab panel (selected tab content)

file-viewer (overlay side panel, resizable)
```

## Revision Log

| Date | Change | By |
|------|--------|-----|
| 2026-03-28 | ToolCard decomposition, ProcRow dedup, typography scale (commits 5d13edf, 49854a2) | /ui-review fix |
| 2026-03-28 | FileViewer focus trap, last hex colors, component ARIA (commit d93cf1a) | /ui-review fix |
| 2026-03-28 | State classes + canvas a11y (commit 550c4b7) | /ui-review fix |
| 2026-03-28 | Quick wins: a11y, color tokens, skip-link (commit d22795a) | /ui-review fix |
| 2026-03-28 | Full review: --blue/--fg3 scope widened (3 files), ProcessNode a11y, fmtDur duplication, 15 findings total | /ui-review |
| 2026-03-27 | Full review: found undefined --blue/--fg3, float bug, updated typography/spacing sections, expanded a11y gaps list | /ui-review |
| 2026-03-27 | Initial creation from codebase audit | /ui-review skill |

# aictl Web Dashboard — Design System

Design tokens, component patterns, and accessibility status for the
`aictl serve` web dashboard UI only. This does not cover the CLI, plugin
system, collectors, or other parts of the aictl project.

Living document maintained by `/ui-review`. Last updated: 2026-07-14.

> Path note: the package root moved to `src/aictl/` — UI sources are at
> `src/aictl/dashboard/ui/src/`. File references below use paths relative
> to that directory unless stated otherwise.

## Color Tokens

### Theme Variables (dashboard.css)

| Token | Dark | Light | Editorial | Usage |
|-------|------|-------|-----------|-------|
| `--bg` | `#0f172a` | `#f8fafc` | `#f7f4ee` | Page background |
| `--bg2` | `#1e293b` | `#ffffff` | `#fbfaf6` | Card / elevated surface |
| `--bg3` | `#162032` | `#f1f5f9` | `#ffffff` | Hover / active state |
| `--fg` | `#e2e8f0` | `#1e293b` | `#1a1614` | Primary text |
| `--fg2` | `#94a3b8` | `#64748b` | `#8a7f73` | Secondary / muted text |
| `--accent` | `#38bdf8` | `#0284c7` | `#a6391c` | Links, active tab, primary action |
| `--border` | `#334155` | `#e2e8f0` | `#e5dfd3` | Borders and dividers |
| `--green` | `#34d399` | `#059669` | `#3f7d43` | Success, running, positive |
| `--red` | `#f87171` | `#dc2626` | `#a6391c` | Error, anomaly, critical |
| `--orange` | `#fb923c` | `#ea580c` | `#b26b1b` | Warning, moderate concern |
| `--yellow` | `#fbbf24` | `#d97706` | `#d97706` | Caution, on-demand |

### Editorial-only extras

These vars are defined only under `[data-theme="editorial"]` and consumed by
the editorial override layer at the end of `dashboard.css`:

| Token | Value | Usage |
|-------|-------|-------|
| `--accent-soft` | `#f6e6e0` | Selected-row tint, accent-on-paper |
| `--green-soft` | `#e6efe3` | Live/connected pill background |
| `--border-soft` | `#ede7da` | Hairline dividers between rows |
| `--ink-soft` | `#3f3833` | Body italic, secondary headlines |
| `--muted-soft` | `#b6ac9f` | Disabled / decorative |
| `--rule` | `#1a1614` | Masthead rule under header |

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
- **Sans** (`var(--ff-sans)` — default body): `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` — overridden to `'IBM Plex Sans', …` in editorial theme
- **Serif** (`var(--ff-serif)` — editorial-only headlines / metric values): `Georgia, 'Times New Roman', serif` → `'IBM Plex Serif', …` in editorial
- **Monospace** (`var(--ff-mono)`, `.mono` class): `'SF Mono', Menlo, Consolas, monospace` → `'IBM Plex Mono', 'JetBrains Mono', …` in editorial

The editorial theme is the only variant that pulls custom webfonts; IBM Plex
is loaded via Google Fonts in `index.html` but only ever fetched when a
`[data-theme="editorial"]` selector matches.

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

### Known Bugs (as of 2026-07-14, post fix-campaign)

**All items below were FIXED by the 2026-07-14 fix campaign** (commits
53aef3e..ee8d930) — kept for reference as design rules. The authoritative
open list is the Open Issues Tracker in `.claude/skills/ui-review/SKILL.md`.

Design rules distilled from these fixes:
- **Canvas APIs can't consume `var()`** — always resolve via
  `resolveColor()` from utils.js before handing colors to uPlot/canvas.
- **utils.js is the only home for formatters** — `fmtDurSec`/`fmtDurMs`
  name the unit explicitly; never define a local `fmtDur`.
- **All fetches go through `api.js fetchJson`** (throws on !ok); panels use
  the cancellation + loading + error-state pattern.
- **New CSS vars must be defined in the `:root` token block** — the compat
  aliases (--blue --fg3 --fg-muted --bg1 --bg-alt --bd --mono) exist there.

Original bug list (fixed):

- **Undefined CSS variables (expanded)**: `--blue`, `--fg3`, `--bg1`, `--mono`,
  `--bd`, `--bg-alt`, `--fg-muted` are referenced (components + dashboard.css
  itself at :627,746,903-1042,237) but defined nowhere → invisible dots,
  transparent dropdowns/backgrounds. Define aliases: `--blue: var(--accent)`,
  `--fg3/--fg-muted: var(--fg2)`, `--bg1/--bg-alt: var(--bg3)`,
  `--bd: var(--border)`, `--mono: var(--ff-mono)`.
- **Sparkline strokes can't consume `var()`**: uPlot/canvas `strokeStyle`
  requires resolved colors — `MiniChart.js:67` and TinySparkline
  (`ToolCardSections.js:20`) pass raw `var(--...)` strings → black lines on
  dark theme. Rule: resolve CSS vars via `getComputedStyle` before handing
  colors to canvas APIs (pattern: `AnalyticsChart.js:26-36`).
- Floating-point in Live Traffic legend — `ResourceBar.js:10-11,29,35` still
  lacks Number coercion.
- `fmtDur` now exists in 11 copies with a units conflict (seconds in
  session_detail/helpers.js vs milliseconds in session_flow//transcript/) —
  utils.js still has no duration formatter. Add `fmtDurSec`/`fmtDurMs`.
- `esc()` (utils.js:91) double-escapes — htm text interpolations are already
  escaped. Only real innerHTML sinks need escaping (and MiniChart's tooltip,
  the one such sink, doesn't escape).
- `.badge` is styled twice (dashboard.css:279 and :1525 modernization layer).

### Missing (ordered by impact, as of 2026-07-14 — see SKILL.md tracker #24-#29)
1. Keyboard-inoperable core controls: DataTable sort (`ui/DataTable.js:236`),
   Segmented arrow keys (`ui/Segmented.js:16`), TurnCard/EventsPanel/MemoryPanel
   expanders, ToolCardSections error badge (`:170`), mouse-only tooltips
   (DatapointTooltip, TabTimelineChart bars, ContextMap segments)
2. `/` shortcut steals focus from every non-header input (`app.js:63-68` —
   reuse `isTypingTarget` from `hooks/useTabs.js`)
3. aria-live REGRESSION: whole LiveSection metric grid announced
   (`ToolCardSections.js:232`) — remove; keep per-value pattern (Metric.js)
4. ARIA structure misuse: role="menu" without menu pattern (GlobalHeader,
   SessionCommitsBadge), role="listitem" on buttons (SeqVerticalTimeline),
   partial tablist (TabExplorer:168), CommandPalette missing
   aria-activedescendant, TeamTree/TaskBoard roles, MiniChart generic label +
   nested img role under ChartCard
5. `role="alert"` still absent on ErrorBoundary fallback (has role="status"
   via EmptyState) and on the CollectorHealth DATA-LOSS banner
6. Bare decorative triangles without aria-hidden (ToolCard, TabOverview,
   TabProcesses, TabMemory, FileTree, DashboardContent)
7. Color-only signals: TokenBar segments (TabBudget:24), ProcRow thresholds,
   ApiCalls/ToolCalls success dots
8. Toasts: no dismiss, 5s TTL, double SR announcement (ToastProvider + Toast)
9. Readability floor: `--fs-2xs`/`--fs-xs` (8.8/9.6px) used for real content;
   ContextMap `color:#111` over arbitrary palette; `_SF_FIXED` Bash `#1a1a1a`
   invisible on dark
10. Touch targets: 32px on `.range-btn`/`.header-toggle` (meets WCAG 2.2 AA
    24px minimum; 44px remains the target)

## Layout Structure (as of 2026-07-14)

```
GlobalHeader (shell/GlobalHeader.js)
  ├── title + filter + command palette (⌘K) + Views + density + theme + live pill
main
  ├── RangeBar (Live, 1h, 6h, 24h, 7d, Custom)
  ├── ActivityRail (left: active sessions)
  ├── tab bar (11 tabs; keyboard shortcuts cover 1-8 and 0 only)
  └── tab panel
       ├── overview  → CDashboardTab (editorial) | DashboardContent+CollectorHealth (default)
       ├── explorer  → CSessionsTab (editorial) | TabExplorer (default; 5 sub-views:
       │              SessionDetail / Flow / Transcript / Timeline / Events)
       └── procs, context, live, events, budget, analytics, heatmap, config,
           agents, prompts
file-viewer (overlay side panel, resizable)
```

Caveats: the theme fork means health/observability surfaces exist only in the
default branch (tracker #17); tab count exceeds shortcut coverage; two code
paths still reference a nonexistent `sessions` tab id (tracker #3).

## Revision Log

| Date | Change | By |
|------|--------|-----|
| 2026-07-14 | Fix campaign (15 commits, e33fcb4..ee8d930): security batch, session dedup, telemetry truth, monitoring robustness, dead-code purge (~1,400 lines), formatter/primitive consolidation, a11y batch, c-* shared CSS base, observability wiring (snapshot age, data-quality strip, ingesters, ConversationPanel, lifecycle pills, tool inputs), files-sync live. Known Bugs section converted to design rules; tracker rebuilt to post-campaign open set (13 items). | /ui-review fix |
| 2026-07-14 | Full-codebase review (7 parallel passes): tracker rebuilt (33 items), undefined-var scope expanded, canvas-var rule added, layout section updated to 11-tab/theme-fork reality, a11y Missing list refreshed. Full report: wip/reviews/2026-07-14-full-review.md | /ui-review |
| 2026-03-28 | ToolCard decomposition, ProcRow dedup, typography scale (commits 5d13edf, 49854a2) | /ui-review fix |
| 2026-03-28 | FileViewer focus trap, last hex colors, component ARIA (commit d93cf1a) | /ui-review fix |
| 2026-03-28 | State classes + canvas a11y (commit 550c4b7) | /ui-review fix |
| 2026-03-28 | Quick wins: a11y, color tokens, skip-link (commit d22795a) | /ui-review fix |
| 2026-03-28 | Full review: --blue/--fg3 scope widened (3 files), ProcessNode a11y, fmtDur duplication, 15 findings total | /ui-review |
| 2026-03-27 | Full review: found undefined --blue/--fg3, float bug, updated typography/spacing sections, expanded a11y gaps list | /ui-review |
| 2026-03-27 | Initial creation from codebase audit | /ui-review skill |

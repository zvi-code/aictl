# aictl Web Dashboard — Design System

Design tokens, component patterns, and accessibility status for the
`aictl daemon serve` web dashboard UI only. This does not cover the CLI, plugin
system, collectors, or other parts of the aictl project.

Living document maintained by `/ui-review`. Last updated: 2026-11-05.

> Path note: the package root moved to `src/aictl/` — UI sources are at
> `src/aictl/dashboard/ui/src/`. File references below use paths relative
> to that directory unless stated otherwise.

## Color Tokens

### Theme Variables (dashboard.css)

Dark is its own graphite palette, not an inversion of light. Elevation comes
from lighter surfaces and borders. Shadows are reserved for overlays
(`--shadow-2`); `--shadow-1` is `none` in both themes.

| Token | Dark | Light | Use |
|-------|------|-------|-----|
| `--surface-0` / `--bg` | `#15171a` | `#f5f6f7` | Page, nav rail |
| `--surface-1` / `--bg2` | `#1c1f23` | `#ffffff` | Panels, header |
| `--surface-2` | `#23272c` | `#eef0f2` | Hover, notices |
| `--surface-3` | `#2b3036` | `#e4e7ea` | Selected control, inline code |
| `--fg` | `#e7e9ec` | `#1a1d21` | Primary text and figures |
| `--fg2` | `#a9b0ba` | `#555d67` | Secondary text, labels (AA on every surface) |
| `--border` | `#2f343a` | `#d9dde1` | Panel and control edges |
| `--border-subtle` | `#25292e` | `#e8eaed` | Row separators |
| `--accent` | `#a3b5ff` | `#3a4fc2` | Links and the active-view marker only |
| `--green` | `#5bc48f` | `#0a6d43` | OK |
| `--red` | `#f28b88` | `#bf2f2d` | Error |
| `--orange` | `#eda75f` | `#a5540a` | Warning |
| `--yellow` | `#dcc065` | `#806000` | Chart series |
| `--on-status` | `#15171a` | `#ffffff` | Text on a status fill |

Rules: never dim text with `opacity` (use `--fg2`; opacity is for disabled
controls). Headings use `--fg`, not the accent. Chart hero figures use `--fg`:
the line carries the series color.

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

System stacks only: a local dashboard makes no font request. `--ff-sans` resolves to
San Francisco or Segoe UI Variable, `--ff-mono` to SF Mono or Cascadia Mono. The Google Fonts link loads only
when the editorial theme is chosen (`useTheme`). `body` sets
`font-variant-numeric: tabular-nums`, so every figure aligns. Labels use sentence
case; the uppercase tracked treatment is gone outside the editorial theme.

| Token | Size | Use |
|-------|------|-----|
| `--fs-2xs`, `--fs-xs` | 11px | Labels, badges, chart annotations (the floor) |
| `--fs-sm` | 12px | Dense tables, controls, secondary text |
| `--fs-base`, `--fs-md` | 13px | Body, tables, nav |
| `--fs-lg` | 14px | Emphasis, panel titles |
| `--fs-xl` | 16px | Metric values |
| `--fs-2xl` | 20px | Chart hero values |
| `--fs-3xl` | 24px | First-screen figures |

## Spacing

`--sp-1 2px`, `--sp-2 4px`, `--sp-3 6px`, `--sp-4 8px`, `--sp-5 10px`, `--sp-6 12px`,
`--sp-8 16px`, `--sp-10 20px`, `--sp-12 24px`, all multiplied by `--density`
(`data-density` compact 0.85, normal 1, spacious 1.15). Radius: `--radius-sm 4px`
for controls, `--radius-md 6px` for panels, `--radius-lg 8px` for overlays.

## Tools and paths

Tool lists are ordered by activity (`utils/tools.js`): live sessions, then processes,
then tokens, then name. No tool name decides the order. Lists show labels, not ids.

Paths render with their own separator (`utils/paths.js`). Drive letters and UNC
shares are kept, and `~` is used for POSIX paths only.

A cloud-hosted tool with no local data shows `CloudOnlyNotice` ("Not available from
this machine", with the reason), never a zero or an empty chart; a `local_data` config with every flag false declares this. `cost_usd` may be null, shown as "n/a" with `cost_reason` on hover (`utils/cost.js`). Billing units lead; dollar figures are
list-price estimates and are labelled so. Panels with no per-tool split show `AllToolsNote` under a tool filter.

## Panel states

Every data panel has four distinct states, through `components/ui/PanelState.js`
and `panelStatus()`:

| State | Shown when | Must say |
|-------|-----------|----------|
| loading | first fetch, no data yet | a skeleton, `aria-busy` |
| empty | fetch succeeded, nothing to show | why it is empty and what to do, with the command if there is one |
| error | fetch failed, no data | the message and a Retry button |
| stale | refresh failed or data is old, data kept | the data plus its age and Retry |

`usePolledResource` keeps the last good data across a failed refresh and pauses
polling while the page is hidden. A session with `content_retained: false` uses
`components/ui/TextNotRetained.js`: a fifth, deliberate state naming the capture
mode and how to change it. It is neither empty nor an error.

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

`1`-`9`, `0`, `-`, `h`: views, printed beside each nav entry. `[` and `]`: previous
and next view. `/`: focus the filter. Ctrl+K or ⌘K, labelled per platform: command palette (views, range, tools,
live sessions, themes, density). `?`: shortcut list. `Esc`: close panels. All are
ignored while typing in a field.

### URL state

`?tab=&range=&since=&until=&tools=&session=` is the view's state and wins over
localStorage on load (`hooks/urlState.js`). Tab changes push history, so Back
works; filter changes replace it. Retired tab names resolve through `TAB_ALIASES`.

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

## Layout Structure (as of 2026-11-05)

```
header   aictl | range, tool filter (scope for every panel) | filter, commands, views, theme, status
nav      Monitor: Overview, Hidden context, Live, Processes, Events
         Sessions: Explorer, Agents, Prompts
         Spend: Budget, Analytics
         Setup: AI context, Configuration
main     the active view; scroll position is kept per view
```

Below 900px the rail becomes a scrolling strip. At 640px and under, wide tables and
panels scroll inside themselves, and the page never scrolls sideways.

The Overview opens with `OverviewNow`: Running now (sessions with age, CPU, RAM,
tokens), Cost for the last 24 h, and Needs attention (`utils/health.js`, each issue
with its exact fix, capture mode and disk use against budget, unseen context).

`components/HiddenContextSlot.js` reserves the Hidden context view. It finds
`HiddenContextPanel.js` by glob and works with or without it. That module may export
`getHiddenContextSummary(): Promise<{count, detail?}>`; otherwise Needs attention reads `/api/context-audit`.

Every view except the Overview is a lazy chunk; ECharts is reachable only through
them. SSE ticks are coalesced to one update per second and paused while the page is
hidden. Views outside `LIVE_TABS` refresh every 30 s (`utils/gateContext.js`).

The editorial theme remains, reachable from the command palette only, because it
also swaps views.

## Revision Log

- 2026-11-05: grouped navigation, first screen, URL state, panel states, new tokens and scales, lazy tabs, capture-mode and hidden-context surfaces. Activity rail removed: it read a session list the backend does not send and always showed none.

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

## Board (default screen)

The default screen lives in `components/board/` with its own stylesheet `board.css`; every class is
prefixed `bd-`, and every color is a token on `.bd-app` (`--page`, `--surface`, `--ink`, `--ink2`, `--ink3`,
`--line`, `--s1` to `--s5`, and so on) with a light set under `[data-theme=light]`. Components never name a
color. Old screens load through `?tab=` with `dashboard.css`; `root.js` loads one or the other and reloads the
page when the route crosses between them, so the two stylesheets are never active together.

- Layout: one 12-column grid per section, stored under `aictl-board-layout-v1`. `layout.js` adds new panels to
  a stored layout and drops removed ones.
- Tables: `Table.js` with `tableModel.js` for every panel and the drawer. Charts: `Chart.js`, plain SVG, with
  one shared tooltip (`tip.js`) written straight to the DOM, so hover renders no component.
- Null from the API shows as `n/a` through `format.js`. A share or rate from the API is a ratio from 0 to 1.
- Filters and time live in the URL (`filters.js`, `hooks/useBoardFilters.js`). Each choice is one history entry.
- Every drag has a keyboard route: panel menu for move and size, section buttons for order, arrow keys on a
  chart for the time selection.

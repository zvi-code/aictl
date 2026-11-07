# aictl Web Dashboard — Design System

Design tokens, conventions and accessibility notes for the web dashboard served by
`aictl daemon serve`. The UI has one screen, the board, and a Settings screen inside it.
Sources are under `src/aictl/dashboard/ui/src/`; paths below are relative to that directory.

Living document maintained by `/ui-review`. Last updated: 2026-11-08.

## Files and prefixes

| Stylesheet | Class prefix | Scope |
|------------|--------------|-------|
| `components/board/board.css` | `bd-` | The board shell, panels, tables, charts, drawers, palette |
| `components/settings/settings.css` | `st-` | The Settings screen |
| `components/ui/markdown.css` | `md-` | Rendered Markdown |
| `components/ui/ui.css` | `aictl-ui-` | The Segmented control only |

## Color tokens

Tokens are custom properties on `.bd-app`. The dark set is the default; the light set is under
`.bd-app[data-theme=light]`. Components never name a color: a guard test in `test/board.test.js`
fails when a file in `components/board/` contains a hex or `rgb()` value.

| Token | Dark | Light | Use |
|-------|------|-------|-----|
| `--page` | `#0d0d0d` | `#f4f4f1` | Page background |
| `--surface` | `#1a1a19` | `#fcfcfb` | Panels, rail |
| `--raise` | `#242423` | `#ffffff` | Raised controls, menus |
| `--hover` | `#232322` | `#f0efeb` | Row and control hover |
| `--sel` | `#2e2e2c` | `#e6e5df` | Selected row or control |
| `--ink` | `#f0efec` | `#0b0b0b` | Primary text |
| `--ink2` | `#c3c2b7` | `#3d3c39` | Secondary text |
| `--ink3` | `#a3a199` | `#62615c` | Labels, hints |
| `--line` | `#2c2c2a` | `#e7e6e0` | Row separators |
| `--line2` | `#383835` | `#c9c8c0` | Panel and control edges |
| `--focus` | `#6da7ec` | `#256abf` | Focus ring, links, active marker |
| `--warn`, `--warnink`, `--warnbg` | amber set | amber set | Warning text and fill |
| `--crit` | `#e66767` | `#b52b2b` | Error |
| `--good` | `#2fbf2f` | `#0a7a0a` | OK |
| `--s1` to `--s5` | blue, orange, green, amber, pink | lighter set | Chart series |
| `--add`, `--addink`, `--del`, `--delink` | diff fills | diff fills | Added and removed lines |
| `--onfill`, `--scrimbg`, `--shadow` | | | Text on a fill, overlay scrim, overlay shadow |
| `--row` | 27px | 27px | Table row height |

Rules: never dim text with `opacity`; use `--ink2` or `--ink3`. Series colors come from `--s1` to
`--s5` in order. Status is never color alone; it carries a word or a mark.

## Theme and density

`useTheme` stores `auto`, `dark` or `light` under `aictl-theme`. The board resolves `auto` from
`prefers-color-scheme` and sets `data-theme` on `.bd-app`. The Display menu offers Dark and Light.
Density is `compact` (default) or `comfortable` (`--row` 34px, 14px text), set with `data-density`.
Text uses IBM Plex Sans; code and figures use IBM Plex Mono, with system fallbacks.

## Tokens in the other stylesheets

`settings.css` reads local `--st-*` tokens. Inside `.bd-app` they map to the board tokens
(`--st-fg` to `--ink`, `--st-bg` to `--surface`, `--st-border` to `--line2`, `--st-accent` to `--focus`,
`--st-red` to `--crit`, `--st-orange` to `--warn`, `--st-green` to `--good`).
`markdown.css` does the same with `--md-*` (`--md-fg` to `--ink`, `--md-border` to `--line2`,
`--md-accent` to `--focus`).

## Layout and panels

- One 12-column grid per section. Panel widths are 3, 4, 6, 8 or 12 columns.
- The default sections are Agents, Usage and cost, Prompts and skills, Context, Tools failures and
  speed, Changes and testing, Machine, Settings in effect, and Where the data comes from.
- The arrangement, folded state, hidden panels, hidden columns, density and rail width are stored
  under `aictl-board-layout-v1`. `layout.js` adds new panels to a stored layout and drops removed ones.
- Tables use `Table.js` with `tableModel.js`. Charts use `Chart.js` (plain SVG) with `chartModel.js`
  and one shared tooltip (`tip.js`) written straight to the DOM.
- A null from the API shows as `n/a` (`format.js`). A share or rate from the API is a ratio from 0 to 1.
- Every drag has a keyboard route: the panel menu for move and size, section buttons for order,
  arrow keys on a chart for the time selection.

## URL state

State lives in the query string, so a copied link shows the same view. Each filter choice is one
history entry; typing in the find box replaces the entry.

| Key | Meaning |
|-----|---------|
| `screen` | `settings` opens the Settings screen; absent means the board |
| `agent` | Opens that session in the agent drawer |
| `range` | `15m`, `1h`, `6h`, `24h` (default), `7d`, `30d`, or `custom` |
| `since`, `until` | Seconds since the epoch, with `range=custom` |
| `sel` | A selected time inside the range, `since-until` |
| `tools` | Comma list of tool ids; empty means none; absent means all |
| `project`, `model` | Filter by project or model |
| `status` | `active`, `running`, `looping`, `waiting`, `idle`, `ended` or `failed` |
| `q` | The find box text |

Settings screen keys:

| Key | Meaning |
|-----|---------|
| `pivot` | `tool` (default), `topic`, `files` or `findings` |
| `tool` | Tool selected; in Files, a comma list (Read by) |
| `sec` | Section id, location or rule; in Files, a comma list (Location) |
| `row` | Setting key, file path or finding id |
| `scope` | Show only rows set at one layer in By tool |
| `unset` | `1` shows the settings no file sets |
| `group` | Files grouping, `location` (default) or `purpose` |
| `purpose`, `fscope`, `git`, `recent`, `cell` | Further Files filters |

### Old links

`root.js` rewrites an old link in place, so Back does not return to it.

| Old link | Result |
|----------|--------|
| `?tab=config` or `?tab=configuration` | `?screen=settings` |
| `?tab=explorer&session=<id>` (also `sessions`, `session-explorer`) | `?agent=<id>` |
| `?tab=hidden` | Kept; the board opens the hidden-context drawer |
| Any other `?tab=` | The key is dropped and the board opens |

The `aictl:select-session` DOM event also opens that session in the agent drawer.

## Keyboard

| Key | Action |
|-----|--------|
| `Cmd/Ctrl+K` | Open or close the command palette |
| `/` | Focus the find box |
| `1` to `9` | Go to that section |
| `[` and `]` | Previous and next section |
| `s` | Open Settings |
| `?` | Show the shortcuts dialog |
| `Esc` | Close the palette, dialog, menu or top drawer, in that order |

Keys other than `Cmd/Ctrl+K` and `Esc` do nothing while focus is in a field. The palette lists
commands by group (Go to, Screens, Help and more), puts the commands used last first, and
moves with the arrow keys.

## Accessibility

- Focus ring: 2px `--focus` on buttons, links and inputs (`:focus-visible`).
- The command palette is a combobox with a listbox of options and `aria-activedescendant`.
  The palette and the shortcuts dialog trap focus and return it to the opener on close.
- The shortcuts dialog is `role=dialog` with `aria-modal`.
- Sortable table headers carry `aria-sort`. Range and view buttons carry `aria-pressed`;
  current rail and Settings items carry `aria-current`.
- A chart plot is focusable. Left and right arrows read each time, Shift with an arrow marks a time,
  Enter selects it, Escape clears it.
- The Segmented control is a `radiogroup` of `radio` buttons; arrow keys move the choice.
- The rail has `aria-label` landmarks; the drawer is an `aside` labelled with its title; the app root
  sets `aria-busy` while data loads.
- Loading and empty notes use `role=status`. `utils/a11y.js` provides `announce()`, one shared
  `aria-live` region, and `focusTrap()`.
- `test/board.test.js` and `test/a11y.test.js` run axe over the board (the color-contrast rule is off) and test Segmented keyboard use.
- Not present: a skip link and a `prefers-reduced-motion` rule in `board.css`.

## Tools and paths

Tool lists are ordered by activity (`utils/tools.js`): live sessions, then processes, then tokens,
then name. Lists show labels, not ids. Paths render with their own separator (`utils/paths.js`);
drive letters and UNC shares are kept, and `~` is used for POSIX paths only.

## Revision log

| Date | Change | By |
|------|--------|-----|
| 2026-11-08 | The old shell was removed; the board is the only UI. This document now covers the board and Settings screen only. | claude-sonnet-5-5 |
| 2026-07-14 | Fix campaign (15 commits, e33fcb4..ee8d930): security batch, session dedup, telemetry truth, monitoring robustness, dead-code purge (~1,400 lines), formatter/primitive consolidation, a11y batch, c-* shared CSS base, observability wiring (snapshot age, data-quality strip, ingesters, ConversationPanel, lifecycle pills, tool inputs), files-sync live. Known Bugs section converted to design rules; tracker rebuilt to post-campaign open set (13 items). | /ui-review fix |
| 2026-07-14 | Full-codebase review (7 parallel passes): tracker rebuilt (33 items), undefined-var scope expanded, canvas-var rule added, layout section updated to 11-tab/theme-fork reality, a11y Missing list refreshed. Full report: wip/reviews/2026-07-14-full-review.md | /ui-review |
| 2026-03-28 | ToolCard decomposition, ProcRow dedup, typography scale (commits 5d13edf, 49854a2) | /ui-review fix |
| 2026-03-28 | FileViewer focus trap, last hex colors, component ARIA (commit d93cf1a) | /ui-review fix |
| 2026-03-28 | State classes + canvas a11y (commit 550c4b7) | /ui-review fix |
| 2026-03-28 | Quick wins: a11y, color tokens, skip-link (commit d22795a) | /ui-review fix |
| 2026-03-28 | Full review: --blue/--fg3 scope widened (3 files), ProcessNode a11y, fmtDur duplication, 15 findings total | /ui-review |
| 2026-03-27 | Full review: found undefined --blue/--fg3, float bug, updated typography/spacing sections, expanded a11y gaps list | /ui-review |
| 2026-03-27 | Initial creation from codebase audit | /ui-review skill |

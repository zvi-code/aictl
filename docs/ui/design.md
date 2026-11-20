# Dashboard UI design

Use this guide to build the Solid dashboard. Write new components in strict TypeScript and TSX. Preserve the user outcomes in the [parity inventory](/docs/ui/spec.md), not the Preact implementation. Rule IDs refer to section 5 of the rewrite plan.

Phase 1 provides the tokens, primitives and development gallery. Phase 2 adds the generated contract types, store, live transport and detail resources. Phase 3 adds the production panel registry, default layout JSON and dockview board. Phase 4 moves the session drawer and its tabs; phase 5 moves Settings and removes the migration bridges.

## Tokens and themes

Use the [token definitions](/src/aictl/dashboard/ui/src/design/tokens.css) in every component CSS Module. For example, use `padding: var(--space-4)` and `color: var(--color-text)`. Do not use literal pixel values or colors in CSS Modules.

- Use the fixed scales: **8 spacing steps** (`--space-1` through `--space-8`), **7 font sizes** (`--text-xs` through `--text-3xl`), and **4 radii** (`--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill`).
- Use `--font-ui` (Inter) for UI text and `--font-mono` (JetBrains Mono) for code. Use tokens for borders, focus, elevation, stacking order and motion. The duration tokens drop to zero when the user requests reduced motion.
- Light is the `:root` default. Set `data-theme="dark"` on the document element for dark mode. Use the same semantic token in both themes; do not branch on theme in a component stylesheet. For canvas colors, read the computed token value.

## Choose a primitive

Use the [Solid primitives](/src/aictl/dashboard/ui/src/ui). Each has a TSX component and a CSS Module.

| Primitive | When to use it |
|---|---|
| `AppShell` | Give the page a `title`. Put navigation, header controls and footer text in `navigation`, `actions` and `status`; the skip link leads to the main `children`. |
| `Panel` | Give content a `title`, `size` and optional `actions`. Set `active` from tab visibility; keep viewport observation on. Each panel has its own `Loading` and `Errored` boundaries. |
| `PanelState` | Set `state` to `loading`, `empty`, `error`, `unavailable` or `stale`. Pass the same result's `updatedAt` in epoch seconds to the stale notice; use `Freshness` for a summary outside a notice. Omit the timestamp if the source cannot supply it. Override `message` or supply `onRetry` when appropriate. Only `stale` renders its `children` beneath the notice. |
| `Stat` | Show a `label` and `value`, with optional `unit`, `detail` and `tone`. Leave a missing value absent; zero is a value. |
| `Table` | Give the sortable table a `label`, `fields`, `rows` and stable `rowId`. Set `pageSize` for document-flow paging, or omit it for a virtualized scroll area. Supply `action` for a named row button, or a field `action` for an actionable cell value. |
| `Chart` | Pass `series` and `points` to uPlot. Give the plot a `label` and text `description`; use `xAxis`, `unit` and `yRange` to describe the scale. |
| `Segmented` | Choose one option in a labelled radio group. Supply `options`, `value` and `onChange`; arrows change the selection. |
| `Tabs` | Switch between content views. Supply `label`, `items`, `value` and `onChange`; arrows move focus and only the selected item's `content` mounts. |
| `Menu` | Use a `label` for the trigger and `items` with `onSelect` for commands. Mark unavailable commands `disabled`. |
| `Popover` | Show supplementary `children` without blocking the page. Use `label` for the trigger and `title` for the surface. |
| `Tooltip` | Give an action button a `label`, an `onClick` handler and short `text` shown on hover or focus. Escape dismisses the hint. |
| `Drawer` | Show non-modal detail. Supply `title`, `open` and `onClose`; use `id` to associate the opener with the drawer. |
| `Dialog` | Use a modal for a decision. Supply `title`, `open` and `onClose`; put decision buttons in `actions`. |
| `Icon` | Pass Lucide icon `data`. Omit `label` for decoration; supply it when the icon itself conveys meaning. |
| `Markdown` | Render `text` as Markdown, not raw HTML. Use `headingOffset` to fit the surrounding heading levels. |
| `CodeView` | Show literal `text`. Set `label` for the scroll area; use `firstLine`, `highlight`, `wrap` or `copy` when needed. |

Use `empty` only after a successful read finds no matches. Use `unavailable` when the source cannot supply the value, and `error` when a read fails with no usable result. During refresh, keep the last usable result **for the same key** and mark it `stale` if it is no longer current. Render ready content directly; `ready` is not a `PanelState` value.

## Add a primitive

1. Check the catalogue first. If no primitive fits, add a typed Solid component and matching CSS Module beside the other primitives. Keep parsing, sorting and formatting separate from rendering.
2. Add every state to the [gallery source](/src/aictl/dashboard/ui/src/gallery/main.tsx). Use `data-gallery` for the primitive name and `data-state` for each example. Use the recorded samples for data. The [gallery entry](/src/aictl/dashboard/ui/gallery.html) is for development only.
3. Test pure logic in Vitest and user interactions in Playwright. Check both themes and keyboard use before adding the primitive to a screen.

## Add a panel (phase 3)

Use the [production registry](/src/aictl/dashboard/ui/src/panels/registry.ts). Do not edit the registry to add an ordinary panel.

1. Add a `PanelDef` to [Overview A](/src/aictl/dashboard/ui/src/panels/overview/a.ts) for BRD-01–20, [Overview B](/src/aictl/dashboard/ui/src/panels/overview/b.ts) for BRD-21–39, or [Health](/src/aictl/dashboard/ui/src/panels/health/index.ts) for HLT-01–10. Use the existing ID in [board.json](/src/aictl/dashboard/ui/src/panels/layouts/board.json) or [health.json](/src/aictl/dashboard/ui/src/panels/layouts/health.json). For a new ID, add `{ "id": "...", "params": {} }` in the correct `tree` section. Panels in a band share a height and divide its width by `span` (use a total of 12 for explicit spans). Bands stack vertically. An optional `height` overrides that panel's size hint in CSS pixels. The tallest hint in the band sets its height. Check that default table and list panels show several rows at 1440 × 900 without resizing.
2. Set `id`, `title`, `kind`, `sources`, `columns`, `actions`, `defaultSize` (`small`, `medium`, `large`), and `requiredCapabilities`. A board source uses `{ field, path? }`; a live source uses `{ topic, entity?, path? }`. Paths are dot-separated contract fields. `columns` uses `{ path, datapoint?, label? }`. Set `datapoint` to the catalog key for labels, units and formats. Use `label` only when the catalog does not have the display label or when several columns share one catalog key.
3. Use `table` or `list` for virtualized rows. The stream supplies row IDs; declare `rowIdentity` with the same contract key fields for scoped HTTP reads. The renderer adds a Node column in node and fleet scope when rows contain `node_id`. Use `actions` to open an agent (`field`, optional `tab` or `tabs`) or to toggle a project, model or status filter. Use `stat` for named scalar values. For `chart`, set `chart.x` to the axis source; column paths select equal-length arrays from the primary source. Set `time`, `stack`, and `select` where applicable. Use `wholeRange: true` on the series and x sources for a board-range brush.
4. Use `kind: 'custom'` and `load: () => import('./PanelName')` only when the generic renderers do not fit. Put the default `Component<PanelProps>` next to its group. `ctx.read(source)` gives the state, value and row IDs; `ctx.board(field)` gives the generated field type. Use `ctx.detail<T>(pathAccessor)` for keyed, shared and cancellable detail reads. Use `ctx.openAgent`, `openDetail`, `navigate`, `select`, `stopAgent`, and `runCommand` for shell actions. The dock mounts the panel only when its tab and content are visible.
5. Add replay assertions with the inventory row ID. Verify the default section, keyboard actions, unavailable versus zero, empty and stale results, and applicable scope. For a virtualized table, assert the correct row identity and that scrolling reaches rows beyond the first window. For a chart, test chart/table switching and the brush if enabled.

- **L4 — Register once.** Give the entry an ID, title, sources, kind, column field references, actions, default size, required capabilities and an optional lazy module. Prefer table, chart, stat or list. Explain why a custom kind needs its own renderer.
- **V1 — Show numbers and charts, not text.** The dashboard is visual. Lead a panel with `stat` values and charts. Show ratios and fill levels as meters or bars with status colors from the tokens, not as sentences. Use a table only for list data, and show its numeric columns as numbers. Keep prose for short labels, empty states and diagnostic detail. This applies to Health as much as to the board.
- Lead the default Overview with the KPI strip and Usage charts, with both chart canvases in the first 1440 × 900 viewport. Keep text-led inspection and drilldown panels below them. See the [visual follow-up list](spec.md#phase-3-visual-follow-up).
- In Overview’s Agents section, keep the primary name visible, wrap it as needed, and keep secondary metrics in **Columns**. Page through the rows in document flow. Right-align compact, tabular numeric values and distinguish `N/A` from zero. When there are no attention rows, show a compact source status with the known update time rather than empty summaries; stale or missing results are not an all-clear.
- **L1 — Place by ID.** Store each default layout as versioned JSON in the repository. Include the screen and the dockview tree with panel IDs and parameters. Let users rearrange, resize, stack and hide panels.
- **L2 — Save per screen.** Save the user's layout in browser `localStorage`. Provide reset to default. Do not write a user layout file or add import or export.
- **L3 — Restore by ID.** Drop unknown IDs on restore. Offer eligible panels missing from the layout in the **Add panel** menu.
- Overview panels participate in page scrolling and are not vertical scroll containers. Arrange, resize, stack, hide, add, or reset panels in **Edit layout**; use the arrow buttons to reorder in reading order. Panel heights in Overview are minimums when set by the user, not clipping boundaries.
- **P3 — Keep the box stable.** Only user actions change panel geometry. Render all five `PanelState` values in the content box and use `tabular-nums` for numbers. Keep live table values aligned to the start of the cell so a change in digit count does not move the text.
- **P6 — Stop hidden work.** Use `contain: content`. Unmount content when the panel is off screen or its tab is inactive. Release its detail resources; keep the outer box.
- **P7 — Load on demand.** Give each screen, drawer tab and optional panel its own lazy chunk.

Keep the KQL editor and in-page agent help out of production in these phases. A future editor would use one lazy registry entry and a query route gated by `query_languages`; a future help panel would reuse the live transport. Do not add a second connection or ship the gallery example.

## Live data and load time

Apply these rules when phase 2 adds the data layer. Key detail reads by their request parameters. Share duplicate requests, cancel obsolete ones with `AbortController`, and refresh only on related live changes.

- **P1.** Read a live store property in the cell, stat or row that displays it. Do not subscribe the whole board for a single value.
- **P2.** Key the Solid store by topic and entity ID. Coalesce pending changes per entity, even in a hidden browser tab. Apply one batch per animation frame. Work must scale with changed entities, not total store size.
- **P4.** Virtualize unbounded lists. Use the contract row identity, not an array index or display label. See `_ROW_KEYS` in the [live projection](/src/aictl/dashboard/live_projection.py).
- **P5.** Update a chart in place with `setData`. Limit resize work to one animation frame at a time; do not rebuild the plot for new samples.
- **P8.** Respond to input before the network replies. Show a pending state as soon as the user starts an action.
- **P9.** Treat main-thread work over 16 ms as a defect. Measure the operation before moving it to a Web Worker.
- **F1.** Keep only the shell, store and transport in the entry chunk. Open one `EventSource` per browser tab on `/api/live/stream` before loading screen code so both can load in parallel.
- **F2.** Build Brotli (`.br`) and gzip (`.gz`) copies beside each hashed asset. In phase 2, serve the matching copy for `Accept-Encoding`. Use `immutable` caching for hashed assets; serve the entry HTML with `no-cache` and an ETag.
- **F3.** Extract CSS Modules at build time. Do not generate styles with runtime CSS-in-JS.

## Storage-schema independence

- **S1.** Use contract fields, never storage table or column names. Keep KQL templates on the backend, not in UI components.
- **S2.** In phase 2, generate payload types from the JSON Schemas. Do not write parallel TypeScript payload definitions.
- **S3.** Ignore unknown fields. Show “Not available from this source” for a missing field. Do not replace it with zero or an empty result.
- **S4.** Take labels, units and formats from field metadata. Use `/api/datapoints` and the [datapoint catalogue](/docs/datapoint-catalog.csv); do not infer units from field names.
- **S5.** Select panels by advertised capabilities. Do not test the storage backend's name.

## Accessibility and tests

Give every action a keyboard route, including move and resize. Keep focus visible. Give scrollable regions an accessible name and a tab stop (`tabindex={0}` in TSX). Check focus on opening and closing overlays: a modal keeps focus inside; a non-modal drawer must not trap it. Do not rely on color alone for status.

Run these commands in the [UI package directory](/src/aictl/dashboard/ui). The [package scripts](/src/aictl/dashboard/ui/package.json) define the runners.

| Command | What it checks |
|---|---|
| `npm test` | Runs `tsc --noEmit && vitest run`. Use the Node Vitest project for pure modules such as table ordering and missing-value formatting. |
| `npm run test:watch` | Runs `vitest` in watch mode. |
| `npm run build:ui-test` | Build the screen assets for replay before running the full browser suite. This does not replace the tracked build. |
| `npm run test:ui` | Runs `playwright test` in Chromium against the gallery and screens. For the gallery alone, use `npm run test:ui -- --project=gallery`. |

Put browser checks in the [Playwright specs](/src/aictl/dashboard/ui/test/e2e). Use the [replay server](/src/aictl/dashboard/ui/test/replay/server.mjs), not a live store. Run axe with **color contrast enabled** in light and dark themes. Exercise keyboard actions and open overlays. Check platform-specific screenshots, console errors, overflow, layout shifts and long tasks. Compare screen results with the [migration baseline](/docs/migration/ui-baseline.md).

## Replace and remove

- **R1.** Delete the replaced code in the same PR. Do not keep a feature flag or fallback.
- **R2.** Use the contract from the daemon that ships the UI. Do not support old daemons or payload shapes.
- **R3.** Allow only the temporary Preact island host and old-subscription adapter. Delete both in phase 5.
- Phase 5 removes the island stylesheet. Use tokens and CSS Modules for Solid screens and panels.
- **R4.** Move pure modules with `git mv`, then convert them to TypeScript. Do not copy them.
- **R5.** Report lines added and deleted for UI source, CSS, UI tests, backend and backend tests in each PR. Each cutover phase must delete more lines than it adds.
- **R6.** Before deleting a test, identify its behavior in the parity inventory and cover it with a replacement test.

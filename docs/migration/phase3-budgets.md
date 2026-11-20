# Phase 3 dashboard UI budgets

This report compares Solid Overview with the [phase 0 Preact baseline](ui-baseline.md).
It uses the same quiet and busy `main` recordings, 1440 × 900 viewport,
Windows 10.0.26300, AMD Ryzen AI Max+ 395, Chromium headless shell
158.0.8127.18 and Node 26.13.0. The 2026-11-20 final build completed
all 20 serial timing runs. The heap replay stopped at minute 21; the
DOM sweep, CDP inspection and final UI test chain did not run on this
build. The Phase 0 measurements overlapped other work. Replay and browser
probes are part of both measured workloads.

## Reproduce

From `src\aictl\dashboard\ui` in PowerShell:

```powershell
$env:TEMP = (Resolve-Path node_modules\.cache).Path
$env:TMP = $env:TEMP
$env:UI_DIST = 'node_modules\.cache\p3-clean-final'
$env:UI_BASELINE_OUTPUT = 'node_modules\.cache\p3-clean-final-timing.json'
$env:UI_HEAP_OUTPUT = 'node_modules\.cache\p3-clean-final-heap.json'
$env:UI_HEAP_MINUTES = '45'
$env:UI_HEAP_SNAPSHOTS = '15,45'
$env:UI_DOM_OUTPUT = 'node_modules\.cache\p3-clean-final-dom.json'
$env:UI_INSPECT_OUTPUT = 'node_modules\.cache\p3-clean-final-inspect.json'
npm run build:ui-test -- --outDir $env:UI_DIST --manifest
node test\replay\baseline.mjs
node test\replay\heap.mjs
node test\replay\dom-rows.mjs
node test\replay\inspect.mjs
```

Use the scripts' defaults except for the heap settings shown above. Overview and Health first render the saved
or default Dockview tree in CSS Grid. The editor and its CSS load on
the first layout edit that needs Dockview, not on startup. The static
renderer uses the same visibility and panel roots during the handoff.
Panel adapters, the chart-to-table view, and Health bar paths load only
when needed. Findings and the live panels reserve stale-notice space.
The tape predates `/api/datapoints`; the harness serves keys and units
from the checked-in catalog. No replay recording was changed.

For timing, use five fresh contexts per tape and speed, a 60-second
tracking window, and eight Ctrl+K interactions per run. First paint means
the first usable Messages KPI after a rendering opportunity. Message to
paint matches visible daemon CPU and RAM against recorded SSE values,
starting at browser receipt, so network time is excluded. The one-frame
probe checks the committed DOM at the next rendering opportunity; the
legacy probe waits another frame. Neither is a compositor timestamp.
Superseded values are not counted. The timing run scrolls to the daemon
panel after first data; heap and two-tab checks leave Overview at its
starting scroll position.

## Initial assets

The table pairs the Phase 0 results with the busy 1x Phase 3 medians.
Count Brotli bodies (`encodedBodySize`) and transfer including the header
allowance (`transferSize`) before first data paint. Measure parsed UTF-8
source separately through CDP. These figures exclude fonts and assets
loaded after the cutoff; parsed source does not measure compiled code.

| Asset | Baseline Brotli / transfer bytes | Phase 3 Brotli / transfer bytes | Baseline → Phase 3 parsed source bytes |
|---|---:|---:|---:|
| JavaScript | 97,517 / 98,117 | 73,088 / 78,488 | 332,923 → not rerun |
| CSS | 12,052 / 12,352 | 6,343 / 8,743 | 73,810 → not rerun |

| Condition | Initial JS Brotli range (B) | Initial CSS Brotli range (B) |
|---|---:|---:|
| Quiet 1x | 73,088–92,957 | 6,343–6,888 |
| Quiet 10x | 73,088–92,957 | 6,343–6,888 |
| Busy 1x | 73,088–92,957 | 6,343–6,888 |
| Busy 10x | 73,088–92,957 | 6,343–6,888 |

No run fetched Dockview or its stylesheet. The range depends on whether
uPlot (19,869 B JS and 545 B CSS Brotli) finished by the data-paint cutoff.
Both Brotli limits pass even at the observed maxima. JS transfer with
headers is separate and is not the budget measure. The previous build's
separate CDP inspection counted 19 scripts and nine stylesheets,
including uPlot. The new build's inspection did not run.

## Timing and layout

Each paired cell is **Phase 0 → Phase 3**. First paint has one sample per
run. Latency percentiles pool matches across runs and use nearest-rank
p95. Counts and CLS give the median and range across the five runs.

| Metric | Quiet 1x | Quiet 10x | Busy 1x | Busy 10x |
|---|---:|---:|---:|---:|
| First board paint, median / p95 (ms) | 45,662.9 / 45,833.6 → 45,144.3 / 45,303.8 | 5,184.6 / 5,330.0 → 4,588.0 / 4,650.8 | 4,073.1 / 4,503.1 → 3,602.8 / 3,643.9 | 1,244.5 / 1,340.9 → 502.7 / 716.7 |
| Message to paint, legacy proxy, median / p95 (ms) | 136.1 / 147.7 → 27.5 / 37.4 | 95.0 / 156.2 → 30.2 / 41.8 | 121.4 / 183.5 → 26.1 / 31.6 | 119.7 / 267.8 → 31.5 / 47.6 |
| Message to paint, one-frame proxy, median / p95 (ms) | 11.0 / 19.9 | 14.2 / 26.6 | 10.8 / 15.8 | 15.3 / 30.6 |
| Matching message samples, both proxies | 5 → 10 | 15 → 165 | 10 → 10 | 15 → 190 |
| Palette open to paint, median / p95 (ms) | 83.9 / 113.8 → 16.2 / 40.4 | 82.9 / 115.3 → 17.9 / 75.3 | 76.9 / 119.7 → 24.6 / 40.7 | 69.7 / 103.7 → 23.7 / 38.5 |
| Long tasks over 50 ms, median [range] per run | 70 [58–77] → 0 [0–2] | 307 [254–359] → 1 [0–2] | 62 [54–87] → 0 [0–2] | 243 [136–319] → 0 [0–0] |
| Long-task duration p95 / max (ms), over 50 ms only | 124 / 245 → 129 / 129 | 144 / 430 → 104 / 104 | 193 / 666 → 79 / 79 | 194 / 1,674 → none |
| Renderer tasks over 16 ms, median [range] per run | 113 [109–118] → 5 [0–7] | 451 [435–465] → 10 [2–15] | 121 [119–126] → 7 [4–9] | 529 [519–561] → 8 [2–10] |
| Renderer task duration p95 / max (ms) | 87.6 / 245.3 → 41.3 / 41.3 | 107.0 / 430.9 → 57.1 / 81.4 | 155.2 / 666.9 → 38.0 / 47.0 | 136.7 / 1,674.3 → 40.0 / 42.8 |
| Post-data CLS, median [range] | 0 [0–0] → 0 [0–0] | 0.712688 [0.712688–0.712688] → 0 [0–0] | 0.025042 [0.000003–0.025042] → 0 [0–0] | 0.025045 [0.025045–0.025733] → 0 [0–0] |
| DOM elements at end, median | 15,813 → 1,029 | 15,813 → 1,029 | 15,825 → 1,122 | 15,918 → 1,122 |

First board paint includes the recorded history delay (45.047 s quiet and
3.406 s busy at 1x), not just UI work. At 1x each tape produced ten matched
CPU/RAM updates. The palette result covers 40 Ctrl+K openings per condition,
not all dashboard interactions. The earlier 72 ms busy 10x task was
321 ms after first data and before daemon tracking. Its trace did not
capture child events. Detailed pre-fix traces showed a separate
43.8 ms startup task with two chart initializations in one frame,
and 54–77 ms Ctrl+K tasks dominated by style and layout. Chart
initialization now uses observed dimensions and starts one plot per
frame. Native dialog focus runs before attaching the command options.
These changes target the measured work, not the measurement window.

The 72 ms outlier did not recur in the five busy 10x runs. Across all
conditions, Chromium recorded nine long tasks: five before daemon
tracking at 1x (52–129 ms), and four during quiet 10x tracking (51–104 ms).
Three quiet 10x entries coincided with palette input. The original task
and the remaining startup entries do not have confirmed attribution.
Long Tasks API counts from first data; the renderer-task rows start
after daemon scrolling and do not include those five early entries.

All 20 runs had zero post-data CLS. The former 3.78 px sparkline shift
came from changing text width in the same flex row. KPI details now use
a fixed-width trailing grid column and preserve the SVG's aspect ratio
and slot even when no series is available.

## DOM versus row count

Phase 0 measured end-of-run elements only, so it has no controlled
row-count result. The previous Phase 3 build used the actual BRD-03 virtual table. It kept
24, 40 or 63 distinct recorded agent IDs in the busy bootstrap and removed
the runtime agent overlay in every arm. Nothing was added to the recording.
Each arm used five fresh browser contexts and the same panel geometry.

| Logical rows | Rendered rows | Elements inside the table | Elements on the page |
|---:|---:|---:|---:|
| 24 | 15 | 409 | 1,465 |
| 40 | 15 | 409 | 1,466 |
| 63 | 15 | 409 | 1,466 |

**Pass on the previous build.** The page-level count differed by one
element, not in proportion to row count. The sweep was not rerun on the
final build and does not prove a bound for every panel or dataset.

## Heap

The final busy 1x Overview replay saved 22 samples through **21:00.02**,
with four bootstraps and 2,324 changes. There was one snapshot at minute
15. The minute-45 snapshot and retainer comparison did not run.

| Minute | Heap after forced GC (MiB) | Document elements | CDP nodes | JS event listeners |
|---:|---:|---:|---:|---:|
| 0 | 6.85 | 878 | 2,067 | 292 |
| 6 | 7.56 | 878 | 2,067 | 292 |
| 12 | 7.75 | 878 | 2,067 | 292 |
| 15 | 8.06 | 878 | 2,067 | 292 |
| 18 | 7.94 | 878 | 2,081 | 298 |
| 21 | 8.13 | 878 | 2,081 | 298 |

**No-growth budget: unresolved.** At the same phase of the six-minute
replay, retained heap rose from 8.06 MiB at minute 15 to 8.13 MiB at
minute 21. The previous build's completed 30-minute run rose from 7.55
to 8.07 MiB between minutes 6 and 30, versus a −0.049 MiB/min slope in
the [Phase 0 baseline](ui-baseline.md#heap-over-30-minutes). The partial
final run does not establish a plateau or distinguish browser warm-up
from application retention.

## Requests per tab

Phase 0 busy 1x had `7, 2, 2` API requests per tab in successive minutes.
The previous Phase 3 build had `2, 0, 0` per tab (`4, 0, 0` total across two tabs).
The two-tab check did not run on the final build. The routes
were the initial live stream and the test harness catalog read. This
measures HTTP requests, not SSE messages or daemon query calls. **Kusto
queries per minute versus open tabs were not verified**: the loopback
server does not execute Kusto queries. Offline tests confirmed one
compute per invalidation for two same-scope subscriptions and reuse of
the Kusto reader. They do not measure production query counts or
distinct scopes.

In the timing runs the scroll to Machine also brought the Settings-in-effect
reads into view. Phase 0 made seven requests in the first minute and two
in the tracking minute in all four conditions. Phase 3 made six and zero
at 1x, seven and one at 10x, on both tapes. The extra 10x request was a
replay stream reopen.

The heap run made two startup requests, then one stream reopen every
six minutes and no other API requests. Baseline heap replay made six
startup requests and two requests in each later minute.

## Section 9 budget status

| Budget | Result |
|---|---|
| No post-data task over 50 ms at 1x or 10x | **Miss:** nine across three conditions, maximum 129 ms. All five busy 10x runs passed. |
| Message to paint p95 ≤ 33 ms | **Pass with the one-frame paint proxy:** 19.9, 26.6, 15.8 and 30.6 ms. **Phase 0 two-rAF proxy:** busy 1x passed (31.6 ms); the other three missed (37.4–47.6 ms). These are CPU/RAM samples. |
| Interaction p95 ≤ 100 ms at 10x | **Pass for the palette:** 75.3 ms quiet, 38.5 ms busy. |
| Zero CLS after first board paint | **Pass:** 0 in all 20 runs. |
| DOM count independent of row count | **Previous build passed for BRD-03:** 24/40/63 logical rows, 15 rendered rows and 409 table elements in every run. Not rerun. |
| No 30-minute heap growth trend | **Unresolved:** final replay stopped at minute 21 (7.56 → 8.13 MiB from minute 6), with only the minute-15 snapshot. Previous build missed. |
| Initial JS and CSS Brotli below baseline | **Pass:** observed maxima 92,957 B JS and 6,888 B CSS vs 97,517 B and 12,052 B. |
| First board paint with data faster than baseline | **Pass:** all four medians and p95s improved. |
| Kusto queries per minute independent of open tabs | **Not verified against Kusto.** Loopback reports per-tab HTTP, not daemon queries. |
| Writer: no `.set-or-append`, no cluster inline ingestion, no dropped rows | **Not measured:** no writer ran. |
| No Kusto queries on write path (K9) | **Not measured:** replay has no write path or cluster. |
| No `E_LOW_MEMORY_CONDITION` or failed daemon queries; report query CPU in Health | **Not measured against a healthy cluster:** replay has no daemon query execution. |
| `aictl.file.*` ≈1,200 rows/min maximum; unchanged metrics at most once per series per 300 s | **Not measured:** this replay consumes a recording; it does not generate samples. |

## Phase 3 line ledger

Count `git diff --no-renames --numstat ca44b49` plus lines in untracked
text files. Exclude docs from the R5 total, along with images, binary
files and everything under `test/fixtures/project/`. Count tests next to
UI source in the UI tests row. The backend did not change in this round.

| Area | Added | Deleted | Net |
|---|---:|---:|---:|
| UI source and build | 7,968 | 6,794 | +1,174 |
| UI CSS | 880 | 846 | +34 |
| UI tests | 2,793 | 4,298 | −1,505 |
| Backend source and contract | 182 | 144 | +38 |
| Backend tests | 109 | 81 | +28 |
| **R5 total** | **11,932** | **12,163** | **−231** |

This round removed 44 lines of unused route code from `api.js`, 16 from
the superseded `readScopedHealth` path, 32 in `tip.js`, and its unreachable
legacy chart and drawer callbacks. It also removed `THEMES`, `readUrl`,
`toolFilterLabel` and `listedTools`, `relPath`, `OTHER_COLOR`, and `SCOPES`.
The unused `fileDetailFixture`, `machineFixture`, and `boardEventSource`
account for 89 additional test-line deletions. Remaining callers keep
their implementations; file-local helpers no longer expose unused exports.
Dynamic imports, gallery primitives and replay/script entries stay.
Overview A and B now share field-to-Stat rendering without changing units
or wrappers. The static renderer reuses the layout model's group type.

### Files changed in the final round

Paths below are relative to the UI package unless noted:

- `src/`: `api.js`, `utils.js`; `data/{filters,live,store,urlState}.ts`,
  `design/format.ts`, `live/selectors.ts`.
- `src/components/board/`: `Drawer.js`, `DrawerChart.js`, `drawerChartModel.js`,
  `colWidths.js`, `islandTableModel.js`, deleted `tip.js`, and
  `agent/{common,FlowTab,TimelineTab,flowModel}.js`.
- `src/components/settings/`: `Agents.js`, `FilesView.js`, `FindingsView.js`,
  `HookStatus.js`, `Inspector.js`, `PermissionsEditor.js`, `SettingsWorkspace.js`,
  `ToolView.js`, `TopicView.js`, `Value.js`, `model.js`, `parts.js`,
  `permissions.js`, `tips.js`; `src/components/ui/{index,Markdown}.js`.
- `src/panels/`: `StaticDock.tsx`, `layout.ts`, `registry.ts`,
  `health/{healthData,healthModel,index,scopedHealth}.ts`, `health/HealthParts.tsx`,
  `overview/{b,contextData}.ts`, `overview/{Kpis,Summary}.tsx`,
  `overview/b/findings.ts`, `overview/b/View.tsx`, `kinds/kinds.module.css`.
- `src/shell/Palette.tsx`, `src/ui/{Chart,Dialog}.tsx`,
  `test/fixtures/{board,live}.fixture.js`; this report and `docs/ui/spec.md`.

The [test removal ledger](../ui/spec.md#phase-3-test-removal-ledger)
identifies each retired suite and its replacement. The
[visual follow-up list](../ui/spec.md#phase-3-visual-follow-up) names the
remaining text-led panels and the data available for a visual summary.

## Validation

The final `build:ui-test` passed with a private output directory. The
final typecheck, lint, Vitest and Playwright chain was not completed.
No screenshots were regenerated or checked after the KPI geometry
change. The following validation and snapshots are from the previous build.

The first board/gallery run exposed a capture race in `health.png`: the
status showed “Waiting for live sources”. The shell test now waits for
the recorded settled status and passed three repeats with its original
image. The full UI chain then found the legacy drawer snapshot still
showed the pre-compact Overview. That diff also exposed the static tab
labels' larger type, different padding and extra trailing border.

The static renderer now matches Dockview's tab type, padding, alignment
and dividers. The Overview and both visible Usage tab labels and boxes
had identical coordinates before and after the editor attached. Panel
headers, sashes, spacing and borders did not need changes. Four snapshots
were regenerated with individual test selectors and inspected:

| Spec | Test | Snapshot | Reviewed change |
|---|---|---|---|
| `shell.spec.mjs` | SHL-01 and BRD-01/02/07: sections, keyboard navigation and recorded Overview panels | `overview.png` | Tab styling matches Dockview. |
| `shell.spec.mjs` | SHL-01: Health navigation and snapshot | `health.png` | Tab styling only after the capture wait fix. |
| `health.spec.mjs` | HLT-01 and HLT-06: show live health, actionable issues and source disclosures | `health-highlights.png` | Tab styling only. |
| `legacy.spec.mjs` | DRW-01: recorded session drawer and tab navigation | `session-transcript.png` | Compact Overview behind the drawer; transcript unchanged. |

- All 54 board, shell, Health and gallery checks passed with the reviewed
  images. No gallery image was changed.
- The `dock-layout` project tests panel boxes within 1 px at 1440 × 900
  and 1280 × 720, saved tabs and sashes, focus, scroll and an in-flight
  detail read across attach, and axe in both themes and render modes.
- The previous UI chain passed: `tsc --noEmit`, lint (0 errors, 31 warnings),
  `npm test -- --maxWorkers=4` (399 tests in 40 files), `build:ui-test`,
  and all 66 Playwright tests with snapshot updates disabled. The replay
  and UI chain used separate build outputs under `node_modules/.cache`.

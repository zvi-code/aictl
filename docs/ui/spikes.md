# Dashboard UI spikes

Phase 1, item 7. These checks use the busy main recording and the same
[loopback replay server](../../src/aictl/dashboard/ui/test/replay/server.mjs)
as the [legacy baseline](../migration/ui-baseline.md). There is no daemon or
Kusto connection.

## Reproduce

Run in `src\aictl\dashboard\ui`:

```powershell
$env:TEMP = (Resolve-Path node_modules\.cache).Path
$env:TMP = $env:TEMP
$env:UI_SPIKES = '1'
npm run test:ui -- --project=spikes --repeat-each=5 --output=node_modules\.cache\aictl-ui-spikes
node test\replay\spikes-summary.mjs
Remove-Item Env:\UI_SPIKES
```

The project is opt-in because it runs the recording in real time at 1x.
It checks that each workload ran and saves `spike.json` for each repeat.
Run the summary only after all 20 tests pass. Budget misses are decision
inputs, not Playwright assertion failures.

To open the pages by hand, run `npm run dev -- --host 127.0.0.1 --port 5173`.
In a second terminal, run
`node test\replay\server.mjs --vite http://127.0.0.1:5173 --speed 10 --port 4175`.
Open `http://127.0.0.1:4175/spike-solid.html`, `/spike-dockview.html`, or
`/spike-gallery.html`. Use `--speed 1` for the unscaled recording.
These pages and their modules are not production entries. `npm run build`
emits only `index.html` in the dashboard `dist`.

## Decisions

- **Keep Solid `2.0.0-rc.21` for the next phase.** The previous 1.9
  decision used the zero-CLS miss before we knew its cause. The shared
  Table primitive caused the shift. After the fix, Solid met every
  section-9 budget measured here: zero CLS, no long tasks, both latency
  limits, and the DOM size check. No Solid 1.9 build was tested.
- **Keep `dockview-core` `8.9.0`.** No long task occurred in any of the
  five drags or five resizes. Each gesture overlapped at least one live
  value change. Layout save, reset, restore, and keyboard tab activation
  passed in all five runs. This does not establish performance for 30
  simultaneously visible panels, floating groups, or popouts.
- **Keep uPlot and TanStack Table.** In all five live gallery runs, the
  same canvas changed pixels after new data and changed width after the
  resize. The recorded process table changed row order on sort. No
  separate timing gate applies to this spike. The rerun had zero CLS.
  Versions: uPlot `1.6.32`, Table Core `9.3.1`, Virtual Core `3.19.11`.

## Layout shift attribution

The first measurements did not identify a Solid runtime defect. A pre-fix
diagnostic repeat of all four workloads captured every `layout-shift`
entry in the post-paint measurement windows and each source that
Chromium provided. The repeat used the same windows and input script as
the first measurements. Source data from the original five repeats was
not captured. The original median / p95 CLS was
0.00011075 / 0.00011075 at Solid 1x, 0.00033226 / 0.00036918 at Solid
10x, and 0.00007674 / 0.00019186 in the live gallery.

| Workload | Entries (recent input) | Process CPU text sources | Agent CPU text sources | Agent memory text sources |
|---|---:|---:|---:|---:|
| Solid 1x | 4 (0) | 6 | 4 | 2 |
| Solid 10x | 36 (6) | 48 | 42 | 17 |
| Dockview | 0 (0) | 0 | 0 | 0 |
| Live gallery 10x | 5 (1) | 9 | 0 | 0 |

All 128 reported sources were text nodes in these three numeric columns.
`previousRect` equaled `currentRect` for each source: Chromium reported
the same line bounds even though the text moved within them. A separate
`Range.getBoundingClientRect()` check on process CPU row 3 confirmed the
movement. When `0.3` changed to `22.3`, the text's x position went from
1029.765625 to 1021.578125 CSS px, while its right edge stayed at
1050.25 px and its y position stayed at 446 px. The cell stayed at
`(712.5, 439, 343.75, 32)` (x, y, width, height). End alignment moved
the text start by 8.1875 px as the value grew. Tabular figures keep
individual digits the same width, not strings of different lengths.
No source indicated a panel, chart, scrollbar, font, or row-height change.

The [Table primitive](../../src/aictl/dashboard/ui/src/ui/Table.module.css)
now aligns all live values to the start of the cell and keeps tabular
figures. The regression check uses the recording to verify that a CPU
value can change width without moving its text origin. The two Windows
gallery screenshots show the new numeric alignment. The pixel changes
were confined to the table.

The spike `spike.json` files record every post-paint entry in
`shiftEntries`, including entries with recent input, and keep each
source node description and both rectangles. The diagnostic files from
this run are in `node_modules\.cache\aictl-ui-shifts-before`. Chromium
can limit the number of sources it supplies for one entry. The CLS
calculation and measurement windows are unchanged.

## Results

Measured after the Table fix on 2026-11-20. The Playwright project passed
all 20 tests: five repeats of each case. Cells show median / nearest-rank p95.
Latency percentiles pool the samples across repeats. Counts, CLS, and
heap percentiles use one value per repeat. A dash means no sample.

| Metric | Solid 1x | Solid 10x | Dockview 10x | Live gallery 10x |
|---|---:|---:|---:|---:|
| Replay change messages per run | 90 / 90 | 655 / 657 | 157 / 157 | 115 / 115 |
| Message to paint, ms | 25.4 / 32.0 | 25.7 / 32.7 | 22.45 / 34.2 | 23.0 / 31.8 |
| Message-to-paint samples, total | 24 | 238 | 10 | 187 |
| Input to paint, ms | — | 29.05 / 30.8 | — | 27.7 / 29.4 |
| Input-to-paint samples, total | — | 60 | — | 5 |
| Event Timing, ms | — | 16 / 16 | 16 / 32 | 16 / 56 |
| Long tasks over 50 ms per run | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| Post-paint layout shifts per run, including recent input | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| Post-paint CLS | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| DOM body nodes | 453 / 453 | 453 / 453 | 399 / 399 | 191 / 191 |
| JS heap at start, MiB | 11.09 / 11.10 | 11.09 / 11.10 | 6.26 / 6.27 | 14.79 / 14.82 |
| JS heap at end, MiB | 12.00 / 12.01 | 12.12 / 12.13 | 9.72 / 10.04 | 17.90 / 17.97 |

Solid's message-to-paint p95 was below 33 ms at both speeds. The 10x
input-to-paint p95 was below 100 ms. At 500 and 5,000 rows per table,
the body had 453 nodes and 237 elements, with nine data rows mounted
per table. The test also reached the last row with the `End` key.
The CLS budget is exactly zero; both Solid conditions met it.

| Dockview gesture | Window, ms | Replay changes | Message to paint, ms | Long tasks per gesture |
|---|---:|---:|---:|---:|
| Drag | 865.4 / 905.0 | 9 / 9 | 24.8 / 34.2 | 0 / 0 |
| Resize | 2,873.7 / 2,897.0 | 47 / 48 | 20.1 / 28.6 | 0 / 0 |

These are gesture windows, not time spent handling input. Each window
includes the wait for the next live value change. Dockview's decision
uses the task count during gestures, not the Solid latency limits.

## Measurement method

- **Machine:** Windows 11 Enterprise, `10.0.26300`; AMD Ryzen AI Max+ 395
  (16 cores, 32 logical processors); Windows High performance power plan.
  Headless Chromium `158.0.8127.18`, Playwright `1.65.0`, Node `26.13.0`,
  1440 × 900. One Playwright worker and a new browser context for each
  test. No CPU or network throttling. Other work and daemons were not
  paused. This was not an isolated host.
- **Load:** Solid replays 60 s after first board paint with data at 1x and
  36.5 s at 10x. The 10x window is long enough to reach the end of the
  recording. It exercises 18 per-core panels and two tables. Each table
  has 5,000 stable rows: the first bootstrap provides the real entity IDs
  (22 agents and 101 processes); the remaining rows are placeholders.
  Later changes update the cells for those IDs. This is a DOM scale test,
  not a recording with 10,000 live entities. The row-count sweep uses the
  same viewport and compares 500 with 5,000 rows per table.
- **Dockview:** 30 per-core panels in six groups. Only the active tab
  content in each group mounts. The test moves a tab across groups,
  resizes a sash, activates a tab with `End` and `Enter`, and restores
  the moved tab and sash from a versioned `localStorage` layout after
  a reset. Core has native keyboard support for tab navigation and
  activation. This does not test keyboard rearrangement or resizing.
  The installed core package's browser bundle injects its stylesheet.
  That bundle is for this dev page only. A production integration must
  extract CSS at build time as required by F3.
- **Message to paint:** Mark receipt before JSON parsing. Coalesce by
  topic and entity ID. Apply the retained changes in one Solid store
  update per animation frame and flush the reactive updates. If a batch
  changes live DOM text, mark the frame update and sample from the
  earliest retained receipt that changed that text to the next animation
  frame. This is a paint proxy, not a compositor timestamp. It excludes
  network time and does not sample superseded updates or changes that
  do not reach the DOM. Table samples can include rendered overscan rows.
  The gallery chart sample uses the
  updated CPU sample count or a process row as the DOM marker, not a
  canvas compositor timestamp.
- **Interactions:** Solid changes a visible board note 12 times during
  each 10x lap. Measure from the input timestamp through the frame after
  the update. Also record Chromium Event Timing entries, with a 16 ms
  reporting floor, and take the largest entry per interaction ID.
  Dockview uses separate windows from just before mouse down through the
  rendering opportunity after mouse up. The mouse stays down through a
  live value change during each gesture. These windows include both
  the replay and Playwright's scripted mouse steps.
- **Tasks and layout:** `PerformanceObserver` collects `longtask`,
  `layout-shift`, and `event` entries. The post-paint window starts after
  the board has real data and fonts are ready. Include long tasks that
  overlap the window. CLS is the largest layout-shift session window,
  excluding recent user input. The Long Tasks API does not cover the
  plan's separate main-thread target of at most 16 ms.
- **Heap:** CDP `Runtime.getHeapUsage` reads JS heap at the start and end
  of the short windows without forcing GC. These readings cannot establish
  a 30-minute heap trend. The production bundle size, production startup
  time, and Kusto budgets are outside this spike.

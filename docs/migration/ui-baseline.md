# Legacy dashboard UI baseline

Phase 0, item 4. Measured on 2026-11-20 with the Phase 1 replay harness,
before the Solid board replaces the Preact board. See the [parity inventory](../ui/spec.md)
and the [recording method](../../test/recordings/README.md).
See the [Phase 1 spike decisions and measurements](../ui/spikes.md).

## Reproduce

Run these commands in `src\aictl\dashboard\ui` with the installed
Playwright Chromium headless shell. The build goes to an ignored cache directory.
It does not replace the tracked dashboard `dist`.

```powershell
$env:TEMP = (Resolve-Path node_modules\.cache).Path
$env:TMP = $env:TEMP
npm run build:ui-test
npm run test:ui
node test\replay\baseline.mjs
node test\replay\heap.mjs
node test\replay\inspect.mjs
```

The default Playwright run includes `legacy` (inventory and replay) and
`gallery` (including axe). The `legacy-quality` project records known
defects in the legacy Preact Overview. It is not a default gate and is
expected to fail until the rewrite replaces that UI. Its checks are unchanged.
To run it alone:

```powershell
$env:UI_LEGACY_QUALITY = '1'
npm run test:ui -- --project=legacy-quality
Remove-Item Env:\UI_LEGACY_QUALITY
```

The measurement scripts write `aictl-ui-baseline.json`, `aictl-ui-heap.json`,
and `aictl-ui-inspect.json` in `node_modules\.cache`. To use another production
build, set `UI_DIST` to its path. Run the heap script in a separate terminal if
you need to continue other work. For a comparison with less noise, run the timing
script on its own and keep the same build, tape, viewport, and interaction.

To open the replay in a browser:

```powershell
node test\replay\server.mjs --dist node_modules\.cache\aictl-ui-baseline --board-window --speed 10
```

Open [the recorded seven-day Overview](http://127.0.0.1:4175/?screen=board&range=7d).
To proxy a running Vite server, replace `--dist … --board-window` with
`--vite http://127.0.0.1:5173` and open `/gallery.html`. The Playwright gallery
project starts Vite itself unless `UI_VITE` is set. Use `--update-snapshots`
to replace a reviewed image. Only Windows baseline images are eligible for
tracking.

## Replay coverage

The loopback server holds the final state at the end of the tape by default.
`--loop` replays from a fresh bootstrap with a new epoch on the same connection.
It sends named SSE events with the recorded offset divided by the speed.
Keepalives are comments. Cursor requests start at a bootstrap; they do not
resume at an arbitrary point in the tape. `history=0` is a runtime-only
projection of the same stream. The main and isolated recordings are separate.

The main tapes captured the daemon's unfiltered seven-day payload with an empty
stream scope. With `--board-window`, the server also maps the UI's explicit,
unfiltered seven-day query to that tape. The adaptation sets the scope keys;
it does not change timestamps or re-query history. Other ranges, filters and
scopes are not substitutes for this payload.

| Complete GET keys | Quiet start / end | Busy start / end |
|---|---:|---:|
| Main | 39 / 42 | 41 / 33 |
| Isolated | 43 / 39 | 43 / 39 |

`--directory`, `--source`, and `--phase` select the inputs. `/__replay/ready`
lists the exact REST keys for the selected snapshot. Query parameter order
does not matter. The server preserves recorded response status, content type,
and body. The old `/api/stream` only has one recorded frame. With
`--supplemental`, the main replay can also serve the later Tool and Skill
GETs at their exact captured arguments. Those two responses do not belong to
either boundary.

The Overview uses recorded capabilities, node identity and context, plus the
live stream. Health and Settings read runtime and configuration from the
stream; the inventory and hooks reads have REST captures. The busy start
snapshot also has session detail and Transcript for one scrubbed session.
The Overview requests not covered are `/api/board/nodes?scope=local&view=runtime`
and `/api/board/sessions?q=&limit=50&offset=0`. The drawer also makes uncaptured
Flow and Timeline, filtered Evidence, Samples, Events and Events count,
200-row model calls, Copilot Artifacts, and the scoped File detail reads.
The recordings do not cover
arbitrary query arguments or writes. Unrecorded requests get a logged HTTP 404
with `X-Replay-Miss: 1`; a recorded error keeps its original status without
that header. The legacy inventory tests name the expected misses and fail on
new ones or on uncaught browser errors.

## Measurement method

- **Environment:** Windows `10.0.26300`, AMD Ryzen AI Max+ 395,
  Chromium headless shell `158.0.8127.18`, Playwright `1.65.0`, Node `26.13.0`,
  1440 × 900. Five fresh browser contexts per recording and speed. The
  timing runs, 30-minute heap run, and other work overlapped on this machine.
  The results include that load and the cost of the browser probes.
- **Initial JS and CSS:** Resource Timing for JS and CSS that finished before
  the first board paint with data. `transferSize` includes Chromium's header
  allowance; `encodedBodySize` is the Brotli body; `decodedBodySize` is the
  source size. A separate CDP run counts UTF-8 bytes from assets that
  Chromium reported as parsed scripts or attached stylesheets. This measures
  source bytes, not internal parser data or compiled-code size. It excludes
  fonts, inline HTML, and later lazy chunks. The replay removes the three
  server-injected catalog script placeholders; the tape does not have that JS.
- **First board paint with data:** Navigation start to the first non-`n/a`
  Messages KPI, checked after a rendering opportunity. Quiet history first
  arrives at a recorded offset of 45.047 s; busy history is in the bootstrap
  at 3.406 s. The startup metric includes replay delay, not just UI work.
- **Message to paint:** After first data, scroll to the daemon CPU and RAM
  statistics. Take the browser's SSE arrival mark and match the exact
  recorded CPU and RAM text in the visible DOM. Check after the next
  rendering opportunity with two `requestAnimationFrame` calls. This is a
  paint proxy, not a compositor timestamp. Do not count frames that do not
  change these values, or values that the next message replaces before paint.
  This excludes network time and measures a sample of messages, not all topics.
- **Interaction to paint:** Open the command palette with Ctrl+K eight
  times while the stream runs. Use the `keydown` timestamp and the same frame
  check when the dialog is visible. This does not wait for the network.
  Record raw `event` entries too; entries below the 16 ms reporting floor
  are not available through Event Timing.
- **Tasks and layout:** Observe `longtask` and `layout-shift` from document
  start and report entries after first data. Count tasks strictly over 50 ms
  for the plan's long-task budget. CDP traces the page renderer's
  `ThreadControllerImpl::RunTask` durations over 16 ms in the 60 s tracking
  window. The trace and Long Tasks API have different boundaries. CLS uses
  the largest layout-shift session window and excludes recent user input.
  Count DOM elements at the end of a run; there is no controlled row-count
  sweep, so this is not a test of row-count independence.
- **Heap:** Keep one visible Overview tab open. Loop the busy stream at 1x
  for 30 wall-clock minutes after the first usable board. Each minute read
  CDP `Runtime.getHeapUsage` before and after `HeapProfiler.collectGarbage`.
  The post-collection size helps separate live objects from heap allocation
  peaks. The test does not measure renderer RSS, GPU memory, or natural GC
  behavior. Each loop has a new bootstrap, which resets the live reducer.
- **Requests per open tab:** Count browser requests whose path starts with
  `/api/`, including stream opens, failed reads, and retries, not SSE
  messages. Count the first minute from navigation and a new one-minute
  window after first data. Also count each minute of the heap run and
  repeat on two tabs in the same context. This is a proxy for Kusto queries.
  There is no Kusto in replay. To measure query count or the effect of tab
  count on query load, use a real daemon and count its query calls.

## Results

### Initial assets

| Asset type | Brotli body (bytes) | Transfer with headers (bytes) | Parsed source (bytes) |
|---|---:|---:|---:|
| JavaScript, 2 modules | 97,517 | 98,117 | 332,923 |
| CSS, 1 stylesheet | 12,052 | 12,352 | 73,810 |

CDP counted `index-Dh5zLRcX.js` (317,604 bytes),
`hooks.module-tDeaYiaE.js` (15,319 bytes) and `index-Bgi6mWjU.css`
(73,810 bytes). Their parsed source sizes match the respective decoded
response sizes.

### Timing and layout

Each cell gives the median [minimum–maximum]. The p95 is the nearest-rank
percentile. First paint and CLS have one value per run; each latency
distribution pools its samples from the five runs. Counts are per run.

| Metric | Quiet 1x | Quiet 10x | Busy 1x | Busy 10x |
|---|---:|---:|---:|---:|
| First board paint, ms | 45,662.9 [45,612.1–45,833.6] | 5,184.6 [5,140.1–5,330.0] | 4,073.1 [3,915.2–4,503.1] | 1,244.5 [1,140.1–1,340.9] |
| First board paint p95, ms | 45,833.6 | 5,330.0 | 4,503.1 | 1,340.9 |
| Message to paint, ms | 136.1 [117.5–147.7] | 95.0 [59.3–156.2] | 121.4 [98.5–183.5] | 119.7 [97.6–267.8] |
| Message to paint p95, ms | 147.7 | 156.2 | 183.5 | 267.8 |
| Matching message samples | 5 | 15 | 10 | 15 |
| Palette open to paint, ms | 83.9 [51.8–120.7] | 82.9 [34.8–138.1] | 76.9 [42.0–306.9] | 69.7 [41.7–117.4] |
| Palette open to paint p95, ms | 113.8 | 115.3 | 119.7 | 103.7 |
| Long tasks over 50 ms | 70 [58–77] | 307 [254–359] | 62 [54–87] | 243 [136–319] |
| Long task duration p95 / max, ms | 124 / 245 | 144 / 430 | 193 / 666 | 194 / 1,674 |
| Renderer tasks over 16 ms | 113 [109–118] | 451 [435–465] | 121 [119–126] | 529 [519–561] |
| Renderer task duration p95 / max, ms | 87.6 / 245.3 | 107.0 / 430.9 | 155.2 / 666.9 | 136.7 / 1,674.3 |
| Post-data CLS | 0 [0–0] | 0.712688 [0.712688–0.712688] | 0.025042 [0.000003–0.025042] | 0.025045 [0.025045–0.025733] |
| DOM elements at end | 15,813 [15,813–15,813] | 15,813 [15,810–15,813] | 15,825 [15,825–15,825] | 15,918 [15,918–15,918] |

Message-to-paint p95 exceeded the 33 ms budget in all four conditions.
Palette p95 exceeded the 100 ms budget in both 10x conditions. All
conditions had long tasks after data arrived. Only quiet at 1x had zero CLS.

The 10x timing window crosses a replay lap boundary. The quiet tape then
returns to a pending bootstrap before it gets history again. The largest
quiet 10x shifts occur at that reset and history reload; do not treat them
as shifts from steady updates alone. The paint samples are sparse: each
busy 10x run had 38 eligible stat updates, 34 were superseded, and three
matched a visible frame. The latency percentiles describe the matches,
not all SSE messages.

### Heap over 30 minutes

The visible busy tab at 1x completed **30:00.28** after first data:
31 samples, six bootstraps, and 3,309 received change messages. Sizes
are in MiB (1,048,576 bytes).

| Heap measure | First sample | Final sample | Median [min–max], minutes 1–30 | p95, minutes 1–30 |
|---|---:|---:|---:|---:|
| Before forced GC | 16.80 | 67.50 | 68.38 [46.91–171.68] | 147.78 |
| After forced GC | 16.74 | 48.30 | 48.96 [44.60–55.31] | 55.23 |

Retained heap grew during the first lap. At minutes 6, 12, 18, 24 and 30,
it was 47.40, 48.31, 48.23, 48.44 and 48.30 MiB. A linear fit to minutes
6–30 gives −0.049 MiB/min after forced GC. There is no sustained increase
in retained heap after the first lap in this run. Forced GC and the
replay reset limit what this says about an uninterrupted real stream.
The DOM had a median 15,822 elements (range 15,822–16,398).

### Tab count

In each timing condition, all five runs made seven API requests in the
first minute and two in the post-data minute. The heap run made six
requests before its first sample and two in each of the 30 subsequent
minute bins.

In the three-minute two-tab check (busy, 1x), each tab made **7, 2, 2**
API requests in successive minutes, for 14, 4, and 4 requests total per
minute. Most repeated requests were for the uncaptured local `runtime` node
view. This measures client polling under replay, not Kusto query load.

## Browser checks

- `npm test`: 37 Vitest files and 584 tests passed after TypeScript checking
  once the benchmarks ended. An earlier run during the benchmarks had two
  timing failures. Playwright uses `.spec.mjs`; Vitest uses `.test.{js,ts,tsx}`.
- `npm run lint`: passed with 39 existing warnings.
- Playwright legacy inventory and replay: 8 passed. The UI tests cover
  Overview sections, the command palette, Health, Settings pivots, session
  drawer tabs, the file editor read, and a recorded prompt error. A tab with
  incomplete REST coverage is not evidence of ready-state parity.
- At baseline, the strict legacy checks failed: unrecorded requests at 1x and 10x, long
  tasks at both speeds, layout shift at 10x, and axe contrast and accessible
  name violations. The browser checks did not change the legacy UI.
- At baseline, both Vite gallery themes failed axe
  `scrollable-region-focusable` in the PanelState examples. Phase 1 fixed
  this in the Panel primitive: the active scroll region has an accessible
  name and can receive keyboard focus. Both themes now pass with the rule
  enabled. The Windows images cover the four legacy surfaces above and
  the two gallery themes.

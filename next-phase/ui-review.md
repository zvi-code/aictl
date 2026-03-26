## UI Review: aictl Live Dashboard

### Overall Impression

This is a dense, information-rich monitoring dashboard for AI development tools. The dark theme is well-executed with good contrast, the stat cards at the top are immediately legible, and the tab-based navigation is logical. However, there are several significant issues — some of which you've already identified — plus opportunities for improvement.

---

### 1. Tool Icons Are Wrong / Generic

The ICONS mapping in the code uses colored geometric emoji as stand-ins for each tool: 🟣 for Claude, 🤖 for all Copilot variants, 🟠 for Codex CLI, 🟢 for Cursor, 💎 for Gemini CLI, 🦞 for OpenClaw, and ⚡ for OpenCode. These aren't actual product icons — they're colored circles and generic emoji. For GitHub Copilot in particular, the 🤖 robot face is shared across four different Copilot products (CLI, VS Code, JetBrains, Copilot365), making them visually indistinguishable. The fallback `\u{1F539}` (🔹) is used for tools like Cross-Tool, Project Environment, and "any," giving them all the same undifferentiated diamond icon. Recommendation: Use actual SVG or PNG product logos (Claude's purple/orange burst, Copilot's octicon, Cursor's green icon, etc.) or at minimum distinct, recognizable icons rather than colored circles. These could be inlined as small 16–20px images next to each tool name.

---

### 2. Tool Boxes Rapidly Reorder (Confirmed)

You're correct — this is caused by the sort in `TabOverview()`:

```
scoreA = (a.files.length*2) + a.processes.length + a.mcp_servers.length 
         + (a.live?.session_count||0) + liveTokenTotal(a.live)/1000
```

The `liveTokenTotal` term changes on every data refresh, causing the score to fluctuate and the sort order to shuffle. This creates jarring visual movement where cards swap positions constantly. Recommendation: Either pin the sort to static attributes (files + processes + MCP server count, ignoring live data), or sort once on initial load and only re-sort on a user click (e.g., a "Sort by" dropdown). Alternatively, use CSS `order` with `transition` to animate position changes smoothly, or use a debounced sort that only re-ranks if score deltas exceed a threshold.

---

### 3. Sparkline Mini-Graphs Proposal (Your Idea)

Your idea of adding a right-side panel to each tool card with 3 horizontal mini-graphs (CPU, memory, tokens/files) is excellent and would solve the information density problem well. Currently the tool cards show instantaneous snapshots like "22 proc 0.5% 4018MB" but give no sense of *trend*. I'd suggest:

Each tool card rectangle would be split: the existing left ~70% keeps tool name, badge pills, and file category breakdowns. A new right ~30% column shows 3–4 tiny sparkline charts (about 80×20px each) stacked vertically: CPU % over time, Memory MB over time, Token throughput, and Files touched. The page already imports uPlot (`esm.sh/uplot@1.6.31`), so the infrastructure is there. These sparklines would give at-a-glance trend data without requiring a click to expand, and the visual density would justify pinning card positions (no more need to sort by "activity").

---

### 4. Tab-Specific Issues

**Processes tab:** Clean and readable. The collapsible tool groups with dot colors are nice. One issue: the anomaly badge on Claude Desktop ("1 anomaly" in red) is prominent but there's no inline explanation — you have to click to expand. Consider a tooltip on hover.

**MCP Servers tab:** Very sparse — just 2 rows with both servers stopped. The red dot + "stopped" status is clear, but the tab feels empty. Consider showing server metadata, last-active time, or a connection history.

**AI Context tab:** Shows only "Auto Memory: 2, 141 tok" with a collapsed row. This tab has the most wasted vertical space of any. Consider expanding this into a richer view: show the actual memory entries inline, or merge this tab's data as a section within the Overview tab since there's so little content.

**Live Monitor tab:** This is the most operationally useful tab. The Collector Health table is well-structured. The Tool Sessions table packs a lot in (sessions, traffic, tokens, MCP, files, CPU, workspaces) but the columns are cramped. The "(unknown)" workspaces for Cursor and "any" look like missing data. The Monitor Roots section at the bottom uses raw monospaced pill badges which are visually noisy — consider a structured path tree instead.

**Token Budget tab:** This is the richest and best-designed tab. The Context Window Usage section with its bar chart and breakdown (always-loaded, on-demand, conditional) is immediately informative. The "By Category" table with colored distribution bars is great. The "By Tool" breakdown is excellent. One issue: the context window shows "224.9%" (450k of 200k) — the bar overflows at 100% and the visual just shows a full green bar, which doesn't communicate the 2x+ overflow. Consider a different visual treatment for over-budget scenarios (red bar, a warning icon, or a secondary scale).

---

### 5. Other UI Observations

**Header stats strip:** The top stat cards are effective. The sparkline history lines in the Files, Tokens, CPU, and Proc RAM cards add good context. However, the secondary stats row (Processes, Size, MCP, AI Context) and tertiary row (Live Sessions, Live Tokens, Outbound, Inbound) are using the same visual weight but contain far less important information. Consider visual differentiation — smaller cards or a different background for the secondary rows.

**CSV Footprint bar:** The stacked bar is informative at a glance, but the legend below it has 10+ items and wraps to two lines. At the current scale, small segments like Gemini CLI (2 files) and Claude Desktop (1 file) are invisible in the bar. Consider a tooltip on hover for tiny segments.

**LIVE TRAFFIC bar:** Only appears when there's active traffic, which is nice. But it appears/disappears dynamically, shifting content below it. Consider always showing it with a "No active traffic" placeholder to prevent layout shifts.

**Expanded card view:** When a card expands, it takes `grid-column: 1 / -1` (full width), which is good. The expanded content (Configuration, Verified Token Usage, file categories, process list) is comprehensive. The process list shows memory bars with color gradients — that's a nice touch. However, the three-column layout for file categories (instructions, rules, memory, etc.) can feel cramped with so many items.

**Typography and spacing:** The monospace font choice is appropriate for a developer tool. Badge pills are well-designed with consistent sizing. One concern: the 0.85rem base font size is quite small on larger displays.

**Theme toggle:** Works well, cycling through dark → light → auto. Light theme maintains good contrast and readability. The light theme's card borders become more prominent, which is actually an improvement for visual separation.

---

### Summary of Top Recommendations

Replace emoji placeholders with actual product logos/SVGs. Fix the sort instability by either pinning to static metrics, sorting only on load, or debouncing. Add sparkline mini-graphs to each tool card's right side as you proposed. Merge the near-empty AI Context tab into Overview. Add overflow indication to the Token Budget context window when usage exceeds 100%. Reserve layout space for the LIVE TRAFFIC bar to prevent content jumps.

## Addendum: Alignment & Overflow Issues

You're right — there's a pervasive alignment problem across multiple parts of the UI. Here's a breakdown of every instance I found:

---

### 1. Processes Tab — Badge Columns Not Aligned

In your first image (and confirmed live), the tool group rows on the Processes tab use a **flex layout with no fixed column widths**. The tool name (e.g., "Claude Desktop" vs "Codex CLI") varies in length, and all the badges (`12 proc`, `CPU 3.3%`, `MEM 2281MB`, `1 anomaly`) just flow after it. This means the "proc" badge, "CPU" badge, and "MEM" badge land at different horizontal positions on every row. It looks ragged and makes it hard to scan a column visually.

**Fix:** Switch these rows from flex-flow badges to a CSS grid or table with fixed column widths: `grid-template-columns: 1fr auto auto auto auto`. The tool name gets `1fr` and the badges each get their own fixed-width column. Then CPU values line up under CPU values, MEM under MEM, etc.

---

### 2. Expanded Card — Long Folder Paths Overflow Into Adjacent Columns

This is the most visually broken issue. The expanded tool card body uses CSS multi-column layout: `columns: 3 250px`. But the folder path headings (`.cat-head` buttons) are not constrained to the column width. I measured the long path `CodeAnalysisAgentsGenerator/examples/CodeAnalysisTemplate/.claude/commands` rendering at **382px wide** while the column is only **250px**. It bleeds directly into the adjacent column, overlapping the runtime data (`2 n 3.0KB 1 778t`).

The `.cat-head` has no `overflow: hidden`, no `text-overflow: ellipsis`, and no `max-width`. Unlike the `.fpath` class (which does have `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`), the folder headings have none of that protection.

**Fix:** Add `overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;` to the `.cat-head` button (or at least to the text span inside it). Alternatively, use a tooltip on hover to show the full path. The badge count (e.g., `14`) should stay visible, so the text portion should be the only part that truncates: something like `CodeAnalysisAgentsGen…/.claude/commands [14]`.

---

### 3. File Items — Size/Token Metadata Not Column-Aligned

Inside the expanded file list (e.g., `clone-jemalloc.md ◆ 463B ~116t`), each `.fitem` row is a flex row with the filename taking `flex: 1` and the `.fmeta` (size + tokens) positioned after it. Since filenames vary in length and the meta values just follow them, the size and token columns are jagged across rows. `463B` appears at one X position, `3.2KB` at another, and `1.6KB` at yet another.

**Fix:** Give `.fmeta` a `min-width` (e.g., `min-width: 120px; text-align: right;`) or switch to `justify-content: space-between` on the `.fitem` container so that meta data is always right-aligned within the column. This would make all the size/token values form a neat right-aligned column.

---

### 4. Overview Cards — Badges Don't Align Across Cards in the Same Row

On the Overview grid, each card has a header row like `▶ 🟣 Claude Code [154 files] [219.0k tok] [22 proc 0.5% 4018MB] [2 MCP]`. But these badges flow freely in a wrapping flex container, and since tool names have different lengths and different badges are present/absent per tool, nothing lines up between cards in the same grid row. "Copilot CLI" wraps its name to two lines, pushing its badges down, while "Cursor" keeps everything on one line.

This one is harder to fix without changing the card structure, but your idea of adding a right-side mini-graph panel would naturally help because the badges could be replaced with structured, fixed-width visual indicators.

---

### 5. Summary of Affected CSS Classes

The root cause in most cases is the same pattern: **flex layout with variable-width text content and no fixed column structure**. The places that use `<table>` (Live Monitor, Token Budget) are well-aligned. The places that use flex badges (Processes tab, card headers, file categories) are not.

A consistent fix would be to define a reusable `.aligned-row` utility using CSS grid with named columns, and apply it wherever tabular data appears in a list — process groups, file items, and card badge rows. Something like `display: grid; grid-template-columns: 1fr 60px 70px 90px;` with the specific column widths tuned per context.
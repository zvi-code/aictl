// Capture aictl dashboard screenshots for the README via headless Chromium.
//
// Usage:
//   1. Start the dashboard (against whichever DB you want shown):
//        aictl daemon serve --no-open --port 8599 --db ~/.config/aictl/history.db
//   2. Run this script:
//        cd scripts/screenshots && npm install && npx playwright install chromium
//        BASE_URL=http://127.0.0.1:8599 node capture.mjs
//
// Output PNGs land in docs/screenshots/ (override with OUT_DIR).
//
// Env vars:
//   BASE_URL   dashboard origin            (default http://127.0.0.1:8599)
//   OUT_DIR    output directory            (default ../../docs/screenshots)
//   THEME      light | dark                (default light)
//   RANGE      live | 1h | 6h | 24h | 7d   (default 7d)
//   WIDTH      viewport width px           (default 1440)
//   SCALE      deviceScaleFactor           (default 2)

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8599';
const OUT_DIR = process.env.OUT_DIR || resolve(__dirname, '../../docs/screenshots');
const THEME = process.env.THEME || 'light';
const RANGE = process.env.RANGE || '7d';
const WIDTH = Number(process.env.WIDTH || 1440);
const SCALE = Number(process.env.SCALE || 2);

// The tool whose session is featured in the Sessions/Flow shots. The Explorer
// auto-selects the newest session of the active tool, so picking a tool that has
// rich real sessions (rather than whatever happens to be newest overall) yields
// a meaningful screenshot.
const FEATURE_TOOL = process.env.FEATURE_TOOL || 'copilot-vscode';

// Optional: pin a specific session by a substring of its id (the session tab's
// `title` attribute is the full session_id). Use this to feature a known
// content-rich session for the README — e.g. the newest live PID-based sessions
// are usually empty process entries, while the OTel/UUID session carries the
// actual chat+tool flow. When empty, fall back to a DOM heuristic.
const FEATURE_SESSION = process.env.FEATURE_SESSION || '';

// Select a tool tab in the Session Explorer, then pick a content-rich session.
// Preference order: (1) explicit FEATURE_SESSION substring match, (2) the
// non-live session tab with the most file/token activity. The Explorer
// auto-selects the *newest* session by default, which on a live machine is
// often an empty in-progress process entry, so we override it. Falls back
// silently if selectors aren't present.
async function selectFeatureSession(page) {
  const toolTab = page.locator('button.sf-tool-tab', { hasText: FEATURE_TOOL });
  await toolTab.first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);

  if (FEATURE_SESSION) {
    const pinned = page.locator(`button.sf-sess-tab[title*="${FEATURE_SESSION}"]`);
    const clicked = await pinned.first().click({ timeout: 5000 }).then(() => true).catch(() => false);
    if (clicked) { await page.waitForTimeout(1500); return; }
  }

  // Heuristic fallback: click the non-live session tab with the highest file
  // count. Done in-page so we read the rendered badges directly.
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button.sf-sess-tab'));
    const score = (btn) => {
      if (btn.querySelector('.sf-stab-live')) return -1; // skip live sessions
      const f = btn.querySelector('.sf-stab-files');
      const t = btn.querySelector('.sf-stab-tok');
      const files = f ? parseInt(f.textContent, 10) || 0 : 0;
      const toks = t ? parseFloat(t.textContent) || 0 : 0;
      return files * 1000 + toks; // prefer file activity, break ties on tokens
    };
    let best = null, bestScore = 0;
    for (const btn of tabs) {
      const s = score(btn);
      if (s > bestScore) { bestScore = s; best = btn; }
    }
    if (best) best.click();
  });
  await page.waitForTimeout(1500);
}

// Each target sets the persisted active-tab pref, then optionally drives the UI
// (e.g. clicks a sub-tab) before capturing. `prep` runs after the tab loads.
const TARGETS = [
  {
    file: 'dashboard-light.png',
    tab: 'overview',
    waitFor: '.stat-card, .stat, [data-dp="overview.total_processes"]',
  },
  {
    file: 'context-breakdown.png',
    tab: 'memory',
    waitFor: '.context-map, .ctx-map, .stacked-bar, canvas, svg',
  },
  {
    file: 'sessions.png',
    tab: 'explorer',
    waitFor: '.explorer-container',
    async prep(page) {
      await selectFeatureSession(page);
    },
  },
  {
    file: 'session-flow.png',
    tab: 'explorer',
    waitFor: '.explorer-container',
    async prep(page) {
      await selectFeatureSession(page);
      // Switch the Explorer sub-tab to "Flow" and wait for the sequence diagram.
      const flowBtn = page.locator('button.explorer-subtab-btn', { hasText: 'Flow' });
      await flowBtn.first().click({ timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2500);
      // Sequence diagram renders as SVG/mermaid inside the explorer content.
      await page.waitForSelector('.explorer-content svg, .explorer-content canvas, .sequence-inspector', { timeout: 10000 }).catch(() => {});
    },
  },
];

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  // Hide the runtime alert banner: the capture browser is itself a headless
  // Chromium, so the dashboard truthfully reports "headless browser detected"
  // and "process anomalies". That self-pollution is irrelevant to the README,
  // so suppress it for the screenshot only. Injected post-load so it wins over
  // the app's own styles.
  await page.addStyleTag({ content: '.alert-banner{display:none !important}' }).catch(() => {});
  // Charts/diagrams render after data resolves; give them a beat.
  await page.waitForTimeout(1800);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  let failures = 0;

  for (const t of TARGETS) {
    const context = await browser.newContext({
      viewport: { width: WIDTH, height: 900 },
      deviceScaleFactor: SCALE,
    });
    // Seed prefs before any app code runs so the first paint is correct.
    await context.addInitScript(
      ([theme, range, tab]) => {
        try {
          localStorage.setItem('aictl-theme', theme);
          localStorage.setItem('aictl-pref-range', JSON.stringify(range));
          localStorage.setItem('aictl-pref-active_tab', JSON.stringify(tab));
        } catch { /* storage disabled */ }
      },
      [THEME, RANGE, t.tab],
    );

    const page = await context.newPage();
    try {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await settle(page);
      if (t.waitFor) {
        await page.waitForSelector(t.waitFor, { timeout: 10000 }).catch(() => {});
      }
      if (t.prep) await t.prep(page);
      await page.waitForTimeout(600);

      const out = resolve(OUT_DIR, t.file);
      await page.screenshot({ path: out, fullPage: true });
      console.log(`captured ${t.file}  (tab=${t.tab}, theme=${THEME})`);
    } catch (err) {
      failures++;
      console.error(`FAILED ${t.file}: ${err.message}`);
    } finally {
      await context.close();
    }
  }

  await browser.close();
  if (failures) {
    console.error(`\n${failures} screenshot(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll screenshots captured.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

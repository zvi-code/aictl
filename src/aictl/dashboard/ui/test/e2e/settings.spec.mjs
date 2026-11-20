import { startReplay } from '../replay/server.mjs';
import { captureFrame, checkAxe, checkConsole, dist, expect, test } from './fixtures.mjs';

const now = new Date('2026-06-03T02:25:00Z');
const path = '/example/project/.claude/settings.local.json';
const scope = 'project-local';
const permissions = { allow: ['Read', 'Bash'], ask: ['Edit'], deny: ['WebFetch'] };
const managed = '/example/managed/settings.json';
const agents = '/example/project/.claude/agents/reviewer.md';
const claude = {
  tool: 'claude-code', config_files: [path],
  scopes: [{ id: scope, label: 'Project local', path, exists: true, changeable: true },
    { id: 'managed', path: managed, exists: false, changeable: false }],
  sections: [
    { id: 'model', title: 'Model', rows: [
      { key: 'model', label: 'Model', value: 'Sonnet', set: true, scope: 'env', source: 'env:CLAUDE_MODEL',
        wins: 0, chain: [{ scope: 'env', source: 'env:CLAUDE_MODEL', value: 'Sonnet' }] },
      { key: 'effort', label: 'Effort', value: 0, scope, source: path, line: 5, set: true },
      { key: 'policy', label: 'Policy setting', value: false, scope: 'managed', source: managed,
        locked: true, documented: false, set: true },
    ] },
    { id: 'agents', title: 'Agents', rows: [{
      key: 'agent/reviewer', kind: 'agent', label: 'Reviewer', value: 'Haiku', scope, source: path, set: true,
      wins: 1, chain: [{ scope, source: agents, line: 5, value: 'Sonnet' }, { scope, source: path, value: 'Haiku' }],
      agent: { name: 'Reviewer', defined_in: agents, defined_line: 5, pinned_in: path, tools: ['Read'], model: 'Sonnet' },
    }] },
    { id: 'autonomy', title: 'Autonomy and safety', rows: [{
      key: 'permissions', label: 'Permissions', value: permissions, scope, source: path, line: 2, danger: true, set: true,
      wins: 1, chain: [{ scope: 'user', value: {}, source: '/example/user/settings.json' },
        { scope, value: permissions, source: path, line: 2 }],
    }] },
    { id: 'hooks', title: 'Hooks', rows: [{ key: 'hooks', label: 'Hooks', value: 'Configured', source: path, line: 3, set: true }] },
  ],
};
const codex = {
  tool: 'codex-cli',
  sections: [{ id: 'model', title: 'Model', rows: [{ key: 'model', label: 'Model', value: 'GPT', set: true }] }],
};
const localTools = {
  generated_at: now.getTime() / 1000, tools: [{ tool: 'claude-code', label: 'Claude Code' }, { tool: 'codex-cli', label: 'Codex CLI' }],
  monitor: { diagnostics: { events: { status: 'running', mode: 'live' } }, state_paths: [], workspace_paths: ['/example/project'] },
  tool_configs: [{ ...claude, sections: [{ id: 'model', rows: [
    { key: 'unset', label: 'Unset default', value: 'Default value', set: false, scope: 'default' },
  ] }], env_vars: [
    { name: 'CLAUDE_MODEL', value: 'Sonnet', set: true, masked: false, in_process: true, process: 'Sonnet',
      persisted: [{ origin: '/example/user/profile', kind: 'persisted', value: 'Sonnet' }] },
    { name: 'CLAUDE_TOKEN', value: 'sentinel-never-render', set: true, masked: true, in_process: true,
      process: 'sentinel-never-render', persisted: [{ origin: path, kind: 'settings', value: 'sentinel-never-render' }] },
    { name: 'CLAUDE_UNSET', set: false, masked: false },
  ] }, codex],
};
const audit = { project: '/example/project', scanned_at: 1, duration_ms: 10, capture_mode: 'summary',
  effective_models: {}, counts: { high: 1 }, sources: [], sources_per_tool: {}, transcripts_read: 0, drift: {},
  unknown_loaded: [], unattributed: [], failed_steps: [], incomplete: [], timings_ms: {},
  findings: [{ rule: 'ignored_settings', severity: 'high', tool: 'claude-code', path, line: 2,
    why: 'Ignored settings can bypass review.', action: 'Review the configuration.' }] };
const reported = (p, tool = 'claude-code') => ({ path: p, name: p.split('/').at(-1), exists: true, is_dir: false, kind: 'settings',
  loading: 'always', location: 'project', location_root: '/example/project', scope, bytes: 42, mtime: now.getTime() / 1000 - 20,
  settings: 2, tools: [tool], git_state: 'tracked' });
const envelope = data => {
  const file = data.entities.find(entity => entity.topic === 'configuration.file' && entity.id === 'current');
  if (!file) throw new Error('Replay needs the configuration.file entity.');
  return { ...data, entities: [
    ...data.entities.filter(entity => entity.topic !== 'configuration.loaded').map(entity => entity === file
      ? { ...entity, data: { configured_only: true, tool_configs: [claude, codex] } } : entity),
    { ...file, topic: 'configuration.loaded', id: 'runtime-1', source: 'runtime.native',
      data: { tool: 'claude-code', session_id: 'setting-session', native_session_id: null, configured_on_disk: true,
        effective_known: true, unknown: ['effort'], evidence: [
          { key: 'model', value: 'Haiku', source: 'Native report', observed_at: now.getTime() / 1000 },
        ] } },
  ] };
};
const settings = test.extend({
  settingsReplay: [async ({}, use) => {
    const replay = await startReplay({ dist, speed: 10, boardWindow: true, bootstrapOnly: true, supplemental: true,
      mapBootstrap: envelope });
    try { await use(replay); } finally { await replay.close(); }
  }, { scope: 'worker' }],
});

async function open(page, replay, query = '?screen=settings') {
  await page.clock.setFixedTime(now);
  await page.route('**/api/settings/tools', route => route.fulfill({ json: localTools }));
  await page.goto(replay.url + '/' + query);
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
}
const inspector = page => page.getByRole('complementary', { name: 'Inspector', exact: true });

test('SET-01: recorded Settings layout', async ({ page, snapshotReplay, capture }) => {
  await page.clock.setFixedTime(now);
  await page.route('**/api/settings/tools', route => route.fulfill({ json: {
    generated_at: now.getTime() / 1000, tools: [], tool_configs: [],
    monitor: { diagnostics: {}, workspace_paths: [], state_paths: [] },
  } }));
  await page.goto(`${snapshotReplay.url}/?screen=settings&range=7d`);
  await expect(page.getByRole('radio', { name: 'By tool' })).toBeChecked();
  await expect(page.getByRole('table').first()).toBeVisible();
  await captureFrame(page);
  await expect(page).toHaveScreenshot('settings.png');
  checkConsole(capture);
});

settings('SET-01/02/03/12: the keyboard selects pivots and rows, and tool values stay distinct', async ({ page, settingsReplay, capture }) => {
  await open(page, settingsReplay);
  const tool = page.getByRole('radio', { name: 'By tool' });
  const search = page.getByRole('searchbox', { name: 'Find a setting, value, key or file' });
  const findings = page.getByRole('radio', { name: 'Findings' });
  await tool.press('ArrowLeft');
  await expect(findings).toBeFocused();
  await expect(findings).toHaveAttribute('tabindex', '0');
  await expect(tool).toHaveAttribute('tabindex', '-1');
  await findings.press('Home');
  await expect(tool).toBeFocused();
  await tool.press('End');
  await expect(findings).toBeChecked();
  await findings.press('Home');
  await tool.focus();
  await page.keyboard.press('/');
  await expect(search).toBeFocused();
  await search.fill('settings.local');
  await expect(page.getByRole('button', { name: 'Inspect Effort' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inspect Model', exact: true })).toHaveCount(0);
  await search.fill('');
  await page.getByRole('button', { name: 'Managed · Locked · Not present' }).click();
  await page.getByRole('button', { name: 'Inspect Policy setting' }).press('Enter');
  await expect(inspector(page).getByText('Locked policy')).toBeVisible();
  await expect(inspector(page).getByText('Undocumented')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(inspector(page)).toBeHidden();
  await expect(page.getByRole('button', { name: 'Inspect Policy setting' })).toBeFocused();
  await page.getByRole('button', { name: 'Managed · Locked · Not present' }).click();
  await page.getByRole('button', { name: 'Show unset knobs' }).click();
  await expect(page.getByText('Default value', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Only non-default' }).click();
  await expect(page.getByText('Default value', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Only non-default' }).click();
  await tool.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'By topic' })).toBeChecked();
  const matrix = page.getByRole('table', { name: 'Model comparison' });
  const absent = matrix.getByRole('row', { name: /Effort/ }).getByRole('cell', { name: '—', exact: true });
  await expect(absent).toBeVisible();
  await expect(absent.getByRole('button')).toHaveCount(0);
  const model = matrix.getByRole('button', { name: 'Inspect Model for Codex CLI' });
  await model.press('Enter');
  await expect(inspector(page).getByText('GPT', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/[?&]tool=codex-cli/);
  await page.keyboard.press('Escape');
  await expect(model).toBeFocused();
  checkConsole(capture);
});

settings('SET-04/05/08/11/13/14: definitions, masked variables, collectors and runtime evidence', async ({ page, settingsReplay }) => {
  await open(page, settingsReplay, '?screen=settings&tool=claude-code&sec=agents&row=agent%2Freviewer');
  const detail = inspector(page);
  await expect(detail.getByRole('heading', { name: 'Reviewer' })).toBeVisible();
  await expect(detail.getByText('Settings pin', { exact: true })).toBeVisible();
  await expect(detail.getByRole('button', { name: 'Open reviewer.md:5' })).toBeVisible();
  await detail.getByText('Tools (1)', { exact: true }).click();
  await expect(detail.getByRole('table', { name: 'Agent tools' }).getByText('Read', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Environment variables' }).click();
  await page.getByRole('button', { name: 'Inspect CLAUDE_TOKEN' }).click();
  await expect(detail.getByRole('heading', { name: 'CLAUDE_TOKEN' })).toBeVisible();
  await expect(detail.getByText('Masked', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('sentinel-never-render')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Inspect CLAUDE_MODEL' }).click();
  await detail.getByRole('button', { name: 'Inspect Model', exact: true }).click();
  await expect(detail.getByRole('heading', { name: 'Model', exact: true })).toBeVisible();
  await detail.getByRole('button', { name: 'Inspect CLAUDE_MODEL' }).click();
  await expect(detail.getByRole('table', { name: 'Environment origins' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: 'Tool', exact: true }).selectOption('aictl');
  await expect(page.getByRole('table', { name: 'Collectors' }).getByText('running')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Watched folders' }).getByText('/example/project')).toBeVisible();
  await page.getByText('Effective runtime configuration', { exact: true }).click();
  await page.getByRole('button', { name: 'Show evidence for setting-session' }).click();
  await expect(page.getByRole('table', { name: 'Observed settings' }).getByText('Native report')).toBeVisible();
  await expect(page.getByText('Unknown: effort')).toBeVisible();
});

settings('SHL-01, SET-06/07/12/15: hook status, source line and permission saves with conflict recovery', async ({ page, settingsReplay }) => {
  const opens = [];
  let version = 1;
  const base = { tool: 'claude-code', path, scope, exists: true,
    editable_fields: ['permissions.allow', 'permissions.ask', 'permissions.deny'], raw: {}, permissions };
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/live/stream') opens.push(request.url()); });
  await page.route('**/api/hooks-status', route => route.fulfill({ json: {
    tools: { 'claude-code': { configured: true, configured_events: ['Stop'], missing_events: ['Start'],
      fired_24h: 3, sources: [], warnings: [{ message: 'Configure Startup hook' }] } },
  } }));
  await page.route('**/api/tool-config/claude-code**', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { ...base, mtime: version } });
    if (version === 1) { version = 2; return route.fulfill({ status: 409, json: { error: 'Config file changed' } }); }
    return route.fulfill({ json: { ...base, mtime: 3, permissions: route.request().postDataJSON().permissions, backup_path: `${path}.bak` } });
  });
  await page.route('**/api/board/excerpt?**', route => route.fulfill({ json: { path, line: 2, lines: [{ n: 2, text: '"permissions": {}' }] } }));
  await page.route('**/api/board/file?**', route => route.fulfill({ json: { path, edits: [] } }));
  await page.route('**/api/settings/file?**', route => route.fulfill({ json: { path, text: '{\n  "permissions": {}\n}', mtime: 1 } }));
  await open(page, settingsReplay, '?tab=config&tool=claude-code&sec=hooks');
  await expect(page).toHaveURL(/[?&]screen=settings/);
  await expect(page.getByText('Registered', { exact: true })).toBeVisible();
  await page.getByText('Hook events and sources', { exact: true }).click();
  await expect(page.getByText('Missing: Start')).toBeVisible();
  await expect(page.getByText('Configure Startup hook')).toBeVisible();
  await page.getByRole('tab', { name: 'Autonomy and safety' }).click();
  await expect(page.getByRole('meter', { name: 'Allowed', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Shell: Allowed' }).click();
  const detail = inspector(page);
  await expect(detail.getByText('Winner: Project local.')).toBeVisible();
  await detail.getByRole('region', { name: 'Source and actions' }).getByRole('button', { name: 'Open settings.local.json:2' }).click();
  const excerpt = page.getByRole('group', { name: 'File excerpt scroll area' });
  await expect(excerpt.getByText('"permissions": {}', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  if (!(await detail.isVisible())) await page.getByRole('button', { name: 'Open inspector' }).click();
  await detail.getByRole('button', { name: 'Edit permissions' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit permissions' });
  await dialog.getByLabel('Allow', { exact: true }).fill('Read\nBash\nGlob');
  await dialog.getByText('JSON preview', { exact: true }).click();
  await expect(dialog.getByText(/"Glob"/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Save permissions' }).click();
  await expect(dialog.getByText('Config file changed')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Save permissions' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Reload file' }).click();
  await expect(dialog.getByLabel('Allow', { exact: true })).toHaveValue('Read\nBash');
  await dialog.getByLabel('Allow', { exact: true }).fill('Read\nBash\nGlob');
  const before = opens.length;
  const save = page.waitForRequest(request => request.method() === 'PUT' && request.url().includes('/api/tool-config/'));
  await dialog.getByRole('button', { name: 'Save permissions' }).click();
  expect((await save).postDataJSON()).toEqual({ scope, expected_mtime: 2, permissions: { ...permissions, allow: ['Read', 'Bash', 'Glob'] } });
  await expect(dialog.getByText('Saved permissions.', { exact: false })).toBeVisible();
  await expect.poll(() => opens.length).toBe(before + 1);
});

settings('SET-09/14: files facets, matrix, fold and inspector', async ({ page, settingsReplay }) => {
  const files = [...Array.from({ length: 60 }, (_, i) =>
    reported(`/example/project/.claude/example${String(i).padStart(2, '0')}.json`)), reported(path)];
  await page.route('**/api/settings/files', route => route.fulfill({ json: { generated_at: now.getTime() / 1000, files } }));
  await open(page, settingsReplay, '?screen=settings&pivot=files');
  await page.getByRole('radio', { name: 'Purpose', exact: true }).click();
  await expect(page).toHaveURL(/[?&]group=purpose/);
  await page.getByText('Files by purpose and location', { exact: true }).click();
  await page.getByRole('button', { name: 'Settings in This project' }).click();
  await expect(page).toHaveURL(/cell=settings%3Aproject/);
  await page.getByRole('combobox', { name: 'Read by' }).selectOption('claude-code');
  await expect(page).toHaveURL(/[?&]tool=claude-code/);
  await page.getByRole('button', { name: 'Clear Read by: Claude Code' }).click();
  await page.getByRole('button', { name: 'Changed in 24 h' }).click();
  await page.getByRole('button', { name: 'Expand /example/project/.claude', exact: true }).click();
  const table = page.getByRole('table', { name: 'Settings files' });
  await expect(table).toHaveAttribute('aria-rowcount', '64');
  await expect(table.getByRole('row')).not.toHaveCount(64);
  const last = table.getByRole('button', { name: 'Inspect example59.json' });
  await expect(last).toHaveCount(0);
  await page.getByRole('region', { name: 'Settings files scroll area' }).press('End');
  await expect(last).toBeInViewport();
  await last.press('Space');
  await expect(inspector(page).getByRole('heading', { name: 'example59.json' })).toBeVisible();
  await expect(inspector(page).getByRole('button', { name: 'Open file' })).toBeVisible();
});

settings('SET-09 and DEF-04: failed details stop loading and keep configured paths', async ({ page, settingsReplay }) => {
  await page.route('**/api/settings/files', route => route.fulfill({ status: 500, json: { error: 'Read failed' } }));
  await open(page, settingsReplay, '?screen=settings&pivot=files');
  await expect(page.getByRole('alert').getByText('File details could not be loaded.')).toBeVisible();
  await expect(page.getByText('Loading file details…')).toHaveCount(0);
  await expect(page.getByRole('table', { name: 'Settings files' }).getByRole('cell', { name: 'settings.local.json', exact: true })).toBeVisible();
});

settings('SET-10/14: finding counts, rule filters, progress, rescan, and diagnostic detail', async ({ page, settingsReplay }) => {
  let held;
  await page.route('**/api/context-audit?**', route => {
    if (new URL(route.request().url()).searchParams.get('refresh') === '1') {
      held = route;
      return;
    }
    return route.fulfill({ json: audit });
  });
  await open(page, settingsReplay, '?screen=settings&pivot=findings');
  await expect(page.getByRole('meter', { name: 'High severity' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Finding rule' }).selectOption('ignored_settings');
  await expect(page).toHaveURL(/[?&]sec=ignored_settings/);
  await page.getByRole('button', { name: 'Inspect settings.local.json' }).click();
  await expect(inspector(page).getByText('Review the configuration.')).toBeVisible();
  await page.keyboard.press('Escape');
  const rescan = page.getByRole('button', { name: 'Rescan' });
  await expect(rescan).toBeEnabled();
  const [request] = await Promise.all([
    page.waitForRequest(req => new URL(req.url()).searchParams.get('refresh') === '1'),
    rescan.click(),
  ]);
  expect(new URL(request.url()).pathname).toBe('/api/context-audit');
  await expect(page.getByRole('button', { name: 'Scanning…' })).toBeDisabled();
  await expect(page.getByRole('table', { name: 'Policy findings' })).toBeVisible();
  await expect.poll(() => !!held).toBe(true);
  await page.route('**/api/context-audit?nowait=1', route => route.fulfill({ json: { ...audit, findings: [] } }));
  await held.fulfill({ json: { status: 'scanning', elapsed_s: 1, step: 'Reading sources' } });
  await expect(page.getByText('Scanning: Reading sources', { exact: true })).toBeVisible();
  await expect(page.getByText('No matching findings.')).toBeVisible();
});

settings('SET-01: remote scope is unavailable; local Settings passes contrast in both themes', async ({ page, settingsReplay }) => {
  await open(page, settingsReplay, '?screen=settings&scope=fleet');
  await expect(page.getByText('Tool configuration files and policy findings are not reported for this scope.')).toBeVisible();
  await open(page, settingsReplay);
  await expect(page.getByRole('button', { name: 'Inspect Model', exact: true })).toBeVisible();
  await checkAxe(page, '[aria-label="Settings workspace"]', 'Settings in light theme');
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await page.getByRole('button', { name: 'Inspect Policy setting' }).click();
  await checkAxe(page, '#settings-inspector', 'Inspector in dark theme');
});

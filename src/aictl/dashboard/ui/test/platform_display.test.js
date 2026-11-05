// Paths, shortcut labels and cloud-only tools render correctly on any OS.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';
import { baseName, isWindowsPath, shortPath } from '../src/utils/paths.js';
import { shortDir } from '../src/utils.js';
import { commandKeyLabel, isMacPlatform } from '../src/utils/platform.js';
import { cloudOnly, scopeIsCloudOnly, toolLabel } from '../src/utils/tools.js';
import { toolVendor } from '../src/components/ui/ToolIcon.js';
import CloudOnlyNotice from '../src/components/ui/CloudOnlyNotice.js';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('paths', () => {
  it('recognises Windows forms', () => {
    expect(isWindowsPath('C:\\Users\\me')).toBe(true);
    expect(isWindowsPath('c:/Users/me')).toBe(true);
    expect(isWindowsPath('\\\\server\\share\\x')).toBe(true);
    expect(isWindowsPath('/home/me')).toBe(false);
  });
  it('baseName handles both separators and bare roots', () => {
    expect(baseName('C:\\Users\\me\\proj')).toBe('proj');
    expect(baseName('C:\\Users\\me\\proj\\')).toBe('proj');
    expect(baseName('/home/me/proj')).toBe('proj');
    expect(baseName('C:\\')).toBe('C:\\');
    expect(baseName('/')).toBe('/');
    expect(baseName('')).toBe('');
  });
  it('shortPath keeps the native separator', () => {
    expect(shortPath('C:\\Users\\me\\code\\proj')).toBe('\u2026\\code\\proj');
    expect(shortPath('/home/me/code/proj')).toBe('\u2026/code/proj');
    expect(shortPath('C:\\proj')).toBe('C:\\proj');
  });
  it('shortDir never invents ~ for a Windows path', () => {
    const out = shortDir('C:\\Users\\me\\AppData\\Roaming\\Code\\User\\settings.json', 'D:\\work');
    expect(out).toBe('AppData\\Roaming\\Code\\User');
    expect(out).not.toContain('~');
    expect(shortDir('/Users/me/.copilot/hooks/a.json', '/work')).toBe('~/.copilot/hooks');
  });
});

describe('shortcut labels', () => {
  it('read Ctrl off a Mac and the command symbol on one', () => {
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: 'Windows NT 10.0' });
    expect(isMacPlatform()).toBe(false);
    expect(commandKeyLabel()).toBe('Ctrl+K');
    vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: 'Mac OS X' });
    expect(commandKeyLabel()).toBe('\u2318K');
  });
});

describe('first screen under a cloud-only filter', () => {
  it('shows the reason instead of zero sessions or an all-tools cost', async () => {
    const { default: OverviewNow } = await import('../src/components/OverviewNow.js');
    const snap = { tools: [{ tool: 'copilot365', label: 'Microsoft 365 Copilot', files: [], processes: [] }], sessions: [] };
    const { container } = render(html`<${OverviewNow} snap=${snap} enabledTools=${['copilot365']}
      connected=${true} otelActive=${true} alerts=${[]} onOpenSession=${() => {}} onOpenTab=${() => {}}/>`);
    const running = container.querySelector('.now-panel--running').textContent;
    expect(running).toContain('Not available from this machine');
    expect(running).not.toMatch(/\b0\b/);
    const cost = container.querySelector('[aria-labelledby="now-cost"]').textContent;
    expect(cost).toContain('Not available from this machine');
    expect(cost).not.toContain('$');
  });
});

describe('cloud-hosted tools', () => {
  const m365 = { tool: 'copilot365', label: 'Microsoft 365 Copilot', files: [], processes: [], live: null };
  it('copilot365 has a vendor and a label without backend help', () => {
    expect(toolVendor('copilot365')).toBe('microsoft');
    expect(toolLabel('copilot365', null)).toBe('Microsoft 365 Copilot');
  });
  it('is cloud-only until local data exists', () => {
    expect(cloudOnly(m365)).toBe(true);
    expect(cloudOnly({ ...m365, live: { session_count: 1 } })).toBe(false);
    expect(cloudOnly({ ...m365, files: [{}] })).toBe(false);
    expect(cloudOnly({ tool: 'copilot-cli', files: [], processes: [] })).toBe(false);
  });
  it('scopeIsCloudOnly needs every selected tool to be cloud-only', () => {
    const snap = { tools: [m365, { tool: 'copilot-cli', files: [], processes: [] }] };
    expect(scopeIsCloudOnly(snap, ['copilot365'])).toBe(true);
    expect(scopeIsCloudOnly(snap, ['copilot365', 'copilot-cli'])).toBe(false);
    expect(scopeIsCloudOnly(snap, null)).toBe(false);
    expect(scopeIsCloudOnly(snap, [])).toBe(false);
  });
  it('the notice says why, and shows no figures', () => {
    const { getByRole } = render(html`<${CloudOnlyNotice} tool=${m365}/>`);
    const text = getByRole('status').textContent;
    expect(text).toContain('Not available from this machine');
    expect(text).toContain('Microsoft 365 Copilot');
    expect(text).not.toMatch(/\b0\b/);
  });
});

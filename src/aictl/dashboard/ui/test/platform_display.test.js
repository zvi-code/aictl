// Paths and cloud-hosted tool names render correctly on any OS.
import { describe, it, expect } from 'vitest';
import { baseName, isWindowsPath } from '../src/utils/paths.js';
import { toolLabel } from '../src/utils/tools.js';

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
});

describe('cloud-hosted tools', () => {
  it('copilot365 has a label without backend help', () => {
    expect(toolLabel('copilot365', null)).toBe('Microsoft 365 Copilot');
  });
});

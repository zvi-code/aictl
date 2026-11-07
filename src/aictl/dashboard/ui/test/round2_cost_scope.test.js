// Capture config text names the real key and path.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { captureHowto } from '../src/components/ui/TextNotRetained.js';

afterEach(() => { vi.unstubAllGlobals(); });

describe('capture config text', () => {
  it('names the real key and the path for this OS', () => {
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: 'Windows NT 10.0' });
    expect(captureHowto()).toContain('capture = "full"');
    expect(captureHowto()).toContain('%APPDATA%\\aictl\\config.toml');
    expect(captureHowto()).not.toContain('capture_mode');
    vi.stubGlobal('navigator', { platform: 'Linux x86_64', userAgent: 'X11' });
    expect(captureHowto()).toContain('~/.config/aictl/config.toml');
  });
});

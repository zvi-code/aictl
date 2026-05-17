// Test setup — provide browser globals that the dashboard expects
import '@testing-library/jest-dom';

// Provide window globals that Python injects at serve time
globalThis.COLORS = globalThis.COLORS ?? {};
globalThis.ICONS = globalThis.ICONS ?? {};
globalThis.VENDOR_LABELS = globalThis.VENDOR_LABELS ?? {};
globalThis.VENDOR_COLORS = globalThis.VENDOR_COLORS ?? {};
globalThis.HOST_LABELS = globalThis.HOST_LABELS ?? {};
globalThis.TOOL_RELATIONSHIPS = globalThis.TOOL_RELATIONSHIPS ?? {};

// Ensure localStorage is available and clean between tests
beforeEach(() => {
  try { localStorage.clear(); } catch {}
});

// Stub matchMedia (required by uPlot)
globalThis.matchMedia = globalThis.matchMedia || function () {
  return {
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  };
};

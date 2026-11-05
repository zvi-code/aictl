// ─── Platform labels ───────────────────────────────────────────
// The palette opens on either modifier (useCommandPalette); the label names the
// one on this keyboard.

export function isMacPlatform() {
  if (typeof navigator === 'undefined') return false;
  const id = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || '';
  return /mac|iphone|ipad/i.test(id);
}

export function isWindowsPlatform() {
  if (typeof navigator === 'undefined') return false;
  const id = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || '';
  return /win/i.test(id) && !/darwin/i.test(id);
}

export function commandKeyLabel() {
  return isMacPlatform() ? '⌘K' : 'Ctrl+K';
}

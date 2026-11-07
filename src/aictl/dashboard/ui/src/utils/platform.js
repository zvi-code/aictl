// ─── Platform labels ───────────────────────────────────────────
// Which operating system the browser runs on.

export function isWindowsPlatform() {
  if (typeof navigator === 'undefined') return false;
  const id = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || '';
  return /win/i.test(id) && !/darwin/i.test(id);
}

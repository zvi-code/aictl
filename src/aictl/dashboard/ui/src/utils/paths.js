// ─── Path display ──────────────────────────────────────────────
// Paths come from the machine aictl runs on: POSIX or Windows, drive letters and
// UNC shares included. `~` is a POSIX shell
// convention, so a Windows path is never rewritten to it.

export function isWindowsPath(p) {
  const s = String(p || '');
  return /^[A-Za-z]:([\\/]|$)/.test(s) || s.startsWith('\\\\') || (s.includes('\\') && !s.includes('/'));
}

function segments(p) {
  return String(p || '').split(/[\\/]+/).filter(Boolean);
}

/** Last path segment. A bare root stays readable: `/`, `C:\`. */
export function baseName(p) {
  const s = String(p || '');
  if (!s) return '';
  const parts = segments(s);
  if (!parts.length) return s;
  const last = parts[parts.length - 1];
  return parts.length === 1 && /^[A-Za-z]:$/.test(last) ? last + '\\' : last;
}

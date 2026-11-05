// ─── customRange — shared by the Custom time control on every screen ─
export function toLocalISOString(ts) {
  const d = new Date(ts * 1000);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

/** Validate the two datetime-local values. Returns {since, until} or {error}. */
export function parseCustomRange(start, end) {
  if (!start || !end) return { error: 'Enter both a start and an end time.' };
  const since = new Date(start).getTime() / 1000;
  const until = new Date(end).getTime() / 1000;
  if (!Number.isFinite(since) || !Number.isFinite(until)) return { error: 'Invalid date/time value.' };
  if (until <= since) return { error: 'End time must be after start time.' };
  return { since, until };
}

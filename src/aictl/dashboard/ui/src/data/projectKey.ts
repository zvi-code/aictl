/** Match the server's project_key: fold Windows paths, not POSIX path case. */
export function projectKey(path: string | null | undefined) {
  let value = (path ?? '').trim();
  if (/^file:/i.test(value)) {
    value = value.replace(/^file:(?:\/\/[^/]*)?([^?#]*)(?:[?#].*)?$/i, '$1');
    try { value = decodeURIComponent(value); } catch { /* retain an invalid URI spelling */ }
    if (value.startsWith('/') && value[2] === ':') value = value.slice(1);
  }
  if (/^[A-Za-z]:[\\/]/.test(value) || value.startsWith('\\\\')) value = value.replace(/\\/g, '/').toLowerCase();
  return value.replace(/\/+$/, '') || value;
}

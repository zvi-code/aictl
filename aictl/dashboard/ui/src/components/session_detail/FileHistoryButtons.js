import { html } from 'htm/preact';

/**
 * Pair of tiny icon buttons that open the FileViewer at the session's
 * start / end timestamp (when available). Silently renders nothing if
 * neither timestamp is available or openViewer is absent.
 */
export default function FileHistoryButtons({ path, session, openViewer }) {
  if (!path || !session || typeof openViewer !== 'function') return null;
  const start = session.started_at;
  const end = session.ended_at;
  if (!start && !end) return null;
  const open = (ts) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    openViewer(path, { at: ts });
  };
  return html`<span class="file-history-btns" aria-label="View file at session start or end">
    ${start && html`<button type="button" class="file-history-btn"
      title="View at session start"
      aria-label=${'View ' + path + ' at session start'}
      onClick=${open(start)}>\u25F7 start</button>`}
    ${end && html`<button type="button" class="file-history-btn"
      title="View at session end"
      aria-label=${'View ' + path + ' at session end'}
      onClick=${open(end)}>\u25F8 end</button>`}
  </span>`;
}

// ─── SSE connection hook — extracted from app.js for testability ─
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';

/**
 * Custom hook for Server-Sent Events with auto-reconnect.
 *
 * @param {string} url - SSE endpoint URL
 * @param {function} onMessage - callback(data) for each parsed message
 * @param {object} [opts] - options
 * @param {function} [opts.onConnect] - called when SSE connects
 * @param {function} [opts.onDisconnect] - called when SSE disconnects
 * @param {number} [opts.initialRetryMs=1000] - initial retry delay
 * @param {number} [opts.maxRetryMs=30000] - max retry delay
 * @param {function} [opts.EventSourceClass=EventSource] - injectable for tests
 * @returns {{ connected: boolean, close: function }}
 */
export function useSse(sseUrl, onMessage, opts = {}) {
  const {
    onConnect,
    onDisconnect,
    initialRetryMs = 1000,
    maxRetryMs = 30000,
    EventSourceClass = typeof EventSource !== 'undefined' ? EventSource : null,
  } = opts;

  const [connected, setConnected] = useState(false);
  const esRef = useRef(null);
  const closedRef = useRef(false);
  const retryRef = useRef(initialRetryMs);

  // Keep callbacks fresh without re-triggering effect
  const onMsgRef = useRef(onMessage);
  onMsgRef.current = onMessage;
  const onConnRef = useRef(onConnect);
  onConnRef.current = onConnect;
  const onDiscRef = useRef(onDisconnect);
  onDiscRef.current = onDisconnect;

  useEffect(() => {
    if (!EventSourceClass || !sseUrl) return;
    closedRef.current = false;
    retryRef.current = initialRetryMs;

    function connect() {
      if (closedRef.current) return;
      const es = new EventSourceClass(sseUrl);
      esRef.current = es;

      es.onopen = () => {
        setConnected(true);
        retryRef.current = initialRetryMs;
        onConnRef.current?.();
      };

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          onMsgRef.current(data);
        } catch { /* ignore malformed SSE */ }
      };

      es.onerror = () => {
        setConnected(false);
        onDiscRef.current?.();
        es.close();
        if (!closedRef.current) {
          setTimeout(connect, retryRef.current);
          retryRef.current = Math.min(retryRef.current * 2, maxRetryMs);
        }
      };
    }

    connect();

    return () => {
      closedRef.current = true;
      esRef.current?.close();
      setConnected(false);
    };
  }, [sseUrl, EventSourceClass, initialRetryMs, maxRetryMs]);

  const close = useCallback(() => {
    closedRef.current = true;
    esRef.current?.close();
    setConnected(false);
  }, []);

  return { connected, close };
}

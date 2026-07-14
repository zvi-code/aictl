import { useEffect, useMemo, useState } from 'preact/hooks';
import { html } from 'htm/preact';
import MiniChart from './MiniChart.js';
import * as api from '../api.js';
import { fmtK } from '../utils.js';

/**
 * 4 tiny sparklines (CPU, memory, net I/O, tokens/min) scoped to a
 * session's time window.
 *
 * Sample-backed charts (CPU/memory/net I/O) try the session_id tag
 * first — many collectors don't yet emit session_id, in which case
 * they fall back to the session's tool tag within the session's time
 * range. Tokens/min is bucketed from OTel api_request events already
 * tagged with session_id.
 *
 * If nothing is available for a metric, the row renders an empty-state
 * placeholder rather than a chart — this keeps layout stable.
 */

const SPARK_HEIGHT = 28;

function bucketToSeries(rows, bucketSec = 60) {
  if (!rows || !rows.length) return [[], []];
  const byBucket = new Map();
  for (const r of rows) {
    if (!r || r.ts == null) continue;
    const b = Math.floor(r.ts / bucketSec) * bucketSec;
    byBucket.set(b, (byBucket.get(b) || 0) + (r.value ?? 0));
  }
  const xs = [...byBucket.keys()].sort((a, b) => a - b);
  const ys = xs.map(x => byBucket.get(x));
  return [xs, ys];
}

async function fetchMetric(metric, session) {
  const since = session.started_at;
  if (!since) return [[], []];
  const until = session.ended_at;
  const prim = await api.getSamples(metric, {
    since,
    limit: 500,
    tags: { session_id: session.session_id },
  });
  let rows = Array.isArray(prim) ? prim : [];
  if (!rows.length && session.tool) {
    const fallback = await api.getSamples(metric, {
      since,
      limit: 500,
      tags: { 'aictl.tool': session.tool },
    });
    rows = Array.isArray(fallback) ? fallback : [];
  }
  if (until) rows = rows.filter(r => r.ts != null && r.ts <= until);
  const xs = rows.map(r => r.ts);
  const ys = rows.map(r => r.value ?? 0);
  return [xs, ys];
}

async function fetchTokensPerMin(session) {
  if (!session.started_at) return [[], []];
  const events = await api.getSessionEvents(session.session_id, {
    since: session.started_at,
    until: session.ended_at ?? undefined,
    limit: 1000,
  });
  const rows = Array.isArray(events) ? events : [];
  const pts = [];
  for (const ev of rows) {
    if (!ev || ev.ts == null) continue;
    const kind = String(ev.kind || '');
    if (!kind.includes('api_request')) continue;
    const detail = (ev.detail && typeof ev.detail === 'object') ? ev.detail : {};
    const tokIn = Number(detail.input_tokens ?? detail['gen_ai.usage.input_tokens'] ?? 0) || 0;
    const tokOut = Number(detail.output_tokens ?? detail['gen_ai.usage.output_tokens'] ?? 0) || 0;
    pts.push({ ts: ev.ts, value: tokIn + tokOut });
  }
  return bucketToSeries(pts, 60);
}

function Spark({ label, data, color, fmtVal, loading, error }) {
  const hasData = data && data[0] && data[0].length >= 2;
  return html`<div class="session-spark" title=${label}>
    <div class="session-spark-label">${label}</div>
    <div class="session-spark-chart">
      ${loading
        ? html`<span class="text-muted text-xs">\u2026</span>`
        : error
          ? html`<span class="text-muted text-xs" title=${error}>\u2014</span>`
          : hasData
            ? html`<${MiniChart} data=${data} color=${color}
                height=${SPARK_HEIGHT} fmtVal=${fmtVal}
                ariaLabel=${label + ' sparkline'}/>`
            : html`<span class="text-muted text-xs">no data</span>`}
    </div>
  </div>`;
}

export default function SessionSparklines({ session }) {
  const [cpu, setCpu] = useState({ data: null, loading: true, error: null });
  const [mem, setMem] = useState({ data: null, loading: true, error: null });
  const [net, setNet] = useState({ data: null, loading: true, error: null });
  const [tok, setTok] = useState({ data: null, loading: true, error: null });

  const sid = session?.session_id;
  const start = session?.started_at;
  const end = session?.ended_at;

  useEffect(() => {
    if (!sid) return;
    let cancelled = false;
    setCpu({ data: null, loading: true, error: null });
    setMem({ data: null, loading: true, error: null });
    setNet({ data: null, loading: true, error: null });
    setTok({ data: null, loading: true, error: null });

    fetchMetric('process.cpu.utilization', session)
      .then(d => { if (!cancelled) setCpu({ data: d, loading: false, error: null }); })
      .catch(e => { if (!cancelled) setCpu({ data: null, loading: false, error: e?.message || 'error' }); });
    fetchMetric('process.memory.usage', session)
      .then(d => { if (!cancelled) setMem({ data: d, loading: false, error: null }); })
      .catch(e => { if (!cancelled) setMem({ data: null, loading: false, error: e?.message || 'error' }); });
    fetchMetric('process.disk.io', session)
      .then(d => { if (!cancelled) setNet({ data: d, loading: false, error: null }); })
      .catch(e => { if (!cancelled) setNet({ data: null, loading: false, error: e?.message || 'error' }); });
    fetchTokensPerMin(session)
      .then(d => { if (!cancelled) setTok({ data: d, loading: false, error: null }); })
      .catch(e => { if (!cancelled) setTok({ data: null, loading: false, error: e?.message || 'error' }); });

    return () => { cancelled = true; };
  }, [sid, start, end]);

  const cpuFmt = useMemo(() => (v) => (v * 100).toFixed(0) + '%', []);
  const memFmt = useMemo(() => (v) => fmtK(v) + 'B', []);
  const ioFmt = useMemo(() => (v) => fmtK(v) + 'B', []);
  const tokFmt = useMemo(() => (v) => fmtK(v) + '/min', []);

  if (!sid) return null;
  return html`<div class="session-sparklines" aria-label="Session sparklines">
    <${Spark} label="CPU" data=${cpu.data} color="var(--blue)"
      loading=${cpu.loading} error=${cpu.error} fmtVal=${cpuFmt}/>
    <${Spark} label="Mem" data=${mem.data} color="var(--green)"
      loading=${mem.loading} error=${mem.error} fmtVal=${memFmt}/>
    <${Spark} label="I/O" data=${net.data} color="var(--orange)"
      loading=${net.loading} error=${net.error} fmtVal=${ioFmt}/>
    <${Spark} label="Tok/min" data=${tok.data} color="var(--purple, var(--accent))"
      loading=${tok.loading} error=${tok.error} fmtVal=${tokFmt}/>
  </div>`;
}

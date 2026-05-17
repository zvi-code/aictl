import { fmtPct, fmtSz } from './utils.js';

// Maps structured anomaly type → { label, detail(anomaly, process), severity }
const ANOMALY_META = {
  high_memory: {
    label: 'High memory',
    detail: (a) => {
      const actual = a.actual_mb != null ? fmtSz(a.actual_mb * 1048576) : null;
      const expected = a.expected_mb != null ? fmtSz(a.expected_mb * 1048576) : null;
      if (actual && expected) return `${actual} >> expected ${expected}`;
      return actual;
    },
    severity: 'orange',
  },
  cpu_spike: {
    label: 'CPU spike',
    detail: (a, p) => p.cpu_pct != null ? fmtPct(parseFloat(p.cpu_pct)) : null,
    severity: 'orange',
  },
  zombie: {
    label: 'Zombie process',
    detail: (a) => `ppid=${a.ppid}, risk=${a.risk}`,
    severity: 'red',
  },
  known_leak: {
    label: 'Known leak',
    detail: (a) => a.pattern,
    severity: 'red',
  },
  high_file_count: {
    label: 'High file count',
    detail: (a, p) => p.file_count ? `${p.file_count} open files` : null,
    severity: 'yellow',
  },
  long_running: {
    label: 'Long running',
    detail: (a, p) => p.uptime_s ? `${Math.round(p.uptime_s / 60)}min` : null,
    severity: 'yellow',
  },
};

export function describeAnomaly(anomaly, process) {
  const meta = ANOMALY_META[anomaly.type];
  if (!meta) return { label: anomaly.type, detail: null, severity: 'orange' };
  return { label: meta.label, detail: meta.detail(anomaly, process || {}), severity: meta.severity };
}

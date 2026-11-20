import { canonicalScope } from '../../src/data/store.ts';

export const liveCapabilities = {
  enabled: true, protocol: 1, stream: '/api/live/stream',
  source_policy: { usage: 'kusto.queryable', cost: 'kusto.queryable', native_output: 'runtime.native' },
  topics: {
    'runtime.agent': {
      sources: ['runtime.collector'], delivery: 'latest',
      fields: ['id', 'session_id', 'native_session_id', 'tool', 'project', 'pids', 'running', 'native_activity', 'status', 'cpu_percent', 'mem_mb', 'title', 'parent_id', 'started_at'],
    },
    'runtime.process': { sources: ['runtime.collector'], delivery: 'latest' },
    'runtime.machine': { sources: ['runtime.collector'], delivery: 'latest' },
    'runtime.health': { sources: ['runtime.operational'], delivery: 'latest' },
    'runtime.output': { sources: ['runtime.native'], delivery: 'ordered' },
    'configuration.file': { sources: ['filesystem.config'], delivery: 'latest' },
    'configuration.loaded': { sources: ['runtime.evidence', 'runtime.native'], delivery: 'latest' },
    'configuration.board': { sources: ['filesystem.config'], delivery: 'latest' },
    'catalog.board': { sources: ['catalog'], delivery: 'latest' },
    'history.board': { sources: ['kusto.queryable'], delivery: 'latest' },
    'source.status': { sources: ['runtime.operational'], delivery: 'latest' },
  },
};

export function liveEntity(topic, id, data, revision = 1, source = liveCapabilities.topics[topic].sources[0]) {
  return { topic, id, data, revision, source };
}

export function liveEnvelope(sequence, fields = {}, query = '') {
  return { protocol: 1, epoch: 'daemon', sequence, cursor: 'daemon:' + sequence, scope: canonicalScope(query), ...fields };
}

export function liveBootstrap(entities = [], query = '', sequence = 1, fields = {}) {
  return liveEnvelope(sequence, { capabilities: liveCapabilities, entities, ...fields }, query);
}

export function liveField(field, value, query = '', revision = 1, extra = {}) {
  return liveEntity('history.board', field + ':' + (extra.key || ''), { scope: canonicalScope(query), field, value, ...extra }, revision);
}

export class ControlledEventSource {
  static instances = [];
  constructor(url) {
    this.url = url;
    this.listeners = new Map();
    this.closed = false;
    ControlledEventSource.instances.push(this);
  }

  addEventListener(type, callback) { this.listeners.set(type, callback); }
  open() { this.onopen?.(); }
  emit(type, payload) { this.listeners.get(type)?.({ data: JSON.stringify(payload) }); }
  fail() { this.onerror?.(); }
  close() { this.closed = true; }
}

export function boardEventSource({ board, machine, health, config } = {}) {
  return class extends ControlledEventSource {
    constructor(url) {
      super(url);
      queueMicrotask(() => {
        if (this.closed) return;
        const query = new URL(url, 'http://localhost').search;
        const params = new URLSearchParams(query);
        const history = params.get('history') !== '0';
        const data = history ? board?.(params) : undefined;
        const sample = machine?.(params) ?? data;
        const healthData = health?.();
        const configData = config?.();
        const entities = [
          liveEntity('source.status', 'collector', { ready: true, producer: 'runtime-collector' }),
          ...(history ? [liveEntity('source.status', 'history:scope', { scope: canonicalScope(query), component: 'history', ready: true })] : []),
        ];
        for (const [field, value] of Object.entries(data ?? {})) {
          if (field === 'agents') {
            for (const row of value) entities.push(liveField(field, row, query, 1, { key: row.id }));
          } else if (field !== 'processes' && field !== 'self') {
            entities.push(liveField(field, value, query));
          }
        }
        const processes = sample?.processes ?? [];
        if (sample) entities.push(liveEntity('runtime.machine', 'local', {
          ...sample,
          self: data?.self,
          processes: processes.map(row => ({ ...row, cmdline: null, cleanup_cmd: null })),
        }));
        for (const row of processes) entities.push(liveEntity('runtime.process', String(row.pid), {
          pid: row.pid, ppid: row.ppid ?? null, name: row.name, tool: row.tool, present: true,
          cpu_percent: row.cpu_percent ?? row.cpu_pct ?? null,
          memory_rss_bytes: row.mem_mb == null ? null : row.mem_mb * 1048576,
        }));
        for (const row of data?.agents ?? []) {
          if (['running', 'waiting', 'looping'].includes(row.status)) {
            const fields = liveCapabilities.topics['runtime.agent'].fields;
            const runtime = Object.fromEntries(Object.entries(row).filter(([field]) => fields.includes(field)));
            const pids = (data.processes ?? []).filter(process => process.agent_id === row.id).map(process => process.pid);
            entities.push(liveEntity('runtime.agent', row.id, { ...runtime, running: true, session_id: row.id, pids }));
          }
        }
        if (healthData) entities.push(liveEntity('runtime.health', 'local', healthData));
        if (configData) entities.push(liveEntity('configuration.file', 'current', configData));
        this.open();
        this.emit('bootstrap', liveBootstrap(entities, query));
      });
    }
  };
}

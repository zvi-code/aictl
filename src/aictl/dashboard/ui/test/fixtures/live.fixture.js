import { canonicalScope } from '../../src/live/model.js';

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

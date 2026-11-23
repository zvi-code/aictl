import { canonicalScope } from '../../src/data/store';
import type { LiveCapabilities } from '../../src/data/contract.gen';

export const liveCapabilities = {
  enabled: true, protocol: 1, stream: '/api/live/stream',
  source_policy: { usage: 'kusto.queryable', cost: 'kusto.queryable', native_output: 'runtime.native' },
  topics: {
    'runtime.agent': {
      sources: ['runtime.collector'], delivery: 'latest',
      fields: ['id', 'session_id', 'native_session_id', 'tool', 'project', 'pids', 'running', 'native_activity', 'status', 'cpu_percent', 'mem_mb', 'title', 'parent_id', 'started_at', 'status_evidence'],
    },
    'runtime.process': { sources: ['runtime.collector'], delivery: 'latest' },
    'runtime.machine': { sources: ['runtime.collector'], delivery: 'latest' },
    'runtime.health': { sources: ['runtime.operational'], delivery: 'latest' },
    'runtime.output': { sources: ['runtime.native'], delivery: 'ordered' },
    'configuration.file': { sources: ['filesystem.config'], delivery: 'latest' },
    'configuration.loaded': { sources: ['runtime.evidence', 'runtime.native'], delivery: 'latest' },
    'configuration.board': { sources: ['filesystem.config'], delivery: 'latest' },
    'catalog.board': { sources: ['catalog'], delivery: 'latest' },
    'history.agent': { sources: ['kusto.queryable'], delivery: 'latest' },
    'history.board': { sources: ['kusto.queryable'], delivery: 'latest' },
    'source.status': { sources: ['runtime.operational'], delivery: 'latest' },
  },
} satisfies Pick<LiveCapabilities, 'enabled' | 'protocol' | 'stream' | 'source_policy' | 'topics'>;

export function liveEntity(topic: keyof typeof liveCapabilities.topics, id: string, data: unknown, revision = 1,
  source = liveCapabilities.topics[topic].sources[0]) {
  return { topic, id, data, revision, source };
}

export function liveEnvelope(sequence: number, fields: Record<string, unknown> = {}, query = '') {
  return { protocol: 1, epoch: 'daemon', sequence, cursor: 'daemon:' + sequence, scope: canonicalScope(query), ...fields };
}

export function liveBootstrap(entities: unknown[] = [], query = '', sequence = 1, fields = {}) {
  return liveEnvelope(sequence, { capabilities: liveCapabilities, entities, ...fields }, query);
}

export function liveField(field: string, value: unknown, query = '', revision = 1, extra: Record<string, unknown> = {}) {
  return liveEntity('history.board', field + ':' + (extra.key || ''), { scope: canonicalScope(query), field, value, ...extra }, revision);
}

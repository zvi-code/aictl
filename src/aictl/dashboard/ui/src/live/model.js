const BOARD_TOPICS = ['catalog.board', 'configuration.board', 'history.board'];
export const MAX_REMOVAL_REVISIONS = 4096;

export const initialLiveState = () => ({
  mode: 'pending', capabilities: null, connected: false, everConnected: false,
  epoch: null, sequence: -1, cursor: null, scope: '', ready: false,
  entities: new Map(), revisions: new Map(), error: null, orderedGap: false,
  topics: new Map(), boardFields: new Map(), board: {},
  retention: null, resetReason: null,
});

export function canonicalScope(query = '') {
  const encode = value => encodeURIComponent(value).replace(/[!'()*]/g, character => '%' + character.charCodeAt(0).toString(16).toUpperCase()).replace(/%20/g, '+');
  return [...new URLSearchParams(query)]
    .filter(([key]) => !['cursor', 'history'].includes(key))
    .sort(([ak, av], [bk, bv]) => ak < bk ? -1 : ak > bk ? 1 : av < bv ? -1 : av > bv ? 1 : 0)
    .map(([key, value]) => encode(key) + '=' + encode(value)).join('&');
}

const entityKey = entity => entity.topic + '\u0000' + entity.id;
const validRevision = value => Number.isSafeInteger(value) && value >= 0;

function assertEntity(entity, capabilities, removal = false) {
  if (!entity || typeof entity.topic !== 'string' || typeof entity.id !== 'string' || !entity.id || !validRevision(entity.revision)
      || (!removal && (!entity.data || typeof entity.data !== 'object' || Array.isArray(entity.data)))) {
    throw new Error('Invalid live entity identity or revision.');
  }
  const descriptor = capabilities?.topics?.[entity.topic];
  if (!descriptor || (!removal && !descriptor.sources?.includes(entity.source))) {
    throw new Error('Live entity does not match the advertised source authority.');
  }
}

function projectField(entities) {
  let present = false;
  let collection = false;
  let value;
  const rows = new Map();
  for (const topic of BOARD_TOPICS) {
    for (const entity of entities.values()) {
      if (entity.topic !== topic) continue;
      const data = entity.data;
      if (data.key != null) {
        const previous = rows.get(data.key);
        const merge = data.merge || previous?.merge;
        rows.set(data.key, {
          ...previous, id: String(data.key), ...data, merge,
          value: merge ? { ...previous?.value, ...data.value } : data.value,
        });
      } else {
        present = true;
        value = data.value;
        collection ||= !!data.collection;
      }
    }
  }
  return {
    present: present || rows.size > 0,
    value: collection || rows.size ? [...rows.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id)).map(row => row.value) : value,
  };
}

/** Revisions include removal tombstones, so replay cannot resurrect an older row. */
export function reduceLiveEnvelope(state, type, message) {
  if (message?.protocol !== 1 || typeof message.epoch !== 'string' || typeof message.scope !== 'string' || !validRevision(message.sequence)
      || message.cursor !== message.epoch + ':' + message.sequence) {
    throw new Error('Invalid live stream envelope.');
  }
  if (canonicalScope(message.scope) !== state.scope) return state;
  const bootstrap = type === 'bootstrap';
  if (!bootstrap && type !== 'change') throw new Error('Unknown live stream message.');
  if (!bootstrap && (!state.ready || message.epoch !== state.epoch)) {
    throw new Error('The live stream requires a new snapshot.');
  }
  if (message.epoch === state.epoch && message.sequence < state.sequence) return state;
  if (!bootstrap && message.sequence === state.sequence) return state;
  const capabilities = bootstrap ? message.capabilities || state.capabilities : state.capabilities;
  if (capabilities?.protocol !== 1 || capabilities?.enabled !== true) throw new Error('Invalid live source capabilities.');
  const upserts = bootstrap ? message.entities : message.upserts || [];
  const removals = bootstrap ? [] : message.removals || [];
  if (!Array.isArray(upserts) || !Array.isArray(removals)) throw new Error('Invalid live stream changes.');
  for (const entity of upserts) assertEntity(entity, capabilities);
  for (const entity of removals) assertEntity(entity, capabilities, true);
  const entities = bootstrap ? new Map() : new Map(state.entities);
  const revisions = bootstrap ? new Map() : new Map(state.revisions);
  const topics = bootstrap ? new Map() : new Map(state.topics);
  const boardFields = bootstrap ? new Map() : new Map(state.boardFields);
  const changedTopics = new Set();
  const changedFields = new Set();
  const index = (entity, remove = false) => {
    if (!entity) return;
    if (!changedTopics.has(entity.topic)) {
      changedTopics.add(entity.topic);
      topics.set(entity.topic, new Map(topics.get(entity.topic)));
    }
    const key = entityKey(entity);
    if (remove) topics.get(entity.topic).delete(key);
    else topics.get(entity.topic).set(key, entity);
    const field = entity.data?.field;
    if (!BOARD_TOPICS.includes(entity.topic) || entity.data?.scope !== state.scope || typeof field !== 'string') return;
    if (!changedFields.has(field)) {
      changedFields.add(field);
      boardFields.set(field, new Map(boardFields.get(field)));
    }
    if (remove) boardFields.get(field).delete(key);
    else boardFields.get(field).set(key, entity);
  };
  for (const entity of upserts) {
    const key = entityKey(entity);
    if (revisions.has(key) && revisions.get(key) >= entity.revision) continue;
    index(entities.get(key), true);
    revisions.set(key, entity.revision);
    entities.set(key, entity);
    index(entity);
  }
  for (const entity of removals) {
    const key = entityKey(entity);
    if (revisions.has(key) && revisions.get(key) >= entity.revision) continue;
    index(entities.get(key), true);
    revisions.set(key, entity.revision);
    entities.delete(key);
  }
  if (revisions.size - entities.size > MAX_REMOVAL_REVISIONS) throw new Error('Live removal revision capacity requires a new snapshot.');
  const board = bootstrap || changedFields.size ? { ...(bootstrap ? {} : state.board) } : state.board;
  for (const field of changedFields) {
    const projected = projectField(boardFields.get(field));
    if (projected.present) board[field] = projected.value;
    else { delete board[field]; boardFields.delete(field); }
  }
  return {
    ...state, capabilities, entities, revisions, topics, boardFields, board, ready: true, error: null,
    epoch: message.epoch, sequence: message.sequence, cursor: message.cursor,
    orderedGap: bootstrap ? !!message.ordered_gap : state.orderedGap,
    retention: bootstrap ? message.retention || null : state.retention,
    resetReason: bootstrap ? message.reason || null : state.resetReason,
  };
}

export function topicEntities(state, topic) {
  if (state?.topics) return [...(state.topics.get(topic)?.values() || [])];
  return [...(state?.entities?.values() || [])].filter(entity => entity.topic === topic);
}

export function topicData(state, topic, id = null) {
  return topicEntities(state, topic).find(entity => id == null || entity.id === id)?.data ?? null;
}

/** Scalar fields and stable collection rows share the server's board field projection. */
export function projectedBoard(state) {
  return state.board || {};
}

function matchesStatus(agent, status = 'all') {
  const present = agent.running === true && agent.status === 'unknown';
  return status === 'active' ? agent.running === true || ['running', 'idle', 'waiting', 'looping'].includes(agent.status)
    : status === 'all' || status === agent.status || (status === 'running' && present);
}

function matchesAgent(agent, filters, tools) {
  if (!isStoredToolSelected(agent.tool, tools)) return false;
  if (filters?.project && filters.project !== 'all' && projectKey(filters.project) !== projectKey(agent.project)) return false;
  if (filters?.model && filters.model !== 'all' && !agent.models?.includes(filters.model)) return false;
  if (!matchesStatus(agent, filters?.status)) return false;
  const q = filters?.q?.toLowerCase();
  return !q || [agent.id, agent.title, agent.tool, agent.project].some(value => String(value || '').toLowerCase().includes(q));
}

/** Only centrally advertised runtime fields can replace fields on a historical row. */
export function mergeRuntimeAgents(historical, state, filters = {}, tools = null) {
  const fields = state.capabilities?.topics?.['runtime.agent']?.fields || [];
  const rows = new Map(historical.map(agent => [agent.id, {
    ...agent, queryable: true,
    status: ['running', 'idle', 'waiting', 'looping'].includes(agent.status) ? 'unknown' : agent.status,
    cpu_percent: null, mem_mb: null, pids: null,
  }]));
  for (const entity of topicEntities(state, 'runtime.agent')) {
    const data = entity.data || {};
    const id = data.session_id || data.native_session_id || data.id || entity.id;
    const previous = rows.get(id);
    const runtime = {};
    for (const field of fields) {
      if (field === 'activity') continue;
      if (Object.hasOwn(data, field)) runtime[field] = data[field];
    }
    const row = {
      id, title: id, short: id.slice(0, 8), parent_id: null, models: [],
      ...previous, ...runtime, id,
      runtime_present: true, queryable: !!previous,
    };
    if (data.project_path && !runtime.project) row.project = data.project_path;
    if (Array.isArray(row.pids)) { row.pid_list = row.pids; row.pids = row.pids.length; }
    if (!previous && !matchesAgent(row, filters, tools)) continue;
    rows.set(id, row);
  }
  return [...rows.values()].filter(agent => matchesStatus(agent, filters.status));
}

export function nativeOutput(state, sessionId) {
  return topicEntities(state, 'runtime.output')
    .filter(entity => entity.data?.session_id === sessionId)
    .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0) || a.id.localeCompare(b.id));
}

export function liveProcessTree(state, agent) {
  const processes = topicEntities(state, 'runtime.process')
    .map(entity => entity.data)
    .filter(process => agent.pid_list?.includes(process.pid) || process.session_id === (agent.session_id || agent.id));
  const byPid = new Map(processes.map(process => [process.pid, process]));
  return processes.map(process => {
    let parent = process.ppid;
    let depth = 0;
    const seen = new Set([process.pid]);
    while (byPid.has(parent) && !seen.has(parent)) {
      seen.add(parent); depth++; parent = byPid.get(parent).ppid;
    }
    return {
      ...process, depth,
      mem_mb: process.mem_mb ?? (process.memory_rss_bytes == null ? null : process.memory_rss_bytes / 1048576),
    };
  });
}

export function sourceStatuses(state) {
  return topicEntities(state, 'source.status')
    .filter(entity => !entity.data?.scope || entity.data.scope === state.scope)
    .map(entity => ({ id: entity.id, ...entity.data }));
}

export function historyReady(state) {
  return sourceStatuses(state).some(source => source.id.startsWith('history:') && source.ready === true)
    || topicEntities(state, 'history.board').length > 0;
}

export function runtimeReady(state) {
  return sourceStatuses(state).some(source => source.producer === 'runtime-collector' && source.ready === true);
}
/** Transport readiness does not mean that an asynchronously produced baseline exists. */
export function requestedBaselinesReady(state, requiredTopics) {
  if (!state.ready) return false;
  const statuses = sourceStatuses(state);
  return requiredTopics.every(topic => {
    const sources = statuses.filter(source => source.topic === topic || source.topics?.includes(topic)
      || (topic === 'history.board' && source.component === 'history' && source.scope === state.scope));
    if (sources.length) return sources.some(source => source.ready === true || (source.pending === false && !!source.error));
    return topicEntities(state, topic).length > 0;
  });
}
import { projectKey } from '../utils/paths.js';
import { isStoredToolSelected } from '../utils/toolScope.js';

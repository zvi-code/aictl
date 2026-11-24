// The time range and tool filter live in the URL so a link reproduces a view.
import { afterEach, describe, it, expect } from 'vitest';
import {
  agentLinkOf, boardNodeScope, mergeSearch, parseUrlState, rangeToParams, scopeParam, setDefaultNodeScope, toolsToParams,
} from '../src/data/urlState';
import { readSettingsUrl, settingsParams, nextSettings } from '../src/settings/model';
import { boardRangePatch, parseFilters } from '../src/data/filters';

describe('parseUrlState', () => {
  it('reads preset range and tools', () => {
    expect(parseUrlState('?range=24h&tools=claude-code,codex-cli')).toEqual({
      range: { id: '24h' }, tools: ['claude-code', 'codex-cli'],
    });
  });
  it('treats an empty tools param as "none selected", not "all"', () => {
    expect(parseUrlState('?tools=').tools).toEqual([]);
  });
  it('rejects a custom range with a bad window', () => {
    expect(parseUrlState('?range=custom&since=20&until=10').range).toBeUndefined();
    expect(parseUrlState('?range=custom&since=10&until=20').range).toEqual({ id: 'custom', since: 10, until: 20 });
  });
});

describe('mergeSearch', () => {
  it('sets, removes, and keeps unrelated keys, with readable commas', () => {
    expect(mergeSearch('?x=1&agent=a', { agent: null, tools: 'a,b' })).toBe('?x=1&tools=a,b');
    expect(mergeSearch('?agent=a', { agent: null })).toBe('');
  });
});

describe('serializers', () => {
  it('omit defaults so a plain view has a plain URL', () => {
    expect(rangeToParams({ id: 'live' }).range).toBeNull();
    expect(toolsToParams(null).tools).toBeNull();
  });
  it('round-trip a custom range', () => {
    const p = rangeToParams({ id: 'custom', since: 100.7, until: 200.2 });
    expect(p).toEqual({ range: 'custom', since: 100, until: 200 });
  });
});

describe('BRD-RANGE-01 · the board address says the range the board shows', () => {
  it('drops a range the board has no window for, such as the Insights "all"', () => {
    const patch = boardRangePatch('?range=all&scope=fleet');
    expect(patch).toEqual({ range: null, since: null, until: null, sel: null });
    const fixed = mergeSearch('?range=all&scope=fleet', patch!);
    expect(fixed).toBe('?scope=fleet');
    expect(parseFilters(fixed).range.id).toBe('24h');
    expect(boardRangePatch('?range=custom&since=9')).toBeDefined();
  });

  it('leaves a range the board shows alone', () => {
    for (const search of ['', '?scope=fleet', '?range=7d', '?range=24h', '?range=custom&since=100&until=200']) {
      expect(boardRangePatch(search)).toBeUndefined();
    }
  });
});

describe('the node scope of an address', () => {
  afterEach(() => setDefaultNodeScope('fleet'));

  it('opens All nodes when the address names no scope', () => {
    for (const search of ['', '?range=24h', '?screen=insights&range=all', '?agent=s-1']) expect(boardNodeScope(search)).toBe('fleet');
  });

  it('keeps every explicit scope as it was', () => {
    expect(boardNodeScope('?scope=fleet')).toBe('fleet');
    expect(boardNodeScope('?scope=node&node_id=box')).toBe('node');
    expect(boardNodeScope('?node_id=box')).toBe('node');
    expect(boardNodeScope('?scope=local')).toBe('local');
  });

  it('reads a Settings value of scope as This node, the only scope that has Settings', () => {
    expect(boardNodeScope('?screen=settings&scope=project-local')).toBe('local');
  });

  it('opens This node when the daemon cannot answer fleet reads, and still honours an explicit scope', () => {
    setDefaultNodeScope('local');
    expect(boardNodeScope('')).toBe('local');
    expect(boardNodeScope('?scope=fleet')).toBe('fleet');
    expect(boardNodeScope('?scope=node&node_id=box')).toBe('node');
  });

  it('writes scope only where the address would otherwise show another scope', () => {
    expect(scopeParam('fleet')).toBeNull();
    expect(scopeParam('local')).toBe('local');
    expect(scopeParam('node')).toBe('node');
    setDefaultNodeScope('local');
    expect(scopeParam('local')).toBeNull();
    expect(scopeParam('fleet')).toBe('fleet');
  });

  it('a written This node survives a round trip through the address', () => {
    const written = mergeSearch('?range=24h', { scope: scopeParam('local') });
    expect(written).toBe('?range=24h&scope=local');
    expect(boardNodeScope(written)).toBe('local');
    expect(boardNodeScope(mergeSearch(written, { scope: scopeParam('fleet') }))).toBe('fleet');
  });

  it('the Settings workspace keeps This node in the address when it clears its own scope', () => {
    const state = readSettingsUrl('?screen=settings&scope=local');
    expect(state.scope).toBe('');
    const written = mergeSearch('?screen=settings&scope=project-local', settingsParams(nextSettings(readSettingsUrl('?scope=project-local'), { scope: '' }), true));
    expect(boardNodeScope(written)).toBe('local');
    expect(readSettingsUrl(written).scope).toBe('');
    const own = mergeSearch('?scope=local', settingsParams({ ...state, scope: 'project-local' }, true));
    expect(boardNodeScope(own)).toBe('local');
    expect(readSettingsUrl(own).scope).toBe('project-local');
  });

  it('a session link in a named node keeps the node scope', () => {
    expect(boardNodeScope(agentLinkOf('?scope=fleet', 's-1', 'box'))).toBe('node');
  });
});

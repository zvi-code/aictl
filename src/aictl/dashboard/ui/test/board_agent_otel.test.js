// What OpenTelemetry sent for a session, in the agent drawer: the Sources line that says
// whether OTel reached it, and the values only OTel has, each marked as from OTel. The
// Sources panel of the board says plainly when Copilot CLI's endpoint variable is wrong.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/preact';
import { html } from 'htm/preact';
import Drawer from '../src/components/board/Drawer.js';
import { OtelOverview, OtelSources, inContextModel, otelCallsDef, otelContextText, serverLabel, sourcesLine, sourcesNote } from '../src/components/board/agent/OtelPanels.js';
import { parseFilters } from '../src/components/board/filters.js';
import { stamp } from '../src/components/board/format.js';
import { buildPanel } from '../src/components/board/panels.js';
import { normalizeBoard } from '../src/components/board/useBoardData.js';
import { NOW, agentDetailFixture, boardFixture, machineFixture } from './fixtures/board.fixture.js';

// The shape /api/board/agent returns for the Copilot CLI session of the real OTel sample.
const OTEL = {
  spans: { count: 4, last_ts: NOW - 60 },
  span_events: { count: 19, last_ts: NOW - 55 },
  logs: { count: 0, last_ts: null },
  metrics: null,
  calls: [
    { ts: NOW - 70, end_ts: NOW - 66, model: 'gpt-6.1-sol', turn_id: '0', initiator: 'user', cost: 1, nano_aiu: 2573720000, ai_credits: 2.57372, ttft_ms: 3651.1, server_ms: 3416, duration_ms: 4101, matched: true, request_ts: NOW - 66 },
    { ts: NOW - 65, end_ts: NOW - 60, model: 'gpt-6.1-sol', turn_id: '1', initiator: 'agent', cost: 1, nano_aiu: 313990000, ai_credits: 0.31399, ttft_ms: 3554.8, server_ms: 4546, duration_ms: 4550, matched: false, request_ts: null, tokens: { input: 21482, output: 71, cache_read: 21364, cache_write: 115 } },
  ],
  totals: { calls: 2, matched: 1, nano_aiu: 2887710000, ai_credits: 2.88771, cost: 2 },
  context: { ts: NOW - 55, current: 21957, limit: 272000, share: 0.0807, messages: 7, reports: 2 },
  in_context: {
    ts: NOW - 70, turns: 1, agent_type: 'builtin',
    skills: ['exit-pack', 'tools-expert', 'deploy', 'setup', 'debug-app', 'edit-app', 'pr-stack'],
    custom_agents: ['tools-expert'],
    mcp_servers: [{ hash: '4c96a3dc55eb446a', name: 'github-mcp-server', state: 'initialized' }, { hash: '36f6aa30fba4b5d4', name: null, state: 'discovered' }],
  },
  mcp_lifecycle: [{ ts: NOW - 70, state: 'initialized', hash: '4c96a3dc55eb446a', name: 'github-mcp-server', source: 'builtin' }],
  mcp_servers: [{ ts: NOW - 70, state: 'initialized', hash: '4c96a3dc55eb446a', name: 'github-mcp-server', source: 'builtin' }],
};
const SOURCES = { session_file: 3, otel_spans: 4, otel_span_events: 19, otel_last_ts: NOW - 55, hooks: 0, hooks_last_ts: null };
const NOW_MS = NOW * 1000;

const jsonResponse = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });

function openAgent(tab, extra) {
  const data = boardFixture();
  const id = data.agents[0].id;
  const fixture = agentDetailFixture(id);
  const detail = { ...fixture, agent: { ...fixture.agent, tool: 'copilot-cli' }, context: { calls: 2, first: 21000, last: 21500, peak: 21500, drops: 0, series: [21000, 21500], compactions: [] }, ...extra };
  vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(detail)));
  const ctx = { data, refreshKey: 1, stopped: {}, toolName: x => x, query: '' };
  return render(html`<${Drawer} stack=${[{ type: 'agent', id, tab }]} ctx=${ctx} act=${{ setDrawerTab() {}, copy() {}, openDrawer() {} }}/>`);
}

afterEach(() => vi.unstubAllGlobals());

describe('the Sources line', () => {
  it('counts each source and says when OTel last came', () => {
    expect(sourcesLine(SOURCES, NOW_MS)).toBe('Session file 3 records · OTel 4 spans, last ' + stamp(NOW - 55, false, NOW_MS) + ' · Hooks 0');
    expect(sourcesNote(SOURCES, 'copilot-cli')).toContain('19 span events');
  });

  it('says OTel none, and how to check, when no span reached the session', () => {
    const none = { ...SOURCES, otel_spans: 0, otel_span_events: 0, otel_last_ts: null, hooks: 5 };
    expect(sourcesLine(none, NOW_MS)).toBe('Session file 3 records · OTel none · Hooks 5');
    expect(sourcesNote(none, 'copilot-cli')).toContain('OTEL_EXPORTER_OTLP_ENDPOINT');
    expect(sourcesNote(none, 'copilot-cli')).toContain('aictl otel status');
  });

  it('is in the Overview of a main agent', async () => {
    const { container } = openAgent('overview', { otel: OTEL, sources: SOURCES });
    await waitFor(() => expect(container.querySelector('[data-testid="agent-sources"]')).toBeTruthy());
    expect(container.querySelector('[data-testid="agent-sources"]').textContent).toBe(sourcesLine(SOURCES));
  });

  it('is not drawn when the detail has no sources', () => {
    const { container } = render(html`<${OtelSources} a=${{ tool: 'copilot-cli' }} data=${{ sources: null }}/>`);
    expect(container.textContent).toBe('');
  });
});

describe('the OTel-only values', () => {
  it('lists each model call with its AI credits, first chunk and server time, matched to the session file', () => {
    const def = otelCallsDef(OTEL);
    expect(def.cols.map(c => c.l)).toEqual(['Time', 'Model', 'AI credits', 'First chunk', 'Server', 'Session file']);
    const [a, b] = def.rows;
    expect([a.cells.cr.v, a.cells.ft.v, a.cells.sv.v, a.cells.sf.v]).toEqual(['2.57', '3.7 s', '3.4 s', 'Same call']);
    expect(b.cells.sf.v).toBe('Not in it');
    expect(b.cells.sf.title).toContain('No total adds them');
    expect(a.cells.cr.title).toContain('From OpenTelemetry');
  });

  it('shows the context use against the limit and what the turn had in context', () => {
    expect(otelContextText(OTEL)).toBe('22 k of 272 k tokens (8%), 7 messages');
    const m = inContextModel(OTEL);
    expect(m.groups.map(g => [g.label, g.items.length])).toEqual([['Skills', 7], ['Custom agents', 1], ['MCP servers', 2]]);
    expect(m.groups[2].items).toEqual(['github-mcp-server (initialized)', 'server 36f6aa30 (discovered)']);
    expect(serverLabel({ hash: 'abcdef0123456789' })).toBe('server abcdef01');
    expect(inContextModel({ ...OTEL, in_context: null })).toBeNull();
  });

  it('draws the panels marked as from OTel, and nothing without an otel block', () => {
    const { container } = render(html`<${OtelOverview} data=${{ otel: OTEL }}/>`);
    expect(container.querySelector('#dr-aotc h3').textContent).toBe('Model calls, from OTel');
    expect(container.querySelector('#dr-aoic h3').textContent).toBe('In context, from OTel');
    expect(container.querySelector('#dr-aotc .bd-psub').textContent).toBe('2 calls, 2.89 AI credits');
    expect(container.querySelector('#dr-aoic').textContent).toContain('github-mcp-server (initialized)');
    const empty = render(html`<${OtelOverview} data=${{ otel: null }}/>`);
    expect(empty.container.textContent).toBe('');
  });

  it('puts the live context use in the Context card', async () => {
    const { container } = openAgent('context', { otel: OTEL, sources: SOURCES });
    await waitFor(() => expect(container.querySelector('[data-testid="ctx-otel"]')).toBeTruthy());
    expect(container.querySelector('[data-testid="ctx-otel"]').textContent).toBe('OTel now 22 k of 272 k tokens (8%) · 7 messages');
  });

  it('leaves the Context card as it was when OTel sent no usage', async () => {
    const { container } = openAgent('context', { otel: { ...OTEL, context: null }, sources: SOURCES });
    await waitFor(() => expect(container.querySelector('#dr-actx')).toBeTruthy());
    expect(container.querySelector('[data-testid="ctx-otel"]')).toBeNull();
  });
});

describe('Copilot CLI endpoint in the Sources panel', () => {
  const sources = machine => {
    const board = boardFixture();
    const data = normalizeBoard({ ...board, sources: [...board.sources, { tool: 'copilot-cli', label: 'Copilot CLI', data_from: 'Session files', locations: [], last_data_ts: NOW }], machine });
    const ctx = { data, series: {}, range: data.range, chartRange: data.range, sel: null, filters: parseFilters(''), tools: null, toolIds: [], settingToolIds: [], toolName: x => x, nowS: NOW, stopped: {}, findings: { list: [], settings: [] }, actions: {}, query: '' };
    return buildPanel('sources', ctx, { mode: (k, d) => d, tableView: false, folded: {}, setFold() {} }, { id: 'sources' }).table.rows.find(r => r.id === 'copilot-cli');
  };
  const withSetup = setup => { const m = machineFixture(); m.pipeline.otel_setup = { 'copilot-cli': setup }; return m; };

  it('says Not set, with the reason, when the variable is missing', () => {
    const row = sources(withSetup({ status: 'missing', text: 'Copilot CLI sends no OTel to aictl: OTEL_EXPORTER_OTLP_ENDPOINT is not set.' }));
    expect([row.cells.o.v, row.cells.o.cls]).toEqual(['Not set', 'warn']);
    expect(row.cells.o.title).toContain('OTEL_EXPORTER_OTLP_ENDPOINT is not set');
  });

  it('says Elsewhere when it points to another address', () => {
    const row = sources(withSetup({ status: 'elsewhere', text: 'Copilot CLI sends its OTel to http://localhost:4318, not to aictl' }));
    expect(row.cells.o.v).toBe('Elsewhere');
  });

  it('keeps None when the variable is right and nothing came yet', () => {
    const row = sources(withSetup({ status: 'ok', text: 'ok' }));
    expect(row.cells.o.v).toBe('None');
  });
});

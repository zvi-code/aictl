// The data-sources panel shows, for each tool, whether its hooks and its OTel export
// reach aictl, so a registration that does not work is visible on the board.
import { describe, expect, it } from 'vitest';
import { parseFilters } from '../src/components/board/filters.js';
import { buildPanel } from '../src/components/board/panels.js';
import { normalizeBoard } from '../src/components/board/useBoardData.js';
import { NOW, boardFixture, machineFixture } from './fixtures/board.fixture.js';

const build = machine => {
  const data = normalizeBoard({ ...boardFixture(), machine });
  const ctx = { data, series: {}, range: data.range, chartRange: data.range, sel: null, filters: parseFilters(''), tools: null, toolIds: [], settingToolIds: [], toolName: x => x, nowS: NOW, stopped: {}, findings: { list: [], settings: [] }, actions: {}, query: '' };
  return buildPanel('sources', ctx, { mode: (k, d) => d, tableView: false, folded: {}, setFold() {} }, { id: 'sources' }).table;
};

describe('hooks and OTel per tool', () => {
  it('shows the count and age of what each tool sent', () => {
    const t = build(machineFixture());
    expect(t.cols.map(c => c.l)).toEqual(expect.arrayContaining(['Hooks', 'OTel']));
    const a = t.rows.find(r => r.id === 'tool-a');
    expect(a.cells.h.v).toBe('7');
    expect(a.cells.h.sub).toBe('60 s ago');
    expect(a.cells.o.v).toBe('30');
    expect(a.sort.o).toBe(30);
  });

  it('says None, and how to check, for a tool that sent nothing', () => {
    const b = build(machineFixture()).rows.find(r => r.id === 'tool-b');
    expect(b.cells.h.v).toBe('None');
    expect(b.cells.h.title).toContain('aictl hooks status');
    expect(b.cells.o.v).toBe('None');
    expect(b.cells.o.title).toContain('aictl otel status');
  });

  it('a payload without the hook counts still draws the panel', () => {
    const m = machineFixture();
    delete m.pipeline.hooks;
    delete m.pipeline.otel_receiver.by_tool;
    const a = build(m).rows.find(r => r.id === 'tool-a');
    expect([a.cells.h.v, a.cells.o.v]).toEqual(['None', 'None']);
  });
});

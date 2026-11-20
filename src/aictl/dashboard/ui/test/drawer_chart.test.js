import { describe, expect, it } from 'vitest';
import { bucketTotals, chartModel, indexToSel, selToIndex } from '../src/components/board/drawerChartModel.js';

describe('chart', () => {
  const starts = [100, 200, 300, 400];
  const base = { starts, bucketS: 100, h: 100, width: 400 };
  it('breaks a line at null', () => {
    const m = chartModel({ ...base, kind: 'line', unit: 'n', series: [{ label: 'x', c: 'c', vals: [1, 2, null, 4] }] });
    expect(m.lines).toHaveLength(2);
    expect(m.lines[0].pts.split(' ')).toHaveLength(2);
    expect(m.lines[1].pts.split(' ')).toHaveLength(2);
  });
  it('stacks without inventing a bar for null', () => {
    const m = chartModel({ ...base, kind: 'stack', unit: 'n', series: [{ label: 'a', c: 'a', vals: [1, null, 3, 4] }, { label: 'b', c: 'b', vals: [1, null, 0, 4] }] });
    expect(m.bars.map(b => b.i)).toEqual([0, 2, 3]);
    expect(m.bars[0].segs).toHaveLength(2);
    expect(bucketTotals('stack', [{ vals: [null, 1] }], 2)).toEqual([null, 1]);
  });
  it('totals the legend over the selected time only, and shows n/a for all null', () => {
    const m = chartModel({ ...base, kind: 'stack', unit: 'n', sel: { a: 2, b: 3 }, series: [{ label: 'a', c: 'a', vals: [10, 10, 3, 4] }, { label: 'b', c: 'b', vals: [null, null, null, null] }] });
    expect(m.legend[0].value).toBe('7');
    expect(m.legend[1].value).toBe('n/a');
    expect(m.bars.find(b => b.i === 0).on).toBe(false);
    expect(m.bars.find(b => b.i === 2).on).toBe(true);
  });
  it('converts between a selected time and bucket indexes', () => {
    expect(indexToSel(2, 1, starts, 100)).toEqual({ since: 200, until: 400 });
    expect(selToIndex({ since: 200, until: 400 }, starts, 100)).toEqual({ a: 1, b: 2 });
    expect(selToIndex({ since: 900, until: 1000 }, starts, 100)).toBeNull();
  });
});

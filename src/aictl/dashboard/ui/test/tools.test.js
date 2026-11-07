// A new tool gets a full UI entry.
import { describe, it, expect } from 'vitest';
import { toolLabel } from '../src/utils/tools.js';

describe('copilot-desktop has a full UI entry', () => {
  it('has a label', () => {
    expect(toolLabel('copilot-desktop', { tools: [] })).toBe('Copilot Desktop');
  });
  it('prefers the label the snapshot sends', () => {
    expect(toolLabel('x', { tools: [{ tool: 'x', label: 'Tool X' }] })).toBe('Tool X');
    expect(toolLabel('any', null)).toBe('Unattributed');
  });
});

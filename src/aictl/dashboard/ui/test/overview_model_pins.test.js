// The first screen names the pinned model, where it comes from, and any request it contradicts.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';
import { ModelPinsRows } from '../src/components/OverviewNow.js';

afterEach(() => cleanup());

const pin = over => ({
  tool: 'copilot-cli', value: 'model-a', source: 'C:\\Users\\me\\.copilot\\settings.json', line: 88,
  in_project: false, why_in_effect: 'user level', conflicts: [], ...over,
});

describe('ModelPinsRows', () => {
  it('shows the value, file and line, and says when it is outside the project', () => {
    const { getByTestId } = render(html`<${ModelPinsRows} models=${{ 'copilot-cli': pin() }}/>`);
    const text = getByTestId('now-models').textContent;
    expect(text).toContain('model-a');
    expect(text).toContain('settings.json:88');
    expect(text).toContain('not in this project, still in effect');
  });
  it('does not call a pin inside the project out of place', () => {
    const { getByTestId } = render(html`<${ModelPinsRows} models=${{ 'copilot-cli': pin({ in_project: true }) }}/>`);
    expect(getByTestId('now-models').textContent).not.toContain('not in this project');
  });
  it('states both sides of a conflict', () => {
    const conflicts = [{ requested: ['model-b'], requested_at: 'a.agent.md:3', pinned: 'model-a' }];
    const { getByTestId } = render(html`<${ModelPinsRows} models=${{ 'copilot-cli': pin({ conflicts }) }}/>`);
    const text = getByTestId('now-model-conflict').textContent;
    expect(text).toContain('model-b');
    expect(text).toContain('a.agent.md:3');
    expect(text).toContain('model-a');
  });
  it('shows tools sharing one settings file as one row, and keeps different pins apart', () => {
    const models = {
      'copilot-cli': pin(),
      'copilot-desktop': pin({ tool: 'copilot-desktop' }),
      'copilot-vscode': pin({ tool: 'copilot-vscode', value: 'model-c', source: 'settings.json', line: 2 }),
    };
    const { container } = render(html`<${ModelPinsRows} models=${models}/>`);
    const rows = container.querySelectorAll('.now-models__row');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('model-a');
    expect(rows[1].textContent).toContain('model-c');
  });
  it('renders nothing without a pin, or on an error body', () => {
    const none = pin({ value: '', source: '', line: 0 });
    expect(render(html`<${ModelPinsRows} models=${{ 'copilot-vscode': none }}/>`).container.textContent).toBe('');
    expect(render(html`<${ModelPinsRows} models=${{ error: 'boom' }}/>`).container.textContent).toBe('');
    expect(render(html`<${ModelPinsRows} models=${null}/>`).container.textContent).toBe('');
  });
});

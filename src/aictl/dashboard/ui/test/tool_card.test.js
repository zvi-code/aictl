import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';

import ToolCard from '../src/components/ToolCard.js';
import { SnapContext } from '../src/context.js';

beforeEach(() => cleanup());

const baseTool = (processes) => ({
  tool: 'copilot-vscode',
  label: 'Copilot VS Code',
  files: [],
  processes,
  mcp_servers: [],
  live: null,
  token_breakdown: null,
});

const renderCard = (tool) =>
  render(html`<${SnapContext.Provider} value=${{ snap: null, history: null }}>
    <${ToolCard} tool=${tool} root=""/>
  </${SnapContext.Provider}>`);

describe('ToolCard anomaly badge', () => {
  it('pluralizes and lists distinct anomaly labels in the tooltip', () => {
    const { container } = renderCard(baseTool([
      { pid: 1, anomalies: [{ type: 'headless_browser' }] },
      { pid: 2, anomalies: [{ type: 'headless_browser' }, { type: 'unknown_kind' }] },
    ]));
    const badge = container.querySelector('[data-dp="procs.tool.anomaly"]');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain('2 anomalies');
    // Tooltip names the anomaly kinds (deduped), so the badge is explainable
    // without expanding the card. Unknown types fall back to their raw type.
    expect(badge.getAttribute('title')).toContain('unknown_kind');
    expect(badge.getAttribute('title')).not.toMatch(/unknown_kind.*unknown_kind/);
  });

  it('uses singular form for one anomalous process', () => {
    const { container } = renderCard(baseTool([
      { pid: 1, anomalies: [{ type: 'headless_browser' }] },
    ]));
    const badge = container.querySelector('[data-dp="procs.tool.anomaly"]');
    expect(badge.textContent).toContain('1 anomaly');
    expect(badge.textContent).not.toContain('anomalies');
  });

  it('renders no anomaly badge when processes are clean', () => {
    const { container } = renderCard(baseTool([{ pid: 1, anomalies: [] }]));
    expect(container.querySelector('[data-dp="procs.tool.anomaly"]')).toBeNull();
  });
});

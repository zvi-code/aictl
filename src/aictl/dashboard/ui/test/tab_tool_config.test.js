// Tests for TabToolConfig: configurable models shown as Model rows (older server, no sections).
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';
import { SnapContext } from '../src/context.js';
import TabToolConfig from '../src/components/TabToolConfig.js';

afterEach(() => cleanup());

function renderWith(snap) {
  return render(html`
    <${SnapContext.Provider} value=${{ snap }}>
      <${TabToolConfig}/>
    </${SnapContext.Provider}>
  `);
}

const COPILOT_CFG_BASE = {
  tool: 'copilot',
  settings: { 'chat.agent.enabled': true },  // ensures hasContent is true
  features: {},
  mcp_servers: [],
  extensions: [],
  otel: {},
  hints: [],
  feature_groups: {},
  configurable_models: [
    {
      label: 'Ask agent',
      key: 'github.copilot.chat.askAgent.model',
      value: '',
      source: 'default',
      default_hint: 'default model',
      description: 'Override the language model used by the Ask agent.',
    },
    {
      label: 'Explore subagent',
      key: 'github.copilot.chat.exploreAgent.model',
      value: 'Claude Haiku 4.5 (copilot)',
      source: 'user',
      default_hint: 'fast, small model (fallback list)',
      description: 'Override the model used by the Explore subagent.',
    },
    {
      label: 'Execution subagent',
      key: 'github.copilot.chat.executionSubagent.model',
      value: 'GPT-5 (copilot)',
      source: 'workspace',
      default_hint: 'default model',
      description: 'Model used by the Execution subagent.',
    },
  ],
  config_files: [
    '/home/test/Library/Application Support/Code/User/settings.json',
    '/repo/.vscode/settings.json',
  ],
};

describe('TabToolConfig: configurable models as Model rows', () => {
  it('renders every configurable model as a row, with its settings key in the tooltip', () => {
    const snap = {
      tools: [{ tool: 'copilot', label: 'GitHub Copilot' }],
      tool_configs: [COPILOT_CFG_BASE],
    };
    const { getByText, container } = renderWith(snap);

    expect(container.querySelector('.cfg-section[data-section="model"]')).toBeTruthy();
    for (const label of ['Ask agent', 'Explore subagent', 'Execution subagent']) {
      const el = getByText(label);
      expect(el.getAttribute('title')).toContain('Setting: github.copilot.chat.');
    }
    expect(container.textContent).not.toContain('Configurable Models');
  });

  it('shows the override value and the file that sets it; a default shows no file', () => {
    const snap = {
      tools: [{ tool: 'copilot', label: 'GitHub Copilot' }],
      tool_configs: [COPILOT_CFG_BASE],
    };
    const { container } = renderWith(snap);
    const rows = [...container.querySelectorAll('.cfg-row')];
    const rowOf = (label) => rows.find(r => r.textContent.includes(label));
    expect(rowOf('Explore subagent').textContent).toContain('Claude Haiku 4.5 (copilot)');
    expect(rowOf('Explore subagent').querySelector('.cfg-row__source').getAttribute('title'))
      .toBe('/home/test/Library/Application Support/Code/User/settings.json');
    expect(rowOf('Execution subagent').textContent).toContain('GPT-5 (copilot)');
    expect(rowOf('Execution subagent').querySelector('.cfg-row__source').getAttribute('title'))
      .toBe('/repo/.vscode/settings.json');
    const ask = rowOf('Ask agent');
    expect(ask.querySelector('.cfg-row__source').textContent).toBe('');
    expect(ask.querySelector('.cfg-help').getAttribute('title')).toContain('Default: default model');
  });

  it('lists both settings files in the card', () => {
    const snap = {
      tools: [{ tool: 'copilot', label: 'GitHub Copilot' }],
      tool_configs: [COPILOT_CFG_BASE],
    };
    const { container } = renderWith(snap);
    const titles = [...container.querySelectorAll('[title]')].map(e => e.getAttribute('title')).join('\n');
    expect(titles).toContain('/repo/.vscode/settings.json');
    expect(titles).toContain('/home/test/Library/Application Support/Code/User/settings.json');
  });

  it('shows no Model section when there is no model and no configurable model', () => {
    const snap = {
      tools: [{ tool: 'copilot', label: 'GitHub Copilot' }],
      tool_configs: [
        { ...COPILOT_CFG_BASE, configurable_models: [], config_files: [] },
      ],
    };
    const { container } = renderWith(snap);
    expect(container.querySelector('.cfg-section[data-section="model"]')).toBeNull();
  });
});

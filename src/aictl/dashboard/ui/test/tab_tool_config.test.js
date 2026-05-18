// Tests for TabToolConfig — focused on the new "Configurable Models" section.
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

describe('TabToolConfig — Configurable Models block', () => {
  it('renders every configurable-model knob with its full settings.json key', () => {
    const snap = {
      tools: [{ tool: 'copilot', label: 'GitHub Copilot' }],
      tool_configs: [COPILOT_CFG_BASE],
    };
    const { getByText, container } = renderWith(snap);

    expect(getByText('Configurable Models')).toBeTruthy();
    // Each label is rendered.
    expect(getByText('Ask agent')).toBeTruthy();
    expect(getByText('Explore subagent')).toBeTruthy();
    expect(getByText('Execution subagent')).toBeTruthy();
    // Each full settings key is rendered (mono caption).
    expect(container.textContent).toContain('github.copilot.chat.askAgent.model');
    expect(container.textContent).toContain('github.copilot.chat.exploreAgent.model');
    expect(container.textContent).toContain('github.copilot.chat.executionSubagent.model');
  });

  it('shows user / workspace source badges and the override value', () => {
    const snap = {
      tools: [{ tool: 'copilot', label: 'GitHub Copilot' }],
      tool_configs: [COPILOT_CFG_BASE],
    };
    const { getByText, container } = renderWith(snap);

    expect(container.textContent).toContain('Claude Haiku 4.5 (copilot)');
    expect(container.textContent).toContain('GPT-5 (copilot)');
    expect(getByText('user')).toBeTruthy();
    expect(getByText('workspace')).toBeTruthy();
    // Defaulted entry shows the default hint, not a real value.
    expect(container.textContent).toContain('default model');
  });

  it('lists the settings.json files the user can edit', () => {
    const snap = {
      tools: [{ tool: 'copilot', label: 'GitHub Copilot' }],
      tool_configs: [COPILOT_CFG_BASE],
    };
    const { container } = renderWith(snap);
    expect(container.textContent).toContain('Edit in');
    expect(container.textContent).toContain('/repo/.vscode/settings.json');
    expect(container.textContent).toContain(
      '/home/test/Library/Application Support/Code/User/settings.json',
    );
  });

  it('omits the section when configurable_models is empty', () => {
    const snap = {
      tools: [{ tool: 'copilot', label: 'GitHub Copilot' }],
      tool_configs: [
        { ...COPILOT_CFG_BASE, configurable_models: [], config_files: [] },
      ],
    };
    const { queryByText } = renderWith(snap);
    expect(queryByText('Configurable Models')).toBeNull();
  });
});

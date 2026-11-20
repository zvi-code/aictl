// ─── toolScope — the one definition of "is this tool selected" ──
// `enabledTools` is the tool filter from the header:
//   null            all tools, no filter
//   ['a', 'b']      only these tool ids
//   []              an explicit empty selection: nothing is selected
// Every screen answers "does this row belong here?" through isToolSelected, so
// no screen invents its own rule. Ids are compared exactly: `copilot` is a
// different tool from `copilot-vscode`.

import type { SettingsToolConfig } from './contract.gen';

/** Ids that name a panel or card, not an AI tool. They belong to no single tool. */
const NON_TOOL_IDS = new Set(['aictl', 'vscode', 'project-env']);

type ToolFilter = readonly string[] | null | undefined;

/**
 * Does a row for tool `id` show under this filter?
 * - No filter: everything shows.
 * - A row with no tool id, or a non-tool pseudo id: belongs to no tool, so it shows.
 * - Otherwise the id must be selected. An id the filter list does not offer
 *   (unattributed `any`, or a tool that is not verified) is never selected, so
 *   it is hidden under a filter.
 */
export function isToolSelected(id: string | null | undefined, enabledTools: ToolFilter) {
  if (enabledTools == null) return true;
  if (!id || NON_TOOL_IDS.has(id)) return true;
  return enabledTools.includes(id);
}

// A config card can hold the settings of a listed tool that has another id: the
// `copilot` card holds the VS Code settings that Copilot in VS Code reads.
const CONFIG_CARD_OWNERS = new Map([['copilot', ['copilot', 'copilot-vscode']]]);

/** Stored spellings follow the backend's explicit owners, never a tool-name prefix. */
export function isStoredToolSelected(id: string | null | undefined, enabledTools: ToolFilter) {
  if (enabledTools == null) return true;
  if (!id || id === 'any' || id === 'unknown') return false;
  return enabledTools.includes(id) || !!CONFIG_CARD_OWNERS.get(id)?.some(owner => enabledTools.includes(owner));
}

/** Does a config card show under this filter? */
export function isConfigSelected(row: Pick<SettingsToolConfig, 'tool'>, enabledTools: ToolFilter) {
  const owners = row.tool ? CONFIG_CARD_OWNERS.get(row.tool) : undefined;
  if (!owners || enabledTools == null) return isToolSelected(row.tool, enabledTools);
  return owners.some(id => enabledTools.includes(id));
}

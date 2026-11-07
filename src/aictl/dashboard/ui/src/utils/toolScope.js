// ─── toolScope — the one definition of "is this tool selected" ──
// `enabledTools` is the tool filter from the header:
//   null            all tools, no filter
//   ['a', 'b']      only these tool ids
//   []              an explicit empty selection: nothing is selected
// Every screen answers "does this row belong here?" through isToolSelected, so
// no screen invents its own rule. Ids are compared exactly: `copilot` is a
// different tool from `copilot-vscode`.

import { toolLabel } from './tools.js';

/** Ids that name a panel or card, not an AI tool. They belong to no single tool. */
const NON_TOOL_IDS = new Set(['aictl', 'vscode', 'project-env']);

/** True when a filter is on, including an explicit empty selection. */
export function isFiltered(enabledTools) {
  return Array.isArray(enabledTools);
}

/** True for the explicit "no tool selected" state. */
export function isNoneSelected(enabledTools) {
  return Array.isArray(enabledTools) && enabledTools.length === 0;
}

/**
 * Does a row for tool `id` show under this filter?
 * - No filter: everything shows.
 * - A row with no tool id, or a non-tool pseudo id: belongs to no tool, so it shows.
 * - Otherwise the id must be selected. An id the filter list does not offer
 *   (unattributed `any`, or a tool that is not verified) is never selected, so
 *   it is hidden under a filter; countHidden/FilterHiddenNote say so.
 */
export function isToolSelected(id, enabledTools) {
  if (!Array.isArray(enabledTools)) return true;
  if (!id || NON_TOOL_IDS.has(id)) return true;
  return enabledTools.includes(id);
}

// A config card can hold the settings of a listed tool that has another id: the
// `copilot` card holds the VS Code settings that Copilot in VS Code reads.
const CONFIG_CARD_OWNERS = { copilot: ['copilot', 'copilot-vscode'] };

/** Does a config card show under this filter? */
export function isConfigSelected(row, enabledTools) {
  const owners = CONFIG_CARD_OWNERS[row?.tool];
  if (!owners || !Array.isArray(enabledTools)) return isToolSelected(row?.tool, enabledTools);
  return owners.some(id => enabledTools.includes(id));
}

/** Names for the empty state: the selected tools, by label when the snapshot knows them. */
export function selectedNames(enabledTools, snap) {
  if (!Array.isArray(enabledTools)) return [];
  return enabledTools.map(id => toolLabel(id, snap));
}

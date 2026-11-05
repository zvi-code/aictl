// ─── toolScope — the one definition of "is this tool selected" ──
// `enabledTools` is the tool filter from the header:
//   null            all tools, no filter
//   ['a', 'b']      only these tool ids
//   []              an explicit empty selection: nothing is selected
// Every screen answers "does this row belong here?" through isToolSelected, so
// no screen invents its own rule. Ids are compared exactly: `copilot` is a
// different tool from `copilot-vscode`.

import { VERIFIED_TOOLS, toolLabel } from './tools.js';

/** Ids that name a panel or card, not an AI tool. They belong to no single tool. */
export const NON_TOOL_IDS = new Set(['aictl', 'vscode', 'project-env']);

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

/** Rows whose `key` field names a selected tool (or no tool at all). */
export function filterByTool(list, enabledTools, key = 'tool') {
  if (!Array.isArray(list) || !Array.isArray(enabledTools)) return list;
  return list.filter(r => isToolSelected(r?.[key], enabledTools));
}

/** A tool id the filter list never offers: it cannot be selected, only hidden. */
export function isUnlistedTool(id) {
  return !!id && !NON_TOOL_IDS.has(id) && !VERIFIED_TOOLS.has(id);
}

/** How many rows a filter hides because their tool id is not in the filter list. */
export function countUnlisted(rows, key = 'tool') {
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((n, r) => n + (isUnlistedTool(r?.[key]) ? 1 : 0), 0);
}

/**
 * The tool a sub-tab view should show: the current one while it is still on
 * offer, otherwise the first on offer, otherwise null.
 */
export function resolveActiveTool(ids, current) {
  if (current && ids.includes(current)) return current;
  return ids[0] ?? null;
}

// Agent-memory rows carry a `source` (e.g. "claude-project-memory"), not a tool
// id. This table says which tool ids own each source prefix. A source with no
// entry here (for example the project's own hints) belongs to no single tool.
const COPILOT_IDS = ['copilot', 'copilot-vscode', 'copilot-cli', 'copilot-desktop', 'copilot-jetbrains', 'copilot-vs'];
const MEMORY_SOURCE_OWNERS = [
  ['claude-', ['claude-code', 'claude-desktop']],
  ['copilot-', COPILOT_IDS],
  ['codex-', ['codex-cli']],
  ['gemini-', ['gemini', 'gemini-cli']],
  ['windsurf-', ['windsurf']],
  ['cursor-', ['cursor']],
];

/** Tool ids that own a memory row, or null when it belongs to no single tool. */
export function memoryOwners(row) {
  if (row?.tool) return [row.tool];
  const source = String(row?.source || '');
  const hit = MEMORY_SOURCE_OWNERS.find(([prefix]) => source.startsWith(prefix));
  return hit ? hit[1] : null;
}

export function isMemorySelected(row, enabledTools) {
  if (!Array.isArray(enabledTools)) return true;
  const owners = memoryOwners(row);
  return !owners || owners.some(id => enabledTools.includes(id));
}

/** Names for the empty state: the selected tools, by label when the snapshot knows them. */
export function selectedNames(enabledTools, snap) {
  if (!Array.isArray(enabledTools)) return [];
  return enabledTools.map(id => toolLabel(id, snap));
}

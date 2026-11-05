// ─── auditScope — /api/context-audit under the tool filter ──────
// The audit names tools on sources, findings, drift rows, effective models and
// unattributed-token rows. Each is kept when it names a selected tool or names
// no tool at all. A finding that names several tools (`tools`) stays while any
// of them is selected. Severity counts are recounted from what stays.
import { isFiltered, isToolSelected } from './toolScope.js';

function findingIds(f) {
  if (Array.isArray(f?.tools) && f.tools.length) return f.tools;
  return f?.tool ? [f.tool] : [];
}

function findingSelected(f, enabledTools) {
  const ids = findingIds(f);
  return !ids.length || ids.some(id => isToolSelected(id, enabledTools));
}

export function scopeAudit(audit, enabledTools) {
  if (!audit || !isFiltered(enabledTools)) return audit;
  const keep = row => isToolSelected(row?.tool, enabledTools);
  const sources = (audit.sources || []).filter(keep);
  const findings = (audit.findings || []).filter(f => findingSelected(f, enabledTools));
  const counts = { high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) {
    if (f.severity in counts) counts[f.severity] += 1;
  }
  const perTool = Object.fromEntries(
    Object.entries(audit.sources_per_tool || {}).filter(([id]) => isToolSelected(id, enabledTools)));
  // Agent writes carry a session, not a tool: they have no per-tool split and stay.
  const drift = audit.drift && !audit.drift.baseline_created ? {
    ...audit.drift,
    new: (audit.drift.new || []).filter(keep),
    changed: (audit.drift.changed || []).filter(keep),
    removed: (audit.drift.removed || []).filter(keep),
  } : audit.drift;
  const models = audit.effective_models
    ? Object.fromEntries(Object.entries(audit.effective_models)
      .filter(([id, m]) => isToolSelected(m?.tool || id, enabledTools)))
    : audit.effective_models;
  return {
    ...audit,
    sources, findings, counts, sources_per_tool: perTool, drift,
    effective_models: models,
    unattributed: (audit.unattributed || []).filter(keep),
  };
}

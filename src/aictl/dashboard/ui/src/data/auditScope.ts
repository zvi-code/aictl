// ─── auditScope — /api/context-audit under the tool filter ──────
// The audit names tools on sources, findings, drift rows, effective models and
// unattributed-token rows. Each is kept when it names a selected tool or names
// no tool at all. A finding that names several tools (`tools`) stays while any
// of them is selected. Severity counts are recounted from what stays.
import type { DetailContextAudit } from './contract.gen';
import { isToolSelected } from './toolScope';

type Audit = Extract<DetailContextAudit, { findings: unknown }>;

function toolOf(row: unknown) {
  return row && typeof row === 'object' && 'tool' in row && typeof row.tool === 'string' ? row.tool : undefined;
}

export function scopeAudit(audit: Audit, enabledTools?: readonly string[] | null): Audit {
  if (enabledTools == null) return audit;
  const keep = (row: unknown) => isToolSelected(toolOf(row), enabledTools);
  const sources = audit.sources.filter(keep);
  const findings = audit.findings.filter(f => f.tools?.length
    ? f.tools.some(id => isToolSelected(id, enabledTools)) : keep(f));
  const counts: Record<string, number> = { high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) {
    if (f.severity && Object.hasOwn(counts, f.severity)) counts[f.severity] += 1;
  }
  const perTool = Object.fromEntries(
    Object.entries(audit.sources_per_tool).filter(([id]) => isToolSelected(id, enabledTools)));
  // Agent writes carry a session, not a tool: they have no per-tool split and stay.
  const drift = { ...audit.drift };
  if (!drift.baseline_created) {
    for (const key of ['new', 'changed', 'removed']) {
      if (Array.isArray(drift[key])) drift[key] = drift[key].filter(keep);
    }
  }
  const models = Object.fromEntries(Object.entries(audit.effective_models)
    .filter(([id, model]) => isToolSelected(toolOf(model) || id, enabledTools)));
  return {
    ...audit,
    sources, findings, counts, sources_per_tool: perTool, drift,
    effective_models: models,
    unattributed: audit.unattributed.filter(keep),
  };
}

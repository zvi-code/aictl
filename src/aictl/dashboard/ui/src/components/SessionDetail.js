import { html } from 'htm/preact';
import { fmtK, esc, COLORS } from '../utils.js';
import TeamTree, { TaskBoard } from './TeamTree.js';
import Panel from './session_detail/Panel.js';
import ActionsPanel from './session_detail/ActionsPanel.js';
import ContextPanel from './session_detail/ContextPanel.js';
import MemoryPanel from './session_detail/MemoryPanel.js';
import ResourcesPanel from './session_detail/ResourcesPanel.js';
import DeliverablesPanel from './session_detail/DeliverablesPanel.js';
import ApiCallsPanel from './session_detail/ApiCallsPanel.js';
import ProjectCostPanel from './session_detail/ProjectCostPanel.js';
import RunHistoryPanel from './session_detail/RunHistoryPanel.js';
import McpUsagePanel from './session_detail/McpUsagePanel.js';
import CostByModelPanel from './session_detail/CostByModelPanel.js';
import ProcessTreePanel from './session_detail/ProcessTreePanel.js';
import ToolCallsPanel from './session_detail/ToolCallsPanel.js';
import { fmtDur } from './session_detail/helpers.js';

// Thin orchestrator — just the session header + a stack of Panels.
// Each panel is its own file under components/session_detail/.
export default function SessionDetail({session, onClose}) {
  const c = COLORS[session.tool] || 'var(--fg2)';
  const filesLoaded = session.files_loaded || [];
  const filesTouched = session.files_touched || [];
  const inTok = session.exact_input_tokens || 0;
  const outTok = session.exact_output_tokens || 0;

  const entityState = session.entity_state || null;
  const hasTeam = entityState && entityState.agents && entityState.agents.length > 0;
  const hasTasks = entityState && entityState.tasks && entityState.tasks.length > 0;

  return html`<div class="sd-container" style="border-left:3px solid ${c}">
    <div class="sd-header">
      <div class="flex-row gap-sm" style="align-items:center">
        <strong style="font-size:var(--fs-lg)">${esc(session.tool)}</strong>
        ${session.project && html`<span class="text-muted text-xs mono text-ellipsis" style="max-width:250px"
          title=${session.project}>${esc(session.project.replace(/\\/g,'/').split('/').pop())}</span>`}
        <span class="badge" style="background:var(--green);color:var(--bg);font-size:var(--fs-xs)">
          ${fmtDur(session.duration_s)}
        </span>
        ${hasTeam && html`<span class="badge" style="background:var(--accent);color:var(--bg);font-size:var(--fs-xs)">
          Team (${entityState.agents.length})
        </span>`}
      </div>
      <div class="text-muted text-xs mono" style="margin-top:var(--sp-2)" title=${session.session_id}>
        ${session.session_id}
      </div>
      ${onClose && html`<button class="sd-close" onClick=${onClose} aria-label="Close session detail">\u2715</button>`}
    </div>

    <${Panel} title="Actions" icon="\u26A1" badge=${null} defaultOpen=${true}>
      <${ActionsPanel} sessionId=${session.session_id}/>
    <//>
    ${hasTeam && html`<${Panel} title="Team" icon="\uD83D\uDC65" badge=${entityState.agents.length + ' agents'} defaultOpen=${true}>
      <${TeamTree} entityState=${entityState}/>
    <//>`}
    ${hasTasks && html`<${Panel} title="Tasks" icon="\uD83D\uDCCB" badge=${entityState.tasks.length} defaultOpen=${true}>
      <${TaskBoard} tasks=${entityState.tasks}/>
    <//>`}
    <${Panel} title="Context" icon="\uD83D\uDCDA" badge=${filesLoaded.length || null}>
      <${ContextPanel} session=${session}/>
    <//>
    <${Panel} title="Memory" icon="\uD83E\uDDE0" defaultOpen=${false}>
      <${MemoryPanel} session=${session}/>
    <//>
    <${Panel} title="Resources" icon="\u2699\uFE0F" badge=${fmtK(inTok + outTok) + ' tok'}>
      <${ResourcesPanel} session=${session}/>
    <//>
    <${Panel} title="Cost by Model" icon="\uD83D\uDCB5" defaultOpen=${false}>
      <${CostByModelPanel} sessionId=${session.session_id}/>
    <//>
    <${Panel} title="Tool Calls" icon="\uD83D\uDD27" defaultOpen=${false}>
      <${ToolCallsPanel} sessionId=${session.session_id}/>
    <//>
    <${Panel} title="Process Tree" icon="\uD83C\uDF33" defaultOpen=${false}>
      <${ProcessTreePanel} sessionId=${session.session_id}/>
    <//>
    <${Panel} title="MCP Servers" icon="\uD83D\uDD0C" defaultOpen=${false}>
      <${McpUsagePanel} sessionId=${session.session_id}/>
    <//>
    <${Panel} title="Deliverables" icon="\uD83D\uDCE6" badge=${filesTouched.length || null}>
      <${DeliverablesPanel} session=${session}/>
    <//>
    <${Panel} title="API Calls" icon="\uD83D\uDD17" defaultOpen=${false}>
      <${ApiCallsPanel} sessionId=${session.session_id}/>
    <//>
    ${session.project && html`<${Panel} title="Project Costs" icon="\uD83D\uDCB0" defaultOpen=${false}>
      <${ProjectCostPanel} project=${session.project}/>
    <//>`}
    ${session.project && session.tool && html`<${Panel} title="Run History" icon="\uD83D\uDCC8" defaultOpen=${false}>
      <${RunHistoryPanel} project=${session.project} tool=${session.tool}/>
    <//>`}
  </div>`;
}

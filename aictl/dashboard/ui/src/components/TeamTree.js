import { useState } from 'preact/hooks';
import { html } from 'htm/preact';
import { fmtK, esc } from '../utils.js';

// ─── Duration formatting ──────────────────────────────────────
function fmtDur(sec) {
  if(sec == null || isNaN(sec)) return '\u2014';
  const s = Math.round(sec);
  if(s < 60) return s + 's';
  const m = Math.floor(s / 60);
  const r = s % 60;
  if(m < 60) return m + 'm ' + r + 's';
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm';
}

const STATE_STYLE = {
  active:  { bg: 'var(--green)',  label: 'Active' },
  idle:    { bg: 'var(--yellow)', label: 'Idle' },
  ended:   { bg: 'var(--fg3)',    label: 'Ended' },
  pending: { bg: 'var(--fg3)',    label: 'Pending' },
  done:    { bg: 'var(--green)',  label: 'Done' },
};

// ─── Agent Node ────────────────────────────────────────────────
function AgentNode({agent, tasks, now}) {
  const ss = STATE_STYLE[agent.state] || STATE_STYLE.active;
  const elapsed = agent.ended_at
    ? agent.ended_at - agent.started_at
    : now - agent.started_at;
  const agentTasks = tasks.filter(t => t.agent_id === agent.agent_id);

  return html`<div class="tt-agent">
    <div class="flex-row gap-sm" style="align-items:center;min-height:28px">
      <span class="badge text-xs" style="background:${ss.bg};color:var(--bg)">${ss.label}</span>
      <strong class="text-sm">${esc(agent.agent_id)}</strong>
      <span class="text-muted text-xs">${fmtDur(elapsed)}</span>
      ${agent.task && html`<span class="text-xs mono text-muted">\u2014 ${esc(agent.task)}</span>`}
    </div>
    ${agentTasks.length > 0 && html`<div style="margin-left:var(--sp-4);margin-top:var(--sp-1)">
      ${agentTasks.map(t => {
        const ts = STATE_STYLE[t.state] || STATE_STYLE.pending;
        return html`<div key=${t.task_id} class="flex-row gap-sm text-xs" style="padding:2px 0;align-items:center">
          <span class="badge" style="background:${ts.bg};color:var(--bg);font-size:0.6rem;padding:1px 4px">${ts.label}</span>
          <span class="mono">${esc(t.name || t.task_id)}</span>
        </div>`;
      })}
    </div>`}
  </div>`;
}

// ─── Team Tree Component (4.1) ─────────────────────────────────
export default function TeamTree({entityState}) {
  if (!entityState || !entityState.agents || !entityState.agents.length) return null;

  const agents = entityState.agents;
  const tasks = entityState.tasks || [];
  const now = Date.now() / 1000;

  const activeAgents = agents.filter(a => a.state === 'active');
  const endedAgents = agents.filter(a => a.state !== 'active');

  return html`<div class="tt-container">
    <div class="flex-row gap-sm" style="align-items:center;margin-bottom:var(--sp-3)">
      <strong class="text-sm">Team</strong>
      <span class="text-muted text-xs">${agents.length} agent${agents.length > 1 ? 's' : ''}</span>
      ${activeAgents.length > 0 && html`<span class="badge text-xs" style="background:var(--green);color:var(--bg)">${activeAgents.length} active</span>`}
    </div>
    <div style="border-left:2px solid var(--border);padding-left:var(--sp-3)">
      ${activeAgents.map(a => html`<${AgentNode} key=${a.agent_id} agent=${a} tasks=${tasks} now=${now}/>`)}
      ${endedAgents.map(a => html`<${AgentNode} key=${a.agent_id} agent=${a} tasks=${tasks} now=${now}/>`)}
    </div>
  </div>`;
}

// ─── Task Board Component (4.2) ────────────────────────────────
export function TaskBoard({tasks}) {
  if (!tasks || !tasks.length) return null;

  const pending = tasks.filter(t => t.state === 'pending');
  const active = tasks.filter(t => t.state === 'active');
  const done = tasks.filter(t => t.state === 'done');

  function Column({title, items, color}) {
    return html`<div class="tt-column">
      <div class="tt-column-head" style="border-bottom:2px solid ${color}">
        <strong class="text-sm">${title}</strong>
        <span class="text-muted text-xs">${items.length}</span>
      </div>
      <div class="tt-column-body">
        ${items.length
          ? items.map(t => html`<div key=${t.task_id} class="tt-task-card">
              <div class="text-sm" style="font-weight:500">${esc(t.name || t.task_id)}</div>
              ${t.agent_id && html`<div class="text-xs text-muted">Agent: ${esc(t.agent_id)}</div>`}
            </div>`)
          : html`<p class="text-muted text-xs" style="padding:var(--sp-3)">None</p>`}
      </div>
    </div>`;
  }

  return html`<div class="tt-board">
    <${Column} title="Pending" items=${pending} color="var(--fg3)"/>
    <${Column} title="Active" items=${active} color="var(--accent)"/>
    <${Column} title="Done" items=${done} color="var(--green)"/>
  </div>`;
}

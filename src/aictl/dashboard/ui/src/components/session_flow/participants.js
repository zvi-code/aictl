import { COLORS } from '../../utils.js';
import { sfColor } from './helpers.js';

// Discover unique participants (swimlane columns) from events.
export function discoverParticipants(turns, toolName) {
  const seen = new Set();
  const participants = [];
  const add = (id, label, color) => {
    if (seen.has(id)) return;
    seen.add(id);
    participants.push({id, label: label || id, color: color || 'var(--fg2)'});
  };

  add('user', 'User', 'var(--green)');
  add('tool', toolName || 'AI Tool', COLORS[toolName] || 'var(--accent)');

  for (const t of turns) {
    if (t.type === 'api_call' || t.type === 'api_response' || t.type === 'error') {
      add('api', 'API', 'var(--accent)');
    }
    if (t.type === 'tool_use') {
      const name = t.to || 'tool';
      add('skill:' + name, name, sfColor(name));
    }
    if (t.type === 'subagent') {
      const name = t.to || 'Subagent';
      add('subagent:' + name, name, sfColor(name));
    }
    if (t.type === 'hook') {
      add('hook', 'Hooks', 'var(--orange)');
    }
  }
  return participants;
}

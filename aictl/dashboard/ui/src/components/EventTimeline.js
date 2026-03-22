import { html } from 'htm/preact';
import { EVENT_COLORS } from '../utils.js';

export default function EventTimeline({events, rangeSeconds}) {
  if(!events || !events.length) return null;
  const now = Date.now()/1000;
  const span = rangeSeconds || 3600;
  const earliest = now - span;
  const filtered = events.filter(e=>e.ts >= earliest);
  if(!filtered.length) return null;
  return html`<div class="timeline" role="img" aria-label=${'Event timeline: '+filtered.length+' events in the last '+(span>=3600?Math.round(span/3600)+'h':Math.round(span/60)+'m')}>
    <span class="timeline-label">Events (${filtered.length})</span>
    ${filtered.map((e,i)=>{
      const pct = Math.max(0, Math.min(100, ((e.ts - earliest) / span) * 100));
      const color = EVENT_COLORS[e.kind] || 'var(--fg2)';
      const time = new Date(e.ts*1000).toLocaleTimeString([], {hourCycle: 'h23'});
      const d = e.detail || {};
      const detail = Object.entries(d).filter(([k])=>k!=='session_id').map(([k,v])=>k+'='+v).join(' ');
      const sid = d.session_id ? d.session_id.split(':').slice(0,2).join(':') : '';
      return html`<div key=${e.ts+'-'+e.tool+'-'+i} class="timeline-dot" style=${'left:'+pct+'%;background:'+color}
        title=${e.tool+' '+e.kind+' '+time}>
        <div class="timeline-tip">
          <strong>${e.tool}</strong> ${e.kind}<br/>
          ${sid ? html`<span class="text-accent" style="font-size:var(--fs-2xs)">${sid}</span><br/>` : ''}
          <span class="text-muted">${time}${detail ? ' · '+detail : ''}</span>
        </div>
      </div>`;
    })}
  </div>`;
}

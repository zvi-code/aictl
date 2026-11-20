import{F as e,H as t,I as n,R as r,U as i,u as a,z as o}from"./PreactIsland-9I1yQL0i.js";import{S as s,_ as c,a as l,c as u,d,f,g as p,l as m,m as h,n as g,p as _,u as v}from"./DrawerIsland-kkDfWV9z.js";import{E as y,v as b,y as x}from"./format-Dr6weXBv.js";import S from"./EvidenceTab-OptvJnca.js";var C={user_message:()=>[`user`,`tool`],api_call:e=>[e.from||`tool`,`api`],api_response:()=>[`api`,`tool`],error:()=>[`api`,`tool`],tool_use:e=>[`tool`,`skill:`+(e.to||`tool`)],subagent:e=>[`tool`,`subagent:`+(e.to||`agent`)],subagent_end:e=>[`subagent:`+(e.from||`agent`),`tool`],hook:()=>[`tool`,`hook`]},w={user_message:{lane:`user`,kind:`request`},api_call:{lane:`api`,kind:`request`},api_response:{lane:`api`,kind:`reply`},error:{lane:`error`,kind:`reply`},tool_use:{lane:`tool`,kind:`request`},subagent:{lane:`agent`,kind:`request`},subagent_end:{lane:`agent`,kind:`reply`},hook:{lane:`hook`,kind:`hook`},session_start:{lane:`session`,kind:`marker`},session_end:{lane:`session`,kind:`marker`},compaction:{lane:`compact`,kind:`marker`},context_update:{lane:`compact`,kind:`marker`},session_command:{lane:`session`,kind:`marker`},skill_event:{lane:`tool`,kind:`marker`}},T={user:`var(--s1)`,api:`var(--s2)`,tool:`var(--s3)`,agent:`var(--s5)`,hook:`var(--s4)`,session:`var(--good)`,compact:`var(--warn)`,error:`var(--crit)`};function E(e){if(!e)return``;let t=e;if(typeof e==`string`)try{t=JSON.parse(e)}catch{return e.slice(0,80)}if(typeof t!=`object`||!t)return String(e).slice(0,80);for(let e of[`command`,`file_path`,`pattern`,`query`,`path`,`url`,`prompt`,`description`,`old_string`,`content`,`skill`])if(t[e])return String(t[e]).slice(0,100);let n=Object.keys(t);return n.length?String(t[n[0]]).slice(0,80):``}var D=e=>((e.tokens||{}).input||0)+((e.tokens||{}).output||0);function ee(e){let t=e||[],n=[];for(let e=0;e<t.length;e++){let r=t[e],i=t[e+1];if(r&&i&&r.type===`user_message`&&i.type===`user_message`&&r.step_key&&r.step_key===i.step_key&&!!r.redacted!=!!i.redacted){let t=r.redacted?i:r,a=r.redacted?r:i;n.push({...a,...t,redacted:!1,tokens:D(a)>=D(t)?a.tokens:t.tokens,api_calls:a.api_calls||t.api_calls||0,duration_ms:a.duration_ms||t.duration_ms||0,wall_ms:a.wall_ms||t.wall_ms||0,end_ts:a.end_ts||t.end_ts,model:a.model||t.model||``}),e+=1}else n.push(r)}return n}function te(e,t,n){let r=ee(e).map(e=>{let t=C[e.type],[n,r]=t?t(e):[null,null];return{...e,_from:n,_to:r}}),i=0,a=0,o=0,s=r.filter(e=>e.type===`user_message`).length,c=n?.total_turns||s,l=r.length>0&&r[0].type!==`user_message`&&(n?.omitted_events>0||r[0].rt_tokens>0),u=c>s&&s>0?c-s+1:1,d=l?Math.max(1,u-1):u-1,f=[],m=null;if(l){let e=r[0];e._isTurnStart=!0,m={turnIndex:d,isPartialStart:!0,startTs:e.ts,endTs:e.ts,promptEv:e,promptText:`Continued from earlier in turn (load older events for prompt)`,tokens:e.rt_tokens||0,cacheTokens:0,apiCalls:0,toolCalls:0,subagents:0,skills:[],errors:0,durationMs:0,events:[]},f.push(m)}for(let e of r){if(e.type===`user_message`?(a=0,d+=1,e._isTurnStart=!0,m={turnIndex:d,startTs:e.ts,endTs:e.end_ts||e.ts,promptEv:e,promptText:e.preview||e.message||(e.redacted?`Prompt (text not retained)`:`Prompt`),tokens:D(e),cacheTokens:(e.tokens||{}).cache_read||0,apiCalls:e.api_calls||0,toolCalls:0,subagents:0,skills:[],errors:0,durationMs:e.duration_ms||e.wall_ms||0,events:[e]},f.push(m)):m&&(m.events.push(e),e.ts>m.endTs&&(m.endTs=e.ts),m.isPartialStart&&m.endTs>m.startTs&&(m.durationMs=(m.endTs-m.startTs)*1e3)),e.type===`api_call`){let t=D(e);i+=t,a+=t,o=Math.max(o,a),m&&(m.tokens=Math.max(m.tokens,e.rt_tokens??a),m.cacheTokens+=(e.tokens||{}).cache_read||0,m.apiCalls=Math.max(m.apiCalls,m.events.filter(e=>e.type===`api_call`).length))}m&&(e.rt_tokens>m.tokens&&(m.tokens=e.rt_tokens),e.type===`tool_use`&&(m.toolCalls+=1),e.type===`subagent`&&(m.subagents+=1),e.type===`skill_event`&&e.name&&!m.skills.includes(e.name)&&m.skills.push(e.name),(e.type===`error`||e.is_error||e.type===`tool_use`&&e.success===!1)&&(m.errors+=1)),e._turnIndex=d,e._cum=e.cum_tokens??i,e._rt=e.rt_tokens??a}for(let e of f){let t=e.events,n=Math.max(1e3,...t.map(e=>e.duration_ms||0)),r=t.length||1;t.forEach((t,i)=>{t._turnGroup=e;let a=t.duration_ms||0,o=a>0?Math.max(6,Math.min(72,Math.round(a/n*68))):6;t._wfOffsetPct=r>1?Math.min(100-o,Math.round(i/(r-1)*(92-o))):0,t._wfWidthPct=o})}for(let e of r)e._wfWidthPct??=(e._wfOffsetPct=0,e.duration_ms>0?Math.min(80,Math.max(8,Math.round(e.duration_ms/250))):8);let h=new Map,g=0,_=(e,t,n)=>{h.has(e)||h.set(e,{id:e,label:t,color:n||p(g++)})};r.length&&(_(`user`,`User`,T.user),_(`tool`,t||`Tool`,`var(--ink2)`));for(let e of r)(e.type===`api_call`||e.type===`api_response`||e.type===`error`)&&_(`api`,`Model`,T.api),e.type===`tool_use`&&_(e._to,e.to||`tool`),e.type===`subagent`&&_(e._to,e.to||`Subagent`),e.type===`subagent_end`&&_(e._from,e.from||`Subagent`),e.type===`hook`&&_(`hook`,`Hooks`,T.hook);let v=e=>r.filter(t=>t.type===e).length,y=r.filter(e=>e.type===`api_call`&&e.ttft_ms>0).map(e=>e.ttft_ms).sort((e,t)=>e-t),b=y.length?y.length%2?y[(y.length-1)/2]:(y[y.length/2-1]+y[y.length/2])/2:null,x=n?.cumulative_tokens==null?{turns:v(`user_message`),toolCalls:r.filter(e=>e.type===`tool_use`&&e.subtype!==`result`&&e.subtype!==`decision`).length,subagents:v(`subagent`),hooks:v(`hook`),errors:v(`error`)+r.filter(e=>e.type===`api_call`&&e.is_error||e.type===`tool_use`&&e.success===!1).length,compactions:v(`compaction`),cumulative:i,roundTrip:o,ttft:b,ttftCalls:y.length}:{turns:n.total_turns,toolCalls:n.total_tool_uses,subagents:n.subagents,hooks:n.hooks,errors:n.errors,compactions:n.compactions,cumulative:n.cumulative_tokens,roundTrip:n.largest_turn_tokens,ttft:n.ttft_ms??null,ttftCalls:n.ttft_calls||0};return{events:r,participants:[...h.values()],turnGroups:f,summary:x}}function O(e,t,n,r=!1){let i=new Set;for(let t of e)i.add(t._from),i.add(t._to);let a=t.filter(e=>!n||i.has(e.id)),o=[],s=new Map,c=new Map;for(let e of a){let t=r&&(e.id.startsWith(`skill:`)?`tools`:e.id.startsWith(`subagent:`)?`agents`:null),n=t?`group:`+t:e.id;s.has(n)||(s.set(n,o.length),o.push(t?{id:n,label:t===`tools`?`Tools`:`Subagents`,color:T[t===`tools`?`tool`:`agent`]}:e)),c.set(e.id,s.get(n))}return{lanes:o,columns:c,grouped:o.length<a.length}}function k(e){let t=e.tokens||{};if(e.type===`user_message`)return e.redacted?e.prompt_length?{label:`Prompt, text not sent (`+e.prompt_length+` characters)`,meta:``}:{label:`Prompt, text not kept`,meta:``}:{label:e.preview||e.message||`Prompt`,meta:e.prompt_length?e.prompt_length+` characters`:``};if(e.type===`api_call`){let t=[x(D(e))+` tokens`];return e.ttft_ms>0?t.push(`first token `+b(e.ttft_ms)):e.duration_ms>0&&t.push(b(e.duration_ms)),e.is_error&&t.push(`failed`),{label:e.agent_name||e.model||`Model call`,meta:t.join(`, `)}}if(e.type===`api_response`){let n=[e.model,e.finish_reason&&e.finish_reason!==`stop`?`stopped: `+e.finish_reason:``].filter(Boolean).join(`, `);return{label:`Reply`+(t.output?`, `+x(t.output)+` tokens`:``)+(e.response_preview?`: `+d(e.response_preview,80):``),meta:n}}if(e.type===`error`)return{label:`Error: `+(e.error_type||`error`),meta:d(e.error_message||``,80)};if(e.type===`tool_use`){let t=E(e.params)||(e.target?String(e.target).slice(0,100):``),n=``;return e.subtype===`result`||!e.subtype&&typeof e.success==`boolean`?n=(e.success===!0||e.success===`true`?`OK`:`Failed`)+(e.duration_ms>0?`, `+b(e.duration_ms):``):e.subtype===`decision`&&(n=e.decision||``),{label:(e.to||`tool`)+(t?`: `+t:``),meta:n,size:e.result_size?e.result_size+` B`:``}}if(e.type===`subagent`)return{label:`Subagent `+(e.to||``),meta:d(e.prompt||e.model||``,80)};if(e.type===`subagent_end`)return{label:`Subagent `+(e.from||``)+(e.completed===!1?` stopped`:` done`),meta:e.duration_ms>0?b(e.duration_ms):``};if(e.type===`hook`)return{label:`Hook `+(e.hook_name||``),meta:``};if(e.type===`session_start`)return{label:`Session started`,meta:e.cwd||``};if(e.type===`session_end`)return{label:`Session ended`,meta:``};if(e.type===`skill_event`)return{label:`Skill: ${e.name||`Name not reported`}`,meta:[A(e.phase),e.phase===`reported`&&Number.isFinite(e.reported_spans)&&`${e.reported_spans} distinct spans`,e.source].filter(Boolean).join(` · `)};if([`context_update`,`session_command`].includes(e.type))return{label:[{context_update:`Context`,session_command:`Session command`}[e.type],e.name||e.phase].filter(Boolean).join(`: `),meta:[e.name&&e.phase,e.context_tokens!=null&&`${x(e.context_tokens)} context tokens`,e.source].filter(Boolean).join(` · `)};if(e.type===`compaction`){let t=e.before_tokens!=null&&e.after_tokens!=null?x(e.before_tokens)+` to `+x(e.after_tokens)+` tokens`:``;return{label:`Compaction`+(e.compaction_count?` `+e.compaction_count:``),meta:[t,e.duration_ms>0?b(e.duration_ms):``].filter(Boolean).join(`, `)}}return{label:e.type||`Event`,meta:``}}var A=e=>({loaded:`Loaded`,invoked:`Invoked`,reported:`Reported in context`,resolved:`Resolved`})[e]||e||`Not reported`;function j(e){return e.type===`user_message`?e.message||e.preview||``:e.type===`api_call`?e.request_preview||e.prompt_preview||``:e.type===`tool_use`?e.params||e.input_preview||e.target||``:e.type===`subagent`?e.prompt||``:e.type===`hook`&&e.hook_input||``}function ne(e){return e.type===`api_response`?e.response||e.response_preview||``:e.type===`api_call`&&e.is_error?e.error_message||``:e.type===`tool_use`?e.result_summary||e.result_preview||``:e.type===`error`?e.error_message||``:e.type===`hook`&&e.hook_output||``}var M=`_v:datetime _deleted:bool`,N=`session_id:string ts:real`,P={session_steps:`step_key:string ${N} ['kind']:string phase:string name:string turn_id:string agent_id:string context_tokens:long context_limit:long before_tokens:long after_tokens:long ${M}`,requests:`rowid:long ${N} model:string input_tokens:long output_tokens:long cost_usd:real ${M}`,tool_invocations:`rowid:long ${N} tool_name:string is_error:long duration_ms:real ${M}`,OTELTraces:`StartTime:datetime SessionId:string TraceID:string SpanID:string Model:string ToolName:string OperationName:string InputTokens:long OutputTokens:long`,agents:`agent_id:string session_id:string model:string started_at:real ended_at:real ${M}`,turn_request_links:`request_key:string ${N} agent_id:string turn_id:string root_session_id:string root_turn_id:string basis:string ${M}`},F=`step_key:string ${N} ['kind']:string role:string ['source']:string phase:string turn_id:string text_status:string ${M}`,re=`step_key:string session_id:string ['text']:string ${M}`,ie=`rowid:long dedup_key:string ${N} agent_id:string cost_usd:real ${M}`,ae=e=>e.split(` `).map(e=>e.split(`:`)[0]),I=(e,t)=>`union isfuzzy=true (datatable(node_id:string, ${t.split(` `).join(`, `)})[]), ${e}`,L=(e,t,n)=>{let r=H(n.nodeId).trim().toLowerCase();return I(e,t)+`\n| where node_id == ${U(r===`legacy`?``:r)}`},oe=`| top 500 by ts desc
| order by ts asc, step_key asc`,R=`event_time=unixtime_seconds_todatetime(ts)`,z=(e,t)=>`iff(countif(isnotnull(${e})) > 0, sum(${e}), ${t}(null))`,B={steps:{label:`Session steps timeline`,table:`session_steps`,description:`The latest 500 recorded steps, oldest first. No prompt or command text.`,body:`${oe}\n| project ${R}, step_key, ['kind'], phase, name, agent_id, turn_id`},nodes:{label:`Sessions by reporting node`,table:`sessions`,fleet:!0,description:`Compare nodes with sessions started in the time range. Legacy means the reporting node was not recorded.`},requests:{label:`Requests and tokens by model`,table:`requests`,model:`model`,description:`Request counts, reported tokens and positive recorded USD. A zero or missing price is counted as unpriced, not free.`,body:`| extend priced=isnotnull(cost_usd) and isfinite(cost_usd) and cost_usd > 0
| summarize request_count=count(),
    input_tokens=${z(`input_tokens`,`long`)},
    output_tokens=${z(`output_tokens`,`long`)},
    recorded_usd=iff(countif(priced) > 0, sumif(cost_usd, priced), real(null)),
    unpriced_requests=countif(not(priced))
  by model
| order by request_count desc`},tools:{label:`Tool activity and failures`,table:`tool_invocations`,tool:`tool_name`,description:`Calls, reported failures, missing outcomes, and mean reported duration by tool name.`,body:`| summarize calls=count(), failures=countif(is_error == 1),
    unknown_outcomes=countif(isnull(is_error)), mean_duration_ms=avg(duration_ms)
  by tool_name
| order by calls desc`},failures:{label:`Failed tool calls`,table:`tool_invocations`,tool:`tool_name`,description:`The latest 500 calls explicitly marked as errors, newest first.`,body:`| where is_error == 1\n| top 500 by ts desc\n| project ${R}, rowid, tool_name, duration_ms`},context:{label:`Context changes, compaction and reset`,table:`session_steps`,description:`The latest 500 context events and related session commands, oldest first. A requested or dispatched command is not proof of a change; check its phase.`,body:`| where ['kind'] == "context" or (['kind'] == "session_command" and name in ("model_change", "model", "clear", "reset", "new", "compact", "rewind"))\n${oe}\n| project ${R}, ['kind'], name, phase, agent_id, turn_id,\n    context_tokens, context_limit, before_tokens, after_tokens`},spans:{label:`OpenTelemetry spans`,table:`OTELTraces`,model:`Model`,tool:`ToolName`,description:`The latest 500 identified spans, newest first. Model and tool filters apply to the same span.`,body:`| top 500 by StartTime desc
| project StartTime, TraceID, SpanID, OperationName, Model, ToolName, InputTokens, OutputTokens`},prompts:{label:`User input prompts`,table:`session_steps`,fields:F,keyword:!0,description:`Search retained user messages for a word or phrase. Shows the first 240 characters of the latest 500 matches, oldest first. Missing text is not searchable.`,body:(e,t)=>V(e,t,`user`)},assistant:{label:`Public assistant text and visible commentary`,table:`session_steps`,fields:F,keyword:!0,description:`Search retained public assistant messages for a word or phrase. Shows the first 240 characters of the latest 500 matches, not private reasoning.`,body:(e,t)=>V(e,t,`assistant`)},commands:{label:`Commands: requests, starts and results`,table:`session_steps`,fields:`${F} name:string tool_call_id:string agent_id:string exit_code:long`,description:`Shell requests, native starts and tool results are separate events. Session command requests and dispatches are not proof of execution. A preview is shown only when retained.`,body:(e,t)=>V(e,t,`commands`)},longest:{label:`Longest completed turn`,table:`session_steps`,fields:`${P.session_steps} ['source']:string`,description:`Requires one native start and one end for the same session, agent and turn, both in the time range. Incomplete or ambiguous pairs are excluded.`,body:`| where ['kind'] == "turn" and isnotempty(turn_id)
| where (['source'] == "assistant.turn_start" and phase == "started") or (['source'] == "assistant.turn_end" and phase == "ended")
| summarize starts=countif(phase == "started"), ends=countif(phase == "ended"),
    start_ts=minif(ts, phase == "started"), end_ts=maxif(ts, phase == "ended") by session_id, agent_id, turn_id
| where starts == 1 and ends == 1 and end_ts >= start_ts
| extend duration_seconds=end_ts - start_ts
| order by duration_seconds desc, start_ts asc, agent_id asc, turn_id asc
| take 1
| project session_id, agent_id, turn_id, duration_seconds, started=unixtime_seconds_todatetime(start_ts), ended=unixtime_seconds_todatetime(end_ts)`},subagents:{label:`All session subagents`,table:`agents`,model:`model`,key:`agent_id`,clock:`started_at`,description:`All recorded subagent IDs for this session, by start time when a time range is set. No task text.`,body:`| where isnotempty(agent_id) and agent_id != session_id
| project session_id, agent_id, model, started=unixtime_seconds_todatetime(started_at), ended=unixtime_seconds_todatetime(ended_at)
| order by started asc nulls last, agent_id asc`},sizes:{label:`Tool response sizes in bytes`,table:`tool_invocations`,tool:`tool_name`,fields:`${P.tool_invocations} output_bytes:long`,description:`Percentiles use recorded, nonnegative output byte counts, including measured zeros. Calls without measurements count as unknown.`,body:`| extend bytes=iff(output_bytes >= 0, output_bytes, long(null))
| summarize calls=count(), known=countif(isnotnull(bytes)), unknown=countif(isnull(bytes)),
    p50_bytes=percentile(bytes, 50), p95_bytes=percentile(bytes, 95), p99_bytes=percentile(bytes, 99)`},mcp:{label:`MCP tool calls`,table:`tool_invocations`,tool:`tool_name`,fields:`${P.tool_invocations} source_event_id:string agent_id:string`,description:`The latest 500 recorded invocations with MCP-style tool names (mcp prefix or server/tool). Names do not establish which servers were configured.`,body:`| where tool_name matches regex @"^mcp(__|_|\\.|:)|^[\\w.-]+/[\\w.-]+$"
| top 500 by ts desc
| project ${R}, tool_name, agent_id, source_event_id, duration_ms, is_error`},reasoning:{label:`Reported reasoning token counts`,table:`OTELTraces`,model:`Model`,fields:`StartTime:datetime SessionId:string TraceID:string SpanID:string Model:string OperationName:string ReasoningOutputTokens:long TraceAttributes:dynamic`,project:`StartTime, SessionId, TraceID, SpanID, Model, OperationName, reasoning_tokens=coalesce(ReasoningOutputTokens, tolong(TraceAttributes["gen_ai.usage.reasoning.output_tokens"]))`,description:`The latest 500 identified spans with a reported reasoning token count. Missing counts are not zero. Reads the numeric metric, not reasoning text.`,body:`| where isnotnull(reasoning_tokens) and reasoning_tokens >= 0
| top 500 by StartTime desc
| project StartTime, TraceID, SpanID, Model, OperationName, reasoning_tokens`},costMain:{label:`Highest recorded turn cost: selected session, main agent`,table:`requests`,cost:`main`,description:`Ranks direct main-agent turns by positive recorded USD, not invoice cost. Coverage includes unlinked and unpriced requests.`},costTree:{label:`Highest recorded turn cost: session and linked descendants`,table:`requests`,cost:`tree`,description:`Ranks root turns using explicit links. Coverage includes this session and requests explicitly linked back from other sessions; unlinked outside requests cannot be assigned.`},costAll:{label:`Highest recorded turn cost: all sessions`,table:`requests`,cost:`all`,description:`Ranks explicitly linked root turns across all sessions by positive recorded USD. Uses the Flow date bounds, or a seven-day window if a bound is missing.`}};function V(e,t,n){let r=n===`commands`,i=r?`, ['kind'], name, phase, agent_id, tool_call_id, exit_code`:`, phase`,a=r?`| where (['kind'] == "session_command" and phase in ("requested", "queued", "dispatched"))
    or (name in ("bash", "powershell") and (
        (['kind'] == "tool_call" and phase == "requested" and ['source'] == "assistant.message")
        or (['kind'] == "command" and phase == "started" and ['source'] == "tool.execution_start")
        or (['kind'] == "tool_result" and phase in ("completed", "failed") and ['source'] == "tool.execution_complete")))`:`| where ['kind'] == "message" and role == "${n}" and ['source'] == "${n}.message"
${n===`assistant`?`| where phase in ("", "commentary", "response", "final", "final_answer")
`:``}| where text_status in ("captured", "truncated")`;return`${r?``:`let needle = ${U(t.keyword)};\n`}let selected_steps = materialize(
${e}
${a}
| where isnotempty(step_key)
| project session_id, step_key, ts, turn_id, text_status${i});
selected_steps
| join kind=${r?`leftouter`:`inner`} (
    ${L(`session_step_text`,re,t)}
    | where step_key in (selected_steps | where text_status in ("captured", "truncated") | project step_key)
    | project session_id, step_key, _v, _deleted, text_preview=substring(trim(@"\\s+", ['text']), 0, 240)${r?``:`, matched=isempty(needle) or ['text'] contains needle`}
    | summarize arg_max(_v, *) by step_key
    | where not(coalesce(_deleted, false)) and session_id == sid and isnotempty(text_preview)${r?``:` and matched`}
    | project session_id, step_key, text_preview
) on session_id, step_key
${oe}
| project ${R}, step_key, turn_id${i}, text_status, ${n===`user`?`prompt_preview=text_preview`:`text_preview`}`}var H=e=>typeof e==`string`?e:``,U=e=>JSON.stringify(H(e)).replace(/[\u007f-\u009f\u2028\u2029]/g,e=>`\\u`+e.charCodeAt(0).toString(16).padStart(4,`0`)),W=e=>typeof e==`number`?e:H(e).trim()?Number(e):NaN;function G(e,t,n){if(e==null||e===``)return``;let r=W(e);return Number.isFinite(r)?`\n| where ${n} ${t} `+(n===`StartTime`?`unixtime_seconds_todatetime(${r})`:r):`
| where false // Invalid Flow time bound`}function se({since:e,until:t}){let n=e=>Number.isFinite(W(e))?`unixtime_seconds_todatetime(${W(e)})`:`datetime(null)`,r=e!=null&&e!==``,i=t!=null&&t!==``;return r?`let window_start = ${n(e)};\nlet window_end = ${i?n(t):`window_start + 7d`};`:`let window_end = ${i?n(t):`now()`};\nlet window_start = window_end - 7d;`}function K(e,t){let n=e===`all`;if(n&&t.includeAllSessions!==!0)return``;let r=e===`tree`,i=e===`main`,a=n?`
| where ts >= (window_start - datetime(1970-01-01)) / 1s and ts < (window_end - datetime(1970-01-01)) / 1s`:G(t.since,`>=`,`ts`)+G(t.until,`<`,`ts`),o=(n?``:i?`
| where isnotempty(sid) and session_id == sid and isempty(agent_id)`:`
| where isnotempty(sid) and (session_id == sid or dedup_key in (possible_descendants))`)+a;return`${n?se(t):`let sid = ${U(t.sessionId)};`}
let link_versions = ${L(`turn_request_links`,P.turn_request_links,t)}
| project request_key, _v, _deleted, session_id, agent_id, turn_id, root_session_id, root_turn_id, basis;
${r?`let possible_descendants = link_versions | where root_session_id == sid and isnotempty(request_key) | distinct request_key;
`:``}let request_versions = ${L(`requests`,ie,t)}
| project rowid, _v, _deleted, ts, session_id, agent_id, dedup_key, cost_usd;
let candidate_ids = request_versions${o}
| distinct rowid;
let candidates = materialize(request_versions
| join kind=leftsemi (candidate_ids) on rowid
| summarize arg_max(_v, *) by rowid
| where not(coalesce(_deleted, false))${o}
| project session_id, dedup_key, agent_id, cost_usd);
let relevant_links = materialize(link_versions
| join kind=leftsemi (candidates | where isnotempty(dedup_key) | distinct dedup_key) on $left.request_key == $right.dedup_key);
// Identical retries agree; competing assignments or tombstones at the latest version do not.
let links = relevant_links | summarize link_version=max(_v) by request_key
| join kind=inner (relevant_links) on request_key, $left.link_version == $right._v
| distinct request_key, session_id, agent_id, turn_id, root_session_id, root_turn_id, basis, _deleted
| summarize variants=count(), take_any(session_id, agent_id, turn_id, root_session_id, root_turn_id, basis, _deleted) by request_key
| where variants == 1 and not(coalesce(_deleted, false)) and isnotempty(session_id)
    and isnotempty(basis) and basis !in~ ("ambiguous", "conflict", "unknown", "unknown_agent", "unattributed")
| project request_key, session_id, link_agent=agent_id, turn_id, root_session_id, root_turn_id;
let duplicate_keys = candidates | where isnotempty(dedup_key)
| summarize physical_rows=count() by session_id, dedup_key | where physical_rows > 1;
let facts = materialize(candidates
| join kind=leftouter (links) on session_id, $left.dedup_key == $right.request_key
${i?`| where isempty(link_agent)
`:r?`| where session_id == sid or root_session_id == sid
`:``}| join kind=leftouter (duplicate_keys) on session_id, dedup_key
| extend attributed=isnull(physical_rows) and (isempty(agent_id) or agent_id == link_agent) and ${i?`isnotempty(turn_id)`:`isnotempty(root_turn_id) and ${r?`root_session_id == sid`:`isnotempty(root_session_id)`}`},
    priced=isnotnull(cost_usd) and isfinite(cost_usd) and cost_usd > 0);
let coverage = facts
| summarize eligible_requests=count(), attributed_requests=countif(attributed), unpriced_requests=countif(not(priced)),
    attributed_priced_requests=countif(attributed and priced)
| extend row_type="Coverage", status=case(eligible_requests == 0, "No eligible requests", attributed_requests == 0, "No attributable turns",
    attributed_priced_requests == 0, "No positive recorded USD on attributed requests", "Ranking uses positive recorded USD only");
let winner = facts | where attributed
| summarize turn_requests=count(), turn_unpriced_requests=countif(not(priced)), recorded_usd=sumif(cost_usd, priced)
    by ${i?`session_id, turn_id`:`root_session_id, root_turn_id`}
| where turn_requests > turn_unpriced_requests
| order by recorded_usd desc, ${i?`session_id asc, turn_id`:`root_session_id asc, root_turn_id`} asc
| take 1
| extend row_type="Highest recorded cost";
union coverage, winner
| order by row_type asc`}function ce({table:e,fields:t=P[e],project:n,key:r=e===`session_steps`?`step_key`:`rowid`,clock:i=e===`OTELTraces`?`StartTime`:`ts`,model:a,tool:o,body:s,cost:c,fleet:l},u){if(l)return`${se(u)}
${I(`sessions`,`session_id:string started_at:real ${M}`)}
| project node_id, session_id, started_at, _v, _deleted
| summarize arg_max(_v, *) by node_id, session_id
| where not(coalesce(_deleted, false))
| extend started=unixtime_seconds_todatetime(started_at)
| where started >= window_start and started < window_end
| summarize sessions=count(), last_session_start=max(started) by reporting_node=iff(isempty(node_id), "legacy", node_id)
| order by sessions desc, reporting_node asc`;if(c)return K(c,u);let d=e===`OTELTraces`,f=d?`SessionId`:`session_id`,p=L(e,t,u);return p+=`\n| project ${n||ae(t).join(`, `)}`,d?(p+=`\n| where isnotempty(sid) and ${f} == sid and isnotempty(TraceID) and isnotempty(SpanID)`,p+=`
| summarize arg_max(StartTime, *) by TraceID, SpanID`):(p+=`\n| summarize arg_max(_v, *) by ${r}\n| where not(coalesce(_deleted, false))`,p+=`\n| where isnotempty(sid) and ${f} == sid`),p+=G(u.since,`>=`,i)+G(u.until,`<`,i),a&&H(u.model)&&(p+=`\n| where ${a} == ${U(u.model)}`),o&&H(u.tool)&&(p+=`\n| where ${o} == ${U(u.tool)}`),`let sid = ${U(u.sessionId)};\n`+(typeof s==`function`?s(p,u):p+`
`+s)}function q(e,t){if(!/^https:\/\//i.test(H(e))||!t.trim())return null;try{let n=new URL(e);return n.username||n.password||!/^\/[^/]+$/.test(n.pathname)?null:(n.hash=``,n.search=new URLSearchParams({web:`1`,autorun:`false`,query:t}).toString(),n.href)}catch{return null}}var le=[...new Set([...Object.keys(P),`where`,`project`,`summarize`,`order by`,`top`,`extend`,`take`,`distinct`,`count`,`countif`,`sum`,`avg`,`arg_max`,`isnotempty`,`isnotnull`,`unixtime_seconds_todatetime`,...[...Object.values(P),...Object.values(B).map(e=>e.fields).filter(Boolean),ie].flatMap(ae).map(e=>e.replace(/^\['(.+)'\]$/,`$1`))])],ue=e=>[...new Set(e.filter(e=>H(e).length>0))],de=e=>Array.isArray(e)?e:[],fe=10;function J(e){let{value:t,selectionStart:n,selectionEnd:r}=e;if(n!==r)return{prefix:``,start:n,end:r};let i=t.slice(0,n).match(/[a-z_]\w*$/i)?.[0]||``,a=t.slice(r).match(/^\w+/)?.[0]||``;return{prefix:i,start:n-i.length,end:r+a.length}}function Y({id:n,label:a,value:o,options:s,onChange:c,editorRef:l,hint:u,placeholder:d}){let f=e(null),p=l||f,[m,h]=r(null),[g,_]=r(-1),v=m?.prefix.toLowerCase(),y=m?s.filter(e=>e.toLowerCase().startsWith(v)).slice(0,fe):[],b=y.length>0,x=e=>`${n}-opt-${e}`,S=y[g]?x(g):void 0;t(()=>{S&&document.getElementById(S)?.scrollIntoView?.({block:`nearest`})},[S]);function C(e){h(e),_(-1)}function w(e){let t=p.current;l?(t.setRangeText(e===`kind`?`['kind']`:e,m.start,m.end,`end`),c(t.value)):c(e),C(null)}function T(e){let t=e.currentTarget;c(t.value);let n=l?J(t):{prefix:t.value};C(!e.isComposing&&(!l||n.prefix)?n:null)}function E(e){if(!e.isComposing){if(l&&e.ctrlKey&&e.key===` `)e.preventDefault(),C(J(e.currentTarget));else if(e.key===`Escape`&&m)e.preventDefault(),e.stopPropagation(),C(null);else if(e.key===`ArrowDown`||e.key===`ArrowUp`){if(!m&&!l&&s.length)e.preventDefault(),C({prefix:``}),_(0);else if(b){e.preventDefault();let t=y.length;_(e.key===`ArrowDown`?(g+1)%t:g<0?t-1:(g+t-1)%t)}}else e.key===`Enter`&&S?(e.preventDefault(),w(y[g])):[`Tab`,`ArrowLeft`,`ArrowRight`,`Home`,`End`].includes(e.key)&&C(null)}}let D={id:n,ref:p,value:o,placeholder:d,"aria-describedby":u,"aria-autocomplete":`list`,"aria-controls":n+`-list`,"aria-activedescendant":S,autocomplete:`off`,spellcheck:!1,onInput:T,onKeyDown:E,onBlur:()=>C(null)};return i`<div class="bd-kql-field">
    <label for=${n}>${a}</label>
    ${l?i`<textarea ...${D} rows="9" onClick=${()=>C(null)}/>`:i`<input ...${D} role="combobox" aria-expanded=${b} onFocus=${()=>C({prefix:``})}/>`}
    <ul class="bd-kql-options" id=${n+`-list`} role="listbox" aria-label=${a+` suggestions`} hidden=${!b}>
      ${y.map((e,t)=>i`<li key=${e} id=${x(t)} role="option" aria-selected=${t===g}
        onMouseDown=${e=>e.preventDefault()} onClick=${()=>w(e)}>${e}</li>`)}
    </ul>
    ${m&&!l&&!b&&i`<small role="status">${o?`No matching suggestion. Using the value you typed.`:`No observed values.`}</small>`}
  </div>`}function pe({id:t,generated:n,url:a}){let[o,s]=r(n),[c,l]=r(``),u=e(null),d=t+`-hint`,f=q(a,o),p=e=>{l(``),s(e)};async function m(){try{await navigator.clipboard.writeText(o),l(`Query copied.`)}catch{u.current.focus(),u.current.select(),l(`Query selected. Use your device’s Copy command.`)}}return i`<p id=${d}>Edit the KQL below. Type a prefix or press Ctrl+Space for tables, columns and operators.
    Changing an example or filter replaces your edits.</p>
    <${Y} id=${t} label="KQL query" value=${o} options=${le} onChange=${p} editorRef=${u} hint=${d}/>
    <div class="bd-kql-actions">
      ${f&&i`<a class="bd-btn bd-p" href=${f} target="_blank" rel="noopener noreferrer">Open in Kusto</a>`}
      <button type="button" class="bd-btn" disabled=${!o.trim()} onClick=${m}>Copy query</button>
      ${o!==n&&i`<button type="button" class="bd-btn" onClick=${()=>p(n)}>Restore example</button>`}
      <span role="status">${c}</span>
    </div>
    <p>${f?`Opens in Azure Data Explorer without running the query.`:o.trim()?`No Kusto database link is available. You can still copy the query.`:`Enter a query to copy or open it.`}</p>`}var me={nodes:`Fleet nodes`,steps:`Steps`,requests:`Requests & USD`,tools:`Tool activity`,failures:`Failed tools`,context:`Context & reset`,spans:`OTel spans`,prompts:`User prompts`,assistant:`Assistant text`,commands:`Commands`,longest:`Longest turn`,subagents:`Subagents`,sizes:`Response bytes`,mcp:`MCP calls`,reasoning:`Reasoning tok`,costMain:`Turn cost (main)`,costTree:`Turn cost (tree)`,costAll:`Turn cost (all)`};function X({base:e,url:t,sessionId:n,nodeId:a,sessions:o,models:s,tools:c,since:l,until:u,flowFilters:d}){let[f,p]=r(`steps`),[m,h]=r(H(n)),[g,_]=r(H(a)||`legacy`),[v,y]=r(``),[b,x]=r(``),[S,C]=r(``),[w,T]=r(null),E=e+`-hint`,D=B[f],ee=D.cost===`all`,te=JSON.stringify([l,u,g]),O=ee&&w===te,k=(D.fleet||g.trim())&&ce(D,{sessionId:m,nodeId:g,model:v,tool:b,keyword:S,since:l,until:u,includeAllSessions:O}),A=!!(d&&(d.tool_name||d.category||d.failed||d.q));return i`<div class="bd-kql-body">
    ${A&&i`<div class="bd-kql-sync">
      <span>Active Flow filters detected (${[d.category&&`category=${d.category}`,d.tool_name&&`tool=${d.tool_name}`,d.failed&&`failures only`,d.q&&`q="${d.q}"`].filter(Boolean).join(` · `)})</span>
      <button type="button" class="bd-btn bd-kql-syncbtn" onClick=${()=>{if(!d)return;let e=f;d.failed?e=`failures`:d.category===`tools`||d.tool_name?e=`tools`:d.category===`prompts`?e=`prompts`:d.category===`models`?e=`requests`:d.category===`agents`?e=`subagents`:d.category===`context`&&(e=`context`),p(e),T(null),d.tool_name&&x(d.tool_name),d.q&&(e===`prompts`||e===`assistant`)&&C(d.q)}}>Sync with Flow filters</button>
    </div>`}
    <div class="bd-kql-pills" role="group" aria-label="KQL preset shortcuts">
      ${Object.entries(B).map(([e,t])=>i`<button type="button" key=${e}
        class=${`bd-kql-pill`+(f===e?` bd-on`:``)} title=${t.label}
        onClick=${()=>{p(e),T(null),C(``)}}>${me[e]||e}</button>`)}
    </div>
    <label class="bd-kql-field">Example<select value=${f} onChange=${e=>{p(e.currentTarget.value),T(null),C(``)}}>
      ${Object.entries(B).map(([e,t])=>i`<option value=${e} key=${e}>${t.label}</option>`)}
    </select></label>
    <p><code>${D.table}</code> · ${D.description}</p>
    <div class="bd-kql-filters">
      ${!D.fleet&&i`<${Y} id=${e+`-node`} label="Reporting node" value=${g} options=${ue([a,`legacy`])} onChange=${_} hint=${E} placeholder="Enter a node ID"/>`}
      ${ee?i`<label><input type="checkbox" checked=${O}
        onChange=${e=>T(e.currentTarget.checked?te:null)}/> Include all sessions in this date range</label>`:!D.fleet&&i`<${Y} id=${e+`-sid`} label="Session ID" value=${m} options=${ue([n,...de(o)])} onChange=${h} hint=${E} placeholder="Enter a session ID"/>`}
      ${D.model&&i`<${Y} id=${e+`-model`} key="model" label="Model (optional)" value=${v} options=${ue(de(s))} onChange=${y} hint=${E} placeholder="Any model"/>`}
      ${D.tool&&i`<${Y} id=${e+`-tool`} key="tool" label="Tool name (optional)" value=${b} options=${ue(de(c))} onChange=${x} hint=${E} placeholder="Any tool"/>`}
      ${D.keyword&&i`<label class="bd-kql-field">Keyword or phrase (optional)
        <input type="text" value=${S} onInput=${e=>C(e.currentTarget.value)} autocomplete="off" placeholder="Search retained text"/>
      </label>`}
    </div>
    ${!D.fleet&&!g.trim()&&i`<p>Enter a reporting node, or select Fleet nodes to compare nodes.</p>`}
    ${!m&&!ee&&!D.fleet&&i`<p>Enter a session ID. An empty ID matches no rows.</p>`}
    ${D.keyword&&i`<p>The search term is included in the Kusto link. Matching text is returned only when you run the query in Kusto.</p>`}
    <p id=${E}>Type a prefix for suggestions. Use ↑ or ↓ and Enter to choose, or Esc to dismiss.
      Examples use Flow’s time range, not its event-list filters.</p>
    ${k&&i`<${pe} id=${e+`-editor`} key=${k} generated=${k} url=${t}/>`}
  </div>`}function he({url:e,sessionId:t,nodeId:n,sessions:a,models:s,tools:c,since:l,until:u,flowFilters:d}){let[f,p]=r(!1),m=`session-kql-`+o();return i`<details class="bd-kql" onToggle=${e=>{e.currentTarget.open&&p(!0)}}>
    <summary>Query in Kusto</summary>
    ${f&&i`<${X} key=${JSON.stringify([n,t])} ...${{base:m,url:e,sessionId:t,nodeId:n,sessions:a,models:s,tools:c,since:l,until:u,flowFilters:d}}/>`}
  </details>`}function ge(e){let t=new Date(e*1e3),n=t.getTimezoneOffset();return new Date(t.getTime()-n*6e4).toISOString().slice(0,16)}function _e(e,t){if(!e||!t)return{error:`Enter both a start and an end time.`};let n=new Date(e).getTime()/1e3,r=new Date(t).getTime()/1e3;return!Number.isFinite(n)||!Number.isFinite(r)?{error:`Invalid date/time value.`}:r<=n?{error:`End time must be after start time.`}:{since:n,until:r}}var ve=`aictl-pref-session_flow_mode`;function ye(e,t){if(!t)return``;let n=JSON.stringify(String(t));return e.type===`tool_use`?`tool_invocations\n| where session_id == ${n}${e.to?` and tool_name == ${JSON.stringify(String(e.to))}`:``}${e.success===!1?` and is_error == 1`:``}\n| top 100 by ts desc\n| project event_time=unixtime_seconds_todatetime(ts), tool_name, duration_ms, is_error`:e.type===`api_call`?`requests\n| where session_id == ${n}${e.model?` and model == ${JSON.stringify(String(e.model))}`:``}\n| top 100 by ts desc\n| project event_time=unixtime_seconds_todatetime(ts), model, input_tokens, output_tokens, cost_usd`:e.type===`skill_event`?`OTELTraces\n| where SessionId == ${n} and isnotempty(ReportedSkillNames)\n| project StartTime, OperationName, Model, ToolName, ReportedSkillNames`:`session_steps\n| where session_id == ${n}\n| top 100 by ts desc\n| project event_time=unixtime_seconds_todatetime(ts), step_key, ['kind'], phase, name, agent_id, turn_id`}function be({ev:e,sessionId:t,onClose:n}){let r=k(e),a=e.tokens||{},o=e.type===`api_call`?x(a.input||0)+` tokens in`:e.type===`api_response`?x(a.output||0)+` tokens out`:e.result_size?e.result_size+` B out`:e.prompt_length?e.prompt_length+` characters`:`n/a`,s=e.decision||(e.success===!1||e.success===`false`?`Failed`:e.success===!0||e.success===`true`?`OK`:`n/a`),c=[[`Type`,e.type===`user_message`?`User input prompt`:e.type||`n/a`],[`Time`,y(e.ts,!0)],[`Took`,e.duration_ms?b(e.duration_ms):`n/a`],[`Size`,o],[`Model`,e.model||`n/a`],[`Result`,s]];e._rt&&c.push([`Turn tokens`,x(e._rt)]),e._cum&&c.push([`Session cumulative`,x(e._cum)]),e.agent_id&&e.type!==`skill_event`&&c.push([`Subagent ID`,e.agent_id]),e.type===`skill_event`&&(c.splice(0,c.length,[`Skill`,e.name],[`Evidence`,A(e.phase)],[`Source`,e.source],[e.phase===`reported`?`First reported in range`:`Time`,y(e.ts,!0)]),e.phase===`reported`&&c.push([`Last reported in range`,y(e.last_ts,!0)],[`Distinct spans`,x(e.reported_spans)]),e.agent_id&&c.push([`Agent ID`,e.agent_id])),e.type===`user_message`&&c.push([`Source`,e.source||`n/a`],[`Text`,e.text_status||(e.redacted?`Not retained`:`Recorded`)]);let l=h(j(e)),u=h(ne(e)),d=ye(e,t),f=w[e.type]||{lane:`tool`},p=e.type===`api_call`&&e.is_error||e.type===`error`||e.type===`tool_use`&&e.success===!1?T.error:e.type===`skill_event`?`var(--warn)`:T[f.lane]||`var(--ink3)`;return i`<aside class="bd-ag-insp bd-flow-side" role="region" aria-label="Selected event">
    <div class="bd-ag-insph">
      <span class="bd-ag-lane" style=${{color:p,borderColor:p}}>${e.type===`skill_event`?`skill`:f.lane}</span>
      <b title=${r.label}>${r.label}</b>
      ${e._turnIndex>0&&i`<span class="bd-flow-turn-num">Turn #${e._turnIndex}</span>`}
      <button type="button" class="bd-btn" onClick=${n}>Close</button>
    </div>
    <dl class="bd-ag-kv">${c.map(([e,t])=>i`<div key=${e}><dt>${e}</dt><dd>${t}</dd></div>`)}</dl>
    ${l?i`<div class="bd-ag-sect">${e.type===`user_message`?`Your prompt`:`Input`}</div><pre class="bd-ag-pre">${l}</pre>`:null}
    ${u?i`<div class="bd-ag-sect">Output</div><pre class="bd-ag-pre">${u}</pre>`:null}
    ${d?i`<div class="bd-ag-sect">Correlated KQL Snippet</div><pre class="bd-ag-pre bd-insp-kql">${d}</pre>`:null}
  </aside>`}var Z=e=>e.step_key||e.event_id||e;function xe({turnGroups:e,activeTurn:t,onSelectTurn:n}){if(!e||e.length<2)return null;let r=Math.max(1,...e.map(e=>e.tokens||0)),a=e.reduce((e,t)=>!e||(t.tokens||0)>(e.tokens||0)?t:e,null);return i`<div class="bd-flow-scrubber" role="region" aria-label="Session turn scrubber">
    <div class="bd-flow-scrub-meta">
      <strong>Turn Scrubber (${x(e.length)} turns)</strong>
      ${a&&a.tokens>0?i`<span>Peak: Turn #${a.turnIndex} (${x(a.tokens)} tok)</span>`:null}
      ${t==null?null:i`<button type="button" class="bd-btn bd-flow-scrub-clear" onClick=${()=>n(null)}>Turn #${t} selected ×</button>`}
    </div>
    <div class="bd-flow-scrub-track">
      ${e.map(e=>{let o=Math.max(16,Math.round((e.tokens||1)/r*100)),s=a&&e.turnIndex===a.turnIndex&&e.tokens>0,c=t===e.turnIndex,l=[`bd-flow-sbar`,s?`bd-peak`:``,e.errors>0?`bd-has-err`:``,e.skills.length>0?`bd-has-skill`:``,c?`bd-on`:``].filter(Boolean).join(` `),u=`Turn #${e.turnIndex} (${f(e.startTs)}): ${x(e.tokens)} tok`+(e.errors?` · ${e.errors} failed`:``)+(e.skills.length?` · skill: ${e.skills.join(`, `)}`:``)+(e.promptText?` — ${e.promptText.slice(0,80)}`:``);return i`<button type="button" key=${e.turnIndex} class=${l} style=${{height:o+`%`}}
          title=${u} aria-label=${`Turn ${e.turnIndex}`} aria-pressed=${c?`true`:`false`}
          onClick=${()=>n(c?null:e.turnIndex)}/>`})}
    </div>
  </div>`}function Se({events:e,sel:t,onSel:n}){let[a,o]=r({}),s=e=>o(t=>({...t,[e]:!t[e]}));return i`<div class="bd-flow-colhdr" aria-hidden="true">
    <span>Time</span>
    <span>Actor / Kind</span>
    <span>Step / Command / Target</span>
    <span class="bd-flow-colhdr-r">Tokens</span>
    <span>Turn Timeline Waterfall</span>
  </div>
  <ul class="bd-ag-tl" aria-label="Events, oldest first">${e.map((e,r)=>{let o=w[e.type]||{lane:`tool`,kind:`request`},c=e.type===`api_call`&&e.is_error||e.type===`error`||e.type===`tool_use`&&e.success===!1,l=c?T.error:e.type===`skill_event`?`var(--warn)`:T[o.lane]||`var(--ink3)`,u=k(e),d=t===Z(e),p=e._turnGroup,m=p&&a[p.turnIndex]&&!e._isTurnStart&&!d,h=e.duration_ms>0?b(e.duration_ms):``;return i`<li key=${e.step_key||e.event_id||r} hidden=${!!m}>
      ${e._isTurnStart&&p&&i`<div class="bd-flow-turn-hdr">
        <button type="button" class="bd-flow-turn-toggle" onClick=${()=>s(p.turnIndex)}
          aria-expanded=${a[p.turnIndex]?`false`:`true`}>
          <span class="bd-flow-turn-chev">${a[p.turnIndex]?`▸`:`▾`}</span>
          <span class="bd-flow-turn-num">Turn #${p.turnIndex}${p.isPartialStart?` · CONT.`:``}</span>
          <span class="bd-flow-turn-ts">${f(p.startTs)}${p.endTs>p.startTs?` → `+f(p.endTs):``}</span>
          <span class="bd-flow-turn-prompt">${p.promptText}</span>
        </button>
        <div class="bd-flow-turn-badges">
          ${p.skills.length>0&&i`<span class="bd-flow-tbadge bd-warn">★ ${p.skills.join(`, `)}</span>`}
          ${p.errors>0&&i`<span class="bd-flow-tbadge bd-crit">${p.errors} ${p.errors===1?`Failure`:`Failures`}</span>`}
          ${p.subagents>0&&i`<span class="bd-flow-tbadge">${p.subagents} ${p.subagents===1?`Subagent`:`Subagents`}</span>`}
          ${p.apiCalls>0&&i`<span class="bd-flow-tbadge">${x(p.apiCalls)} API</span>`}
          ${p.tokens>0&&i`<span class="bd-flow-tbadge bd-focus">${x(p.tokens)} tok</span>`}
          ${p.durationMs>0&&i`<span class="bd-flow-tbadge">${b(p.durationMs)}</span>`}
        </div>
      </div>`}
      <button type="button" class=${`bd-ag-tlrow`+(d?` bd-on`:``)+(c?` bd-err-row`:``)} aria-expanded=${d?`true`:`false`}
        onClick=${()=>n(d?null:Z(e))}>
        <span class="bd-ag-when">${f(e.ts)}${e._cum?i`<em>${x(e._cum)+` total`+(e._rt?`, `+x(e._rt)+` this turn`:``)}</em>`:null}</span>
        <span class="bd-ag-body-actor">
          <span class="bd-ag-dot" style=${{borderColor:l,background:o.kind===`reply`||o.kind===`marker`?l:`transparent`}}></span>
          <span class="bd-ag-lane" style=${{color:l,borderColor:l}}>${e.type===`skill_event`?`skill`:o.lane}</span>
        </span>
        <span class="bd-ag-body">
          <span class="bd-ag-body-top">
            ${e.agent_id&&i`<span class="bd-flow-subtag" title=${e.agent_id}>agent:${String(e.agent_id).slice(0,8)}</span>`}
            <span class="bd-ag-lbl">${u.label}</span>
          </span>
          ${u.meta?i`<span class="bd-ag-meta">${u.meta}</span>`:null}
        </span>
        <span class="bd-ag-size">${u.size||(e.tokens?.input?`+`+x((e.tokens.input||0)+(e.tokens.output||0))+` tok`:``)}</span>
        <span class="bd-ag-wf" aria-hidden="true">
          <span class="bd-ag-wftrack"><i class="bd-ag-wfbar" style=${{left:(e._wfOffsetPct||0)+`%`,width:(e._wfWidthPct||8)+`%`,background:l}}></i></span>
          <span class="bd-ag-wfdur">${h}</span>
        </span>
      </button>
    </li>`})}</ul>`}function Ce({events:e,participants:t,filtered:a,groupLanes:o,sel:s,onSel:c,toolLabel:l}){let[d,p]=r(!1),m=n(()=>{let t=[`main`];for(let n of e)n.agent_id&&!t.includes(n.agent_id)&&t.push(n.agent_id);return t},[e]),{lanes:h,columns:g}=n(()=>O(e,t,a,o),[e,t,a,o]),_=h.length||1,v=e=>g.get(e)??-1,y=e=>(e+.5)/_*100;return d&&m.length>1?i`<div class="bd-ag-bar bd-flow-slmode">
      <${u} label="Swim-lane layout" value="streams" onPick=${e=>p(e===`streams`)}
        items=${[[`participants`,`Participant arrows`],[`streams`,`Session & Subagent streams`]]}/>
      <span class="bd-ag-dim">Each column is an execution stream (Main session + Subagents); models and tools render inline without wasting columns.</span>
    </div>
    <div class="bd-ag-sl bd-ag-sl-streams" role="list" aria-label="Events between participants, oldest first">
      <div class="bd-flow-stream-hdr" style=${{gridTemplateColumns:`68px repeat(${m.length}, minmax(210px, 1fr))`}}>
        <span>Time</span>
        ${m.map((e,t)=>i`<b key=${e} class="bd-flow-stream-colh">
          <i class="bd-sw" style=${{background:t===0?`var(--s1)`:`var(--s5)`,marginRight:`5px`}}/>
          ${e===`main`?`Main Session (${l||`root`})`:`Subagent ${String(e).slice(0,8)}`}
        </b>`)}
      </div>
      ${e.map((e,t)=>{let n=k(e),r=s===Z(e),a=e.type===`error`||e.is_error||e.type===`tool_use`&&e.success===!1,o=a?T.error:e.type===`skill_event`?`var(--warn)`:T[(w[e.type]||{}).lane]||`var(--ink2)`,l=e.agent_id&&m.includes(e.agent_id)?e.agent_id:`main`;return i`<div key=${e.step_key||e.event_id||t} role="listitem">
          <button type="button" class=${`bd-flow-stream-row`+(r?` bd-on`:``)}
            style=${{gridTemplateColumns:`68px repeat(${m.length}, minmax(210px, 1fr))`}}
            aria-expanded=${r?`true`:`false`} aria-label=${f(e.ts)+` `+n.label}
            onClick=${()=>c(r?null:Z(e))}>
            <span class="bd-flow-stream-ts">${f(e.ts)}</span>
            ${m.map(t=>i`<span key=${t} class="bd-flow-stream-cell">
              ${t===l?i`<span class=${`bd-flow-stream-card`+(a?` bd-err`:e.type===`skill_event`?` bd-skill`:``)}>
                <span class="bd-flow-sc-top"><strong><i class="bd-sw" style=${{background:o,marginRight:`5px`}}/>${n.label}</strong>${e.duration_ms>0?i`<em>${b(e.duration_ms)}</em>`:null}</span>
                ${n.meta?i`<span class="bd-flow-sc-meta">${n.meta}</span>`:null}
              </span>`:null}
            </span>`)}
          </button>
        </div>`})}
    </div>`:i`${m.length>1&&i`<div class="bd-ag-bar bd-flow-slmode">
    <${u} label="Swim-lane layout" value="participants" onPick=${e=>p(e===`streams`)}
      items=${[[`participants`,`Participant arrows`],[`streams`,`Session & Subagent streams (`+m.length+`)`]]}/>
  </div>`}
  <div class="bd-ag-sl" style=${{"--flow-diagram-width":158+_*96+`px`,"--flow-lane-pitch":100/_+`%`}} tabindex="0" role="list" aria-label="Events between participants, oldest first">
    <div class="bd-ag-slhead" aria-hidden="true"><span>Total</span><span>Turn</span><span>Time</span>
      <span class="bd-ag-slarea">${h.map((e,t)=>i`<b key=${e.id} style=${{left:y(t)+`%`,color:e.color,borderColor:e.color}} title=${e.label}>${e.label}</b>`)}</span>
    </div>
    ${e.map((e,t)=>{let n=v(e._from),r=v(e._to),a=k(e),o=s===Z(e),l=h[r],u=e.type===`error`||e.is_error?T.error:e.type===`user_message`?T.user:e.type===`api_response`?T.api:l?.color||`var(--ink2)`,d;if(n<0||r<0){let t=T[(w[e.type]||{}).lane]||`var(--ink3)`;d=i`<span class="bd-ag-marker" style=${{color:t,borderColor:t}}>${a.label}${a.meta?` · `+a.meta:``}</span>`}else{let e=Math.min(n,r),t=Math.max(n,r),o=r>n;d=i`<span class="bd-ag-arrow" style=${{left:y(e)+`%`,width:y(t)-y(e)+`%`,borderColor:u}}>
          <span class=${`bd-ag-head`+(o?` bd-r`:` bd-l`)} style=${{color:u}}></span>
        </span>
        <span class="bd-ag-alabel" style=${{left:(y(e)+y(t))/2+`%`,color:u}} title=${a.label}>${a.label}${a.meta?i`<em>${a.meta}</em>`:null}</span>`}return i`<div key=${e.step_key||e.event_id||t} role="listitem">
        <button type="button" class=${`bd-ag-slrow`+(o?` bd-on`:``)} aria-expanded=${o?`true`:`false`} aria-label=${f(e.ts)+` `+a.label}
          onClick=${()=>c(o?null:Z(e))}>
          <span>${e._cum?x(e._cum):``}</span><span>${e._rt?x(e._rt):``}</span><span>${f(e.ts)}</span>
          <span class="bd-ag-slarea">${d}</span>
        </button>
      </div>`})}
  </div>`}var Q=e=>e?.summary?.omitted_events||0,we=e=>{let t=(e.turns||[]).length;return Q(e)?`Newest `+x(t)+` of `+x(t+Q(e))+` events`:x(t)+` events`},Te=500,Ee=1e3,De=5e3,$={q:``,category:``,tool_name:``,flow_agent:``,skill_name:``,skill_phase:``,failed:!1,range:`whole`,start:``,end:``},Oe=[`prompts`,`messages`,`models`,`tools`,`skills`,`agents`,`context`,`hooks`,`lifecycle`];function ke({apply:e,scope:t,bounds:n,initialCategory:a,activeCategory:s,activeFailed:c}){let[l,u]=r(()=>({...$,category:a})),[d,f]=r(``),p=o(),m=(e,t)=>{u(n=>({...n,[e]:t})),f(``)},h=t=>{t.preventDefault();let r=new URLSearchParams,i=[`q`,`category`,`flow_agent`,...l.category===`skills`?[`skill_name`,`skill_phase`]:[`tool_name`]];for(let e of i)l[e].trim()&&r.set(e,l[e].trim());l.failed&&l.category!==`skills`&&r.set(`failed`,`1`);let a;if(l.range===`custom`)a=_e(l.start,l.end);else if(l.range!==`whole`){if(!Number.isFinite(n.end)){f(`The session end time has not been reported.`);return}a={since:n.end-Number(l.range),until:n.end}}a?.error?f(a.error):(a&&(r.set(`since`,Math.floor(a.since)),r.set(`until`,Math.ceil(a.until))),f(``),e(r.toString()))},g=e=>{e===`custom`?(f(``),u(t=>({...t,range:e,start:t.start||(Number.isFinite(n.start)?ge(n.start):``),end:t.end||(Number.isFinite(n.end)?ge(Math.ceil(n.end/60)*60):``)}))):m(`range`,e)},_=t=>{let n={...$,category:s===t?``:t};u(n),f(``),e(n.category?`category=`+t:``)};return i`<form class="bd-flow-filters" role="search" aria-label="Flow filters" onSubmit=${h}>
    <div class="bd-flow-quickbar">
      <button type="button" class=${`bd-btn bd-flow-qpill`+(!s&&!c?` bd-on`:``)}
        aria-pressed=${!s&&!c} onClick=${()=>{u($),f(``),e(``)}}>All events</button>
      <button type="button" class=${`bd-btn bd-flow-qpill`+(s===`prompts`?` bd-on`:``)}
        aria-pressed=${s===`prompts`} onClick=${()=>_(`prompts`)}>User prompts</button>
      <button type="button" class=${`bd-btn bd-flow-qpill`+(s===`models`?` bd-on`:``)}
        aria-pressed=${s===`models`} onClick=${()=>_(`models`)}>Model rounds</button>
      <button type="button" class=${`bd-btn bd-flow-qpill`+(s===`tools`?` bd-on`:``)}
        aria-pressed=${s===`tools`} onClick=${()=>_(`tools`)}>Tool uses</button>
      <button type="button" class=${`bd-btn bd-flow-qpill`+(s===`agents`?` bd-on`:``)}
        aria-pressed=${s===`agents`} onClick=${()=>_(`agents`)}>Subagents</button>
      <button type="button" class=${`bd-btn bd-flow-qpill bd-flow-qskill`+(s===`skills`?` bd-on`:``)}
        aria-pressed=${s===`skills`} onClick=${()=>_(`skills`)}>Skills</button>
      <button type="button" class=${`bd-btn bd-flow-qpill bd-flow-qerr`+(c?` bd-on`:``)}
        aria-pressed=${!!c} onClick=${()=>{let t=!c,n={...$,failed:t};u(n),f(``),e(t?`failed=1`:``)}}>Failed steps</button>
      <label class="bd-flow-search"><span class="bd-flow-srchlbl">${l.category===`prompts`?`Search prompt text`:`Search events`}</span><input type="search" placeholder=${l.category===`prompts`?`Words you wrote in this session`:`Search prompt, tool, path, error...`} value=${l.q} onInput=${e=>m(`q`,e.currentTarget.value)}/></label>
    </div>
    <div class="bd-flow-filter-row">
      <label><span>Category</span><select value=${l.category} onChange=${e=>m(`category`,e.currentTarget.value)}>
        <option value="">All categories</option>${Oe.map(e=>i`<option key=${e} value=${e}>${e===`prompts`?`User prompts only`:e[0].toUpperCase()+e.slice(1)}</option>`)}
      </select></label>
      ${l.category===`skills`?i`<label><span>Skill name</span><input list=${p+`-skills`} placeholder="Any skill" value=${l.skill_name} onInput=${e=>m(`skill_name`,e.currentTarget.value)}/></label>
        <datalist id=${p+`-skills`}>${t?.skills?.map(e=>i`<option value=${e} key=${e}/>`)}</datalist>
        <label><span>Skill evidence</span><select value=${l.skill_phase} onChange=${e=>m(`skill_phase`,e.currentTarget.value)}>
          <option value="">All evidence</option>${[`loaded`,`invoked`,`reported`,`resolved`].map(e=>i`<option key=${e} value=${e}>${A(e)}</option>`)}
        </select></label>`:i`<label><span>Tool name</span><input list=${p+`-tools`} placeholder="Any tool" value=${l.tool_name} onInput=${e=>m(`tool_name`,e.currentTarget.value)}/></label>`}
      <datalist id=${p+`-tools`}>${t?.tools?.map(e=>i`<option key=${e} value=${e}/>`)}</datalist>
      <label><span>Agent ID</span><input list=${p+`-agents`} placeholder="Any agent" value=${l.flow_agent} onInput=${e=>m(`flow_agent`,e.currentTarget.value)}/></label>
      <datalist id=${p+`-agents`}>${t?.agents?.map(e=>i`<option key=${e} value=${e}/>`)}</datalist>
      <label><span>Time range</span><select value=${l.range} onChange=${e=>g(e.currentTarget.value)}>
        <option value="whole">Whole session</option><option value="900" disabled=${!Number.isFinite(n.end)}>Last 15 min of session</option>
        <option value="3600" disabled=${!Number.isFinite(n.end)}>Last hour of session</option><option value="custom">Custom range</option>
      </select></label>
      ${l.range===`custom`&&i`<label><span>From (local)</span><input type="datetime-local" value=${l.start} onInput=${e=>m(`start`,e.currentTarget.value)}/></label>
        <label><span>To (local)</span><input type="datetime-local" value=${l.end} onInput=${e=>m(`end`,e.currentTarget.value)}/></label>`}
      <div class="bd-flow-actions">${l.category!==`skills`&&i`<label class="bd-ag-check"><input type="checkbox" checked=${l.failed} onChange=${e=>m(`failed`,e.currentTarget.checked)}/>Failures only</label>`}
        <button type="submit" class="bd-btn bd-p">Apply filters</button>
        <button type="button" class="bd-btn" onClick=${()=>{u($),f(``),e(``)}}>Reset filters</button>
      </div>
    </div>
    ${d&&i`<span class="bd-ag-bad" role="alert">${d}</span>`}
  </form>`}function Ae(e){if(!e)return null;try{let t=new URL(e);return[`https:`,`http:`].includes(t.protocol)?t.href:null}catch{return null}}function je(e){return i`<${Me} key=${e.a.id} ...${e}/>`}function Me({a:o,st:d,ctx:f,act:p,flowRef:h,sid:y,captureMode:C,initialEvidence:w=!1,initialPrompts:T=!1,initialSkills:E=!1,agentData:D}){let ee=_(d)?f.refreshKey:0,[O,k]=r(500),A=T?`prompts`:E?`skills`:``,[j,ne]=r(A?`category=`+A:``),M=`limit=`+O+(j?`&`+j:``),{data:N,error:P}=l(e=>a(o.id,M,{...e,nodeScope:f.nodeScope,nodeId:f.nodeId}),JSON.stringify([`flow`,o.id,M]),f.remote?0:ee),[F,re]=c(ve,`timeline`,[`timeline`,`swimlane`]),[ie,ae]=c(`aictl-pref-flow-lanes`,`individual`,[`individual`,`grouped`]),[I,L]=r(w),[oe,R]=r(w),[z,B]=r(null);t(()=>{L(w),w&&R(!0)},[w]);let V=I?`source`:F,[H,U]=r(null),W=e({});!N||new URLSearchParams(j).has(`since`)||new URLSearchParams(j).has(`until`)||j&&W.current.end||(W.current={start:N.scope?.start??o.started_at,end:N.scope?.end??o.ended_at??N.turns?.at(-1)?.ts});let G={start:W.current.start??o.started_at,end:W.current.end??o.ended_at},se=f.toolName?f.toolName(o.tool):o.tool,K=n(()=>te(N?.turns||[],se,N?.summary),[N,se]),ce=n(()=>h?K.events.filter(e=>e[h.field]===h.id&&(!h.traceId||e.trace_id===h.traceId)):K.events,[K,h]),q=n(()=>z==null?ce:ce.filter(e=>e._turnIndex===z),[ce,z]),le=n(()=>H==null?null:q.find(e=>Z(e)===H)||null,[q,H]),ue=e=>{L(e===`source`),e===`source`?R(!0):re(e)},de=e=>{e!==j&&(U(null),B(null),ne(e),k(500))},fe=Ae(N?.session_kql_url),J=N?.scope,Y=y||N?.session_id,pe=f.data?.agents,me=n(()=>[...new Set([Y,...(pe||[]).map(e=>e.native_session_id?e.native_session_id:e.placeholder||e.id?.startsWith(`live:`)||e.runtime_present&&!e.queryable?null:e.session_id||e.parent_id||e.id)].filter(Boolean))],[Y,pe]),X=new URLSearchParams(j),ge=X.has(`since`)?Number(X.get(`since`)):null,_e=X.has(`until`)?Number(X.get(`until`)):null,ye=y===void 0?o.native_session_id||o.session_id||N?.session_id:y,Te=j?`Summary counts all events in the selected time span.`:N&&we(N),$=K.summary,Oe=[{label:`Turns`,value:x($.turns),title:`Prompts in the session`},{label:`Tool calls`,value:x($.toolCalls)},{label:`Subagents`,value:x($.subagents)},{label:`Hooks`,value:x($.hooks)},{label:`Errors`,value:x($.errors)},{label:`Compactions`,value:x($.compactions)},{label:`Tokens, total`,value:x($.cumulative),title:`Input and output of every model call, added up`},{label:`Largest turn`,value:x($.roundTrip),title:`The most input and output tokens between two prompts`},{label:`First token`,value:$.ttft==null?`n/a`:b($.ttft),sub:$.ttftCalls?`median of `+$.ttftCalls+` calls`:``,title:`Time to first token`}];return i`<${m} a=${o}/>
    ${N&&!N.summary?.skill_evidence&&i`<${g} key="summary" id="agfs" title="Summary" sub=${Te}><${s} stats=${Oe}/></${g}>`}
    <${g} key="flow" id="agfl" title="Flow" sub=${I?`Search retained source records separately from flow events.`:Q(N)&&!j?`Oldest first. The `+x(Q(N))+` oldest events are left out; the summary counts them.`:`Oldest first. Select an event to read it.`}>
      <div class="bd-ag-bar bd-flow-toolbar">
        <${u} label="Flow view" value=${V} onPick=${ue} items=${[[`timeline`,`Timeline`],[`swimlane`,`Swim-lane`],[`source`,`Source steps`]]}/>
        ${V===`swimlane`&&i`<${u} label="Participant lanes" value=${ie} onPick=${ae}
          items=${[[`individual`,`Individual lanes`],[`grouped`,`Group lanes`]]}/>`}
        ${N&&!I&&i`<span class="bd-flow-status" role="status">${J&&J.matched!=null&&J.total!=null?`Showing ${q.length.toLocaleString()} · ${J.matched.toLocaleString()} matched of ${J.total.toLocaleString()} events in range`:we(N)}</span>`}
        ${N&&!I&&Q(N)&&O<5e3?i`<button type="button" class="bd-btn" onClick=${()=>k(e=>Math.min(De,e+Ee))}>${`Show `+Math.min(Q(N),Ee).toLocaleString(`en-US`)+` older events`}</button>`:null}
        ${N&&!I&&Q(N)&&O>=5e3?i`<span class="bd-ag-dim">${x(Q(N))} older matching events remain outside the display limit.</span>`:null}
        ${fe&&i`<a class="bd-btn bd-flow-kusto" href=${fe} target="_blank" rel="noopener noreferrer">Open session in Kusto</a>`}
      </div>
      ${fe&&i`<${he} url=${N.session_kql_url} sessionId=${Y} nodeId=${N.node_id} sessions=${me}
        models=${J?.models?.length?J.models:o.models||[]} tools=${J?.tools||[]} since=${ge} until=${_e}
        flowFilters=${Object.fromEntries(X)}/>`}
      <div hidden=${I}>
        <${ke} scope=${J} bounds=${G} apply=${de} initialCategory=${A}
          activeCategory=${X.get(`category`)} activeFailed=${X.get(`failed`)===`1`}/>
        ${N&&i`<${xe} turnGroups=${K.turnGroups} activeTurn=${z} onSelectTurn=${B}/>`}
        ${X.get(`category`)===`skills`&&i`<p class="bd-note">Loaded files and invocations are separate records. “Reported in context” groups OTel spans by skill; it does not count skill loads.</p>`}
        ${X.get(`category`)===`prompts`&&i`<p class="bd-note">User input only. Select a row to read the retained prompt. Assistant replies and delegated instructions are not included.</p>`}
        ${h&&i`<div class="bd-ag-bar"><span>${h.label} ID: ${h.id}</span><button type="button" class="bd-btn" onClick=${()=>{U(null),p.setDrawerTab(`flow`)}}>Show full flow</button></div>`}
        ${N?q.length?!I&&i`<div class=${`bd-flow-workspace`+(le?` bd-has-insp`:``)}>
            <div class="bd-flow-main">
              ${F===`swimlane`?i`<${Ce} events=${q} participants=${K.participants} filtered=${!!(j||h)} groupLanes=${ie===`grouped`} sel=${H} onSel=${U} toolLabel=${se}/>`:i`<${Se} events=${q} sel=${H} onSel=${U}/>`}
            </div>
            ${le&&i`<${be} ev=${le} sessionId=${Y} onClose=${()=>U(null)}/>`}
          </div>`:i`<div class="bd-empty">${h?`No event in the loaded flow reports this source ID.`:j?`No events match these flow filters.`:`No flow data for this session: aictl has no prompt, model call or tool call of it, and no hook or OpenTelemetry event.`}</div>`:i`<${v} error=${P} what="the session flow"/>`}
      </div>
      ${oe&&i`<div hidden=${!I}><${S} inline=${!0} a=${o} sid=${ye} data=${D} ctx=${f} act=${p} captureMode=${C??f.data?.capture_mode}/></div>`}
    </${g}>`}export{Te as FLOW_EVENTS,De as FLOW_EVENTS_MAX,Ee as FLOW_EVENTS_STEP,ve as FLOW_MODE_KEY,je as default};
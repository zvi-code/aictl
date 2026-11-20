import{a as e,c as t,i as n,l as r,n as i,t as a}from"./hooks.module-tDeaYiaE.js";import{Bt as o,Ct as s,Vt as c,lt as l,on as u,ot as d,qt as f,st as p,wt as m}from"./index-Dh5zLRcX.js";import{FixedPanel as h,a as g,c as _,f as v,i as y,l as b,o as x,p as S,s as C,u as w,useDetail as T}from"./Drawer-CARE4k0E.js";import E from"./EvidenceTab-D4ci4wQh.js";var D={user_message:()=>[`user`,`tool`],api_call:e=>[e.from||`tool`,`api`],api_response:()=>[`api`,`tool`],error:()=>[`api`,`tool`],tool_use:e=>[`tool`,`skill:`+(e.to||`tool`)],subagent:e=>[`tool`,`subagent:`+(e.to||`agent`)],subagent_end:e=>[`subagent:`+(e.from||`agent`),`tool`],hook:()=>[`tool`,`hook`]},O={user_message:{lane:`user`,kind:`request`},api_call:{lane:`api`,kind:`request`},api_response:{lane:`api`,kind:`reply`},error:{lane:`error`,kind:`reply`},tool_use:{lane:`tool`,kind:`request`},subagent:{lane:`agent`,kind:`request`},subagent_end:{lane:`agent`,kind:`reply`},hook:{lane:`hook`,kind:`hook`},session_start:{lane:`session`,kind:`marker`},session_end:{lane:`session`,kind:`marker`},compaction:{lane:`compact`,kind:`marker`},context_update:{lane:`compact`,kind:`marker`},session_command:{lane:`session`,kind:`marker`},skill_event:{lane:`tool`,kind:`marker`}},k={user:`var(--s1)`,api:`var(--s2)`,tool:`var(--s3)`,agent:`var(--s5)`,hook:`var(--s4)`,session:`var(--good)`,compact:`var(--warn)`,error:`var(--crit)`};function ee(e){if(!e)return``;let t=e;if(typeof e==`string`)try{t=JSON.parse(e)}catch{return e.slice(0,80)}if(typeof t!=`object`||!t)return String(e).slice(0,80);for(let e of[`command`,`file_path`,`pattern`,`query`,`path`,`url`,`prompt`,`description`,`old_string`,`content`,`skill`])if(t[e])return String(t[e]).slice(0,100);let n=Object.keys(t);return n.length?String(t[n[0]]).slice(0,80):``}var A=e=>((e.tokens||{}).input||0)+((e.tokens||{}).output||0);function j(e){let t=e||[],n=[];for(let e=0;e<t.length;e++){let r=t[e],i=t[e+1];if(r&&i&&r.type===`user_message`&&i.type===`user_message`&&r.step_key&&r.step_key===i.step_key&&!!r.redacted!=!!i.redacted){let t=r.redacted?i:r,a=r.redacted?r:i;n.push({...a,...t,redacted:!1,tokens:A(a)>=A(t)?a.tokens:t.tokens,api_calls:a.api_calls||t.api_calls||0,duration_ms:a.duration_ms||t.duration_ms||0,wall_ms:a.wall_ms||t.wall_ms||0,end_ts:a.end_ts||t.end_ts,model:a.model||t.model||``}),e+=1}else n.push(r)}return n}function te(e,t,n){let r=j(e).map(e=>{let t=D[e.type],[n,r]=t?t(e):[null,null];return{...e,_from:n,_to:r}}),i=0,a=0,o=0,s=r.filter(e=>e.type===`user_message`).length,c=n?.total_turns||s,l=r.length>0&&r[0].type!==`user_message`&&(n?.omitted_events>0||r[0].rt_tokens>0),u=c>s&&s>0?c-s+1:1,d=l?Math.max(1,u-1):u-1,f=[],p=null;if(l){let e=r[0];e._isTurnStart=!0,p={turnIndex:d,isPartialStart:!0,startTs:e.ts,endTs:e.ts,promptEv:e,promptText:`Continued from earlier in turn (load older events for prompt)`,tokens:e.rt_tokens||0,cacheTokens:0,apiCalls:0,toolCalls:0,subagents:0,skills:[],errors:0,durationMs:0,events:[]},f.push(p)}for(let e of r){if(e.type===`user_message`?(a=0,d+=1,e._isTurnStart=!0,p={turnIndex:d,startTs:e.ts,endTs:e.end_ts||e.ts,promptEv:e,promptText:e.preview||e.message||(e.redacted?`Prompt (text not retained)`:`Prompt`),tokens:A(e),cacheTokens:(e.tokens||{}).cache_read||0,apiCalls:e.api_calls||0,toolCalls:0,subagents:0,skills:[],errors:0,durationMs:e.duration_ms||e.wall_ms||0,events:[e]},f.push(p)):p&&(p.events.push(e),e.ts>p.endTs&&(p.endTs=e.ts),p.isPartialStart&&p.endTs>p.startTs&&(p.durationMs=(p.endTs-p.startTs)*1e3)),e.type===`api_call`){let t=A(e);i+=t,a+=t,o=Math.max(o,a),p&&(p.tokens=Math.max(p.tokens,e.rt_tokens??a),p.cacheTokens+=(e.tokens||{}).cache_read||0,p.apiCalls=Math.max(p.apiCalls,p.events.filter(e=>e.type===`api_call`).length))}p&&(e.rt_tokens>p.tokens&&(p.tokens=e.rt_tokens),e.type===`tool_use`&&(p.toolCalls+=1),e.type===`subagent`&&(p.subagents+=1),e.type===`skill_event`&&e.name&&!p.skills.includes(e.name)&&p.skills.push(e.name),(e.type===`error`||e.is_error||e.type===`tool_use`&&e.success===!1)&&(p.errors+=1)),e._turnIndex=d,e._cum=e.cum_tokens??i,e._rt=e.rt_tokens??a}for(let e of f){let t=e.events,n=Math.max(1e3,...t.map(e=>e.duration_ms||0)),r=t.length||1;t.forEach((t,i)=>{t._turnGroup=e;let a=t.duration_ms||0,o=a>0?Math.max(6,Math.min(72,Math.round(a/n*68))):6;t._wfOffsetPct=r>1?Math.min(100-o,Math.round(i/(r-1)*(92-o))):0,t._wfWidthPct=o})}for(let e of r)e._wfWidthPct??=(e._wfOffsetPct=0,e.duration_ms>0?Math.min(80,Math.max(8,Math.round(e.duration_ms/250))):8);let m=new Map,h=0,g=(e,t,n)=>{m.has(e)||m.set(e,{id:e,label:t,color:n||v(h++)})};r.length&&(g(`user`,`User`,k.user),g(`tool`,t||`Tool`,`var(--ink2)`));for(let e of r)(e.type===`api_call`||e.type===`api_response`||e.type===`error`)&&g(`api`,`Model`,k.api),e.type===`tool_use`&&g(e._to,e.to||`tool`),e.type===`subagent`&&g(e._to,e.to||`Subagent`),e.type===`subagent_end`&&g(e._from,e.from||`Subagent`),e.type===`hook`&&g(`hook`,`Hooks`,k.hook);let _=e=>r.filter(t=>t.type===e).length,y=r.filter(e=>e.type===`api_call`&&e.ttft_ms>0).map(e=>e.ttft_ms).sort((e,t)=>e-t),b=y.length?y.length%2?y[(y.length-1)/2]:(y[y.length/2-1]+y[y.length/2])/2:null,x=n?.cumulative_tokens==null?{turns:_(`user_message`),toolCalls:r.filter(e=>e.type===`tool_use`&&e.subtype!==`result`&&e.subtype!==`decision`).length,subagents:_(`subagent`),hooks:_(`hook`),errors:_(`error`)+r.filter(e=>e.type===`api_call`&&e.is_error||e.type===`tool_use`&&e.success===!1).length,compactions:_(`compaction`),cumulative:i,roundTrip:o,ttft:b,ttftCalls:y.length}:{turns:n.total_turns,toolCalls:n.total_tool_uses,subagents:n.subagents,hooks:n.hooks,errors:n.errors,compactions:n.compactions,cumulative:n.cumulative_tokens,roundTrip:n.largest_turn_tokens,ttft:n.ttft_ms??null,ttftCalls:n.ttft_calls||0};return{events:r,participants:[...m.values()],turnGroups:f,summary:x}}function ne(e,t,n,r=!1){let i=new Set;for(let t of e)i.add(t._from),i.add(t._to);let a=t.filter(e=>!n||i.has(e.id)),o=[],s=new Map,c=new Map;for(let e of a){let t=r&&(e.id.startsWith(`skill:`)?`tools`:e.id.startsWith(`subagent:`)?`agents`:null),n=t?`group:`+t:e.id;s.has(n)||(s.set(n,o.length),o.push(t?{id:n,label:t===`tools`?`Tools`:`Subagents`,color:k[t===`tools`?`tool`:`agent`]}:e)),c.set(e.id,s.get(n))}return{lanes:o,columns:c,grouped:o.length<a.length}}function M(e){let t=e.tokens||{};if(e.type===`user_message`)return e.redacted?e.prompt_length?{label:`Prompt, text not sent (`+e.prompt_length+` characters)`,meta:``}:{label:`Prompt, text not kept`,meta:``}:{label:e.preview||e.message||`Prompt`,meta:e.prompt_length?e.prompt_length+` characters`:``};if(e.type===`api_call`){let t=[c(A(e))+` tokens`];return e.ttft_ms>0?t.push(`first token `+o(e.ttft_ms)):e.duration_ms>0&&t.push(o(e.duration_ms)),e.is_error&&t.push(`failed`),{label:e.agent_name||e.model||`Model call`,meta:t.join(`, `)}}if(e.type===`api_response`){let n=[e.model,e.finish_reason&&e.finish_reason!==`stop`?`stopped: `+e.finish_reason:``].filter(Boolean).join(`, `);return{label:`Reply`+(t.output?`, `+c(t.output)+` tokens`:``)+(e.response_preview?`: `+C(e.response_preview,80):``),meta:n}}if(e.type===`error`)return{label:`Error: `+(e.error_type||`error`),meta:C(e.error_message||``,80)};if(e.type===`tool_use`){let t=ee(e.params)||(e.target?String(e.target).slice(0,100):``),n=``;return e.subtype===`result`||!e.subtype&&typeof e.success==`boolean`?n=(e.success===!0||e.success===`true`?`OK`:`Failed`)+(e.duration_ms>0?`, `+o(e.duration_ms):``):e.subtype===`decision`&&(n=e.decision||``),{label:(e.to||`tool`)+(t?`: `+t:``),meta:n,size:e.result_size?e.result_size+` B`:``}}if(e.type===`subagent`)return{label:`Subagent `+(e.to||``),meta:C(e.prompt||e.model||``,80)};if(e.type===`subagent_end`)return{label:`Subagent `+(e.from||``)+(e.completed===!1?` stopped`:` done`),meta:e.duration_ms>0?o(e.duration_ms):``};if(e.type===`hook`)return{label:`Hook `+(e.hook_name||``),meta:``};if(e.type===`session_start`)return{label:`Session started`,meta:e.cwd||``};if(e.type===`session_end`)return{label:`Session ended`,meta:``};if(e.type===`skill_event`)return{label:`Skill: ${e.name||`Name not reported`}`,meta:[N(e.phase),e.phase===`reported`&&Number.isFinite(e.reported_spans)&&`${e.reported_spans} distinct spans`,e.source].filter(Boolean).join(` · `)};if([`context_update`,`session_command`].includes(e.type))return{label:[{context_update:`Context`,session_command:`Session command`}[e.type],e.name||e.phase].filter(Boolean).join(`: `),meta:[e.name&&e.phase,e.context_tokens!=null&&`${c(e.context_tokens)} context tokens`,e.source].filter(Boolean).join(` · `)};if(e.type===`compaction`){let t=e.before_tokens!=null&&e.after_tokens!=null?c(e.before_tokens)+` to `+c(e.after_tokens)+` tokens`:``;return{label:`Compaction`+(e.compaction_count?` `+e.compaction_count:``),meta:[t,e.duration_ms>0?o(e.duration_ms):``].filter(Boolean).join(`, `)}}return{label:e.type||`Event`,meta:``}}var N=e=>({loaded:`Loaded`,invoked:`Invoked`,reported:`Reported in context`,resolved:`Resolved`})[e]||e||`Not reported`;function re(e){return e.type===`user_message`?e.message||e.preview||``:e.type===`api_call`?e.request_preview||e.prompt_preview||``:e.type===`tool_use`?e.params||e.input_preview||e.target||``:e.type===`subagent`?e.prompt||``:e.type===`hook`&&e.hook_input||``}function ie(e){return e.type===`api_response`?e.response||e.response_preview||``:e.type===`api_call`&&e.is_error?e.error_message||``:e.type===`tool_use`?e.result_summary||e.result_preview||``:e.type===`error`?e.error_message||``:e.type===`hook`&&e.hook_output||``}function ae(e,t){let n=e.tokens||{},r=M(e),i=[{c:t,label:`Time`,value:new Date(e.ts*1e3).toLocaleTimeString()}];return e.model&&i.push({c:`transparent`,label:`Model`,value:e.model}),(n.input||n.output)&&i.push({c:`transparent`,label:`Input / output`,value:c(n.input||0)+` / `+c(n.output||0)}),n.cache_read&&i.push({c:`transparent`,label:`Cache read`,value:c(n.cache_read)}),e.duration_ms>0&&i.push({c:`transparent`,label:`Took`,value:o(e.duration_ms)}),e.ttft_ms>0&&i.push({c:`transparent`,label:`First token`,value:o(e.ttft_ms)}),r.meta&&i.push({c:`transparent`,label:`Detail`,value:C(r.meta,60)}),{title:C(r.label,70),rows:i}}var P=`_v:datetime _deleted:bool`,F=`session_id:string ts:real`,I={session_steps:`step_key:string ${F} ['kind']:string phase:string name:string turn_id:string agent_id:string context_tokens:long context_limit:long before_tokens:long after_tokens:long ${P}`,requests:`rowid:long ${F} model:string input_tokens:long output_tokens:long cost_usd:real ${P}`,tool_invocations:`rowid:long ${F} tool_name:string is_error:long duration_ms:real ${P}`,OTELTraces:`StartTime:datetime SessionId:string TraceID:string SpanID:string Model:string ToolName:string OperationName:string InputTokens:long OutputTokens:long`,agents:`agent_id:string session_id:string model:string started_at:real ended_at:real ${P}`,turn_request_links:`request_key:string ${F} agent_id:string turn_id:string root_session_id:string root_turn_id:string basis:string ${P}`},oe=`step_key:string ${F} ['kind']:string role:string ['source']:string phase:string turn_id:string text_status:string ${P}`,se=`step_key:string session_id:string ['text']:string ${P}`,ce=`rowid:long dedup_key:string ${F} agent_id:string cost_usd:real ${P}`,L=e=>e.split(` `).map(e=>e.split(`:`)[0]),le=(e,t)=>`union isfuzzy=true (datatable(node_id:string, ${t.split(` `).join(`, `)})[]), ${e}`,R=(e,t,n)=>{let r=U(n.nodeId).trim().toLowerCase();return le(e,t)+`\n| where node_id == ${W(r===`legacy`?``:r)}`},z=`| top 500 by ts desc
| order by ts asc, step_key asc`,B=`event_time=unixtime_seconds_todatetime(ts)`,V=(e,t)=>`iff(countif(isnotnull(${e})) > 0, sum(${e}), ${t}(null))`,ue={steps:{label:`Session steps timeline`,table:`session_steps`,description:`The latest 500 recorded steps, oldest first. No prompt or command text.`,body:`${z}\n| project ${B}, step_key, ['kind'], phase, name, agent_id, turn_id`},nodes:{label:`Sessions by reporting node`,table:`sessions`,fleet:!0,description:`Compare nodes with sessions started in the time range. Legacy means the reporting node was not recorded.`},requests:{label:`Requests and tokens by model`,table:`requests`,model:`model`,description:`Request counts, reported tokens and positive recorded USD. A zero or missing price is counted as unpriced, not free.`,body:`| extend priced=isnotnull(cost_usd) and isfinite(cost_usd) and cost_usd > 0
| summarize request_count=count(),
    input_tokens=${V(`input_tokens`,`long`)},
    output_tokens=${V(`output_tokens`,`long`)},
    recorded_usd=iff(countif(priced) > 0, sumif(cost_usd, priced), real(null)),
    unpriced_requests=countif(not(priced))
  by model
| order by request_count desc`},tools:{label:`Tool activity and failures`,table:`tool_invocations`,tool:`tool_name`,description:`Calls, reported failures, missing outcomes, and mean reported duration by tool name.`,body:`| summarize calls=count(), failures=countif(is_error == 1),
    unknown_outcomes=countif(isnull(is_error)), mean_duration_ms=avg(duration_ms)
  by tool_name
| order by calls desc`},failures:{label:`Failed tool calls`,table:`tool_invocations`,tool:`tool_name`,description:`The latest 500 calls explicitly marked as errors, newest first.`,body:`| where is_error == 1\n| top 500 by ts desc\n| project ${B}, rowid, tool_name, duration_ms`},context:{label:`Context changes, compaction and reset`,table:`session_steps`,description:`The latest 500 context events and related session commands, oldest first. A requested or dispatched command is not proof of a change; check its phase.`,body:`| where ['kind'] == "context" or (['kind'] == "session_command" and name in ("model_change", "model", "clear", "reset", "new", "compact", "rewind"))\n${z}\n| project ${B}, ['kind'], name, phase, agent_id, turn_id,\n    context_tokens, context_limit, before_tokens, after_tokens`},spans:{label:`OpenTelemetry spans`,table:`OTELTraces`,model:`Model`,tool:`ToolName`,description:`The latest 500 identified spans, newest first. Model and tool filters apply to the same span.`,body:`| top 500 by StartTime desc
| project StartTime, TraceID, SpanID, OperationName, Model, ToolName, InputTokens, OutputTokens`},prompts:{label:`User input prompts`,table:`session_steps`,fields:oe,keyword:!0,description:`Search retained user messages for a word or phrase. Shows the first 240 characters of the latest 500 matches, oldest first. Missing text is not searchable.`,body:(e,t)=>H(e,t,`user`)},assistant:{label:`Public assistant text and visible commentary`,table:`session_steps`,fields:oe,keyword:!0,description:`Search retained public assistant messages for a word or phrase. Shows the first 240 characters of the latest 500 matches, not private reasoning.`,body:(e,t)=>H(e,t,`assistant`)},commands:{label:`Commands: requests, starts and results`,table:`session_steps`,fields:`${oe} name:string tool_call_id:string agent_id:string exit_code:long`,description:`Shell requests, native starts and tool results are separate events. Session command requests and dispatches are not proof of execution. A preview is shown only when retained.`,body:(e,t)=>H(e,t,`commands`)},longest:{label:`Longest completed turn`,table:`session_steps`,fields:`${I.session_steps} ['source']:string`,description:`Requires one native start and one end for the same session, agent and turn, both in the time range. Incomplete or ambiguous pairs are excluded.`,body:`| where ['kind'] == "turn" and isnotempty(turn_id)
| where (['source'] == "assistant.turn_start" and phase == "started") or (['source'] == "assistant.turn_end" and phase == "ended")
| summarize starts=countif(phase == "started"), ends=countif(phase == "ended"),
    start_ts=minif(ts, phase == "started"), end_ts=maxif(ts, phase == "ended") by session_id, agent_id, turn_id
| where starts == 1 and ends == 1 and end_ts >= start_ts
| extend duration_seconds=end_ts - start_ts
| order by duration_seconds desc, start_ts asc, agent_id asc, turn_id asc
| take 1
| project session_id, agent_id, turn_id, duration_seconds, started=unixtime_seconds_todatetime(start_ts), ended=unixtime_seconds_todatetime(end_ts)`},subagents:{label:`All session subagents`,table:`agents`,model:`model`,key:`agent_id`,clock:`started_at`,description:`All recorded subagent IDs for this session, by start time when a time range is set. No task text.`,body:`| where isnotempty(agent_id) and agent_id != session_id
| project session_id, agent_id, model, started=unixtime_seconds_todatetime(started_at), ended=unixtime_seconds_todatetime(ended_at)
| order by started asc nulls last, agent_id asc`},sizes:{label:`Tool response sizes in bytes`,table:`tool_invocations`,tool:`tool_name`,fields:`${I.tool_invocations} output_bytes:long`,description:`Percentiles use recorded, nonnegative output byte counts, including measured zeros. Calls without measurements count as unknown.`,body:`| extend bytes=iff(output_bytes >= 0, output_bytes, long(null))
| summarize calls=count(), known=countif(isnotnull(bytes)), unknown=countif(isnull(bytes)),
    p50_bytes=percentile(bytes, 50), p95_bytes=percentile(bytes, 95), p99_bytes=percentile(bytes, 99)`},mcp:{label:`MCP tool calls`,table:`tool_invocations`,tool:`tool_name`,fields:`${I.tool_invocations} source_event_id:string agent_id:string`,description:`The latest 500 recorded invocations with MCP-style tool names (mcp prefix or server/tool). Names do not establish which servers were configured.`,body:`| where tool_name matches regex @"^mcp(__|_|\\.|:)|^[\\w.-]+/[\\w.-]+$"
| top 500 by ts desc
| project ${B}, tool_name, agent_id, source_event_id, duration_ms, is_error`},reasoning:{label:`Reported reasoning token counts`,table:`OTELTraces`,model:`Model`,fields:`StartTime:datetime SessionId:string TraceID:string SpanID:string Model:string OperationName:string ReasoningOutputTokens:long TraceAttributes:dynamic`,project:`StartTime, SessionId, TraceID, SpanID, Model, OperationName, reasoning_tokens=coalesce(ReasoningOutputTokens, tolong(TraceAttributes["gen_ai.usage.reasoning.output_tokens"]))`,description:`The latest 500 identified spans with a reported reasoning token count. Missing counts are not zero. Reads the numeric metric, not reasoning text.`,body:`| where isnotnull(reasoning_tokens) and reasoning_tokens >= 0
| top 500 by StartTime desc
| project StartTime, TraceID, SpanID, Model, OperationName, reasoning_tokens`},costMain:{label:`Highest recorded turn cost: selected session, main agent`,table:`requests`,cost:`main`,description:`Ranks direct main-agent turns by positive recorded USD, not invoice cost. Coverage includes unlinked and unpriced requests.`},costTree:{label:`Highest recorded turn cost: session and linked descendants`,table:`requests`,cost:`tree`,description:`Ranks root turns using explicit links. Coverage includes this session and requests explicitly linked back from other sessions; unlinked outside requests cannot be assigned.`},costAll:{label:`Highest recorded turn cost: all sessions`,table:`requests`,cost:`all`,description:`Ranks explicitly linked root turns across all sessions by positive recorded USD. Uses the Flow date bounds, or a seven-day window if a bound is missing.`}};function H(e,t,n){let r=n===`commands`,i=r?`, ['kind'], name, phase, agent_id, tool_call_id, exit_code`:`, phase`,a=r?`| where (['kind'] == "session_command" and phase in ("requested", "queued", "dispatched"))
    or (name in ("bash", "powershell") and (
        (['kind'] == "tool_call" and phase == "requested" and ['source'] == "assistant.message")
        or (['kind'] == "command" and phase == "started" and ['source'] == "tool.execution_start")
        or (['kind'] == "tool_result" and phase in ("completed", "failed") and ['source'] == "tool.execution_complete")))`:`| where ['kind'] == "message" and role == "${n}" and ['source'] == "${n}.message"
${n===`assistant`?`| where phase in ("", "commentary", "response", "final", "final_answer")
`:``}| where text_status in ("captured", "truncated")`;return`${r?``:`let needle = ${W(t.keyword)};\n`}let selected_steps = materialize(
${e}
${a}
| where isnotempty(step_key)
| project session_id, step_key, ts, turn_id, text_status${i});
selected_steps
| join kind=${r?`leftouter`:`inner`} (
    ${R(`session_step_text`,se,t)}
    | where step_key in (selected_steps | where text_status in ("captured", "truncated") | project step_key)
    | project session_id, step_key, _v, _deleted, text_preview=substring(trim(@"\\s+", ['text']), 0, 240)${r?``:`, matched=isempty(needle) or ['text'] contains needle`}
    | summarize arg_max(_v, *) by step_key
    | where not(coalesce(_deleted, false)) and session_id == sid and isnotempty(text_preview)${r?``:` and matched`}
    | project session_id, step_key, text_preview
) on session_id, step_key
${z}
| project ${B}, step_key, turn_id${i}, text_status, ${n===`user`?`prompt_preview=text_preview`:`text_preview`}`}var U=e=>typeof e==`string`?e:``,W=e=>JSON.stringify(U(e)).replace(/[\u007f-\u009f\u2028\u2029]/g,e=>`\\u`+e.charCodeAt(0).toString(16).padStart(4,`0`)),G=e=>typeof e==`number`?e:U(e).trim()?Number(e):NaN;function K(e,t,n){if(e==null||e===``)return``;let r=G(e);return Number.isFinite(r)?`\n| where ${n} ${t} `+(n===`StartTime`?`unixtime_seconds_todatetime(${r})`:r):`
| where false // Invalid Flow time bound`}function de({since:e,until:t}){let n=e=>Number.isFinite(G(e))?`unixtime_seconds_todatetime(${G(e)})`:`datetime(null)`,r=e!=null&&e!==``,i=t!=null&&t!==``;return r?`let window_start = ${n(e)};\nlet window_end = ${i?n(t):`window_start + 7d`};`:`let window_end = ${i?n(t):`now()`};\nlet window_start = window_end - 7d;`}function fe(e,t){let n=e===`all`;if(n&&t.includeAllSessions!==!0)return``;let r=e===`tree`,i=e===`main`,a=n?`
| where ts >= (window_start - datetime(1970-01-01)) / 1s and ts < (window_end - datetime(1970-01-01)) / 1s`:K(t.since,`>=`,`ts`)+K(t.until,`<`,`ts`),o=(n?``:i?`
| where isnotempty(sid) and session_id == sid and isempty(agent_id)`:`
| where isnotempty(sid) and (session_id == sid or dedup_key in (possible_descendants))`)+a;return`${n?de(t):`let sid = ${W(t.sessionId)};`}
let link_versions = ${R(`turn_request_links`,I.turn_request_links,t)}
| project request_key, _v, _deleted, session_id, agent_id, turn_id, root_session_id, root_turn_id, basis;
${r?`let possible_descendants = link_versions | where root_session_id == sid and isnotempty(request_key) | distinct request_key;
`:``}let request_versions = ${R(`requests`,ce,t)}
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
| order by row_type asc`}function pe({table:e,fields:t=I[e],project:n,key:r=e===`session_steps`?`step_key`:`rowid`,clock:i=e===`OTELTraces`?`StartTime`:`ts`,model:a,tool:o,body:s,cost:c,fleet:l},u){if(l)return`${de(u)}
${le(`sessions`,`session_id:string started_at:real ${P}`)}
| project node_id, session_id, started_at, _v, _deleted
| summarize arg_max(_v, *) by node_id, session_id
| where not(coalesce(_deleted, false))
| extend started=unixtime_seconds_todatetime(started_at)
| where started >= window_start and started < window_end
| summarize sessions=count(), last_session_start=max(started) by reporting_node=iff(isempty(node_id), "legacy", node_id)
| order by sessions desc, reporting_node asc`;if(c)return fe(c,u);let d=e===`OTELTraces`,f=d?`SessionId`:`session_id`,p=R(e,t,u);return p+=`\n| project ${n||L(t).join(`, `)}`,d?(p+=`\n| where isnotempty(sid) and ${f} == sid and isnotempty(TraceID) and isnotempty(SpanID)`,p+=`
| summarize arg_max(StartTime, *) by TraceID, SpanID`):(p+=`\n| summarize arg_max(_v, *) by ${r}\n| where not(coalesce(_deleted, false))`,p+=`\n| where isnotempty(sid) and ${f} == sid`),p+=K(u.since,`>=`,i)+K(u.until,`<`,i),a&&U(u.model)&&(p+=`\n| where ${a} == ${W(u.model)}`),o&&U(u.tool)&&(p+=`\n| where ${o} == ${W(u.tool)}`),`let sid = ${W(u.sessionId)};\n`+(typeof s==`function`?s(p,u):p+`
`+s)}function q(e,t){if(!/^https:\/\//i.test(U(e))||!t.trim())return null;try{let n=new URL(e);return n.username||n.password||!/^\/[^/]+$/.test(n.pathname)?null:(n.hash=``,n.search=new URLSearchParams({web:`1`,autorun:`false`,query:t}).toString(),n.href)}catch{return null}}var me=[...new Set([...Object.keys(I),`where`,`project`,`summarize`,`order by`,`top`,`extend`,`take`,`distinct`,`count`,`countif`,`sum`,`avg`,`arg_max`,`isnotempty`,`isnotnull`,`unixtime_seconds_todatetime`,...[...Object.values(I),...Object.values(ue).map(e=>e.fields).filter(Boolean),ce].flatMap(L).map(e=>e.replace(/^\['(.+)'\]$/,`$1`))])],J=e=>[...new Set(e.filter(e=>U(e).length>0))],he=e=>Array.isArray(e)?e:[],Y=10;function ge(e){let{value:t,selectionStart:n,selectionEnd:r}=e;if(n!==r)return{prefix:``,start:n,end:r};let i=t.slice(0,n).match(/[a-z_]\w*$/i)?.[0]||``,a=t.slice(r).match(/^\w+/)?.[0]||``;return{prefix:i,start:n-i.length,end:r+a.length}}function X({id:e,label:i,value:o,options:s,onChange:c,editorRef:l,hint:u,placeholder:d}){let f=a(null),p=l||f,[m,h]=n(null),[g,_]=n(-1),v=m?.prefix.toLowerCase(),y=m?s.filter(e=>e.toLowerCase().startsWith(v)).slice(0,Y):[],b=y.length>0,x=t=>`${e}-opt-${t}`,S=y[g]?x(g):void 0;t(()=>{S&&document.getElementById(S)?.scrollIntoView?.({block:`nearest`})},[S]);function C(e){h(e),_(-1)}function w(e){let t=p.current;l?(t.setRangeText(e===`kind`?`['kind']`:e,m.start,m.end,`end`),c(t.value)):c(e),C(null)}function T(e){let t=e.currentTarget;c(t.value);let n=l?ge(t):{prefix:t.value};C(!e.isComposing&&(!l||n.prefix)?n:null)}function E(e){if(!e.isComposing){if(l&&e.ctrlKey&&e.key===` `)e.preventDefault(),C(ge(e.currentTarget));else if(e.key===`Escape`&&m)e.preventDefault(),e.stopPropagation(),C(null);else if(e.key===`ArrowDown`||e.key===`ArrowUp`){if(!m&&!l&&s.length)e.preventDefault(),C({prefix:``}),_(0);else if(b){e.preventDefault();let t=y.length;_(e.key===`ArrowDown`?(g+1)%t:g<0?t-1:(g+t-1)%t)}}else e.key===`Enter`&&S?(e.preventDefault(),w(y[g])):[`Tab`,`ArrowLeft`,`ArrowRight`,`Home`,`End`].includes(e.key)&&C(null)}}let D={id:e,ref:p,value:o,placeholder:d,"aria-describedby":u,"aria-autocomplete":`list`,"aria-controls":e+`-list`,"aria-activedescendant":S,autocomplete:`off`,spellcheck:!1,onInput:T,onKeyDown:E,onBlur:()=>C(null)};return r`<div class="bd-kql-field">
    <label for=${e}>${i}</label>
    ${l?r`<textarea ...${D} rows="9" onClick=${()=>C(null)}/>`:r`<input ...${D} role="combobox" aria-expanded=${b} onFocus=${()=>C({prefix:``})}/>`}
    <ul class="bd-kql-options" id=${e+`-list`} role="listbox" aria-label=${i+` suggestions`} hidden=${!b}>
      ${y.map((e,t)=>r`<li key=${e} id=${x(t)} role="option" aria-selected=${t===g}
        onMouseDown=${e=>e.preventDefault()} onClick=${()=>w(e)}>${e}</li>`)}
    </ul>
    ${m&&!l&&!b&&r`<small role="status">${o?`No matching suggestion. Using the value you typed.`:`No observed values.`}</small>`}
  </div>`}function _e({id:e,generated:t,url:i}){let[o,s]=n(t),[c,l]=n(``),u=a(null),d=e+`-hint`,f=q(i,o),p=e=>{l(``),s(e)};async function m(){try{await navigator.clipboard.writeText(o),l(`Query copied.`)}catch{u.current.focus(),u.current.select(),l(`Query selected. Use your device’s Copy command.`)}}return r`<p id=${d}>Edit the KQL below. Type a prefix or press Ctrl+Space for tables, columns and operators.
    Changing an example or filter replaces your edits.</p>
    <${X} id=${e} label="KQL query" value=${o} options=${me} onChange=${p} editorRef=${u} hint=${d}/>
    <div class="bd-kql-actions">
      ${f&&r`<a class="bd-btn bd-p" href=${f} target="_blank" rel="noopener noreferrer">Open in Kusto</a>`}
      <button type="button" class="bd-btn" disabled=${!o.trim()} onClick=${m}>Copy query</button>
      ${o!==t&&r`<button type="button" class="bd-btn" onClick=${()=>p(t)}>Restore example</button>`}
      <span role="status">${c}</span>
    </div>
    <p>${f?`Opens in Azure Data Explorer without running the query.`:o.trim()?`No Kusto database link is available. You can still copy the query.`:`Enter a query to copy or open it.`}</p>`}var ve={nodes:`Fleet nodes`,steps:`Steps`,requests:`Requests & USD`,tools:`Tool activity`,failures:`Failed tools`,context:`Context & reset`,spans:`OTel spans`,prompts:`User prompts`,assistant:`Assistant text`,commands:`Commands`,longest:`Longest turn`,subagents:`Subagents`,sizes:`Response bytes`,mcp:`MCP calls`,reasoning:`Reasoning tok`,costMain:`Turn cost (main)`,costTree:`Turn cost (tree)`,costAll:`Turn cost (all)`};function Z({base:e,url:t,sessionId:i,nodeId:a,sessions:o,models:s,tools:c,since:l,until:u,flowFilters:d}){let[f,p]=n(`steps`),[m,h]=n(U(i)),[g,_]=n(U(a)||`legacy`),[v,y]=n(``),[b,x]=n(``),[S,C]=n(``),[w,T]=n(null),E=e+`-hint`,D=ue[f],O=D.cost===`all`,k=JSON.stringify([l,u,g]),ee=O&&w===k,A=(D.fleet||g.trim())&&pe(D,{sessionId:m,nodeId:g,model:v,tool:b,keyword:S,since:l,until:u,includeAllSessions:ee}),j=!!(d&&(d.tool_name||d.category||d.failed||d.q));return r`<div class="bd-kql-body">
    ${j&&r`<div class="bd-kql-sync">
      <span>Active Flow filters detected (${[d.category&&`category=${d.category}`,d.tool_name&&`tool=${d.tool_name}`,d.failed&&`failures only`,d.q&&`q="${d.q}"`].filter(Boolean).join(` · `)})</span>
      <button type="button" class="bd-btn bd-kql-syncbtn" onClick=${()=>{if(!d)return;let e=f;d.failed?e=`failures`:d.category===`tools`||d.tool_name?e=`tools`:d.category===`prompts`?e=`prompts`:d.category===`models`?e=`requests`:d.category===`agents`?e=`subagents`:d.category===`context`&&(e=`context`),p(e),T(null),d.tool_name&&x(d.tool_name),d.q&&(e===`prompts`||e===`assistant`)&&C(d.q)}}>Sync with Flow filters</button>
    </div>`}
    <div class="bd-kql-pills" role="group" aria-label="KQL preset shortcuts">
      ${Object.entries(ue).map(([e,t])=>r`<button type="button" key=${e}
        class=${`bd-kql-pill`+(f===e?` bd-on`:``)} title=${t.label}
        onClick=${()=>{p(e),T(null),C(``)}}>${ve[e]||e}</button>`)}
    </div>
    <label class="bd-kql-field">Example<select value=${f} onChange=${e=>{p(e.currentTarget.value),T(null),C(``)}}>
      ${Object.entries(ue).map(([e,t])=>r`<option value=${e} key=${e}>${t.label}</option>`)}
    </select></label>
    <p><code>${D.table}</code> · ${D.description}</p>
    <div class="bd-kql-filters">
      ${!D.fleet&&r`<${X} id=${e+`-node`} label="Reporting node" value=${g} options=${J([a,`legacy`])} onChange=${_} hint=${E} placeholder="Enter a node ID"/>`}
      ${O?r`<label><input type="checkbox" checked=${ee}
        onChange=${e=>T(e.currentTarget.checked?k:null)}/> Include all sessions in this date range</label>`:!D.fleet&&r`<${X} id=${e+`-sid`} label="Session ID" value=${m} options=${J([i,...he(o)])} onChange=${h} hint=${E} placeholder="Enter a session ID"/>`}
      ${D.model&&r`<${X} id=${e+`-model`} key="model" label="Model (optional)" value=${v} options=${J(he(s))} onChange=${y} hint=${E} placeholder="Any model"/>`}
      ${D.tool&&r`<${X} id=${e+`-tool`} key="tool" label="Tool name (optional)" value=${b} options=${J(he(c))} onChange=${x} hint=${E} placeholder="Any tool"/>`}
      ${D.keyword&&r`<label class="bd-kql-field">Keyword or phrase (optional)
        <input type="text" value=${S} onInput=${e=>C(e.currentTarget.value)} autocomplete="off" placeholder="Search retained text"/>
      </label>`}
    </div>
    ${!D.fleet&&!g.trim()&&r`<p>Enter a reporting node, or select Fleet nodes to compare nodes.</p>`}
    ${!m&&!O&&!D.fleet&&r`<p>Enter a session ID. An empty ID matches no rows.</p>`}
    ${D.keyword&&r`<p>The search term is included in the Kusto link. Matching text is returned only when you run the query in Kusto.</p>`}
    <p id=${E}>Type a prefix for suggestions. Use ↑ or ↓ and Enter to choose, or Esc to dismiss.
      Examples use Flow’s time range, not its event-list filters.</p>
    ${A&&r`<${_e} id=${e+`-editor`} key=${A} generated=${A} url=${t}/>`}
  </div>`}function ye({url:t,sessionId:i,nodeId:a,sessions:o,models:s,tools:c,since:l,until:u,flowFilters:d}){let[f,p]=n(!1),m=`session-kql-`+e();return r`<details class="bd-kql" onToggle=${e=>{e.currentTarget.open&&p(!0)}}>
    <summary>Query in Kusto</summary>
    ${f&&r`<${Z} key=${JSON.stringify([a,i])} ...${{base:m,url:t,sessionId:i,nodeId:a,sessions:o,models:s,tools:c,since:l,until:u,flowFilters:d}}/>`}
  </details>`}var be=`aictl-pref-session_flow_mode`;function xe(e,t){if(!t)return``;let n=JSON.stringify(String(t));return e.type===`tool_use`?`tool_invocations\n| where session_id == ${n}${e.to?` and tool_name == ${JSON.stringify(String(e.to))}`:``}${e.success===!1?` and is_error == 1`:``}\n| top 100 by ts desc\n| project event_time=unixtime_seconds_todatetime(ts), tool_name, duration_ms, is_error`:e.type===`api_call`?`requests\n| where session_id == ${n}${e.model?` and model == ${JSON.stringify(String(e.model))}`:``}\n| top 100 by ts desc\n| project event_time=unixtime_seconds_todatetime(ts), model, input_tokens, output_tokens, cost_usd`:e.type===`skill_event`?`OTELTraces\n| where SessionId == ${n} and isnotempty(ReportedSkillNames)\n| project StartTime, OperationName, Model, ToolName, ReportedSkillNames`:`session_steps\n| where session_id == ${n}\n| top 100 by ts desc\n| project event_time=unixtime_seconds_todatetime(ts), step_key, ['kind'], phase, name, agent_id, turn_id`}function Se({ev:e,sessionId:t,onClose:n}){let i=M(e),a=e.tokens||{},s=e.type===`api_call`?c(a.input||0)+` tokens in`:e.type===`api_response`?c(a.output||0)+` tokens out`:e.result_size?e.result_size+` B out`:e.prompt_length?e.prompt_length+` characters`:`n/a`,l=e.decision||(e.success===!1||e.success===`false`?`Failed`:e.success===!0||e.success===`true`?`OK`:`n/a`),u=[[`Type`,e.type===`user_message`?`User input prompt`:e.type||`n/a`],[`Time`,f(e.ts,!0)],[`Took`,e.duration_ms?o(e.duration_ms):`n/a`],[`Size`,s],[`Model`,e.model||`n/a`],[`Result`,l]];e._rt&&u.push([`Turn tokens`,c(e._rt)]),e._cum&&u.push([`Session cumulative`,c(e._cum)]),e.agent_id&&e.type!==`skill_event`&&u.push([`Subagent ID`,e.agent_id]),e.type===`skill_event`&&(u.splice(0,u.length,[`Skill`,e.name],[`Evidence`,N(e.phase)],[`Source`,e.source],[e.phase===`reported`?`First reported in range`:`Time`,f(e.ts,!0)]),e.phase===`reported`&&u.push([`Last reported in range`,f(e.last_ts,!0)],[`Distinct spans`,c(e.reported_spans)]),e.agent_id&&u.push([`Agent ID`,e.agent_id])),e.type===`user_message`&&u.push([`Source`,e.source||`n/a`],[`Text`,e.text_status||(e.redacted?`Not retained`:`Recorded`)]);let d=w(re(e)),p=w(ie(e)),m=xe(e,t),h=O[e.type]||{lane:`tool`},g=e.type===`api_call`&&e.is_error||e.type===`error`||e.type===`tool_use`&&e.success===!1?k.error:e.type===`skill_event`?`var(--warn)`:k[h.lane]||`var(--ink3)`;return r`<aside class="bd-ag-insp bd-flow-side" role="region" aria-label="Selected event">
    <div class="bd-ag-insph">
      <span class="bd-ag-lane" style=${{color:g,borderColor:g}}>${e.type===`skill_event`?`skill`:h.lane}</span>
      <b title=${i.label}>${i.label}</b>
      ${e._turnIndex>0&&r`<span class="bd-flow-turn-num">Turn #${e._turnIndex}</span>`}
      <button type="button" class="bd-btn" onClick=${n}>Close</button>
    </div>
    <dl class="bd-ag-kv">${u.map(([e,t])=>r`<div key=${e}><dt>${e}</dt><dd>${t}</dd></div>`)}</dl>
    ${d?r`<div class="bd-ag-sect">${e.type===`user_message`?`Your prompt`:`Input`}</div><pre class="bd-ag-pre">${d}</pre>`:null}
    ${p?r`<div class="bd-ag-sect">Output</div><pre class="bd-ag-pre">${p}</pre>`:null}
    ${m?r`<div class="bd-ag-sect">Correlated KQL Snippet</div><pre class="bd-ag-pre bd-insp-kql">${m}</pre>`:null}
  </aside>`}var Ce=(e,t)=>n=>m(n.clientX,n.clientY,ae(e,t)),Q=e=>e.step_key||e.event_id||e;function we({turnGroups:e,activeTurn:t,onSelectTurn:n}){if(!e||e.length<2)return null;let i=Math.max(1,...e.map(e=>e.tokens||0)),a=e.reduce((e,t)=>!e||(t.tokens||0)>(e.tokens||0)?t:e,null);return r`<div class="bd-flow-scrubber" role="region" aria-label="Session turn scrubber">
    <div class="bd-flow-scrub-meta">
      <strong>Turn Scrubber (${c(e.length)} turns)</strong>
      ${a&&a.tokens>0?r`<span>Peak: Turn #${a.turnIndex} (${c(a.tokens)} tok)</span>`:null}
      ${t==null?null:r`<button type="button" class="bd-btn bd-flow-scrub-clear" onClick=${()=>n(null)}>Turn #${t} selected ×</button>`}
    </div>
    <div class="bd-flow-scrub-track">
      ${e.map(e=>{let o=Math.max(16,Math.round((e.tokens||1)/i*100)),s=a&&e.turnIndex===a.turnIndex&&e.tokens>0,l=t===e.turnIndex,u=[`bd-flow-sbar`,s?`bd-peak`:``,e.errors>0?`bd-has-err`:``,e.skills.length>0?`bd-has-skill`:``,l?`bd-on`:``].filter(Boolean).join(` `),d=`Turn #${e.turnIndex} (${_(e.startTs)}): ${c(e.tokens)} tok`+(e.errors?` · ${e.errors} failed`:``)+(e.skills.length?` · skill: ${e.skills.join(`, `)}`:``)+(e.promptText?` — ${e.promptText.slice(0,80)}`:``);return r`<button type="button" key=${e.turnIndex} class=${u} style=${{height:o+`%`}}
          title=${d} aria-label=${`Turn ${e.turnIndex}`} aria-pressed=${l?`true`:`false`}
          onClick=${()=>n(l?null:e.turnIndex)}/>`})}
    </div>
  </div>`}function Te({events:e,sel:t,onSel:i}){let[a,l]=n({}),u=e=>l(t=>({...t,[e]:!t[e]}));return r`<div class="bd-flow-colhdr" aria-hidden="true">
    <span>Time</span>
    <span>Actor / Kind</span>
    <span>Step / Command / Target</span>
    <span class="bd-flow-colhdr-r">Tokens</span>
    <span>Turn Timeline Waterfall</span>
  </div>
  <ul class="bd-ag-tl" aria-label="Events, oldest first">${e.map((e,n)=>{let l=O[e.type]||{lane:`tool`,kind:`request`},d=e.type===`api_call`&&e.is_error||e.type===`error`||e.type===`tool_use`&&e.success===!1,f=d?k.error:e.type===`skill_event`?`var(--warn)`:k[l.lane]||`var(--ink3)`,p=M(e),m=t===Q(e),h=e._turnGroup,g=h&&a[h.turnIndex]&&!e._isTurnStart&&!m,v=e.duration_ms>0?o(e.duration_ms):``;return r`<li key=${e.step_key||e.event_id||n} hidden=${!!g}>
      ${e._isTurnStart&&h&&r`<div class="bd-flow-turn-hdr">
        <button type="button" class="bd-flow-turn-toggle" onClick=${()=>u(h.turnIndex)}
          aria-expanded=${a[h.turnIndex]?`false`:`true`}>
          <span class="bd-flow-turn-chev">${a[h.turnIndex]?`▸`:`▾`}</span>
          <span class="bd-flow-turn-num">Turn #${h.turnIndex}${h.isPartialStart?` · CONT.`:``}</span>
          <span class="bd-flow-turn-ts">${_(h.startTs)}${h.endTs>h.startTs?` → `+_(h.endTs):``}</span>
          <span class="bd-flow-turn-prompt">${h.promptText}</span>
        </button>
        <div class="bd-flow-turn-badges">
          ${h.skills.length>0&&r`<span class="bd-flow-tbadge bd-warn">★ ${h.skills.join(`, `)}</span>`}
          ${h.errors>0&&r`<span class="bd-flow-tbadge bd-crit">${h.errors} ${h.errors===1?`Failure`:`Failures`}</span>`}
          ${h.subagents>0&&r`<span class="bd-flow-tbadge">${h.subagents} ${h.subagents===1?`Subagent`:`Subagents`}</span>`}
          ${h.apiCalls>0&&r`<span class="bd-flow-tbadge">${c(h.apiCalls)} API</span>`}
          ${h.tokens>0&&r`<span class="bd-flow-tbadge bd-focus">${c(h.tokens)} tok</span>`}
          ${h.durationMs>0&&r`<span class="bd-flow-tbadge">${o(h.durationMs)}</span>`}
        </div>
      </div>`}
      <button type="button" class=${`bd-ag-tlrow`+(m?` bd-on`:``)+(d?` bd-err-row`:``)} aria-expanded=${m?`true`:`false`}
        onClick=${()=>i(m?null:Q(e))} onMouseMove=${Ce(e,f)} onMouseLeave=${s}>
        <span class="bd-ag-when">${_(e.ts)}${e._cum?r`<em>${c(e._cum)+` total`+(e._rt?`, `+c(e._rt)+` this turn`:``)}</em>`:null}</span>
        <span class="bd-ag-body-actor">
          <span class="bd-ag-dot" style=${{borderColor:f,background:l.kind===`reply`||l.kind===`marker`?f:`transparent`}}></span>
          <span class="bd-ag-lane" style=${{color:f,borderColor:f}}>${e.type===`skill_event`?`skill`:l.lane}</span>
        </span>
        <span class="bd-ag-body">
          <span class="bd-ag-body-top">
            ${e.agent_id&&r`<span class="bd-flow-subtag" title=${e.agent_id}>agent:${String(e.agent_id).slice(0,8)}</span>`}
            <span class="bd-ag-lbl">${p.label}</span>
          </span>
          ${p.meta?r`<span class="bd-ag-meta">${p.meta}</span>`:null}
        </span>
        <span class="bd-ag-size">${p.size||(e.tokens?.input?`+`+c((e.tokens.input||0)+(e.tokens.output||0))+` tok`:``)}</span>
        <span class="bd-ag-wf" aria-hidden="true">
          <span class="bd-ag-wftrack"><i class="bd-ag-wfbar" style=${{left:(e._wfOffsetPct||0)+`%`,width:(e._wfWidthPct||8)+`%`,background:f}}></i></span>
          <span class="bd-ag-wfdur">${v}</span>
        </span>
      </button>
    </li>`})}</ul>`}function Ee({events:e,participants:t,filtered:a,groupLanes:l,sel:u,onSel:d,toolLabel:f}){let[p,m]=n(!1),h=i(()=>{let t=[`main`];for(let n of e)n.agent_id&&!t.includes(n.agent_id)&&t.push(n.agent_id);return t},[e]),{lanes:g,columns:v}=i(()=>ne(e,t,a,l),[e,t,a,l]),b=g.length||1,x=e=>v.get(e)??-1,S=e=>(e+.5)/b*100;return p&&h.length>1?r`<div class="bd-ag-bar bd-flow-slmode">
      <${y} label="Swim-lane layout" value="streams" onPick=${e=>m(e===`streams`)}
        items=${[[`participants`,`Participant arrows`],[`streams`,`Session & Subagent streams`]]}/>
      <span class="bd-ag-dim">Each column is an execution stream (Main session + Subagents); models and tools render inline without wasting columns.</span>
    </div>
    <div class="bd-ag-sl bd-ag-sl-streams" role="list" aria-label="Events between participants, oldest first">
      <div class="bd-flow-stream-hdr" style=${{gridTemplateColumns:`68px repeat(${h.length}, minmax(210px, 1fr))`}}>
        <span>Time</span>
        ${h.map((e,t)=>r`<b key=${e} class="bd-flow-stream-colh">
          <i class="bd-sw" style=${{background:t===0?`var(--s1)`:`var(--s5)`,marginRight:`5px`}}/>
          ${e===`main`?`Main Session (${f||`root`})`:`Subagent ${String(e).slice(0,8)}`}
        </b>`)}
      </div>
      ${e.map((e,t)=>{let n=M(e),i=u===Q(e),a=e.type===`error`||e.is_error||e.type===`tool_use`&&e.success===!1,c=a?k.error:e.type===`skill_event`?`var(--warn)`:k[(O[e.type]||{}).lane]||`var(--ink2)`,l=e.agent_id&&h.includes(e.agent_id)?e.agent_id:`main`;return r`<div key=${e.step_key||e.event_id||t} role="listitem">
          <button type="button" class=${`bd-flow-stream-row`+(i?` bd-on`:``)}
            style=${{gridTemplateColumns:`68px repeat(${h.length}, minmax(210px, 1fr))`}}
            aria-expanded=${i?`true`:`false`} aria-label=${_(e.ts)+` `+n.label}
            onClick=${()=>d(i?null:Q(e))} onMouseMove=${Ce(e,c)} onMouseLeave=${s}>
            <span class="bd-flow-stream-ts">${_(e.ts)}</span>
            ${h.map(t=>r`<span key=${t} class="bd-flow-stream-cell">
              ${t===l?r`<span class=${`bd-flow-stream-card`+(a?` bd-err`:e.type===`skill_event`?` bd-skill`:``)}>
                <span class="bd-flow-sc-top"><strong><i class="bd-sw" style=${{background:c,marginRight:`5px`}}/>${n.label}</strong>${e.duration_ms>0?r`<em>${o(e.duration_ms)}</em>`:null}</span>
                ${n.meta?r`<span class="bd-flow-sc-meta">${n.meta}</span>`:null}
              </span>`:null}
            </span>`)}
          </button>
        </div>`})}
    </div>`:r`${h.length>1&&r`<div class="bd-ag-bar bd-flow-slmode">
    <${y} label="Swim-lane layout" value="participants" onPick=${e=>m(e===`streams`)}
      items=${[[`participants`,`Participant arrows`],[`streams`,`Session & Subagent streams (`+h.length+`)`]]}/>
  </div>`}
  <div class="bd-ag-sl" style=${{"--flow-diagram-width":158+b*96+`px`,"--flow-lane-pitch":100/b+`%`}} tabindex="0" role="list" aria-label="Events between participants, oldest first">
    <div class="bd-ag-slhead" aria-hidden="true"><span>Total</span><span>Turn</span><span>Time</span>
      <span class="bd-ag-slarea">${g.map((e,t)=>r`<b key=${e.id} style=${{left:S(t)+`%`,color:e.color,borderColor:e.color}} title=${e.label}>${e.label}</b>`)}</span>
    </div>
    ${e.map((e,t)=>{let n=x(e._from),i=x(e._to),a=M(e),o=u===Q(e),l=g[i],f=e.type===`error`||e.is_error?k.error:e.type===`user_message`?k.user:e.type===`api_response`?k.api:l?.color||`var(--ink2)`,p;if(n<0||i<0){let t=k[(O[e.type]||{}).lane]||`var(--ink3)`;p=r`<span class="bd-ag-marker" style=${{color:t,borderColor:t}}>${a.label}${a.meta?` · `+a.meta:``}</span>`}else{let e=Math.min(n,i),t=Math.max(n,i),o=i>n;p=r`<span class="bd-ag-arrow" style=${{left:S(e)+`%`,width:S(t)-S(e)+`%`,borderColor:f}}>
          <span class=${`bd-ag-head`+(o?` bd-r`:` bd-l`)} style=${{color:f}}></span>
        </span>
        <span class="bd-ag-alabel" style=${{left:(S(e)+S(t))/2+`%`,color:f}} title=${a.label}>${a.label}${a.meta?r`<em>${a.meta}</em>`:null}</span>`}return r`<div key=${e.step_key||e.event_id||t} role="listitem">
        <button type="button" class=${`bd-ag-slrow`+(o?` bd-on`:``)} aria-expanded=${o?`true`:`false`} aria-label=${_(e.ts)+` `+a.label}
          onClick=${()=>d(o?null:Q(e))} onMouseMove=${Ce(e,f)} onMouseLeave=${s}>
          <span>${e._cum?c(e._cum):``}</span><span>${e._rt?c(e._rt):``}</span><span>${_(e.ts)}</span>
          <span class="bd-ag-slarea">${p}</span>
        </button>
      </div>`})}
  </div>`}var $=e=>e?.summary?.omitted_events||0,De=e=>{let t=(e.turns||[]).length;return $(e)?`Newest `+c(t)+` of `+c(t+$(e))+` events`:c(t)+` events`},Oe=500,ke=1e3,Ae=5e3,je={q:``,category:``,tool_name:``,flow_agent:``,skill_name:``,skill_phase:``,failed:!1,range:`whole`,start:``,end:``},Me=[`prompts`,`messages`,`models`,`tools`,`skills`,`agents`,`context`,`hooks`,`lifecycle`];function Ne({apply:t,scope:i,bounds:a,initialCategory:o,activeCategory:s,activeFailed:c}){let[l,u]=n(()=>({...je,category:o})),[f,m]=n(``),h=e(),g=(e,t)=>{u(n=>({...n,[e]:t})),m(``)},_=e=>{e.preventDefault();let n=new URLSearchParams,r=[`q`,`category`,`flow_agent`,...l.category===`skills`?[`skill_name`,`skill_phase`]:[`tool_name`]];for(let e of r)l[e].trim()&&n.set(e,l[e].trim());l.failed&&l.category!==`skills`&&n.set(`failed`,`1`);let i;if(l.range===`custom`)i=d(l.start,l.end);else if(l.range!==`whole`){if(!Number.isFinite(a.end)){m(`The session end time has not been reported.`);return}i={since:a.end-Number(l.range),until:a.end}}i?.error?m(i.error):(i&&(n.set(`since`,Math.floor(i.since)),n.set(`until`,Math.ceil(i.until))),m(``),t(n.toString()))},v=e=>{e===`custom`?(m(``),u(t=>({...t,range:e,start:t.start||(Number.isFinite(a.start)?p(a.start):``),end:t.end||(Number.isFinite(a.end)?p(Math.ceil(a.end/60)*60):``)}))):g(`range`,e)},y=e=>{let n={...je,category:s===e?``:e};u(n),m(``),t(n.category?`category=`+e:``)};return r`<form class="bd-flow-filters" role="search" aria-label="Flow filters" onSubmit=${_}>
    <div class="bd-flow-quickbar">
      <button type="button" class=${`bd-btn bd-flow-qpill`+(!s&&!c?` bd-on`:``)}
        aria-pressed=${!s&&!c} onClick=${()=>{u(je),m(``),t(``)}}>All events</button>
      <button type="button" class=${`bd-btn bd-flow-qpill`+(s===`prompts`?` bd-on`:``)}
        aria-pressed=${s===`prompts`} onClick=${()=>y(`prompts`)}>User prompts</button>
      <button type="button" class=${`bd-btn bd-flow-qpill`+(s===`models`?` bd-on`:``)}
        aria-pressed=${s===`models`} onClick=${()=>y(`models`)}>Model rounds</button>
      <button type="button" class=${`bd-btn bd-flow-qpill`+(s===`tools`?` bd-on`:``)}
        aria-pressed=${s===`tools`} onClick=${()=>y(`tools`)}>Tool uses</button>
      <button type="button" class=${`bd-btn bd-flow-qpill`+(s===`agents`?` bd-on`:``)}
        aria-pressed=${s===`agents`} onClick=${()=>y(`agents`)}>Subagents</button>
      <button type="button" class=${`bd-btn bd-flow-qpill bd-flow-qskill`+(s===`skills`?` bd-on`:``)}
        aria-pressed=${s===`skills`} onClick=${()=>y(`skills`)}>Skills</button>
      <button type="button" class=${`bd-btn bd-flow-qpill bd-flow-qerr`+(c?` bd-on`:``)}
        aria-pressed=${!!c} onClick=${()=>{let e=!c,n={...je,failed:e};u(n),m(``),t(e?`failed=1`:``)}}>Failed steps</button>
      <label class="bd-flow-search"><span class="bd-flow-srchlbl">${l.category===`prompts`?`Search prompt text`:`Search events`}</span><input type="search" placeholder=${l.category===`prompts`?`Words you wrote in this session`:`Search prompt, tool, path, error...`} value=${l.q} onInput=${e=>g(`q`,e.currentTarget.value)}/></label>
    </div>
    <div class="bd-flow-filter-row">
      <label><span>Category</span><select value=${l.category} onChange=${e=>g(`category`,e.currentTarget.value)}>
        <option value="">All categories</option>${Me.map(e=>r`<option key=${e} value=${e}>${e===`prompts`?`User prompts only`:e[0].toUpperCase()+e.slice(1)}</option>`)}
      </select></label>
      ${l.category===`skills`?r`<label><span>Skill name</span><input list=${h+`-skills`} placeholder="Any skill" value=${l.skill_name} onInput=${e=>g(`skill_name`,e.currentTarget.value)}/></label>
        <datalist id=${h+`-skills`}>${i?.skills?.map(e=>r`<option value=${e} key=${e}/>`)}</datalist>
        <label><span>Skill evidence</span><select value=${l.skill_phase} onChange=${e=>g(`skill_phase`,e.currentTarget.value)}>
          <option value="">All evidence</option>${[`loaded`,`invoked`,`reported`,`resolved`].map(e=>r`<option key=${e} value=${e}>${N(e)}</option>`)}
        </select></label>`:r`<label><span>Tool name</span><input list=${h+`-tools`} placeholder="Any tool" value=${l.tool_name} onInput=${e=>g(`tool_name`,e.currentTarget.value)}/></label>`}
      <datalist id=${h+`-tools`}>${i?.tools?.map(e=>r`<option key=${e} value=${e}/>`)}</datalist>
      <label><span>Agent ID</span><input list=${h+`-agents`} placeholder="Any agent" value=${l.flow_agent} onInput=${e=>g(`flow_agent`,e.currentTarget.value)}/></label>
      <datalist id=${h+`-agents`}>${i?.agents?.map(e=>r`<option key=${e} value=${e}/>`)}</datalist>
      <label><span>Time range</span><select value=${l.range} onChange=${e=>v(e.currentTarget.value)}>
        <option value="whole">Whole session</option><option value="900" disabled=${!Number.isFinite(a.end)}>Last 15 min of session</option>
        <option value="3600" disabled=${!Number.isFinite(a.end)}>Last hour of session</option><option value="custom">Custom range</option>
      </select></label>
      ${l.range===`custom`&&r`<label><span>From (local)</span><input type="datetime-local" value=${l.start} onInput=${e=>g(`start`,e.currentTarget.value)}/></label>
        <label><span>To (local)</span><input type="datetime-local" value=${l.end} onInput=${e=>g(`end`,e.currentTarget.value)}/></label>`}
      <div class="bd-flow-actions">${l.category!==`skills`&&r`<label class="bd-ag-check"><input type="checkbox" checked=${l.failed} onChange=${e=>g(`failed`,e.currentTarget.checked)}/>Failures only</label>`}
        <button type="submit" class="bd-btn bd-p">Apply filters</button>
        <button type="button" class="bd-btn" onClick=${()=>{u(je),m(``),t(``)}}>Reset filters</button>
      </div>
    </div>
    ${f&&r`<span class="bd-ag-bad" role="alert">${f}</span>`}
  </form>`}function Pe(e){if(!e)return null;try{let t=new URL(e);return[`https:`,`http:`].includes(t.protocol)?t.href:null}catch{return null}}function Fe(e){return r`<${Ie} key=${e.a.id} ...${e}/>`}function Ie({a:e,st:s,ctx:d,act:f,flowRef:p,sid:m,captureMode:_,initialEvidence:v=!1,initialPrompts:C=!1,initialSkills:w=!1,agentData:D}){let O=b(s)?d.refreshKey:0,[k,ee]=n(500),A=C?`prompts`:w?`skills`:``,[j,ne]=n(A?`category=`+A:``),M=`limit=`+k+(j?`&`+j:``),{data:N,error:re}=T(t=>u(e.id,M,{...t,nodeScope:d.nodeScope,nodeId:d.nodeId}),JSON.stringify([`flow`,e.id,M]),d.remote?0:O),[ie,ae]=S(be,`timeline`,[`timeline`,`swimlane`]),[P,F]=S(`aictl-pref-flow-lanes`,`individual`,[`individual`,`grouped`]),[I,oe]=n(v),[se,ce]=n(v),[L,le]=n(null);t(()=>{oe(v),v&&ce(!0)},[v]);let R=I?`source`:ie,[z,B]=n(null),V=a({});!N||new URLSearchParams(j).has(`since`)||new URLSearchParams(j).has(`until`)||j&&V.current.end||(V.current={start:N.scope?.start??e.started_at,end:N.scope?.end??e.ended_at??N.turns?.at(-1)?.ts});let ue={start:V.current.start??e.started_at,end:V.current.end??e.ended_at},H=d.toolName?d.toolName(e.tool):e.tool,U=i(()=>te(N?.turns||[],H,N?.summary),[N,H]),W=i(()=>p?U.events.filter(e=>e[p.field]===p.id&&(!p.traceId||e.trace_id===p.traceId)):U.events,[U,p]),G=i(()=>L==null?W:W.filter(e=>e._turnIndex===L),[W,L]),K=i(()=>z==null?null:G.find(e=>Q(e)===z)||null,[G,z]),de=e=>{oe(e===`source`),e===`source`?ce(!0):ae(e)},fe=e=>{e!==j&&(B(null),le(null),ne(e),ee(500))},pe=Pe(N?.session_kql_url),q=N?.scope,me=m||N?.session_id,J=d.data?.agents,he=i(()=>[...new Set([me,...(J||[]).map(e=>e.native_session_id?e.native_session_id:e.placeholder||e.id?.startsWith(`live:`)||e.runtime_present&&!e.queryable?null:e.session_id||e.parent_id||e.id)].filter(Boolean))],[me,J]),Y=new URLSearchParams(j),ge=Y.has(`since`)?Number(Y.get(`since`)):null,X=Y.has(`until`)?Number(Y.get(`until`)):null,_e=m===void 0?e.native_session_id||e.session_id||N?.session_id:m,ve=j?`Summary counts all events in the selected time span.`:N&&De(N),Z=U.summary,xe=[{label:`Turns`,value:c(Z.turns),title:`Prompts in the session`},{label:`Tool calls`,value:c(Z.toolCalls)},{label:`Subagents`,value:c(Z.subagents)},{label:`Hooks`,value:c(Z.hooks)},{label:`Errors`,value:c(Z.errors)},{label:`Compactions`,value:c(Z.compactions)},{label:`Tokens, total`,value:c(Z.cumulative),title:`Input and output of every model call, added up`},{label:`Largest turn`,value:c(Z.roundTrip),title:`The most input and output tokens between two prompts`},{label:`First token`,value:Z.ttft==null?`n/a`:o(Z.ttft),sub:Z.ttftCalls?`median of `+Z.ttftCalls+` calls`:``,title:`Time to first token`}];return r`<${g} a=${e}/>
    ${N&&!N.summary?.skill_evidence&&r`<${h} key="summary" id="agfs" title="Summary" sub=${ve}><${l} stats=${xe}/></${h}>`}
    <${h} key="flow" id="agfl" title="Flow" sub=${I?`Search retained source records separately from flow events.`:$(N)&&!j?`Oldest first. The `+c($(N))+` oldest events are left out; the summary counts them.`:`Oldest first. Select an event to read it.`}>
      <div class="bd-ag-bar bd-flow-toolbar">
        <${y} label="Flow view" value=${R} onPick=${de} items=${[[`timeline`,`Timeline`],[`swimlane`,`Swim-lane`],[`source`,`Source steps`]]}/>
        ${R===`swimlane`&&r`<${y} label="Participant lanes" value=${P} onPick=${F}
          items=${[[`individual`,`Individual lanes`],[`grouped`,`Group lanes`]]}/>`}
        ${N&&!I&&r`<span class="bd-flow-status" role="status">${q&&q.matched!=null&&q.total!=null?`Showing ${G.length.toLocaleString()} · ${q.matched.toLocaleString()} matched of ${q.total.toLocaleString()} events in range`:De(N)}</span>`}
        ${N&&!I&&$(N)&&k<5e3?r`<button type="button" class="bd-btn" onClick=${()=>ee(e=>Math.min(Ae,e+ke))}>${`Show `+Math.min($(N),ke).toLocaleString(`en-US`)+` older events`}</button>`:null}
        ${N&&!I&&$(N)&&k>=5e3?r`<span class="bd-ag-dim">${c($(N))} older matching events remain outside the display limit.</span>`:null}
        ${pe&&r`<a class="bd-btn bd-flow-kusto" href=${pe} target="_blank" rel="noopener noreferrer">Open session in Kusto</a>`}
      </div>
      ${pe&&r`<${ye} url=${N.session_kql_url} sessionId=${me} nodeId=${N.node_id} sessions=${he}
        models=${q?.models?.length?q.models:e.models||[]} tools=${q?.tools||[]} since=${ge} until=${X}
        flowFilters=${Object.fromEntries(Y)}/>`}
      <div hidden=${I}>
        <${Ne} scope=${q} bounds=${ue} apply=${fe} initialCategory=${A}
          activeCategory=${Y.get(`category`)} activeFailed=${Y.get(`failed`)===`1`}/>
        ${N&&r`<${we} turnGroups=${U.turnGroups} activeTurn=${L} onSelectTurn=${le}/>`}
        ${Y.get(`category`)===`skills`&&r`<p class="bd-note">Loaded files and invocations are separate records. “Reported in context” groups OTel spans by skill; it does not count skill loads.</p>`}
        ${Y.get(`category`)===`prompts`&&r`<p class="bd-note">User input only. Select a row to read the retained prompt. Assistant replies and delegated instructions are not included.</p>`}
        ${p&&r`<div class="bd-ag-bar"><span>${p.label} ID: ${p.id}</span><button type="button" class="bd-btn" onClick=${()=>{B(null),f.setDrawerTab(`flow`)}}>Show full flow</button></div>`}
        ${N?G.length?!I&&r`<div class=${`bd-flow-workspace`+(K?` bd-has-insp`:``)}>
            <div class="bd-flow-main">
              ${ie===`swimlane`?r`<${Ee} events=${G} participants=${U.participants} filtered=${!!(j||p)} groupLanes=${P===`grouped`} sel=${z} onSel=${B} toolLabel=${H}/>`:r`<${Te} events=${G} sel=${z} onSel=${B}/>`}
            </div>
            ${K&&r`<${Se} ev=${K} sessionId=${me} onClose=${()=>B(null)}/>`}
          </div>`:r`<div class="bd-empty">${p?`No event in the loaded flow reports this source ID.`:j?`No events match these flow filters.`:`No flow data for this session: aictl has no prompt, model call or tool call of it, and no hook or OpenTelemetry event.`}</div>`:r`<${x} error=${re} what="the session flow"/>`}
      </div>
      ${se&&r`<div hidden=${!I}><${E} inline=${!0} a=${e} sid=${_e} data=${D} ctx=${d} act=${f} captureMode=${_??d.data?.capture_mode}/></div>`}
    </${h}>`}export{Oe as FLOW_EVENTS,Ae as FLOW_EVENTS_MAX,ke as FLOW_EVENTS_STEP,be as FLOW_MODE_KEY,Fe as default};
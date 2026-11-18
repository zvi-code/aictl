import{i as w,r as D,d as M,ao as Je,m as l,K as Ie,h as Ve,ap as it,T as K,N as F,S as lt,aq as xe,b as $e,ar as dt,as as Re,at as ut}from"./index-jmb9Fir-.js";import{d as ct,b as te,i as pt,u as mt,e as Ue,S as _t,F as ie,f as ue,W as bt,c as U,p as Fe}from"./Drawer-BAFtRXvC.js";import ft from"./EvidenceTab-CLlES6CW.js";import"./TextView-CiJ16wZt.js";import"./LoadedConfiguration-sug11fLh.js";const gt={user_message:()=>["user","tool"],api_call:e=>[e.from||"tool","api"],api_response:()=>["api","tool"],error:()=>["api","tool"],tool_use:e=>["tool","skill:"+(e.to||"tool")],subagent:e=>["tool","subagent:"+(e.to||"agent")],subagent_end:e=>["subagent:"+(e.from||"agent"),"tool"],hook:()=>["tool","hook"]},ce={user_message:{lane:"user",kind:"request"},api_call:{lane:"api",kind:"request"},api_response:{lane:"api",kind:"reply"},error:{lane:"error",kind:"reply"},tool_use:{lane:"tool",kind:"request"},subagent:{lane:"agent",kind:"request"},subagent_end:{lane:"agent",kind:"reply"},hook:{lane:"hook",kind:"hook"},session_start:{lane:"session",kind:"marker"},session_end:{lane:"session",kind:"marker"},compaction:{lane:"compact",kind:"marker"},context_update:{lane:"compact",kind:"marker"},session_command:{lane:"session",kind:"marker"},skill_event:{lane:"tool",kind:"marker"}},E={user:"var(--s1)",api:"var(--s2)",tool:"var(--s3)",agent:"var(--s5)",hook:"var(--s4)",session:"var(--good)",compact:"var(--warn)",error:"var(--crit)"};function $t(e){if(!e)return"";let n=e;if(typeof e=="string")try{n=JSON.parse(e)}catch{return e.slice(0,80)}if(typeof n!="object"||n===null)return String(e).slice(0,80);for(const u of["command","file_path","pattern","query","path","url","prompt","description","old_string","content","skill"])if(n[u])return String(n[u]).slice(0,100);const s=Object.keys(n);return s.length?String(n[s[0]]).slice(0,80):""}const ne=e=>((e.tokens||{}).input||0)+((e.tokens||{}).output||0);function ht(e){const n=e||[],s=[];for(let u=0;u<n.length;u++){const a=n[u],d=n[u+1];if(a&&d&&a.type==="user_message"&&d.type==="user_message"&&a.step_key&&a.step_key===d.step_key&&!!a.redacted!=!!d.redacted){const o=a.redacted?d:a,p=a.redacted?a:d;s.push({...p,...o,redacted:!1,tokens:ne(p)>=ne(o)?p.tokens:o.tokens,api_calls:p.api_calls||o.api_calls||0,duration_ms:p.duration_ms||o.duration_ms||0,wall_ms:p.wall_ms||o.wall_ms||0,end_ts:p.end_ts||o.end_ts,model:p.model||o.model||""}),u+=1}else s.push(a)}return s}function kt(e,n,s){const a=ht(e).map(t=>{const T=gt[t.type],[_,x]=T?T(t):[null,null];return{...t,_from:_,_to:x}});let d=0,o=0,p=0;const b=a.filter(t=>t.type==="user_message").length,m=(s==null?void 0:s.total_turns)||b,f=a.length>0&&a[0].type!=="user_message"&&((s==null?void 0:s.omitted_events)>0||a[0].rt_tokens>0),h=m>b&&b>0?m-b+1:1;let k=f?Math.max(1,h-1):h-1;const $=[];let g=null;if(f){const t=a[0];t._isTurnStart=!0,g={turnIndex:k,isPartialStart:!0,startTs:t.ts,endTs:t.ts,promptEv:t,promptText:"Continued from earlier in turn (load older events for prompt)",tokens:t.rt_tokens||0,cacheTokens:0,apiCalls:0,toolCalls:0,subagents:0,skills:[],errors:0,durationMs:0,events:[]},$.push(g)}for(const t of a){if(t.type==="user_message"?(o=0,k+=1,t._isTurnStart=!0,g={turnIndex:k,startTs:t.ts,endTs:t.end_ts||t.ts,promptEv:t,promptText:t.preview||t.message||(t.redacted?"Prompt (text not retained)":"Prompt"),tokens:ne(t),cacheTokens:(t.tokens||{}).cache_read||0,apiCalls:t.api_calls||0,toolCalls:0,subagents:0,skills:[],errors:0,durationMs:t.duration_ms||t.wall_ms||0,events:[t]},$.push(g)):g&&(g.events.push(t),t.ts>g.endTs&&(g.endTs=t.ts),g.isPartialStart&&g.endTs>g.startTs&&(g.durationMs=(g.endTs-g.startTs)*1e3)),t.type==="api_call"){const T=ne(t);d+=T,o+=T,p=Math.max(p,o),g&&(g.tokens=Math.max(g.tokens,t.rt_tokens??o),g.cacheTokens+=(t.tokens||{}).cache_read||0,g.apiCalls=Math.max(g.apiCalls,g.events.filter(_=>_.type==="api_call").length))}g&&(t.rt_tokens>g.tokens&&(g.tokens=t.rt_tokens),t.type==="tool_use"&&(g.toolCalls+=1),t.type==="subagent"&&(g.subagents+=1),t.type==="skill_event"&&t.name&&!g.skills.includes(t.name)&&g.skills.push(t.name),(t.type==="error"||t.is_error||t.type==="tool_use"&&t.success===!1)&&(g.errors+=1)),t._turnIndex=k,t._cum=t.cum_tokens??d,t._rt=t.rt_tokens??o}for(const t of $){const T=t.events,_=Math.max(1e3,...T.map(N=>N.duration_ms||0)),x=T.length||1;T.forEach((N,H)=>{N._turnGroup=t;const j=N.duration_ms||0,S=j>0?Math.max(6,Math.min(72,Math.round(j/_*68))):6,v=x>1?Math.min(100-S,Math.round(H/(x-1)*(92-S))):0;N._wfOffsetPct=v,N._wfWidthPct=S})}for(const t of a)t._wfWidthPct==null&&(t._wfOffsetPct=0,t._wfWidthPct=t.duration_ms>0?Math.min(80,Math.max(8,Math.round(t.duration_ms/250))):8);const r=new Map;let q=0;const C=(t,T,_)=>{r.has(t)||r.set(t,{id:t,label:T,color:_||ct(q++)})};a.length&&(C("user","User",E.user),C("tool",n||"Tool","var(--ink2)"));for(const t of a)(t.type==="api_call"||t.type==="api_response"||t.type==="error")&&C("api","Model",E.api),t.type==="tool_use"&&C(t._to,t.to||"tool"),t.type==="subagent"&&C(t._to,t.to||"Subagent"),t.type==="subagent_end"&&C(t._from,t.from||"Subagent"),t.type==="hook"&&C("hook","Hooks",E.hook);const c=t=>a.filter(T=>T.type===t).length,i=a.filter(t=>t.type==="api_call"&&t.ttft_ms>0).map(t=>t.ttft_ms).sort((t,T)=>t-T),y=i.length?i.length%2?i[(i.length-1)/2]:(i[i.length/2-1]+i[i.length/2])/2:null,O=(s==null?void 0:s.cumulative_tokens)!=null?{turns:s.total_turns,toolCalls:s.total_tool_uses,subagents:s.subagents,hooks:s.hooks,errors:s.errors,compactions:s.compactions,cumulative:s.cumulative_tokens,roundTrip:s.largest_turn_tokens,ttft:s.ttft_ms??null,ttftCalls:s.ttft_calls||0}:{turns:c("user_message"),toolCalls:a.filter(t=>t.type==="tool_use"&&t.subtype!=="result"&&t.subtype!=="decision").length,subagents:c("subagent"),hooks:c("hook"),errors:c("error")+a.filter(t=>t.type==="api_call"&&t.is_error||t.type==="tool_use"&&t.success===!1).length,compactions:c("compaction"),cumulative:d,roundTrip:p,ttft:y,ttftCalls:i.length};return{events:a,participants:[...r.values()],turnGroups:$,summary:O}}function yt(e,n,s,u=!1){const a=new Set;for(const m of e)a.add(m._from),a.add(m._to);const d=n.filter(m=>!s||a.has(m.id)),o=[],p=new Map,b=new Map;for(const m of d){const f=u&&(m.id.startsWith("skill:")?"tools":m.id.startsWith("subagent:")?"agents":null),h=f?"group:"+f:m.id;p.has(h)||(p.set(h,o.length),o.push(f?{id:h,label:f==="tools"?"Tools":"Subagents",color:E[f==="tools"?"tool":"agent"]}:m)),b.set(m.id,p.get(h))}return{lanes:o,columns:b,grouped:o.length<d.length}}function oe(e){const n=e.tokens||{};if(e.type==="user_message")return e.redacted?e.prompt_length?{label:"Prompt, text not sent ("+e.prompt_length+" characters)",meta:""}:{label:"Prompt, text not kept",meta:""}:{label:e.preview||e.message||"Prompt",meta:e.prompt_length?e.prompt_length+" characters":""};if(e.type==="api_call"){const s=[w(ne(e))+" tokens"];return e.ttft_ms>0?s.push("first token "+D(e.ttft_ms)):e.duration_ms>0&&s.push(D(e.duration_ms)),e.is_error&&s.push("failed"),{label:e.agent_name||e.model||"Model call",meta:s.join(", ")}}if(e.type==="api_response"){const s=[e.model,e.finish_reason&&e.finish_reason!=="stop"?"stopped: "+e.finish_reason:""].filter(Boolean).join(", ");return{label:"Reply"+(n.output?", "+w(n.output)+" tokens":"")+(e.response_preview?": "+te(e.response_preview,80):""),meta:s}}if(e.type==="error")return{label:"Error: "+(e.error_type||"error"),meta:te(e.error_message||"",80)};if(e.type==="tool_use"){const s=$t(e.params)||(e.target?String(e.target).slice(0,100):"");let u="";return e.subtype==="result"||!e.subtype&&typeof e.success=="boolean"?u=(e.success===!0||e.success==="true"?"OK":"Failed")+(e.duration_ms>0?", "+D(e.duration_ms):""):e.subtype==="decision"&&(u=e.decision||""),{label:(e.to||"tool")+(s?": "+s:""),meta:u,size:e.result_size?e.result_size+" B":""}}if(e.type==="subagent")return{label:"Subagent "+(e.to||""),meta:te(e.prompt||e.model||"",80)};if(e.type==="subagent_end")return{label:"Subagent "+(e.from||"")+(e.completed===!1?" stopped":" done"),meta:e.duration_ms>0?D(e.duration_ms):""};if(e.type==="hook")return{label:"Hook "+(e.hook_name||""),meta:""};if(e.type==="session_start")return{label:"Session started",meta:e.cwd||""};if(e.type==="session_end")return{label:"Session ended",meta:""};if(e.type==="skill_event")return{label:`Skill: ${e.name||"Name not reported"}`,meta:[Me(e.phase),e.phase==="reported"&&Number.isFinite(e.reported_spans)&&`${e.reported_spans} distinct spans`,e.source].filter(Boolean).join(" · ")};if(["context_update","session_command"].includes(e.type))return{label:[{context_update:"Context",session_command:"Session command"}[e.type],e.name||e.phase].filter(Boolean).join(": "),meta:[e.name&&e.phase,e.context_tokens!=null&&`${w(e.context_tokens)} context tokens`,e.source].filter(Boolean).join(" · ")};if(e.type==="compaction"){const s=e.before_tokens!=null&&e.after_tokens!=null?w(e.before_tokens)+" to "+w(e.after_tokens)+" tokens":"";return{label:"Compaction"+(e.compaction_count?" "+e.compaction_count:""),meta:[s,e.duration_ms>0?D(e.duration_ms):""].filter(Boolean).join(", ")}}return{label:e.type||"Event",meta:""}}const Me=e=>({loaded:"Loaded",invoked:"Invoked",reported:"Reported in context",resolved:"Resolved"})[e]||e||"Not reported";function wt(e){return e.type==="user_message"?e.message||e.preview||"":e.type==="api_call"?e.request_preview||e.prompt_preview||"":e.type==="tool_use"?e.params||e.input_preview||e.target||"":e.type==="subagent"?e.prompt||"":e.type==="hook"&&e.hook_input||""}function Tt(e){return e.type==="api_response"?e.response||e.response_preview||"":e.type==="api_call"&&e.is_error?e.error_message||"":e.type==="tool_use"?e.result_summary||e.result_preview||"":e.type==="error"?e.error_message||"":e.type==="hook"&&e.hook_output||""}function xt(e,n){const s=e.tokens||{},u=oe(e),a=[{c:n,label:"Time",value:new Date(e.ts*1e3).toLocaleTimeString()}];return e.model&&a.push({c:"transparent",label:"Model",value:e.model}),(s.input||s.output)&&a.push({c:"transparent",label:"Input / output",value:w(s.input||0)+" / "+w(s.output||0)}),s.cache_read&&a.push({c:"transparent",label:"Cache read",value:w(s.cache_read)}),e.duration_ms>0&&a.push({c:"transparent",label:"Took",value:D(e.duration_ms)}),e.ttft_ms>0&&a.push({c:"transparent",label:"First token",value:D(e.ttft_ms)}),u.meta&&a.push({c:"transparent",label:"Detail",value:te(u.meta,60)}),{title:te(u.label,70),rows:a}}const R="_v:datetime _deleted:bool",Y="session_id:string ts:real",W={session_steps:`step_key:string ${Y} ['kind']:string phase:string name:string turn_id:string agent_id:string context_tokens:long context_limit:long before_tokens:long after_tokens:long ${R}`,requests:`rowid:long ${Y} model:string input_tokens:long output_tokens:long cost_usd:real ${R}`,tool_invocations:`rowid:long ${Y} tool_name:string is_error:long duration_ms:real ${R}`,OTELTraces:"StartTime:datetime SessionId:string TraceID:string SpanID:string Model:string ToolName:string OperationName:string InputTokens:long OutputTokens:long",agents:`agent_id:string session_id:string model:string started_at:real ended_at:real ${R}`,turn_request_links:`request_key:string ${Y} agent_id:string turn_id:string root_session_id:string root_turn_id:string basis:string ${R}`},he=`step_key:string ${Y} ['kind']:string role:string ['source']:string phase:string turn_id:string text_status:string ${R}`,St=`step_key:string session_id:string ['text']:string ${R}`,Ye=`rowid:long dedup_key:string ${Y} agent_id:string cost_usd:real ${R}`,Ge=e=>e.split(" ").map(n=>n.split(":")[0]),pe=(e,n)=>`union isfuzzy=true (datatable(${n.split(" ").join(", ")})[]), ${e}`,Se=`| top 500 by ts desc
| order by ts asc, step_key asc`,ee="event_time=unixtime_seconds_todatetime(ts)",Ke=(e,n)=>`iff(countif(isnotnull(${e})) > 0, sum(${e}), ${n}(null))`,le={steps:{label:"Session steps timeline",table:"session_steps",description:"The latest 500 recorded steps, oldest first. No prompt or command text.",body:`${Se}
| project ${ee}, step_key, ['kind'], phase, name, agent_id, turn_id`},requests:{label:"Requests and tokens by model",table:"requests",model:"model",description:"Request counts, reported tokens and positive recorded USD. A zero or missing price is counted as unpriced, not free.",body:`| extend priced=isnotnull(cost_usd) and isfinite(cost_usd) and cost_usd > 0
| summarize request_count=count(),
    input_tokens=${Ke("input_tokens","long")},
    output_tokens=${Ke("output_tokens","long")},
    recorded_usd=iff(countif(priced) > 0, sumif(cost_usd, priced), real(null)),
    unpriced_requests=countif(not(priced))
  by model
| order by request_count desc`},tools:{label:"Tool activity and failures",table:"tool_invocations",tool:"tool_name",description:"Calls, reported failures, missing outcomes, and mean reported duration by tool name.",body:`| summarize calls=count(), failures=countif(is_error == 1),
    unknown_outcomes=countif(isnull(is_error)), mean_duration_ms=avg(duration_ms)
  by tool_name
| order by calls desc`},failures:{label:"Failed tool calls",table:"tool_invocations",tool:"tool_name",description:"The latest 500 calls explicitly marked as errors, newest first.",body:`| where is_error == 1
| top 500 by ts desc
| project ${ee}, rowid, tool_name, duration_ms`},context:{label:"Context changes, compaction and reset",table:"session_steps",description:"The latest 500 context events and related session commands, oldest first. A requested or dispatched command is not proof of a change; check its phase.",body:`| where ['kind'] == "context" or (['kind'] == "session_command" and name in ("model_change", "model", "clear", "reset", "new", "compact", "rewind"))
${Se}
| project ${ee}, ['kind'], name, phase, agent_id, turn_id,
    context_tokens, context_limit, before_tokens, after_tokens`},spans:{label:"OpenTelemetry spans",table:"OTELTraces",model:"Model",tool:"ToolName",description:"The latest 500 identified spans, newest first. Model and tool filters apply to the same span.",body:`| top 500 by StartTime desc
| project StartTime, TraceID, SpanID, OperationName, Model, ToolName, InputTokens, OutputTokens`},prompts:{label:"User input prompts",table:"session_steps",fields:he,keyword:!0,description:"Search retained user messages for a word or phrase. Shows the first 240 characters of the latest 500 matches, oldest first. Missing text is not searchable.",body:(e,n)=>ke(e,n,"user")},assistant:{label:"Public assistant text and visible commentary",table:"session_steps",fields:he,keyword:!0,description:"Search retained public assistant messages for a word or phrase. Shows the first 240 characters of the latest 500 matches, not private reasoning.",body:(e,n)=>ke(e,n,"assistant")},commands:{label:"Commands: requests, starts and results",table:"session_steps",fields:`${he} name:string tool_call_id:string agent_id:string exit_code:long`,description:"Shell requests, native starts and tool results are separate events. Session command requests and dispatches are not proof of execution. A preview is shown only when retained.",body:(e,n)=>ke(e,n,"commands")},longest:{label:"Longest completed turn",table:"session_steps",fields:`${W.session_steps} ['source']:string`,description:"Requires one native start and one end for the same session, agent and turn, both in the time range. Incomplete or ambiguous pairs are excluded.",body:`| where ['kind'] == "turn" and isnotempty(turn_id)
| where (['source'] == "assistant.turn_start" and phase == "started") or (['source'] == "assistant.turn_end" and phase == "ended")
| summarize starts=countif(phase == "started"), ends=countif(phase == "ended"),
    start_ts=minif(ts, phase == "started"), end_ts=maxif(ts, phase == "ended") by session_id, agent_id, turn_id
| where starts == 1 and ends == 1 and end_ts >= start_ts
| extend duration_seconds=end_ts - start_ts
| order by duration_seconds desc, start_ts asc, agent_id asc, turn_id asc
| take 1
| project session_id, agent_id, turn_id, duration_seconds, started=unixtime_seconds_todatetime(start_ts), ended=unixtime_seconds_todatetime(end_ts)`},subagents:{label:"All session subagents",table:"agents",model:"model",key:"agent_id",clock:"started_at",description:"All recorded subagent IDs for this session, by start time when a time range is set. No task text.",body:`| where isnotempty(agent_id) and agent_id != session_id
| project session_id, agent_id, model, started=unixtime_seconds_todatetime(started_at), ended=unixtime_seconds_todatetime(ended_at)
| order by started asc nulls last, agent_id asc`},sizes:{label:"Tool response sizes in bytes",table:"tool_invocations",tool:"tool_name",fields:`${W.tool_invocations} output_bytes:long`,description:"Percentiles use recorded, nonnegative output byte counts, including measured zeros. Calls without measurements count as unknown.",body:`| extend bytes=iff(output_bytes >= 0, output_bytes, long(null))
| summarize calls=count(), known=countif(isnotnull(bytes)), unknown=countif(isnull(bytes)),
    p50_bytes=percentile(bytes, 50), p95_bytes=percentile(bytes, 95), p99_bytes=percentile(bytes, 99)`},mcp:{label:"MCP tool calls",table:"tool_invocations",tool:"tool_name",fields:`${W.tool_invocations} source_event_id:string agent_id:string`,description:"The latest 500 recorded invocations with MCP-style tool names (mcp prefix or server/tool). Names do not establish which servers were configured.",body:`| where tool_name matches regex @"^mcp(__|_|\\.|:)|^[\\w.-]+/[\\w.-]+$"
| top 500 by ts desc
| project ${ee}, tool_name, agent_id, source_event_id, duration_ms, is_error`},reasoning:{label:"Reported reasoning token counts",table:"OTELTraces",model:"Model",fields:"StartTime:datetime SessionId:string TraceID:string SpanID:string Model:string OperationName:string ReasoningOutputTokens:long TraceAttributes:dynamic",project:'StartTime, SessionId, TraceID, SpanID, Model, OperationName, reasoning_tokens=coalesce(ReasoningOutputTokens, tolong(TraceAttributes["gen_ai.usage.reasoning.output_tokens"]))',description:"The latest 500 identified spans with a reported reasoning token count. Missing counts are not zero. Reads the numeric metric, not reasoning text.",body:`| where isnotnull(reasoning_tokens) and reasoning_tokens >= 0
| top 500 by StartTime desc
| project StartTime, TraceID, SpanID, Model, OperationName, reasoning_tokens`},costMain:{label:"Highest recorded turn cost: selected session, main agent",table:"requests",cost:"main",description:"Ranks direct main-agent turns by positive recorded USD, not invoice cost. Coverage includes unlinked and unpriced requests."},costTree:{label:"Highest recorded turn cost: session and linked descendants",table:"requests",cost:"tree",description:"Ranks root turns using explicit links. Coverage includes this session and requests explicitly linked back from other sessions; unlinked outside requests cannot be assigned."},costAll:{label:"Highest recorded turn cost: all sessions",table:"requests",cost:"all",description:"Ranks explicitly linked root turns across all sessions by positive recorded USD. Uses the Flow date bounds, or a seven-day window if a bound is missing."}};function ke(e,n,s){const u=s==="commands",a=u?", ['kind'], name, phase, agent_id, tool_call_id, exit_code":", phase",d=u?`| where (['kind'] == "session_command" and phase in ("requested", "queued", "dispatched"))
    or (name in ("bash", "powershell") and (
        (['kind'] == "tool_call" and phase == "requested" and ['source'] == "assistant.message")
        or (['kind'] == "command" and phase == "started" and ['source'] == "tool.execution_start")
        or (['kind'] == "tool_result" and phase in ("completed", "failed") and ['source'] == "tool.execution_complete")))`:`| where ['kind'] == "message" and role == "${s}" and ['source'] == "${s}.message"
${s==="assistant"?`| where phase in ("", "commentary", "response", "final", "final_answer")
`:""}| where text_status in ("captured", "truncated")`;return`${u?"":`let needle = ${se(n.keyword)};
`}let selected_steps = materialize(
${e}
${d}
| where isnotempty(step_key)
| project session_id, step_key, ts, turn_id, text_status${a});
selected_steps
| join kind=${u?"leftouter":"inner"} (
    ${pe("session_step_text",St)}
    | where step_key in (selected_steps | where text_status in ("captured", "truncated") | project step_key)
    | project session_id, step_key, _v, _deleted, text_preview=substring(trim(@"\\s+", ['text']), 0, 240)${u?"":", matched=isempty(needle) or ['text'] contains needle"}
    | summarize arg_max(_v, *) by step_key
    | where not(coalesce(_deleted, false)) and session_id == sid and isnotempty(text_preview)${u?"":" and matched"}
    | project session_id, step_key, text_preview
) on session_id, step_key
${Se}
| project ${ee}, step_key, turn_id${a}, text_status, ${s==="user"?"prompt_preview=text_preview":"text_preview"}`}const Q=e=>typeof e=="string"?e:"",se=e=>JSON.stringify(Q(e)).replace(/[\u007f-\u009f\u2028\u2029]/g,n=>"\\u"+n.charCodeAt(0).toString(16).padStart(4,"0")),qe=e=>typeof e=="number"?e:Q(e).trim()?Number(e):NaN;function me(e,n,s){if(e==null||e==="")return"";const u=qe(e);return Number.isFinite(u)?`
| where ${s} ${n} `+(s==="StartTime"?`unixtime_seconds_todatetime(${u})`:u):`
| where false // Invalid Flow time bound`}function qt({since:e,until:n}){const s=d=>Number.isFinite(qe(d))?`unixtime_seconds_todatetime(${qe(d)})`:"datetime(null)",u=e!=null&&e!=="",a=n!=null&&n!=="";return u?`let window_start = ${s(e)};
let window_end = ${a?s(n):"window_start + 7d"};`:`let window_end = ${a?s(n):"now()"};
let window_start = window_end - 7d;`}function Ct(e,n){const s=e==="all";if(s&&n.includeAllSessions!==!0)return"";const u=e==="tree",a=e==="main",d=s?`
| where ts >= (window_start - datetime(1970-01-01)) / 1s and ts < (window_end - datetime(1970-01-01)) / 1s`:me(n.since,">=","ts")+me(n.until,"<","ts"),p=(s?"":a?`
| where isnotempty(sid) and session_id == sid and isempty(agent_id)`:`
| where isnotempty(sid) and (session_id == sid or dedup_key in (possible_descendants))`)+d;return`${s?qt(n):`let sid = ${se(n.sessionId)};`}
let link_versions = ${pe("turn_request_links",W.turn_request_links)}
| project request_key, _v, _deleted, session_id, agent_id, turn_id, root_session_id, root_turn_id, basis;
${u?`let possible_descendants = link_versions | where root_session_id == sid and isnotempty(request_key) | distinct request_key;
`:""}let request_versions = ${pe("requests",Ye)}
| project rowid, _v, _deleted, ts, session_id, agent_id, dedup_key, cost_usd;
let candidate_ids = request_versions${p}
| distinct rowid;
let candidates = materialize(request_versions
| join kind=leftsemi (candidate_ids) on rowid
| summarize arg_max(_v, *) by rowid
| where not(coalesce(_deleted, false))${p}
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
${a?`| where isempty(link_agent)
`:u?`| where session_id == sid or root_session_id == sid
`:""}| join kind=leftouter (duplicate_keys) on session_id, dedup_key
| extend attributed=isnull(physical_rows) and (isempty(agent_id) or agent_id == link_agent) and ${a?"isnotempty(turn_id)":`isnotempty(root_turn_id) and ${u?"root_session_id == sid":"isnotempty(root_session_id)"}`},
    priced=isnotnull(cost_usd) and isfinite(cost_usd) and cost_usd > 0);
let coverage = facts
| summarize eligible_requests=count(), attributed_requests=countif(attributed), unpriced_requests=countif(not(priced)),
    attributed_priced_requests=countif(attributed and priced)
| extend row_type="Coverage", status=case(eligible_requests == 0, "No eligible requests", attributed_requests == 0, "No attributable turns",
    attributed_priced_requests == 0, "No positive recorded USD on attributed requests", "Ranking uses positive recorded USD only");
let winner = facts | where attributed
| summarize turn_requests=count(), turn_unpriced_requests=countif(not(priced)), recorded_usd=sumif(cost_usd, priced)
    by ${a?"session_id, turn_id":"root_session_id, root_turn_id"}
| where turn_requests > turn_unpriced_requests
| order by recorded_usd desc, ${a?"session_id asc, turn_id":"root_session_id asc, root_turn_id"} asc
| take 1
| extend row_type="Highest recorded cost";
union coverage, winner
| order by row_type asc`}function It({table:e,fields:n=W[e],project:s,key:u=e==="session_steps"?"step_key":"rowid",clock:a=e==="OTELTraces"?"StartTime":"ts",model:d,tool:o,body:p,cost:b},m){if(b)return Ct(b,m);const f=e==="OTELTraces",h=f?"SessionId":"session_id";let k=pe(e,n);return k+=`
| project ${s||Ge(n).join(", ")}`,f?(k+=`
| where isnotempty(sid) and ${h} == sid and isnotempty(TraceID) and isnotempty(SpanID)`,k+=`
| summarize arg_max(StartTime, *) by TraceID, SpanID`):(k+=`
| summarize arg_max(_v, *) by ${u}
| where not(coalesce(_deleted, false))`,k+=`
| where isnotempty(sid) and ${h} == sid`),k+=me(m.since,">=",a)+me(m.until,"<",a),d&&Q(m.model)&&(k+=`
| where ${d} == ${se(m.model)}`),o&&Q(m.tool)&&(k+=`
| where ${o} == ${se(m.tool)}`),`let sid = ${se(m.sessionId)};
`+(typeof p=="function"?p(k,m):k+`
`+p)}function Mt(e,n){if(!/^https:\/\//i.test(Q(e))||!n.trim())return null;try{const s=new URL(e);return s.username||s.password||!/^\/[^/]+$/.test(s.pathname)?null:(s.hash="",s.search=new URLSearchParams({web:"1",autorun:"false",query:n}).toString(),s.href)}catch{return null}}const Ot=[...new Set([...Object.keys(W),"where","project","summarize","order by","top","extend","take","distinct","count","countif","sum","avg","arg_max","isnotempty","isnotnull","unixtime_seconds_todatetime",...[...Object.values(W),...Object.values(le).map(e=>e.fields).filter(Boolean),Ye].flatMap(Ge).map(e=>e.replace(/^\['(.+)'\]$/,"$1"))])],ye=e=>[...new Set(e.filter(n=>Q(n).length>0))],we=e=>Array.isArray(e)?e:[],Nt=10;function Be(e){var o,p;const{value:n,selectionStart:s,selectionEnd:u}=e;if(s!==u)return{prefix:"",start:s,end:u};const a=((o=n.slice(0,s).match(/[a-z_]\w*$/i))==null?void 0:o[0])||"",d=((p=n.slice(u).match(/^\w+/))==null?void 0:p[0])||"";return{prefix:a,start:s-a.length,end:u+d.length}}function de({id:e,label:n,value:s,options:u,onChange:a,editorRef:d,hint:o,placeholder:p}){const b=Ie(null),m=d||b,[f,h]=M(null),[k,$]=M(-1),g=f==null?void 0:f.prefix.toLowerCase(),r=f?u.filter(_=>_.toLowerCase().startsWith(g)).slice(0,Nt):[],q=r.length>0,C=_=>`${e}-opt-${_}`,c=r[k]?C(k):void 0;Ve(()=>{var _,x;c&&((x=(_=document.getElementById(c))==null?void 0:_.scrollIntoView)==null||x.call(_,{block:"nearest"}))},[c]);function i(_){h(_),$(-1)}function y(_){const x=m.current;d?(x.setRangeText(_==="kind"?"['kind']":_,f.start,f.end,"end"),a(x.value)):a(_),i(null)}function O(_){const x=_.currentTarget;a(x.value);const N=d?Be(x):{prefix:x.value};i(!_.isComposing&&(!d||N.prefix)?N:null)}function t(_){if(!_.isComposing){if(d&&_.ctrlKey&&_.key===" "){_.preventDefault(),i(Be(_.currentTarget));return}if(_.key==="Escape"&&f){_.preventDefault(),_.stopPropagation(),i(null);return}if(_.key==="ArrowDown"||_.key==="ArrowUp"){if(!f&&!d&&u.length)_.preventDefault(),i({prefix:""}),$(0);else if(q){_.preventDefault();const x=r.length;$(_.key==="ArrowDown"?(k+1)%x:k<0?x-1:(k+x-1)%x)}}else _.key==="Enter"&&c?(_.preventDefault(),y(r[k])):["Tab","ArrowLeft","ArrowRight","Home","End"].includes(_.key)&&i(null)}}const T={id:e,ref:m,value:s,placeholder:p,"aria-describedby":o,"aria-autocomplete":"list","aria-controls":e+"-list","aria-activedescendant":c,autocomplete:"off",spellcheck:!1,onInput:O,onKeyDown:t,onBlur:()=>i(null)};return l`<div class="bd-kql-field">
    <label for=${e}>${n}</label>
    ${d?l`<textarea ...${T} rows="9" onClick=${()=>i(null)}/>`:l`<input ...${T} role="combobox" aria-expanded=${q} onFocus=${()=>i({prefix:""})}/>`}
    <ul class="bd-kql-options" id=${e+"-list"} role="listbox" aria-label=${n+" suggestions"} hidden=${!q}>
      ${r.map((_,x)=>l`<li key=${_} id=${C(x)} role="option" aria-selected=${x===k}
        onMouseDown=${N=>N.preventDefault()} onClick=${()=>y(_)}>${_}</li>`)}
    </ul>
    ${f&&!d&&!q&&l`<small role="status">${s?"No matching suggestion. Using the value you typed.":"No observed values."}</small>`}
  </div>`}function Et({id:e,generated:n,url:s}){const[u,a]=M(n),[d,o]=M(""),p=Ie(null),b=e+"-hint",m=Mt(s,u),f=k=>{o(""),a(k)};async function h(){try{await navigator.clipboard.writeText(u),o("Query copied.")}catch{p.current.focus(),p.current.select(),o("Query selected. Use your device’s Copy command.")}}return l`<p id=${b}>Edit the KQL below. Type a prefix or press Ctrl+Space for tables, columns and operators.
    Changing an example or filter replaces your edits.</p>
    <${de} id=${e} label="KQL query" value=${u} options=${Ot} onChange=${f} editorRef=${p} hint=${b}/>
    <div class="bd-kql-actions">
      ${m&&l`<a class="bd-btn bd-p" href=${m} target="_blank" rel="noopener noreferrer">Open in Kusto</a>`}
      <button type="button" class="bd-btn" disabled=${!u.trim()} onClick=${h}>Copy query</button>
      ${u!==n&&l`<button type="button" class="bd-btn" onClick=${()=>f(n)}>Restore example</button>`}
      <span role="status">${d}</span>
    </div>
    <p>${m?"Opens in Azure Data Explorer without running the query.":u.trim()?"No Kusto database link is available. You can still copy the query.":"Enter a query to copy or open it."}</p>`}const Lt={steps:"Steps",requests:"Requests & USD",tools:"Tool activity",failures:"Failed tools",context:"Context & reset",spans:"OTel spans",prompts:"User prompts",assistant:"Assistant text",commands:"Commands",longest:"Longest turn",subagents:"Subagents",sizes:"Response bytes",mcp:"MCP calls",reasoning:"Reasoning tok",costMain:"Turn cost (main)",costTree:"Turn cost (tree)",costAll:"Turn cost (all)"};function At({base:e,url:n,sessionId:s,sessions:u,models:a,tools:d,since:o,until:p,flowFilters:b}){const[m,f]=M("steps"),[h,k]=M(Q(s)),[$,g]=M(""),[r,q]=M(""),[C,c]=M(""),[i,y]=M(null),O=e+"-hint",t=le[m],T=t.cost==="all",_=JSON.stringify([o,p]),x=T&&i===_,N=It(t,{sessionId:h,model:$,tool:r,keyword:C,since:o,until:p,includeAllSessions:x}),H=!!(b&&(b.tool_name||b.category||b.failed||b.q)),j=()=>{if(!b)return;let S=m;b.failed?S="failures":b.category==="tools"||b.tool_name?S="tools":b.category==="prompts"?S="prompts":b.category==="models"?S="requests":b.category==="agents"?S="subagents":b.category==="context"&&(S="context"),f(S),y(null),b.tool_name&&q(b.tool_name),b.q&&(S==="prompts"||S==="assistant")&&c(b.q)};return l`<div class="bd-kql-body">
    ${H&&l`<div class="bd-kql-sync">
      <span>Active Flow filters detected (${[b.category&&`category=${b.category}`,b.tool_name&&`tool=${b.tool_name}`,b.failed&&"failures only",b.q&&`q="${b.q}"`].filter(Boolean).join(" · ")})</span>
      <button type="button" class="bd-btn bd-kql-syncbtn" onClick=${j}>Sync with Flow filters</button>
    </div>`}
    <div class="bd-kql-pills" role="group" aria-label="KQL preset shortcuts">
      ${Object.entries(le).map(([S,v])=>l`<button type="button" key=${S}
        class=${"bd-kql-pill"+(m===S?" bd-on":"")} title=${v.label}
        onClick=${()=>{f(S),y(null),c("")}}>${Lt[S]||S}</button>`)}
    </div>
    <label class="bd-kql-field">Example<select value=${m} onChange=${S=>{f(S.currentTarget.value),y(null),c("")}}>
      ${Object.entries(le).map(([S,v])=>l`<option value=${S} key=${S}>${v.label}</option>`)}
    </select></label>
    <p><code>${t.table}</code> · ${t.description}</p>
    <div class="bd-kql-filters">
      ${T?l`<label><input type="checkbox" checked=${x}
        onChange=${S=>y(S.currentTarget.checked?_:null)}/> Include all sessions in this date range</label>`:l`<${de} id=${e+"-sid"} label="Session ID" value=${h} options=${ye([s,...we(u)])} onChange=${k} hint=${O} placeholder="Enter a session ID"/>`}
      ${t.model&&l`<${de} id=${e+"-model"} key="model" label="Model (optional)" value=${$} options=${ye(we(a))} onChange=${g} hint=${O} placeholder="Any model"/>`}
      ${t.tool&&l`<${de} id=${e+"-tool"} key="tool" label="Tool name (optional)" value=${r} options=${ye(we(d))} onChange=${q} hint=${O} placeholder="Any tool"/>`}
      ${t.keyword&&l`<label class="bd-kql-field">Keyword or phrase (optional)
        <input type="text" value=${C} onInput=${S=>c(S.currentTarget.value)} autocomplete="off" placeholder="Search retained text"/>
      </label>`}
    </div>
    ${!h&&!T&&l`<p>Enter a session ID. An empty ID matches no rows.</p>`}
    ${t.keyword&&l`<p>The search term is included in the Kusto link. Matching text is returned only when you run the query in Kusto.</p>`}
    <p id=${O}>Type a prefix for suggestions. Use ↑ or ↓ and Enter to choose, or Esc to dismiss.
      Examples use Flow’s time range, not its event-list filters.</p>
    ${N&&l`<${Et} id=${e+"-editor"} key=${N} generated=${N} url=${n}/>`}
  </div>`}function Dt({url:e,sessionId:n,sessions:s,models:u,tools:a,since:d,until:o,flowFilters:p}){const[b,m]=M(!1),f="session-kql-"+Je();return l`<details class="bd-kql" onToggle=${h=>{h.currentTarget.open&&m(!0)}}>
    <summary>Query in Kusto</summary>
    ${b&&l`<${At} key=${n} ...${{base:f,url:e,sessionId:n,sessions:s,models:u,tools:a,since:d,until:o,flowFilters:p}}/>`}
  </details>`}const jt="aictl-pref-session_flow_mode";function Pt(e,n){if(!n)return"";const s=JSON.stringify(String(n));if(e.type==="tool_use"){const u=e.to?` and tool_name == ${JSON.stringify(String(e.to))}`:"",a=e.success===!1?" and is_error == 1":"";return`tool_invocations
| where session_id == ${s}${u}${a}
| top 100 by ts desc
| project event_time=unixtime_seconds_todatetime(ts), tool_name, duration_ms, is_error`}if(e.type==="api_call"){const u=e.model?` and model == ${JSON.stringify(String(e.model))}`:"";return`requests
| where session_id == ${s}${u}
| top 100 by ts desc
| project event_time=unixtime_seconds_todatetime(ts), model, input_tokens, output_tokens, cost_usd`}return e.type==="skill_event"?`OTELTraces
| where SessionId == ${s} and isnotempty(ReportedSkillNames)
| project StartTime, OperationName, Model, ToolName, ReportedSkillNames`:`session_steps
| where session_id == ${s}
| top 100 by ts desc
| project event_time=unixtime_seconds_todatetime(ts), step_key, ['kind'], phase, name, agent_id, turn_id`}function vt({ev:e,sessionId:n,onClose:s}){const u=oe(e),a=e.tokens||{},d=e.type==="api_call"?w(a.input||0)+" tokens in":e.type==="api_response"?w(a.output||0)+" tokens out":e.result_size?e.result_size+" B out":e.prompt_length?e.prompt_length+" characters":F,o=e.decision||(e.success===!1||e.success==="false"?"Failed":e.success===!0||e.success==="true"?"OK":F),p=[["Type",e.type==="user_message"?"User input prompt":e.type||F],["Time",$e(e.ts,!0)],["Took",e.duration_ms?D(e.duration_ms):F],["Size",d],["Model",e.model||F],["Result",o]];e._rt&&p.push(["Turn tokens",w(e._rt)]),e._cum&&p.push(["Session cumulative",w(e._cum)]),e.agent_id&&e.type!=="skill_event"&&p.push(["Subagent ID",e.agent_id]),e.type==="skill_event"&&(p.splice(0,p.length,["Skill",e.name],["Evidence",Me(e.phase)],["Source",e.source],[e.phase==="reported"?"First reported in range":"Time",$e(e.ts,!0)]),e.phase==="reported"&&p.push(["Last reported in range",$e(e.last_ts,!0)],["Distinct spans",w(e.reported_spans)]),e.agent_id&&p.push(["Agent ID",e.agent_id])),e.type==="user_message"&&p.push(["Source",e.source||F],["Text",e.text_status||(e.redacted?"Not retained":"Recorded")]);const b=Fe(wt(e)),m=Fe(Tt(e)),f=Pt(e,n),h=ce[e.type]||{lane:"tool"},$=e.type==="api_call"&&e.is_error||e.type==="error"||e.type==="tool_use"&&e.success===!1?E.error:e.type==="skill_event"?"var(--warn)":E[h.lane]||"var(--ink3)";return l`<aside class="bd-ag-insp bd-flow-side" role="region" aria-label="Selected event">
    <div class="bd-ag-insph">
      <span class="bd-ag-lane" style=${{color:$,borderColor:$}}>${e.type==="skill_event"?"skill":h.lane}</span>
      <b title=${u.label}>${u.label}</b>
      ${e._turnIndex>0&&l`<span class="bd-flow-turn-num">Turn #${e._turnIndex}</span>`}
      <button type="button" class="bd-btn" onClick=${s}>Close</button>
    </div>
    <dl class="bd-ag-kv">${p.map(([g,r])=>l`<div key=${g}><dt>${g}</dt><dd>${r}</dd></div>`)}</dl>
    ${b?l`<div class="bd-ag-sect">${e.type==="user_message"?"Your prompt":"Input"}</div><pre class="bd-ag-pre">${b}</pre>`:null}
    ${m?l`<div class="bd-ag-sect">Output</div><pre class="bd-ag-pre">${m}</pre>`:null}
    ${f?l`<div class="bd-ag-sect">Correlated KQL Snippet</div><pre class="bd-ag-pre bd-insp-kql">${f}</pre>`:null}
  </aside>`}const Ce=(e,n)=>s=>ut(s.clientX,s.clientY,xt(e,n)),B=e=>e.step_key||e.event_id||e;function zt({turnGroups:e,activeTurn:n,onSelectTurn:s}){if(!e||e.length<2)return null;const u=Math.max(1,...e.map(d=>d.tokens||0)),a=e.reduce((d,o)=>!d||(o.tokens||0)>(d.tokens||0)?o:d,null);return l`<div class="bd-flow-scrubber" role="region" aria-label="Session turn scrubber">
    <div class="bd-flow-scrub-meta">
      <strong>Turn Scrubber (${w(e.length)} turns)</strong>
      ${a&&a.tokens>0?l`<span>Peak: Turn #${a.turnIndex} (${w(a.tokens)} tok)</span>`:null}
      ${n!=null?l`<button type="button" class="bd-btn bd-flow-scrub-clear" onClick=${()=>s(null)}>Turn #${n} selected ×</button>`:null}
    </div>
    <div class="bd-flow-scrub-track">
      ${e.map(d=>{const o=Math.max(16,Math.round((d.tokens||1)/u*100)),p=a&&d.turnIndex===a.turnIndex&&d.tokens>0,b=n===d.turnIndex,m=["bd-flow-sbar",p?"bd-peak":"",d.errors>0?"bd-has-err":"",d.skills.length>0?"bd-has-skill":"",b?"bd-on":""].filter(Boolean).join(" "),f=`Turn #${d.turnIndex} (${U(d.startTs)}): ${w(d.tokens)} tok`+(d.errors?` · ${d.errors} failed`:"")+(d.skills.length?` · skill: ${d.skills.join(", ")}`:"")+(d.promptText?` — ${d.promptText.slice(0,80)}`:"");return l`<button type="button" key=${d.turnIndex} class=${m} style=${{height:o+"%"}}
          title=${f} aria-label=${`Turn ${d.turnIndex}`} aria-pressed=${b?"true":"false"}
          onClick=${()=>s(b?null:d.turnIndex)}/>`})}
    </div>
  </div>`}function Rt({events:e,sel:n,onSel:s}){const[u,a]=M({}),d=o=>a(p=>({...p,[o]:!p[o]}));return l`<div class="bd-flow-colhdr" aria-hidden="true">
    <span>Time</span>
    <span>Actor / Kind</span>
    <span>Step / Command / Target</span>
    <span class="bd-flow-colhdr-r">Tokens</span>
    <span>Turn Timeline Waterfall</span>
  </div>
  <ul class="bd-ag-tl" aria-label="Events, oldest first">${e.map((o,p)=>{var q;const b=ce[o.type]||{lane:"tool",kind:"request"},m=o.type==="api_call"&&o.is_error||o.type==="error"||o.type==="tool_use"&&o.success===!1,f=m?E.error:o.type==="skill_event"?"var(--warn)":E[b.lane]||"var(--ink3)",h=oe(o),k=n===B(o),$=o._turnGroup,g=$&&u[$.turnIndex]&&!o._isTurnStart&&!k,r=o.duration_ms>0?D(o.duration_ms):"";return l`<li key=${o.step_key||o.event_id||p} hidden=${!!g}>
      ${o._isTurnStart&&$&&l`<div class="bd-flow-turn-hdr">
        <button type="button" class="bd-flow-turn-toggle" onClick=${()=>d($.turnIndex)}
          aria-expanded=${u[$.turnIndex]?"false":"true"}>
          <span class="bd-flow-turn-chev">${u[$.turnIndex]?"▸":"▾"}</span>
          <span class="bd-flow-turn-num">Turn #${$.turnIndex}${$.isPartialStart?" · CONT.":""}</span>
          <span class="bd-flow-turn-ts">${U($.startTs)}${$.endTs>$.startTs?" → "+U($.endTs):""}</span>
          <span class="bd-flow-turn-prompt">${$.promptText}</span>
        </button>
        <div class="bd-flow-turn-badges">
          ${$.skills.length>0&&l`<span class="bd-flow-tbadge bd-warn">★ ${$.skills.join(", ")}</span>`}
          ${$.errors>0&&l`<span class="bd-flow-tbadge bd-crit">${$.errors} ${$.errors===1?"Failure":"Failures"}</span>`}
          ${$.subagents>0&&l`<span class="bd-flow-tbadge">${$.subagents} ${$.subagents===1?"Subagent":"Subagents"}</span>`}
          ${$.apiCalls>0&&l`<span class="bd-flow-tbadge">${w($.apiCalls)} API</span>`}
          ${$.tokens>0&&l`<span class="bd-flow-tbadge bd-focus">${w($.tokens)} tok</span>`}
          ${$.durationMs>0&&l`<span class="bd-flow-tbadge">${D($.durationMs)}</span>`}
        </div>
      </div>`}
      <button type="button" class=${"bd-ag-tlrow"+(k?" bd-on":"")+(m?" bd-err-row":"")} aria-expanded=${k?"true":"false"}
        onClick=${()=>s(k?null:B(o))} onMouseMove=${Ce(o,f)} onMouseLeave=${xe}>
        <span class="bd-ag-when">${U(o.ts)}${o._cum?l`<em>${w(o._cum)+" total"+(o._rt?", "+w(o._rt)+" this turn":"")}</em>`:null}</span>
        <span class="bd-ag-body-actor">
          <span class="bd-ag-dot" style=${{borderColor:f,background:b.kind==="reply"||b.kind==="marker"?f:"transparent"}}></span>
          <span class="bd-ag-lane" style=${{color:f,borderColor:f}}>${o.type==="skill_event"?"skill":b.lane}</span>
        </span>
        <span class="bd-ag-body">
          <span class="bd-ag-body-top">
            ${o.agent_id&&l`<span class="bd-flow-subtag" title=${o.agent_id}>agent:${String(o.agent_id).slice(0,8)}</span>`}
            <span class="bd-ag-lbl">${h.label}</span>
          </span>
          ${h.meta?l`<span class="bd-ag-meta">${h.meta}</span>`:null}
        </span>
        <span class="bd-ag-size">${h.size||((q=o.tokens)!=null&&q.input?"+"+w((o.tokens.input||0)+(o.tokens.output||0))+" tok":"")}</span>
        <span class="bd-ag-wf" aria-hidden="true">
          <span class="bd-ag-wftrack"><i class="bd-ag-wfbar" style=${{left:(o._wfOffsetPct||0)+"%",width:(o._wfWidthPct||8)+"%",background:f}}></i></span>
          <span class="bd-ag-wfdur">${r}</span>
        </span>
      </button>
    </li>`})}</ul>`}function Ut({events:e,participants:n,filtered:s,groupLanes:u,sel:a,onSel:d,toolLabel:o}){const[p,b]=M(!1),m=K(()=>{const r=["main"];for(const q of e)q.agent_id&&!r.includes(q.agent_id)&&r.push(q.agent_id);return r},[e]),{lanes:f,columns:h}=K(()=>yt(e,n,s,u),[e,n,s,u]),k=f.length||1,$=r=>h.get(r)??-1,g=r=>(r+.5)/k*100;return p&&m.length>1?l`<div class="bd-ag-bar bd-flow-slmode">
      <${ue} label="Swim-lane layout" value="streams" onPick=${r=>b(r==="streams")}
        items=${[["participants","Participant arrows"],["streams","Session & Subagent streams"]]}/>
      <span class="bd-ag-dim">Each column is an execution stream (Main session + Subagents); models and tools render inline without wasting columns.</span>
    </div>
    <div class="bd-ag-sl bd-ag-sl-streams" role="list" aria-label="Events between participants, oldest first">
      <div class="bd-flow-stream-hdr" style=${{gridTemplateColumns:`68px repeat(${m.length}, minmax(210px, 1fr))`}}>
        <span>Time</span>
        ${m.map((r,q)=>l`<b key=${r} class="bd-flow-stream-colh">
          <i class="bd-sw" style=${{background:q===0?"var(--s1)":"var(--s5)",marginRight:"5px"}}/>
          ${r==="main"?`Main Session (${o||"root"})`:`Subagent ${String(r).slice(0,8)}`}
        </b>`)}
      </div>
      ${e.map((r,q)=>{const C=oe(r),c=a===B(r),i=r.type==="error"||r.is_error||r.type==="tool_use"&&r.success===!1,y=i?E.error:r.type==="skill_event"?"var(--warn)":E[(ce[r.type]||{}).lane]||"var(--ink2)",O=r.agent_id&&m.includes(r.agent_id)?r.agent_id:"main";return l`<div key=${r.step_key||r.event_id||q} role="listitem">
          <button type="button" class=${"bd-flow-stream-row"+(c?" bd-on":"")}
            style=${{gridTemplateColumns:`68px repeat(${m.length}, minmax(210px, 1fr))`}}
            aria-expanded=${c?"true":"false"} aria-label=${U(r.ts)+" "+C.label}
            onClick=${()=>d(c?null:B(r))} onMouseMove=${Ce(r,y)} onMouseLeave=${xe}>
            <span class="bd-flow-stream-ts">${U(r.ts)}</span>
            ${m.map(t=>l`<span key=${t} class="bd-flow-stream-cell">
              ${t===O?l`<span class=${"bd-flow-stream-card"+(i?" bd-err":r.type==="skill_event"?" bd-skill":"")}>
                <span class="bd-flow-sc-top"><strong><i class="bd-sw" style=${{background:y,marginRight:"5px"}}/>${C.label}</strong>${r.duration_ms>0?l`<em>${D(r.duration_ms)}</em>`:null}</span>
                ${C.meta?l`<span class="bd-flow-sc-meta">${C.meta}</span>`:null}
              </span>`:null}
            </span>`)}
          </button>
        </div>`})}
    </div>`:l`${m.length>1&&l`<div class="bd-ag-bar bd-flow-slmode">
    <${ue} label="Swim-lane layout" value="participants" onPick=${r=>b(r==="streams")}
      items=${[["participants","Participant arrows"],["streams","Session & Subagent streams ("+m.length+")"]]}/>
  </div>`}
  <div class="bd-ag-sl" style=${{"--flow-diagram-width":158+k*96+"px","--flow-lane-pitch":100/k+"%"}} tabindex="0" role="list" aria-label="Events between participants, oldest first">
    <div class="bd-ag-slhead" aria-hidden="true"><span>Total</span><span>Turn</span><span>Time</span>
      <span class="bd-ag-slarea">${f.map((r,q)=>l`<b key=${r.id} style=${{left:g(q)+"%",color:r.color,borderColor:r.color}} title=${r.label}>${r.label}</b>`)}</span>
    </div>
    ${e.map((r,q)=>{const C=$(r._from),c=$(r._to),i=oe(r),y=a===B(r),O=f[c],t=r.type==="error"||r.is_error?E.error:r.type==="user_message"?E.user:r.type==="api_response"?E.api:(O==null?void 0:O.color)||"var(--ink2)";let T;if(C<0||c<0){const _=E[(ce[r.type]||{}).lane]||"var(--ink3)";T=l`<span class="bd-ag-marker" style=${{color:_,borderColor:_}}>${i.label}${i.meta?" · "+i.meta:""}</span>`}else{const _=Math.min(C,c),x=Math.max(C,c),N=c>C;T=l`<span class="bd-ag-arrow" style=${{left:g(_)+"%",width:g(x)-g(_)+"%",borderColor:t}}>
          <span class=${"bd-ag-head"+(N?" bd-r":" bd-l")} style=${{color:t}}></span>
        </span>
        <span class="bd-ag-alabel" style=${{left:(g(_)+g(x))/2+"%",color:t}} title=${i.label}>${i.label}${i.meta?l`<em>${i.meta}</em>`:null}</span>`}return l`<div key=${r.step_key||r.event_id||q} role="listitem">
        <button type="button" class=${"bd-ag-slrow"+(y?" bd-on":"")} aria-expanded=${y?"true":"false"} aria-label=${U(r.ts)+" "+i.label}
          onClick=${()=>d(y?null:B(r))} onMouseMove=${Ce(r,t)} onMouseLeave=${xe}>
          <span>${r._cum?w(r._cum):""}</span><span>${r._rt?w(r._rt):""}</span><span>${U(r.ts)}</span>
          <span class="bd-ag-slarea">${T}</span>
        </button>
      </div>`})}
  </div>`}const z=e=>{var n;return((n=e==null?void 0:e.summary)==null?void 0:n.omitted_events)||0},We=e=>{const n=(e.turns||[]).length;return z(e)?"Newest "+w(n)+" of "+w(n+z(e))+" events":w(n)+" events"},Qe=500,He=1e3,Te=5e3,Z={q:"",category:"",tool_name:"",flow_agent:"",skill_name:"",skill_phase:"",failed:!1,range:"whole",start:"",end:""},Ft=["prompts","messages","models","tools","skills","agents","context","hooks","lifecycle"];function Kt({apply:e,scope:n,bounds:s,initialCategory:u,activeCategory:a,activeFailed:d}){var q,C,c;const[o,p]=M(()=>({...Z,category:u})),[b,m]=M(""),f=Je(),h=(i,y)=>{p(O=>({...O,[i]:y})),m("")},k=i=>{i.preventDefault();const y=new URLSearchParams,O=["q","category","flow_agent",...o.category==="skills"?["skill_name","skill_phase"]:["tool_name"]];for(const T of O)o[T].trim()&&y.set(T,o[T].trim());o.failed&&o.category!=="skills"&&y.set("failed","1");let t;if(o.range==="custom")t=dt(o.start,o.end);else if(o.range!=="whole"){if(!Number.isFinite(s.end)){m("The session end time has not been reported.");return}t={since:s.end-Number(o.range),until:s.end}}if(t!=null&&t.error){m(t.error);return}t&&(y.set("since",Math.floor(t.since)),y.set("until",Math.ceil(t.until))),m(""),e(y.toString())},$=i=>{if(i!=="custom"){h("range",i);return}m(""),p(y=>({...y,range:i,start:y.start||(Number.isFinite(s.start)?Re(s.start):""),end:y.end||(Number.isFinite(s.end)?Re(Math.ceil(s.end/60)*60):"")}))},g=i=>{const y={...Z,category:a===i?"":i};p(y),m(""),e(y.category?"category="+i:"")},r=()=>{const i=!d,y={...Z,failed:i};p(y),m(""),e(i?"failed=1":"")};return l`<form class="bd-flow-filters" role="search" aria-label="Flow filters" onSubmit=${k}>
    <div class="bd-flow-quickbar">
      <button type="button" class=${"bd-btn bd-flow-qpill"+(!a&&!d?" bd-on":"")}
        aria-pressed=${!a&&!d} onClick=${()=>{p(Z),m(""),e("")}}>All events</button>
      <button type="button" class=${"bd-btn bd-flow-qpill"+(a==="prompts"?" bd-on":"")}
        aria-pressed=${a==="prompts"} onClick=${()=>g("prompts")}>User prompts</button>
      <button type="button" class=${"bd-btn bd-flow-qpill"+(a==="models"?" bd-on":"")}
        aria-pressed=${a==="models"} onClick=${()=>g("models")}>Model rounds</button>
      <button type="button" class=${"bd-btn bd-flow-qpill"+(a==="tools"?" bd-on":"")}
        aria-pressed=${a==="tools"} onClick=${()=>g("tools")}>Tool uses</button>
      <button type="button" class=${"bd-btn bd-flow-qpill"+(a==="agents"?" bd-on":"")}
        aria-pressed=${a==="agents"} onClick=${()=>g("agents")}>Subagents</button>
      <button type="button" class=${"bd-btn bd-flow-qpill bd-flow-qskill"+(a==="skills"?" bd-on":"")}
        aria-pressed=${a==="skills"} onClick=${()=>g("skills")}>Skills</button>
      <button type="button" class=${"bd-btn bd-flow-qpill bd-flow-qerr"+(d?" bd-on":"")}
        aria-pressed=${!!d} onClick=${r}>Failed steps</button>
      <label class="bd-flow-search"><span class="bd-flow-srchlbl">${o.category==="prompts"?"Search prompt text":"Search events"}</span><input type="search" placeholder=${o.category==="prompts"?"Words you wrote in this session":"Search prompt, tool, path, error..."} value=${o.q} onInput=${i=>h("q",i.currentTarget.value)}/></label>
    </div>
    <div class="bd-flow-filter-row">
      <label><span>Category</span><select value=${o.category} onChange=${i=>h("category",i.currentTarget.value)}>
        <option value="">All categories</option>${Ft.map(i=>l`<option key=${i} value=${i}>${i==="prompts"?"User prompts only":i[0].toUpperCase()+i.slice(1)}</option>`)}
      </select></label>
      ${o.category==="skills"?l`<label><span>Skill name</span><input list=${f+"-skills"} placeholder="Any skill" value=${o.skill_name} onInput=${i=>h("skill_name",i.currentTarget.value)}/></label>
        <datalist id=${f+"-skills"}>${(q=n==null?void 0:n.skills)==null?void 0:q.map(i=>l`<option value=${i} key=${i}/>`)}</datalist>
        <label><span>Skill evidence</span><select value=${o.skill_phase} onChange=${i=>h("skill_phase",i.currentTarget.value)}>
          <option value="">All evidence</option>${["loaded","invoked","reported","resolved"].map(i=>l`<option key=${i} value=${i}>${Me(i)}</option>`)}
        </select></label>`:l`<label><span>Tool name</span><input list=${f+"-tools"} placeholder="Any tool" value=${o.tool_name} onInput=${i=>h("tool_name",i.currentTarget.value)}/></label>`}
      <datalist id=${f+"-tools"}>${(C=n==null?void 0:n.tools)==null?void 0:C.map(i=>l`<option key=${i} value=${i}/>`)}</datalist>
      <label><span>Agent ID</span><input list=${f+"-agents"} placeholder="Any agent" value=${o.flow_agent} onInput=${i=>h("flow_agent",i.currentTarget.value)}/></label>
      <datalist id=${f+"-agents"}>${(c=n==null?void 0:n.agents)==null?void 0:c.map(i=>l`<option key=${i} value=${i}/>`)}</datalist>
      <label><span>Time range</span><select value=${o.range} onChange=${i=>$(i.currentTarget.value)}>
        <option value="whole">Whole session</option><option value="900" disabled=${!Number.isFinite(s.end)}>Last 15 min of session</option>
        <option value="3600" disabled=${!Number.isFinite(s.end)}>Last hour of session</option><option value="custom">Custom range</option>
      </select></label>
      ${o.range==="custom"&&l`<label><span>From (local)</span><input type="datetime-local" value=${o.start} onInput=${i=>h("start",i.currentTarget.value)}/></label>
        <label><span>To (local)</span><input type="datetime-local" value=${o.end} onInput=${i=>h("end",i.currentTarget.value)}/></label>`}
      <div class="bd-flow-actions">${o.category!=="skills"&&l`<label class="bd-ag-check"><input type="checkbox" checked=${o.failed} onChange=${i=>h("failed",i.currentTarget.checked)}/>Failures only</label>`}
        <button type="submit" class="bd-btn bd-p">Apply filters</button>
        <button type="button" class="bd-btn" onClick=${()=>{p(Z),m(""),e("")}}>Reset filters</button>
      </div>
    </div>
    ${b&&l`<span class="bd-ag-bad" role="alert">${b}</span>`}
  </form>`}function Bt(e){if(!e)return null;try{const n=new URL(e);return["https:","http:"].includes(n.protocol)?n.href:null}catch{return null}}function Gt(e){return l`<${Wt} key=${e.a.id} ...${e}/>`}function Wt({a:e,st:n,ctx:s,act:u,flowRef:a,sid:d,captureMode:o,initialEvidence:p=!1,initialPrompts:b=!1,initialSkills:m=!1,agentData:f}){var Ne,Ee,Le,Ae,De,je,Pe,ve;const h=pt(n)?s.refreshKey:0,[k,$]=M(Qe),g=b?"prompts":m?"skills":"",[r,q]=M(g?"category="+g:""),C="limit="+k+(r?"&"+r:""),{data:c,error:i}=mt(I=>it(e.id,C,I),JSON.stringify(["flow",e.id,C]),h),[y,O]=Ue(jt,"timeline",["timeline","swimlane"]),[t,T]=Ue("aictl-pref-flow-lanes","individual",["individual","grouped"]),[_,x]=M(p),[N,H]=M(p),[j,S]=M(null);Ve(()=>{x(p),p&&H(!0)},[p]);const v=_?"source":y,[G,X]=M(null),ae=Ie({});c&&!new URLSearchParams(r).has("since")&&!new URLSearchParams(r).has("until")&&(!r||!ae.current.end)&&(ae.current={start:((Ne=c.scope)==null?void 0:Ne.start)??e.started_at,end:((Ee=c.scope)==null?void 0:Ee.end)??e.ended_at??((Ae=(Le=c.turns)==null?void 0:Le.at(-1))==null?void 0:Ae.ts)});const Xe={start:ae.current.start??e.started_at,end:ae.current.end??e.ended_at},_e=s.toolName?s.toolName(e.tool):e.tool,J=K(()=>kt((c==null?void 0:c.turns)||[],_e,c==null?void 0:c.summary),[c,_e]),be=K(()=>a?J.events.filter(I=>I[a.field]===a.id&&(!a.traceId||I.trace_id===a.traceId)):J.events,[J,a]),V=K(()=>j!=null?be.filter(I=>I._turnIndex===j):be,[be,j]),fe=K(()=>G!=null&&V.find(I=>B(I)===G)||null,[V,G]),Ze=I=>{x(I==="source"),I==="source"?H(!0):O(I)},et=I=>{I!==r&&(X(null),S(null),q(I),$(Qe))},ge=Bt(c==null?void 0:c.session_kql_url),L=c==null?void 0:c.scope,re=d||(c==null?void 0:c.session_id),Oe=(De=s.data)==null?void 0:De.agents,tt=K(()=>[...new Set([re,...(Oe||[]).map(I=>{var ze;return I.native_session_id?I.native_session_id:I.placeholder||(ze=I.id)!=null&&ze.startsWith("live:")||I.runtime_present&&!I.queryable?null:I.session_id||I.parent_id||I.id})].filter(Boolean))],[re,Oe]),P=new URLSearchParams(r),st=P.has("since")?Number(P.get("since")):null,nt=P.has("until")?Number(P.get("until")):null,ot=d===void 0?e.native_session_id||e.session_id||(c==null?void 0:c.session_id):d,at=r?"Summary counts all events in the selected time span.":c&&We(c),A=J.summary,rt=[{label:"Turns",value:w(A.turns),title:"Prompts in the session"},{label:"Tool calls",value:w(A.toolCalls)},{label:"Subagents",value:w(A.subagents)},{label:"Hooks",value:w(A.hooks)},{label:"Errors",value:w(A.errors)},{label:"Compactions",value:w(A.compactions)},{label:"Tokens, total",value:w(A.cumulative),title:"Input and output of every model call, added up"},{label:"Largest turn",value:w(A.roundTrip),title:"The most input and output tokens between two prompts"},{label:"First token",value:A.ttft==null?F:D(A.ttft),sub:A.ttftCalls?"median of "+A.ttftCalls+" calls":"",title:"Time to first token"}];return l`<${_t} a=${e}/>
    ${c&&!((je=c.summary)!=null&&je.skill_evidence)&&l`<${ie} key="summary" id="agfs" title="Summary" sub=${at}><${lt} stats=${rt}/></${ie}>`}
    <${ie} key="flow" id="agfl" title="Flow" sub=${_?"Search retained source records separately from flow events.":z(c)&&!r?"Oldest first. The "+w(z(c))+" oldest events are left out; the summary counts them.":"Oldest first. Select an event to read it."}>
      <div class="bd-ag-bar bd-flow-toolbar">
        <${ue} label="Flow view" value=${v} onPick=${Ze} items=${[["timeline","Timeline"],["swimlane","Swim-lane"],["source","Source steps"]]}/>
        ${v==="swimlane"&&l`<${ue} label="Participant lanes" value=${t} onPick=${T}
          items=${[["individual","Individual lanes"],["grouped","Group lanes"]]}/>`}
        ${c&&!_&&l`<span class="bd-flow-status" role="status">${L&&L.matched!=null&&L.total!=null?`Showing ${V.length.toLocaleString()} · ${L.matched.toLocaleString()} matched of ${L.total.toLocaleString()} events in range`:We(c)}</span>`}
        ${c&&!_&&z(c)&&k<Te?l`<button type="button" class="bd-btn" onClick=${()=>$(I=>Math.min(Te,I+He))}>${"Show "+Math.min(z(c),He).toLocaleString("en-US")+" older events"}</button>`:null}
        ${c&&!_&&z(c)&&k>=Te?l`<span class="bd-ag-dim">${w(z(c))} older matching events remain outside the display limit.</span>`:null}
        ${ge&&l`<a class="bd-btn bd-flow-kusto" href=${ge} target="_blank" rel="noopener noreferrer">Open session in Kusto</a>`}
      </div>
      ${ge&&l`<${Dt} url=${c.session_kql_url} sessionId=${re} sessions=${tt}
        models=${(Pe=L==null?void 0:L.models)!=null&&Pe.length?L.models:e.models||[]} tools=${(L==null?void 0:L.tools)||[]} since=${st} until=${nt}
        flowFilters=${Object.fromEntries(P)}/>`}
      <div hidden=${_}>
        <${Kt} scope=${L} bounds=${Xe} apply=${et} initialCategory=${g}
          activeCategory=${P.get("category")} activeFailed=${P.get("failed")==="1"}/>
        ${c&&l`<${zt} turnGroups=${J.turnGroups} activeTurn=${j} onSelectTurn=${S}/>`}
        ${P.get("category")==="skills"&&l`<p class="bd-note">Loaded files and invocations are separate records. “Reported in context” groups OTel spans by skill; it does not count skill loads.</p>`}
        ${P.get("category")==="prompts"&&l`<p class="bd-note">User input only. Select a row to read the retained prompt. Assistant replies and delegated instructions are not included.</p>`}
        ${a&&l`<div class="bd-ag-bar"><span>${a.label} ID: ${a.id}</span><button type="button" class="bd-btn" onClick=${()=>{X(null),u.setDrawerTab("flow")}}>Show full flow</button></div>`}
        ${c?V.length?!_&&l`<div class=${"bd-flow-workspace"+(fe?" bd-has-insp":"")}>
            <div class="bd-flow-main">
              ${y==="swimlane"?l`<${Ut} events=${V} participants=${J.participants} filtered=${!!(r||a)} groupLanes=${t==="grouped"} sel=${G} onSel=${X} toolLabel=${_e}/>`:l`<${Rt} events=${V} sel=${G} onSel=${X}/>`}
            </div>
            ${fe&&l`<${vt} ev=${fe} sessionId=${re} onClose=${()=>X(null)}/>`}
          </div>`:l`<div class="bd-empty">${a?"No event in the loaded flow reports this source ID.":r?"No events match these flow filters.":"No flow data for this session: aictl has no prompt, model call or tool call of it, and no hook or OpenTelemetry event."}</div>`:l`<${bt} error=${i} what="the session flow"/>`}
      </div>
      ${N&&l`<div hidden=${!_}><${ft} inline=${!0} a=${e} sid=${ot} data=${f} act=${u} captureMode=${o??((ve=s.data)==null?void 0:ve.capture_mode)}/></div>`}
    </${ie}>`}export{Qe as FLOW_EVENTS,Te as FLOW_EVENTS_MAX,He as FLOW_EVENTS_STEP,jt as FLOW_MODE_KEY,Gt as default};

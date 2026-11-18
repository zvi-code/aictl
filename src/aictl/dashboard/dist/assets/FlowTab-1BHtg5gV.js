import{i as T,r as D,d as O,ao as We,m as i,K as qe,h as Qe,ap as ot,T as K,N as F,S as at,aq as ye,b as be,ar as rt,as as ve,at as it}from"./index-PQg-Cju5.js";import{d as lt,b as Z,i as dt,u as ct,e as ut,S as pt,F as ae,f as we,W as mt,c as U,p as ze}from"./Drawer-6rf1yv13.js";import _t from"./EvidenceTab-XQ91_2i8.js";import"./TextView-gJtw7pia.js";import"./LoadedConfiguration-CJ3ZT1Be.js";const bt={user_message:()=>["user","tool"],api_call:e=>[e.from||"tool","api"],api_response:()=>["api","tool"],error:()=>["api","tool"],tool_use:e=>["tool","skill:"+(e.to||"tool")],subagent:e=>["tool","subagent:"+(e.to||"agent")],subagent_end:e=>["subagent:"+(e.from||"agent"),"tool"],hook:()=>["tool","hook"]},le={user_message:{lane:"user",kind:"request"},api_call:{lane:"api",kind:"request"},api_response:{lane:"api",kind:"reply"},error:{lane:"error",kind:"reply"},tool_use:{lane:"tool",kind:"request"},subagent:{lane:"agent",kind:"request"},subagent_end:{lane:"agent",kind:"reply"},hook:{lane:"hook",kind:"hook"},session_start:{lane:"session",kind:"marker"},session_end:{lane:"session",kind:"marker"},compaction:{lane:"compact",kind:"marker"},context_update:{lane:"compact",kind:"marker"},session_command:{lane:"session",kind:"marker"},skill_event:{lane:"tool",kind:"marker"}},E={user:"var(--s1)",api:"var(--s2)",tool:"var(--s3)",agent:"var(--s5)",hook:"var(--s4)",session:"var(--good)",compact:"var(--warn)",error:"var(--crit)"};function ft(e){if(!e)return"";let n=e;if(typeof e=="string")try{n=JSON.parse(e)}catch{return e.slice(0,80)}if(typeof n!="object"||n===null)return String(e).slice(0,80);for(const d of["command","file_path","pattern","query","path","url","prompt","description","old_string","content","skill"])if(n[d])return String(n[d]).slice(0,100);const s=Object.keys(n);return s.length?String(n[s[0]]).slice(0,80):""}const te=e=>((e.tokens||{}).input||0)+((e.tokens||{}).output||0);function gt(e){const n=e||[],s=[];for(let d=0;d<n.length;d++){const a=n[d],c=n[d+1];if(a&&c&&a.type==="user_message"&&c.type==="user_message"&&a.step_key&&a.step_key===c.step_key&&!!a.redacted!=!!c.redacted){const o=a.redacted?c:a,u=a.redacted?a:c;s.push({...u,...o,redacted:!1,tokens:te(u)>=te(o)?u.tokens:o.tokens,api_calls:u.api_calls||o.api_calls||0,duration_ms:u.duration_ms||o.duration_ms||0,wall_ms:u.wall_ms||o.wall_ms||0,end_ts:u.end_ts||o.end_ts,model:u.model||o.model||""}),d+=1}else s.push(a)}return s}function $t(e,n,s){const a=gt(e).map(t=>{const S=bt[t.type],[f,y]=S?S(t):[null,null];return{...t,_from:f,_to:y}});let c=0,o=0,u=0;const m=a.filter(t=>t.type==="user_message").length,_=(s==null?void 0:s.total_turns)||m,g=a.length>0&&a[0].type!=="user_message"&&((s==null?void 0:s.omitted_events)>0||a[0].rt_tokens>0),h=_>m&&m>0?_-m+1:1;let k=g?Math.max(1,h-1):h-1;const $=[];let b=null;if(g){const t=a[0];t._isTurnStart=!0,b={turnIndex:k,isPartialStart:!0,startTs:t.ts,endTs:t.ts,promptEv:t,promptText:"Continued from earlier in turn (load older events for prompt)",tokens:t.rt_tokens||0,cacheTokens:0,apiCalls:0,toolCalls:0,subagents:0,skills:[],errors:0,durationMs:0,events:[]},$.push(b)}for(const t of a){if(t.type==="user_message"?(o=0,k+=1,t._isTurnStart=!0,b={turnIndex:k,startTs:t.ts,endTs:t.end_ts||t.ts,promptEv:t,promptText:t.preview||t.message||(t.redacted?"Prompt (text not retained)":"Prompt"),tokens:te(t),cacheTokens:(t.tokens||{}).cache_read||0,apiCalls:t.api_calls||0,toolCalls:0,subagents:0,skills:[],errors:0,durationMs:t.duration_ms||t.wall_ms||0,events:[t]},$.push(b)):b&&(b.events.push(t),t.ts>b.endTs&&(b.endTs=t.ts),b.isPartialStart&&b.endTs>b.startTs&&(b.durationMs=(b.endTs-b.startTs)*1e3)),t.type==="api_call"){const S=te(t);c+=S,o+=S,u=Math.max(u,o),b&&(b.tokens=Math.max(b.tokens,t.rt_tokens??o),b.cacheTokens+=(t.tokens||{}).cache_read||0,b.apiCalls=Math.max(b.apiCalls,b.events.filter(f=>f.type==="api_call").length))}b&&(t.rt_tokens>b.tokens&&(b.tokens=t.rt_tokens),t.type==="tool_use"&&(b.toolCalls+=1),t.type==="subagent"&&(b.subagents+=1),t.type==="skill_event"&&t.name&&!b.skills.includes(t.name)&&b.skills.push(t.name),(t.type==="error"||t.is_error||t.type==="tool_use"&&t.success===!1)&&(b.errors+=1)),t._turnIndex=k,t._cum=t.cum_tokens??c,t._rt=t.rt_tokens??o}for(const t of $){const S=t.events,f=Math.max(1e3,...S.map(M=>M.duration_ms||0)),y=S.length||1;S.forEach((M,v)=>{M._turnGroup=t;const H=M.duration_ms||0,x=H>0?Math.max(6,Math.min(72,Math.round(H/f*68))):6,j=y>1?Math.min(100-x,Math.round(v/(y-1)*(92-x))):0;M._wfOffsetPct=j,M._wfWidthPct=x})}for(const t of a)t._wfWidthPct==null&&(t._wfOffsetPct=0,t._wfWidthPct=t.duration_ms>0?Math.min(80,Math.max(8,Math.round(t.duration_ms/250))):8);const r=new Map;let q=0;const C=(t,S,f)=>{r.has(t)||r.set(t,{id:t,label:S,color:f||lt(q++)})};a.length&&(C("user","User",E.user),C("tool",n||"Tool","var(--ink2)"));for(const t of a)(t.type==="api_call"||t.type==="api_response"||t.type==="error")&&C("api","Model",E.api),t.type==="tool_use"&&C(t._to,t.to||"tool"),t.type==="subagent"&&C(t._to,t.to||"Subagent"),t.type==="subagent_end"&&C(t._from,t.from||"Subagent"),t.type==="hook"&&C("hook","Hooks",E.hook);const p=t=>a.filter(S=>S.type===t).length,l=a.filter(t=>t.type==="api_call"&&t.ttft_ms>0).map(t=>t.ttft_ms).sort((t,S)=>t-S),w=l.length?l.length%2?l[(l.length-1)/2]:(l[l.length/2-1]+l[l.length/2])/2:null,N=(s==null?void 0:s.cumulative_tokens)!=null?{turns:s.total_turns,toolCalls:s.total_tool_uses,subagents:s.subagents,hooks:s.hooks,errors:s.errors,compactions:s.compactions,cumulative:s.cumulative_tokens,roundTrip:s.largest_turn_tokens,ttft:s.ttft_ms??null,ttftCalls:s.ttft_calls||0}:{turns:p("user_message"),toolCalls:a.filter(t=>t.type==="tool_use"&&t.subtype!=="result"&&t.subtype!=="decision").length,subagents:p("subagent"),hooks:p("hook"),errors:p("error")+a.filter(t=>t.type==="api_call"&&t.is_error||t.type==="tool_use"&&t.success===!1).length,compactions:p("compaction"),cumulative:c,roundTrip:u,ttft:w,ttftCalls:l.length};return{events:a,participants:[...r.values()],turnGroups:$,summary:N}}function ht(e,n,s){const d=new Set;for(const _ of e)d.add(_._from),d.add(_._to);const a=n.filter(_=>!s||d.has(_.id)),c=a.length>8,o=[],u=new Map,m=new Map;for(const _ of a){const g=c&&(_.id.startsWith("skill:")?"tools":_.id.startsWith("subagent:")?"agents":null),h=g?"group:"+g:_.id;u.has(h)||(u.set(h,o.length),o.push(g?{id:h,label:g==="tools"?"Tools":"Subagents",color:E[g==="tools"?"tool":"agent"]}:_)),m.set(_.id,u.get(h))}return{lanes:o,columns:m,grouped:o.length<a.length}}function se(e){const n=e.tokens||{};if(e.type==="user_message")return e.redacted?e.prompt_length?{label:"Prompt, text not sent ("+e.prompt_length+" characters)",meta:""}:{label:"Prompt, text not kept",meta:""}:{label:e.preview||e.message||"Prompt",meta:e.prompt_length?e.prompt_length+" characters":""};if(e.type==="api_call"){const s=[T(te(e))+" tokens"];return e.ttft_ms>0?s.push("first token "+D(e.ttft_ms)):e.duration_ms>0&&s.push(D(e.duration_ms)),e.is_error&&s.push("failed"),{label:e.agent_name||e.model||"Model call",meta:s.join(", ")}}if(e.type==="api_response"){const s=[e.model,e.finish_reason&&e.finish_reason!=="stop"?"stopped: "+e.finish_reason:""].filter(Boolean).join(", ");return{label:"Reply"+(n.output?", "+T(n.output)+" tokens":"")+(e.response_preview?": "+Z(e.response_preview,80):""),meta:s}}if(e.type==="error")return{label:"Error: "+(e.error_type||"error"),meta:Z(e.error_message||"",80)};if(e.type==="tool_use"){const s=ft(e.params)||(e.target?String(e.target).slice(0,100):"");let d="";return e.subtype==="result"||!e.subtype&&typeof e.success=="boolean"?d=(e.success===!0||e.success==="true"?"OK":"Failed")+(e.duration_ms>0?", "+D(e.duration_ms):""):e.subtype==="decision"&&(d=e.decision||""),{label:(e.to||"tool")+(s?": "+s:""),meta:d,size:e.result_size?e.result_size+" B":""}}if(e.type==="subagent")return{label:"Subagent "+(e.to||""),meta:Z(e.prompt||e.model||"",80)};if(e.type==="subagent_end")return{label:"Subagent "+(e.from||"")+(e.completed===!1?" stopped":" done"),meta:e.duration_ms>0?D(e.duration_ms):""};if(e.type==="hook")return{label:"Hook "+(e.hook_name||""),meta:""};if(e.type==="session_start")return{label:"Session started",meta:e.cwd||""};if(e.type==="session_end")return{label:"Session ended",meta:""};if(e.type==="skill_event")return{label:`Skill: ${e.name||"Name not reported"}`,meta:[Ce(e.phase),e.phase==="reported"&&Number.isFinite(e.reported_spans)&&`${e.reported_spans} distinct spans`,e.source].filter(Boolean).join(" · ")};if(["context_update","session_command"].includes(e.type))return{label:[{context_update:"Context",session_command:"Session command"}[e.type],e.name||e.phase].filter(Boolean).join(": "),meta:[e.name&&e.phase,e.context_tokens!=null&&`${T(e.context_tokens)} context tokens`,e.source].filter(Boolean).join(" · ")};if(e.type==="compaction"){const s=e.before_tokens!=null&&e.after_tokens!=null?T(e.before_tokens)+" to "+T(e.after_tokens)+" tokens":"";return{label:"Compaction"+(e.compaction_count?" "+e.compaction_count:""),meta:[s,e.duration_ms>0?D(e.duration_ms):""].filter(Boolean).join(", ")}}return{label:e.type||"Event",meta:""}}const Ce=e=>({loaded:"Loaded",invoked:"Invoked",reported:"Reported in context",resolved:"Resolved"})[e]||e||"Not reported";function kt(e){return e.type==="user_message"?e.message||e.preview||"":e.type==="api_call"?e.request_preview||e.prompt_preview||"":e.type==="tool_use"?e.params||e.input_preview||e.target||"":e.type==="subagent"?e.prompt||"":e.type==="hook"&&e.hook_input||""}function yt(e){return e.type==="api_response"?e.response||e.response_preview||"":e.type==="api_call"&&e.is_error?e.error_message||"":e.type==="tool_use"?e.result_summary||e.result_preview||"":e.type==="error"?e.error_message||"":e.type==="hook"&&e.hook_output||""}function wt(e,n){const s=e.tokens||{},d=se(e),a=[{c:n,label:"Time",value:new Date(e.ts*1e3).toLocaleTimeString()}];return e.model&&a.push({c:"transparent",label:"Model",value:e.model}),(s.input||s.output)&&a.push({c:"transparent",label:"Input / output",value:T(s.input||0)+" / "+T(s.output||0)}),s.cache_read&&a.push({c:"transparent",label:"Cache read",value:T(s.cache_read)}),e.duration_ms>0&&a.push({c:"transparent",label:"Took",value:D(e.duration_ms)}),e.ttft_ms>0&&a.push({c:"transparent",label:"First token",value:D(e.ttft_ms)}),d.meta&&a.push({c:"transparent",label:"Detail",value:Z(d.meta,60)}),{title:Z(d.label,70),rows:a}}const R="_v:datetime _deleted:bool",Y="session_id:string ts:real",W={session_steps:`step_key:string ${Y} ['kind']:string phase:string name:string turn_id:string agent_id:string context_tokens:long context_limit:long before_tokens:long after_tokens:long ${R}`,requests:`rowid:long ${Y} model:string input_tokens:long output_tokens:long cost_usd:real ${R}`,tool_invocations:`rowid:long ${Y} tool_name:string is_error:long duration_ms:real ${R}`,OTELTraces:"StartTime:datetime SessionId:string TraceID:string SpanID:string Model:string ToolName:string OperationName:string InputTokens:long OutputTokens:long",agents:`agent_id:string session_id:string model:string started_at:real ended_at:real ${R}`,turn_request_links:`request_key:string ${Y} agent_id:string turn_id:string root_session_id:string root_turn_id:string basis:string ${R}`},fe=`step_key:string ${Y} ['kind']:string role:string ['source']:string phase:string turn_id:string text_status:string ${R}`,Tt=`step_key:string session_id:string ['text']:string ${R}`,He=`rowid:long dedup_key:string ${Y} agent_id:string cost_usd:real ${R}`,Je=e=>e.split(" ").map(n=>n.split(":")[0]),de=(e,n)=>`union isfuzzy=true (datatable(${n.split(" ").join(", ")})[]), ${e}`,Te=`| top 500 by ts desc
| order by ts asc, step_key asc`,X="event_time=unixtime_seconds_todatetime(ts)",Re=(e,n)=>`iff(countif(isnotnull(${e})) > 0, sum(${e}), ${n}(null))`,re={steps:{label:"Session steps timeline",table:"session_steps",description:"The latest 500 recorded steps, oldest first. No prompt or command text.",body:`${Te}
| project ${X}, step_key, ['kind'], phase, name, agent_id, turn_id`},requests:{label:"Requests and tokens by model",table:"requests",model:"model",description:"Request counts, reported tokens and positive recorded USD. A zero or missing price is counted as unpriced, not free.",body:`| extend priced=isnotnull(cost_usd) and isfinite(cost_usd) and cost_usd > 0
| summarize request_count=count(),
    input_tokens=${Re("input_tokens","long")},
    output_tokens=${Re("output_tokens","long")},
    recorded_usd=iff(countif(priced) > 0, sumif(cost_usd, priced), real(null)),
    unpriced_requests=countif(not(priced))
  by model
| order by request_count desc`},tools:{label:"Tool activity and failures",table:"tool_invocations",tool:"tool_name",description:"Calls, reported failures, missing outcomes, and mean reported duration by tool name.",body:`| summarize calls=count(), failures=countif(is_error == 1),
    unknown_outcomes=countif(isnull(is_error)), mean_duration_ms=avg(duration_ms)
  by tool_name
| order by calls desc`},failures:{label:"Failed tool calls",table:"tool_invocations",tool:"tool_name",description:"The latest 500 calls explicitly marked as errors, newest first.",body:`| where is_error == 1
| top 500 by ts desc
| project ${X}, rowid, tool_name, duration_ms`},context:{label:"Context changes, compaction and reset",table:"session_steps",description:"The latest 500 context events and related session commands, oldest first. A requested or dispatched command is not proof of a change; check its phase.",body:`| where ['kind'] == "context" or (['kind'] == "session_command" and name in ("model_change", "model", "clear", "reset", "new", "compact", "rewind"))
${Te}
| project ${X}, ['kind'], name, phase, agent_id, turn_id,
    context_tokens, context_limit, before_tokens, after_tokens`},spans:{label:"OpenTelemetry spans",table:"OTELTraces",model:"Model",tool:"ToolName",description:"The latest 500 identified spans, newest first. Model and tool filters apply to the same span.",body:`| top 500 by StartTime desc
| project StartTime, TraceID, SpanID, OperationName, Model, ToolName, InputTokens, OutputTokens`},prompts:{label:"User input prompts",table:"session_steps",fields:fe,keyword:!0,description:"Search retained user messages for a word or phrase. Shows the first 240 characters of the latest 500 matches, oldest first. Missing text is not searchable.",body:(e,n)=>ge(e,n,"user")},assistant:{label:"Public assistant text and visible commentary",table:"session_steps",fields:fe,keyword:!0,description:"Search retained public assistant messages for a word or phrase. Shows the first 240 characters of the latest 500 matches, not private reasoning.",body:(e,n)=>ge(e,n,"assistant")},commands:{label:"Commands: requests, starts and results",table:"session_steps",fields:`${fe} name:string tool_call_id:string agent_id:string exit_code:long`,description:"Shell requests, native starts and tool results are separate events. Session command requests and dispatches are not proof of execution. A preview is shown only when retained.",body:(e,n)=>ge(e,n,"commands")},longest:{label:"Longest completed turn",table:"session_steps",fields:`${W.session_steps} ['source']:string`,description:"Requires one native start and one end for the same session, agent and turn, both in the time range. Incomplete or ambiguous pairs are excluded.",body:`| where ['kind'] == "turn" and isnotempty(turn_id)
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
| project ${X}, tool_name, agent_id, source_event_id, duration_ms, is_error`},reasoning:{label:"Reported reasoning token counts",table:"OTELTraces",model:"Model",fields:"StartTime:datetime SessionId:string TraceID:string SpanID:string Model:string OperationName:string ReasoningOutputTokens:long TraceAttributes:dynamic",project:'StartTime, SessionId, TraceID, SpanID, Model, OperationName, reasoning_tokens=coalesce(ReasoningOutputTokens, tolong(TraceAttributes["gen_ai.usage.reasoning.output_tokens"]))',description:"The latest 500 identified spans with a reported reasoning token count. Missing counts are not zero. Reads the numeric metric, not reasoning text.",body:`| where isnotnull(reasoning_tokens) and reasoning_tokens >= 0
| top 500 by StartTime desc
| project StartTime, TraceID, SpanID, Model, OperationName, reasoning_tokens`},costMain:{label:"Highest recorded turn cost: selected session, main agent",table:"requests",cost:"main",description:"Ranks direct main-agent turns by positive recorded USD, not invoice cost. Coverage includes unlinked and unpriced requests."},costTree:{label:"Highest recorded turn cost: session and linked descendants",table:"requests",cost:"tree",description:"Ranks root turns using explicit links. Coverage includes this session and requests explicitly linked back from other sessions; unlinked outside requests cannot be assigned."},costAll:{label:"Highest recorded turn cost: all sessions",table:"requests",cost:"all",description:"Ranks explicitly linked root turns across all sessions by positive recorded USD. Uses the Flow date bounds, or a seven-day window if a bound is missing."}};function ge(e,n,s){const d=s==="commands",a=d?", ['kind'], name, phase, agent_id, tool_call_id, exit_code":", phase",c=d?`| where (['kind'] == "session_command" and phase in ("requested", "queued", "dispatched"))
    or (name in ("bash", "powershell") and (
        (['kind'] == "tool_call" and phase == "requested" and ['source'] == "assistant.message")
        or (['kind'] == "command" and phase == "started" and ['source'] == "tool.execution_start")
        or (['kind'] == "tool_result" and phase in ("completed", "failed") and ['source'] == "tool.execution_complete")))`:`| where ['kind'] == "message" and role == "${s}" and ['source'] == "${s}.message"
${s==="assistant"?`| where phase in ("", "commentary", "response", "final", "final_answer")
`:""}| where text_status in ("captured", "truncated")`;return`${d?"":`let needle = ${ee(n.keyword)};
`}let selected_steps = materialize(
${e}
${c}
| where isnotempty(step_key)
| project session_id, step_key, ts, turn_id, text_status${a});
selected_steps
| join kind=${d?"leftouter":"inner"} (
    ${de("session_step_text",Tt)}
    | where step_key in (selected_steps | where text_status in ("captured", "truncated") | project step_key)
    | project session_id, step_key, _v, _deleted, text_preview=substring(trim(@"\\s+", ['text']), 0, 240)${d?"":", matched=isempty(needle) or ['text'] contains needle"}
    | summarize arg_max(_v, *) by step_key
    | where not(coalesce(_deleted, false)) and session_id == sid and isnotempty(text_preview)${d?"":" and matched"}
    | project session_id, step_key, text_preview
) on session_id, step_key
${Te}
| project ${X}, step_key, turn_id${a}, text_status, ${s==="user"?"prompt_preview=text_preview":"text_preview"}`}const Q=e=>typeof e=="string"?e:"",ee=e=>JSON.stringify(Q(e)).replace(/[\u007f-\u009f\u2028\u2029]/g,n=>"\\u"+n.charCodeAt(0).toString(16).padStart(4,"0")),xe=e=>typeof e=="number"?e:Q(e).trim()?Number(e):NaN;function ce(e,n,s){if(e==null||e==="")return"";const d=xe(e);return Number.isFinite(d)?`
| where ${s} ${n} `+(s==="StartTime"?`unixtime_seconds_todatetime(${d})`:d):`
| where false // Invalid Flow time bound`}function xt({since:e,until:n}){const s=c=>Number.isFinite(xe(c))?`unixtime_seconds_todatetime(${xe(c)})`:"datetime(null)",d=e!=null&&e!=="",a=n!=null&&n!=="";return d?`let window_start = ${s(e)};
let window_end = ${a?s(n):"window_start + 7d"};`:`let window_end = ${a?s(n):"now()"};
let window_start = window_end - 7d;`}function St(e,n){const s=e==="all";if(s&&n.includeAllSessions!==!0)return"";const d=e==="tree",a=e==="main",c=s?`
| where ts >= (window_start - datetime(1970-01-01)) / 1s and ts < (window_end - datetime(1970-01-01)) / 1s`:ce(n.since,">=","ts")+ce(n.until,"<","ts"),u=(s?"":a?`
| where isnotempty(sid) and session_id == sid and isempty(agent_id)`:`
| where isnotempty(sid) and (session_id == sid or dedup_key in (possible_descendants))`)+c;return`${s?xt(n):`let sid = ${ee(n.sessionId)};`}
let link_versions = ${de("turn_request_links",W.turn_request_links)}
| project request_key, _v, _deleted, session_id, agent_id, turn_id, root_session_id, root_turn_id, basis;
${d?`let possible_descendants = link_versions | where root_session_id == sid and isnotempty(request_key) | distinct request_key;
`:""}let request_versions = ${de("requests",He)}
| project rowid, _v, _deleted, ts, session_id, agent_id, dedup_key, cost_usd;
let candidate_ids = request_versions${u}
| distinct rowid;
let candidates = materialize(request_versions
| join kind=leftsemi (candidate_ids) on rowid
| summarize arg_max(_v, *) by rowid
| where not(coalesce(_deleted, false))${u}
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
`:d?`| where session_id == sid or root_session_id == sid
`:""}| join kind=leftouter (duplicate_keys) on session_id, dedup_key
| extend attributed=isnull(physical_rows) and (isempty(agent_id) or agent_id == link_agent) and ${a?"isnotempty(turn_id)":`isnotempty(root_turn_id) and ${d?"root_session_id == sid":"isnotempty(root_session_id)"}`},
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
| order by row_type asc`}function qt({table:e,fields:n=W[e],project:s,key:d=e==="session_steps"?"step_key":"rowid",clock:a=e==="OTELTraces"?"StartTime":"ts",model:c,tool:o,body:u,cost:m},_){if(m)return St(m,_);const g=e==="OTELTraces",h=g?"SessionId":"session_id";let k=de(e,n);return k+=`
| project ${s||Je(n).join(", ")}`,g?(k+=`
| where isnotempty(sid) and ${h} == sid and isnotempty(TraceID) and isnotempty(SpanID)`,k+=`
| summarize arg_max(StartTime, *) by TraceID, SpanID`):(k+=`
| summarize arg_max(_v, *) by ${d}
| where not(coalesce(_deleted, false))`,k+=`
| where isnotempty(sid) and ${h} == sid`),k+=ce(_.since,">=",a)+ce(_.until,"<",a),c&&Q(_.model)&&(k+=`
| where ${c} == ${ee(_.model)}`),o&&Q(_.tool)&&(k+=`
| where ${o} == ${ee(_.tool)}`),`let sid = ${ee(_.sessionId)};
`+(typeof u=="function"?u(k,_):k+`
`+u)}function Ct(e,n){if(!/^https:\/\//i.test(Q(e))||!n.trim())return null;try{const s=new URL(e);return s.username||s.password||!/^\/[^/]+$/.test(s.pathname)?null:(s.hash="",s.search=new URLSearchParams({web:"1",autorun:"false",query:n}).toString(),s.href)}catch{return null}}const It=[...new Set([...Object.keys(W),"where","project","summarize","order by","top","extend","take","distinct","count","countif","sum","avg","arg_max","isnotempty","isnotnull","unixtime_seconds_todatetime",...[...Object.values(W),...Object.values(re).map(e=>e.fields).filter(Boolean),He].flatMap(Je).map(e=>e.replace(/^\['(.+)'\]$/,"$1"))])],$e=e=>[...new Set(e.filter(n=>Q(n).length>0))],he=e=>Array.isArray(e)?e:[],Mt=10;function Ue(e){var o,u;const{value:n,selectionStart:s,selectionEnd:d}=e;if(s!==d)return{prefix:"",start:s,end:d};const a=((o=n.slice(0,s).match(/[a-z_]\w*$/i))==null?void 0:o[0])||"",c=((u=n.slice(d).match(/^\w+/))==null?void 0:u[0])||"";return{prefix:a,start:s-a.length,end:d+c.length}}function ie({id:e,label:n,value:s,options:d,onChange:a,editorRef:c,hint:o,placeholder:u}){const m=qe(null),_=c||m,[g,h]=O(null),[k,$]=O(-1),b=g==null?void 0:g.prefix.toLowerCase(),r=g?d.filter(f=>f.toLowerCase().startsWith(b)).slice(0,Mt):[],q=r.length>0,C=f=>`${e}-opt-${f}`,p=r[k]?C(k):void 0;Qe(()=>{var f,y;p&&((y=(f=document.getElementById(p))==null?void 0:f.scrollIntoView)==null||y.call(f,{block:"nearest"}))},[p]);function l(f){h(f),$(-1)}function w(f){const y=_.current;c?(y.setRangeText(f==="kind"?"['kind']":f,g.start,g.end,"end"),a(y.value)):a(f),l(null)}function N(f){const y=f.currentTarget;a(y.value);const M=c?Ue(y):{prefix:y.value};l(!f.isComposing&&(!c||M.prefix)?M:null)}function t(f){if(!f.isComposing){if(c&&f.ctrlKey&&f.key===" "){f.preventDefault(),l(Ue(f.currentTarget));return}if(f.key==="Escape"&&g){f.preventDefault(),f.stopPropagation(),l(null);return}if(f.key==="ArrowDown"||f.key==="ArrowUp"){if(!g&&!c&&d.length)f.preventDefault(),l({prefix:""}),$(0);else if(q){f.preventDefault();const y=r.length;$(f.key==="ArrowDown"?(k+1)%y:k<0?y-1:(k+y-1)%y)}}else f.key==="Enter"&&p?(f.preventDefault(),w(r[k])):["Tab","ArrowLeft","ArrowRight","Home","End"].includes(f.key)&&l(null)}}const S={id:e,ref:_,value:s,placeholder:u,"aria-describedby":o,"aria-autocomplete":"list","aria-controls":e+"-list","aria-activedescendant":p,autocomplete:"off",spellcheck:!1,onInput:N,onKeyDown:t,onBlur:()=>l(null)};return i`<div class="bd-kql-field">
    <label for=${e}>${n}</label>
    ${c?i`<textarea ...${S} rows="9" onClick=${()=>l(null)}/>`:i`<input ...${S} role="combobox" aria-expanded=${q} onFocus=${()=>l({prefix:""})}/>`}
    <ul class="bd-kql-options" id=${e+"-list"} role="listbox" aria-label=${n+" suggestions"} hidden=${!q}>
      ${r.map((f,y)=>i`<li key=${f} id=${C(y)} role="option" aria-selected=${y===k}
        onMouseDown=${M=>M.preventDefault()} onClick=${()=>w(f)}>${f}</li>`)}
    </ul>
    ${g&&!c&&!q&&i`<small role="status">${s?"No matching suggestion. Using the value you typed.":"No observed values."}</small>`}
  </div>`}function Ot({id:e,generated:n,url:s}){const[d,a]=O(n),[c,o]=O(""),u=qe(null),m=e+"-hint",_=Ct(s,d),g=k=>{o(""),a(k)};async function h(){try{await navigator.clipboard.writeText(d),o("Query copied.")}catch{u.current.focus(),u.current.select(),o("Query selected. Use your device’s Copy command.")}}return i`<p id=${m}>Edit the KQL below. Type a prefix or press Ctrl+Space for tables, columns and operators.
    Changing an example or filter replaces your edits.</p>
    <${ie} id=${e} label="KQL query" value=${d} options=${It} onChange=${g} editorRef=${u} hint=${m}/>
    <div class="bd-kql-actions">
      ${_&&i`<a class="bd-btn bd-p" href=${_} target="_blank" rel="noopener noreferrer">Open in Kusto</a>`}
      <button type="button" class="bd-btn" disabled=${!d.trim()} onClick=${h}>Copy query</button>
      ${d!==n&&i`<button type="button" class="bd-btn" onClick=${()=>g(n)}>Restore example</button>`}
      <span role="status">${c}</span>
    </div>
    <p>${_?"Opens in Azure Data Explorer without running the query.":d.trim()?"No Kusto database link is available. You can still copy the query.":"Enter a query to copy or open it."}</p>`}const Nt={steps:"Steps",requests:"Requests & USD",tools:"Tool activity",failures:"Failed tools",context:"Context & reset",spans:"OTel spans",prompts:"User prompts",assistant:"Assistant text",commands:"Commands",longest:"Longest turn",subagents:"Subagents",sizes:"Response bytes",mcp:"MCP calls",reasoning:"Reasoning tok",costMain:"Turn cost (main)",costTree:"Turn cost (tree)",costAll:"Turn cost (all)"};function Et({base:e,url:n,sessionId:s,sessions:d,models:a,tools:c,since:o,until:u,flowFilters:m}){const[_,g]=O("steps"),[h,k]=O(Q(s)),[$,b]=O(""),[r,q]=O(""),[C,p]=O(""),[l,w]=O(null),N=e+"-hint",t=re[_],S=t.cost==="all",f=JSON.stringify([o,u]),y=S&&l===f,M=qt(t,{sessionId:h,model:$,tool:r,keyword:C,since:o,until:u,includeAllSessions:y}),v=!!(m&&(m.tool_name||m.category||m.failed||m.q)),H=()=>{if(!m)return;let x=_;m.failed?x="failures":m.category==="tools"||m.tool_name?x="tools":m.category==="prompts"?x="prompts":m.category==="models"?x="requests":m.category==="agents"?x="subagents":m.category==="context"&&(x="context"),g(x),w(null),m.tool_name&&q(m.tool_name),m.q&&(x==="prompts"||x==="assistant")&&p(m.q)};return i`<div class="bd-kql-body">
    ${v&&i`<div class="bd-kql-sync">
      <span>Active Flow filters detected (${[m.category&&`category=${m.category}`,m.tool_name&&`tool=${m.tool_name}`,m.failed&&"failures only",m.q&&`q="${m.q}"`].filter(Boolean).join(" · ")})</span>
      <button type="button" class="bd-btn bd-kql-syncbtn" onClick=${H}>Sync with Flow filters</button>
    </div>`}
    <div class="bd-kql-pills" role="group" aria-label="KQL preset shortcuts">
      ${Object.entries(re).map(([x,j])=>i`<button type="button" key=${x}
        class=${"bd-kql-pill"+(_===x?" bd-on":"")} title=${j.label}
        onClick=${()=>{g(x),w(null),p("")}}>${Nt[x]||x}</button>`)}
    </div>
    <label class="bd-kql-field">Example<select value=${_} onChange=${x=>{g(x.currentTarget.value),w(null),p("")}}>
      ${Object.entries(re).map(([x,j])=>i`<option value=${x} key=${x}>${j.label}</option>`)}
    </select></label>
    <p><code>${t.table}</code> · ${t.description}</p>
    <div class="bd-kql-filters">
      ${S?i`<label><input type="checkbox" checked=${y}
        onChange=${x=>w(x.currentTarget.checked?f:null)}/> Include all sessions in this date range</label>`:i`<${ie} id=${e+"-sid"} label="Session ID" value=${h} options=${$e([s,...he(d)])} onChange=${k} hint=${N} placeholder="Enter a session ID"/>`}
      ${t.model&&i`<${ie} id=${e+"-model"} key="model" label="Model (optional)" value=${$} options=${$e(he(a))} onChange=${b} hint=${N} placeholder="Any model"/>`}
      ${t.tool&&i`<${ie} id=${e+"-tool"} key="tool" label="Tool name (optional)" value=${r} options=${$e(he(c))} onChange=${q} hint=${N} placeholder="Any tool"/>`}
      ${t.keyword&&i`<label class="bd-kql-field">Keyword or phrase (optional)
        <input type="text" value=${C} onInput=${x=>p(x.currentTarget.value)} autocomplete="off" placeholder="Search retained text"/>
      </label>`}
    </div>
    ${!h&&!S&&i`<p>Enter a session ID. An empty ID matches no rows.</p>`}
    ${t.keyword&&i`<p>The search term is included in the Kusto link. Matching text is returned only when you run the query in Kusto.</p>`}
    <p id=${N}>Type a prefix for suggestions. Use ↑ or ↓ and Enter to choose, or Esc to dismiss.
      Examples use Flow’s time range, not its event-list filters.</p>
    ${M&&i`<${Ot} id=${e+"-editor"} key=${M} generated=${M} url=${n}/>`}
  </div>`}function Lt({url:e,sessionId:n,sessions:s,models:d,tools:a,since:c,until:o,flowFilters:u}){const[m,_]=O(!1),g="session-kql-"+We();return i`<details class="bd-kql" onToggle=${h=>{h.currentTarget.open&&_(!0)}}>
    <summary>Query in Kusto</summary>
    ${m&&i`<${Et} key=${n} ...${{base:g,url:e,sessionId:n,sessions:s,models:d,tools:a,since:c,until:o,flowFilters:u}}/>`}
  </details>`}const At="aictl-pref-session_flow_mode";function Dt(e,n){if(!n)return"";const s=JSON.stringify(String(n));if(e.type==="tool_use"){const d=e.to?` and tool_name == ${JSON.stringify(String(e.to))}`:"",a=e.success===!1?" and is_error == 1":"";return`tool_invocations
| where session_id == ${s}${d}${a}
| top 100 by ts desc
| project event_time=unixtime_seconds_todatetime(ts), tool_name, duration_ms, is_error`}if(e.type==="api_call"){const d=e.model?` and model == ${JSON.stringify(String(e.model))}`:"";return`requests
| where session_id == ${s}${d}
| top 100 by ts desc
| project event_time=unixtime_seconds_todatetime(ts), model, input_tokens, output_tokens, cost_usd`}return e.type==="skill_event"?`OTELTraces
| where SessionId == ${s} and isnotempty(ReportedSkillNames)
| project StartTime, OperationName, Model, ToolName, ReportedSkillNames`:`session_steps
| where session_id == ${s}
| top 100 by ts desc
| project event_time=unixtime_seconds_todatetime(ts), step_key, ['kind'], phase, name, agent_id, turn_id`}function jt({ev:e,sessionId:n,onClose:s}){const d=se(e),a=e.tokens||{},c=e.type==="api_call"?T(a.input||0)+" tokens in":e.type==="api_response"?T(a.output||0)+" tokens out":e.result_size?e.result_size+" B out":e.prompt_length?e.prompt_length+" characters":F,o=e.decision||(e.success===!1||e.success==="false"?"Failed":e.success===!0||e.success==="true"?"OK":F),u=[["Type",e.type==="user_message"?"User input prompt":e.type||F],["Time",be(e.ts,!0)],["Took",e.duration_ms?D(e.duration_ms):F],["Size",c],["Model",e.model||F],["Result",o]];e._rt&&u.push(["Turn tokens",T(e._rt)]),e._cum&&u.push(["Session cumulative",T(e._cum)]),e.agent_id&&e.type!=="skill_event"&&u.push(["Subagent ID",e.agent_id]),e.type==="skill_event"&&(u.splice(0,u.length,["Skill",e.name],["Evidence",Ce(e.phase)],["Source",e.source],[e.phase==="reported"?"First reported in range":"Time",be(e.ts,!0)]),e.phase==="reported"&&u.push(["Last reported in range",be(e.last_ts,!0)],["Distinct spans",T(e.reported_spans)]),e.agent_id&&u.push(["Agent ID",e.agent_id])),e.type==="user_message"&&u.push(["Source",e.source||F],["Text",e.text_status||(e.redacted?"Not retained":"Recorded")]);const m=ze(kt(e)),_=ze(yt(e)),g=Dt(e,n),h=le[e.type]||{lane:"tool"},$=e.type==="api_call"&&e.is_error||e.type==="error"||e.type==="tool_use"&&e.success===!1?E.error:e.type==="skill_event"?"var(--warn)":E[h.lane]||"var(--ink3)";return i`<aside class="bd-ag-insp bd-flow-side" role="region" aria-label="Selected event">
    <div class="bd-ag-insph">
      <span class="bd-ag-lane" style=${{color:$,borderColor:$}}>${e.type==="skill_event"?"skill":h.lane}</span>
      <b title=${d.label}>${d.label}</b>
      ${e._turnIndex>0&&i`<span class="bd-flow-turn-num">Turn #${e._turnIndex}</span>`}
      <button type="button" class="bd-btn" onClick=${s}>Close</button>
    </div>
    <dl class="bd-ag-kv">${u.map(([b,r])=>i`<div key=${b}><dt>${b}</dt><dd>${r}</dd></div>`)}</dl>
    ${m?i`<div class="bd-ag-sect">${e.type==="user_message"?"Your prompt":"Input"}</div><pre class="bd-ag-pre">${m}</pre>`:null}
    ${_?i`<div class="bd-ag-sect">Output</div><pre class="bd-ag-pre">${_}</pre>`:null}
    ${g?i`<div class="bd-ag-sect">Correlated KQL Snippet</div><pre class="bd-ag-pre bd-insp-kql">${g}</pre>`:null}
  </aside>`}const Se=(e,n)=>s=>it(s.clientX,s.clientY,wt(e,n)),B=e=>e.step_key||e.event_id||e;function Pt({turnGroups:e,activeTurn:n,onSelectTurn:s}){if(!e||e.length<2)return null;const d=Math.max(1,...e.map(c=>c.tokens||0)),a=e.reduce((c,o)=>!c||(o.tokens||0)>(c.tokens||0)?o:c,null);return i`<div class="bd-flow-scrubber" role="region" aria-label="Session turn scrubber">
    <div class="bd-flow-scrub-meta">
      <strong>Turn Scrubber (${T(e.length)} turns)</strong>
      ${a&&a.tokens>0?i`<span>Peak: Turn #${a.turnIndex} (${T(a.tokens)} tok)</span>`:null}
      ${n!=null?i`<button type="button" class="bd-btn bd-flow-scrub-clear" onClick=${()=>s(null)}>Turn #${n} selected ×</button>`:null}
    </div>
    <div class="bd-flow-scrub-track">
      ${e.map(c=>{const o=Math.max(16,Math.round((c.tokens||1)/d*100)),u=a&&c.turnIndex===a.turnIndex&&c.tokens>0,m=n===c.turnIndex,_=["bd-flow-sbar",u?"bd-peak":"",c.errors>0?"bd-has-err":"",c.skills.length>0?"bd-has-skill":"",m?"bd-on":""].filter(Boolean).join(" "),g=`Turn #${c.turnIndex} (${U(c.startTs)}): ${T(c.tokens)} tok`+(c.errors?` · ${c.errors} failed`:"")+(c.skills.length?` · skill: ${c.skills.join(", ")}`:"")+(c.promptText?` — ${c.promptText.slice(0,80)}`:"");return i`<button type="button" key=${c.turnIndex} class=${_} style=${{height:o+"%"}}
          title=${g} aria-label=${`Turn ${c.turnIndex}`} aria-pressed=${m?"true":"false"}
          onClick=${()=>s(m?null:c.turnIndex)}/>`})}
    </div>
  </div>`}function vt({events:e,sel:n,onSel:s}){const[d,a]=O({}),c=o=>a(u=>({...u,[o]:!u[o]}));return i`<div class="bd-flow-colhdr" aria-hidden="true">
    <span>Time</span>
    <span>Actor / Kind</span>
    <span>Step / Command / Target</span>
    <span class="bd-flow-colhdr-r">Tokens</span>
    <span>Turn Timeline Waterfall</span>
  </div>
  <ul class="bd-ag-tl" aria-label="Events, oldest first">${e.map((o,u)=>{var q;const m=le[o.type]||{lane:"tool",kind:"request"},_=o.type==="api_call"&&o.is_error||o.type==="error"||o.type==="tool_use"&&o.success===!1,g=_?E.error:o.type==="skill_event"?"var(--warn)":E[m.lane]||"var(--ink3)",h=se(o),k=n===B(o),$=o._turnGroup,b=$&&d[$.turnIndex]&&!o._isTurnStart&&!k,r=o.duration_ms>0?D(o.duration_ms):"";return i`<li key=${o.step_key||o.event_id||u} hidden=${!!b}>
      ${o._isTurnStart&&$&&i`<div class="bd-flow-turn-hdr">
        <button type="button" class="bd-flow-turn-toggle" onClick=${()=>c($.turnIndex)}
          aria-expanded=${d[$.turnIndex]?"false":"true"}>
          <span class="bd-flow-turn-chev">${d[$.turnIndex]?"▸":"▾"}</span>
          <span class="bd-flow-turn-num">Turn #${$.turnIndex}${$.isPartialStart?" · CONT.":""}</span>
          <span class="bd-flow-turn-ts">${U($.startTs)}${$.endTs>$.startTs?" → "+U($.endTs):""}</span>
          <span class="bd-flow-turn-prompt">${$.promptText}</span>
        </button>
        <div class="bd-flow-turn-badges">
          ${$.skills.length>0&&i`<span class="bd-flow-tbadge bd-warn">★ ${$.skills.join(", ")}</span>`}
          ${$.errors>0&&i`<span class="bd-flow-tbadge bd-crit">${$.errors} ${$.errors===1?"Failure":"Failures"}</span>`}
          ${$.subagents>0&&i`<span class="bd-flow-tbadge">${$.subagents} ${$.subagents===1?"Subagent":"Subagents"}</span>`}
          ${$.apiCalls>0&&i`<span class="bd-flow-tbadge">${T($.apiCalls)} API</span>`}
          ${$.tokens>0&&i`<span class="bd-flow-tbadge bd-focus">${T($.tokens)} tok</span>`}
          ${$.durationMs>0&&i`<span class="bd-flow-tbadge">${D($.durationMs)}</span>`}
        </div>
      </div>`}
      <button type="button" class=${"bd-ag-tlrow"+(k?" bd-on":"")+(_?" bd-err-row":"")} aria-expanded=${k?"true":"false"}
        onClick=${()=>s(k?null:B(o))} onMouseMove=${Se(o,g)} onMouseLeave=${ye}>
        <span class="bd-ag-when">${U(o.ts)}${o._cum?i`<em>${T(o._cum)+" total"+(o._rt?", "+T(o._rt)+" this turn":"")}</em>`:null}</span>
        <span class="bd-ag-body-actor">
          <span class="bd-ag-dot" style=${{borderColor:g,background:m.kind==="reply"||m.kind==="marker"?g:"transparent"}}></span>
          <span class="bd-ag-lane" style=${{color:g,borderColor:g}}>${o.type==="skill_event"?"skill":m.lane}</span>
        </span>
        <span class="bd-ag-body">
          <span class="bd-ag-body-top">
            ${o.agent_id&&i`<span class="bd-flow-subtag" title=${o.agent_id}>agent:${String(o.agent_id).slice(0,8)}</span>`}
            <span class="bd-ag-lbl">${h.label}</span>
          </span>
          ${h.meta?i`<span class="bd-ag-meta">${h.meta}</span>`:null}
        </span>
        <span class="bd-ag-size">${h.size||((q=o.tokens)!=null&&q.input?"+"+T((o.tokens.input||0)+(o.tokens.output||0))+" tok":"")}</span>
        <span class="bd-ag-wf" aria-hidden="true">
          <span class="bd-ag-wftrack"><i class="bd-ag-wfbar" style=${{left:(o._wfOffsetPct||0)+"%",width:(o._wfWidthPct||8)+"%",background:g}}></i></span>
          <span class="bd-ag-wfdur">${r}</span>
        </span>
      </button>
    </li>`})}</ul>`}function zt({events:e,participants:n,filtered:s,sel:d,onSel:a,toolLabel:c}){const[o,u]=O(!1),m=K(()=>{const r=["main"];for(const q of e)q.agent_id&&!r.includes(q.agent_id)&&r.push(q.agent_id);return r},[e]),{lanes:_,columns:g,grouped:h}=K(()=>ht(e,n,s),[e,n,s]),k=_.length||1,$=r=>g.get(r)??-1,b=r=>(r+.5)/k*100;return o&&m.length>1?i`<div class="bd-ag-bar bd-flow-slmode">
      <${we} label="Swim-lane layout" value="streams" onPick=${r=>u(r==="streams")}
        items=${[["participants","Participant arrows"],["streams","Session & Subagent streams"]]}/>
      <span class="bd-ag-dim">Each column is an execution stream (Main session + Subagents); models and tools render inline without wasting columns.</span>
    </div>
    <div class="bd-ag-sl bd-ag-sl-streams" role="list" aria-label="Events between participants, oldest first">
      <div class="bd-flow-stream-hdr" style=${{gridTemplateColumns:`68px repeat(${m.length}, minmax(210px, 1fr))`}}>
        <span>Time</span>
        ${m.map((r,q)=>i`<b key=${r} class="bd-flow-stream-colh">
          <i class="bd-sw" style=${{background:q===0?"var(--s1)":"var(--s5)",marginRight:"5px"}}/>
          ${r==="main"?`Main Session (${c||"root"})`:`Subagent ${String(r).slice(0,8)}`}
        </b>`)}
      </div>
      ${e.map((r,q)=>{const C=se(r),p=d===B(r),l=r.type==="error"||r.is_error||r.type==="tool_use"&&r.success===!1,w=l?E.error:r.type==="skill_event"?"var(--warn)":E[(le[r.type]||{}).lane]||"var(--ink2)",N=r.agent_id&&m.includes(r.agent_id)?r.agent_id:"main";return i`<div key=${r.step_key||r.event_id||q} role="listitem">
          <button type="button" class=${"bd-flow-stream-row"+(p?" bd-on":"")}
            style=${{gridTemplateColumns:`68px repeat(${m.length}, minmax(210px, 1fr))`}}
            aria-expanded=${p?"true":"false"} aria-label=${U(r.ts)+" "+C.label}
            onClick=${()=>a(p?null:B(r))} onMouseMove=${Se(r,w)} onMouseLeave=${ye}>
            <span class="bd-flow-stream-ts">${U(r.ts)}</span>
            ${m.map(t=>i`<span key=${t} class="bd-flow-stream-cell">
              ${t===N?i`<span class=${"bd-flow-stream-card"+(l?" bd-err":r.type==="skill_event"?" bd-skill":"")}>
                <span class="bd-flow-sc-top"><strong><i class="bd-sw" style=${{background:w,marginRight:"5px"}}/>${C.label}</strong>${r.duration_ms>0?i`<em>${D(r.duration_ms)}</em>`:null}</span>
                ${C.meta?i`<span class="bd-flow-sc-meta">${C.meta}</span>`:null}
              </span>`:null}
            </span>`)}
          </button>
        </div>`})}
    </div>`:i`${m.length>1&&i`<div class="bd-ag-bar bd-flow-slmode">
    <${we} label="Swim-lane layout" value="participants" onPick=${r=>u(r==="streams")}
      items=${[["participants","Participant arrows"],["streams","Session & Subagent streams ("+m.length+")"]]}/>
  </div>`}
  ${h&&i`<div class="bd-note">Tools and subagents share lanes by category. Each event shows its own name.</div>`}
  <div class="bd-ag-sl" style=${{"--flow-diagram-width":158+k*96+"px"}} role="list" aria-label="Events between participants, oldest first">
    <div class="bd-ag-slhead" aria-hidden="true"><span>Total</span><span>Turn</span><span>Time</span>
      <span class="bd-ag-slarea">${_.map((r,q)=>i`<b key=${r.id} style=${{left:b(q)+"%",color:r.color,borderColor:r.color}} title=${r.label}>${r.label}</b>`)}</span>
    </div>
    ${e.map((r,q)=>{const C=$(r._from),p=$(r._to),l=se(r),w=d===B(r),N=_[p],t=r.type==="error"||r.is_error?E.error:r.type==="user_message"?E.user:r.type==="api_response"?E.api:(N==null?void 0:N.color)||"var(--ink2)",S=_.map((y,M)=>i`<i key=${y.id} class="bd-ag-lanel" style=${{left:b(M)+"%"}}></i>`);let f;if(C<0||p<0){const y=E[(le[r.type]||{}).lane]||"var(--ink3)";f=i`<span class="bd-ag-marker" style=${{color:y,borderColor:y}}>${l.label}${l.meta?" · "+l.meta:""}</span>`}else{const y=Math.min(C,p),M=Math.max(C,p),v=p>C;f=i`<span class="bd-ag-arrow" style=${{left:b(y)+"%",width:b(M)-b(y)+"%",borderColor:t}}>
          <span class=${"bd-ag-head"+(v?" bd-r":" bd-l")} style=${{color:t}}></span>
        </span>
        <span class="bd-ag-alabel" style=${{left:(b(y)+b(M))/2+"%",color:t}} title=${l.label}>${l.label}${l.meta?i`<em>${l.meta}</em>`:null}</span>`}return i`<div key=${r.step_key||r.event_id||q} role="listitem">
        <button type="button" class=${"bd-ag-slrow"+(w?" bd-on":"")} aria-expanded=${w?"true":"false"} aria-label=${U(r.ts)+" "+l.label}
          onClick=${()=>a(w?null:B(r))} onMouseMove=${Se(r,t)} onMouseLeave=${ye}>
          <span>${r._cum?T(r._cum):""}</span><span>${r._rt?T(r._rt):""}</span><span>${U(r.ts)}</span>
          <span class="bd-ag-slarea">${S}${f}</span>
        </button>
      </div>`})}
  </div>`}const z=e=>{var n;return((n=e==null?void 0:e.summary)==null?void 0:n.omitted_events)||0},Fe=e=>{const n=(e.turns||[]).length;return z(e)?"Newest "+T(n)+" of "+T(n+z(e))+" events":T(n)+" events"},Ke=500,Be=1e3,ke=5e3,G={q:"",category:"",tool_name:"",flow_agent:"",skill_name:"",skill_phase:"",failed:!1,range:"whole",start:"",end:""},Rt=["prompts","messages","models","tools","skills","agents","context","hooks","lifecycle"];function Ut({apply:e,scope:n,bounds:s,initialCategory:d,activeCategory:a,activeFailed:c}){var q,C,p;const[o,u]=O(()=>({...G,category:d})),[m,_]=O(""),g=We(),h=(l,w)=>{u(N=>({...N,[l]:w})),_("")},k=l=>{l.preventDefault();const w=new URLSearchParams,N=["q","category","flow_agent",...o.category==="skills"?["skill_name","skill_phase"]:["tool_name"]];for(const S of N)o[S].trim()&&w.set(S,o[S].trim());o.failed&&o.category!=="skills"&&w.set("failed","1");let t;if(o.range==="custom")t=rt(o.start,o.end);else if(o.range!=="whole"){if(!Number.isFinite(s.end)){_("The session end time has not been reported.");return}t={since:s.end-Number(o.range),until:s.end}}if(t!=null&&t.error){_(t.error);return}t&&(w.set("since",Math.floor(t.since)),w.set("until",Math.ceil(t.until))),_(""),e(w.toString())},$=l=>{if(l!=="custom"){h("range",l);return}_(""),u(w=>({...w,range:l,start:w.start||(Number.isFinite(s.start)?ve(s.start):""),end:w.end||(Number.isFinite(s.end)?ve(Math.ceil(s.end/60)*60):"")}))},b=l=>{const w={...G,category:a===l?"":l};u(w),_(""),e(w.category?"category="+l:"")},r=()=>{const l=!c,w={...G,failed:l};u(w),_(""),e(l?"failed=1":"")};return i`<form class="bd-flow-filters" role="search" aria-label="Flow filters" onSubmit=${k}>
    <div class="bd-flow-quickbar">
      <button type="button" class=${"bd-btn bd-flow-qpill"+(!a&&!c?" bd-on":"")}
        aria-pressed=${!a&&!c} onClick=${()=>{u(G),_(""),e("")}}>All events</button>
      <button type="button" class=${"bd-btn bd-flow-qpill"+(a==="prompts"?" bd-on":"")}
        aria-pressed=${a==="prompts"} onClick=${()=>b("prompts")}>User prompts</button>
      <button type="button" class=${"bd-btn bd-flow-qpill"+(a==="models"?" bd-on":"")}
        aria-pressed=${a==="models"} onClick=${()=>b("models")}>Model rounds</button>
      <button type="button" class=${"bd-btn bd-flow-qpill"+(a==="tools"?" bd-on":"")}
        aria-pressed=${a==="tools"} onClick=${()=>b("tools")}>Tool uses</button>
      <button type="button" class=${"bd-btn bd-flow-qpill"+(a==="agents"?" bd-on":"")}
        aria-pressed=${a==="agents"} onClick=${()=>b("agents")}>Subagents</button>
      <button type="button" class=${"bd-btn bd-flow-qpill bd-flow-qskill"+(a==="skills"?" bd-on":"")}
        aria-pressed=${a==="skills"} onClick=${()=>b("skills")}>Skills</button>
      <button type="button" class=${"bd-btn bd-flow-qpill bd-flow-qerr"+(c?" bd-on":"")}
        aria-pressed=${!!c} onClick=${r}>Failed steps</button>
      <label class="bd-flow-search"><span class="bd-flow-srchlbl">${o.category==="prompts"?"Search prompt text":"Search events"}</span><input type="search" placeholder=${o.category==="prompts"?"Words you wrote in this session":"Search prompt, tool, path, error..."} value=${o.q} onInput=${l=>h("q",l.currentTarget.value)}/></label>
    </div>
    <div class="bd-flow-filter-row">
      <label><span>Category</span><select value=${o.category} onChange=${l=>h("category",l.currentTarget.value)}>
        <option value="">All categories</option>${Rt.map(l=>i`<option key=${l} value=${l}>${l==="prompts"?"User prompts only":l[0].toUpperCase()+l.slice(1)}</option>`)}
      </select></label>
      ${o.category==="skills"?i`<label><span>Skill name</span><input list=${g+"-skills"} placeholder="Any skill" value=${o.skill_name} onInput=${l=>h("skill_name",l.currentTarget.value)}/></label>
        <datalist id=${g+"-skills"}>${(q=n==null?void 0:n.skills)==null?void 0:q.map(l=>i`<option value=${l} key=${l}/>`)}</datalist>
        <label><span>Skill evidence</span><select value=${o.skill_phase} onChange=${l=>h("skill_phase",l.currentTarget.value)}>
          <option value="">All evidence</option>${["loaded","invoked","reported","resolved"].map(l=>i`<option key=${l} value=${l}>${Ce(l)}</option>`)}
        </select></label>`:i`<label><span>Tool name</span><input list=${g+"-tools"} placeholder="Any tool" value=${o.tool_name} onInput=${l=>h("tool_name",l.currentTarget.value)}/></label>`}
      <datalist id=${g+"-tools"}>${(C=n==null?void 0:n.tools)==null?void 0:C.map(l=>i`<option key=${l} value=${l}/>`)}</datalist>
      <label><span>Agent ID</span><input list=${g+"-agents"} placeholder="Any agent" value=${o.flow_agent} onInput=${l=>h("flow_agent",l.currentTarget.value)}/></label>
      <datalist id=${g+"-agents"}>${(p=n==null?void 0:n.agents)==null?void 0:p.map(l=>i`<option key=${l} value=${l}/>`)}</datalist>
      <label><span>Time range</span><select value=${o.range} onChange=${l=>$(l.currentTarget.value)}>
        <option value="whole">Whole session</option><option value="900" disabled=${!Number.isFinite(s.end)}>Last 15 min of session</option>
        <option value="3600" disabled=${!Number.isFinite(s.end)}>Last hour of session</option><option value="custom">Custom range</option>
      </select></label>
      ${o.range==="custom"&&i`<label><span>From (local)</span><input type="datetime-local" value=${o.start} onInput=${l=>h("start",l.currentTarget.value)}/></label>
        <label><span>To (local)</span><input type="datetime-local" value=${o.end} onInput=${l=>h("end",l.currentTarget.value)}/></label>`}
      <div class="bd-flow-actions">${o.category!=="skills"&&i`<label class="bd-ag-check"><input type="checkbox" checked=${o.failed} onChange=${l=>h("failed",l.currentTarget.checked)}/>Failures only</label>`}
        <button type="submit" class="bd-btn bd-p">Apply filters</button>
        <button type="button" class="bd-btn" onClick=${()=>{u(G),_(""),e("")}}>Reset filters</button>
      </div>
    </div>
    ${m&&i`<span class="bd-ag-bad" role="alert">${m}</span>`}
  </form>`}function Ft(e){if(!e)return null;try{const n=new URL(e);return["https:","http:"].includes(n.protocol)?n.href:null}catch{return null}}function Vt(e){return i`<${Kt} key=${e.a.id} ...${e}/>`}function Kt({a:e,st:n,ctx:s,act:d,flowRef:a,sid:c,captureMode:o,initialEvidence:u=!1,initialPrompts:m=!1,initialSkills:_=!1,agentData:g}){var Me,Oe,Ne,Ee,Le,Ae,De,je;const h=dt(n)?s.refreshKey:0,[k,$]=O(Ke),b=m?"prompts":_?"skills":"",[r,q]=O(b?"category="+b:""),C="limit="+k+(r?"&"+r:""),{data:p,error:l}=ct(I=>ot(e.id,C,I),JSON.stringify(["flow",e.id,C]),h),[w,N]=ut(At,"timeline",["timeline","swimlane"]),[t,S]=O(u),[f,y]=O(u),[M,v]=O(null);Qe(()=>{S(u),u&&y(!0)},[u]);const H=t?"source":w,[x,j]=O(null),ne=qe({});p&&!new URLSearchParams(r).has("since")&&!new URLSearchParams(r).has("until")&&(!r||!ne.current.end)&&(ne.current={start:((Me=p.scope)==null?void 0:Me.start)??e.started_at,end:((Oe=p.scope)==null?void 0:Oe.end)??e.ended_at??((Ee=(Ne=p.turns)==null?void 0:Ne.at(-1))==null?void 0:Ee.ts)});const Ve={start:ne.current.start??e.started_at,end:ne.current.end??e.ended_at},ue=s.toolName?s.toolName(e.tool):e.tool,J=K(()=>$t((p==null?void 0:p.turns)||[],ue,p==null?void 0:p.summary),[p,ue]),pe=K(()=>a?J.events.filter(I=>I[a.field]===a.id&&(!a.traceId||I.trace_id===a.traceId)):J.events,[J,a]),V=K(()=>M!=null?pe.filter(I=>I._turnIndex===M):pe,[pe,M]),me=K(()=>x!=null&&V.find(I=>B(I)===x)||null,[V,x]),Ye=I=>{S(I==="source"),I==="source"?y(!0):N(I)},Ge=I=>{I!==r&&(j(null),v(null),q(I),$(Ke))},_e=Ft(p==null?void 0:p.session_kql_url),L=p==null?void 0:p.scope,oe=c||(p==null?void 0:p.session_id),Ie=(Le=s.data)==null?void 0:Le.agents,Xe=K(()=>[...new Set([oe,...(Ie||[]).map(I=>{var Pe;return I.native_session_id?I.native_session_id:I.placeholder||(Pe=I.id)!=null&&Pe.startsWith("live:")||I.runtime_present&&!I.queryable?null:I.session_id||I.parent_id||I.id})].filter(Boolean))],[oe,Ie]),P=new URLSearchParams(r),Ze=P.has("since")?Number(P.get("since")):null,et=P.has("until")?Number(P.get("until")):null,tt=c===void 0?e.native_session_id||e.session_id||(p==null?void 0:p.session_id):c,st=r?"Summary counts all events in the selected time span.":p&&Fe(p),A=J.summary,nt=[{label:"Turns",value:T(A.turns),title:"Prompts in the session"},{label:"Tool calls",value:T(A.toolCalls)},{label:"Subagents",value:T(A.subagents)},{label:"Hooks",value:T(A.hooks)},{label:"Errors",value:T(A.errors)},{label:"Compactions",value:T(A.compactions)},{label:"Tokens, total",value:T(A.cumulative),title:"Input and output of every model call, added up"},{label:"Largest turn",value:T(A.roundTrip),title:"The most input and output tokens between two prompts"},{label:"First token",value:A.ttft==null?F:D(A.ttft),sub:A.ttftCalls?"median of "+A.ttftCalls+" calls":"",title:"Time to first token"}];return i`<${pt} a=${e}/>
    ${p&&!((Ae=p.summary)!=null&&Ae.skill_evidence)&&i`<${ae} key="summary" id="agfs" title="Summary" sub=${st}><${at} stats=${nt}/></${ae}>`}
    <${ae} key="flow" id="agfl" title="Flow" sub=${t?"Search retained source records separately from flow events.":z(p)&&!r?"Oldest first. The "+T(z(p))+" oldest events are left out; the summary counts them.":"Oldest first. Select an event to read it."}>
      <div class="bd-ag-bar bd-flow-toolbar">
        <${we} label="Flow view" value=${H} onPick=${Ye} items=${[["timeline","Timeline"],["swimlane","Swim-lane"],["source","Source steps"]]}/>
        ${p&&!t&&i`<span class="bd-flow-status" role="status">${L&&L.matched!=null&&L.total!=null?`Showing ${V.length.toLocaleString()} · ${L.matched.toLocaleString()} matched of ${L.total.toLocaleString()} events in range`:Fe(p)}</span>`}
        ${p&&!t&&z(p)&&k<ke?i`<button type="button" class="bd-btn" onClick=${()=>$(I=>Math.min(ke,I+Be))}>${"Show "+Math.min(z(p),Be).toLocaleString("en-US")+" older events"}</button>`:null}
        ${p&&!t&&z(p)&&k>=ke?i`<span class="bd-ag-dim">${T(z(p))} older matching events remain outside the display limit.</span>`:null}
        ${_e&&i`<a class="bd-btn bd-flow-kusto" href=${_e} target="_blank" rel="noopener noreferrer">Open session in Kusto</a>`}
      </div>
      ${_e&&i`<${Lt} url=${p.session_kql_url} sessionId=${oe} sessions=${Xe}
        models=${(De=L==null?void 0:L.models)!=null&&De.length?L.models:e.models||[]} tools=${(L==null?void 0:L.tools)||[]} since=${Ze} until=${et}
        flowFilters=${Object.fromEntries(P)}/>`}
      <div hidden=${t}>
        <${Ut} scope=${L} bounds=${Ve} apply=${Ge} initialCategory=${b}
          activeCategory=${P.get("category")} activeFailed=${P.get("failed")==="1"}/>
        ${p&&i`<${Pt} turnGroups=${J.turnGroups} activeTurn=${M} onSelectTurn=${v}/>`}
        ${P.get("category")==="skills"&&i`<p class="bd-note">Loaded files and invocations are separate records. “Reported in context” groups OTel spans by skill; it does not count skill loads.</p>`}
        ${P.get("category")==="prompts"&&i`<p class="bd-note">User input only. Select a row to read the retained prompt. Assistant replies and delegated instructions are not included.</p>`}
        ${a&&i`<div class="bd-ag-bar"><span>${a.label} ID: ${a.id}</span><button type="button" class="bd-btn" onClick=${()=>{j(null),d.setDrawerTab("flow")}}>Show full flow</button></div>`}
        ${p?V.length?!t&&i`<div class=${"bd-flow-workspace"+(me?" bd-has-insp":"")}>
            <div class="bd-flow-main">
              ${w==="swimlane"?i`<${zt} events=${V} participants=${J.participants} filtered=${!!(r||a)} sel=${x} onSel=${j} toolLabel=${ue}/>`:i`<${vt} events=${V} sel=${x} onSel=${j}/>`}
            </div>
            ${me&&i`<${jt} ev=${me} sessionId=${oe} onClose=${()=>j(null)}/>`}
          </div>`:i`<div class="bd-empty">${a?"No event in the loaded flow reports this source ID.":r?"No events match these flow filters.":"No flow data for this session: aictl has no prompt, model call or tool call of it, and no hook or OpenTelemetry event."}</div>`:i`<${mt} error=${l} what="the session flow"/>`}
      </div>
      ${f&&i`<div hidden=${!t}><${_t} inline=${!0} a=${e} sid=${tt} data=${g} act=${d} captureMode=${o??((je=s.data)==null?void 0:je.capture_mode)}/></div>`}
    </${ae}>`}export{Ke as FLOW_EVENTS,ke as FLOW_EVENTS_MAX,Be as FLOW_EVENTS_STEP,At as FLOW_MODE_KEY,Vt as default};

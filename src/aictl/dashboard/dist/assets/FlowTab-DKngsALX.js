import{i as x,r as D,d as N,ao as We,m as r,K as qe,h as Qe,ap as at,T as K,N as F,S as rt,aq as we,b as fe,ar as it,as as ve,at as lt}from"./index-B2ldzozr.js";import{d as dt,b as Z,i as ut,u as ct,e as He,S as pt,F as ae,f as re,W as mt,c as U,p as ze}from"./Drawer-DeQqEO4D.js";import _t from"./EvidenceTab-MkTpHILy.js";import"./TextView-B2_Z-TRb.js";import"./LoadedConfiguration-DB8tf-Jf.js";const bt={user_message:()=>["user","tool"],api_call:e=>[e.from||"tool","api"],api_response:()=>["api","tool"],error:()=>["api","tool"],tool_use:e=>["tool","skill:"+(e.to||"tool")],subagent:e=>["tool","subagent:"+(e.to||"agent")],subagent_end:e=>["subagent:"+(e.from||"agent"),"tool"],hook:()=>["tool","hook"]},de={user_message:{lane:"user",kind:"request"},api_call:{lane:"api",kind:"request"},api_response:{lane:"api",kind:"reply"},error:{lane:"error",kind:"reply"},tool_use:{lane:"tool",kind:"request"},subagent:{lane:"agent",kind:"request"},subagent_end:{lane:"agent",kind:"reply"},hook:{lane:"hook",kind:"hook"},session_start:{lane:"session",kind:"marker"},session_end:{lane:"session",kind:"marker"},compaction:{lane:"compact",kind:"marker"},context_update:{lane:"compact",kind:"marker"},session_command:{lane:"session",kind:"marker"},skill_event:{lane:"tool",kind:"marker"}},E={user:"var(--s1)",api:"var(--s2)",tool:"var(--s3)",agent:"var(--s5)",hook:"var(--s4)",session:"var(--good)",compact:"var(--warn)",error:"var(--crit)"};function ft(e){if(!e)return"";let n=e;if(typeof e=="string")try{n=JSON.parse(e)}catch{return e.slice(0,80)}if(typeof n!="object"||n===null)return String(e).slice(0,80);for(const u of["command","file_path","pattern","query","path","url","prompt","description","old_string","content","skill"])if(n[u])return String(n[u]).slice(0,100);const s=Object.keys(n);return s.length?String(n[s[0]]).slice(0,80):""}const te=e=>((e.tokens||{}).input||0)+((e.tokens||{}).output||0);function gt(e){const n=e||[],s=[];for(let u=0;u<n.length;u++){const a=n[u],l=n[u+1];if(a&&l&&a.type==="user_message"&&l.type==="user_message"&&a.step_key&&a.step_key===l.step_key&&!!a.redacted!=!!l.redacted){const o=a.redacted?l:a,c=a.redacted?a:l;s.push({...c,...o,redacted:!1,tokens:te(c)>=te(o)?c.tokens:o.tokens,api_calls:c.api_calls||o.api_calls||0,duration_ms:c.duration_ms||o.duration_ms||0,wall_ms:c.wall_ms||o.wall_ms||0,end_ts:c.end_ts||o.end_ts,model:c.model||o.model||""}),u+=1}else s.push(a)}return s}function $t(e,n,s){const a=gt(e).map(t=>{const T=bt[t.type],[f,S]=T?T(t):[null,null];return{...t,_from:f,_to:S}});let l=0,o=0,c=0;const m=a.filter(t=>t.type==="user_message").length,b=(s==null?void 0:s.total_turns)||m,_=a.length>0&&a[0].type!=="user_message"&&((s==null?void 0:s.omitted_events)>0||a[0].rt_tokens>0),h=b>m&&m>0?b-m+1:1;let k=_?Math.max(1,h-1):h-1;const g=[];let $=null;if(_){const t=a[0];t._isTurnStart=!0,$={turnIndex:k,isPartialStart:!0,startTs:t.ts,endTs:t.ts,promptEv:t,promptText:"Continued from earlier in turn (load older events for prompt)",tokens:t.rt_tokens||0,cacheTokens:0,apiCalls:0,toolCalls:0,subagents:0,skills:[],errors:0,durationMs:0,events:[]},g.push($)}for(const t of a){if(t.type==="user_message"?(o=0,k+=1,t._isTurnStart=!0,$={turnIndex:k,startTs:t.ts,endTs:t.end_ts||t.ts,promptEv:t,promptText:t.preview||t.message||(t.redacted?"Prompt (text not retained)":"Prompt"),tokens:te(t),cacheTokens:(t.tokens||{}).cache_read||0,apiCalls:t.api_calls||0,toolCalls:0,subagents:0,skills:[],errors:0,durationMs:t.duration_ms||t.wall_ms||0,events:[t]},g.push($)):$&&($.events.push(t),t.ts>$.endTs&&($.endTs=t.ts),$.isPartialStart&&$.endTs>$.startTs&&($.durationMs=($.endTs-$.startTs)*1e3)),t.type==="api_call"){const T=te(t);l+=T,o+=T,c=Math.max(c,o),$&&($.tokens=Math.max($.tokens,t.rt_tokens??o),$.cacheTokens+=(t.tokens||{}).cache_read||0,$.apiCalls=Math.max($.apiCalls,$.events.filter(f=>f.type==="api_call").length))}$&&(t.rt_tokens>$.tokens&&($.tokens=t.rt_tokens),t.type==="tool_use"&&($.toolCalls+=1),t.type==="subagent"&&($.subagents+=1),t.type==="skill_event"&&t.name&&!$.skills.includes(t.name)&&$.skills.push(t.name),(t.type==="error"||t.is_error||t.type==="tool_use"&&t.success===!1)&&($.errors+=1)),t._turnIndex=k,t._cum=t.cum_tokens??l,t._rt=t.rt_tokens??o}for(const t of g){const T=t.events,f=Math.max(1e3,...T.map(M=>M.duration_ms||0)),S=T.length||1;T.forEach((M,v)=>{M._turnGroup=t;const H=M.duration_ms||0,q=H>0?Math.max(6,Math.min(72,Math.round(H/f*68))):6,j=S>1?Math.min(100-q,Math.round(v/(S-1)*(92-q))):0;M._wfOffsetPct=j,M._wfWidthPct=q})}for(const t of a)t._wfWidthPct==null&&(t._wfOffsetPct=0,t._wfWidthPct=t.duration_ms>0?Math.min(80,Math.max(8,Math.round(t.duration_ms/250))):8);const w=new Map;let d=0;const C=(t,T,f)=>{w.has(t)||w.set(t,{id:t,label:T,color:f||dt(d++)})};a.length&&(C("user","User",E.user),C("tool",n||"Tool","var(--ink2)"));for(const t of a)(t.type==="api_call"||t.type==="api_response"||t.type==="error")&&C("api","Model",E.api),t.type==="tool_use"&&C(t._to,t.to||"tool"),t.type==="subagent"&&C(t._to,t.to||"Subagent"),t.type==="subagent_end"&&C(t._from,t.from||"Subagent"),t.type==="hook"&&C("hook","Hooks",E.hook);const p=t=>a.filter(T=>T.type===t).length,i=a.filter(t=>t.type==="api_call"&&t.ttft_ms>0).map(t=>t.ttft_ms).sort((t,T)=>t-T),y=i.length?i.length%2?i[(i.length-1)/2]:(i[i.length/2-1]+i[i.length/2])/2:null,O=(s==null?void 0:s.cumulative_tokens)!=null?{turns:s.total_turns,toolCalls:s.total_tool_uses,subagents:s.subagents,hooks:s.hooks,errors:s.errors,compactions:s.compactions,cumulative:s.cumulative_tokens,roundTrip:s.largest_turn_tokens,ttft:s.ttft_ms??null,ttftCalls:s.ttft_calls||0}:{turns:p("user_message"),toolCalls:a.filter(t=>t.type==="tool_use"&&t.subtype!=="result"&&t.subtype!=="decision").length,subagents:p("subagent"),hooks:p("hook"),errors:p("error")+a.filter(t=>t.type==="api_call"&&t.is_error||t.type==="tool_use"&&t.success===!1).length,compactions:p("compaction"),cumulative:l,roundTrip:c,ttft:y,ttftCalls:i.length};return{events:a,participants:[...w.values()],turnGroups:g,summary:O}}function ht(e,n,s,u=!1){const a=new Set;for(const b of e)a.add(b._from),a.add(b._to);const l=n.filter(b=>!s||a.has(b.id)),o=[],c=new Map,m=new Map;for(const b of l){const _=u&&(b.id.startsWith("skill:")?"tools":b.id.startsWith("subagent:")?"agents":null),h=_?"group:"+_:b.id;c.has(h)||(c.set(h,o.length),o.push(_?{id:h,label:_==="tools"?"Tools":"Subagents",color:E[_==="tools"?"tool":"agent"]}:b)),m.set(b.id,c.get(h))}return{lanes:o,columns:m,grouped:o.length<l.length}}function se(e){const n=e.tokens||{};if(e.type==="user_message")return e.redacted?e.prompt_length?{label:"Prompt, text not sent ("+e.prompt_length+" characters)",meta:""}:{label:"Prompt, text not kept",meta:""}:{label:e.preview||e.message||"Prompt",meta:e.prompt_length?e.prompt_length+" characters":""};if(e.type==="api_call"){const s=[x(te(e))+" tokens"];return e.ttft_ms>0?s.push("first token "+D(e.ttft_ms)):e.duration_ms>0&&s.push(D(e.duration_ms)),e.is_error&&s.push("failed"),{label:e.agent_name||e.model||"Model call",meta:s.join(", ")}}if(e.type==="api_response"){const s=[e.model,e.finish_reason&&e.finish_reason!=="stop"?"stopped: "+e.finish_reason:""].filter(Boolean).join(", ");return{label:"Reply"+(n.output?", "+x(n.output)+" tokens":"")+(e.response_preview?": "+Z(e.response_preview,80):""),meta:s}}if(e.type==="error")return{label:"Error: "+(e.error_type||"error"),meta:Z(e.error_message||"",80)};if(e.type==="tool_use"){const s=ft(e.params)||(e.target?String(e.target).slice(0,100):"");let u="";return e.subtype==="result"||!e.subtype&&typeof e.success=="boolean"?u=(e.success===!0||e.success==="true"?"OK":"Failed")+(e.duration_ms>0?", "+D(e.duration_ms):""):e.subtype==="decision"&&(u=e.decision||""),{label:(e.to||"tool")+(s?": "+s:""),meta:u,size:e.result_size?e.result_size+" B":""}}if(e.type==="subagent")return{label:"Subagent "+(e.to||""),meta:Z(e.prompt||e.model||"",80)};if(e.type==="subagent_end")return{label:"Subagent "+(e.from||"")+(e.completed===!1?" stopped":" done"),meta:e.duration_ms>0?D(e.duration_ms):""};if(e.type==="hook")return{label:"Hook "+(e.hook_name||""),meta:""};if(e.type==="session_start")return{label:"Session started",meta:e.cwd||""};if(e.type==="session_end")return{label:"Session ended",meta:""};if(e.type==="skill_event")return{label:`Skill: ${e.name||"Name not reported"}`,meta:[Ce(e.phase),e.phase==="reported"&&Number.isFinite(e.reported_spans)&&`${e.reported_spans} distinct spans`,e.source].filter(Boolean).join(" · ")};if(["context_update","session_command"].includes(e.type))return{label:[{context_update:"Context",session_command:"Session command"}[e.type],e.name||e.phase].filter(Boolean).join(": "),meta:[e.name&&e.phase,e.context_tokens!=null&&`${x(e.context_tokens)} context tokens`,e.source].filter(Boolean).join(" · ")};if(e.type==="compaction"){const s=e.before_tokens!=null&&e.after_tokens!=null?x(e.before_tokens)+" to "+x(e.after_tokens)+" tokens":"";return{label:"Compaction"+(e.compaction_count?" "+e.compaction_count:""),meta:[s,e.duration_ms>0?D(e.duration_ms):""].filter(Boolean).join(", ")}}return{label:e.type||"Event",meta:""}}const Ce=e=>({loaded:"Loaded",invoked:"Invoked",reported:"Reported in context",resolved:"Resolved"})[e]||e||"Not reported";function kt(e){return e.type==="user_message"?e.message||e.preview||"":e.type==="api_call"?e.request_preview||e.prompt_preview||"":e.type==="tool_use"?e.params||e.input_preview||e.target||"":e.type==="subagent"?e.prompt||"":e.type==="hook"&&e.hook_input||""}function yt(e){return e.type==="api_response"?e.response||e.response_preview||"":e.type==="api_call"&&e.is_error?e.error_message||"":e.type==="tool_use"?e.result_summary||e.result_preview||"":e.type==="error"?e.error_message||"":e.type==="hook"&&e.hook_output||""}function wt(e,n){const s=e.tokens||{},u=se(e),a=[{c:n,label:"Time",value:new Date(e.ts*1e3).toLocaleTimeString()}];return e.model&&a.push({c:"transparent",label:"Model",value:e.model}),(s.input||s.output)&&a.push({c:"transparent",label:"Input / output",value:x(s.input||0)+" / "+x(s.output||0)}),s.cache_read&&a.push({c:"transparent",label:"Cache read",value:x(s.cache_read)}),e.duration_ms>0&&a.push({c:"transparent",label:"Took",value:D(e.duration_ms)}),e.ttft_ms>0&&a.push({c:"transparent",label:"First token",value:D(e.ttft_ms)}),u.meta&&a.push({c:"transparent",label:"Detail",value:Z(u.meta,60)}),{title:Z(u.label,70),rows:a}}const R="_v:datetime _deleted:bool",Y="session_id:string ts:real",W={session_steps:`step_key:string ${Y} ['kind']:string phase:string name:string turn_id:string agent_id:string context_tokens:long context_limit:long before_tokens:long after_tokens:long ${R}`,requests:`rowid:long ${Y} model:string input_tokens:long output_tokens:long cost_usd:real ${R}`,tool_invocations:`rowid:long ${Y} tool_name:string is_error:long duration_ms:real ${R}`,OTELTraces:"StartTime:datetime SessionId:string TraceID:string SpanID:string Model:string ToolName:string OperationName:string InputTokens:long OutputTokens:long",agents:`agent_id:string session_id:string model:string started_at:real ended_at:real ${R}`,turn_request_links:`request_key:string ${Y} agent_id:string turn_id:string root_session_id:string root_turn_id:string basis:string ${R}`},ge=`step_key:string ${Y} ['kind']:string role:string ['source']:string phase:string turn_id:string text_status:string ${R}`,Tt=`step_key:string session_id:string ['text']:string ${R}`,Je=`rowid:long dedup_key:string ${Y} agent_id:string cost_usd:real ${R}`,Ve=e=>e.split(" ").map(n=>n.split(":")[0]),ue=(e,n)=>`union isfuzzy=true (datatable(${n.split(" ").join(", ")})[]), ${e}`,Te=`| top 500 by ts desc
| order by ts asc, step_key asc`,X="event_time=unixtime_seconds_todatetime(ts)",Re=(e,n)=>`iff(countif(isnotnull(${e})) > 0, sum(${e}), ${n}(null))`,ie={steps:{label:"Session steps timeline",table:"session_steps",description:"The latest 500 recorded steps, oldest first. No prompt or command text.",body:`${Te}
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
| project StartTime, TraceID, SpanID, OperationName, Model, ToolName, InputTokens, OutputTokens`},prompts:{label:"User input prompts",table:"session_steps",fields:ge,keyword:!0,description:"Search retained user messages for a word or phrase. Shows the first 240 characters of the latest 500 matches, oldest first. Missing text is not searchable.",body:(e,n)=>$e(e,n,"user")},assistant:{label:"Public assistant text and visible commentary",table:"session_steps",fields:ge,keyword:!0,description:"Search retained public assistant messages for a word or phrase. Shows the first 240 characters of the latest 500 matches, not private reasoning.",body:(e,n)=>$e(e,n,"assistant")},commands:{label:"Commands: requests, starts and results",table:"session_steps",fields:`${ge} name:string tool_call_id:string agent_id:string exit_code:long`,description:"Shell requests, native starts and tool results are separate events. Session command requests and dispatches are not proof of execution. A preview is shown only when retained.",body:(e,n)=>$e(e,n,"commands")},longest:{label:"Longest completed turn",table:"session_steps",fields:`${W.session_steps} ['source']:string`,description:"Requires one native start and one end for the same session, agent and turn, both in the time range. Incomplete or ambiguous pairs are excluded.",body:`| where ['kind'] == "turn" and isnotempty(turn_id)
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
| project StartTime, TraceID, SpanID, Model, OperationName, reasoning_tokens`},costMain:{label:"Highest recorded turn cost: selected session, main agent",table:"requests",cost:"main",description:"Ranks direct main-agent turns by positive recorded USD, not invoice cost. Coverage includes unlinked and unpriced requests."},costTree:{label:"Highest recorded turn cost: session and linked descendants",table:"requests",cost:"tree",description:"Ranks root turns using explicit links. Coverage includes this session and requests explicitly linked back from other sessions; unlinked outside requests cannot be assigned."},costAll:{label:"Highest recorded turn cost: all sessions",table:"requests",cost:"all",description:"Ranks explicitly linked root turns across all sessions by positive recorded USD. Uses the Flow date bounds, or a seven-day window if a bound is missing."}};function $e(e,n,s){const u=s==="commands",a=u?", ['kind'], name, phase, agent_id, tool_call_id, exit_code":", phase",l=u?`| where (['kind'] == "session_command" and phase in ("requested", "queued", "dispatched"))
    or (name in ("bash", "powershell") and (
        (['kind'] == "tool_call" and phase == "requested" and ['source'] == "assistant.message")
        or (['kind'] == "command" and phase == "started" and ['source'] == "tool.execution_start")
        or (['kind'] == "tool_result" and phase in ("completed", "failed") and ['source'] == "tool.execution_complete")))`:`| where ['kind'] == "message" and role == "${s}" and ['source'] == "${s}.message"
${s==="assistant"?`| where phase in ("", "commentary", "response", "final", "final_answer")
`:""}| where text_status in ("captured", "truncated")`;return`${u?"":`let needle = ${ee(n.keyword)};
`}let selected_steps = materialize(
${e}
${l}
| where isnotempty(step_key)
| project session_id, step_key, ts, turn_id, text_status${a});
selected_steps
| join kind=${u?"leftouter":"inner"} (
    ${ue("session_step_text",Tt)}
    | where step_key in (selected_steps | where text_status in ("captured", "truncated") | project step_key)
    | project session_id, step_key, _v, _deleted, text_preview=substring(trim(@"\\s+", ['text']), 0, 240)${u?"":", matched=isempty(needle) or ['text'] contains needle"}
    | summarize arg_max(_v, *) by step_key
    | where not(coalesce(_deleted, false)) and session_id == sid and isnotempty(text_preview)${u?"":" and matched"}
    | project session_id, step_key, text_preview
) on session_id, step_key
${Te}
| project ${X}, step_key, turn_id${a}, text_status, ${s==="user"?"prompt_preview=text_preview":"text_preview"}`}const Q=e=>typeof e=="string"?e:"",ee=e=>JSON.stringify(Q(e)).replace(/[\u007f-\u009f\u2028\u2029]/g,n=>"\\u"+n.charCodeAt(0).toString(16).padStart(4,"0")),xe=e=>typeof e=="number"?e:Q(e).trim()?Number(e):NaN;function ce(e,n,s){if(e==null||e==="")return"";const u=xe(e);return Number.isFinite(u)?`
| where ${s} ${n} `+(s==="StartTime"?`unixtime_seconds_todatetime(${u})`:u):`
| where false // Invalid Flow time bound`}function xt({since:e,until:n}){const s=l=>Number.isFinite(xe(l))?`unixtime_seconds_todatetime(${xe(l)})`:"datetime(null)",u=e!=null&&e!=="",a=n!=null&&n!=="";return u?`let window_start = ${s(e)};
let window_end = ${a?s(n):"window_start + 7d"};`:`let window_end = ${a?s(n):"now()"};
let window_start = window_end - 7d;`}function St(e,n){const s=e==="all";if(s&&n.includeAllSessions!==!0)return"";const u=e==="tree",a=e==="main",l=s?`
| where ts >= (window_start - datetime(1970-01-01)) / 1s and ts < (window_end - datetime(1970-01-01)) / 1s`:ce(n.since,">=","ts")+ce(n.until,"<","ts"),c=(s?"":a?`
| where isnotempty(sid) and session_id == sid and isempty(agent_id)`:`
| where isnotempty(sid) and (session_id == sid or dedup_key in (possible_descendants))`)+l;return`${s?xt(n):`let sid = ${ee(n.sessionId)};`}
let link_versions = ${ue("turn_request_links",W.turn_request_links)}
| project request_key, _v, _deleted, session_id, agent_id, turn_id, root_session_id, root_turn_id, basis;
${u?`let possible_descendants = link_versions | where root_session_id == sid and isnotempty(request_key) | distinct request_key;
`:""}let request_versions = ${ue("requests",Je)}
| project rowid, _v, _deleted, ts, session_id, agent_id, dedup_key, cost_usd;
let candidate_ids = request_versions${c}
| distinct rowid;
let candidates = materialize(request_versions
| join kind=leftsemi (candidate_ids) on rowid
| summarize arg_max(_v, *) by rowid
| where not(coalesce(_deleted, false))${c}
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
| order by row_type asc`}function qt({table:e,fields:n=W[e],project:s,key:u=e==="session_steps"?"step_key":"rowid",clock:a=e==="OTELTraces"?"StartTime":"ts",model:l,tool:o,body:c,cost:m},b){if(m)return St(m,b);const _=e==="OTELTraces",h=_?"SessionId":"session_id";let k=ue(e,n);return k+=`
| project ${s||Ve(n).join(", ")}`,_?(k+=`
| where isnotempty(sid) and ${h} == sid and isnotempty(TraceID) and isnotempty(SpanID)`,k+=`
| summarize arg_max(StartTime, *) by TraceID, SpanID`):(k+=`
| summarize arg_max(_v, *) by ${u}
| where not(coalesce(_deleted, false))`,k+=`
| where isnotempty(sid) and ${h} == sid`),k+=ce(b.since,">=",a)+ce(b.until,"<",a),l&&Q(b.model)&&(k+=`
| where ${l} == ${ee(b.model)}`),o&&Q(b.tool)&&(k+=`
| where ${o} == ${ee(b.tool)}`),`let sid = ${ee(b.sessionId)};
`+(typeof c=="function"?c(k,b):k+`
`+c)}function Ct(e,n){if(!/^https:\/\//i.test(Q(e))||!n.trim())return null;try{const s=new URL(e);return s.username||s.password||!/^\/[^/]+$/.test(s.pathname)?null:(s.hash="",s.search=new URLSearchParams({web:"1",autorun:"false",query:n}).toString(),s.href)}catch{return null}}const It=[...new Set([...Object.keys(W),"where","project","summarize","order by","top","extend","take","distinct","count","countif","sum","avg","arg_max","isnotempty","isnotnull","unixtime_seconds_todatetime",...[...Object.values(W),...Object.values(ie).map(e=>e.fields).filter(Boolean),Je].flatMap(Ve).map(e=>e.replace(/^\['(.+)'\]$/,"$1"))])],he=e=>[...new Set(e.filter(n=>Q(n).length>0))],ke=e=>Array.isArray(e)?e:[],Mt=10;function Ue(e){var o,c;const{value:n,selectionStart:s,selectionEnd:u}=e;if(s!==u)return{prefix:"",start:s,end:u};const a=((o=n.slice(0,s).match(/[a-z_]\w*$/i))==null?void 0:o[0])||"",l=((c=n.slice(u).match(/^\w+/))==null?void 0:c[0])||"";return{prefix:a,start:s-a.length,end:u+l.length}}function le({id:e,label:n,value:s,options:u,onChange:a,editorRef:l,hint:o,placeholder:c}){const m=qe(null),b=l||m,[_,h]=N(null),[k,g]=N(-1),$=_==null?void 0:_.prefix.toLowerCase(),w=_?u.filter(f=>f.toLowerCase().startsWith($)).slice(0,Mt):[],d=w.length>0,C=f=>`${e}-opt-${f}`,p=w[k]?C(k):void 0;Qe(()=>{var f,S;p&&((S=(f=document.getElementById(p))==null?void 0:f.scrollIntoView)==null||S.call(f,{block:"nearest"}))},[p]);function i(f){h(f),g(-1)}function y(f){const S=b.current;l?(S.setRangeText(f==="kind"?"['kind']":f,_.start,_.end,"end"),a(S.value)):a(f),i(null)}function O(f){const S=f.currentTarget;a(S.value);const M=l?Ue(S):{prefix:S.value};i(!f.isComposing&&(!l||M.prefix)?M:null)}function t(f){if(!f.isComposing){if(l&&f.ctrlKey&&f.key===" "){f.preventDefault(),i(Ue(f.currentTarget));return}if(f.key==="Escape"&&_){f.preventDefault(),f.stopPropagation(),i(null);return}if(f.key==="ArrowDown"||f.key==="ArrowUp"){if(!_&&!l&&u.length)f.preventDefault(),i({prefix:""}),g(0);else if(d){f.preventDefault();const S=w.length;g(f.key==="ArrowDown"?(k+1)%S:k<0?S-1:(k+S-1)%S)}}else f.key==="Enter"&&p?(f.preventDefault(),y(w[k])):["Tab","ArrowLeft","ArrowRight","Home","End"].includes(f.key)&&i(null)}}const T={id:e,ref:b,value:s,placeholder:c,"aria-describedby":o,"aria-autocomplete":"list","aria-controls":e+"-list","aria-activedescendant":p,autocomplete:"off",spellcheck:!1,onInput:O,onKeyDown:t,onBlur:()=>i(null)};return r`<div class="bd-kql-field">
    <label for=${e}>${n}</label>
    ${l?r`<textarea ...${T} rows="9" onClick=${()=>i(null)}/>`:r`<input ...${T} role="combobox" aria-expanded=${d} onFocus=${()=>i({prefix:""})}/>`}
    <ul class="bd-kql-options" id=${e+"-list"} role="listbox" aria-label=${n+" suggestions"} hidden=${!d}>
      ${w.map((f,S)=>r`<li key=${f} id=${C(S)} role="option" aria-selected=${S===k}
        onMouseDown=${M=>M.preventDefault()} onClick=${()=>y(f)}>${f}</li>`)}
    </ul>
    ${_&&!l&&!d&&r`<small role="status">${s?"No matching suggestion. Using the value you typed.":"No observed values."}</small>`}
  </div>`}function Ot({id:e,generated:n,url:s}){const[u,a]=N(n),[l,o]=N(""),c=qe(null),m=e+"-hint",b=Ct(s,u),_=k=>{o(""),a(k)};async function h(){try{await navigator.clipboard.writeText(u),o("Query copied.")}catch{c.current.focus(),c.current.select(),o("Query selected. Use your device’s Copy command.")}}return r`<p id=${m}>Edit the KQL below. Type a prefix or press Ctrl+Space for tables, columns and operators.
    Changing an example or filter replaces your edits.</p>
    <${le} id=${e} label="KQL query" value=${u} options=${It} onChange=${_} editorRef=${c} hint=${m}/>
    <div class="bd-kql-actions">
      ${b&&r`<a class="bd-btn bd-p" href=${b} target="_blank" rel="noopener noreferrer">Open in Kusto</a>`}
      <button type="button" class="bd-btn" disabled=${!u.trim()} onClick=${h}>Copy query</button>
      ${u!==n&&r`<button type="button" class="bd-btn" onClick=${()=>_(n)}>Restore example</button>`}
      <span role="status">${l}</span>
    </div>
    <p>${b?"Opens in Azure Data Explorer without running the query.":u.trim()?"No Kusto database link is available. You can still copy the query.":"Enter a query to copy or open it."}</p>`}const Nt={steps:"Steps",requests:"Requests & USD",tools:"Tool activity",failures:"Failed tools",context:"Context & reset",spans:"OTel spans",prompts:"User prompts",assistant:"Assistant text",commands:"Commands",longest:"Longest turn",subagents:"Subagents",sizes:"Response bytes",mcp:"MCP calls",reasoning:"Reasoning tok",costMain:"Turn cost (main)",costTree:"Turn cost (tree)",costAll:"Turn cost (all)"};function Et({base:e,url:n,sessionId:s,sessions:u,models:a,tools:l,since:o,until:c,flowFilters:m}){const[b,_]=N("steps"),[h,k]=N(Q(s)),[g,$]=N(""),[w,d]=N(""),[C,p]=N(""),[i,y]=N(null),O=e+"-hint",t=ie[b],T=t.cost==="all",f=JSON.stringify([o,c]),S=T&&i===f,M=qt(t,{sessionId:h,model:g,tool:w,keyword:C,since:o,until:c,includeAllSessions:S}),v=!!(m&&(m.tool_name||m.category||m.failed||m.q)),H=()=>{if(!m)return;let q=b;m.failed?q="failures":m.category==="tools"||m.tool_name?q="tools":m.category==="prompts"?q="prompts":m.category==="models"?q="requests":m.category==="agents"?q="subagents":m.category==="context"&&(q="context"),_(q),y(null),m.tool_name&&d(m.tool_name),m.q&&(q==="prompts"||q==="assistant")&&p(m.q)};return r`<div class="bd-kql-body">
    ${v&&r`<div class="bd-kql-sync">
      <span>Active Flow filters detected (${[m.category&&`category=${m.category}`,m.tool_name&&`tool=${m.tool_name}`,m.failed&&"failures only",m.q&&`q="${m.q}"`].filter(Boolean).join(" · ")})</span>
      <button type="button" class="bd-btn bd-kql-syncbtn" onClick=${H}>Sync with Flow filters</button>
    </div>`}
    <div class="bd-kql-pills" role="group" aria-label="KQL preset shortcuts">
      ${Object.entries(ie).map(([q,j])=>r`<button type="button" key=${q}
        class=${"bd-kql-pill"+(b===q?" bd-on":"")} title=${j.label}
        onClick=${()=>{_(q),y(null),p("")}}>${Nt[q]||q}</button>`)}
    </div>
    <label class="bd-kql-field">Example<select value=${b} onChange=${q=>{_(q.currentTarget.value),y(null),p("")}}>
      ${Object.entries(ie).map(([q,j])=>r`<option value=${q} key=${q}>${j.label}</option>`)}
    </select></label>
    <p><code>${t.table}</code> · ${t.description}</p>
    <div class="bd-kql-filters">
      ${T?r`<label><input type="checkbox" checked=${S}
        onChange=${q=>y(q.currentTarget.checked?f:null)}/> Include all sessions in this date range</label>`:r`<${le} id=${e+"-sid"} label="Session ID" value=${h} options=${he([s,...ke(u)])} onChange=${k} hint=${O} placeholder="Enter a session ID"/>`}
      ${t.model&&r`<${le} id=${e+"-model"} key="model" label="Model (optional)" value=${g} options=${he(ke(a))} onChange=${$} hint=${O} placeholder="Any model"/>`}
      ${t.tool&&r`<${le} id=${e+"-tool"} key="tool" label="Tool name (optional)" value=${w} options=${he(ke(l))} onChange=${d} hint=${O} placeholder="Any tool"/>`}
      ${t.keyword&&r`<label class="bd-kql-field">Keyword or phrase (optional)
        <input type="text" value=${C} onInput=${q=>p(q.currentTarget.value)} autocomplete="off" placeholder="Search retained text"/>
      </label>`}
    </div>
    ${!h&&!T&&r`<p>Enter a session ID. An empty ID matches no rows.</p>`}
    ${t.keyword&&r`<p>The search term is included in the Kusto link. Matching text is returned only when you run the query in Kusto.</p>`}
    <p id=${O}>Type a prefix for suggestions. Use ↑ or ↓ and Enter to choose, or Esc to dismiss.
      Examples use Flow’s time range, not its event-list filters.</p>
    ${M&&r`<${Ot} id=${e+"-editor"} key=${M} generated=${M} url=${n}/>`}
  </div>`}function Lt({url:e,sessionId:n,sessions:s,models:u,tools:a,since:l,until:o,flowFilters:c}){const[m,b]=N(!1),_="session-kql-"+We();return r`<details class="bd-kql" onToggle=${h=>{h.currentTarget.open&&b(!0)}}>
    <summary>Query in Kusto</summary>
    ${m&&r`<${Et} key=${n} ...${{base:_,url:e,sessionId:n,sessions:s,models:u,tools:a,since:l,until:o,flowFilters:c}}/>`}
  </details>`}const At="aictl-pref-session_flow_mode";function Dt(e,n){if(!n)return"";const s=JSON.stringify(String(n));if(e.type==="tool_use"){const u=e.to?` and tool_name == ${JSON.stringify(String(e.to))}`:"",a=e.success===!1?" and is_error == 1":"";return`tool_invocations
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
| project event_time=unixtime_seconds_todatetime(ts), step_key, ['kind'], phase, name, agent_id, turn_id`}function jt({ev:e,sessionId:n,onClose:s}){const u=se(e),a=e.tokens||{},l=e.type==="api_call"?x(a.input||0)+" tokens in":e.type==="api_response"?x(a.output||0)+" tokens out":e.result_size?e.result_size+" B out":e.prompt_length?e.prompt_length+" characters":F,o=e.decision||(e.success===!1||e.success==="false"?"Failed":e.success===!0||e.success==="true"?"OK":F),c=[["Type",e.type==="user_message"?"User input prompt":e.type||F],["Time",fe(e.ts,!0)],["Took",e.duration_ms?D(e.duration_ms):F],["Size",l],["Model",e.model||F],["Result",o]];e._rt&&c.push(["Turn tokens",x(e._rt)]),e._cum&&c.push(["Session cumulative",x(e._cum)]),e.agent_id&&e.type!=="skill_event"&&c.push(["Subagent ID",e.agent_id]),e.type==="skill_event"&&(c.splice(0,c.length,["Skill",e.name],["Evidence",Ce(e.phase)],["Source",e.source],[e.phase==="reported"?"First reported in range":"Time",fe(e.ts,!0)]),e.phase==="reported"&&c.push(["Last reported in range",fe(e.last_ts,!0)],["Distinct spans",x(e.reported_spans)]),e.agent_id&&c.push(["Agent ID",e.agent_id])),e.type==="user_message"&&c.push(["Source",e.source||F],["Text",e.text_status||(e.redacted?"Not retained":"Recorded")]);const m=ze(kt(e)),b=ze(yt(e)),_=Dt(e,n),h=de[e.type]||{lane:"tool"},g=e.type==="api_call"&&e.is_error||e.type==="error"||e.type==="tool_use"&&e.success===!1?E.error:e.type==="skill_event"?"var(--warn)":E[h.lane]||"var(--ink3)";return r`<aside class="bd-ag-insp bd-flow-side" role="region" aria-label="Selected event">
    <div class="bd-ag-insph">
      <span class="bd-ag-lane" style=${{color:g,borderColor:g}}>${e.type==="skill_event"?"skill":h.lane}</span>
      <b title=${u.label}>${u.label}</b>
      ${e._turnIndex>0&&r`<span class="bd-flow-turn-num">Turn #${e._turnIndex}</span>`}
      <button type="button" class="bd-btn" onClick=${s}>Close</button>
    </div>
    <dl class="bd-ag-kv">${c.map(([$,w])=>r`<div key=${$}><dt>${$}</dt><dd>${w}</dd></div>`)}</dl>
    ${m?r`<div class="bd-ag-sect">${e.type==="user_message"?"Your prompt":"Input"}</div><pre class="bd-ag-pre">${m}</pre>`:null}
    ${b?r`<div class="bd-ag-sect">Output</div><pre class="bd-ag-pre">${b}</pre>`:null}
    ${_?r`<div class="bd-ag-sect">Correlated KQL Snippet</div><pre class="bd-ag-pre bd-insp-kql">${_}</pre>`:null}
  </aside>`}const Se=(e,n)=>s=>lt(s.clientX,s.clientY,wt(e,n)),B=e=>e.step_key||e.event_id||e;function Pt({turnGroups:e,activeTurn:n,onSelectTurn:s}){if(!e||e.length<2)return null;const u=Math.max(1,...e.map(l=>l.tokens||0)),a=e.reduce((l,o)=>!l||(o.tokens||0)>(l.tokens||0)?o:l,null);return r`<div class="bd-flow-scrubber" role="region" aria-label="Session turn scrubber">
    <div class="bd-flow-scrub-meta">
      <strong>Turn Scrubber (${x(e.length)} turns)</strong>
      ${a&&a.tokens>0?r`<span>Peak: Turn #${a.turnIndex} (${x(a.tokens)} tok)</span>`:null}
      ${n!=null?r`<button type="button" class="bd-btn bd-flow-scrub-clear" onClick=${()=>s(null)}>Turn #${n} selected ×</button>`:null}
    </div>
    <div class="bd-flow-scrub-track">
      ${e.map(l=>{const o=Math.max(16,Math.round((l.tokens||1)/u*100)),c=a&&l.turnIndex===a.turnIndex&&l.tokens>0,m=n===l.turnIndex,b=["bd-flow-sbar",c?"bd-peak":"",l.errors>0?"bd-has-err":"",l.skills.length>0?"bd-has-skill":"",m?"bd-on":""].filter(Boolean).join(" "),_=`Turn #${l.turnIndex} (${U(l.startTs)}): ${x(l.tokens)} tok`+(l.errors?` · ${l.errors} failed`:"")+(l.skills.length?` · skill: ${l.skills.join(", ")}`:"")+(l.promptText?` — ${l.promptText.slice(0,80)}`:"");return r`<button type="button" key=${l.turnIndex} class=${b} style=${{height:o+"%"}}
          title=${_} aria-label=${`Turn ${l.turnIndex}`} aria-pressed=${m?"true":"false"}
          onClick=${()=>s(m?null:l.turnIndex)}/>`})}
    </div>
  </div>`}function vt({events:e,sel:n,onSel:s}){const[u,a]=N({}),l=o=>a(c=>({...c,[o]:!c[o]}));return r`<div class="bd-flow-colhdr" aria-hidden="true">
    <span>Time</span>
    <span>Actor / Kind</span>
    <span>Step / Command / Target</span>
    <span class="bd-flow-colhdr-r">Tokens</span>
    <span>Turn Timeline Waterfall</span>
  </div>
  <ul class="bd-ag-tl" aria-label="Events, oldest first">${e.map((o,c)=>{var d;const m=de[o.type]||{lane:"tool",kind:"request"},b=o.type==="api_call"&&o.is_error||o.type==="error"||o.type==="tool_use"&&o.success===!1,_=b?E.error:o.type==="skill_event"?"var(--warn)":E[m.lane]||"var(--ink3)",h=se(o),k=n===B(o),g=o._turnGroup,$=g&&u[g.turnIndex]&&!o._isTurnStart&&!k,w=o.duration_ms>0?D(o.duration_ms):"";return r`<li key=${o.step_key||o.event_id||c} hidden=${!!$}>
      ${o._isTurnStart&&g&&r`<div class="bd-flow-turn-hdr">
        <button type="button" class="bd-flow-turn-toggle" onClick=${()=>l(g.turnIndex)}
          aria-expanded=${u[g.turnIndex]?"false":"true"}>
          <span class="bd-flow-turn-chev">${u[g.turnIndex]?"▸":"▾"}</span>
          <span class="bd-flow-turn-num">Turn #${g.turnIndex}${g.isPartialStart?" · CONT.":""}</span>
          <span class="bd-flow-turn-ts">${U(g.startTs)}${g.endTs>g.startTs?" → "+U(g.endTs):""}</span>
          <span class="bd-flow-turn-prompt">${g.promptText}</span>
        </button>
        <div class="bd-flow-turn-badges">
          ${g.skills.length>0&&r`<span class="bd-flow-tbadge bd-warn">★ ${g.skills.join(", ")}</span>`}
          ${g.errors>0&&r`<span class="bd-flow-tbadge bd-crit">${g.errors} ${g.errors===1?"Failure":"Failures"}</span>`}
          ${g.subagents>0&&r`<span class="bd-flow-tbadge">${g.subagents} ${g.subagents===1?"Subagent":"Subagents"}</span>`}
          ${g.apiCalls>0&&r`<span class="bd-flow-tbadge">${x(g.apiCalls)} API</span>`}
          ${g.tokens>0&&r`<span class="bd-flow-tbadge bd-focus">${x(g.tokens)} tok</span>`}
          ${g.durationMs>0&&r`<span class="bd-flow-tbadge">${D(g.durationMs)}</span>`}
        </div>
      </div>`}
      <button type="button" class=${"bd-ag-tlrow"+(k?" bd-on":"")+(b?" bd-err-row":"")} aria-expanded=${k?"true":"false"}
        onClick=${()=>s(k?null:B(o))} onMouseMove=${Se(o,_)} onMouseLeave=${we}>
        <span class="bd-ag-when">${U(o.ts)}${o._cum?r`<em>${x(o._cum)+" total"+(o._rt?", "+x(o._rt)+" this turn":"")}</em>`:null}</span>
        <span class="bd-ag-body-actor">
          <span class="bd-ag-dot" style=${{borderColor:_,background:m.kind==="reply"||m.kind==="marker"?_:"transparent"}}></span>
          <span class="bd-ag-lane" style=${{color:_,borderColor:_}}>${o.type==="skill_event"?"skill":m.lane}</span>
        </span>
        <span class="bd-ag-body">
          <span class="bd-ag-body-top">
            ${o.agent_id&&r`<span class="bd-flow-subtag" title=${o.agent_id}>agent:${String(o.agent_id).slice(0,8)}</span>`}
            <span class="bd-ag-lbl">${h.label}</span>
          </span>
          ${h.meta?r`<span class="bd-ag-meta">${h.meta}</span>`:null}
        </span>
        <span class="bd-ag-size">${h.size||((d=o.tokens)!=null&&d.input?"+"+x((o.tokens.input||0)+(o.tokens.output||0))+" tok":"")}</span>
        <span class="bd-ag-wf" aria-hidden="true">
          <span class="bd-ag-wftrack"><i class="bd-ag-wfbar" style=${{left:(o._wfOffsetPct||0)+"%",width:(o._wfWidthPct||8)+"%",background:_}}></i></span>
          <span class="bd-ag-wfdur">${w}</span>
        </span>
      </button>
    </li>`})}</ul>`}function zt({events:e,participants:n,filtered:s,sel:u,onSel:a,toolLabel:l}){const[o,c]=N(!1),[m,b]=He("aictl-pref-flow-lanes","individual",["individual","grouped"]),_=K(()=>{const d=["main"];for(const C of e)C.agent_id&&!d.includes(C.agent_id)&&d.push(C.agent_id);return d},[e]),{lanes:h,columns:k}=K(()=>ht(e,n,s,m==="grouped"),[e,n,s,m]),g=h.length||1,$=d=>k.get(d)??-1,w=d=>(d+.5)/g*100;return o&&_.length>1?r`<div class="bd-ag-bar bd-flow-slmode">
      <${re} label="Swim-lane layout" value="streams" onPick=${d=>c(d==="streams")}
        items=${[["participants","Participant arrows"],["streams","Session & Subagent streams"]]}/>
      <span class="bd-ag-dim">Each column is an execution stream (Main session + Subagents); models and tools render inline without wasting columns.</span>
    </div>
    <div class="bd-ag-sl bd-ag-sl-streams" role="list" aria-label="Events between participants, oldest first">
      <div class="bd-flow-stream-hdr" style=${{gridTemplateColumns:`68px repeat(${_.length}, minmax(210px, 1fr))`}}>
        <span>Time</span>
        ${_.map((d,C)=>r`<b key=${d} class="bd-flow-stream-colh">
          <i class="bd-sw" style=${{background:C===0?"var(--s1)":"var(--s5)",marginRight:"5px"}}/>
          ${d==="main"?`Main Session (${l||"root"})`:`Subagent ${String(d).slice(0,8)}`}
        </b>`)}
      </div>
      ${e.map((d,C)=>{const p=se(d),i=u===B(d),y=d.type==="error"||d.is_error||d.type==="tool_use"&&d.success===!1,O=y?E.error:d.type==="skill_event"?"var(--warn)":E[(de[d.type]||{}).lane]||"var(--ink2)",t=d.agent_id&&_.includes(d.agent_id)?d.agent_id:"main";return r`<div key=${d.step_key||d.event_id||C} role="listitem">
          <button type="button" class=${"bd-flow-stream-row"+(i?" bd-on":"")}
            style=${{gridTemplateColumns:`68px repeat(${_.length}, minmax(210px, 1fr))`}}
            aria-expanded=${i?"true":"false"} aria-label=${U(d.ts)+" "+p.label}
            onClick=${()=>a(i?null:B(d))} onMouseMove=${Se(d,O)} onMouseLeave=${we}>
            <span class="bd-flow-stream-ts">${U(d.ts)}</span>
            ${_.map(T=>r`<span key=${T} class="bd-flow-stream-cell">
              ${T===t?r`<span class=${"bd-flow-stream-card"+(y?" bd-err":d.type==="skill_event"?" bd-skill":"")}>
                <span class="bd-flow-sc-top"><strong><i class="bd-sw" style=${{background:O,marginRight:"5px"}}/>${p.label}</strong>${d.duration_ms>0?r`<em>${D(d.duration_ms)}</em>`:null}</span>
                ${p.meta?r`<span class="bd-flow-sc-meta">${p.meta}</span>`:null}
              </span>`:null}
            </span>`)}
          </button>
        </div>`})}
    </div>`:r`<div class="bd-ag-bar bd-flow-slmode">
    ${_.length>1&&r`<${re} label="Swim-lane layout" value="participants" onPick=${d=>c(d==="streams")}
      items=${[["participants","Participant arrows"],["streams","Session & Subagent streams ("+_.length+")"]]}/>`}
    <${re} label="Participant lanes" value=${m} onPick=${b}
      items=${[["individual","Individual lanes"],["grouped","Group lanes"]]}/>
  </div>
  <div class="bd-ag-sl" style=${{"--flow-diagram-width":158+g*96+"px","--flow-lane-pitch":100/g+"%"}} tabindex="0" role="list" aria-label="Events between participants, oldest first">
    <div class="bd-ag-slhead" aria-hidden="true"><span>Total</span><span>Turn</span><span>Time</span>
      <span class="bd-ag-slarea">${h.map((d,C)=>r`<b key=${d.id} style=${{left:w(C)+"%",color:d.color,borderColor:d.color}} title=${d.label}>${d.label}</b>`)}</span>
    </div>
    ${e.map((d,C)=>{const p=$(d._from),i=$(d._to),y=se(d),O=u===B(d),t=h[i],T=d.type==="error"||d.is_error?E.error:d.type==="user_message"?E.user:d.type==="api_response"?E.api:(t==null?void 0:t.color)||"var(--ink2)";let f;if(p<0||i<0){const S=E[(de[d.type]||{}).lane]||"var(--ink3)";f=r`<span class="bd-ag-marker" style=${{color:S,borderColor:S}}>${y.label}${y.meta?" · "+y.meta:""}</span>`}else{const S=Math.min(p,i),M=Math.max(p,i),v=i>p;f=r`<span class="bd-ag-arrow" style=${{left:w(S)+"%",width:w(M)-w(S)+"%",borderColor:T}}>
          <span class=${"bd-ag-head"+(v?" bd-r":" bd-l")} style=${{color:T}}></span>
        </span>
        <span class="bd-ag-alabel" style=${{left:(w(S)+w(M))/2+"%",color:T}} title=${y.label}>${y.label}${y.meta?r`<em>${y.meta}</em>`:null}</span>`}return r`<div key=${d.step_key||d.event_id||C} role="listitem">
        <button type="button" class=${"bd-ag-slrow"+(O?" bd-on":"")} aria-expanded=${O?"true":"false"} aria-label=${U(d.ts)+" "+y.label}
          onClick=${()=>a(O?null:B(d))} onMouseMove=${Se(d,T)} onMouseLeave=${we}>
          <span>${d._cum?x(d._cum):""}</span><span>${d._rt?x(d._rt):""}</span><span>${U(d.ts)}</span>
          <span class="bd-ag-slarea">${f}</span>
        </button>
      </div>`})}
  </div>`}const z=e=>{var n;return((n=e==null?void 0:e.summary)==null?void 0:n.omitted_events)||0},Fe=e=>{const n=(e.turns||[]).length;return z(e)?"Newest "+x(n)+" of "+x(n+z(e))+" events":x(n)+" events"},Ke=500,Be=1e3,ye=5e3,G={q:"",category:"",tool_name:"",flow_agent:"",skill_name:"",skill_phase:"",failed:!1,range:"whole",start:"",end:""},Rt=["prompts","messages","models","tools","skills","agents","context","hooks","lifecycle"];function Ut({apply:e,scope:n,bounds:s,initialCategory:u,activeCategory:a,activeFailed:l}){var d,C,p;const[o,c]=N(()=>({...G,category:u})),[m,b]=N(""),_=We(),h=(i,y)=>{c(O=>({...O,[i]:y})),b("")},k=i=>{i.preventDefault();const y=new URLSearchParams,O=["q","category","flow_agent",...o.category==="skills"?["skill_name","skill_phase"]:["tool_name"]];for(const T of O)o[T].trim()&&y.set(T,o[T].trim());o.failed&&o.category!=="skills"&&y.set("failed","1");let t;if(o.range==="custom")t=it(o.start,o.end);else if(o.range!=="whole"){if(!Number.isFinite(s.end)){b("The session end time has not been reported.");return}t={since:s.end-Number(o.range),until:s.end}}if(t!=null&&t.error){b(t.error);return}t&&(y.set("since",Math.floor(t.since)),y.set("until",Math.ceil(t.until))),b(""),e(y.toString())},g=i=>{if(i!=="custom"){h("range",i);return}b(""),c(y=>({...y,range:i,start:y.start||(Number.isFinite(s.start)?ve(s.start):""),end:y.end||(Number.isFinite(s.end)?ve(Math.ceil(s.end/60)*60):"")}))},$=i=>{const y={...G,category:a===i?"":i};c(y),b(""),e(y.category?"category="+i:"")},w=()=>{const i=!l,y={...G,failed:i};c(y),b(""),e(i?"failed=1":"")};return r`<form class="bd-flow-filters" role="search" aria-label="Flow filters" onSubmit=${k}>
    <div class="bd-flow-quickbar">
      <button type="button" class=${"bd-btn bd-flow-qpill"+(!a&&!l?" bd-on":"")}
        aria-pressed=${!a&&!l} onClick=${()=>{c(G),b(""),e("")}}>All events</button>
      <button type="button" class=${"bd-btn bd-flow-qpill"+(a==="prompts"?" bd-on":"")}
        aria-pressed=${a==="prompts"} onClick=${()=>$("prompts")}>User prompts</button>
      <button type="button" class=${"bd-btn bd-flow-qpill"+(a==="models"?" bd-on":"")}
        aria-pressed=${a==="models"} onClick=${()=>$("models")}>Model rounds</button>
      <button type="button" class=${"bd-btn bd-flow-qpill"+(a==="tools"?" bd-on":"")}
        aria-pressed=${a==="tools"} onClick=${()=>$("tools")}>Tool uses</button>
      <button type="button" class=${"bd-btn bd-flow-qpill"+(a==="agents"?" bd-on":"")}
        aria-pressed=${a==="agents"} onClick=${()=>$("agents")}>Subagents</button>
      <button type="button" class=${"bd-btn bd-flow-qpill bd-flow-qskill"+(a==="skills"?" bd-on":"")}
        aria-pressed=${a==="skills"} onClick=${()=>$("skills")}>Skills</button>
      <button type="button" class=${"bd-btn bd-flow-qpill bd-flow-qerr"+(l?" bd-on":"")}
        aria-pressed=${!!l} onClick=${w}>Failed steps</button>
      <label class="bd-flow-search"><span class="bd-flow-srchlbl">${o.category==="prompts"?"Search prompt text":"Search events"}</span><input type="search" placeholder=${o.category==="prompts"?"Words you wrote in this session":"Search prompt, tool, path, error..."} value=${o.q} onInput=${i=>h("q",i.currentTarget.value)}/></label>
    </div>
    <div class="bd-flow-filter-row">
      <label><span>Category</span><select value=${o.category} onChange=${i=>h("category",i.currentTarget.value)}>
        <option value="">All categories</option>${Rt.map(i=>r`<option key=${i} value=${i}>${i==="prompts"?"User prompts only":i[0].toUpperCase()+i.slice(1)}</option>`)}
      </select></label>
      ${o.category==="skills"?r`<label><span>Skill name</span><input list=${_+"-skills"} placeholder="Any skill" value=${o.skill_name} onInput=${i=>h("skill_name",i.currentTarget.value)}/></label>
        <datalist id=${_+"-skills"}>${(d=n==null?void 0:n.skills)==null?void 0:d.map(i=>r`<option value=${i} key=${i}/>`)}</datalist>
        <label><span>Skill evidence</span><select value=${o.skill_phase} onChange=${i=>h("skill_phase",i.currentTarget.value)}>
          <option value="">All evidence</option>${["loaded","invoked","reported","resolved"].map(i=>r`<option key=${i} value=${i}>${Ce(i)}</option>`)}
        </select></label>`:r`<label><span>Tool name</span><input list=${_+"-tools"} placeholder="Any tool" value=${o.tool_name} onInput=${i=>h("tool_name",i.currentTarget.value)}/></label>`}
      <datalist id=${_+"-tools"}>${(C=n==null?void 0:n.tools)==null?void 0:C.map(i=>r`<option key=${i} value=${i}/>`)}</datalist>
      <label><span>Agent ID</span><input list=${_+"-agents"} placeholder="Any agent" value=${o.flow_agent} onInput=${i=>h("flow_agent",i.currentTarget.value)}/></label>
      <datalist id=${_+"-agents"}>${(p=n==null?void 0:n.agents)==null?void 0:p.map(i=>r`<option key=${i} value=${i}/>`)}</datalist>
      <label><span>Time range</span><select value=${o.range} onChange=${i=>g(i.currentTarget.value)}>
        <option value="whole">Whole session</option><option value="900" disabled=${!Number.isFinite(s.end)}>Last 15 min of session</option>
        <option value="3600" disabled=${!Number.isFinite(s.end)}>Last hour of session</option><option value="custom">Custom range</option>
      </select></label>
      ${o.range==="custom"&&r`<label><span>From (local)</span><input type="datetime-local" value=${o.start} onInput=${i=>h("start",i.currentTarget.value)}/></label>
        <label><span>To (local)</span><input type="datetime-local" value=${o.end} onInput=${i=>h("end",i.currentTarget.value)}/></label>`}
      <div class="bd-flow-actions">${o.category!=="skills"&&r`<label class="bd-ag-check"><input type="checkbox" checked=${o.failed} onChange=${i=>h("failed",i.currentTarget.checked)}/>Failures only</label>`}
        <button type="submit" class="bd-btn bd-p">Apply filters</button>
        <button type="button" class="bd-btn" onClick=${()=>{c(G),b(""),e("")}}>Reset filters</button>
      </div>
    </div>
    ${m&&r`<span class="bd-ag-bad" role="alert">${m}</span>`}
  </form>`}function Ft(e){if(!e)return null;try{const n=new URL(e);return["https:","http:"].includes(n.protocol)?n.href:null}catch{return null}}function Vt(e){return r`<${Kt} key=${e.a.id} ...${e}/>`}function Kt({a:e,st:n,ctx:s,act:u,flowRef:a,sid:l,captureMode:o,initialEvidence:c=!1,initialPrompts:m=!1,initialSkills:b=!1,agentData:_}){var Me,Oe,Ne,Ee,Le,Ae,De,je;const h=ut(n)?s.refreshKey:0,[k,g]=N(Ke),$=m?"prompts":b?"skills":"",[w,d]=N($?"category="+$:""),C="limit="+k+(w?"&"+w:""),{data:p,error:i}=ct(I=>at(e.id,C,I),JSON.stringify(["flow",e.id,C]),h),[y,O]=He(At,"timeline",["timeline","swimlane"]),[t,T]=N(c),[f,S]=N(c),[M,v]=N(null);Qe(()=>{T(c),c&&S(!0)},[c]);const H=t?"source":y,[q,j]=N(null),ne=qe({});p&&!new URLSearchParams(w).has("since")&&!new URLSearchParams(w).has("until")&&(!w||!ne.current.end)&&(ne.current={start:((Me=p.scope)==null?void 0:Me.start)??e.started_at,end:((Oe=p.scope)==null?void 0:Oe.end)??e.ended_at??((Ee=(Ne=p.turns)==null?void 0:Ne.at(-1))==null?void 0:Ee.ts)});const Ye={start:ne.current.start??e.started_at,end:ne.current.end??e.ended_at},pe=s.toolName?s.toolName(e.tool):e.tool,J=K(()=>$t((p==null?void 0:p.turns)||[],pe,p==null?void 0:p.summary),[p,pe]),me=K(()=>a?J.events.filter(I=>I[a.field]===a.id&&(!a.traceId||I.trace_id===a.traceId)):J.events,[J,a]),V=K(()=>M!=null?me.filter(I=>I._turnIndex===M):me,[me,M]),_e=K(()=>q!=null&&V.find(I=>B(I)===q)||null,[V,q]),Ge=I=>{T(I==="source"),I==="source"?S(!0):O(I)},Xe=I=>{I!==w&&(j(null),v(null),d(I),g(Ke))},be=Ft(p==null?void 0:p.session_kql_url),L=p==null?void 0:p.scope,oe=l||(p==null?void 0:p.session_id),Ie=(Le=s.data)==null?void 0:Le.agents,Ze=K(()=>[...new Set([oe,...(Ie||[]).map(I=>{var Pe;return I.native_session_id?I.native_session_id:I.placeholder||(Pe=I.id)!=null&&Pe.startsWith("live:")||I.runtime_present&&!I.queryable?null:I.session_id||I.parent_id||I.id})].filter(Boolean))],[oe,Ie]),P=new URLSearchParams(w),et=P.has("since")?Number(P.get("since")):null,tt=P.has("until")?Number(P.get("until")):null,st=l===void 0?e.native_session_id||e.session_id||(p==null?void 0:p.session_id):l,nt=w?"Summary counts all events in the selected time span.":p&&Fe(p),A=J.summary,ot=[{label:"Turns",value:x(A.turns),title:"Prompts in the session"},{label:"Tool calls",value:x(A.toolCalls)},{label:"Subagents",value:x(A.subagents)},{label:"Hooks",value:x(A.hooks)},{label:"Errors",value:x(A.errors)},{label:"Compactions",value:x(A.compactions)},{label:"Tokens, total",value:x(A.cumulative),title:"Input and output of every model call, added up"},{label:"Largest turn",value:x(A.roundTrip),title:"The most input and output tokens between two prompts"},{label:"First token",value:A.ttft==null?F:D(A.ttft),sub:A.ttftCalls?"median of "+A.ttftCalls+" calls":"",title:"Time to first token"}];return r`<${pt} a=${e}/>
    ${p&&!((Ae=p.summary)!=null&&Ae.skill_evidence)&&r`<${ae} key="summary" id="agfs" title="Summary" sub=${nt}><${rt} stats=${ot}/></${ae}>`}
    <${ae} key="flow" id="agfl" title="Flow" sub=${t?"Search retained source records separately from flow events.":z(p)&&!w?"Oldest first. The "+x(z(p))+" oldest events are left out; the summary counts them.":"Oldest first. Select an event to read it."}>
      <div class="bd-ag-bar bd-flow-toolbar">
        <${re} label="Flow view" value=${H} onPick=${Ge} items=${[["timeline","Timeline"],["swimlane","Swim-lane"],["source","Source steps"]]}/>
        ${p&&!t&&r`<span class="bd-flow-status" role="status">${L&&L.matched!=null&&L.total!=null?`Showing ${V.length.toLocaleString()} · ${L.matched.toLocaleString()} matched of ${L.total.toLocaleString()} events in range`:Fe(p)}</span>`}
        ${p&&!t&&z(p)&&k<ye?r`<button type="button" class="bd-btn" onClick=${()=>g(I=>Math.min(ye,I+Be))}>${"Show "+Math.min(z(p),Be).toLocaleString("en-US")+" older events"}</button>`:null}
        ${p&&!t&&z(p)&&k>=ye?r`<span class="bd-ag-dim">${x(z(p))} older matching events remain outside the display limit.</span>`:null}
        ${be&&r`<a class="bd-btn bd-flow-kusto" href=${be} target="_blank" rel="noopener noreferrer">Open session in Kusto</a>`}
      </div>
      ${be&&r`<${Lt} url=${p.session_kql_url} sessionId=${oe} sessions=${Ze}
        models=${(De=L==null?void 0:L.models)!=null&&De.length?L.models:e.models||[]} tools=${(L==null?void 0:L.tools)||[]} since=${et} until=${tt}
        flowFilters=${Object.fromEntries(P)}/>`}
      <div hidden=${t}>
        <${Ut} scope=${L} bounds=${Ye} apply=${Xe} initialCategory=${$}
          activeCategory=${P.get("category")} activeFailed=${P.get("failed")==="1"}/>
        ${p&&r`<${Pt} turnGroups=${J.turnGroups} activeTurn=${M} onSelectTurn=${v}/>`}
        ${P.get("category")==="skills"&&r`<p class="bd-note">Loaded files and invocations are separate records. “Reported in context” groups OTel spans by skill; it does not count skill loads.</p>`}
        ${P.get("category")==="prompts"&&r`<p class="bd-note">User input only. Select a row to read the retained prompt. Assistant replies and delegated instructions are not included.</p>`}
        ${a&&r`<div class="bd-ag-bar"><span>${a.label} ID: ${a.id}</span><button type="button" class="bd-btn" onClick=${()=>{j(null),u.setDrawerTab("flow")}}>Show full flow</button></div>`}
        ${p?V.length?!t&&r`<div class=${"bd-flow-workspace"+(_e?" bd-has-insp":"")}>
            <div class="bd-flow-main">
              ${y==="swimlane"?r`<${zt} events=${V} participants=${J.participants} filtered=${!!(w||a)} sel=${q} onSel=${j} toolLabel=${pe}/>`:r`<${vt} events=${V} sel=${q} onSel=${j}/>`}
            </div>
            ${_e&&r`<${jt} ev=${_e} sessionId=${oe} onClose=${()=>j(null)}/>`}
          </div>`:r`<div class="bd-empty">${a?"No event in the loaded flow reports this source ID.":w?"No events match these flow filters.":"No flow data for this session: aictl has no prompt, model call or tool call of it, and no hook or OpenTelemetry event."}</div>`:r`<${mt} error=${i} what="the session flow"/>`}
      </div>
      ${f&&r`<div hidden=${!t}><${_t} inline=${!0} a=${e} sid=${st} data=${_} act=${u} captureMode=${o??((je=s.data)==null?void 0:je.capture_mode)}/></div>`}
    </${ae}>`}export{Ke as FLOW_EVENTS,ye as FLOW_EVENTS_MAX,Be as FLOW_EVENTS_STEP,At as FLOW_MODE_KEY,Vt as default};

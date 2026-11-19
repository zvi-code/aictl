import{h as w,o as D,d as M,bj as Je,m as i,L as Ie,y as Ve,bk as dt,T as H,N as Q,S as ct,bl as Se,b as he,bm as ut,bn as Re,bo as pt}from"./index-C_yL16rp.js";import{d as mt,b as oe,i as _t,u as bt,e as Fe,S as ft,F as le,f as ue,W as gt,c as B,p as Ue}from"./Drawer-B_UKqqyp.js";import $t from"./EvidenceTab-B-oohzAW.js";import"./TextView-Rq9jaqMk.js";import"./LoadedConfiguration-B23iGxY5.js";const ht={user_message:()=>["user","tool"],api_call:e=>[e.from||"tool","api"],api_response:()=>["api","tool"],error:()=>["api","tool"],tool_use:e=>["tool","skill:"+(e.to||"tool")],subagent:e=>["tool","subagent:"+(e.to||"agent")],subagent_end:e=>["subagent:"+(e.from||"agent"),"tool"],hook:()=>["tool","hook"]},pe={user_message:{lane:"user",kind:"request"},api_call:{lane:"api",kind:"request"},api_response:{lane:"api",kind:"reply"},error:{lane:"error",kind:"reply"},tool_use:{lane:"tool",kind:"request"},subagent:{lane:"agent",kind:"request"},subagent_end:{lane:"agent",kind:"reply"},hook:{lane:"hook",kind:"hook"},session_start:{lane:"session",kind:"marker"},session_end:{lane:"session",kind:"marker"},compaction:{lane:"compact",kind:"marker"},context_update:{lane:"compact",kind:"marker"},session_command:{lane:"session",kind:"marker"},skill_event:{lane:"tool",kind:"marker"}},E={user:"var(--s1)",api:"var(--s2)",tool:"var(--s3)",agent:"var(--s5)",hook:"var(--s4)",session:"var(--good)",compact:"var(--warn)",error:"var(--crit)"};function yt(e){if(!e)return"";let n=e;if(typeof e=="string")try{n=JSON.parse(e)}catch{return e.slice(0,80)}if(typeof n!="object"||n===null)return String(e).slice(0,80);for(const d of["command","file_path","pattern","query","path","url","prompt","description","old_string","content","skill"])if(n[d])return String(n[d]).slice(0,100);const t=Object.keys(n);return t.length?String(n[t[0]]).slice(0,80):""}const ae=e=>((e.tokens||{}).input||0)+((e.tokens||{}).output||0);function kt(e){const n=e||[],t=[];for(let d=0;d<n.length;d++){const a=n[d],c=n[d+1];if(a&&c&&a.type==="user_message"&&c.type==="user_message"&&a.step_key&&a.step_key===c.step_key&&!!a.redacted!=!!c.redacted){const o=a.redacted?c:a,p=a.redacted?a:c;t.push({...p,...o,redacted:!1,tokens:ae(p)>=ae(o)?p.tokens:o.tokens,api_calls:p.api_calls||o.api_calls||0,duration_ms:p.duration_ms||o.duration_ms||0,wall_ms:p.wall_ms||o.wall_ms||0,end_ts:p.end_ts||o.end_ts,model:p.model||o.model||""}),d+=1}else t.push(a)}return t}function wt(e,n,t){const a=kt(e).map(s=>{const S=ht[s.type],[_,h]=S?S(s):[null,null];return{...s,_from:_,_to:h}});let c=0,o=0,p=0;const y=a.filter(s=>s.type==="user_message").length,u=(t==null?void 0:t.total_turns)||y,b=a.length>0&&a[0].type!=="user_message"&&((t==null?void 0:t.omitted_events)>0||a[0].rt_tokens>0),$=u>y&&y>0?u-y+1:1;let k=b?Math.max(1,$-1):$-1;const f=[];let g=null;if(b){const s=a[0];s._isTurnStart=!0,g={turnIndex:k,isPartialStart:!0,startTs:s.ts,endTs:s.ts,promptEv:s,promptText:"Continued from earlier in turn (load older events for prompt)",tokens:s.rt_tokens||0,cacheTokens:0,apiCalls:0,toolCalls:0,subagents:0,skills:[],errors:0,durationMs:0,events:[]},f.push(g)}for(const s of a){if(s.type==="user_message"?(o=0,k+=1,s._isTurnStart=!0,g={turnIndex:k,startTs:s.ts,endTs:s.end_ts||s.ts,promptEv:s,promptText:s.preview||s.message||(s.redacted?"Prompt (text not retained)":"Prompt"),tokens:ae(s),cacheTokens:(s.tokens||{}).cache_read||0,apiCalls:s.api_calls||0,toolCalls:0,subagents:0,skills:[],errors:0,durationMs:s.duration_ms||s.wall_ms||0,events:[s]},f.push(g)):g&&(g.events.push(s),s.ts>g.endTs&&(g.endTs=s.ts),g.isPartialStart&&g.endTs>g.startTs&&(g.durationMs=(g.endTs-g.startTs)*1e3)),s.type==="api_call"){const S=ae(s);c+=S,o+=S,p=Math.max(p,o),g&&(g.tokens=Math.max(g.tokens,s.rt_tokens??o),g.cacheTokens+=(s.tokens||{}).cache_read||0,g.apiCalls=Math.max(g.apiCalls,g.events.filter(_=>_.type==="api_call").length))}g&&(s.rt_tokens>g.tokens&&(g.tokens=s.rt_tokens),s.type==="tool_use"&&(g.toolCalls+=1),s.type==="subagent"&&(g.subagents+=1),s.type==="skill_event"&&s.name&&!g.skills.includes(s.name)&&g.skills.push(s.name),(s.type==="error"||s.is_error||s.type==="tool_use"&&s.success===!1)&&(g.errors+=1)),s._turnIndex=k,s._cum=s.cum_tokens??c,s._rt=s.rt_tokens??o}for(const s of f){const S=s.events,_=Math.max(1e3,...S.map(O=>O.duration_ms||0)),h=S.length||1;S.forEach((O,K)=>{O._turnGroup=s;const v=O.duration_ms||0,A=v>0?Math.max(6,Math.min(72,Math.round(v/_*68))):6,Y=h>1?Math.min(100-A,Math.round(K/(h-1)*(92-A))):0;O._wfOffsetPct=Y,O._wfWidthPct=A})}for(const s of a)s._wfWidthPct==null&&(s._wfOffsetPct=0,s._wfWidthPct=s.duration_ms>0?Math.min(80,Math.max(8,Math.round(s.duration_ms/250))):8);const r=new Map;let q=0;const C=(s,S,_)=>{r.has(s)||r.set(s,{id:s,label:S,color:_||mt(q++)})};a.length&&(C("user","User",E.user),C("tool",n||"Tool","var(--ink2)"));for(const s of a)(s.type==="api_call"||s.type==="api_response"||s.type==="error")&&C("api","Model",E.api),s.type==="tool_use"&&C(s._to,s.to||"tool"),s.type==="subagent"&&C(s._to,s.to||"Subagent"),s.type==="subagent_end"&&C(s._from,s.from||"Subagent"),s.type==="hook"&&C("hook","Hooks",E.hook);const m=s=>a.filter(S=>S.type===s).length,l=a.filter(s=>s.type==="api_call"&&s.ttft_ms>0).map(s=>s.ttft_ms).sort((s,S)=>s-S),T=l.length?l.length%2?l[(l.length-1)/2]:(l[l.length/2-1]+l[l.length/2])/2:null,N=(t==null?void 0:t.cumulative_tokens)!=null?{turns:t.total_turns,toolCalls:t.total_tool_uses,subagents:t.subagents,hooks:t.hooks,errors:t.errors,compactions:t.compactions,cumulative:t.cumulative_tokens,roundTrip:t.largest_turn_tokens,ttft:t.ttft_ms??null,ttftCalls:t.ttft_calls||0}:{turns:m("user_message"),toolCalls:a.filter(s=>s.type==="tool_use"&&s.subtype!=="result"&&s.subtype!=="decision").length,subagents:m("subagent"),hooks:m("hook"),errors:m("error")+a.filter(s=>s.type==="api_call"&&s.is_error||s.type==="tool_use"&&s.success===!1).length,compactions:m("compaction"),cumulative:c,roundTrip:p,ttft:T,ttftCalls:l.length};return{events:a,participants:[...r.values()],turnGroups:f,summary:N}}function Tt(e,n,t,d=!1){const a=new Set;for(const u of e)a.add(u._from),a.add(u._to);const c=n.filter(u=>!t||a.has(u.id)),o=[],p=new Map,y=new Map;for(const u of c){const b=d&&(u.id.startsWith("skill:")?"tools":u.id.startsWith("subagent:")?"agents":null),$=b?"group:"+b:u.id;p.has($)||(p.set($,o.length),o.push(b?{id:$,label:b==="tools"?"Tools":"Subagents",color:E[b==="tools"?"tool":"agent"]}:u)),y.set(u.id,p.get($))}return{lanes:o,columns:y,grouped:o.length<c.length}}function re(e){const n=e.tokens||{};if(e.type==="user_message")return e.redacted?e.prompt_length?{label:"Prompt, text not sent ("+e.prompt_length+" characters)",meta:""}:{label:"Prompt, text not kept",meta:""}:{label:e.preview||e.message||"Prompt",meta:e.prompt_length?e.prompt_length+" characters":""};if(e.type==="api_call"){const t=[w(ae(e))+" tokens"];return e.ttft_ms>0?t.push("first token "+D(e.ttft_ms)):e.duration_ms>0&&t.push(D(e.duration_ms)),e.is_error&&t.push("failed"),{label:e.agent_name||e.model||"Model call",meta:t.join(", ")}}if(e.type==="api_response"){const t=[e.model,e.finish_reason&&e.finish_reason!=="stop"?"stopped: "+e.finish_reason:""].filter(Boolean).join(", ");return{label:"Reply"+(n.output?", "+w(n.output)+" tokens":"")+(e.response_preview?": "+oe(e.response_preview,80):""),meta:t}}if(e.type==="error")return{label:"Error: "+(e.error_type||"error"),meta:oe(e.error_message||"",80)};if(e.type==="tool_use"){const t=yt(e.params)||(e.target?String(e.target).slice(0,100):"");let d="";return e.subtype==="result"||!e.subtype&&typeof e.success=="boolean"?d=(e.success===!0||e.success==="true"?"OK":"Failed")+(e.duration_ms>0?", "+D(e.duration_ms):""):e.subtype==="decision"&&(d=e.decision||""),{label:(e.to||"tool")+(t?": "+t:""),meta:d,size:e.result_size?e.result_size+" B":""}}if(e.type==="subagent")return{label:"Subagent "+(e.to||""),meta:oe(e.prompt||e.model||"",80)};if(e.type==="subagent_end")return{label:"Subagent "+(e.from||"")+(e.completed===!1?" stopped":" done"),meta:e.duration_ms>0?D(e.duration_ms):""};if(e.type==="hook")return{label:"Hook "+(e.hook_name||""),meta:""};if(e.type==="session_start")return{label:"Session started",meta:e.cwd||""};if(e.type==="session_end")return{label:"Session ended",meta:""};if(e.type==="skill_event")return{label:`Skill: ${e.name||"Name not reported"}`,meta:[Me(e.phase),e.phase==="reported"&&Number.isFinite(e.reported_spans)&&`${e.reported_spans} distinct spans`,e.source].filter(Boolean).join(" · ")};if(["context_update","session_command"].includes(e.type))return{label:[{context_update:"Context",session_command:"Session command"}[e.type],e.name||e.phase].filter(Boolean).join(": "),meta:[e.name&&e.phase,e.context_tokens!=null&&`${w(e.context_tokens)} context tokens`,e.source].filter(Boolean).join(" · ")};if(e.type==="compaction"){const t=e.before_tokens!=null&&e.after_tokens!=null?w(e.before_tokens)+" to "+w(e.after_tokens)+" tokens":"";return{label:"Compaction"+(e.compaction_count?" "+e.compaction_count:""),meta:[t,e.duration_ms>0?D(e.duration_ms):""].filter(Boolean).join(", ")}}return{label:e.type||"Event",meta:""}}const Me=e=>({loaded:"Loaded",invoked:"Invoked",reported:"Reported in context",resolved:"Resolved"})[e]||e||"Not reported";function St(e){return e.type==="user_message"?e.message||e.preview||"":e.type==="api_call"?e.request_preview||e.prompt_preview||"":e.type==="tool_use"?e.params||e.input_preview||e.target||"":e.type==="subagent"?e.prompt||"":e.type==="hook"&&e.hook_input||""}function xt(e){return e.type==="api_response"?e.response||e.response_preview||"":e.type==="api_call"&&e.is_error?e.error_message||"":e.type==="tool_use"?e.result_summary||e.result_preview||"":e.type==="error"?e.error_message||"":e.type==="hook"&&e.hook_output||""}function qt(e,n){const t=e.tokens||{},d=re(e),a=[{c:n,label:"Time",value:new Date(e.ts*1e3).toLocaleTimeString()}];return e.model&&a.push({c:"transparent",label:"Model",value:e.model}),(t.input||t.output)&&a.push({c:"transparent",label:"Input / output",value:w(t.input||0)+" / "+w(t.output||0)}),t.cache_read&&a.push({c:"transparent",label:"Cache read",value:w(t.cache_read)}),e.duration_ms>0&&a.push({c:"transparent",label:"Took",value:D(e.duration_ms)}),e.ttft_ms>0&&a.push({c:"transparent",label:"First token",value:D(e.ttft_ms)}),d.meta&&a.push({c:"transparent",label:"Detail",value:oe(d.meta,60)}),{title:oe(d.label,70),rows:a}}const z="_v:datetime _deleted:bool",Z="session_id:string ts:real",V={session_steps:`step_key:string ${Z} ['kind']:string phase:string name:string turn_id:string agent_id:string context_tokens:long context_limit:long before_tokens:long after_tokens:long ${z}`,requests:`rowid:long ${Z} model:string input_tokens:long output_tokens:long cost_usd:real ${z}`,tool_invocations:`rowid:long ${Z} tool_name:string is_error:long duration_ms:real ${z}`,OTELTraces:"StartTime:datetime SessionId:string TraceID:string SpanID:string Model:string ToolName:string OperationName:string InputTokens:long OutputTokens:long",agents:`agent_id:string session_id:string model:string started_at:real ended_at:real ${z}`,turn_request_links:`request_key:string ${Z} agent_id:string turn_id:string root_session_id:string root_turn_id:string basis:string ${z}`},ye=`step_key:string ${Z} ['kind']:string role:string ['source']:string phase:string turn_id:string text_status:string ${z}`,Ct=`step_key:string session_id:string ['text']:string ${z}`,Ye=`rowid:long dedup_key:string ${Z} agent_id:string cost_usd:real ${z}`,Ge=e=>e.split(" ").map(n=>n.split(":")[0]),Xe=(e,n)=>`union isfuzzy=true (datatable(node_id:string, ${n.split(" ").join(", ")})[]), ${e}`,me=(e,n,t)=>{const d=R(t.nodeId).trim().toLowerCase();return Xe(e,n)+`
| where node_id == ${ee(d==="legacy"?"":d)}`},xe=`| top 500 by ts desc
| order by ts asc, step_key asc`,se="event_time=unixtime_seconds_todatetime(ts)",Be=(e,n)=>`iff(countif(isnotnull(${e})) > 0, sum(${e}), ${n}(null))`,ce={steps:{label:"Session steps timeline",table:"session_steps",description:"The latest 500 recorded steps, oldest first. No prompt or command text.",body:`${xe}
| project ${se}, step_key, ['kind'], phase, name, agent_id, turn_id`},nodes:{label:"Sessions by reporting node",table:"sessions",fleet:!0,description:"Compare nodes with sessions started in the time range. Legacy means the reporting node was not recorded."},requests:{label:"Requests and tokens by model",table:"requests",model:"model",description:"Request counts, reported tokens and positive recorded USD. A zero or missing price is counted as unpriced, not free.",body:`| extend priced=isnotnull(cost_usd) and isfinite(cost_usd) and cost_usd > 0
| summarize request_count=count(),
    input_tokens=${Be("input_tokens","long")},
    output_tokens=${Be("output_tokens","long")},
    recorded_usd=iff(countif(priced) > 0, sumif(cost_usd, priced), real(null)),
    unpriced_requests=countif(not(priced))
  by model
| order by request_count desc`},tools:{label:"Tool activity and failures",table:"tool_invocations",tool:"tool_name",description:"Calls, reported failures, missing outcomes, and mean reported duration by tool name.",body:`| summarize calls=count(), failures=countif(is_error == 1),
    unknown_outcomes=countif(isnull(is_error)), mean_duration_ms=avg(duration_ms)
  by tool_name
| order by calls desc`},failures:{label:"Failed tool calls",table:"tool_invocations",tool:"tool_name",description:"The latest 500 calls explicitly marked as errors, newest first.",body:`| where is_error == 1
| top 500 by ts desc
| project ${se}, rowid, tool_name, duration_ms`},context:{label:"Context changes, compaction and reset",table:"session_steps",description:"The latest 500 context events and related session commands, oldest first. A requested or dispatched command is not proof of a change; check its phase.",body:`| where ['kind'] == "context" or (['kind'] == "session_command" and name in ("model_change", "model", "clear", "reset", "new", "compact", "rewind"))
${xe}
| project ${se}, ['kind'], name, phase, agent_id, turn_id,
    context_tokens, context_limit, before_tokens, after_tokens`},spans:{label:"OpenTelemetry spans",table:"OTELTraces",model:"Model",tool:"ToolName",description:"The latest 500 identified spans, newest first. Model and tool filters apply to the same span.",body:`| top 500 by StartTime desc
| project StartTime, TraceID, SpanID, OperationName, Model, ToolName, InputTokens, OutputTokens`},prompts:{label:"User input prompts",table:"session_steps",fields:ye,keyword:!0,description:"Search retained user messages for a word or phrase. Shows the first 240 characters of the latest 500 matches, oldest first. Missing text is not searchable.",body:(e,n)=>ke(e,n,"user")},assistant:{label:"Public assistant text and visible commentary",table:"session_steps",fields:ye,keyword:!0,description:"Search retained public assistant messages for a word or phrase. Shows the first 240 characters of the latest 500 matches, not private reasoning.",body:(e,n)=>ke(e,n,"assistant")},commands:{label:"Commands: requests, starts and results",table:"session_steps",fields:`${ye} name:string tool_call_id:string agent_id:string exit_code:long`,description:"Shell requests, native starts and tool results are separate events. Session command requests and dispatches are not proof of execution. A preview is shown only when retained.",body:(e,n)=>ke(e,n,"commands")},longest:{label:"Longest completed turn",table:"session_steps",fields:`${V.session_steps} ['source']:string`,description:"Requires one native start and one end for the same session, agent and turn, both in the time range. Incomplete or ambiguous pairs are excluded.",body:`| where ['kind'] == "turn" and isnotempty(turn_id)
| where (['source'] == "assistant.turn_start" and phase == "started") or (['source'] == "assistant.turn_end" and phase == "ended")
| summarize starts=countif(phase == "started"), ends=countif(phase == "ended"),
    start_ts=minif(ts, phase == "started"), end_ts=maxif(ts, phase == "ended") by session_id, agent_id, turn_id
| where starts == 1 and ends == 1 and end_ts >= start_ts
| extend duration_seconds=end_ts - start_ts
| order by duration_seconds desc, start_ts asc, agent_id asc, turn_id asc
| take 1
| project session_id, agent_id, turn_id, duration_seconds, started=unixtime_seconds_todatetime(start_ts), ended=unixtime_seconds_todatetime(end_ts)`},subagents:{label:"All session subagents",table:"agents",model:"model",key:"agent_id",clock:"started_at",description:"All recorded subagent IDs for this session, by start time when a time range is set. No task text.",body:`| where isnotempty(agent_id) and agent_id != session_id
| project session_id, agent_id, model, started=unixtime_seconds_todatetime(started_at), ended=unixtime_seconds_todatetime(ended_at)
| order by started asc nulls last, agent_id asc`},sizes:{label:"Tool response sizes in bytes",table:"tool_invocations",tool:"tool_name",fields:`${V.tool_invocations} output_bytes:long`,description:"Percentiles use recorded, nonnegative output byte counts, including measured zeros. Calls without measurements count as unknown.",body:`| extend bytes=iff(output_bytes >= 0, output_bytes, long(null))
| summarize calls=count(), known=countif(isnotnull(bytes)), unknown=countif(isnull(bytes)),
    p50_bytes=percentile(bytes, 50), p95_bytes=percentile(bytes, 95), p99_bytes=percentile(bytes, 99)`},mcp:{label:"MCP tool calls",table:"tool_invocations",tool:"tool_name",fields:`${V.tool_invocations} source_event_id:string agent_id:string`,description:"The latest 500 recorded invocations with MCP-style tool names (mcp prefix or server/tool). Names do not establish which servers were configured.",body:`| where tool_name matches regex @"^mcp(__|_|\\.|:)|^[\\w.-]+/[\\w.-]+$"
| top 500 by ts desc
| project ${se}, tool_name, agent_id, source_event_id, duration_ms, is_error`},reasoning:{label:"Reported reasoning token counts",table:"OTELTraces",model:"Model",fields:"StartTime:datetime SessionId:string TraceID:string SpanID:string Model:string OperationName:string ReasoningOutputTokens:long TraceAttributes:dynamic",project:'StartTime, SessionId, TraceID, SpanID, Model, OperationName, reasoning_tokens=coalesce(ReasoningOutputTokens, tolong(TraceAttributes["gen_ai.usage.reasoning.output_tokens"]))',description:"The latest 500 identified spans with a reported reasoning token count. Missing counts are not zero. Reads the numeric metric, not reasoning text.",body:`| where isnotnull(reasoning_tokens) and reasoning_tokens >= 0
| top 500 by StartTime desc
| project StartTime, TraceID, SpanID, Model, OperationName, reasoning_tokens`},costMain:{label:"Highest recorded turn cost: selected session, main agent",table:"requests",cost:"main",description:"Ranks direct main-agent turns by positive recorded USD, not invoice cost. Coverage includes unlinked and unpriced requests."},costTree:{label:"Highest recorded turn cost: session and linked descendants",table:"requests",cost:"tree",description:"Ranks root turns using explicit links. Coverage includes this session and requests explicitly linked back from other sessions; unlinked outside requests cannot be assigned."},costAll:{label:"Highest recorded turn cost: all sessions",table:"requests",cost:"all",description:"Ranks explicitly linked root turns across all sessions by positive recorded USD. Uses the Flow date bounds, or a seven-day window if a bound is missing."}};function ke(e,n,t){const d=t==="commands",a=d?", ['kind'], name, phase, agent_id, tool_call_id, exit_code":", phase",c=d?`| where (['kind'] == "session_command" and phase in ("requested", "queued", "dispatched"))
    or (name in ("bash", "powershell") and (
        (['kind'] == "tool_call" and phase == "requested" and ['source'] == "assistant.message")
        or (['kind'] == "command" and phase == "started" and ['source'] == "tool.execution_start")
        or (['kind'] == "tool_result" and phase in ("completed", "failed") and ['source'] == "tool.execution_complete")))`:`| where ['kind'] == "message" and role == "${t}" and ['source'] == "${t}.message"
${t==="assistant"?`| where phase in ("", "commentary", "response", "final", "final_answer")
`:""}| where text_status in ("captured", "truncated")`;return`${d?"":`let needle = ${ee(n.keyword)};
`}let selected_steps = materialize(
${e}
${c}
| where isnotempty(step_key)
| project session_id, step_key, ts, turn_id, text_status${a});
selected_steps
| join kind=${d?"leftouter":"inner"} (
    ${me("session_step_text",Ct,n)}
    | where step_key in (selected_steps | where text_status in ("captured", "truncated") | project step_key)
    | project session_id, step_key, _v, _deleted, text_preview=substring(trim(@"\\s+", ['text']), 0, 240)${d?"":", matched=isempty(needle) or ['text'] contains needle"}
    | summarize arg_max(_v, *) by step_key
    | where not(coalesce(_deleted, false)) and session_id == sid and isnotempty(text_preview)${d?"":" and matched"}
    | project session_id, step_key, text_preview
) on session_id, step_key
${xe}
| project ${se}, step_key, turn_id${a}, text_status, ${t==="user"?"prompt_preview=text_preview":"text_preview"}`}const R=e=>typeof e=="string"?e:"",ee=e=>JSON.stringify(R(e)).replace(/[\u007f-\u009f\u2028\u2029]/g,n=>"\\u"+n.charCodeAt(0).toString(16).padStart(4,"0")),qe=e=>typeof e=="number"?e:R(e).trim()?Number(e):NaN;function _e(e,n,t){if(e==null||e==="")return"";const d=qe(e);return Number.isFinite(d)?`
| where ${t} ${n} `+(t==="StartTime"?`unixtime_seconds_todatetime(${d})`:d):`
| where false // Invalid Flow time bound`}function Ze({since:e,until:n}){const t=c=>Number.isFinite(qe(c))?`unixtime_seconds_todatetime(${qe(c)})`:"datetime(null)",d=e!=null&&e!=="",a=n!=null&&n!=="";return d?`let window_start = ${t(e)};
let window_end = ${a?t(n):"window_start + 7d"};`:`let window_end = ${a?t(n):"now()"};
let window_start = window_end - 7d;`}function It(e,n){const t=e==="all";if(t&&n.includeAllSessions!==!0)return"";const d=e==="tree",a=e==="main",c=t?`
| where ts >= (window_start - datetime(1970-01-01)) / 1s and ts < (window_end - datetime(1970-01-01)) / 1s`:_e(n.since,">=","ts")+_e(n.until,"<","ts"),p=(t?"":a?`
| where isnotempty(sid) and session_id == sid and isempty(agent_id)`:`
| where isnotempty(sid) and (session_id == sid or dedup_key in (possible_descendants))`)+c;return`${t?Ze(n):`let sid = ${ee(n.sessionId)};`}
let link_versions = ${me("turn_request_links",V.turn_request_links,n)}
| project request_key, _v, _deleted, session_id, agent_id, turn_id, root_session_id, root_turn_id, basis;
${d?`let possible_descendants = link_versions | where root_session_id == sid and isnotempty(request_key) | distinct request_key;
`:""}let request_versions = ${me("requests",Ye,n)}
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
| order by row_type asc`}function Mt({table:e,fields:n=V[e],project:t,key:d=e==="session_steps"?"step_key":"rowid",clock:a=e==="OTELTraces"?"StartTime":"ts",model:c,tool:o,body:p,cost:y,fleet:u},b){if(u)return`${Ze(b)}
${Xe("sessions",`session_id:string started_at:real ${z}`)}
| project node_id, session_id, started_at, _v, _deleted
| summarize arg_max(_v, *) by node_id, session_id
| where not(coalesce(_deleted, false))
| extend started=unixtime_seconds_todatetime(started_at)
| where started >= window_start and started < window_end
| summarize sessions=count(), last_session_start=max(started) by reporting_node=iff(isempty(node_id), "legacy", node_id)
| order by sessions desc, reporting_node asc`;if(y)return It(y,b);const $=e==="OTELTraces",k=$?"SessionId":"session_id";let f=me(e,n,b);return f+=`
| project ${t||Ge(n).join(", ")}`,$?(f+=`
| where isnotempty(sid) and ${k} == sid and isnotempty(TraceID) and isnotempty(SpanID)`,f+=`
| summarize arg_max(StartTime, *) by TraceID, SpanID`):(f+=`
| summarize arg_max(_v, *) by ${d}
| where not(coalesce(_deleted, false))`,f+=`
| where isnotempty(sid) and ${k} == sid`),f+=_e(b.since,">=",a)+_e(b.until,"<",a),c&&R(b.model)&&(f+=`
| where ${c} == ${ee(b.model)}`),o&&R(b.tool)&&(f+=`
| where ${o} == ${ee(b.tool)}`),`let sid = ${ee(b.sessionId)};
`+(typeof p=="function"?p(f,b):f+`
`+p)}function Nt(e,n){if(!/^https:\/\//i.test(R(e))||!n.trim())return null;try{const t=new URL(e);return t.username||t.password||!/^\/[^/]+$/.test(t.pathname)?null:(t.hash="",t.search=new URLSearchParams({web:"1",autorun:"false",query:n}).toString(),t.href)}catch{return null}}const Ot=[...new Set([...Object.keys(V),"where","project","summarize","order by","top","extend","take","distinct","count","countif","sum","avg","arg_max","isnotempty","isnotnull","unixtime_seconds_todatetime",...[...Object.values(V),...Object.values(ce).map(e=>e.fields).filter(Boolean),Ye].flatMap(Ge).map(e=>e.replace(/^\['(.+)'\]$/,"$1"))])],de=e=>[...new Set(e.filter(n=>R(n).length>0))],we=e=>Array.isArray(e)?e:[],Et=10;function Ke(e){var o,p;const{value:n,selectionStart:t,selectionEnd:d}=e;if(t!==d)return{prefix:"",start:t,end:d};const a=((o=n.slice(0,t).match(/[a-z_]\w*$/i))==null?void 0:o[0])||"",c=((p=n.slice(d).match(/^\w+/))==null?void 0:p[0])||"";return{prefix:a,start:t-a.length,end:d+c.length}}function ne({id:e,label:n,value:t,options:d,onChange:a,editorRef:c,hint:o,placeholder:p}){const y=Ie(null),u=c||y,[b,$]=M(null),[k,f]=M(-1),g=b==null?void 0:b.prefix.toLowerCase(),r=b?d.filter(_=>_.toLowerCase().startsWith(g)).slice(0,Et):[],q=r.length>0,C=_=>`${e}-opt-${_}`,m=r[k]?C(k):void 0;Ve(()=>{var _,h;m&&((h=(_=document.getElementById(m))==null?void 0:_.scrollIntoView)==null||h.call(_,{block:"nearest"}))},[m]);function l(_){$(_),f(-1)}function T(_){const h=u.current;c?(h.setRangeText(_==="kind"?"['kind']":_,b.start,b.end,"end"),a(h.value)):a(_),l(null)}function N(_){const h=_.currentTarget;a(h.value);const O=c?Ke(h):{prefix:h.value};l(!_.isComposing&&(!c||O.prefix)?O:null)}function s(_){if(!_.isComposing){if(c&&_.ctrlKey&&_.key===" "){_.preventDefault(),l(Ke(_.currentTarget));return}if(_.key==="Escape"&&b){_.preventDefault(),_.stopPropagation(),l(null);return}if(_.key==="ArrowDown"||_.key==="ArrowUp"){if(!b&&!c&&d.length)_.preventDefault(),l({prefix:""}),f(0);else if(q){_.preventDefault();const h=r.length;f(_.key==="ArrowDown"?(k+1)%h:k<0?h-1:(k+h-1)%h)}}else _.key==="Enter"&&m?(_.preventDefault(),T(r[k])):["Tab","ArrowLeft","ArrowRight","Home","End"].includes(_.key)&&l(null)}}const S={id:e,ref:u,value:t,placeholder:p,"aria-describedby":o,"aria-autocomplete":"list","aria-controls":e+"-list","aria-activedescendant":m,autocomplete:"off",spellcheck:!1,onInput:N,onKeyDown:s,onBlur:()=>l(null)};return i`<div class="bd-kql-field">
    <label for=${e}>${n}</label>
    ${c?i`<textarea ...${S} rows="9" onClick=${()=>l(null)}/>`:i`<input ...${S} role="combobox" aria-expanded=${q} onFocus=${()=>l({prefix:""})}/>`}
    <ul class="bd-kql-options" id=${e+"-list"} role="listbox" aria-label=${n+" suggestions"} hidden=${!q}>
      ${r.map((_,h)=>i`<li key=${_} id=${C(h)} role="option" aria-selected=${h===k}
        onMouseDown=${O=>O.preventDefault()} onClick=${()=>T(_)}>${_}</li>`)}
    </ul>
    ${b&&!c&&!q&&i`<small role="status">${t?"No matching suggestion. Using the value you typed.":"No observed values."}</small>`}
  </div>`}function Lt({id:e,generated:n,url:t}){const[d,a]=M(n),[c,o]=M(""),p=Ie(null),y=e+"-hint",u=Nt(t,d),b=k=>{o(""),a(k)};async function $(){try{await navigator.clipboard.writeText(d),o("Query copied.")}catch{p.current.focus(),p.current.select(),o("Query selected. Use your device’s Copy command.")}}return i`<p id=${y}>Edit the KQL below. Type a prefix or press Ctrl+Space for tables, columns and operators.
    Changing an example or filter replaces your edits.</p>
    <${ne} id=${e} label="KQL query" value=${d} options=${Ot} onChange=${b} editorRef=${p} hint=${y}/>
    <div class="bd-kql-actions">
      ${u&&i`<a class="bd-btn bd-p" href=${u} target="_blank" rel="noopener noreferrer">Open in Kusto</a>`}
      <button type="button" class="bd-btn" disabled=${!d.trim()} onClick=${$}>Copy query</button>
      ${d!==n&&i`<button type="button" class="bd-btn" onClick=${()=>b(n)}>Restore example</button>`}
      <span role="status">${c}</span>
    </div>
    <p>${u?"Opens in Azure Data Explorer without running the query.":d.trim()?"No Kusto database link is available. You can still copy the query.":"Enter a query to copy or open it."}</p>`}const jt={nodes:"Fleet nodes",steps:"Steps",requests:"Requests & USD",tools:"Tool activity",failures:"Failed tools",context:"Context & reset",spans:"OTel spans",prompts:"User prompts",assistant:"Assistant text",commands:"Commands",longest:"Longest turn",subagents:"Subagents",sizes:"Response bytes",mcp:"MCP calls",reasoning:"Reasoning tok",costMain:"Turn cost (main)",costTree:"Turn cost (tree)",costAll:"Turn cost (all)"};function Dt({base:e,url:n,sessionId:t,nodeId:d,sessions:a,models:c,tools:o,since:p,until:y,flowFilters:u}){const[b,$]=M("steps"),[k,f]=M(R(t)),[g,r]=M(R(d)||"legacy"),[q,C]=M(""),[m,l]=M(""),[T,N]=M(""),[s,S]=M(null),_=e+"-hint",h=ce[b],O=h.cost==="all",K=JSON.stringify([p,y,g]),v=O&&s===K,A=(h.fleet||g.trim())&&Mt(h,{sessionId:k,nodeId:g,model:q,tool:m,keyword:T,since:p,until:y,includeAllSessions:v}),Y=!!(u&&(u.tool_name||u.category||u.failed||u.q)),W=()=>{if(!u)return;let x=b;u.failed?x="failures":u.category==="tools"||u.tool_name?x="tools":u.category==="prompts"?x="prompts":u.category==="models"?x="requests":u.category==="agents"?x="subagents":u.category==="context"&&(x="context"),$(x),S(null),u.tool_name&&l(u.tool_name),u.q&&(x==="prompts"||x==="assistant")&&N(u.q)};return i`<div class="bd-kql-body">
    ${Y&&i`<div class="bd-kql-sync">
      <span>Active Flow filters detected (${[u.category&&`category=${u.category}`,u.tool_name&&`tool=${u.tool_name}`,u.failed&&"failures only",u.q&&`q="${u.q}"`].filter(Boolean).join(" · ")})</span>
      <button type="button" class="bd-btn bd-kql-syncbtn" onClick=${W}>Sync with Flow filters</button>
    </div>`}
    <div class="bd-kql-pills" role="group" aria-label="KQL preset shortcuts">
      ${Object.entries(ce).map(([x,F])=>i`<button type="button" key=${x}
        class=${"bd-kql-pill"+(b===x?" bd-on":"")} title=${F.label}
        onClick=${()=>{$(x),S(null),N("")}}>${jt[x]||x}</button>`)}
    </div>
    <label class="bd-kql-field">Example<select value=${b} onChange=${x=>{$(x.currentTarget.value),S(null),N("")}}>
      ${Object.entries(ce).map(([x,F])=>i`<option value=${x} key=${x}>${F.label}</option>`)}
    </select></label>
    <p><code>${h.table}</code> · ${h.description}</p>
    <div class="bd-kql-filters">
      ${!h.fleet&&i`<${ne} id=${e+"-node"} label="Reporting node" value=${g} options=${de([d,"legacy"])} onChange=${r} hint=${_} placeholder="Enter a node ID"/>`}
      ${O?i`<label><input type="checkbox" checked=${v}
        onChange=${x=>S(x.currentTarget.checked?K:null)}/> Include all sessions in this date range</label>`:!h.fleet&&i`<${ne} id=${e+"-sid"} label="Session ID" value=${k} options=${de([t,...we(a)])} onChange=${f} hint=${_} placeholder="Enter a session ID"/>`}
      ${h.model&&i`<${ne} id=${e+"-model"} key="model" label="Model (optional)" value=${q} options=${de(we(c))} onChange=${C} hint=${_} placeholder="Any model"/>`}
      ${h.tool&&i`<${ne} id=${e+"-tool"} key="tool" label="Tool name (optional)" value=${m} options=${de(we(o))} onChange=${l} hint=${_} placeholder="Any tool"/>`}
      ${h.keyword&&i`<label class="bd-kql-field">Keyword or phrase (optional)
        <input type="text" value=${T} onInput=${x=>N(x.currentTarget.value)} autocomplete="off" placeholder="Search retained text"/>
      </label>`}
    </div>
    ${!h.fleet&&!g.trim()&&i`<p>Enter a reporting node, or select Fleet nodes to compare nodes.</p>`}
    ${!k&&!O&&!h.fleet&&i`<p>Enter a session ID. An empty ID matches no rows.</p>`}
    ${h.keyword&&i`<p>The search term is included in the Kusto link. Matching text is returned only when you run the query in Kusto.</p>`}
    <p id=${_}>Type a prefix for suggestions. Use ↑ or ↓ and Enter to choose, or Esc to dismiss.
      Examples use Flow’s time range, not its event-list filters.</p>
    ${A&&i`<${Lt} id=${e+"-editor"} key=${A} generated=${A} url=${n}/>`}
  </div>`}function vt({url:e,sessionId:n,nodeId:t,sessions:d,models:a,tools:c,since:o,until:p,flowFilters:y}){const[u,b]=M(!1),$="session-kql-"+Je();return i`<details class="bd-kql" onToggle=${k=>{k.currentTarget.open&&b(!0)}}>
    <summary>Query in Kusto</summary>
    ${u&&i`<${Dt} key=${JSON.stringify([t,n])} ...${{base:$,url:e,sessionId:n,nodeId:t,sessions:d,models:a,tools:c,since:o,until:p,flowFilters:y}}/>`}
  </details>`}const At="aictl-pref-session_flow_mode";function Pt(e,n){if(!n)return"";const t=JSON.stringify(String(n));if(e.type==="tool_use"){const d=e.to?` and tool_name == ${JSON.stringify(String(e.to))}`:"",a=e.success===!1?" and is_error == 1":"";return`tool_invocations
| where session_id == ${t}${d}${a}
| top 100 by ts desc
| project event_time=unixtime_seconds_todatetime(ts), tool_name, duration_ms, is_error`}if(e.type==="api_call"){const d=e.model?` and model == ${JSON.stringify(String(e.model))}`:"";return`requests
| where session_id == ${t}${d}
| top 100 by ts desc
| project event_time=unixtime_seconds_todatetime(ts), model, input_tokens, output_tokens, cost_usd`}return e.type==="skill_event"?`OTELTraces
| where SessionId == ${t} and isnotempty(ReportedSkillNames)
| project StartTime, OperationName, Model, ToolName, ReportedSkillNames`:`session_steps
| where session_id == ${t}
| top 100 by ts desc
| project event_time=unixtime_seconds_todatetime(ts), step_key, ['kind'], phase, name, agent_id, turn_id`}function zt({ev:e,sessionId:n,onClose:t}){const d=re(e),a=e.tokens||{},c=e.type==="api_call"?w(a.input||0)+" tokens in":e.type==="api_response"?w(a.output||0)+" tokens out":e.result_size?e.result_size+" B out":e.prompt_length?e.prompt_length+" characters":Q,o=e.decision||(e.success===!1||e.success==="false"?"Failed":e.success===!0||e.success==="true"?"OK":Q),p=[["Type",e.type==="user_message"?"User input prompt":e.type||Q],["Time",he(e.ts,!0)],["Took",e.duration_ms?D(e.duration_ms):Q],["Size",c],["Model",e.model||Q],["Result",o]];e._rt&&p.push(["Turn tokens",w(e._rt)]),e._cum&&p.push(["Session cumulative",w(e._cum)]),e.agent_id&&e.type!=="skill_event"&&p.push(["Subagent ID",e.agent_id]),e.type==="skill_event"&&(p.splice(0,p.length,["Skill",e.name],["Evidence",Me(e.phase)],["Source",e.source],[e.phase==="reported"?"First reported in range":"Time",he(e.ts,!0)]),e.phase==="reported"&&p.push(["Last reported in range",he(e.last_ts,!0)],["Distinct spans",w(e.reported_spans)]),e.agent_id&&p.push(["Agent ID",e.agent_id])),e.type==="user_message"&&p.push(["Source",e.source||Q],["Text",e.text_status||(e.redacted?"Not retained":"Recorded")]);const y=Ue(St(e)),u=Ue(xt(e)),b=Pt(e,n),$=pe[e.type]||{lane:"tool"},f=e.type==="api_call"&&e.is_error||e.type==="error"||e.type==="tool_use"&&e.success===!1?E.error:e.type==="skill_event"?"var(--warn)":E[$.lane]||"var(--ink3)";return i`<aside class="bd-ag-insp bd-flow-side" role="region" aria-label="Selected event">
    <div class="bd-ag-insph">
      <span class="bd-ag-lane" style=${{color:f,borderColor:f}}>${e.type==="skill_event"?"skill":$.lane}</span>
      <b title=${d.label}>${d.label}</b>
      ${e._turnIndex>0&&i`<span class="bd-flow-turn-num">Turn #${e._turnIndex}</span>`}
      <button type="button" class="bd-btn" onClick=${t}>Close</button>
    </div>
    <dl class="bd-ag-kv">${p.map(([g,r])=>i`<div key=${g}><dt>${g}</dt><dd>${r}</dd></div>`)}</dl>
    ${y?i`<div class="bd-ag-sect">${e.type==="user_message"?"Your prompt":"Input"}</div><pre class="bd-ag-pre">${y}</pre>`:null}
    ${u?i`<div class="bd-ag-sect">Output</div><pre class="bd-ag-pre">${u}</pre>`:null}
    ${b?i`<div class="bd-ag-sect">Correlated KQL Snippet</div><pre class="bd-ag-pre bd-insp-kql">${b}</pre>`:null}
  </aside>`}const Ce=(e,n)=>t=>pt(t.clientX,t.clientY,qt(e,n)),J=e=>e.step_key||e.event_id||e;function Rt({turnGroups:e,activeTurn:n,onSelectTurn:t}){if(!e||e.length<2)return null;const d=Math.max(1,...e.map(c=>c.tokens||0)),a=e.reduce((c,o)=>!c||(o.tokens||0)>(c.tokens||0)?o:c,null);return i`<div class="bd-flow-scrubber" role="region" aria-label="Session turn scrubber">
    <div class="bd-flow-scrub-meta">
      <strong>Turn Scrubber (${w(e.length)} turns)</strong>
      ${a&&a.tokens>0?i`<span>Peak: Turn #${a.turnIndex} (${w(a.tokens)} tok)</span>`:null}
      ${n!=null?i`<button type="button" class="bd-btn bd-flow-scrub-clear" onClick=${()=>t(null)}>Turn #${n} selected ×</button>`:null}
    </div>
    <div class="bd-flow-scrub-track">
      ${e.map(c=>{const o=Math.max(16,Math.round((c.tokens||1)/d*100)),p=a&&c.turnIndex===a.turnIndex&&c.tokens>0,y=n===c.turnIndex,u=["bd-flow-sbar",p?"bd-peak":"",c.errors>0?"bd-has-err":"",c.skills.length>0?"bd-has-skill":"",y?"bd-on":""].filter(Boolean).join(" "),b=`Turn #${c.turnIndex} (${B(c.startTs)}): ${w(c.tokens)} tok`+(c.errors?` · ${c.errors} failed`:"")+(c.skills.length?` · skill: ${c.skills.join(", ")}`:"")+(c.promptText?` — ${c.promptText.slice(0,80)}`:"");return i`<button type="button" key=${c.turnIndex} class=${u} style=${{height:o+"%"}}
          title=${b} aria-label=${`Turn ${c.turnIndex}`} aria-pressed=${y?"true":"false"}
          onClick=${()=>t(y?null:c.turnIndex)}/>`})}
    </div>
  </div>`}function Ft({events:e,sel:n,onSel:t}){const[d,a]=M({}),c=o=>a(p=>({...p,[o]:!p[o]}));return i`<div class="bd-flow-colhdr" aria-hidden="true">
    <span>Time</span>
    <span>Actor / Kind</span>
    <span>Step / Command / Target</span>
    <span class="bd-flow-colhdr-r">Tokens</span>
    <span>Turn Timeline Waterfall</span>
  </div>
  <ul class="bd-ag-tl" aria-label="Events, oldest first">${e.map((o,p)=>{var q;const y=pe[o.type]||{lane:"tool",kind:"request"},u=o.type==="api_call"&&o.is_error||o.type==="error"||o.type==="tool_use"&&o.success===!1,b=u?E.error:o.type==="skill_event"?"var(--warn)":E[y.lane]||"var(--ink3)",$=re(o),k=n===J(o),f=o._turnGroup,g=f&&d[f.turnIndex]&&!o._isTurnStart&&!k,r=o.duration_ms>0?D(o.duration_ms):"";return i`<li key=${o.step_key||o.event_id||p} hidden=${!!g}>
      ${o._isTurnStart&&f&&i`<div class="bd-flow-turn-hdr">
        <button type="button" class="bd-flow-turn-toggle" onClick=${()=>c(f.turnIndex)}
          aria-expanded=${d[f.turnIndex]?"false":"true"}>
          <span class="bd-flow-turn-chev">${d[f.turnIndex]?"▸":"▾"}</span>
          <span class="bd-flow-turn-num">Turn #${f.turnIndex}${f.isPartialStart?" · CONT.":""}</span>
          <span class="bd-flow-turn-ts">${B(f.startTs)}${f.endTs>f.startTs?" → "+B(f.endTs):""}</span>
          <span class="bd-flow-turn-prompt">${f.promptText}</span>
        </button>
        <div class="bd-flow-turn-badges">
          ${f.skills.length>0&&i`<span class="bd-flow-tbadge bd-warn">★ ${f.skills.join(", ")}</span>`}
          ${f.errors>0&&i`<span class="bd-flow-tbadge bd-crit">${f.errors} ${f.errors===1?"Failure":"Failures"}</span>`}
          ${f.subagents>0&&i`<span class="bd-flow-tbadge">${f.subagents} ${f.subagents===1?"Subagent":"Subagents"}</span>`}
          ${f.apiCalls>0&&i`<span class="bd-flow-tbadge">${w(f.apiCalls)} API</span>`}
          ${f.tokens>0&&i`<span class="bd-flow-tbadge bd-focus">${w(f.tokens)} tok</span>`}
          ${f.durationMs>0&&i`<span class="bd-flow-tbadge">${D(f.durationMs)}</span>`}
        </div>
      </div>`}
      <button type="button" class=${"bd-ag-tlrow"+(k?" bd-on":"")+(u?" bd-err-row":"")} aria-expanded=${k?"true":"false"}
        onClick=${()=>t(k?null:J(o))} onMouseMove=${Ce(o,b)} onMouseLeave=${Se}>
        <span class="bd-ag-when">${B(o.ts)}${o._cum?i`<em>${w(o._cum)+" total"+(o._rt?", "+w(o._rt)+" this turn":"")}</em>`:null}</span>
        <span class="bd-ag-body-actor">
          <span class="bd-ag-dot" style=${{borderColor:b,background:y.kind==="reply"||y.kind==="marker"?b:"transparent"}}></span>
          <span class="bd-ag-lane" style=${{color:b,borderColor:b}}>${o.type==="skill_event"?"skill":y.lane}</span>
        </span>
        <span class="bd-ag-body">
          <span class="bd-ag-body-top">
            ${o.agent_id&&i`<span class="bd-flow-subtag" title=${o.agent_id}>agent:${String(o.agent_id).slice(0,8)}</span>`}
            <span class="bd-ag-lbl">${$.label}</span>
          </span>
          ${$.meta?i`<span class="bd-ag-meta">${$.meta}</span>`:null}
        </span>
        <span class="bd-ag-size">${$.size||((q=o.tokens)!=null&&q.input?"+"+w((o.tokens.input||0)+(o.tokens.output||0))+" tok":"")}</span>
        <span class="bd-ag-wf" aria-hidden="true">
          <span class="bd-ag-wftrack"><i class="bd-ag-wfbar" style=${{left:(o._wfOffsetPct||0)+"%",width:(o._wfWidthPct||8)+"%",background:b}}></i></span>
          <span class="bd-ag-wfdur">${r}</span>
        </span>
      </button>
    </li>`})}</ul>`}function Ut({events:e,participants:n,filtered:t,groupLanes:d,sel:a,onSel:c,toolLabel:o}){const[p,y]=M(!1),u=H(()=>{const r=["main"];for(const q of e)q.agent_id&&!r.includes(q.agent_id)&&r.push(q.agent_id);return r},[e]),{lanes:b,columns:$}=H(()=>Tt(e,n,t,d),[e,n,t,d]),k=b.length||1,f=r=>$.get(r)??-1,g=r=>(r+.5)/k*100;return p&&u.length>1?i`<div class="bd-ag-bar bd-flow-slmode">
      <${ue} label="Swim-lane layout" value="streams" onPick=${r=>y(r==="streams")}
        items=${[["participants","Participant arrows"],["streams","Session & Subagent streams"]]}/>
      <span class="bd-ag-dim">Each column is an execution stream (Main session + Subagents); models and tools render inline without wasting columns.</span>
    </div>
    <div class="bd-ag-sl bd-ag-sl-streams" role="list" aria-label="Events between participants, oldest first">
      <div class="bd-flow-stream-hdr" style=${{gridTemplateColumns:`68px repeat(${u.length}, minmax(210px, 1fr))`}}>
        <span>Time</span>
        ${u.map((r,q)=>i`<b key=${r} class="bd-flow-stream-colh">
          <i class="bd-sw" style=${{background:q===0?"var(--s1)":"var(--s5)",marginRight:"5px"}}/>
          ${r==="main"?`Main Session (${o||"root"})`:`Subagent ${String(r).slice(0,8)}`}
        </b>`)}
      </div>
      ${e.map((r,q)=>{const C=re(r),m=a===J(r),l=r.type==="error"||r.is_error||r.type==="tool_use"&&r.success===!1,T=l?E.error:r.type==="skill_event"?"var(--warn)":E[(pe[r.type]||{}).lane]||"var(--ink2)",N=r.agent_id&&u.includes(r.agent_id)?r.agent_id:"main";return i`<div key=${r.step_key||r.event_id||q} role="listitem">
          <button type="button" class=${"bd-flow-stream-row"+(m?" bd-on":"")}
            style=${{gridTemplateColumns:`68px repeat(${u.length}, minmax(210px, 1fr))`}}
            aria-expanded=${m?"true":"false"} aria-label=${B(r.ts)+" "+C.label}
            onClick=${()=>c(m?null:J(r))} onMouseMove=${Ce(r,T)} onMouseLeave=${Se}>
            <span class="bd-flow-stream-ts">${B(r.ts)}</span>
            ${u.map(s=>i`<span key=${s} class="bd-flow-stream-cell">
              ${s===N?i`<span class=${"bd-flow-stream-card"+(l?" bd-err":r.type==="skill_event"?" bd-skill":"")}>
                <span class="bd-flow-sc-top"><strong><i class="bd-sw" style=${{background:T,marginRight:"5px"}}/>${C.label}</strong>${r.duration_ms>0?i`<em>${D(r.duration_ms)}</em>`:null}</span>
                ${C.meta?i`<span class="bd-flow-sc-meta">${C.meta}</span>`:null}
              </span>`:null}
            </span>`)}
          </button>
        </div>`})}
    </div>`:i`${u.length>1&&i`<div class="bd-ag-bar bd-flow-slmode">
    <${ue} label="Swim-lane layout" value="participants" onPick=${r=>y(r==="streams")}
      items=${[["participants","Participant arrows"],["streams","Session & Subagent streams ("+u.length+")"]]}/>
  </div>`}
  <div class="bd-ag-sl" style=${{"--flow-diagram-width":158+k*96+"px","--flow-lane-pitch":100/k+"%"}} tabindex="0" role="list" aria-label="Events between participants, oldest first">
    <div class="bd-ag-slhead" aria-hidden="true"><span>Total</span><span>Turn</span><span>Time</span>
      <span class="bd-ag-slarea">${b.map((r,q)=>i`<b key=${r.id} style=${{left:g(q)+"%",color:r.color,borderColor:r.color}} title=${r.label}>${r.label}</b>`)}</span>
    </div>
    ${e.map((r,q)=>{const C=f(r._from),m=f(r._to),l=re(r),T=a===J(r),N=b[m],s=r.type==="error"||r.is_error?E.error:r.type==="user_message"?E.user:r.type==="api_response"?E.api:(N==null?void 0:N.color)||"var(--ink2)";let S;if(C<0||m<0){const _=E[(pe[r.type]||{}).lane]||"var(--ink3)";S=i`<span class="bd-ag-marker" style=${{color:_,borderColor:_}}>${l.label}${l.meta?" · "+l.meta:""}</span>`}else{const _=Math.min(C,m),h=Math.max(C,m),O=m>C;S=i`<span class="bd-ag-arrow" style=${{left:g(_)+"%",width:g(h)-g(_)+"%",borderColor:s}}>
          <span class=${"bd-ag-head"+(O?" bd-r":" bd-l")} style=${{color:s}}></span>
        </span>
        <span class="bd-ag-alabel" style=${{left:(g(_)+g(h))/2+"%",color:s}} title=${l.label}>${l.label}${l.meta?i`<em>${l.meta}</em>`:null}</span>`}return i`<div key=${r.step_key||r.event_id||q} role="listitem">
        <button type="button" class=${"bd-ag-slrow"+(T?" bd-on":"")} aria-expanded=${T?"true":"false"} aria-label=${B(r.ts)+" "+l.label}
          onClick=${()=>c(T?null:J(r))} onMouseMove=${Ce(r,s)} onMouseLeave=${Se}>
          <span>${r._cum?w(r._cum):""}</span><span>${r._rt?w(r._rt):""}</span><span>${B(r.ts)}</span>
          <span class="bd-ag-slarea">${S}</span>
        </button>
      </div>`})}
  </div>`}const U=e=>{var n;return((n=e==null?void 0:e.summary)==null?void 0:n.omitted_events)||0},We=e=>{const n=(e.turns||[]).length;return U(e)?"Newest "+w(n)+" of "+w(n+U(e))+" events":w(n)+" events"},Qe=500,He=1e3,Te=5e3,te={q:"",category:"",tool_name:"",flow_agent:"",skill_name:"",skill_phase:"",failed:!1,range:"whole",start:"",end:""},Bt=["prompts","messages","models","tools","skills","agents","context","hooks","lifecycle"];function Kt({apply:e,scope:n,bounds:t,initialCategory:d,activeCategory:a,activeFailed:c}){var q,C,m;const[o,p]=M(()=>({...te,category:d})),[y,u]=M(""),b=Je(),$=(l,T)=>{p(N=>({...N,[l]:T})),u("")},k=l=>{l.preventDefault();const T=new URLSearchParams,N=["q","category","flow_agent",...o.category==="skills"?["skill_name","skill_phase"]:["tool_name"]];for(const S of N)o[S].trim()&&T.set(S,o[S].trim());o.failed&&o.category!=="skills"&&T.set("failed","1");let s;if(o.range==="custom")s=ut(o.start,o.end);else if(o.range!=="whole"){if(!Number.isFinite(t.end)){u("The session end time has not been reported.");return}s={since:t.end-Number(o.range),until:t.end}}if(s!=null&&s.error){u(s.error);return}s&&(T.set("since",Math.floor(s.since)),T.set("until",Math.ceil(s.until))),u(""),e(T.toString())},f=l=>{if(l!=="custom"){$("range",l);return}u(""),p(T=>({...T,range:l,start:T.start||(Number.isFinite(t.start)?Re(t.start):""),end:T.end||(Number.isFinite(t.end)?Re(Math.ceil(t.end/60)*60):"")}))},g=l=>{const T={...te,category:a===l?"":l};p(T),u(""),e(T.category?"category="+l:"")},r=()=>{const l=!c,T={...te,failed:l};p(T),u(""),e(l?"failed=1":"")};return i`<form class="bd-flow-filters" role="search" aria-label="Flow filters" onSubmit=${k}>
    <div class="bd-flow-quickbar">
      <button type="button" class=${"bd-btn bd-flow-qpill"+(!a&&!c?" bd-on":"")}
        aria-pressed=${!a&&!c} onClick=${()=>{p(te),u(""),e("")}}>All events</button>
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
      <button type="button" class=${"bd-btn bd-flow-qpill bd-flow-qerr"+(c?" bd-on":"")}
        aria-pressed=${!!c} onClick=${r}>Failed steps</button>
      <label class="bd-flow-search"><span class="bd-flow-srchlbl">${o.category==="prompts"?"Search prompt text":"Search events"}</span><input type="search" placeholder=${o.category==="prompts"?"Words you wrote in this session":"Search prompt, tool, path, error..."} value=${o.q} onInput=${l=>$("q",l.currentTarget.value)}/></label>
    </div>
    <div class="bd-flow-filter-row">
      <label><span>Category</span><select value=${o.category} onChange=${l=>$("category",l.currentTarget.value)}>
        <option value="">All categories</option>${Bt.map(l=>i`<option key=${l} value=${l}>${l==="prompts"?"User prompts only":l[0].toUpperCase()+l.slice(1)}</option>`)}
      </select></label>
      ${o.category==="skills"?i`<label><span>Skill name</span><input list=${b+"-skills"} placeholder="Any skill" value=${o.skill_name} onInput=${l=>$("skill_name",l.currentTarget.value)}/></label>
        <datalist id=${b+"-skills"}>${(q=n==null?void 0:n.skills)==null?void 0:q.map(l=>i`<option value=${l} key=${l}/>`)}</datalist>
        <label><span>Skill evidence</span><select value=${o.skill_phase} onChange=${l=>$("skill_phase",l.currentTarget.value)}>
          <option value="">All evidence</option>${["loaded","invoked","reported","resolved"].map(l=>i`<option key=${l} value=${l}>${Me(l)}</option>`)}
        </select></label>`:i`<label><span>Tool name</span><input list=${b+"-tools"} placeholder="Any tool" value=${o.tool_name} onInput=${l=>$("tool_name",l.currentTarget.value)}/></label>`}
      <datalist id=${b+"-tools"}>${(C=n==null?void 0:n.tools)==null?void 0:C.map(l=>i`<option key=${l} value=${l}/>`)}</datalist>
      <label><span>Agent ID</span><input list=${b+"-agents"} placeholder="Any agent" value=${o.flow_agent} onInput=${l=>$("flow_agent",l.currentTarget.value)}/></label>
      <datalist id=${b+"-agents"}>${(m=n==null?void 0:n.agents)==null?void 0:m.map(l=>i`<option key=${l} value=${l}/>`)}</datalist>
      <label><span>Time range</span><select value=${o.range} onChange=${l=>f(l.currentTarget.value)}>
        <option value="whole">Whole session</option><option value="900" disabled=${!Number.isFinite(t.end)}>Last 15 min of session</option>
        <option value="3600" disabled=${!Number.isFinite(t.end)}>Last hour of session</option><option value="custom">Custom range</option>
      </select></label>
      ${o.range==="custom"&&i`<label><span>From (local)</span><input type="datetime-local" value=${o.start} onInput=${l=>$("start",l.currentTarget.value)}/></label>
        <label><span>To (local)</span><input type="datetime-local" value=${o.end} onInput=${l=>$("end",l.currentTarget.value)}/></label>`}
      <div class="bd-flow-actions">${o.category!=="skills"&&i`<label class="bd-ag-check"><input type="checkbox" checked=${o.failed} onChange=${l=>$("failed",l.currentTarget.checked)}/>Failures only</label>`}
        <button type="submit" class="bd-btn bd-p">Apply filters</button>
        <button type="button" class="bd-btn" onClick=${()=>{p(te),u(""),e("")}}>Reset filters</button>
      </div>
    </div>
    ${y&&i`<span class="bd-ag-bad" role="alert">${y}</span>`}
  </form>`}function Wt(e){if(!e)return null;try{const n=new URL(e);return["https:","http:"].includes(n.protocol)?n.href:null}catch{return null}}function Xt(e){return i`<${Qt} key=${e.a.id} ...${e}/>`}function Qt({a:e,st:n,ctx:t,act:d,flowRef:a,sid:c,captureMode:o,initialEvidence:p=!1,initialPrompts:y=!1,initialSkills:u=!1,agentData:b}){var Oe,Ee,Le,je,De,ve,Ae,Pe;const $=_t(n)?t.refreshKey:0,[k,f]=M(Qe),g=y?"prompts":u?"skills":"",[r,q]=M(g?"category="+g:""),C="limit="+k+(r?"&"+r:""),{data:m,error:l}=bt(I=>dt(e.id,C,{...I,nodeScope:t.nodeScope,nodeId:t.nodeId}),JSON.stringify(["flow",e.id,C]),t.remote?0:$),[T,N]=Fe(At,"timeline",["timeline","swimlane"]),[s,S]=Fe("aictl-pref-flow-lanes","individual",["individual","grouped"]),[_,h]=M(p),[O,K]=M(p),[v,A]=M(null);Ve(()=>{h(p),p&&K(!0)},[p]);const Y=_?"source":T,[W,x]=M(null),F=Ie({});m&&!new URLSearchParams(r).has("since")&&!new URLSearchParams(r).has("until")&&(!r||!F.current.end)&&(F.current={start:((Oe=m.scope)==null?void 0:Oe.start)??e.started_at,end:((Ee=m.scope)==null?void 0:Ee.end)??e.ended_at??((je=(Le=m.turns)==null?void 0:Le.at(-1))==null?void 0:je.ts)});const et={start:F.current.start??e.started_at,end:F.current.end??e.ended_at},be=t.toolName?t.toolName(e.tool):e.tool,G=H(()=>wt((m==null?void 0:m.turns)||[],be,m==null?void 0:m.summary),[m,be]),fe=H(()=>a?G.events.filter(I=>I[a.field]===a.id&&(!a.traceId||I.trace_id===a.traceId)):G.events,[G,a]),X=H(()=>v!=null?fe.filter(I=>I._turnIndex===v):fe,[fe,v]),ge=H(()=>W!=null&&X.find(I=>J(I)===W)||null,[X,W]),tt=I=>{h(I==="source"),I==="source"?K(!0):N(I)},st=I=>{I!==r&&(x(null),A(null),q(I),f(Qe))},$e=Wt(m==null?void 0:m.session_kql_url),L=m==null?void 0:m.scope,ie=c||(m==null?void 0:m.session_id),Ne=(De=t.data)==null?void 0:De.agents,nt=H(()=>[...new Set([ie,...(Ne||[]).map(I=>{var ze;return I.native_session_id?I.native_session_id:I.placeholder||(ze=I.id)!=null&&ze.startsWith("live:")||I.runtime_present&&!I.queryable?null:I.session_id||I.parent_id||I.id})].filter(Boolean))],[ie,Ne]),P=new URLSearchParams(r),ot=P.has("since")?Number(P.get("since")):null,at=P.has("until")?Number(P.get("until")):null,rt=c===void 0?e.native_session_id||e.session_id||(m==null?void 0:m.session_id):c,it=r?"Summary counts all events in the selected time span.":m&&We(m),j=G.summary,lt=[{label:"Turns",value:w(j.turns),title:"Prompts in the session"},{label:"Tool calls",value:w(j.toolCalls)},{label:"Subagents",value:w(j.subagents)},{label:"Hooks",value:w(j.hooks)},{label:"Errors",value:w(j.errors)},{label:"Compactions",value:w(j.compactions)},{label:"Tokens, total",value:w(j.cumulative),title:"Input and output of every model call, added up"},{label:"Largest turn",value:w(j.roundTrip),title:"The most input and output tokens between two prompts"},{label:"First token",value:j.ttft==null?Q:D(j.ttft),sub:j.ttftCalls?"median of "+j.ttftCalls+" calls":"",title:"Time to first token"}];return i`<${ft} a=${e}/>
    ${m&&!((ve=m.summary)!=null&&ve.skill_evidence)&&i`<${le} key="summary" id="agfs" title="Summary" sub=${it}><${ct} stats=${lt}/></${le}>`}
    <${le} key="flow" id="agfl" title="Flow" sub=${_?"Search retained source records separately from flow events.":U(m)&&!r?"Oldest first. The "+w(U(m))+" oldest events are left out; the summary counts them.":"Oldest first. Select an event to read it."}>
      <div class="bd-ag-bar bd-flow-toolbar">
        <${ue} label="Flow view" value=${Y} onPick=${tt} items=${[["timeline","Timeline"],["swimlane","Swim-lane"],["source","Source steps"]]}/>
        ${Y==="swimlane"&&i`<${ue} label="Participant lanes" value=${s} onPick=${S}
          items=${[["individual","Individual lanes"],["grouped","Group lanes"]]}/>`}
        ${m&&!_&&i`<span class="bd-flow-status" role="status">${L&&L.matched!=null&&L.total!=null?`Showing ${X.length.toLocaleString()} · ${L.matched.toLocaleString()} matched of ${L.total.toLocaleString()} events in range`:We(m)}</span>`}
        ${m&&!_&&U(m)&&k<Te?i`<button type="button" class="bd-btn" onClick=${()=>f(I=>Math.min(Te,I+He))}>${"Show "+Math.min(U(m),He).toLocaleString("en-US")+" older events"}</button>`:null}
        ${m&&!_&&U(m)&&k>=Te?i`<span class="bd-ag-dim">${w(U(m))} older matching events remain outside the display limit.</span>`:null}
        ${$e&&i`<a class="bd-btn bd-flow-kusto" href=${$e} target="_blank" rel="noopener noreferrer">Open session in Kusto</a>`}
      </div>
      ${$e&&i`<${vt} url=${m.session_kql_url} sessionId=${ie} nodeId=${m.node_id} sessions=${nt}
        models=${(Ae=L==null?void 0:L.models)!=null&&Ae.length?L.models:e.models||[]} tools=${(L==null?void 0:L.tools)||[]} since=${ot} until=${at}
        flowFilters=${Object.fromEntries(P)}/>`}
      <div hidden=${_}>
        <${Kt} scope=${L} bounds=${et} apply=${st} initialCategory=${g}
          activeCategory=${P.get("category")} activeFailed=${P.get("failed")==="1"}/>
        ${m&&i`<${Rt} turnGroups=${G.turnGroups} activeTurn=${v} onSelectTurn=${A}/>`}
        ${P.get("category")==="skills"&&i`<p class="bd-note">Loaded files and invocations are separate records. “Reported in context” groups OTel spans by skill; it does not count skill loads.</p>`}
        ${P.get("category")==="prompts"&&i`<p class="bd-note">User input only. Select a row to read the retained prompt. Assistant replies and delegated instructions are not included.</p>`}
        ${a&&i`<div class="bd-ag-bar"><span>${a.label} ID: ${a.id}</span><button type="button" class="bd-btn" onClick=${()=>{x(null),d.setDrawerTab("flow")}}>Show full flow</button></div>`}
        ${m?X.length?!_&&i`<div class=${"bd-flow-workspace"+(ge?" bd-has-insp":"")}>
            <div class="bd-flow-main">
              ${T==="swimlane"?i`<${Ut} events=${X} participants=${G.participants} filtered=${!!(r||a)} groupLanes=${s==="grouped"} sel=${W} onSel=${x} toolLabel=${be}/>`:i`<${Ft} events=${X} sel=${W} onSel=${x}/>`}
            </div>
            ${ge&&i`<${zt} ev=${ge} sessionId=${ie} onClose=${()=>x(null)}/>`}
          </div>`:i`<div class="bd-empty">${a?"No event in the loaded flow reports this source ID.":r?"No events match these flow filters.":"No flow data for this session: aictl has no prompt, model call or tool call of it, and no hook or OpenTelemetry event."}</div>`:i`<${gt} error=${l} what="the session flow"/>`}
      </div>
      ${O&&i`<div hidden=${!_}><${$t} inline=${!0} a=${e} sid=${rt} data=${b} ctx=${t} act=${d} captureMode=${o??((Pe=t.data)==null?void 0:Pe.capture_mode)}/></div>`}
    </${le}>`}export{Qe as FLOW_EVENTS,Te as FLOW_EVENTS_MAX,He as FLOW_EVENTS_STEP,At as FLOW_MODE_KEY,Xt as default};

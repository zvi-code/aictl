import{i as y,r as D,d as C,ao as Pe,m as d,K as fe,h as Ke,ap as ot,T as G,N as E,S as it,aq as Re,ar as rt,as as Me,at,b as ie}from"./index-boTeQ8c2.js";import{d as lt,b as B,i as dt,u as ut,e as De,S as ct,F as J,f as Le,W as pt,c as pe,p as Ae}from"./Drawer-CTNhpy3a.js";import mt from"./EvidenceTab-DP8m4AL_.js";import"./TextView-CzddMH0G.js";import"./LoadedConfiguration-D5tziZEO.js";const _t={user_message:()=>["user","tool"],api_call:e=>[e.from||"tool","api"],api_response:()=>["api","tool"],error:()=>["api","tool"],tool_use:e=>["tool","skill:"+(e.to||"tool")],subagent:e=>["tool","subagent:"+(e.to||"agent")],subagent_end:e=>["subagent:"+(e.from||"agent"),"tool"],hook:()=>["tool","hook"]},Be={user_message:{lane:"user",kind:"request"},api_call:{lane:"api",kind:"request"},api_response:{lane:"api",kind:"reply"},error:{lane:"error",kind:"reply"},tool_use:{lane:"tool",kind:"request"},subagent:{lane:"agent",kind:"request"},subagent_end:{lane:"agent",kind:"reply"},hook:{lane:"hook",kind:"hook"},session_start:{lane:"session",kind:"marker"},session_end:{lane:"session",kind:"marker"},compaction:{lane:"compact",kind:"marker"},context_update:{lane:"compact",kind:"marker"},session_command:{lane:"session",kind:"marker"},skill_event:{lane:"tool",kind:"marker"}},M={user:"var(--s1)",api:"var(--s2)",tool:"var(--s3)",agent:"var(--s5)",hook:"var(--s4)",session:"var(--good)",compact:"var(--warn)",error:"var(--crit)"};function bt(e){if(!e)return"";let s=e;if(typeof e=="string")try{s=JSON.parse(e)}catch{return e.slice(0,80)}if(typeof s!="object"||s===null)return String(e).slice(0,80);for(const n of["command","file_path","pattern","query","path","url","prompt","description","old_string","content","skill"])if(s[n])return String(s[n]).slice(0,100);const t=Object.keys(s);return t.length?String(s[t[0]]).slice(0,80):""}const me=e=>((e.tokens||{}).input||0)+((e.tokens||{}).output||0);function gt(e,s,t){const n=(e||[]).map(i=>{const g=_t[i.type],[T,a]=g?g(i):[null,null];return{...i,_from:T,_to:a}});let r=0,o=0,m=0;for(const i of n)i.type==="user_message"&&(o=0),i.type==="api_call"&&(r+=me(i),o+=me(i),m=Math.max(m,o)),i._cum=i.cum_tokens??r,i._rt=i.rt_tokens??o;const _=new Map;let f=0;const p=(i,g,T)=>{_.has(i)||_.set(i,{id:i,label:g,color:T||lt(f++)})};n.length&&(p("user","User",M.user),p("tool",s||"Tool","var(--ink2)"));for(const i of n)(i.type==="api_call"||i.type==="api_response"||i.type==="error")&&p("api","Model",M.api),i.type==="tool_use"&&p(i._to,i.to||"tool"),i.type==="subagent"&&p(i._to,i.to||"Subagent"),i.type==="subagent_end"&&p(i._from,i.from||"Subagent"),i.type==="hook"&&p("hook","Hooks",M.hook);const c=i=>n.filter(g=>g.type===i).length,u=n.filter(i=>i.type==="api_call"&&i.ttft_ms>0).map(i=>i.ttft_ms).sort((i,g)=>i-g),$=u.length?u.length%2?u[(u.length-1)/2]:(u[u.length/2-1]+u[u.length/2])/2:null,q=(t==null?void 0:t.cumulative_tokens)!=null?{turns:t.total_turns,toolCalls:t.total_tool_uses,subagents:t.subagents,hooks:t.hooks,errors:t.errors,compactions:t.compactions,cumulative:t.cumulative_tokens,roundTrip:t.largest_turn_tokens,ttft:t.ttft_ms??null,ttftCalls:t.ttft_calls||0}:{turns:c("user_message"),toolCalls:n.filter(i=>i.type==="tool_use"&&i.subtype!=="result"&&i.subtype!=="decision").length,subagents:c("subagent"),hooks:c("hook"),errors:c("error")+n.filter(i=>i.type==="api_call"&&i.is_error||i.type==="tool_use"&&i.success===!1).length,compactions:c("compaction"),cumulative:r,roundTrip:m,ttft:$,ttftCalls:u.length};return{events:n,participants:[..._.values()],summary:q}}function ft(e,s,t,n=!1){const r=new Set;for(const p of e)r.add(p._from),r.add(p._to);const o=s.filter(p=>!t||r.has(p.id)),m=[],_=new Map,f=new Map;for(const p of o){const c=n&&(p.id.startsWith("skill:")?"tools":p.id.startsWith("subagent:")?"agents":null),u=c?"group:"+c:p.id;_.has(u)||(_.set(u,m.length),m.push(c?{id:u,label:c==="tools"?"Tools":"Subagents",color:M[c==="tools"?"tool":"agent"]}:p)),f.set(p.id,_.get(u))}return{lanes:m,columns:f,grouped:m.length<o.length}}function se(e){const s=e.tokens||{};if(e.type==="user_message")return e.redacted?e.prompt_length?{label:"Prompt, text not sent ("+e.prompt_length+" characters)",meta:""}:{label:"Prompt, text not kept",meta:""}:{label:e.preview||e.message||"Prompt",meta:e.prompt_length?e.prompt_length+" characters":""};if(e.type==="api_call"){const t=[y(me(e))+" tokens"];return e.ttft_ms>0?t.push("first token "+D(e.ttft_ms)):e.duration_ms>0&&t.push(D(e.duration_ms)),e.is_error&&t.push("failed"),{label:e.agent_name||e.model||"Model call",meta:t.join(", ")}}if(e.type==="api_response"){const t=[e.model,e.finish_reason&&e.finish_reason!=="stop"?"stopped: "+e.finish_reason:""].filter(Boolean).join(", ");return{label:"Reply"+(s.output?", "+y(s.output)+" tokens":"")+(e.response_preview?": "+B(e.response_preview,80):""),meta:t}}if(e.type==="error")return{label:"Error: "+(e.error_type||"error"),meta:B(e.error_message||"",80)};if(e.type==="tool_use"){const t=bt(e.params)||(e.target?String(e.target).slice(0,100):"");let n="";return e.subtype==="result"||!e.subtype&&typeof e.success=="boolean"?n=(e.success===!0||e.success==="true"?"OK":"Failed")+(e.duration_ms>0?", "+D(e.duration_ms):""):e.subtype==="decision"&&(n=e.decision||""),{label:(e.to||"tool")+(t?": "+t:""),meta:n,size:e.result_size?e.result_size+" B":""}}if(e.type==="subagent")return{label:"Subagent "+(e.to||""),meta:B(e.prompt||e.model||"",80)};if(e.type==="subagent_end")return{label:"Subagent "+(e.from||"")+(e.completed===!1?" stopped":" done"),meta:e.duration_ms>0?D(e.duration_ms):""};if(e.type==="hook")return{label:"Hook "+(e.hook_name||""),meta:""};if(e.type==="session_start")return{label:"Session started",meta:e.cwd||""};if(e.type==="session_end")return{label:"Session ended",meta:""};if(e.type==="skill_event")return{label:`Skill: ${e.name||"Name not reported"}`,meta:[$e(e.phase),e.phase==="reported"&&Number.isFinite(e.reported_spans)&&`${e.reported_spans} distinct spans`,e.source].filter(Boolean).join(" · ")};if(["context_update","session_command"].includes(e.type))return{label:[{context_update:"Context",session_command:"Session command"}[e.type],e.name||e.phase].filter(Boolean).join(": "),meta:[e.name&&e.phase,e.context_tokens!=null&&`${y(e.context_tokens)} context tokens`,e.source].filter(Boolean).join(" · ")};if(e.type==="compaction"){const t=e.before_tokens!=null&&e.after_tokens!=null?y(e.before_tokens)+" to "+y(e.after_tokens)+" tokens":"";return{label:"Compaction"+(e.compaction_count?" "+e.compaction_count:""),meta:[t,e.duration_ms>0?D(e.duration_ms):""].filter(Boolean).join(", ")}}return{label:e.type||"Event",meta:""}}const $e=e=>({loaded:"Loaded",invoked:"Invoked",reported:"Reported in context",resolved:"Resolved"})[e]||e||"Not reported";function $t(e){return e.type==="user_message"?e.message||e.preview||"":e.type==="api_call"?e.request_preview||e.prompt_preview||"":e.type==="tool_use"?e.params||e.input_preview||e.target||"":e.type==="subagent"?e.prompt||"":e.type==="hook"&&e.hook_input||""}function yt(e){return e.type==="api_response"?e.response||e.response_preview||"":e.type==="api_call"&&e.is_error?e.error_message||"":e.type==="tool_use"?e.result_summary||e.result_preview||"":e.type==="error"?e.error_message||"":e.type==="hook"&&e.hook_output||""}function ht(e,s){const t=e.tokens||{},n=se(e),r=[{c:s,label:"Time",value:new Date(e.ts*1e3).toLocaleTimeString()}];return e.model&&r.push({c:"transparent",label:"Model",value:e.model}),(t.input||t.output)&&r.push({c:"transparent",label:"Input / output",value:y(t.input||0)+" / "+y(t.output||0)}),t.cache_read&&r.push({c:"transparent",label:"Cache read",value:y(t.cache_read)}),e.duration_ms>0&&r.push({c:"transparent",label:"Took",value:D(e.duration_ms)}),e.ttft_ms>0&&r.push({c:"transparent",label:"First token",value:D(e.ttft_ms)}),n.meta&&r.push({c:"transparent",label:"Detail",value:B(n.meta,60)}),{title:B(n.label,70),rows:r}}const A="_v:datetime _deleted:bool",P="session_id:string ts:real",z={session_steps:`step_key:string ${P} ['kind']:string phase:string name:string turn_id:string agent_id:string context_tokens:long context_limit:long before_tokens:long after_tokens:long ${A}`,requests:`rowid:long ${P} model:string input_tokens:long output_tokens:long cost_usd:real ${A}`,tool_invocations:`rowid:long ${P} tool_name:string is_error:long duration_ms:real ${A}`,OTELTraces:"StartTime:datetime SessionId:string TraceID:string SpanID:string Model:string ToolName:string OperationName:string InputTokens:long OutputTokens:long",agents:`agent_id:string session_id:string model:string started_at:real ended_at:real ${A}`,turn_request_links:`request_key:string ${P} agent_id:string turn_id:string root_session_id:string root_turn_id:string basis:string ${A}`},re=`step_key:string ${P} ['kind']:string role:string ['source']:string phase:string turn_id:string text_status:string ${A}`,kt=`step_key:string session_id:string ['text']:string ${A}`,We=`rowid:long dedup_key:string ${P} agent_id:string cost_usd:real ${A}`,He=e=>e.split(" ").map(s=>s.split(":")[0]),Z=(e,s)=>`union isfuzzy=true (datatable(${s.split(" ").join(", ")})[]), ${e}`,_e=`| top 500 by ts desc
| order by ts asc, step_key asc`,R="event_time=unixtime_seconds_todatetime(ts)",Fe=(e,s)=>`iff(countif(isnotnull(${e})) > 0, sum(${e}), ${s}(null))`,be={steps:{label:"Session steps timeline",table:"session_steps",description:"The latest 500 recorded steps, oldest first. No prompt or command text.",body:`${_e}
| project ${R}, step_key, ['kind'], phase, name, agent_id, turn_id`},requests:{label:"Requests and tokens by model",table:"requests",model:"model",description:"Request counts, reported tokens and positive recorded USD. A zero or missing price is counted as unpriced, not free.",body:`| extend priced=isnotnull(cost_usd) and isfinite(cost_usd) and cost_usd > 0
| summarize request_count=count(),
    input_tokens=${Fe("input_tokens","long")},
    output_tokens=${Fe("output_tokens","long")},
    recorded_usd=iff(countif(priced) > 0, sumif(cost_usd, priced), real(null)),
    unpriced_requests=countif(not(priced))
  by model
| order by request_count desc`},tools:{label:"Tool activity and failures",table:"tool_invocations",tool:"tool_name",description:"Calls, reported failures, missing outcomes, and mean reported duration by tool name.",body:`| summarize calls=count(), failures=countif(is_error == 1),
    unknown_outcomes=countif(isnull(is_error)), mean_duration_ms=avg(duration_ms)
  by tool_name
| order by calls desc`},failures:{label:"Failed tool calls",table:"tool_invocations",tool:"tool_name",description:"The latest 500 calls explicitly marked as errors, newest first.",body:`| where is_error == 1
| top 500 by ts desc
| project ${R}, rowid, tool_name, duration_ms`},context:{label:"Context changes, compaction and reset",table:"session_steps",description:"The latest 500 context events and related session commands, oldest first. A requested or dispatched command is not proof of a change; check its phase.",body:`| where ['kind'] == "context" or (['kind'] == "session_command" and name in ("model_change", "model", "clear", "reset", "new", "compact", "rewind"))
${_e}
| project ${R}, ['kind'], name, phase, agent_id, turn_id,
    context_tokens, context_limit, before_tokens, after_tokens`},spans:{label:"OpenTelemetry spans",table:"OTELTraces",model:"Model",tool:"ToolName",description:"The latest 500 identified spans, newest first. Model and tool filters apply to the same span.",body:`| top 500 by StartTime desc
| project StartTime, TraceID, SpanID, OperationName, Model, ToolName, InputTokens, OutputTokens`},prompts:{label:"User input prompts",table:"session_steps",fields:re,keyword:!0,description:"Search retained user messages for a word or phrase. Shows the first 240 characters of the latest 500 matches, oldest first. Missing text is not searchable.",body:(e,s)=>ae(e,s,"user")},assistant:{label:"Public assistant text and visible commentary",table:"session_steps",fields:re,keyword:!0,description:"Search retained public assistant messages for a word or phrase. Shows the first 240 characters of the latest 500 matches, not private reasoning.",body:(e,s)=>ae(e,s,"assistant")},commands:{label:"Commands: requests, starts and results",table:"session_steps",fields:`${re} name:string tool_call_id:string agent_id:string exit_code:long`,description:"Shell requests, native starts and tool results are separate events. Session command requests and dispatches are not proof of execution. A preview is shown only when retained.",body:(e,s)=>ae(e,s,"commands")},longest:{label:"Longest completed turn",table:"session_steps",fields:`${z.session_steps} ['source']:string`,description:"Requires one native start and one end for the same session, agent and turn, both in the time range. Incomplete or ambiguous pairs are excluded.",body:`| where ['kind'] == "turn" and isnotempty(turn_id)
| where (['source'] == "assistant.turn_start" and phase == "started") or (['source'] == "assistant.turn_end" and phase == "ended")
| summarize starts=countif(phase == "started"), ends=countif(phase == "ended"),
    start_ts=minif(ts, phase == "started"), end_ts=maxif(ts, phase == "ended") by session_id, agent_id, turn_id
| where starts == 1 and ends == 1 and end_ts >= start_ts
| extend duration_seconds=end_ts - start_ts
| order by duration_seconds desc, start_ts asc, agent_id asc, turn_id asc
| take 1
| project session_id, agent_id, turn_id, duration_seconds, started=unixtime_seconds_todatetime(start_ts), ended=unixtime_seconds_todatetime(end_ts)`},subagents:{label:"All session subagents",table:"agents",model:"model",key:"agent_id",clock:"started_at",description:"All recorded subagent IDs for this session, by start time when a time range is set. No task text.",body:`| where isnotempty(agent_id) and agent_id != session_id
| project session_id, agent_id, model, started=unixtime_seconds_todatetime(started_at), ended=unixtime_seconds_todatetime(ended_at)
| order by started asc nulls last, agent_id asc`},sizes:{label:"Tool response sizes in bytes",table:"tool_invocations",tool:"tool_name",fields:`${z.tool_invocations} output_bytes:long`,description:"Percentiles use recorded, nonnegative output byte counts, including measured zeros. Calls without measurements count as unknown.",body:`| extend bytes=iff(output_bytes >= 0, output_bytes, long(null))
| summarize calls=count(), known=countif(isnotnull(bytes)), unknown=countif(isnull(bytes)),
    p50_bytes=percentile(bytes, 50), p95_bytes=percentile(bytes, 95), p99_bytes=percentile(bytes, 99)`},mcp:{label:"MCP tool calls",table:"tool_invocations",tool:"tool_name",fields:`${z.tool_invocations} source_event_id:string agent_id:string`,description:"The latest 500 recorded invocations with MCP-style tool names (mcp prefix or server/tool). Names do not establish which servers were configured.",body:`| where tool_name matches regex @"^mcp(__|_|\\.|:)|^[\\w.-]+/[\\w.-]+$"
| top 500 by ts desc
| project ${R}, tool_name, agent_id, source_event_id, duration_ms, is_error`},reasoning:{label:"Reported reasoning token counts",table:"OTELTraces",model:"Model",fields:"StartTime:datetime SessionId:string TraceID:string SpanID:string Model:string OperationName:string ReasoningOutputTokens:long TraceAttributes:dynamic",project:'StartTime, SessionId, TraceID, SpanID, Model, OperationName, reasoning_tokens=coalesce(ReasoningOutputTokens, tolong(TraceAttributes["gen_ai.usage.reasoning.output_tokens"]))',description:"The latest 500 identified spans with a reported reasoning token count. Missing counts are not zero. Reads the numeric metric, not reasoning text.",body:`| where isnotnull(reasoning_tokens) and reasoning_tokens >= 0
| top 500 by StartTime desc
| project StartTime, TraceID, SpanID, Model, OperationName, reasoning_tokens`},costMain:{label:"Highest recorded turn cost: selected session, main agent",table:"requests",cost:"main",description:"Ranks direct main-agent turns by positive recorded USD, not invoice cost. Coverage includes unlinked and unpriced requests."},costTree:{label:"Highest recorded turn cost: session and linked descendants",table:"requests",cost:"tree",description:"Ranks root turns using explicit links. Coverage includes this session and requests explicitly linked back from other sessions; unlinked outside requests cannot be assigned."},costAll:{label:"Highest recorded turn cost: all sessions",table:"requests",cost:"all",description:"Ranks explicitly linked root turns across all sessions by positive recorded USD. Uses the Flow date bounds, or a seven-day window if a bound is missing."}};function ae(e,s,t){const n=t==="commands",r=n?", ['kind'], name, phase, agent_id, tool_call_id, exit_code":", phase",o=n?`| where (['kind'] == "session_command" and phase in ("requested", "queued", "dispatched"))
    or (name in ("bash", "powershell") and (
        (['kind'] == "tool_call" and phase == "requested" and ['source'] == "assistant.message")
        or (['kind'] == "command" and phase == "started" and ['source'] == "tool.execution_start")
        or (['kind'] == "tool_result" and phase in ("completed", "failed") and ['source'] == "tool.execution_complete")))`:`| where ['kind'] == "message" and role == "${t}" and ['source'] == "${t}.message"
${t==="assistant"?`| where phase in ("", "commentary", "response", "final", "final_answer")
`:""}| where text_status in ("captured", "truncated")`;return`${n?"":`let needle = ${W(s.keyword)};
`}let selected_steps = materialize(
${e}
${o}
| where isnotempty(step_key)
| project session_id, step_key, ts, turn_id, text_status${r});
selected_steps
| join kind=${n?"leftouter":"inner"} (
    ${Z("session_step_text",kt)}
    | where step_key in (selected_steps | where text_status in ("captured", "truncated") | project step_key)
    | project session_id, step_key, _v, _deleted, text_preview=substring(trim(@"\\s+", ['text']), 0, 240)${n?"":", matched=isempty(needle) or ['text'] contains needle"}
    | summarize arg_max(_v, *) by step_key
    | where not(coalesce(_deleted, false)) and session_id == sid and isnotempty(text_preview)${n?"":" and matched"}
    | project session_id, step_key, text_preview
) on session_id, step_key
${_e}
| project ${R}, step_key, turn_id${r}, text_status, ${t==="user"?"prompt_preview=text_preview":"text_preview"}`}const U=e=>typeof e=="string"?e:"",W=e=>JSON.stringify(U(e)).replace(/[\u007f-\u009f\u2028\u2029]/g,s=>"\\u"+s.charCodeAt(0).toString(16).padStart(4,"0")),ge=e=>typeof e=="number"?e:U(e).trim()?Number(e):NaN;function ee(e,s,t){if(e==null||e==="")return"";const n=ge(e);return Number.isFinite(n)?`
| where ${t} ${s} `+(t==="StartTime"?`unixtime_seconds_todatetime(${n})`:n):`
| where false // Invalid Flow time bound`}function wt({since:e,until:s}){const t=o=>Number.isFinite(ge(o))?`unixtime_seconds_todatetime(${ge(o)})`:"datetime(null)",n=e!=null&&e!=="",r=s!=null&&s!=="";return n?`let window_start = ${t(e)};
let window_end = ${r?t(s):"window_start + 7d"};`:`let window_end = ${r?t(s):"now()"};
let window_start = window_end - 7d;`}function St(e,s){const t=e==="all";if(t&&s.includeAllSessions!==!0)return"";const n=e==="tree",r=e==="main",o=t?`
| where ts >= (window_start - datetime(1970-01-01)) / 1s and ts < (window_end - datetime(1970-01-01)) / 1s`:ee(s.since,">=","ts")+ee(s.until,"<","ts"),_=(t?"":r?`
| where isnotempty(sid) and session_id == sid and isempty(agent_id)`:`
| where isnotempty(sid) and (session_id == sid or dedup_key in (possible_descendants))`)+o;return`${t?wt(s):`let sid = ${W(s.sessionId)};`}
let link_versions = ${Z("turn_request_links",z.turn_request_links)}
| project request_key, _v, _deleted, session_id, agent_id, turn_id, root_session_id, root_turn_id, basis;
${n?`let possible_descendants = link_versions | where root_session_id == sid and isnotempty(request_key) | distinct request_key;
`:""}let request_versions = ${Z("requests",We)}
| project rowid, _v, _deleted, ts, session_id, agent_id, dedup_key, cost_usd;
let candidate_ids = request_versions${_}
| distinct rowid;
let candidates = materialize(request_versions
| join kind=leftsemi (candidate_ids) on rowid
| summarize arg_max(_v, *) by rowid
| where not(coalesce(_deleted, false))${_}
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
${r?`| where isempty(link_agent)
`:n?`| where session_id == sid or root_session_id == sid
`:""}| join kind=leftouter (duplicate_keys) on session_id, dedup_key
| extend attributed=isnull(physical_rows) and (isempty(agent_id) or agent_id == link_agent) and ${r?"isnotempty(turn_id)":`isnotempty(root_turn_id) and ${n?"root_session_id == sid":"isnotempty(root_session_id)"}`},
    priced=isnotnull(cost_usd) and isfinite(cost_usd) and cost_usd > 0);
let coverage = facts
| summarize eligible_requests=count(), attributed_requests=countif(attributed), unpriced_requests=countif(not(priced)),
    attributed_priced_requests=countif(attributed and priced)
| extend row_type="Coverage", status=case(eligible_requests == 0, "No eligible requests", attributed_requests == 0, "No attributable turns",
    attributed_priced_requests == 0, "No positive recorded USD on attributed requests", "Ranking uses positive recorded USD only");
let winner = facts | where attributed
| summarize turn_requests=count(), turn_unpriced_requests=countif(not(priced)), recorded_usd=sumif(cost_usd, priced)
    by ${r?"session_id, turn_id":"root_session_id, root_turn_id"}
| where turn_requests > turn_unpriced_requests
| order by recorded_usd desc, ${r?"session_id asc, turn_id":"root_session_id asc, root_turn_id"} asc
| take 1
| extend row_type="Highest recorded cost";
union coverage, winner
| order by row_type asc`}function Tt({table:e,fields:s=z[e],project:t,key:n=e==="session_steps"?"step_key":"rowid",clock:r=e==="OTELTraces"?"StartTime":"ts",model:o,tool:m,body:_,cost:f},p){if(f)return St(f,p);const c=e==="OTELTraces",u=c?"SessionId":"session_id";let $=Z(e,s);return $+=`
| project ${t||He(s).join(", ")}`,c?($+=`
| where isnotempty(sid) and ${u} == sid and isnotempty(TraceID) and isnotempty(SpanID)`,$+=`
| summarize arg_max(StartTime, *) by TraceID, SpanID`):($+=`
| summarize arg_max(_v, *) by ${n}
| where not(coalesce(_deleted, false))`,$+=`
| where isnotempty(sid) and ${u} == sid`),$+=ee(p.since,">=",r)+ee(p.until,"<",r),o&&U(p.model)&&($+=`
| where ${o} == ${W(p.model)}`),m&&U(p.tool)&&($+=`
| where ${m} == ${W(p.tool)}`),`let sid = ${W(p.sessionId)};
`+(typeof _=="function"?_($,p):$+`
`+_)}function xt(e,s){if(!/^https:\/\//i.test(U(e))||!s.trim())return null;try{const t=new URL(e);return t.username||t.password||!/^\/[^/]+$/.test(t.pathname)?null:(t.hash="",t.search=new URLSearchParams({web:"1",autorun:"false",query:s}).toString(),t.href)}catch{return null}}const qt=[...new Set([...Object.keys(z),"where","project","summarize","order by","top","extend","take","distinct","count","countif","sum","avg","arg_max","isnotempty","isnotnull","unixtime_seconds_todatetime",...[...Object.values(z),...Object.values(be).map(e=>e.fields).filter(Boolean),We].flatMap(He).map(e=>e.replace(/^\['(.+)'\]$/,"$1"))])],le=e=>[...new Set(e.filter(s=>U(s).length>0))],de=e=>Array.isArray(e)?e:[],Ct=10;function je(e){var m,_;const{value:s,selectionStart:t,selectionEnd:n}=e;if(t!==n)return{prefix:"",start:t,end:n};const r=((m=s.slice(0,t).match(/[a-z_]\w*$/i))==null?void 0:m[0])||"",o=((_=s.slice(n).match(/^\w+/))==null?void 0:_[0])||"";return{prefix:r,start:t-r.length,end:n+o.length}}function X({id:e,label:s,value:t,options:n,onChange:r,editorRef:o,hint:m,placeholder:_}){const f=fe(null),p=o||f,[c,u]=C(null),[$,q]=C(-1),i=c==null?void 0:c.prefix.toLowerCase(),g=c?n.filter(b=>b.toLowerCase().startsWith(i)).slice(0,Ct):[],T=g.length>0,a=b=>`${e}-opt-${b}`,l=g[$]?a($):void 0;Ke(()=>{var b,k;l&&((k=(b=document.getElementById(l))==null?void 0:b.scrollIntoView)==null||k.call(b,{block:"nearest"}))},[l]);function S(b){u(b),q(-1)}function h(b){const k=p.current;o?(k.setRangeText(b==="kind"?"['kind']":b,c.start,c.end,"end"),r(k.value)):r(b),S(null)}function x(b){const k=b.currentTarget;r(k.value);const I=o?je(k):{prefix:k.value};S(!b.isComposing&&(!o||I.prefix)?I:null)}function O(b){if(!b.isComposing){if(o&&b.ctrlKey&&b.key===" "){b.preventDefault(),S(je(b.currentTarget));return}if(b.key==="Escape"&&c){b.preventDefault(),b.stopPropagation(),S(null);return}if(b.key==="ArrowDown"||b.key==="ArrowUp"){if(!c&&!o&&n.length)b.preventDefault(),S({prefix:""}),q(0);else if(T){b.preventDefault();const k=g.length;q(b.key==="ArrowDown"?($+1)%k:$<0?k-1:($+k-1)%k)}}else b.key==="Enter"&&l?(b.preventDefault(),h(g[$])):["Tab","ArrowLeft","ArrowRight","Home","End"].includes(b.key)&&S(null)}}const F={id:e,ref:p,value:t,placeholder:_,"aria-describedby":m,"aria-autocomplete":"list","aria-controls":e+"-list","aria-activedescendant":l,autocomplete:"off",spellcheck:!1,onInput:x,onKeyDown:O,onBlur:()=>S(null)};return d`<div class="bd-kql-field">
    <label for=${e}>${s}</label>
    ${o?d`<textarea ...${F} rows="9" onClick=${()=>S(null)}/>`:d`<input ...${F} role="combobox" aria-expanded=${T} onFocus=${()=>S({prefix:""})}/>`}
    <ul class="bd-kql-options" id=${e+"-list"} role="listbox" aria-label=${s+" suggestions"} hidden=${!T}>
      ${g.map((b,k)=>d`<li key=${b} id=${a(k)} role="option" aria-selected=${k===$}
        onMouseDown=${I=>I.preventDefault()} onClick=${()=>h(b)}>${b}</li>`)}
    </ul>
    ${c&&!o&&!T&&d`<small role="status">${t?"No matching suggestion. Using the value you typed.":"No observed values."}</small>`}
  </div>`}function It({id:e,generated:s,url:t}){const[n,r]=C(s),[o,m]=C(""),_=fe(null),f=e+"-hint",p=xt(t,n),c=$=>{m(""),r($)};async function u(){try{await navigator.clipboard.writeText(n),m("Query copied.")}catch{_.current.focus(),_.current.select(),m("Query selected. Use your device’s Copy command.")}}return d`<p id=${f}>Edit the KQL below. Type a prefix or press Ctrl+Space for tables, columns and operators.
    Changing an example or filter replaces your edits.</p>
    <${X} id=${e} label="KQL query" value=${n} options=${qt} onChange=${c} editorRef=${_} hint=${f}/>
    <div class="bd-kql-actions">
      ${p&&d`<a class="bd-btn bd-p" href=${p} target="_blank" rel="noopener noreferrer">Open in Kusto</a>`}
      <button type="button" class="bd-btn" disabled=${!n.trim()} onClick=${u}>Copy query</button>
      ${n!==s&&d`<button type="button" class="bd-btn" onClick=${()=>c(s)}>Restore example</button>`}
      <span role="status">${o}</span>
    </div>
    <p>${p?"Opens in Azure Data Explorer without running the query.":n.trim()?"No Kusto database link is available. You can still copy the query.":"Enter a query to copy or open it."}</p>`}function vt({base:e,url:s,sessionId:t,sessions:n,models:r,tools:o,since:m,until:_}){const[f,p]=C("steps"),[c,u]=C(U(t)),[$,q]=C(""),[i,g]=C(""),[T,a]=C(""),[l,S]=C(null),h=e+"-hint",x=be[f],O=x.cost==="all",F=JSON.stringify([m,_]),b=O&&l===F,k=Tt(x,{sessionId:c,model:$,tool:i,keyword:T,since:m,until:_,includeAllSessions:b});return d`<div class="bd-kql-body">
    <label class="bd-kql-field">Example<select value=${f} onChange=${I=>{p(I.currentTarget.value),S(null),a("")}}>
      ${Object.entries(be).map(([I,H])=>d`<option value=${I} key=${I}>${H.label}</option>`)}
    </select></label>
    <p><code>${x.table}</code> · ${x.description}</p>
    <div class="bd-kql-filters">
      ${O?d`<label><input type="checkbox" checked=${b}
        onChange=${I=>S(I.currentTarget.checked?F:null)}/> Include all sessions in this date range</label>`:d`<${X} id=${e+"-sid"} label="Session ID" value=${c} options=${le([t,...de(n)])} onChange=${u} hint=${h} placeholder="Enter a session ID"/>`}
      ${x.model&&d`<${X} id=${e+"-model"} key="model" label="Model (optional)" value=${$} options=${le(de(r))} onChange=${q} hint=${h} placeholder="Any model"/>`}
      ${x.tool&&d`<${X} id=${e+"-tool"} key="tool" label="Tool name (optional)" value=${i} options=${le(de(o))} onChange=${g} hint=${h} placeholder="Any tool"/>`}
      ${x.keyword&&d`<label class="bd-kql-field">Keyword or phrase (optional)
        <input type="text" value=${T} onInput=${I=>a(I.currentTarget.value)} autocomplete="off" placeholder="Search retained text"/>
      </label>`}
    </div>
    ${!c&&!O&&d`<p>Enter a session ID. An empty ID matches no rows.</p>`}
    ${x.keyword&&d`<p>The search term is included in the Kusto link. Matching text is returned only when you run the query in Kusto.</p>`}
    <p id=${h}>Type a prefix for suggestions. Use ↑ or ↓ and Enter to choose, or Esc to dismiss.
      Examples use Flow’s time range, not its event-list filters.</p>
    ${k&&d`<${It} id=${e+"-editor"} key=${k} generated=${k} url=${s}/>`}
  </div>`}function Nt({url:e,sessionId:s,sessions:t,models:n,tools:r,since:o,until:m}){const[_,f]=C(!1),p="session-kql-"+Pe();return d`<details class="bd-kql" onToggle=${c=>{c.currentTarget.open&&f(!0)}}>
    <summary>Query in Kusto</summary>
    ${_&&d`<${vt} key=${s} ...${{base:p,url:e,sessionId:s,sessions:t,models:n,tools:r,since:o,until:m}}/>`}
  </details>`}const Ot="aictl-pref-session_flow_mode";function Qe({ev:e,onClose:s}){const t=se(e),n=e.tokens||{},r=e.type==="api_call"?y(n.input||0)+" tokens in":e.type==="api_response"?y(n.output||0)+" tokens out":e.result_size?e.result_size+" B out":e.prompt_length?e.prompt_length+" characters":E,o=e.decision||(e.success===!1||e.success==="false"?"Failed":e.success===!0||e.success==="true"?"OK":E),m=[["Type",e.type==="user_message"?"User input prompt":e.type||E],["Time",ie(e.ts,!0)],["Took",e.duration_ms?D(e.duration_ms):E],["Size",r],["Model",e.model||E],["Result",o]];e.type==="skill_event"&&(m.splice(0,m.length,["Skill",e.name],["Evidence",$e(e.phase)],["Source",e.source],[e.phase==="reported"?"First reported in range":"Time",ie(e.ts,!0)]),e.phase==="reported"&&m.push(["Last reported in range",ie(e.last_ts,!0)],["Distinct spans",y(e.reported_spans)]),e.agent_id&&m.push(["Agent ID",e.agent_id])),e.type==="user_message"&&m.push(["Source",e.source||E],["Text",e.text_status||(e.redacted?"Not retained":"Recorded")]);const _=Ae($t(e)),f=Ae(yt(e));return d`<div class="bd-ag-insp" role="region" aria-label="Selected event">
    <div class="bd-ag-insph"><b title=${t.label}>${t.label}</b><button type="button" class="bd-btn" onClick=${s}>Close</button></div>
    <dl class="bd-ag-kv">${m.map(([p,c])=>d`<div key=${p}><dt>${p}</dt><dd>${c}</dd></div>`)}</dl>
    ${_?d`<div class="bd-ag-sect">${e.type==="user_message"?"Your prompt":"Input"}</div><pre class="bd-ag-pre">${_}</pre>`:null}
    ${f?d`<div class="bd-ag-sect">Output</div><pre class="bd-ag-pre">${f}</pre>`:null}
  </div>`}const Ve=(e,s)=>t=>at(t.clientX,t.clientY,ht(e,s)),te=e=>e.step_key||e.event_id||e;function Mt({events:e,sel:s,onSel:t}){return d`<ul class="bd-ag-tl" aria-label="Events, oldest first">${e.map((n,r)=>{const o=Be[n.type]||{lane:"tool",kind:"request"},m=n.type==="api_call"&&n.is_error?M.error:M[o.lane]||"var(--ink3)",_=se(n),f=s===te(n);return d`<li key=${n.step_key||n.event_id||r}>
      <button type="button" class=${"bd-ag-tlrow"+(f?" bd-on":"")} aria-expanded=${f?"true":"false"}
        onClick=${()=>t(f?null:te(n))} onMouseMove=${Ve(n,m)} onMouseLeave=${Re}>
        <span class="bd-ag-when">${pe(n.ts)}${n._cum?d`<em>${y(n._cum)+" total"+(n._rt?", "+y(n._rt)+" this turn":"")}</em>`:null}</span>
        <span class="bd-ag-dot" style=${{borderColor:m,background:o.kind==="reply"||o.kind==="marker"?m:"transparent"}}></span>
        <span class="bd-ag-body"><span class="bd-ag-lane" style=${{color:m}}>${o.lane}</span><span class="bd-ag-lbl">${_.label}</span>${_.meta?d`<span class="bd-ag-meta">${_.meta}</span>`:null}</span>
        <span class="bd-ag-size">${_.size||""}</span>
      </button>
      ${f?d`<${Qe} ev=${n} onClose=${()=>t(null)}/>`:null}
    </li>`})}</ul>`}function Dt({events:e,participants:s,filtered:t,groupLanes:n,sel:r,onSel:o}){const{lanes:m,columns:_}=G(()=>ft(e,s,t,n),[e,s,t,n]),f=m.length||1,p=u=>_.get(u)??-1,c=u=>(u+.5)/f*100;return d`<div class="bd-ag-sl" style=${{"--flow-diagram-width":158+f*96+"px","--flow-lane-pitch":100/f+"%"}} tabindex="0" role="list" aria-label="Events between participants, oldest first">
    <div class="bd-ag-slhead" aria-hidden="true"><span>Total</span><span>Turn</span><span>Time</span>
      <span class="bd-ag-slarea">${m.map((u,$)=>d`<b key=${u.id} style=${{left:c($)+"%",color:u.color,borderColor:u.color}} title=${u.label}>${u.label}</b>`)}</span>
    </div>
    ${e.map((u,$)=>{const q=p(u._from),i=p(u._to),g=se(u),T=r===te(u),a=m[i],l=u.type==="error"||u.is_error?M.error:u.type==="user_message"?M.user:u.type==="api_response"?M.api:(a==null?void 0:a.color)||"var(--ink2)";let S;if(q<0||i<0){const h=M[(Be[u.type]||{}).lane]||"var(--ink3)";S=d`<span class="bd-ag-marker" style=${{color:h,borderColor:h}}>${g.label}${g.meta?" · "+g.meta:""}</span>`}else{const h=Math.min(q,i),x=Math.max(q,i),O=i>q;S=d`<span class="bd-ag-arrow" style=${{left:c(h)+"%",width:c(x)-c(h)+"%",borderColor:l}}>
          <span class=${"bd-ag-head"+(O?" bd-r":" bd-l")} style=${{color:l}}></span>
        </span>
        <span class="bd-ag-alabel" style=${{left:(c(h)+c(x))/2+"%",color:l}} title=${g.label}>${g.label}${g.meta?d`<em>${g.meta}</em>`:null}</span>`}return d`<div key=${u.step_key||u.event_id||$} role="listitem">
        <button type="button" class=${"bd-ag-slrow"+(T?" bd-on":"")} aria-expanded=${T?"true":"false"} aria-label=${pe(u.ts)+" "+g.label}
          onClick=${()=>o(T?null:te(u))} onMouseMove=${Ve(u,l)} onMouseLeave=${Re}>
          <span>${u._cum?y(u._cum):""}</span><span>${u._rt?y(u._rt):""}</span><span>${pe(u.ts)}</span>
          <span class="bd-ag-slarea">${S}</span>
        </button>
        ${T?d`<${Qe} ev=${u} onClose=${()=>o(null)}/>`:null}
      </div>`})}
  </div>`}const L=e=>{var s;return((s=e==null?void 0:e.summary)==null?void 0:s.omitted_events)||0},Ee=e=>{const s=(e.turns||[]).length;return L(e)?"Newest "+y(s)+" of "+y(s+L(e))+" events":y(s)+" events"},ze=500,Ue=1e3,ue=5e3,ce={q:"",category:"",tool_name:"",flow_agent:"",skill_name:"",skill_phase:"",failed:!1,range:"whole",start:"",end:""},Lt=["prompts","messages","models","tools","skills","agents","context","hooks","lifecycle"];function At({apply:e,scope:s,bounds:t,initialCategory:n,activeCategory:r}){var i,g,T;const[o,m]=C(()=>({...ce,category:n})),[_,f]=C(""),p=Pe(),c=(a,l)=>{m(S=>({...S,[a]:l})),f("")},u=a=>{a.preventDefault();const l=new URLSearchParams,S=["q","category","flow_agent",...o.category==="skills"?["skill_name","skill_phase"]:["tool_name"]];for(const x of S)o[x].trim()&&l.set(x,o[x].trim());o.failed&&o.category!=="skills"&&l.set("failed","1");let h;if(o.range==="custom")h=rt(o.start,o.end);else if(o.range!=="whole"){if(!Number.isFinite(t.end)){f("The session end time has not been reported.");return}h={since:t.end-Number(o.range),until:t.end}}if(h!=null&&h.error){f(h.error);return}h&&(l.set("since",Math.floor(h.since)),l.set("until",Math.ceil(h.until))),f(""),e(l.toString())},$=a=>{if(a!=="custom"){c("range",a);return}f(""),m(l=>({...l,range:a,start:l.start||(Number.isFinite(t.start)?Me(t.start):""),end:l.end||(Number.isFinite(t.end)?Me(Math.ceil(t.end/60)*60):"")}))},q=a=>{const l={...ce,category:r===a?"":a};m(l),f(""),e(l.category?"category="+a:"")};return d`<form class="bd-flow-filters" role="search" aria-label="Flow filters" onSubmit=${u}>
    <button type="button" class="bd-btn" aria-pressed=${r==="prompts"} onClick=${()=>q("prompts")}>User prompts</button>
    <button type="button" class="bd-btn" aria-pressed=${r==="skills"} onClick=${()=>q("skills")}>Skills</button>
    <label class="bd-flow-search">${o.category==="prompts"?"Search prompt text":"Search events"}<input type="search" placeholder=${o.category==="prompts"?"Words you wrote in this session":"Search the session flow"} value=${o.q} onInput=${a=>c("q",a.currentTarget.value)}/></label>
    <label>Category<select value=${o.category} onChange=${a=>c("category",a.currentTarget.value)}>
      <option value="">All categories</option>${Lt.map(a=>d`<option key=${a} value=${a}>${a==="prompts"?"User prompts only":a[0].toUpperCase()+a.slice(1)}</option>`)}
    </select></label>
    ${o.category==="skills"?d`<label>Skill name<input list=${p+"-skills"} placeholder="Any skill" value=${o.skill_name} onInput=${a=>c("skill_name",a.currentTarget.value)}/></label>
      <datalist id=${p+"-skills"}>${(i=s==null?void 0:s.skills)==null?void 0:i.map(a=>d`<option value=${a} key=${a}/>`)}</datalist>
      <label>Skill evidence<select value=${o.skill_phase} onChange=${a=>c("skill_phase",a.currentTarget.value)}>
        <option value="">All evidence</option>${["loaded","invoked","reported","resolved"].map(a=>d`<option key=${a} value=${a}>${$e(a)}</option>`)}
      </select></label>`:d`<label>Tool name<input list=${p+"-tools"} placeholder="Any tool" value=${o.tool_name} onInput=${a=>c("tool_name",a.currentTarget.value)}/></label>`}
    <datalist id=${p+"-tools"}>${(g=s==null?void 0:s.tools)==null?void 0:g.map(a=>d`<option key=${a} value=${a}/>`)}</datalist>
    <label>Agent ID<input list=${p+"-agents"} placeholder="Any agent" value=${o.flow_agent} onInput=${a=>c("flow_agent",a.currentTarget.value)}/></label>
    <datalist id=${p+"-agents"}>${(T=s==null?void 0:s.agents)==null?void 0:T.map(a=>d`<option key=${a} value=${a}/>`)}</datalist>
    <label>Time range<select value=${o.range} onChange=${a=>$(a.currentTarget.value)}>
      <option value="whole">Whole session</option><option value="900" disabled=${!Number.isFinite(t.end)}>Last 15 min of session</option>
      <option value="3600" disabled=${!Number.isFinite(t.end)}>Last hour of session</option><option value="custom">Custom range</option>
    </select></label>
    ${o.range==="custom"&&d`<label>From (local)<input type="datetime-local" value=${o.start} onInput=${a=>c("start",a.currentTarget.value)}/></label>
      <label>To (local)<input type="datetime-local" value=${o.end} onInput=${a=>c("end",a.currentTarget.value)}/></label>`}
    <div class="bd-flow-actions">${o.category!=="skills"&&d`<label class="bd-ag-check"><input type="checkbox" checked=${o.failed} onChange=${a=>c("failed",a.currentTarget.checked)}/>Failures only</label>`}
      <button type="submit" class="bd-btn">Apply filters</button>
      <button type="button" class="bd-btn" onClick=${()=>{m(ce),f(""),e("")}}>Reset filters</button>
    </div>
    ${_&&d`<span class="bd-ag-bad" role="alert">${_}</span>`}
  </form>`}function Ft(e){if(!e)return null;try{const s=new URL(e);return["https:","http:"].includes(s.protocol)?s.href:null}catch{return null}}function Rt(e){return d`<${jt} key=${e.a.id} ...${e}/>`}function jt({a:e,st:s,ctx:t,act:n,flowRef:r,sid:o,captureMode:m,initialEvidence:_=!1,initialPrompts:f=!1,initialSkills:p=!1,agentData:c}){var Se,Te,xe,qe,Ce,Ie,ve,Ne;const u=dt(s)?t.refreshKey:0,[$,q]=C(ze),i=f?"prompts":p?"skills":"",[g,T]=C(i?"category="+i:""),a="limit="+$+(g?"&"+g:""),{data:l,error:S}=ut(w=>ot(e.id,a,w),JSON.stringify(["flow",e.id,a]),u),[h,x]=De(Ot,"timeline",["timeline","swimlane"]),[O,F]=De("aictl-pref-flow-lanes","individual",["individual","grouped"]),[b,k]=C(_),[I,H]=C(_);Ke(()=>{k(_),_&&H(!0)},[_]);const ye=b?"source":h,[he,Q]=C(null),V=fe({});l&&!new URLSearchParams(g).has("since")&&!new URLSearchParams(g).has("until")&&(!g||!V.current.end)&&(V.current={start:((Se=l.scope)==null?void 0:Se.start)??e.started_at,end:((Te=l.scope)==null?void 0:Te.end)??e.ended_at??((qe=(xe=l.turns)==null?void 0:xe.at(-1))==null?void 0:qe.ts)});const Ye={start:V.current.start??e.started_at,end:V.current.end??e.ended_at},ke=t.toolName?t.toolName(e.tool):e.tool,K=G(()=>gt((l==null?void 0:l.turns)||[],ke,l==null?void 0:l.summary),[l,ke]),Y=G(()=>r?K.events.filter(w=>w[r.field]===r.id&&(!r.traceId||w.trace_id===r.traceId)):K.events,[K,r]),Je=w=>{k(w==="source"),w==="source"?H(!0):x(w)},Ge=w=>{w!==g&&(Q(null),T(w),q(ze))},ne=Ft(l==null?void 0:l.session_kql_url),v=l==null?void 0:l.scope,oe=o||(l==null?void 0:l.session_id),we=(Ce=t.data)==null?void 0:Ce.agents,Xe=G(()=>[...new Set([oe,...(we||[]).map(w=>{var Oe;return w.native_session_id?w.native_session_id:w.placeholder||(Oe=w.id)!=null&&Oe.startsWith("live:")||w.runtime_present&&!w.queryable?null:w.session_id||w.parent_id||w.id})].filter(Boolean))],[oe,we]),j=new URLSearchParams(g),Ze=j.has("since")?Number(j.get("since")):null,et=j.has("until")?Number(j.get("until")):null,tt=o===void 0?e.native_session_id||e.session_id||(l==null?void 0:l.session_id):o,st=g?"Summary counts all events in the selected time span.":l&&Ee(l),N=K.summary,nt=[{label:"Turns",value:y(N.turns),title:"Prompts in the session"},{label:"Tool calls",value:y(N.toolCalls)},{label:"Subagents",value:y(N.subagents)},{label:"Hooks",value:y(N.hooks)},{label:"Errors",value:y(N.errors)},{label:"Compactions",value:y(N.compactions)},{label:"Tokens, total",value:y(N.cumulative),title:"Input and output of every model call, added up"},{label:"Largest turn",value:y(N.roundTrip),title:"The most input and output tokens between two prompts"},{label:"First token",value:N.ttft==null?E:D(N.ttft),sub:N.ttftCalls?"median of "+N.ttftCalls+" calls":"",title:"Time to first token"}];return d`<${ct} a=${e}/>
    ${l&&!((Ie=l.summary)!=null&&Ie.skill_evidence)&&d`<${J} key="summary" id="agfs" title="Summary" sub=${st}><${it} stats=${nt}/></${J}>`}
    <${J} key="flow" id="agfl" title="Flow" sub=${b?"Search retained source records separately from flow events.":L(l)&&!g?"Oldest first. The "+y(L(l))+" oldest events are left out; the summary counts them.":"Oldest first. Select an event to read it."}>
      <div class="bd-ag-bar"><${Le} label="Flow view" value=${ye} onPick=${Je} items=${[["timeline","Timeline"],["swimlane","Swim-lane"],["source","Source steps"]]}/>
        ${ye==="swimlane"&&d`<${Le} label="Participant lanes" value=${O} onPick=${F}
          items=${[["individual","Individual lanes"],["grouped","Group lanes"]]}/>`}
        ${ne&&d`<a class="bd-btn bd-flow-kusto" href=${ne} target="_blank" rel="noopener noreferrer">Open session in Kusto</a>`}
      </div>
      ${ne&&d`<${Nt} url=${l.session_kql_url} sessionId=${oe} sessions=${Xe}
        models=${(ve=v==null?void 0:v.models)!=null&&ve.length?v.models:e.models||[]} tools=${(v==null?void 0:v.tools)||[]} since=${Ze} until=${et}/>`}
      <div hidden=${b}>
        <${At} scope=${v} bounds=${Ye} apply=${Ge} initialCategory=${i} activeCategory=${j.get("category")}/>
        ${j.get("category")==="skills"&&d`<p class="bd-note">Loaded files and invocations are separate records. “Reported in context” groups OTel spans by skill; it does not count skill loads.</p>`}
        ${j.get("category")==="prompts"&&d`<p class="bd-note">User input only. Select a row to read the retained prompt. Assistant replies and delegated instructions are not included.</p>`}
        ${r&&d`<div class="bd-ag-bar"><span>${r.label} ID: ${r.id}</span><button type="button" class="bd-btn" onClick=${()=>{Q(null),n.setDrawerTab("flow")}}>Show full flow</button></div>`}
        ${l?d`
          <div class="bd-ag-bar"><span role="status">${v&&v.matched!=null&&v.total!=null?`Showing ${Y.length.toLocaleString()} · ${v.matched.toLocaleString()} matched of ${v.total.toLocaleString()} events in range`:Ee(l)}</span>
            ${L(l)&&$<ue?d`<button type="button" class="bd-btn" onClick=${()=>q(w=>Math.min(ue,w+Ue))}>${"Show "+Math.min(L(l),Ue).toLocaleString("en-US")+" older events"}</button>`:null}
            ${L(l)&&$>=ue?d`<span class="bd-ag-dim">${y(L(l))} older matching events remain outside the display limit.</span>`:null}
          </div>
          ${Y.length?!b&&(h==="swimlane"?d`<${Dt} events=${Y} participants=${K.participants} filtered=${!!(g||r)} groupLanes=${O==="grouped"} sel=${he} onSel=${Q}/>`:d`<${Mt} events=${Y} sel=${he} onSel=${Q}/>`):d`<div class="bd-empty">${r?"No event in the loaded flow reports this source ID.":g?"No events match these flow filters.":"No flow data for this session: aictl has no prompt, model call or tool call of it, and no hook or OpenTelemetry event."}</div>`}
        `:d`<${pt} error=${S} what="the session flow"/>`}
      </div>
      ${I&&d`<div hidden=${!b}><${mt} inline=${!0} a=${e} sid=${tt} data=${c} act=${n} captureMode=${m??((Ne=t.data)==null?void 0:Ne.capture_mode)}/></div>`}
    </${J}>`}export{ze as FLOW_EVENTS,ue as FLOW_EVENTS_MAX,Ue as FLOW_EVENTS_STEP,Ot as FLOW_MODE_KEY,Rt as default};

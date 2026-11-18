import{i as y,r as L,d as C,ao as Ee,m as l,K as fe,h as je,ap as et,T as X,N as j,S as tt,aq as ze,ar as st,as as Ne,at as nt,b as ie}from"./index-k8Tfsb8b.js";import{d as ot,b as B,i as it,u as rt,e as at,S as lt,F as J,f as dt,W as ct,c as pe,p as Oe}from"./Drawer-CkT8Tif8.js";import ut from"./EvidenceTab-CicwJDx3.js";import"./TextView-Ckwn8cDd.js";import"./LoadedConfiguration-BLJT91gZ.js";const pt={user_message:()=>["user","tool"],api_call:e=>[e.from||"tool","api"],api_response:()=>["api","tool"],error:()=>["api","tool"],tool_use:e=>["tool","skill:"+(e.to||"tool")],subagent:e=>["tool","subagent:"+(e.to||"agent")],subagent_end:e=>["subagent:"+(e.from||"agent"),"tool"],hook:()=>["tool","hook"]},Ue={user_message:{lane:"user",kind:"request"},api_call:{lane:"api",kind:"request"},api_response:{lane:"api",kind:"reply"},error:{lane:"error",kind:"reply"},tool_use:{lane:"tool",kind:"request"},subagent:{lane:"agent",kind:"request"},subagent_end:{lane:"agent",kind:"reply"},hook:{lane:"hook",kind:"hook"},session_start:{lane:"session",kind:"marker"},session_end:{lane:"session",kind:"marker"},compaction:{lane:"compact",kind:"marker"},context_update:{lane:"compact",kind:"marker"},session_command:{lane:"session",kind:"marker"},skill_event:{lane:"tool",kind:"marker"}},M={user:"var(--s1)",api:"var(--s2)",tool:"var(--s3)",agent:"var(--s5)",hook:"var(--s4)",session:"var(--good)",compact:"var(--warn)",error:"var(--crit)"};function mt(e){if(!e)return"";let s=e;if(typeof e=="string")try{s=JSON.parse(e)}catch{return e.slice(0,80)}if(typeof s!="object"||s===null)return String(e).slice(0,80);for(const n of["command","file_path","pattern","query","path","url","prompt","description","old_string","content","skill"])if(s[n])return String(s[n]).slice(0,100);const t=Object.keys(s);return t.length?String(s[t[0]]).slice(0,80):""}const me=e=>((e.tokens||{}).input||0)+((e.tokens||{}).output||0);function _t(e,s,t){const n=(e||[]).map(r=>{const g=pt[r.type],[T,a]=g?g(r):[null,null];return{...r,_from:T,_to:a}});let i=0,o=0,m=0;for(const r of n)r.type==="user_message"&&(o=0),r.type==="api_call"&&(i+=me(r),o+=me(r),m=Math.max(m,o)),r._cum=r.cum_tokens??i,r._rt=r.rt_tokens??o;const _=new Map;let f=0;const p=(r,g,T)=>{_.has(r)||_.set(r,{id:r,label:g,color:T||ot(f++)})};n.length&&(p("user","User",M.user),p("tool",s||"Tool","var(--ink2)"));for(const r of n)(r.type==="api_call"||r.type==="api_response"||r.type==="error")&&p("api","Model",M.api),r.type==="tool_use"&&p(r._to,r.to||"tool"),r.type==="subagent"&&p(r._to,r.to||"Subagent"),r.type==="subagent_end"&&p(r._from,r.from||"Subagent"),r.type==="hook"&&p("hook","Hooks",M.hook);const u=r=>n.filter(g=>g.type===r).length,c=n.filter(r=>r.type==="api_call"&&r.ttft_ms>0).map(r=>r.ttft_ms).sort((r,g)=>r-g),$=c.length?c.length%2?c[(c.length-1)/2]:(c[c.length/2-1]+c[c.length/2])/2:null,q=(t==null?void 0:t.cumulative_tokens)!=null?{turns:t.total_turns,toolCalls:t.total_tool_uses,subagents:t.subagents,hooks:t.hooks,errors:t.errors,compactions:t.compactions,cumulative:t.cumulative_tokens,roundTrip:t.largest_turn_tokens,ttft:t.ttft_ms??null,ttftCalls:t.ttft_calls||0}:{turns:u("user_message"),toolCalls:n.filter(r=>r.type==="tool_use"&&r.subtype!=="result"&&r.subtype!=="decision").length,subagents:u("subagent"),hooks:u("hook"),errors:u("error")+n.filter(r=>r.type==="api_call"&&r.is_error||r.type==="tool_use"&&r.success===!1).length,compactions:u("compaction"),cumulative:i,roundTrip:m,ttft:$,ttftCalls:c.length};return{events:n,participants:[..._.values()],summary:q}}function bt(e,s,t){const n=new Set;for(const p of e)n.add(p._from),n.add(p._to);const i=s.filter(p=>!t||n.has(p.id)),o=i.length>8,m=[],_=new Map,f=new Map;for(const p of i){const u=o&&(p.id.startsWith("skill:")?"tools":p.id.startsWith("subagent:")?"agents":null),c=u?"group:"+u:p.id;_.has(c)||(_.set(c,m.length),m.push(u?{id:c,label:u==="tools"?"Tools":"Subagents",color:M[u==="tools"?"tool":"agent"]}:p)),f.set(p.id,_.get(c))}return{lanes:m,columns:f,grouped:m.length<i.length}}function se(e){const s=e.tokens||{};if(e.type==="user_message")return e.redacted?e.prompt_length?{label:"Prompt, text not sent ("+e.prompt_length+" characters)",meta:""}:{label:"Prompt, text not kept",meta:""}:{label:e.preview||e.message||"Prompt",meta:e.prompt_length?e.prompt_length+" characters":""};if(e.type==="api_call"){const t=[y(me(e))+" tokens"];return e.ttft_ms>0?t.push("first token "+L(e.ttft_ms)):e.duration_ms>0&&t.push(L(e.duration_ms)),e.is_error&&t.push("failed"),{label:e.agent_name||e.model||"Model call",meta:t.join(", ")}}if(e.type==="api_response"){const t=[e.model,e.finish_reason&&e.finish_reason!=="stop"?"stopped: "+e.finish_reason:""].filter(Boolean).join(", ");return{label:"Reply"+(s.output?", "+y(s.output)+" tokens":"")+(e.response_preview?": "+B(e.response_preview,80):""),meta:t}}if(e.type==="error")return{label:"Error: "+(e.error_type||"error"),meta:B(e.error_message||"",80)};if(e.type==="tool_use"){const t=mt(e.params)||(e.target?String(e.target).slice(0,100):"");let n="";return e.subtype==="result"||!e.subtype&&typeof e.success=="boolean"?n=(e.success===!0||e.success==="true"?"OK":"Failed")+(e.duration_ms>0?", "+L(e.duration_ms):""):e.subtype==="decision"&&(n=e.decision||""),{label:(e.to||"tool")+(t?": "+t:""),meta:n,size:e.result_size?e.result_size+" B":""}}if(e.type==="subagent")return{label:"Subagent "+(e.to||""),meta:B(e.prompt||e.model||"",80)};if(e.type==="subagent_end")return{label:"Subagent "+(e.from||"")+(e.completed===!1?" stopped":" done"),meta:e.duration_ms>0?L(e.duration_ms):""};if(e.type==="hook")return{label:"Hook "+(e.hook_name||""),meta:""};if(e.type==="session_start")return{label:"Session started",meta:e.cwd||""};if(e.type==="session_end")return{label:"Session ended",meta:""};if(e.type==="skill_event")return{label:`Skill: ${e.name||"Name not reported"}`,meta:[$e(e.phase),e.phase==="reported"&&Number.isFinite(e.reported_spans)&&`${e.reported_spans} distinct spans`,e.source].filter(Boolean).join(" · ")};if(["context_update","session_command"].includes(e.type))return{label:[{context_update:"Context",session_command:"Session command"}[e.type],e.name||e.phase].filter(Boolean).join(": "),meta:[e.name&&e.phase,e.context_tokens!=null&&`${y(e.context_tokens)} context tokens`,e.source].filter(Boolean).join(" · ")};if(e.type==="compaction"){const t=e.before_tokens!=null&&e.after_tokens!=null?y(e.before_tokens)+" to "+y(e.after_tokens)+" tokens":"";return{label:"Compaction"+(e.compaction_count?" "+e.compaction_count:""),meta:[t,e.duration_ms>0?L(e.duration_ms):""].filter(Boolean).join(", ")}}return{label:e.type||"Event",meta:""}}const $e=e=>({loaded:"Loaded",invoked:"Invoked",reported:"Reported in context",resolved:"Resolved"})[e]||e||"Not reported";function gt(e){return e.type==="user_message"?e.message||e.preview||"":e.type==="api_call"?e.request_preview||e.prompt_preview||"":e.type==="tool_use"?e.params||e.input_preview||e.target||"":e.type==="subagent"?e.prompt||"":e.type==="hook"&&e.hook_input||""}function ft(e){return e.type==="api_response"?e.response||e.response_preview||"":e.type==="api_call"&&e.is_error?e.error_message||"":e.type==="tool_use"?e.result_summary||e.result_preview||"":e.type==="error"?e.error_message||"":e.type==="hook"&&e.hook_output||""}function $t(e,s){const t=e.tokens||{},n=se(e),i=[{c:s,label:"Time",value:new Date(e.ts*1e3).toLocaleTimeString()}];return e.model&&i.push({c:"transparent",label:"Model",value:e.model}),(t.input||t.output)&&i.push({c:"transparent",label:"Input / output",value:y(t.input||0)+" / "+y(t.output||0)}),t.cache_read&&i.push({c:"transparent",label:"Cache read",value:y(t.cache_read)}),e.duration_ms>0&&i.push({c:"transparent",label:"Took",value:L(e.duration_ms)}),e.ttft_ms>0&&i.push({c:"transparent",label:"First token",value:L(e.ttft_ms)}),n.meta&&i.push({c:"transparent",label:"Detail",value:B(n.meta,60)}),{title:B(n.label,70),rows:i}}const F="_v:datetime _deleted:bool",P="session_id:string ts:real",z={session_steps:`step_key:string ${P} ['kind']:string phase:string name:string turn_id:string agent_id:string context_tokens:long context_limit:long before_tokens:long after_tokens:long ${F}`,requests:`rowid:long ${P} model:string input_tokens:long output_tokens:long cost_usd:real ${F}`,tool_invocations:`rowid:long ${P} tool_name:string is_error:long duration_ms:real ${F}`,OTELTraces:"StartTime:datetime SessionId:string TraceID:string SpanID:string Model:string ToolName:string OperationName:string InputTokens:long OutputTokens:long",agents:`agent_id:string session_id:string model:string started_at:real ended_at:real ${F}`,turn_request_links:`request_key:string ${P} agent_id:string turn_id:string root_session_id:string root_turn_id:string basis:string ${F}`},re=`step_key:string ${P} ['kind']:string role:string ['source']:string phase:string turn_id:string text_status:string ${F}`,yt=`step_key:string session_id:string ['text']:string ${F}`,Pe=`rowid:long dedup_key:string ${P} agent_id:string cost_usd:real ${F}`,Ke=e=>e.split(" ").map(s=>s.split(":")[0]),Z=(e,s)=>`union isfuzzy=true (datatable(${s.split(" ").join(", ")})[]), ${e}`,_e=`| top 500 by ts desc
| order by ts asc, step_key asc`,R="event_time=unixtime_seconds_todatetime(ts)",De=(e,s)=>`iff(countif(isnotnull(${e})) > 0, sum(${e}), ${s}(null))`,be={steps:{label:"Session steps timeline",table:"session_steps",description:"The latest 500 recorded steps, oldest first. No prompt or command text.",body:`${_e}
| project ${R}, step_key, ['kind'], phase, name, agent_id, turn_id`},requests:{label:"Requests and tokens by model",table:"requests",model:"model",description:"Request counts, reported tokens and positive recorded USD. A zero or missing price is counted as unpriced, not free.",body:`| extend priced=isnotnull(cost_usd) and isfinite(cost_usd) and cost_usd > 0
| summarize request_count=count(),
    input_tokens=${De("input_tokens","long")},
    output_tokens=${De("output_tokens","long")},
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
| project StartTime, TraceID, SpanID, Model, OperationName, reasoning_tokens`},costMain:{label:"Highest recorded turn cost: selected session, main agent",table:"requests",cost:"main",description:"Ranks direct main-agent turns by positive recorded USD, not invoice cost. Coverage includes unlinked and unpriced requests."},costTree:{label:"Highest recorded turn cost: session and linked descendants",table:"requests",cost:"tree",description:"Ranks root turns using explicit links. Coverage includes this session and requests explicitly linked back from other sessions; unlinked outside requests cannot be assigned."},costAll:{label:"Highest recorded turn cost: all sessions",table:"requests",cost:"all",description:"Ranks explicitly linked root turns across all sessions by positive recorded USD. Uses the Flow date bounds, or a seven-day window if a bound is missing."}};function ae(e,s,t){const n=t==="commands",i=n?", ['kind'], name, phase, agent_id, tool_call_id, exit_code":", phase",o=n?`| where (['kind'] == "session_command" and phase in ("requested", "queued", "dispatched"))
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
| project session_id, step_key, ts, turn_id, text_status${i});
selected_steps
| join kind=${n?"leftouter":"inner"} (
    ${Z("session_step_text",yt)}
    | where step_key in (selected_steps | where text_status in ("captured", "truncated") | project step_key)
    | project session_id, step_key, _v, _deleted, text_preview=substring(trim(@"\\s+", ['text']), 0, 240)${n?"":", matched=isempty(needle) or ['text'] contains needle"}
    | summarize arg_max(_v, *) by step_key
    | where not(coalesce(_deleted, false)) and session_id == sid and isnotempty(text_preview)${n?"":" and matched"}
    | project session_id, step_key, text_preview
) on session_id, step_key
${_e}
| project ${R}, step_key, turn_id${i}, text_status, ${t==="user"?"prompt_preview=text_preview":"text_preview"}`}const U=e=>typeof e=="string"?e:"",W=e=>JSON.stringify(U(e)).replace(/[\u007f-\u009f\u2028\u2029]/g,s=>"\\u"+s.charCodeAt(0).toString(16).padStart(4,"0")),ge=e=>typeof e=="number"?e:U(e).trim()?Number(e):NaN;function ee(e,s,t){if(e==null||e==="")return"";const n=ge(e);return Number.isFinite(n)?`
| where ${t} ${s} `+(t==="StartTime"?`unixtime_seconds_todatetime(${n})`:n):`
| where false // Invalid Flow time bound`}function ht({since:e,until:s}){const t=o=>Number.isFinite(ge(o))?`unixtime_seconds_todatetime(${ge(o)})`:"datetime(null)",n=e!=null&&e!=="",i=s!=null&&s!=="";return n?`let window_start = ${t(e)};
let window_end = ${i?t(s):"window_start + 7d"};`:`let window_end = ${i?t(s):"now()"};
let window_start = window_end - 7d;`}function kt(e,s){const t=e==="all";if(t&&s.includeAllSessions!==!0)return"";const n=e==="tree",i=e==="main",o=t?`
| where ts >= (window_start - datetime(1970-01-01)) / 1s and ts < (window_end - datetime(1970-01-01)) / 1s`:ee(s.since,">=","ts")+ee(s.until,"<","ts"),_=(t?"":i?`
| where isnotempty(sid) and session_id == sid and isempty(agent_id)`:`
| where isnotempty(sid) and (session_id == sid or dedup_key in (possible_descendants))`)+o;return`${t?ht(s):`let sid = ${W(s.sessionId)};`}
let link_versions = ${Z("turn_request_links",z.turn_request_links)}
| project request_key, _v, _deleted, session_id, agent_id, turn_id, root_session_id, root_turn_id, basis;
${n?`let possible_descendants = link_versions | where root_session_id == sid and isnotempty(request_key) | distinct request_key;
`:""}let request_versions = ${Z("requests",Pe)}
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
${i?`| where isempty(link_agent)
`:n?`| where session_id == sid or root_session_id == sid
`:""}| join kind=leftouter (duplicate_keys) on session_id, dedup_key
| extend attributed=isnull(physical_rows) and (isempty(agent_id) or agent_id == link_agent) and ${i?"isnotempty(turn_id)":`isnotempty(root_turn_id) and ${n?"root_session_id == sid":"isnotempty(root_session_id)"}`},
    priced=isnotnull(cost_usd) and isfinite(cost_usd) and cost_usd > 0);
let coverage = facts
| summarize eligible_requests=count(), attributed_requests=countif(attributed), unpriced_requests=countif(not(priced)),
    attributed_priced_requests=countif(attributed and priced)
| extend row_type="Coverage", status=case(eligible_requests == 0, "No eligible requests", attributed_requests == 0, "No attributable turns",
    attributed_priced_requests == 0, "No positive recorded USD on attributed requests", "Ranking uses positive recorded USD only");
let winner = facts | where attributed
| summarize turn_requests=count(), turn_unpriced_requests=countif(not(priced)), recorded_usd=sumif(cost_usd, priced)
    by ${i?"session_id, turn_id":"root_session_id, root_turn_id"}
| where turn_requests > turn_unpriced_requests
| order by recorded_usd desc, ${i?"session_id asc, turn_id":"root_session_id asc, root_turn_id"} asc
| take 1
| extend row_type="Highest recorded cost";
union coverage, winner
| order by row_type asc`}function wt({table:e,fields:s=z[e],project:t,key:n=e==="session_steps"?"step_key":"rowid",clock:i=e==="OTELTraces"?"StartTime":"ts",model:o,tool:m,body:_,cost:f},p){if(f)return kt(f,p);const u=e==="OTELTraces",c=u?"SessionId":"session_id";let $=Z(e,s);return $+=`
| project ${t||Ke(s).join(", ")}`,u?($+=`
| where isnotempty(sid) and ${c} == sid and isnotempty(TraceID) and isnotempty(SpanID)`,$+=`
| summarize arg_max(StartTime, *) by TraceID, SpanID`):($+=`
| summarize arg_max(_v, *) by ${n}
| where not(coalesce(_deleted, false))`,$+=`
| where isnotempty(sid) and ${c} == sid`),$+=ee(p.since,">=",i)+ee(p.until,"<",i),o&&U(p.model)&&($+=`
| where ${o} == ${W(p.model)}`),m&&U(p.tool)&&($+=`
| where ${m} == ${W(p.tool)}`),`let sid = ${W(p.sessionId)};
`+(typeof _=="function"?_($,p):$+`
`+_)}function St(e,s){if(!/^https:\/\//i.test(U(e))||!s.trim())return null;try{const t=new URL(e);return t.username||t.password||!/^\/[^/]+$/.test(t.pathname)?null:(t.hash="",t.search=new URLSearchParams({web:"1",autorun:"false",query:s}).toString(),t.href)}catch{return null}}const Tt=[...new Set([...Object.keys(z),"where","project","summarize","order by","top","extend","take","distinct","count","countif","sum","avg","arg_max","isnotempty","isnotnull","unixtime_seconds_todatetime",...[...Object.values(z),...Object.values(be).map(e=>e.fields).filter(Boolean),Pe].flatMap(Ke).map(e=>e.replace(/^\['(.+)'\]$/,"$1"))])],le=e=>[...new Set(e.filter(s=>U(s).length>0))],de=e=>Array.isArray(e)?e:[],xt=10;function Me(e){var m,_;const{value:s,selectionStart:t,selectionEnd:n}=e;if(t!==n)return{prefix:"",start:t,end:n};const i=((m=s.slice(0,t).match(/[a-z_]\w*$/i))==null?void 0:m[0])||"",o=((_=s.slice(n).match(/^\w+/))==null?void 0:_[0])||"";return{prefix:i,start:t-i.length,end:n+o.length}}function G({id:e,label:s,value:t,options:n,onChange:i,editorRef:o,hint:m,placeholder:_}){const f=fe(null),p=o||f,[u,c]=C(null),[$,q]=C(-1),r=u==null?void 0:u.prefix.toLowerCase(),g=u?n.filter(b=>b.toLowerCase().startsWith(r)).slice(0,xt):[],T=g.length>0,a=b=>`${e}-opt-${b}`,d=g[$]?a($):void 0;je(()=>{var b,w;d&&((w=(b=document.getElementById(d))==null?void 0:b.scrollIntoView)==null||w.call(b,{block:"nearest"}))},[d]);function x(b){c(b),q(-1)}function k(b){const w=p.current;o?(w.setRangeText(b==="kind"?"['kind']":b,u.start,u.end,"end"),i(w.value)):i(b),x(null)}function h(b){const w=b.currentTarget;i(w.value);const v=o?Me(w):{prefix:w.value};x(!b.isComposing&&(!o||v.prefix)?v:null)}function I(b){if(!b.isComposing){if(o&&b.ctrlKey&&b.key===" "){b.preventDefault(),x(Me(b.currentTarget));return}if(b.key==="Escape"&&u){b.preventDefault(),b.stopPropagation(),x(null);return}if(b.key==="ArrowDown"||b.key==="ArrowUp"){if(!u&&!o&&n.length)b.preventDefault(),x({prefix:""}),q(0);else if(T){b.preventDefault();const w=g.length;q(b.key==="ArrowDown"?($+1)%w:$<0?w-1:($+w-1)%w)}}else b.key==="Enter"&&d?(b.preventDefault(),k(g[$])):["Tab","ArrowLeft","ArrowRight","Home","End"].includes(b.key)&&x(null)}}const D={id:e,ref:p,value:t,placeholder:_,"aria-describedby":m,"aria-autocomplete":"list","aria-controls":e+"-list","aria-activedescendant":d,autocomplete:"off",spellcheck:!1,onInput:h,onKeyDown:I,onBlur:()=>x(null)};return l`<div class="bd-kql-field">
    <label for=${e}>${s}</label>
    ${o?l`<textarea ...${D} rows="9" onClick=${()=>x(null)}/>`:l`<input ...${D} role="combobox" aria-expanded=${T} onFocus=${()=>x({prefix:""})}/>`}
    <ul class="bd-kql-options" id=${e+"-list"} role="listbox" aria-label=${s+" suggestions"} hidden=${!T}>
      ${g.map((b,w)=>l`<li key=${b} id=${a(w)} role="option" aria-selected=${w===$}
        onMouseDown=${v=>v.preventDefault()} onClick=${()=>k(b)}>${b}</li>`)}
    </ul>
    ${u&&!o&&!T&&l`<small role="status">${t?"No matching suggestion. Using the value you typed.":"No observed values."}</small>`}
  </div>`}function qt({id:e,generated:s,url:t}){const[n,i]=C(s),[o,m]=C(""),_=fe(null),f=e+"-hint",p=St(t,n),u=$=>{m(""),i($)};async function c(){try{await navigator.clipboard.writeText(n),m("Query copied.")}catch{_.current.focus(),_.current.select(),m("Query selected. Use your device’s Copy command.")}}return l`<p id=${f}>Edit the KQL below. Type a prefix or press Ctrl+Space for tables, columns and operators.
    Changing an example or filter replaces your edits.</p>
    <${G} id=${e} label="KQL query" value=${n} options=${Tt} onChange=${u} editorRef=${_} hint=${f}/>
    <div class="bd-kql-actions">
      ${p&&l`<a class="bd-btn bd-p" href=${p} target="_blank" rel="noopener noreferrer">Open in Kusto</a>`}
      <button type="button" class="bd-btn" disabled=${!n.trim()} onClick=${c}>Copy query</button>
      ${n!==s&&l`<button type="button" class="bd-btn" onClick=${()=>u(s)}>Restore example</button>`}
      <span role="status">${o}</span>
    </div>
    <p>${p?"Opens in Azure Data Explorer without running the query.":n.trim()?"No Kusto database link is available. You can still copy the query.":"Enter a query to copy or open it."}</p>`}function Ct({base:e,url:s,sessionId:t,sessions:n,models:i,tools:o,since:m,until:_}){const[f,p]=C("steps"),[u,c]=C(U(t)),[$,q]=C(""),[r,g]=C(""),[T,a]=C(""),[d,x]=C(null),k=e+"-hint",h=be[f],I=h.cost==="all",D=JSON.stringify([m,_]),b=I&&d===D,w=wt(h,{sessionId:u,model:$,tool:r,keyword:T,since:m,until:_,includeAllSessions:b});return l`<div class="bd-kql-body">
    <label class="bd-kql-field">Example<select value=${f} onChange=${v=>{p(v.currentTarget.value),x(null),a("")}}>
      ${Object.entries(be).map(([v,H])=>l`<option value=${v} key=${v}>${H.label}</option>`)}
    </select></label>
    <p><code>${h.table}</code> · ${h.description}</p>
    <div class="bd-kql-filters">
      ${I?l`<label><input type="checkbox" checked=${b}
        onChange=${v=>x(v.currentTarget.checked?D:null)}/> Include all sessions in this date range</label>`:l`<${G} id=${e+"-sid"} label="Session ID" value=${u} options=${le([t,...de(n)])} onChange=${c} hint=${k} placeholder="Enter a session ID"/>`}
      ${h.model&&l`<${G} id=${e+"-model"} key="model" label="Model (optional)" value=${$} options=${le(de(i))} onChange=${q} hint=${k} placeholder="Any model"/>`}
      ${h.tool&&l`<${G} id=${e+"-tool"} key="tool" label="Tool name (optional)" value=${r} options=${le(de(o))} onChange=${g} hint=${k} placeholder="Any tool"/>`}
      ${h.keyword&&l`<label class="bd-kql-field">Keyword or phrase (optional)
        <input type="text" value=${T} onInput=${v=>a(v.currentTarget.value)} autocomplete="off" placeholder="Search retained text"/>
      </label>`}
    </div>
    ${!u&&!I&&l`<p>Enter a session ID. An empty ID matches no rows.</p>`}
    ${h.keyword&&l`<p>The search term is included in the Kusto link. Matching text is returned only when you run the query in Kusto.</p>`}
    <p id=${k}>Type a prefix for suggestions. Use ↑ or ↓ and Enter to choose, or Esc to dismiss.
      Examples use Flow’s time range, not its event-list filters.</p>
    ${w&&l`<${qt} id=${e+"-editor"} key=${w} generated=${w} url=${s}/>`}
  </div>`}function It({url:e,sessionId:s,sessions:t,models:n,tools:i,since:o,until:m}){const[_,f]=C(!1),p="session-kql-"+Ee();return l`<details class="bd-kql" onToggle=${u=>{u.currentTarget.open&&f(!0)}}>
    <summary>Query in Kusto</summary>
    ${_&&l`<${Ct} key=${s} ...${{base:p,url:e,sessionId:s,sessions:t,models:n,tools:i,since:o,until:m}}/>`}
  </details>`}const vt="aictl-pref-session_flow_mode";function Re({ev:e,onClose:s}){const t=se(e),n=e.tokens||{},i=e.type==="api_call"?y(n.input||0)+" tokens in":e.type==="api_response"?y(n.output||0)+" tokens out":e.result_size?e.result_size+" B out":e.prompt_length?e.prompt_length+" characters":j,o=e.decision||(e.success===!1||e.success==="false"?"Failed":e.success===!0||e.success==="true"?"OK":j),m=[["Type",e.type==="user_message"?"User input prompt":e.type||j],["Time",ie(e.ts,!0)],["Took",e.duration_ms?L(e.duration_ms):j],["Size",i],["Model",e.model||j],["Result",o]];e.type==="skill_event"&&(m.splice(0,m.length,["Skill",e.name],["Evidence",$e(e.phase)],["Source",e.source],[e.phase==="reported"?"First reported in range":"Time",ie(e.ts,!0)]),e.phase==="reported"&&m.push(["Last reported in range",ie(e.last_ts,!0)],["Distinct spans",y(e.reported_spans)]),e.agent_id&&m.push(["Agent ID",e.agent_id])),e.type==="user_message"&&m.push(["Source",e.source||j],["Text",e.text_status||(e.redacted?"Not retained":"Recorded")]);const _=Oe(gt(e)),f=Oe(ft(e));return l`<div class="bd-ag-insp" role="region" aria-label="Selected event">
    <div class="bd-ag-insph"><b title=${t.label}>${t.label}</b><button type="button" class="bd-btn" onClick=${s}>Close</button></div>
    <dl class="bd-ag-kv">${m.map(([p,u])=>l`<div key=${p}><dt>${p}</dt><dd>${u}</dd></div>`)}</dl>
    ${_?l`<div class="bd-ag-sect">${e.type==="user_message"?"Your prompt":"Input"}</div><pre class="bd-ag-pre">${_}</pre>`:null}
    ${f?l`<div class="bd-ag-sect">Output</div><pre class="bd-ag-pre">${f}</pre>`:null}
  </div>`}const Be=(e,s)=>t=>nt(t.clientX,t.clientY,$t(e,s)),te=e=>e.step_key||e.event_id||e;function Nt({events:e,sel:s,onSel:t}){return l`<ul class="bd-ag-tl" aria-label="Events, oldest first">${e.map((n,i)=>{const o=Ue[n.type]||{lane:"tool",kind:"request"},m=n.type==="api_call"&&n.is_error?M.error:M[o.lane]||"var(--ink3)",_=se(n),f=s===te(n);return l`<li key=${n.step_key||n.event_id||i}>
      <button type="button" class=${"bd-ag-tlrow"+(f?" bd-on":"")} aria-expanded=${f?"true":"false"}
        onClick=${()=>t(f?null:te(n))} onMouseMove=${Be(n,m)} onMouseLeave=${ze}>
        <span class="bd-ag-when">${pe(n.ts)}${n._cum?l`<em>${y(n._cum)+" total"+(n._rt?", "+y(n._rt)+" this turn":"")}</em>`:null}</span>
        <span class="bd-ag-dot" style=${{borderColor:m,background:o.kind==="reply"||o.kind==="marker"?m:"transparent"}}></span>
        <span class="bd-ag-body"><span class="bd-ag-lane" style=${{color:m}}>${o.lane}</span><span class="bd-ag-lbl">${_.label}</span>${_.meta?l`<span class="bd-ag-meta">${_.meta}</span>`:null}</span>
        <span class="bd-ag-size">${_.size||""}</span>
      </button>
      ${f?l`<${Re} ev=${n} onClose=${()=>t(null)}/>`:null}
    </li>`})}</ul>`}function Ot({events:e,participants:s,filtered:t,sel:n,onSel:i}){const{lanes:o,columns:m,grouped:_}=X(()=>bt(e,s,t),[e,s,t]),f=o.length||1,p=c=>m.get(c)??-1,u=c=>(c+.5)/f*100;return l`${_&&l`<div class="bd-note">Tools and subagents share lanes by category. Each event shows its own name.</div>`}
  <div class="bd-ag-sl" style=${{"--flow-diagram-width":158+f*96+"px"}} role="list" aria-label="Events between participants, oldest first">
    <div class="bd-ag-slhead" aria-hidden="true"><span>Total</span><span>Turn</span><span>Time</span>
      <span class="bd-ag-slarea">${o.map((c,$)=>l`<b key=${c.id} style=${{left:u($)+"%",color:c.color,borderColor:c.color}} title=${c.label}>${c.label}</b>`)}</span>
    </div>
    ${e.map((c,$)=>{const q=p(c._from),r=p(c._to),g=se(c),T=n===te(c),a=o[r],d=c.type==="error"||c.is_error?M.error:c.type==="user_message"?M.user:c.type==="api_response"?M.api:(a==null?void 0:a.color)||"var(--ink2)",x=o.map((h,I)=>l`<i key=${h.id} class="bd-ag-lanel" style=${{left:u(I)+"%"}}></i>`);let k;if(q<0||r<0){const h=M[(Ue[c.type]||{}).lane]||"var(--ink3)";k=l`<span class="bd-ag-marker" style=${{color:h,borderColor:h}}>${g.label}${g.meta?" · "+g.meta:""}</span>`}else{const h=Math.min(q,r),I=Math.max(q,r),D=r>q;k=l`<span class="bd-ag-arrow" style=${{left:u(h)+"%",width:u(I)-u(h)+"%",borderColor:d}}>
          <span class=${"bd-ag-head"+(D?" bd-r":" bd-l")} style=${{color:d}}></span>
        </span>
        <span class="bd-ag-alabel" style=${{left:(u(h)+u(I))/2+"%",color:d}} title=${g.label}>${g.label}${g.meta?l`<em>${g.meta}</em>`:null}</span>`}return l`<div key=${c.step_key||c.event_id||$} role="listitem">
        <button type="button" class=${"bd-ag-slrow"+(T?" bd-on":"")} aria-expanded=${T?"true":"false"} aria-label=${pe(c.ts)+" "+g.label}
          onClick=${()=>i(T?null:te(c))} onMouseMove=${Be(c,d)} onMouseLeave=${ze}>
          <span>${c._cum?y(c._cum):""}</span><span>${c._rt?y(c._rt):""}</span><span>${pe(c.ts)}</span>
          <span class="bd-ag-slarea">${x}${k}</span>
        </button>
        ${T?l`<${Re} ev=${c} onClose=${()=>i(null)}/>`:null}
      </div>`})}
  </div>`}const A=e=>{var s;return((s=e==null?void 0:e.summary)==null?void 0:s.omitted_events)||0},Le=e=>{const s=(e.turns||[]).length;return A(e)?"Newest "+y(s)+" of "+y(s+A(e))+" events":y(s)+" events"},Ae=500,Fe=1e3,ce=5e3,ue={q:"",category:"",tool_name:"",flow_agent:"",skill_name:"",skill_phase:"",failed:!1,range:"whole",start:"",end:""},Dt=["prompts","messages","models","tools","skills","agents","context","hooks","lifecycle"];function Mt({apply:e,scope:s,bounds:t,initialCategory:n,activeCategory:i}){var r,g,T;const[o,m]=C(()=>({...ue,category:n})),[_,f]=C(""),p=Ee(),u=(a,d)=>{m(x=>({...x,[a]:d})),f("")},c=a=>{a.preventDefault();const d=new URLSearchParams,x=["q","category","flow_agent",...o.category==="skills"?["skill_name","skill_phase"]:["tool_name"]];for(const h of x)o[h].trim()&&d.set(h,o[h].trim());o.failed&&o.category!=="skills"&&d.set("failed","1");let k;if(o.range==="custom")k=st(o.start,o.end);else if(o.range!=="whole"){if(!Number.isFinite(t.end)){f("The session end time has not been reported.");return}k={since:t.end-Number(o.range),until:t.end}}if(k!=null&&k.error){f(k.error);return}k&&(d.set("since",Math.floor(k.since)),d.set("until",Math.ceil(k.until))),f(""),e(d.toString())},$=a=>{if(a!=="custom"){u("range",a);return}f(""),m(d=>({...d,range:a,start:d.start||(Number.isFinite(t.start)?Ne(t.start):""),end:d.end||(Number.isFinite(t.end)?Ne(Math.ceil(t.end/60)*60):"")}))},q=a=>{const d={...ue,category:i===a?"":a};m(d),f(""),e(d.category?"category="+a:"")};return l`<form class="bd-flow-filters" role="search" aria-label="Flow filters" onSubmit=${c}>
    <button type="button" class="bd-btn" aria-pressed=${i==="prompts"} onClick=${()=>q("prompts")}>User prompts</button>
    <button type="button" class="bd-btn" aria-pressed=${i==="skills"} onClick=${()=>q("skills")}>Skills</button>
    <label class="bd-flow-search">${o.category==="prompts"?"Search prompt text":"Search events"}<input type="search" placeholder=${o.category==="prompts"?"Words you wrote in this session":"Search the session flow"} value=${o.q} onInput=${a=>u("q",a.currentTarget.value)}/></label>
    <label>Category<select value=${o.category} onChange=${a=>u("category",a.currentTarget.value)}>
      <option value="">All categories</option>${Dt.map(a=>l`<option key=${a} value=${a}>${a==="prompts"?"User prompts only":a[0].toUpperCase()+a.slice(1)}</option>`)}
    </select></label>
    ${o.category==="skills"?l`<label>Skill name<input list=${p+"-skills"} placeholder="Any skill" value=${o.skill_name} onInput=${a=>u("skill_name",a.currentTarget.value)}/></label>
      <datalist id=${p+"-skills"}>${(r=s==null?void 0:s.skills)==null?void 0:r.map(a=>l`<option value=${a} key=${a}/>`)}</datalist>
      <label>Skill evidence<select value=${o.skill_phase} onChange=${a=>u("skill_phase",a.currentTarget.value)}>
        <option value="">All evidence</option>${["loaded","invoked","reported","resolved"].map(a=>l`<option key=${a} value=${a}>${$e(a)}</option>`)}
      </select></label>`:l`<label>Tool name<input list=${p+"-tools"} placeholder="Any tool" value=${o.tool_name} onInput=${a=>u("tool_name",a.currentTarget.value)}/></label>`}
    <datalist id=${p+"-tools"}>${(g=s==null?void 0:s.tools)==null?void 0:g.map(a=>l`<option key=${a} value=${a}/>`)}</datalist>
    <label>Agent ID<input list=${p+"-agents"} placeholder="Any agent" value=${o.flow_agent} onInput=${a=>u("flow_agent",a.currentTarget.value)}/></label>
    <datalist id=${p+"-agents"}>${(T=s==null?void 0:s.agents)==null?void 0:T.map(a=>l`<option key=${a} value=${a}/>`)}</datalist>
    <label>Time range<select value=${o.range} onChange=${a=>$(a.currentTarget.value)}>
      <option value="whole">Whole session</option><option value="900" disabled=${!Number.isFinite(t.end)}>Last 15 min of session</option>
      <option value="3600" disabled=${!Number.isFinite(t.end)}>Last hour of session</option><option value="custom">Custom range</option>
    </select></label>
    ${o.range==="custom"&&l`<label>From (local)<input type="datetime-local" value=${o.start} onInput=${a=>u("start",a.currentTarget.value)}/></label>
      <label>To (local)<input type="datetime-local" value=${o.end} onInput=${a=>u("end",a.currentTarget.value)}/></label>`}
    <div class="bd-flow-actions">${o.category!=="skills"&&l`<label class="bd-ag-check"><input type="checkbox" checked=${o.failed} onChange=${a=>u("failed",a.currentTarget.checked)}/>Failures only</label>`}
      <button type="submit" class="bd-btn">Apply filters</button>
      <button type="button" class="bd-btn" onClick=${()=>{m(ue),f(""),e("")}}>Reset filters</button>
    </div>
    ${_&&l`<span class="bd-ag-bad" role="alert">${_}</span>`}
  </form>`}function Lt(e){if(!e)return null;try{const s=new URL(e);return["https:","http:"].includes(s.protocol)?s.href:null}catch{return null}}function Pt(e){return l`<${At} key=${e.a.id} ...${e}/>`}function At({a:e,st:s,ctx:t,act:n,flowRef:i,sid:o,captureMode:m,initialEvidence:_=!1,initialPrompts:f=!1,initialSkills:p=!1,agentData:u}){var ke,we,Se,Te,xe,qe,Ce,Ie;const c=it(s)?t.refreshKey:0,[$,q]=C(Ae),r=f?"prompts":p?"skills":"",[g,T]=C(r?"category="+r:""),a="limit="+$+(g?"&"+g:""),{data:d,error:x}=rt(S=>et(e.id,a,S),JSON.stringify(["flow",e.id,a]),c),[k,h]=at(vt,"timeline",["timeline","swimlane"]),[I,D]=C(_),[b,w]=C(_);je(()=>{D(_),_&&w(!0)},[_]);const v=I?"source":k,[H,Q]=C(null),V=fe({});d&&!new URLSearchParams(g).has("since")&&!new URLSearchParams(g).has("until")&&(!g||!V.current.end)&&(V.current={start:((ke=d.scope)==null?void 0:ke.start)??e.started_at,end:((we=d.scope)==null?void 0:we.end)??e.ended_at??((Te=(Se=d.turns)==null?void 0:Se.at(-1))==null?void 0:Te.ts)});const We={start:V.current.start??e.started_at,end:V.current.end??e.ended_at},ye=t.toolName?t.toolName(e.tool):e.tool,K=X(()=>_t((d==null?void 0:d.turns)||[],ye,d==null?void 0:d.summary),[d,ye]),Y=X(()=>i?K.events.filter(S=>S[i.field]===i.id&&(!i.traceId||S.trace_id===i.traceId)):K.events,[K,i]),He=S=>{D(S==="source"),S==="source"?w(!0):h(S)},Qe=S=>{S!==g&&(Q(null),T(S),q(Ae))},ne=Lt(d==null?void 0:d.session_kql_url),N=d==null?void 0:d.scope,oe=o||(d==null?void 0:d.session_id),he=(xe=t.data)==null?void 0:xe.agents,Ve=X(()=>[...new Set([oe,...(he||[]).map(S=>{var ve;return S.native_session_id?S.native_session_id:S.placeholder||(ve=S.id)!=null&&ve.startsWith("live:")||S.runtime_present&&!S.queryable?null:S.session_id||S.parent_id||S.id})].filter(Boolean))],[oe,he]),E=new URLSearchParams(g),Ye=E.has("since")?Number(E.get("since")):null,Je=E.has("until")?Number(E.get("until")):null,Xe=o===void 0?e.native_session_id||e.session_id||(d==null?void 0:d.session_id):o,Ge=g?"Summary counts all events in the selected time span.":d&&Le(d),O=K.summary,Ze=[{label:"Turns",value:y(O.turns),title:"Prompts in the session"},{label:"Tool calls",value:y(O.toolCalls)},{label:"Subagents",value:y(O.subagents)},{label:"Hooks",value:y(O.hooks)},{label:"Errors",value:y(O.errors)},{label:"Compactions",value:y(O.compactions)},{label:"Tokens, total",value:y(O.cumulative),title:"Input and output of every model call, added up"},{label:"Largest turn",value:y(O.roundTrip),title:"The most input and output tokens between two prompts"},{label:"First token",value:O.ttft==null?j:L(O.ttft),sub:O.ttftCalls?"median of "+O.ttftCalls+" calls":"",title:"Time to first token"}];return l`<${lt} a=${e}/>
    ${d&&!((qe=d.summary)!=null&&qe.skill_evidence)&&l`<${J} key="summary" id="agfs" title="Summary" sub=${Ge}><${tt} stats=${Ze}/></${J}>`}
    <${J} key="flow" id="agfl" title="Flow" sub=${I?"Search retained source records separately from flow events.":A(d)&&!g?"Oldest first. The "+y(A(d))+" oldest events are left out; the summary counts them.":"Oldest first. Select an event to read it."}>
      <div class="bd-ag-bar"><${dt} label="Flow view" value=${v} onPick=${He} items=${[["timeline","Timeline"],["swimlane","Swim-lane"],["source","Source steps"]]}/>
        ${ne&&l`<a class="bd-btn bd-flow-kusto" href=${ne} target="_blank" rel="noopener noreferrer">Open session in Kusto</a>`}
      </div>
      ${ne&&l`<${It} url=${d.session_kql_url} sessionId=${oe} sessions=${Ve}
        models=${(Ce=N==null?void 0:N.models)!=null&&Ce.length?N.models:e.models||[]} tools=${(N==null?void 0:N.tools)||[]} since=${Ye} until=${Je}/>`}
      <div hidden=${I}>
        <${Mt} scope=${N} bounds=${We} apply=${Qe} initialCategory=${r} activeCategory=${E.get("category")}/>
        ${E.get("category")==="skills"&&l`<p class="bd-note">Loaded files and invocations are separate records. “Reported in context” groups OTel spans by skill; it does not count skill loads.</p>`}
        ${E.get("category")==="prompts"&&l`<p class="bd-note">User input only. Select a row to read the retained prompt. Assistant replies and delegated instructions are not included.</p>`}
        ${i&&l`<div class="bd-ag-bar"><span>${i.label} ID: ${i.id}</span><button type="button" class="bd-btn" onClick=${()=>{Q(null),n.setDrawerTab("flow")}}>Show full flow</button></div>`}
        ${d?l`
          <div class="bd-ag-bar"><span role="status">${N&&N.matched!=null&&N.total!=null?`Showing ${Y.length.toLocaleString()} · ${N.matched.toLocaleString()} matched of ${N.total.toLocaleString()} events in range`:Le(d)}</span>
            ${A(d)&&$<ce?l`<button type="button" class="bd-btn" onClick=${()=>q(S=>Math.min(ce,S+Fe))}>${"Show "+Math.min(A(d),Fe).toLocaleString("en-US")+" older events"}</button>`:null}
            ${A(d)&&$>=ce?l`<span class="bd-ag-dim">${y(A(d))} older matching events remain outside the display limit.</span>`:null}
          </div>
          ${Y.length?!I&&(k==="swimlane"?l`<${Ot} events=${Y} participants=${K.participants} filtered=${!!(g||i)} sel=${H} onSel=${Q}/>`:l`<${Nt} events=${Y} sel=${H} onSel=${Q}/>`):l`<div class="bd-empty">${i?"No event in the loaded flow reports this source ID.":g?"No events match these flow filters.":"No flow data for this session: aictl has no prompt, model call or tool call of it, and no hook or OpenTelemetry event."}</div>`}
        `:l`<${ct} error=${x} what="the session flow"/>`}
      </div>
      ${b&&l`<div hidden=${!I}><${ut} inline=${!0} a=${e} sid=${Xe} data=${u} act=${n} captureMode=${m??((Ie=t.data)==null?void 0:Ie.capture_mode)}/></div>`}
    </${J}>`}export{Ae as FLOW_EVENTS,ce as FLOW_EVENTS_MAX,Fe as FLOW_EVENTS_STEP,vt as FLOW_MODE_KEY,Pt as default};

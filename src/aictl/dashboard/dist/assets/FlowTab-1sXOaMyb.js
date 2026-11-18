import{i as y,r as A,d as q,ao as Me,m as c,K as _e,h as De,ap as Ye,T as J,N as L,S as Je,aq as Ae,ar as Xe,as as Se,at as Ge,b as Ze}from"./index-DsKtLKde.js";import{d as et,b as B,i as tt,u as st,e as nt,S as ot,F as V,f as rt,W as it,c as de,p as qe}from"./Drawer-NG4nYvj7.js";import at from"./EvidenceTab-nidW8ESv.js";import"./TextView-DWrtvrF1.js";import"./LoadedConfiguration-Ct_NAcUY.js";const lt={user_message:()=>["user","tool"],api_call:e=>[e.from||"tool","api"],api_response:()=>["api","tool"],error:()=>["api","tool"],tool_use:e=>["tool","skill:"+(e.to||"tool")],subagent:e=>["tool","subagent:"+(e.to||"agent")],subagent_end:e=>["subagent:"+(e.from||"agent"),"tool"],hook:()=>["tool","hook"]},Ee={user_message:{lane:"user",kind:"request"},api_call:{lane:"api",kind:"request"},api_response:{lane:"api",kind:"reply"},error:{lane:"error",kind:"reply"},tool_use:{lane:"tool",kind:"request"},subagent:{lane:"agent",kind:"request"},subagent_end:{lane:"agent",kind:"reply"},hook:{lane:"hook",kind:"hook"},session_start:{lane:"session",kind:"marker"},session_end:{lane:"session",kind:"marker"},compaction:{lane:"compact",kind:"marker"},context_update:{lane:"compact",kind:"marker"},session_command:{lane:"session",kind:"marker"},skill_event:{lane:"tool",kind:"marker"}},D={user:"var(--s1)",api:"var(--s2)",tool:"var(--s3)",agent:"var(--s5)",hook:"var(--s4)",session:"var(--good)",compact:"var(--warn)",error:"var(--crit)"};function dt(e){if(!e)return"";let s=e;if(typeof e=="string")try{s=JSON.parse(e)}catch{return e.slice(0,80)}if(typeof s!="object"||s===null)return String(e).slice(0,80);for(const n of["command","file_path","pattern","query","path","url","prompt","description","old_string","content","skill"])if(s[n])return String(s[n]).slice(0,100);const t=Object.keys(s);return t.length?String(s[t[0]]).slice(0,80):""}const ce=e=>((e.tokens||{}).input||0)+((e.tokens||{}).output||0);function ct(e,s,t){const n=(e||[]).map(a=>{const r=lt[a.type],[l,h]=r?r(a):[null,null];return{...a,_from:l,_to:h}});let i=0,o=0,_=0;for(const a of n)a.type==="user_message"&&(o=0),a.type==="api_call"&&(i+=ce(a),o+=ce(a),_=Math.max(_,o)),a._cum=a.cum_tokens??i,a._rt=a.rt_tokens??o;const m=new Map;let g=0;const p=(a,r,l)=>{m.has(a)||m.set(a,{id:a,label:r,color:l||et(g++)})};n.length&&(p("user","User",D.user),p("tool",s||"Tool","var(--ink2)"));for(const a of n)(a.type==="api_call"||a.type==="api_response"||a.type==="error")&&p("api","Model",D.api),a.type==="tool_use"&&p(a._to,a.to||"tool"),a.type==="subagent"&&p(a._to,a.to||"Subagent"),a.type==="subagent_end"&&p(a._from,a.from||"Subagent"),a.type==="hook"&&p("hook","Hooks",D.hook);const u=a=>n.filter(r=>r.type===a).length,d=n.filter(a=>a.type==="api_call"&&a.ttft_ms>0).map(a=>a.ttft_ms).sort((a,r)=>a-r),f=d.length?d.length%2?d[(d.length-1)/2]:(d[d.length/2-1]+d[d.length/2])/2:null,$=(t==null?void 0:t.cumulative_tokens)!=null?{turns:t.total_turns,toolCalls:t.total_tool_uses,subagents:t.subagents,hooks:t.hooks,errors:t.errors,compactions:t.compactions,cumulative:t.cumulative_tokens,roundTrip:t.largest_turn_tokens,ttft:t.ttft_ms??null,ttftCalls:t.ttft_calls||0}:{turns:u("user_message"),toolCalls:n.filter(a=>a.type==="tool_use"&&a.subtype!=="result"&&a.subtype!=="decision").length,subagents:u("subagent"),hooks:u("hook"),errors:u("error")+n.filter(a=>a.type==="api_call"&&a.is_error||a.type==="tool_use"&&a.success===!1).length,compactions:u("compaction"),cumulative:i,roundTrip:_,ttft:f,ttftCalls:d.length};return{events:n,participants:[...m.values()],summary:$}}function ut(e,s,t){const n=new Set;for(const p of e)n.add(p._from),n.add(p._to);const i=s.filter(p=>!t||n.has(p.id)),o=i.length>8,_=[],m=new Map,g=new Map;for(const p of i){const u=o&&(p.id.startsWith("skill:")?"tools":p.id.startsWith("subagent:")?"agents":null),d=u?"group:"+u:p.id;m.has(d)||(m.set(d,_.length),_.push(u?{id:d,label:u==="tools"?"Tools":"Subagents",color:D[u==="tools"?"tool":"agent"]}:p)),g.set(p.id,m.get(d))}return{lanes:_,columns:g,grouped:_.length<i.length}}function te(e){const s=e.tokens||{};if(e.type==="user_message")return e.redacted?e.prompt_length?{label:"Prompt, text not sent ("+e.prompt_length+" characters)",meta:""}:{label:"Prompt, text not kept",meta:""}:{label:e.preview||e.message||"Prompt",meta:e.prompt_length?e.prompt_length+" characters":""};if(e.type==="api_call"){const t=[y(ce(e))+" tokens"];return e.ttft_ms>0?t.push("first token "+A(e.ttft_ms)):e.duration_ms>0&&t.push(A(e.duration_ms)),e.is_error&&t.push("failed"),{label:e.agent_name||e.model||"Model call",meta:t.join(", ")}}if(e.type==="api_response"){const t=[e.model,e.finish_reason&&e.finish_reason!=="stop"?"stopped: "+e.finish_reason:""].filter(Boolean).join(", ");return{label:"Reply"+(s.output?", "+y(s.output)+" tokens":"")+(e.response_preview?": "+B(e.response_preview,80):""),meta:t}}if(e.type==="error")return{label:"Error: "+(e.error_type||"error"),meta:B(e.error_message||"",80)};if(e.type==="tool_use"){const t=dt(e.params)||(e.target?String(e.target).slice(0,100):"");let n="";return e.subtype==="result"||!e.subtype&&typeof e.success=="boolean"?n=(e.success===!0||e.success==="true"?"OK":"Failed")+(e.duration_ms>0?", "+A(e.duration_ms):""):e.subtype==="decision"&&(n=e.decision||""),{label:(e.to||"tool")+(t?": "+t:""),meta:n,size:e.result_size?e.result_size+" B":""}}if(e.type==="subagent")return{label:"Subagent "+(e.to||""),meta:B(e.prompt||e.model||"",80)};if(e.type==="subagent_end")return{label:"Subagent "+(e.from||"")+(e.completed===!1?" stopped":" done"),meta:e.duration_ms>0?A(e.duration_ms):""};if(e.type==="hook")return{label:"Hook "+(e.hook_name||""),meta:""};if(e.type==="session_start")return{label:"Session started",meta:e.cwd||""};if(e.type==="session_end")return{label:"Session ended",meta:""};if(["context_update","session_command","skill_event"].includes(e.type))return{label:[{context_update:"Context",session_command:"Session command",skill_event:"Skill"}[e.type],e.name||e.phase].filter(Boolean).join(": "),meta:[e.name&&e.phase,e.context_tokens!=null&&`${y(e.context_tokens)} context tokens`,e.source].filter(Boolean).join(" · ")};if(e.type==="compaction"){const t=e.before_tokens!=null&&e.after_tokens!=null?y(e.before_tokens)+" to "+y(e.after_tokens)+" tokens":"";return{label:"Compaction"+(e.compaction_count?" "+e.compaction_count:""),meta:[t,e.duration_ms>0?A(e.duration_ms):""].filter(Boolean).join(", ")}}return{label:e.type||"Event",meta:""}}function pt(e){return e.type==="user_message"?e.message||e.preview||"":e.type==="api_call"?e.request_preview||e.prompt_preview||"":e.type==="tool_use"?e.params||e.input_preview||e.target||"":e.type==="subagent"?e.prompt||"":e.type==="hook"&&e.hook_input||""}function mt(e){return e.type==="api_response"?e.response||e.response_preview||"":e.type==="api_call"&&e.is_error?e.error_message||"":e.type==="tool_use"?e.result_summary||e.result_preview||"":e.type==="error"?e.error_message||"":e.type==="hook"&&e.hook_output||""}function _t(e,s){const t=e.tokens||{},n=te(e),i=[{c:s,label:"Time",value:new Date(e.ts*1e3).toLocaleTimeString()}];return e.model&&i.push({c:"transparent",label:"Model",value:e.model}),(t.input||t.output)&&i.push({c:"transparent",label:"Input / output",value:y(t.input||0)+" / "+y(t.output||0)}),t.cache_read&&i.push({c:"transparent",label:"Cache read",value:y(t.cache_read)}),e.duration_ms>0&&i.push({c:"transparent",label:"Took",value:A(e.duration_ms)}),e.ttft_ms>0&&i.push({c:"transparent",label:"First token",value:A(e.ttft_ms)}),n.meta&&i.push({c:"transparent",label:"Detail",value:B(n.meta,60)}),{title:B(n.label,70),rows:i}}const F="_v:datetime _deleted:bool",K="session_id:string ts:real",j={session_steps:`step_key:string ${K} ['kind']:string phase:string name:string turn_id:string agent_id:string context_tokens:long context_limit:long before_tokens:long after_tokens:long ${F}`,requests:`rowid:long ${K} model:string input_tokens:long output_tokens:long cost_usd:real ${F}`,tool_invocations:`rowid:long ${K} tool_name:string is_error:long duration_ms:real ${F}`,OTELTraces:"StartTime:datetime SessionId:string TraceID:string SpanID:string Model:string ToolName:string OperationName:string InputTokens:long OutputTokens:long",agents:`agent_id:string session_id:string model:string started_at:real ended_at:real ${F}`,turn_request_links:`request_key:string ${K} agent_id:string turn_id:string root_session_id:string root_turn_id:string basis:string ${F}`},oe=`step_key:string ${K} ['kind']:string role:string ['source']:string phase:string turn_id:string text_status:string ${F}`,bt=`step_key:string session_id:string ['text']:string ${F}`,Fe=`rowid:long dedup_key:string ${K} agent_id:string cost_usd:real ${F}`,Le=e=>e.split(" ").map(s=>s.split(":")[0]),G=(e,s)=>`union isfuzzy=true (datatable(${s.split(" ").join(", ")})[]), ${e}`,ue=`| top 500 by ts desc
| order by ts asc, step_key asc`,W="event_time=unixtime_seconds_todatetime(ts)",Ce=(e,s)=>`iff(countif(isnotnull(${e})) > 0, sum(${e}), ${s}(null))`,pe={steps:{label:"Session steps timeline",table:"session_steps",description:"The latest 500 recorded steps, oldest first. No prompt or command text.",body:`${ue}
| project ${W}, step_key, ['kind'], phase, name, agent_id, turn_id`},requests:{label:"Requests and tokens by model",table:"requests",model:"model",description:"Request counts, reported tokens and positive recorded USD. A zero or missing price is counted as unpriced, not free.",body:`| extend priced=isnotnull(cost_usd) and isfinite(cost_usd) and cost_usd > 0
| summarize request_count=count(),
    input_tokens=${Ce("input_tokens","long")},
    output_tokens=${Ce("output_tokens","long")},
    recorded_usd=iff(countif(priced) > 0, sumif(cost_usd, priced), real(null)),
    unpriced_requests=countif(not(priced))
  by model
| order by request_count desc`},tools:{label:"Tool activity and failures",table:"tool_invocations",tool:"tool_name",description:"Calls, reported failures, missing outcomes, and mean reported duration by tool name.",body:`| summarize calls=count(), failures=countif(is_error == 1),
    unknown_outcomes=countif(isnull(is_error)), mean_duration_ms=avg(duration_ms)
  by tool_name
| order by calls desc`},failures:{label:"Failed tool calls",table:"tool_invocations",tool:"tool_name",description:"The latest 500 calls explicitly marked as errors, newest first.",body:`| where is_error == 1
| top 500 by ts desc
| project ${W}, rowid, tool_name, duration_ms`},context:{label:"Context changes, compaction and reset",table:"session_steps",description:"The latest 500 context events and related session commands, oldest first. A requested or dispatched command is not proof of a change; check its phase.",body:`| where ['kind'] == "context" or (['kind'] == "session_command" and name in ("model_change", "model", "clear", "reset", "new", "compact", "rewind"))
${ue}
| project ${W}, ['kind'], name, phase, agent_id, turn_id,
    context_tokens, context_limit, before_tokens, after_tokens`},spans:{label:"OpenTelemetry spans",table:"OTELTraces",model:"Model",tool:"ToolName",description:"The latest 500 identified spans, newest first. Model and tool filters apply to the same span.",body:`| top 500 by StartTime desc
| project StartTime, TraceID, SpanID, OperationName, Model, ToolName, InputTokens, OutputTokens`},prompts:{label:"User input prompts",table:"session_steps",fields:oe,keyword:!0,description:"Search retained user messages for a word or phrase. Shows the first 240 characters of the latest 500 matches, oldest first. Missing text is not searchable.",body:(e,s)=>re(e,s,"user")},assistant:{label:"Public assistant text and visible commentary",table:"session_steps",fields:oe,keyword:!0,description:"Search retained public assistant messages for a word or phrase. Shows the first 240 characters of the latest 500 matches, not private reasoning.",body:(e,s)=>re(e,s,"assistant")},commands:{label:"Commands: requests, starts and results",table:"session_steps",fields:`${oe} name:string tool_call_id:string agent_id:string exit_code:long`,description:"Shell requests, native starts and tool results are separate events. Session command requests and dispatches are not proof of execution. A preview is shown only when retained.",body:(e,s)=>re(e,s,"commands")},longest:{label:"Longest completed turn",table:"session_steps",fields:`${j.session_steps} ['source']:string`,description:"Requires one native start and one end for the same session, agent and turn, both in the time range. Incomplete or ambiguous pairs are excluded.",body:`| where ['kind'] == "turn" and isnotempty(turn_id)
| where (['source'] == "assistant.turn_start" and phase == "started") or (['source'] == "assistant.turn_end" and phase == "ended")
| summarize starts=countif(phase == "started"), ends=countif(phase == "ended"),
    start_ts=minif(ts, phase == "started"), end_ts=maxif(ts, phase == "ended") by session_id, agent_id, turn_id
| where starts == 1 and ends == 1 and end_ts >= start_ts
| extend duration_seconds=end_ts - start_ts
| order by duration_seconds desc, start_ts asc, agent_id asc, turn_id asc
| take 1
| project session_id, agent_id, turn_id, duration_seconds, started=unixtime_seconds_todatetime(start_ts), ended=unixtime_seconds_todatetime(end_ts)`},subagents:{label:"All session subagents",table:"agents",model:"model",key:"agent_id",clock:"started_at",description:"All recorded subagent IDs for this session, by start time when a time range is set. No task text.",body:`| where isnotempty(agent_id) and agent_id != session_id
| project session_id, agent_id, model, started=unixtime_seconds_todatetime(started_at), ended=unixtime_seconds_todatetime(ended_at)
| order by started asc nulls last, agent_id asc`},sizes:{label:"Tool response sizes in bytes",table:"tool_invocations",tool:"tool_name",fields:`${j.tool_invocations} output_bytes:long`,description:"Percentiles use recorded, nonnegative output byte counts, including measured zeros. Calls without measurements count as unknown.",body:`| extend bytes=iff(output_bytes >= 0, output_bytes, long(null))
| summarize calls=count(), known=countif(isnotnull(bytes)), unknown=countif(isnull(bytes)),
    p50_bytes=percentile(bytes, 50), p95_bytes=percentile(bytes, 95), p99_bytes=percentile(bytes, 99)`},mcp:{label:"MCP tool calls",table:"tool_invocations",tool:"tool_name",fields:`${j.tool_invocations} source_event_id:string agent_id:string`,description:"The latest 500 recorded invocations with MCP-style tool names (mcp prefix or server/tool). Names do not establish which servers were configured.",body:`| where tool_name matches regex @"^mcp(__|_|\\.|:)|^[\\w.-]+/[\\w.-]+$"
| top 500 by ts desc
| project ${W}, tool_name, agent_id, source_event_id, duration_ms, is_error`},reasoning:{label:"Reported reasoning token counts",table:"OTELTraces",model:"Model",fields:"StartTime:datetime SessionId:string TraceID:string SpanID:string Model:string OperationName:string ReasoningOutputTokens:long TraceAttributes:dynamic",project:'StartTime, SessionId, TraceID, SpanID, Model, OperationName, reasoning_tokens=coalesce(ReasoningOutputTokens, tolong(TraceAttributes["gen_ai.usage.reasoning.output_tokens"]))',description:"The latest 500 identified spans with a reported reasoning token count. Missing counts are not zero. Reads the numeric metric, not reasoning text.",body:`| where isnotnull(reasoning_tokens) and reasoning_tokens >= 0
| top 500 by StartTime desc
| project StartTime, TraceID, SpanID, Model, OperationName, reasoning_tokens`},costMain:{label:"Highest recorded turn cost: selected session, main agent",table:"requests",cost:"main",description:"Ranks direct main-agent turns by positive recorded USD, not invoice cost. Coverage includes unlinked and unpriced requests."},costTree:{label:"Highest recorded turn cost: session and linked descendants",table:"requests",cost:"tree",description:"Ranks root turns using explicit links. Coverage includes this session and requests explicitly linked back from other sessions; unlinked outside requests cannot be assigned."},costAll:{label:"Highest recorded turn cost: all sessions",table:"requests",cost:"all",description:"Ranks explicitly linked root turns across all sessions by positive recorded USD. Uses the Flow date bounds, or a seven-day window if a bound is missing."}};function re(e,s,t){const n=t==="commands",i=n?", ['kind'], name, phase, agent_id, tool_call_id, exit_code":", phase",o=n?`| where (['kind'] == "session_command" and phase in ("requested", "queued", "dispatched"))
    or (name in ("bash", "powershell") and (
        (['kind'] == "tool_call" and phase == "requested" and ['source'] == "assistant.message")
        or (['kind'] == "command" and phase == "started" and ['source'] == "tool.execution_start")
        or (['kind'] == "tool_result" and phase in ("completed", "failed") and ['source'] == "tool.execution_complete")))`:`| where ['kind'] == "message" and role == "${t}" and ['source'] == "${t}.message"
${t==="assistant"?`| where phase in ("", "commentary", "response", "final", "final_answer")
`:""}| where text_status in ("captured", "truncated")`;return`${n?"":`let needle = ${H(s.keyword)};
`}let selected_steps = materialize(
${e}
${o}
| where isnotempty(step_key)
| project session_id, step_key, ts, turn_id, text_status${i});
selected_steps
| join kind=${n?"leftouter":"inner"} (
    ${G("session_step_text",bt)}
    | where step_key in (selected_steps | where text_status in ("captured", "truncated") | project step_key)
    | project session_id, step_key, _v, _deleted, text_preview=substring(trim(@"\\s+", ['text']), 0, 240)${n?"":", matched=isempty(needle) or ['text'] contains needle"}
    | summarize arg_max(_v, *) by step_key
    | where not(coalesce(_deleted, false)) and session_id == sid and isnotempty(text_preview)${n?"":" and matched"}
    | project session_id, step_key, text_preview
) on session_id, step_key
${ue}
| project ${W}, step_key, turn_id${i}, text_status, ${t==="user"?"prompt_preview=text_preview":"text_preview"}`}const z=e=>typeof e=="string"?e:"",H=e=>JSON.stringify(z(e)).replace(/[\u007f-\u009f\u2028\u2029]/g,s=>"\\u"+s.charCodeAt(0).toString(16).padStart(4,"0")),me=e=>typeof e=="number"?e:z(e).trim()?Number(e):NaN;function Z(e,s,t){if(e==null||e==="")return"";const n=me(e);return Number.isFinite(n)?`
| where ${t} ${s} `+(t==="StartTime"?`unixtime_seconds_todatetime(${n})`:n):`
| where false // Invalid Flow time bound`}function gt({since:e,until:s}){const t=o=>Number.isFinite(me(o))?`unixtime_seconds_todatetime(${me(o)})`:"datetime(null)",n=e!=null&&e!=="",i=s!=null&&s!=="";return n?`let window_start = ${t(e)};
let window_end = ${i?t(s):"window_start + 7d"};`:`let window_end = ${i?t(s):"now()"};
let window_start = window_end - 7d;`}function ft(e,s){const t=e==="all";if(t&&s.includeAllSessions!==!0)return"";const n=e==="tree",i=e==="main",o=t?`
| where ts >= (window_start - datetime(1970-01-01)) / 1s and ts < (window_end - datetime(1970-01-01)) / 1s`:Z(s.since,">=","ts")+Z(s.until,"<","ts"),m=(t?"":i?`
| where isnotempty(sid) and session_id == sid and isempty(agent_id)`:`
| where isnotempty(sid) and (session_id == sid or dedup_key in (possible_descendants))`)+o;return`${t?gt(s):`let sid = ${H(s.sessionId)};`}
let link_versions = ${G("turn_request_links",j.turn_request_links)}
| project request_key, _v, _deleted, session_id, agent_id, turn_id, root_session_id, root_turn_id, basis;
${n?`let possible_descendants = link_versions | where root_session_id == sid and isnotempty(request_key) | distinct request_key;
`:""}let request_versions = ${G("requests",Fe)}
| project rowid, _v, _deleted, ts, session_id, agent_id, dedup_key, cost_usd;
let candidate_ids = request_versions${m}
| distinct rowid;
let candidates = materialize(request_versions
| join kind=leftsemi (candidate_ids) on rowid
| summarize arg_max(_v, *) by rowid
| where not(coalesce(_deleted, false))${m}
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
| order by row_type asc`}function yt({table:e,fields:s=j[e],project:t,key:n=e==="session_steps"?"step_key":"rowid",clock:i=e==="OTELTraces"?"StartTime":"ts",model:o,tool:_,body:m,cost:g},p){if(g)return ft(g,p);const u=e==="OTELTraces",d=u?"SessionId":"session_id";let f=G(e,s);return f+=`
| project ${t||Le(s).join(", ")}`,u?(f+=`
| where isnotempty(sid) and ${d} == sid and isnotempty(TraceID) and isnotempty(SpanID)`,f+=`
| summarize arg_max(StartTime, *) by TraceID, SpanID`):(f+=`
| summarize arg_max(_v, *) by ${n}
| where not(coalesce(_deleted, false))`,f+=`
| where isnotempty(sid) and ${d} == sid`),f+=Z(p.since,">=",i)+Z(p.until,"<",i),o&&z(p.model)&&(f+=`
| where ${o} == ${H(p.model)}`),_&&z(p.tool)&&(f+=`
| where ${_} == ${H(p.tool)}`),`let sid = ${H(p.sessionId)};
`+(typeof m=="function"?m(f,p):f+`
`+m)}function $t(e,s){if(!/^https:\/\//i.test(z(e))||!s.trim())return null;try{const t=new URL(e);return t.username||t.password||!/^\/[^/]+$/.test(t.pathname)?null:(t.hash="",t.search=new URLSearchParams({web:"1",autorun:"false",query:s}).toString(),t.href)}catch{return null}}const ht=[...new Set([...Object.keys(j),"where","project","summarize","order by","top","extend","take","distinct","count","countif","sum","avg","arg_max","isnotempty","isnotnull","unixtime_seconds_todatetime",...[...Object.values(j),...Object.values(pe).map(e=>e.fields).filter(Boolean),Fe].flatMap(Le).map(e=>e.replace(/^\['(.+)'\]$/,"$1"))])],ie=e=>[...new Set(e.filter(s=>z(s).length>0))],ae=e=>Array.isArray(e)?e:[],kt=10;function ve(e){var _,m;const{value:s,selectionStart:t,selectionEnd:n}=e;if(t!==n)return{prefix:"",start:t,end:n};const i=((_=s.slice(0,t).match(/[a-z_]\w*$/i))==null?void 0:_[0])||"",o=((m=s.slice(n).match(/^\w+/))==null?void 0:m[0])||"";return{prefix:i,start:t-i.length,end:n+o.length}}function X({id:e,label:s,value:t,options:n,onChange:i,editorRef:o,hint:_,placeholder:m}){const g=_e(null),p=o||g,[u,d]=q(null),[f,$]=q(-1),a=u==null?void 0:u.prefix.toLowerCase(),r=u?n.filter(b=>b.toLowerCase().startsWith(a)).slice(0,kt):[],l=r.length>0,h=b=>`${e}-opt-${b}`,x=r[f]?h(f):void 0;De(()=>{var b,k;x&&((k=(b=document.getElementById(x))==null?void 0:b.scrollIntoView)==null||k.call(b,{block:"nearest"}))},[x]);function v(b){d(b),$(-1)}function C(b){const k=p.current;o?(k.setRangeText(b==="kind"?"['kind']":b,u.start,u.end,"end"),i(k.value)):i(b),v(null)}function T(b){const k=b.currentTarget;i(k.value);const S=o?ve(k):{prefix:k.value};v(!b.isComposing&&(!o||S.prefix)?S:null)}function N(b){if(!b.isComposing){if(o&&b.ctrlKey&&b.key===" "){b.preventDefault(),v(ve(b.currentTarget));return}if(b.key==="Escape"&&u){b.preventDefault(),b.stopPropagation(),v(null);return}if(b.key==="ArrowDown"||b.key==="ArrowUp"){if(!u&&!o&&n.length)b.preventDefault(),v({prefix:""}),$(0);else if(l){b.preventDefault();const k=r.length;$(b.key==="ArrowDown"?(f+1)%k:f<0?k-1:(f+k-1)%k)}}else b.key==="Enter"&&x?(b.preventDefault(),C(r[f])):["Tab","ArrowLeft","ArrowRight","Home","End"].includes(b.key)&&v(null)}}const M={id:e,ref:p,value:t,placeholder:m,"aria-describedby":_,"aria-autocomplete":"list","aria-controls":e+"-list","aria-activedescendant":x,autocomplete:"off",spellcheck:!1,onInput:T,onKeyDown:N,onBlur:()=>v(null)};return c`<div class="bd-kql-field">
    <label for=${e}>${s}</label>
    ${o?c`<textarea ...${M} rows="9" onClick=${()=>v(null)}/>`:c`<input ...${M} role="combobox" aria-expanded=${l} onFocus=${()=>v({prefix:""})}/>`}
    <ul class="bd-kql-options" id=${e+"-list"} role="listbox" aria-label=${s+" suggestions"} hidden=${!l}>
      ${r.map((b,k)=>c`<li key=${b} id=${h(k)} role="option" aria-selected=${k===f}
        onMouseDown=${S=>S.preventDefault()} onClick=${()=>C(b)}>${b}</li>`)}
    </ul>
    ${u&&!o&&!l&&c`<small role="status">${t?"No matching suggestion. Using the value you typed.":"No observed values."}</small>`}
  </div>`}function wt({id:e,generated:s,url:t}){const[n,i]=q(s),[o,_]=q(""),m=_e(null),g=e+"-hint",p=$t(t,n),u=f=>{_(""),i(f)};async function d(){try{await navigator.clipboard.writeText(n),_("Query copied.")}catch{m.current.focus(),m.current.select(),_("Query selected. Use your device’s Copy command.")}}return c`<p id=${g}>Edit the KQL below. Type a prefix or press Ctrl+Space for tables, columns and operators.
    Changing an example or filter replaces your edits.</p>
    <${X} id=${e} label="KQL query" value=${n} options=${ht} onChange=${u} editorRef=${m} hint=${g}/>
    <div class="bd-kql-actions">
      ${p&&c`<a class="bd-btn bd-p" href=${p} target="_blank" rel="noopener noreferrer">Open in Kusto</a>`}
      <button type="button" class="bd-btn" disabled=${!n.trim()} onClick=${d}>Copy query</button>
      ${n!==s&&c`<button type="button" class="bd-btn" onClick=${()=>u(s)}>Restore example</button>`}
      <span role="status">${o}</span>
    </div>
    <p>${p?"Opens in Azure Data Explorer without running the query.":n.trim()?"No Kusto database link is available. You can still copy the query.":"Enter a query to copy or open it."}</p>`}function Tt({base:e,url:s,sessionId:t,sessions:n,models:i,tools:o,since:_,until:m}){const[g,p]=q("steps"),[u,d]=q(z(t)),[f,$]=q(""),[a,r]=q(""),[l,h]=q(""),[x,v]=q(null),C=e+"-hint",T=pe[g],N=T.cost==="all",M=JSON.stringify([_,m]),b=N&&x===M,k=yt(T,{sessionId:u,model:f,tool:a,keyword:l,since:_,until:m,includeAllSessions:b});return c`<div class="bd-kql-body">
    <label class="bd-kql-field">Example<select value=${g} onChange=${S=>{p(S.currentTarget.value),v(null),h("")}}>
      ${Object.entries(pe).map(([S,P])=>c`<option value=${S} key=${S}>${P.label}</option>`)}
    </select></label>
    <p><code>${T.table}</code> · ${T.description}</p>
    <div class="bd-kql-filters">
      ${N?c`<label><input type="checkbox" checked=${b}
        onChange=${S=>v(S.currentTarget.checked?M:null)}/> Include all sessions in this date range</label>`:c`<${X} id=${e+"-sid"} label="Session ID" value=${u} options=${ie([t,...ae(n)])} onChange=${d} hint=${C} placeholder="Enter a session ID"/>`}
      ${T.model&&c`<${X} id=${e+"-model"} key="model" label="Model (optional)" value=${f} options=${ie(ae(i))} onChange=${$} hint=${C} placeholder="Any model"/>`}
      ${T.tool&&c`<${X} id=${e+"-tool"} key="tool" label="Tool name (optional)" value=${a} options=${ie(ae(o))} onChange=${r} hint=${C} placeholder="Any tool"/>`}
      ${T.keyword&&c`<label class="bd-kql-field">Keyword or phrase (optional)
        <input type="text" value=${l} onInput=${S=>h(S.currentTarget.value)} autocomplete="off" placeholder="Search retained text"/>
      </label>`}
    </div>
    ${!u&&!N&&c`<p>Enter a session ID. An empty ID matches no rows.</p>`}
    ${T.keyword&&c`<p>The search term is included in the Kusto link. Matching text is returned only when you run the query in Kusto.</p>`}
    <p id=${C}>Type a prefix for suggestions. Use ↑ or ↓ and Enter to choose, or Esc to dismiss.
      Examples use Flow’s time range, not its event-list filters.</p>
    ${k&&c`<${wt} id=${e+"-editor"} key=${k} generated=${k} url=${s}/>`}
  </div>`}function xt({url:e,sessionId:s,sessions:t,models:n,tools:i,since:o,until:_}){const[m,g]=q(!1),p="session-kql-"+Me();return c`<details class="bd-kql" onToggle=${u=>{u.currentTarget.open&&g(!0)}}>
    <summary>Query in Kusto</summary>
    ${m&&c`<${Tt} key=${s} ...${{base:p,url:e,sessionId:s,sessions:t,models:n,tools:i,since:o,until:_}}/>`}
  </details>`}const St="aictl-pref-session_flow_mode";function je({ev:e,onClose:s}){const t=te(e),n=e.tokens||{},i=e.type==="api_call"?y(n.input||0)+" tokens in":e.type==="api_response"?y(n.output||0)+" tokens out":e.result_size?e.result_size+" B out":e.prompt_length?e.prompt_length+" characters":L,o=e.decision||(e.success===!1||e.success==="false"?"Failed":e.success===!0||e.success==="true"?"OK":L),_=[["Type",e.type==="user_message"?"User input prompt":e.type||L],["Time",Ze(e.ts,!0)],["Took",e.duration_ms?A(e.duration_ms):L],["Size",i],["Model",e.model||L],["Result",o]];e.type==="user_message"&&_.push(["Source",e.source||L],["Text",e.text_status||(e.redacted?"Not retained":"Recorded")]);const m=qe(pt(e)),g=qe(mt(e));return c`<div class="bd-ag-insp" role="region" aria-label="Selected event">
    <div class="bd-ag-insph"><b title=${t.label}>${t.label}</b><button type="button" class="bd-btn" onClick=${s}>Close</button></div>
    <dl class="bd-ag-kv">${_.map(([p,u])=>c`<div key=${p}><dt>${p}</dt><dd>${u}</dd></div>`)}</dl>
    ${m?c`<div class="bd-ag-sect">${e.type==="user_message"?"Your prompt":"Input"}</div><pre class="bd-ag-pre">${m}</pre>`:null}
    ${g?c`<div class="bd-ag-sect">Output</div><pre class="bd-ag-pre">${g}</pre>`:null}
  </div>`}const ze=(e,s)=>t=>Ge(t.clientX,t.clientY,_t(e,s)),ee=e=>e.step_key||e.event_id||e;function qt({events:e,sel:s,onSel:t}){return c`<ul class="bd-ag-tl" aria-label="Events, oldest first">${e.map((n,i)=>{const o=Ee[n.type]||{lane:"tool",kind:"request"},_=n.type==="api_call"&&n.is_error?D.error:D[o.lane]||"var(--ink3)",m=te(n),g=s===ee(n);return c`<li key=${n.step_key||n.event_id||i}>
      <button type="button" class=${"bd-ag-tlrow"+(g?" bd-on":"")} aria-expanded=${g?"true":"false"}
        onClick=${()=>t(g?null:ee(n))} onMouseMove=${ze(n,_)} onMouseLeave=${Ae}>
        <span class="bd-ag-when">${de(n.ts)}${n._cum?c`<em>${y(n._cum)+" total"+(n._rt?", "+y(n._rt)+" this turn":"")}</em>`:null}</span>
        <span class="bd-ag-dot" style=${{borderColor:_,background:o.kind==="reply"||o.kind==="marker"?_:"transparent"}}></span>
        <span class="bd-ag-body"><span class="bd-ag-lane" style=${{color:_}}>${o.lane}</span><span class="bd-ag-lbl">${m.label}</span>${m.meta?c`<span class="bd-ag-meta">${m.meta}</span>`:null}</span>
        <span class="bd-ag-size">${m.size||""}</span>
      </button>
      ${g?c`<${je} ev=${n} onClose=${()=>t(null)}/>`:null}
    </li>`})}</ul>`}function Ct({events:e,participants:s,filtered:t,sel:n,onSel:i}){const{lanes:o,columns:_,grouped:m}=J(()=>ut(e,s,t),[e,s,t]),g=o.length||1,p=d=>_.get(d)??-1,u=d=>(d+.5)/g*100;return c`${m&&c`<div class="bd-note">Tools and subagents share lanes by category. Each event shows its own name.</div>`}
  <div class="bd-ag-sl" style=${{"--flow-diagram-width":158+g*96+"px"}} role="list" aria-label="Events between participants, oldest first">
    <div class="bd-ag-slhead" aria-hidden="true"><span>Total</span><span>Turn</span><span>Time</span>
      <span class="bd-ag-slarea">${o.map((d,f)=>c`<b key=${d.id} style=${{left:u(f)+"%",color:d.color,borderColor:d.color}} title=${d.label}>${d.label}</b>`)}</span>
    </div>
    ${e.map((d,f)=>{const $=p(d._from),a=p(d._to),r=te(d),l=n===ee(d),h=o[a],x=d.type==="error"||d.is_error?D.error:d.type==="user_message"?D.user:d.type==="api_response"?D.api:(h==null?void 0:h.color)||"var(--ink2)",v=o.map((T,N)=>c`<i key=${T.id} class="bd-ag-lanel" style=${{left:u(N)+"%"}}></i>`);let C;if($<0||a<0){const T=D[(Ee[d.type]||{}).lane]||"var(--ink3)";C=c`<span class="bd-ag-marker" style=${{color:T,borderColor:T}}>${r.label}${r.meta?" · "+r.meta:""}</span>`}else{const T=Math.min($,a),N=Math.max($,a),M=a>$;C=c`<span class="bd-ag-arrow" style=${{left:u(T)+"%",width:u(N)-u(T)+"%",borderColor:x}}>
          <span class=${"bd-ag-head"+(M?" bd-r":" bd-l")} style=${{color:x}}></span>
        </span>
        <span class="bd-ag-alabel" style=${{left:(u(T)+u(N))/2+"%",color:x}} title=${r.label}>${r.label}${r.meta?c`<em>${r.meta}</em>`:null}</span>`}return c`<div key=${d.step_key||d.event_id||f} role="listitem">
        <button type="button" class=${"bd-ag-slrow"+(l?" bd-on":"")} aria-expanded=${l?"true":"false"} aria-label=${de(d.ts)+" "+r.label}
          onClick=${()=>i(l?null:ee(d))} onMouseMove=${ze(d,x)} onMouseLeave=${Ae}>
          <span>${d._cum?y(d._cum):""}</span><span>${d._rt?y(d._rt):""}</span><span>${de(d.ts)}</span>
          <span class="bd-ag-slarea">${v}${C}</span>
        </button>
        ${l?c`<${je} ev=${d} onClose=${()=>i(null)}/>`:null}
      </div>`})}
  </div>`}const E=e=>{var s;return((s=e==null?void 0:e.summary)==null?void 0:s.omitted_events)||0},Ie=e=>{const s=(e.turns||[]).length;return E(e)?"Newest "+y(s)+" of "+y(s+E(e))+" events":y(s)+" events"},Ne=500,Oe=1e3,le=5e3,Y={q:"",category:"",tool_name:"",flow_agent:"",failed:!1,range:"whole",start:"",end:""},vt=["prompts","messages","models","tools","agents","context","hooks","lifecycle"];function It({apply:e,scope:s,bounds:t,initialPrompts:n,promptsActive:i}){var $,a;const[o,_]=q(()=>n?{...Y,category:"prompts"}:Y),[m,g]=q(""),p=Me(),u=(r,l)=>{_(h=>({...h,[r]:l})),g("")},d=r=>{r.preventDefault();const l=new URLSearchParams;for(const x of["q","category","tool_name","flow_agent"])o[x].trim()&&l.set(x,o[x].trim());o.failed&&l.set("failed","1");let h;if(o.range==="custom")h=Xe(o.start,o.end);else if(o.range!=="whole"){if(!Number.isFinite(t.end)){g("The session end time has not been reported.");return}h={since:t.end-Number(o.range),until:t.end}}if(h!=null&&h.error){g(h.error);return}h&&(l.set("since",Math.floor(h.since)),l.set("until",Math.ceil(h.until))),g(""),e(l.toString())},f=r=>{if(r!=="custom"){u("range",r);return}g(""),_(l=>({...l,range:r,start:l.start||(Number.isFinite(t.start)?Se(t.start):""),end:l.end||(Number.isFinite(t.end)?Se(Math.ceil(t.end/60)*60):"")}))};return c`<form class="bd-flow-filters" role="search" aria-label="Flow filters" onSubmit=${d}>
    <button type="button" class="bd-btn" aria-pressed=${i} onClick=${()=>{const r={...Y,category:i?"":"prompts"};_(r),g(""),e(r.category?"category=prompts":"")}}>User prompts</button>
    <label class="bd-flow-search">${o.category==="prompts"?"Search prompt text":"Search events"}<input type="search" placeholder=${o.category==="prompts"?"Words you wrote in this session":"Search the session flow"} value=${o.q} onInput=${r=>u("q",r.currentTarget.value)}/></label>
    <label>Category<select value=${o.category} onChange=${r=>u("category",r.currentTarget.value)}>
      <option value="">All categories</option>${vt.map(r=>c`<option key=${r} value=${r}>${r==="prompts"?"User prompts only":r[0].toUpperCase()+r.slice(1)}</option>`)}
    </select></label>
    <label>Tool name<input list=${p+"-tools"} placeholder="Any tool" value=${o.tool_name} onInput=${r=>u("tool_name",r.currentTarget.value)}/></label>
    <datalist id=${p+"-tools"}>${($=s==null?void 0:s.tools)==null?void 0:$.map(r=>c`<option key=${r} value=${r}/>`)}</datalist>
    <label>Agent ID<input list=${p+"-agents"} placeholder="Any agent" value=${o.flow_agent} onInput=${r=>u("flow_agent",r.currentTarget.value)}/></label>
    <datalist id=${p+"-agents"}>${(a=s==null?void 0:s.agents)==null?void 0:a.map(r=>c`<option key=${r} value=${r}/>`)}</datalist>
    <label>Time range<select value=${o.range} onChange=${r=>f(r.currentTarget.value)}>
      <option value="whole">Whole session</option><option value="900" disabled=${!Number.isFinite(t.end)}>Last 15 min of session</option>
      <option value="3600" disabled=${!Number.isFinite(t.end)}>Last hour of session</option><option value="custom">Custom range</option>
    </select></label>
    ${o.range==="custom"&&c`<label>From (local)<input type="datetime-local" value=${o.start} onInput=${r=>u("start",r.currentTarget.value)}/></label>
      <label>To (local)<input type="datetime-local" value=${o.end} onInput=${r=>u("end",r.currentTarget.value)}/></label>`}
    <div class="bd-flow-actions"><label class="bd-ag-check"><input type="checkbox" checked=${o.failed} onChange=${r=>u("failed",r.currentTarget.checked)}/>Failures only</label>
      <button type="submit" class="bd-btn">Apply filters</button>
      <button type="button" class="bd-btn" onClick=${()=>{_(Y),g(""),e("")}}>Reset filters</button>
    </div>
    ${m&&c`<span class="bd-ag-bad" role="alert">${m}</span>`}
  </form>`}function Nt(e){if(!e)return null;try{const s=new URL(e);return["https:","http:"].includes(s.protocol)?s.href:null}catch{return null}}function Lt(e){return c`<${Ot} key=${e.a.id} ...${e}/>`}function Ot({a:e,st:s,ctx:t,act:n,flowRef:i,sid:o,captureMode:_,initialEvidence:m=!1,initialPrompts:g=!1,agentData:p}){var fe,ye,$e,he,ke,we,Te;const u=tt(s)?t.refreshKey:0,[d,f]=q(Ne),[$,a]=q(g?"category=prompts":""),r="limit="+d+($?"&"+$:""),{data:l,error:h}=st(w=>Ye(e.id,r,w),JSON.stringify(["flow",e.id,r]),u),[x,v]=nt(St,"timeline",["timeline","swimlane"]),[C,T]=q(m),[N,M]=q(m);De(()=>{T(m),m&&M(!0)},[m]);const b=C?"source":x,[k,S]=q(null),P=_e({});l&&!$&&(P.current={start:((fe=l.scope)==null?void 0:fe.start)??e.started_at,end:((ye=l.scope)==null?void 0:ye.end)??e.ended_at??((he=($e=l.turns)==null?void 0:$e.at(-1))==null?void 0:he.ts)});const Ue={start:P.current.start??e.started_at,end:P.current.end??e.ended_at},be=t.toolName?t.toolName(e.tool):e.tool,R=J(()=>ct((l==null?void 0:l.turns)||[],be,l==null?void 0:l.summary),[l,be]),Q=J(()=>i?R.events.filter(w=>w[i.field]===i.id&&(!i.traceId||w.trace_id===i.traceId)):R.events,[R,i]),Ke=w=>{T(w==="source"),w==="source"?M(!0):v(w)},Pe=w=>{w!==$&&(S(null),a(w),f(Ne))},se=Nt(l==null?void 0:l.session_kql_url),I=l==null?void 0:l.scope,ne=o||(l==null?void 0:l.session_id),ge=(ke=t.data)==null?void 0:ke.agents,Re=J(()=>[...new Set([ne,...(ge||[]).map(w=>{var xe;return w.native_session_id?w.native_session_id:w.placeholder||(xe=w.id)!=null&&xe.startsWith("live:")||w.runtime_present&&!w.queryable?null:w.session_id||w.parent_id||w.id})].filter(Boolean))],[ne,ge]),U=new URLSearchParams($),We=U.has("since")?Number(U.get("since")):null,Be=U.has("until")?Number(U.get("until")):null,He=o===void 0?e.native_session_id||e.session_id||(l==null?void 0:l.session_id):o,Qe=$?"Summary counts all events in the selected time span.":l&&Ie(l),O=R.summary,Ve=[{label:"Turns",value:y(O.turns),title:"Prompts in the session"},{label:"Tool calls",value:y(O.toolCalls)},{label:"Subagents",value:y(O.subagents)},{label:"Hooks",value:y(O.hooks)},{label:"Errors",value:y(O.errors)},{label:"Compactions",value:y(O.compactions)},{label:"Tokens, total",value:y(O.cumulative),title:"Input and output of every model call, added up"},{label:"Largest turn",value:y(O.roundTrip),title:"The most input and output tokens between two prompts"},{label:"First token",value:O.ttft==null?L:A(O.ttft),sub:O.ttftCalls?"median of "+O.ttftCalls+" calls":"",title:"Time to first token"}];return c`<${ot} a=${e}/>
    ${l&&c`<${V} key="summary" id="agfs" title="Summary" sub=${Qe}><${Je} stats=${Ve}/></${V}>`}
    <${V} key="flow" id="agfl" title="Flow" sub=${C?"Search retained source records separately from flow events.":E(l)&&!$?"Oldest first. The "+y(E(l))+" oldest events are left out; the summary counts them.":"Oldest first. Select an event to read it."}>
      <div class="bd-ag-bar"><${rt} label="Flow view" value=${b} onPick=${Ke} items=${[["timeline","Timeline"],["swimlane","Swim-lane"],["source","Source steps"]]}/>
        ${se&&c`<a class="bd-btn bd-flow-kusto" href=${se} target="_blank" rel="noopener noreferrer">Open session in Kusto</a>`}
      </div>
      ${se&&c`<${xt} url=${l.session_kql_url} sessionId=${ne} sessions=${Re}
        models=${(we=I==null?void 0:I.models)!=null&&we.length?I.models:e.models||[]} tools=${(I==null?void 0:I.tools)||[]} since=${We} until=${Be}/>`}
      <div hidden=${C}>
        <${It} scope=${I} bounds=${Ue} apply=${Pe} initialPrompts=${g} promptsActive=${U.get("category")==="prompts"}/>
        ${U.get("category")==="prompts"&&c`<p class="bd-note">User input only. Select a row to read the retained prompt. Assistant replies and delegated instructions are not included.</p>`}
        ${i&&c`<div class="bd-ag-bar"><span>${i.label} ID: ${i.id}</span><button type="button" class="bd-btn" onClick=${()=>{S(null),n.setDrawerTab("flow")}}>Show full flow</button></div>`}
        ${l?c`
          <div class="bd-ag-bar"><span role="status">${I&&I.matched!=null&&I.total!=null?`Showing ${Q.length.toLocaleString()} · ${I.matched.toLocaleString()} matched of ${I.total.toLocaleString()} events in range`:Ie(l)}</span>
            ${E(l)&&d<le?c`<button type="button" class="bd-btn" onClick=${()=>f(w=>Math.min(le,w+Oe))}>${"Show "+Math.min(E(l),Oe).toLocaleString("en-US")+" older events"}</button>`:null}
            ${E(l)&&d>=le?c`<span class="bd-ag-dim">${y(E(l))} older matching events remain outside the display limit.</span>`:null}
          </div>
          ${Q.length?!C&&(x==="swimlane"?c`<${Ct} events=${Q} participants=${R.participants} filtered=${!!($||i)} sel=${k} onSel=${S}/>`:c`<${qt} events=${Q} sel=${k} onSel=${S}/>`):c`<div class="bd-empty">${i?"No event in the loaded flow reports this source ID.":$?"No events match these flow filters.":"No flow data for this session: aictl has no prompt, model call or tool call of it, and no hook or OpenTelemetry event."}</div>`}
        `:c`<${it} error=${h} what="the session flow"/>`}
      </div>
      ${N&&c`<div hidden=${!C}><${at} inline=${!0} a=${e} sid=${He} data=${p} act=${n} captureMode=${_??((Te=t.data)==null?void 0:Te.capture_mode)}/></div>`}
    </${V}>`}export{Ne as FLOW_EVENTS,le as FLOW_EVENTS_MAX,Oe as FLOW_EVENTS_STEP,St as FLOW_MODE_KEY,Lt as default};

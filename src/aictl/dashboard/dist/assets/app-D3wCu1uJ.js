const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/HiddenContextPanel-9E_H4vjP.js","assets/index-9VorCZJ6.js","assets/useSse-eOqpz3HG.js","assets/useAsyncResource-U2mM1BX4.js","assets/TextView-B6XMkVXA.js","assets/TextView-DfSPGgUz.css","assets/TabOverview-5tCGbG4W.js","assets/TabMemory-C1EOrHX-.js","assets/ContextMap-eWz6Gpbj.js","assets/TabLive-SDvv_fBj.js","assets/DataTable-CYIknFLw.js","assets/TabEventsStats-83Gka9Rh.js","assets/TabBudget-Gm3JztTQ.js","assets/models-DHnW0Za4.js","assets/TabAnalytics-DP8_OHyL.js","assets/echarts-BbyLWlSf.js","assets/TabExplorer-XR26NRyH.js","assets/TabToolConfig-BAlTypfB.js","assets/TabToolConfig-B-BsdUIN.css","assets/TabProjectEnv-0aXdnPef.js","assets/CAgentsTab-CvcDcWRw.js","assets/CDashboardTab-BPl5fjsv.js","assets/CPromptsTab-JQb1Rz8r.js","assets/CSessionsTab-CM6p6XhY.js"])))=>i.map(i=>d[i]);
import{R as Er,d as ee,A as Z,q as re,y as oe,w as Tr,r as $c,a as Ar,L as yl,c as ii,e as bc,T as Ae,x as Xl,f as Ks,g as _c,m as g,h as wc,i as kc,k as ri,b as at}from"./index-9VorCZJ6.js";import{l as Gs,a as xc,m as Sc,b as Mc,n as Ec,o as Tc,P as Hn,q as Kt,r as yt,v as qn,C as hl,f as Cr,w as Lr,x as Dr,y as Ac,z as $l,A as fo,B as Il,D as Cc,E as Lc,F as Dc,G as ai,H as Pc,I as Rc,J as Os,K as ci,L as jl,S as Oc,M as Ic,O as es,Q as Ul,R as ct,s as zc,h as Vc,T as Kn,U as wl,V as Pr,W as Nc,X as Fc,d as Hc,e as Bc,t as zl,p as jc,Y as Rr,Z as ts,c as Uc,u as Wc,_ as ui,$ as qc,a0 as dl,a1 as Kc,a2 as Gc,a3 as Yc}from"./useSse-eOqpz3HG.js";import{T as Jc}from"./TextView-B6XMkVXA.js";const kl=Er(null),di=200,fi=80;function Qc(e){const t=e==null?void 0:e.memory_rss_bytes;return typeof t=="number"&&isFinite(t)?t/1048576:null}const Zc=["ts","files","tokens","cpu","mem_mb","mcp","mem_tokens","live_sessions","live_tokens","live_in_rate","live_out_rate"];function Xc(e,t){const l=Array.isArray(e)?e.slice():[],n=new Map(l.map((o,r)=>[o.session_id,r]));for(const o of t.upsert||[])n.has(o.session_id)?l[n.get(o.session_id)]=o:(n.set(o.session_id,l.length),l.push(o));for(const o of t.patch||[])n.has(o.session_id)&&(l[n.get(o.session_id)]={...l[n.get(o.session_id)],...o});const s=new Set(t.remove||[]);return s.size?l.filter(o=>!s.has(o.session_id)):l}function eu(e,t){return Array.isArray(e==null?void 0:e.tools)?{...e,tools:e.tools.map(l=>"live"in l?(t[l.tool]=l.live,l):l.tool in t?{...l,live:t[l.tool]}:l)}:e}function Or(e,t){if(!e)return t;const{sessions_delta:l,tools_rev:n,...s}=t,o=Object.fromEntries((t.tools||[]).map(a=>[a.tool,a])),r={...e,...s,tools:e.tools.map(a=>{const c=o[a.tool];return c?{...a,live:c.live,vendor:c.vendor||a.vendor,host:c.host||a.host}:a})};return l&&(r.sessions=Xc(e.sessions,l)),r}function Ir(e,t){var n,s,o;if(!e)return e;if(e.ts.push(t.timestamp),e.files.push(t.total_files),e.tokens.push(t.total_tokens),e.cpu.push(Math.round(t.total_cpu*10)/10),e.mem_mb.push(Math.round(t.total_mem_mb*10)/10),e.mcp.push(t.total_mcp_servers),e.mem_tokens.push(t.total_memory_tokens),e.live_sessions.push(t.total_live_sessions),e.live_tokens.push(t.total_live_estimated_tokens),e.live_in_rate.push(Math.round((t.total_live_inbound_rate_bps||0)*100)/100),e.live_out_rate.push(Math.round((t.total_live_outbound_rate_bps||0)*100)/100),e.ts.length>di)for(const r of Zc)e[r]=e[r].slice(-di);const l=e.by_tool||{};for(const r of t.tools||[]){if(r.tool==="aictl")continue;const a=((n=r.live)==null?void 0:n.cpu_percent)||0,c=Qc(r.live)||0,d=r.tokens||0,v=(((s=r.live)==null?void 0:s.outbound_rate_bps)||0)+(((o=r.live)==null?void 0:o.inbound_rate_bps)||0);l[r.tool]||(l[r.tool]={ts:[],cpu:[],mem_mb:[],tokens:[],traffic:[]});const p=l[r.tool];if(p.ts.push(t.timestamp),p.cpu.push(Math.round(a*10)/10),p.mem_mb.push(Math.round(c*10)/10),p.tokens.push(d),p.traffic.push(Math.round(v*100)/100),p.ts.length>fi)for(const m of Object.keys(p))p[m]=p[m].slice(-fi)}return{...e,by_tool:l}}const tu=15,nu=5;function zr(e){return(e==null?void 0:e.session_id)??(e==null?void 0:e.id)??null}const pi=/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;function lu(e){return Array.isArray(e==null?void 0:e.alt_session_ids)?e.alt_session_ids:[]}function Ys(e){const t=[];for(const l of[zr(e),...lu(e)])l!=null&&l!==""&&!t.includes(l)&&t.push(l);return t}function h0(e,t){if(t!=null)return(e||[]).find(l=>Ys(l).includes(t))}function hi(e){return Math.max((e==null?void 0:e.ended_at)||0,(e==null?void 0:e.started_at)||0,(e==null?void 0:e.last_activity)||0)}function mi(e){return e!=null&&e.duration_s?e.duration_s:e!=null&&e.ended_at&&(e!=null&&e.started_at)?e.ended_at-e.started_at:null}function vi(e,t){const[l,n]=hi(t)>hi(e)?[t,e]:[e,t],s={...l};for(const r of["input_tokens","output_tokens","exact_input_tokens","exact_output_tokens","files_modified"]){const a=(n==null?void 0:n[r])||0;a>(s[r]||0)&&(s[r]=a)}for(const r of Object.keys(n||{}))s[r]==null&&n[r]!=null&&(s[r]=n[r]);const o=[];for(const r of[...Ys(l),...Ys(n)])o.includes(r)||o.push(r);if(o.length>1){const r=pi.test(String(o[0]))?o[0]:o.find(a=>pi.test(String(a)))??o[0];s.session_id=r,s.id!=null&&(s.id=r),s.alt_session_ids=o.filter(a=>a!==r)}return s}function su(e,t){if(!(e!=null&&e.tool)||e.tool!==(t==null?void 0:t.tool)||e.started_at==null||t.started_at==null||Math.abs(e.started_at-t.started_at)>tu)return!1;const l=mi(e),n=mi(t);return l==null&&n==null?!0:l==null||n==null?!1:Math.abs(l-n)<=nu}function m0(e){if(!Array.isArray(e))return[];if(e.length<2)return e.slice();const t=new Map,l=[];for(const s of e){if(!s)continue;const o=zr(s);if(o!=null&&t.has(o)){const r=t.get(o);l[r]=vi(l[r],s)}else o!=null&&t.set(o,l.length),l.push(s)}const n=[];for(const s of l){const o=n.findIndex(r=>su(r,s));o>=0?n[o]=vi(n[o],s):n.push(s)}return n}const it=e=>Number(e)||0;function ou(e){const t=((e==null?void 0:e.tools)||[]).filter(a=>a.tool!=="aictl"),l=a=>Array.isArray(a.files)?a.files:[],n=a=>t.reduce((c,d)=>c+a(d),0),s=a=>a.live||{},o=(e==null?void 0:e.agent_memory)||[],r=a=>{var c,d;return it((c=s(a).token_estimate)==null?void 0:c.input_tokens)+it((d=s(a).token_estimate)==null?void 0:d.output_tokens)};return{total_files:n(a=>Array.isArray(a.files)?a.files.length:it(a.files_count)),total_tokens:n(a=>l(a).reduce((c,d)=>c+it(d.tokens),0)),total_size:n(a=>l(a).reduce((c,d)=>c+it(d.size),0)),total_processes:n(a=>Math.max(Array.isArray(a.processes)?a.processes.length:it(a.processes_count),it(s(a).pid_count))),total_cpu:Math.round(n(a=>s(a).cpu_percent?it(s(a).cpu_percent):(a.processes||[]).reduce((c,d)=>c+it(d.cpu_pct),0))*10)/10,total_mem_mb:Math.round(n(a=>(a.processes||[]).reduce((c,d)=>c+it(d.mem_mb),0))*10)/10,total_mcp_servers:((e==null?void 0:e.mcp_detail)||[]).length,total_memory_tokens:o.reduce((a,c)=>a+it(c.tokens),0),total_live_sessions:n(a=>it(s(a).session_count)),total_live_estimated_tokens:n(r),total_live_outbound_rate_bps:Math.round(n(a=>it(s(a).outbound_rate_bps))*100)/100,total_live_inbound_rate_bps:Math.round(n(a=>it(s(a).inbound_rate_bps))*100)/100}}function iu(e,t){if(!e||!Array.isArray(t))return e;const l=e.by_tool||{},n=t.filter(r=>{var a,c;return(c=(a=l[r])==null?void 0:a.ts)==null?void 0:c.length}),s=[...new Set(n.flatMap(r=>l[r].ts))].sort((r,a)=>r-a),o=r=>s.map(a=>n.reduce((c,d)=>{var p;const v=l[d].ts.indexOf(a);return c+(v>=0?it((p=l[d][r])==null?void 0:p[v]):0)},0));return{ts:s,cpu:o("cpu"),mem_mb:o("mem_mb"),tokens:o("tokens"),by_tool:l}}const ru=720;function au(e={}){const{EventSourceClass:t,refreshMs:l=3e4,applyMs:n=1e3,stallMs:s=6e4,minRefetchGapMs:o=3e4,maxQueued:r=ru}=e,[a,c]=ee(null),[d,v]=ee(null),[p,m]=ee(null),$=Z(!1),x=Z(null),D=Z(!1),w=Z(0),E=Z(Date.now()),k=Z(()=>{}),C=Z(null),S=Z({}),_=Z(!1),M=re(()=>$.current?Promise.resolve():($.current=!0,w.current=Date.now(),Sc().then(V=>{x.current=(V==null?void 0:V.tools_rev)||null,D.current=!0,c(V),m(Date.now()),k.current()}).catch(()=>{}).finally(()=>{$.current=!1})),[]),P=re(()=>{if(C.current||$.current)return;const V=Math.max(0,o-(Date.now()-w.current));C.current=setTimeout(()=>{C.current=null,M()},V)},[M,o]);oe(()=>{M(),Gs().then(v).catch(()=>{})},[M]);const R=Z([]),Y=Z(0),O=Z(null),T=re(()=>{O.current&&(clearTimeout(O.current),O.current=null);const V=R.current;!V.length||!D.current||(R.current=[],Y.current=Date.now(),c(N=>N&&V.reduce((Pe,ue)=>Or(Pe,ue),N)),v(N=>V.reduce(Ir,N)),m(Date.now()))},[]);k.current=T;const W=re(V=>{E.current=Date.now();const N=eu(V,S.current);if(R.current.push(N),R.current.length>r&&(R.current.shift(),_.current=!0),typeof document<"u"&&document.hidden)return;N.tools_rev&&x.current&&N.tools_rev!==x.current&&P();const Pe=n-(Date.now()-Y.current);Pe<=0?T():O.current||(O.current=setTimeout(T,Pe))},[n,T,P,r]);oe(()=>{const V=()=>{document.hidden||(_.current&&(_.current=!1,M()),T())};return document.addEventListener("visibilitychange",V),()=>{document.removeEventListener("visibilitychange",V),O.current&&clearTimeout(O.current),C.current&&clearTimeout(C.current)}},[T,M]);const{connected:z}=xc(Mc(),W,t?{EventSourceClass:t}:{}),q=Z(z);q.current=z;const B=Z(!1);return oe(()=>{z&&(B.current&&M(),B.current=!0)},[z,M]),oe(()=>{if(!l)return;const V=setInterval(()=>{if(document.hidden)return;(!D.current||!q.current||Date.now()-E.current>s)&&M()},l);return()=>clearInterval(V)},[M,l,s]),{snapshot:a,history:d,connected:z,lastUpdateAt:p,refresh:M,setHistory:v}}function Un(e,t=[],{pollMs:l=0}={}){const[n,s]=ee({data:null,error:null,loading:!0,updatedAt:null}),o=Z(e);o.current=e;const r=Z(0),a=re(()=>{const c=++r.current;return s(d=>({...d,loading:!0})),Promise.resolve().then(()=>o.current()).then(d=>{c===r.current&&s({data:d,error:null,loading:!1,updatedAt:Date.now()})}).catch(d=>{c===r.current&&s(v=>({...v,error:d,loading:!1}))})},[]);return oe(()=>{if(a(),!l)return()=>{r.current++};const c=setInterval(()=>{document.hidden||a()},l);return()=>{clearInterval(c),r.current++}},[a,l,...t]),{...n,reload:a}}const xl=[{id:"live",label:"Live",seconds:3600},{id:"1h",label:"1h",seconds:3600},{id:"6h",label:"6h",seconds:21600},{id:"24h",label:"24h",seconds:86400},{id:"7d",label:"7d",seconds:604800}],ns=Object.fromEntries(xl.map(e=>[e.id,e.seconds])),Vr="aictl-pref-range";function cu(){try{const e=localStorage.getItem(Vr),t=e!=null?JSON.parse(e):"live";return ns[t]?t:"live"}catch{return"live"}}function uu(e){try{localStorage.setItem(Vr,JSON.stringify(e))}catch{}}function Js(e){const t=ns[e]||3600;return{id:e,since:Date.now()/1e3-t,until:null}}function du(){const e=Ar().range;return(e==null?void 0:e.id)==="custom"?e:e&&ns[e.id]?Js(e.id):Js(cu())}function fu(){const[e,t]=ee(du);oe(()=>{Tr($c(e))},[e]);const l=re(o=>{t(Js(o)),uu(o)},[]),n=re((o,r)=>{t({id:"custom",since:o,until:r})},[]),s=re(o=>{typeof o=="string"?l(o):o&&typeof o=="object"&&t(o)},[l]);return{range:e,setRange:s,setPreset:l,setCustom:n,presets:xl}}const Nr="aictl-pref-active_tab",Wl=yl.tabs,Wn=Wl.map(e=>e.id);var Mr;const ql=((Mr=Wl[0])==null?void 0:Mr.id)||"overview";function gi(){const e=ii(Ar().tab,Wn);if(e)return e;try{const t=localStorage.getItem(Nr);return ii(t!=null?JSON.parse(t):null,Wn)||ql}catch{return ql}}function po(e){if(!e)return!1;const t=e.tagName;return t==="INPUT"||t==="TEXTAREA"||t==="SELECT"||e.isContentEditable}function pu(){const[e,t]=ee(gi),l=Z(e);l.current=e;const n=re(s=>{t(s),Tr(bc(s,ql),{push:!0});try{localStorage.setItem(Nr,JSON.stringify(s))}catch{}s===ql&&window.dispatchEvent(new Event("aictl:route"))},[]);return oe(()=>{const s=()=>t(gi());return window.addEventListener("popstate",s),()=>window.removeEventListener("popstate",s)},[]),oe(()=>{const s=o=>{if(po(o.target)||o.metaKey||o.ctrlKey||o.altKey)return;if(o.key==="["||o.key==="]"){const a=o.key==="]"?1:-1,c=Wn.indexOf(l.current);n(Wn[(c+a+Wn.length)%Wn.length]);return}const r=Wl.find(a=>a.key&&a.key===o.key);r&&n(r.id)};return document.addEventListener("keydown",s),()=>document.removeEventListener("keydown",s)},[n]),{activeTab:e,setActiveTab:n,tabs:Wl}}const Fr=["compact","normal","spacious"],Hr="aictl-density",Br=new Set(Fr);function hu(){try{const e=localStorage.getItem(Hr);return Br.has(e)?e:"normal"}catch{return"normal"}}function mu(){const[e,t]=ee(hu);oe(()=>{document.documentElement.setAttribute("data-density",e);try{localStorage.setItem(Hr,e)}catch{}},[e]);const l=re(n=>{Br.has(n)&&t(n)},[]);return{density:e,setDensity:l,densities:Fr}}const jr="aictl-views-v1";function yi(){try{const e=localStorage.getItem(jr),t=e?JSON.parse(e):[];return Array.isArray(t)?t:[]}catch{return[]}}function $i(e){try{localStorage.setItem(jr,JSON.stringify(e))}catch{}}function bi(e){try{const t=JSON.stringify({tab:e.tab,range:e.range,tools:Array.isArray(e.tools)?[...e.tools].sort():e.tools,density:e.density,theme:e.theme});let l=5381;for(let n=0;n<t.length;n++)l=(l<<5)+l+t.charCodeAt(n)|0;return String(l)}catch{return""}}function vu(){return"v_"+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4)}function gu(e,t){const[l,n]=ee(yi);oe(()=>{if(!(typeof window>"u"))try{const v=new URLSearchParams(window.location.search).get("view");if(!v)return;const p=yi().find(m=>m.id===v);p&&t&&t(p)}catch{}},[]);const s=re(d=>{const v=(d||"").trim();if(!v)return null;const p={id:vu(),name:v,tab:e.tab,range:e.range,tools:e.tools,density:e.density,theme:e.theme,createdAt:Date.now()};return n(m=>{const $=[...m,p];return $i($),$}),p},[e]),o=re(d=>{n(v=>{const p=v.filter(m=>m.id!==d);return $i(p),p})},[]),r=re(d=>{const v=l.find(p=>p.id===d);if(!v)return!1;t&&t(v);try{const p=new URL(window.location.href);p.searchParams.set("view",d),window.history.replaceState({},"",p.toString())}catch{}return!0},[l,t]),a=Ae(()=>bi(e),[e]),c=Ae(()=>l.find(d=>bi({tab:d.tab,range:d.range,tools:d.tools,density:d.density,theme:d.theme})===a)||null,[l,a]);return{views:l,saveView:s,deleteView:o,applyView:r,currentHash:a,matchingView:c}}const Ur="aictl-cmdpalette-lru-v1",Wr=5;function yu(){try{const e=localStorage.getItem(Ur),t=e?JSON.parse(e):[];return Array.isArray(t)?t.slice(0,Wr):[]}catch{return[]}}function $u(e){try{localStorage.setItem(Ur,JSON.stringify(e))}catch{}}function bu(){const[e,t]=ee(!1),[l,n]=ee(yu),s=re(()=>t(!0),[]),o=re(()=>t(!1),[]),r=re(()=>t(c=>!c),[]),a=re(c=>{c&&n(d=>{const v=[c,...d.filter(p=>p!==c)].slice(0,Wr);return $u(v),v})},[]);return oe(()=>{const c=d=>{(d.metaKey||d.ctrlKey)&&(d.key==="k"||d.key==="K")&&(d.preventDefault(),t(p=>!p))};return document.addEventListener("keydown",c),()=>document.removeEventListener("keydown",c)},[]),{isOpen:e,open:s,close:o,toggle:r,lru:l,recordUse:a}}let Sl=null,qr=null;if(typeof document<"u"){document.addEventListener("aictl:select-session",t=>{var l;Sl=(l=t==null?void 0:t.detail)!=null&&l.sessionId?t.detail:null});const e=new URLSearchParams(window.location.search).get("session");e&&(Sl={sessionId:e,tool:null})}function v0(){const e=Sl||qr;return Sl=null,e}function g0(){Sl=null}function y0(e,t){qr=e?{sessionId:e,tool:t||null}:null}function _u(){var t;if(typeof navigator>"u")return!1;const e=((t=navigator.userAgentData)==null?void 0:t.platform)||navigator.platform||navigator.userAgent||"";return/mac|iphone|ipad/i.test(e)}function $0(){var t;if(typeof navigator>"u")return!1;const e=((t=navigator.userAgentData)==null?void 0:t.platform)||navigator.platform||navigator.userAgent||"";return/win/i.test(e)&&!/darwin/i.test(e)}function Kr(){return _u()?"⌘K":"Ctrl+K"}/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gr=(...e)=>e.filter((t,l,n)=>!!t&&t.trim()!==""&&n.indexOf(t)===l).join(" ").trim();/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _i=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wu=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(t,l,n)=>n?n.toUpperCase():l.toLowerCase());/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wi=e=>{const t=wu(e);return t.charAt(0).toUpperCase()+t.slice(1)};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var ku={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xu=Er({size:24,color:"currentColor",strokeWidth:2,absoluteStrokeWidth:!1,class:""}),Su=()=>Xl(xu);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mu=e=>{for(const t in e)if(t.startsWith("aria-")||t==="role"||t==="title")return!0;return!1};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Eu=({color:e,size:t,strokeWidth:l,absoluteStrokeWidth:n,children:s,iconNode:o,class:r="",...a})=>{const{size:c=24,strokeWidth:d=2,absoluteStrokeWidth:v=!1,color:p="currentColor",class:m=""}=Su()??{},$=n??v?Number(l??d)*24/Number(t??c):l??d;return Ks("svg",{...ku,width:t??c??24,height:t??c??24,stroke:e??p,"stroke-width":$,class:Gr("lucide",m,r),...!s&&!Mu(a)&&{"aria-hidden":"true"},...a},[...o.map(([x,D])=>Ks(x,D)),..._c(s)])};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J=(e,t)=>{const l=({class:n="",className:s="",children:o,...r})=>Ks(Eu,{...r,iconNode:t,class:Gr(`lucide-${_i(wi(e))}`,`lucide-${_i(e)}`,n,s)},o);return l.displayName=wi(e),l};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tu=J("activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Au=J("archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cu=J("banknote",[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lu=J("book-open",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Du=J("bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pu=J("brain-circuit",[["path",{d:"M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z",key:"l5xja"}],["path",{d:"M9 13a4.5 4.5 0 0 0 3-4",key:"10igwf"}],["path",{d:"M6.003 5.125A3 3 0 0 0 6.401 6.5",key:"105sqy"}],["path",{d:"M3.477 10.896a4 4 0 0 1 .585-.396",key:"ql3yin"}],["path",{d:"M6 18a4 4 0 0 1-1.967-.516",key:"2e4loj"}],["path",{d:"M12 13h4",key:"1ku699"}],["path",{d:"M12 18h6a2 2 0 0 1 2 2v1",key:"105ag5"}],["path",{d:"M12 8h8",key:"1lhi5i"}],["path",{d:"M16 8V5a2 2 0 0 1 2-2",key:"u6izg6"}],["circle",{cx:"16",cy:"13",r:".5",key:"ry7gng"}],["circle",{cx:"18",cy:"3",r:".5",key:"1aiba7"}],["circle",{cx:"20",cy:"21",r:".5",key:"yhc1fs"}],["circle",{cx:"20",cy:"8",r:".5",key:"1e43v0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ru=J("brain",[["path",{d:"M12 18V5",key:"adv99a"}],["path",{d:"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4",key:"1e3is1"}],["path",{d:"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5",key:"1gqd8o"}],["path",{d:"M17.997 5.125a4 4 0 0 1 2.526 5.77",key:"iwvgf7"}],["path",{d:"M18 18a4 4 0 0 0 2-7.464",key:"efp6ie"}],["path",{d:"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517",key:"1gq6am"}],["path",{d:"M6 18a4 4 0 0 1-2-7.464",key:"k1g0md"}],["path",{d:"M6.003 5.125a4 4 0 0 0-2.526 5.77",key:"q97ue3"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ou=J("chart-column",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Iu=J("chart-line",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zu=J("chevron-down",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vu=J("chevron-right",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nu=J("clipboard-list",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fu=J("clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 6v6l4 2",key:"mmk7yg"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hu=J("coins",[["path",{d:"M13.744 17.736a6 6 0 1 1-7.48-7.48",key:"bq4yh3"}],["path",{d:"M15 6h1v4",key:"11y1tn"}],["path",{d:"m6.134 14.768.866-.5 2 3.464",key:"17snzx"}],["circle",{cx:"16",cy:"8",r:"6",key:"14bfc9"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bu=J("command",[["path",{d:"M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3",key:"11bfej"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ju=J("cpu",[["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M17 20v2",key:"1rnc9c"}],["path",{d:"M17 2v2",key:"11trls"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M2 17h2",key:"7oei6x"}],["path",{d:"M2 7h2",key:"asdhe0"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"M20 17h2",key:"1fpfkl"}],["path",{d:"M20 7h2",key:"1o8tra"}],["path",{d:"M7 20v2",key:"4gnj0m"}],["path",{d:"M7 2v2",key:"1i4yhu"}],["rect",{x:"4",y:"4",width:"16",height:"16",rx:"2",key:"1vbyd7"}],["rect",{x:"8",y:"8",width:"8",height:"8",rx:"1",key:"z9xiuo"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uu=J("eye-off",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wu=J("file-pen",[["path",{d:"M12.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v9.34",key:"o6klzx"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10.378 12.622a1 1 0 0 1 3 3.003L8.36 20.637a2 2 0 0 1-.854.506l-2.867.837a.5.5 0 0 1-.62-.62l.836-2.869a2 2 0 0 1 .506-.853z",key:"zhnas1"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qu=J("file-text",[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ku=J("folder",[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",key:"1kt360"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gu=J("funnel",[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yu=J("git-branch",[["path",{d:"M15 6a9 9 0 0 0-9 9V3",key:"1cii5b"}],["circle",{cx:"18",cy:"6",r:"3",key:"1h7g24"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ju=J("globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qu=J("grid-3x3",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M3 15h18",key:"5xshup"}],["path",{d:"M9 3v18",key:"fh3hqa"}],["path",{d:"M15 3v18",key:"14nvp0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zu=J("layout-dashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xu=J("layers",[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ed=J("lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const td=J("mail",[["path",{d:"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7",key:"132q7q"}],["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2",key:"izxlao"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nd=J("menu",[["path",{d:"M4 5h16",key:"1tepv9"}],["path",{d:"M4 12h16",key:"1lakjw"}],["path",{d:"M4 19h16",key:"1djgab"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ld=J("message-square",[["path",{d:"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",key:"18887p"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sd=J("moon",[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const od=J("package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const id=J("pen",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rd=J("plug",[["path",{d:"M12 22v-5",key:"1ega77"}],["path",{d:"M15 8V2",key:"18g5xt"}],["path",{d:"M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z",key:"1xoxul"}],["path",{d:"M9 8V2",key:"14iosj"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ad=J("radio",[["path",{d:"M16.247 7.761a6 6 0 0 1 0 8.478",key:"1fwjs5"}],["path",{d:"M19.075 4.933a10 10 0 0 1 0 14.134",key:"ehdyv1"}],["path",{d:"M4.925 19.067a10 10 0 0 1 0-14.134",key:"1q22gi"}],["path",{d:"M7.753 16.239a6 6 0 0 1 0-8.478",key:"r2q7qm"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cd=J("refresh-cw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ud=J("save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yr=J("search",[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dd=J("server",[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fd=J("settings",[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pd=J("sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hd=J("trash-2",[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const md=J("triangle-alert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vd=J("user",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gd=J("users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yd=J("wallet",[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $d=J("webhook",[["path",{d:"M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2",key:"q3hayz"}],["path",{d:"m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06",key:"1go1hn"}],["path",{d:"m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8",key:"qlwsc0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bd=J("wrench",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",key:"1ngwbx"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _d=J("x",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wd=J("zap",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]),kd={activity:Tu,"alert-triangle":md,filter:Gu,"eye-off":Uu,archive:Au,banknote:Cu,"bar-chart-3":Ou,"book-open":Lu,bot:Du,brain:Ru,"brain-circuit":Pu,"chevron-down":zu,"chevron-right":Vu,"clipboard-list":Nu,clock:Fu,coins:Hu,cpu:ju,"file-pen":Wu,"file-text":qu,folder:Ku,"git-branch":Yu,globe:Ju,"grid-3x3":Qu,layers:Xu,"layout-dashboard":Zu,"line-chart":Iu,lock:ed,mail:td,"message-square":ld,moon:sd,package:od,pen:id,plug:rd,radio:ad,"refresh-cw":cd,search:Yr,server:dd,settings:fd,sun:pd,user:vd,users:gd,wallet:yd,webhook:$d,wrench:bd,x:_d,zap:wd};function Vt({name:e,size:t="1em",strokeWidth:l=2,...n}){if(!e)return null;const s=kd[String(e)];return s?g`<${s} size=${t} strokeWidth=${l} aria-hidden="true" ...${n} />`:g`<span aria-hidden="true" ...${n}>${e}</span>`}function xd({tool:e,tools:t}){const l=(t||[e]).filter(Boolean).map(n=>n.label||n.tool).join(", ");return g`<div class="panel-state panel-state--withheld" role="status">
    <${Vt} name="radio" size="14"/>
    <div>
      <div class="panel-state__title">Not available from this machine</div>
      <div class="panel-state__hint">${l} runs in the vendor's cloud, so it leaves no local sessions, processes, tokens or files for aictl to read. Its activity is visible only in the vendor's admin reports.</div>
    </div>
  </div>`}const Sd=new Set(["overview","live","procs","events","explorer"]),Md=3e4;function Ed(e,t,{activeTab:l,now:n=Date.now()}){var a;const s={value:t,at:n,tab:l};return!e||Sd.has(l)||e.tab!==l||!!!((a=e.value)!=null&&a.snap)&&t.snap||!(e.value.enabledTools===t.enabledTools&&e.value.globalRange===t.globalRange&&e.value.openViewer===t.openViewer&&e.value.recentFiles===t.recentFiles)||n-e.at>=Md?s:e}function Td({count:e}){return e?g`<div class="panel-state panel-state--note" role="note" data-testid="filter-hidden-note">
    <${Vt} name="filter" size="12"/>
    <span>${e} row${e===1?"":"s"} from unattributed or unverified tools ${e===1?"is":"are"} hidden while the tool filter is on. Choose All tools to see ${e===1?"it":"them"}.</span>
  </div>`:null}function Ad({path:e,at:t,line:l,onClose:n}){const{snap:s}=Xl(kl),[o,r]=ee(null),[a,c]=ee(!1),[d,v]=ee(null),p=Z(null),m=l>0?Math.floor(l):0,$=Z(null),[x,D]=ee(()=>{try{return parseInt(localStorage.getItem("aictl-viewer-width"))||55}catch{return 55}}),w=Z(!1),E=Z(0),k=Z(0),C=re(O=>{w.current=!0,E.current=O.clientX,k.current=x,O.preventDefault()},[x]);if(oe(()=>{const O=W=>{if(!w.current)return;const z=E.current-W.clientX,q=window.innerWidth,B=Math.min(90,Math.max(20,k.current+z/q*100));D(B)},T=()=>{if(w.current){w.current=!1;try{localStorage.setItem("aictl-viewer-width",String(Math.round(x)))}catch{}}};return window.addEventListener("mousemove",O),window.addEventListener("mouseup",T),()=>{window.removeEventListener("mousemove",O),window.removeEventListener("mouseup",T)}},[x]),oe(()=>{if(!e)return;$.current=document.activeElement;const O=setTimeout(()=>{var z;const W=(z=p.current)==null?void 0:z.querySelector("button");W&&W.focus()},50),T=W=>{if(W.key!=="Tab"||!p.current)return;const z=p.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');if(!z.length)return;const q=z[0],B=z[z.length-1];W.shiftKey&&document.activeElement===q?(W.preventDefault(),B.focus()):!W.shiftKey&&document.activeElement===B&&(W.preventDefault(),q.focus())};return document.addEventListener("keydown",T),()=>{clearTimeout(O),document.removeEventListener("keydown",T),$.current&&$.current.focus&&$.current.focus()}},[e]),oe(()=>{if(!e)return;v(null),r(null),(t?Ec(e,t):Tc(e)).then(r).catch(T=>v(T.message))},[e,t]),oe(()=>{e&&c(!!m)},[e,t,m]),oe(()=>{var T;if(!e||!m||o===null)return;const O=(T=p.current)==null?void 0:T.querySelector(".fv-line--hit");O&&O.scrollIntoView&&O.scrollIntoView({block:"center"})},[e,m,o,a]),!e)return null;const S=Ae(()=>{if(!s)return"";for(const O of s.tools)for(const T of O.files)if(T.path===e)return(T.kind||"")+" | "+Kt(T.size)+" | ~"+yt(T.tokens)+"tok | scope:"+(T.scope||"?")+" | sent_to_llm:"+(T.sent_to_llm||"?")+" | loaded:"+(T.loaded_when||"?");for(const O of s.agent_memory)if(O.file===e)return O.source+" | "+O.profile+" | "+O.tokens+"tok | "+O.lines+"ln";return""},[s,e]),_=o?o.split(`
`):[],M=_.length,P=M>Hn*2,R=(O,T)=>O.map((W,z)=>g`<div class=${"fv-line"+(T+z===m?" fv-line--hit":"")}><span class="fv-ln">${T+z}</span><span class="fv-code">${qn(W)||" "}</span></div>`),Y=!P||a?g`<div class="fv-lines">${R(_,1)}</div>`:g`<div class="fv-lines">${R(_.slice(0,Hn),1)}</div>
      <div class="fv-ellipsis" onClick=${()=>c(!0)}>\u25BC ${M-Hn*2} more lines \u25BC</div>
      <div class="fv-lines">${R(_.slice(-Hn),M-Hn+1)}</div>`;return g`<div class="fv" ref=${p} role="dialog" aria-modal="true" aria-label="File viewer" style=${"width:"+x+"vw"}>
    <div class="file-viewer__resize-handle" onMouseDown=${C}/>
    <div class="fv-head">
      <span class="path">${e}${m?g`<span class="fv-at">:${m}</span>`:""}</span>
      ${t&&g`<span class="badge text-xs mono" style="background:var(--bg2);color:var(--fg2);margin-left:var(--sp-2)"
        title=${"Historical content at unix ts "+t}>@ ${new Date(t*1e3).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>`}
      <button onClick=${n} aria-label="Close file viewer">Close (Esc)</button>
    </div>
    <div class="fv-meta">${S}</div>
    <div class="fv-body">
      ${d?g`<p class="text-red" style="padding:var(--sp-10)">${d}</p>`:o?g`<${Jc} key=${m?"at-line":"whole"} text=${o} path=${e} source=${Y} prefer=${m?"source":null}/>`:g`<p class="text-muted" style="padding:var(--sp-10)">Loading...</p>`}
    </div>
    <div class="fv-toolbar">
      <span>${M} lines${P&&!a?" (showing "+Hn*2+" of "+M+")":""}</span>
      ${P&&g`<button onClick=${()=>c(!a)}>${a?"Collapse":"Show all"}</button>`}
    </div>
  </div>`}function on({variant:e="secondary",size:t="md",loading:l=!1,disabled:n=!1,type:s="button",onClick:o,class:r,className:a,children:c,...d}){const v=["aictl-ui-btn",`aictl-ui-btn--${e}`,t==="sm"?"aictl-ui-btn--sm":null,r,a].filter(Boolean).join(" "),p=n||l;return g`<button
    type=${s}
    class=${v}
    disabled=${p}
    aria-busy=${l?"true":null}
    onClick=${p?void 0:o}
    ...${d}
  >${l?g`<span class="aictl-ui-btn__spinner" aria-hidden="true"></span>`:null}${c}</button>`}function ki({variant:e="neutral",size:t="sm",dot:l=!1,class:n,className:s,children:o,...r}){const a=["aictl-ui-badge",`aictl-ui-badge--${e}`,t==="md"?"aictl-ui-badge--md":null,n,s].filter(Boolean).join(" ");return g`<span class=${a} ...${r}>
    ${l?g`<span class="aictl-ui-badge__dot" aria-hidden="true"></span>`:null}
    ${o}
  </span>`}function Cd(e,t,l){let s=0,o=0;switch(l){case"top":s=e.top-t.height-6,o=e.left+(e.width-t.width)/2;break;case"bottom":s=e.bottom+6,o=e.left+(e.width-t.width)/2;break;case"left":s=e.top+(e.height-t.height)/2,o=e.left-t.width-6;break;case"right":default:s=e.top+(e.height-t.height)/2,o=e.right+6;break}const r=window.innerWidth,a=window.innerHeight;return o=Math.max(4,Math.min(o,r-t.width-4)),s=Math.max(4,Math.min(s,a-t.height-4)),{top:s,left:o}}function xi({content:e,placement:t="top",open:l,onOpenChange:n,children:s,class:o,className:r,...a}){const[c,d]=ee(!1),v=l!==void 0?l:c,p=re(S=>{l===void 0&&d(S),n&&n(S)},[l,n]),m=Z(null),$=Z(null),x=wc(),[D,w]=ee({top:-9999,left:-9999});oe(()=>{if(!v)return;const S=m.current,_=$.current;if(!S||!_)return;const M=()=>w(Cd(S.getBoundingClientRect(),_.getBoundingClientRect(),t));return M(),window.addEventListener("scroll",M,!0),window.addEventListener("resize",M),()=>{window.removeEventListener("scroll",M,!0),window.removeEventListener("resize",M)}},[v,t,e]);const E=()=>p(!0),k=()=>p(!1),C=["aictl-ui-tooltip-wrap",o,r].filter(Boolean).join(" ");return g`<span
    ref=${m}
    class=${C}
    onMouseEnter=${E}
    onMouseLeave=${k}
    onFocusIn=${E}
    onFocusOut=${k}
    aria-describedby=${v?x:null}
    ...${a}
  >
    ${s}
    ${v?g`<span
      ref=${$}
      id=${x}
      role="tooltip"
      class="aictl-ui-tooltip"
      style=${`top:${D.top}px;left:${D.left}px`}
    >${e}</span>`:null}
  </span>`}function Ld(e,t,l){let s=0,o=0;switch(l){case"top":s=e.top-t.height-6,o=e.left;break;case"left":s=e.top,o=e.left-t.width-6;break;case"right":s=e.top,o=e.right+6;break;case"bottom":default:s=e.bottom+6,o=e.left;break}const r=window.innerWidth,a=window.innerHeight;return o=Math.max(4,Math.min(o,r-t.width-4)),s=Math.max(4,Math.min(s,a-t.height-4)),{top:s,left:o}}const Si='a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';function Kl({trigger:e,placement:t="bottom",open:l,onOpenChange:n,children:s,class:o,className:r,...a}){const[c,d]=ee(!1),v=l!==void 0?l:c,p=re(k=>{l===void 0&&d(k),n&&n(k)},[l,n]),m=Z(null),$=Z(null),[x,D]=ee({top:-9999,left:-9999});oe(()=>{if(!v)return;const k=m.current,C=$.current;if(!k||!C)return;const S=()=>D(Ld(k.getBoundingClientRect(),C.getBoundingClientRect(),t));S();const _=R=>{!C.contains(R.target)&&!k.contains(R.target)&&p(!1)},M=R=>{if(R.key==="Escape"){p(!1),k.focus&&k.focus();return}if(R.key==="Tab"){const Y=C.querySelectorAll(Si);if(!Y.length)return;const O=Y[0],T=Y[Y.length-1];R.shiftKey&&document.activeElement===O?(R.preventDefault(),T.focus()):!R.shiftKey&&document.activeElement===T&&(R.preventDefault(),O.focus())}};document.addEventListener("mousedown",_),document.addEventListener("keydown",M),window.addEventListener("resize",S);const P=C.querySelector(Si);return P?P.focus():C.focus(),()=>{document.removeEventListener("mousedown",_),document.removeEventListener("keydown",M),window.removeEventListener("resize",S)}},[v,t,p]);const w=k=>{k.stopPropagation(),p(!v)},E=["aictl-ui-popover",o,r].filter(Boolean).join(" ");return g`<span style="display:inline-flex;position:relative" ...${a}>
    <span ref=${m} onClick=${w}>${e}</span>
    ${v?g`<div
      ref=${$}
      class=${E}
      role="dialog"
      tabindex="-1"
      style=${`top:${x.top}px;left:${x.left}px`}
    >${s}</div>`:null}
  </span>`}const Mi='a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';function Jn({open:e,onClose:t,ariaLabel:l,labelledBy:n,children:s,closeOnBackdrop:o=!0,class:r,className:a,...c}){const d=Z(null),v=Z(null),p=re(()=>{t&&t()},[t]);if(oe(()=>{if(!e)return;v.current=document.activeElement;const x=d.current;if(!x)return;(x.querySelector(Mi)||x).focus();const w=E=>{if(E.key==="Escape"){E.stopPropagation(),p();return}if(E.key==="Tab"){const k=x.querySelectorAll(Mi);if(!k.length){E.preventDefault();return}const C=k[0],S=k[k.length-1];E.shiftKey&&document.activeElement===C?(E.preventDefault(),S.focus()):!E.shiftKey&&document.activeElement===S&&(E.preventDefault(),C.focus())}};return document.addEventListener("keydown",w),()=>{document.removeEventListener("keydown",w),v.current&&v.current.focus&&v.current.focus()}},[e,p]),!e)return null;const m=x=>{o&&x.target===x.currentTarget&&p()},$=["aictl-ui-dialog",r,a].filter(Boolean).join(" ");return g`<div class="aictl-ui-dialog-backdrop" onMouseDown=${m}>
    <div
      ref=${d}
      class=${$}
      role="dialog"
      aria-modal="true"
      aria-label=${l||null}
      aria-labelledby=${n||null}
      tabindex="-1"
      ...${c}
    >${s}</div>
  </div>`}function Dd({options:e=[],value:t,onChange:l,ariaLabel:n,class:s,className:o,...r}){const a=["aictl-ui-segmented",s,o].filter(Boolean).join(" "),c=Z([]),d=v=>{var $;if(!e.length)return;const p=Math.max(0,e.findIndex(x=>x.value===t));let m=null;v.key==="ArrowRight"||v.key==="ArrowDown"?m=(p+1)%e.length:v.key==="ArrowLeft"||v.key==="ArrowUp"?m=(p-1+e.length)%e.length:v.key==="Home"?m=0:v.key==="End"&&(m=e.length-1),m!=null&&(v.preventDefault(),l&&l(e[m].value),($=c.current[m])==null||$.focus())};return g`<div
    class=${a}
    role="radiogroup"
    aria-label=${n||null}
    ...${r}
  >${e.map((v,p)=>{const m=v.value===t;return g`<button
      key=${v.value}
      ref=${$=>{c.current[p]=$}}
      type="button"
      class="aictl-ui-segmented__btn"
      role="radio"
      aria-checked=${m?"true":"false"}
      tabindex=${m?"0":"-1"}
      onClick=${()=>l&&l(v.value)}
      onKeyDown=${d}
    >${v.icon?g`<${Vt} name=${v.icon} size="0.9em"/>`:null}${v.label}</button>`})}</div>`}function tt({class:e,className:t,children:l,...n}){const s=["aictl-ui-kbd",e,t].filter(Boolean).join(" ");return g`<kbd class=${s} ...${n}>${l}</kbd>`}function Jr({icon:e,title:t,description:l,action:n,source:s,class:o,className:r,...a}){const c=["aictl-ui-empty",o,r].filter(Boolean).join(" ");return g`<div class=${c} role="status" ...${a}>
    ${e?g`<div class="aictl-ui-empty__icon">
      ${typeof e=="string"?g`<${Vt} name=${e} size="32"/>`:e}
    </div>`:null}
    ${t?g`<div class="aictl-ui-empty__title">${t}</div>`:null}
    ${l?g`<div class="aictl-ui-empty__desc">${l}</div>`:null}
    ${n?g`<div>${n}</div>`:null}
    ${s?g`<div class="aictl-ui-empty__source" title="Data source for this view">${s}</div>`:null}
  </div>`}function Gn({height:e="1em",width:t="100%",radius:l="4px",count:n=1,class:s,className:o,style:r,...a}){const c=["aictl-ui-skel",s,o].filter(Boolean).join(" "),d={height:e,width:t,borderRadius:l};if(n<=1)return g`<span class=${c} style=${{...d,...r||{}}} aria-hidden="true" ...${a}></span>`;const v=[];for(let p=0;p<n;p++)v.push(p);return g`<span style="display:flex;flex-direction:column;gap:var(--sp-2)" aria-hidden="true" ...${a}>
    ${v.map(p=>g`<span key=${p} class=${c} style=${{...d,...r||{}}}></span>`)}
  </span>`}const Pd=window.TOOL_VENDORS??{},Rd={"claude-code":"anthropic","claude-desktop":"anthropic","claude-mcp-memory":"anthropic",copilot:"github","copilot-vscode":"github","copilot-cli":"github","copilot-desktop":"github","copilot-jetbrains":"github","copilot-vs":"github",copilot365:"microsoft","codex-cli":"openai","chatgpt-desktop":"openai","chatgpt-lencx":"openai",gemini:"google","gemini-cli":"google",cursor:"cursor-inc",windsurf:"codeium",openclaw:"community",vscode:"microsoft"},Ei={anthropic:'<path d="M12 4.5V19.5"/><path d="M4.5 12H19.5"/><path d="M6.7 6.7 17.3 17.3"/><path d="M17.3 6.7 6.7 17.3"/>',github:'<rect x="3.5" y="6.5" width="17" height="11" rx="5.5" fill="none"/><circle cx="9.2" cy="12" r="1.6" stroke="none" fill="currentColor"/><circle cx="14.8" cy="12" r="1.6" stroke="none" fill="currentColor"/>',microsoft:'<rect x="3.5" y="6.5" width="17" height="11" rx="5.5" fill="none"/><circle cx="9.2" cy="12" r="1.6" stroke="none" fill="currentColor"/><circle cx="14.8" cy="12" r="1.6" stroke="none" fill="currentColor"/>',openai:'<path d="M12 3.2 19.6 7.6V16.4L12 20.8 4.4 16.4V7.6Z" fill="none"/>',google:'<path d="M12 3.2C12 8 16 12 20.8 12C16 12 12 16 12 20.8C12 16 8 12 3.2 12C8 12 12 8 12 3.2Z" stroke="none" fill="currentColor"/>',"cursor-inc":'<path d="M6 3.5 6 18 10 14 12.6 19.5 15 18.4 12.4 13 18 13Z" fill="none" stroke-linejoin="round"/>',codeium:'<path d="M11.5 4 16 12.5H11.5Z" stroke="none" fill="currentColor"/><path d="M4 16C7 12.5 9.5 12.5 12 16 14.5 19.5 17 19.5 20 16" fill="none" stroke-linecap="round"/>',community:'<path d="M17 4.5C10 5.5 5.5 9.5 5.5 13.5 5.5 17 8 19.5 11.5 19.5" fill="none" stroke-linecap="round"/><path d="M17 4.5 13.5 6M17 4.5 18.8 7.8" stroke-linecap="round"/>',_fallback:'<circle cx="12" cy="12" r="4.5" stroke="none" fill="currentColor"/>'};function Od(e){return Pd[e]||Rd[e]||""}function ls({tool:e,size:t="1em",strokeWidth:l=2,...n}){const s=Od(e),o=Ei[s]||Ei._fallback,r=hl[e]||"var(--fg2)";return g`<svg class="tool-ico" viewBox="0 0 24 24" width=${t} height=${t}
    fill="none" stroke="currentColor" stroke-width=${l} stroke-linecap="round"
    style=${"color:"+r} aria-hidden="true" ...${n}
    dangerouslySetInnerHTML=${{__html:o}}></svg>`}const Qs=new Set;let Id=0;const Is=3,zd=5e3;function Qr(e){Qs.forEach(t=>{try{t(e)}catch{}})}function Vd(e){return Qs.add(e),()=>Qs.delete(e)}function zs(e,t,l={}){const n=++Id;return Qr({type:"add",toast:{id:n,variant:e,message:t,ttl:l.ttl||zd}}),n}function Zr(e){Qr({type:"remove",id:e})}const Zs={success:(e,t)=>zs("success",e,t),error:(e,t)=>zs("error",e,t),info:(e,t)=>zs("info",e,t),dismiss:Zr};function Nd(){const[e,t]=ee([]),l=Z(new Map);oe(()=>{const o=l.current,r=c=>{const d=o.get(c);d!=null&&d.tid&&clearTimeout(d.tid),o.delete(c)},a=Vd(c=>{if(c.type==="add"){t(v=>{const p=[...v,c.toast];return p.length>Is?(p.slice(0,p.length-Is).forEach(m=>r(m.id)),p.slice(p.length-Is)):p});const d=setTimeout(()=>{t(v=>v.filter(p=>p.id!==c.toast.id)),o.delete(c.toast.id)},c.toast.ttl);o.set(c.toast.id,{tid:d,expiresAt:Date.now()+c.toast.ttl,remaining:null})}else c.type==="remove"&&(r(c.id),t(d=>d.filter(v=>v.id!==c.id)))});return()=>{a(),o.forEach(c=>{c.tid&&clearTimeout(c.tid)}),o.clear()}},[]);const n=re(o=>{const a=l.current.get(o);!a||a.tid==null||(clearTimeout(a.tid),a.tid=null,a.remaining=Math.max(500,a.expiresAt-Date.now()))},[]),s=re(o=>{const r=l.current,a=r.get(o);if(!a||a.tid!=null)return;const c=a.remaining??500;a.expiresAt=Date.now()+c,a.remaining=null,a.tid=setTimeout(()=>{t(d=>d.filter(v=>v.id!==o)),r.delete(o)},c)},[]);return e.length?g`<div class="aictl-ui-toast-stack" role="region" aria-label="Notifications">
    ${e.map(o=>g`<div
      key=${o.id}
      class=${`aictl-ui-toast aictl-ui-toast--${o.variant}`}
      role=${o.variant==="error"?"alert":"status"}
      onMouseEnter=${()=>n(o.id)}
      onMouseLeave=${()=>s(o.id)}
      onFocusIn=${()=>n(o.id)}
      onFocusOut=${()=>s(o.id)}
    >
      <span class="aictl-ui-toast__msg">${o.message}</span>
      <button type="button" class="aictl-ui-toast__dismiss"
        aria-label="Dismiss notification"
        onClick=${()=>Zr(o.id)}>×</button>
    </div>`)}
  </div>`:null}const Fd={active:"var(--green)",degraded:"var(--orange)",disabled:"var(--fg2)",unknown:"var(--fg2)"},Hd={error:"var(--red)",warning:"var(--orange)"},Ti=20;function Ai(e,t,l){const n=t==="cpu_percent"?"daemon_cpu_percent":"daemon_"+t,s=["daemon "+l(e[n]||0)];for(const o of e.children||[])s.push(o.name+" ("+o.pid+") "+l(o[t]||0));return s.join(" + ")}function Ci(){var w,E,k,C,S;const{snap:e}=Xl(kl),[t,l]=ee(null),[n,s]=ee(null),[o,r]=ee(null),[a,c]=ee(null);oe(()=>{let _=!0;const M=()=>{Cr().then(R=>{_&&l(R)}).catch(()=>{}),Lr().then(R=>{_&&s(R)}).catch(()=>{}),Dr({limit:Ti}).then(R=>{_&&r(Array.isArray(R==null?void 0:R.items)?R.items:[])}).catch(()=>{}),Ac().then(R=>{_&&c(Array.isArray(R==null?void 0:R.ingesters)?R.ingesters:[])}).catch(()=>{})};M();const P=setInterval(M,15e3);return()=>{_=!1,clearInterval(P)}},[]);const d=Ae(()=>{if(!e)return[];const _=e.tool_telemetry||[];return e.tools.filter(M=>M.tool!=="aictl"&&M.tool!=="any").map(M=>{var W,z,q,B,V;const P=_.find(N=>N.tool===M.tool),R=M.live||{},Y=R.last_seen_at||0,O=Y>0?Math.floor(Date.now()/1e3-Y):-1,T=O>3600||O<0;return{tool:M.tool,label:M.label,source:(P==null?void 0:P.source)||(R.session_count?"live-monitor":"discovery"),confidence:(P==null?void 0:P.confidence)||((W=R.token_estimate)==null?void 0:W.confidence)||0,inputTokens:(P==null?void 0:P.input_tokens)||0,outputTokens:(P==null?void 0:P.output_tokens)||0,cost:(P==null?void 0:P.cost_usd)??null,sessions:(P==null?void 0:P.total_sessions)||R.session_count||0,errors:((z=P==null?void 0:P.errors)==null?void 0:z.length)||0,lastError:((q=P==null?void 0:P.errors)==null?void 0:q[0])||null,lastSeen:O,stale:T,fileCount:M.files.length,procCount:M.processes.length,hasLive:!!M.live,hasOtel:!!((V=(B=R.sources||[]).includes)!=null&&V.call(B,"otel"))}}).sort((M,P)=>P.inputTokens+P.outputTokens-(M.inputTokens+M.outputTokens))},[e]),v=Ae(()=>{var _;return(_=e==null?void 0:e.live_monitor)!=null&&_.diagnostics?Object.entries(e.live_monitor.diagnostics).map(([M,P])=>({name:M,status:P.status||"unknown",mode:P.mode||"",detail:P.detail||""})):[]},[e]);if(!e)return null;const p=d.length,m=d.filter(_=>_.inputTokens+_.outputTokens>0).length,$=d.filter(_=>_.hasLive).length,x=d.filter(_=>_.stale&&_.hasLive).length,D=d.reduce((_,M)=>_+M.errors,0);return g`<div class="diag-card" role="region" aria-label="Collector health">
    <h3 style=${{marginBottom:"var(--sp-4)"}}>Monitoring Health</h3>

    <!-- Summary badges -->
    <div class="flex-row flex-wrap gap-sm mb-md">
      <span class="badge" data-dp="overview.collector_health.tools_with_telemetry" style="background:var(--green);color:var(--on-status)">${m}/${p} tools with telemetry</span>
      <span class="badge" data-dp="overview.collector_health.live_tools" style="background:var(--accent);color:var(--on-status)">${$} live</span>
      ${x>0?g`<span class="badge" data-dp="overview.collector_health.stale_tools" style="background:var(--orange);color:var(--on-status)">${x} stale</span>`:null}
      ${D>0?g`<span class="badge" data-dp="overview.collector_health.errors" style="background:var(--red);color:var(--on-status)">${D} errors</span>`:null}
      ${t!=null&&t.active?g`<span class="badge" data-dp="overview.collector_health.otel_status" style="background:var(--green);color:var(--on-status)">OTel active</span>`:g`<span class="badge--muted badge" data-dp="overview.collector_health.otel_status">OTel inactive</span>`}
    </div>

    <!-- aictl self-monitoring -->
    ${n?g`<div class="mb-md" style="font-size:var(--fs-sm)">
      <div class="es-section-title">aictl Monitor Service <span class="text-muted text-xs">(self)</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--sp-2)">
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">CPU</div>
          <div class="metric-chip-value" title=${Ai(n,"cpu_percent",$l)}>${$l(n.cpu_percent||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Memory (RSS)</div>
          <div class="metric-chip-value" title=${Ai(n,"memory_rss_bytes",Kt)}>${Kt(n.memory_rss_bytes||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Size</div>
          <div class="metric-chip-value">${Kt(((w=n.db)==null?void 0:w.file_size_bytes)||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Uptime</div>
          <div class="metric-chip-value">${fo(n.uptime_s)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Threads</div>
          <div class="metric-chip-value">${n.threads||"—"}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Rows</div>
          <div class="metric-chip-value" title="metrics + tool_metrics + events + samples">
            ${yt((((E=n.db)==null?void 0:E.metrics_count)||0)+(((k=n.db)==null?void 0:k.tool_metrics_count)||0)+(((C=n.db)==null?void 0:C.events_count)||0)+(((S=n.db)==null?void 0:S.samples_count)||0))}</div>
        </div>
      </div>
      ${n.sink?g`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--sp-2);margin-top:var(--sp-2)">
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Emitted</div>
          <div class="metric-chip-value">${yt(n.sink.total_emitted||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Flushed</div>
          <div class="metric-chip-value">${yt(n.sink.total_flushed||0)}</div>
        </div>
        <div class="metric-chip" style="${(n.sink.total_dropped||0)>0?"background:rgba(248,113,113,0.15);border:1px solid var(--red)":""}">
          <div class="metric-chip-label" style="${(n.sink.total_dropped||0)>0?"color:var(--red);font-weight:600":"color:var(--fg2)"}">Dropped</div>
          <div class="metric-chip-value" style="${(n.sink.total_dropped||0)>0?"color:var(--red)":""}">${yt(n.sink.total_dropped||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Tracked</div>
          <div class="metric-chip-value">${yt(n.sink.metrics_tracked||0)}</div>
        </div>
      </div>
      ${n.sink.is_flooding?g`<div role="alert" style="margin-top:var(--sp-2);padding:var(--sp-2) var(--sp-3);background:rgba(248,113,113,0.15);border:1px solid var(--red);border-radius:4px;color:var(--red);font-size:var(--fs-xs);font-weight:600">
        DATA LOSS: Flood protection active \u2014 dropping samples (>${n.sink.total_dropped} lost)
      </div>`:null}`:null}
      <div class="text-xs text-muted" style="margin-top:var(--sp-1)">
        PID ${n.pid} \u00b7 These metrics are about the aictl monitoring service itself, not the AI tools it monitors.
      </div>
    </div>`:null}

    <!-- OTel receiver stats -->
    ${t?g`<div class="mb-md" style="font-size:var(--fs-sm)">
      <div class="es-section-title">OTel Receiver</div>
      <div class="flex-row gap-md flex-wrap">
        <span>Metrics: <strong>${t.metrics_received||0}</strong></span>
        <span>Events: <strong>${t.events_received||0}</strong></span>
        <span>API calls: <strong>${t.api_calls_total||0}</strong></span>
        ${t.api_errors_total>0?g`<span class="text-red">Errors: <strong>${t.api_errors_total}</strong></span>`:null}
        ${t.errors>0?g`<span class="text-orange">Parse errors: <strong>${t.errors}</strong></span>`:null}
        ${t.dropped>0?g`<span class="text-orange" title="malformed attributes / data points skipped during parsing">Dropped: <strong>${t.dropped}</strong></span>`:null}
        ${t.last_receive_at>0?g`<span class="text-muted">Last: ${Il(t.last_receive_at)}</span>`:null}
      </div>
    </div>`:null}

    <!-- Local-store ingesters (copilot / cursor / vscode chat pollers) -->
    ${a!=null?g`<div class="mb-md" data-dp="overview.collector_health.ingesters">
      <div class="es-section-title">Ingesters</div>
      ${a.length===0?g`<div class="text-xs text-muted">No ingesters running</div>`:a.map(_=>{const M=_.last_poll_ts?Il(_.last_poll_ts):"never polled";return g`<div key=${_.name}
              class="flex-row gap-sm" style="align-items:center;padding:var(--sp-1) 0;font-size:var(--fs-sm)">
              <span aria-hidden="true"
                title=${_.source_exists?"source present":"source missing"}
                style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${_.source_exists?"var(--green)":"var(--fg2)"}"></span>
              <span class="mono text-xs" style="min-width:170px" title=${_.source_path||""}>${qn(_.name)}</span>
              <span class="sr-only">${_.source_exists?"source present":"source missing"}</span>
              <span class="text-xs text-muted" title="last poll" style="min-width:80px">${M}</span>
              <span class="text-xs" style="margin-left:auto"
                title="rows inserted on the last poll">+${_.last_poll_inserted||0} rows</span>
              ${_.rows_ingested_total!=null?g`<span class="text-xs text-muted" title="cumulative rows ingested">${yt(_.rows_ingested_total)} total</span>`:null}
            </div>`})}
    </div>`:null}

    <!-- Per-tool health table -->
    <div class="mb-md">
      <div class="es-section-title">Per-Tool Status</div>
      <div style="overflow-x:auto">
        <table role="table" class="text-sm" style="width:100%;border-collapse:collapse">
          <thead><tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:var(--sp-1) var(--sp-2)">Tool</th>
            <th style="text-align:left;padding:var(--sp-1) var(--sp-2)">Source</th>
            <th style="text-align:center;padding:var(--sp-1) var(--sp-2)">Conf</th>
            <th style="text-align:right;padding:var(--sp-1) var(--sp-2)">Input tok</th>
            <th style="text-align:right;padding:var(--sp-1) var(--sp-2)">Output tok</th>
            <th style="text-align:right;padding:var(--sp-1) var(--sp-2)">Sessions</th>
            <th style="text-align:center;padding:var(--sp-1) var(--sp-2)">Errors</th>
            <th style="text-align:right;padding:var(--sp-1) var(--sp-2)">Last seen</th>
            <th style="text-align:right;padding:var(--sp-1) var(--sp-2)">Files</th>
          </tr></thead>
          <tbody>${d.map(_=>{var M;return g`<tr key=${_.tool}
            style="border-bottom:1px solid var(--bg3);opacity:${_.stale&&!_.fileCount?.4:1}">
            <td style="padding:var(--sp-1) var(--sp-2);white-space:nowrap">
              <${ls} tool=${_.tool} size="1em"/>
              ${qn(_.label)}</td>
            <td style="padding:var(--sp-1) var(--sp-2)" class="text-muted mono">${_.source}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              <span style="color:${_.confidence>=.9?"var(--green)":_.confidence>=.7?"var(--yellow)":"var(--orange)"}">
                ${_.confidence>0?$l(_.confidence*100):"—"}</span></td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${_.inputTokens?yt(_.inputTokens):"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${_.outputTokens?yt(_.outputTokens):"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${_.sessions||"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              ${_.errors>0?g`<span class="text-red" title=${((M=_.lastError)==null?void 0:M.message)||""}>${_.errors}</span>`:g`<span class="text-green">0</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">
              ${_.lastSeen>=0?g`<span style="color:${_.stale?"var(--orange)":"var(--fg2)"}">${Il(Date.now()/1e3-_.lastSeen)}</span>`:g`<span class="text-muted">\u2014</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${_.fileCount}</td>
          </tr>`})}</tbody>
        </table>
      </div>
    </div>

    <!-- Data-quality events (sink flood-protection, ingester failures, …) -->
    ${o!=null?g`<div class="mb-md" data-dp="overview.collector_health.data_quality">
      <div class="es-section-title">Data Quality</div>
      ${o.length===0?g`<div class="text-xs text-muted">No data-quality events</div>`:o.slice(0,Ti).map((_,M)=>{const P=Hd[_.severity]||"var(--fg2)",R=[_.component,_.source].filter(Boolean).join(" · ");return g`<div key=${(_.component||"")+":"+(_.source||"")+":"+M}
              class="flex-row gap-sm" style="align-items:center;padding:var(--sp-1) 0;font-size:var(--fs-sm)">
              <span class="badge" style="background:${P};color:var(--on-status);font-size:var(--fs-2xs)">
                ${_.severity||_.status||"info"}</span>
              <span class="mono text-xs" style="white-space:nowrap" title=${"kind: "+(_.kind||"—")+" · status: "+(_.status||"—")+(_.count?" · seen "+_.count+"x":"")}>${R||"—"}</span>
              <span class="text-xs" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                title=${_.message||""}>${_.message||"—"}</span>
              <span class="text-xs text-muted" style="white-space:nowrap">${Il(_.updated_at)}</span>
            </div>`})}
    </div>`:null}

    <!-- Collector pipeline status -->
    ${v.length>0?g`<div>
      <div class="es-section-title">Collector Pipeline</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp-2)">
        ${v.map(_=>g`<div key=${_.name}
          style="padding:var(--sp-2) var(--sp-3);background:var(--bg);border-radius:4px;
            border-left:3px solid ${Fd[_.status]||"var(--fg2)"}">
          <div class="flex-row gap-sm" style="align-items:center">
            <span class="mono text-xs text-bold">${_.name}</span>
            <span class="text-xs text-muted" style="margin-left:auto">${_.status}</span>
          </div>
          ${_.detail?g`<div class="text-xs text-muted" style="margin-top:2px">${qn(_.detail)}</div>`:null}
        </div>`)}
      </div>
    </div>`:null}
  </div>`}let Vs=null;function Bd(){return Vs?Promise.resolve(Vs):Cc().then(e=>{const t={};for(const l of e||[])t[l.key]=l;return Vs=t,t}).catch(()=>({}))}function jd(e){if(!e)return"";const t=e.replace(/\s+/g," ").trim(),l=t.match(/^[^.!?]+[.!?]/);return l?l[0].trim():t.slice(0,120)}const Ud={tokens:"tokens",bytes:"bytes",percent:"%",count:"count",rate_bps:"bytes/s",usd:"USD",seconds:"sec",ratio:"ratio"},Wd={raw:"raw",deduced:"deduced",aggregated:"agg"};function qd(){const[e,t]=ee(null),[l,n]=ee({x:0,y:0}),[s,o]=ee(!1),r=Z(null),a=Z(null),c=re(w=>{const E=w.getAttribute("data-dp");E&&Bd().then(k=>{const C=k[E];if(!C)return;const S=w.getBoundingClientRect();n({x:S.left,y:S.bottom+4}),t(C),o(!1)})},[]),d=re(()=>{a.current=setTimeout(()=>{t(null),o(!1)},120)},[]),v=re(()=>{a.current&&(clearTimeout(a.current),a.current=null)},[]);if(oe(()=>{function w(C){const S=C.target.closest("[data-dp]");S&&(v(),c(S))}function E(C){C.target.closest("[data-dp]")&&d()}function k(C){C.target.closest("[data-dp]")&&e&&(C.preventDefault(),o(_=>!_))}return document.addEventListener("mouseover",w,!0),document.addEventListener("mouseout",E,!0),document.addEventListener("click",k,!0),document.addEventListener("focusin",w,!0),document.addEventListener("focusout",E,!0),()=>{document.removeEventListener("mouseover",w,!0),document.removeEventListener("mouseout",E,!0),document.removeEventListener("click",k,!0),document.removeEventListener("focusin",w,!0),document.removeEventListener("focusout",E,!0)}},[c,d,v,e]),!e)return null;const m=Math.min(l.x,window.innerWidth-320-8),$=Math.min(l.y,window.innerHeight-180),x=Wd[e.source_type]||e.source_type,D=Ud[e.unit]||e.unit;return g`<div class="dp-tooltip" ref=${r}
    style=${"left:"+m+"px;top:"+$+"px"}
    onMouseEnter=${v} onMouseLeave=${d}>
    <div class="dp-tooltip-head">
      <span class="dp-tooltip-key">${e.key}</span>
      <span class="dp-tooltip-badge dp-badge-${e.source_type}">${x}</span>
      ${D&&g`<span class="dp-tooltip-unit">${D}</span>`}
    </div>
    <div class="dp-tooltip-body">${jd(e.explanation)}</div>
    ${s&&g`<div class="dp-tooltip-detail">
      <div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Source</div>
        <div>${e.source_static||e.source||"—"}</div>
      </div>
      ${e.source_dynamic&&g`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Live provenance</div>
        <div>${typeof e.source_dynamic=="string"?e.source_dynamic:JSON.stringify(e.source_dynamic)}</div>
      </div>`}
      ${e.query&&g`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Query</div>
        <code class="dp-tooltip-code">${e.query}</code>
      </div>`}
      ${e.otel_metric&&g`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">OTel metric</div>
        <code>${e.otel_metric}</code>
      </div>`}
    </div>`}
    ${!s&&g`<div class="dp-tooltip-hint">click for details</div>`}
  </div>`}class Li extends kc{constructor(t){super(t),this.state={hasError:!1,error:null}}static getDerivedStateFromError(t){return{hasError:!0,error:t}}componentDidCatch(t,l){console.error("Dashboard error:",t,l);try{Zs.error("Something went wrong in this view")}catch{}}render(){var t;if(this.state.hasError){const l=((t=this.state.error)==null?void 0:t.message)||"Unknown error";return g`<div role="alert">
        <${Jr}
          icon="alert-triangle"
          title="Something went wrong"
          description=${l}
          action=${g`<${on} variant="primary" onClick=${()=>this.setState({hasError:!1,error:null})}>Retry</${on}>`}
        />
      </div>`}return this.props.children}}const Kd=!0,Be="u-",Gd="uplot",Yd=Be+"hz",Jd=Be+"vt",Qd=Be+"title",Zd=Be+"wrap",Xd=Be+"under",ef=Be+"over",tf=Be+"axis",_n=Be+"off",nf=Be+"select",lf=Be+"cursor-x",sf=Be+"cursor-y",of=Be+"cursor-pt",rf=Be+"legend",af=Be+"live",cf=Be+"inline",uf=Be+"series",df=Be+"marker",Di=Be+"label",ff=Be+"value",ml="width",vl="height",fl="top",Pi="bottom",Bn="left",Ns="right",ho="#000",Ri=ho+"0",Fs="mousemove",Oi="mousedown",Hs="mouseup",Ii="mouseenter",zi="mouseleave",Vi="dblclick",pf="resize",hf="scroll",Ni="change",Gl="dppxchange",mo="--",tl=typeof window<"u",Xs=tl?document:null,Yn=tl?window:null,mf=tl?navigator:null;let me,Vl;function eo(){let e=devicePixelRatio;me!=e&&(me=e,Vl&&no(Ni,Vl,eo),Vl=matchMedia(`(min-resolution: ${me-.001}dppx) and (max-resolution: ${me+.001}dppx)`),wn(Ni,Vl,eo),Yn.dispatchEvent(new CustomEvent(Gl)))}function gt(e,t){if(t!=null){let l=e.classList;!l.contains(t)&&l.add(t)}}function to(e,t){let l=e.classList;l.contains(t)&&l.remove(t)}function Ee(e,t,l){e.style[t]=l+"px"}function Ot(e,t,l,n){let s=Xs.createElement(e);return t!=null&&gt(s,t),l!=null&&l.insertBefore(s,n),s}function Tt(e,t){return Ot("div",e,t)}const Fi=new WeakMap;function qt(e,t,l,n,s){let o="translate("+t+"px,"+l+"px)",r=Fi.get(e);o!=r&&(e.style.transform=o,Fi.set(e,o),t<0||l<0||t>n||l>s?gt(e,_n):to(e,_n))}const Hi=new WeakMap;function Bi(e,t,l){let n=t+l,s=Hi.get(e);n!=s&&(Hi.set(e,n),e.style.background=t,e.style.borderColor=l)}const ji=new WeakMap;function Ui(e,t,l,n){let s=t+""+l,o=ji.get(e);s!=o&&(ji.set(e,s),e.style.height=l+"px",e.style.width=t+"px",e.style.marginLeft=n?-t/2+"px":0,e.style.marginTop=n?-l/2+"px":0)}const vo={passive:!0},vf={...vo,capture:!0};function wn(e,t,l,n){t.addEventListener(e,l,n?vf:vo)}function no(e,t,l,n){t.removeEventListener(e,l,vo)}tl&&eo();function It(e,t,l,n){let s;l=l||0,n=n||t.length-1;let o=n<=2147483647;for(;n-l>1;)s=o?l+n>>1:$t((l+n)/2),t[s]<e?l=s:n=s;return e-t[l]<=t[n]-e?l:n}function Xr(e){return(l,n,s)=>{let o=-1,r=-1;for(let a=n;a<=s;a++)if(e(l[a])){o=a;break}for(let a=s;a>=n;a--)if(e(l[a])){r=a;break}return[o,r]}}const ea=e=>e!=null,ta=e=>e!=null&&e>0,ss=Xr(ea),gf=Xr(ta);function yf(e,t,l,n=0,s=!1){let o=s?gf:ss,r=s?ta:ea;[t,l]=o(e,t,l);let a=e[t],c=e[t];if(t>-1)if(n==1)a=e[t],c=e[l];else if(n==-1)a=e[l],c=e[t];else for(let d=t;d<=l;d++){let v=e[d];r(v)&&(v<a?a=v:v>c&&(c=v))}return[a??$e,c??-$e]}function os(e,t,l,n){let s=Ki(e),o=Ki(t);e==t&&(s==-1?(e*=l,t/=l):(e/=l,t*=l));let r=l==10?Qt:na,a=s==1?$t:At,c=o==1?At:$t,d=a(r(He(e))),v=c(r(He(t))),p=Qn(l,d),m=Qn(l,v);return l==10&&(d<0&&(p=be(p,-d)),v<0&&(m=be(m,-v))),n||l==2?(e=p*s,t=m*o):(e=ia(e,p),t=is(t,m)),[e,t]}function go(e,t,l,n){let s=os(e,t,l,n);return e==0&&(s[0]=0),t==0&&(s[1]=0),s}const yo=.1,Wi={mode:3,pad:yo},bl={pad:0,soft:null,mode:0},$f={min:bl,max:bl};function Yl(e,t,l,n){return rs(l)?qi(e,t,l):(bl.pad=l,bl.soft=n?0:null,bl.mode=n?3:0,qi(e,t,$f))}function pe(e,t){return e??t}function bf(e,t,l){for(t=pe(t,0),l=pe(l,e.length-1);t<=l;){if(e[t]!=null)return!0;t++}return!1}function qi(e,t,l){let n=l.min,s=l.max,o=pe(n.pad,0),r=pe(s.pad,0),a=pe(n.hard,-$e),c=pe(s.hard,$e),d=pe(n.soft,$e),v=pe(s.soft,-$e),p=pe(n.mode,0),m=pe(s.mode,0),$=t-e,x=Qt($),D=rt(He(e),He(t)),w=Qt(D),E=He(w-x);($<1e-24||E>10)&&($=0,(e==0||t==0)&&($=1e-24,p==2&&d!=$e&&(o=0),m==2&&v!=-$e&&(r=0)));let k=$||D||1e3,C=Qt(k),S=Qn(10,$t(C)),_=k*($==0?e==0?.1:1:o),M=be(ia(e-_,S/10),24),P=e>=d&&(p==1||p==3&&M<=d||p==2&&M>=d)?d:$e,R=rt(a,M<P&&e>=P?P:zt(P,M)),Y=k*($==0?t==0?.1:1:r),O=be(is(t+Y,S/10),24),T=t<=v&&(m==1||m==3&&O>=v||m==2&&O<=v)?v:-$e,W=zt(c,O>T&&t<=T?T:rt(T,O));return R==W&&R==0&&(W=100),[R,W]}const _f=new Intl.NumberFormat(tl?mf.language:"en-US"),$o=e=>_f.format(e),bt=Math,Bl=bt.PI,He=bt.abs,$t=bt.floor,Fe=bt.round,At=bt.ceil,zt=bt.min,rt=bt.max,Qn=bt.pow,Ki=bt.sign,Qt=bt.log10,na=bt.log2,wf=(e,t=1)=>bt.sinh(e)*t,Bs=(e,t=1)=>bt.asinh(e/t),$e=1/0;function Gi(e){return(Qt((e^e>>31)-(e>>31))|0)+1}function lo(e,t,l){return zt(rt(e,t),l)}function la(e){return typeof e=="function"}function ie(e){return la(e)?e:()=>e}const kf=()=>{},sa=e=>e,oa=(e,t)=>t,xf=e=>null,Yi=e=>!0,Ji=(e,t)=>e==t,Sf=/\.\d*?(?=9{6,}|0{6,})/gm,kn=e=>{if(aa(e)||cn.has(e))return e;const t=`${e}`,l=t.match(Sf);if(l==null)return e;let n=l[0].length-1;if(t.indexOf("e-")!=-1){let[s,o]=t.split("e");return+`${kn(s)}e${o}`}return be(e,n)};function $n(e,t){return kn(be(kn(e/t))*t)}function is(e,t){return kn(At(kn(e/t))*t)}function ia(e,t){return kn($t(kn(e/t))*t)}function be(e,t=0){if(aa(e))return e;let l=10**t,n=e*l*(1+Number.EPSILON);return Fe(n)/l}const cn=new Map;function ra(e){return((""+e).split(".")[1]||"").length}function Ml(e,t,l,n){let s=[],o=n.map(ra);for(let r=t;r<l;r++){let a=He(r),c=be(Qn(e,r),a);for(let d=0;d<n.length;d++){let v=e==10?+`${n[d]}e${r}`:n[d]*c,p=(r>=0?0:a)+(r>=o[d]?0:o[d]),m=e==10?v:be(v,p);s.push(m),cn.set(m,p)}}return s}const _l={},bo=[],Zn=[null,null],rn=Array.isArray,aa=Number.isInteger,Mf=e=>e===void 0;function Qi(e){return typeof e=="string"}function rs(e){let t=!1;if(e!=null){let l=e.constructor;t=l==null||l==Object}return t}function Ef(e){return e!=null&&typeof e=="object"}const Tf=Object.getPrototypeOf(Uint8Array),ca="__proto__";function Xn(e,t=rs){let l;if(rn(e)){let n=e.find(s=>s!=null);if(rn(n)||t(n)){l=Array(e.length);for(let s=0;s<e.length;s++)l[s]=Xn(e[s],t)}else l=e.slice()}else if(e instanceof Tf)l=e.slice();else if(t(e)){l={};for(let n in e)n!=ca&&(l[n]=Xn(e[n],t))}else l=e;return l}function Ve(e){let t=arguments;for(let l=1;l<t.length;l++){let n=t[l];for(let s in n)s!=ca&&(rs(e[s])?Ve(e[s],Xn(n[s])):e[s]=Xn(n[s]))}return e}const Af=0,Cf=1,Lf=2;function Df(e,t,l){for(let n=0,s,o=-1;n<t.length;n++){let r=t[n];if(r>o){for(s=r-1;s>=0&&e[s]==null;)e[s--]=null;for(s=r+1;s<l&&e[s]==null;)e[o=s++]=null}}}function Pf(e,t){if(If(e)){let r=e[0].slice();for(let a=1;a<e.length;a++)r.push(...e[a].slice(1));return zf(r[0])||(r=Of(r)),r}let l=new Set;for(let r=0;r<e.length;r++){let c=e[r][0],d=c.length;for(let v=0;v<d;v++)l.add(c[v])}let n=[Array.from(l).sort((r,a)=>r-a)],s=n[0].length,o=new Map;for(let r=0;r<s;r++)o.set(n[0][r],r);for(let r=0;r<e.length;r++){let a=e[r],c=a[0];for(let d=1;d<a.length;d++){let v=a[d],p=Array(s).fill(void 0),m=t?t[r][d]:Cf,$=[];for(let x=0;x<v.length;x++){let D=v[x],w=o.get(c[x]);D===null?m!=Af&&(p[w]=D,m==Lf&&$.push(w)):p[w]=D}Df(p,$,s),n.push(p)}}return n}const Rf=typeof queueMicrotask>"u"?e=>Promise.resolve().then(e):queueMicrotask;function Of(e){let t=e[0],l=t.length,n=Array(l);for(let o=0;o<n.length;o++)n[o]=o;n.sort((o,r)=>t[o]-t[r]);let s=[];for(let o=0;o<e.length;o++){let r=e[o],a=Array(l);for(let c=0;c<l;c++)a[c]=r[n[c]];s.push(a)}return s}function If(e){let t=e[0][0],l=t.length;for(let n=1;n<e.length;n++){let s=e[n][0];if(s.length!=l)return!1;if(s!=t){for(let o=0;o<l;o++)if(s[o]!=t[o])return!1}}return!0}function zf(e,t=100){const l=e.length;if(l<=1)return!0;let n=0,s=l-1;for(;n<=s&&e[n]==null;)n++;for(;s>=n&&e[s]==null;)s--;if(s<=n)return!0;const o=rt(1,$t((s-n+1)/t));for(let r=e[n],a=n+o;a<=s;a+=o){const c=e[a];if(c!=null){if(c<=r)return!1;r=c}}return!0}const ua=["January","February","March","April","May","June","July","August","September","October","November","December"],da=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];function fa(e){return e.slice(0,3)}const Vf=da.map(fa),Nf=ua.map(fa),Ff={MMMM:ua,MMM:Nf,WWWW:da,WWW:Vf};function pl(e){return(e<10?"0":"")+e}function Hf(e){return(e<10?"00":e<100?"0":"")+e}const Bf={YYYY:e=>e.getFullYear(),YY:e=>(e.getFullYear()+"").slice(2),MMMM:(e,t)=>t.MMMM[e.getMonth()],MMM:(e,t)=>t.MMM[e.getMonth()],MM:e=>pl(e.getMonth()+1),M:e=>e.getMonth()+1,DD:e=>pl(e.getDate()),D:e=>e.getDate(),WWWW:(e,t)=>t.WWWW[e.getDay()],WWW:(e,t)=>t.WWW[e.getDay()],HH:e=>pl(e.getHours()),H:e=>e.getHours(),h:e=>{let t=e.getHours();return t==0?12:t>12?t-12:t},AA:e=>e.getHours()>=12?"PM":"AM",aa:e=>e.getHours()>=12?"pm":"am",a:e=>e.getHours()>=12?"p":"a",mm:e=>pl(e.getMinutes()),m:e=>e.getMinutes(),ss:e=>pl(e.getSeconds()),s:e=>e.getSeconds(),fff:e=>Hf(e.getMilliseconds())};function _o(e,t){t=t||Ff;let l=[],n=/\{([a-z]+)\}|[^{]+/gi,s;for(;s=n.exec(e);)l.push(s[0][0]=="{"?Bf[s[1]]:s[0]);return o=>{let r="";for(let a=0;a<l.length;a++)r+=typeof l[a]=="string"?l[a]:l[a](o,t);return r}}const jf=new Intl.DateTimeFormat().resolvedOptions().timeZone;function Uf(e,t){let l;return t=="UTC"||t=="Etc/UTC"?l=new Date(+e+e.getTimezoneOffset()*6e4):t==jf?l=e:(l=new Date(e.toLocaleString("en-US",{timeZone:t})),l.setMilliseconds(e.getMilliseconds())),l}const pa=e=>e%1==0,Jl=[1,2,2.5,5],Wf=Ml(10,-32,0,Jl),ha=Ml(10,0,32,Jl),qf=ha.filter(pa),bn=Wf.concat(ha),wo=`
`,ma="{YYYY}",Zi=wo+ma,va="{M}/{D}",gl=wo+va,Nl=gl+"/{YY}",ga="{aa}",Kf="{h}:{mm}",jn=Kf+ga,Xi=wo+jn,er=":{ss}",ve=null;function ya(e){let t=e*1e3,l=t*60,n=l*60,s=n*24,o=s*30,r=s*365,c=(e==1?Ml(10,0,3,Jl).filter(pa):Ml(10,-3,0,Jl)).concat([t,t*5,t*10,t*15,t*30,l,l*5,l*10,l*15,l*30,n,n*2,n*3,n*4,n*6,n*8,n*12,s,s*2,s*3,s*4,s*5,s*6,s*7,s*8,s*9,s*10,s*15,o,o*2,o*3,o*4,o*6,r,r*2,r*5,r*10,r*25,r*50,r*100]);const d=[[r,ma,ve,ve,ve,ve,ve,ve,1],[s*28,"{MMM}",Zi,ve,ve,ve,ve,ve,1],[s,va,Zi,ve,ve,ve,ve,ve,1],[n,"{h}"+ga,Nl,ve,gl,ve,ve,ve,1],[l,jn,Nl,ve,gl,ve,ve,ve,1],[t,er,Nl+" "+jn,ve,gl+" "+jn,ve,Xi,ve,1],[e,er+".{fff}",Nl+" "+jn,ve,gl+" "+jn,ve,Xi,ve,1]];function v(p){return(m,$,x,D,w,E)=>{let k=[],C=w>=r,S=w>=o&&w<r,_=p(x),M=be(_*e,3),P=js(_.getFullYear(),C?0:_.getMonth(),S||C?1:_.getDate()),R=be(P*e,3);if(S||C){let Y=S?w/o:0,O=C?w/r:0,T=M==R?M:be(js(P.getFullYear()+O,P.getMonth()+Y,1)*e,3),W=new Date(Fe(T/e)),z=W.getFullYear(),q=W.getMonth();for(let B=0;T<=D;B++){let V=js(z+O*B,q+Y*B,1),N=V-p(be(V*e,3));T=be((+V+N)*e,3),T<=D&&k.push(T)}}else{let Y=w>=s?s:w,O=$t(x)-$t(M),T=R+O+is(M-R,Y);k.push(T);let W=p(T),z=W.getHours()+W.getMinutes()/l+W.getSeconds()/n,q=w/n,B=m.axes[$]._space,V=E/B;for(;T=be(T+w,e==1?0:3),!(T>D);)if(q>1){let N=$t(be(z+q,6))%24,ce=p(T).getHours()-N;ce>1&&(ce=-1),T-=ce*n,z=(z+q)%24;let de=k[k.length-1];be((T-de)/w,3)*V>=.7&&k.push(T)}else k.push(T)}return k}}return[c,d,v]}const[Gf,Yf,Jf]=ya(1),[Qf,Zf,Xf]=ya(.001);Ml(2,-53,53,[1]);function tr(e,t){return e.map(l=>l.map((n,s)=>s==0||s==8||n==null?n:t(s==1||l[8]==0?n:l[1]+n)))}function nr(e,t){return(l,n,s,o,r)=>{let a=t.find(x=>r>=x[0])||t[t.length-1],c,d,v,p,m,$;return n.map(x=>{let D=e(x),w=D.getFullYear(),E=D.getMonth(),k=D.getDate(),C=D.getHours(),S=D.getMinutes(),_=D.getSeconds(),M=w!=c&&a[2]||E!=d&&a[3]||k!=v&&a[4]||C!=p&&a[5]||S!=m&&a[6]||_!=$&&a[7]||a[1];return c=w,d=E,v=k,p=C,m=S,$=_,M(D)})}}function ep(e,t){let l=_o(t);return(n,s,o,r,a)=>s.map(c=>l(e(c)))}function js(e,t,l){return new Date(e,t,l)}function lr(e,t){return t(e)}const tp="{YYYY}-{MM}-{DD} {h}:{mm}{aa}";function sr(e,t){return(l,n,s,o)=>o==null?mo:t(e(n))}function np(e,t){let l=e.series[t];return l.width?l.stroke(e,t):l.points.width?l.points.stroke(e,t):null}function lp(e,t){return e.series[t].fill(e,t)}const sp={show:!0,live:!0,isolate:!1,mount:kf,markers:{show:!0,width:2,stroke:np,fill:lp,dash:"solid"},idx:null,idxs:null,values:[]};function op(e,t){let l=e.cursor.points,n=Tt(),s=l.size(e,t);Ee(n,ml,s),Ee(n,vl,s);let o=s/-2;Ee(n,"marginLeft",o),Ee(n,"marginTop",o);let r=l.width(e,t,s);return r&&Ee(n,"borderWidth",r),n}function ip(e,t){let l=e.series[t].points;return l._fill||l._stroke}function rp(e,t){let l=e.series[t].points;return l._stroke||l._fill}function ap(e,t){return e.series[t].points.size}const Us=[0,0];function cp(e,t,l){return Us[0]=t,Us[1]=l,Us}function Fl(e,t,l,n=!0){return s=>{s.button==0&&(!n||s.target==t)&&l(s)}}function Ws(e,t,l,n=!0){return s=>{(!n||s.target==t)&&l(s)}}const up={show:!0,x:!0,y:!0,lock:!1,move:cp,points:{one:!1,show:op,size:ap,width:0,stroke:rp,fill:ip},bind:{mousedown:Fl,mouseup:Fl,click:Fl,dblclick:Fl,mousemove:Ws,mouseleave:Ws,mouseenter:Ws},drag:{setScale:!0,x:!0,y:!1,dist:0,uni:null,click:(e,t)=>{t.stopPropagation(),t.stopImmediatePropagation()},_x:!1,_y:!1},focus:{dist:(e,t,l,n,s)=>n-s,prox:-1,bias:0},hover:{skip:[void 0],prox:null,bias:0},left:-10,top:-10,idx:null,dataIdx:null,idxs:null,event:null},$a={show:!0,stroke:"rgba(0,0,0,0.07)",width:2},ko=Ve({},$a,{filter:oa}),ba=Ve({},ko,{size:10}),_a=Ve({},$a,{show:!1}),xo='12px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',wa="bold "+xo,ka=1.5,or={show:!0,scale:"x",stroke:ho,space:50,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:wa,side:2,grid:ko,ticks:ba,border:_a,font:xo,lineGap:ka,rotate:0},dp="Value",fp="Time",ir={show:!0,scale:"x",auto:!1,sorted:1,min:$e,max:-$e,idxs:[]};function pp(e,t,l,n,s){return t.map(o=>o==null?"":$o(o))}function hp(e,t,l,n,s,o,r){let a=[],c=cn.get(s)||0;l=r?l:be(is(l,s),c);for(let d=l;d<=n;d=be(d+s,c))a.push(Object.is(d,-0)?0:d);return a}function so(e,t,l,n,s,o,r){const a=[],c=e.scales[e.axes[t].scale].log,d=c==10?Qt:na,v=$t(d(l));s=Qn(c,v),c==10&&(s=bn[It(s,bn)]);let p=l,m=s*c;c==10&&(m=bn[It(m,bn)]);do a.push(p),p=p+s,c==10&&!cn.has(p)&&(p=be(p,cn.get(s))),p>=m&&(s=p,m=s*c,c==10&&(m=bn[It(m,bn)]));while(p<=n);return a}function mp(e,t,l,n,s,o,r){let c=e.scales[e.axes[t].scale].asinh,d=n>c?so(e,t,rt(c,l),n,s):[c],v=n>=0&&l<=0?[0]:[];return(l<-c?so(e,t,rt(c,-n),-l,s):[c]).reverse().map(m=>-m).concat(v,d)}const xa=/./,vp=/[12357]/,gp=/[125]/,rr=/1/,oo=(e,t,l,n)=>e.map((s,o)=>t==4&&s==0||o%n==0&&l.test(s.toExponential()[s<0?1:0])?s:null);function yp(e,t,l,n,s){let o=e.axes[l],r=o.scale,a=e.scales[r],c=e.valToPos,d=o._space,v=c(10,r),p=c(9,r)-v>=d?xa:c(7,r)-v>=d?vp:c(5,r)-v>=d?gp:rr;if(p==rr){let m=He(c(1,r)-v);if(m<d)return oo(t.slice().reverse(),a.distr,p,At(d/m)).reverse()}return oo(t,a.distr,p,1)}function $p(e,t,l,n,s){let o=e.axes[l],r=o.scale,a=o._space,c=e.valToPos,d=He(c(1,r)-c(2,r));return d<a?oo(t.slice().reverse(),3,xa,At(a/d)).reverse():t}function bp(e,t,l,n){return n==null?mo:t==null?"":$o(t)}const ar={show:!0,scale:"y",stroke:ho,space:30,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:wa,side:3,grid:ko,ticks:ba,border:_a,font:xo,lineGap:ka,rotate:0};function _p(e,t){let l=3+(e||1)*2;return be(l*t,3)}function wp(e,t){let{scale:l,idxs:n}=e.series[0],s=e._data[0],o=e.valToPos(s[n[0]],l,!0),r=e.valToPos(s[n[1]],l,!0),a=He(r-o),c=e.series[t],d=a/(c.points.space*me);return n[1]-n[0]<=d}const cr={scale:null,auto:!0,sorted:0,min:$e,max:-$e},Sa=(e,t,l,n,s)=>s,ur={show:!0,auto:!0,sorted:0,gaps:Sa,alpha:1,facets:[Ve({},cr,{scale:"x"}),Ve({},cr,{scale:"y"})]},dr={scale:"y",auto:!0,sorted:0,show:!0,spanGaps:!1,gaps:Sa,alpha:1,points:{show:wp,filter:null},values:null,min:$e,max:-$e,idxs:[],path:null,clip:null};function kp(e,t,l,n,s){return l/10}const Ma={time:Kd,auto:!0,distr:1,log:10,asinh:1,min:null,max:null,dir:1,ori:0},xp=Ve({},Ma,{time:!1,ori:1}),fr={};function Ea(e,t){let l=fr[e];return l||(l={key:e,plots:[],sub(n){l.plots.push(n)},unsub(n){l.plots=l.plots.filter(s=>s!=n)},pub(n,s,o,r,a,c,d){for(let v=0;v<l.plots.length;v++)l.plots[v]!=s&&l.plots[v].pub(n,s,o,r,a,c,d)}},e!=null&&(fr[e]=l)),l}const el=1,io=2;function xn(e,t,l){const n=e.mode,s=e.series[t],o=n==2?e._data[t]:e._data,r=e.scales,a=e.bbox;let c=o[0],d=n==2?o[1]:o[t],v=n==2?r[s.facets[0].scale]:r[e.series[0].scale],p=n==2?r[s.facets[1].scale]:r[s.scale],m=a.left,$=a.top,x=a.width,D=a.height,w=e.valToPosH,E=e.valToPosV;return v.ori==0?l(s,c,d,v,p,w,E,m,$,x,D,cs,nl,ds,Aa,La):l(s,c,d,v,p,E,w,$,m,D,x,us,ll,Eo,Ca,Da)}function So(e,t){let l=0,n=0,s=pe(e.bands,bo);for(let o=0;o<s.length;o++){let r=s[o];r.series[0]==t?l=r.dir:r.series[1]==t&&(r.dir==1?n|=1:n|=2)}return[l,n==1?-1:n==2?1:n==3?2:0]}function Sp(e,t,l,n,s){let o=e.mode,r=e.series[t],a=o==2?r.facets[1].scale:r.scale,c=e.scales[a];return s==-1?c.min:s==1?c.max:c.distr==3?c.dir==1?c.min:c.max:0}function Zt(e,t,l,n,s,o){return xn(e,t,(r,a,c,d,v,p,m,$,x,D,w)=>{let E=r.pxRound;const k=d.dir*(d.ori==0?1:-1),C=d.ori==0?nl:ll;let S,_;k==1?(S=l,_=n):(S=n,_=l);let M=E(p(a[S],d,D,$)),P=E(m(c[S],v,w,x)),R=E(p(a[_],d,D,$)),Y=E(m(o==1?v.max:v.min,v,w,x)),O=new Path2D(s);return C(O,R,Y),C(O,M,Y),C(O,M,P),O})}function as(e,t,l,n,s,o){let r=null;if(e.length>0){r=new Path2D;const a=t==0?ds:Eo;let c=l;for(let p=0;p<e.length;p++){let m=e[p];if(m[1]>m[0]){let $=m[0]-c;$>0&&a(r,c,n,$,n+o),c=m[1]}}let d=l+s-c,v=10;d>0&&a(r,c,n-v/2,d,n+o+v)}return r}function Mp(e,t,l){let n=e[e.length-1];n&&n[0]==t?n[1]=l:e.push([t,l])}function Mo(e,t,l,n,s,o,r){let a=[],c=e.length;for(let d=s==1?l:n;d>=l&&d<=n;d+=s)if(t[d]===null){let p=d,m=d;if(s==1)for(;++d<=n&&t[d]===null;)m=d;else for(;--d>=l&&t[d]===null;)m=d;let $=o(e[p]),x=m==p?$:o(e[m]),D=p-s;$=r<=0&&D>=0&&D<c?o(e[D]):$;let E=m+s;x=r>=0&&E>=0&&E<c?o(e[E]):x,x>=$&&a.push([$,x])}return a}function pr(e){return e==0?sa:e==1?Fe:t=>$n(t,e)}function Ta(e){let t=e==0?cs:us,l=e==0?(s,o,r,a,c,d)=>{s.arcTo(o,r,a,c,d)}:(s,o,r,a,c,d)=>{s.arcTo(r,o,c,a,d)},n=e==0?(s,o,r,a,c)=>{s.rect(o,r,a,c)}:(s,o,r,a,c)=>{s.rect(r,o,c,a)};return(s,o,r,a,c,d=0,v=0)=>{d==0&&v==0?n(s,o,r,a,c):(d=zt(d,a/2,c/2),v=zt(v,a/2,c/2),t(s,o+d,r),l(s,o+a,r,o+a,r+c,d),l(s,o+a,r+c,o,r+c,v),l(s,o,r+c,o,r,v),l(s,o,r,o+a,r,d),s.closePath())}}const cs=(e,t,l)=>{e.moveTo(t,l)},us=(e,t,l)=>{e.moveTo(l,t)},nl=(e,t,l)=>{e.lineTo(t,l)},ll=(e,t,l)=>{e.lineTo(l,t)},ds=Ta(0),Eo=Ta(1),Aa=(e,t,l,n,s,o)=>{e.arc(t,l,n,s,o)},Ca=(e,t,l,n,s,o)=>{e.arc(l,t,n,s,o)},La=(e,t,l,n,s,o,r)=>{e.bezierCurveTo(t,l,n,s,o,r)},Da=(e,t,l,n,s,o,r)=>{e.bezierCurveTo(l,t,s,n,r,o)};function Pa(e){return(t,l,n,s,o)=>xn(t,l,(r,a,c,d,v,p,m,$,x,D,w)=>{let{pxRound:E,points:k}=r,C,S;d.ori==0?(C=cs,S=Aa):(C=us,S=Ca);const _=be(k.width*me,3);let M=(k.size-k.width)/2*me,P=be(M*2,3),R=new Path2D,Y=new Path2D,{left:O,top:T,width:W,height:z}=t.bbox;ds(Y,O-P,T-P,W+P*2,z+P*2);const q=B=>{if(c[B]!=null){let V=E(p(a[B],d,D,$)),N=E(m(c[B],v,w,x));C(R,V+M,N),S(R,V,N,M,0,Bl*2)}};if(o)o.forEach(q);else for(let B=n;B<=s;B++)q(B);return{stroke:_>0?R:null,fill:R,clip:Y,flags:el|io}})}function Ra(e){return(t,l,n,s,o,r)=>{n!=s&&(o!=n&&r!=n&&e(t,l,n),o!=s&&r!=s&&e(t,l,s),e(t,l,r))}}const Ep=Ra(nl),Tp=Ra(ll);function Oa(e){const t=pe(e==null?void 0:e.alignGaps,0);return(l,n,s,o)=>xn(l,n,(r,a,c,d,v,p,m,$,x,D,w)=>{[s,o]=ss(c,s,o);let E=r.pxRound,k=z=>E(p(z,d,D,$)),C=z=>E(m(z,v,w,x)),S,_;d.ori==0?(S=nl,_=Ep):(S=ll,_=Tp);const M=d.dir*(d.ori==0?1:-1),P={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:el},R=P.stroke;let Y=!1;if(o-s>=D*4){let z=K=>l.posToVal(K,d.key,!0),q=null,B=null,V,N,Pe,ue=k(a[M==1?s:o]),ce=k(a[s]),de=k(a[o]),te=z(M==1?ce+1:de-1);for(let K=M==1?s:o;K>=s&&K<=o;K+=M){let Re=a[K],_e=(M==1?Re<te:Re>te)?ue:k(Re),ae=c[K];_e==ue?ae!=null?(N=ae,q==null?(S(R,_e,C(N)),V=q=B=N):N<q?q=N:N>B&&(B=N)):ae===null&&(Y=!0):(q!=null&&_(R,ue,C(q),C(B),C(V),C(N)),ae!=null?(N=ae,S(R,_e,C(N)),q=B=V=N):(q=B=null,ae===null&&(Y=!0)),ue=_e,te=z(ue+M))}q!=null&&q!=B&&Pe!=ue&&_(R,ue,C(q),C(B),C(V),C(N))}else for(let z=M==1?s:o;z>=s&&z<=o;z+=M){let q=c[z];q===null?Y=!0:q!=null&&S(R,k(a[z]),C(q))}let[T,W]=So(l,n);if(r.fill!=null||T!=0){let z=P.fill=new Path2D(R),q=r.fillTo(l,n,r.min,r.max,T),B=C(q),V=k(a[s]),N=k(a[o]);M==-1&&([N,V]=[V,N]),S(z,N,B),S(z,V,B)}if(!r.spanGaps){let z=[];Y&&z.push(...Mo(a,c,s,o,M,k,t)),P.gaps=z=r.gaps(l,n,s,o,z),P.clip=as(z,d.ori,$,x,D,w)}return W!=0&&(P.band=W==2?[Zt(l,n,s,o,R,-1),Zt(l,n,s,o,R,1)]:Zt(l,n,s,o,R,W)),P})}function Ap(e){const t=pe(e.align,1),l=pe(e.ascDesc,!1),n=pe(e.alignGaps,0),s=pe(e.extend,!1);return(o,r,a,c)=>xn(o,r,(d,v,p,m,$,x,D,w,E,k,C)=>{[a,c]=ss(p,a,c);let S=d.pxRound,{left:_,width:M}=o.bbox,P=ce=>S(x(ce,m,k,w)),R=ce=>S(D(ce,$,C,E)),Y=m.ori==0?nl:ll;const O={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:el},T=O.stroke,W=m.dir*(m.ori==0?1:-1);let z=R(p[W==1?a:c]),q=P(v[W==1?a:c]),B=q,V=q;s&&t==-1&&(V=_,Y(T,V,z)),Y(T,q,z);for(let ce=W==1?a:c;ce>=a&&ce<=c;ce+=W){let de=p[ce];if(de==null)continue;let te=P(v[ce]),K=R(de);t==1?Y(T,te,z):Y(T,B,K),Y(T,te,K),z=K,B=te}let N=B;s&&t==1&&(N=_+M,Y(T,N,z));let[Pe,ue]=So(o,r);if(d.fill!=null||Pe!=0){let ce=O.fill=new Path2D(T),de=d.fillTo(o,r,d.min,d.max,Pe),te=R(de);Y(ce,N,te),Y(ce,V,te)}if(!d.spanGaps){let ce=[];ce.push(...Mo(v,p,a,c,W,P,n));let de=d.width*me/2,te=l||t==1?de:-de,K=l||t==-1?-de:de;ce.forEach(Re=>{Re[0]+=te,Re[1]+=K}),O.gaps=ce=d.gaps(o,r,a,c,ce),O.clip=as(ce,m.ori,w,E,k,C)}return ue!=0&&(O.band=ue==2?[Zt(o,r,a,c,T,-1),Zt(o,r,a,c,T,1)]:Zt(o,r,a,c,T,ue)),O})}function hr(e,t,l,n,s,o,r=$e){if(e.length>1){let a=null;for(let c=0,d=1/0;c<e.length;c++)if(t[c]!==void 0){if(a!=null){let v=He(e[c]-e[a]);v<d&&(d=v,r=He(l(e[c],n,s,o)-l(e[a],n,s,o)))}a=c}}return r}function Cp(e){e=e||_l;const t=pe(e.size,[.6,$e,1]),l=e.align||0,n=e.gap||0;let s=e.radius;s=s==null?[0,0]:typeof s=="number"?[s,0]:s;const o=ie(s),r=1-t[0],a=pe(t[1],$e),c=pe(t[2],1),d=pe(e.disp,_l),v=pe(e.each,$=>{}),{fill:p,stroke:m}=d;return($,x,D,w)=>xn($,x,(E,k,C,S,_,M,P,R,Y,O,T)=>{let W=E.pxRound,z=l,q=n*me,B=a*me,V=c*me,N,Pe;S.ori==0?[N,Pe]=o($,x):[Pe,N]=o($,x);const ue=S.dir*(S.ori==0?1:-1);let ce=S.ori==0?ds:Eo,de=S.ori==0?v:(j,ke,Ne,Sn,dn,Ft,fn)=>{v(j,ke,Ne,dn,Sn,fn,Ft)},te=pe($.bands,bo).find(j=>j.series[0]==x),K=te!=null?te.dir:0,Re=E.fillTo($,x,E.min,E.max,K),Ye=W(P(Re,_,T,Y)),_e,ae,ut,Ce=O,we=W(E.width*me),_t=!1,Ct=null,Ze=null,Nt=null,Gt=null;p!=null&&(we==0||m!=null)&&(_t=!0,Ct=p.values($,x,D,w),Ze=new Map,new Set(Ct).forEach(j=>{j!=null&&Ze.set(j,new Path2D)}),we>0&&(Nt=m.values($,x,D,w),Gt=new Map,new Set(Nt).forEach(j=>{j!=null&&Gt.set(j,new Path2D)})));let{x0:Yt,size:Xt}=d;if(Yt!=null&&Xt!=null){z=1,k=Yt.values($,x,D,w),Yt.unit==2&&(k=k.map(Ne=>$.posToVal(R+Ne*O,S.key,!0)));let j=Xt.values($,x,D,w);Xt.unit==2?ae=j[0]*O:ae=M(j[0],S,O,R)-M(0,S,O,R),Ce=hr(k,C,M,S,O,R,Ce),ut=Ce-ae+q}else Ce=hr(k,C,M,S,O,R,Ce),ut=Ce*r+q,ae=Ce-ut;ut<1&&(ut=0),we>=ae/2&&(we=0),ut<5&&(W=sa);let le=ut>0,Oe=Ce-ut-(le?we:0);ae=W(lo(Oe,V,B)),_e=(z==0?ae/2:z==ue?0:ae)-z*ue*((z==0?q/2:0)+(le?we/2:0));const Ie={stroke:null,fill:null,clip:null,band:null,gaps:null,flags:0},Xe=_t?null:new Path2D;let wt=null;if(te!=null)wt=$.data[te.series[1]];else{let{y0:j,y1:ke}=d;j!=null&&ke!=null&&(C=ke.values($,x,D,w),wt=j.values($,x,D,w))}let un=N*ae,ne=Pe*ae;for(let j=ue==1?D:w;j>=D&&j<=w;j+=ue){let ke=C[j];if(ke==null)continue;if(wt!=null){let dt=wt[j]??0;if(ke-dt==0)continue;Ye=P(dt,_,T,Y)}let Ne=S.distr!=2||d!=null?k[j]:j,Sn=M(Ne,S,O,R),dn=P(pe(ke,Re),_,T,Y),Ft=W(Sn-_e),fn=W(rt(dn,Ye)),pt=W(zt(dn,Ye)),kt=fn-pt;if(ke!=null){let dt=ke<0?ne:un,Lt=ke<0?un:ne;_t?(we>0&&Nt[j]!=null&&ce(Gt.get(Nt[j]),Ft,pt+$t(we/2),ae,rt(0,kt-we),dt,Lt),Ct[j]!=null&&ce(Ze.get(Ct[j]),Ft,pt+$t(we/2),ae,rt(0,kt-we),dt,Lt)):ce(Xe,Ft,pt+$t(we/2),ae,rt(0,kt-we),dt,Lt),de($,x,j,Ft-we/2,pt,ae+we,kt)}}return we>0?Ie.stroke=_t?Gt:Xe:_t||(Ie._fill=E.width==0?E._fill:E._stroke??E._fill,Ie.width=0),Ie.fill=_t?Ze:Xe,Ie})}function Lp(e,t){const l=pe(t==null?void 0:t.alignGaps,0);return(n,s,o,r)=>xn(n,s,(a,c,d,v,p,m,$,x,D,w,E)=>{[o,r]=ss(d,o,r);let k=a.pxRound,C=N=>k(m(N,v,w,x)),S=N=>k($(N,p,E,D)),_,M,P;v.ori==0?(_=cs,P=nl,M=La):(_=us,P=ll,M=Da);const R=v.dir*(v.ori==0?1:-1);let Y=C(c[R==1?o:r]),O=Y,T=[],W=[];for(let N=R==1?o:r;N>=o&&N<=r;N+=R)if(d[N]!=null){let ue=c[N],ce=C(ue);T.push(O=ce),W.push(S(d[N]))}const z={stroke:e(T,W,_,P,M,k),fill:null,clip:null,band:null,gaps:null,flags:el},q=z.stroke;let[B,V]=So(n,s);if(a.fill!=null||B!=0){let N=z.fill=new Path2D(q),Pe=a.fillTo(n,s,a.min,a.max,B),ue=S(Pe);P(N,O,ue),P(N,Y,ue)}if(!a.spanGaps){let N=[];N.push(...Mo(c,d,o,r,R,C,l)),z.gaps=N=a.gaps(n,s,o,r,N),z.clip=as(N,v.ori,x,D,w,E)}return V!=0&&(z.band=V==2?[Zt(n,s,o,r,q,-1),Zt(n,s,o,r,q,1)]:Zt(n,s,o,r,q,V)),z})}function Dp(e){return Lp(Pp,e)}function Pp(e,t,l,n,s,o){const r=e.length;if(r<2)return null;const a=new Path2D;if(l(a,e[0],t[0]),r==2)n(a,e[1],t[1]);else{let c=Array(r),d=Array(r-1),v=Array(r-1),p=Array(r-1);for(let m=0;m<r-1;m++)v[m]=t[m+1]-t[m],p[m]=e[m+1]-e[m],d[m]=v[m]/p[m];c[0]=d[0];for(let m=1;m<r-1;m++)d[m]===0||d[m-1]===0||d[m-1]>0!=d[m]>0?c[m]=0:(c[m]=3*(p[m-1]+p[m])/((2*p[m]+p[m-1])/d[m-1]+(p[m]+2*p[m-1])/d[m]),isFinite(c[m])||(c[m]=0));c[r-1]=d[r-2];for(let m=0;m<r-1;m++)s(a,e[m]+p[m]/3,t[m]+c[m]*p[m]/3,e[m+1]-p[m]/3,t[m+1]-c[m+1]*p[m]/3,e[m+1],t[m+1])}return a}const ro=new Set;function mr(){for(let e of ro)e.syncRect(!0)}tl&&(wn(pf,Yn,mr),wn(hf,Yn,mr,!0),wn(Gl,Yn,()=>{nt.pxRatio=me}));const Rp=Oa(),Op=Pa();function vr(e,t,l,n){return(n?[e[0],e[1]].concat(e.slice(2)):[e[0]].concat(e.slice(1))).map((o,r)=>ao(o,r,t,l))}function Ip(e,t){return e.map((l,n)=>n==0?{}:Ve({},t,l))}function ao(e,t,l,n){return Ve({},t==0?l:n,e)}function Ia(e,t,l){return t==null?Zn:[t,l]}const zp=Ia;function Vp(e,t,l){return t==null?Zn:Yl(t,l,yo,!0)}function za(e,t,l,n){return t==null?Zn:os(t,l,e.scales[n].log,!1)}const Np=za;function Va(e,t,l,n){return t==null?Zn:go(t,l,e.scales[n].log,!1)}const Fp=Va;function Hp(e,t,l,n,s){let o=rt(Gi(e),Gi(t)),r=t-e,a=It(s/n*r,l);do{let c=l[a],d=n*c/r;if(d>=s&&o+(c<5?cn.get(c):0)<=17)return[c,d]}while(++a<l.length);return[0,0]}function gr(e){let t,l;return e=e.replace(/(\d+)px/,(n,s)=>(t=Fe((l=+s)*me))+"px"),[e,t,l]}function Bp(e){e.show&&[e.font,e.labelFont].forEach(t=>{let l=be(t[2]*me,1);t[0]=t[0].replace(/[0-9.]+px/,l+"px"),t[1]=l})}function nt(e,t,l){const n={mode:pe(e.mode,1)},s=n.mode;function o(i,u,f,h){let y=u.valToPct(i);return h+f*(u.dir==-1?1-y:y)}function r(i,u,f,h){let y=u.valToPct(i);return h+f*(u.dir==-1?y:1-y)}function a(i,u,f,h){return u.ori==0?o(i,u,f,h):r(i,u,f,h)}n.valToPosH=o,n.valToPosV=r;let c=!1;n.status=0;const d=n.root=Tt(Gd);if(e.id!=null&&(d.id=e.id),gt(d,e.class),e.title){let i=Tt(Qd,d);i.textContent=e.title}const v=Ot("canvas"),p=n.ctx=v.getContext("2d"),m=Tt(Zd,d);wn("click",m,i=>{i.target===x&&(xe!=In||Te!=zn)&&Qe.click(n,i)},!0);const $=n.under=Tt(Xd,m);m.appendChild(v);const x=n.over=Tt(ef,m);e=Xn(e);const D=+pe(e.pxAlign,1),w=pr(D);(e.plugins||[]).forEach(i=>{i.opts&&(e=i.opts(n,e)||e)});const E=e.ms||.001,k=n.series=s==1?vr(e.series||[],ir,dr,!1):Ip(e.series||[null],ur),C=n.axes=vr(e.axes||[],or,ar,!0),S=n.scales={},_=n.bands=e.bands||[];_.forEach(i=>{i.fill=ie(i.fill||null),i.dir=pe(i.dir,-1)});const M=s==2?k[1].facets[0].scale:k[0].scale,P={axes:sc,series:Xa},R=(e.drawOrder||["axes","series"]).map(i=>P[i]);function Y(i){const u=i.distr==3?f=>Qt(f>0?f:i.clamp(n,f,i.min,i.max,i.key)):i.distr==4?f=>Bs(f,i.asinh):i.distr==100?f=>i.fwd(f):f=>f;return f=>{let h=u(f),{_min:y,_max:b}=i,A=b-y;return(h-y)/A}}function O(i){let u=S[i];if(u==null){let f=(e.scales||_l)[i]||_l;if(f.from!=null){O(f.from);let h=Ve({},S[f.from],f,{key:i});h.valToPct=Y(h),S[i]=h}else{u=S[i]=Ve({},i==M?Ma:xp,f),u.key=i;let h=u.time,y=u.range,b=rn(y);if((i!=M||s==2&&!h)&&(b&&(y[0]==null||y[1]==null)&&(y={min:y[0]==null?Wi:{mode:1,hard:y[0],soft:y[0]},max:y[1]==null?Wi:{mode:1,hard:y[1],soft:y[1]}},b=!1),!b&&rs(y))){let A=y;y=(L,I,F)=>I==null?Zn:Yl(I,F,A)}u.range=ie(y||(h?zp:i==M?u.distr==3?Np:u.distr==4?Fp:Ia:u.distr==3?za:u.distr==4?Va:Vp)),u.auto=ie(b?!1:u.auto),u.clamp=ie(u.clamp||kp),u._min=u._max=null,u.valToPct=Y(u)}}}O("x"),O("y"),s==1&&k.forEach(i=>{O(i.scale)}),C.forEach(i=>{O(i.scale)});for(let i in e.scales)O(i);const T=S[M],W=T.distr;let z,q;T.ori==0?(gt(d,Yd),z=o,q=r):(gt(d,Jd),z=r,q=o);const B={};for(let i in S){let u=S[i];(u.min!=null||u.max!=null)&&(B[i]={min:u.min,max:u.max},u.min=u.max=null)}const V=e.tzDate||(i=>new Date(Fe(i/E))),N=e.fmtDate||_o,Pe=E==1?Jf(V):Xf(V),ue=nr(V,tr(E==1?Yf:Zf,N)),ce=sr(V,lr(tp,N)),de=[],te=n.legend=Ve({},sp,e.legend),K=n.cursor=Ve({},up,{drag:{y:s==2}},e.cursor),Re=te.show,Ye=K.show,_e=te.markers;te.idxs=de,_e.width=ie(_e.width),_e.dash=ie(_e.dash),_e.stroke=ie(_e.stroke),_e.fill=ie(_e.fill);let ae,ut,Ce,we=[],_t=[],Ct,Ze=!1,Nt={};if(te.live){const i=k[1]?k[1].values:null;Ze=i!=null,Ct=Ze?i(n,1,0):{_:0};for(let u in Ct)Nt[u]=mo}if(Re)if(ae=Ot("table",rf,d),Ce=Ot("tbody",null,ae),te.mount(n,ae),Ze){ut=Ot("thead",null,ae,Ce);let i=Ot("tr",null,ut);Ot("th",null,i);for(var Gt in Ct)Ot("th",Di,i).textContent=Gt}else gt(ae,cf),te.live&&gt(ae,af);const Yt={show:!0},Xt={show:!1};function le(i,u){if(u==0&&(Ze||!te.live||s==2))return Zn;let f=[],h=Ot("tr",uf,Ce,Ce.childNodes[u]);gt(h,i.class),i.show||gt(h,_n);let y=Ot("th",null,h);if(_e.show){let L=Tt(df,y);if(u>0){let I=_e.width(n,u);I&&(L.style.border=I+"px "+_e.dash(n,u)+" "+_e.stroke(n,u)),L.style.background=_e.fill(n,u)}}let b=Tt(Di,y);i.label instanceof HTMLElement?b.appendChild(i.label):b.textContent=i.label,u>0&&(_e.show||(b.style.color=i.width>0?_e.stroke(n,u):_e.fill(n,u)),Ie("click",y,L=>{if(K._lock)return;hn(L);let I=k.indexOf(i);if((L.ctrlKey||L.metaKey)!=te.isolate){let F=k.some((H,U)=>U>0&&U!=I&&H.show);k.forEach((H,U)=>{U>0&&Bt(U,F?U==I?Yt:Xt:Yt,!0,ze.setSeries)})}else Bt(I,{show:!i.show},!0,ze.setSeries)},!1),En&&Ie(Ii,y,L=>{K._lock||(hn(L),Bt(k.indexOf(i),Nn,!0,ze.setSeries))},!1));for(var A in Ct){let L=Ot("td",ff,h);L.textContent="--",f.push(L)}return[h,f]}const Oe=new Map;function Ie(i,u,f,h=!0){const y=Oe.get(u)||{},b=K.bind[i](n,u,f,h);b&&(wn(i,u,y[i]=b),Oe.set(u,y))}function Xe(i,u,f){const h=Oe.get(u)||{};for(let y in h)(i==null||y==i)&&(no(y,u,h[y]),delete h[y]);i==null&&Oe.delete(u)}let wt=0,un=0,ne=0,j=0,ke=0,Ne=0,Sn=ke,dn=Ne,Ft=ne,fn=j,pt=0,kt=0,dt=0,Lt=0;n.bbox={};let fs=!1,El=!1,Mn=!1,pn=!1,Tl=!1,xt=!1;function ps(i,u,f){(f||i!=n.width||u!=n.height)&&Co(i,u),Dn(!1),Mn=!0,El=!0,Pn()}function Co(i,u){n.width=wt=ne=i,n.height=un=j=u,ke=Ne=0,qa(),Ka();let f=n.bbox;pt=f.left=$n(ke*me,.5),kt=f.top=$n(Ne*me,.5),dt=f.width=$n(ne*me,.5),Lt=f.height=$n(j*me,.5)}const ja=3;function Ua(){let i=!1,u=0;for(;!i;){u++;let f=nc(u),h=lc(u);i=u==ja||f&&h,i||(Co(n.width,n.height),El=!0)}}function Wa({width:i,height:u}){ps(i,u)}n.setSize=Wa;function qa(){let i=!1,u=!1,f=!1,h=!1;C.forEach((y,b)=>{if(y.show&&y._show){let{side:A,_size:L}=y,I=A%2,F=y.label!=null?y.labelSize:0,H=L+F;H>0&&(I?(ne-=H,A==3?(ke+=H,h=!0):f=!0):(j-=H,A==0?(Ne+=H,i=!0):u=!0))}}),mn[0]=i,mn[1]=f,mn[2]=u,mn[3]=h,ne-=en[1]+en[3],ke+=en[3],j-=en[2]+en[0],Ne+=en[0]}function Ka(){let i=ke+ne,u=Ne+j,f=ke,h=Ne;function y(b,A){switch(b){case 1:return i+=A,i-A;case 2:return u+=A,u-A;case 3:return f-=A,f+A;case 0:return h-=A,h+A}}C.forEach((b,A)=>{if(b.show&&b._show){let L=b.side;b._pos=y(L,b._size),b.label!=null&&(b._lpos=y(L,b.labelSize))}})}if(K.dataIdx==null){let i=K.hover,u=i.skip=new Set(i.skip??[]);u.add(void 0);let f=i.prox=ie(i.prox),h=i.bias??(i.bias=0);K.dataIdx=(y,b,A,L)=>{if(b==0)return A;let I=A,F=f(y,b,A,L)??$e,H=F>=0&&F<$e,U=T.ori==0?ne:j,X=K.left,he=t[0],fe=t[b];if(u.has(fe[A])){I=null;let se=null,Q=null,G;if(h==0||h==-1)for(G=A;se==null&&G-- >0;)u.has(fe[G])||(se=G);if(h==0||h==1)for(G=A;Q==null&&G++<fe.length;)u.has(fe[G])||(Q=G);if(se!=null||Q!=null)if(H){let Me=se==null?-1/0:z(he[se],T,U,0),Le=Q==null?1/0:z(he[Q],T,U,0),Ge=X-Me,ge=Le-X;Ge<=ge?Ge<=F&&(I=se):ge<=F&&(I=Q)}else I=Q==null?se:se==null?Q:A-se<=Q-A?se:Q}else H&&He(X-z(he[A],T,U,0))>F&&(I=null);return I}}const hn=i=>{K.event=i};K.idxs=de,K._lock=!1;let et=K.points;et.show=ie(et.show),et.size=ie(et.size),et.stroke=ie(et.stroke),et.width=ie(et.width),et.fill=ie(et.fill);const Ht=n.focus=Ve({},e.focus||{alpha:.3},K.focus),En=Ht.prox>=0,Tn=En&&et.one;let St=[],An=[],Cn=[];function Lo(i,u){let f=et.show(n,u);if(f instanceof HTMLElement)return gt(f,of),gt(f,i.class),qt(f,-10,-10,ne,j),x.insertBefore(f,St[u]),f}function Do(i,u){if(s==1||u>0){let f=s==1&&S[i.scale].time,h=i.value;i.value=f?Qi(h)?sr(V,lr(h,N)):h||ce:h||bp,i.label=i.label||(f?fp:dp)}if(Tn||u>0){i.width=i.width==null?1:i.width,i.paths=i.paths||Rp||xf,i.fillTo=ie(i.fillTo||Sp),i.pxAlign=+pe(i.pxAlign,D),i.pxRound=pr(i.pxAlign),i.stroke=ie(i.stroke||null),i.fill=ie(i.fill||null),i._stroke=i._fill=i._paths=i._focus=null;let f=_p(rt(1,i.width),1),h=i.points=Ve({},{size:f,width:rt(1,f*.2),stroke:i.stroke,space:f*2,paths:Op,_stroke:null,_fill:null},i.points);h.show=ie(h.show),h.filter=ie(h.filter),h.fill=ie(h.fill),h.stroke=ie(h.stroke),h.paths=ie(h.paths),h.pxAlign=i.pxAlign}if(Re){let f=le(i,u);we.splice(u,0,f[0]),_t.splice(u,0,f[1]),te.values.push(null)}if(Ye){de.splice(u,0,null);let f=null;Tn?u==0&&(f=Lo(i,u)):u>0&&(f=Lo(i,u)),St.splice(u,0,f),An.splice(u,0,0),Cn.splice(u,0,0)}Ke("addSeries",u)}function Ga(i,u){u=u??k.length,i=s==1?ao(i,u,ir,dr):ao(i,u,{},ur),k.splice(u,0,i),Do(k[u],u)}n.addSeries=Ga;function Ya(i){if(k.splice(i,1),Re){te.values.splice(i,1),_t.splice(i,1);let u=we.splice(i,1)[0];Xe(null,u.firstChild),u.remove()}Ye&&(de.splice(i,1),St.splice(i,1)[0].remove(),An.splice(i,1),Cn.splice(i,1)),Ke("delSeries",i)}n.delSeries=Ya;const mn=[!1,!1,!1,!1];function Ja(i,u){if(i._show=i.show,i.show){let f=i.side%2,h=S[i.scale];h==null&&(i.scale=f?k[1].scale:M,h=S[i.scale]);let y=h.time;i.size=ie(i.size),i.space=ie(i.space),i.rotate=ie(i.rotate),rn(i.incrs)&&i.incrs.forEach(A=>{!cn.has(A)&&cn.set(A,ra(A))}),i.incrs=ie(i.incrs||(h.distr==2?qf:y?E==1?Gf:Qf:bn)),i.splits=ie(i.splits||(y&&h.distr==1?Pe:h.distr==3?so:h.distr==4?mp:hp)),i.stroke=ie(i.stroke),i.grid.stroke=ie(i.grid.stroke),i.ticks.stroke=ie(i.ticks.stroke),i.border.stroke=ie(i.border.stroke);let b=i.values;i.values=rn(b)&&!rn(b[0])?ie(b):y?rn(b)?nr(V,tr(b,N)):Qi(b)?ep(V,b):b||ue:b||pp,i.filter=ie(i.filter||(h.distr>=3&&h.log==10?yp:h.distr==3&&h.log==2?$p:oa)),i.font=gr(i.font),i.labelFont=gr(i.labelFont),i._size=i.size(n,null,u,0),i._space=i._rotate=i._incrs=i._found=i._splits=i._values=null,i._size>0&&(mn[u]=!0,i._el=Tt(tf,m))}}function sl(i,u,f,h){let[y,b,A,L]=f,I=u%2,F=0;return I==0&&(L||b)&&(F=u==0&&!y||u==2&&!A?Fe(or.size/3):0),I==1&&(y||A)&&(F=u==1&&!b||u==3&&!L?Fe(ar.size/2):0),F}const Po=n.padding=(e.padding||[sl,sl,sl,sl]).map(i=>ie(pe(i,sl))),en=n._padding=Po.map((i,u)=>i(n,u,mn,0));let Je,je=null,Ue=null;const Al=s==1?k[0].idxs:null;let Dt=null,ol=!1;function Ro(i,u){if(t=i??[],n.data=n._data=t,s==2){Je=0;for(let f=1;f<k.length;f++)Je+=t[f][0].length}else{t.length==0&&(n.data=n._data=t=[[]]),Dt=t[0],Je=Dt.length;let f=t;if(W==2){f=t.slice();let h=f[0]=Array(Je);for(let y=0;y<Je;y++)h[y]=y}n._data=t=f}if(Dn(!0),Ke("setData"),W==2&&(Mn=!0),u!==!1){let f=T;f.auto(n,ol)?hs():nn(M,f.min,f.max),pn=pn||K.left>=0,xt=!0,Pn()}}n.setData=Ro;function hs(){ol=!0;let i,u;s==1&&(Je>0?(je=Al[0]=0,Ue=Al[1]=Je-1,i=t[0][je],u=t[0][Ue],W==2?(i=je,u=Ue):i==u&&(W==3?[i,u]=os(i,i,T.log,!1):W==4?[i,u]=go(i,i,T.log,!1):T.time?u=i+Fe(86400/E):[i,u]=Yl(i,u,yo,!0))):(je=Al[0]=i=null,Ue=Al[1]=u=null)),nn(M,i,u)}let Cl,Ln,ms,vs,gs,ys,$s,bs,_s,ft;function Oo(i,u,f,h,y,b){i??(i=Ri),f??(f=bo),h??(h="butt"),y??(y=Ri),b??(b="round"),i!=Cl&&(p.strokeStyle=Cl=i),y!=Ln&&(p.fillStyle=Ln=y),u!=ms&&(p.lineWidth=ms=u),b!=gs&&(p.lineJoin=gs=b),h!=ys&&(p.lineCap=ys=h),f!=vs&&p.setLineDash(vs=f)}function Io(i,u,f,h){u!=Ln&&(p.fillStyle=Ln=u),i!=$s&&(p.font=$s=i),f!=bs&&(p.textAlign=bs=f),h!=_s&&(p.textBaseline=_s=h)}function ws(i,u,f,h,y=0){if(h.length>0&&i.auto(n,ol)&&(u==null||u.min==null)){let b=pe(je,0),A=pe(Ue,h.length-1),L=f.min==null?yf(h,b,A,y,i.distr==3):[f.min,f.max];i.min=zt(i.min,f.min=L[0]),i.max=rt(i.max,f.max=L[1])}}const zo={min:null,max:null};function Qa(){for(let h in S){let y=S[h];B[h]==null&&(y.min==null||B[M]!=null&&y.auto(n,ol))&&(B[h]=zo)}for(let h in S){let y=S[h];B[h]==null&&y.from!=null&&B[y.from]!=null&&(B[h]=zo)}B[M]!=null&&Dn(!0);let i={};for(let h in B){let y=B[h];if(y!=null){let b=i[h]=Xn(S[h],Ef);if(y.min!=null)Ve(b,y);else if(h!=M||s==2)if(Je==0&&b.from==null){let A=b.range(n,null,null,h);b.min=A[0],b.max=A[1]}else b.min=$e,b.max=-$e}}if(Je>0){k.forEach((h,y)=>{if(s==1){let b=h.scale,A=B[b];if(A==null)return;let L=i[b];if(y==0){let I=L.range(n,L.min,L.max,b);L.min=I[0],L.max=I[1],je=It(L.min,t[0]),Ue=It(L.max,t[0]),Ue-je>1&&(t[0][je]<L.min&&je++,t[0][Ue]>L.max&&Ue--),h.min=Dt[je],h.max=Dt[Ue]}else h.show&&h.auto&&ws(L,A,h,t[y],h.sorted);h.idxs[0]=je,h.idxs[1]=Ue}else if(y>0&&h.show&&h.auto){let[b,A]=h.facets,L=b.scale,I=A.scale,[F,H]=t[y],U=i[L],X=i[I];U!=null&&ws(U,B[L],b,F,b.sorted),X!=null&&ws(X,B[I],A,H,A.sorted),h.min=A.min,h.max=A.max}});for(let h in i){let y=i[h],b=B[h];if(y.from==null&&(b==null||b.min==null)){let A=y.range(n,y.min==$e?null:y.min,y.max==-$e?null:y.max,h);y.min=A[0],y.max=A[1]}}}for(let h in i){let y=i[h];if(y.from!=null){let b=i[y.from];if(b.min==null)y.min=y.max=null;else{let A=y.range(n,b.min,b.max,h);y.min=A[0],y.max=A[1]}}}let u={},f=!1;for(let h in i){let y=i[h],b=S[h];if(b.min!=y.min||b.max!=y.max){b.min=y.min,b.max=y.max;let A=b.distr;b._min=A==3?Qt(b.min):A==4?Bs(b.min,b.asinh):A==100?b.fwd(b.min):b.min,b._max=A==3?Qt(b.max):A==4?Bs(b.max,b.asinh):A==100?b.fwd(b.max):b.max,u[h]=f=!0}}if(f){k.forEach((h,y)=>{s==2?y>0&&u.y&&(h._paths=null):u[h.scale]&&(h._paths=null)});for(let h in u)Mn=!0,Ke("setScale",h);Ye&&K.left>=0&&(pn=xt=!0)}for(let h in B)B[h]=null}function Za(i){let u=lo(je-1,0,Je-1),f=lo(Ue+1,0,Je-1);for(;i[u]==null&&u>0;)u--;for(;i[f]==null&&f<Je-1;)f++;return[u,f]}function Xa(){if(Je>0){let i=k.some(u=>u._focus)&&ft!=Ht.alpha;i&&(p.globalAlpha=ft=Ht.alpha),k.forEach((u,f)=>{if(f>0&&u.show&&(Vo(f,!1),Vo(f,!0),u._paths==null)){let h=ft;ft!=u.alpha&&(p.globalAlpha=ft=u.alpha);let y=s==2?[0,t[f][0].length-1]:Za(t[f]);u._paths=u.paths(n,f,y[0],y[1]),ft!=h&&(p.globalAlpha=ft=h)}}),k.forEach((u,f)=>{if(f>0&&u.show){let h=ft;ft!=u.alpha&&(p.globalAlpha=ft=u.alpha),u._paths!=null&&No(f,!1);{let y=u._paths!=null?u._paths.gaps:null,b=u.points.show(n,f,je,Ue,y),A=u.points.filter(n,f,b,y);(b||A)&&(u.points._paths=u.points.paths(n,f,je,Ue,A),No(f,!0))}ft!=h&&(p.globalAlpha=ft=h),Ke("drawSeries",f)}}),i&&(p.globalAlpha=ft=1)}}function Vo(i,u){let f=u?k[i].points:k[i];f._stroke=f.stroke(n,i),f._fill=f.fill(n,i)}function No(i,u){let f=u?k[i].points:k[i],{stroke:h,fill:y,clip:b,flags:A,_stroke:L=f._stroke,_fill:I=f._fill,_width:F=f.width}=f._paths;F=be(F*me,3);let H=null,U=F%2/2;u&&I==null&&(I=F>0?"#fff":L);let X=f.pxAlign==1&&U>0;if(X&&p.translate(U,U),!u){let he=pt-F/2,fe=kt-F/2,se=dt+F,Q=Lt+F;H=new Path2D,H.rect(he,fe,se,Q)}u?ks(L,F,f.dash,f.cap,I,h,y,A,b):ec(i,L,F,f.dash,f.cap,I,h,y,A,H,b),X&&p.translate(-U,-U)}function ec(i,u,f,h,y,b,A,L,I,F,H){let U=!1;I!=0&&_.forEach((X,he)=>{if(X.series[0]==i){let fe=k[X.series[1]],se=t[X.series[1]],Q=(fe._paths||_l).band;rn(Q)&&(Q=X.dir==1?Q[0]:Q[1]);let G,Me=null;fe.show&&Q&&bf(se,je,Ue)?(Me=X.fill(n,he)||b,G=fe._paths.clip):Q=null,ks(u,f,h,y,Me,A,L,I,F,H,G,Q),U=!0}}),U||ks(u,f,h,y,b,A,L,I,F,H)}const Fo=el|io;function ks(i,u,f,h,y,b,A,L,I,F,H,U){Oo(i,u,f,h,y),(I||F||U)&&(p.save(),I&&p.clip(I),F&&p.clip(F)),U?(L&Fo)==Fo?(p.clip(U),H&&p.clip(H),Dl(y,A),Ll(i,b,u)):L&io?(Dl(y,A),p.clip(U),Ll(i,b,u)):L&el&&(p.save(),p.clip(U),H&&p.clip(H),Dl(y,A),p.restore(),Ll(i,b,u)):(Dl(y,A),Ll(i,b,u)),(I||F||U)&&p.restore()}function Ll(i,u,f){f>0&&(u instanceof Map?u.forEach((h,y)=>{p.strokeStyle=Cl=y,p.stroke(h)}):u!=null&&i&&p.stroke(u))}function Dl(i,u){u instanceof Map?u.forEach((f,h)=>{p.fillStyle=Ln=h,p.fill(f)}):u!=null&&i&&p.fill(u)}function tc(i,u,f,h){let y=C[i],b;if(h<=0)b=[0,0];else{let A=y._space=y.space(n,i,u,f,h),L=y._incrs=y.incrs(n,i,u,f,h,A);b=Hp(u,f,L,h,A)}return y._found=b}function xs(i,u,f,h,y,b,A,L,I,F){let H=A%2/2;D==1&&p.translate(H,H),Oo(L,A,I,F,L),p.beginPath();let U,X,he,fe,se=y+(h==0||h==3?-b:b);f==0?(X=y,fe=se):(U=y,he=se);for(let Q=0;Q<i.length;Q++)u[Q]!=null&&(f==0?U=he=i[Q]:X=fe=i[Q],p.moveTo(U,X),p.lineTo(he,fe));p.stroke(),D==1&&p.translate(-H,-H)}function nc(i){let u=!0;return C.forEach((f,h)=>{if(!f.show)return;let y=S[f.scale];if(y.min==null){f._show&&(u=!1,f._show=!1,Dn(!1));return}else f._show||(u=!1,f._show=!0,Dn(!1));let b=f.side,A=b%2,{min:L,max:I}=y,[F,H]=tc(h,L,I,A==0?ne:j);if(H==0)return;let U=y.distr==2,X=f._splits=f.splits(n,h,L,I,F,H,U),he=y.distr==2?X.map(G=>Dt[G]):X,fe=y.distr==2?Dt[X[1]]-Dt[X[0]]:F,se=f._values=f.values(n,f.filter(n,he,h,H,fe),h,H,fe);f._rotate=b==2?f.rotate(n,se,h,H):0;let Q=f._size;f._size=At(f.size(n,se,h,i)),Q!=null&&f._size!=Q&&(u=!1)}),u}function lc(i){let u=!0;return Po.forEach((f,h)=>{let y=f(n,h,mn,i);y!=en[h]&&(u=!1),en[h]=y}),u}function sc(){for(let i=0;i<C.length;i++){let u=C[i];if(!u.show||!u._show)continue;let f=u.side,h=f%2,y,b,A=u.stroke(n,i),L=f==0||f==3?-1:1,[I,F]=u._found;if(u.label!=null){let st=u.labelGap*L,vt=Fe((u._lpos+st)*me);Io(u.labelFont[0],A,"center",f==2?fl:Pi),p.save(),h==1?(y=b=0,p.translate(vt,Fe(kt+Lt/2)),p.rotate((f==3?-Bl:Bl)/2)):(y=Fe(pt+dt/2),b=vt);let yn=la(u.label)?u.label(n,i,I,F):u.label;p.fillText(yn,y,b),p.restore()}if(F==0)continue;let H=S[u.scale],U=h==0?dt:Lt,X=h==0?pt:kt,he=u._splits,fe=H.distr==2?he.map(st=>Dt[st]):he,se=H.distr==2?Dt[he[1]]-Dt[he[0]]:I,Q=u.ticks,G=u.border,Me=Q.show?Q.size:0,Le=Fe(Me*me),Ge=Fe((u.alignTo==2?u._size-Me-u.gap:u.gap)*me),ge=u._rotate*-Bl/180,De=w(u._pos*me),ht=(Le+Ge)*L,lt=De+ht;b=h==0?lt:0,y=h==1?lt:0;let Mt=u.font[0],Pt=u.align==1?Bn:u.align==2?Ns:ge>0?Bn:ge<0?Ns:h==0?"center":f==3?Ns:Bn,Ut=ge||h==1?"middle":f==2?fl:Pi;Io(Mt,A,Pt,Ut);let mt=u.font[1]*u.lineGap,Et=he.map(st=>w(a(st,H,U,X))),Rt=u._values;for(let st=0;st<Rt.length;st++){let vt=Rt[st];if(vt!=null){h==0?y=Et[st]:b=Et[st],vt=""+vt;let yn=vt.indexOf(`
`)==-1?[vt]:vt.split(/\n/gm);for(let ot=0;ot<yn.length;ot++){let oi=yn[ot];ge?(p.save(),p.translate(y,b+ot*mt),p.rotate(ge),p.fillText(oi,0,0),p.restore()):p.fillText(oi,y,b+ot*mt)}}}Q.show&&xs(Et,Q.filter(n,fe,i,F,se),h,f,De,Le,be(Q.width*me,3),Q.stroke(n,i),Q.dash,Q.cap);let Wt=u.grid;Wt.show&&xs(Et,Wt.filter(n,fe,i,F,se),h,h==0?2:1,h==0?kt:pt,h==0?Lt:dt,be(Wt.width*me,3),Wt.stroke(n,i),Wt.dash,Wt.cap),G.show&&xs([De],[1],h==0?1:0,h==0?1:2,h==1?kt:pt,h==1?Lt:dt,be(G.width*me,3),G.stroke(n,i),G.dash,G.cap)}Ke("drawAxes")}function Dn(i){k.forEach((u,f)=>{f>0&&(u._paths=null,i&&(s==1?(u.min=null,u.max=null):u.facets.forEach(h=>{h.min=null,h.max=null})))})}let Pl=!1,Ss=!1,il=[];function oc(){Ss=!1;for(let i=0;i<il.length;i++)Ke(...il[i]);il.length=0}function Pn(){Pl||(Rf(Ho),Pl=!0)}function ic(i,u=!1){Pl=!0,Ss=u,i(n),Ho(),u&&il.length>0&&queueMicrotask(oc)}n.batch=ic;function Ho(){if(fs&&(Qa(),fs=!1),Mn&&(Ua(),Mn=!1),El){if(Ee($,Bn,ke),Ee($,fl,Ne),Ee($,ml,ne),Ee($,vl,j),Ee(x,Bn,ke),Ee(x,fl,Ne),Ee(x,ml,ne),Ee(x,vl,j),Ee(m,ml,wt),Ee(m,vl,un),v.width=Fe(wt*me),v.height=Fe(un*me),C.forEach(({_el:i,_show:u,_size:f,_pos:h,side:y})=>{if(i!=null)if(u){let b=y===3||y===0?f:0,A=y%2==1;Ee(i,A?"left":"top",h-b),Ee(i,A?"width":"height",f),Ee(i,A?"top":"left",A?Ne:ke),Ee(i,A?"height":"width",A?j:ne),to(i,_n)}else gt(i,_n)}),Cl=Ln=ms=gs=ys=$s=bs=_s=vs=null,ft=1,cl(!0),ke!=Sn||Ne!=dn||ne!=Ft||j!=fn){Dn(!1);let i=ne/Ft,u=j/fn;if(Ye&&!pn&&K.left>=0){K.left*=i,K.top*=u,Rn&&qt(Rn,Fe(K.left),0,ne,j),On&&qt(On,0,Fe(K.top),ne,j);for(let f=0;f<St.length;f++){let h=St[f];h!=null&&(An[f]*=i,Cn[f]*=u,qt(h,At(An[f]),At(Cn[f]),ne,j))}}if(Se.show&&!Tl&&Se.left>=0&&Se.width>0){Se.left*=i,Se.width*=i,Se.top*=u,Se.height*=u;for(let f in Ls)Ee(Vn,f,Se[f])}Sn=ke,dn=Ne,Ft=ne,fn=j}Ke("setSize"),El=!1}wt>0&&un>0&&(p.clearRect(0,0,v.width,v.height),Ke("drawClear"),R.forEach(i=>i()),Ke("draw")),Se.show&&Tl&&(Rl(Se),Tl=!1),Ye&&pn&&(gn(null,!0,!1),pn=!1),te.show&&te.live&&xt&&(As(),xt=!1),c||(c=!0,n.status=1,Ke("ready")),ol=!1,Pl=!1}n.redraw=(i,u)=>{Mn=u||!1,i!==!1?nn(M,T.min,T.max):Pn()};function Ms(i,u){let f=S[i];if(f.from==null){if(Je==0){let h=f.range(n,u.min,u.max,i);u.min=h[0],u.max=h[1]}if(u.min>u.max){let h=u.min;u.min=u.max,u.max=h}if(Je>1&&u.min!=null&&u.max!=null&&u.max-u.min<1e-16)return;i==M&&f.distr==2&&Je>0&&(u.min=It(u.min,t[0]),u.max=It(u.max,t[0]),u.min==u.max&&u.max++),B[i]=u,fs=!0,Pn()}}n.setScale=Ms;let Es,Ts,Rn,On,Bo,jo,In,zn,Uo,Wo,xe,Te,tn=!1;const Qe=K.drag;let We=Qe.x,qe=Qe.y;Ye&&(K.x&&(Es=Tt(lf,x)),K.y&&(Ts=Tt(sf,x)),T.ori==0?(Rn=Es,On=Ts):(Rn=Ts,On=Es),xe=K.left,Te=K.top);const Se=n.select=Ve({show:!0,over:!0,left:0,width:0,top:0,height:0},e.select),Vn=Se.show?Tt(nf,Se.over?x:$):null;function Rl(i,u){if(Se.show){for(let f in i)Se[f]=i[f],f in Ls&&Ee(Vn,f,i[f]);u!==!1&&Ke("setSelect")}}n.setSelect=Rl;function rc(i){if(k[i].show)Re&&to(we[i],_n);else if(Re&&gt(we[i],_n),Ye){let f=Tn?St[0]:St[i];f!=null&&qt(f,-10,-10,ne,j)}}function nn(i,u,f){Ms(i,{min:u,max:f})}function Bt(i,u,f,h){u.focus!=null&&fc(i),u.show!=null&&k.forEach((y,b)=>{b>0&&(i==b||i==null)&&(y.show=u.show,rc(b),s==2?(nn(y.facets[0].scale,null,null),nn(y.facets[1].scale,null,null)):nn(y.scale,null,null),Pn())}),f!==!1&&Ke("setSeries",i,u),h&&ul("setSeries",n,i,u)}n.setSeries=Bt;function ac(i,u){Ve(_[i],u)}function cc(i,u){i.fill=ie(i.fill||null),i.dir=pe(i.dir,-1),u=u??_.length,_.splice(u,0,i)}function uc(i){i==null?_.length=0:_.splice(i,1)}n.addBand=cc,n.setBand=ac,n.delBand=uc;function dc(i,u){k[i].alpha=u,Ye&&St[i]!=null&&(St[i].style.opacity=u),Re&&we[i]&&(we[i].style.opacity=u)}let Jt,ln,vn;const Nn={focus:!0};function fc(i){if(i!=vn){let u=i==null,f=Ht.alpha!=1;k.forEach((h,y)=>{if(s==1||y>0){let b=u||y==0||y==i;h._focus=u?null:b,f&&dc(y,b?1:Ht.alpha)}}),vn=i,f&&Pn()}}Re&&En&&Ie(zi,ae,i=>{K._lock||(hn(i),vn!=null&&Bt(null,Nn,!0,ze.setSeries))});function jt(i,u,f){let h=S[u];f&&(i=i/me-(h.ori==1?Ne:ke));let y=ne;h.ori==1&&(y=j,i=y-i),h.dir==-1&&(i=y-i);let b=h._min,A=h._max,L=i/y,I=b+(A-b)*L,F=h.distr;return F==3?Qn(10,I):F==4?wf(I,h.asinh):F==100?h.bwd(I):I}function pc(i,u){let f=jt(i,M,u);return It(f,t[0],je,Ue)}n.valToIdx=i=>It(i,t[0]),n.posToIdx=pc,n.posToVal=jt,n.valToPos=(i,u,f)=>S[u].ori==0?o(i,S[u],f?dt:ne,f?pt:0):r(i,S[u],f?Lt:j,f?kt:0),n.setCursor=(i,u,f)=>{xe=i.left,Te=i.top,gn(null,u,f)};function qo(i,u){Ee(Vn,Bn,Se.left=i),Ee(Vn,ml,Se.width=u)}function Ko(i,u){Ee(Vn,fl,Se.top=i),Ee(Vn,vl,Se.height=u)}let rl=T.ori==0?qo:Ko,al=T.ori==1?qo:Ko;function hc(){if(Re&&te.live)for(let i=s==2?1:0;i<k.length;i++){if(i==0&&Ze)continue;let u=te.values[i],f=0;for(let h in u)_t[i][f++].firstChild.nodeValue=u[h]}}function As(i,u){if(i!=null&&(i.idxs?i.idxs.forEach((f,h)=>{de[h]=f}):Mf(i.idx)||de.fill(i.idx),te.idx=de[0]),Re&&te.live){for(let f=0;f<k.length;f++)(f>0||s==1&&!Ze)&&mc(f,de[f]);hc()}xt=!1,u!==!1&&Ke("setLegend")}n.setLegend=As;function mc(i,u){let f=k[i],h=i==0&&W==2?Dt:t[i],y;Ze?y=f.values(n,i,u)??Nt:(y=f.value(n,u==null?null:h[u],i,u),y=y==null?Nt:{_:y}),te.values[i]=y}function gn(i,u,f){Uo=xe,Wo=Te,[xe,Te]=K.move(n,xe,Te),K.left=xe,K.top=Te,Ye&&(Rn&&qt(Rn,Fe(xe),0,ne,j),On&&qt(On,0,Fe(Te),ne,j));let h,y=je>Ue;Jt=$e,ln=null;let b=T.ori==0?ne:j,A=T.ori==1?ne:j;if(xe<0||Je==0||y){h=K.idx=null;for(let L=0;L<k.length;L++){let I=St[L];I!=null&&qt(I,-10,-10,ne,j)}En&&Bt(null,Nn,!0,i==null&&ze.setSeries),te.live&&(de.fill(h),xt=!0)}else{let L,I,F;s==1&&(L=T.ori==0?xe:Te,I=jt(L,M),h=K.idx=It(I,t[0],je,Ue),F=z(t[0][h],T,b,0));let H=-10,U=-10,X=0,he=0,fe=!0,se="",Q="";for(let G=s==2?1:0;G<k.length;G++){let Me=k[G],Le=de[G],Ge=Le==null?null:s==1?t[G][Le]:t[G][1][Le],ge=K.dataIdx(n,G,h,I),De=ge==null?null:s==1?t[G][ge]:t[G][1][ge];if(xt=xt||De!=Ge||ge!=Le,de[G]=ge,G>0&&Me.show){let ht=ge==null?-10:ge==h?F:z(s==1?t[0][ge]:t[G][0][ge],T,b,0),lt=De==null?-10:q(De,s==1?S[Me.scale]:S[Me.facets[1].scale],A,0);if(En&&De!=null){let Mt=T.ori==1?xe:Te,Pt=He(Ht.dist(n,G,ge,lt,Mt));if(Pt<Jt){let Ut=Ht.bias;if(Ut!=0){let mt=jt(Mt,Me.scale),Et=De>=0?1:-1,Rt=mt>=0?1:-1;Rt==Et&&(Rt==1?Ut==1?De>=mt:De<=mt:Ut==1?De<=mt:De>=mt)&&(Jt=Pt,ln=G)}else Jt=Pt,ln=G}}if(xt||Tn){let Mt,Pt;T.ori==0?(Mt=ht,Pt=lt):(Mt=lt,Pt=ht);let Ut,mt,Et,Rt,Wt,st,vt=!0,yn=et.bbox;if(yn!=null){vt=!1;let ot=yn(n,G);Et=ot.left,Rt=ot.top,Ut=ot.width,mt=ot.height}else Et=Mt,Rt=Pt,Ut=mt=et.size(n,G);if(st=et.fill(n,G),Wt=et.stroke(n,G),Tn)G==ln&&Jt<=Ht.prox&&(H=Et,U=Rt,X=Ut,he=mt,fe=vt,se=st,Q=Wt);else{let ot=St[G];ot!=null&&(An[G]=Et,Cn[G]=Rt,Ui(ot,Ut,mt,vt),Bi(ot,st,Wt),qt(ot,At(Et),At(Rt),ne,j))}}}}if(Tn){let G=Ht.prox,Me=vn==null?Jt<=G:Jt>G||ln!=vn;if(xt||Me){let Le=St[0];Le!=null&&(An[0]=H,Cn[0]=U,Ui(Le,X,he,fe),Bi(Le,se,Q),qt(Le,At(H),At(U),ne,j))}}}if(Se.show&&tn)if(i!=null){let[L,I]=ze.scales,[F,H]=ze.match,[U,X]=i.cursor.sync.scales,he=i.cursor.drag;if(We=he._x,qe=he._y,We||qe){let{left:fe,top:se,width:Q,height:G}=i.select,Me=i.scales[U].ori,Le=i.posToVal,Ge,ge,De,ht,lt,Mt=L!=null&&F(L,U),Pt=I!=null&&H(I,X);Mt&&We?(Me==0?(Ge=fe,ge=Q):(Ge=se,ge=G),De=S[L],ht=z(Le(Ge,U),De,b,0),lt=z(Le(Ge+ge,U),De,b,0),rl(zt(ht,lt),He(lt-ht))):rl(0,b),Pt&&qe?(Me==1?(Ge=fe,ge=Q):(Ge=se,ge=G),De=S[I],ht=q(Le(Ge,X),De,A,0),lt=q(Le(Ge+ge,X),De,A,0),al(zt(ht,lt),He(lt-ht))):al(0,A)}else Ds()}else{let L=He(Uo-Bo),I=He(Wo-jo);if(T.ori==1){let X=L;L=I,I=X}We=Qe.x&&L>=Qe.dist,qe=Qe.y&&I>=Qe.dist;let F=Qe.uni;F!=null?We&&qe&&(We=L>=F,qe=I>=F,!We&&!qe&&(I>L?qe=!0:We=!0)):Qe.x&&Qe.y&&(We||qe)&&(We=qe=!0);let H,U;We&&(T.ori==0?(H=In,U=xe):(H=zn,U=Te),rl(zt(H,U),He(U-H)),qe||al(0,A)),qe&&(T.ori==1?(H=In,U=xe):(H=zn,U=Te),al(zt(H,U),He(U-H)),We||rl(0,b)),!We&&!qe&&(rl(0,0),al(0,0))}if(Qe._x=We,Qe._y=qe,i==null){if(f){if(si!=null){let[L,I]=ze.scales;ze.values[0]=L!=null?jt(T.ori==0?xe:Te,L):null,ze.values[1]=I!=null?jt(T.ori==1?xe:Te,I):null}ul(Fs,n,xe,Te,ne,j,h)}if(En){let L=f&&ze.setSeries,I=Ht.prox;vn==null?Jt<=I&&Bt(ln,Nn,!0,L):Jt>I?Bt(null,Nn,!0,L):ln!=vn&&Bt(ln,Nn,!0,L)}}xt&&(te.idx=h,As()),u!==!1&&Ke("setCursor")}let sn=null;Object.defineProperty(n,"rect",{get(){return sn==null&&cl(!1),sn}});function cl(i=!1){i?sn=null:(sn=x.getBoundingClientRect(),Ke("syncRect",sn))}function Go(i,u,f,h,y,b,A){K._lock||tn&&i!=null&&i.movementX==0&&i.movementY==0||(Cs(i,u,f,h,y,b,A,!1,i!=null),i!=null?gn(null,!0,!0):gn(u,!0,!1))}function Cs(i,u,f,h,y,b,A,L,I){if(sn==null&&cl(!1),hn(i),i!=null)f=i.clientX-sn.left,h=i.clientY-sn.top;else{if(f<0||h<0){xe=-10,Te=-10;return}let[F,H]=ze.scales,U=u.cursor.sync,[X,he]=U.values,[fe,se]=U.scales,[Q,G]=ze.match,Me=u.axes[0].side%2==1,Le=T.ori==0?ne:j,Ge=T.ori==1?ne:j,ge=Me?b:y,De=Me?y:b,ht=Me?h:f,lt=Me?f:h;if(fe!=null?f=Q(F,fe)?a(X,S[F],Le,0):-10:f=Le*(ht/ge),se!=null?h=G(H,se)?a(he,S[H],Ge,0):-10:h=Ge*(lt/De),T.ori==1){let Mt=f;f=h,h=Mt}}I&&(u==null||u.cursor.event.type==Fs)&&((f<=1||f>=ne-1)&&(f=$n(f,ne)),(h<=1||h>=j-1)&&(h=$n(h,j))),L?(Bo=f,jo=h,[In,zn]=K.move(n,f,h)):(xe=f,Te=h)}const Ls={width:0,height:0,left:0,top:0};function Ds(){Rl(Ls,!1)}let Yo,Jo,Qo,Zo;function Xo(i,u,f,h,y,b,A){tn=!0,We=qe=Qe._x=Qe._y=!1,Cs(i,u,f,h,y,b,A,!0,!1),i!=null&&(Ie(Hs,Xs,ei,!1),ul(Oi,n,In,zn,ne,j,null));let{left:L,top:I,width:F,height:H}=Se;Yo=L,Jo=I,Qo=F,Zo=H}function ei(i,u,f,h,y,b,A){tn=Qe._x=Qe._y=!1,Cs(i,u,f,h,y,b,A,!1,!0);let{left:L,top:I,width:F,height:H}=Se,U=F>0||H>0,X=Yo!=L||Jo!=I||Qo!=F||Zo!=H;if(U&&X&&Rl(Se),Qe.setScale&&U&&X){let he=L,fe=F,se=I,Q=H;if(T.ori==1&&(he=I,fe=H,se=L,Q=F),We&&nn(M,jt(he,M),jt(he+fe,M)),qe)for(let G in S){let Me=S[G];G!=M&&Me.from==null&&Me.min!=$e&&nn(G,jt(se+Q,G),jt(se,G))}Ds()}else K.lock&&(K._lock=!K._lock,gn(u,!0,i!=null));i!=null&&(Xe(Hs,Xs),ul(Hs,n,xe,Te,ne,j,null))}function vc(i,u,f,h,y,b,A){if(K._lock)return;hn(i);let L=tn;if(tn){let I=!0,F=!0,H=10,U,X;T.ori==0?(U=We,X=qe):(U=qe,X=We),U&&X&&(I=xe<=H||xe>=ne-H,F=Te<=H||Te>=j-H),U&&I&&(xe=xe<In?0:ne),X&&F&&(Te=Te<zn?0:j),gn(null,!0,!0),tn=!1}xe=-10,Te=-10,de.fill(null),gn(null,!0,!0),L&&(tn=L)}function ti(i,u,f,h,y,b,A){K._lock||(hn(i),hs(),Ds(),i!=null&&ul(Vi,n,xe,Te,ne,j,null))}function ni(){C.forEach(Bp),ps(n.width,n.height,!0)}wn(Gl,Yn,ni);const Fn={};Fn.mousedown=Xo,Fn.mousemove=Go,Fn.mouseup=ei,Fn.dblclick=ti,Fn.setSeries=(i,u,f,h)=>{let y=ze.match[2];f=y(n,u,f),f!=-1&&Bt(f,h,!0,!1)},Ye&&(Ie(Oi,x,Xo),Ie(Fs,x,Go),Ie(Ii,x,i=>{hn(i),cl(!1)}),Ie(zi,x,vc),Ie(Vi,x,ti),ro.add(n),n.syncRect=cl);const Ol=n.hooks=e.hooks||{};function Ke(i,u,f){Ss?il.push([i,u,f]):i in Ol&&Ol[i].forEach(h=>{h.call(null,n,u,f)})}(e.plugins||[]).forEach(i=>{for(let u in i.hooks)Ol[u]=(Ol[u]||[]).concat(i.hooks[u])});const li=(i,u,f)=>f,ze=Ve({key:null,setSeries:!1,filters:{pub:Yi,sub:Yi},scales:[M,k[1]?k[1].scale:null],match:[Ji,Ji,li],values:[null,null]},K.sync);ze.match.length==2&&ze.match.push(li),K.sync=ze;const si=ze.key,Ps=Ea(si);function ul(i,u,f,h,y,b,A){ze.filters.pub(i,u,f,h,y,b,A)&&Ps.pub(i,u,f,h,y,b,A)}Ps.sub(n);function gc(i,u,f,h,y,b,A){ze.filters.sub(i,u,f,h,y,b,A)&&Fn[i](null,u,f,h,y,b,A)}n.pub=gc;function yc(){Ps.unsub(n),ro.delete(n),Oe.clear(),no(Gl,Yn,ni),d.remove(),ae==null||ae.remove(),Ke("destroy")}n.destroy=yc;function Rs(){Ke("init",e,t),Ro(t||e.data,!1),B[M]?Ms(M,B[M]):hs(),Tl=Se.show&&(Se.width>0||Se.height>0),pn=xt=!0,ps(e.width,e.height)}return k.forEach(Do),C.forEach(Ja),l?l instanceof HTMLElement?(l.appendChild(d),Rs()):l(n,Rs):Rs(),n}nt.assign=Ve;nt.fmtNum=$o;nt.rangeNum=Yl;nt.rangeLog=os;nt.rangeAsinh=go;nt.orient=xn;nt.pxRatio=me;nt.join=Pf;nt.fmtDate=_o,nt.tzDate=Uf;nt.sync=Ea;{nt.addGap=Mp,nt.clipGaps=as;let e=nt.paths={points:Pa};e.linear=Oa,e.stepped=Ap,e.bars=Cp,e.spline=Dp}function jp(e){let t;return{hooks:{init(l){t=document.createElement("div"),t.className="chart-tooltip",t.style.display="none",l.over.appendChild(t)},setCursor(l){const n=l.cursor.idx;if(n==null||!l.data[1]||l.data[1][n]==null){t.style.display="none";return}const s=l.data[0][n],o=l.data[1][n],r=new Date(s*1e3).toLocaleTimeString([],{hourCycle:"h23"});t.innerHTML=`<b>${e?e(o):yt(o)}</b> ${r}`;const a=Math.round(l.valToPos(s,"x"));t.style.left=Math.min(a,l.over.clientWidth-80)+"px",t.style.display=""}}}}function Up(e,t){if(typeof document>"u")return`rgba(100,100,100,${t})`;const l=document.createElement("span");l.style.color=e,document.body.appendChild(l);const n=getComputedStyle(l).color;l.remove();const s=n.match(/[\d.]+/g);return s&&s.length>=3?`rgba(${s[0]},${s[1]},${s[2]},${t})`:`rgba(100,100,100,${t})`}function Wp({data:e,color:t,smooth:l,height:n,yMax:s,fmtVal:o,ariaLabel:r,ariaHidden:a}){const c=Z(null),d=Z(null),v=n||55;return oe(()=>{if(!c.current||!e||e[0].length<2)return;const p=l?Lc(e[1]):e[1],m=[e[0],p];if(d.current){d.current.setData(m);return}const $=s?(D,w,E)=>[0,Math.max(s,E*1.05)]:(D,w,E)=>[Math.max(0,w*.9),E*1.1],x={width:c.current.clientWidth||200,height:v,padding:[2,0,4,0],cursor:{show:!0,x:!0,y:!1,points:{show:!1}},legend:{show:!1},select:{show:!1},scales:{x:{time:!0},y:{auto:!0,range:$}},axes:[{show:!1,size:0,gap:0},{show:!1,size:0,gap:0}],series:[{},{stroke:Dc(t),width:1.5,fill:Up(t,.09)}],plugins:[jp(o)]};return d.current=new nt(x,m,c.current),()=>{d.current&&(d.current.destroy(),d.current=null)}},[e,t,l]),oe(()=>{if(!d.current||!c.current)return;const p=new ResizeObserver(()=>{d.current&&c.current&&d.current.setSize({width:c.current.clientWidth,height:v})});return p.observe(c.current),()=>p.disconnect()},[]),g`<div class="chart-wrap"
    role=${a?null:"img"}
    aria-hidden=${a?"true":null}
    aria-label=${a?null:r||"Sparkline chart"}
    style=${"height:"+v+"px"} ref=${c}></div>`}function qp(e){if(!e||!e[1])return null;const t=e[1].filter(s=>s!=null&&!isNaN(s));if(t.length<2)return null;const l=t[0],n=t[t.length-1];if(l>0){const s=(n-l)/l*100;return Math.abs(s)<1?null:{dir:s>0?"▲":"▼",pct:Math.round(Math.abs(s))}}return n>0?{dir:"▲",pct:null}:null}function Kp({label:e,value:t,valColor:l,data:n,chartColor:s,smooth:o,refLines:r,yMax:a,dp:c,iconName:d}){const v=Ae(()=>{if(!n||!n[1]||n[1].length<2)return[];const m=a?Math.max(a,n[1].reduce(($,x)=>Math.max($,x),0)*1.05):n[1].reduce(($,x)=>Math.max($,x),0)*1.1;return(r||[]).map($=>{if(m<=0)return null;const x=(1-$.value/m)*100;return x>=0&&x<=95?{...$,pct:x}:null}).filter(Boolean)},[n,r,a]),p=Ae(()=>qp(n),[n]);return g`<div class="chart-box" role="img" aria-label=${"Chart: "+e+" — current value: "+(t||"no data")} ...${c?{"data-dp":c}:{}}>
    <div class="chart-hdr">
      <span class="chart-label">${d?g`<${Vt} name=${d} size="0.85em"/> `:""}${e}</span>
      <span class="chart-val-group">
        ${p?g`<span class="chart-trend" aria-hidden="true">${p.dir}${p.pct!=null?" "+p.pct+"%":""}</span>`:""}
        <span class="chart-val" style=${l?"color:"+l:null} aria-live="polite" aria-atomic="true">${t}</span>
      </span>
    </div>
    <div style="position:relative">
      ${v.map((m,$)=>g`<${ri} key=${m.label??$}>
          <div class="chart-ref-line" style=${"top:"+m.pct+"%"} />
          <div class="chart-ref-label" style=${"top:calc("+m.pct+"% - 8px)"}>${m.label}</div>
        </${ri}>`)}
      ${n&&n[0].length>=2?g`<${Wp} data=${n} color=${s||"var(--accent)"} smooth=${o} yMax=${a} ariaHidden=${!0}/>`:g`<div class="chart-wrap text-muted" style="display:flex;align-items:center;justify-content:center;font-size:var(--fs-base)">collecting...</div>`}
    </div>
  </div>`}function Gp({pct:e,direction:t,inverse:l=!1,compareLabel:n}){if(e==null||t==null)return null;const s=t==="flat"||e===0,o=s?"•":t==="up"?"▲":"▼";let r="neutral";s||(r=(l?t==="down":t==="up")?"success":"danger");const a=Number.isFinite(e)?Math.abs(e).toFixed(Math.abs(e)>=10?0:1):"0",c=g`<${ki} variant=${r} size="sm"
    aria-label=${"Delta: "+o+" "+a+"%"+(n?" vs "+n:"")}
  >${o} ${a}%</${ki}>`;return n?g`<${xi} content=${"vs. "+n}>${c}</${xi}>`:c}function co({label:e,value:t,accent:l,dp:n,sm:s,delta:o,deltaInverse:r}){const a=Z(t),[c,d]=ee(!1);return oe(()=>{a.current!==t&&(d(!0),setTimeout(()=>d(!1),500)),a.current=t},[t]),g`<div class=${"metric"+(s?" metric--sm":"")} aria-label="${e}: ${t}" ...${n?{"data-dp":n}:{}}>
    <div class="label">${e}</div>
    <div class=${"value"+(l?" accent":"")+(c?" flash":"")} aria-live="polite" aria-atomic="true">${t}</div>
    ${o?g`<div class="metric-delta"><${Gp}
      pct=${o.pct} direction=${o.direction}
      inverse=${r} compareLabel=${o.compareLabel}/></div>`:null}
  </div>`}function yr({snap:e,mode:t}){if(!e)return null;const l=!t||t==="files",n=!t||t==="traffic",s=e.tools.filter(d=>{var v;return d.tool!=="aictl"&&((v=d.files)==null?void 0:v.length)}),o=s.reduce((d,v)=>d+v.files.length,0)||1,r=d=>(Number(d.live.outbound_rate_bps)||0)+(Number(d.live.inbound_rate_bps)||0),a=e.tools.filter(d=>d.tool!=="aictl"&&d.live&&r(d)>0),c=a.reduce((d,v)=>d+r(v),0)||1;return g`
    ${l&&s.length>0&&g`<div class="rbar-block" data-dp="overview.csv_footprint_bar" role="img" aria-label=${"CSV footprint: "+s.map(d=>d.label+" "+d.files.length+" files").join(", ")}>
      <div class="rbar-title">CSV Footprint</div>
      <div class="rbar">${s.map(d=>g`
        <div class="rbar-seg" style=${"width:"+(d.files.length/o*100).toFixed(1)+"%;background:"+(hl[d.tool]||"var(--fg2)")}
          title="${d.label}: ${d.files.length} files"></div>`)}
      </div>
      <div class="rbar-legend">${s.map(d=>g`
        <span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(hl[d.tool]||"var(--fg2)")}></span>
          ${d.label} <span class="text-muted">${d.files.length} files</span>
        </span>`)}
      </div>
    </div>`}
    ${n&&g`<div class="rbar-block" data-dp="overview.live_traffic_bar" role="img" aria-label=${"Live traffic: "+(a.length?a.map(d=>d.label).join(", "):"no active traffic")}>
      <div class="rbar-title">Live Traffic${a.length===0?" — no active traffic":""}</div>
      <div class="rbar">${a.map(d=>{const v=r(d);return g`<div class="rbar-seg" style=${"width:"+(v/c*100).toFixed(1)+"%;background:"+(hl[d.tool]||"var(--fg2)")}
          title="${d.label}: ${ai(v)}"></div>`})}
      </div>
      <div class="rbar-legend">${a.map(d=>{const v=r(d);return g`<span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(hl[d.tool]||"var(--fg2)")}></span>
          ${d.label} <span class="text-muted">${ai(v)}</span>
        </span>`})}
      </div>
    </div>`}
    ${!t&&!s.length&&!a.length&&g`<div class="empty-state">
      No AI tool resources found yet.
      <small class="empty-state-source">/api/snapshot · tools[].files · tools[].live</small>
    </div>`}`}const Yp=18e4;function Jp({loading:e,error:t,data:l,isEmpty:n,updatedAt:s,staleMs:o=Yp,now:r=Date.now()}){return l!=null?n&&n(l)?t?"error":"empty":t||s&&r-s>o?"stale":"ready":t?"error":e?"loading":"empty"}function Qp(e){return e&&(typeof e=="string"?e:e.message)||"The request failed."}function an({status:e,error:t,updatedAt:l,onRetry:n,emptyTitle:s="No data",emptyHint:o,emptyFix:r,skeletonHeight:a="72px",label:c,children:d}){if(e==="loading")return g`<div class="panel-state panel-state--loading" role="status" aria-busy="true"
      aria-label=${"Loading "+(c||"panel")}>
      <${Gn} height=${a} radius="var(--radius-sm)"/>
    </div>`;if(e==="error")return g`<div class="panel-state panel-state--error" role="alert">
      <${Vt} name="alert-triangle" size="14"/>
      <div>
        <div class="panel-state__title">Could not load ${c||"this panel"}</div>
        <div class="panel-state__hint">${Qp(t)}</div>
      </div>
      ${n&&g`<button type="button" class="range-btn" onClick=${n}>Retry</button>`}
    </div>`;if(e==="empty")return g`<div class="panel-state panel-state--empty" role="status">
      <div class="panel-state__title">${s}</div>
      ${o&&g`<div class="panel-state__hint">${o}</div>`}
      ${r&&g`<code class="panel-state__fix">${r}</code>`}
    </div>`;const v=l?Math.max(0,Math.round((Date.now()-l)/1e3)):null;return g`
    ${e==="stale"&&g`<div class="panel-state panel-state--stale" role="status">
      <${Vt} name="clock" size="12"/>
      <span>${t?"Refresh failed. ":""}Showing data from ${v!=null?fo(v)+" ago":"an earlier fetch"}.</span>
      ${n&&g`<button type="button" class="panel-state__retry" onClick=${n}>Retry</button>`}
    </div>`}
    ${d}`}function Zp({enabledTools:e,snap:t,what:l="this screen"}){const n=Pc(e),s=Rc(e,t);return g`<div class="panel-state panel-state--empty" role="status" data-testid="tool-scope-empty">
    <${Vt} name="filter" size="14"/>
    <div>
      <div class="panel-state__title">${n?"No tools are selected":"The selected tools have no data here"}</div>
      <div class="panel-state__hint">${n?`The tool filter in the header has no tool ticked, so ${l} shows nothing. Tick a tool, or choose All tools.`:`${s.join(", ")} ${s.length===1?"has":"have"} nothing to show on ${l}. Tick more tools in the header filter, or choose All tools.`}</div>
    </div>
  </div>`}function Xp({perCore:e}){if(!e||!e.length)return null;const t=100;return g`<div class="mb-sm" style="display:flex;gap:2px;align-items:end;height:40px">
    ${e.map((l,n)=>{const s=Math.max(1,l/t*100),o=l>80?"var(--red)":l>50?"var(--orange)":l>20?"var(--green)":"var(--fg2)";return g`<div key=${n} title=${"Core "+n+": "+$l(l)}
        style=${"flex:1;min-width:3px;background:"+o+";height:"+s+"%;border-radius:1px;opacity:0.8;transition:height 0.3s"}/>`})}
  </div>`}function eh({mcpDetail:e}){return e!=null&&e.length?g`<div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
    ${e.map(t=>{const l=Oc[t.status]||"var(--fg3)";return g`<div key=${t.name+t.tool}
        style="display:flex;align-items:center;gap:var(--sp-2);padding:3px var(--sp-3);
               border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent)"
        title=${t.status+(t.pid?" PID "+t.pid:"")+(t.transport?" · "+t.transport:"")}>
        <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${l}"></span>
        <span class="mono" style="font-size:var(--fs-xs);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${qn(t.name)}</span>
        <span style="font-size:var(--fs-2xs);color:${Ic(t.tool)};white-space:nowrap;flex-shrink:0">${qn(t.tool)}</span>
      </div>`})}
  </div>`:g`<div style="color:var(--fg3);font-size:var(--fs-sm);padding:var(--sp-2) 0">None configured</div>`}function th({label:e,value:t,mcpDetail:l}){const[n,s]=ee(!1);return g`<div style="position:relative;cursor:default"
    tabindex="0"
    onMouseEnter=${()=>s(!0)} onMouseLeave=${()=>s(!1)}
    onFocusIn=${()=>s(!0)} onFocusOut=${()=>s(!1)}>
    <${co} label=${e} value=${t} sm=${!0}/>
    ${n&&g`<div style="position:absolute;top:calc(100% + 6px);left:0;z-index:200;
        min-width:260px;background:var(--bg);border:1px solid var(--border);border-radius:6px;
        box-shadow:0 4px 20px rgba(0,0,0,0.35);padding:var(--sp-3)">
      <div class="metric-group-label" style="padding:0 0 var(--sp-2)">MCP Servers</div>
      <${eh} mcpDetail=${l}/>
    </div>`}
  </div>`}const nh=new Set(["cpu","mem_mb","tokens"]);function lh({snap:e,history:t,enabledTools:l=null}){const n=jl(l),s=Ae(()=>n&&e?{...e,...ou(e)}:e,[n,e]),o=Ae(()=>iu(t,l),[t,l]),[r,a]=ee(()=>{try{return localStorage.getItem("aictl-header-expanded")!=="false"}catch{return!0}}),c=re(()=>{a(m=>{const $=!m;try{localStorage.setItem("aictl-header-expanded",String($))}catch{}return $})},[]),d=m=>o!=null&&o.ts&&o.ts.length>=2&&(!n||nh.has(m))?[o.ts,o[m]]:null,v=(s==null?void 0:s.cpu_cores)||1,p={cores:v};return n&&!((s==null?void 0:s.tools)||[]).some(m=>m.tool!=="aictl")?g`<${Zp} enabledTools=${l} snap=${s} what="the overview totals"/>`:g`
    <div class="grid-sparklines">
      ${yl.sparklines.map(m=>{const $=s?s["total_"+m.field]??s[m.field]??"":"",x=Os($,m.format,m.suffix,m.multiply),D=m.yMaxExpr?ci(m.yMaxExpr,p):void 0,w=(m.refLines||[]).map(E=>({value:ci(E.valueExpr,p),label:(E.label||"").replace("{cores}",v)})).filter(E=>E.value!=null);return g`<${Kp} key=${m.field} label=${m.label} value=${x}
          data=${d(m.field)} chartColor=${m.color||"var(--accent)"}
          smooth=${!!m.smooth} refLines=${w.length?w:void 0}
          yMax=${D} dp=${m.dp} iconName=${m.iconName}/>`})}
    </div>

    <div class=${r?"header-sections header-sections--expanded":"header-sections header-sections--collapsed"}>
      <div class="mb-sm header-top-row">
        <div>
          <div class="metric-group-label">CPU Cores${n?" (whole machine, all tools)":""}</div>
          <${Xp} perCore=${(s==null?void 0:s.cpu_per_core)||[]}/>
          <div style="margin-top:var(--sp-3)"><${yr} snap=${s} mode="traffic"/></div>
        </div>
        <div>
          <div class="metric-group-label">Live Monitor</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2)">
            ${yl.liveMetrics.map(m=>{const $=s?s[m.field]??"":"",x=Os($,m.format,m.suffix,m.multiply);return g`<${co} key=${m.field} label=${m.label} value=${x}
                accent=${!!m.accent} dp=${m.dp} sm=${!0}/>`})}
          </div>
        </div>
      </div>
      <div class="mb-sm">
        <div class="metric-group-label">Inventory</div>
        <div class="grid-inventory">
          ${yl.inventory.map(m=>{const $=s?s[m.field]??"":"",x=Os($,m.format,m.suffix,m.multiply);return m.field==="total_mcp_servers"?g`<${th} key=${m.field} label=${m.label} value=${x}
                mcpDetail=${(s==null?void 0:s.mcp_detail)||[]}/>`:g`<${co} key=${m.field} label=${m.label} value=${x}
              accent=${!!m.accent} dp=${m.dp} sm=${!0}/>`})}
        </div>
      </div>
      <div class="mb-sm"><${yr} snap=${s} mode="files"/></div>
    </div>
    <button class="header-toggle" onClick=${c} aria-label="Toggle details"
      aria-expanded=${r}>
      <span aria-hidden="true">${r?"▲":"▼"}</span> ${r?"less":"more"}
    </button>
  `}const $r={error:0,warn:1,info:2};function br(e,t){if(e==="claude-code")return`aictl hooks install --port ${t}`;const l=["copilot","gemini","codex"].find(n=>String(e).startsWith(n));return`aictl enable${l?" --tool "+l:""} --port ${t}`}function _r(e){return String(e||"").split("-")[0]}function sh(e,t,l=null){var r,a,c;if(!(e!=null&&e.tools))return[];const n=[],s=e.server_port,o=t?new Set([...t].map(_r)):null;for(const d of Object.values(e.tools))if(es(d.tool,l)){if(d.status==="missing"){if(o&&!o.has(_r(d.tool)))continue;const v=br(d.tool,s);n.push({id:"hooks:"+d.tool,level:"warn",title:`${d.tool}: hooks not installed`,detail:"No per-tool-call events, so the tool, skill and subagent panels stay empty.",fix:v})}else if(d.status==="disabled"){const v=((r=(d.sources||[]).find(p=>p.host_reason&&!p.host_enabled))==null?void 0:r.host_reason)||"The host tool has hooks turned off.";n.push({id:"hooks:"+d.tool,level:"warn",title:`${d.tool}: hooks disabled by host`,detail:v,fix:v.startsWith("chat.hookFilesLocations")?`Set ${v.replace(/ is false$/,"")} to true in VS Code settings`:null})}else if(d.status==="misconfigured"||d.status==="fail"){const v=(a=d.warnings)==null?void 0:a[0],p=((c=d.warnings)==null?void 0:c.length)>1?`, +${d.warnings.length-1} more`:"";n.push({id:"hooks:"+d.tool,level:"error",title:`${d.tool}: hooks misconfigured`,detail:v?`${v.message} (${v.path}${p})`:"Hook checks failed.",fix:br(d.tool,s)})}}return!jl(l)&&e.total_configured>0&&e.total_fired_24h===0&&n.length===0&&n.push({id:"hooks:silent",level:"warn",title:`${e.total_configured} hooks configured, 0 fired in 24 h`,detail:"Hooks are installed but no event has reached this dashboard.",fix:null}),n}function oh(e){const t=[];for(const l of(e==null?void 0:e.items)||[])l.status==="ok"||l.severity==="info"||l.status!=="source_missing"&&t.push({id:"quality:"+l.component,level:l.severity==="error"?"error":"warn",title:`${l.component}: ${l.status}`,detail:l.message+(l.source?` (${l.source})`:""),fix:null});return t}function ih({connected:e,snapAgeS:t,hooks:l,quality:n,otelActive:s,alerts:o=[],storage:r=null,hiddenContext:a,runningTools:c=null,enabledTools:d=null}){const v=[];(a==null?void 0:a.count)>0?v.push({id:"hidden-context",level:"warn",tab:"hidden",title:`${a.count} unseen context source${a.count===1?"":"s"} found`,detail:a.detail||"Text reaches a model without appearing in its visible configuration.",fix:null}):a===null&&v.push({id:"hidden-context",level:"info",tab:"hidden",title:"Hidden context not checked",detail:"No detector has reported for this build.",fix:null}),r!=null&&r.degraded?v.push({id:"storage",level:"error",title:"Storage degraded: capture is being reduced",detail:`${Ql(r)}. New data may lose text or be dropped until disk use is under budget.`,fix:null}):(r==null?void 0:r.pct)>=90&&v.push({id:"storage",level:"warn",title:`Storage at ${r.pct}% of budget`,detail:Ql(r),fix:null}),e===!1?v.push({id:"sse",level:"error",title:"Live stream disconnected",detail:"Figures show the last received values. Retrying automatically.",fix:"aictl daemon serve"}):t!=null&&t>60&&v.push({id:"stale",level:"warn",title:`Snapshot is ${Math.round(t)} s old`,detail:"The stream is connected but the collector stopped publishing.",fix:"aictl doctor"});for(const p of o)v.push({id:"alert:"+p.msg,level:p.level==="red"?"error":"warn",title:p.msg,detail:"The Processes tab lists the affected PIDs.",fix:null,tab:"procs"});return v.push(...sh(l,c,d),...oh(n)),s===!1&&v.push({id:"otel",level:"info",title:"OTel receiver has no data",detail:"Exact token and cost figures need it. Estimates are used until then.",fix:"aictl otel enable"}),v.sort((p,m)=>$r[p.level]-$r[m.level])}function To(e){var n;if(!e)return null;const t=e.storage_bytes??((n=e.db)==null?void 0:n.file_size_bytes)??null,l=e.storage_budget_bytes||null;return{mode:e.capture_mode||null,used:t,budget:l,pct:t!=null&&l?Math.round(t/l*100):null,degraded:!!e.storage_degraded}}function Ql(e){if(!e||e.used==null)return"Disk use not reported";const t=Kt(e.used);return e.budget?`${t} of ${Kt(e.budget)} (${e.pct}%)`:`${t}, no budget set`}function rh(e,t){return((e==null?void 0:e.sessions)||[]).filter(n=>n.tool&&es(n.tool,t)).sort((n,s)=>(s.cpu_percent||0)-(n.cpu_percent||0)||(s.last_seen_at||0)-(n.last_seen_at||0))}function ah(e){return/^[^:]+:\d+:\d+$/.test((e==null?void 0:e.session_id)||"")}function ch(e){const t=e.filter(ah).length,l=e.length-t,n=new Set(e.map(a=>a.tool)).size,s=`process tree${t===1?"":"s"}`,o=`session${l===1?"":"s"}`;return`${t&&l?`${l} ${o} and ${t} ${s}`:t?s:o} in ${n} tool${n===1?"":"s"}`}function uh(e){if(!(e.process_tree||[]).length)return e.mem_mb||0;let t=0;const l=n=>{for(const s of n||[])t+=s.mem_mb||0,l(s.children)};return l(e.process_tree),t}const Na="No price is known for this usage.";function uo(e,t=2){return"$"+Number(e).toLocaleString(void 0,{minimumFractionDigits:t,maximumFractionDigits:t})}function wr(e){return Number(e).toLocaleString(void 0,{maximumFractionDigits:2})}function Fa(e){return String(e||"").replace(/_/g," ").replace(/^ai\b/i,"AI")}function dh(e,t=2){const l=(e==null?void 0:e.cost_reason)||"";if(e!=null&&e.billing_unit&&e.billing_amount!==null&&e.billing_amount!==void 0){const n=[];return e.premium_requests&&n.push(wr(e.premium_requests)+" premium requests"),e.estimated_list_usd!==null&&e.estimated_list_usd!==void 0&&n.push("est. "+uo(e.estimated_list_usd,t)+" at list price"),{main:wr(e.billing_amount)+" "+Fa(e.billing_unit),sub:n.join(", "),title:l,kind:"billing"}}return(e==null?void 0:e.cost_usd)===null||(e==null?void 0:e.cost_usd)===void 0?{main:"n/a",sub:"",title:l||Na,kind:"none"}:{main:uo(e.cost_usd,t),sub:"est.",title:l||"Estimated from token counts and list prices. Not a billed amount.",kind:"estimate"}}function fh({row:e,digits:t=2,showSub:l=!0}){const n=dh(e,t);return g`<span class=${"cost-value cost-value--"+n.kind} title=${n.title}>${n.main}${l&&n.sub?g` <small class="cost-value__sub">${n.sub}</small>`:null}</span>`}function ph(e,t){const l=((e==null?void 0:e.tools)||[]).filter(c=>es(c.tool,t)).filter(c=>c.counted_in_totals!==!1),n=new Map;let s=0,o=null,r=0;const a=new Set;for(const c of l){if(c.billing_unit&&c.billing_amount!==null&&c.billing_amount!==void 0){n.set(c.billing_unit,(n.get(c.billing_unit)||0)+c.billing_amount),s+=c.premium_requests||0;continue}if(c.cost_usd===null||c.cost_usd===void 0){r+=1,c.cost_reason&&a.add(c.cost_reason);continue}o=(o||0)+c.cost_usd}return{rows:l.slice().sort((c,d)=>(d.total_tokens||0)-(c.total_tokens||0)),billed:[...n.entries()].map(([c,d])=>({unit:c,amount:d})),premium:s,listUsd:o,unpriced:r,unpricedReason:[...a].join(" "),tokens:l.reduce((c,d)=>c+(d.total_tokens||0),0),sessions:l.reduce((c,d)=>c+(d.sessions||0),0)}}function b0(e){var n;const t=(e||[]).filter(s=>s.cost_usd!==null&&s.cost_usd!==void 0);if(!t.length)return{cost_usd:null,cost_reason:(n=e==null?void 0:e.find(s=>s.cost_reason))==null?void 0:n.cost_reason};const l=e.length-t.length;return{cost_usd:t.reduce((s,o)=>s+o.cost_usd,0),cost_reason:l?`${l} of ${e.length} rows have no known price and are not included.`:""}}const Zl=Object.assign({"./HiddenContextPanel.js":()=>at(()=>import("./HiddenContextPanel-9E_H4vjP.js"),__vite__mapDeps([0,1,2,3,4,5]))})["./HiddenContextPanel.js"],kr=Zl?ct(Zl):null;async function hh(e=null){if(!Zl)return null;const t=await Zl();if(t.getHiddenContextSummary)return t.getHiddenContextSummary(e);try{return mh(zc(await Vc(),e))}catch{return null}}function mh(e){if(!(e!=null&&e.counts))return null;const t=["high","medium","low"].filter(l=>e.counts[l]).map(l=>`${e.counts[l]} ${l}`);return{count:["high","medium","low"].reduce((l,n)=>l+(e.counts[n]||0),0),detail:t.length?`Findings by severity: ${t.join(", ")}.`:""}}function vh(){return kr?g`<${Ul} fallback=${g`<${an} status="loading" label="hidden context"/>`}>
    <${kr}/>
  </${Ul}>`:g`<section class="now-panel" data-slot="hidden-context" aria-label="Hidden context">
      <${an} status="empty" emptyTitle="Hidden context detection is not in this build"
        emptyHint="This view lists prompts and context sources that reach a model without appearing in its visible configuration. Rebuild the dashboard once the detector ships."/>
    </section>`}const xr=8;function gh({snap:e,enabledTools:t,onOpenSession:l,onShowAll:n}){const s=Ae(()=>rh(e,t),[e,t]);return g`<section class="now-panel now-panel--running" aria-labelledby="now-running">
    <header class="now-panel__head">
      <h2 id="now-running">Running now</h2>
      ${!Kn(e,t)&&g`<span class="now-panel__figure">${s.length}</span>
      <span class="now-panel__sub">${ch(s)}</span>`}
    </header>
    ${s.length===0?g`<${an} status="empty" label="running sessions"
          emptyTitle=${Kn(e,t)?"Not available from this machine":t?"No sessions for the selected tools":"No live sessions"}
          emptyHint=${Kn(e,t)?"The selected tool runs in the vendor's cloud and has no local sessions.":t?"Widen the tool filter, or start a session in one of the selected tools.":"Start an AI coding tool. Sessions appear here within one sample interval."}/>`:g`<div class="now-table-wrap"><table class="now-table">
          <thead><tr>
            <th scope="col">Tool</th><th scope="col">Project</th>
            <th scope="col" class="num">Age</th><th scope="col" class="num">CPU</th>
            <th scope="col" class="num">RAM</th><th scope="col" class="num">Tokens</th>
          </tr></thead>
          <tbody>
            ${s.slice(0,xr).map(o=>{const r=(o.exact_input_tokens||0)+(o.exact_output_tokens||0),a=uh(o);return g`<tr key=${o.session_id}>
                <td class="now-table__tool"><${ls} tool=${o.tool} size="1em"/> ${o.label||wl(o.tool,e)}</td>
                <td class="now-table__project">
                  <button type="button" class="now-link" title=${(o.project||"no project")+`
`+o.session_id}
                    onClick=${()=>l(o.session_id,o.tool)}>${Pr(o.project)||"no project"}</button>
                </td>
                <td class="num">${fo(o.duration_s||0)}</td>
                <td class="num">${$l(o.cpu_percent||0)}</td>
                <td class="num">${a?Kt(a*1048576):"-"}</td>
                <td class="num" title=${r?r.toLocaleString()+" exact tokens":"No exact token data for this session"}>${r?yt(r):"-"}</td>
              </tr>`})}
          </tbody>
        </table></div>
        ${s.length>xr&&g`<button type="button" class="now-link now-panel__more" onClick=${n}>
          Show all ${s.length} sessions</button>`}`}
  </section>`}function yh({onOpenBudget:e,cloudScope:t,enabledTools:l,snap:n}){const s=Un(()=>Nc({since:Date.now()/1e3-86400}),[],{pollMs:6e4}),o=Ae(()=>ph(s.data,l),[s.data,l]),r=Jp({...s,data:s.data?o.rows:null,isEmpty:c=>!c.length});if(t)return g`<section class="now-panel" aria-labelledby="now-cost">
      <header class="now-panel__head"><h2 id="now-cost">Cost, last 24 h</h2></header>
      <${an} status="empty" emptyTitle="Not available from this machine"
        emptyHint="The selected tool is billed and metered in the vendor's cloud, so no local token counts exist to estimate from."/>
    </section>`;const a=o.billed.length>0||o.listUsd!==null;return g`<section class="now-panel" aria-labelledby="now-cost">
    <header class="now-panel__head">
      <h2 id="now-cost">Cost, last 24 h</h2>
      ${s.data&&o.billed.map(c=>g`<span key=${c.unit} class="now-panel__figure">${c.amount.toLocaleString(void 0,{maximumFractionDigits:2})}<small class="now-panel__unit"> ${Fa(c.unit)}</small></span>`)}
      ${s.data&&o.listUsd!==null&&g`<span class="now-panel__figure" title=${Fc}>${uo(o.listUsd)}<small class="now-panel__unit"> est.</small></span>`}
      ${s.data&&!a&&o.rows.length>0&&g`<span class="now-panel__figure" title=${o.unpricedReason||Na}>n/a</span>`}
    </header>
    <${an} status=${r} error=${s.error} updatedAt=${s.updatedAt} onRetry=${s.reload}
      label="cost" emptyTitle=${l?"No recorded usage for the selected tools in the last 24 h":"No recorded usage in the last 24 h"}
      emptyHint="Usage comes from per-request telemetry. Turn on the OTel receiver if a tool is running but nothing shows."
      emptyFix="aictl otel enable">
      <div class="now-panel__sub">${yt(o.tokens)} tokens, ${o.sessions} sessions${o.listUsd!==null?". Dollar figures are list-price estimates, not billed amounts.":""}${o.unpriced?` ${o.unpriced} tool${o.unpriced===1?" has":"s have"} no known price.`:""}</div>
      <table class="now-table now-table--plain">
        <tbody>${o.rows.slice(0,5).map(c=>g`<tr key=${c.tool}>
          <td class="now-table__project" title=${(c.tokens_source||[]).length?"Tokens from "+c.tokens_source.join(", ")+(c.tokens_quality?" ("+c.tokens_quality+")":""):c.tokens_reason||""}><${ls} tool=${c.tool} size="1em"/> ${wl(c.tool,n)}</td>
          <td class="num">${yt(c.total_tokens||0)}</td>
          <td class="num"><${fh} row=${c}/></td>
        </tr>`)}</tbody>
      </table>
      <button type="button" class="now-link now-panel__more" onClick=${e}>Open budget</button>
    </${an}>
  </section>`}function $h({command:e}){const[t,l]=ee(!1);if(!e)return null;const n=e.startsWith("aictl ");return g`<div class="now-issue__fix">
    <code>${e}</code>
    ${n&&g`<button type="button" class="now-link" onClick=${()=>{var o;try{(o=navigator.clipboard)==null||o.writeText(e),l(!0),setTimeout(()=>l(!1),1500)}catch{}}}
      aria-label=${"Copy command: "+e}>${t?"Copied":"Copy"}</button>`}
  </div>`}function bh({selfStatus:e}){const t=To(e);return t?g`<div class=${"now-storage"+(t.degraded?" is-degraded":"")}>
    <span>Capture <strong>${t.mode||"not reported"}</strong></span>
    <span>Disk <strong>${Ql(t)}</strong></span>
    ${t.pct!=null&&g`<div class="now-storage__bar" role="meter" aria-label="Disk use against budget"
      aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.min(t.pct,100)}>
      <span class=${t.pct>=90?"is-high":""} style=${{width:Math.min(t.pct,100)+"%"}}></span>
    </div>`}
  </div>`:null}function _h({models:e}){const t=Object.values(e&&!e.error?e:{}).filter(n=>{var s;return n.value||((s=n.conflicts)==null?void 0:s.length)});if(!t.length)return null;const l=new Map;for(const n of t){const s=JSON.stringify([n.value,n.source,n.line,n.conflicts]);l.has(s)?l.get(s).labels.push(wl(n.tool)):l.set(s,{...n,labels:[wl(n.tool)]})}return g`<div class="now-models" data-testid="now-models">
    ${[...l.values()].map(n=>g`<div key=${n.tool} class="now-models__row">
      <span>${n.labels.join(", ")} model <strong>${n.value||"no pin"}</strong></span>
      ${n.source&&g`<span class="now-models__source" title=${n.why_in_effect}>
        ${n.line?`${n.source}:${n.line}`:n.source}${n.in_project?"":" (not in this project, still in effect)"}
      </span>`}
      ${(n.conflicts||[]).map(s=>g`<span key=${s.requested_at} class="now-models__conflict" data-testid="now-model-conflict">
        Conflict: ${s.requested.join(", ")} requested at ${s.requested_at}, ${s.pinned} is pinned
      </span>`)}
    </div>`)}
  </div>`}function wh({snap:e,enabledTools:t,connected:l,otelActive:n,alerts:s,selfStatus:o,onOpenTab:r}){const a=Un(()=>Hc(),[],{pollMs:6e4}),c=Un(()=>Bc(),[],{pollMs:6e4}),d=Un(()=>Dr(),[],{pollMs:6e4}),v=Un(()=>hh(t),[t],{pollMs:6e4}),p=e!=null&&e.timestamp?Date.now()/1e3-e.timestamp:null,m=Ae(()=>To(o),[o]),$=v.updatedAt?v.data:void 0,x=Ae(()=>new Set(((e==null?void 0:e.sessions)||[]).map(S=>S.tool)),[e]),D=Ae(()=>ih({connected:l,snapAgeS:p,hooks:c.data,quality:d.data,otelActive:n,alerts:s,storage:m,runningTools:x,hiddenContext:$,enabledTools:t}),[l,p,c.data,d.data,n,s,m,x,$,t]),w=D.filter(S=>S.level==="error").length,E=D.filter(S=>S.level==="warn").length,k=c.loading&&!c.data&&d.loading&&!d.data,C=k?"...":w+E;return g`<section class="now-panel now-panel--health" aria-labelledby="now-health">
    <header class="now-panel__head">
      <h2 id="now-health">Needs attention</h2>
      <span class=${"now-panel__figure"+(w?" is-error":E?" is-warn":" is-ok")}>${C}</span>
      <span class="now-panel__sub">${w} error${w===1?"":"s"}, ${E} warning${E===1?"":"s"}</span>
    </header>
    <${bh} selfStatus=${o}/>
    <${_h} models=${a.data}/>
    ${c.error&&!c.data&&g`<${an} status="error" error=${c.error}
      onRetry=${c.reload} label="hook status"/>`}
    ${D.length===0&&!k&&!c.error?g`<${an} status="empty" emptyTitle="All collectors and hooks are healthy"
          emptyHint="Hook delivery, data quality and the live stream all report OK."/>`:g`<ul class="now-issues">
          ${D.slice(0,7).map(S=>g`<li key=${S.id} class=${"now-issue now-issue--"+S.level}>
            <span class="now-issue__level">${S.level==="error"?"Error":S.level==="warn"?"Warn":"Info"}</span>
            <div class="now-issue__body">
              <div class="now-issue__title">${S.tab?g`<button type="button" class="now-link" onClick=${()=>r(S.tab)}>${S.title}</button>`:S.title}</div>
              <div class="now-issue__detail">${S.detail}</div>
              <${$h} command=${S.fix}/>
            </div>
          </li>`)}
          ${D.length>7&&g`<li class="now-panel__sub">${D.length-7} more in Monitoring health below.</li>`}
        </ul>`}
  </section>`}function kh({snap:e,enabledTools:t,connected:l,otelActive:n,alerts:s,selfStatus:o,onOpenSession:r,onOpenTab:a}){return g`<div class="now-grid">
    <${gh} snap=${e} enabledTools=${t}
      onOpenSession=${r} onShowAll=${()=>a("live")}/>
    <${yh} onOpenBudget=${()=>a("budget")} cloudScope=${Kn(e,t)} enabledTools=${t} snap=${e}/>
    <${wh} snap=${e} enabledTools=${t} connected=${l} otelActive=${n}
      alerts=${s} selfStatus=${o} onOpenTab=${a}/>
  </div>`}function xh({globalRange:e,onPreset:t,onApplyCustom:l}){const[n,s]=ee(!1),[o,r]=ee(""),a=Z(null),c=Z(null),d=re(()=>{s(!0),r(""),requestAnimationFrame(()=>{if(!(!a.current||!c.current))if(e.until!=null)a.current.value=zl(e.since),c.current.value=zl(e.until);else{const p=xl.find(x=>x.id===e.id),m=Date.now()/1e3,$=(p==null?void 0:p.seconds)||86400;a.current.value=zl(m-$),c.current.value=zl(m)}})},[e]),v=re(()=>{var x,D;const{since:p,until:m,error:$}=jc((x=a.current)==null?void 0:x.value,(D=c.current)==null?void 0:D.value);if($){r($);return}r(""),l(p,m),s(!1)},[l]);return g`<div class="global-range-bar">
    <div class="range-bar" role="group" aria-label="Time range">
      ${xl.map(p=>g`<button key=${p.id}
        class=${e.id===p.id&&!n?"range-btn active":"range-btn"}
        aria-pressed=${e.id===p.id&&!n?"true":"false"}
        onClick=${()=>{t(p.id),s(!1),r("")}}>${p.label}</button>`)}
      <button class=${n||e.id==="custom"?"range-btn active":"range-btn"}
        onClick=${d}>Custom</button>
    </div>
    ${n&&g`<div class="es-custom-range">
      <label><span class="range-label">From</span>
        <input type="datetime-local" class="es-date-input" ref=${a} /></label>
      <label><span class="range-label">To</span>
        <input type="datetime-local" class="es-date-input" ref=${c} /></label>
      <button class="range-btn active" onClick=${v} style="font-weight:600">Apply</button>
      <span class="error-state" aria-live="polite"
        style="padding:0 var(--sp-2);font-size:var(--fs-xs)">${o}</span>
    </div>`}
  </div>`}function Sh(e,t){const l=e.filter(s=>ts.has(s.tool));if(t==null)return`All tools (${l.length})`;const n=l.filter(s=>t.includes(s.tool)).map(s=>s.label);return n.length===0?"No tools":n.length<=2?n.join(", "):`${n[0]} +${n.length-1}`}function Mh({snap:e,enabledTools:t,onToggle:l,onSetAll:n}){if(!e)return null;const s=Rr(e.tools.filter(c=>!c.meta));if(!s.length)return null;const o=t===null,r=Sh(s,t),a=g`<button type="button" class=${"hdr-btn tool-filter-trigger"+(o?"":" is-filtered")}
    aria-label=${"Tool filter: "+r}>
    <${Vt} name="filter" size="12"/> ${r}
  </button>`;return g`<${Kl} trigger=${a} placement="bottom">
    <div class="tool-filter-bar" role="group" aria-label="Filter every panel by tool">
      <label class="tool-filter-item">
        <input type="checkbox" checked=${o}
          onChange=${()=>n(o?[]:null)} />
        <span>All tools</span>
      </label>
      <hr class="hdr-views-sep"/>
      ${s.map(c=>{const d=ts.has(c.tool),v=t===null||t.includes(c.tool);return g`<label key=${c.tool}
          class=${"tool-filter-item"+(d?"":" tool-unverified")}
          title=${d?"":"Discovery only: this tool is not verified yet, so it cannot be filtered"}>
          <input type="checkbox" checked=${v} disabled=${!d}
            onChange=${()=>d&&l(c.tool)} />
          <${ls} tool=${c.tool} size="1em"/>
          <span>${c.label}</span>
        </label>`})}
    </div>
  </${Kl}>`}const Eh=30;function Th({timestamp:e}){const[,t]=ee(0);if(oe(()=>{const s=setInterval(()=>t(o=>o+1),5e3);return()=>clearInterval(s)},[]),!e)return null;const l=Math.max(0,Math.floor(Date.now()/1e3-e)),n=l>Eh;return g`<span class=${"conn "+(n?"stale":"ok")} role="status" aria-live="polite"
    title=${"Last data snapshot received "+l+"s ago"+(n?" — the refresh loop may be stalled":"")}>
    ● ${n?"stale "+l+"s":l+"s"}
    <span class="sr-only">${n?" — data is stale":" — data age"}</span>
  </span>`}function Ah({selfStatus:e}){const t=To(e);if(!t||t.used==null&&!t.mode)return null;const l=t.degraded?"err":t.pct>=90?"stale":"off";return g`<span class=${"conn hdr-desktop-only "+l} title=${"Disk: "+Ql(t)}>
    ${t.mode?"capture="+t.mode+" ":""}${t.used!=null?Kt(t.used):""}${t.budget?" / "+Kt(t.budget):""}
  </span>`}function Ch({searchRef:e,searchQuery:t,onSearchChange:l,theme:n,cycleTheme:s,density:o,setDensity:r,otelActive:a,connected:c,selfStatus:d,globalRange:v,onPreset:p,onApplyCustom:m,snap:$,enabledTools:x,onToggleTool:D,onSetAllTools:w,views:E=[],matchingView:k=null,onApplyView:C,onDeleteView:S,onSaveView:_,onOpenPalette:M}){const[P,R]=ee(!1),[Y,O]=ee(!1),[T,W]=ee(""),z=re(()=>{const V=T.trim();V&&(_&&_(V),W(""),O(!1))},[T,_]),q=[{value:"compact",label:"Compact"},{value:"normal",label:"Normal"},{value:"spacious",label:"Spacious"}],B=g`<button class="hdr-btn" type="button"
    aria-label="Saved views" title="Saved views">
    Views${k?": "+k.name:""} ▾
  </button>`;return g`<header role="banner">
    <h1>aictl</h1>
    <div class="hdr-scope" role="group" aria-label="Scope for every panel">
      <${xh} globalRange=${v}
        onPreset=${p} onApplyCustom=${m}/>
      <${Mh} snap=${$} enabledTools=${x}
        onToggle=${D} onSetAll=${w}/>
    </div>
    <div class="hdr-right">
      <!-- Mobile overflow toggle -->
      <button class="hdr-btn hdr-mobile-only" type="button" aria-label="Menu"
        aria-expanded=${P?"true":"false"}
        onClick=${()=>R(V=>!V)}>
        <${nd} size="16" aria-hidden="true"/>
      </button>

      <input type="text" ref=${e} class="search-box hdr-desktop-only"
        placeholder="Filter... ( / )" aria-label="Filter tools"
        value=${t} onInput=${V=>l(V.target.value)}/>

      <!-- Command palette trigger -->
      <button class="hdr-cmdk" type="button"
        onClick=${M}>
        <${Bu} size="14" aria-hidden="true"/>
        <span class="hdr-desktop-only">Commands</span>
        <${tt} class="hdr-desktop-only" aria-hidden="true">${Kr()}</${tt}>
        <span class="sr-only">open command palette</span>
      </button>

      <!-- Views dropdown -->
      <${Kl} trigger=${B} placement="bottom" class="hdr-desktop-only">
        <div class="hdr-views-menu" role="group" aria-label="Saved views">
          ${E.length===0?g`<div class="hdr-views-empty text-muted">No saved views</div>`:E.map(V=>g`<div key=${V.id} class="hdr-views-row">
                <button class="hdr-views-apply" type="button"
                  onClick=${()=>C&&C(V.id)}
                  aria-label=${"Apply view "+V.name}>${V.name}</button>
                <button class="hdr-views-del" type="button"
                  aria-label=${"Delete view "+V.name}
                  onClick=${()=>S&&S(V.id)}>
                  <${hd} size="12" aria-hidden="true"/>
                </button>
              </div>`)}
          <hr class="hdr-views-sep"/>
          <${on} variant="ghost" size="sm"
            onClick=${()=>O(!0)}>
            <${ud} size="12" aria-hidden="true"/> Save current view…
          </${on}>
        </div>
      </${Kl}>

      <!-- Theme toggle -->
      <button class="theme-btn" type="button" onClick=${s}
        aria-label=${"Toggle theme: "+n} title=${"Theme: "+n}>
        <${Vt} name=${n==="light"?"sun":n==="editorial"?"pen":"moon"} size="16"/>
      </button>

      ${a?g`<span class="conn ok" title="OTel receiver active">OTel</span>`:g`<span class="conn off" title="OTel receiver inactive — enable with: aictl otel enable">OTel off</span>`}
      <${Ah} selfStatus=${d}/>
      <${Th} timestamp=${$==null?void 0:$.timestamp}/>
      <span class=${"conn "+(c?"ok":"err")} role="status" aria-live="polite">
        ${c?"live":"reconnecting..."}
        <span class="sr-only">${c?" — connected":" — connection lost, reconnecting"}</span>
      </span>
    </div>

    ${P&&g`<div class="hdr-mobile-overflow hdr-mobile-only">
      <input type="text" class="search-box" placeholder="Filter..."
        aria-label="Filter tools"
        value=${t} onInput=${V=>l(V.target.value)}/>
      <${Dd}
        ariaLabel="Density"
        value=${o}
        options=${q}
        onChange=${r}/>
    </div>`}

    ${Y&&g`<${Jn} open=${!0}
      onClose=${()=>O(!1)} ariaLabel="Save view">
      <h3 style="margin-bottom:var(--sp-5)">Save current view</h3>
      <input type="text" class="search-box" style="width:100%"
        placeholder="View name" value=${T}
        onInput=${V=>W(V.target.value)}
        onKeyDown=${V=>V.key==="Enter"&&z()}
        autoFocus=${!0}/>
      <div style="display:flex;gap:var(--sp-3);margin-top:var(--sp-6);justify-content:flex-end">
        <${on} variant="ghost" onClick=${()=>O(!1)}>Cancel</${on}>
        <${on} variant="primary" onClick=${z}>Save</${on}>
      </div>
    </${Jn}>`}
  </header>`}const Sr=[{id:"overview",label:"Dashboard",sub:"live event stream"},{id:"explorer",label:"Sessions",sub:"history & traces"},{id:"agents",label:"Agents",sub:"instrumentation"},{id:"prompts",label:"Prompts",sub:"library & workflows"}];function Lh(){const e=new Date,t=String(e.getMonth()+1).padStart(2,"0"),l=e.toLocaleDateString("en-CA");return`The aictl daily · vol. ${t} · ${l}`}function Dh({activeTab:e,setActiveTab:t}){const l=Xl(kl),n=l==null?void 0:l.snap,s=Ae(()=>{var c;let a=0;for(const d of(n==null?void 0:n.tools)||[])for(const v of((c=d.live)==null?void 0:c.sessions)||[])v.active!==!1&&a++;return a},[n]),o=Sr.find(a=>a.id===e),r=s>0?`Live · ${s} session${s!==1?"s":""}`:"Live";return g`<div class="cmasthead">
    <div class="cmasthead-top">
      <div class="cmasthead-identity">
        <div class="cmasthead-kicker">${Lh()}</div>
        <div class="cmasthead-headline">
          <span class="cmasthead-title">aictl</span>
          <span class="cmasthead-subtitle">a live record of every agent on this machine</span>
        </div>
      </div>
      <div class="cmasthead-live" role="status" aria-live="polite" aria-label="Live status">
        <span class="cmasthead-live-dot" aria-hidden="true"></span>
        ${r}
      </div>
    </div>
    <nav class="cmasthead-tabs" role="navigation" aria-label="Editorial tabs">
      ${Sr.map(a=>g`<button
        key=${a.id}
        type="button"
        class=${"cmasthead-tab"+(e===a.id?" is-active":"")}
        onClick=${()=>t(a.id)}
        aria-current=${e===a.id?"page":null}
      >${a.label}</button>`)}
      <span class="cmasthead-tabs-sub" aria-hidden="true">
        ${(o==null?void 0:o.sub)??""}
      </span>
    </nav>
  </div>`}function Ph({tabs:e,activeTab:t,setActiveTab:l}){const n=Z(null);return oe(()=>{var o,r;const s=(o=n.current)==null?void 0:o.querySelector('[aria-current="page"]');(r=s==null?void 0:s.scrollIntoView)==null||r.call(s,{block:"nearest",inline:"nearest"})},[t]),g`<nav class="tab-nav" ref=${n} aria-label="Dashboard sections">
    ${yl.navGroups.map(s=>g`<div key=${s.id} class="tab-group" role="group" aria-labelledby=${"nav-"+s.id}>
      <div class="tab-group__label" id=${"nav-"+s.id}>${s.label}</div>
      ${e.filter(o=>o.group===s.id).map(o=>g`<button key=${o.id} type="button" class="tab-btn"
        aria-current=${t===o.id?"page":null}
        aria-keyshortcuts=${o.key||null}
        onClick=${()=>l(o.id)}>
        <span class="tab-btn-icon"><${Vt} name=${o.iconName} size="14"/></span>
        <span class="tab-btn__label">${o.label}</span>
        ${o.key&&g`<kbd class="tab-btn__key" aria-hidden="true">${o.key}</kbd>`}
      </button>`)}
    </div>`)}
  </nav>`}function Rh(e,t){if(!t)return 1;const l=t.toLowerCase(),n=(e.label||"").toLowerCase(),s=(e.group||"").toLowerCase();if(n.startsWith(l))return 1e3-n.length;if(n.includes(l))return 500-n.indexOf(l);if(s.startsWith(l))return 300;if(s.includes(l))return 150;let o=0;for(const r of n)if(r===l[o]&&o++,o===l.length)break;return o===l.length?50:0}function Oh({commands:e=[],isOpen:t,onClose:l,lru:n=[],onRun:s}){const[o,r]=ee(""),[a,c]=ee(0),d=Z(null),v=Z(null);oe(()=>{t&&(r(""),c(0))},[t]),oe(()=>{t&&d.current&&d.current.focus()},[t]);const p=Ae(()=>{if(!o){const w=new Map(e.map(C=>[C.id,C])),E=n.map(C=>w.get(C)).filter(Boolean),k=e.filter(C=>!n.includes(C.id));return[...E,...k]}return e.map(w=>({c:w,s:Rh(w,o)})).filter(w=>w.s>0).sort((w,E)=>E.s-w.s).map(w=>w.c)},[e,o,n]);oe(()=>{c(0)},[o]);const m=re(w=>{if(w){s&&s(w);try{w.action&&w.action()}catch(E){console.error("Command failed:",E)}l&&l()}},[s,l]),$=re(w=>{w.key==="ArrowDown"?(w.preventDefault(),c(E=>Math.min(E+1,p.length-1))):w.key==="ArrowUp"?(w.preventDefault(),c(E=>Math.max(E-1,0))):w.key==="Enter"&&(w.preventDefault(),m(p[a]))},[p,a,m]);oe(()=>{if(!v.current)return;const w=v.current.querySelector(`[data-cmd-idx="${a}"]`);w&&w.scrollIntoView&&w.scrollIntoView({block:"nearest"})},[a]);const x=Ae(()=>{const w=[],E=new Map;return p.forEach(k=>{const C=k.group||"Commands";E.has(C)||(E.set(C,w.length),w.push({group:C,items:[]})),w[E.get(C)].items.push(k)}),w},[p]);let D=-1;return g`<${Jn} open=${t} onClose=${l} ariaLabel="Command palette" class="cmdk-dialog">
    <div class="cmdk">
      <div class="cmdk-input-row">
        <${Yr} size="16" aria-hidden="true"/>
        <input
          ref=${d}
          type="text"
          class="cmdk-input"
          placeholder="Type a command or search…"
          value=${o}
          onInput=${w=>r(w.target.value)}
          onKeyDown=${$}
          aria-label="Search commands"
          aria-controls="cmdk-list"
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-activedescendant=${p.length?"cmdk-opt-"+a:null}
        />
        <${tt}>Esc</${tt}>
      </div>
      <div id="cmdk-list" class="cmdk-list" role="listbox" ref=${v}>
        ${p.length===0?g`<${Jr} icon="search" title="No commands"
              description=${o?'No commands match "'+o+'"':"Start typing…"}/>`:x.map(w=>g`<div key=${w.group} class="cmdk-group" role="group" aria-label=${w.group}>
              <div class="cmdk-group-label" aria-hidden="true">${w.group}</div>
              ${w.items.map(E=>{D+=1;const k=D,C=k===a;return g`<button key=${E.id}
                  type="button"
                  id=${"cmdk-opt-"+k}
                  class=${"cmdk-item"+(C?" cmdk-item--active":"")}
                  role="option"
                  aria-selected=${C?"true":"false"}
                  data-cmd-idx=${k}
                  onMouseEnter=${()=>c(k)}
                  onClick=${()=>m(E)}
                >
                  <span class="cmdk-item__label">${E.label}</span>
                  ${E.shortcut?g`<${tt}>${E.shortcut}</${tt}>`:null}
                </button>`})}
            </div>`)}
      </div>
      <div class="cmdk-foot">
        <${tt}>↑</${tt}><${tt}>↓</${tt}> navigate
        · <${tt}>↵</${tt}> run
        · <${tt}>Esc</${tt}> close
      </div>
    </div>
  </${Jn}>`}function Ih({target:e="#main-content",label:t="Skip to main content"}){return g`<a href=${e} class="skip-link">${t}</a>`}function qs(e,t){try{const l=localStorage.getItem("aictl-pref-"+e);return l!=null?JSON.parse(l):t}catch{return t}}const zh={live:3600,"1h":3600,"6h":21600,"24h":86400,"7d":604800},Vh={snap:null,history:null,connected:!1,activeTab:qs("active_tab","overview"),globalRange:(()=>{const e=qs("range","live"),t=zh[e]||3600;return{id:e,since:Date.now()/1e3-t,until:null}})(),searchQuery:"",theme:(()=>{try{return localStorage.getItem("aictl-theme")||"auto"}catch{return"auto"}})(),viewerPath:null,events:[],enabledTools:qs("tool_filter",null)};function Nh(e,t){switch(t.type){case"SSE_UPDATE":{const l=t.payload,n=e.snap?Or(e.snap,l):e.snap,s=Ir(e.history,l);return{...e,snap:n,history:s,connected:!0}}case"SNAP_REPLACE":return{...e,snap:t.payload};case"HISTORY_INIT":return{...e,history:t.payload};case"EVENTS_INIT":return{...e,events:t.payload};case"SET_CONNECTED":return{...e,connected:t.payload};case"SET_TAB":return{...e,activeTab:t.payload};case"SET_RANGE":return{...e,globalRange:t.payload};case"SET_SEARCH":return{...e,searchQuery:t.payload};case"SET_THEME":return{...e,theme:t.payload};case"SET_VIEWER":return{...e,viewerPath:t.payload};case"SET_TOOL_FILTER":return{...e,enabledTools:t.payload};default:return e}}const Fh=ct(()=>at(()=>import("./TabOverview-5tCGbG4W.js"),__vite__mapDeps([6,1,2,4,5]))),Hh=ct(()=>at(()=>import("./TabMemory-C1EOrHX-.js"),__vite__mapDeps([7,1,2,4,5]))),Bh=ct(()=>at(()=>import("./ContextMap-eWz6Gpbj.js"),__vite__mapDeps([8,1,2,4,5]))),jh=ct(()=>at(()=>import("./TabLive-SDvv_fBj.js"),__vite__mapDeps([9,1,2,10,4,5]))),Uh=ct(()=>at(()=>import("./TabEventsStats-83Gka9Rh.js"),__vite__mapDeps([11,1,2,4,5]))),Wh=ct(()=>at(()=>import("./TabBudget-Gm3JztTQ.js"),__vite__mapDeps([12,1,2,10,13,4,5]))),qh=ct(()=>at(()=>import("./TabAnalytics-DP8_OHyL.js"),__vite__mapDeps([14,1,2,15,4,5]))),Kh=ct(()=>at(()=>import("./TabExplorer-XR26NRyH.js"),__vite__mapDeps([16,1,2,3,13,4,5]))),Gh=ct(()=>at(()=>import("./TabToolConfig-BAlTypfB.js"),__vite__mapDeps([17,1,2,4,5,18]))),Yh=ct(()=>at(()=>import("./TabProjectEnv-0aXdnPef.js"),__vite__mapDeps([19,1,2,4,5]))),Jh=ct(()=>at(()=>import("./CAgentsTab-CvcDcWRw.js"),__vite__mapDeps([20,1,2,4,5]))),Qh=ct(()=>at(()=>import("./CDashboardTab-BPl5fjsv.js"),__vite__mapDeps([21,1,2,4,5]))),Zh=ct(()=>at(()=>import("./CPromptsTab-JQb1Rz8r.js"),__vite__mapDeps([22,1,2,4,5]))),Xh=ct(()=>at(()=>import("./CSessionsTab-CM6p6XhY.js"),__vite__mapDeps([23,1,2,4,5]))),e0=new Set(["live","procs","events","explorer","budget","analytics","memory"]),t0=()=>g`<div class="tab-skeleton" role="status" aria-busy="true" aria-label="Loading view">
  <${Gn} height="120px" radius="var(--radius-sm)"/>
  <${Gn} height="200px" radius="var(--radius-sm)"/>
</div>`,ye=({tabName:e,children:t})=>g`<${Li} key=${e}><${Ul} fallback=${g`<${t0}/>`}>${t}</${Ul}></${Li}>`;function n0(e,t){const l=Z({});oe(()=>{const n=t.current;if(!n)return;const s=l.current[e]||0;n.scrollTop=s;let o=!1;const r=s?[150,500,1200].map(d=>setTimeout(()=>{o||(n.scrollTop=s)},d)):[],a=()=>{o=!0},c=()=>{l.current[e]=n.scrollTop};return n.addEventListener("wheel",a,{passive:!0,once:!0}),n.addEventListener("touchstart",a,{passive:!0,once:!0}),n.addEventListener("scroll",c,{passive:!0}),()=>{r.forEach(clearTimeout),n.removeEventListener("wheel",a),n.removeEventListener("touchstart",a),n.removeEventListener("scroll",c)}},[e,t])}function l0(e,t){oe(()=>{const l=n=>{var s;n.key==="Escape"&&t(null),n.key==="/"&&!po(n.target)&&(n.preventDefault(),(s=e.current)==null||s.focus())};return document.addEventListener("keydown",l),()=>document.removeEventListener("keydown",l)},[e,t])}function s0(){const[e,t]=ee(!1);return oe(()=>{let l=!0;const n=()=>Cr().then(o=>{l&&t(o.active||!1)}).catch(()=>{l&&t(!1)});n();const s=setInterval(n,3e4);return()=>{l=!1,clearInterval(s)}},[]),e}function o0(e){const[t,l]=ee(null),[n,s]=ee([]);return oe(()=>{const{id:o,since:r,until:a}=e;o==="live"?l(null):o!=="custom"?Gs({range:o}).then(l).catch(()=>{}):Gs({since:r,until:a}).then(l).catch(()=>{}),qc({since:r,until:a}).then(s).catch(()=>{})},[e]),{dbHistory:t,events:n}}function i0(e){const t=Z(!1),l=Z(e);oe(()=>{if(e&&!t.current){t.current=!0,l.current=e;return}e!==l.current&&(e?(Zs.success("Reconnected"),ui("Connection restored")):t.current&&(Zs.error("Disconnected. Retrying…"),ui("Connection lost, retrying","assertive")),l.current=e)},[e])}function r0(e){var r;if(!e)return[];const t=[];let l=0,n=0,s=0,o=0;for(const a of e.tools||[])for(const c of a.processes||[]){const d=parseFloat(c.mem_mb)||0,v=(c.process_type||"").toLowerCase();(v==="subagent"||v==="agent")&&(l+=d),v==="mcp-server"&&c.zombie_risk&&c.zombie_risk!=="none"&&n++,(v==="browser"||(c.name||"").toLowerCase().includes("headless"))&&s++,(r=c.anomalies)!=null&&r.length&&(o+=c.anomalies.length)}return l>2048&&t.push({level:"red",msg:`Subagent memory: ${Kt(l*1048576)} (>2GB) — consider cleanup`}),n>0&&t.push({level:"orange",msg:`${n} MCP server(s) with dead parent — may be orphaned`}),s>0&&t.push({level:"yellow",msg:`${s} headless browser process(es) detected — check for leaks`}),o>5&&t.push({level:"orange",msg:`${o} process anomalies detected`}),t}function Hl(e,t){return Yc(e,t)}function Ha(e,t,l){if(!e)return e;let n=e.tools.filter(s=>ts.has(s.tool)||s.tool==="aictl");if(n=n.filter(s=>es(s.tool,t)),l){const s=l.toLowerCase();n=n.filter(o=>o.label.toLowerCase().includes(s)||o.tool.toLowerCase().includes(s)||o.vendor&&o.vendor.toLowerCase().includes(s)||(o.files||[]).some(r=>r.path.toLowerCase().includes(s))||(o.processes||[]).some(r=>(r.name||"").toLowerCase().includes(s)||(r.cmdline||"").toLowerCase().includes(s))||o.live&&((o.live.workspaces||[]).some(r=>r.toLowerCase().includes(s))||(o.live.sources||[]).some(r=>r.toLowerCase().includes(s))))}return{...e,tools:Rr(n),sessions:Hl(e.sessions,t),tool_telemetry:Hl(e.tool_telemetry,t),tool_configs:Array.isArray(e.tool_configs)?e.tool_configs.filter(s=>Gc(s,t)):e.tool_configs,mcp_detail:Hl(e.mcp_detail,t),events:Hl(e.events,t),agent_memory:Array.isArray(e.agent_memory)&&jl(t)?e.agent_memory.filter(s=>Kc(s,t)):e.agent_memory,filter_hidden_unlisted:jl(t)?dl(e.sessions)+dl(e.tool_telemetry)+dl(e.tool_configs)+dl(e.mcp_detail)+dl(e.events):0}}function Ao(e,t){try{document.dispatchEvent(new CustomEvent("aictl:select-session",{detail:{sessionId:e,tool:t}}))}catch{}}function a0({tabs:e,setActiveTab:t,setPreset:l,presets:n,allTools:s,toggleTool:o,setTheme:r,setDensity:a,views:c,applyView:d,snap:v,onShowShortcuts:p}){const m=[];e.forEach($=>m.push({id:"tab:"+$.id,group:"Jump to tab",label:$.label,shortcut:$.key,action:()=>t($.id)})),n.forEach($=>m.push({id:"range:"+$.id,group:"Range",label:"Set range: "+$.label,action:()=>l($.id)})),(s||[]).forEach($=>m.push({id:"filter:"+$,group:"Filter",label:"Toggle tool: "+$,action:()=>o($)}));for(const $ of((v==null?void 0:v.sessions)||[]).slice(0,40)){if(!$.session_id)continue;const x=Pr($.project)||"no project";m.push({id:"session:"+$.session_id,group:"Session",label:"Open session: "+x+" ("+($.label||$.tool)+")",action:()=>{t("explorer"),Ao($.session_id,$.tool)}})}return c.forEach($=>m.push({id:"view:"+$.id,group:"View",label:"Apply view: "+$.name,action:()=>d($.id)})),["auto","dark","light","editorial"].forEach($=>m.push({id:"theme:"+$,group:"Appearance",label:"Theme: "+$,action:()=>r($)})),["compact","normal","spacious"].forEach($=>m.push({id:"density:"+$,group:"Appearance",label:"Density: "+$,action:()=>a($)})),m.push({id:"help:shortcuts",group:"Shortcuts",label:"Keyboard shortcuts",action:()=>{p&&p()}}),m}function c0({open:e,onClose:t,tabs:l}){if(!e)return null;const n=[...l.map(s=>[s.label,s.key]),["Previous / next view","[ ]"],["Command palette",Kr()],["Focus filter","/"],["This list","?"],["Close panels","Esc"]];return g`<${Jn} open=${!0} onClose=${t} ariaLabel="Keyboard shortcuts">
    <h3 style="margin-bottom:var(--sp-5)">Keyboard shortcuts</h3>
    <ul style="list-style:none;margin:0;padding:0;min-width:220px">
      ${n.map(([s,o])=>g`<li key=${s}
        style="display:flex;justify-content:space-between;align-items:center;gap:var(--sp-6);padding:var(--sp-1) 0">
        <span>${s}</span><${tt}>${o}</${tt}>
      </li>`)}
    </ul>
  </${Jn}>`}function Ba({theme:e,snap:t,filteredSnap:l,enabledTools:n,effectiveHistory:s,activeTab:o,connected:r,otelActive:a,alerts:c,selfStatus:d,openSession:v,setActiveTab:p,setTheme:m}){return{overview:()=>e==="editorial"?g`<${ye} tabName="overview">
          <${Qh}/>
          <div class="mb-lg" style="margin-top:var(--sp-6)">
            <div class="c-overline" style="margin-bottom:var(--sp-3)">Monitoring</div>
            <${Ci}/>
          </div>
        </${ye}>`:g`<${ye} tabName="overview">
          <${kh} snap=${l} enabledTools=${n}
            connected=${r} otelActive=${a} alerts=${c} selfStatus=${d}
            onOpenSession=${v} onOpenTab=${p}/>
          ${!Kn(t,n)&&g`<${lh} snap=${l} history=${s} enabledTools=${n}/>`}
          <div class="mb-lg"><${Ci}/></div>
        </${ye}>`,hidden:()=>g`<${ye} tabName="hidden"><${vh}/></${ye}>`,procs:()=>g`<${ye} tabName="procs"><div class="mb-lg"><${Fh}/></div></${ye}>`,memory:()=>g`<${ye} tabName="memory"><div class="mb-lg"><${Bh}/></div><div class="mb-lg"><${Hh}/></div></${ye}>`,live:()=>g`<${ye} tabName="live"><div class="mb-lg"><${jh}/></div></${ye}>`,events:()=>g`<${ye} tabName="events"><div class="mb-lg"><${Uh} key=${"events-"+o}/></div></${ye}>`,budget:()=>g`<${ye} tabName="budget"><div class="mb-lg"><${Wh} key=${"budget-"+o}/></div></${ye}>`,analytics:()=>g`<${ye} tabName="analytics"><div class="mb-lg"><${qh} key=${"analytics-"+o}/></div></${ye}>`,explorer:()=>e==="editorial"?g`<${ye} tabName="explorer"><${Xh}
          onInspect=${($,x)=>{p("explorer"),Ao($,x),m("auto")}}
        /></${ye}>`:g`<${ye} tabName="explorer"><div class="mb-lg"><${Kh} key=${"explorer-"+o}/></div></${ye}>`,config:()=>g`<${ye} tabName="config">
      <div class="mb-lg"><${Gh}/></div>
      <div class="mb-lg"><${Yh} snap=${t}/></div>
    </${ye}>`,agents:()=>g`<${ye} tabName="agents"><${Jh}
      onViewSessions=${()=>p("explorer")}
      onViewConfig=${()=>p("config")}/></${ye}>`,prompts:()=>g`<${ye} tabName="prompts"><${Zh}/></${ye}>`}}function u0(){var Xt;const{snapshot:e,history:t,connected:l}=au(),{range:n,setPreset:s,setCustom:o,setRange:r}=fu(),{activeTab:a,setActiveTab:c,tabs:d}=pu(),{theme:v,setTheme:p,cycleTheme:m}=Uc(),{density:$,setDensity:x}=mu(),D=Ae(()=>e?e.tools.filter(le=>le.tool!=="aictl"&&le.tool!=="any"&&ts.has(le.tool)).map(le=>le.tool):[],[e]),{selectedTools:w,toggleTool:E,setTools:k}=Wc(D),[C,S]=ee(""),[_,M]=ee(null),P=Z(null);l0(P,M),i0(l);const R=s0(),{data:Y}=Un(()=>Lr(),[],{pollMs:6e4}),{dbHistory:O,events:T}=o0(n),W=Ae(()=>({tab:a,range:n,tools:w,density:$,theme:v}),[a,n,w,$,v]),z=re(le=>{le.tab&&c(le.tab),le.range&&r(le.range),le.tools!==void 0&&k(le.tools),le.density&&x(le.density),le.theme&&p(le.theme)},[c,r,k,x,p]),{views:q,saveView:B,deleteView:V,applyView:N,matchingView:Pe}=gu(W,z),ue=bu(),[ce,de]=ee(!1),te=re(()=>de(!0),[]);oe(()=>{const le=Oe=>{Oe.key==="?"&&!po(Oe.target)&&de(Ie=>!Ie)};return document.addEventListener("keydown",le),()=>document.removeEventListener("keydown",le)},[]);const K=Z(null);n0(a,K);const Re=re((le,Oe)=>{c("explorer"),Ao(le,Oe)},[c]),Ye=Ae(()=>a0({tabs:d,setActiveTab:c,setPreset:s,presets:xl,allTools:D,toggleTool:E,setTheme:p,setDensity:x,views:q,applyView:N,snap:e,onShowShortcuts:te}),[d,c,s,D,E,p,x,q,N,e,te]),_e=n.id==="live"?t:O||t,ae=n.until?n.until-n.since:ns[n.id]||3600,ut=re((le,Oe={})=>{if(!le)return M(null);M({path:le,at:Oe.at??null,line:Oe.line>0?Oe.line:null})},[]),Ce=Ae(()=>Ha(e,w,C),[e,w,C]),we=Ae(()=>{var Ie;const le=Date.now()/1e3-300,Oe=new Map;for(const Xe of T)if(Xe.kind==="file_modified"&&Xe.ts>=le&&((Ie=Xe.detail)!=null&&Ie.path)){const wt=Oe.get(Xe.detail.path);(!wt||Xe.ts>wt.ts)&&Oe.set(Xe.detail.path,{ts:Xe.ts,growth:Xe.detail.growth_bytes||0,tool:Xe.tool})}return Oe},[T]),_t=Ae(()=>({snap:Ce,history:t,openViewer:ut,recentFiles:we,globalRange:n,rangeSeconds:ae,enabledTools:w}),[Ce,t,ut,we,n,ae,w]),Ct=Ae(()=>r0(Ce),[Ce]),Ze=Z(null);Ze.current=Ed(Ze.current,_t,{activeTab:a});const Nt=Ze.current.value,Gt=Ba({theme:v,snap:e,filteredSnap:Ce,enabledTools:w,effectiveHistory:_e,activeTab:a,connected:l,otelActive:R,alerts:Ct,selfStatus:Y,openSession:Re,setActiveTab:c,setTheme:p}),Yt=e!=null;return g`<${kl.Provider} value=${Nt}>
    <div class="main-wrap">
      <${Ih}/>
      <${Ch}
        searchRef=${P} searchQuery=${C} onSearchChange=${S}
        theme=${v} cycleTheme=${m}
        density=${$} setDensity=${x}
        otelActive=${R} connected=${l} selfStatus=${Y}
        globalRange=${n} onPreset=${s} onApplyCustom=${o}
        snap=${e} enabledTools=${w}
        onToggleTool=${E} onSetAllTools=${k}
        views=${q} matchingView=${Pe}
        onApplyView=${N} onDeleteView=${V} onSaveView=${B}
        onOpenPalette=${ue.open}
      />
      ${v==="editorial"&&g`<${Dh}
        activeTab=${a} setActiveTab=${c}
      />`}
      <div class="shell-body">
        <${Ph} tabs=${d} activeTab=${a} setActiveTab=${c}/>
        <main class="main" id="main-content" tabindex="0" ref=${K}>
          <div class="main-view" aria-label=${(Xt=d.find(le=>le.id===a))==null?void 0:Xt.label}>
            ${Yt&&g`<${Td} count=${(Ce==null?void 0:Ce.filter_hidden_unlisted)||0}/>`}
            ${Yt?e0.has(a)&&Kn(e,w)?g`<${xd} tools=${w.map(le=>({tool:le,label:wl(le,e)}))}/>`:Gt[a]?Gt[a]():g`<p class="text-muted">Unknown tab "${a}"</p>`:g`<div class="tab-skeleton" role="status" aria-busy="true" aria-label="Loading dashboard">
                  <${Gn} height="120px" radius="var(--radius-sm)"/>
                  <${Gn} height="60px"  radius="var(--radius-sm)"/>
                  <${Gn} height="200px" radius="var(--radius-sm)"/>
                </div>`}
          </div>
        </main>
      </div>
    </div>
    <${Ad} path=${(_==null?void 0:_.path)??(typeof _=="string"?_:null)}
      at=${typeof _=="object"?_==null?void 0:_.at:null}
      line=${typeof _=="object"?_==null?void 0:_.line:null}
      onClose=${()=>M(null)}/>
    <${qd}/>
    <${Oh} commands=${Ye}
      isOpen=${ue.isOpen} onClose=${ue.close}
      lru=${ue.lru} onRun=${le=>ue.recordUse(le.id)}/>
    <${c0} open=${ce}
      onClose=${()=>de(!1)} tabs=${d}/>
    <${Nd}/>
  </${kl.Provider}>`}const _0=Object.freeze(Object.defineProperty({__proto__:null,default:u0,filterSnap:Ha,initialState:Vh,reducer:Nh,tabRenderers:Ba},Symbol.toStringTag,{value:"Module"}));export{fh as C,Jn as D,Jr as E,Td as F,Vt as I,Wp as M,an as P,kl as S,ls as T,Zp as a,Kp as b,xd as c,Gn as d,m0 as e,h0 as f,dh as g,Ys as h,$0 as i,g0 as j,po as k,Qc as l,Dd as m,Zs as n,_0 as o,Jp as p,y0 as r,b0 as s,v0 as t,Un as u};

const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/HiddenContextPanel-LKMYAvbk.js","assets/index-nW7NoFYB.js","assets/useSse-TnJ2INP0.js","assets/useAsyncResource-DHl7pLOA.js","assets/TabOverview-BwJfSHWS.js","assets/TabMemory-DvAq7B_o.js","assets/ContextMap-ClaVI-Y_.js","assets/TabLive-Darc_2kR.js","assets/DataTable-CdhcQ5Al.js","assets/TabEventsStats-BXUtfWYk.js","assets/TabBudget-Ds5AVTKX.js","assets/models-DHnW0Za4.js","assets/TabAnalytics-BScNl5Xj.js","assets/echarts-BbyLWlSf.js","assets/TabExplorer-Bu-4sLvM.js","assets/TabToolConfig-84oPMWrk.js","assets/TabProjectEnv-5SBlGSCZ.js","assets/CAgentsTab-2rdabHJS.js","assets/CDashboardTab-CLRyZOVG.js","assets/CPromptsTab-BWei8cGy.js","assets/CSessionsTab-C9I0goxa.js"])))=>i.map(i=>d[i]);
import{R as Er,d as ee,A as Z,q as ie,y as ae,w as Tr,r as $c,a as Ar,L as yl,c as ii,e as bc,T as Ae,x as Xl,f as Ks,g as _c,m as g,h as wc,i as kc,k as ri,b as at}from"./index-nW7NoFYB.js";import{l as Gs,a as xc,m as Sc,b as Mc,n as Ec,o as Tc,P as Hn,q as Kt,r as yt,v as qn,C as hl,f as Cr,w as Lr,x as Dr,y as Ac,z as $l,A as fo,B as zl,D as Cc,E as Lc,F as Dc,G as ai,H as Pc,I as Rc,J as Os,K as ci,L as jl,S as Oc,M as zc,O as es,Q as Ul,R as ct,s as Ic,h as Nc,T as Kn,U as wl,V as Pr,W as Vc,X as Fc,d as Hc,e as Bc,t as Il,p as jc,Y as Rr,Z as ts,c as Uc,u as Wc,_ as ui,$ as qc,a0 as dl,a1 as Kc,a2 as Gc,a3 as Yc}from"./useSse-TnJ2INP0.js";const kl=Er(null),di=200,fi=80,Jc=["ts","files","tokens","cpu","mem_mb","mcp","mem_tokens","live_sessions","live_tokens","live_in_rate","live_out_rate"];function Qc(e,t){const l=Array.isArray(e)?e.slice():[],n=new Map(l.map((o,a)=>[o.session_id,a]));for(const o of t.upsert||[])n.has(o.session_id)?l[n.get(o.session_id)]=o:(n.set(o.session_id,l.length),l.push(o));for(const o of t.patch||[])n.has(o.session_id)&&(l[n.get(o.session_id)]={...l[n.get(o.session_id)],...o});const s=new Set(t.remove||[]);return s.size?l.filter(o=>!s.has(o.session_id)):l}function Zc(e,t){return Array.isArray(e==null?void 0:e.tools)?{...e,tools:e.tools.map(l=>"live"in l?(t[l.tool]=l.live,l):l.tool in t?{...l,live:t[l.tool]}:l)}:e}function Or(e,t){if(!e)return t;const{sessions_delta:l,tools_rev:n,...s}=t,o=Object.fromEntries((t.tools||[]).map(r=>[r.tool,r])),a={...e,...s,tools:e.tools.map(r=>{const c=o[r.tool];return c?{...r,live:c.live,vendor:c.vendor||r.vendor,host:c.host||r.host}:r})};return l&&(a.sessions=Qc(e.sessions,l)),a}function zr(e,t){var n,s,o,a;if(!e)return e;if(e.ts.push(t.timestamp),e.files.push(t.total_files),e.tokens.push(t.total_tokens),e.cpu.push(Math.round(t.total_cpu*10)/10),e.mem_mb.push(Math.round(t.total_mem_mb*10)/10),e.mcp.push(t.total_mcp_servers),e.mem_tokens.push(t.total_memory_tokens),e.live_sessions.push(t.total_live_sessions),e.live_tokens.push(t.total_live_estimated_tokens),e.live_in_rate.push(Math.round((t.total_live_inbound_rate_bps||0)*100)/100),e.live_out_rate.push(Math.round((t.total_live_outbound_rate_bps||0)*100)/100),e.ts.length>di)for(const r of Jc)e[r]=e[r].slice(-di);const l=e.by_tool||{};for(const r of t.tools||[]){if(r.tool==="aictl")continue;const c=((n=r.live)==null?void 0:n.cpu_percent)||0,d=((s=r.live)==null?void 0:s.mem_mb)||0,v=r.tokens||0,p=(((o=r.live)==null?void 0:o.outbound_rate_bps)||0)+(((a=r.live)==null?void 0:a.inbound_rate_bps)||0);l[r.tool]||(l[r.tool]={ts:[],cpu:[],mem_mb:[],tokens:[],traffic:[]});const m=l[r.tool];if(m.ts.push(t.timestamp),m.cpu.push(Math.round(c*10)/10),m.mem_mb.push(Math.round(d*10)/10),m.tokens.push(v),m.traffic.push(Math.round(p*100)/100),m.ts.length>fi)for(const $ of Object.keys(m))m[$]=m[$].slice(-fi)}return{...e,by_tool:l}}const Xc=15,eu=5;function Ir(e){return(e==null?void 0:e.session_id)??(e==null?void 0:e.id)??null}const pi=/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;function tu(e){return Array.isArray(e==null?void 0:e.alt_session_ids)?e.alt_session_ids:[]}function Ys(e){const t=[];for(const l of[Ir(e),...tu(e)])l!=null&&l!==""&&!t.includes(l)&&t.push(l);return t}function d0(e,t){if(t!=null)return(e||[]).find(l=>Ys(l).includes(t))}function hi(e){return Math.max((e==null?void 0:e.ended_at)||0,(e==null?void 0:e.started_at)||0,(e==null?void 0:e.last_activity)||0)}function mi(e){return e!=null&&e.duration_s?e.duration_s:e!=null&&e.ended_at&&(e!=null&&e.started_at)?e.ended_at-e.started_at:null}function vi(e,t){const[l,n]=hi(t)>hi(e)?[t,e]:[e,t],s={...l};for(const a of["input_tokens","output_tokens","exact_input_tokens","exact_output_tokens","files_modified"]){const r=(n==null?void 0:n[a])||0;r>(s[a]||0)&&(s[a]=r)}for(const a of Object.keys(n||{}))s[a]==null&&n[a]!=null&&(s[a]=n[a]);const o=[];for(const a of[...Ys(l),...Ys(n)])o.includes(a)||o.push(a);if(o.length>1){const a=pi.test(String(o[0]))?o[0]:o.find(r=>pi.test(String(r)))??o[0];s.session_id=a,s.id!=null&&(s.id=a),s.alt_session_ids=o.filter(r=>r!==a)}return s}function nu(e,t){if(!(e!=null&&e.tool)||e.tool!==(t==null?void 0:t.tool)||e.started_at==null||t.started_at==null||Math.abs(e.started_at-t.started_at)>Xc)return!1;const l=mi(e),n=mi(t);return l==null&&n==null?!0:l==null||n==null?!1:Math.abs(l-n)<=eu}function f0(e){if(!Array.isArray(e))return[];if(e.length<2)return e.slice();const t=new Map,l=[];for(const s of e){if(!s)continue;const o=Ir(s);if(o!=null&&t.has(o)){const a=t.get(o);l[a]=vi(l[a],s)}else o!=null&&t.set(o,l.length),l.push(s)}const n=[];for(const s of l){const o=n.findIndex(a=>nu(a,s));o>=0?n[o]=vi(n[o],s):n.push(s)}return n}const it=e=>Number(e)||0;function lu(e){const t=((e==null?void 0:e.tools)||[]).filter(r=>r.tool!=="aictl"),l=r=>Array.isArray(r.files)?r.files:[],n=r=>t.reduce((c,d)=>c+r(d),0),s=r=>r.live||{},o=(e==null?void 0:e.agent_memory)||[],a=r=>{var c,d;return it((c=s(r).token_estimate)==null?void 0:c.input_tokens)+it((d=s(r).token_estimate)==null?void 0:d.output_tokens)};return{total_files:n(r=>Array.isArray(r.files)?r.files.length:it(r.files_count)),total_tokens:n(r=>l(r).reduce((c,d)=>c+it(d.tokens),0)),total_size:n(r=>l(r).reduce((c,d)=>c+it(d.size),0)),total_processes:n(r=>Math.max(Array.isArray(r.processes)?r.processes.length:it(r.processes_count),it(s(r).pid_count))),total_cpu:Math.round(n(r=>s(r).cpu_percent?it(s(r).cpu_percent):(r.processes||[]).reduce((c,d)=>c+it(d.cpu_pct),0))*10)/10,total_mem_mb:Math.round(n(r=>(r.processes||[]).reduce((c,d)=>c+it(d.mem_mb),0))*10)/10,total_mcp_servers:((e==null?void 0:e.mcp_detail)||[]).length,total_memory_tokens:o.reduce((r,c)=>r+it(c.tokens),0),total_live_sessions:n(r=>it(s(r).session_count)),total_live_estimated_tokens:n(a),total_live_outbound_rate_bps:Math.round(n(r=>it(s(r).outbound_rate_bps))*100)/100,total_live_inbound_rate_bps:Math.round(n(r=>it(s(r).inbound_rate_bps))*100)/100}}function su(e,t){if(!e||!Array.isArray(t))return e;const l=e.by_tool||{},n=t.filter(a=>{var r,c;return(c=(r=l[a])==null?void 0:r.ts)==null?void 0:c.length}),s=[...new Set(n.flatMap(a=>l[a].ts))].sort((a,r)=>a-r),o=a=>s.map(r=>n.reduce((c,d)=>{var p;const v=l[d].ts.indexOf(r);return c+(v>=0?it((p=l[d][a])==null?void 0:p[v]):0)},0));return{ts:s,cpu:o("cpu"),mem_mb:o("mem_mb"),tokens:o("tokens"),by_tool:l}}const ou=720;function iu(e={}){const{EventSourceClass:t,refreshMs:l=3e4,applyMs:n=1e3,stallMs:s=6e4,minRefetchGapMs:o=3e4,maxQueued:a=ou}=e,[r,c]=ee(null),[d,v]=ee(null),[p,m]=ee(null),$=Z(!1),x=Z(null),R=Z(!1),k=Z(0),E=Z(Date.now()),w=Z(()=>{}),A=Z(null),S=Z({}),_=Z(!1),M=ie(()=>$.current?Promise.resolve():($.current=!0,k.current=Date.now(),Sc().then(z=>{x.current=(z==null?void 0:z.tools_rev)||null,R.current=!0,c(z),m(Date.now()),w.current()}).catch(()=>{}).finally(()=>{$.current=!1})),[]),C=ie(()=>{if(A.current||$.current)return;const z=Math.max(0,o-(Date.now()-k.current));A.current=setTimeout(()=>{A.current=null,M()},z)},[M,o]);ae(()=>{M(),Gs().then(v).catch(()=>{})},[M]);const L=Z([]),U=Z(0),I=Z(null),D=ie(()=>{I.current&&(clearTimeout(I.current),I.current=null);const z=L.current;!z.length||!R.current||(L.current=[],U.current=Date.now(),c(N=>N&&z.reduce((Pe,ue)=>Or(Pe,ue),N)),v(N=>z.reduce(zr,N)),m(Date.now()))},[]);w.current=D;const Y=ie(z=>{E.current=Date.now();const N=Zc(z,S.current);if(L.current.push(N),L.current.length>a&&(L.current.shift(),_.current=!0),typeof document<"u"&&document.hidden)return;N.tools_rev&&x.current&&N.tools_rev!==x.current&&C();const Pe=n-(Date.now()-U.current);Pe<=0?D():I.current||(I.current=setTimeout(D,Pe))},[n,D,C,a]);ae(()=>{const z=()=>{document.hidden||(_.current&&(_.current=!1,M()),D())};return document.addEventListener("visibilitychange",z),()=>{document.removeEventListener("visibilitychange",z),I.current&&clearTimeout(I.current),A.current&&clearTimeout(A.current)}},[D,M]);const{connected:F}=xc(Mc(),Y,t?{EventSourceClass:t}:{}),K=Z(F);K.current=F;const W=Z(!1);return ae(()=>{F&&(W.current&&M(),W.current=!0)},[F,M]),ae(()=>{if(!l)return;const z=setInterval(()=>{if(document.hidden)return;(!R.current||!K.current||Date.now()-E.current>s)&&M()},l);return()=>clearInterval(z)},[M,l,s]),{snapshot:r,history:d,connected:F,lastUpdateAt:p,refresh:M,setHistory:v}}function Un(e,t=[],{pollMs:l=0}={}){const[n,s]=ee({data:null,error:null,loading:!0,updatedAt:null}),o=Z(e);o.current=e;const a=Z(0),r=ie(()=>{const c=++a.current;return s(d=>({...d,loading:!0})),Promise.resolve().then(()=>o.current()).then(d=>{c===a.current&&s({data:d,error:null,loading:!1,updatedAt:Date.now()})}).catch(d=>{c===a.current&&s(v=>({...v,error:d,loading:!1}))})},[]);return ae(()=>{if(r(),!l)return()=>{a.current++};const c=setInterval(()=>{document.hidden||r()},l);return()=>{clearInterval(c),a.current++}},[r,l,...t]),{...n,reload:r}}const xl=[{id:"live",label:"Live",seconds:3600},{id:"1h",label:"1h",seconds:3600},{id:"6h",label:"6h",seconds:21600},{id:"24h",label:"24h",seconds:86400},{id:"7d",label:"7d",seconds:604800}],ns=Object.fromEntries(xl.map(e=>[e.id,e.seconds])),Nr="aictl-pref-range";function ru(){try{const e=localStorage.getItem(Nr),t=e!=null?JSON.parse(e):"live";return ns[t]?t:"live"}catch{return"live"}}function au(e){try{localStorage.setItem(Nr,JSON.stringify(e))}catch{}}function Js(e){const t=ns[e]||3600;return{id:e,since:Date.now()/1e3-t,until:null}}function cu(){const e=Ar().range;return(e==null?void 0:e.id)==="custom"?e:e&&ns[e.id]?Js(e.id):Js(ru())}function uu(){const[e,t]=ee(cu);ae(()=>{Tr($c(e))},[e]);const l=ie(o=>{t(Js(o)),au(o)},[]),n=ie((o,a)=>{t({id:"custom",since:o,until:a})},[]),s=ie(o=>{typeof o=="string"?l(o):o&&typeof o=="object"&&t(o)},[l]);return{range:e,setRange:s,setPreset:l,setCustom:n,presets:xl}}const Vr="aictl-pref-active_tab",Wl=yl.tabs,Wn=Wl.map(e=>e.id);var Mr;const ql=((Mr=Wl[0])==null?void 0:Mr.id)||"overview";function gi(){const e=ii(Ar().tab,Wn);if(e)return e;try{const t=localStorage.getItem(Vr);return ii(t!=null?JSON.parse(t):null,Wn)||ql}catch{return ql}}function po(e){if(!e)return!1;const t=e.tagName;return t==="INPUT"||t==="TEXTAREA"||t==="SELECT"||e.isContentEditable}function du(){const[e,t]=ee(gi),l=Z(e);l.current=e;const n=ie(s=>{t(s),Tr(bc(s,ql),{push:!0});try{localStorage.setItem(Vr,JSON.stringify(s))}catch{}s===ql&&window.dispatchEvent(new Event("aictl:route"))},[]);return ae(()=>{const s=()=>t(gi());return window.addEventListener("popstate",s),()=>window.removeEventListener("popstate",s)},[]),ae(()=>{const s=o=>{if(po(o.target)||o.metaKey||o.ctrlKey||o.altKey)return;if(o.key==="["||o.key==="]"){const r=o.key==="]"?1:-1,c=Wn.indexOf(l.current);n(Wn[(c+r+Wn.length)%Wn.length]);return}const a=Wl.find(r=>r.key&&r.key===o.key);a&&n(a.id)};return document.addEventListener("keydown",s),()=>document.removeEventListener("keydown",s)},[n]),{activeTab:e,setActiveTab:n,tabs:Wl}}const Fr=["compact","normal","spacious"],Hr="aictl-density",Br=new Set(Fr);function fu(){try{const e=localStorage.getItem(Hr);return Br.has(e)?e:"normal"}catch{return"normal"}}function pu(){const[e,t]=ee(fu);ae(()=>{document.documentElement.setAttribute("data-density",e);try{localStorage.setItem(Hr,e)}catch{}},[e]);const l=ie(n=>{Br.has(n)&&t(n)},[]);return{density:e,setDensity:l,densities:Fr}}const jr="aictl-views-v1";function yi(){try{const e=localStorage.getItem(jr),t=e?JSON.parse(e):[];return Array.isArray(t)?t:[]}catch{return[]}}function $i(e){try{localStorage.setItem(jr,JSON.stringify(e))}catch{}}function bi(e){try{const t=JSON.stringify({tab:e.tab,range:e.range,tools:Array.isArray(e.tools)?[...e.tools].sort():e.tools,density:e.density,theme:e.theme});let l=5381;for(let n=0;n<t.length;n++)l=(l<<5)+l+t.charCodeAt(n)|0;return String(l)}catch{return""}}function hu(){return"v_"+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4)}function mu(e,t){const[l,n]=ee(yi);ae(()=>{if(!(typeof window>"u"))try{const v=new URLSearchParams(window.location.search).get("view");if(!v)return;const p=yi().find(m=>m.id===v);p&&t&&t(p)}catch{}},[]);const s=ie(d=>{const v=(d||"").trim();if(!v)return null;const p={id:hu(),name:v,tab:e.tab,range:e.range,tools:e.tools,density:e.density,theme:e.theme,createdAt:Date.now()};return n(m=>{const $=[...m,p];return $i($),$}),p},[e]),o=ie(d=>{n(v=>{const p=v.filter(m=>m.id!==d);return $i(p),p})},[]),a=ie(d=>{const v=l.find(p=>p.id===d);if(!v)return!1;t&&t(v);try{const p=new URL(window.location.href);p.searchParams.set("view",d),window.history.replaceState({},"",p.toString())}catch{}return!0},[l,t]),r=Ae(()=>bi(e),[e]),c=Ae(()=>l.find(d=>bi({tab:d.tab,range:d.range,tools:d.tools,density:d.density,theme:d.theme})===r)||null,[l,r]);return{views:l,saveView:s,deleteView:o,applyView:a,currentHash:r,matchingView:c}}const Ur="aictl-cmdpalette-lru-v1",Wr=5;function vu(){try{const e=localStorage.getItem(Ur),t=e?JSON.parse(e):[];return Array.isArray(t)?t.slice(0,Wr):[]}catch{return[]}}function gu(e){try{localStorage.setItem(Ur,JSON.stringify(e))}catch{}}function yu(){const[e,t]=ee(!1),[l,n]=ee(vu),s=ie(()=>t(!0),[]),o=ie(()=>t(!1),[]),a=ie(()=>t(c=>!c),[]),r=ie(c=>{c&&n(d=>{const v=[c,...d.filter(p=>p!==c)].slice(0,Wr);return gu(v),v})},[]);return ae(()=>{const c=d=>{(d.metaKey||d.ctrlKey)&&(d.key==="k"||d.key==="K")&&(d.preventDefault(),t(p=>!p))};return document.addEventListener("keydown",c),()=>document.removeEventListener("keydown",c)},[]),{isOpen:e,open:s,close:o,toggle:a,lru:l,recordUse:r}}let Sl=null,qr=null;if(typeof document<"u"){document.addEventListener("aictl:select-session",t=>{var l;Sl=(l=t==null?void 0:t.detail)!=null&&l.sessionId?t.detail:null});const e=new URLSearchParams(window.location.search).get("session");e&&(Sl={sessionId:e,tool:null})}function p0(){const e=Sl||qr;return Sl=null,e}function h0(){Sl=null}function m0(e,t){qr=e?{sessionId:e,tool:t||null}:null}function $u(){var t;if(typeof navigator>"u")return!1;const e=((t=navigator.userAgentData)==null?void 0:t.platform)||navigator.platform||navigator.userAgent||"";return/mac|iphone|ipad/i.test(e)}function v0(){var t;if(typeof navigator>"u")return!1;const e=((t=navigator.userAgentData)==null?void 0:t.platform)||navigator.platform||navigator.userAgent||"";return/win/i.test(e)&&!/darwin/i.test(e)}function Kr(){return $u()?"⌘K":"Ctrl+K"}/**
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
 */const bu=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(t,l,n)=>n?n.toUpperCase():l.toLowerCase());/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wi=e=>{const t=bu(e);return t.charAt(0).toUpperCase()+t.slice(1)};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var _u={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wu=Er({size:24,color:"currentColor",strokeWidth:2,absoluteStrokeWidth:!1,class:""}),ku=()=>Xl(wu);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xu=e=>{for(const t in e)if(t.startsWith("aria-")||t==="role"||t==="title")return!0;return!1};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Su=({color:e,size:t,strokeWidth:l,absoluteStrokeWidth:n,children:s,iconNode:o,class:a="",...r})=>{const{size:c=24,strokeWidth:d=2,absoluteStrokeWidth:v=!1,color:p="currentColor",class:m=""}=ku()??{},$=n??v?Number(l??d)*24/Number(t??c):l??d;return Ks("svg",{..._u,width:t??c??24,height:t??c??24,stroke:e??p,"stroke-width":$,class:Gr("lucide",m,a),...!s&&!xu(r)&&{"aria-hidden":"true"},...r},[...o.map(([x,R])=>Ks(x,R)),..._c(s)])};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J=(e,t)=>{const l=({class:n="",className:s="",children:o,...a})=>Ks(Su,{...a,iconNode:t,class:Gr(`lucide-${_i(wi(e))}`,`lucide-${_i(e)}`,n,s)},o);return l.displayName=wi(e),l};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mu=J("activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Eu=J("archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tu=J("banknote",[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Au=J("book-open",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cu=J("bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lu=J("brain-circuit",[["path",{d:"M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z",key:"l5xja"}],["path",{d:"M9 13a4.5 4.5 0 0 0 3-4",key:"10igwf"}],["path",{d:"M6.003 5.125A3 3 0 0 0 6.401 6.5",key:"105sqy"}],["path",{d:"M3.477 10.896a4 4 0 0 1 .585-.396",key:"ql3yin"}],["path",{d:"M6 18a4 4 0 0 1-1.967-.516",key:"2e4loj"}],["path",{d:"M12 13h4",key:"1ku699"}],["path",{d:"M12 18h6a2 2 0 0 1 2 2v1",key:"105ag5"}],["path",{d:"M12 8h8",key:"1lhi5i"}],["path",{d:"M16 8V5a2 2 0 0 1 2-2",key:"u6izg6"}],["circle",{cx:"16",cy:"13",r:".5",key:"ry7gng"}],["circle",{cx:"18",cy:"3",r:".5",key:"1aiba7"}],["circle",{cx:"20",cy:"21",r:".5",key:"yhc1fs"}],["circle",{cx:"20",cy:"8",r:".5",key:"1e43v0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Du=J("brain",[["path",{d:"M12 18V5",key:"adv99a"}],["path",{d:"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4",key:"1e3is1"}],["path",{d:"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5",key:"1gqd8o"}],["path",{d:"M17.997 5.125a4 4 0 0 1 2.526 5.77",key:"iwvgf7"}],["path",{d:"M18 18a4 4 0 0 0 2-7.464",key:"efp6ie"}],["path",{d:"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517",key:"1gq6am"}],["path",{d:"M6 18a4 4 0 0 1-2-7.464",key:"k1g0md"}],["path",{d:"M6.003 5.125a4 4 0 0 0-2.526 5.77",key:"q97ue3"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pu=J("chart-column",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ru=J("chart-line",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ou=J("chevron-down",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zu=J("chevron-right",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Iu=J("clipboard-list",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nu=J("clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 6v6l4 2",key:"mmk7yg"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vu=J("coins",[["path",{d:"M13.744 17.736a6 6 0 1 1-7.48-7.48",key:"bq4yh3"}],["path",{d:"M15 6h1v4",key:"11y1tn"}],["path",{d:"m6.134 14.768.866-.5 2 3.464",key:"17snzx"}],["circle",{cx:"16",cy:"8",r:"6",key:"14bfc9"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fu=J("command",[["path",{d:"M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3",key:"11bfej"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hu=J("cpu",[["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M17 20v2",key:"1rnc9c"}],["path",{d:"M17 2v2",key:"11trls"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M2 17h2",key:"7oei6x"}],["path",{d:"M2 7h2",key:"asdhe0"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"M20 17h2",key:"1fpfkl"}],["path",{d:"M20 7h2",key:"1o8tra"}],["path",{d:"M7 20v2",key:"4gnj0m"}],["path",{d:"M7 2v2",key:"1i4yhu"}],["rect",{x:"4",y:"4",width:"16",height:"16",rx:"2",key:"1vbyd7"}],["rect",{x:"8",y:"8",width:"8",height:"8",rx:"1",key:"z9xiuo"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bu=J("eye-off",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ju=J("file-pen",[["path",{d:"M12.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v9.34",key:"o6klzx"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10.378 12.622a1 1 0 0 1 3 3.003L8.36 20.637a2 2 0 0 1-.854.506l-2.867.837a.5.5 0 0 1-.62-.62l.836-2.869a2 2 0 0 1 .506-.853z",key:"zhnas1"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uu=J("file-text",[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wu=J("folder",[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",key:"1kt360"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qu=J("funnel",[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ku=J("git-branch",[["path",{d:"M15 6a9 9 0 0 0-9 9V3",key:"1cii5b"}],["circle",{cx:"18",cy:"6",r:"3",key:"1h7g24"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gu=J("globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yu=J("grid-3x3",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M3 15h18",key:"5xshup"}],["path",{d:"M9 3v18",key:"fh3hqa"}],["path",{d:"M15 3v18",key:"14nvp0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ju=J("layout-dashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qu=J("layers",[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zu=J("lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xu=J("mail",[["path",{d:"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7",key:"132q7q"}],["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2",key:"izxlao"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ed=J("menu",[["path",{d:"M4 5h16",key:"1tepv9"}],["path",{d:"M4 12h16",key:"1lakjw"}],["path",{d:"M4 19h16",key:"1djgab"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const td=J("message-square",[["path",{d:"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",key:"18887p"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nd=J("moon",[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ld=J("package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sd=J("pen",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const od=J("plug",[["path",{d:"M12 22v-5",key:"1ega77"}],["path",{d:"M15 8V2",key:"18g5xt"}],["path",{d:"M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z",key:"1xoxul"}],["path",{d:"M9 8V2",key:"14iosj"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const id=J("radio",[["path",{d:"M16.247 7.761a6 6 0 0 1 0 8.478",key:"1fwjs5"}],["path",{d:"M19.075 4.933a10 10 0 0 1 0 14.134",key:"ehdyv1"}],["path",{d:"M4.925 19.067a10 10 0 0 1 0-14.134",key:"1q22gi"}],["path",{d:"M7.753 16.239a6 6 0 0 1 0-8.478",key:"r2q7qm"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rd=J("refresh-cw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ad=J("save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yr=J("search",[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cd=J("server",[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ud=J("settings",[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dd=J("sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fd=J("trash-2",[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pd=J("triangle-alert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hd=J("user",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const md=J("users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vd=J("wallet",[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gd=J("webhook",[["path",{d:"M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2",key:"q3hayz"}],["path",{d:"m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06",key:"1go1hn"}],["path",{d:"m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8",key:"qlwsc0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yd=J("wrench",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",key:"1ngwbx"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $d=J("x",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bd=J("zap",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]),_d={activity:Mu,"alert-triangle":pd,filter:qu,"eye-off":Bu,archive:Eu,banknote:Tu,"bar-chart-3":Pu,"book-open":Au,bot:Cu,brain:Du,"brain-circuit":Lu,"chevron-down":Ou,"chevron-right":zu,"clipboard-list":Iu,clock:Nu,coins:Vu,cpu:Hu,"file-pen":ju,"file-text":Uu,folder:Wu,"git-branch":Ku,globe:Gu,"grid-3x3":Yu,layers:Qu,"layout-dashboard":Ju,"line-chart":Ru,lock:Zu,mail:Xu,"message-square":td,moon:nd,package:ld,pen:sd,plug:od,radio:id,"refresh-cw":rd,search:Yr,server:cd,settings:ud,sun:dd,user:hd,users:md,wallet:vd,webhook:gd,wrench:yd,x:$d,zap:bd};function Nt({name:e,size:t="1em",strokeWidth:l=2,...n}){if(!e)return null;const s=_d[String(e)];return s?g`<${s} size=${t} strokeWidth=${l} aria-hidden="true" ...${n} />`:g`<span aria-hidden="true" ...${n}>${e}</span>`}function wd({tool:e,tools:t}){const l=(t||[e]).filter(Boolean).map(n=>n.label||n.tool).join(", ");return g`<div class="panel-state panel-state--withheld" role="status">
    <${Nt} name="radio" size="14"/>
    <div>
      <div class="panel-state__title">Not available from this machine</div>
      <div class="panel-state__hint">${l} runs in the vendor's cloud, so it leaves no local sessions, processes, tokens or files for aictl to read. Its activity is visible only in the vendor's admin reports.</div>
    </div>
  </div>`}const kd=new Set(["overview","live","procs","events","explorer"]),xd=3e4;function Sd(e,t,{activeTab:l,now:n=Date.now()}){var r;const s={value:t,at:n,tab:l};return!e||kd.has(l)||e.tab!==l||!!!((r=e.value)!=null&&r.snap)&&t.snap||!(e.value.enabledTools===t.enabledTools&&e.value.globalRange===t.globalRange&&e.value.openViewer===t.openViewer&&e.value.recentFiles===t.recentFiles)||n-e.at>=xd?s:e}function Md({count:e}){return e?g`<div class="panel-state panel-state--note" role="note" data-testid="filter-hidden-note">
    <${Nt} name="filter" size="12"/>
    <span>${e} row${e===1?"":"s"} from unattributed or unverified tools ${e===1?"is":"are"} hidden while the tool filter is on. Choose All tools to see ${e===1?"it":"them"}.</span>
  </div>`:null}function Ed({path:e,at:t,onClose:l}){const{snap:n}=Xl(kl),[s,o]=ee(null),[a,r]=ee(!1),[c,d]=ee(null),v=Z(null),p=Z(null),[m,$]=ee(()=>{try{return parseInt(localStorage.getItem("aictl-viewer-width"))||55}catch{return 55}}),x=Z(!1),R=Z(0),k=Z(0),E=ie(C=>{x.current=!0,R.current=C.clientX,k.current=m,C.preventDefault()},[m]);if(ae(()=>{const C=U=>{if(!x.current)return;const I=R.current-U.clientX,D=window.innerWidth,Y=Math.min(90,Math.max(20,k.current+I/D*100));$(Y)},L=()=>{if(x.current){x.current=!1;try{localStorage.setItem("aictl-viewer-width",String(Math.round(m)))}catch{}}};return window.addEventListener("mousemove",C),window.addEventListener("mouseup",L),()=>{window.removeEventListener("mousemove",C),window.removeEventListener("mouseup",L)}},[m]),ae(()=>{if(!e)return;p.current=document.activeElement;const C=setTimeout(()=>{var I;const U=(I=v.current)==null?void 0:I.querySelector("button");U&&U.focus()},50),L=U=>{if(U.key!=="Tab"||!v.current)return;const I=v.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');if(!I.length)return;const D=I[0],Y=I[I.length-1];U.shiftKey&&document.activeElement===D?(U.preventDefault(),Y.focus()):!U.shiftKey&&document.activeElement===Y&&(U.preventDefault(),D.focus())};return document.addEventListener("keydown",L),()=>{clearTimeout(C),document.removeEventListener("keydown",L),p.current&&p.current.focus&&p.current.focus()}},[e]),ae(()=>{if(!e)return;r(!1),d(null),o(null),(t?Ec(e,t):Tc(e)).then(o).catch(L=>d(L.message))},[e,t]),!e)return null;const w=Ae(()=>{if(!n)return"";for(const C of n.tools)for(const L of C.files)if(L.path===e)return(L.kind||"")+" | "+Kt(L.size)+" | ~"+yt(L.tokens)+"tok | scope:"+(L.scope||"?")+" | sent_to_llm:"+(L.sent_to_llm||"?")+" | loaded:"+(L.loaded_when||"?");for(const C of n.agent_memory)if(C.file===e)return C.source+" | "+C.profile+" | "+C.tokens+"tok | "+C.lines+"ln";return""},[n,e]),A=s?s.split(`
`):[],S=A.length,_=S>Hn*2,M=(C,L)=>C.map((U,I)=>g`<div class="fv-line"><span class="fv-ln">${L+I}</span><span class="fv-code">${qn(U)||" "}</span></div>`);return g`<div class="fv" ref=${v} role="dialog" aria-modal="true" aria-label="File viewer" style=${"width:"+m+"vw"}>
    <div class="file-viewer__resize-handle" onMouseDown=${E}/>
    <div class="fv-head">
      <span class="path">${e}</span>
      ${t&&g`<span class="badge text-xs mono" style="background:var(--bg2);color:var(--fg2);margin-left:var(--sp-2)"
        title=${"Historical content at unix ts "+t}>@ ${new Date(t*1e3).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>`}
      <button onClick=${l} aria-label="Close file viewer">Close (Esc)</button>
    </div>
    <div class="fv-meta">${w}</div>
    <div class="fv-body">
      ${c?g`<p class="text-red" style="padding:var(--sp-10)">${c}</p>`:s?!_||a?g`<div class="fv-lines">${M(A,1)}</div>`:g`<div class="fv-lines">${M(A.slice(0,Hn),1)}</div>
            <div class="fv-ellipsis" onClick=${()=>r(!0)}>\u25BC ${S-Hn*2} more lines \u25BC</div>
            <div class="fv-lines">${M(A.slice(-Hn),S-Hn+1)}</div>`:g`<p class="text-muted" style="padding:var(--sp-10)">Loading...</p>`}
    </div>
    <div class="fv-toolbar">
      <span>${S} lines${_&&!a?" (showing "+Hn*2+" of "+S+")":""}</span>
      ${_&&g`<button onClick=${()=>r(!a)}>${a?"Collapse":"Show all"}</button>`}
    </div>
  </div>`}function on({variant:e="secondary",size:t="md",loading:l=!1,disabled:n=!1,type:s="button",onClick:o,class:a,className:r,children:c,...d}){const v=["aictl-ui-btn",`aictl-ui-btn--${e}`,t==="sm"?"aictl-ui-btn--sm":null,a,r].filter(Boolean).join(" "),p=n||l;return g`<button
    type=${s}
    class=${v}
    disabled=${p}
    aria-busy=${l?"true":null}
    onClick=${p?void 0:o}
    ...${d}
  >${l?g`<span class="aictl-ui-btn__spinner" aria-hidden="true"></span>`:null}${c}</button>`}function ki({variant:e="neutral",size:t="sm",dot:l=!1,class:n,className:s,children:o,...a}){const r=["aictl-ui-badge",`aictl-ui-badge--${e}`,t==="md"?"aictl-ui-badge--md":null,n,s].filter(Boolean).join(" ");return g`<span class=${r} ...${a}>
    ${l?g`<span class="aictl-ui-badge__dot" aria-hidden="true"></span>`:null}
    ${o}
  </span>`}function Td(e,t,l){let s=0,o=0;switch(l){case"top":s=e.top-t.height-6,o=e.left+(e.width-t.width)/2;break;case"bottom":s=e.bottom+6,o=e.left+(e.width-t.width)/2;break;case"left":s=e.top+(e.height-t.height)/2,o=e.left-t.width-6;break;case"right":default:s=e.top+(e.height-t.height)/2,o=e.right+6;break}const a=window.innerWidth,r=window.innerHeight;return o=Math.max(4,Math.min(o,a-t.width-4)),s=Math.max(4,Math.min(s,r-t.height-4)),{top:s,left:o}}function xi({content:e,placement:t="top",open:l,onOpenChange:n,children:s,class:o,className:a,...r}){const[c,d]=ee(!1),v=l!==void 0?l:c,p=ie(S=>{l===void 0&&d(S),n&&n(S)},[l,n]),m=Z(null),$=Z(null),x=wc(),[R,k]=ee({top:-9999,left:-9999});ae(()=>{if(!v)return;const S=m.current,_=$.current;if(!S||!_)return;const M=()=>k(Td(S.getBoundingClientRect(),_.getBoundingClientRect(),t));return M(),window.addEventListener("scroll",M,!0),window.addEventListener("resize",M),()=>{window.removeEventListener("scroll",M,!0),window.removeEventListener("resize",M)}},[v,t,e]);const E=()=>p(!0),w=()=>p(!1),A=["aictl-ui-tooltip-wrap",o,a].filter(Boolean).join(" ");return g`<span
    ref=${m}
    class=${A}
    onMouseEnter=${E}
    onMouseLeave=${w}
    onFocusIn=${E}
    onFocusOut=${w}
    aria-describedby=${v?x:null}
    ...${r}
  >
    ${s}
    ${v?g`<span
      ref=${$}
      id=${x}
      role="tooltip"
      class="aictl-ui-tooltip"
      style=${`top:${R.top}px;left:${R.left}px`}
    >${e}</span>`:null}
  </span>`}function Ad(e,t,l){let s=0,o=0;switch(l){case"top":s=e.top-t.height-6,o=e.left;break;case"left":s=e.top,o=e.left-t.width-6;break;case"right":s=e.top,o=e.right+6;break;case"bottom":default:s=e.bottom+6,o=e.left;break}const a=window.innerWidth,r=window.innerHeight;return o=Math.max(4,Math.min(o,a-t.width-4)),s=Math.max(4,Math.min(s,r-t.height-4)),{top:s,left:o}}const Si='a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';function Kl({trigger:e,placement:t="bottom",open:l,onOpenChange:n,children:s,class:o,className:a,...r}){const[c,d]=ee(!1),v=l!==void 0?l:c,p=ie(w=>{l===void 0&&d(w),n&&n(w)},[l,n]),m=Z(null),$=Z(null),[x,R]=ee({top:-9999,left:-9999});ae(()=>{if(!v)return;const w=m.current,A=$.current;if(!w||!A)return;const S=()=>R(Ad(w.getBoundingClientRect(),A.getBoundingClientRect(),t));S();const _=L=>{!A.contains(L.target)&&!w.contains(L.target)&&p(!1)},M=L=>{if(L.key==="Escape"){p(!1),w.focus&&w.focus();return}if(L.key==="Tab"){const U=A.querySelectorAll(Si);if(!U.length)return;const I=U[0],D=U[U.length-1];L.shiftKey&&document.activeElement===I?(L.preventDefault(),D.focus()):!L.shiftKey&&document.activeElement===D&&(L.preventDefault(),I.focus())}};document.addEventListener("mousedown",_),document.addEventListener("keydown",M),window.addEventListener("resize",S);const C=A.querySelector(Si);return C?C.focus():A.focus(),()=>{document.removeEventListener("mousedown",_),document.removeEventListener("keydown",M),window.removeEventListener("resize",S)}},[v,t,p]);const k=w=>{w.stopPropagation(),p(!v)},E=["aictl-ui-popover",o,a].filter(Boolean).join(" ");return g`<span style="display:inline-flex;position:relative" ...${r}>
    <span ref=${m} onClick=${k}>${e}</span>
    ${v?g`<div
      ref=${$}
      class=${E}
      role="dialog"
      tabindex="-1"
      style=${`top:${x.top}px;left:${x.left}px`}
    >${s}</div>`:null}
  </span>`}const Mi='a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';function Jn({open:e,onClose:t,ariaLabel:l,labelledBy:n,children:s,closeOnBackdrop:o=!0,class:a,className:r,...c}){const d=Z(null),v=Z(null),p=ie(()=>{t&&t()},[t]);if(ae(()=>{if(!e)return;v.current=document.activeElement;const x=d.current;if(!x)return;(x.querySelector(Mi)||x).focus();const k=E=>{if(E.key==="Escape"){E.stopPropagation(),p();return}if(E.key==="Tab"){const w=x.querySelectorAll(Mi);if(!w.length){E.preventDefault();return}const A=w[0],S=w[w.length-1];E.shiftKey&&document.activeElement===A?(E.preventDefault(),S.focus()):!E.shiftKey&&document.activeElement===S&&(E.preventDefault(),A.focus())}};return document.addEventListener("keydown",k),()=>{document.removeEventListener("keydown",k),v.current&&v.current.focus&&v.current.focus()}},[e,p]),!e)return null;const m=x=>{o&&x.target===x.currentTarget&&p()},$=["aictl-ui-dialog",a,r].filter(Boolean).join(" ");return g`<div class="aictl-ui-dialog-backdrop" onMouseDown=${m}>
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
  </div>`}function Cd({options:e=[],value:t,onChange:l,ariaLabel:n,class:s,className:o,...a}){const r=["aictl-ui-segmented",s,o].filter(Boolean).join(" "),c=Z([]),d=v=>{var $;if(!e.length)return;const p=Math.max(0,e.findIndex(x=>x.value===t));let m=null;v.key==="ArrowRight"||v.key==="ArrowDown"?m=(p+1)%e.length:v.key==="ArrowLeft"||v.key==="ArrowUp"?m=(p-1+e.length)%e.length:v.key==="Home"?m=0:v.key==="End"&&(m=e.length-1),m!=null&&(v.preventDefault(),l&&l(e[m].value),($=c.current[m])==null||$.focus())};return g`<div
    class=${r}
    role="radiogroup"
    aria-label=${n||null}
    ...${a}
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
    >${v.icon?g`<${Nt} name=${v.icon} size="0.9em"/>`:null}${v.label}</button>`})}</div>`}function tt({class:e,className:t,children:l,...n}){const s=["aictl-ui-kbd",e,t].filter(Boolean).join(" ");return g`<kbd class=${s} ...${n}>${l}</kbd>`}function Jr({icon:e,title:t,description:l,action:n,source:s,class:o,className:a,...r}){const c=["aictl-ui-empty",o,a].filter(Boolean).join(" ");return g`<div class=${c} role="status" ...${r}>
    ${e?g`<div class="aictl-ui-empty__icon">
      ${typeof e=="string"?g`<${Nt} name=${e} size="32"/>`:e}
    </div>`:null}
    ${t?g`<div class="aictl-ui-empty__title">${t}</div>`:null}
    ${l?g`<div class="aictl-ui-empty__desc">${l}</div>`:null}
    ${n?g`<div>${n}</div>`:null}
    ${s?g`<div class="aictl-ui-empty__source" title="Data source for this view">${s}</div>`:null}
  </div>`}function Gn({height:e="1em",width:t="100%",radius:l="4px",count:n=1,class:s,className:o,style:a,...r}){const c=["aictl-ui-skel",s,o].filter(Boolean).join(" "),d={height:e,width:t,borderRadius:l};if(n<=1)return g`<span class=${c} style=${{...d,...a||{}}} aria-hidden="true" ...${r}></span>`;const v=[];for(let p=0;p<n;p++)v.push(p);return g`<span style="display:flex;flex-direction:column;gap:var(--sp-2)" aria-hidden="true" ...${r}>
    ${v.map(p=>g`<span key=${p} class=${c} style=${{...d,...a||{}}}></span>`)}
  </span>`}const Ld=window.TOOL_VENDORS??{},Dd={"claude-code":"anthropic","claude-desktop":"anthropic","claude-mcp-memory":"anthropic",copilot:"github","copilot-vscode":"github","copilot-cli":"github","copilot-desktop":"github","copilot-jetbrains":"github","copilot-vs":"github",copilot365:"microsoft","codex-cli":"openai","chatgpt-desktop":"openai","chatgpt-lencx":"openai",gemini:"google","gemini-cli":"google",cursor:"cursor-inc",windsurf:"codeium",openclaw:"community",vscode:"microsoft"},Ei={anthropic:'<path d="M12 4.5V19.5"/><path d="M4.5 12H19.5"/><path d="M6.7 6.7 17.3 17.3"/><path d="M17.3 6.7 6.7 17.3"/>',github:'<rect x="3.5" y="6.5" width="17" height="11" rx="5.5" fill="none"/><circle cx="9.2" cy="12" r="1.6" stroke="none" fill="currentColor"/><circle cx="14.8" cy="12" r="1.6" stroke="none" fill="currentColor"/>',microsoft:'<rect x="3.5" y="6.5" width="17" height="11" rx="5.5" fill="none"/><circle cx="9.2" cy="12" r="1.6" stroke="none" fill="currentColor"/><circle cx="14.8" cy="12" r="1.6" stroke="none" fill="currentColor"/>',openai:'<path d="M12 3.2 19.6 7.6V16.4L12 20.8 4.4 16.4V7.6Z" fill="none"/>',google:'<path d="M12 3.2C12 8 16 12 20.8 12C16 12 12 16 12 20.8C12 16 8 12 3.2 12C8 12 12 8 12 3.2Z" stroke="none" fill="currentColor"/>',"cursor-inc":'<path d="M6 3.5 6 18 10 14 12.6 19.5 15 18.4 12.4 13 18 13Z" fill="none" stroke-linejoin="round"/>',codeium:'<path d="M11.5 4 16 12.5H11.5Z" stroke="none" fill="currentColor"/><path d="M4 16C7 12.5 9.5 12.5 12 16 14.5 19.5 17 19.5 20 16" fill="none" stroke-linecap="round"/>',community:'<path d="M17 4.5C10 5.5 5.5 9.5 5.5 13.5 5.5 17 8 19.5 11.5 19.5" fill="none" stroke-linecap="round"/><path d="M17 4.5 13.5 6M17 4.5 18.8 7.8" stroke-linecap="round"/>',_fallback:'<circle cx="12" cy="12" r="4.5" stroke="none" fill="currentColor"/>'};function Pd(e){return Ld[e]||Dd[e]||""}function ls({tool:e,size:t="1em",strokeWidth:l=2,...n}){const s=Pd(e),o=Ei[s]||Ei._fallback,a=hl[e]||"var(--fg2)";return g`<svg class="tool-ico" viewBox="0 0 24 24" width=${t} height=${t}
    fill="none" stroke="currentColor" stroke-width=${l} stroke-linecap="round"
    style=${"color:"+a} aria-hidden="true" ...${n}
    dangerouslySetInnerHTML=${{__html:o}}></svg>`}const Qs=new Set;let Rd=0;const zs=3,Od=5e3;function Qr(e){Qs.forEach(t=>{try{t(e)}catch{}})}function zd(e){return Qs.add(e),()=>Qs.delete(e)}function Is(e,t,l={}){const n=++Rd;return Qr({type:"add",toast:{id:n,variant:e,message:t,ttl:l.ttl||Od}}),n}function Zr(e){Qr({type:"remove",id:e})}const Zs={success:(e,t)=>Is("success",e,t),error:(e,t)=>Is("error",e,t),info:(e,t)=>Is("info",e,t),dismiss:Zr};function Id(){const[e,t]=ee([]),l=Z(new Map);ae(()=>{const o=l.current,a=c=>{const d=o.get(c);d!=null&&d.tid&&clearTimeout(d.tid),o.delete(c)},r=zd(c=>{if(c.type==="add"){t(v=>{const p=[...v,c.toast];return p.length>zs?(p.slice(0,p.length-zs).forEach(m=>a(m.id)),p.slice(p.length-zs)):p});const d=setTimeout(()=>{t(v=>v.filter(p=>p.id!==c.toast.id)),o.delete(c.toast.id)},c.toast.ttl);o.set(c.toast.id,{tid:d,expiresAt:Date.now()+c.toast.ttl,remaining:null})}else c.type==="remove"&&(a(c.id),t(d=>d.filter(v=>v.id!==c.id)))});return()=>{r(),o.forEach(c=>{c.tid&&clearTimeout(c.tid)}),o.clear()}},[]);const n=ie(o=>{const r=l.current.get(o);!r||r.tid==null||(clearTimeout(r.tid),r.tid=null,r.remaining=Math.max(500,r.expiresAt-Date.now()))},[]),s=ie(o=>{const a=l.current,r=a.get(o);if(!r||r.tid!=null)return;const c=r.remaining??500;r.expiresAt=Date.now()+c,r.remaining=null,r.tid=setTimeout(()=>{t(d=>d.filter(v=>v.id!==o)),a.delete(o)},c)},[]);return e.length?g`<div class="aictl-ui-toast-stack" role="region" aria-label="Notifications">
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
  </div>`:null}const Nd={active:"var(--green)",degraded:"var(--orange)",disabled:"var(--fg2)",unknown:"var(--fg2)"},Vd={error:"var(--red)",warning:"var(--orange)"},Ti=20;function Ai(e,t,l){const n=t==="cpu_percent"?"daemon_cpu_percent":"daemon_"+t,s=["daemon "+l(e[n]||0)];for(const o of e.children||[])s.push(o.name+" ("+o.pid+") "+l(o[t]||0));return s.join(" + ")}function Ci(){var k,E,w,A,S;const{snap:e}=Xl(kl),[t,l]=ee(null),[n,s]=ee(null),[o,a]=ee(null),[r,c]=ee(null);ae(()=>{let _=!0;const M=()=>{Cr().then(L=>{_&&l(L)}).catch(()=>{}),Lr().then(L=>{_&&s(L)}).catch(()=>{}),Dr({limit:Ti}).then(L=>{_&&a(Array.isArray(L==null?void 0:L.items)?L.items:[])}).catch(()=>{}),Ac().then(L=>{_&&c(Array.isArray(L==null?void 0:L.ingesters)?L.ingesters:[])}).catch(()=>{})};M();const C=setInterval(M,15e3);return()=>{_=!1,clearInterval(C)}},[]);const d=Ae(()=>{if(!e)return[];const _=e.tool_telemetry||[];return e.tools.filter(M=>M.tool!=="aictl"&&M.tool!=="any").map(M=>{var Y,F,K,W,z;const C=_.find(N=>N.tool===M.tool),L=M.live||{},U=L.last_seen_at||0,I=U>0?Math.floor(Date.now()/1e3-U):-1,D=I>3600||I<0;return{tool:M.tool,label:M.label,source:(C==null?void 0:C.source)||(L.session_count?"live-monitor":"discovery"),confidence:(C==null?void 0:C.confidence)||((Y=L.token_estimate)==null?void 0:Y.confidence)||0,inputTokens:(C==null?void 0:C.input_tokens)||0,outputTokens:(C==null?void 0:C.output_tokens)||0,cost:(C==null?void 0:C.cost_usd)??null,sessions:(C==null?void 0:C.total_sessions)||L.session_count||0,errors:((F=C==null?void 0:C.errors)==null?void 0:F.length)||0,lastError:((K=C==null?void 0:C.errors)==null?void 0:K[0])||null,lastSeen:I,stale:D,fileCount:M.files.length,procCount:M.processes.length,hasLive:!!M.live,hasOtel:!!((z=(W=L.sources||[]).includes)!=null&&z.call(W,"otel"))}}).sort((M,C)=>C.inputTokens+C.outputTokens-(M.inputTokens+M.outputTokens))},[e]),v=Ae(()=>{var _;return(_=e==null?void 0:e.live_monitor)!=null&&_.diagnostics?Object.entries(e.live_monitor.diagnostics).map(([M,C])=>({name:M,status:C.status||"unknown",mode:C.mode||"",detail:C.detail||""})):[]},[e]);if(!e)return null;const p=d.length,m=d.filter(_=>_.inputTokens+_.outputTokens>0).length,$=d.filter(_=>_.hasLive).length,x=d.filter(_=>_.stale&&_.hasLive).length,R=d.reduce((_,M)=>_+M.errors,0);return g`<div class="diag-card" role="region" aria-label="Collector health">
    <h3 style=${{marginBottom:"var(--sp-4)"}}>Monitoring Health</h3>

    <!-- Summary badges -->
    <div class="flex-row flex-wrap gap-sm mb-md">
      <span class="badge" data-dp="overview.collector_health.tools_with_telemetry" style="background:var(--green);color:var(--on-status)">${m}/${p} tools with telemetry</span>
      <span class="badge" data-dp="overview.collector_health.live_tools" style="background:var(--accent);color:var(--on-status)">${$} live</span>
      ${x>0?g`<span class="badge" data-dp="overview.collector_health.stale_tools" style="background:var(--orange);color:var(--on-status)">${x} stale</span>`:null}
      ${R>0?g`<span class="badge" data-dp="overview.collector_health.errors" style="background:var(--red);color:var(--on-status)">${R} errors</span>`:null}
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
          <div class="metric-chip-value">${Kt(((k=n.db)==null?void 0:k.file_size_bytes)||0)}</div>
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
            ${yt((((E=n.db)==null?void 0:E.metrics_count)||0)+(((w=n.db)==null?void 0:w.tool_metrics_count)||0)+(((A=n.db)==null?void 0:A.events_count)||0)+(((S=n.db)==null?void 0:S.samples_count)||0))}</div>
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
        ${t.last_receive_at>0?g`<span class="text-muted">Last: ${zl(t.last_receive_at)}</span>`:null}
      </div>
    </div>`:null}

    <!-- Local-store ingesters (copilot / cursor / vscode chat pollers) -->
    ${r!=null?g`<div class="mb-md" data-dp="overview.collector_health.ingesters">
      <div class="es-section-title">Ingesters</div>
      ${r.length===0?g`<div class="text-xs text-muted">No ingesters running</div>`:r.map(_=>{const M=_.last_poll_ts?zl(_.last_poll_ts):"never polled";return g`<div key=${_.name}
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
              ${_.lastSeen>=0?g`<span style="color:${_.stale?"var(--orange)":"var(--fg2)"}">${zl(Date.now()/1e3-_.lastSeen)}</span>`:g`<span class="text-muted">\u2014</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${_.fileCount}</td>
          </tr>`})}</tbody>
        </table>
      </div>
    </div>

    <!-- Data-quality events (sink flood-protection, ingester failures, …) -->
    ${o!=null?g`<div class="mb-md" data-dp="overview.collector_health.data_quality">
      <div class="es-section-title">Data Quality</div>
      ${o.length===0?g`<div class="text-xs text-muted">No data-quality events</div>`:o.slice(0,Ti).map((_,M)=>{const C=Vd[_.severity]||"var(--fg2)",L=[_.component,_.source].filter(Boolean).join(" · ");return g`<div key=${(_.component||"")+":"+(_.source||"")+":"+M}
              class="flex-row gap-sm" style="align-items:center;padding:var(--sp-1) 0;font-size:var(--fs-sm)">
              <span class="badge" style="background:${C};color:var(--on-status);font-size:var(--fs-2xs)">
                ${_.severity||_.status||"info"}</span>
              <span class="mono text-xs" style="white-space:nowrap" title=${"kind: "+(_.kind||"—")+" · status: "+(_.status||"—")+(_.count?" · seen "+_.count+"x":"")}>${L||"—"}</span>
              <span class="text-xs" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                title=${_.message||""}>${_.message||"—"}</span>
              <span class="text-xs text-muted" style="white-space:nowrap">${zl(_.updated_at)}</span>
            </div>`})}
    </div>`:null}

    <!-- Collector pipeline status -->
    ${v.length>0?g`<div>
      <div class="es-section-title">Collector Pipeline</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp-2)">
        ${v.map(_=>g`<div key=${_.name}
          style="padding:var(--sp-2) var(--sp-3);background:var(--bg);border-radius:4px;
            border-left:3px solid ${Nd[_.status]||"var(--fg2)"}">
          <div class="flex-row gap-sm" style="align-items:center">
            <span class="mono text-xs text-bold">${_.name}</span>
            <span class="text-xs text-muted" style="margin-left:auto">${_.status}</span>
          </div>
          ${_.detail?g`<div class="text-xs text-muted" style="margin-top:2px">${qn(_.detail)}</div>`:null}
        </div>`)}
      </div>
    </div>`:null}
  </div>`}let Ns=null;function Fd(){return Ns?Promise.resolve(Ns):Cc().then(e=>{const t={};for(const l of e||[])t[l.key]=l;return Ns=t,t}).catch(()=>({}))}function Hd(e){if(!e)return"";const t=e.replace(/\s+/g," ").trim(),l=t.match(/^[^.!?]+[.!?]/);return l?l[0].trim():t.slice(0,120)}const Bd={tokens:"tokens",bytes:"bytes",percent:"%",count:"count",rate_bps:"bytes/s",usd:"USD",seconds:"sec",ratio:"ratio"},jd={raw:"raw",deduced:"deduced",aggregated:"agg"};function Ud(){const[e,t]=ee(null),[l,n]=ee({x:0,y:0}),[s,o]=ee(!1),a=Z(null),r=Z(null),c=ie(k=>{const E=k.getAttribute("data-dp");E&&Fd().then(w=>{const A=w[E];if(!A)return;const S=k.getBoundingClientRect();n({x:S.left,y:S.bottom+4}),t(A),o(!1)})},[]),d=ie(()=>{r.current=setTimeout(()=>{t(null),o(!1)},120)},[]),v=ie(()=>{r.current&&(clearTimeout(r.current),r.current=null)},[]);if(ae(()=>{function k(A){const S=A.target.closest("[data-dp]");S&&(v(),c(S))}function E(A){A.target.closest("[data-dp]")&&d()}function w(A){A.target.closest("[data-dp]")&&e&&(A.preventDefault(),o(_=>!_))}return document.addEventListener("mouseover",k,!0),document.addEventListener("mouseout",E,!0),document.addEventListener("click",w,!0),document.addEventListener("focusin",k,!0),document.addEventListener("focusout",E,!0),()=>{document.removeEventListener("mouseover",k,!0),document.removeEventListener("mouseout",E,!0),document.removeEventListener("click",w,!0),document.removeEventListener("focusin",k,!0),document.removeEventListener("focusout",E,!0)}},[c,d,v,e]),!e)return null;const m=Math.min(l.x,window.innerWidth-320-8),$=Math.min(l.y,window.innerHeight-180),x=jd[e.source_type]||e.source_type,R=Bd[e.unit]||e.unit;return g`<div class="dp-tooltip" ref=${a}
    style=${"left:"+m+"px;top:"+$+"px"}
    onMouseEnter=${v} onMouseLeave=${d}>
    <div class="dp-tooltip-head">
      <span class="dp-tooltip-key">${e.key}</span>
      <span class="dp-tooltip-badge dp-badge-${e.source_type}">${x}</span>
      ${R&&g`<span class="dp-tooltip-unit">${R}</span>`}
    </div>
    <div class="dp-tooltip-body">${Hd(e.explanation)}</div>
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
      </div>`}return this.props.children}}const Wd=!0,He="u-",qd="uplot",Kd=He+"hz",Gd=He+"vt",Yd=He+"title",Jd=He+"wrap",Qd=He+"under",Zd=He+"over",Xd=He+"axis",_n=He+"off",ef=He+"select",tf=He+"cursor-x",nf=He+"cursor-y",lf=He+"cursor-pt",sf=He+"legend",of=He+"live",rf=He+"inline",af=He+"series",cf=He+"marker",Di=He+"label",uf=He+"value",ml="width",vl="height",fl="top",Pi="bottom",Bn="left",Vs="right",ho="#000",Ri=ho+"0",Fs="mousemove",Oi="mousedown",Hs="mouseup",zi="mouseenter",Ii="mouseleave",Ni="dblclick",df="resize",ff="scroll",Vi="change",Gl="dppxchange",mo="--",tl=typeof window<"u",Xs=tl?document:null,Yn=tl?window:null,pf=tl?navigator:null;let me,Nl;function eo(){let e=devicePixelRatio;me!=e&&(me=e,Nl&&no(Vi,Nl,eo),Nl=matchMedia(`(min-resolution: ${me-.001}dppx) and (max-resolution: ${me+.001}dppx)`),wn(Vi,Nl,eo),Yn.dispatchEvent(new CustomEvent(Gl)))}function gt(e,t){if(t!=null){let l=e.classList;!l.contains(t)&&l.add(t)}}function to(e,t){let l=e.classList;l.contains(t)&&l.remove(t)}function Ee(e,t,l){e.style[t]=l+"px"}function Ot(e,t,l,n){let s=Xs.createElement(e);return t!=null&&gt(s,t),l!=null&&l.insertBefore(s,n),s}function Tt(e,t){return Ot("div",e,t)}const Fi=new WeakMap;function qt(e,t,l,n,s){let o="translate("+t+"px,"+l+"px)",a=Fi.get(e);o!=a&&(e.style.transform=o,Fi.set(e,o),t<0||l<0||t>n||l>s?gt(e,_n):to(e,_n))}const Hi=new WeakMap;function Bi(e,t,l){let n=t+l,s=Hi.get(e);n!=s&&(Hi.set(e,n),e.style.background=t,e.style.borderColor=l)}const ji=new WeakMap;function Ui(e,t,l,n){let s=t+""+l,o=ji.get(e);s!=o&&(ji.set(e,s),e.style.height=l+"px",e.style.width=t+"px",e.style.marginLeft=n?-t/2+"px":0,e.style.marginTop=n?-l/2+"px":0)}const vo={passive:!0},hf={...vo,capture:!0};function wn(e,t,l,n){t.addEventListener(e,l,n?hf:vo)}function no(e,t,l,n){t.removeEventListener(e,l,vo)}tl&&eo();function zt(e,t,l,n){let s;l=l||0,n=n||t.length-1;let o=n<=2147483647;for(;n-l>1;)s=o?l+n>>1:$t((l+n)/2),t[s]<e?l=s:n=s;return e-t[l]<=t[n]-e?l:n}function Xr(e){return(l,n,s)=>{let o=-1,a=-1;for(let r=n;r<=s;r++)if(e(l[r])){o=r;break}for(let r=s;r>=n;r--)if(e(l[r])){a=r;break}return[o,a]}}const ea=e=>e!=null,ta=e=>e!=null&&e>0,ss=Xr(ea),mf=Xr(ta);function vf(e,t,l,n=0,s=!1){let o=s?mf:ss,a=s?ta:ea;[t,l]=o(e,t,l);let r=e[t],c=e[t];if(t>-1)if(n==1)r=e[t],c=e[l];else if(n==-1)r=e[l],c=e[t];else for(let d=t;d<=l;d++){let v=e[d];a(v)&&(v<r?r=v:v>c&&(c=v))}return[r??$e,c??-$e]}function os(e,t,l,n){let s=Ki(e),o=Ki(t);e==t&&(s==-1?(e*=l,t/=l):(e/=l,t*=l));let a=l==10?Qt:na,r=s==1?$t:At,c=o==1?At:$t,d=r(a(Fe(e))),v=c(a(Fe(t))),p=Qn(l,d),m=Qn(l,v);return l==10&&(d<0&&(p=be(p,-d)),v<0&&(m=be(m,-v))),n||l==2?(e=p*s,t=m*o):(e=ia(e,p),t=is(t,m)),[e,t]}function go(e,t,l,n){let s=os(e,t,l,n);return e==0&&(s[0]=0),t==0&&(s[1]=0),s}const yo=.1,Wi={mode:3,pad:yo},bl={pad:0,soft:null,mode:0},gf={min:bl,max:bl};function Yl(e,t,l,n){return rs(l)?qi(e,t,l):(bl.pad=l,bl.soft=n?0:null,bl.mode=n?3:0,qi(e,t,gf))}function pe(e,t){return e??t}function yf(e,t,l){for(t=pe(t,0),l=pe(l,e.length-1);t<=l;){if(e[t]!=null)return!0;t++}return!1}function qi(e,t,l){let n=l.min,s=l.max,o=pe(n.pad,0),a=pe(s.pad,0),r=pe(n.hard,-$e),c=pe(s.hard,$e),d=pe(n.soft,$e),v=pe(s.soft,-$e),p=pe(n.mode,0),m=pe(s.mode,0),$=t-e,x=Qt($),R=rt(Fe(e),Fe(t)),k=Qt(R),E=Fe(k-x);($<1e-24||E>10)&&($=0,(e==0||t==0)&&($=1e-24,p==2&&d!=$e&&(o=0),m==2&&v!=-$e&&(a=0)));let w=$||R||1e3,A=Qt(w),S=Qn(10,$t(A)),_=w*($==0?e==0?.1:1:o),M=be(ia(e-_,S/10),24),C=e>=d&&(p==1||p==3&&M<=d||p==2&&M>=d)?d:$e,L=rt(r,M<C&&e>=C?C:It(C,M)),U=w*($==0?t==0?.1:1:a),I=be(is(t+U,S/10),24),D=t<=v&&(m==1||m==3&&I>=v||m==2&&I<=v)?v:-$e,Y=It(c,I>D&&t<=D?D:rt(D,I));return L==Y&&L==0&&(Y=100),[L,Y]}const $f=new Intl.NumberFormat(tl?pf.language:"en-US"),$o=e=>$f.format(e),bt=Math,Bl=bt.PI,Fe=bt.abs,$t=bt.floor,Ve=bt.round,At=bt.ceil,It=bt.min,rt=bt.max,Qn=bt.pow,Ki=bt.sign,Qt=bt.log10,na=bt.log2,bf=(e,t=1)=>bt.sinh(e)*t,Bs=(e,t=1)=>bt.asinh(e/t),$e=1/0;function Gi(e){return(Qt((e^e>>31)-(e>>31))|0)+1}function lo(e,t,l){return It(rt(e,t),l)}function la(e){return typeof e=="function"}function oe(e){return la(e)?e:()=>e}const _f=()=>{},sa=e=>e,oa=(e,t)=>t,wf=e=>null,Yi=e=>!0,Ji=(e,t)=>e==t,kf=/\.\d*?(?=9{6,}|0{6,})/gm,kn=e=>{if(aa(e)||cn.has(e))return e;const t=`${e}`,l=t.match(kf);if(l==null)return e;let n=l[0].length-1;if(t.indexOf("e-")!=-1){let[s,o]=t.split("e");return+`${kn(s)}e${o}`}return be(e,n)};function $n(e,t){return kn(be(kn(e/t))*t)}function is(e,t){return kn(At(kn(e/t))*t)}function ia(e,t){return kn($t(kn(e/t))*t)}function be(e,t=0){if(aa(e))return e;let l=10**t,n=e*l*(1+Number.EPSILON);return Ve(n)/l}const cn=new Map;function ra(e){return((""+e).split(".")[1]||"").length}function Ml(e,t,l,n){let s=[],o=n.map(ra);for(let a=t;a<l;a++){let r=Fe(a),c=be(Qn(e,a),r);for(let d=0;d<n.length;d++){let v=e==10?+`${n[d]}e${a}`:n[d]*c,p=(a>=0?0:r)+(a>=o[d]?0:o[d]),m=e==10?v:be(v,p);s.push(m),cn.set(m,p)}}return s}const _l={},bo=[],Zn=[null,null],rn=Array.isArray,aa=Number.isInteger,xf=e=>e===void 0;function Qi(e){return typeof e=="string"}function rs(e){let t=!1;if(e!=null){let l=e.constructor;t=l==null||l==Object}return t}function Sf(e){return e!=null&&typeof e=="object"}const Mf=Object.getPrototypeOf(Uint8Array),ca="__proto__";function Xn(e,t=rs){let l;if(rn(e)){let n=e.find(s=>s!=null);if(rn(n)||t(n)){l=Array(e.length);for(let s=0;s<e.length;s++)l[s]=Xn(e[s],t)}else l=e.slice()}else if(e instanceof Mf)l=e.slice();else if(t(e)){l={};for(let n in e)n!=ca&&(l[n]=Xn(e[n],t))}else l=e;return l}function Ie(e){let t=arguments;for(let l=1;l<t.length;l++){let n=t[l];for(let s in n)s!=ca&&(rs(e[s])?Ie(e[s],Xn(n[s])):e[s]=Xn(n[s]))}return e}const Ef=0,Tf=1,Af=2;function Cf(e,t,l){for(let n=0,s,o=-1;n<t.length;n++){let a=t[n];if(a>o){for(s=a-1;s>=0&&e[s]==null;)e[s--]=null;for(s=a+1;s<l&&e[s]==null;)e[o=s++]=null}}}function Lf(e,t){if(Rf(e)){let a=e[0].slice();for(let r=1;r<e.length;r++)a.push(...e[r].slice(1));return Of(a[0])||(a=Pf(a)),a}let l=new Set;for(let a=0;a<e.length;a++){let c=e[a][0],d=c.length;for(let v=0;v<d;v++)l.add(c[v])}let n=[Array.from(l).sort((a,r)=>a-r)],s=n[0].length,o=new Map;for(let a=0;a<s;a++)o.set(n[0][a],a);for(let a=0;a<e.length;a++){let r=e[a],c=r[0];for(let d=1;d<r.length;d++){let v=r[d],p=Array(s).fill(void 0),m=t?t[a][d]:Tf,$=[];for(let x=0;x<v.length;x++){let R=v[x],k=o.get(c[x]);R===null?m!=Ef&&(p[k]=R,m==Af&&$.push(k)):p[k]=R}Cf(p,$,s),n.push(p)}}return n}const Df=typeof queueMicrotask>"u"?e=>Promise.resolve().then(e):queueMicrotask;function Pf(e){let t=e[0],l=t.length,n=Array(l);for(let o=0;o<n.length;o++)n[o]=o;n.sort((o,a)=>t[o]-t[a]);let s=[];for(let o=0;o<e.length;o++){let a=e[o],r=Array(l);for(let c=0;c<l;c++)r[c]=a[n[c]];s.push(r)}return s}function Rf(e){let t=e[0][0],l=t.length;for(let n=1;n<e.length;n++){let s=e[n][0];if(s.length!=l)return!1;if(s!=t){for(let o=0;o<l;o++)if(s[o]!=t[o])return!1}}return!0}function Of(e,t=100){const l=e.length;if(l<=1)return!0;let n=0,s=l-1;for(;n<=s&&e[n]==null;)n++;for(;s>=n&&e[s]==null;)s--;if(s<=n)return!0;const o=rt(1,$t((s-n+1)/t));for(let a=e[n],r=n+o;r<=s;r+=o){const c=e[r];if(c!=null){if(c<=a)return!1;a=c}}return!0}const ua=["January","February","March","April","May","June","July","August","September","October","November","December"],da=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];function fa(e){return e.slice(0,3)}const zf=da.map(fa),If=ua.map(fa),Nf={MMMM:ua,MMM:If,WWWW:da,WWW:zf};function pl(e){return(e<10?"0":"")+e}function Vf(e){return(e<10?"00":e<100?"0":"")+e}const Ff={YYYY:e=>e.getFullYear(),YY:e=>(e.getFullYear()+"").slice(2),MMMM:(e,t)=>t.MMMM[e.getMonth()],MMM:(e,t)=>t.MMM[e.getMonth()],MM:e=>pl(e.getMonth()+1),M:e=>e.getMonth()+1,DD:e=>pl(e.getDate()),D:e=>e.getDate(),WWWW:(e,t)=>t.WWWW[e.getDay()],WWW:(e,t)=>t.WWW[e.getDay()],HH:e=>pl(e.getHours()),H:e=>e.getHours(),h:e=>{let t=e.getHours();return t==0?12:t>12?t-12:t},AA:e=>e.getHours()>=12?"PM":"AM",aa:e=>e.getHours()>=12?"pm":"am",a:e=>e.getHours()>=12?"p":"a",mm:e=>pl(e.getMinutes()),m:e=>e.getMinutes(),ss:e=>pl(e.getSeconds()),s:e=>e.getSeconds(),fff:e=>Vf(e.getMilliseconds())};function _o(e,t){t=t||Nf;let l=[],n=/\{([a-z]+)\}|[^{]+/gi,s;for(;s=n.exec(e);)l.push(s[0][0]=="{"?Ff[s[1]]:s[0]);return o=>{let a="";for(let r=0;r<l.length;r++)a+=typeof l[r]=="string"?l[r]:l[r](o,t);return a}}const Hf=new Intl.DateTimeFormat().resolvedOptions().timeZone;function Bf(e,t){let l;return t=="UTC"||t=="Etc/UTC"?l=new Date(+e+e.getTimezoneOffset()*6e4):t==Hf?l=e:(l=new Date(e.toLocaleString("en-US",{timeZone:t})),l.setMilliseconds(e.getMilliseconds())),l}const pa=e=>e%1==0,Jl=[1,2,2.5,5],jf=Ml(10,-32,0,Jl),ha=Ml(10,0,32,Jl),Uf=ha.filter(pa),bn=jf.concat(ha),wo=`
`,ma="{YYYY}",Zi=wo+ma,va="{M}/{D}",gl=wo+va,Vl=gl+"/{YY}",ga="{aa}",Wf="{h}:{mm}",jn=Wf+ga,Xi=wo+jn,er=":{ss}",ve=null;function ya(e){let t=e*1e3,l=t*60,n=l*60,s=n*24,o=s*30,a=s*365,c=(e==1?Ml(10,0,3,Jl).filter(pa):Ml(10,-3,0,Jl)).concat([t,t*5,t*10,t*15,t*30,l,l*5,l*10,l*15,l*30,n,n*2,n*3,n*4,n*6,n*8,n*12,s,s*2,s*3,s*4,s*5,s*6,s*7,s*8,s*9,s*10,s*15,o,o*2,o*3,o*4,o*6,a,a*2,a*5,a*10,a*25,a*50,a*100]);const d=[[a,ma,ve,ve,ve,ve,ve,ve,1],[s*28,"{MMM}",Zi,ve,ve,ve,ve,ve,1],[s,va,Zi,ve,ve,ve,ve,ve,1],[n,"{h}"+ga,Vl,ve,gl,ve,ve,ve,1],[l,jn,Vl,ve,gl,ve,ve,ve,1],[t,er,Vl+" "+jn,ve,gl+" "+jn,ve,Xi,ve,1],[e,er+".{fff}",Vl+" "+jn,ve,gl+" "+jn,ve,Xi,ve,1]];function v(p){return(m,$,x,R,k,E)=>{let w=[],A=k>=a,S=k>=o&&k<a,_=p(x),M=be(_*e,3),C=js(_.getFullYear(),A?0:_.getMonth(),S||A?1:_.getDate()),L=be(C*e,3);if(S||A){let U=S?k/o:0,I=A?k/a:0,D=M==L?M:be(js(C.getFullYear()+I,C.getMonth()+U,1)*e,3),Y=new Date(Ve(D/e)),F=Y.getFullYear(),K=Y.getMonth();for(let W=0;D<=R;W++){let z=js(F+I*W,K+U*W,1),N=z-p(be(z*e,3));D=be((+z+N)*e,3),D<=R&&w.push(D)}}else{let U=k>=s?s:k,I=$t(x)-$t(M),D=L+I+is(M-L,U);w.push(D);let Y=p(D),F=Y.getHours()+Y.getMinutes()/l+Y.getSeconds()/n,K=k/n,W=m.axes[$]._space,z=E/W;for(;D=be(D+k,e==1?0:3),!(D>R);)if(K>1){let N=$t(be(F+K,6))%24,ce=p(D).getHours()-N;ce>1&&(ce=-1),D-=ce*n,F=(F+K)%24;let de=w[w.length-1];be((D-de)/k,3)*z>=.7&&w.push(D)}else w.push(D)}return w}}return[c,d,v]}const[qf,Kf,Gf]=ya(1),[Yf,Jf,Qf]=ya(.001);Ml(2,-53,53,[1]);function tr(e,t){return e.map(l=>l.map((n,s)=>s==0||s==8||n==null?n:t(s==1||l[8]==0?n:l[1]+n)))}function nr(e,t){return(l,n,s,o,a)=>{let r=t.find(x=>a>=x[0])||t[t.length-1],c,d,v,p,m,$;return n.map(x=>{let R=e(x),k=R.getFullYear(),E=R.getMonth(),w=R.getDate(),A=R.getHours(),S=R.getMinutes(),_=R.getSeconds(),M=k!=c&&r[2]||E!=d&&r[3]||w!=v&&r[4]||A!=p&&r[5]||S!=m&&r[6]||_!=$&&r[7]||r[1];return c=k,d=E,v=w,p=A,m=S,$=_,M(R)})}}function Zf(e,t){let l=_o(t);return(n,s,o,a,r)=>s.map(c=>l(e(c)))}function js(e,t,l){return new Date(e,t,l)}function lr(e,t){return t(e)}const Xf="{YYYY}-{MM}-{DD} {h}:{mm}{aa}";function sr(e,t){return(l,n,s,o)=>o==null?mo:t(e(n))}function ep(e,t){let l=e.series[t];return l.width?l.stroke(e,t):l.points.width?l.points.stroke(e,t):null}function tp(e,t){return e.series[t].fill(e,t)}const np={show:!0,live:!0,isolate:!1,mount:_f,markers:{show:!0,width:2,stroke:ep,fill:tp,dash:"solid"},idx:null,idxs:null,values:[]};function lp(e,t){let l=e.cursor.points,n=Tt(),s=l.size(e,t);Ee(n,ml,s),Ee(n,vl,s);let o=s/-2;Ee(n,"marginLeft",o),Ee(n,"marginTop",o);let a=l.width(e,t,s);return a&&Ee(n,"borderWidth",a),n}function sp(e,t){let l=e.series[t].points;return l._fill||l._stroke}function op(e,t){let l=e.series[t].points;return l._stroke||l._fill}function ip(e,t){return e.series[t].points.size}const Us=[0,0];function rp(e,t,l){return Us[0]=t,Us[1]=l,Us}function Fl(e,t,l,n=!0){return s=>{s.button==0&&(!n||s.target==t)&&l(s)}}function Ws(e,t,l,n=!0){return s=>{(!n||s.target==t)&&l(s)}}const ap={show:!0,x:!0,y:!0,lock:!1,move:rp,points:{one:!1,show:lp,size:ip,width:0,stroke:op,fill:sp},bind:{mousedown:Fl,mouseup:Fl,click:Fl,dblclick:Fl,mousemove:Ws,mouseleave:Ws,mouseenter:Ws},drag:{setScale:!0,x:!0,y:!1,dist:0,uni:null,click:(e,t)=>{t.stopPropagation(),t.stopImmediatePropagation()},_x:!1,_y:!1},focus:{dist:(e,t,l,n,s)=>n-s,prox:-1,bias:0},hover:{skip:[void 0],prox:null,bias:0},left:-10,top:-10,idx:null,dataIdx:null,idxs:null,event:null},$a={show:!0,stroke:"rgba(0,0,0,0.07)",width:2},ko=Ie({},$a,{filter:oa}),ba=Ie({},ko,{size:10}),_a=Ie({},$a,{show:!1}),xo='12px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',wa="bold "+xo,ka=1.5,or={show:!0,scale:"x",stroke:ho,space:50,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:wa,side:2,grid:ko,ticks:ba,border:_a,font:xo,lineGap:ka,rotate:0},cp="Value",up="Time",ir={show:!0,scale:"x",auto:!1,sorted:1,min:$e,max:-$e,idxs:[]};function dp(e,t,l,n,s){return t.map(o=>o==null?"":$o(o))}function fp(e,t,l,n,s,o,a){let r=[],c=cn.get(s)||0;l=a?l:be(is(l,s),c);for(let d=l;d<=n;d=be(d+s,c))r.push(Object.is(d,-0)?0:d);return r}function so(e,t,l,n,s,o,a){const r=[],c=e.scales[e.axes[t].scale].log,d=c==10?Qt:na,v=$t(d(l));s=Qn(c,v),c==10&&(s=bn[zt(s,bn)]);let p=l,m=s*c;c==10&&(m=bn[zt(m,bn)]);do r.push(p),p=p+s,c==10&&!cn.has(p)&&(p=be(p,cn.get(s))),p>=m&&(s=p,m=s*c,c==10&&(m=bn[zt(m,bn)]));while(p<=n);return r}function pp(e,t,l,n,s,o,a){let c=e.scales[e.axes[t].scale].asinh,d=n>c?so(e,t,rt(c,l),n,s):[c],v=n>=0&&l<=0?[0]:[];return(l<-c?so(e,t,rt(c,-n),-l,s):[c]).reverse().map(m=>-m).concat(v,d)}const xa=/./,hp=/[12357]/,mp=/[125]/,rr=/1/,oo=(e,t,l,n)=>e.map((s,o)=>t==4&&s==0||o%n==0&&l.test(s.toExponential()[s<0?1:0])?s:null);function vp(e,t,l,n,s){let o=e.axes[l],a=o.scale,r=e.scales[a],c=e.valToPos,d=o._space,v=c(10,a),p=c(9,a)-v>=d?xa:c(7,a)-v>=d?hp:c(5,a)-v>=d?mp:rr;if(p==rr){let m=Fe(c(1,a)-v);if(m<d)return oo(t.slice().reverse(),r.distr,p,At(d/m)).reverse()}return oo(t,r.distr,p,1)}function gp(e,t,l,n,s){let o=e.axes[l],a=o.scale,r=o._space,c=e.valToPos,d=Fe(c(1,a)-c(2,a));return d<r?oo(t.slice().reverse(),3,xa,At(r/d)).reverse():t}function yp(e,t,l,n){return n==null?mo:t==null?"":$o(t)}const ar={show:!0,scale:"y",stroke:ho,space:30,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:wa,side:3,grid:ko,ticks:ba,border:_a,font:xo,lineGap:ka,rotate:0};function $p(e,t){let l=3+(e||1)*2;return be(l*t,3)}function bp(e,t){let{scale:l,idxs:n}=e.series[0],s=e._data[0],o=e.valToPos(s[n[0]],l,!0),a=e.valToPos(s[n[1]],l,!0),r=Fe(a-o),c=e.series[t],d=r/(c.points.space*me);return n[1]-n[0]<=d}const cr={scale:null,auto:!0,sorted:0,min:$e,max:-$e},Sa=(e,t,l,n,s)=>s,ur={show:!0,auto:!0,sorted:0,gaps:Sa,alpha:1,facets:[Ie({},cr,{scale:"x"}),Ie({},cr,{scale:"y"})]},dr={scale:"y",auto:!0,sorted:0,show:!0,spanGaps:!1,gaps:Sa,alpha:1,points:{show:bp,filter:null},values:null,min:$e,max:-$e,idxs:[],path:null,clip:null};function _p(e,t,l,n,s){return l/10}const Ma={time:Wd,auto:!0,distr:1,log:10,asinh:1,min:null,max:null,dir:1,ori:0},wp=Ie({},Ma,{time:!1,ori:1}),fr={};function Ea(e,t){let l=fr[e];return l||(l={key:e,plots:[],sub(n){l.plots.push(n)},unsub(n){l.plots=l.plots.filter(s=>s!=n)},pub(n,s,o,a,r,c,d){for(let v=0;v<l.plots.length;v++)l.plots[v]!=s&&l.plots[v].pub(n,s,o,a,r,c,d)}},e!=null&&(fr[e]=l)),l}const el=1,io=2;function xn(e,t,l){const n=e.mode,s=e.series[t],o=n==2?e._data[t]:e._data,a=e.scales,r=e.bbox;let c=o[0],d=n==2?o[1]:o[t],v=n==2?a[s.facets[0].scale]:a[e.series[0].scale],p=n==2?a[s.facets[1].scale]:a[s.scale],m=r.left,$=r.top,x=r.width,R=r.height,k=e.valToPosH,E=e.valToPosV;return v.ori==0?l(s,c,d,v,p,k,E,m,$,x,R,cs,nl,ds,Aa,La):l(s,c,d,v,p,E,k,$,m,R,x,us,ll,Eo,Ca,Da)}function So(e,t){let l=0,n=0,s=pe(e.bands,bo);for(let o=0;o<s.length;o++){let a=s[o];a.series[0]==t?l=a.dir:a.series[1]==t&&(a.dir==1?n|=1:n|=2)}return[l,n==1?-1:n==2?1:n==3?2:0]}function kp(e,t,l,n,s){let o=e.mode,a=e.series[t],r=o==2?a.facets[1].scale:a.scale,c=e.scales[r];return s==-1?c.min:s==1?c.max:c.distr==3?c.dir==1?c.min:c.max:0}function Zt(e,t,l,n,s,o){return xn(e,t,(a,r,c,d,v,p,m,$,x,R,k)=>{let E=a.pxRound;const w=d.dir*(d.ori==0?1:-1),A=d.ori==0?nl:ll;let S,_;w==1?(S=l,_=n):(S=n,_=l);let M=E(p(r[S],d,R,$)),C=E(m(c[S],v,k,x)),L=E(p(r[_],d,R,$)),U=E(m(o==1?v.max:v.min,v,k,x)),I=new Path2D(s);return A(I,L,U),A(I,M,U),A(I,M,C),I})}function as(e,t,l,n,s,o){let a=null;if(e.length>0){a=new Path2D;const r=t==0?ds:Eo;let c=l;for(let p=0;p<e.length;p++){let m=e[p];if(m[1]>m[0]){let $=m[0]-c;$>0&&r(a,c,n,$,n+o),c=m[1]}}let d=l+s-c,v=10;d>0&&r(a,c,n-v/2,d,n+o+v)}return a}function xp(e,t,l){let n=e[e.length-1];n&&n[0]==t?n[1]=l:e.push([t,l])}function Mo(e,t,l,n,s,o,a){let r=[],c=e.length;for(let d=s==1?l:n;d>=l&&d<=n;d+=s)if(t[d]===null){let p=d,m=d;if(s==1)for(;++d<=n&&t[d]===null;)m=d;else for(;--d>=l&&t[d]===null;)m=d;let $=o(e[p]),x=m==p?$:o(e[m]),R=p-s;$=a<=0&&R>=0&&R<c?o(e[R]):$;let E=m+s;x=a>=0&&E>=0&&E<c?o(e[E]):x,x>=$&&r.push([$,x])}return r}function pr(e){return e==0?sa:e==1?Ve:t=>$n(t,e)}function Ta(e){let t=e==0?cs:us,l=e==0?(s,o,a,r,c,d)=>{s.arcTo(o,a,r,c,d)}:(s,o,a,r,c,d)=>{s.arcTo(a,o,c,r,d)},n=e==0?(s,o,a,r,c)=>{s.rect(o,a,r,c)}:(s,o,a,r,c)=>{s.rect(a,o,c,r)};return(s,o,a,r,c,d=0,v=0)=>{d==0&&v==0?n(s,o,a,r,c):(d=It(d,r/2,c/2),v=It(v,r/2,c/2),t(s,o+d,a),l(s,o+r,a,o+r,a+c,d),l(s,o+r,a+c,o,a+c,v),l(s,o,a+c,o,a,v),l(s,o,a,o+r,a,d),s.closePath())}}const cs=(e,t,l)=>{e.moveTo(t,l)},us=(e,t,l)=>{e.moveTo(l,t)},nl=(e,t,l)=>{e.lineTo(t,l)},ll=(e,t,l)=>{e.lineTo(l,t)},ds=Ta(0),Eo=Ta(1),Aa=(e,t,l,n,s,o)=>{e.arc(t,l,n,s,o)},Ca=(e,t,l,n,s,o)=>{e.arc(l,t,n,s,o)},La=(e,t,l,n,s,o,a)=>{e.bezierCurveTo(t,l,n,s,o,a)},Da=(e,t,l,n,s,o,a)=>{e.bezierCurveTo(l,t,s,n,a,o)};function Pa(e){return(t,l,n,s,o)=>xn(t,l,(a,r,c,d,v,p,m,$,x,R,k)=>{let{pxRound:E,points:w}=a,A,S;d.ori==0?(A=cs,S=Aa):(A=us,S=Ca);const _=be(w.width*me,3);let M=(w.size-w.width)/2*me,C=be(M*2,3),L=new Path2D,U=new Path2D,{left:I,top:D,width:Y,height:F}=t.bbox;ds(U,I-C,D-C,Y+C*2,F+C*2);const K=W=>{if(c[W]!=null){let z=E(p(r[W],d,R,$)),N=E(m(c[W],v,k,x));A(L,z+M,N),S(L,z,N,M,0,Bl*2)}};if(o)o.forEach(K);else for(let W=n;W<=s;W++)K(W);return{stroke:_>0?L:null,fill:L,clip:U,flags:el|io}})}function Ra(e){return(t,l,n,s,o,a)=>{n!=s&&(o!=n&&a!=n&&e(t,l,n),o!=s&&a!=s&&e(t,l,s),e(t,l,a))}}const Sp=Ra(nl),Mp=Ra(ll);function Oa(e){const t=pe(e==null?void 0:e.alignGaps,0);return(l,n,s,o)=>xn(l,n,(a,r,c,d,v,p,m,$,x,R,k)=>{[s,o]=ss(c,s,o);let E=a.pxRound,w=F=>E(p(F,d,R,$)),A=F=>E(m(F,v,k,x)),S,_;d.ori==0?(S=nl,_=Sp):(S=ll,_=Mp);const M=d.dir*(d.ori==0?1:-1),C={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:el},L=C.stroke;let U=!1;if(o-s>=R*4){let F=q=>l.posToVal(q,d.key,!0),K=null,W=null,z,N,Pe,ue=w(r[M==1?s:o]),ce=w(r[s]),de=w(r[o]),te=F(M==1?ce+1:de-1);for(let q=M==1?s:o;q>=s&&q<=o;q+=M){let Re=r[q],_e=(M==1?Re<te:Re>te)?ue:w(Re),re=c[q];_e==ue?re!=null?(N=re,K==null?(S(L,_e,A(N)),z=K=W=N):N<K?K=N:N>W&&(W=N)):re===null&&(U=!0):(K!=null&&_(L,ue,A(K),A(W),A(z),A(N)),re!=null?(N=re,S(L,_e,A(N)),K=W=z=N):(K=W=null,re===null&&(U=!0)),ue=_e,te=F(ue+M))}K!=null&&K!=W&&Pe!=ue&&_(L,ue,A(K),A(W),A(z),A(N))}else for(let F=M==1?s:o;F>=s&&F<=o;F+=M){let K=c[F];K===null?U=!0:K!=null&&S(L,w(r[F]),A(K))}let[D,Y]=So(l,n);if(a.fill!=null||D!=0){let F=C.fill=new Path2D(L),K=a.fillTo(l,n,a.min,a.max,D),W=A(K),z=w(r[s]),N=w(r[o]);M==-1&&([N,z]=[z,N]),S(F,N,W),S(F,z,W)}if(!a.spanGaps){let F=[];U&&F.push(...Mo(r,c,s,o,M,w,t)),C.gaps=F=a.gaps(l,n,s,o,F),C.clip=as(F,d.ori,$,x,R,k)}return Y!=0&&(C.band=Y==2?[Zt(l,n,s,o,L,-1),Zt(l,n,s,o,L,1)]:Zt(l,n,s,o,L,Y)),C})}function Ep(e){const t=pe(e.align,1),l=pe(e.ascDesc,!1),n=pe(e.alignGaps,0),s=pe(e.extend,!1);return(o,a,r,c)=>xn(o,a,(d,v,p,m,$,x,R,k,E,w,A)=>{[r,c]=ss(p,r,c);let S=d.pxRound,{left:_,width:M}=o.bbox,C=ce=>S(x(ce,m,w,k)),L=ce=>S(R(ce,$,A,E)),U=m.ori==0?nl:ll;const I={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:el},D=I.stroke,Y=m.dir*(m.ori==0?1:-1);let F=L(p[Y==1?r:c]),K=C(v[Y==1?r:c]),W=K,z=K;s&&t==-1&&(z=_,U(D,z,F)),U(D,K,F);for(let ce=Y==1?r:c;ce>=r&&ce<=c;ce+=Y){let de=p[ce];if(de==null)continue;let te=C(v[ce]),q=L(de);t==1?U(D,te,F):U(D,W,q),U(D,te,q),F=q,W=te}let N=W;s&&t==1&&(N=_+M,U(D,N,F));let[Pe,ue]=So(o,a);if(d.fill!=null||Pe!=0){let ce=I.fill=new Path2D(D),de=d.fillTo(o,a,d.min,d.max,Pe),te=L(de);U(ce,N,te),U(ce,z,te)}if(!d.spanGaps){let ce=[];ce.push(...Mo(v,p,r,c,Y,C,n));let de=d.width*me/2,te=l||t==1?de:-de,q=l||t==-1?-de:de;ce.forEach(Re=>{Re[0]+=te,Re[1]+=q}),I.gaps=ce=d.gaps(o,a,r,c,ce),I.clip=as(ce,m.ori,k,E,w,A)}return ue!=0&&(I.band=ue==2?[Zt(o,a,r,c,D,-1),Zt(o,a,r,c,D,1)]:Zt(o,a,r,c,D,ue)),I})}function hr(e,t,l,n,s,o,a=$e){if(e.length>1){let r=null;for(let c=0,d=1/0;c<e.length;c++)if(t[c]!==void 0){if(r!=null){let v=Fe(e[c]-e[r]);v<d&&(d=v,a=Fe(l(e[c],n,s,o)-l(e[r],n,s,o)))}r=c}}return a}function Tp(e){e=e||_l;const t=pe(e.size,[.6,$e,1]),l=e.align||0,n=e.gap||0;let s=e.radius;s=s==null?[0,0]:typeof s=="number"?[s,0]:s;const o=oe(s),a=1-t[0],r=pe(t[1],$e),c=pe(t[2],1),d=pe(e.disp,_l),v=pe(e.each,$=>{}),{fill:p,stroke:m}=d;return($,x,R,k)=>xn($,x,(E,w,A,S,_,M,C,L,U,I,D)=>{let Y=E.pxRound,F=l,K=n*me,W=r*me,z=c*me,N,Pe;S.ori==0?[N,Pe]=o($,x):[Pe,N]=o($,x);const ue=S.dir*(S.ori==0?1:-1);let ce=S.ori==0?ds:Eo,de=S.ori==0?v:(B,ke,Ne,Sn,dn,Ft,fn)=>{v(B,ke,Ne,dn,Sn,fn,Ft)},te=pe($.bands,bo).find(B=>B.series[0]==x),q=te!=null?te.dir:0,Re=E.fillTo($,x,E.min,E.max,q),Ye=Y(C(Re,_,D,U)),_e,re,ut,Ce=I,we=Y(E.width*me),_t=!1,Ct=null,Ze=null,Vt=null,Gt=null;p!=null&&(we==0||m!=null)&&(_t=!0,Ct=p.values($,x,R,k),Ze=new Map,new Set(Ct).forEach(B=>{B!=null&&Ze.set(B,new Path2D)}),we>0&&(Vt=m.values($,x,R,k),Gt=new Map,new Set(Vt).forEach(B=>{B!=null&&Gt.set(B,new Path2D)})));let{x0:Yt,size:Xt}=d;if(Yt!=null&&Xt!=null){F=1,w=Yt.values($,x,R,k),Yt.unit==2&&(w=w.map(Ne=>$.posToVal(L+Ne*I,S.key,!0)));let B=Xt.values($,x,R,k);Xt.unit==2?re=B[0]*I:re=M(B[0],S,I,L)-M(0,S,I,L),Ce=hr(w,A,M,S,I,L,Ce),ut=Ce-re+K}else Ce=hr(w,A,M,S,I,L,Ce),ut=Ce*a+K,re=Ce-ut;ut<1&&(ut=0),we>=re/2&&(we=0),ut<5&&(Y=sa);let le=ut>0,Be=Ce-ut-(le?we:0);re=Y(lo(Be,z,W)),_e=(F==0?re/2:F==ue?0:re)-F*ue*((F==0?K/2:0)+(le?we/2:0));const Oe={stroke:null,fill:null,clip:null,band:null,gaps:null,flags:0},Xe=_t?null:new Path2D;let wt=null;if(te!=null)wt=$.data[te.series[1]];else{let{y0:B,y1:ke}=d;B!=null&&ke!=null&&(A=ke.values($,x,R,k),wt=B.values($,x,R,k))}let un=N*re,ne=Pe*re;for(let B=ue==1?R:k;B>=R&&B<=k;B+=ue){let ke=A[B];if(ke==null)continue;if(wt!=null){let dt=wt[B]??0;if(ke-dt==0)continue;Ye=C(dt,_,D,U)}let Ne=S.distr!=2||d!=null?w[B]:B,Sn=M(Ne,S,I,L),dn=C(pe(ke,Re),_,D,U),Ft=Y(Sn-_e),fn=Y(rt(dn,Ye)),pt=Y(It(dn,Ye)),kt=fn-pt;if(ke!=null){let dt=ke<0?ne:un,Lt=ke<0?un:ne;_t?(we>0&&Vt[B]!=null&&ce(Gt.get(Vt[B]),Ft,pt+$t(we/2),re,rt(0,kt-we),dt,Lt),Ct[B]!=null&&ce(Ze.get(Ct[B]),Ft,pt+$t(we/2),re,rt(0,kt-we),dt,Lt)):ce(Xe,Ft,pt+$t(we/2),re,rt(0,kt-we),dt,Lt),de($,x,B,Ft-we/2,pt,re+we,kt)}}return we>0?Oe.stroke=_t?Gt:Xe:_t||(Oe._fill=E.width==0?E._fill:E._stroke??E._fill,Oe.width=0),Oe.fill=_t?Ze:Xe,Oe})}function Ap(e,t){const l=pe(t==null?void 0:t.alignGaps,0);return(n,s,o,a)=>xn(n,s,(r,c,d,v,p,m,$,x,R,k,E)=>{[o,a]=ss(d,o,a);let w=r.pxRound,A=N=>w(m(N,v,k,x)),S=N=>w($(N,p,E,R)),_,M,C;v.ori==0?(_=cs,C=nl,M=La):(_=us,C=ll,M=Da);const L=v.dir*(v.ori==0?1:-1);let U=A(c[L==1?o:a]),I=U,D=[],Y=[];for(let N=L==1?o:a;N>=o&&N<=a;N+=L)if(d[N]!=null){let ue=c[N],ce=A(ue);D.push(I=ce),Y.push(S(d[N]))}const F={stroke:e(D,Y,_,C,M,w),fill:null,clip:null,band:null,gaps:null,flags:el},K=F.stroke;let[W,z]=So(n,s);if(r.fill!=null||W!=0){let N=F.fill=new Path2D(K),Pe=r.fillTo(n,s,r.min,r.max,W),ue=S(Pe);C(N,I,ue),C(N,U,ue)}if(!r.spanGaps){let N=[];N.push(...Mo(c,d,o,a,L,A,l)),F.gaps=N=r.gaps(n,s,o,a,N),F.clip=as(N,v.ori,x,R,k,E)}return z!=0&&(F.band=z==2?[Zt(n,s,o,a,K,-1),Zt(n,s,o,a,K,1)]:Zt(n,s,o,a,K,z)),F})}function Cp(e){return Ap(Lp,e)}function Lp(e,t,l,n,s,o){const a=e.length;if(a<2)return null;const r=new Path2D;if(l(r,e[0],t[0]),a==2)n(r,e[1],t[1]);else{let c=Array(a),d=Array(a-1),v=Array(a-1),p=Array(a-1);for(let m=0;m<a-1;m++)v[m]=t[m+1]-t[m],p[m]=e[m+1]-e[m],d[m]=v[m]/p[m];c[0]=d[0];for(let m=1;m<a-1;m++)d[m]===0||d[m-1]===0||d[m-1]>0!=d[m]>0?c[m]=0:(c[m]=3*(p[m-1]+p[m])/((2*p[m]+p[m-1])/d[m-1]+(p[m]+2*p[m-1])/d[m]),isFinite(c[m])||(c[m]=0));c[a-1]=d[a-2];for(let m=0;m<a-1;m++)s(r,e[m]+p[m]/3,t[m]+c[m]*p[m]/3,e[m+1]-p[m]/3,t[m+1]-c[m+1]*p[m]/3,e[m+1],t[m+1])}return r}const ro=new Set;function mr(){for(let e of ro)e.syncRect(!0)}tl&&(wn(df,Yn,mr),wn(ff,Yn,mr,!0),wn(Gl,Yn,()=>{nt.pxRatio=me}));const Dp=Oa(),Pp=Pa();function vr(e,t,l,n){return(n?[e[0],e[1]].concat(e.slice(2)):[e[0]].concat(e.slice(1))).map((o,a)=>ao(o,a,t,l))}function Rp(e,t){return e.map((l,n)=>n==0?{}:Ie({},t,l))}function ao(e,t,l,n){return Ie({},t==0?l:n,e)}function za(e,t,l){return t==null?Zn:[t,l]}const Op=za;function zp(e,t,l){return t==null?Zn:Yl(t,l,yo,!0)}function Ia(e,t,l,n){return t==null?Zn:os(t,l,e.scales[n].log,!1)}const Ip=Ia;function Na(e,t,l,n){return t==null?Zn:go(t,l,e.scales[n].log,!1)}const Np=Na;function Vp(e,t,l,n,s){let o=rt(Gi(e),Gi(t)),a=t-e,r=zt(s/n*a,l);do{let c=l[r],d=n*c/a;if(d>=s&&o+(c<5?cn.get(c):0)<=17)return[c,d]}while(++r<l.length);return[0,0]}function gr(e){let t,l;return e=e.replace(/(\d+)px/,(n,s)=>(t=Ve((l=+s)*me))+"px"),[e,t,l]}function Fp(e){e.show&&[e.font,e.labelFont].forEach(t=>{let l=be(t[2]*me,1);t[0]=t[0].replace(/[0-9.]+px/,l+"px"),t[1]=l})}function nt(e,t,l){const n={mode:pe(e.mode,1)},s=n.mode;function o(i,u,f,h){let y=u.valToPct(i);return h+f*(u.dir==-1?1-y:y)}function a(i,u,f,h){let y=u.valToPct(i);return h+f*(u.dir==-1?y:1-y)}function r(i,u,f,h){return u.ori==0?o(i,u,f,h):a(i,u,f,h)}n.valToPosH=o,n.valToPosV=a;let c=!1;n.status=0;const d=n.root=Tt(qd);if(e.id!=null&&(d.id=e.id),gt(d,e.class),e.title){let i=Tt(Yd,d);i.textContent=e.title}const v=Ot("canvas"),p=n.ctx=v.getContext("2d"),m=Tt(Jd,d);wn("click",m,i=>{i.target===x&&(xe!=zn||Te!=In)&&Qe.click(n,i)},!0);const $=n.under=Tt(Qd,m);m.appendChild(v);const x=n.over=Tt(Zd,m);e=Xn(e);const R=+pe(e.pxAlign,1),k=pr(R);(e.plugins||[]).forEach(i=>{i.opts&&(e=i.opts(n,e)||e)});const E=e.ms||.001,w=n.series=s==1?vr(e.series||[],ir,dr,!1):Rp(e.series||[null],ur),A=n.axes=vr(e.axes||[],or,ar,!0),S=n.scales={},_=n.bands=e.bands||[];_.forEach(i=>{i.fill=oe(i.fill||null),i.dir=pe(i.dir,-1)});const M=s==2?w[1].facets[0].scale:w[0].scale,C={axes:sc,series:Xa},L=(e.drawOrder||["axes","series"]).map(i=>C[i]);function U(i){const u=i.distr==3?f=>Qt(f>0?f:i.clamp(n,f,i.min,i.max,i.key)):i.distr==4?f=>Bs(f,i.asinh):i.distr==100?f=>i.fwd(f):f=>f;return f=>{let h=u(f),{_min:y,_max:b}=i,T=b-y;return(h-y)/T}}function I(i){let u=S[i];if(u==null){let f=(e.scales||_l)[i]||_l;if(f.from!=null){I(f.from);let h=Ie({},S[f.from],f,{key:i});h.valToPct=U(h),S[i]=h}else{u=S[i]=Ie({},i==M?Ma:wp,f),u.key=i;let h=u.time,y=u.range,b=rn(y);if((i!=M||s==2&&!h)&&(b&&(y[0]==null||y[1]==null)&&(y={min:y[0]==null?Wi:{mode:1,hard:y[0],soft:y[0]},max:y[1]==null?Wi:{mode:1,hard:y[1],soft:y[1]}},b=!1),!b&&rs(y))){let T=y;y=(P,O,V)=>O==null?Zn:Yl(O,V,T)}u.range=oe(y||(h?Op:i==M?u.distr==3?Ip:u.distr==4?Np:za:u.distr==3?Ia:u.distr==4?Na:zp)),u.auto=oe(b?!1:u.auto),u.clamp=oe(u.clamp||_p),u._min=u._max=null,u.valToPct=U(u)}}}I("x"),I("y"),s==1&&w.forEach(i=>{I(i.scale)}),A.forEach(i=>{I(i.scale)});for(let i in e.scales)I(i);const D=S[M],Y=D.distr;let F,K;D.ori==0?(gt(d,Kd),F=o,K=a):(gt(d,Gd),F=a,K=o);const W={};for(let i in S){let u=S[i];(u.min!=null||u.max!=null)&&(W[i]={min:u.min,max:u.max},u.min=u.max=null)}const z=e.tzDate||(i=>new Date(Ve(i/E))),N=e.fmtDate||_o,Pe=E==1?Gf(z):Qf(z),ue=nr(z,tr(E==1?Kf:Jf,N)),ce=sr(z,lr(Xf,N)),de=[],te=n.legend=Ie({},np,e.legend),q=n.cursor=Ie({},ap,{drag:{y:s==2}},e.cursor),Re=te.show,Ye=q.show,_e=te.markers;te.idxs=de,_e.width=oe(_e.width),_e.dash=oe(_e.dash),_e.stroke=oe(_e.stroke),_e.fill=oe(_e.fill);let re,ut,Ce,we=[],_t=[],Ct,Ze=!1,Vt={};if(te.live){const i=w[1]?w[1].values:null;Ze=i!=null,Ct=Ze?i(n,1,0):{_:0};for(let u in Ct)Vt[u]=mo}if(Re)if(re=Ot("table",sf,d),Ce=Ot("tbody",null,re),te.mount(n,re),Ze){ut=Ot("thead",null,re,Ce);let i=Ot("tr",null,ut);Ot("th",null,i);for(var Gt in Ct)Ot("th",Di,i).textContent=Gt}else gt(re,rf),te.live&&gt(re,of);const Yt={show:!0},Xt={show:!1};function le(i,u){if(u==0&&(Ze||!te.live||s==2))return Zn;let f=[],h=Ot("tr",af,Ce,Ce.childNodes[u]);gt(h,i.class),i.show||gt(h,_n);let y=Ot("th",null,h);if(_e.show){let P=Tt(cf,y);if(u>0){let O=_e.width(n,u);O&&(P.style.border=O+"px "+_e.dash(n,u)+" "+_e.stroke(n,u)),P.style.background=_e.fill(n,u)}}let b=Tt(Di,y);i.label instanceof HTMLElement?b.appendChild(i.label):b.textContent=i.label,u>0&&(_e.show||(b.style.color=i.width>0?_e.stroke(n,u):_e.fill(n,u)),Oe("click",y,P=>{if(q._lock)return;hn(P);let O=w.indexOf(i);if((P.ctrlKey||P.metaKey)!=te.isolate){let V=w.some((H,j)=>j>0&&j!=O&&H.show);w.forEach((H,j)=>{j>0&&Bt(j,V?j==O?Yt:Xt:Yt,!0,ze.setSeries)})}else Bt(O,{show:!i.show},!0,ze.setSeries)},!1),En&&Oe(zi,y,P=>{q._lock||(hn(P),Bt(w.indexOf(i),Vn,!0,ze.setSeries))},!1));for(var T in Ct){let P=Ot("td",uf,h);P.textContent="--",f.push(P)}return[h,f]}const Be=new Map;function Oe(i,u,f,h=!0){const y=Be.get(u)||{},b=q.bind[i](n,u,f,h);b&&(wn(i,u,y[i]=b),Be.set(u,y))}function Xe(i,u,f){const h=Be.get(u)||{};for(let y in h)(i==null||y==i)&&(no(y,u,h[y]),delete h[y]);i==null&&Be.delete(u)}let wt=0,un=0,ne=0,B=0,ke=0,Ne=0,Sn=ke,dn=Ne,Ft=ne,fn=B,pt=0,kt=0,dt=0,Lt=0;n.bbox={};let fs=!1,El=!1,Mn=!1,pn=!1,Tl=!1,xt=!1;function ps(i,u,f){(f||i!=n.width||u!=n.height)&&Co(i,u),Dn(!1),Mn=!0,El=!0,Pn()}function Co(i,u){n.width=wt=ne=i,n.height=un=B=u,ke=Ne=0,qa(),Ka();let f=n.bbox;pt=f.left=$n(ke*me,.5),kt=f.top=$n(Ne*me,.5),dt=f.width=$n(ne*me,.5),Lt=f.height=$n(B*me,.5)}const ja=3;function Ua(){let i=!1,u=0;for(;!i;){u++;let f=nc(u),h=lc(u);i=u==ja||f&&h,i||(Co(n.width,n.height),El=!0)}}function Wa({width:i,height:u}){ps(i,u)}n.setSize=Wa;function qa(){let i=!1,u=!1,f=!1,h=!1;A.forEach((y,b)=>{if(y.show&&y._show){let{side:T,_size:P}=y,O=T%2,V=y.label!=null?y.labelSize:0,H=P+V;H>0&&(O?(ne-=H,T==3?(ke+=H,h=!0):f=!0):(B-=H,T==0?(Ne+=H,i=!0):u=!0))}}),mn[0]=i,mn[1]=f,mn[2]=u,mn[3]=h,ne-=en[1]+en[3],ke+=en[3],B-=en[2]+en[0],Ne+=en[0]}function Ka(){let i=ke+ne,u=Ne+B,f=ke,h=Ne;function y(b,T){switch(b){case 1:return i+=T,i-T;case 2:return u+=T,u-T;case 3:return f-=T,f+T;case 0:return h-=T,h+T}}A.forEach((b,T)=>{if(b.show&&b._show){let P=b.side;b._pos=y(P,b._size),b.label!=null&&(b._lpos=y(P,b.labelSize))}})}if(q.dataIdx==null){let i=q.hover,u=i.skip=new Set(i.skip??[]);u.add(void 0);let f=i.prox=oe(i.prox),h=i.bias??(i.bias=0);q.dataIdx=(y,b,T,P)=>{if(b==0)return T;let O=T,V=f(y,b,T,P)??$e,H=V>=0&&V<$e,j=D.ori==0?ne:B,X=q.left,he=t[0],fe=t[b];if(u.has(fe[T])){O=null;let se=null,Q=null,G;if(h==0||h==-1)for(G=T;se==null&&G-- >0;)u.has(fe[G])||(se=G);if(h==0||h==1)for(G=T;Q==null&&G++<fe.length;)u.has(fe[G])||(Q=G);if(se!=null||Q!=null)if(H){let Me=se==null?-1/0:F(he[se],D,j,0),Le=Q==null?1/0:F(he[Q],D,j,0),Ge=X-Me,ge=Le-X;Ge<=ge?Ge<=V&&(O=se):ge<=V&&(O=Q)}else O=Q==null?se:se==null?Q:T-se<=Q-T?se:Q}else H&&Fe(X-F(he[T],D,j,0))>V&&(O=null);return O}}const hn=i=>{q.event=i};q.idxs=de,q._lock=!1;let et=q.points;et.show=oe(et.show),et.size=oe(et.size),et.stroke=oe(et.stroke),et.width=oe(et.width),et.fill=oe(et.fill);const Ht=n.focus=Ie({},e.focus||{alpha:.3},q.focus),En=Ht.prox>=0,Tn=En&&et.one;let St=[],An=[],Cn=[];function Lo(i,u){let f=et.show(n,u);if(f instanceof HTMLElement)return gt(f,lf),gt(f,i.class),qt(f,-10,-10,ne,B),x.insertBefore(f,St[u]),f}function Do(i,u){if(s==1||u>0){let f=s==1&&S[i.scale].time,h=i.value;i.value=f?Qi(h)?sr(z,lr(h,N)):h||ce:h||yp,i.label=i.label||(f?up:cp)}if(Tn||u>0){i.width=i.width==null?1:i.width,i.paths=i.paths||Dp||wf,i.fillTo=oe(i.fillTo||kp),i.pxAlign=+pe(i.pxAlign,R),i.pxRound=pr(i.pxAlign),i.stroke=oe(i.stroke||null),i.fill=oe(i.fill||null),i._stroke=i._fill=i._paths=i._focus=null;let f=$p(rt(1,i.width),1),h=i.points=Ie({},{size:f,width:rt(1,f*.2),stroke:i.stroke,space:f*2,paths:Pp,_stroke:null,_fill:null},i.points);h.show=oe(h.show),h.filter=oe(h.filter),h.fill=oe(h.fill),h.stroke=oe(h.stroke),h.paths=oe(h.paths),h.pxAlign=i.pxAlign}if(Re){let f=le(i,u);we.splice(u,0,f[0]),_t.splice(u,0,f[1]),te.values.push(null)}if(Ye){de.splice(u,0,null);let f=null;Tn?u==0&&(f=Lo(i,u)):u>0&&(f=Lo(i,u)),St.splice(u,0,f),An.splice(u,0,0),Cn.splice(u,0,0)}Ke("addSeries",u)}function Ga(i,u){u=u??w.length,i=s==1?ao(i,u,ir,dr):ao(i,u,{},ur),w.splice(u,0,i),Do(w[u],u)}n.addSeries=Ga;function Ya(i){if(w.splice(i,1),Re){te.values.splice(i,1),_t.splice(i,1);let u=we.splice(i,1)[0];Xe(null,u.firstChild),u.remove()}Ye&&(de.splice(i,1),St.splice(i,1)[0].remove(),An.splice(i,1),Cn.splice(i,1)),Ke("delSeries",i)}n.delSeries=Ya;const mn=[!1,!1,!1,!1];function Ja(i,u){if(i._show=i.show,i.show){let f=i.side%2,h=S[i.scale];h==null&&(i.scale=f?w[1].scale:M,h=S[i.scale]);let y=h.time;i.size=oe(i.size),i.space=oe(i.space),i.rotate=oe(i.rotate),rn(i.incrs)&&i.incrs.forEach(T=>{!cn.has(T)&&cn.set(T,ra(T))}),i.incrs=oe(i.incrs||(h.distr==2?Uf:y?E==1?qf:Yf:bn)),i.splits=oe(i.splits||(y&&h.distr==1?Pe:h.distr==3?so:h.distr==4?pp:fp)),i.stroke=oe(i.stroke),i.grid.stroke=oe(i.grid.stroke),i.ticks.stroke=oe(i.ticks.stroke),i.border.stroke=oe(i.border.stroke);let b=i.values;i.values=rn(b)&&!rn(b[0])?oe(b):y?rn(b)?nr(z,tr(b,N)):Qi(b)?Zf(z,b):b||ue:b||dp,i.filter=oe(i.filter||(h.distr>=3&&h.log==10?vp:h.distr==3&&h.log==2?gp:oa)),i.font=gr(i.font),i.labelFont=gr(i.labelFont),i._size=i.size(n,null,u,0),i._space=i._rotate=i._incrs=i._found=i._splits=i._values=null,i._size>0&&(mn[u]=!0,i._el=Tt(Xd,m))}}function sl(i,u,f,h){let[y,b,T,P]=f,O=u%2,V=0;return O==0&&(P||b)&&(V=u==0&&!y||u==2&&!T?Ve(or.size/3):0),O==1&&(y||T)&&(V=u==1&&!b||u==3&&!P?Ve(ar.size/2):0),V}const Po=n.padding=(e.padding||[sl,sl,sl,sl]).map(i=>oe(pe(i,sl))),en=n._padding=Po.map((i,u)=>i(n,u,mn,0));let Je,je=null,Ue=null;const Al=s==1?w[0].idxs:null;let Dt=null,ol=!1;function Ro(i,u){if(t=i??[],n.data=n._data=t,s==2){Je=0;for(let f=1;f<w.length;f++)Je+=t[f][0].length}else{t.length==0&&(n.data=n._data=t=[[]]),Dt=t[0],Je=Dt.length;let f=t;if(Y==2){f=t.slice();let h=f[0]=Array(Je);for(let y=0;y<Je;y++)h[y]=y}n._data=t=f}if(Dn(!0),Ke("setData"),Y==2&&(Mn=!0),u!==!1){let f=D;f.auto(n,ol)?hs():nn(M,f.min,f.max),pn=pn||q.left>=0,xt=!0,Pn()}}n.setData=Ro;function hs(){ol=!0;let i,u;s==1&&(Je>0?(je=Al[0]=0,Ue=Al[1]=Je-1,i=t[0][je],u=t[0][Ue],Y==2?(i=je,u=Ue):i==u&&(Y==3?[i,u]=os(i,i,D.log,!1):Y==4?[i,u]=go(i,i,D.log,!1):D.time?u=i+Ve(86400/E):[i,u]=Yl(i,u,yo,!0))):(je=Al[0]=i=null,Ue=Al[1]=u=null)),nn(M,i,u)}let Cl,Ln,ms,vs,gs,ys,$s,bs,_s,ft;function Oo(i,u,f,h,y,b){i??(i=Ri),f??(f=bo),h??(h="butt"),y??(y=Ri),b??(b="round"),i!=Cl&&(p.strokeStyle=Cl=i),y!=Ln&&(p.fillStyle=Ln=y),u!=ms&&(p.lineWidth=ms=u),b!=gs&&(p.lineJoin=gs=b),h!=ys&&(p.lineCap=ys=h),f!=vs&&p.setLineDash(vs=f)}function zo(i,u,f,h){u!=Ln&&(p.fillStyle=Ln=u),i!=$s&&(p.font=$s=i),f!=bs&&(p.textAlign=bs=f),h!=_s&&(p.textBaseline=_s=h)}function ws(i,u,f,h,y=0){if(h.length>0&&i.auto(n,ol)&&(u==null||u.min==null)){let b=pe(je,0),T=pe(Ue,h.length-1),P=f.min==null?vf(h,b,T,y,i.distr==3):[f.min,f.max];i.min=It(i.min,f.min=P[0]),i.max=rt(i.max,f.max=P[1])}}const Io={min:null,max:null};function Qa(){for(let h in S){let y=S[h];W[h]==null&&(y.min==null||W[M]!=null&&y.auto(n,ol))&&(W[h]=Io)}for(let h in S){let y=S[h];W[h]==null&&y.from!=null&&W[y.from]!=null&&(W[h]=Io)}W[M]!=null&&Dn(!0);let i={};for(let h in W){let y=W[h];if(y!=null){let b=i[h]=Xn(S[h],Sf);if(y.min!=null)Ie(b,y);else if(h!=M||s==2)if(Je==0&&b.from==null){let T=b.range(n,null,null,h);b.min=T[0],b.max=T[1]}else b.min=$e,b.max=-$e}}if(Je>0){w.forEach((h,y)=>{if(s==1){let b=h.scale,T=W[b];if(T==null)return;let P=i[b];if(y==0){let O=P.range(n,P.min,P.max,b);P.min=O[0],P.max=O[1],je=zt(P.min,t[0]),Ue=zt(P.max,t[0]),Ue-je>1&&(t[0][je]<P.min&&je++,t[0][Ue]>P.max&&Ue--),h.min=Dt[je],h.max=Dt[Ue]}else h.show&&h.auto&&ws(P,T,h,t[y],h.sorted);h.idxs[0]=je,h.idxs[1]=Ue}else if(y>0&&h.show&&h.auto){let[b,T]=h.facets,P=b.scale,O=T.scale,[V,H]=t[y],j=i[P],X=i[O];j!=null&&ws(j,W[P],b,V,b.sorted),X!=null&&ws(X,W[O],T,H,T.sorted),h.min=T.min,h.max=T.max}});for(let h in i){let y=i[h],b=W[h];if(y.from==null&&(b==null||b.min==null)){let T=y.range(n,y.min==$e?null:y.min,y.max==-$e?null:y.max,h);y.min=T[0],y.max=T[1]}}}for(let h in i){let y=i[h];if(y.from!=null){let b=i[y.from];if(b.min==null)y.min=y.max=null;else{let T=y.range(n,b.min,b.max,h);y.min=T[0],y.max=T[1]}}}let u={},f=!1;for(let h in i){let y=i[h],b=S[h];if(b.min!=y.min||b.max!=y.max){b.min=y.min,b.max=y.max;let T=b.distr;b._min=T==3?Qt(b.min):T==4?Bs(b.min,b.asinh):T==100?b.fwd(b.min):b.min,b._max=T==3?Qt(b.max):T==4?Bs(b.max,b.asinh):T==100?b.fwd(b.max):b.max,u[h]=f=!0}}if(f){w.forEach((h,y)=>{s==2?y>0&&u.y&&(h._paths=null):u[h.scale]&&(h._paths=null)});for(let h in u)Mn=!0,Ke("setScale",h);Ye&&q.left>=0&&(pn=xt=!0)}for(let h in W)W[h]=null}function Za(i){let u=lo(je-1,0,Je-1),f=lo(Ue+1,0,Je-1);for(;i[u]==null&&u>0;)u--;for(;i[f]==null&&f<Je-1;)f++;return[u,f]}function Xa(){if(Je>0){let i=w.some(u=>u._focus)&&ft!=Ht.alpha;i&&(p.globalAlpha=ft=Ht.alpha),w.forEach((u,f)=>{if(f>0&&u.show&&(No(f,!1),No(f,!0),u._paths==null)){let h=ft;ft!=u.alpha&&(p.globalAlpha=ft=u.alpha);let y=s==2?[0,t[f][0].length-1]:Za(t[f]);u._paths=u.paths(n,f,y[0],y[1]),ft!=h&&(p.globalAlpha=ft=h)}}),w.forEach((u,f)=>{if(f>0&&u.show){let h=ft;ft!=u.alpha&&(p.globalAlpha=ft=u.alpha),u._paths!=null&&Vo(f,!1);{let y=u._paths!=null?u._paths.gaps:null,b=u.points.show(n,f,je,Ue,y),T=u.points.filter(n,f,b,y);(b||T)&&(u.points._paths=u.points.paths(n,f,je,Ue,T),Vo(f,!0))}ft!=h&&(p.globalAlpha=ft=h),Ke("drawSeries",f)}}),i&&(p.globalAlpha=ft=1)}}function No(i,u){let f=u?w[i].points:w[i];f._stroke=f.stroke(n,i),f._fill=f.fill(n,i)}function Vo(i,u){let f=u?w[i].points:w[i],{stroke:h,fill:y,clip:b,flags:T,_stroke:P=f._stroke,_fill:O=f._fill,_width:V=f.width}=f._paths;V=be(V*me,3);let H=null,j=V%2/2;u&&O==null&&(O=V>0?"#fff":P);let X=f.pxAlign==1&&j>0;if(X&&p.translate(j,j),!u){let he=pt-V/2,fe=kt-V/2,se=dt+V,Q=Lt+V;H=new Path2D,H.rect(he,fe,se,Q)}u?ks(P,V,f.dash,f.cap,O,h,y,T,b):ec(i,P,V,f.dash,f.cap,O,h,y,T,H,b),X&&p.translate(-j,-j)}function ec(i,u,f,h,y,b,T,P,O,V,H){let j=!1;O!=0&&_.forEach((X,he)=>{if(X.series[0]==i){let fe=w[X.series[1]],se=t[X.series[1]],Q=(fe._paths||_l).band;rn(Q)&&(Q=X.dir==1?Q[0]:Q[1]);let G,Me=null;fe.show&&Q&&yf(se,je,Ue)?(Me=X.fill(n,he)||b,G=fe._paths.clip):Q=null,ks(u,f,h,y,Me,T,P,O,V,H,G,Q),j=!0}}),j||ks(u,f,h,y,b,T,P,O,V,H)}const Fo=el|io;function ks(i,u,f,h,y,b,T,P,O,V,H,j){Oo(i,u,f,h,y),(O||V||j)&&(p.save(),O&&p.clip(O),V&&p.clip(V)),j?(P&Fo)==Fo?(p.clip(j),H&&p.clip(H),Dl(y,T),Ll(i,b,u)):P&io?(Dl(y,T),p.clip(j),Ll(i,b,u)):P&el&&(p.save(),p.clip(j),H&&p.clip(H),Dl(y,T),p.restore(),Ll(i,b,u)):(Dl(y,T),Ll(i,b,u)),(O||V||j)&&p.restore()}function Ll(i,u,f){f>0&&(u instanceof Map?u.forEach((h,y)=>{p.strokeStyle=Cl=y,p.stroke(h)}):u!=null&&i&&p.stroke(u))}function Dl(i,u){u instanceof Map?u.forEach((f,h)=>{p.fillStyle=Ln=h,p.fill(f)}):u!=null&&i&&p.fill(u)}function tc(i,u,f,h){let y=A[i],b;if(h<=0)b=[0,0];else{let T=y._space=y.space(n,i,u,f,h),P=y._incrs=y.incrs(n,i,u,f,h,T);b=Vp(u,f,P,h,T)}return y._found=b}function xs(i,u,f,h,y,b,T,P,O,V){let H=T%2/2;R==1&&p.translate(H,H),Oo(P,T,O,V,P),p.beginPath();let j,X,he,fe,se=y+(h==0||h==3?-b:b);f==0?(X=y,fe=se):(j=y,he=se);for(let Q=0;Q<i.length;Q++)u[Q]!=null&&(f==0?j=he=i[Q]:X=fe=i[Q],p.moveTo(j,X),p.lineTo(he,fe));p.stroke(),R==1&&p.translate(-H,-H)}function nc(i){let u=!0;return A.forEach((f,h)=>{if(!f.show)return;let y=S[f.scale];if(y.min==null){f._show&&(u=!1,f._show=!1,Dn(!1));return}else f._show||(u=!1,f._show=!0,Dn(!1));let b=f.side,T=b%2,{min:P,max:O}=y,[V,H]=tc(h,P,O,T==0?ne:B);if(H==0)return;let j=y.distr==2,X=f._splits=f.splits(n,h,P,O,V,H,j),he=y.distr==2?X.map(G=>Dt[G]):X,fe=y.distr==2?Dt[X[1]]-Dt[X[0]]:V,se=f._values=f.values(n,f.filter(n,he,h,H,fe),h,H,fe);f._rotate=b==2?f.rotate(n,se,h,H):0;let Q=f._size;f._size=At(f.size(n,se,h,i)),Q!=null&&f._size!=Q&&(u=!1)}),u}function lc(i){let u=!0;return Po.forEach((f,h)=>{let y=f(n,h,mn,i);y!=en[h]&&(u=!1),en[h]=y}),u}function sc(){for(let i=0;i<A.length;i++){let u=A[i];if(!u.show||!u._show)continue;let f=u.side,h=f%2,y,b,T=u.stroke(n,i),P=f==0||f==3?-1:1,[O,V]=u._found;if(u.label!=null){let st=u.labelGap*P,vt=Ve((u._lpos+st)*me);zo(u.labelFont[0],T,"center",f==2?fl:Pi),p.save(),h==1?(y=b=0,p.translate(vt,Ve(kt+Lt/2)),p.rotate((f==3?-Bl:Bl)/2)):(y=Ve(pt+dt/2),b=vt);let yn=la(u.label)?u.label(n,i,O,V):u.label;p.fillText(yn,y,b),p.restore()}if(V==0)continue;let H=S[u.scale],j=h==0?dt:Lt,X=h==0?pt:kt,he=u._splits,fe=H.distr==2?he.map(st=>Dt[st]):he,se=H.distr==2?Dt[he[1]]-Dt[he[0]]:O,Q=u.ticks,G=u.border,Me=Q.show?Q.size:0,Le=Ve(Me*me),Ge=Ve((u.alignTo==2?u._size-Me-u.gap:u.gap)*me),ge=u._rotate*-Bl/180,De=k(u._pos*me),ht=(Le+Ge)*P,lt=De+ht;b=h==0?lt:0,y=h==1?lt:0;let Mt=u.font[0],Pt=u.align==1?Bn:u.align==2?Vs:ge>0?Bn:ge<0?Vs:h==0?"center":f==3?Vs:Bn,Ut=ge||h==1?"middle":f==2?fl:Pi;zo(Mt,T,Pt,Ut);let mt=u.font[1]*u.lineGap,Et=he.map(st=>k(r(st,H,j,X))),Rt=u._values;for(let st=0;st<Rt.length;st++){let vt=Rt[st];if(vt!=null){h==0?y=Et[st]:b=Et[st],vt=""+vt;let yn=vt.indexOf(`
`)==-1?[vt]:vt.split(/\n/gm);for(let ot=0;ot<yn.length;ot++){let oi=yn[ot];ge?(p.save(),p.translate(y,b+ot*mt),p.rotate(ge),p.fillText(oi,0,0),p.restore()):p.fillText(oi,y,b+ot*mt)}}}Q.show&&xs(Et,Q.filter(n,fe,i,V,se),h,f,De,Le,be(Q.width*me,3),Q.stroke(n,i),Q.dash,Q.cap);let Wt=u.grid;Wt.show&&xs(Et,Wt.filter(n,fe,i,V,se),h,h==0?2:1,h==0?kt:pt,h==0?Lt:dt,be(Wt.width*me,3),Wt.stroke(n,i),Wt.dash,Wt.cap),G.show&&xs([De],[1],h==0?1:0,h==0?1:2,h==1?kt:pt,h==1?Lt:dt,be(G.width*me,3),G.stroke(n,i),G.dash,G.cap)}Ke("drawAxes")}function Dn(i){w.forEach((u,f)=>{f>0&&(u._paths=null,i&&(s==1?(u.min=null,u.max=null):u.facets.forEach(h=>{h.min=null,h.max=null})))})}let Pl=!1,Ss=!1,il=[];function oc(){Ss=!1;for(let i=0;i<il.length;i++)Ke(...il[i]);il.length=0}function Pn(){Pl||(Df(Ho),Pl=!0)}function ic(i,u=!1){Pl=!0,Ss=u,i(n),Ho(),u&&il.length>0&&queueMicrotask(oc)}n.batch=ic;function Ho(){if(fs&&(Qa(),fs=!1),Mn&&(Ua(),Mn=!1),El){if(Ee($,Bn,ke),Ee($,fl,Ne),Ee($,ml,ne),Ee($,vl,B),Ee(x,Bn,ke),Ee(x,fl,Ne),Ee(x,ml,ne),Ee(x,vl,B),Ee(m,ml,wt),Ee(m,vl,un),v.width=Ve(wt*me),v.height=Ve(un*me),A.forEach(({_el:i,_show:u,_size:f,_pos:h,side:y})=>{if(i!=null)if(u){let b=y===3||y===0?f:0,T=y%2==1;Ee(i,T?"left":"top",h-b),Ee(i,T?"width":"height",f),Ee(i,T?"top":"left",T?Ne:ke),Ee(i,T?"height":"width",T?B:ne),to(i,_n)}else gt(i,_n)}),Cl=Ln=ms=gs=ys=$s=bs=_s=vs=null,ft=1,cl(!0),ke!=Sn||Ne!=dn||ne!=Ft||B!=fn){Dn(!1);let i=ne/Ft,u=B/fn;if(Ye&&!pn&&q.left>=0){q.left*=i,q.top*=u,Rn&&qt(Rn,Ve(q.left),0,ne,B),On&&qt(On,0,Ve(q.top),ne,B);for(let f=0;f<St.length;f++){let h=St[f];h!=null&&(An[f]*=i,Cn[f]*=u,qt(h,At(An[f]),At(Cn[f]),ne,B))}}if(Se.show&&!Tl&&Se.left>=0&&Se.width>0){Se.left*=i,Se.width*=i,Se.top*=u,Se.height*=u;for(let f in Ls)Ee(Nn,f,Se[f])}Sn=ke,dn=Ne,Ft=ne,fn=B}Ke("setSize"),El=!1}wt>0&&un>0&&(p.clearRect(0,0,v.width,v.height),Ke("drawClear"),L.forEach(i=>i()),Ke("draw")),Se.show&&Tl&&(Rl(Se),Tl=!1),Ye&&pn&&(gn(null,!0,!1),pn=!1),te.show&&te.live&&xt&&(As(),xt=!1),c||(c=!0,n.status=1,Ke("ready")),ol=!1,Pl=!1}n.redraw=(i,u)=>{Mn=u||!1,i!==!1?nn(M,D.min,D.max):Pn()};function Ms(i,u){let f=S[i];if(f.from==null){if(Je==0){let h=f.range(n,u.min,u.max,i);u.min=h[0],u.max=h[1]}if(u.min>u.max){let h=u.min;u.min=u.max,u.max=h}if(Je>1&&u.min!=null&&u.max!=null&&u.max-u.min<1e-16)return;i==M&&f.distr==2&&Je>0&&(u.min=zt(u.min,t[0]),u.max=zt(u.max,t[0]),u.min==u.max&&u.max++),W[i]=u,fs=!0,Pn()}}n.setScale=Ms;let Es,Ts,Rn,On,Bo,jo,zn,In,Uo,Wo,xe,Te,tn=!1;const Qe=q.drag;let We=Qe.x,qe=Qe.y;Ye&&(q.x&&(Es=Tt(tf,x)),q.y&&(Ts=Tt(nf,x)),D.ori==0?(Rn=Es,On=Ts):(Rn=Ts,On=Es),xe=q.left,Te=q.top);const Se=n.select=Ie({show:!0,over:!0,left:0,width:0,top:0,height:0},e.select),Nn=Se.show?Tt(ef,Se.over?x:$):null;function Rl(i,u){if(Se.show){for(let f in i)Se[f]=i[f],f in Ls&&Ee(Nn,f,i[f]);u!==!1&&Ke("setSelect")}}n.setSelect=Rl;function rc(i){if(w[i].show)Re&&to(we[i],_n);else if(Re&&gt(we[i],_n),Ye){let f=Tn?St[0]:St[i];f!=null&&qt(f,-10,-10,ne,B)}}function nn(i,u,f){Ms(i,{min:u,max:f})}function Bt(i,u,f,h){u.focus!=null&&fc(i),u.show!=null&&w.forEach((y,b)=>{b>0&&(i==b||i==null)&&(y.show=u.show,rc(b),s==2?(nn(y.facets[0].scale,null,null),nn(y.facets[1].scale,null,null)):nn(y.scale,null,null),Pn())}),f!==!1&&Ke("setSeries",i,u),h&&ul("setSeries",n,i,u)}n.setSeries=Bt;function ac(i,u){Ie(_[i],u)}function cc(i,u){i.fill=oe(i.fill||null),i.dir=pe(i.dir,-1),u=u??_.length,_.splice(u,0,i)}function uc(i){i==null?_.length=0:_.splice(i,1)}n.addBand=cc,n.setBand=ac,n.delBand=uc;function dc(i,u){w[i].alpha=u,Ye&&St[i]!=null&&(St[i].style.opacity=u),Re&&we[i]&&(we[i].style.opacity=u)}let Jt,ln,vn;const Vn={focus:!0};function fc(i){if(i!=vn){let u=i==null,f=Ht.alpha!=1;w.forEach((h,y)=>{if(s==1||y>0){let b=u||y==0||y==i;h._focus=u?null:b,f&&dc(y,b?1:Ht.alpha)}}),vn=i,f&&Pn()}}Re&&En&&Oe(Ii,re,i=>{q._lock||(hn(i),vn!=null&&Bt(null,Vn,!0,ze.setSeries))});function jt(i,u,f){let h=S[u];f&&(i=i/me-(h.ori==1?Ne:ke));let y=ne;h.ori==1&&(y=B,i=y-i),h.dir==-1&&(i=y-i);let b=h._min,T=h._max,P=i/y,O=b+(T-b)*P,V=h.distr;return V==3?Qn(10,O):V==4?bf(O,h.asinh):V==100?h.bwd(O):O}function pc(i,u){let f=jt(i,M,u);return zt(f,t[0],je,Ue)}n.valToIdx=i=>zt(i,t[0]),n.posToIdx=pc,n.posToVal=jt,n.valToPos=(i,u,f)=>S[u].ori==0?o(i,S[u],f?dt:ne,f?pt:0):a(i,S[u],f?Lt:B,f?kt:0),n.setCursor=(i,u,f)=>{xe=i.left,Te=i.top,gn(null,u,f)};function qo(i,u){Ee(Nn,Bn,Se.left=i),Ee(Nn,ml,Se.width=u)}function Ko(i,u){Ee(Nn,fl,Se.top=i),Ee(Nn,vl,Se.height=u)}let rl=D.ori==0?qo:Ko,al=D.ori==1?qo:Ko;function hc(){if(Re&&te.live)for(let i=s==2?1:0;i<w.length;i++){if(i==0&&Ze)continue;let u=te.values[i],f=0;for(let h in u)_t[i][f++].firstChild.nodeValue=u[h]}}function As(i,u){if(i!=null&&(i.idxs?i.idxs.forEach((f,h)=>{de[h]=f}):xf(i.idx)||de.fill(i.idx),te.idx=de[0]),Re&&te.live){for(let f=0;f<w.length;f++)(f>0||s==1&&!Ze)&&mc(f,de[f]);hc()}xt=!1,u!==!1&&Ke("setLegend")}n.setLegend=As;function mc(i,u){let f=w[i],h=i==0&&Y==2?Dt:t[i],y;Ze?y=f.values(n,i,u)??Vt:(y=f.value(n,u==null?null:h[u],i,u),y=y==null?Vt:{_:y}),te.values[i]=y}function gn(i,u,f){Uo=xe,Wo=Te,[xe,Te]=q.move(n,xe,Te),q.left=xe,q.top=Te,Ye&&(Rn&&qt(Rn,Ve(xe),0,ne,B),On&&qt(On,0,Ve(Te),ne,B));let h,y=je>Ue;Jt=$e,ln=null;let b=D.ori==0?ne:B,T=D.ori==1?ne:B;if(xe<0||Je==0||y){h=q.idx=null;for(let P=0;P<w.length;P++){let O=St[P];O!=null&&qt(O,-10,-10,ne,B)}En&&Bt(null,Vn,!0,i==null&&ze.setSeries),te.live&&(de.fill(h),xt=!0)}else{let P,O,V;s==1&&(P=D.ori==0?xe:Te,O=jt(P,M),h=q.idx=zt(O,t[0],je,Ue),V=F(t[0][h],D,b,0));let H=-10,j=-10,X=0,he=0,fe=!0,se="",Q="";for(let G=s==2?1:0;G<w.length;G++){let Me=w[G],Le=de[G],Ge=Le==null?null:s==1?t[G][Le]:t[G][1][Le],ge=q.dataIdx(n,G,h,O),De=ge==null?null:s==1?t[G][ge]:t[G][1][ge];if(xt=xt||De!=Ge||ge!=Le,de[G]=ge,G>0&&Me.show){let ht=ge==null?-10:ge==h?V:F(s==1?t[0][ge]:t[G][0][ge],D,b,0),lt=De==null?-10:K(De,s==1?S[Me.scale]:S[Me.facets[1].scale],T,0);if(En&&De!=null){let Mt=D.ori==1?xe:Te,Pt=Fe(Ht.dist(n,G,ge,lt,Mt));if(Pt<Jt){let Ut=Ht.bias;if(Ut!=0){let mt=jt(Mt,Me.scale),Et=De>=0?1:-1,Rt=mt>=0?1:-1;Rt==Et&&(Rt==1?Ut==1?De>=mt:De<=mt:Ut==1?De<=mt:De>=mt)&&(Jt=Pt,ln=G)}else Jt=Pt,ln=G}}if(xt||Tn){let Mt,Pt;D.ori==0?(Mt=ht,Pt=lt):(Mt=lt,Pt=ht);let Ut,mt,Et,Rt,Wt,st,vt=!0,yn=et.bbox;if(yn!=null){vt=!1;let ot=yn(n,G);Et=ot.left,Rt=ot.top,Ut=ot.width,mt=ot.height}else Et=Mt,Rt=Pt,Ut=mt=et.size(n,G);if(st=et.fill(n,G),Wt=et.stroke(n,G),Tn)G==ln&&Jt<=Ht.prox&&(H=Et,j=Rt,X=Ut,he=mt,fe=vt,se=st,Q=Wt);else{let ot=St[G];ot!=null&&(An[G]=Et,Cn[G]=Rt,Ui(ot,Ut,mt,vt),Bi(ot,st,Wt),qt(ot,At(Et),At(Rt),ne,B))}}}}if(Tn){let G=Ht.prox,Me=vn==null?Jt<=G:Jt>G||ln!=vn;if(xt||Me){let Le=St[0];Le!=null&&(An[0]=H,Cn[0]=j,Ui(Le,X,he,fe),Bi(Le,se,Q),qt(Le,At(H),At(j),ne,B))}}}if(Se.show&&tn)if(i!=null){let[P,O]=ze.scales,[V,H]=ze.match,[j,X]=i.cursor.sync.scales,he=i.cursor.drag;if(We=he._x,qe=he._y,We||qe){let{left:fe,top:se,width:Q,height:G}=i.select,Me=i.scales[j].ori,Le=i.posToVal,Ge,ge,De,ht,lt,Mt=P!=null&&V(P,j),Pt=O!=null&&H(O,X);Mt&&We?(Me==0?(Ge=fe,ge=Q):(Ge=se,ge=G),De=S[P],ht=F(Le(Ge,j),De,b,0),lt=F(Le(Ge+ge,j),De,b,0),rl(It(ht,lt),Fe(lt-ht))):rl(0,b),Pt&&qe?(Me==1?(Ge=fe,ge=Q):(Ge=se,ge=G),De=S[O],ht=K(Le(Ge,X),De,T,0),lt=K(Le(Ge+ge,X),De,T,0),al(It(ht,lt),Fe(lt-ht))):al(0,T)}else Ds()}else{let P=Fe(Uo-Bo),O=Fe(Wo-jo);if(D.ori==1){let X=P;P=O,O=X}We=Qe.x&&P>=Qe.dist,qe=Qe.y&&O>=Qe.dist;let V=Qe.uni;V!=null?We&&qe&&(We=P>=V,qe=O>=V,!We&&!qe&&(O>P?qe=!0:We=!0)):Qe.x&&Qe.y&&(We||qe)&&(We=qe=!0);let H,j;We&&(D.ori==0?(H=zn,j=xe):(H=In,j=Te),rl(It(H,j),Fe(j-H)),qe||al(0,T)),qe&&(D.ori==1?(H=zn,j=xe):(H=In,j=Te),al(It(H,j),Fe(j-H)),We||rl(0,b)),!We&&!qe&&(rl(0,0),al(0,0))}if(Qe._x=We,Qe._y=qe,i==null){if(f){if(si!=null){let[P,O]=ze.scales;ze.values[0]=P!=null?jt(D.ori==0?xe:Te,P):null,ze.values[1]=O!=null?jt(D.ori==1?xe:Te,O):null}ul(Fs,n,xe,Te,ne,B,h)}if(En){let P=f&&ze.setSeries,O=Ht.prox;vn==null?Jt<=O&&Bt(ln,Vn,!0,P):Jt>O?Bt(null,Vn,!0,P):ln!=vn&&Bt(ln,Vn,!0,P)}}xt&&(te.idx=h,As()),u!==!1&&Ke("setCursor")}let sn=null;Object.defineProperty(n,"rect",{get(){return sn==null&&cl(!1),sn}});function cl(i=!1){i?sn=null:(sn=x.getBoundingClientRect(),Ke("syncRect",sn))}function Go(i,u,f,h,y,b,T){q._lock||tn&&i!=null&&i.movementX==0&&i.movementY==0||(Cs(i,u,f,h,y,b,T,!1,i!=null),i!=null?gn(null,!0,!0):gn(u,!0,!1))}function Cs(i,u,f,h,y,b,T,P,O){if(sn==null&&cl(!1),hn(i),i!=null)f=i.clientX-sn.left,h=i.clientY-sn.top;else{if(f<0||h<0){xe=-10,Te=-10;return}let[V,H]=ze.scales,j=u.cursor.sync,[X,he]=j.values,[fe,se]=j.scales,[Q,G]=ze.match,Me=u.axes[0].side%2==1,Le=D.ori==0?ne:B,Ge=D.ori==1?ne:B,ge=Me?b:y,De=Me?y:b,ht=Me?h:f,lt=Me?f:h;if(fe!=null?f=Q(V,fe)?r(X,S[V],Le,0):-10:f=Le*(ht/ge),se!=null?h=G(H,se)?r(he,S[H],Ge,0):-10:h=Ge*(lt/De),D.ori==1){let Mt=f;f=h,h=Mt}}O&&(u==null||u.cursor.event.type==Fs)&&((f<=1||f>=ne-1)&&(f=$n(f,ne)),(h<=1||h>=B-1)&&(h=$n(h,B))),P?(Bo=f,jo=h,[zn,In]=q.move(n,f,h)):(xe=f,Te=h)}const Ls={width:0,height:0,left:0,top:0};function Ds(){Rl(Ls,!1)}let Yo,Jo,Qo,Zo;function Xo(i,u,f,h,y,b,T){tn=!0,We=qe=Qe._x=Qe._y=!1,Cs(i,u,f,h,y,b,T,!0,!1),i!=null&&(Oe(Hs,Xs,ei,!1),ul(Oi,n,zn,In,ne,B,null));let{left:P,top:O,width:V,height:H}=Se;Yo=P,Jo=O,Qo=V,Zo=H}function ei(i,u,f,h,y,b,T){tn=Qe._x=Qe._y=!1,Cs(i,u,f,h,y,b,T,!1,!0);let{left:P,top:O,width:V,height:H}=Se,j=V>0||H>0,X=Yo!=P||Jo!=O||Qo!=V||Zo!=H;if(j&&X&&Rl(Se),Qe.setScale&&j&&X){let he=P,fe=V,se=O,Q=H;if(D.ori==1&&(he=O,fe=H,se=P,Q=V),We&&nn(M,jt(he,M),jt(he+fe,M)),qe)for(let G in S){let Me=S[G];G!=M&&Me.from==null&&Me.min!=$e&&nn(G,jt(se+Q,G),jt(se,G))}Ds()}else q.lock&&(q._lock=!q._lock,gn(u,!0,i!=null));i!=null&&(Xe(Hs,Xs),ul(Hs,n,xe,Te,ne,B,null))}function vc(i,u,f,h,y,b,T){if(q._lock)return;hn(i);let P=tn;if(tn){let O=!0,V=!0,H=10,j,X;D.ori==0?(j=We,X=qe):(j=qe,X=We),j&&X&&(O=xe<=H||xe>=ne-H,V=Te<=H||Te>=B-H),j&&O&&(xe=xe<zn?0:ne),X&&V&&(Te=Te<In?0:B),gn(null,!0,!0),tn=!1}xe=-10,Te=-10,de.fill(null),gn(null,!0,!0),P&&(tn=P)}function ti(i,u,f,h,y,b,T){q._lock||(hn(i),hs(),Ds(),i!=null&&ul(Ni,n,xe,Te,ne,B,null))}function ni(){A.forEach(Fp),ps(n.width,n.height,!0)}wn(Gl,Yn,ni);const Fn={};Fn.mousedown=Xo,Fn.mousemove=Go,Fn.mouseup=ei,Fn.dblclick=ti,Fn.setSeries=(i,u,f,h)=>{let y=ze.match[2];f=y(n,u,f),f!=-1&&Bt(f,h,!0,!1)},Ye&&(Oe(Oi,x,Xo),Oe(Fs,x,Go),Oe(zi,x,i=>{hn(i),cl(!1)}),Oe(Ii,x,vc),Oe(Ni,x,ti),ro.add(n),n.syncRect=cl);const Ol=n.hooks=e.hooks||{};function Ke(i,u,f){Ss?il.push([i,u,f]):i in Ol&&Ol[i].forEach(h=>{h.call(null,n,u,f)})}(e.plugins||[]).forEach(i=>{for(let u in i.hooks)Ol[u]=(Ol[u]||[]).concat(i.hooks[u])});const li=(i,u,f)=>f,ze=Ie({key:null,setSeries:!1,filters:{pub:Yi,sub:Yi},scales:[M,w[1]?w[1].scale:null],match:[Ji,Ji,li],values:[null,null]},q.sync);ze.match.length==2&&ze.match.push(li),q.sync=ze;const si=ze.key,Ps=Ea(si);function ul(i,u,f,h,y,b,T){ze.filters.pub(i,u,f,h,y,b,T)&&Ps.pub(i,u,f,h,y,b,T)}Ps.sub(n);function gc(i,u,f,h,y,b,T){ze.filters.sub(i,u,f,h,y,b,T)&&Fn[i](null,u,f,h,y,b,T)}n.pub=gc;function yc(){Ps.unsub(n),ro.delete(n),Be.clear(),no(Gl,Yn,ni),d.remove(),re==null||re.remove(),Ke("destroy")}n.destroy=yc;function Rs(){Ke("init",e,t),Ro(t||e.data,!1),W[M]?Ms(M,W[M]):hs(),Tl=Se.show&&(Se.width>0||Se.height>0),pn=xt=!0,ps(e.width,e.height)}return w.forEach(Do),A.forEach(Ja),l?l instanceof HTMLElement?(l.appendChild(d),Rs()):l(n,Rs):Rs(),n}nt.assign=Ie;nt.fmtNum=$o;nt.rangeNum=Yl;nt.rangeLog=os;nt.rangeAsinh=go;nt.orient=xn;nt.pxRatio=me;nt.join=Lf;nt.fmtDate=_o,nt.tzDate=Bf;nt.sync=Ea;{nt.addGap=xp,nt.clipGaps=as;let e=nt.paths={points:Pa};e.linear=Oa,e.stepped=Ep,e.bars=Tp,e.spline=Cp}function Hp(e){let t;return{hooks:{init(l){t=document.createElement("div"),t.className="chart-tooltip",t.style.display="none",l.over.appendChild(t)},setCursor(l){const n=l.cursor.idx;if(n==null||!l.data[1]||l.data[1][n]==null){t.style.display="none";return}const s=l.data[0][n],o=l.data[1][n],a=new Date(s*1e3).toLocaleTimeString([],{hourCycle:"h23"});t.innerHTML=`<b>${e?e(o):yt(o)}</b> ${a}`;const r=Math.round(l.valToPos(s,"x"));t.style.left=Math.min(r,l.over.clientWidth-80)+"px",t.style.display=""}}}}function Bp(e,t){if(typeof document>"u")return`rgba(100,100,100,${t})`;const l=document.createElement("span");l.style.color=e,document.body.appendChild(l);const n=getComputedStyle(l).color;l.remove();const s=n.match(/[\d.]+/g);return s&&s.length>=3?`rgba(${s[0]},${s[1]},${s[2]},${t})`:`rgba(100,100,100,${t})`}function jp({data:e,color:t,smooth:l,height:n,yMax:s,fmtVal:o,ariaLabel:a,ariaHidden:r}){const c=Z(null),d=Z(null),v=n||55;return ae(()=>{if(!c.current||!e||e[0].length<2)return;const p=l?Lc(e[1]):e[1],m=[e[0],p];if(d.current){d.current.setData(m);return}const $=s?(R,k,E)=>[0,Math.max(s,E*1.05)]:(R,k,E)=>[Math.max(0,k*.9),E*1.1],x={width:c.current.clientWidth||200,height:v,padding:[2,0,4,0],cursor:{show:!0,x:!0,y:!1,points:{show:!1}},legend:{show:!1},select:{show:!1},scales:{x:{time:!0},y:{auto:!0,range:$}},axes:[{show:!1,size:0,gap:0},{show:!1,size:0,gap:0}],series:[{},{stroke:Dc(t),width:1.5,fill:Bp(t,.09)}],plugins:[Hp(o)]};return d.current=new nt(x,m,c.current),()=>{d.current&&(d.current.destroy(),d.current=null)}},[e,t,l]),ae(()=>{if(!d.current||!c.current)return;const p=new ResizeObserver(()=>{d.current&&c.current&&d.current.setSize({width:c.current.clientWidth,height:v})});return p.observe(c.current),()=>p.disconnect()},[]),g`<div class="chart-wrap"
    role=${r?null:"img"}
    aria-hidden=${r?"true":null}
    aria-label=${r?null:a||"Sparkline chart"}
    style=${"height:"+v+"px"} ref=${c}></div>`}function Up(e){if(!e||!e[1])return null;const t=e[1].filter(s=>s!=null&&!isNaN(s));if(t.length<2)return null;const l=t[0],n=t[t.length-1];if(l>0){const s=(n-l)/l*100;return Math.abs(s)<1?null:{dir:s>0?"▲":"▼",pct:Math.round(Math.abs(s))}}return n>0?{dir:"▲",pct:null}:null}function Wp({label:e,value:t,valColor:l,data:n,chartColor:s,smooth:o,refLines:a,yMax:r,dp:c,iconName:d}){const v=Ae(()=>{if(!n||!n[1]||n[1].length<2)return[];const m=r?Math.max(r,n[1].reduce(($,x)=>Math.max($,x),0)*1.05):n[1].reduce(($,x)=>Math.max($,x),0)*1.1;return(a||[]).map($=>{if(m<=0)return null;const x=(1-$.value/m)*100;return x>=0&&x<=95?{...$,pct:x}:null}).filter(Boolean)},[n,a,r]),p=Ae(()=>Up(n),[n]);return g`<div class="chart-box" role="img" aria-label=${"Chart: "+e+" — current value: "+(t||"no data")} ...${c?{"data-dp":c}:{}}>
    <div class="chart-hdr">
      <span class="chart-label">${d?g`<${Nt} name=${d} size="0.85em"/> `:""}${e}</span>
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
      ${n&&n[0].length>=2?g`<${jp} data=${n} color=${s||"var(--accent)"} smooth=${o} yMax=${r} ariaHidden=${!0}/>`:g`<div class="chart-wrap text-muted" style="display:flex;align-items:center;justify-content:center;font-size:var(--fs-base)">collecting...</div>`}
    </div>
  </div>`}function qp({pct:e,direction:t,inverse:l=!1,compareLabel:n}){if(e==null||t==null)return null;const s=t==="flat"||e===0,o=s?"•":t==="up"?"▲":"▼";let a="neutral";s||(a=(l?t==="down":t==="up")?"success":"danger");const r=Number.isFinite(e)?Math.abs(e).toFixed(Math.abs(e)>=10?0:1):"0",c=g`<${ki} variant=${a} size="sm"
    aria-label=${"Delta: "+o+" "+r+"%"+(n?" vs "+n:"")}
  >${o} ${r}%</${ki}>`;return n?g`<${xi} content=${"vs. "+n}>${c}</${xi}>`:c}function co({label:e,value:t,accent:l,dp:n,sm:s,delta:o,deltaInverse:a}){const r=Z(t),[c,d]=ee(!1);return ae(()=>{r.current!==t&&(d(!0),setTimeout(()=>d(!1),500)),r.current=t},[t]),g`<div class=${"metric"+(s?" metric--sm":"")} aria-label="${e}: ${t}" ...${n?{"data-dp":n}:{}}>
    <div class="label">${e}</div>
    <div class=${"value"+(l?" accent":"")+(c?" flash":"")} aria-live="polite" aria-atomic="true">${t}</div>
    ${o?g`<div class="metric-delta"><${qp}
      pct=${o.pct} direction=${o.direction}
      inverse=${a} compareLabel=${o.compareLabel}/></div>`:null}
  </div>`}function yr({snap:e,mode:t}){if(!e)return null;const l=!t||t==="files",n=!t||t==="traffic",s=e.tools.filter(d=>{var v;return d.tool!=="aictl"&&((v=d.files)==null?void 0:v.length)}),o=s.reduce((d,v)=>d+v.files.length,0)||1,a=d=>(Number(d.live.outbound_rate_bps)||0)+(Number(d.live.inbound_rate_bps)||0),r=e.tools.filter(d=>d.tool!=="aictl"&&d.live&&a(d)>0),c=r.reduce((d,v)=>d+a(v),0)||1;return g`
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
    ${n&&g`<div class="rbar-block" data-dp="overview.live_traffic_bar" role="img" aria-label=${"Live traffic: "+(r.length?r.map(d=>d.label).join(", "):"no active traffic")}>
      <div class="rbar-title">Live Traffic${r.length===0?" — no active traffic":""}</div>
      <div class="rbar">${r.map(d=>{const v=a(d);return g`<div class="rbar-seg" style=${"width:"+(v/c*100).toFixed(1)+"%;background:"+(hl[d.tool]||"var(--fg2)")}
          title="${d.label}: ${ai(v)}"></div>`})}
      </div>
      <div class="rbar-legend">${r.map(d=>{const v=a(d);return g`<span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(hl[d.tool]||"var(--fg2)")}></span>
          ${d.label} <span class="text-muted">${ai(v)}</span>
        </span>`})}
      </div>
    </div>`}
    ${!t&&!s.length&&!r.length&&g`<div class="empty-state">
      No AI tool resources found yet.
      <small class="empty-state-source">/api/snapshot · tools[].files · tools[].live</small>
    </div>`}`}const Kp=18e4;function Gp({loading:e,error:t,data:l,isEmpty:n,updatedAt:s,staleMs:o=Kp,now:a=Date.now()}){return l!=null?n&&n(l)?t?"error":"empty":t||s&&a-s>o?"stale":"ready":t?"error":e?"loading":"empty"}function Yp(e){return e&&(typeof e=="string"?e:e.message)||"The request failed."}function an({status:e,error:t,updatedAt:l,onRetry:n,emptyTitle:s="No data",emptyHint:o,emptyFix:a,skeletonHeight:r="72px",label:c,children:d}){if(e==="loading")return g`<div class="panel-state panel-state--loading" role="status" aria-busy="true"
      aria-label=${"Loading "+(c||"panel")}>
      <${Gn} height=${r} radius="var(--radius-sm)"/>
    </div>`;if(e==="error")return g`<div class="panel-state panel-state--error" role="alert">
      <${Nt} name="alert-triangle" size="14"/>
      <div>
        <div class="panel-state__title">Could not load ${c||"this panel"}</div>
        <div class="panel-state__hint">${Yp(t)}</div>
      </div>
      ${n&&g`<button type="button" class="range-btn" onClick=${n}>Retry</button>`}
    </div>`;if(e==="empty")return g`<div class="panel-state panel-state--empty" role="status">
      <div class="panel-state__title">${s}</div>
      ${o&&g`<div class="panel-state__hint">${o}</div>`}
      ${a&&g`<code class="panel-state__fix">${a}</code>`}
    </div>`;const v=l?Math.max(0,Math.round((Date.now()-l)/1e3)):null;return g`
    ${e==="stale"&&g`<div class="panel-state panel-state--stale" role="status">
      <${Nt} name="clock" size="12"/>
      <span>${t?"Refresh failed. ":""}Showing data from ${v!=null?fo(v)+" ago":"an earlier fetch"}.</span>
      ${n&&g`<button type="button" class="panel-state__retry" onClick=${n}>Retry</button>`}
    </div>`}
    ${d}`}function Jp({enabledTools:e,snap:t,what:l="this screen"}){const n=Pc(e),s=Rc(e,t);return g`<div class="panel-state panel-state--empty" role="status" data-testid="tool-scope-empty">
    <${Nt} name="filter" size="14"/>
    <div>
      <div class="panel-state__title">${n?"No tools are selected":"The selected tools have no data here"}</div>
      <div class="panel-state__hint">${n?`The tool filter in the header has no tool ticked, so ${l} shows nothing. Tick a tool, or choose All tools.`:`${s.join(", ")} ${s.length===1?"has":"have"} nothing to show on ${l}. Tick more tools in the header filter, or choose All tools.`}</div>
    </div>
  </div>`}function Qp({perCore:e}){if(!e||!e.length)return null;const t=100;return g`<div class="mb-sm" style="display:flex;gap:2px;align-items:end;height:40px">
    ${e.map((l,n)=>{const s=Math.max(1,l/t*100),o=l>80?"var(--red)":l>50?"var(--orange)":l>20?"var(--green)":"var(--fg2)";return g`<div key=${n} title=${"Core "+n+": "+$l(l)}
        style=${"flex:1;min-width:3px;background:"+o+";height:"+s+"%;border-radius:1px;opacity:0.8;transition:height 0.3s"}/>`})}
  </div>`}function Zp({mcpDetail:e}){return e!=null&&e.length?g`<div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
    ${e.map(t=>{const l=Oc[t.status]||"var(--fg3)";return g`<div key=${t.name+t.tool}
        style="display:flex;align-items:center;gap:var(--sp-2);padding:3px var(--sp-3);
               border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent)"
        title=${t.status+(t.pid?" PID "+t.pid:"")+(t.transport?" · "+t.transport:"")}>
        <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${l}"></span>
        <span class="mono" style="font-size:var(--fs-xs);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${qn(t.name)}</span>
        <span style="font-size:var(--fs-2xs);color:${zc(t.tool)};white-space:nowrap;flex-shrink:0">${qn(t.tool)}</span>
      </div>`})}
  </div>`:g`<div style="color:var(--fg3);font-size:var(--fs-sm);padding:var(--sp-2) 0">None configured</div>`}function Xp({label:e,value:t,mcpDetail:l}){const[n,s]=ee(!1);return g`<div style="position:relative;cursor:default"
    tabindex="0"
    onMouseEnter=${()=>s(!0)} onMouseLeave=${()=>s(!1)}
    onFocusIn=${()=>s(!0)} onFocusOut=${()=>s(!1)}>
    <${co} label=${e} value=${t} sm=${!0}/>
    ${n&&g`<div style="position:absolute;top:calc(100% + 6px);left:0;z-index:200;
        min-width:260px;background:var(--bg);border:1px solid var(--border);border-radius:6px;
        box-shadow:0 4px 20px rgba(0,0,0,0.35);padding:var(--sp-3)">
      <div class="metric-group-label" style="padding:0 0 var(--sp-2)">MCP Servers</div>
      <${Zp} mcpDetail=${l}/>
    </div>`}
  </div>`}const eh=new Set(["cpu","mem_mb","tokens"]);function th({snap:e,history:t,enabledTools:l=null}){const n=jl(l),s=Ae(()=>n&&e?{...e,...lu(e)}:e,[n,e]),o=Ae(()=>su(t,l),[t,l]),[a,r]=ee(()=>{try{return localStorage.getItem("aictl-header-expanded")!=="false"}catch{return!0}}),c=ie(()=>{r(m=>{const $=!m;try{localStorage.setItem("aictl-header-expanded",String($))}catch{}return $})},[]),d=m=>o!=null&&o.ts&&o.ts.length>=2&&(!n||eh.has(m))?[o.ts,o[m]]:null,v=(s==null?void 0:s.cpu_cores)||1,p={cores:v};return n&&!((s==null?void 0:s.tools)||[]).some(m=>m.tool!=="aictl")?g`<${Jp} enabledTools=${l} snap=${s} what="the overview totals"/>`:g`
    <div class="grid-sparklines">
      ${yl.sparklines.map(m=>{const $=s?s["total_"+m.field]??s[m.field]??"":"",x=Os($,m.format,m.suffix,m.multiply),R=m.yMaxExpr?ci(m.yMaxExpr,p):void 0,k=(m.refLines||[]).map(E=>({value:ci(E.valueExpr,p),label:(E.label||"").replace("{cores}",v)})).filter(E=>E.value!=null);return g`<${Wp} key=${m.field} label=${m.label} value=${x}
          data=${d(m.field)} chartColor=${m.color||"var(--accent)"}
          smooth=${!!m.smooth} refLines=${k.length?k:void 0}
          yMax=${R} dp=${m.dp} iconName=${m.iconName}/>`})}
    </div>

    <div class=${a?"header-sections header-sections--expanded":"header-sections header-sections--collapsed"}>
      <div class="mb-sm header-top-row">
        <div>
          <div class="metric-group-label">CPU Cores${n?" (whole machine, all tools)":""}</div>
          <${Qp} perCore=${(s==null?void 0:s.cpu_per_core)||[]}/>
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
          ${yl.inventory.map(m=>{const $=s?s[m.field]??"":"",x=Os($,m.format,m.suffix,m.multiply);return m.field==="total_mcp_servers"?g`<${Xp} key=${m.field} label=${m.label} value=${x}
                mcpDetail=${(s==null?void 0:s.mcp_detail)||[]}/>`:g`<${co} key=${m.field} label=${m.label} value=${x}
              accent=${!!m.accent} dp=${m.dp} sm=${!0}/>`})}
        </div>
      </div>
      <div class="mb-sm"><${yr} snap=${s} mode="files"/></div>
    </div>
    <button class="header-toggle" onClick=${c} aria-label="Toggle details"
      aria-expanded=${a}>
      <span aria-hidden="true">${a?"▲":"▼"}</span> ${a?"less":"more"}
    </button>
  `}const $r={error:0,warn:1,info:2};function br(e,t){if(e==="claude-code")return`aictl hooks install --port ${t}`;const l=["copilot","gemini","codex"].find(n=>String(e).startsWith(n));return`aictl enable${l?" --tool "+l:""} --port ${t}`}function _r(e){return String(e||"").split("-")[0]}function nh(e,t,l=null){var a,r,c;if(!(e!=null&&e.tools))return[];const n=[],s=e.server_port,o=t?new Set([...t].map(_r)):null;for(const d of Object.values(e.tools))if(es(d.tool,l)){if(d.status==="missing"){if(o&&!o.has(_r(d.tool)))continue;const v=br(d.tool,s);n.push({id:"hooks:"+d.tool,level:"warn",title:`${d.tool}: hooks not installed`,detail:"No per-tool-call events, so the tool, skill and subagent panels stay empty.",fix:v})}else if(d.status==="disabled"){const v=((a=(d.sources||[]).find(p=>p.host_reason&&!p.host_enabled))==null?void 0:a.host_reason)||"The host tool has hooks turned off.";n.push({id:"hooks:"+d.tool,level:"warn",title:`${d.tool}: hooks disabled by host`,detail:v,fix:v.startsWith("chat.hookFilesLocations")?`Set ${v.replace(/ is false$/,"")} to true in VS Code settings`:null})}else if(d.status==="misconfigured"||d.status==="fail"){const v=(r=d.warnings)==null?void 0:r[0],p=((c=d.warnings)==null?void 0:c.length)>1?`, +${d.warnings.length-1} more`:"";n.push({id:"hooks:"+d.tool,level:"error",title:`${d.tool}: hooks misconfigured`,detail:v?`${v.message} (${v.path}${p})`:"Hook checks failed.",fix:br(d.tool,s)})}}return!jl(l)&&e.total_configured>0&&e.total_fired_24h===0&&n.length===0&&n.push({id:"hooks:silent",level:"warn",title:`${e.total_configured} hooks configured, 0 fired in 24 h`,detail:"Hooks are installed but no event has reached this dashboard.",fix:null}),n}function lh(e){const t=[];for(const l of(e==null?void 0:e.items)||[])l.status==="ok"||l.severity==="info"||l.status!=="source_missing"&&t.push({id:"quality:"+l.component,level:l.severity==="error"?"error":"warn",title:`${l.component}: ${l.status}`,detail:l.message+(l.source?` (${l.source})`:""),fix:null});return t}function sh({connected:e,snapAgeS:t,hooks:l,quality:n,otelActive:s,alerts:o=[],storage:a=null,hiddenContext:r,runningTools:c=null,enabledTools:d=null}){const v=[];(r==null?void 0:r.count)>0?v.push({id:"hidden-context",level:"warn",tab:"hidden",title:`${r.count} unseen context source${r.count===1?"":"s"} found`,detail:r.detail||"Text reaches a model without appearing in its visible configuration.",fix:null}):r===null&&v.push({id:"hidden-context",level:"info",tab:"hidden",title:"Hidden context not checked",detail:"No detector has reported for this build.",fix:null}),a!=null&&a.degraded?v.push({id:"storage",level:"error",title:"Storage degraded: capture is being reduced",detail:`${Ql(a)}. New data may lose text or be dropped until disk use is under budget.`,fix:null}):(a==null?void 0:a.pct)>=90&&v.push({id:"storage",level:"warn",title:`Storage at ${a.pct}% of budget`,detail:Ql(a),fix:null}),e===!1?v.push({id:"sse",level:"error",title:"Live stream disconnected",detail:"Figures show the last received values. Retrying automatically.",fix:"aictl daemon serve"}):t!=null&&t>60&&v.push({id:"stale",level:"warn",title:`Snapshot is ${Math.round(t)} s old`,detail:"The stream is connected but the collector stopped publishing.",fix:"aictl doctor"});for(const p of o)v.push({id:"alert:"+p.msg,level:p.level==="red"?"error":"warn",title:p.msg,detail:"The Processes tab lists the affected PIDs.",fix:null,tab:"procs"});return v.push(...nh(l,c,d),...lh(n)),s===!1&&v.push({id:"otel",level:"info",title:"OTel receiver has no data",detail:"Exact token and cost figures need it. Estimates are used until then.",fix:"aictl otel enable"}),v.sort((p,m)=>$r[p.level]-$r[m.level])}function To(e){var n;if(!e)return null;const t=e.storage_bytes??((n=e.db)==null?void 0:n.file_size_bytes)??null,l=e.storage_budget_bytes||null;return{mode:e.capture_mode||null,used:t,budget:l,pct:t!=null&&l?Math.round(t/l*100):null,degraded:!!e.storage_degraded}}function Ql(e){if(!e||e.used==null)return"Disk use not reported";const t=Kt(e.used);return e.budget?`${t} of ${Kt(e.budget)} (${e.pct}%)`:`${t}, no budget set`}function oh(e,t){return((e==null?void 0:e.sessions)||[]).filter(n=>n.tool&&es(n.tool,t)).sort((n,s)=>(s.cpu_percent||0)-(n.cpu_percent||0)||(s.last_seen_at||0)-(n.last_seen_at||0))}function ih(e){return/^[^:]+:\d+:\d+$/.test((e==null?void 0:e.session_id)||"")}function rh(e){const t=e.filter(ih).length,l=e.length-t,n=new Set(e.map(r=>r.tool)).size,s=`process tree${t===1?"":"s"}`,o=`session${l===1?"":"s"}`;return`${t&&l?`${l} ${o} and ${t} ${s}`:t?s:o} in ${n} tool${n===1?"":"s"}`}function ah(e){if(!(e.process_tree||[]).length)return e.mem_mb||0;let t=0;const l=n=>{for(const s of n||[])t+=s.mem_mb||0,l(s.children)};return l(e.process_tree),t}const Va="No price is known for this usage.";function uo(e,t=2){return"$"+Number(e).toLocaleString(void 0,{minimumFractionDigits:t,maximumFractionDigits:t})}function wr(e){return Number(e).toLocaleString(void 0,{maximumFractionDigits:2})}function Fa(e){return String(e||"").replace(/_/g," ").replace(/^ai\b/i,"AI")}function ch(e,t=2){const l=(e==null?void 0:e.cost_reason)||"";if(e!=null&&e.billing_unit&&e.billing_amount!==null&&e.billing_amount!==void 0){const n=[];return e.premium_requests&&n.push(wr(e.premium_requests)+" premium requests"),e.estimated_list_usd!==null&&e.estimated_list_usd!==void 0&&n.push("est. "+uo(e.estimated_list_usd,t)+" at list price"),{main:wr(e.billing_amount)+" "+Fa(e.billing_unit),sub:n.join(", "),title:l,kind:"billing"}}return(e==null?void 0:e.cost_usd)===null||(e==null?void 0:e.cost_usd)===void 0?{main:"n/a",sub:"",title:l||Va,kind:"none"}:{main:uo(e.cost_usd,t),sub:"est.",title:l||"Estimated from token counts and list prices. Not a billed amount.",kind:"estimate"}}function uh({row:e,digits:t=2,showSub:l=!0}){const n=ch(e,t);return g`<span class=${"cost-value cost-value--"+n.kind} title=${n.title}>${n.main}${l&&n.sub?g` <small class="cost-value__sub">${n.sub}</small>`:null}</span>`}function dh(e,t){const l=((e==null?void 0:e.tools)||[]).filter(c=>es(c.tool,t)).filter(c=>c.counted_in_totals!==!1),n=new Map;let s=0,o=null,a=0;const r=new Set;for(const c of l){if(c.billing_unit&&c.billing_amount!==null&&c.billing_amount!==void 0){n.set(c.billing_unit,(n.get(c.billing_unit)||0)+c.billing_amount),s+=c.premium_requests||0;continue}if(c.cost_usd===null||c.cost_usd===void 0){a+=1,c.cost_reason&&r.add(c.cost_reason);continue}o=(o||0)+c.cost_usd}return{rows:l.slice().sort((c,d)=>(d.total_tokens||0)-(c.total_tokens||0)),billed:[...n.entries()].map(([c,d])=>({unit:c,amount:d})),premium:s,listUsd:o,unpriced:a,unpricedReason:[...r].join(" "),tokens:l.reduce((c,d)=>c+(d.total_tokens||0),0),sessions:l.reduce((c,d)=>c+(d.sessions||0),0)}}function g0(e){var n;const t=(e||[]).filter(s=>s.cost_usd!==null&&s.cost_usd!==void 0);if(!t.length)return{cost_usd:null,cost_reason:(n=e==null?void 0:e.find(s=>s.cost_reason))==null?void 0:n.cost_reason};const l=e.length-t.length;return{cost_usd:t.reduce((s,o)=>s+o.cost_usd,0),cost_reason:l?`${l} of ${e.length} rows have no known price and are not included.`:""}}const Zl=Object.assign({"./HiddenContextPanel.js":()=>at(()=>import("./HiddenContextPanel-LKMYAvbk.js"),__vite__mapDeps([0,1,2,3]))})["./HiddenContextPanel.js"],kr=Zl?ct(Zl):null;async function fh(e=null){if(!Zl)return null;const t=await Zl();if(t.getHiddenContextSummary)return t.getHiddenContextSummary(e);try{return ph(Ic(await Nc(),e))}catch{return null}}function ph(e){if(!(e!=null&&e.counts))return null;const t=["high","medium","low"].filter(l=>e.counts[l]).map(l=>`${e.counts[l]} ${l}`);return{count:["high","medium","low"].reduce((l,n)=>l+(e.counts[n]||0),0),detail:t.length?`Findings by severity: ${t.join(", ")}.`:""}}function hh(){return kr?g`<${Ul} fallback=${g`<${an} status="loading" label="hidden context"/>`}>
    <${kr}/>
  </${Ul}>`:g`<section class="now-panel" data-slot="hidden-context" aria-label="Hidden context">
      <${an} status="empty" emptyTitle="Hidden context detection is not in this build"
        emptyHint="This view lists prompts and context sources that reach a model without appearing in its visible configuration. Rebuild the dashboard once the detector ships."/>
    </section>`}const xr=8;function mh({snap:e,enabledTools:t,onOpenSession:l,onShowAll:n}){const s=Ae(()=>oh(e,t),[e,t]);return g`<section class="now-panel now-panel--running" aria-labelledby="now-running">
    <header class="now-panel__head">
      <h2 id="now-running">Running now</h2>
      ${!Kn(e,t)&&g`<span class="now-panel__figure">${s.length}</span>
      <span class="now-panel__sub">${rh(s)}</span>`}
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
            ${s.slice(0,xr).map(o=>{const a=(o.exact_input_tokens||0)+(o.exact_output_tokens||0),r=ah(o);return g`<tr key=${o.session_id}>
                <td class="now-table__tool"><${ls} tool=${o.tool} size="1em"/> ${o.label||wl(o.tool,e)}</td>
                <td class="now-table__project">
                  <button type="button" class="now-link" title=${(o.project||"no project")+`
`+o.session_id}
                    onClick=${()=>l(o.session_id,o.tool)}>${Pr(o.project)||"no project"}</button>
                </td>
                <td class="num">${fo(o.duration_s||0)}</td>
                <td class="num">${$l(o.cpu_percent||0)}</td>
                <td class="num">${r?Kt(r*1048576):"-"}</td>
                <td class="num" title=${a?a.toLocaleString()+" exact tokens":"No exact token data for this session"}>${a?yt(a):"-"}</td>
              </tr>`})}
          </tbody>
        </table></div>
        ${s.length>xr&&g`<button type="button" class="now-link now-panel__more" onClick=${n}>
          Show all ${s.length} sessions</button>`}`}
  </section>`}function vh({onOpenBudget:e,cloudScope:t,enabledTools:l,snap:n}){const s=Un(()=>Vc({since:Date.now()/1e3-86400}),[],{pollMs:6e4}),o=Ae(()=>dh(s.data,l),[s.data,l]),a=Gp({...s,data:s.data?o.rows:null,isEmpty:c=>!c.length});if(t)return g`<section class="now-panel" aria-labelledby="now-cost">
      <header class="now-panel__head"><h2 id="now-cost">Cost, last 24 h</h2></header>
      <${an} status="empty" emptyTitle="Not available from this machine"
        emptyHint="The selected tool is billed and metered in the vendor's cloud, so no local token counts exist to estimate from."/>
    </section>`;const r=o.billed.length>0||o.listUsd!==null;return g`<section class="now-panel" aria-labelledby="now-cost">
    <header class="now-panel__head">
      <h2 id="now-cost">Cost, last 24 h</h2>
      ${s.data&&o.billed.map(c=>g`<span key=${c.unit} class="now-panel__figure">${c.amount.toLocaleString(void 0,{maximumFractionDigits:2})}<small class="now-panel__unit"> ${Fa(c.unit)}</small></span>`)}
      ${s.data&&o.listUsd!==null&&g`<span class="now-panel__figure" title=${Fc}>${uo(o.listUsd)}<small class="now-panel__unit"> est.</small></span>`}
      ${s.data&&!r&&o.rows.length>0&&g`<span class="now-panel__figure" title=${o.unpricedReason||Va}>n/a</span>`}
    </header>
    <${an} status=${a} error=${s.error} updatedAt=${s.updatedAt} onRetry=${s.reload}
      label="cost" emptyTitle=${l?"No recorded usage for the selected tools in the last 24 h":"No recorded usage in the last 24 h"}
      emptyHint="Usage comes from per-request telemetry. Turn on the OTel receiver if a tool is running but nothing shows."
      emptyFix="aictl otel enable">
      <div class="now-panel__sub">${yt(o.tokens)} tokens, ${o.sessions} sessions${o.listUsd!==null?". Dollar figures are list-price estimates, not billed amounts.":""}${o.unpriced?` ${o.unpriced} tool${o.unpriced===1?" has":"s have"} no known price.`:""}</div>
      <table class="now-table now-table--plain">
        <tbody>${o.rows.slice(0,5).map(c=>g`<tr key=${c.tool}>
          <td class="now-table__project" title=${(c.tokens_source||[]).length?"Tokens from "+c.tokens_source.join(", ")+(c.tokens_quality?" ("+c.tokens_quality+")":""):c.tokens_reason||""}><${ls} tool=${c.tool} size="1em"/> ${wl(c.tool,n)}</td>
          <td class="num">${yt(c.total_tokens||0)}</td>
          <td class="num"><${uh} row=${c}/></td>
        </tr>`)}</tbody>
      </table>
      <button type="button" class="now-link now-panel__more" onClick=${e}>Open budget</button>
    </${an}>
  </section>`}function gh({command:e}){const[t,l]=ee(!1);if(!e)return null;const n=e.startsWith("aictl ");return g`<div class="now-issue__fix">
    <code>${e}</code>
    ${n&&g`<button type="button" class="now-link" onClick=${()=>{var o;try{(o=navigator.clipboard)==null||o.writeText(e),l(!0),setTimeout(()=>l(!1),1500)}catch{}}}
      aria-label=${"Copy command: "+e}>${t?"Copied":"Copy"}</button>`}
  </div>`}function yh({selfStatus:e}){const t=To(e);return t?g`<div class=${"now-storage"+(t.degraded?" is-degraded":"")}>
    <span>Capture <strong>${t.mode||"not reported"}</strong></span>
    <span>Disk <strong>${Ql(t)}</strong></span>
    ${t.pct!=null&&g`<div class="now-storage__bar" role="meter" aria-label="Disk use against budget"
      aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.min(t.pct,100)}>
      <span class=${t.pct>=90?"is-high":""} style=${{width:Math.min(t.pct,100)+"%"}}></span>
    </div>`}
  </div>`:null}function $h({models:e}){const t=Object.values(e&&!e.error?e:{}).filter(n=>{var s;return n.value||((s=n.conflicts)==null?void 0:s.length)});if(!t.length)return null;const l=new Map;for(const n of t){const s=JSON.stringify([n.value,n.source,n.line,n.conflicts]);l.has(s)?l.get(s).labels.push(wl(n.tool)):l.set(s,{...n,labels:[wl(n.tool)]})}return g`<div class="now-models" data-testid="now-models">
    ${[...l.values()].map(n=>g`<div key=${n.tool} class="now-models__row">
      <span>${n.labels.join(", ")} model <strong>${n.value||"no pin"}</strong></span>
      ${n.source&&g`<span class="now-models__source" title=${n.why_in_effect}>
        ${n.line?`${n.source}:${n.line}`:n.source}${n.in_project?"":" (not in this project, still in effect)"}
      </span>`}
      ${(n.conflicts||[]).map(s=>g`<span key=${s.requested_at} class="now-models__conflict" data-testid="now-model-conflict">
        Conflict: ${s.requested.join(", ")} requested at ${s.requested_at}, ${s.pinned} is pinned
      </span>`)}
    </div>`)}
  </div>`}function bh({snap:e,enabledTools:t,connected:l,otelActive:n,alerts:s,selfStatus:o,onOpenTab:a}){const r=Un(()=>Hc(),[],{pollMs:6e4}),c=Un(()=>Bc(),[],{pollMs:6e4}),d=Un(()=>Dr(),[],{pollMs:6e4}),v=Un(()=>fh(t),[t],{pollMs:6e4}),p=e!=null&&e.timestamp?Date.now()/1e3-e.timestamp:null,m=Ae(()=>To(o),[o]),$=v.updatedAt?v.data:void 0,x=Ae(()=>new Set(((e==null?void 0:e.sessions)||[]).map(S=>S.tool)),[e]),R=Ae(()=>sh({connected:l,snapAgeS:p,hooks:c.data,quality:d.data,otelActive:n,alerts:s,storage:m,runningTools:x,hiddenContext:$,enabledTools:t}),[l,p,c.data,d.data,n,s,m,x,$,t]),k=R.filter(S=>S.level==="error").length,E=R.filter(S=>S.level==="warn").length,w=c.loading&&!c.data&&d.loading&&!d.data,A=w?"...":k+E;return g`<section class="now-panel now-panel--health" aria-labelledby="now-health">
    <header class="now-panel__head">
      <h2 id="now-health">Needs attention</h2>
      <span class=${"now-panel__figure"+(k?" is-error":E?" is-warn":" is-ok")}>${A}</span>
      <span class="now-panel__sub">${k} error${k===1?"":"s"}, ${E} warning${E===1?"":"s"}</span>
    </header>
    <${yh} selfStatus=${o}/>
    <${$h} models=${r.data}/>
    ${c.error&&!c.data&&g`<${an} status="error" error=${c.error}
      onRetry=${c.reload} label="hook status"/>`}
    ${R.length===0&&!w&&!c.error?g`<${an} status="empty" emptyTitle="All collectors and hooks are healthy"
          emptyHint="Hook delivery, data quality and the live stream all report OK."/>`:g`<ul class="now-issues">
          ${R.slice(0,7).map(S=>g`<li key=${S.id} class=${"now-issue now-issue--"+S.level}>
            <span class="now-issue__level">${S.level==="error"?"Error":S.level==="warn"?"Warn":"Info"}</span>
            <div class="now-issue__body">
              <div class="now-issue__title">${S.tab?g`<button type="button" class="now-link" onClick=${()=>a(S.tab)}>${S.title}</button>`:S.title}</div>
              <div class="now-issue__detail">${S.detail}</div>
              <${gh} command=${S.fix}/>
            </div>
          </li>`)}
          ${R.length>7&&g`<li class="now-panel__sub">${R.length-7} more in Monitoring health below.</li>`}
        </ul>`}
  </section>`}function _h({snap:e,enabledTools:t,connected:l,otelActive:n,alerts:s,selfStatus:o,onOpenSession:a,onOpenTab:r}){return g`<div class="now-grid">
    <${mh} snap=${e} enabledTools=${t}
      onOpenSession=${a} onShowAll=${()=>r("live")}/>
    <${vh} onOpenBudget=${()=>r("budget")} cloudScope=${Kn(e,t)} enabledTools=${t} snap=${e}/>
    <${bh} snap=${e} enabledTools=${t} connected=${l} otelActive=${n}
      alerts=${s} selfStatus=${o} onOpenTab=${r}/>
  </div>`}function wh({globalRange:e,onPreset:t,onApplyCustom:l}){const[n,s]=ee(!1),[o,a]=ee(""),r=Z(null),c=Z(null),d=ie(()=>{s(!0),a(""),requestAnimationFrame(()=>{if(!(!r.current||!c.current))if(e.until!=null)r.current.value=Il(e.since),c.current.value=Il(e.until);else{const p=xl.find(x=>x.id===e.id),m=Date.now()/1e3,$=(p==null?void 0:p.seconds)||86400;r.current.value=Il(m-$),c.current.value=Il(m)}})},[e]),v=ie(()=>{var x,R;const{since:p,until:m,error:$}=jc((x=r.current)==null?void 0:x.value,(R=c.current)==null?void 0:R.value);if($){a($);return}a(""),l(p,m),s(!1)},[l]);return g`<div class="global-range-bar">
    <div class="range-bar" role="group" aria-label="Time range">
      ${xl.map(p=>g`<button key=${p.id}
        class=${e.id===p.id&&!n?"range-btn active":"range-btn"}
        aria-pressed=${e.id===p.id&&!n?"true":"false"}
        onClick=${()=>{t(p.id),s(!1),a("")}}>${p.label}</button>`)}
      <button class=${n||e.id==="custom"?"range-btn active":"range-btn"}
        onClick=${d}>Custom</button>
    </div>
    ${n&&g`<div class="es-custom-range">
      <label><span class="range-label">From</span>
        <input type="datetime-local" class="es-date-input" ref=${r} /></label>
      <label><span class="range-label">To</span>
        <input type="datetime-local" class="es-date-input" ref=${c} /></label>
      <button class="range-btn active" onClick=${v} style="font-weight:600">Apply</button>
      <span class="error-state" aria-live="polite"
        style="padding:0 var(--sp-2);font-size:var(--fs-xs)">${o}</span>
    </div>`}
  </div>`}function kh(e,t){const l=e.filter(s=>ts.has(s.tool));if(t==null)return`All tools (${l.length})`;const n=l.filter(s=>t.includes(s.tool)).map(s=>s.label);return n.length===0?"No tools":n.length<=2?n.join(", "):`${n[0]} +${n.length-1}`}function xh({snap:e,enabledTools:t,onToggle:l,onSetAll:n}){if(!e)return null;const s=Rr(e.tools.filter(c=>!c.meta));if(!s.length)return null;const o=t===null,a=kh(s,t),r=g`<button type="button" class=${"hdr-btn tool-filter-trigger"+(o?"":" is-filtered")}
    aria-label=${"Tool filter: "+a}>
    <${Nt} name="filter" size="12"/> ${a}
  </button>`;return g`<${Kl} trigger=${r} placement="bottom">
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
  </${Kl}>`}const Sh=30;function Mh({timestamp:e}){const[,t]=ee(0);if(ae(()=>{const s=setInterval(()=>t(o=>o+1),5e3);return()=>clearInterval(s)},[]),!e)return null;const l=Math.max(0,Math.floor(Date.now()/1e3-e)),n=l>Sh;return g`<span class=${"conn "+(n?"stale":"ok")} role="status" aria-live="polite"
    title=${"Last data snapshot received "+l+"s ago"+(n?" — the refresh loop may be stalled":"")}>
    ● ${n?"stale "+l+"s":l+"s"}
    <span class="sr-only">${n?" — data is stale":" — data age"}</span>
  </span>`}function Eh({selfStatus:e}){const t=To(e);if(!t||t.used==null&&!t.mode)return null;const l=t.degraded?"err":t.pct>=90?"stale":"off";return g`<span class=${"conn hdr-desktop-only "+l} title=${"Disk: "+Ql(t)}>
    ${t.mode?"capture="+t.mode+" ":""}${t.used!=null?Kt(t.used):""}${t.budget?" / "+Kt(t.budget):""}
  </span>`}function Th({searchRef:e,searchQuery:t,onSearchChange:l,theme:n,cycleTheme:s,density:o,setDensity:a,otelActive:r,connected:c,selfStatus:d,globalRange:v,onPreset:p,onApplyCustom:m,snap:$,enabledTools:x,onToggleTool:R,onSetAllTools:k,views:E=[],matchingView:w=null,onApplyView:A,onDeleteView:S,onSaveView:_,onOpenPalette:M}){const[C,L]=ee(!1),[U,I]=ee(!1),[D,Y]=ee(""),F=ie(()=>{const z=D.trim();z&&(_&&_(z),Y(""),I(!1))},[D,_]),K=[{value:"compact",label:"Compact"},{value:"normal",label:"Normal"},{value:"spacious",label:"Spacious"}],W=g`<button class="hdr-btn" type="button"
    aria-label="Saved views" title="Saved views">
    Views${w?": "+w.name:""} ▾
  </button>`;return g`<header role="banner">
    <h1>aictl</h1>
    <div class="hdr-scope" role="group" aria-label="Scope for every panel">
      <${wh} globalRange=${v}
        onPreset=${p} onApplyCustom=${m}/>
      <${xh} snap=${$} enabledTools=${x}
        onToggle=${R} onSetAll=${k}/>
    </div>
    <div class="hdr-right">
      <!-- Mobile overflow toggle -->
      <button class="hdr-btn hdr-mobile-only" type="button" aria-label="Menu"
        aria-expanded=${C?"true":"false"}
        onClick=${()=>L(z=>!z)}>
        <${ed} size="16" aria-hidden="true"/>
      </button>

      <input type="text" ref=${e} class="search-box hdr-desktop-only"
        placeholder="Filter... ( / )" aria-label="Filter tools"
        value=${t} onInput=${z=>l(z.target.value)}/>

      <!-- Command palette trigger -->
      <button class="hdr-cmdk" type="button"
        onClick=${M}>
        <${Fu} size="14" aria-hidden="true"/>
        <span class="hdr-desktop-only">Commands</span>
        <${tt} class="hdr-desktop-only" aria-hidden="true">${Kr()}</${tt}>
        <span class="sr-only">open command palette</span>
      </button>

      <!-- Views dropdown -->
      <${Kl} trigger=${W} placement="bottom" class="hdr-desktop-only">
        <div class="hdr-views-menu" role="group" aria-label="Saved views">
          ${E.length===0?g`<div class="hdr-views-empty text-muted">No saved views</div>`:E.map(z=>g`<div key=${z.id} class="hdr-views-row">
                <button class="hdr-views-apply" type="button"
                  onClick=${()=>A&&A(z.id)}
                  aria-label=${"Apply view "+z.name}>${z.name}</button>
                <button class="hdr-views-del" type="button"
                  aria-label=${"Delete view "+z.name}
                  onClick=${()=>S&&S(z.id)}>
                  <${fd} size="12" aria-hidden="true"/>
                </button>
              </div>`)}
          <hr class="hdr-views-sep"/>
          <${on} variant="ghost" size="sm"
            onClick=${()=>I(!0)}>
            <${ad} size="12" aria-hidden="true"/> Save current view…
          </${on}>
        </div>
      </${Kl}>

      <!-- Theme toggle -->
      <button class="theme-btn" type="button" onClick=${s}
        aria-label=${"Toggle theme: "+n} title=${"Theme: "+n}>
        <${Nt} name=${n==="light"?"sun":n==="editorial"?"pen":"moon"} size="16"/>
      </button>

      ${r?g`<span class="conn ok" title="OTel receiver active">OTel</span>`:g`<span class="conn off" title="OTel receiver inactive — enable with: aictl otel enable">OTel off</span>`}
      <${Eh} selfStatus=${d}/>
      <${Mh} timestamp=${$==null?void 0:$.timestamp}/>
      <span class=${"conn "+(c?"ok":"err")} role="status" aria-live="polite">
        ${c?"live":"reconnecting..."}
        <span class="sr-only">${c?" — connected":" — connection lost, reconnecting"}</span>
      </span>
    </div>

    ${C&&g`<div class="hdr-mobile-overflow hdr-mobile-only">
      <input type="text" class="search-box" placeholder="Filter..."
        aria-label="Filter tools"
        value=${t} onInput=${z=>l(z.target.value)}/>
      <${Cd}
        ariaLabel="Density"
        value=${o}
        options=${K}
        onChange=${a}/>
    </div>`}

    ${U&&g`<${Jn} open=${!0}
      onClose=${()=>I(!1)} ariaLabel="Save view">
      <h3 style="margin-bottom:var(--sp-5)">Save current view</h3>
      <input type="text" class="search-box" style="width:100%"
        placeholder="View name" value=${D}
        onInput=${z=>Y(z.target.value)}
        onKeyDown=${z=>z.key==="Enter"&&F()}
        autoFocus=${!0}/>
      <div style="display:flex;gap:var(--sp-3);margin-top:var(--sp-6);justify-content:flex-end">
        <${on} variant="ghost" onClick=${()=>I(!1)}>Cancel</${on}>
        <${on} variant="primary" onClick=${F}>Save</${on}>
      </div>
    </${Jn}>`}
  </header>`}const Sr=[{id:"overview",label:"Dashboard",sub:"live event stream"},{id:"explorer",label:"Sessions",sub:"history & traces"},{id:"agents",label:"Agents",sub:"instrumentation"},{id:"prompts",label:"Prompts",sub:"library & workflows"}];function Ah(){const e=new Date,t=String(e.getMonth()+1).padStart(2,"0"),l=e.toLocaleDateString("en-CA");return`The aictl daily · vol. ${t} · ${l}`}function Ch({activeTab:e,setActiveTab:t}){const l=Xl(kl),n=l==null?void 0:l.snap,s=Ae(()=>{var c;let r=0;for(const d of(n==null?void 0:n.tools)||[])for(const v of((c=d.live)==null?void 0:c.sessions)||[])v.active!==!1&&r++;return r},[n]),o=Sr.find(r=>r.id===e),a=s>0?`Live · ${s} session${s!==1?"s":""}`:"Live";return g`<div class="cmasthead">
    <div class="cmasthead-top">
      <div class="cmasthead-identity">
        <div class="cmasthead-kicker">${Ah()}</div>
        <div class="cmasthead-headline">
          <span class="cmasthead-title">aictl</span>
          <span class="cmasthead-subtitle">a live record of every agent on this machine</span>
        </div>
      </div>
      <div class="cmasthead-live" role="status" aria-live="polite" aria-label="Live status">
        <span class="cmasthead-live-dot" aria-hidden="true"></span>
        ${a}
      </div>
    </div>
    <nav class="cmasthead-tabs" role="navigation" aria-label="Editorial tabs">
      ${Sr.map(r=>g`<button
        key=${r.id}
        type="button"
        class=${"cmasthead-tab"+(e===r.id?" is-active":"")}
        onClick=${()=>t(r.id)}
        aria-current=${e===r.id?"page":null}
      >${r.label}</button>`)}
      <span class="cmasthead-tabs-sub" aria-hidden="true">
        ${(o==null?void 0:o.sub)??""}
      </span>
    </nav>
  </div>`}function Lh({tabs:e,activeTab:t,setActiveTab:l}){const n=Z(null);return ae(()=>{var o,a;const s=(o=n.current)==null?void 0:o.querySelector('[aria-current="page"]');(a=s==null?void 0:s.scrollIntoView)==null||a.call(s,{block:"nearest",inline:"nearest"})},[t]),g`<nav class="tab-nav" ref=${n} aria-label="Dashboard sections">
    ${yl.navGroups.map(s=>g`<div key=${s.id} class="tab-group" role="group" aria-labelledby=${"nav-"+s.id}>
      <div class="tab-group__label" id=${"nav-"+s.id}>${s.label}</div>
      ${e.filter(o=>o.group===s.id).map(o=>g`<button key=${o.id} type="button" class="tab-btn"
        aria-current=${t===o.id?"page":null}
        aria-keyshortcuts=${o.key||null}
        onClick=${()=>l(o.id)}>
        <span class="tab-btn-icon"><${Nt} name=${o.iconName} size="14"/></span>
        <span class="tab-btn__label">${o.label}</span>
        ${o.key&&g`<kbd class="tab-btn__key" aria-hidden="true">${o.key}</kbd>`}
      </button>`)}
    </div>`)}
  </nav>`}function Dh(e,t){if(!t)return 1;const l=t.toLowerCase(),n=(e.label||"").toLowerCase(),s=(e.group||"").toLowerCase();if(n.startsWith(l))return 1e3-n.length;if(n.includes(l))return 500-n.indexOf(l);if(s.startsWith(l))return 300;if(s.includes(l))return 150;let o=0;for(const a of n)if(a===l[o]&&o++,o===l.length)break;return o===l.length?50:0}function Ph({commands:e=[],isOpen:t,onClose:l,lru:n=[],onRun:s}){const[o,a]=ee(""),[r,c]=ee(0),d=Z(null),v=Z(null);ae(()=>{t&&(a(""),c(0))},[t]),ae(()=>{t&&d.current&&d.current.focus()},[t]);const p=Ae(()=>{if(!o){const k=new Map(e.map(A=>[A.id,A])),E=n.map(A=>k.get(A)).filter(Boolean),w=e.filter(A=>!n.includes(A.id));return[...E,...w]}return e.map(k=>({c:k,s:Dh(k,o)})).filter(k=>k.s>0).sort((k,E)=>E.s-k.s).map(k=>k.c)},[e,o,n]);ae(()=>{c(0)},[o]);const m=ie(k=>{if(k){s&&s(k);try{k.action&&k.action()}catch(E){console.error("Command failed:",E)}l&&l()}},[s,l]),$=ie(k=>{k.key==="ArrowDown"?(k.preventDefault(),c(E=>Math.min(E+1,p.length-1))):k.key==="ArrowUp"?(k.preventDefault(),c(E=>Math.max(E-1,0))):k.key==="Enter"&&(k.preventDefault(),m(p[r]))},[p,r,m]);ae(()=>{if(!v.current)return;const k=v.current.querySelector(`[data-cmd-idx="${r}"]`);k&&k.scrollIntoView&&k.scrollIntoView({block:"nearest"})},[r]);const x=Ae(()=>{const k=[],E=new Map;return p.forEach(w=>{const A=w.group||"Commands";E.has(A)||(E.set(A,k.length),k.push({group:A,items:[]})),k[E.get(A)].items.push(w)}),k},[p]);let R=-1;return g`<${Jn} open=${t} onClose=${l} ariaLabel="Command palette" class="cmdk-dialog">
    <div class="cmdk">
      <div class="cmdk-input-row">
        <${Yr} size="16" aria-hidden="true"/>
        <input
          ref=${d}
          type="text"
          class="cmdk-input"
          placeholder="Type a command or search…"
          value=${o}
          onInput=${k=>a(k.target.value)}
          onKeyDown=${$}
          aria-label="Search commands"
          aria-controls="cmdk-list"
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-activedescendant=${p.length?"cmdk-opt-"+r:null}
        />
        <${tt}>Esc</${tt}>
      </div>
      <div id="cmdk-list" class="cmdk-list" role="listbox" ref=${v}>
        ${p.length===0?g`<${Jr} icon="search" title="No commands"
              description=${o?'No commands match "'+o+'"':"Start typing…"}/>`:x.map(k=>g`<div key=${k.group} class="cmdk-group" role="group" aria-label=${k.group}>
              <div class="cmdk-group-label" aria-hidden="true">${k.group}</div>
              ${k.items.map(E=>{R+=1;const w=R,A=w===r;return g`<button key=${E.id}
                  type="button"
                  id=${"cmdk-opt-"+w}
                  class=${"cmdk-item"+(A?" cmdk-item--active":"")}
                  role="option"
                  aria-selected=${A?"true":"false"}
                  data-cmd-idx=${w}
                  onMouseEnter=${()=>c(w)}
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
  </${Jn}>`}function Rh({target:e="#main-content",label:t="Skip to main content"}){return g`<a href=${e} class="skip-link">${t}</a>`}function qs(e,t){try{const l=localStorage.getItem("aictl-pref-"+e);return l!=null?JSON.parse(l):t}catch{return t}}const Oh={live:3600,"1h":3600,"6h":21600,"24h":86400,"7d":604800},zh={snap:null,history:null,connected:!1,activeTab:qs("active_tab","overview"),globalRange:(()=>{const e=qs("range","live"),t=Oh[e]||3600;return{id:e,since:Date.now()/1e3-t,until:null}})(),searchQuery:"",theme:(()=>{try{return localStorage.getItem("aictl-theme")||"auto"}catch{return"auto"}})(),viewerPath:null,events:[],enabledTools:qs("tool_filter",null)};function Ih(e,t){switch(t.type){case"SSE_UPDATE":{const l=t.payload,n=e.snap?Or(e.snap,l):e.snap,s=zr(e.history,l);return{...e,snap:n,history:s,connected:!0}}case"SNAP_REPLACE":return{...e,snap:t.payload};case"HISTORY_INIT":return{...e,history:t.payload};case"EVENTS_INIT":return{...e,events:t.payload};case"SET_CONNECTED":return{...e,connected:t.payload};case"SET_TAB":return{...e,activeTab:t.payload};case"SET_RANGE":return{...e,globalRange:t.payload};case"SET_SEARCH":return{...e,searchQuery:t.payload};case"SET_THEME":return{...e,theme:t.payload};case"SET_VIEWER":return{...e,viewerPath:t.payload};case"SET_TOOL_FILTER":return{...e,enabledTools:t.payload};default:return e}}const Nh=ct(()=>at(()=>import("./TabOverview-BwJfSHWS.js"),__vite__mapDeps([4,1,2]))),Vh=ct(()=>at(()=>import("./TabMemory-DvAq7B_o.js"),__vite__mapDeps([5,1,2]))),Fh=ct(()=>at(()=>import("./ContextMap-ClaVI-Y_.js"),__vite__mapDeps([6,1,2]))),Hh=ct(()=>at(()=>import("./TabLive-Darc_2kR.js"),__vite__mapDeps([7,1,2,8]))),Bh=ct(()=>at(()=>import("./TabEventsStats-BXUtfWYk.js"),__vite__mapDeps([9,1,2]))),jh=ct(()=>at(()=>import("./TabBudget-Ds5AVTKX.js"),__vite__mapDeps([10,1,2,8,11]))),Uh=ct(()=>at(()=>import("./TabAnalytics-BScNl5Xj.js"),__vite__mapDeps([12,1,2,13]))),Wh=ct(()=>at(()=>import("./TabExplorer-Bu-4sLvM.js"),__vite__mapDeps([14,1,2,3,11]))),qh=ct(()=>at(()=>import("./TabToolConfig-84oPMWrk.js"),__vite__mapDeps([15,1,2]))),Kh=ct(()=>at(()=>import("./TabProjectEnv-5SBlGSCZ.js"),__vite__mapDeps([16,1,2]))),Gh=ct(()=>at(()=>import("./CAgentsTab-2rdabHJS.js"),__vite__mapDeps([17,1,2]))),Yh=ct(()=>at(()=>import("./CDashboardTab-CLRyZOVG.js"),__vite__mapDeps([18,1,2]))),Jh=ct(()=>at(()=>import("./CPromptsTab-BWei8cGy.js"),__vite__mapDeps([19,1,2]))),Qh=ct(()=>at(()=>import("./CSessionsTab-C9I0goxa.js"),__vite__mapDeps([20,1,2]))),Zh=new Set(["live","procs","events","explorer","budget","analytics","memory"]),Xh=()=>g`<div class="tab-skeleton" role="status" aria-busy="true" aria-label="Loading view">
  <${Gn} height="120px" radius="var(--radius-sm)"/>
  <${Gn} height="200px" radius="var(--radius-sm)"/>
</div>`,ye=({tabName:e,children:t})=>g`<${Li} key=${e}><${Ul} fallback=${g`<${Xh}/>`}>${t}</${Ul}></${Li}>`;function e0(e,t){const l=Z({});ae(()=>{const n=t.current;if(!n)return;const s=l.current[e]||0;n.scrollTop=s;let o=!1;const a=s?[150,500,1200].map(d=>setTimeout(()=>{o||(n.scrollTop=s)},d)):[],r=()=>{o=!0},c=()=>{l.current[e]=n.scrollTop};return n.addEventListener("wheel",r,{passive:!0,once:!0}),n.addEventListener("touchstart",r,{passive:!0,once:!0}),n.addEventListener("scroll",c,{passive:!0}),()=>{a.forEach(clearTimeout),n.removeEventListener("wheel",r),n.removeEventListener("touchstart",r),n.removeEventListener("scroll",c)}},[e,t])}function t0(e,t){ae(()=>{const l=n=>{var s;n.key==="Escape"&&t(null),n.key==="/"&&!po(n.target)&&(n.preventDefault(),(s=e.current)==null||s.focus())};return document.addEventListener("keydown",l),()=>document.removeEventListener("keydown",l)},[e,t])}function n0(){const[e,t]=ee(!1);return ae(()=>{let l=!0;const n=()=>Cr().then(o=>{l&&t(o.active||!1)}).catch(()=>{l&&t(!1)});n();const s=setInterval(n,3e4);return()=>{l=!1,clearInterval(s)}},[]),e}function l0(e){const[t,l]=ee(null),[n,s]=ee([]);return ae(()=>{const{id:o,since:a,until:r}=e;o==="live"?l(null):o!=="custom"?Gs({range:o}).then(l).catch(()=>{}):Gs({since:a,until:r}).then(l).catch(()=>{}),qc({since:a,until:r}).then(s).catch(()=>{})},[e]),{dbHistory:t,events:n}}function s0(e){const t=Z(!1),l=Z(e);ae(()=>{if(e&&!t.current){t.current=!0,l.current=e;return}e!==l.current&&(e?(Zs.success("Reconnected"),ui("Connection restored")):t.current&&(Zs.error("Disconnected. Retrying…"),ui("Connection lost, retrying","assertive")),l.current=e)},[e])}function o0(e){var a;if(!e)return[];const t=[];let l=0,n=0,s=0,o=0;for(const r of e.tools||[])for(const c of r.processes||[]){const d=parseFloat(c.mem_mb)||0,v=(c.process_type||"").toLowerCase();(v==="subagent"||v==="agent")&&(l+=d),v==="mcp-server"&&c.zombie_risk&&c.zombie_risk!=="none"&&n++,(v==="browser"||(c.name||"").toLowerCase().includes("headless"))&&s++,(a=c.anomalies)!=null&&a.length&&(o+=c.anomalies.length)}return l>2048&&t.push({level:"red",msg:`Subagent memory: ${Kt(l*1048576)} (>2GB) — consider cleanup`}),n>0&&t.push({level:"orange",msg:`${n} MCP server(s) with dead parent — may be orphaned`}),s>0&&t.push({level:"yellow",msg:`${s} headless browser process(es) detected — check for leaks`}),o>5&&t.push({level:"orange",msg:`${o} process anomalies detected`}),t}function Hl(e,t){return Yc(e,t)}function Ha(e,t,l){if(!e)return e;let n=e.tools.filter(s=>ts.has(s.tool)||s.tool==="aictl");if(n=n.filter(s=>es(s.tool,t)),l){const s=l.toLowerCase();n=n.filter(o=>o.label.toLowerCase().includes(s)||o.tool.toLowerCase().includes(s)||o.vendor&&o.vendor.toLowerCase().includes(s)||(o.files||[]).some(a=>a.path.toLowerCase().includes(s))||(o.processes||[]).some(a=>(a.name||"").toLowerCase().includes(s)||(a.cmdline||"").toLowerCase().includes(s))||o.live&&((o.live.workspaces||[]).some(a=>a.toLowerCase().includes(s))||(o.live.sources||[]).some(a=>a.toLowerCase().includes(s))))}return{...e,tools:Rr(n),sessions:Hl(e.sessions,t),tool_telemetry:Hl(e.tool_telemetry,t),tool_configs:Array.isArray(e.tool_configs)?e.tool_configs.filter(s=>Gc(s,t)):e.tool_configs,mcp_detail:Hl(e.mcp_detail,t),events:Hl(e.events,t),agent_memory:Array.isArray(e.agent_memory)&&jl(t)?e.agent_memory.filter(s=>Kc(s,t)):e.agent_memory,filter_hidden_unlisted:jl(t)?dl(e.sessions)+dl(e.tool_telemetry)+dl(e.tool_configs)+dl(e.mcp_detail)+dl(e.events):0}}function Ao(e,t){try{document.dispatchEvent(new CustomEvent("aictl:select-session",{detail:{sessionId:e,tool:t}}))}catch{}}function i0({tabs:e,setActiveTab:t,setPreset:l,presets:n,allTools:s,toggleTool:o,setTheme:a,setDensity:r,views:c,applyView:d,snap:v,onShowShortcuts:p}){const m=[];e.forEach($=>m.push({id:"tab:"+$.id,group:"Jump to tab",label:$.label,shortcut:$.key,action:()=>t($.id)})),n.forEach($=>m.push({id:"range:"+$.id,group:"Range",label:"Set range: "+$.label,action:()=>l($.id)})),(s||[]).forEach($=>m.push({id:"filter:"+$,group:"Filter",label:"Toggle tool: "+$,action:()=>o($)}));for(const $ of((v==null?void 0:v.sessions)||[]).slice(0,40)){if(!$.session_id)continue;const x=Pr($.project)||"no project";m.push({id:"session:"+$.session_id,group:"Session",label:"Open session: "+x+" ("+($.label||$.tool)+")",action:()=>{t("explorer"),Ao($.session_id,$.tool)}})}return c.forEach($=>m.push({id:"view:"+$.id,group:"View",label:"Apply view: "+$.name,action:()=>d($.id)})),["auto","dark","light","editorial"].forEach($=>m.push({id:"theme:"+$,group:"Appearance",label:"Theme: "+$,action:()=>a($)})),["compact","normal","spacious"].forEach($=>m.push({id:"density:"+$,group:"Appearance",label:"Density: "+$,action:()=>r($)})),m.push({id:"help:shortcuts",group:"Shortcuts",label:"Keyboard shortcuts",action:()=>{p&&p()}}),m}function r0({open:e,onClose:t,tabs:l}){if(!e)return null;const n=[...l.map(s=>[s.label,s.key]),["Previous / next view","[ ]"],["Command palette",Kr()],["Focus filter","/"],["This list","?"],["Close panels","Esc"]];return g`<${Jn} open=${!0} onClose=${t} ariaLabel="Keyboard shortcuts">
    <h3 style="margin-bottom:var(--sp-5)">Keyboard shortcuts</h3>
    <ul style="list-style:none;margin:0;padding:0;min-width:220px">
      ${n.map(([s,o])=>g`<li key=${s}
        style="display:flex;justify-content:space-between;align-items:center;gap:var(--sp-6);padding:var(--sp-1) 0">
        <span>${s}</span><${tt}>${o}</${tt}>
      </li>`)}
    </ul>
  </${Jn}>`}function Ba({theme:e,snap:t,filteredSnap:l,enabledTools:n,effectiveHistory:s,activeTab:o,connected:a,otelActive:r,alerts:c,selfStatus:d,openSession:v,setActiveTab:p,setTheme:m}){return{overview:()=>e==="editorial"?g`<${ye} tabName="overview">
          <${Yh}/>
          <div class="mb-lg" style="margin-top:var(--sp-6)">
            <div class="c-overline" style="margin-bottom:var(--sp-3)">Monitoring</div>
            <${Ci}/>
          </div>
        </${ye}>`:g`<${ye} tabName="overview">
          <${_h} snap=${l} enabledTools=${n}
            connected=${a} otelActive=${r} alerts=${c} selfStatus=${d}
            onOpenSession=${v} onOpenTab=${p}/>
          ${!Kn(t,n)&&g`<${th} snap=${l} history=${s} enabledTools=${n}/>`}
          <div class="mb-lg"><${Ci}/></div>
        </${ye}>`,hidden:()=>g`<${ye} tabName="hidden"><${hh}/></${ye}>`,procs:()=>g`<${ye} tabName="procs"><div class="mb-lg"><${Nh}/></div></${ye}>`,memory:()=>g`<${ye} tabName="memory"><div class="mb-lg"><${Fh}/></div><div class="mb-lg"><${Vh}/></div></${ye}>`,live:()=>g`<${ye} tabName="live"><div class="mb-lg"><${Hh}/></div></${ye}>`,events:()=>g`<${ye} tabName="events"><div class="mb-lg"><${Bh} key=${"events-"+o}/></div></${ye}>`,budget:()=>g`<${ye} tabName="budget"><div class="mb-lg"><${jh} key=${"budget-"+o}/></div></${ye}>`,analytics:()=>g`<${ye} tabName="analytics"><div class="mb-lg"><${Uh} key=${"analytics-"+o}/></div></${ye}>`,explorer:()=>e==="editorial"?g`<${ye} tabName="explorer"><${Qh}
          onInspect=${($,x)=>{p("explorer"),Ao($,x),m("auto")}}
        /></${ye}>`:g`<${ye} tabName="explorer"><div class="mb-lg"><${Wh} key=${"explorer-"+o}/></div></${ye}>`,config:()=>g`<${ye} tabName="config">
      <div class="mb-lg"><${qh}/></div>
      <div class="mb-lg"><${Kh} snap=${t}/></div>
    </${ye}>`,agents:()=>g`<${ye} tabName="agents"><${Gh}
      onViewSessions=${()=>p("explorer")}
      onViewConfig=${()=>p("config")}/></${ye}>`,prompts:()=>g`<${ye} tabName="prompts"><${Jh}/></${ye}>`}}function a0(){var Xt;const{snapshot:e,history:t,connected:l}=iu(),{range:n,setPreset:s,setCustom:o,setRange:a}=uu(),{activeTab:r,setActiveTab:c,tabs:d}=du(),{theme:v,setTheme:p,cycleTheme:m}=Uc(),{density:$,setDensity:x}=pu(),R=Ae(()=>e?e.tools.filter(le=>le.tool!=="aictl"&&le.tool!=="any"&&ts.has(le.tool)).map(le=>le.tool):[],[e]),{selectedTools:k,toggleTool:E,setTools:w}=Wc(R),[A,S]=ee(""),[_,M]=ee(null),C=Z(null);t0(C,M),s0(l);const L=n0(),{data:U}=Un(()=>Lr(),[],{pollMs:6e4}),{dbHistory:I,events:D}=l0(n),Y=Ae(()=>({tab:r,range:n,tools:k,density:$,theme:v}),[r,n,k,$,v]),F=ie(le=>{le.tab&&c(le.tab),le.range&&a(le.range),le.tools!==void 0&&w(le.tools),le.density&&x(le.density),le.theme&&p(le.theme)},[c,a,w,x,p]),{views:K,saveView:W,deleteView:z,applyView:N,matchingView:Pe}=mu(Y,F),ue=yu(),[ce,de]=ee(!1),te=ie(()=>de(!0),[]);ae(()=>{const le=Be=>{Be.key==="?"&&!po(Be.target)&&de(Oe=>!Oe)};return document.addEventListener("keydown",le),()=>document.removeEventListener("keydown",le)},[]);const q=Z(null);e0(r,q);const Re=ie((le,Be)=>{c("explorer"),Ao(le,Be)},[c]),Ye=Ae(()=>i0({tabs:d,setActiveTab:c,setPreset:s,presets:xl,allTools:R,toggleTool:E,setTheme:p,setDensity:x,views:K,applyView:N,snap:e,onShowShortcuts:te}),[d,c,s,R,E,p,x,K,N,e,te]),_e=n.id==="live"?t:I||t,re=n.until?n.until-n.since:ns[n.id]||3600,ut=ie((le,Be={})=>{if(!le)return M(null);M({path:le,at:Be.at??null})},[]),Ce=Ae(()=>Ha(e,k,A),[e,k,A]),we=Ae(()=>{var Oe;const le=Date.now()/1e3-300,Be=new Map;for(const Xe of D)if(Xe.kind==="file_modified"&&Xe.ts>=le&&((Oe=Xe.detail)!=null&&Oe.path)){const wt=Be.get(Xe.detail.path);(!wt||Xe.ts>wt.ts)&&Be.set(Xe.detail.path,{ts:Xe.ts,growth:Xe.detail.growth_bytes||0,tool:Xe.tool})}return Be},[D]),_t=Ae(()=>({snap:Ce,history:t,openViewer:ut,recentFiles:we,globalRange:n,rangeSeconds:re,enabledTools:k}),[Ce,t,ut,we,n,re,k]),Ct=Ae(()=>o0(Ce),[Ce]),Ze=Z(null);Ze.current=Sd(Ze.current,_t,{activeTab:r});const Vt=Ze.current.value,Gt=Ba({theme:v,snap:e,filteredSnap:Ce,enabledTools:k,effectiveHistory:_e,activeTab:r,connected:l,otelActive:L,alerts:Ct,selfStatus:U,openSession:Re,setActiveTab:c,setTheme:p}),Yt=e!=null;return g`<${kl.Provider} value=${Vt}>
    <div class="main-wrap">
      <${Rh}/>
      <${Th}
        searchRef=${C} searchQuery=${A} onSearchChange=${S}
        theme=${v} cycleTheme=${m}
        density=${$} setDensity=${x}
        otelActive=${L} connected=${l} selfStatus=${U}
        globalRange=${n} onPreset=${s} onApplyCustom=${o}
        snap=${e} enabledTools=${k}
        onToggleTool=${E} onSetAllTools=${w}
        views=${K} matchingView=${Pe}
        onApplyView=${N} onDeleteView=${z} onSaveView=${W}
        onOpenPalette=${ue.open}
      />
      ${v==="editorial"&&g`<${Ch}
        activeTab=${r} setActiveTab=${c}
      />`}
      <div class="shell-body">
        <${Lh} tabs=${d} activeTab=${r} setActiveTab=${c}/>
        <main class="main" id="main-content" tabindex="0" ref=${q}>
          <div class="main-view" aria-label=${(Xt=d.find(le=>le.id===r))==null?void 0:Xt.label}>
            ${Yt&&g`<${Md} count=${(Ce==null?void 0:Ce.filter_hidden_unlisted)||0}/>`}
            ${Yt?Zh.has(r)&&Kn(e,k)?g`<${wd} tools=${k.map(le=>({tool:le,label:wl(le,e)}))}/>`:Gt[r]?Gt[r]():g`<p class="text-muted">Unknown tab "${r}"</p>`:g`<div class="tab-skeleton" role="status" aria-busy="true" aria-label="Loading dashboard">
                  <${Gn} height="120px" radius="var(--radius-sm)"/>
                  <${Gn} height="60px"  radius="var(--radius-sm)"/>
                  <${Gn} height="200px" radius="var(--radius-sm)"/>
                </div>`}
          </div>
        </main>
      </div>
    </div>
    <${Ed} path=${(_==null?void 0:_.path)??(typeof _=="string"?_:null)}
      at=${typeof _=="object"?_==null?void 0:_.at:null}
      onClose=${()=>M(null)}/>
    <${Ud}/>
    <${Ph} commands=${Ye}
      isOpen=${ue.isOpen} onClose=${ue.close}
      lru=${ue.lru} onRun=${le=>ue.recordUse(le.id)}/>
    <${r0} open=${ce}
      onClose=${()=>de(!1)} tabs=${d}/>
    <${Id}/>
  </${kl.Provider}>`}const y0=Object.freeze(Object.defineProperty({__proto__:null,default:a0,filterSnap:Ha,initialState:zh,reducer:Ih,tabRenderers:Ba},Symbol.toStringTag,{value:"Module"}));export{uh as C,Jn as D,Jr as E,Md as F,Nt as I,jp as M,an as P,kl as S,ls as T,Jp as a,Wp as b,wd as c,Gn as d,f0 as e,d0 as f,ch as g,Ys as h,v0 as i,h0 as j,Zs as k,y0 as l,Gp as p,m0 as r,g0 as s,p0 as t,Un as u};

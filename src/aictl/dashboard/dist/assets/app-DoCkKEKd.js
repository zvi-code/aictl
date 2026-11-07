const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/HiddenContextPanel-DUW8HEmA.js","assets/index-0APVtqay.js","assets/useSse-Dcx1BuKe.js","assets/ToolScopeEmpty-CzCb5Yvm.js","assets/Icon-1my9WQDm.js","assets/ToolScopeEmpty-DDlv-zed.css","assets/useAsyncResource-Dd9so-AJ.js","assets/platform-F0jTv3XI.js","assets/TextView-DKtsDjbG.js","assets/TextView-DfSPGgUz.css","assets/TabOverview-BO71XZg0.js","assets/TabMemory-MSV7Vmvj.js","assets/ContextMap-69nz0pIV.js","assets/TabLive-CfQ1hEN9.js","assets/DataTable-PCQcMsZF.js","assets/TabEventsStats-O2U2sBTz.js","assets/TabBudget-C27aKk05.js","assets/models-DHnW0Za4.js","assets/TabAnalytics-BJHrXZvL.js","assets/echarts-BbyLWlSf.js","assets/TabExplorer-BXViSjun.js","assets/TextNotRetained-C8E2A0cj.js","assets/TabToolConfig-BwxL1VuB.js","assets/SettingsWorkspace-0daHgUuG.js","assets/model-CTjycHkR.js","assets/SettingsWorkspace-D6fVV7D6.css","assets/TabProjectEnv-DjsNgFIM.js","assets/CAgentsTab-5R3ib280.js","assets/CDashboardTab-D1EaUTEs.js","assets/CPromptsTab-DhVI1HsT.js","assets/CSessionsTab-D8WXYUdr.js"])))=>i.map(i=>d[i]);
import{R as sc,d as X,A as Z,q as re,y as ie,w as oc,r as ic,a as rc,T as Me,m as g,x as io,g as ac,c as cc,k as ti,L as Fl,b as rt}from"./index-0APVtqay.js";import{T as uc,S as dc,u as fc,i as gr}from"./ToolScopeEmpty-CzCb5Yvm.js";import{o as Us,a as pc,q as mc,c as hc,r as vc,v as gc,P as zn,w as jt,x as gt,y as Wn,C as fl,j as $r,z as br,A as _r,B as $c,D as vl,E as ro,F as Pl,G as bc,H as _c,I as yc,J as ni,K as Ls,L as li,M as Hl,S as wc,O as kc,Q as ql,R as Bl,T as at,s as Sc,k as xc,U as jn,V as bl,W as yr,X as Ec,Y as Tc,i as Mc,h as Cc,t as Ol,p as Ac,Z as wr,_ as Jl,e as Lc,u as Dc,$ as si,a0 as Pc,a1 as cl,a2 as Oc,a3 as Rc,a4 as Ic}from"./useSse-Dcx1BuKe.js";import{c as kr}from"./platform-F0jTv3XI.js";import{c as Ql,I as Qt,S as Nc}from"./Icon-1my9WQDm.js";import{TextView as Vc}from"./TextView-DKtsDjbG.js";const _l=sc(null),oi=200,ii=80;function Fc(e){const t=e==null?void 0:e.memory_rss_bytes;return typeof t=="number"&&isFinite(t)?t/1048576:null}const zc=["ts","files","tokens","cpu","mem_mb","mcp","mem_tokens","live_sessions","live_tokens","live_in_rate","live_out_rate"];function Hc(e,t){const l=Array.isArray(e)?e.slice():[],n=new Map(l.map((o,r)=>[o.session_id,r]));for(const o of t.upsert||[])n.has(o.session_id)?l[n.get(o.session_id)]=o:(n.set(o.session_id,l.length),l.push(o));for(const o of t.patch||[])n.has(o.session_id)&&(l[n.get(o.session_id)]={...l[n.get(o.session_id)],...o});const s=new Set(t.remove||[]);return s.size?l.filter(o=>!s.has(o.session_id)):l}function Bc(e,t){return Array.isArray(e==null?void 0:e.tools)?{...e,tools:e.tools.map(l=>"live"in l?(t[l.tool]=l.live,l):l.tool in t?{...l,live:t[l.tool]}:l)}:e}function Sr(e,t){if(!e)return t;const{sessions_delta:l,tools_rev:n,...s}=t,o=Object.fromEntries((t.tools||[]).map(a=>[a.tool,a])),r={...e,...s,tools:e.tools.map(a=>{const c=o[a.tool];return c?{...a,live:c.live,vendor:c.vendor||a.vendor,host:c.host||a.host}:a})};return l&&(r.sessions=Hc(e.sessions,l)),r}function xr(e,t){var n,s,o;if(!e)return e;if(e.ts.push(t.timestamp),e.files.push(t.total_files),e.tokens.push(t.total_tokens),e.cpu.push(Math.round(t.total_cpu*10)/10),e.mem_mb.push(Math.round(t.total_mem_mb*10)/10),e.mcp.push(t.total_mcp_servers),e.mem_tokens.push(t.total_memory_tokens),e.live_sessions.push(t.total_live_sessions),e.live_tokens.push(t.total_live_estimated_tokens),e.live_in_rate.push(Math.round((t.total_live_inbound_rate_bps||0)*100)/100),e.live_out_rate.push(Math.round((t.total_live_outbound_rate_bps||0)*100)/100),e.ts.length>oi)for(const r of zc)e[r]=e[r].slice(-oi);const l=e.by_tool||{};for(const r of t.tools||[]){if(r.tool==="aictl")continue;const a=((n=r.live)==null?void 0:n.cpu_percent)||0,c=Fc(r.live)||0,d=r.tokens||0,v=(((s=r.live)==null?void 0:s.outbound_rate_bps)||0)+(((o=r.live)==null?void 0:o.inbound_rate_bps)||0);l[r.tool]||(l[r.tool]={ts:[],cpu:[],mem_mb:[],tokens:[],traffic:[]});const p=l[r.tool];if(p.ts.push(t.timestamp),p.cpu.push(Math.round(a*10)/10),p.mem_mb.push(Math.round(c*10)/10),p.tokens.push(d),p.traffic.push(Math.round(v*100)/100),p.ts.length>ii)for(const h of Object.keys(p))p[h]=p[h].slice(-ii)}return{...e,by_tool:l}}const Uc=15,Wc=5;function Er(e){return(e==null?void 0:e.session_id)??(e==null?void 0:e.id)??null}const ri=/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;function jc(e){return Array.isArray(e==null?void 0:e.alt_session_ids)?e.alt_session_ids:[]}function Ws(e){const t=[];for(const l of[Er(e),...jc(e)])l!=null&&l!==""&&!t.includes(l)&&t.push(l);return t}function lm(e,t){if(t!=null)return(e||[]).find(l=>Ws(l).includes(t))}function ai(e){return Math.max((e==null?void 0:e.ended_at)||0,(e==null?void 0:e.started_at)||0,(e==null?void 0:e.last_activity)||0)}function ci(e){return e!=null&&e.duration_s?e.duration_s:e!=null&&e.ended_at&&(e!=null&&e.started_at)?e.ended_at-e.started_at:null}function ui(e,t){const[l,n]=ai(t)>ai(e)?[t,e]:[e,t],s={...l};for(const r of["input_tokens","output_tokens","exact_input_tokens","exact_output_tokens","files_modified"]){const a=(n==null?void 0:n[r])||0;a>(s[r]||0)&&(s[r]=a)}for(const r of Object.keys(n||{}))s[r]==null&&n[r]!=null&&(s[r]=n[r]);const o=[];for(const r of[...Ws(l),...Ws(n)])o.includes(r)||o.push(r);if(o.length>1){const r=ri.test(String(o[0]))?o[0]:o.find(a=>ri.test(String(a)))??o[0];s.session_id=r,s.id!=null&&(s.id=r),s.alt_session_ids=o.filter(a=>a!==r)}return s}function Gc(e,t){if(!(e!=null&&e.tool)||e.tool!==(t==null?void 0:t.tool)||e.started_at==null||t.started_at==null||Math.abs(e.started_at-t.started_at)>Uc)return!1;const l=ci(e),n=ci(t);return l==null&&n==null?!0:l==null||n==null?!1:Math.abs(l-n)<=Wc}function sm(e){if(!Array.isArray(e))return[];if(e.length<2)return e.slice();const t=new Map,l=[];for(const s of e){if(!s)continue;const o=Er(s);if(o!=null&&t.has(o)){const r=t.get(o);l[r]=ui(l[r],s)}else o!=null&&t.set(o,l.length),l.push(s)}const n=[];for(const s of l){const o=n.findIndex(r=>Gc(r,s));o>=0?n[o]=ui(n[o],s):n.push(s)}return n}const ot=e=>Number(e)||0;function Kc(e){const t=((e==null?void 0:e.tools)||[]).filter(a=>a.tool!=="aictl"),l=a=>Array.isArray(a.files)?a.files:[],n=a=>t.reduce((c,d)=>c+a(d),0),s=a=>a.live||{},o=(e==null?void 0:e.agent_memory)||[],r=a=>{var c,d;return ot((c=s(a).token_estimate)==null?void 0:c.input_tokens)+ot((d=s(a).token_estimate)==null?void 0:d.output_tokens)};return{total_files:n(a=>Array.isArray(a.files)?a.files.length:ot(a.files_count)),total_tokens:n(a=>l(a).reduce((c,d)=>c+ot(d.tokens),0)),total_size:n(a=>l(a).reduce((c,d)=>c+ot(d.size),0)),total_processes:n(a=>Math.max(Array.isArray(a.processes)?a.processes.length:ot(a.processes_count),ot(s(a).pid_count))),total_cpu:Math.round(n(a=>s(a).cpu_percent?ot(s(a).cpu_percent):(a.processes||[]).reduce((c,d)=>c+ot(d.cpu_pct),0))*10)/10,total_mem_mb:Math.round(n(a=>(a.processes||[]).reduce((c,d)=>c+ot(d.mem_mb),0))*10)/10,total_mcp_servers:((e==null?void 0:e.mcp_detail)||[]).length,total_memory_tokens:o.reduce((a,c)=>a+ot(c.tokens),0),total_live_sessions:n(a=>ot(s(a).session_count)),total_live_estimated_tokens:n(r),total_live_outbound_rate_bps:Math.round(n(a=>ot(s(a).outbound_rate_bps))*100)/100,total_live_inbound_rate_bps:Math.round(n(a=>ot(s(a).inbound_rate_bps))*100)/100}}function Yc(e,t){if(!e||!Array.isArray(t))return e;const l=e.by_tool||{},n=t.filter(r=>{var a,c;return(c=(a=l[r])==null?void 0:a.ts)==null?void 0:c.length}),s=[...new Set(n.flatMap(r=>l[r].ts))].sort((r,a)=>r-a),o=r=>s.map(a=>n.reduce((c,d)=>{var p;const v=l[d].ts.indexOf(a);return c+(v>=0?ot((p=l[d][r])==null?void 0:p[v]):0)},0));return{ts:s,cpu:o("cpu"),mem_mb:o("mem_mb"),tokens:o("tokens"),by_tool:l}}const qc=720;function Jc(e={}){const{EventSourceClass:t,refreshMs:l=3e4,applyMs:n=1e3,stallMs:s=6e4,minRefetchGapMs:o=3e4,maxQueued:r=qc}=e,[a,c]=X(null),[d,v]=X(null),[p,h]=X(null),b=Z(!1),S=Z(null),D=Z(!1),w=Z(0),T=Z(Date.now()),k=Z(()=>{}),A=Z(null),x=Z({}),y=Z(!1),E=re(()=>b.current?Promise.resolve():(b.current=!0,w.current=Date.now(),mc().then(V=>{S.current=(V==null?void 0:V.tools_rev)||null,D.current=!0,c(V),h(Date.now()),k.current()}).catch(()=>{}).finally(()=>{b.current=!1})),[]),P=re(()=>{if(A.current||b.current)return;const V=Math.max(0,o-(Date.now()-w.current));A.current=setTimeout(()=>{A.current=null,E()},V)},[E,o]);ie(()=>{E(),Us().then(v).catch(()=>{})},[E]);const O=Z([]),q=Z(0),R=Z(null),M=re(()=>{R.current&&(clearTimeout(R.current),R.current=null);const V=O.current;!V.length||!D.current||(O.current=[],q.current=Date.now(),c(F=>F&&V.reduce((De,ce)=>Sr(De,ce),F)),v(F=>V.reduce(xr,F)),h(Date.now()))},[]);k.current=M;const j=re(V=>{T.current=Date.now();const F=Bc(V,x.current);if(O.current.push(F),O.current.length>r&&(O.current.shift(),y.current=!0),typeof document<"u"&&document.hidden)return;F.tools_rev&&S.current&&F.tools_rev!==S.current&&P();const De=n-(Date.now()-q.current);De<=0?M():R.current||(R.current=setTimeout(M,De))},[n,M,P,r]);ie(()=>{const V=()=>{document.hidden||(y.current&&(y.current=!1,E()),M())};return document.addEventListener("visibilitychange",V),()=>{document.removeEventListener("visibilitychange",V),R.current&&clearTimeout(R.current),A.current&&clearTimeout(A.current)}},[M,E]);const{connected:N}=pc(hc(),j,t?{EventSourceClass:t}:{}),G=Z(N);G.current=N;const B=Z(!1);return ie(()=>{N&&(B.current&&E(),B.current=!0)},[N,E]),ie(()=>{if(!l)return;const V=setInterval(()=>{if(document.hidden)return;(!D.current||!G.current||Date.now()-T.current>s)&&E()},l);return()=>clearInterval(V)},[E,l,s]),{snapshot:a,history:d,connected:N,lastUpdateAt:p,refresh:E,setHistory:v}}function Un(e,t=[],{pollMs:l=0}={}){const[n,s]=X({data:null,error:null,loading:!0,updatedAt:null}),o=Z(e);o.current=e;const r=Z(0),a=re(()=>{const c=++r.current;return s(d=>({...d,loading:!0})),Promise.resolve().then(()=>o.current()).then(d=>{c===r.current&&s({data:d,error:null,loading:!1,updatedAt:Date.now()})}).catch(d=>{c===r.current&&s(v=>({...v,error:d,loading:!1}))})},[]);return ie(()=>{if(a(),!l)return()=>{r.current++};const c=setInterval(()=>{document.hidden||a()},l);return()=>{clearInterval(c),r.current++}},[a,l,...t]),{...n,reload:a}}const yl=[{id:"live",label:"Live",seconds:3600},{id:"1h",label:"1h",seconds:3600},{id:"6h",label:"6h",seconds:21600},{id:"24h",label:"24h",seconds:86400},{id:"7d",label:"7d",seconds:604800}],Zl=Object.fromEntries(yl.map(e=>[e.id,e.seconds])),Tr="aictl-pref-range";function Qc(){try{const e=localStorage.getItem(Tr),t=e!=null?JSON.parse(e):"live";return Zl[t]?t:"live"}catch{return"live"}}function Zc(e){try{localStorage.setItem(Tr,JSON.stringify(e))}catch{}}function js(e){const t=Zl[e]||3600;return{id:e,since:Date.now()/1e3-t,until:null}}function Xc(){const e=rc().range;return(e==null?void 0:e.id)==="custom"?e:e&&Zl[e.id]?js(e.id):js(Qc())}function eu(){const[e,t]=X(Xc);ie(()=>{oc(ic(e))},[e]);const l=re(o=>{t(js(o)),Zc(o)},[]),n=re((o,r)=>{t({id:"custom",since:o,until:r})},[]),s=re(o=>{typeof o=="string"?l(o):o&&typeof o=="object"&&t(o)},[l]);return{range:e,setRange:s,setPreset:l,setCustom:n,presets:yl}}const Mr=["compact","normal","spacious"],Cr="aictl-density",Ar=new Set(Mr);function tu(){try{const e=localStorage.getItem(Cr);return Ar.has(e)?e:"normal"}catch{return"normal"}}function nu(){const[e,t]=X(tu);ie(()=>{document.documentElement.setAttribute("data-density",e);try{localStorage.setItem(Cr,e)}catch{}},[e]);const l=re(n=>{Ar.has(n)&&t(n)},[]);return{density:e,setDensity:l,densities:Mr}}const Lr="aictl-views-v1";function di(){try{const e=localStorage.getItem(Lr),t=e?JSON.parse(e):[];return Array.isArray(t)?t:[]}catch{return[]}}function fi(e){try{localStorage.setItem(Lr,JSON.stringify(e))}catch{}}function pi(e){try{const t=JSON.stringify({tab:e.tab,range:e.range,tools:Array.isArray(e.tools)?[...e.tools].sort():e.tools,density:e.density,theme:e.theme});let l=5381;for(let n=0;n<t.length;n++)l=(l<<5)+l+t.charCodeAt(n)|0;return String(l)}catch{return""}}function lu(){return"v_"+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4)}function su(e,t){const[l,n]=X(di);ie(()=>{if(!(typeof window>"u"))try{const v=new URLSearchParams(window.location.search).get("view");if(!v)return;const p=di().find(h=>h.id===v);p&&t&&t(p)}catch{}},[]);const s=re(d=>{const v=(d||"").trim();if(!v)return null;const p={id:lu(),name:v,tab:e.tab,range:e.range,tools:e.tools,density:e.density,theme:e.theme,createdAt:Date.now()};return n(h=>{const b=[...h,p];return fi(b),b}),p},[e]),o=re(d=>{n(v=>{const p=v.filter(h=>h.id!==d);return fi(p),p})},[]),r=re(d=>{const v=l.find(p=>p.id===d);if(!v)return!1;t&&t(v);try{const p=new URL(window.location.href);p.searchParams.set("view",d),window.history.replaceState({},"",p.toString())}catch{}return!0},[l,t]),a=Me(()=>pi(e),[e]),c=Me(()=>l.find(d=>pi({tab:d.tab,range:d.range,tools:d.tools,density:d.density,theme:d.theme})===a)||null,[l,a]);return{views:l,saveView:s,deleteView:o,applyView:r,currentHash:a,matchingView:c}}const Dr="aictl-cmdpalette-lru-v1",Pr=5;function ou(){try{const e=localStorage.getItem(Dr),t=e?JSON.parse(e):[];return Array.isArray(t)?t.slice(0,Pr):[]}catch{return[]}}function iu(e){try{localStorage.setItem(Dr,JSON.stringify(e))}catch{}}function ru(){const[e,t]=X(!1),[l,n]=X(ou),s=re(()=>t(!0),[]),o=re(()=>t(!1),[]),r=re(()=>t(c=>!c),[]),a=re(c=>{c&&n(d=>{const v=[c,...d.filter(p=>p!==c)].slice(0,Pr);return iu(v),v})},[]);return ie(()=>{const c=d=>{(d.metaKey||d.ctrlKey)&&(d.key==="k"||d.key==="K")&&(d.preventDefault(),t(p=>!p))};return document.addEventListener("keydown",c),()=>document.removeEventListener("keydown",c)},[]),{isOpen:e,open:s,close:o,toggle:r,lru:l,recordUse:a}}let wl=null,Or=null;if(typeof document<"u"){document.addEventListener("aictl:select-session",t=>{var l;wl=(l=t==null?void 0:t.detail)!=null&&l.sessionId?t.detail:null});const e=new URLSearchParams(window.location.search).get("session");e&&(wl={sessionId:e,tool:null})}function om(){const e=wl||Or;return wl=null,e}function im(){wl=null}function rm(e,t){Or=e?{sessionId:e,tool:t||null}:null}/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const au=Ql("command",[["path",{d:"M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3",key:"11bfej"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cu=Ql("menu",[["path",{d:"M4 5h16",key:"1tepv9"}],["path",{d:"M4 12h16",key:"1lakjw"}],["path",{d:"M4 19h16",key:"1djgab"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uu=Ql("save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const du=Ql("trash-2",[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]]);function fu({tool:e,tools:t}){const l=(t||[e]).filter(Boolean).map(n=>n.label||n.tool).join(", ");return g`<div class="panel-state panel-state--withheld" role="status">
    <${Qt} name="radio" size="14"/>
    <div>
      <div class="panel-state__title">Not available from this machine</div>
      <div class="panel-state__hint">${l} runs in the vendor's cloud, so it leaves no local sessions, processes, tokens or files for aictl to read. Its activity is visible only in the vendor's admin reports.</div>
    </div>
  </div>`}const pu=new Set(["overview","live","procs","events","explorer"]),mu=3e4;function hu(e,t,{activeTab:l,now:n=Date.now()}){var a;const s={value:t,at:n,tab:l};return!e||pu.has(l)||e.tab!==l||!!!((a=e.value)!=null&&a.snap)&&t.snap||!(e.value.enabledTools===t.enabledTools&&e.value.globalRange===t.globalRange&&e.value.openViewer===t.openViewer&&e.value.recentFiles===t.recentFiles)||n-e.at>=mu?s:e}function vu({count:e}){return e?g`<div class="panel-state panel-state--note" role="note" data-testid="filter-hidden-note">
    <${Qt} name="filter" size="12"/>
    <span>${e} row${e===1?"":"s"} from unattributed or unverified tools ${e===1?"is":"are"} hidden while the tool filter is on. Choose All tools to see ${e===1?"it":"them"}.</span>
  </div>`:null}function gu({path:e,at:t,line:l,onClose:n}){const{snap:s}=io(_l),[o,r]=X(null),[a,c]=X(!1),[d,v]=X(null),p=Z(null),h=l>0?Math.floor(l):0,b=Z(null),[S,D]=X(()=>{try{return parseInt(localStorage.getItem("aictl-viewer-width"))||55}catch{return 55}}),w=Z(!1),T=Z(0),k=Z(0),A=re(R=>{w.current=!0,T.current=R.clientX,k.current=S,R.preventDefault()},[S]);if(ie(()=>{const R=j=>{if(!w.current)return;const N=T.current-j.clientX,G=window.innerWidth,B=Math.min(90,Math.max(20,k.current+N/G*100));D(B)},M=()=>{if(w.current){w.current=!1;try{localStorage.setItem("aictl-viewer-width",String(Math.round(S)))}catch{}}};return window.addEventListener("mousemove",R),window.addEventListener("mouseup",M),()=>{window.removeEventListener("mousemove",R),window.removeEventListener("mouseup",M)}},[S]),ie(()=>{if(!e)return;b.current=document.activeElement;const R=setTimeout(()=>{var N;const j=(N=p.current)==null?void 0:N.querySelector("button");j&&j.focus()},50),M=j=>{if(j.key!=="Tab"||!p.current)return;const N=p.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');if(!N.length)return;const G=N[0],B=N[N.length-1];j.shiftKey&&document.activeElement===G?(j.preventDefault(),B.focus()):!j.shiftKey&&document.activeElement===B&&(j.preventDefault(),G.focus())};return document.addEventListener("keydown",M),()=>{clearTimeout(R),document.removeEventListener("keydown",M),b.current&&b.current.focus&&b.current.focus()}},[e]),ie(()=>{if(!e)return;v(null),r(null),(t?vc(e,t):gc(e)).then(r).catch(M=>v(M.message))},[e,t]),ie(()=>{e&&c(!!h)},[e,t,h]),ie(()=>{var M;if(!e||!h||o===null)return;const R=(M=p.current)==null?void 0:M.querySelector(".fv-line--hit");R&&R.scrollIntoView&&R.scrollIntoView({block:"center"})},[e,h,o,a]),!e)return null;const x=Me(()=>{if(!s)return"";for(const R of s.tools)for(const M of R.files)if(M.path===e)return(M.kind||"")+" | "+jt(M.size)+" | ~"+gt(M.tokens)+"tok | scope:"+(M.scope||"?")+" | sent_to_llm:"+(M.sent_to_llm||"?")+" | loaded:"+(M.loaded_when||"?");for(const R of s.agent_memory)if(R.file===e)return R.source+" | "+R.profile+" | "+R.tokens+"tok | "+R.lines+"ln";return""},[s,e]),y=o?o.split(`
`):[],E=y.length,P=E>zn*2,O=(R,M)=>R.map((j,N)=>g`<div class=${"fv-line"+(M+N===h?" fv-line--hit":"")}><span class="fv-ln">${M+N}</span><span class="fv-code">${Wn(j)||" "}</span></div>`),q=!P||a?g`<div class="fv-lines">${O(y,1)}</div>`:g`<div class="fv-lines">${O(y.slice(0,zn),1)}</div>
      <div class="fv-ellipsis" onClick=${()=>c(!0)}>\u25BC ${E-zn*2} more lines \u25BC</div>
      <div class="fv-lines">${O(y.slice(-zn),E-zn+1)}</div>`;return g`<div class="fv" ref=${p} role="dialog" aria-modal="true" aria-label="File viewer" style=${"width:"+S+"vw"}>
    <div class="file-viewer__resize-handle" onMouseDown=${A}/>
    <div class="fv-head">
      <span class="path">${e}${h?g`<span class="fv-at">:${h}</span>`:""}</span>
      ${t&&g`<span class="badge text-xs mono" style="background:var(--bg2);color:var(--fg2);margin-left:var(--sp-2)"
        title=${"Historical content at unix ts "+t}>@ ${new Date(t*1e3).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>`}
      <button onClick=${n} aria-label="Close file viewer">Close (Esc)</button>
    </div>
    <div class="fv-meta">${x}</div>
    <div class="fv-body">
      ${d?g`<p class="text-red" style="padding:var(--sp-10)">${d}</p>`:o?g`<${Vc} key=${h?"at-line":"whole"} text=${o} path=${e} source=${q} prefer=${h?"source":null}/>`:g`<p class="text-muted" style="padding:var(--sp-10)">Loading...</p>`}
    </div>
    <div class="fv-toolbar">
      <span>${E} lines${P&&!a?" (showing "+zn*2+" of "+E+")":""}</span>
      ${P&&g`<button onClick=${()=>c(!a)}>${a?"Collapse":"Show all"}</button>`}
    </div>
  </div>`}function sn({variant:e="secondary",size:t="md",loading:l=!1,disabled:n=!1,type:s="button",onClick:o,class:r,className:a,children:c,...d}){const v=["aictl-ui-btn",`aictl-ui-btn--${e}`,t==="sm"?"aictl-ui-btn--sm":null,r,a].filter(Boolean).join(" "),p=n||l;return g`<button
    type=${s}
    class=${v}
    disabled=${p}
    aria-busy=${l?"true":null}
    onClick=${p?void 0:o}
    ...${d}
  >${l?g`<span class="aictl-ui-btn__spinner" aria-hidden="true"></span>`:null}${c}</button>`}function mi({variant:e="neutral",size:t="sm",dot:l=!1,class:n,className:s,children:o,...r}){const a=["aictl-ui-badge",`aictl-ui-badge--${e}`,t==="md"?"aictl-ui-badge--md":null,n,s].filter(Boolean).join(" ");return g`<span class=${a} ...${r}>
    ${l?g`<span class="aictl-ui-badge__dot" aria-hidden="true"></span>`:null}
    ${o}
  </span>`}function $u(e,t,l){let s=0,o=0;switch(l){case"top":s=e.top-t.height-6,o=e.left+(e.width-t.width)/2;break;case"bottom":s=e.bottom+6,o=e.left+(e.width-t.width)/2;break;case"left":s=e.top+(e.height-t.height)/2,o=e.left-t.width-6;break;case"right":default:s=e.top+(e.height-t.height)/2,o=e.right+6;break}const r=window.innerWidth,a=window.innerHeight;return o=Math.max(4,Math.min(o,r-t.width-4)),s=Math.max(4,Math.min(s,a-t.height-4)),{top:s,left:o}}function hi({content:e,placement:t="top",open:l,onOpenChange:n,children:s,class:o,className:r,...a}){const[c,d]=X(!1),v=l!==void 0?l:c,p=re(x=>{l===void 0&&d(x),n&&n(x)},[l,n]),h=Z(null),b=Z(null),S=ac(),[D,w]=X({top:-9999,left:-9999});ie(()=>{if(!v)return;const x=h.current,y=b.current;if(!x||!y)return;const E=()=>w($u(x.getBoundingClientRect(),y.getBoundingClientRect(),t));return E(),window.addEventListener("scroll",E,!0),window.addEventListener("resize",E),()=>{window.removeEventListener("scroll",E,!0),window.removeEventListener("resize",E)}},[v,t,e]);const T=()=>p(!0),k=()=>p(!1),A=["aictl-ui-tooltip-wrap",o,r].filter(Boolean).join(" ");return g`<span
    ref=${h}
    class=${A}
    onMouseEnter=${T}
    onMouseLeave=${k}
    onFocusIn=${T}
    onFocusOut=${k}
    aria-describedby=${v?S:null}
    ...${a}
  >
    ${s}
    ${v?g`<span
      ref=${b}
      id=${S}
      role="tooltip"
      class="aictl-ui-tooltip"
      style=${`top:${D.top}px;left:${D.left}px`}
    >${e}</span>`:null}
  </span>`}function bu(e,t,l){let s=0,o=0;switch(l){case"top":s=e.top-t.height-6,o=e.left;break;case"left":s=e.top,o=e.left-t.width-6;break;case"right":s=e.top,o=e.right+6;break;case"bottom":default:s=e.bottom+6,o=e.left;break}const r=window.innerWidth,a=window.innerHeight;return o=Math.max(4,Math.min(o,r-t.width-4)),s=Math.max(4,Math.min(s,a-t.height-4)),{top:s,left:o}}const vi='a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';function Ul({trigger:e,placement:t="bottom",open:l,onOpenChange:n,children:s,class:o,className:r,...a}){const[c,d]=X(!1),v=l!==void 0?l:c,p=re(k=>{l===void 0&&d(k),n&&n(k)},[l,n]),h=Z(null),b=Z(null),[S,D]=X({top:-9999,left:-9999});ie(()=>{if(!v)return;const k=h.current,A=b.current;if(!k||!A)return;const x=()=>D(bu(k.getBoundingClientRect(),A.getBoundingClientRect(),t));x();const y=O=>{!A.contains(O.target)&&!k.contains(O.target)&&p(!1)},E=O=>{if(O.key==="Escape"){p(!1),k.focus&&k.focus();return}if(O.key==="Tab"){const q=A.querySelectorAll(vi);if(!q.length)return;const R=q[0],M=q[q.length-1];O.shiftKey&&document.activeElement===R?(O.preventDefault(),M.focus()):!O.shiftKey&&document.activeElement===M&&(O.preventDefault(),R.focus())}};document.addEventListener("mousedown",y),document.addEventListener("keydown",E),window.addEventListener("resize",x);const P=A.querySelector(vi);return P?P.focus():A.focus(),()=>{document.removeEventListener("mousedown",y),document.removeEventListener("keydown",E),window.removeEventListener("resize",x)}},[v,t,p]);const w=k=>{k.stopPropagation(),p(!v)},T=["aictl-ui-popover",o,r].filter(Boolean).join(" ");return g`<span style="display:inline-flex;position:relative" ...${a}>
    <span ref=${h} onClick=${w}>${e}</span>
    ${v?g`<div
      ref=${b}
      class=${T}
      role="dialog"
      tabindex="-1"
      style=${`top:${S.top}px;left:${S.left}px`}
    >${s}</div>`:null}
  </span>`}const gi='a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';function Yn({open:e,onClose:t,ariaLabel:l,labelledBy:n,children:s,closeOnBackdrop:o=!0,class:r,className:a,...c}){const d=Z(null),v=Z(null),p=re(()=>{t&&t()},[t]);if(ie(()=>{if(!e)return;v.current=document.activeElement;const S=d.current;if(!S)return;(S.querySelector(gi)||S).focus();const w=T=>{if(T.key==="Escape"){T.stopPropagation(),p();return}if(T.key==="Tab"){const k=S.querySelectorAll(gi);if(!k.length){T.preventDefault();return}const A=k[0],x=k[k.length-1];T.shiftKey&&document.activeElement===A?(T.preventDefault(),x.focus()):!T.shiftKey&&document.activeElement===x&&(T.preventDefault(),A.focus())}};return document.addEventListener("keydown",w),()=>{document.removeEventListener("keydown",w),v.current&&v.current.focus&&v.current.focus()}},[e,p]),!e)return null;const h=S=>{o&&S.target===S.currentTarget&&p()},b=["aictl-ui-dialog",r,a].filter(Boolean).join(" ");return g`<div class="aictl-ui-dialog-backdrop" onMouseDown=${h}>
    <div
      ref=${d}
      class=${b}
      role="dialog"
      aria-modal="true"
      aria-label=${l||null}
      aria-labelledby=${n||null}
      tabindex="-1"
      ...${c}
    >${s}</div>
  </div>`}function et({class:e,className:t,children:l,...n}){const s=["aictl-ui-kbd",e,t].filter(Boolean).join(" ");return g`<kbd class=${s} ...${n}>${l}</kbd>`}function Rr({icon:e,title:t,description:l,action:n,source:s,class:o,className:r,...a}){const c=["aictl-ui-empty",o,r].filter(Boolean).join(" ");return g`<div class=${c} role="status" ...${a}>
    ${e?g`<div class="aictl-ui-empty__icon">
      ${typeof e=="string"?g`<${Qt} name=${e} size="32"/>`:e}
    </div>`:null}
    ${t?g`<div class="aictl-ui-empty__title">${t}</div>`:null}
    ${l?g`<div class="aictl-ui-empty__desc">${l}</div>`:null}
    ${n?g`<div>${n}</div>`:null}
    ${s?g`<div class="aictl-ui-empty__source" title="Data source for this view">${s}</div>`:null}
  </div>`}function Gn({height:e="1em",width:t="100%",radius:l="4px",count:n=1,class:s,className:o,style:r,...a}){const c=["aictl-ui-skel",s,o].filter(Boolean).join(" "),d={height:e,width:t,borderRadius:l};if(n<=1)return g`<span class=${c} style=${{...d,...r||{}}} aria-hidden="true" ...${a}></span>`;const v=[];for(let p=0;p<n;p++)v.push(p);return g`<span style="display:flex;flex-direction:column;gap:var(--sp-2)" aria-hidden="true" ...${a}>
    ${v.map(p=>g`<span key=${p} class=${c} style=${{...d,...r||{}}}></span>`)}
  </span>`}const _u=window.TOOL_VENDORS??{},yu={"claude-code":"anthropic","claude-desktop":"anthropic","claude-mcp-memory":"anthropic",copilot:"github","copilot-vscode":"github","copilot-cli":"github","copilot-desktop":"github","copilot-jetbrains":"github","copilot-vs":"github",copilot365:"microsoft","codex-cli":"openai","chatgpt-desktop":"openai","chatgpt-lencx":"openai",gemini:"google","gemini-cli":"google",cursor:"cursor-inc",windsurf:"codeium",openclaw:"community",vscode:"microsoft"},$i={anthropic:'<path d="M12 4.5V19.5"/><path d="M4.5 12H19.5"/><path d="M6.7 6.7 17.3 17.3"/><path d="M17.3 6.7 6.7 17.3"/>',github:'<rect x="3.5" y="6.5" width="17" height="11" rx="5.5" fill="none"/><circle cx="9.2" cy="12" r="1.6" stroke="none" fill="currentColor"/><circle cx="14.8" cy="12" r="1.6" stroke="none" fill="currentColor"/>',microsoft:'<rect x="3.5" y="6.5" width="17" height="11" rx="5.5" fill="none"/><circle cx="9.2" cy="12" r="1.6" stroke="none" fill="currentColor"/><circle cx="14.8" cy="12" r="1.6" stroke="none" fill="currentColor"/>',openai:'<path d="M12 3.2 19.6 7.6V16.4L12 20.8 4.4 16.4V7.6Z" fill="none"/>',google:'<path d="M12 3.2C12 8 16 12 20.8 12C16 12 12 16 12 20.8C12 16 8 12 3.2 12C8 12 12 8 12 3.2Z" stroke="none" fill="currentColor"/>',"cursor-inc":'<path d="M6 3.5 6 18 10 14 12.6 19.5 15 18.4 12.4 13 18 13Z" fill="none" stroke-linejoin="round"/>',codeium:'<path d="M11.5 4 16 12.5H11.5Z" stroke="none" fill="currentColor"/><path d="M4 16C7 12.5 9.5 12.5 12 16 14.5 19.5 17 19.5 20 16" fill="none" stroke-linecap="round"/>',community:'<path d="M17 4.5C10 5.5 5.5 9.5 5.5 13.5 5.5 17 8 19.5 11.5 19.5" fill="none" stroke-linecap="round"/><path d="M17 4.5 13.5 6M17 4.5 18.8 7.8" stroke-linecap="round"/>',_fallback:'<circle cx="12" cy="12" r="4.5" stroke="none" fill="currentColor"/>'};function wu(e){return _u[e]||yu[e]||""}function Xl({tool:e,size:t="1em",strokeWidth:l=2,...n}){const s=wu(e),o=$i[s]||$i._fallback,r=fl[e]||"var(--fg2)";return g`<svg class="tool-ico" viewBox="0 0 24 24" width=${t} height=${t}
    fill="none" stroke="currentColor" stroke-width=${l} stroke-linecap="round"
    style=${"color:"+r} aria-hidden="true" ...${n}
    dangerouslySetInnerHTML=${{__html:o}}></svg>`}const Gs=new Set;let ku=0;const Ds=3,Su=5e3;function Ir(e){Gs.forEach(t=>{try{t(e)}catch{}})}function xu(e){return Gs.add(e),()=>Gs.delete(e)}function Ps(e,t,l={}){const n=++ku;return Ir({type:"add",toast:{id:n,variant:e,message:t,ttl:l.ttl||Su}}),n}function Nr(e){Ir({type:"remove",id:e})}const Ks={success:(e,t)=>Ps("success",e,t),error:(e,t)=>Ps("error",e,t),info:(e,t)=>Ps("info",e,t),dismiss:Nr};function Eu(){const[e,t]=X([]),l=Z(new Map);ie(()=>{const o=l.current,r=c=>{const d=o.get(c);d!=null&&d.tid&&clearTimeout(d.tid),o.delete(c)},a=xu(c=>{if(c.type==="add"){t(v=>{const p=[...v,c.toast];return p.length>Ds?(p.slice(0,p.length-Ds).forEach(h=>r(h.id)),p.slice(p.length-Ds)):p});const d=setTimeout(()=>{t(v=>v.filter(p=>p.id!==c.toast.id)),o.delete(c.toast.id)},c.toast.ttl);o.set(c.toast.id,{tid:d,expiresAt:Date.now()+c.toast.ttl,remaining:null})}else c.type==="remove"&&(r(c.id),t(d=>d.filter(v=>v.id!==c.id)))});return()=>{a(),o.forEach(c=>{c.tid&&clearTimeout(c.tid)}),o.clear()}},[]);const n=re(o=>{const a=l.current.get(o);!a||a.tid==null||(clearTimeout(a.tid),a.tid=null,a.remaining=Math.max(500,a.expiresAt-Date.now()))},[]),s=re(o=>{const r=l.current,a=r.get(o);if(!a||a.tid!=null)return;const c=a.remaining??500;a.expiresAt=Date.now()+c,a.remaining=null,a.tid=setTimeout(()=>{t(d=>d.filter(v=>v.id!==o)),r.delete(o)},c)},[]);return e.length?g`<div class="aictl-ui-toast-stack" role="region" aria-label="Notifications">
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
        onClick=${()=>Nr(o.id)}>×</button>
    </div>`)}
  </div>`:null}const Tu={active:"var(--green)",degraded:"var(--orange)",disabled:"var(--fg2)",unknown:"var(--fg2)"},Mu={error:"var(--red)",warning:"var(--orange)"},bi=20;function _i(e,t,l){const n=t==="cpu_percent"?"daemon_cpu_percent":"daemon_"+t,s=["daemon "+l(e[n]||0)];for(const o of e.children||[])s.push(o.name+" ("+o.pid+") "+l(o[t]||0));return s.join(" + ")}function yi(){var w,T,k,A,x;const{snap:e}=io(_l),[t,l]=X(null),[n,s]=X(null),[o,r]=X(null),[a,c]=X(null);ie(()=>{let y=!0;const E=()=>{$r().then(O=>{y&&l(O)}).catch(()=>{}),br().then(O=>{y&&s(O)}).catch(()=>{}),_r({limit:bi}).then(O=>{y&&r(Array.isArray(O==null?void 0:O.items)?O.items:[])}).catch(()=>{}),$c().then(O=>{y&&c(Array.isArray(O==null?void 0:O.ingesters)?O.ingesters:[])}).catch(()=>{})};E();const P=setInterval(E,15e3);return()=>{y=!1,clearInterval(P)}},[]);const d=Me(()=>{if(!e)return[];const y=e.tool_telemetry||[];return e.tools.filter(E=>E.tool!=="aictl"&&E.tool!=="any").map(E=>{var j,N,G,B,V;const P=y.find(F=>F.tool===E.tool),O=E.live||{},q=O.last_seen_at||0,R=q>0?Math.floor(Date.now()/1e3-q):-1,M=R>3600||R<0;return{tool:E.tool,label:E.label,source:(P==null?void 0:P.source)||(O.session_count?"live-monitor":"discovery"),confidence:(P==null?void 0:P.confidence)||((j=O.token_estimate)==null?void 0:j.confidence)||0,inputTokens:(P==null?void 0:P.input_tokens)||0,outputTokens:(P==null?void 0:P.output_tokens)||0,cost:(P==null?void 0:P.cost_usd)??null,sessions:(P==null?void 0:P.total_sessions)||O.session_count||0,errors:((N=P==null?void 0:P.errors)==null?void 0:N.length)||0,lastError:((G=P==null?void 0:P.errors)==null?void 0:G[0])||null,lastSeen:R,stale:M,fileCount:E.files.length,procCount:E.processes.length,hasLive:!!E.live,hasOtel:!!((V=(B=O.sources||[]).includes)!=null&&V.call(B,"otel"))}}).sort((E,P)=>P.inputTokens+P.outputTokens-(E.inputTokens+E.outputTokens))},[e]),v=Me(()=>{var y;return(y=e==null?void 0:e.live_monitor)!=null&&y.diagnostics?Object.entries(e.live_monitor.diagnostics).map(([E,P])=>({name:E,status:P.status||"unknown",mode:P.mode||"",detail:P.detail||""})):[]},[e]);if(!e)return null;const p=d.length,h=d.filter(y=>y.inputTokens+y.outputTokens>0).length,b=d.filter(y=>y.hasLive).length,S=d.filter(y=>y.stale&&y.hasLive).length,D=d.reduce((y,E)=>y+E.errors,0);return g`<div class="diag-card" role="region" aria-label="Collector health">
    <h3 style=${{marginBottom:"var(--sp-4)"}}>Monitoring Health</h3>

    <!-- Summary badges -->
    <div class="flex-row flex-wrap gap-sm mb-md">
      <span class="badge" data-dp="overview.collector_health.tools_with_telemetry" style="background:var(--green);color:var(--on-status)">${h}/${p} tools with telemetry</span>
      <span class="badge" data-dp="overview.collector_health.live_tools" style="background:var(--accent);color:var(--on-status)">${b} live</span>
      ${S>0?g`<span class="badge" data-dp="overview.collector_health.stale_tools" style="background:var(--orange);color:var(--on-status)">${S} stale</span>`:null}
      ${D>0?g`<span class="badge" data-dp="overview.collector_health.errors" style="background:var(--red);color:var(--on-status)">${D} errors</span>`:null}
      ${t!=null&&t.active?g`<span class="badge" data-dp="overview.collector_health.otel_status" style="background:var(--green);color:var(--on-status)">OTel active</span>`:g`<span class="badge--muted badge" data-dp="overview.collector_health.otel_status">OTel inactive</span>`}
    </div>

    <!-- aictl self-monitoring -->
    ${n?g`<div class="mb-md" style="font-size:var(--fs-sm)">
      <div class="es-section-title">aictl Monitor Service <span class="text-muted text-xs">(self)</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--sp-2)">
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">CPU</div>
          <div class="metric-chip-value" title=${_i(n,"cpu_percent",vl)}>${vl(n.cpu_percent||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Memory (RSS)</div>
          <div class="metric-chip-value" title=${_i(n,"memory_rss_bytes",jt)}>${jt(n.memory_rss_bytes||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Size</div>
          <div class="metric-chip-value">${jt(((w=n.db)==null?void 0:w.file_size_bytes)||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Uptime</div>
          <div class="metric-chip-value">${ro(n.uptime_s)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Threads</div>
          <div class="metric-chip-value">${n.threads||"—"}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Rows</div>
          <div class="metric-chip-value" title="metrics + tool_metrics + events + samples">
            ${gt((((T=n.db)==null?void 0:T.metrics_count)||0)+(((k=n.db)==null?void 0:k.tool_metrics_count)||0)+(((A=n.db)==null?void 0:A.events_count)||0)+(((x=n.db)==null?void 0:x.samples_count)||0))}</div>
        </div>
      </div>
      ${n.sink?g`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--sp-2);margin-top:var(--sp-2)">
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Emitted</div>
          <div class="metric-chip-value">${gt(n.sink.total_emitted||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Flushed</div>
          <div class="metric-chip-value">${gt(n.sink.total_flushed||0)}</div>
        </div>
        <div class="metric-chip" style="${(n.sink.total_dropped||0)>0?"background:rgba(248,113,113,0.15);border:1px solid var(--red)":""}">
          <div class="metric-chip-label" style="${(n.sink.total_dropped||0)>0?"color:var(--red);font-weight:600":"color:var(--fg2)"}">Dropped</div>
          <div class="metric-chip-value" style="${(n.sink.total_dropped||0)>0?"color:var(--red)":""}">${gt(n.sink.total_dropped||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Tracked</div>
          <div class="metric-chip-value">${gt(n.sink.metrics_tracked||0)}</div>
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
        ${t.last_receive_at>0?g`<span class="text-muted">Last: ${Pl(t.last_receive_at)}</span>`:null}
      </div>
    </div>`:null}

    <!-- Local-store ingesters (copilot / cursor / vscode chat pollers) -->
    ${a!=null?g`<div class="mb-md" data-dp="overview.collector_health.ingesters">
      <div class="es-section-title">Ingesters</div>
      ${a.length===0?g`<div class="text-xs text-muted">No ingesters running</div>`:a.map(y=>{const E=y.last_poll_ts?Pl(y.last_poll_ts):"never polled";return g`<div key=${y.name}
              class="flex-row gap-sm" style="align-items:center;padding:var(--sp-1) 0;font-size:var(--fs-sm)">
              <span aria-hidden="true"
                title=${y.source_exists?"source present":"source missing"}
                style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${y.source_exists?"var(--green)":"var(--fg2)"}"></span>
              <span class="mono text-xs" style="min-width:170px" title=${y.source_path||""}>${Wn(y.name)}</span>
              <span class="sr-only">${y.source_exists?"source present":"source missing"}</span>
              <span class="text-xs text-muted" title="last poll" style="min-width:80px">${E}</span>
              <span class="text-xs" style="margin-left:auto"
                title="rows inserted on the last poll">+${y.last_poll_inserted||0} rows</span>
              ${y.rows_ingested_total!=null?g`<span class="text-xs text-muted" title="cumulative rows ingested">${gt(y.rows_ingested_total)} total</span>`:null}
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
          <tbody>${d.map(y=>{var E;return g`<tr key=${y.tool}
            style="border-bottom:1px solid var(--bg3);opacity:${y.stale&&!y.fileCount?.4:1}">
            <td style="padding:var(--sp-1) var(--sp-2);white-space:nowrap">
              <${Xl} tool=${y.tool} size="1em"/>
              ${Wn(y.label)}</td>
            <td style="padding:var(--sp-1) var(--sp-2)" class="text-muted mono">${y.source}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              <span style="color:${y.confidence>=.9?"var(--green)":y.confidence>=.7?"var(--yellow)":"var(--orange)"}">
                ${y.confidence>0?vl(y.confidence*100):"—"}</span></td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${y.inputTokens?gt(y.inputTokens):"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${y.outputTokens?gt(y.outputTokens):"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${y.sessions||"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              ${y.errors>0?g`<span class="text-red" title=${((E=y.lastError)==null?void 0:E.message)||""}>${y.errors}</span>`:g`<span class="text-green">0</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">
              ${y.lastSeen>=0?g`<span style="color:${y.stale?"var(--orange)":"var(--fg2)"}">${Pl(Date.now()/1e3-y.lastSeen)}</span>`:g`<span class="text-muted">\u2014</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${y.fileCount}</td>
          </tr>`})}</tbody>
        </table>
      </div>
    </div>

    <!-- Data-quality events (sink flood-protection, ingester failures, …) -->
    ${o!=null?g`<div class="mb-md" data-dp="overview.collector_health.data_quality">
      <div class="es-section-title">Data Quality</div>
      ${o.length===0?g`<div class="text-xs text-muted">No data-quality events</div>`:o.slice(0,bi).map((y,E)=>{const P=Mu[y.severity]||"var(--fg2)",O=[y.component,y.source].filter(Boolean).join(" · ");return g`<div key=${(y.component||"")+":"+(y.source||"")+":"+E}
              class="flex-row gap-sm" style="align-items:center;padding:var(--sp-1) 0;font-size:var(--fs-sm)">
              <span class="badge" style="background:${P};color:var(--on-status);font-size:var(--fs-2xs)">
                ${y.severity||y.status||"info"}</span>
              <span class="mono text-xs" style="white-space:nowrap" title=${"kind: "+(y.kind||"—")+" · status: "+(y.status||"—")+(y.count?" · seen "+y.count+"x":"")}>${O||"—"}</span>
              <span class="text-xs" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                title=${y.message||""}>${y.message||"—"}</span>
              <span class="text-xs text-muted" style="white-space:nowrap">${Pl(y.updated_at)}</span>
            </div>`})}
    </div>`:null}

    <!-- Collector pipeline status -->
    ${v.length>0?g`<div>
      <div class="es-section-title">Collector Pipeline</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp-2)">
        ${v.map(y=>g`<div key=${y.name}
          style="padding:var(--sp-2) var(--sp-3);background:var(--bg);border-radius:4px;
            border-left:3px solid ${Tu[y.status]||"var(--fg2)"}">
          <div class="flex-row gap-sm" style="align-items:center">
            <span class="mono text-xs text-bold">${y.name}</span>
            <span class="text-xs text-muted" style="margin-left:auto">${y.status}</span>
          </div>
          ${y.detail?g`<div class="text-xs text-muted" style="margin-top:2px">${Wn(y.detail)}</div>`:null}
        </div>`)}
      </div>
    </div>`:null}
  </div>`}let Os=null;function Cu(){return Os?Promise.resolve(Os):bc().then(e=>{const t={};for(const l of e||[])t[l.key]=l;return Os=t,t}).catch(()=>({}))}function Au(e){if(!e)return"";const t=e.replace(/\s+/g," ").trim(),l=t.match(/^[^.!?]+[.!?]/);return l?l[0].trim():t.slice(0,120)}const Lu={tokens:"tokens",bytes:"bytes",percent:"%",count:"count",rate_bps:"bytes/s",usd:"USD",seconds:"sec",ratio:"ratio"},Du={raw:"raw",deduced:"deduced",aggregated:"agg"};function Pu(){const[e,t]=X(null),[l,n]=X({x:0,y:0}),[s,o]=X(!1),r=Z(null),a=Z(null),c=re(w=>{const T=w.getAttribute("data-dp");T&&Cu().then(k=>{const A=k[T];if(!A)return;const x=w.getBoundingClientRect();n({x:x.left,y:x.bottom+4}),t(A),o(!1)})},[]),d=re(()=>{a.current=setTimeout(()=>{t(null),o(!1)},120)},[]),v=re(()=>{a.current&&(clearTimeout(a.current),a.current=null)},[]);if(ie(()=>{function w(A){const x=A.target.closest("[data-dp]");x&&(v(),c(x))}function T(A){A.target.closest("[data-dp]")&&d()}function k(A){A.target.closest("[data-dp]")&&e&&(A.preventDefault(),o(y=>!y))}return document.addEventListener("mouseover",w,!0),document.addEventListener("mouseout",T,!0),document.addEventListener("click",k,!0),document.addEventListener("focusin",w,!0),document.addEventListener("focusout",T,!0),()=>{document.removeEventListener("mouseover",w,!0),document.removeEventListener("mouseout",T,!0),document.removeEventListener("click",k,!0),document.removeEventListener("focusin",w,!0),document.removeEventListener("focusout",T,!0)}},[c,d,v,e]),!e)return null;const h=Math.min(l.x,window.innerWidth-320-8),b=Math.min(l.y,window.innerHeight-180),S=Du[e.source_type]||e.source_type,D=Lu[e.unit]||e.unit;return g`<div class="dp-tooltip" ref=${r}
    style=${"left:"+h+"px;top:"+b+"px"}
    onMouseEnter=${v} onMouseLeave=${d}>
    <div class="dp-tooltip-head">
      <span class="dp-tooltip-key">${e.key}</span>
      <span class="dp-tooltip-badge dp-badge-${e.source_type}">${S}</span>
      ${D&&g`<span class="dp-tooltip-unit">${D}</span>`}
    </div>
    <div class="dp-tooltip-body">${Au(e.explanation)}</div>
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
  </div>`}class wi extends cc{constructor(t){super(t),this.state={hasError:!1,error:null}}static getDerivedStateFromError(t){return{hasError:!0,error:t}}componentDidCatch(t,l){console.error("Dashboard error:",t,l);try{Ks.error("Something went wrong in this view")}catch{}}render(){var t;if(this.state.hasError){const l=((t=this.state.error)==null?void 0:t.message)||"Unknown error";return g`<div role="alert">
        <${Rr}
          icon="alert-triangle"
          title="Something went wrong"
          description=${l}
          action=${g`<${sn} variant="primary" onClick=${()=>this.setState({hasError:!1,error:null})}>Retry</${sn}>`}
        />
      </div>`}return this.props.children}}const Ou=!0,He="u-",Ru="uplot",Iu=He+"hz",Nu=He+"vt",Vu=He+"title",Fu=He+"wrap",zu=He+"under",Hu=He+"over",Bu=He+"axis",_n=He+"off",Uu=He+"select",Wu=He+"cursor-x",ju=He+"cursor-y",Gu=He+"cursor-pt",Ku=He+"legend",Yu=He+"live",qu=He+"inline",Ju=He+"series",Qu=He+"marker",ki=He+"label",Zu=He+"value",pl="width",ml="height",ul="top",Si="bottom",Hn="left",Rs="right",ao="#000",xi=ao+"0",Is="mousemove",Ei="mousedown",Ns="mouseup",Ti="mouseenter",Mi="mouseleave",Ci="dblclick",Xu="resize",ed="scroll",Ai="change",Wl="dppxchange",co="--",Xn=typeof window<"u",Ys=Xn?document:null,Kn=Xn?window:null,td=Xn?navigator:null;let me,Rl;function qs(){let e=devicePixelRatio;me!=e&&(me=e,Rl&&Qs(Ai,Rl,qs),Rl=matchMedia(`(min-resolution: ${me-.001}dppx) and (max-resolution: ${me+.001}dppx)`),yn(Ai,Rl,qs),Kn.dispatchEvent(new CustomEvent(Wl)))}function vt(e,t){if(t!=null){let l=e.classList;!l.contains(t)&&l.add(t)}}function Js(e,t){let l=e.classList;l.contains(t)&&l.remove(t)}function Ee(e,t,l){e.style[t]=l+"px"}function Ot(e,t,l,n){let s=Ys.createElement(e);return t!=null&&vt(s,t),l!=null&&l.insertBefore(s,n),s}function Tt(e,t){return Ot("div",e,t)}const Li=new WeakMap;function Wt(e,t,l,n,s){let o="translate("+t+"px,"+l+"px)",r=Li.get(e);o!=r&&(e.style.transform=o,Li.set(e,o),t<0||l<0||t>n||l>s?vt(e,_n):Js(e,_n))}const Di=new WeakMap;function Pi(e,t,l){let n=t+l,s=Di.get(e);n!=s&&(Di.set(e,n),e.style.background=t,e.style.borderColor=l)}const Oi=new WeakMap;function Ri(e,t,l,n){let s=t+""+l,o=Oi.get(e);s!=o&&(Oi.set(e,s),e.style.height=l+"px",e.style.width=t+"px",e.style.marginLeft=n?-t/2+"px":0,e.style.marginTop=n?-l/2+"px":0)}const uo={passive:!0},nd={...uo,capture:!0};function yn(e,t,l,n){t.addEventListener(e,l,n?nd:uo)}function Qs(e,t,l,n){t.removeEventListener(e,l,uo)}Xn&&qs();function Rt(e,t,l,n){let s;l=l||0,n=n||t.length-1;let o=n<=2147483647;for(;n-l>1;)s=o?l+n>>1:$t((l+n)/2),t[s]<e?l=s:n=s;return e-t[l]<=t[n]-e?l:n}function Vr(e){return(l,n,s)=>{let o=-1,r=-1;for(let a=n;a<=s;a++)if(e(l[a])){o=a;break}for(let a=s;a>=n;a--)if(e(l[a])){r=a;break}return[o,r]}}const Fr=e=>e!=null,zr=e=>e!=null&&e>0,es=Vr(Fr),ld=Vr(zr);function sd(e,t,l,n=0,s=!1){let o=s?ld:es,r=s?zr:Fr;[t,l]=o(e,t,l);let a=e[t],c=e[t];if(t>-1)if(n==1)a=e[t],c=e[l];else if(n==-1)a=e[l],c=e[t];else for(let d=t;d<=l;d++){let v=e[d];r(v)&&(v<a?a=v:v>c&&(c=v))}return[a??$e,c??-$e]}function ts(e,t,l,n){let s=Vi(e),o=Vi(t);e==t&&(s==-1?(e*=l,t/=l):(e/=l,t*=l));let r=l==10?qt:Hr,a=s==1?$t:Mt,c=o==1?Mt:$t,d=a(r(ze(e))),v=c(r(ze(t))),p=qn(l,d),h=qn(l,v);return l==10&&(d<0&&(p=be(p,-d)),v<0&&(h=be(h,-v))),n||l==2?(e=p*s,t=h*o):(e=jr(e,p),t=ns(t,h)),[e,t]}function fo(e,t,l,n){let s=ts(e,t,l,n);return e==0&&(s[0]=0),t==0&&(s[1]=0),s}const po=.1,Ii={mode:3,pad:po},gl={pad:0,soft:null,mode:0},od={min:gl,max:gl};function jl(e,t,l,n){return ls(l)?Ni(e,t,l):(gl.pad=l,gl.soft=n?0:null,gl.mode=n?3:0,Ni(e,t,od))}function fe(e,t){return e??t}function id(e,t,l){for(t=fe(t,0),l=fe(l,e.length-1);t<=l;){if(e[t]!=null)return!0;t++}return!1}function Ni(e,t,l){let n=l.min,s=l.max,o=fe(n.pad,0),r=fe(s.pad,0),a=fe(n.hard,-$e),c=fe(s.hard,$e),d=fe(n.soft,$e),v=fe(s.soft,-$e),p=fe(n.mode,0),h=fe(s.mode,0),b=t-e,S=qt(b),D=it(ze(e),ze(t)),w=qt(D),T=ze(w-S);(b<1e-24||T>10)&&(b=0,(e==0||t==0)&&(b=1e-24,p==2&&d!=$e&&(o=0),h==2&&v!=-$e&&(r=0)));let k=b||D||1e3,A=qt(k),x=qn(10,$t(A)),y=k*(b==0?e==0?.1:1:o),E=be(jr(e-y,x/10),24),P=e>=d&&(p==1||p==3&&E<=d||p==2&&E>=d)?d:$e,O=it(a,E<P&&e>=P?P:It(P,E)),q=k*(b==0?t==0?.1:1:r),R=be(ns(t+q,x/10),24),M=t<=v&&(h==1||h==3&&R>=v||h==2&&R<=v)?v:-$e,j=It(c,R>M&&t<=M?M:it(M,R));return O==j&&O==0&&(j=100),[O,j]}const rd=new Intl.NumberFormat(Xn?td.language:"en-US"),mo=e=>rd.format(e),bt=Math,zl=bt.PI,ze=bt.abs,$t=bt.floor,Fe=bt.round,Mt=bt.ceil,It=bt.min,it=bt.max,qn=bt.pow,Vi=bt.sign,qt=bt.log10,Hr=bt.log2,ad=(e,t=1)=>bt.sinh(e)*t,Vs=(e,t=1)=>bt.asinh(e/t),$e=1/0;function Fi(e){return(qt((e^e>>31)-(e>>31))|0)+1}function Zs(e,t,l){return It(it(e,t),l)}function Br(e){return typeof e=="function"}function se(e){return Br(e)?e:()=>e}const cd=()=>{},Ur=e=>e,Wr=(e,t)=>t,ud=e=>null,zi=e=>!0,Hi=(e,t)=>e==t,dd=/\.\d*?(?=9{6,}|0{6,})/gm,wn=e=>{if(Kr(e)||an.has(e))return e;const t=`${e}`,l=t.match(dd);if(l==null)return e;let n=l[0].length-1;if(t.indexOf("e-")!=-1){let[s,o]=t.split("e");return+`${wn(s)}e${o}`}return be(e,n)};function $n(e,t){return wn(be(wn(e/t))*t)}function ns(e,t){return wn(Mt(wn(e/t))*t)}function jr(e,t){return wn($t(wn(e/t))*t)}function be(e,t=0){if(Kr(e))return e;let l=10**t,n=e*l*(1+Number.EPSILON);return Fe(n)/l}const an=new Map;function Gr(e){return((""+e).split(".")[1]||"").length}function kl(e,t,l,n){let s=[],o=n.map(Gr);for(let r=t;r<l;r++){let a=ze(r),c=be(qn(e,r),a);for(let d=0;d<n.length;d++){let v=e==10?+`${n[d]}e${r}`:n[d]*c,p=(r>=0?0:a)+(r>=o[d]?0:o[d]),h=e==10?v:be(v,p);s.push(h),an.set(h,p)}}return s}const $l={},ho=[],Jn=[null,null],on=Array.isArray,Kr=Number.isInteger,fd=e=>e===void 0;function Bi(e){return typeof e=="string"}function ls(e){let t=!1;if(e!=null){let l=e.constructor;t=l==null||l==Object}return t}function pd(e){return e!=null&&typeof e=="object"}const md=Object.getPrototypeOf(Uint8Array),Yr="__proto__";function Qn(e,t=ls){let l;if(on(e)){let n=e.find(s=>s!=null);if(on(n)||t(n)){l=Array(e.length);for(let s=0;s<e.length;s++)l[s]=Qn(e[s],t)}else l=e.slice()}else if(e instanceof md)l=e.slice();else if(t(e)){l={};for(let n in e)n!=Yr&&(l[n]=Qn(e[n],t))}else l=e;return l}function Ne(e){let t=arguments;for(let l=1;l<t.length;l++){let n=t[l];for(let s in n)s!=Yr&&(ls(e[s])?Ne(e[s],Qn(n[s])):e[s]=Qn(n[s]))}return e}const hd=0,vd=1,gd=2;function $d(e,t,l){for(let n=0,s,o=-1;n<t.length;n++){let r=t[n];if(r>o){for(s=r-1;s>=0&&e[s]==null;)e[s--]=null;for(s=r+1;s<l&&e[s]==null;)e[o=s++]=null}}}function bd(e,t){if(wd(e)){let r=e[0].slice();for(let a=1;a<e.length;a++)r.push(...e[a].slice(1));return kd(r[0])||(r=yd(r)),r}let l=new Set;for(let r=0;r<e.length;r++){let c=e[r][0],d=c.length;for(let v=0;v<d;v++)l.add(c[v])}let n=[Array.from(l).sort((r,a)=>r-a)],s=n[0].length,o=new Map;for(let r=0;r<s;r++)o.set(n[0][r],r);for(let r=0;r<e.length;r++){let a=e[r],c=a[0];for(let d=1;d<a.length;d++){let v=a[d],p=Array(s).fill(void 0),h=t?t[r][d]:vd,b=[];for(let S=0;S<v.length;S++){let D=v[S],w=o.get(c[S]);D===null?h!=hd&&(p[w]=D,h==gd&&b.push(w)):p[w]=D}$d(p,b,s),n.push(p)}}return n}const _d=typeof queueMicrotask>"u"?e=>Promise.resolve().then(e):queueMicrotask;function yd(e){let t=e[0],l=t.length,n=Array(l);for(let o=0;o<n.length;o++)n[o]=o;n.sort((o,r)=>t[o]-t[r]);let s=[];for(let o=0;o<e.length;o++){let r=e[o],a=Array(l);for(let c=0;c<l;c++)a[c]=r[n[c]];s.push(a)}return s}function wd(e){let t=e[0][0],l=t.length;for(let n=1;n<e.length;n++){let s=e[n][0];if(s.length!=l)return!1;if(s!=t){for(let o=0;o<l;o++)if(s[o]!=t[o])return!1}}return!0}function kd(e,t=100){const l=e.length;if(l<=1)return!0;let n=0,s=l-1;for(;n<=s&&e[n]==null;)n++;for(;s>=n&&e[s]==null;)s--;if(s<=n)return!0;const o=it(1,$t((s-n+1)/t));for(let r=e[n],a=n+o;a<=s;a+=o){const c=e[a];if(c!=null){if(c<=r)return!1;r=c}}return!0}const qr=["January","February","March","April","May","June","July","August","September","October","November","December"],Jr=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];function Qr(e){return e.slice(0,3)}const Sd=Jr.map(Qr),xd=qr.map(Qr),Ed={MMMM:qr,MMM:xd,WWWW:Jr,WWW:Sd};function dl(e){return(e<10?"0":"")+e}function Td(e){return(e<10?"00":e<100?"0":"")+e}const Md={YYYY:e=>e.getFullYear(),YY:e=>(e.getFullYear()+"").slice(2),MMMM:(e,t)=>t.MMMM[e.getMonth()],MMM:(e,t)=>t.MMM[e.getMonth()],MM:e=>dl(e.getMonth()+1),M:e=>e.getMonth()+1,DD:e=>dl(e.getDate()),D:e=>e.getDate(),WWWW:(e,t)=>t.WWWW[e.getDay()],WWW:(e,t)=>t.WWW[e.getDay()],HH:e=>dl(e.getHours()),H:e=>e.getHours(),h:e=>{let t=e.getHours();return t==0?12:t>12?t-12:t},AA:e=>e.getHours()>=12?"PM":"AM",aa:e=>e.getHours()>=12?"pm":"am",a:e=>e.getHours()>=12?"p":"a",mm:e=>dl(e.getMinutes()),m:e=>e.getMinutes(),ss:e=>dl(e.getSeconds()),s:e=>e.getSeconds(),fff:e=>Td(e.getMilliseconds())};function vo(e,t){t=t||Ed;let l=[],n=/\{([a-z]+)\}|[^{]+/gi,s;for(;s=n.exec(e);)l.push(s[0][0]=="{"?Md[s[1]]:s[0]);return o=>{let r="";for(let a=0;a<l.length;a++)r+=typeof l[a]=="string"?l[a]:l[a](o,t);return r}}const Cd=new Intl.DateTimeFormat().resolvedOptions().timeZone;function Ad(e,t){let l;return t=="UTC"||t=="Etc/UTC"?l=new Date(+e+e.getTimezoneOffset()*6e4):t==Cd?l=e:(l=new Date(e.toLocaleString("en-US",{timeZone:t})),l.setMilliseconds(e.getMilliseconds())),l}const Zr=e=>e%1==0,Gl=[1,2,2.5,5],Ld=kl(10,-32,0,Gl),Xr=kl(10,0,32,Gl),Dd=Xr.filter(Zr),bn=Ld.concat(Xr),go=`
`,ea="{YYYY}",Ui=go+ea,ta="{M}/{D}",hl=go+ta,Il=hl+"/{YY}",na="{aa}",Pd="{h}:{mm}",Bn=Pd+na,Wi=go+Bn,ji=":{ss}",he=null;function la(e){let t=e*1e3,l=t*60,n=l*60,s=n*24,o=s*30,r=s*365,c=(e==1?kl(10,0,3,Gl).filter(Zr):kl(10,-3,0,Gl)).concat([t,t*5,t*10,t*15,t*30,l,l*5,l*10,l*15,l*30,n,n*2,n*3,n*4,n*6,n*8,n*12,s,s*2,s*3,s*4,s*5,s*6,s*7,s*8,s*9,s*10,s*15,o,o*2,o*3,o*4,o*6,r,r*2,r*5,r*10,r*25,r*50,r*100]);const d=[[r,ea,he,he,he,he,he,he,1],[s*28,"{MMM}",Ui,he,he,he,he,he,1],[s,ta,Ui,he,he,he,he,he,1],[n,"{h}"+na,Il,he,hl,he,he,he,1],[l,Bn,Il,he,hl,he,he,he,1],[t,ji,Il+" "+Bn,he,hl+" "+Bn,he,Wi,he,1],[e,ji+".{fff}",Il+" "+Bn,he,hl+" "+Bn,he,Wi,he,1]];function v(p){return(h,b,S,D,w,T)=>{let k=[],A=w>=r,x=w>=o&&w<r,y=p(S),E=be(y*e,3),P=Fs(y.getFullYear(),A?0:y.getMonth(),x||A?1:y.getDate()),O=be(P*e,3);if(x||A){let q=x?w/o:0,R=A?w/r:0,M=E==O?E:be(Fs(P.getFullYear()+R,P.getMonth()+q,1)*e,3),j=new Date(Fe(M/e)),N=j.getFullYear(),G=j.getMonth();for(let B=0;M<=D;B++){let V=Fs(N+R*B,G+q*B,1),F=V-p(be(V*e,3));M=be((+V+F)*e,3),M<=D&&k.push(M)}}else{let q=w>=s?s:w,R=$t(S)-$t(E),M=O+R+ns(E-O,q);k.push(M);let j=p(M),N=j.getHours()+j.getMinutes()/l+j.getSeconds()/n,G=w/n,B=h.axes[b]._space,V=T/B;for(;M=be(M+w,e==1?0:3),!(M>D);)if(G>1){let F=$t(be(N+G,6))%24,ae=p(M).getHours()-F;ae>1&&(ae=-1),M-=ae*n,N=(N+G)%24;let ue=k[k.length-1];be((M-ue)/w,3)*V>=.7&&k.push(M)}else k.push(M)}return k}}return[c,d,v]}const[Od,Rd,Id]=la(1),[Nd,Vd,Fd]=la(.001);kl(2,-53,53,[1]);function Gi(e,t){return e.map(l=>l.map((n,s)=>s==0||s==8||n==null?n:t(s==1||l[8]==0?n:l[1]+n)))}function Ki(e,t){return(l,n,s,o,r)=>{let a=t.find(S=>r>=S[0])||t[t.length-1],c,d,v,p,h,b;return n.map(S=>{let D=e(S),w=D.getFullYear(),T=D.getMonth(),k=D.getDate(),A=D.getHours(),x=D.getMinutes(),y=D.getSeconds(),E=w!=c&&a[2]||T!=d&&a[3]||k!=v&&a[4]||A!=p&&a[5]||x!=h&&a[6]||y!=b&&a[7]||a[1];return c=w,d=T,v=k,p=A,h=x,b=y,E(D)})}}function zd(e,t){let l=vo(t);return(n,s,o,r,a)=>s.map(c=>l(e(c)))}function Fs(e,t,l){return new Date(e,t,l)}function Yi(e,t){return t(e)}const Hd="{YYYY}-{MM}-{DD} {h}:{mm}{aa}";function qi(e,t){return(l,n,s,o)=>o==null?co:t(e(n))}function Bd(e,t){let l=e.series[t];return l.width?l.stroke(e,t):l.points.width?l.points.stroke(e,t):null}function Ud(e,t){return e.series[t].fill(e,t)}const Wd={show:!0,live:!0,isolate:!1,mount:cd,markers:{show:!0,width:2,stroke:Bd,fill:Ud,dash:"solid"},idx:null,idxs:null,values:[]};function jd(e,t){let l=e.cursor.points,n=Tt(),s=l.size(e,t);Ee(n,pl,s),Ee(n,ml,s);let o=s/-2;Ee(n,"marginLeft",o),Ee(n,"marginTop",o);let r=l.width(e,t,s);return r&&Ee(n,"borderWidth",r),n}function Gd(e,t){let l=e.series[t].points;return l._fill||l._stroke}function Kd(e,t){let l=e.series[t].points;return l._stroke||l._fill}function Yd(e,t){return e.series[t].points.size}const zs=[0,0];function qd(e,t,l){return zs[0]=t,zs[1]=l,zs}function Nl(e,t,l,n=!0){return s=>{s.button==0&&(!n||s.target==t)&&l(s)}}function Hs(e,t,l,n=!0){return s=>{(!n||s.target==t)&&l(s)}}const Jd={show:!0,x:!0,y:!0,lock:!1,move:qd,points:{one:!1,show:jd,size:Yd,width:0,stroke:Kd,fill:Gd},bind:{mousedown:Nl,mouseup:Nl,click:Nl,dblclick:Nl,mousemove:Hs,mouseleave:Hs,mouseenter:Hs},drag:{setScale:!0,x:!0,y:!1,dist:0,uni:null,click:(e,t)=>{t.stopPropagation(),t.stopImmediatePropagation()},_x:!1,_y:!1},focus:{dist:(e,t,l,n,s)=>n-s,prox:-1,bias:0},hover:{skip:[void 0],prox:null,bias:0},left:-10,top:-10,idx:null,dataIdx:null,idxs:null,event:null},sa={show:!0,stroke:"rgba(0,0,0,0.07)",width:2},$o=Ne({},sa,{filter:Wr}),oa=Ne({},$o,{size:10}),ia=Ne({},sa,{show:!1}),bo='12px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',ra="bold "+bo,aa=1.5,Ji={show:!0,scale:"x",stroke:ao,space:50,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:ra,side:2,grid:$o,ticks:oa,border:ia,font:bo,lineGap:aa,rotate:0},Qd="Value",Zd="Time",Qi={show:!0,scale:"x",auto:!1,sorted:1,min:$e,max:-$e,idxs:[]};function Xd(e,t,l,n,s){return t.map(o=>o==null?"":mo(o))}function ef(e,t,l,n,s,o,r){let a=[],c=an.get(s)||0;l=r?l:be(ns(l,s),c);for(let d=l;d<=n;d=be(d+s,c))a.push(Object.is(d,-0)?0:d);return a}function Xs(e,t,l,n,s,o,r){const a=[],c=e.scales[e.axes[t].scale].log,d=c==10?qt:Hr,v=$t(d(l));s=qn(c,v),c==10&&(s=bn[Rt(s,bn)]);let p=l,h=s*c;c==10&&(h=bn[Rt(h,bn)]);do a.push(p),p=p+s,c==10&&!an.has(p)&&(p=be(p,an.get(s))),p>=h&&(s=p,h=s*c,c==10&&(h=bn[Rt(h,bn)]));while(p<=n);return a}function tf(e,t,l,n,s,o,r){let c=e.scales[e.axes[t].scale].asinh,d=n>c?Xs(e,t,it(c,l),n,s):[c],v=n>=0&&l<=0?[0]:[];return(l<-c?Xs(e,t,it(c,-n),-l,s):[c]).reverse().map(h=>-h).concat(v,d)}const ca=/./,nf=/[12357]/,lf=/[125]/,Zi=/1/,eo=(e,t,l,n)=>e.map((s,o)=>t==4&&s==0||o%n==0&&l.test(s.toExponential()[s<0?1:0])?s:null);function sf(e,t,l,n,s){let o=e.axes[l],r=o.scale,a=e.scales[r],c=e.valToPos,d=o._space,v=c(10,r),p=c(9,r)-v>=d?ca:c(7,r)-v>=d?nf:c(5,r)-v>=d?lf:Zi;if(p==Zi){let h=ze(c(1,r)-v);if(h<d)return eo(t.slice().reverse(),a.distr,p,Mt(d/h)).reverse()}return eo(t,a.distr,p,1)}function of(e,t,l,n,s){let o=e.axes[l],r=o.scale,a=o._space,c=e.valToPos,d=ze(c(1,r)-c(2,r));return d<a?eo(t.slice().reverse(),3,ca,Mt(a/d)).reverse():t}function rf(e,t,l,n){return n==null?co:t==null?"":mo(t)}const Xi={show:!0,scale:"y",stroke:ao,space:30,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:ra,side:3,grid:$o,ticks:oa,border:ia,font:bo,lineGap:aa,rotate:0};function af(e,t){let l=3+(e||1)*2;return be(l*t,3)}function cf(e,t){let{scale:l,idxs:n}=e.series[0],s=e._data[0],o=e.valToPos(s[n[0]],l,!0),r=e.valToPos(s[n[1]],l,!0),a=ze(r-o),c=e.series[t],d=a/(c.points.space*me);return n[1]-n[0]<=d}const er={scale:null,auto:!0,sorted:0,min:$e,max:-$e},ua=(e,t,l,n,s)=>s,tr={show:!0,auto:!0,sorted:0,gaps:ua,alpha:1,facets:[Ne({},er,{scale:"x"}),Ne({},er,{scale:"y"})]},nr={scale:"y",auto:!0,sorted:0,show:!0,spanGaps:!1,gaps:ua,alpha:1,points:{show:cf,filter:null},values:null,min:$e,max:-$e,idxs:[],path:null,clip:null};function uf(e,t,l,n,s){return l/10}const da={time:Ou,auto:!0,distr:1,log:10,asinh:1,min:null,max:null,dir:1,ori:0},df=Ne({},da,{time:!1,ori:1}),lr={};function fa(e,t){let l=lr[e];return l||(l={key:e,plots:[],sub(n){l.plots.push(n)},unsub(n){l.plots=l.plots.filter(s=>s!=n)},pub(n,s,o,r,a,c,d){for(let v=0;v<l.plots.length;v++)l.plots[v]!=s&&l.plots[v].pub(n,s,o,r,a,c,d)}},e!=null&&(lr[e]=l)),l}const Zn=1,to=2;function kn(e,t,l){const n=e.mode,s=e.series[t],o=n==2?e._data[t]:e._data,r=e.scales,a=e.bbox;let c=o[0],d=n==2?o[1]:o[t],v=n==2?r[s.facets[0].scale]:r[e.series[0].scale],p=n==2?r[s.facets[1].scale]:r[s.scale],h=a.left,b=a.top,S=a.width,D=a.height,w=e.valToPosH,T=e.valToPosV;return v.ori==0?l(s,c,d,v,p,w,T,h,b,S,D,os,el,rs,ma,va):l(s,c,d,v,p,T,w,b,h,D,S,is,tl,wo,ha,ga)}function _o(e,t){let l=0,n=0,s=fe(e.bands,ho);for(let o=0;o<s.length;o++){let r=s[o];r.series[0]==t?l=r.dir:r.series[1]==t&&(r.dir==1?n|=1:n|=2)}return[l,n==1?-1:n==2?1:n==3?2:0]}function ff(e,t,l,n,s){let o=e.mode,r=e.series[t],a=o==2?r.facets[1].scale:r.scale,c=e.scales[a];return s==-1?c.min:s==1?c.max:c.distr==3?c.dir==1?c.min:c.max:0}function Jt(e,t,l,n,s,o){return kn(e,t,(r,a,c,d,v,p,h,b,S,D,w)=>{let T=r.pxRound;const k=d.dir*(d.ori==0?1:-1),A=d.ori==0?el:tl;let x,y;k==1?(x=l,y=n):(x=n,y=l);let E=T(p(a[x],d,D,b)),P=T(h(c[x],v,w,S)),O=T(p(a[y],d,D,b)),q=T(h(o==1?v.max:v.min,v,w,S)),R=new Path2D(s);return A(R,O,q),A(R,E,q),A(R,E,P),R})}function ss(e,t,l,n,s,o){let r=null;if(e.length>0){r=new Path2D;const a=t==0?rs:wo;let c=l;for(let p=0;p<e.length;p++){let h=e[p];if(h[1]>h[0]){let b=h[0]-c;b>0&&a(r,c,n,b,n+o),c=h[1]}}let d=l+s-c,v=10;d>0&&a(r,c,n-v/2,d,n+o+v)}return r}function pf(e,t,l){let n=e[e.length-1];n&&n[0]==t?n[1]=l:e.push([t,l])}function yo(e,t,l,n,s,o,r){let a=[],c=e.length;for(let d=s==1?l:n;d>=l&&d<=n;d+=s)if(t[d]===null){let p=d,h=d;if(s==1)for(;++d<=n&&t[d]===null;)h=d;else for(;--d>=l&&t[d]===null;)h=d;let b=o(e[p]),S=h==p?b:o(e[h]),D=p-s;b=r<=0&&D>=0&&D<c?o(e[D]):b;let T=h+s;S=r>=0&&T>=0&&T<c?o(e[T]):S,S>=b&&a.push([b,S])}return a}function sr(e){return e==0?Ur:e==1?Fe:t=>$n(t,e)}function pa(e){let t=e==0?os:is,l=e==0?(s,o,r,a,c,d)=>{s.arcTo(o,r,a,c,d)}:(s,o,r,a,c,d)=>{s.arcTo(r,o,c,a,d)},n=e==0?(s,o,r,a,c)=>{s.rect(o,r,a,c)}:(s,o,r,a,c)=>{s.rect(r,o,c,a)};return(s,o,r,a,c,d=0,v=0)=>{d==0&&v==0?n(s,o,r,a,c):(d=It(d,a/2,c/2),v=It(v,a/2,c/2),t(s,o+d,r),l(s,o+a,r,o+a,r+c,d),l(s,o+a,r+c,o,r+c,v),l(s,o,r+c,o,r,v),l(s,o,r,o+a,r,d),s.closePath())}}const os=(e,t,l)=>{e.moveTo(t,l)},is=(e,t,l)=>{e.moveTo(l,t)},el=(e,t,l)=>{e.lineTo(t,l)},tl=(e,t,l)=>{e.lineTo(l,t)},rs=pa(0),wo=pa(1),ma=(e,t,l,n,s,o)=>{e.arc(t,l,n,s,o)},ha=(e,t,l,n,s,o)=>{e.arc(l,t,n,s,o)},va=(e,t,l,n,s,o,r)=>{e.bezierCurveTo(t,l,n,s,o,r)},ga=(e,t,l,n,s,o,r)=>{e.bezierCurveTo(l,t,s,n,r,o)};function $a(e){return(t,l,n,s,o)=>kn(t,l,(r,a,c,d,v,p,h,b,S,D,w)=>{let{pxRound:T,points:k}=r,A,x;d.ori==0?(A=os,x=ma):(A=is,x=ha);const y=be(k.width*me,3);let E=(k.size-k.width)/2*me,P=be(E*2,3),O=new Path2D,q=new Path2D,{left:R,top:M,width:j,height:N}=t.bbox;rs(q,R-P,M-P,j+P*2,N+P*2);const G=B=>{if(c[B]!=null){let V=T(p(a[B],d,D,b)),F=T(h(c[B],v,w,S));A(O,V+E,F),x(O,V,F,E,0,zl*2)}};if(o)o.forEach(G);else for(let B=n;B<=s;B++)G(B);return{stroke:y>0?O:null,fill:O,clip:q,flags:Zn|to}})}function ba(e){return(t,l,n,s,o,r)=>{n!=s&&(o!=n&&r!=n&&e(t,l,n),o!=s&&r!=s&&e(t,l,s),e(t,l,r))}}const mf=ba(el),hf=ba(tl);function _a(e){const t=fe(e==null?void 0:e.alignGaps,0);return(l,n,s,o)=>kn(l,n,(r,a,c,d,v,p,h,b,S,D,w)=>{[s,o]=es(c,s,o);let T=r.pxRound,k=N=>T(p(N,d,D,b)),A=N=>T(h(N,v,w,S)),x,y;d.ori==0?(x=el,y=mf):(x=tl,y=hf);const E=d.dir*(d.ori==0?1:-1),P={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:Zn},O=P.stroke;let q=!1;if(o-s>=D*4){let N=K=>l.posToVal(K,d.key,!0),G=null,B=null,V,F,De,ce=k(a[E==1?s:o]),ae=k(a[s]),ue=k(a[o]),ee=N(E==1?ae+1:ue-1);for(let K=E==1?s:o;K>=s&&K<=o;K+=E){let Pe=a[K],_e=(E==1?Pe<ee:Pe>ee)?ce:k(Pe),oe=c[K];_e==ce?oe!=null?(F=oe,G==null?(x(O,_e,A(F)),V=G=B=F):F<G?G=F:F>B&&(B=F)):oe===null&&(q=!0):(G!=null&&y(O,ce,A(G),A(B),A(V),A(F)),oe!=null?(F=oe,x(O,_e,A(F)),G=B=V=F):(G=B=null,oe===null&&(q=!0)),ce=_e,ee=N(ce+E))}G!=null&&G!=B&&De!=ce&&y(O,ce,A(G),A(B),A(V),A(F))}else for(let N=E==1?s:o;N>=s&&N<=o;N+=E){let G=c[N];G===null?q=!0:G!=null&&x(O,k(a[N]),A(G))}let[M,j]=_o(l,n);if(r.fill!=null||M!=0){let N=P.fill=new Path2D(O),G=r.fillTo(l,n,r.min,r.max,M),B=A(G),V=k(a[s]),F=k(a[o]);E==-1&&([F,V]=[V,F]),x(N,F,B),x(N,V,B)}if(!r.spanGaps){let N=[];q&&N.push(...yo(a,c,s,o,E,k,t)),P.gaps=N=r.gaps(l,n,s,o,N),P.clip=ss(N,d.ori,b,S,D,w)}return j!=0&&(P.band=j==2?[Jt(l,n,s,o,O,-1),Jt(l,n,s,o,O,1)]:Jt(l,n,s,o,O,j)),P})}function vf(e){const t=fe(e.align,1),l=fe(e.ascDesc,!1),n=fe(e.alignGaps,0),s=fe(e.extend,!1);return(o,r,a,c)=>kn(o,r,(d,v,p,h,b,S,D,w,T,k,A)=>{[a,c]=es(p,a,c);let x=d.pxRound,{left:y,width:E}=o.bbox,P=ae=>x(S(ae,h,k,w)),O=ae=>x(D(ae,b,A,T)),q=h.ori==0?el:tl;const R={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:Zn},M=R.stroke,j=h.dir*(h.ori==0?1:-1);let N=O(p[j==1?a:c]),G=P(v[j==1?a:c]),B=G,V=G;s&&t==-1&&(V=y,q(M,V,N)),q(M,G,N);for(let ae=j==1?a:c;ae>=a&&ae<=c;ae+=j){let ue=p[ae];if(ue==null)continue;let ee=P(v[ae]),K=O(ue);t==1?q(M,ee,N):q(M,B,K),q(M,ee,K),N=K,B=ee}let F=B;s&&t==1&&(F=y+E,q(M,F,N));let[De,ce]=_o(o,r);if(d.fill!=null||De!=0){let ae=R.fill=new Path2D(M),ue=d.fillTo(o,r,d.min,d.max,De),ee=O(ue);q(ae,F,ee),q(ae,V,ee)}if(!d.spanGaps){let ae=[];ae.push(...yo(v,p,a,c,j,P,n));let ue=d.width*me/2,ee=l||t==1?ue:-ue,K=l||t==-1?-ue:ue;ae.forEach(Pe=>{Pe[0]+=ee,Pe[1]+=K}),R.gaps=ae=d.gaps(o,r,a,c,ae),R.clip=ss(ae,h.ori,w,T,k,A)}return ce!=0&&(R.band=ce==2?[Jt(o,r,a,c,M,-1),Jt(o,r,a,c,M,1)]:Jt(o,r,a,c,M,ce)),R})}function or(e,t,l,n,s,o,r=$e){if(e.length>1){let a=null;for(let c=0,d=1/0;c<e.length;c++)if(t[c]!==void 0){if(a!=null){let v=ze(e[c]-e[a]);v<d&&(d=v,r=ze(l(e[c],n,s,o)-l(e[a],n,s,o)))}a=c}}return r}function gf(e){e=e||$l;const t=fe(e.size,[.6,$e,1]),l=e.align||0,n=e.gap||0;let s=e.radius;s=s==null?[0,0]:typeof s=="number"?[s,0]:s;const o=se(s),r=1-t[0],a=fe(t[1],$e),c=fe(t[2],1),d=fe(e.disp,$l),v=fe(e.each,b=>{}),{fill:p,stroke:h}=d;return(b,S,D,w)=>kn(b,S,(T,k,A,x,y,E,P,O,q,R,M)=>{let j=T.pxRound,N=l,G=n*me,B=a*me,V=c*me,F,De;x.ori==0?[F,De]=o(b,S):[De,F]=o(b,S);const ce=x.dir*(x.ori==0?1:-1);let ae=x.ori==0?rs:wo,ue=x.ori==0?v:(U,we,Ve,Sn,un,Vt,dn)=>{v(U,we,Ve,un,Sn,dn,Vt)},ee=fe(b.bands,ho).find(U=>U.series[0]==S),K=ee!=null?ee.dir:0,Pe=T.fillTo(b,S,T.min,T.max,K),Ye=j(P(Pe,y,M,q)),_e,oe,ct,Ce=R,ye=j(T.width*me),_t=!1,Ct=null,Qe=null,Nt=null,Gt=null;p!=null&&(ye==0||h!=null)&&(_t=!0,Ct=p.values(b,S,D,w),Qe=new Map,new Set(Ct).forEach(U=>{U!=null&&Qe.set(U,new Path2D)}),ye>0&&(Nt=h.values(b,S,D,w),Gt=new Map,new Set(Nt).forEach(U=>{U!=null&&Gt.set(U,new Path2D)})));let{x0:Kt,size:Zt}=d;if(Kt!=null&&Zt!=null){N=1,k=Kt.values(b,S,D,w),Kt.unit==2&&(k=k.map(Ve=>b.posToVal(O+Ve*R,x.key,!0)));let U=Zt.values(b,S,D,w);Zt.unit==2?oe=U[0]*R:oe=E(U[0],x,R,O)-E(0,x,R,O),Ce=or(k,A,E,x,R,O,Ce),ct=Ce-oe+G}else Ce=or(k,A,E,x,R,O,Ce),ct=Ce*r+G,oe=Ce-ct;ct<1&&(ct=0),ye>=oe/2&&(ye=0),ct<5&&(j=Ur);let ne=ct>0,Oe=Ce-ct-(ne?ye:0);oe=j(Zs(Oe,V,B)),_e=(N==0?oe/2:N==ce?0:oe)-N*ce*((N==0?G/2:0)+(ne?ye/2:0));const Re={stroke:null,fill:null,clip:null,band:null,gaps:null,flags:0},Ze=_t?null:new Path2D;let yt=null;if(ee!=null)yt=b.data[ee.series[1]];else{let{y0:U,y1:we}=d;U!=null&&we!=null&&(A=we.values(b,S,D,w),yt=U.values(b,S,D,w))}let cn=F*oe,te=De*oe;for(let U=ce==1?D:w;U>=D&&U<=w;U+=ce){let we=A[U];if(we==null)continue;if(yt!=null){let ut=yt[U]??0;if(we-ut==0)continue;Ye=P(ut,y,M,q)}let Ve=x.distr!=2||d!=null?k[U]:U,Sn=E(Ve,x,R,O),un=P(fe(we,Pe),y,M,q),Vt=j(Sn-_e),dn=j(it(un,Ye)),ft=j(It(un,Ye)),wt=dn-ft;if(we!=null){let ut=we<0?te:cn,At=we<0?cn:te;_t?(ye>0&&Nt[U]!=null&&ae(Gt.get(Nt[U]),Vt,ft+$t(ye/2),oe,it(0,wt-ye),ut,At),Ct[U]!=null&&ae(Qe.get(Ct[U]),Vt,ft+$t(ye/2),oe,it(0,wt-ye),ut,At)):ae(Ze,Vt,ft+$t(ye/2),oe,it(0,wt-ye),ut,At),ue(b,S,U,Vt-ye/2,ft,oe+ye,wt)}}return ye>0?Re.stroke=_t?Gt:Ze:_t||(Re._fill=T.width==0?T._fill:T._stroke??T._fill,Re.width=0),Re.fill=_t?Qe:Ze,Re})}function $f(e,t){const l=fe(t==null?void 0:t.alignGaps,0);return(n,s,o,r)=>kn(n,s,(a,c,d,v,p,h,b,S,D,w,T)=>{[o,r]=es(d,o,r);let k=a.pxRound,A=F=>k(h(F,v,w,S)),x=F=>k(b(F,p,T,D)),y,E,P;v.ori==0?(y=os,P=el,E=va):(y=is,P=tl,E=ga);const O=v.dir*(v.ori==0?1:-1);let q=A(c[O==1?o:r]),R=q,M=[],j=[];for(let F=O==1?o:r;F>=o&&F<=r;F+=O)if(d[F]!=null){let ce=c[F],ae=A(ce);M.push(R=ae),j.push(x(d[F]))}const N={stroke:e(M,j,y,P,E,k),fill:null,clip:null,band:null,gaps:null,flags:Zn},G=N.stroke;let[B,V]=_o(n,s);if(a.fill!=null||B!=0){let F=N.fill=new Path2D(G),De=a.fillTo(n,s,a.min,a.max,B),ce=x(De);P(F,R,ce),P(F,q,ce)}if(!a.spanGaps){let F=[];F.push(...yo(c,d,o,r,O,A,l)),N.gaps=F=a.gaps(n,s,o,r,F),N.clip=ss(F,v.ori,S,D,w,T)}return V!=0&&(N.band=V==2?[Jt(n,s,o,r,G,-1),Jt(n,s,o,r,G,1)]:Jt(n,s,o,r,G,V)),N})}function bf(e){return $f(_f,e)}function _f(e,t,l,n,s,o){const r=e.length;if(r<2)return null;const a=new Path2D;if(l(a,e[0],t[0]),r==2)n(a,e[1],t[1]);else{let c=Array(r),d=Array(r-1),v=Array(r-1),p=Array(r-1);for(let h=0;h<r-1;h++)v[h]=t[h+1]-t[h],p[h]=e[h+1]-e[h],d[h]=v[h]/p[h];c[0]=d[0];for(let h=1;h<r-1;h++)d[h]===0||d[h-1]===0||d[h-1]>0!=d[h]>0?c[h]=0:(c[h]=3*(p[h-1]+p[h])/((2*p[h]+p[h-1])/d[h-1]+(p[h]+2*p[h-1])/d[h]),isFinite(c[h])||(c[h]=0));c[r-1]=d[r-2];for(let h=0;h<r-1;h++)s(a,e[h]+p[h]/3,t[h]+c[h]*p[h]/3,e[h+1]-p[h]/3,t[h+1]-c[h+1]*p[h]/3,e[h+1],t[h+1])}return a}const no=new Set;function ir(){for(let e of no)e.syncRect(!0)}Xn&&(yn(Xu,Kn,ir),yn(ed,Kn,ir,!0),yn(Wl,Kn,()=>{tt.pxRatio=me}));const yf=_a(),wf=$a();function rr(e,t,l,n){return(n?[e[0],e[1]].concat(e.slice(2)):[e[0]].concat(e.slice(1))).map((o,r)=>lo(o,r,t,l))}function kf(e,t){return e.map((l,n)=>n==0?{}:Ne({},t,l))}function lo(e,t,l,n){return Ne({},t==0?l:n,e)}function ya(e,t,l){return t==null?Jn:[t,l]}const Sf=ya;function xf(e,t,l){return t==null?Jn:jl(t,l,po,!0)}function wa(e,t,l,n){return t==null?Jn:ts(t,l,e.scales[n].log,!1)}const Ef=wa;function ka(e,t,l,n){return t==null?Jn:fo(t,l,e.scales[n].log,!1)}const Tf=ka;function Mf(e,t,l,n,s){let o=it(Fi(e),Fi(t)),r=t-e,a=Rt(s/n*r,l);do{let c=l[a],d=n*c/r;if(d>=s&&o+(c<5?an.get(c):0)<=17)return[c,d]}while(++a<l.length);return[0,0]}function ar(e){let t,l;return e=e.replace(/(\d+)px/,(n,s)=>(t=Fe((l=+s)*me))+"px"),[e,t,l]}function Cf(e){e.show&&[e.font,e.labelFont].forEach(t=>{let l=be(t[2]*me,1);t[0]=t[0].replace(/[0-9.]+px/,l+"px"),t[1]=l})}function tt(e,t,l){const n={mode:fe(e.mode,1)},s=n.mode;function o(i,u,f,m){let $=u.valToPct(i);return m+f*(u.dir==-1?1-$:$)}function r(i,u,f,m){let $=u.valToPct(i);return m+f*(u.dir==-1?$:1-$)}function a(i,u,f,m){return u.ori==0?o(i,u,f,m):r(i,u,f,m)}n.valToPosH=o,n.valToPosV=r;let c=!1;n.status=0;const d=n.root=Tt(Ru);if(e.id!=null&&(d.id=e.id),vt(d,e.class),e.title){let i=Tt(Vu,d);i.textContent=e.title}const v=Ot("canvas"),p=n.ctx=v.getContext("2d"),h=Tt(Fu,d);yn("click",h,i=>{i.target===S&&(ke!=Rn||Te!=In)&&Je.click(n,i)},!0);const b=n.under=Tt(zu,h);h.appendChild(v);const S=n.over=Tt(Hu,h);e=Qn(e);const D=+fe(e.pxAlign,1),w=sr(D);(e.plugins||[]).forEach(i=>{i.opts&&(e=i.opts(n,e)||e)});const T=e.ms||.001,k=n.series=s==1?rr(e.series||[],Qi,nr,!1):kf(e.series||[null],tr),A=n.axes=rr(e.axes||[],Ji,Xi,!0),x=n.scales={},y=n.bands=e.bands||[];y.forEach(i=>{i.fill=se(i.fill||null),i.dir=fe(i.dir,-1)});const E=s==2?k[1].facets[0].scale:k[0].scale,P={axes:Ua,series:Va},O=(e.drawOrder||["axes","series"]).map(i=>P[i]);function q(i){const u=i.distr==3?f=>qt(f>0?f:i.clamp(n,f,i.min,i.max,i.key)):i.distr==4?f=>Vs(f,i.asinh):i.distr==100?f=>i.fwd(f):f=>f;return f=>{let m=u(f),{_min:$,_max:_}=i,C=_-$;return(m-$)/C}}function R(i){let u=x[i];if(u==null){let f=(e.scales||$l)[i]||$l;if(f.from!=null){R(f.from);let m=Ne({},x[f.from],f,{key:i});m.valToPct=q(m),x[i]=m}else{u=x[i]=Ne({},i==E?da:df,f),u.key=i;let m=u.time,$=u.range,_=on($);if((i!=E||s==2&&!m)&&(_&&($[0]==null||$[1]==null)&&($={min:$[0]==null?Ii:{mode:1,hard:$[0],soft:$[0]},max:$[1]==null?Ii:{mode:1,hard:$[1],soft:$[1]}},_=!1),!_&&ls($))){let C=$;$=(L,I,z)=>I==null?Jn:jl(I,z,C)}u.range=se($||(m?Sf:i==E?u.distr==3?Ef:u.distr==4?Tf:ya:u.distr==3?wa:u.distr==4?ka:xf)),u.auto=se(_?!1:u.auto),u.clamp=se(u.clamp||uf),u._min=u._max=null,u.valToPct=q(u)}}}R("x"),R("y"),s==1&&k.forEach(i=>{R(i.scale)}),A.forEach(i=>{R(i.scale)});for(let i in e.scales)R(i);const M=x[E],j=M.distr;let N,G;M.ori==0?(vt(d,Iu),N=o,G=r):(vt(d,Nu),N=r,G=o);const B={};for(let i in x){let u=x[i];(u.min!=null||u.max!=null)&&(B[i]={min:u.min,max:u.max},u.min=u.max=null)}const V=e.tzDate||(i=>new Date(Fe(i/T))),F=e.fmtDate||vo,De=T==1?Id(V):Fd(V),ce=Ki(V,Gi(T==1?Rd:Vd,F)),ae=qi(V,Yi(Hd,F)),ue=[],ee=n.legend=Ne({},Wd,e.legend),K=n.cursor=Ne({},Jd,{drag:{y:s==2}},e.cursor),Pe=ee.show,Ye=K.show,_e=ee.markers;ee.idxs=ue,_e.width=se(_e.width),_e.dash=se(_e.dash),_e.stroke=se(_e.stroke),_e.fill=se(_e.fill);let oe,ct,Ce,ye=[],_t=[],Ct,Qe=!1,Nt={};if(ee.live){const i=k[1]?k[1].values:null;Qe=i!=null,Ct=Qe?i(n,1,0):{_:0};for(let u in Ct)Nt[u]=co}if(Pe)if(oe=Ot("table",Ku,d),Ce=Ot("tbody",null,oe),ee.mount(n,oe),Qe){ct=Ot("thead",null,oe,Ce);let i=Ot("tr",null,ct);Ot("th",null,i);for(var Gt in Ct)Ot("th",ki,i).textContent=Gt}else vt(oe,qu),ee.live&&vt(oe,Yu);const Kt={show:!0},Zt={show:!1};function ne(i,u){if(u==0&&(Qe||!ee.live||s==2))return Jn;let f=[],m=Ot("tr",Ju,Ce,Ce.childNodes[u]);vt(m,i.class),i.show||vt(m,_n);let $=Ot("th",null,m);if(_e.show){let L=Tt(Qu,$);if(u>0){let I=_e.width(n,u);I&&(L.style.border=I+"px "+_e.dash(n,u)+" "+_e.stroke(n,u)),L.style.background=_e.fill(n,u)}}let _=Tt(ki,$);i.label instanceof HTMLElement?_.appendChild(i.label):_.textContent=i.label,u>0&&(_e.show||(_.style.color=i.width>0?_e.stroke(n,u):_e.fill(n,u)),Re("click",$,L=>{if(K._lock)return;pn(L);let I=k.indexOf(i);if((L.ctrlKey||L.metaKey)!=ee.isolate){let z=k.some((H,W)=>W>0&&W!=I&&H.show);k.forEach((H,W)=>{W>0&&zt(W,z?W==I?Kt:Zt:Kt,!0,Ie.setSeries)})}else zt(I,{show:!i.show},!0,Ie.setSeries)},!1),En&&Re(Ti,$,L=>{K._lock||(pn(L),zt(k.indexOf(i),Vn,!0,Ie.setSeries))},!1));for(var C in Ct){let L=Ot("td",Zu,m);L.textContent="--",f.push(L)}return[m,f]}const Oe=new Map;function Re(i,u,f,m=!0){const $=Oe.get(u)||{},_=K.bind[i](n,u,f,m);_&&(yn(i,u,$[i]=_),Oe.set(u,$))}function Ze(i,u,f){const m=Oe.get(u)||{};for(let $ in m)(i==null||$==i)&&(Qs($,u,m[$]),delete m[$]);i==null&&Oe.delete(u)}let yt=0,cn=0,te=0,U=0,we=0,Ve=0,Sn=we,un=Ve,Vt=te,dn=U,ft=0,wt=0,ut=0,At=0;n.bbox={};let as=!1,Sl=!1,xn=!1,fn=!1,xl=!1,kt=!1;function cs(i,u,f){(f||i!=n.width||u!=n.height)&&xo(i,u),Ln(!1),xn=!0,Sl=!0,Dn()}function xo(i,u){n.width=yt=te=i,n.height=cn=U=u,we=Ve=0,La(),Da();let f=n.bbox;ft=f.left=$n(we*me,.5),wt=f.top=$n(Ve*me,.5),ut=f.width=$n(te*me,.5),At=f.height=$n(U*me,.5)}const Ma=3;function Ca(){let i=!1,u=0;for(;!i;){u++;let f=Ha(u),m=Ba(u);i=u==Ma||f&&m,i||(xo(n.width,n.height),Sl=!0)}}function Aa({width:i,height:u}){cs(i,u)}n.setSize=Aa;function La(){let i=!1,u=!1,f=!1,m=!1;A.forEach(($,_)=>{if($.show&&$._show){let{side:C,_size:L}=$,I=C%2,z=$.label!=null?$.labelSize:0,H=L+z;H>0&&(I?(te-=H,C==3?(we+=H,m=!0):f=!0):(U-=H,C==0?(Ve+=H,i=!0):u=!0))}}),mn[0]=i,mn[1]=f,mn[2]=u,mn[3]=m,te-=Xt[1]+Xt[3],we+=Xt[3],U-=Xt[2]+Xt[0],Ve+=Xt[0]}function Da(){let i=we+te,u=Ve+U,f=we,m=Ve;function $(_,C){switch(_){case 1:return i+=C,i-C;case 2:return u+=C,u-C;case 3:return f-=C,f+C;case 0:return m-=C,m+C}}A.forEach((_,C)=>{if(_.show&&_._show){let L=_.side;_._pos=$(L,_._size),_.label!=null&&(_._lpos=$(L,_.labelSize))}})}if(K.dataIdx==null){let i=K.hover,u=i.skip=new Set(i.skip??[]);u.add(void 0);let f=i.prox=se(i.prox),m=i.bias??(i.bias=0);K.dataIdx=($,_,C,L)=>{if(_==0)return C;let I=C,z=f($,_,C,L)??$e,H=z>=0&&z<$e,W=M.ori==0?te:U,Q=K.left,pe=t[0],de=t[_];if(u.has(de[C])){I=null;let le=null,J=null,Y;if(m==0||m==-1)for(Y=C;le==null&&Y-- >0;)u.has(de[Y])||(le=Y);if(m==0||m==1)for(Y=C;J==null&&Y++<de.length;)u.has(de[Y])||(J=Y);if(le!=null||J!=null)if(H){let xe=le==null?-1/0:N(pe[le],M,W,0),Ae=J==null?1/0:N(pe[J],M,W,0),Ke=Q-xe,ve=Ae-Q;Ke<=ve?Ke<=z&&(I=le):ve<=z&&(I=J)}else I=J==null?le:le==null?J:C-le<=J-C?le:J}else H&&ze(Q-N(pe[C],M,W,0))>z&&(I=null);return I}}const pn=i=>{K.event=i};K.idxs=ue,K._lock=!1;let Xe=K.points;Xe.show=se(Xe.show),Xe.size=se(Xe.size),Xe.stroke=se(Xe.stroke),Xe.width=se(Xe.width),Xe.fill=se(Xe.fill);const Ft=n.focus=Ne({},e.focus||{alpha:.3},K.focus),En=Ft.prox>=0,Tn=En&&Xe.one;let St=[],Mn=[],Cn=[];function Eo(i,u){let f=Xe.show(n,u);if(f instanceof HTMLElement)return vt(f,Gu),vt(f,i.class),Wt(f,-10,-10,te,U),S.insertBefore(f,St[u]),f}function To(i,u){if(s==1||u>0){let f=s==1&&x[i.scale].time,m=i.value;i.value=f?Bi(m)?qi(V,Yi(m,F)):m||ae:m||rf,i.label=i.label||(f?Zd:Qd)}if(Tn||u>0){i.width=i.width==null?1:i.width,i.paths=i.paths||yf||ud,i.fillTo=se(i.fillTo||ff),i.pxAlign=+fe(i.pxAlign,D),i.pxRound=sr(i.pxAlign),i.stroke=se(i.stroke||null),i.fill=se(i.fill||null),i._stroke=i._fill=i._paths=i._focus=null;let f=af(it(1,i.width),1),m=i.points=Ne({},{size:f,width:it(1,f*.2),stroke:i.stroke,space:f*2,paths:wf,_stroke:null,_fill:null},i.points);m.show=se(m.show),m.filter=se(m.filter),m.fill=se(m.fill),m.stroke=se(m.stroke),m.paths=se(m.paths),m.pxAlign=i.pxAlign}if(Pe){let f=ne(i,u);ye.splice(u,0,f[0]),_t.splice(u,0,f[1]),ee.values.push(null)}if(Ye){ue.splice(u,0,null);let f=null;Tn?u==0&&(f=Eo(i,u)):u>0&&(f=Eo(i,u)),St.splice(u,0,f),Mn.splice(u,0,0),Cn.splice(u,0,0)}Ge("addSeries",u)}function Pa(i,u){u=u??k.length,i=s==1?lo(i,u,Qi,nr):lo(i,u,{},tr),k.splice(u,0,i),To(k[u],u)}n.addSeries=Pa;function Oa(i){if(k.splice(i,1),Pe){ee.values.splice(i,1),_t.splice(i,1);let u=ye.splice(i,1)[0];Ze(null,u.firstChild),u.remove()}Ye&&(ue.splice(i,1),St.splice(i,1)[0].remove(),Mn.splice(i,1),Cn.splice(i,1)),Ge("delSeries",i)}n.delSeries=Oa;const mn=[!1,!1,!1,!1];function Ra(i,u){if(i._show=i.show,i.show){let f=i.side%2,m=x[i.scale];m==null&&(i.scale=f?k[1].scale:E,m=x[i.scale]);let $=m.time;i.size=se(i.size),i.space=se(i.space),i.rotate=se(i.rotate),on(i.incrs)&&i.incrs.forEach(C=>{!an.has(C)&&an.set(C,Gr(C))}),i.incrs=se(i.incrs||(m.distr==2?Dd:$?T==1?Od:Nd:bn)),i.splits=se(i.splits||($&&m.distr==1?De:m.distr==3?Xs:m.distr==4?tf:ef)),i.stroke=se(i.stroke),i.grid.stroke=se(i.grid.stroke),i.ticks.stroke=se(i.ticks.stroke),i.border.stroke=se(i.border.stroke);let _=i.values;i.values=on(_)&&!on(_[0])?se(_):$?on(_)?Ki(V,Gi(_,F)):Bi(_)?zd(V,_):_||ce:_||Xd,i.filter=se(i.filter||(m.distr>=3&&m.log==10?sf:m.distr==3&&m.log==2?of:Wr)),i.font=ar(i.font),i.labelFont=ar(i.labelFont),i._size=i.size(n,null,u,0),i._space=i._rotate=i._incrs=i._found=i._splits=i._values=null,i._size>0&&(mn[u]=!0,i._el=Tt(Bu,h))}}function nl(i,u,f,m){let[$,_,C,L]=f,I=u%2,z=0;return I==0&&(L||_)&&(z=u==0&&!$||u==2&&!C?Fe(Ji.size/3):0),I==1&&($||C)&&(z=u==1&&!_||u==3&&!L?Fe(Xi.size/2):0),z}const Mo=n.padding=(e.padding||[nl,nl,nl,nl]).map(i=>se(fe(i,nl))),Xt=n._padding=Mo.map((i,u)=>i(n,u,mn,0));let qe,Be=null,Ue=null;const El=s==1?k[0].idxs:null;let Lt=null,ll=!1;function Co(i,u){if(t=i??[],n.data=n._data=t,s==2){qe=0;for(let f=1;f<k.length;f++)qe+=t[f][0].length}else{t.length==0&&(n.data=n._data=t=[[]]),Lt=t[0],qe=Lt.length;let f=t;if(j==2){f=t.slice();let m=f[0]=Array(qe);for(let $=0;$<qe;$++)m[$]=$}n._data=t=f}if(Ln(!0),Ge("setData"),j==2&&(xn=!0),u!==!1){let f=M;f.auto(n,ll)?us():tn(E,f.min,f.max),fn=fn||K.left>=0,kt=!0,Dn()}}n.setData=Co;function us(){ll=!0;let i,u;s==1&&(qe>0?(Be=El[0]=0,Ue=El[1]=qe-1,i=t[0][Be],u=t[0][Ue],j==2?(i=Be,u=Ue):i==u&&(j==3?[i,u]=ts(i,i,M.log,!1):j==4?[i,u]=fo(i,i,M.log,!1):M.time?u=i+Fe(86400/T):[i,u]=jl(i,u,po,!0))):(Be=El[0]=i=null,Ue=El[1]=u=null)),tn(E,i,u)}let Tl,An,ds,fs,ps,ms,hs,vs,gs,dt;function Ao(i,u,f,m,$,_){i??(i=xi),f??(f=ho),m??(m="butt"),$??($=xi),_??(_="round"),i!=Tl&&(p.strokeStyle=Tl=i),$!=An&&(p.fillStyle=An=$),u!=ds&&(p.lineWidth=ds=u),_!=ps&&(p.lineJoin=ps=_),m!=ms&&(p.lineCap=ms=m),f!=fs&&p.setLineDash(fs=f)}function Lo(i,u,f,m){u!=An&&(p.fillStyle=An=u),i!=hs&&(p.font=hs=i),f!=vs&&(p.textAlign=vs=f),m!=gs&&(p.textBaseline=gs=m)}function $s(i,u,f,m,$=0){if(m.length>0&&i.auto(n,ll)&&(u==null||u.min==null)){let _=fe(Be,0),C=fe(Ue,m.length-1),L=f.min==null?sd(m,_,C,$,i.distr==3):[f.min,f.max];i.min=It(i.min,f.min=L[0]),i.max=it(i.max,f.max=L[1])}}const Do={min:null,max:null};function Ia(){for(let m in x){let $=x[m];B[m]==null&&($.min==null||B[E]!=null&&$.auto(n,ll))&&(B[m]=Do)}for(let m in x){let $=x[m];B[m]==null&&$.from!=null&&B[$.from]!=null&&(B[m]=Do)}B[E]!=null&&Ln(!0);let i={};for(let m in B){let $=B[m];if($!=null){let _=i[m]=Qn(x[m],pd);if($.min!=null)Ne(_,$);else if(m!=E||s==2)if(qe==0&&_.from==null){let C=_.range(n,null,null,m);_.min=C[0],_.max=C[1]}else _.min=$e,_.max=-$e}}if(qe>0){k.forEach((m,$)=>{if(s==1){let _=m.scale,C=B[_];if(C==null)return;let L=i[_];if($==0){let I=L.range(n,L.min,L.max,_);L.min=I[0],L.max=I[1],Be=Rt(L.min,t[0]),Ue=Rt(L.max,t[0]),Ue-Be>1&&(t[0][Be]<L.min&&Be++,t[0][Ue]>L.max&&Ue--),m.min=Lt[Be],m.max=Lt[Ue]}else m.show&&m.auto&&$s(L,C,m,t[$],m.sorted);m.idxs[0]=Be,m.idxs[1]=Ue}else if($>0&&m.show&&m.auto){let[_,C]=m.facets,L=_.scale,I=C.scale,[z,H]=t[$],W=i[L],Q=i[I];W!=null&&$s(W,B[L],_,z,_.sorted),Q!=null&&$s(Q,B[I],C,H,C.sorted),m.min=C.min,m.max=C.max}});for(let m in i){let $=i[m],_=B[m];if($.from==null&&(_==null||_.min==null)){let C=$.range(n,$.min==$e?null:$.min,$.max==-$e?null:$.max,m);$.min=C[0],$.max=C[1]}}}for(let m in i){let $=i[m];if($.from!=null){let _=i[$.from];if(_.min==null)$.min=$.max=null;else{let C=$.range(n,_.min,_.max,m);$.min=C[0],$.max=C[1]}}}let u={},f=!1;for(let m in i){let $=i[m],_=x[m];if(_.min!=$.min||_.max!=$.max){_.min=$.min,_.max=$.max;let C=_.distr;_._min=C==3?qt(_.min):C==4?Vs(_.min,_.asinh):C==100?_.fwd(_.min):_.min,_._max=C==3?qt(_.max):C==4?Vs(_.max,_.asinh):C==100?_.fwd(_.max):_.max,u[m]=f=!0}}if(f){k.forEach((m,$)=>{s==2?$>0&&u.y&&(m._paths=null):u[m.scale]&&(m._paths=null)});for(let m in u)xn=!0,Ge("setScale",m);Ye&&K.left>=0&&(fn=kt=!0)}for(let m in B)B[m]=null}function Na(i){let u=Zs(Be-1,0,qe-1),f=Zs(Ue+1,0,qe-1);for(;i[u]==null&&u>0;)u--;for(;i[f]==null&&f<qe-1;)f++;return[u,f]}function Va(){if(qe>0){let i=k.some(u=>u._focus)&&dt!=Ft.alpha;i&&(p.globalAlpha=dt=Ft.alpha),k.forEach((u,f)=>{if(f>0&&u.show&&(Po(f,!1),Po(f,!0),u._paths==null)){let m=dt;dt!=u.alpha&&(p.globalAlpha=dt=u.alpha);let $=s==2?[0,t[f][0].length-1]:Na(t[f]);u._paths=u.paths(n,f,$[0],$[1]),dt!=m&&(p.globalAlpha=dt=m)}}),k.forEach((u,f)=>{if(f>0&&u.show){let m=dt;dt!=u.alpha&&(p.globalAlpha=dt=u.alpha),u._paths!=null&&Oo(f,!1);{let $=u._paths!=null?u._paths.gaps:null,_=u.points.show(n,f,Be,Ue,$),C=u.points.filter(n,f,_,$);(_||C)&&(u.points._paths=u.points.paths(n,f,Be,Ue,C),Oo(f,!0))}dt!=m&&(p.globalAlpha=dt=m),Ge("drawSeries",f)}}),i&&(p.globalAlpha=dt=1)}}function Po(i,u){let f=u?k[i].points:k[i];f._stroke=f.stroke(n,i),f._fill=f.fill(n,i)}function Oo(i,u){let f=u?k[i].points:k[i],{stroke:m,fill:$,clip:_,flags:C,_stroke:L=f._stroke,_fill:I=f._fill,_width:z=f.width}=f._paths;z=be(z*me,3);let H=null,W=z%2/2;u&&I==null&&(I=z>0?"#fff":L);let Q=f.pxAlign==1&&W>0;if(Q&&p.translate(W,W),!u){let pe=ft-z/2,de=wt-z/2,le=ut+z,J=At+z;H=new Path2D,H.rect(pe,de,le,J)}u?bs(L,z,f.dash,f.cap,I,m,$,C,_):Fa(i,L,z,f.dash,f.cap,I,m,$,C,H,_),Q&&p.translate(-W,-W)}function Fa(i,u,f,m,$,_,C,L,I,z,H){let W=!1;I!=0&&y.forEach((Q,pe)=>{if(Q.series[0]==i){let de=k[Q.series[1]],le=t[Q.series[1]],J=(de._paths||$l).band;on(J)&&(J=Q.dir==1?J[0]:J[1]);let Y,xe=null;de.show&&J&&id(le,Be,Ue)?(xe=Q.fill(n,pe)||_,Y=de._paths.clip):J=null,bs(u,f,m,$,xe,C,L,I,z,H,Y,J),W=!0}}),W||bs(u,f,m,$,_,C,L,I,z,H)}const Ro=Zn|to;function bs(i,u,f,m,$,_,C,L,I,z,H,W){Ao(i,u,f,m,$),(I||z||W)&&(p.save(),I&&p.clip(I),z&&p.clip(z)),W?(L&Ro)==Ro?(p.clip(W),H&&p.clip(H),Cl($,C),Ml(i,_,u)):L&to?(Cl($,C),p.clip(W),Ml(i,_,u)):L&Zn&&(p.save(),p.clip(W),H&&p.clip(H),Cl($,C),p.restore(),Ml(i,_,u)):(Cl($,C),Ml(i,_,u)),(I||z||W)&&p.restore()}function Ml(i,u,f){f>0&&(u instanceof Map?u.forEach((m,$)=>{p.strokeStyle=Tl=$,p.stroke(m)}):u!=null&&i&&p.stroke(u))}function Cl(i,u){u instanceof Map?u.forEach((f,m)=>{p.fillStyle=An=m,p.fill(f)}):u!=null&&i&&p.fill(u)}function za(i,u,f,m){let $=A[i],_;if(m<=0)_=[0,0];else{let C=$._space=$.space(n,i,u,f,m),L=$._incrs=$.incrs(n,i,u,f,m,C);_=Mf(u,f,L,m,C)}return $._found=_}function _s(i,u,f,m,$,_,C,L,I,z){let H=C%2/2;D==1&&p.translate(H,H),Ao(L,C,I,z,L),p.beginPath();let W,Q,pe,de,le=$+(m==0||m==3?-_:_);f==0?(Q=$,de=le):(W=$,pe=le);for(let J=0;J<i.length;J++)u[J]!=null&&(f==0?W=pe=i[J]:Q=de=i[J],p.moveTo(W,Q),p.lineTo(pe,de));p.stroke(),D==1&&p.translate(-H,-H)}function Ha(i){let u=!0;return A.forEach((f,m)=>{if(!f.show)return;let $=x[f.scale];if($.min==null){f._show&&(u=!1,f._show=!1,Ln(!1));return}else f._show||(u=!1,f._show=!0,Ln(!1));let _=f.side,C=_%2,{min:L,max:I}=$,[z,H]=za(m,L,I,C==0?te:U);if(H==0)return;let W=$.distr==2,Q=f._splits=f.splits(n,m,L,I,z,H,W),pe=$.distr==2?Q.map(Y=>Lt[Y]):Q,de=$.distr==2?Lt[Q[1]]-Lt[Q[0]]:z,le=f._values=f.values(n,f.filter(n,pe,m,H,de),m,H,de);f._rotate=_==2?f.rotate(n,le,m,H):0;let J=f._size;f._size=Mt(f.size(n,le,m,i)),J!=null&&f._size!=J&&(u=!1)}),u}function Ba(i){let u=!0;return Mo.forEach((f,m)=>{let $=f(n,m,mn,i);$!=Xt[m]&&(u=!1),Xt[m]=$}),u}function Ua(){for(let i=0;i<A.length;i++){let u=A[i];if(!u.show||!u._show)continue;let f=u.side,m=f%2,$,_,C=u.stroke(n,i),L=f==0||f==3?-1:1,[I,z]=u._found;if(u.label!=null){let lt=u.labelGap*L,ht=Fe((u._lpos+lt)*me);Lo(u.labelFont[0],C,"center",f==2?ul:Si),p.save(),m==1?($=_=0,p.translate(ht,Fe(wt+At/2)),p.rotate((f==3?-zl:zl)/2)):($=Fe(ft+ut/2),_=ht);let gn=Br(u.label)?u.label(n,i,I,z):u.label;p.fillText(gn,$,_),p.restore()}if(z==0)continue;let H=x[u.scale],W=m==0?ut:At,Q=m==0?ft:wt,pe=u._splits,de=H.distr==2?pe.map(lt=>Lt[lt]):pe,le=H.distr==2?Lt[pe[1]]-Lt[pe[0]]:I,J=u.ticks,Y=u.border,xe=J.show?J.size:0,Ae=Fe(xe*me),Ke=Fe((u.alignTo==2?u._size-xe-u.gap:u.gap)*me),ve=u._rotate*-zl/180,Le=w(u._pos*me),pt=(Ae+Ke)*L,nt=Le+pt;_=m==0?nt:0,$=m==1?nt:0;let xt=u.font[0],Dt=u.align==1?Hn:u.align==2?Rs:ve>0?Hn:ve<0?Rs:m==0?"center":f==3?Rs:Hn,Bt=ve||m==1?"middle":f==2?ul:Si;Lo(xt,C,Dt,Bt);let mt=u.font[1]*u.lineGap,Et=pe.map(lt=>w(a(lt,H,W,Q))),Pt=u._values;for(let lt=0;lt<Pt.length;lt++){let ht=Pt[lt];if(ht!=null){m==0?$=Et[lt]:_=Et[lt],ht=""+ht;let gn=ht.indexOf(`
`)==-1?[ht]:ht.split(/\n/gm);for(let st=0;st<gn.length;st++){let ei=gn[st];ve?(p.save(),p.translate($,_+st*mt),p.rotate(ve),p.fillText(ei,0,0),p.restore()):p.fillText(ei,$,_+st*mt)}}}J.show&&_s(Et,J.filter(n,de,i,z,le),m,f,Le,Ae,be(J.width*me,3),J.stroke(n,i),J.dash,J.cap);let Ut=u.grid;Ut.show&&_s(Et,Ut.filter(n,de,i,z,le),m,m==0?2:1,m==0?wt:ft,m==0?At:ut,be(Ut.width*me,3),Ut.stroke(n,i),Ut.dash,Ut.cap),Y.show&&_s([Le],[1],m==0?1:0,m==0?1:2,m==1?wt:ft,m==1?At:ut,be(Y.width*me,3),Y.stroke(n,i),Y.dash,Y.cap)}Ge("drawAxes")}function Ln(i){k.forEach((u,f)=>{f>0&&(u._paths=null,i&&(s==1?(u.min=null,u.max=null):u.facets.forEach(m=>{m.min=null,m.max=null})))})}let Al=!1,ys=!1,sl=[];function Wa(){ys=!1;for(let i=0;i<sl.length;i++)Ge(...sl[i]);sl.length=0}function Dn(){Al||(_d(Io),Al=!0)}function ja(i,u=!1){Al=!0,ys=u,i(n),Io(),u&&sl.length>0&&queueMicrotask(Wa)}n.batch=ja;function Io(){if(as&&(Ia(),as=!1),xn&&(Ca(),xn=!1),Sl){if(Ee(b,Hn,we),Ee(b,ul,Ve),Ee(b,pl,te),Ee(b,ml,U),Ee(S,Hn,we),Ee(S,ul,Ve),Ee(S,pl,te),Ee(S,ml,U),Ee(h,pl,yt),Ee(h,ml,cn),v.width=Fe(yt*me),v.height=Fe(cn*me),A.forEach(({_el:i,_show:u,_size:f,_pos:m,side:$})=>{if(i!=null)if(u){let _=$===3||$===0?f:0,C=$%2==1;Ee(i,C?"left":"top",m-_),Ee(i,C?"width":"height",f),Ee(i,C?"top":"left",C?Ve:we),Ee(i,C?"height":"width",C?U:te),Js(i,_n)}else vt(i,_n)}),Tl=An=ds=ps=ms=hs=vs=gs=fs=null,dt=1,rl(!0),we!=Sn||Ve!=un||te!=Vt||U!=dn){Ln(!1);let i=te/Vt,u=U/dn;if(Ye&&!fn&&K.left>=0){K.left*=i,K.top*=u,Pn&&Wt(Pn,Fe(K.left),0,te,U),On&&Wt(On,0,Fe(K.top),te,U);for(let f=0;f<St.length;f++){let m=St[f];m!=null&&(Mn[f]*=i,Cn[f]*=u,Wt(m,Mt(Mn[f]),Mt(Cn[f]),te,U))}}if(Se.show&&!xl&&Se.left>=0&&Se.width>0){Se.left*=i,Se.width*=i,Se.top*=u,Se.height*=u;for(let f in Ts)Ee(Nn,f,Se[f])}Sn=we,un=Ve,Vt=te,dn=U}Ge("setSize"),Sl=!1}yt>0&&cn>0&&(p.clearRect(0,0,v.width,v.height),Ge("drawClear"),O.forEach(i=>i()),Ge("draw")),Se.show&&xl&&(Ll(Se),xl=!1),Ye&&fn&&(vn(null,!0,!1),fn=!1),ee.show&&ee.live&&kt&&(xs(),kt=!1),c||(c=!0,n.status=1,Ge("ready")),ll=!1,Al=!1}n.redraw=(i,u)=>{xn=u||!1,i!==!1?tn(E,M.min,M.max):Dn()};function ws(i,u){let f=x[i];if(f.from==null){if(qe==0){let m=f.range(n,u.min,u.max,i);u.min=m[0],u.max=m[1]}if(u.min>u.max){let m=u.min;u.min=u.max,u.max=m}if(qe>1&&u.min!=null&&u.max!=null&&u.max-u.min<1e-16)return;i==E&&f.distr==2&&qe>0&&(u.min=Rt(u.min,t[0]),u.max=Rt(u.max,t[0]),u.min==u.max&&u.max++),B[i]=u,as=!0,Dn()}}n.setScale=ws;let ks,Ss,Pn,On,No,Vo,Rn,In,Fo,zo,ke,Te,en=!1;const Je=K.drag;let We=Je.x,je=Je.y;Ye&&(K.x&&(ks=Tt(Wu,S)),K.y&&(Ss=Tt(ju,S)),M.ori==0?(Pn=ks,On=Ss):(Pn=Ss,On=ks),ke=K.left,Te=K.top);const Se=n.select=Ne({show:!0,over:!0,left:0,width:0,top:0,height:0},e.select),Nn=Se.show?Tt(Uu,Se.over?S:b):null;function Ll(i,u){if(Se.show){for(let f in i)Se[f]=i[f],f in Ts&&Ee(Nn,f,i[f]);u!==!1&&Ge("setSelect")}}n.setSelect=Ll;function Ga(i){if(k[i].show)Pe&&Js(ye[i],_n);else if(Pe&&vt(ye[i],_n),Ye){let f=Tn?St[0]:St[i];f!=null&&Wt(f,-10,-10,te,U)}}function tn(i,u,f){ws(i,{min:u,max:f})}function zt(i,u,f,m){u.focus!=null&&Qa(i),u.show!=null&&k.forEach(($,_)=>{_>0&&(i==_||i==null)&&($.show=u.show,Ga(_),s==2?(tn($.facets[0].scale,null,null),tn($.facets[1].scale,null,null)):tn($.scale,null,null),Dn())}),f!==!1&&Ge("setSeries",i,u),m&&al("setSeries",n,i,u)}n.setSeries=zt;function Ka(i,u){Ne(y[i],u)}function Ya(i,u){i.fill=se(i.fill||null),i.dir=fe(i.dir,-1),u=u??y.length,y.splice(u,0,i)}function qa(i){i==null?y.length=0:y.splice(i,1)}n.addBand=Ya,n.setBand=Ka,n.delBand=qa;function Ja(i,u){k[i].alpha=u,Ye&&St[i]!=null&&(St[i].style.opacity=u),Pe&&ye[i]&&(ye[i].style.opacity=u)}let Yt,nn,hn;const Vn={focus:!0};function Qa(i){if(i!=hn){let u=i==null,f=Ft.alpha!=1;k.forEach((m,$)=>{if(s==1||$>0){let _=u||$==0||$==i;m._focus=u?null:_,f&&Ja($,_?1:Ft.alpha)}}),hn=i,f&&Dn()}}Pe&&En&&Re(Mi,oe,i=>{K._lock||(pn(i),hn!=null&&zt(null,Vn,!0,Ie.setSeries))});function Ht(i,u,f){let m=x[u];f&&(i=i/me-(m.ori==1?Ve:we));let $=te;m.ori==1&&($=U,i=$-i),m.dir==-1&&(i=$-i);let _=m._min,C=m._max,L=i/$,I=_+(C-_)*L,z=m.distr;return z==3?qn(10,I):z==4?ad(I,m.asinh):z==100?m.bwd(I):I}function Za(i,u){let f=Ht(i,E,u);return Rt(f,t[0],Be,Ue)}n.valToIdx=i=>Rt(i,t[0]),n.posToIdx=Za,n.posToVal=Ht,n.valToPos=(i,u,f)=>x[u].ori==0?o(i,x[u],f?ut:te,f?ft:0):r(i,x[u],f?At:U,f?wt:0),n.setCursor=(i,u,f)=>{ke=i.left,Te=i.top,vn(null,u,f)};function Ho(i,u){Ee(Nn,Hn,Se.left=i),Ee(Nn,pl,Se.width=u)}function Bo(i,u){Ee(Nn,ul,Se.top=i),Ee(Nn,ml,Se.height=u)}let ol=M.ori==0?Ho:Bo,il=M.ori==1?Ho:Bo;function Xa(){if(Pe&&ee.live)for(let i=s==2?1:0;i<k.length;i++){if(i==0&&Qe)continue;let u=ee.values[i],f=0;for(let m in u)_t[i][f++].firstChild.nodeValue=u[m]}}function xs(i,u){if(i!=null&&(i.idxs?i.idxs.forEach((f,m)=>{ue[m]=f}):fd(i.idx)||ue.fill(i.idx),ee.idx=ue[0]),Pe&&ee.live){for(let f=0;f<k.length;f++)(f>0||s==1&&!Qe)&&ec(f,ue[f]);Xa()}kt=!1,u!==!1&&Ge("setLegend")}n.setLegend=xs;function ec(i,u){let f=k[i],m=i==0&&j==2?Lt:t[i],$;Qe?$=f.values(n,i,u)??Nt:($=f.value(n,u==null?null:m[u],i,u),$=$==null?Nt:{_:$}),ee.values[i]=$}function vn(i,u,f){Fo=ke,zo=Te,[ke,Te]=K.move(n,ke,Te),K.left=ke,K.top=Te,Ye&&(Pn&&Wt(Pn,Fe(ke),0,te,U),On&&Wt(On,0,Fe(Te),te,U));let m,$=Be>Ue;Yt=$e,nn=null;let _=M.ori==0?te:U,C=M.ori==1?te:U;if(ke<0||qe==0||$){m=K.idx=null;for(let L=0;L<k.length;L++){let I=St[L];I!=null&&Wt(I,-10,-10,te,U)}En&&zt(null,Vn,!0,i==null&&Ie.setSeries),ee.live&&(ue.fill(m),kt=!0)}else{let L,I,z;s==1&&(L=M.ori==0?ke:Te,I=Ht(L,E),m=K.idx=Rt(I,t[0],Be,Ue),z=N(t[0][m],M,_,0));let H=-10,W=-10,Q=0,pe=0,de=!0,le="",J="";for(let Y=s==2?1:0;Y<k.length;Y++){let xe=k[Y],Ae=ue[Y],Ke=Ae==null?null:s==1?t[Y][Ae]:t[Y][1][Ae],ve=K.dataIdx(n,Y,m,I),Le=ve==null?null:s==1?t[Y][ve]:t[Y][1][ve];if(kt=kt||Le!=Ke||ve!=Ae,ue[Y]=ve,Y>0&&xe.show){let pt=ve==null?-10:ve==m?z:N(s==1?t[0][ve]:t[Y][0][ve],M,_,0),nt=Le==null?-10:G(Le,s==1?x[xe.scale]:x[xe.facets[1].scale],C,0);if(En&&Le!=null){let xt=M.ori==1?ke:Te,Dt=ze(Ft.dist(n,Y,ve,nt,xt));if(Dt<Yt){let Bt=Ft.bias;if(Bt!=0){let mt=Ht(xt,xe.scale),Et=Le>=0?1:-1,Pt=mt>=0?1:-1;Pt==Et&&(Pt==1?Bt==1?Le>=mt:Le<=mt:Bt==1?Le<=mt:Le>=mt)&&(Yt=Dt,nn=Y)}else Yt=Dt,nn=Y}}if(kt||Tn){let xt,Dt;M.ori==0?(xt=pt,Dt=nt):(xt=nt,Dt=pt);let Bt,mt,Et,Pt,Ut,lt,ht=!0,gn=Xe.bbox;if(gn!=null){ht=!1;let st=gn(n,Y);Et=st.left,Pt=st.top,Bt=st.width,mt=st.height}else Et=xt,Pt=Dt,Bt=mt=Xe.size(n,Y);if(lt=Xe.fill(n,Y),Ut=Xe.stroke(n,Y),Tn)Y==nn&&Yt<=Ft.prox&&(H=Et,W=Pt,Q=Bt,pe=mt,de=ht,le=lt,J=Ut);else{let st=St[Y];st!=null&&(Mn[Y]=Et,Cn[Y]=Pt,Ri(st,Bt,mt,ht),Pi(st,lt,Ut),Wt(st,Mt(Et),Mt(Pt),te,U))}}}}if(Tn){let Y=Ft.prox,xe=hn==null?Yt<=Y:Yt>Y||nn!=hn;if(kt||xe){let Ae=St[0];Ae!=null&&(Mn[0]=H,Cn[0]=W,Ri(Ae,Q,pe,de),Pi(Ae,le,J),Wt(Ae,Mt(H),Mt(W),te,U))}}}if(Se.show&&en)if(i!=null){let[L,I]=Ie.scales,[z,H]=Ie.match,[W,Q]=i.cursor.sync.scales,pe=i.cursor.drag;if(We=pe._x,je=pe._y,We||je){let{left:de,top:le,width:J,height:Y}=i.select,xe=i.scales[W].ori,Ae=i.posToVal,Ke,ve,Le,pt,nt,xt=L!=null&&z(L,W),Dt=I!=null&&H(I,Q);xt&&We?(xe==0?(Ke=de,ve=J):(Ke=le,ve=Y),Le=x[L],pt=N(Ae(Ke,W),Le,_,0),nt=N(Ae(Ke+ve,W),Le,_,0),ol(It(pt,nt),ze(nt-pt))):ol(0,_),Dt&&je?(xe==1?(Ke=de,ve=J):(Ke=le,ve=Y),Le=x[I],pt=G(Ae(Ke,Q),Le,C,0),nt=G(Ae(Ke+ve,Q),Le,C,0),il(It(pt,nt),ze(nt-pt))):il(0,C)}else Ms()}else{let L=ze(Fo-No),I=ze(zo-Vo);if(M.ori==1){let Q=L;L=I,I=Q}We=Je.x&&L>=Je.dist,je=Je.y&&I>=Je.dist;let z=Je.uni;z!=null?We&&je&&(We=L>=z,je=I>=z,!We&&!je&&(I>L?je=!0:We=!0)):Je.x&&Je.y&&(We||je)&&(We=je=!0);let H,W;We&&(M.ori==0?(H=Rn,W=ke):(H=In,W=Te),ol(It(H,W),ze(W-H)),je||il(0,C)),je&&(M.ori==1?(H=Rn,W=ke):(H=In,W=Te),il(It(H,W),ze(W-H)),We||ol(0,_)),!We&&!je&&(ol(0,0),il(0,0))}if(Je._x=We,Je._y=je,i==null){if(f){if(Xo!=null){let[L,I]=Ie.scales;Ie.values[0]=L!=null?Ht(M.ori==0?ke:Te,L):null,Ie.values[1]=I!=null?Ht(M.ori==1?ke:Te,I):null}al(Is,n,ke,Te,te,U,m)}if(En){let L=f&&Ie.setSeries,I=Ft.prox;hn==null?Yt<=I&&zt(nn,Vn,!0,L):Yt>I?zt(null,Vn,!0,L):nn!=hn&&zt(nn,Vn,!0,L)}}kt&&(ee.idx=m,xs()),u!==!1&&Ge("setCursor")}let ln=null;Object.defineProperty(n,"rect",{get(){return ln==null&&rl(!1),ln}});function rl(i=!1){i?ln=null:(ln=S.getBoundingClientRect(),Ge("syncRect",ln))}function Uo(i,u,f,m,$,_,C){K._lock||en&&i!=null&&i.movementX==0&&i.movementY==0||(Es(i,u,f,m,$,_,C,!1,i!=null),i!=null?vn(null,!0,!0):vn(u,!0,!1))}function Es(i,u,f,m,$,_,C,L,I){if(ln==null&&rl(!1),pn(i),i!=null)f=i.clientX-ln.left,m=i.clientY-ln.top;else{if(f<0||m<0){ke=-10,Te=-10;return}let[z,H]=Ie.scales,W=u.cursor.sync,[Q,pe]=W.values,[de,le]=W.scales,[J,Y]=Ie.match,xe=u.axes[0].side%2==1,Ae=M.ori==0?te:U,Ke=M.ori==1?te:U,ve=xe?_:$,Le=xe?$:_,pt=xe?m:f,nt=xe?f:m;if(de!=null?f=J(z,de)?a(Q,x[z],Ae,0):-10:f=Ae*(pt/ve),le!=null?m=Y(H,le)?a(pe,x[H],Ke,0):-10:m=Ke*(nt/Le),M.ori==1){let xt=f;f=m,m=xt}}I&&(u==null||u.cursor.event.type==Is)&&((f<=1||f>=te-1)&&(f=$n(f,te)),(m<=1||m>=U-1)&&(m=$n(m,U))),L?(No=f,Vo=m,[Rn,In]=K.move(n,f,m)):(ke=f,Te=m)}const Ts={width:0,height:0,left:0,top:0};function Ms(){Ll(Ts,!1)}let Wo,jo,Go,Ko;function Yo(i,u,f,m,$,_,C){en=!0,We=je=Je._x=Je._y=!1,Es(i,u,f,m,$,_,C,!0,!1),i!=null&&(Re(Ns,Ys,qo,!1),al(Ei,n,Rn,In,te,U,null));let{left:L,top:I,width:z,height:H}=Se;Wo=L,jo=I,Go=z,Ko=H}function qo(i,u,f,m,$,_,C){en=Je._x=Je._y=!1,Es(i,u,f,m,$,_,C,!1,!0);let{left:L,top:I,width:z,height:H}=Se,W=z>0||H>0,Q=Wo!=L||jo!=I||Go!=z||Ko!=H;if(W&&Q&&Ll(Se),Je.setScale&&W&&Q){let pe=L,de=z,le=I,J=H;if(M.ori==1&&(pe=I,de=H,le=L,J=z),We&&tn(E,Ht(pe,E),Ht(pe+de,E)),je)for(let Y in x){let xe=x[Y];Y!=E&&xe.from==null&&xe.min!=$e&&tn(Y,Ht(le+J,Y),Ht(le,Y))}Ms()}else K.lock&&(K._lock=!K._lock,vn(u,!0,i!=null));i!=null&&(Ze(Ns,Ys),al(Ns,n,ke,Te,te,U,null))}function tc(i,u,f,m,$,_,C){if(K._lock)return;pn(i);let L=en;if(en){let I=!0,z=!0,H=10,W,Q;M.ori==0?(W=We,Q=je):(W=je,Q=We),W&&Q&&(I=ke<=H||ke>=te-H,z=Te<=H||Te>=U-H),W&&I&&(ke=ke<Rn?0:te),Q&&z&&(Te=Te<In?0:U),vn(null,!0,!0),en=!1}ke=-10,Te=-10,ue.fill(null),vn(null,!0,!0),L&&(en=L)}function Jo(i,u,f,m,$,_,C){K._lock||(pn(i),us(),Ms(),i!=null&&al(Ci,n,ke,Te,te,U,null))}function Qo(){A.forEach(Cf),cs(n.width,n.height,!0)}yn(Wl,Kn,Qo);const Fn={};Fn.mousedown=Yo,Fn.mousemove=Uo,Fn.mouseup=qo,Fn.dblclick=Jo,Fn.setSeries=(i,u,f,m)=>{let $=Ie.match[2];f=$(n,u,f),f!=-1&&zt(f,m,!0,!1)},Ye&&(Re(Ei,S,Yo),Re(Is,S,Uo),Re(Ti,S,i=>{pn(i),rl(!1)}),Re(Mi,S,tc),Re(Ci,S,Jo),no.add(n),n.syncRect=rl);const Dl=n.hooks=e.hooks||{};function Ge(i,u,f){ys?sl.push([i,u,f]):i in Dl&&Dl[i].forEach(m=>{m.call(null,n,u,f)})}(e.plugins||[]).forEach(i=>{for(let u in i.hooks)Dl[u]=(Dl[u]||[]).concat(i.hooks[u])});const Zo=(i,u,f)=>f,Ie=Ne({key:null,setSeries:!1,filters:{pub:zi,sub:zi},scales:[E,k[1]?k[1].scale:null],match:[Hi,Hi,Zo],values:[null,null]},K.sync);Ie.match.length==2&&Ie.match.push(Zo),K.sync=Ie;const Xo=Ie.key,Cs=fa(Xo);function al(i,u,f,m,$,_,C){Ie.filters.pub(i,u,f,m,$,_,C)&&Cs.pub(i,u,f,m,$,_,C)}Cs.sub(n);function nc(i,u,f,m,$,_,C){Ie.filters.sub(i,u,f,m,$,_,C)&&Fn[i](null,u,f,m,$,_,C)}n.pub=nc;function lc(){Cs.unsub(n),no.delete(n),Oe.clear(),Qs(Wl,Kn,Qo),d.remove(),oe==null||oe.remove(),Ge("destroy")}n.destroy=lc;function As(){Ge("init",e,t),Co(t||e.data,!1),B[E]?ws(E,B[E]):us(),xl=Se.show&&(Se.width>0||Se.height>0),fn=kt=!0,cs(e.width,e.height)}return k.forEach(To),A.forEach(Ra),l?l instanceof HTMLElement?(l.appendChild(d),As()):l(n,As):As(),n}tt.assign=Ne;tt.fmtNum=mo;tt.rangeNum=jl;tt.rangeLog=ts;tt.rangeAsinh=fo;tt.orient=kn;tt.pxRatio=me;tt.join=bd;tt.fmtDate=vo,tt.tzDate=Ad;tt.sync=fa;{tt.addGap=pf,tt.clipGaps=ss;let e=tt.paths={points:$a};e.linear=_a,e.stepped=vf,e.bars=gf,e.spline=bf}function Af(e){let t;return{hooks:{init(l){t=document.createElement("div"),t.className="chart-tooltip",t.style.display="none",l.over.appendChild(t)},setCursor(l){const n=l.cursor.idx;if(n==null||!l.data[1]||l.data[1][n]==null){t.style.display="none";return}const s=l.data[0][n],o=l.data[1][n],r=new Date(s*1e3).toLocaleTimeString([],{hourCycle:"h23"});t.innerHTML=`<b>${e?e(o):gt(o)}</b> ${r}`;const a=Math.round(l.valToPos(s,"x"));t.style.left=Math.min(a,l.over.clientWidth-80)+"px",t.style.display=""}}}}function Lf(e,t){if(typeof document>"u")return`rgba(100,100,100,${t})`;const l=document.createElement("span");l.style.color=e,document.body.appendChild(l);const n=getComputedStyle(l).color;l.remove();const s=n.match(/[\d.]+/g);return s&&s.length>=3?`rgba(${s[0]},${s[1]},${s[2]},${t})`:`rgba(100,100,100,${t})`}function Df({data:e,color:t,smooth:l,height:n,yMax:s,fmtVal:o,ariaLabel:r,ariaHidden:a}){const c=Z(null),d=Z(null),v=n||55;return ie(()=>{if(!c.current||!e||e[0].length<2)return;const p=l?_c(e[1]):e[1],h=[e[0],p];if(d.current){d.current.setData(h);return}const b=s?(D,w,T)=>[0,Math.max(s,T*1.05)]:(D,w,T)=>[Math.max(0,w*.9),T*1.1],S={width:c.current.clientWidth||200,height:v,padding:[2,0,4,0],cursor:{show:!0,x:!0,y:!1,points:{show:!1}},legend:{show:!1},select:{show:!1},scales:{x:{time:!0},y:{auto:!0,range:b}},axes:[{show:!1,size:0,gap:0},{show:!1,size:0,gap:0}],series:[{},{stroke:yc(t),width:1.5,fill:Lf(t,.09)}],plugins:[Af(o)]};return d.current=new tt(S,h,c.current),()=>{d.current&&(d.current.destroy(),d.current=null)}},[e,t,l]),ie(()=>{if(!d.current||!c.current)return;const p=new ResizeObserver(()=>{d.current&&c.current&&d.current.setSize({width:c.current.clientWidth,height:v})});return p.observe(c.current),()=>p.disconnect()},[]),g`<div class="chart-wrap"
    role=${a?null:"img"}
    aria-hidden=${a?"true":null}
    aria-label=${a?null:r||"Sparkline chart"}
    style=${"height:"+v+"px"} ref=${c}></div>`}function Pf(e){if(!e||!e[1])return null;const t=e[1].filter(s=>s!=null&&!isNaN(s));if(t.length<2)return null;const l=t[0],n=t[t.length-1];if(l>0){const s=(n-l)/l*100;return Math.abs(s)<1?null:{dir:s>0?"▲":"▼",pct:Math.round(Math.abs(s))}}return n>0?{dir:"▲",pct:null}:null}function Of({label:e,value:t,valColor:l,data:n,chartColor:s,smooth:o,refLines:r,yMax:a,dp:c,iconName:d}){const v=Me(()=>{if(!n||!n[1]||n[1].length<2)return[];const h=a?Math.max(a,n[1].reduce((b,S)=>Math.max(b,S),0)*1.05):n[1].reduce((b,S)=>Math.max(b,S),0)*1.1;return(r||[]).map(b=>{if(h<=0)return null;const S=(1-b.value/h)*100;return S>=0&&S<=95?{...b,pct:S}:null}).filter(Boolean)},[n,r,a]),p=Me(()=>Pf(n),[n]);return g`<div class="chart-box" role="img" aria-label=${"Chart: "+e+" — current value: "+(t||"no data")} ...${c?{"data-dp":c}:{}}>
    <div class="chart-hdr">
      <span class="chart-label">${d?g`<${Qt} name=${d} size="0.85em"/> `:""}${e}</span>
      <span class="chart-val-group">
        ${p?g`<span class="chart-trend" aria-hidden="true">${p.dir}${p.pct!=null?" "+p.pct+"%":""}</span>`:""}
        <span class="chart-val" style=${l?"color:"+l:null} aria-live="polite" aria-atomic="true">${t}</span>
      </span>
    </div>
    <div style="position:relative">
      ${v.map((h,b)=>g`<${ti} key=${h.label??b}>
          <div class="chart-ref-line" style=${"top:"+h.pct+"%"} />
          <div class="chart-ref-label" style=${"top:calc("+h.pct+"% - 8px)"}>${h.label}</div>
        </${ti}>`)}
      ${n&&n[0].length>=2?g`<${Df} data=${n} color=${s||"var(--accent)"} smooth=${o} yMax=${a} ariaHidden=${!0}/>`:g`<div class="chart-wrap text-muted" style="display:flex;align-items:center;justify-content:center;font-size:var(--fs-base)">collecting...</div>`}
    </div>
  </div>`}function Rf({pct:e,direction:t,inverse:l=!1,compareLabel:n}){if(e==null||t==null)return null;const s=t==="flat"||e===0,o=s?"•":t==="up"?"▲":"▼";let r="neutral";s||(r=(l?t==="down":t==="up")?"success":"danger");const a=Number.isFinite(e)?Math.abs(e).toFixed(Math.abs(e)>=10?0:1):"0",c=g`<${mi} variant=${r} size="sm"
    aria-label=${"Delta: "+o+" "+a+"%"+(n?" vs "+n:"")}
  >${o} ${a}%</${mi}>`;return n?g`<${hi} content=${"vs. "+n}>${c}</${hi}>`:c}function so({label:e,value:t,accent:l,dp:n,sm:s,delta:o,deltaInverse:r}){const a=Z(t),[c,d]=X(!1);return ie(()=>{a.current!==t&&(d(!0),setTimeout(()=>d(!1),500)),a.current=t},[t]),g`<div class=${"metric"+(s?" metric--sm":"")} aria-label="${e}: ${t}" ...${n?{"data-dp":n}:{}}>
    <div class="label">${e}</div>
    <div class=${"value"+(l?" accent":"")+(c?" flash":"")} aria-live="polite" aria-atomic="true">${t}</div>
    ${o?g`<div class="metric-delta"><${Rf}
      pct=${o.pct} direction=${o.direction}
      inverse=${r} compareLabel=${o.compareLabel}/></div>`:null}
  </div>`}function cr({snap:e,mode:t}){if(!e)return null;const l=!t||t==="files",n=!t||t==="traffic",s=e.tools.filter(d=>{var v;return d.tool!=="aictl"&&((v=d.files)==null?void 0:v.length)}),o=s.reduce((d,v)=>d+v.files.length,0)||1,r=d=>(Number(d.live.outbound_rate_bps)||0)+(Number(d.live.inbound_rate_bps)||0),a=e.tools.filter(d=>d.tool!=="aictl"&&d.live&&r(d)>0),c=a.reduce((d,v)=>d+r(v),0)||1;return g`
    ${l&&s.length>0&&g`<div class="rbar-block" data-dp="overview.csv_footprint_bar" role="img" aria-label=${"CSV footprint: "+s.map(d=>d.label+" "+d.files.length+" files").join(", ")}>
      <div class="rbar-title">CSV Footprint</div>
      <div class="rbar">${s.map(d=>g`
        <div class="rbar-seg" style=${"width:"+(d.files.length/o*100).toFixed(1)+"%;background:"+(fl[d.tool]||"var(--fg2)")}
          title="${d.label}: ${d.files.length} files"></div>`)}
      </div>
      <div class="rbar-legend">${s.map(d=>g`
        <span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(fl[d.tool]||"var(--fg2)")}></span>
          ${d.label} <span class="text-muted">${d.files.length} files</span>
        </span>`)}
      </div>
    </div>`}
    ${n&&g`<div class="rbar-block" data-dp="overview.live_traffic_bar" role="img" aria-label=${"Live traffic: "+(a.length?a.map(d=>d.label).join(", "):"no active traffic")}>
      <div class="rbar-title">Live Traffic${a.length===0?" — no active traffic":""}</div>
      <div class="rbar">${a.map(d=>{const v=r(d);return g`<div class="rbar-seg" style=${"width:"+(v/c*100).toFixed(1)+"%;background:"+(fl[d.tool]||"var(--fg2)")}
          title="${d.label}: ${ni(v)}"></div>`})}
      </div>
      <div class="rbar-legend">${a.map(d=>{const v=r(d);return g`<span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(fl[d.tool]||"var(--fg2)")}></span>
          ${d.label} <span class="text-muted">${ni(v)}</span>
        </span>`})}
      </div>
    </div>`}
    ${!t&&!s.length&&!a.length&&g`<div class="empty-state">
      No AI tool resources found yet.
      <small class="empty-state-source">/api/snapshot · tools[].files · tools[].live</small>
    </div>`}`}const If=18e4;function Nf({loading:e,error:t,data:l,isEmpty:n,updatedAt:s,staleMs:o=If,now:r=Date.now()}){return l!=null?n&&n(l)?t?"error":"empty":t||s&&r-s>o?"stale":"ready":t?"error":e?"loading":"empty"}function Vf(e){return e&&(typeof e=="string"?e:e.message)||"The request failed."}function rn({status:e,error:t,updatedAt:l,onRetry:n,emptyTitle:s="No data",emptyHint:o,emptyFix:r,skeletonHeight:a="72px",label:c,children:d}){if(e==="loading")return g`<div class="panel-state panel-state--loading" role="status" aria-busy="true"
      aria-label=${"Loading "+(c||"panel")}>
      <${Gn} height=${a} radius="var(--radius-sm)"/>
    </div>`;if(e==="error")return g`<div class="panel-state panel-state--error" role="alert">
      <${Qt} name="alert-triangle" size="14"/>
      <div>
        <div class="panel-state__title">Could not load ${c||"this panel"}</div>
        <div class="panel-state__hint">${Vf(t)}</div>
      </div>
      ${n&&g`<button type="button" class="range-btn" onClick=${n}>Retry</button>`}
    </div>`;if(e==="empty")return g`<div class="panel-state panel-state--empty" role="status">
      <div class="panel-state__title">${s}</div>
      ${o&&g`<div class="panel-state__hint">${o}</div>`}
      ${r&&g`<code class="panel-state__fix">${r}</code>`}
    </div>`;const v=l?Math.max(0,Math.round((Date.now()-l)/1e3)):null;return g`
    ${e==="stale"&&g`<div class="panel-state panel-state--stale" role="status">
      <${Qt} name="clock" size="12"/>
      <span>${t?"Refresh failed. ":""}Showing data from ${v!=null?ro(v)+" ago":"an earlier fetch"}.</span>
      ${n&&g`<button type="button" class="panel-state__retry" onClick=${n}>Retry</button>`}
    </div>`}
    ${d}`}function Ff({perCore:e}){if(!e||!e.length)return null;const t=100;return g`<div class="mb-sm" style="display:flex;gap:2px;align-items:end;height:40px">
    ${e.map((l,n)=>{const s=Math.max(1,l/t*100),o=l>80?"var(--red)":l>50?"var(--orange)":l>20?"var(--green)":"var(--fg2)";return g`<div key=${n} title=${"Core "+n+": "+vl(l)}
        style=${"flex:1;min-width:3px;background:"+o+";height:"+s+"%;border-radius:1px;opacity:0.8;transition:height 0.3s"}/>`})}
  </div>`}function zf({mcpDetail:e}){return e!=null&&e.length?g`<div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
    ${e.map(t=>{const l=wc[t.status]||"var(--fg3)";return g`<div key=${t.name+t.tool}
        style="display:flex;align-items:center;gap:var(--sp-2);padding:3px var(--sp-3);
               border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent)"
        title=${t.status+(t.pid?" PID "+t.pid:"")+(t.transport?" · "+t.transport:"")}>
        <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${l}"></span>
        <span class="mono" style="font-size:var(--fs-xs);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${Wn(t.name)}</span>
        <span style="font-size:var(--fs-2xs);color:${kc(t.tool)};white-space:nowrap;flex-shrink:0">${Wn(t.tool)}</span>
      </div>`})}
  </div>`:g`<div style="color:var(--fg3);font-size:var(--fs-sm);padding:var(--sp-2) 0">None configured</div>`}function Hf({label:e,value:t,mcpDetail:l}){const[n,s]=X(!1);return g`<div style="position:relative;cursor:default"
    tabindex="0"
    onMouseEnter=${()=>s(!0)} onMouseLeave=${()=>s(!1)}
    onFocusIn=${()=>s(!0)} onFocusOut=${()=>s(!1)}>
    <${so} label=${e} value=${t} sm=${!0}/>
    ${n&&g`<div style="position:absolute;top:calc(100% + 6px);left:0;z-index:200;
        min-width:260px;background:var(--bg);border:1px solid var(--border);border-radius:6px;
        box-shadow:0 4px 20px rgba(0,0,0,0.35);padding:var(--sp-3)">
      <div class="metric-group-label" style="padding:0 0 var(--sp-2)">MCP Servers</div>
      <${zf} mcpDetail=${l}/>
    </div>`}
  </div>`}const Bf=new Set(["cpu","mem_mb","tokens"]);function Uf({snap:e,history:t,enabledTools:l=null}){const n=Hl(l),s=Me(()=>n&&e?{...e,...Kc(e)}:e,[n,e]),o=Me(()=>Yc(t,l),[t,l]),[r,a]=X(()=>{try{return localStorage.getItem("aictl-header-expanded")!=="false"}catch{return!0}}),c=re(()=>{a(h=>{const b=!h;try{localStorage.setItem("aictl-header-expanded",String(b))}catch{}return b})},[]),d=h=>o!=null&&o.ts&&o.ts.length>=2&&(!n||Bf.has(h))?[o.ts,o[h]]:null,v=(s==null?void 0:s.cpu_cores)||1,p={cores:v};return n&&!((s==null?void 0:s.tools)||[]).some(h=>h.tool!=="aictl")?g`<${uc} enabledTools=${l} snap=${s} what="the overview totals"/>`:g`
    <div class="grid-sparklines">
      ${Fl.sparklines.map(h=>{const b=s?s["total_"+h.field]??s[h.field]??"":"",S=Ls(b,h.format,h.suffix,h.multiply),D=h.yMaxExpr?li(h.yMaxExpr,p):void 0,w=(h.refLines||[]).map(T=>({value:li(T.valueExpr,p),label:(T.label||"").replace("{cores}",v)})).filter(T=>T.value!=null);return g`<${Of} key=${h.field} label=${h.label} value=${S}
          data=${d(h.field)} chartColor=${h.color||"var(--accent)"}
          smooth=${!!h.smooth} refLines=${w.length?w:void 0}
          yMax=${D} dp=${h.dp} iconName=${h.iconName}/>`})}
    </div>

    <div class=${r?"header-sections header-sections--expanded":"header-sections header-sections--collapsed"}>
      <div class="mb-sm header-top-row">
        <div>
          <div class="metric-group-label">CPU Cores${n?" (whole machine, all tools)":""}</div>
          <${Ff} perCore=${(s==null?void 0:s.cpu_per_core)||[]}/>
          <div style="margin-top:var(--sp-3)"><${cr} snap=${s} mode="traffic"/></div>
        </div>
        <div>
          <div class="metric-group-label">Live Monitor</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2)">
            ${Fl.liveMetrics.map(h=>{const b=s?s[h.field]??"":"",S=Ls(b,h.format,h.suffix,h.multiply);return g`<${so} key=${h.field} label=${h.label} value=${S}
                accent=${!!h.accent} dp=${h.dp} sm=${!0}/>`})}
          </div>
        </div>
      </div>
      <div class="mb-sm">
        <div class="metric-group-label">Inventory</div>
        <div class="grid-inventory">
          ${Fl.inventory.map(h=>{const b=s?s[h.field]??"":"",S=Ls(b,h.format,h.suffix,h.multiply);return h.field==="total_mcp_servers"?g`<${Hf} key=${h.field} label=${h.label} value=${S}
                mcpDetail=${(s==null?void 0:s.mcp_detail)||[]}/>`:g`<${so} key=${h.field} label=${h.label} value=${S}
              accent=${!!h.accent} dp=${h.dp} sm=${!0}/>`})}
        </div>
      </div>
      <div class="mb-sm"><${cr} snap=${s} mode="files"/></div>
    </div>
    <button class="header-toggle" onClick=${c} aria-label="Toggle details"
      aria-expanded=${r}>
      <span aria-hidden="true">${r?"▲":"▼"}</span> ${r?"less":"more"}
    </button>
  `}const ur={error:0,warn:1,info:2};function dr(e,t){if(e==="claude-code")return`aictl hooks install --port ${t}`;const l=["copilot","gemini","codex"].find(n=>String(e).startsWith(n));return`aictl enable${l?" --tool "+l:""} --port ${t}`}function fr(e){return String(e||"").split("-")[0]}function Wf(e,t,l=null){var r,a,c;if(!(e!=null&&e.tools))return[];const n=[],s=e.server_port,o=t?new Set([...t].map(fr)):null;for(const d of Object.values(e.tools))if(ql(d.tool,l)){if(d.status==="missing"){if(o&&!o.has(fr(d.tool)))continue;const v=dr(d.tool,s);n.push({id:"hooks:"+d.tool,level:"warn",title:`${d.tool}: hooks not installed`,detail:"No per-tool-call events, so the tool, skill and subagent panels stay empty.",fix:v})}else if(d.status==="disabled"){const v=((r=(d.sources||[]).find(p=>p.host_reason&&!p.host_enabled))==null?void 0:r.host_reason)||"The host tool has hooks turned off.";n.push({id:"hooks:"+d.tool,level:"warn",title:`${d.tool}: hooks disabled by host`,detail:v,fix:v.startsWith("chat.hookFilesLocations")?`Set ${v.replace(/ is false$/,"")} to true in VS Code settings`:null})}else if(d.status==="misconfigured"||d.status==="fail"){const v=(a=d.warnings)==null?void 0:a[0],p=((c=d.warnings)==null?void 0:c.length)>1?`, +${d.warnings.length-1} more`:"";n.push({id:"hooks:"+d.tool,level:"error",title:`${d.tool}: hooks misconfigured`,detail:v?`${v.message} (${v.path}${p})`:"Hook checks failed.",fix:dr(d.tool,s)})}}return!Hl(l)&&e.total_configured>0&&e.total_fired_24h===0&&n.length===0&&n.push({id:"hooks:silent",level:"warn",title:`${e.total_configured} hooks configured, 0 fired in 24 h`,detail:"Hooks are installed but no event has reached this dashboard.",fix:null}),n}function jf(e){const t=[];for(const l of(e==null?void 0:e.items)||[])l.status==="ok"||l.severity==="info"||l.status!=="source_missing"&&t.push({id:"quality:"+l.component,level:l.severity==="error"?"error":"warn",title:`${l.component}: ${l.status}`,detail:l.message+(l.source?` (${l.source})`:""),fix:null});return t}function Gf({connected:e,snapAgeS:t,hooks:l,quality:n,otelActive:s,alerts:o=[],storage:r=null,hiddenContext:a,runningTools:c=null,enabledTools:d=null}){const v=[];(a==null?void 0:a.count)>0?v.push({id:"hidden-context",level:"warn",tab:"hidden",title:`${a.count} unseen context source${a.count===1?"":"s"} found`,detail:a.detail||"Text reaches a model without appearing in its visible configuration.",fix:null}):a===null&&v.push({id:"hidden-context",level:"info",tab:"hidden",title:"Hidden context not checked",detail:"No detector has reported for this build.",fix:null}),r!=null&&r.degraded?v.push({id:"storage",level:"error",title:"Storage degraded: capture is being reduced",detail:`${Kl(r)}. New data may lose text or be dropped until disk use is under budget.`,fix:null}):(r==null?void 0:r.pct)>=90&&v.push({id:"storage",level:"warn",title:`Storage at ${r.pct}% of budget`,detail:Kl(r),fix:null}),e===!1?v.push({id:"sse",level:"error",title:"Live stream disconnected",detail:"Figures show the last received values. Retrying automatically.",fix:"aictl daemon serve"}):t!=null&&t>60&&v.push({id:"stale",level:"warn",title:`Snapshot is ${Math.round(t)} s old`,detail:"The stream is connected but the collector stopped publishing.",fix:"aictl doctor"});for(const p of o)v.push({id:"alert:"+p.msg,level:p.level==="red"?"error":"warn",title:p.msg,detail:"The Processes tab lists the affected PIDs.",fix:null,tab:"procs"});return v.push(...Wf(l,c,d),...jf(n)),s===!1&&v.push({id:"otel",level:"info",title:"OTel receiver has no data",detail:"Exact token and cost figures need it. Estimates are used until then.",fix:"aictl otel enable"}),v.sort((p,h)=>ur[p.level]-ur[h.level])}function ko(e){var n;if(!e)return null;const t=e.storage_bytes??((n=e.db)==null?void 0:n.file_size_bytes)??null,l=e.storage_budget_bytes||null;return{mode:e.capture_mode||null,used:t,budget:l,pct:t!=null&&l?Math.round(t/l*100):null,degraded:!!e.storage_degraded}}function Kl(e){if(!e||e.used==null)return"Disk use not reported";const t=jt(e.used);return e.budget?`${t} of ${jt(e.budget)} (${e.pct}%)`:`${t}, no budget set`}function Kf(e,t){return((e==null?void 0:e.sessions)||[]).filter(n=>n.tool&&ql(n.tool,t)).sort((n,s)=>(s.cpu_percent||0)-(n.cpu_percent||0)||(s.last_seen_at||0)-(n.last_seen_at||0))}function Yf(e){return/^[^:]+:\d+:\d+$/.test((e==null?void 0:e.session_id)||"")}function qf(e){const t=e.filter(Yf).length,l=e.length-t,n=new Set(e.map(a=>a.tool)).size,s=`process tree${t===1?"":"s"}`,o=`session${l===1?"":"s"}`;return`${t&&l?`${l} ${o} and ${t} ${s}`:t?s:o} in ${n} tool${n===1?"":"s"}`}function Jf(e){if(!(e.process_tree||[]).length)return e.mem_mb||0;let t=0;const l=n=>{for(const s of n||[])t+=s.mem_mb||0,l(s.children)};return l(e.process_tree),t}const Sa="No price is known for this usage.";function oo(e,t=2){return"$"+Number(e).toLocaleString(void 0,{minimumFractionDigits:t,maximumFractionDigits:t})}function pr(e){return Number(e).toLocaleString(void 0,{maximumFractionDigits:2})}function xa(e){return String(e||"").replace(/_/g," ").replace(/^ai\b/i,"AI")}function Qf(e,t=2){const l=(e==null?void 0:e.cost_reason)||"";if(e!=null&&e.billing_unit&&e.billing_amount!==null&&e.billing_amount!==void 0){const n=[];return e.premium_requests&&n.push(pr(e.premium_requests)+" premium requests"),e.estimated_list_usd!==null&&e.estimated_list_usd!==void 0&&n.push("est. "+oo(e.estimated_list_usd,t)+" at list price"),{main:pr(e.billing_amount)+" "+xa(e.billing_unit),sub:n.join(", "),title:l,kind:"billing"}}return(e==null?void 0:e.cost_usd)===null||(e==null?void 0:e.cost_usd)===void 0?{main:"n/a",sub:"",title:l||Sa,kind:"none"}:{main:oo(e.cost_usd,t),sub:"est.",title:l||"Estimated from token counts and list prices. Not a billed amount.",kind:"estimate"}}function Zf({row:e,digits:t=2,showSub:l=!0}){const n=Qf(e,t);return g`<span class=${"cost-value cost-value--"+n.kind} title=${n.title}>${n.main}${l&&n.sub?g` <small class="cost-value__sub">${n.sub}</small>`:null}</span>`}function Xf(e,t){const l=((e==null?void 0:e.tools)||[]).filter(c=>ql(c.tool,t)).filter(c=>c.counted_in_totals!==!1),n=new Map;let s=0,o=null,r=0;const a=new Set;for(const c of l){if(c.billing_unit&&c.billing_amount!==null&&c.billing_amount!==void 0){n.set(c.billing_unit,(n.get(c.billing_unit)||0)+c.billing_amount),s+=c.premium_requests||0;continue}if(c.cost_usd===null||c.cost_usd===void 0){r+=1,c.cost_reason&&a.add(c.cost_reason);continue}o=(o||0)+c.cost_usd}return{rows:l.slice().sort((c,d)=>(d.total_tokens||0)-(c.total_tokens||0)),billed:[...n.entries()].map(([c,d])=>({unit:c,amount:d})),premium:s,listUsd:o,unpriced:r,unpricedReason:[...a].join(" "),tokens:l.reduce((c,d)=>c+(d.total_tokens||0),0),sessions:l.reduce((c,d)=>c+(d.sessions||0),0)}}function am(e){var n;const t=(e||[]).filter(s=>s.cost_usd!==null&&s.cost_usd!==void 0);if(!t.length)return{cost_usd:null,cost_reason:(n=e==null?void 0:e.find(s=>s.cost_reason))==null?void 0:n.cost_reason};const l=e.length-t.length;return{cost_usd:t.reduce((s,o)=>s+o.cost_usd,0),cost_reason:l?`${l} of ${e.length} rows have no known price and are not included.`:""}}const Yl=Object.assign({"./HiddenContextPanel.js":()=>rt(()=>import("./HiddenContextPanel-DUW8HEmA.js"),__vite__mapDeps([0,1,2,3,4,5,6,7,8,9]))})["./HiddenContextPanel.js"],mr=Yl?at(Yl):null;async function ep(e=null){if(!Yl)return null;const t=await Yl();if(t.getHiddenContextSummary)return t.getHiddenContextSummary(e);try{return tp(Sc(await xc(),e))}catch{return null}}function tp(e){if(!(e!=null&&e.counts))return null;const t=["high","medium","low"].filter(l=>e.counts[l]).map(l=>`${e.counts[l]} ${l}`);return{count:["high","medium","low"].reduce((l,n)=>l+(e.counts[n]||0),0),detail:t.length?`Findings by severity: ${t.join(", ")}.`:""}}function np(){return mr?g`<${Bl} fallback=${g`<${rn} status="loading" label="hidden context"/>`}>
    <${mr}/>
  </${Bl}>`:g`<section class="now-panel" data-slot="hidden-context" aria-label="Hidden context">
      <${rn} status="empty" emptyTitle="Hidden context detection is not in this build"
        emptyHint="This view lists prompts and context sources that reach a model without appearing in its visible configuration. Rebuild the dashboard once the detector ships."/>
    </section>`}const hr=8;function lp({snap:e,enabledTools:t,onOpenSession:l,onShowAll:n}){const s=Me(()=>Kf(e,t),[e,t]);return g`<section class="now-panel now-panel--running" aria-labelledby="now-running">
    <header class="now-panel__head">
      <h2 id="now-running">Running now</h2>
      ${!jn(e,t)&&g`<span class="now-panel__figure">${s.length}</span>
      <span class="now-panel__sub">${qf(s)}</span>`}
    </header>
    ${s.length===0?g`<${rn} status="empty" label="running sessions"
          emptyTitle=${jn(e,t)?"Not available from this machine":t?"No sessions for the selected tools":"No live sessions"}
          emptyHint=${jn(e,t)?"The selected tool runs in the vendor's cloud and has no local sessions.":t?"Widen the tool filter, or start a session in one of the selected tools.":"Start an AI coding tool. Sessions appear here within one sample interval."}/>`:g`<div class="now-table-wrap"><table class="now-table">
          <thead><tr>
            <th scope="col">Tool</th><th scope="col">Project</th>
            <th scope="col" class="num">Age</th><th scope="col" class="num">CPU</th>
            <th scope="col" class="num">RAM</th><th scope="col" class="num">Tokens</th>
          </tr></thead>
          <tbody>
            ${s.slice(0,hr).map(o=>{const r=(o.exact_input_tokens||0)+(o.exact_output_tokens||0),a=Jf(o);return g`<tr key=${o.session_id}>
                <td class="now-table__tool"><${Xl} tool=${o.tool} size="1em"/> ${o.label||bl(o.tool,e)}</td>
                <td class="now-table__project">
                  <button type="button" class="now-link" title=${(o.project||"no project")+`
`+o.session_id}
                    onClick=${()=>l(o.session_id,o.tool)}>${yr(o.project)||"no project"}</button>
                </td>
                <td class="num">${ro(o.duration_s||0)}</td>
                <td class="num">${vl(o.cpu_percent||0)}</td>
                <td class="num">${a?jt(a*1048576):"-"}</td>
                <td class="num" title=${r?r.toLocaleString()+" exact tokens":"No exact token data for this session"}>${r?gt(r):"-"}</td>
              </tr>`})}
          </tbody>
        </table></div>
        ${s.length>hr&&g`<button type="button" class="now-link now-panel__more" onClick=${n}>
          Show all ${s.length} sessions</button>`}`}
  </section>`}function sp({onOpenBudget:e,cloudScope:t,enabledTools:l,snap:n}){const s=Un(()=>Ec({since:Date.now()/1e3-86400}),[],{pollMs:6e4}),o=Me(()=>Xf(s.data,l),[s.data,l]),r=Nf({...s,data:s.data?o.rows:null,isEmpty:c=>!c.length});if(t)return g`<section class="now-panel" aria-labelledby="now-cost">
      <header class="now-panel__head"><h2 id="now-cost">Cost, last 24 h</h2></header>
      <${rn} status="empty" emptyTitle="Not available from this machine"
        emptyHint="The selected tool is billed and metered in the vendor's cloud, so no local token counts exist to estimate from."/>
    </section>`;const a=o.billed.length>0||o.listUsd!==null;return g`<section class="now-panel" aria-labelledby="now-cost">
    <header class="now-panel__head">
      <h2 id="now-cost">Cost, last 24 h</h2>
      ${s.data&&o.billed.map(c=>g`<span key=${c.unit} class="now-panel__figure">${c.amount.toLocaleString(void 0,{maximumFractionDigits:2})}<small class="now-panel__unit"> ${xa(c.unit)}</small></span>`)}
      ${s.data&&o.listUsd!==null&&g`<span class="now-panel__figure" title=${Tc}>${oo(o.listUsd)}<small class="now-panel__unit"> est.</small></span>`}
      ${s.data&&!a&&o.rows.length>0&&g`<span class="now-panel__figure" title=${o.unpricedReason||Sa}>n/a</span>`}
    </header>
    <${rn} status=${r} error=${s.error} updatedAt=${s.updatedAt} onRetry=${s.reload}
      label="cost" emptyTitle=${l?"No recorded usage for the selected tools in the last 24 h":"No recorded usage in the last 24 h"}
      emptyHint="Usage comes from per-request telemetry. Turn on the OTel receiver if a tool is running but nothing shows."
      emptyFix="aictl otel enable">
      <div class="now-panel__sub">${gt(o.tokens)} tokens, ${o.sessions} sessions${o.listUsd!==null?". Dollar figures are list-price estimates, not billed amounts.":""}${o.unpriced?` ${o.unpriced} tool${o.unpriced===1?" has":"s have"} no known price.`:""}</div>
      <table class="now-table now-table--plain">
        <tbody>${o.rows.slice(0,5).map(c=>g`<tr key=${c.tool}>
          <td class="now-table__project" title=${(c.tokens_source||[]).length?"Tokens from "+c.tokens_source.join(", ")+(c.tokens_quality?" ("+c.tokens_quality+")":""):c.tokens_reason||""}><${Xl} tool=${c.tool} size="1em"/> ${bl(c.tool,n)}</td>
          <td class="num">${gt(c.total_tokens||0)}</td>
          <td class="num"><${Zf} row=${c}/></td>
        </tr>`)}</tbody>
      </table>
      <button type="button" class="now-link now-panel__more" onClick=${e}>Open budget</button>
    </${rn}>
  </section>`}function op({command:e}){const[t,l]=X(!1);if(!e)return null;const n=e.startsWith("aictl ");return g`<div class="now-issue__fix">
    <code>${e}</code>
    ${n&&g`<button type="button" class="now-link" onClick=${()=>{var o;try{(o=navigator.clipboard)==null||o.writeText(e),l(!0),setTimeout(()=>l(!1),1500)}catch{}}}
      aria-label=${"Copy command: "+e}>${t?"Copied":"Copy"}</button>`}
  </div>`}function ip({selfStatus:e}){const t=ko(e);return t?g`<div class=${"now-storage"+(t.degraded?" is-degraded":"")}>
    <span>Capture <strong>${t.mode||"not reported"}</strong></span>
    <span>Disk <strong>${Kl(t)}</strong></span>
    ${t.pct!=null&&g`<div class="now-storage__bar" role="meter" aria-label="Disk use against budget"
      aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.min(t.pct,100)}>
      <span class=${t.pct>=90?"is-high":""} style=${{width:Math.min(t.pct,100)+"%"}}></span>
    </div>`}
  </div>`:null}function rp({models:e}){const t=Object.values(e&&!e.error?e:{}).filter(n=>{var s;return n.value||((s=n.conflicts)==null?void 0:s.length)});if(!t.length)return null;const l=new Map;for(const n of t){const s=JSON.stringify([n.value,n.source,n.line,n.conflicts]);l.has(s)?l.get(s).labels.push(bl(n.tool)):l.set(s,{...n,labels:[bl(n.tool)]})}return g`<div class="now-models" data-testid="now-models">
    ${[...l.values()].map(n=>g`<div key=${n.tool} class="now-models__row">
      <span>${n.labels.join(", ")} model <strong>${n.value||"no pin"}</strong></span>
      ${n.source&&g`<span class="now-models__source" title=${n.why_in_effect}>
        ${n.line?`${n.source}:${n.line}`:n.source}${n.in_project?"":" (not in this project, still in effect)"}
      </span>`}
      ${(n.conflicts||[]).map(s=>g`<span key=${s.requested_at} class="now-models__conflict" data-testid="now-model-conflict">
        Conflict: ${s.requested.join(", ")} requested at ${s.requested_at}, ${s.pinned} is pinned
      </span>`)}
    </div>`)}
  </div>`}function ap({snap:e,enabledTools:t,connected:l,otelActive:n,alerts:s,selfStatus:o,onOpenTab:r}){const a=Un(()=>Mc(),[],{pollMs:6e4}),c=Un(()=>Cc(),[],{pollMs:6e4}),d=Un(()=>_r(),[],{pollMs:6e4}),v=Un(()=>ep(t),[t],{pollMs:6e4}),p=e!=null&&e.timestamp?Date.now()/1e3-e.timestamp:null,h=Me(()=>ko(o),[o]),b=v.updatedAt?v.data:void 0,S=Me(()=>new Set(((e==null?void 0:e.sessions)||[]).map(x=>x.tool)),[e]),D=Me(()=>Gf({connected:l,snapAgeS:p,hooks:c.data,quality:d.data,otelActive:n,alerts:s,storage:h,runningTools:S,hiddenContext:b,enabledTools:t}),[l,p,c.data,d.data,n,s,h,S,b,t]),w=D.filter(x=>x.level==="error").length,T=D.filter(x=>x.level==="warn").length,k=c.loading&&!c.data&&d.loading&&!d.data,A=k?"...":w+T;return g`<section class="now-panel now-panel--health" aria-labelledby="now-health">
    <header class="now-panel__head">
      <h2 id="now-health">Needs attention</h2>
      <span class=${"now-panel__figure"+(w?" is-error":T?" is-warn":" is-ok")}>${A}</span>
      <span class="now-panel__sub">${w} error${w===1?"":"s"}, ${T} warning${T===1?"":"s"}</span>
    </header>
    <${ip} selfStatus=${o}/>
    <${rp} models=${a.data}/>
    ${c.error&&!c.data&&g`<${rn} status="error" error=${c.error}
      onRetry=${c.reload} label="hook status"/>`}
    ${D.length===0&&!k&&!c.error?g`<${rn} status="empty" emptyTitle="All collectors and hooks are healthy"
          emptyHint="Hook delivery, data quality and the live stream all report OK."/>`:g`<ul class="now-issues">
          ${D.slice(0,7).map(x=>g`<li key=${x.id} class=${"now-issue now-issue--"+x.level}>
            <span class="now-issue__level">${x.level==="error"?"Error":x.level==="warn"?"Warn":"Info"}</span>
            <div class="now-issue__body">
              <div class="now-issue__title">${x.tab?g`<button type="button" class="now-link" onClick=${()=>r(x.tab)}>${x.title}</button>`:x.title}</div>
              <div class="now-issue__detail">${x.detail}</div>
              <${op} command=${x.fix}/>
            </div>
          </li>`)}
          ${D.length>7&&g`<li class="now-panel__sub">${D.length-7} more in Monitoring health below.</li>`}
        </ul>`}
  </section>`}function cp({snap:e,enabledTools:t,connected:l,otelActive:n,alerts:s,selfStatus:o,onOpenSession:r,onOpenTab:a}){return g`<div class="now-grid">
    <${lp} snap=${e} enabledTools=${t}
      onOpenSession=${r} onShowAll=${()=>a("live")}/>
    <${sp} onOpenBudget=${()=>a("budget")} cloudScope=${jn(e,t)} enabledTools=${t} snap=${e}/>
    <${ap} snap=${e} enabledTools=${t} connected=${l} otelActive=${n}
      alerts=${s} selfStatus=${o} onOpenTab=${a}/>
  </div>`}function up({globalRange:e,onPreset:t,onApplyCustom:l}){const[n,s]=X(!1),[o,r]=X(""),a=Z(null),c=Z(null),d=re(()=>{s(!0),r(""),requestAnimationFrame(()=>{if(!(!a.current||!c.current))if(e.until!=null)a.current.value=Ol(e.since),c.current.value=Ol(e.until);else{const p=yl.find(S=>S.id===e.id),h=Date.now()/1e3,b=(p==null?void 0:p.seconds)||86400;a.current.value=Ol(h-b),c.current.value=Ol(h)}})},[e]),v=re(()=>{var S,D;const{since:p,until:h,error:b}=Ac((S=a.current)==null?void 0:S.value,(D=c.current)==null?void 0:D.value);if(b){r(b);return}r(""),l(p,h),s(!1)},[l]);return g`<div class="global-range-bar">
    <div class="range-bar" role="group" aria-label="Time range">
      ${yl.map(p=>g`<button key=${p.id}
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
  </div>`}function dp(e,t){const l=e.filter(s=>Jl.has(s.tool));if(t==null)return`All tools (${l.length})`;const n=l.filter(s=>t.includes(s.tool)).map(s=>s.label);return n.length===0?"No tools":n.length<=2?n.join(", "):`${n[0]} +${n.length-1}`}function fp({snap:e,enabledTools:t,onToggle:l,onSetAll:n}){if(!e)return null;const s=wr(e.tools.filter(c=>!c.meta));if(!s.length)return null;const o=t===null,r=dp(s,t),a=g`<button type="button" class=${"hdr-btn tool-filter-trigger"+(o?"":" is-filtered")}
    aria-label=${"Tool filter: "+r}>
    <${Qt} name="filter" size="12"/> ${r}
  </button>`;return g`<${Ul} trigger=${a} placement="bottom">
    <div class="tool-filter-bar" role="group" aria-label="Filter every panel by tool">
      <label class="tool-filter-item">
        <input type="checkbox" checked=${o}
          onChange=${()=>n(o?[]:null)} />
        <span>All tools</span>
      </label>
      <hr class="hdr-views-sep"/>
      ${s.map(c=>{const d=Jl.has(c.tool),v=t===null||t.includes(c.tool);return g`<label key=${c.tool}
          class=${"tool-filter-item"+(d?"":" tool-unverified")}
          title=${d?"":"Discovery only: this tool is not verified yet, so it cannot be filtered"}>
          <input type="checkbox" checked=${v} disabled=${!d}
            onChange=${()=>d&&l(c.tool)} />
          <${Xl} tool=${c.tool} size="1em"/>
          <span>${c.label}</span>
        </label>`})}
    </div>
  </${Ul}>`}const pp=30;function mp({timestamp:e}){const[,t]=X(0);if(ie(()=>{const s=setInterval(()=>t(o=>o+1),5e3);return()=>clearInterval(s)},[]),!e)return null;const l=Math.max(0,Math.floor(Date.now()/1e3-e)),n=l>pp;return g`<span class=${"conn "+(n?"stale":"ok")} role="status" aria-live="polite"
    title=${"Last data snapshot received "+l+"s ago"+(n?" — the refresh loop may be stalled":"")}>
    ● ${n?"stale "+l+"s":l+"s"}
    <span class="sr-only">${n?" — data is stale":" — data age"}</span>
  </span>`}function hp({selfStatus:e}){const t=ko(e);if(!t||t.used==null&&!t.mode)return null;const l=t.degraded?"err":t.pct>=90?"stale":"off";return g`<span class=${"conn hdr-desktop-only "+l} title=${"Disk: "+Kl(t)}>
    ${t.mode?"capture="+t.mode+" ":""}${t.used!=null?jt(t.used):""}${t.budget?" / "+jt(t.budget):""}
  </span>`}function vp({searchRef:e,searchQuery:t,onSearchChange:l,theme:n,cycleTheme:s,density:o,setDensity:r,otelActive:a,connected:c,selfStatus:d,globalRange:v,onPreset:p,onApplyCustom:h,snap:b,enabledTools:S,onToggleTool:D,onSetAllTools:w,views:T=[],matchingView:k=null,onApplyView:A,onDeleteView:x,onSaveView:y,onOpenPalette:E}){const[P,O]=X(!1),[q,R]=X(!1),[M,j]=X(""),N=re(()=>{const V=M.trim();V&&(y&&y(V),j(""),R(!1))},[M,y]),G=[{value:"compact",label:"Compact"},{value:"normal",label:"Normal"},{value:"spacious",label:"Spacious"}],B=g`<button class="hdr-btn" type="button"
    aria-label="Saved views" title="Saved views">
    Views${k?": "+k.name:""} ▾
  </button>`;return g`<header role="banner">
    <h1>aictl</h1>
    <div class="hdr-scope" role="group" aria-label="Scope for every panel">
      <${up} globalRange=${v}
        onPreset=${p} onApplyCustom=${h}/>
      <${fp} snap=${b} enabledTools=${S}
        onToggle=${D} onSetAll=${w}/>
    </div>
    <div class="hdr-right">
      <!-- Mobile overflow toggle -->
      <button class="hdr-btn hdr-mobile-only" type="button" aria-label="Menu"
        aria-expanded=${P?"true":"false"}
        onClick=${()=>O(V=>!V)}>
        <${cu} size="16" aria-hidden="true"/>
      </button>

      <input type="text" ref=${e} class="search-box hdr-desktop-only"
        placeholder="Filter... ( / )" aria-label="Filter tools"
        value=${t} onInput=${V=>l(V.target.value)}/>

      <!-- Command palette trigger -->
      <button class="hdr-cmdk" type="button"
        onClick=${E}>
        <${au} size="14" aria-hidden="true"/>
        <span class="hdr-desktop-only">Commands</span>
        <${et} class="hdr-desktop-only" aria-hidden="true">${kr()}</${et}>
        <span class="sr-only">open command palette</span>
      </button>

      <!-- Views dropdown -->
      <${Ul} trigger=${B} placement="bottom" class="hdr-desktop-only">
        <div class="hdr-views-menu" role="group" aria-label="Saved views">
          ${T.length===0?g`<div class="hdr-views-empty text-muted">No saved views</div>`:T.map(V=>g`<div key=${V.id} class="hdr-views-row">
                <button class="hdr-views-apply" type="button"
                  onClick=${()=>A&&A(V.id)}
                  aria-label=${"Apply view "+V.name}>${V.name}</button>
                <button class="hdr-views-del" type="button"
                  aria-label=${"Delete view "+V.name}
                  onClick=${()=>x&&x(V.id)}>
                  <${du} size="12" aria-hidden="true"/>
                </button>
              </div>`)}
          <hr class="hdr-views-sep"/>
          <${sn} variant="ghost" size="sm"
            onClick=${()=>R(!0)}>
            <${uu} size="12" aria-hidden="true"/> Save current view…
          </${sn}>
        </div>
      </${Ul}>

      <!-- Theme toggle -->
      <button class="theme-btn" type="button" onClick=${s}
        aria-label=${"Toggle theme: "+n} title=${"Theme: "+n}>
        <${Qt} name=${n==="light"?"sun":n==="editorial"?"pen":"moon"} size="16"/>
      </button>

      ${a?g`<span class="conn ok" title="OTel receiver active">OTel</span>`:g`<span class="conn off" title="OTel receiver inactive — enable with: aictl otel enable">OTel off</span>`}
      <${hp} selfStatus=${d}/>
      <${mp} timestamp=${b==null?void 0:b.timestamp}/>
      <span class=${"conn "+(c?"ok":"err")} role="status" aria-live="polite">
        ${c?"live":"reconnecting..."}
        <span class="sr-only">${c?" — connected":" — connection lost, reconnecting"}</span>
      </span>
    </div>

    ${P&&g`<div class="hdr-mobile-overflow hdr-mobile-only">
      <input type="text" class="search-box" placeholder="Filter..."
        aria-label="Filter tools"
        value=${t} onInput=${V=>l(V.target.value)}/>
      <${dc}
        ariaLabel="Density"
        value=${o}
        options=${G}
        onChange=${r}/>
    </div>`}

    ${q&&g`<${Yn} open=${!0}
      onClose=${()=>R(!1)} ariaLabel="Save view">
      <h3 style="margin-bottom:var(--sp-5)">Save current view</h3>
      <input type="text" class="search-box" style="width:100%"
        placeholder="View name" value=${M}
        onInput=${V=>j(V.target.value)}
        onKeyDown=${V=>V.key==="Enter"&&N()}
        autoFocus=${!0}/>
      <div style="display:flex;gap:var(--sp-3);margin-top:var(--sp-6);justify-content:flex-end">
        <${sn} variant="ghost" onClick=${()=>R(!1)}>Cancel</${sn}>
        <${sn} variant="primary" onClick=${N}>Save</${sn}>
      </div>
    </${Yn}>`}
  </header>`}const vr=[{id:"overview",label:"Dashboard",sub:"live event stream"},{id:"explorer",label:"Sessions",sub:"history & traces"},{id:"agents",label:"Agents",sub:"instrumentation"},{id:"prompts",label:"Prompts",sub:"library & workflows"}];function gp(){const e=new Date,t=String(e.getMonth()+1).padStart(2,"0"),l=e.toLocaleDateString("en-CA");return`The aictl daily · vol. ${t} · ${l}`}function $p({activeTab:e,setActiveTab:t}){const l=io(_l),n=l==null?void 0:l.snap,s=Me(()=>{var c;let a=0;for(const d of(n==null?void 0:n.tools)||[])for(const v of((c=d.live)==null?void 0:c.sessions)||[])v.active!==!1&&a++;return a},[n]),o=vr.find(a=>a.id===e),r=s>0?`Live · ${s} session${s!==1?"s":""}`:"Live";return g`<div class="cmasthead">
    <div class="cmasthead-top">
      <div class="cmasthead-identity">
        <div class="cmasthead-kicker">${gp()}</div>
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
      ${vr.map(a=>g`<button
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
  </div>`}function bp({tabs:e,activeTab:t,setActiveTab:l}){const n=Z(null);return ie(()=>{var o,r;const s=(o=n.current)==null?void 0:o.querySelector('[aria-current="page"]');(r=s==null?void 0:s.scrollIntoView)==null||r.call(s,{block:"nearest",inline:"nearest"})},[t]),g`<nav class="tab-nav" ref=${n} aria-label="Dashboard sections">
    ${Fl.navGroups.map(s=>g`<div key=${s.id} class="tab-group" role="group" aria-labelledby=${"nav-"+s.id}>
      <div class="tab-group__label" id=${"nav-"+s.id}>${s.label}</div>
      ${e.filter(o=>o.group===s.id).map(o=>g`<button key=${o.id} type="button" class="tab-btn"
        aria-current=${t===o.id?"page":null}
        aria-keyshortcuts=${o.key||null}
        onClick=${()=>l(o.id)}>
        <span class="tab-btn-icon"><${Qt} name=${o.iconName} size="14"/></span>
        <span class="tab-btn__label">${o.label}</span>
        ${o.key&&g`<kbd class="tab-btn__key" aria-hidden="true">${o.key}</kbd>`}
      </button>`)}
    </div>`)}
  </nav>`}function _p(e,t){if(!t)return 1;const l=t.toLowerCase(),n=(e.label||"").toLowerCase(),s=(e.group||"").toLowerCase();if(n.startsWith(l))return 1e3-n.length;if(n.includes(l))return 500-n.indexOf(l);if(s.startsWith(l))return 300;if(s.includes(l))return 150;let o=0;for(const r of n)if(r===l[o]&&o++,o===l.length)break;return o===l.length?50:0}function yp({commands:e=[],isOpen:t,onClose:l,lru:n=[],onRun:s}){const[o,r]=X(""),[a,c]=X(0),d=Z(null),v=Z(null);ie(()=>{t&&(r(""),c(0))},[t]),ie(()=>{t&&d.current&&d.current.focus()},[t]);const p=Me(()=>{if(!o){const w=new Map(e.map(A=>[A.id,A])),T=n.map(A=>w.get(A)).filter(Boolean),k=e.filter(A=>!n.includes(A.id));return[...T,...k]}return e.map(w=>({c:w,s:_p(w,o)})).filter(w=>w.s>0).sort((w,T)=>T.s-w.s).map(w=>w.c)},[e,o,n]);ie(()=>{c(0)},[o]);const h=re(w=>{if(w){s&&s(w);try{w.action&&w.action()}catch(T){console.error("Command failed:",T)}l&&l()}},[s,l]),b=re(w=>{w.key==="ArrowDown"?(w.preventDefault(),c(T=>Math.min(T+1,p.length-1))):w.key==="ArrowUp"?(w.preventDefault(),c(T=>Math.max(T-1,0))):w.key==="Enter"&&(w.preventDefault(),h(p[a]))},[p,a,h]);ie(()=>{if(!v.current)return;const w=v.current.querySelector(`[data-cmd-idx="${a}"]`);w&&w.scrollIntoView&&w.scrollIntoView({block:"nearest"})},[a]);const S=Me(()=>{const w=[],T=new Map;return p.forEach(k=>{const A=k.group||"Commands";T.has(A)||(T.set(A,w.length),w.push({group:A,items:[]})),w[T.get(A)].items.push(k)}),w},[p]);let D=-1;return g`<${Yn} open=${t} onClose=${l} ariaLabel="Command palette" class="cmdk-dialog">
    <div class="cmdk">
      <div class="cmdk-input-row">
        <${Nc} size="16" aria-hidden="true"/>
        <input
          ref=${d}
          type="text"
          class="cmdk-input"
          placeholder="Type a command or search…"
          value=${o}
          onInput=${w=>r(w.target.value)}
          onKeyDown=${b}
          aria-label="Search commands"
          aria-controls="cmdk-list"
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-activedescendant=${p.length?"cmdk-opt-"+a:null}
        />
        <${et}>Esc</${et}>
      </div>
      <div id="cmdk-list" class="cmdk-list" role="listbox" ref=${v}>
        ${p.length===0?g`<${Rr} icon="search" title="No commands"
              description=${o?'No commands match "'+o+'"':"Start typing…"}/>`:S.map(w=>g`<div key=${w.group} class="cmdk-group" role="group" aria-label=${w.group}>
              <div class="cmdk-group-label" aria-hidden="true">${w.group}</div>
              ${w.items.map(T=>{D+=1;const k=D,A=k===a;return g`<button key=${T.id}
                  type="button"
                  id=${"cmdk-opt-"+k}
                  class=${"cmdk-item"+(A?" cmdk-item--active":"")}
                  role="option"
                  aria-selected=${A?"true":"false"}
                  data-cmd-idx=${k}
                  onMouseEnter=${()=>c(k)}
                  onClick=${()=>h(T)}
                >
                  <span class="cmdk-item__label">${T.label}</span>
                  ${T.shortcut?g`<${et}>${T.shortcut}</${et}>`:null}
                </button>`})}
            </div>`)}
      </div>
      <div class="cmdk-foot">
        <${et}>↑</${et}><${et}>↓</${et}> navigate
        · <${et}>↵</${et}> run
        · <${et}>Esc</${et}> close
      </div>
    </div>
  </${Yn}>`}function wp({target:e="#main-content",label:t="Skip to main content"}){return g`<a href=${e} class="skip-link">${t}</a>`}function Bs(e,t){try{const l=localStorage.getItem("aictl-pref-"+e);return l!=null?JSON.parse(l):t}catch{return t}}const kp={live:3600,"1h":3600,"6h":21600,"24h":86400,"7d":604800},Sp={snap:null,history:null,connected:!1,activeTab:Bs("active_tab","overview"),globalRange:(()=>{const e=Bs("range","live"),t=kp[e]||3600;return{id:e,since:Date.now()/1e3-t,until:null}})(),searchQuery:"",theme:(()=>{try{return localStorage.getItem("aictl-theme")||"auto"}catch{return"auto"}})(),viewerPath:null,events:[],enabledTools:Bs("tool_filter",null)};function xp(e,t){switch(t.type){case"SSE_UPDATE":{const l=t.payload,n=e.snap?Sr(e.snap,l):e.snap,s=xr(e.history,l);return{...e,snap:n,history:s,connected:!0}}case"SNAP_REPLACE":return{...e,snap:t.payload};case"HISTORY_INIT":return{...e,history:t.payload};case"EVENTS_INIT":return{...e,events:t.payload};case"SET_CONNECTED":return{...e,connected:t.payload};case"SET_TAB":return{...e,activeTab:t.payload};case"SET_RANGE":return{...e,globalRange:t.payload};case"SET_SEARCH":return{...e,searchQuery:t.payload};case"SET_THEME":return{...e,theme:t.payload};case"SET_VIEWER":return{...e,viewerPath:t.payload};case"SET_TOOL_FILTER":return{...e,enabledTools:t.payload};default:return e}}const Ep=at(()=>rt(()=>import("./TabOverview-BO71XZg0.js"),__vite__mapDeps([10,1,2,8,9,3,4,5,7]))),Tp=at(()=>rt(()=>import("./TabMemory-MSV7Vmvj.js"),__vite__mapDeps([11,1,2,8,9,3,4,5,7]))),Mp=at(()=>rt(()=>import("./ContextMap-69nz0pIV.js"),__vite__mapDeps([12,1,2,3,4,5,7,8,9]))),Cp=at(()=>rt(()=>import("./TabLive-CfQ1hEN9.js"),__vite__mapDeps([13,1,2,14,4,3,5,7,8,9]))),Ap=at(()=>rt(()=>import("./TabEventsStats-O2U2sBTz.js"),__vite__mapDeps([15,1,2,3,4,5,7,8,9]))),Lp=at(()=>rt(()=>import("./TabBudget-C27aKk05.js"),__vite__mapDeps([16,1,2,14,4,3,5,17,7,8,9]))),Dp=at(()=>rt(()=>import("./TabAnalytics-BJHrXZvL.js"),__vite__mapDeps([18,1,4,3,2,5,19,7,8,9]))),Pp=at(()=>rt(()=>import("./TabExplorer-BXViSjun.js"),__vite__mapDeps([20,1,2,3,4,5,21,7,6,17,8,9]))),Op=at(()=>rt(()=>import("./TabToolConfig-BwxL1VuB.js"),__vite__mapDeps([22,1,2,23,3,4,5,24,25,7,8,9]))),Rp=at(()=>rt(()=>import("./TabProjectEnv-DjsNgFIM.js"),__vite__mapDeps([26,1,2,3,4,5,7,8,9]))),Ip=at(()=>rt(()=>import("./CAgentsTab-5R3ib280.js"),__vite__mapDeps([27,1,2,3,4,5,7,8,9]))),Np=at(()=>rt(()=>import("./CDashboardTab-D1EaUTEs.js"),__vite__mapDeps([28,1,2,3,4,5,7,8,9]))),Vp=at(()=>rt(()=>import("./CPromptsTab-DhVI1HsT.js"),__vite__mapDeps([29,1,2,3,4,5,8,9,7]))),Fp=at(()=>rt(()=>import("./CSessionsTab-D8WXYUdr.js"),__vite__mapDeps([30,1,2,3,4,5,7,8,9]))),zp=new Set(["live","procs","events","explorer","budget","analytics","memory"]),Hp=()=>g`<div class="tab-skeleton" role="status" aria-busy="true" aria-label="Loading view">
  <${Gn} height="120px" radius="var(--radius-sm)"/>
  <${Gn} height="200px" radius="var(--radius-sm)"/>
</div>`,ge=({tabName:e,children:t})=>g`<${wi} key=${e}><${Bl} fallback=${g`<${Hp}/>`}>${t}</${Bl}></${wi}>`;function Bp(e,t){const l=Z({});ie(()=>{const n=t.current;if(!n)return;const s=l.current[e]||0;n.scrollTop=s;let o=!1;const r=s?[150,500,1200].map(d=>setTimeout(()=>{o||(n.scrollTop=s)},d)):[],a=()=>{o=!0},c=()=>{l.current[e]=n.scrollTop};return n.addEventListener("wheel",a,{passive:!0,once:!0}),n.addEventListener("touchstart",a,{passive:!0,once:!0}),n.addEventListener("scroll",c,{passive:!0}),()=>{r.forEach(clearTimeout),n.removeEventListener("wheel",a),n.removeEventListener("touchstart",a),n.removeEventListener("scroll",c)}},[e,t])}function Up(e,t){ie(()=>{const l=n=>{var s;n.key==="Escape"&&t(null),n.key==="/"&&!gr(n.target)&&(n.preventDefault(),(s=e.current)==null||s.focus())};return document.addEventListener("keydown",l),()=>document.removeEventListener("keydown",l)},[e,t])}function Wp(){const[e,t]=X(!1);return ie(()=>{let l=!0;const n=()=>$r().then(o=>{l&&t(o.active||!1)}).catch(()=>{l&&t(!1)});n();const s=setInterval(n,3e4);return()=>{l=!1,clearInterval(s)}},[]),e}function jp(e){const[t,l]=X(null),[n,s]=X([]);return ie(()=>{const{id:o,since:r,until:a}=e;o==="live"?l(null):o!=="custom"?Us({range:o}).then(l).catch(()=>{}):Us({since:r,until:a}).then(l).catch(()=>{}),Pc({since:r,until:a}).then(s).catch(()=>{})},[e]),{dbHistory:t,events:n}}function Gp(e){const t=Z(!1),l=Z(e);ie(()=>{if(e&&!t.current){t.current=!0,l.current=e;return}e!==l.current&&(e?(Ks.success("Reconnected"),si("Connection restored")):t.current&&(Ks.error("Disconnected. Retrying…"),si("Connection lost, retrying","assertive")),l.current=e)},[e])}function Kp(e){var r;if(!e)return[];const t=[];let l=0,n=0,s=0,o=0;for(const a of e.tools||[])for(const c of a.processes||[]){const d=parseFloat(c.mem_mb)||0,v=(c.process_type||"").toLowerCase();(v==="subagent"||v==="agent")&&(l+=d),v==="mcp-server"&&c.zombie_risk&&c.zombie_risk!=="none"&&n++,(v==="browser"||(c.name||"").toLowerCase().includes("headless"))&&s++,(r=c.anomalies)!=null&&r.length&&(o+=c.anomalies.length)}return l>2048&&t.push({level:"red",msg:`Subagent memory: ${jt(l*1048576)} (>2GB) — consider cleanup`}),n>0&&t.push({level:"orange",msg:`${n} MCP server(s) with dead parent — may be orphaned`}),s>0&&t.push({level:"yellow",msg:`${s} headless browser process(es) detected — check for leaks`}),o>5&&t.push({level:"orange",msg:`${o} process anomalies detected`}),t}function Vl(e,t){return Ic(e,t)}function Ea(e,t,l){if(!e)return e;let n=e.tools.filter(s=>Jl.has(s.tool)||s.tool==="aictl");if(n=n.filter(s=>ql(s.tool,t)),l){const s=l.toLowerCase();n=n.filter(o=>o.label.toLowerCase().includes(s)||o.tool.toLowerCase().includes(s)||o.vendor&&o.vendor.toLowerCase().includes(s)||(o.files||[]).some(r=>r.path.toLowerCase().includes(s))||(o.processes||[]).some(r=>(r.name||"").toLowerCase().includes(s)||(r.cmdline||"").toLowerCase().includes(s))||o.live&&((o.live.workspaces||[]).some(r=>r.toLowerCase().includes(s))||(o.live.sources||[]).some(r=>r.toLowerCase().includes(s))))}return{...e,tools:wr(n),sessions:Vl(e.sessions,t),tool_telemetry:Vl(e.tool_telemetry,t),tool_configs:Array.isArray(e.tool_configs)?e.tool_configs.filter(s=>Rc(s,t)):e.tool_configs,mcp_detail:Vl(e.mcp_detail,t),events:Vl(e.events,t),agent_memory:Array.isArray(e.agent_memory)&&Hl(t)?e.agent_memory.filter(s=>Oc(s,t)):e.agent_memory,filter_hidden_unlisted:Hl(t)?cl(e.sessions)+cl(e.tool_telemetry)+cl(e.tool_configs)+cl(e.mcp_detail)+cl(e.events):0}}function So(e,t){try{document.dispatchEvent(new CustomEvent("aictl:select-session",{detail:{sessionId:e,tool:t}}))}catch{}}function Yp({tabs:e,setActiveTab:t,setPreset:l,presets:n,allTools:s,toggleTool:o,setTheme:r,setDensity:a,views:c,applyView:d,snap:v,onShowShortcuts:p}){const h=[];e.forEach(b=>h.push({id:"tab:"+b.id,group:"Jump to tab",label:b.label,shortcut:b.key,action:()=>t(b.id)})),n.forEach(b=>h.push({id:"range:"+b.id,group:"Range",label:"Set range: "+b.label,action:()=>l(b.id)})),(s||[]).forEach(b=>h.push({id:"filter:"+b,group:"Filter",label:"Toggle tool: "+b,action:()=>o(b)}));for(const b of((v==null?void 0:v.sessions)||[]).slice(0,40)){if(!b.session_id)continue;const S=yr(b.project)||"no project";h.push({id:"session:"+b.session_id,group:"Session",label:"Open session: "+S+" ("+(b.label||b.tool)+")",action:()=>{t("explorer"),So(b.session_id,b.tool)}})}return c.forEach(b=>h.push({id:"view:"+b.id,group:"View",label:"Apply view: "+b.name,action:()=>d(b.id)})),["auto","dark","light","editorial"].forEach(b=>h.push({id:"theme:"+b,group:"Appearance",label:"Theme: "+b,action:()=>r(b)})),["compact","normal","spacious"].forEach(b=>h.push({id:"density:"+b,group:"Appearance",label:"Density: "+b,action:()=>a(b)})),h.push({id:"help:shortcuts",group:"Shortcuts",label:"Keyboard shortcuts",action:()=>{p&&p()}}),h}function qp({open:e,onClose:t,tabs:l}){if(!e)return null;const n=[...l.map(s=>[s.label,s.key]),["Previous / next view","[ ]"],["Command palette",kr()],["Focus filter","/"],["This list","?"],["Close panels","Esc"]];return g`<${Yn} open=${!0} onClose=${t} ariaLabel="Keyboard shortcuts">
    <h3 style="margin-bottom:var(--sp-5)">Keyboard shortcuts</h3>
    <ul style="list-style:none;margin:0;padding:0;min-width:220px">
      ${n.map(([s,o])=>g`<li key=${s}
        style="display:flex;justify-content:space-between;align-items:center;gap:var(--sp-6);padding:var(--sp-1) 0">
        <span>${s}</span><${et}>${o}</${et}>
      </li>`)}
    </ul>
  </${Yn}>`}function Ta({theme:e,snap:t,filteredSnap:l,enabledTools:n,effectiveHistory:s,activeTab:o,connected:r,otelActive:a,alerts:c,selfStatus:d,openSession:v,setActiveTab:p,setTheme:h}){return{overview:()=>e==="editorial"?g`<${ge} tabName="overview">
          <${Np}/>
          <div class="mb-lg" style="margin-top:var(--sp-6)">
            <div class="c-overline" style="margin-bottom:var(--sp-3)">Monitoring</div>
            <${yi}/>
          </div>
        </${ge}>`:g`<${ge} tabName="overview">
          <${cp} snap=${l} enabledTools=${n}
            connected=${r} otelActive=${a} alerts=${c} selfStatus=${d}
            onOpenSession=${v} onOpenTab=${p}/>
          ${!jn(t,n)&&g`<${Uf} snap=${l} history=${s} enabledTools=${n}/>`}
          <div class="mb-lg"><${yi}/></div>
        </${ge}>`,hidden:()=>g`<${ge} tabName="hidden"><${np}/></${ge}>`,procs:()=>g`<${ge} tabName="procs"><div class="mb-lg"><${Ep}/></div></${ge}>`,memory:()=>g`<${ge} tabName="memory"><div class="mb-lg"><${Mp}/></div><div class="mb-lg"><${Tp}/></div></${ge}>`,live:()=>g`<${ge} tabName="live"><div class="mb-lg"><${Cp}/></div></${ge}>`,events:()=>g`<${ge} tabName="events"><div class="mb-lg"><${Ap} key=${"events-"+o}/></div></${ge}>`,budget:()=>g`<${ge} tabName="budget"><div class="mb-lg"><${Lp} key=${"budget-"+o}/></div></${ge}>`,analytics:()=>g`<${ge} tabName="analytics"><div class="mb-lg"><${Dp} key=${"analytics-"+o}/></div></${ge}>`,explorer:()=>e==="editorial"?g`<${ge} tabName="explorer"><${Fp}
          onInspect=${(b,S)=>{p("explorer"),So(b,S),h("auto")}}
        /></${ge}>`:g`<${ge} tabName="explorer"><div class="mb-lg"><${Pp} key=${"explorer-"+o}/></div></${ge}>`,config:()=>g`<${ge} tabName="config">
      <div class="mb-lg"><${Op}/></div>
      <div class="mb-lg"><${Rp} snap=${t}/></div>
    </${ge}>`,agents:()=>g`<${ge} tabName="agents"><${Ip}
      onViewSessions=${()=>p("explorer")}
      onViewConfig=${()=>p("config")}/></${ge}>`,prompts:()=>g`<${ge} tabName="prompts"><${Vp}/></${ge}>`}}function Jp(){var Zt;const{snapshot:e,history:t,connected:l}=Jc(),{range:n,setPreset:s,setCustom:o,setRange:r}=eu(),{activeTab:a,setActiveTab:c,tabs:d}=fc(),{theme:v,setTheme:p,cycleTheme:h}=Lc(),{density:b,setDensity:S}=nu(),D=Me(()=>e?e.tools.filter(ne=>ne.tool!=="aictl"&&ne.tool!=="any"&&Jl.has(ne.tool)).map(ne=>ne.tool):[],[e]),{selectedTools:w,toggleTool:T,setTools:k}=Dc(D),[A,x]=X(""),[y,E]=X(null),P=Z(null);Up(P,E),Gp(l);const O=Wp(),{data:q}=Un(()=>br(),[],{pollMs:6e4}),{dbHistory:R,events:M}=jp(n),j=Me(()=>({tab:a,range:n,tools:w,density:b,theme:v}),[a,n,w,b,v]),N=re(ne=>{ne.tab&&c(ne.tab),ne.range&&r(ne.range),ne.tools!==void 0&&k(ne.tools),ne.density&&S(ne.density),ne.theme&&p(ne.theme)},[c,r,k,S,p]),{views:G,saveView:B,deleteView:V,applyView:F,matchingView:De}=su(j,N),ce=ru(),[ae,ue]=X(!1),ee=re(()=>ue(!0),[]);ie(()=>{const ne=Oe=>{Oe.key==="?"&&!gr(Oe.target)&&ue(Re=>!Re)};return document.addEventListener("keydown",ne),()=>document.removeEventListener("keydown",ne)},[]);const K=Z(null);Bp(a,K);const Pe=re((ne,Oe)=>{c("explorer"),So(ne,Oe)},[c]),Ye=Me(()=>Yp({tabs:d,setActiveTab:c,setPreset:s,presets:yl,allTools:D,toggleTool:T,setTheme:p,setDensity:S,views:G,applyView:F,snap:e,onShowShortcuts:ee}),[d,c,s,D,T,p,S,G,F,e,ee]),_e=n.id==="live"?t:R||t,oe=n.until?n.until-n.since:Zl[n.id]||3600,ct=re((ne,Oe={})=>{if(!ne)return E(null);E({path:ne,at:Oe.at??null,line:Oe.line>0?Oe.line:null})},[]),Ce=Me(()=>Ea(e,w,A),[e,w,A]),ye=Me(()=>{var Re;const ne=Date.now()/1e3-300,Oe=new Map;for(const Ze of M)if(Ze.kind==="file_modified"&&Ze.ts>=ne&&((Re=Ze.detail)!=null&&Re.path)){const yt=Oe.get(Ze.detail.path);(!yt||Ze.ts>yt.ts)&&Oe.set(Ze.detail.path,{ts:Ze.ts,growth:Ze.detail.growth_bytes||0,tool:Ze.tool})}return Oe},[M]),_t=Me(()=>({snap:Ce,history:t,openViewer:ct,recentFiles:ye,globalRange:n,rangeSeconds:oe,enabledTools:w}),[Ce,t,ct,ye,n,oe,w]),Ct=Me(()=>Kp(Ce),[Ce]),Qe=Z(null);Qe.current=hu(Qe.current,_t,{activeTab:a});const Nt=Qe.current.value,Gt=Ta({theme:v,snap:e,filteredSnap:Ce,enabledTools:w,effectiveHistory:_e,activeTab:a,connected:l,otelActive:O,alerts:Ct,selfStatus:q,openSession:Pe,setActiveTab:c,setTheme:p}),Kt=e!=null;return g`<${_l.Provider} value=${Nt}>
    <div class="main-wrap">
      <${wp}/>
      <${vp}
        searchRef=${P} searchQuery=${A} onSearchChange=${x}
        theme=${v} cycleTheme=${h}
        density=${b} setDensity=${S}
        otelActive=${O} connected=${l} selfStatus=${q}
        globalRange=${n} onPreset=${s} onApplyCustom=${o}
        snap=${e} enabledTools=${w}
        onToggleTool=${T} onSetAllTools=${k}
        views=${G} matchingView=${De}
        onApplyView=${F} onDeleteView=${V} onSaveView=${B}
        onOpenPalette=${ce.open}
      />
      ${v==="editorial"&&g`<${$p}
        activeTab=${a} setActiveTab=${c}
      />`}
      <div class="shell-body">
        <${bp} tabs=${d} activeTab=${a} setActiveTab=${c}/>
        <main class="main" id="main-content" tabindex="0" ref=${K}>
          <div class="main-view" aria-label=${(Zt=d.find(ne=>ne.id===a))==null?void 0:Zt.label}>
            ${Kt&&g`<${vu} count=${(Ce==null?void 0:Ce.filter_hidden_unlisted)||0}/>`}
            ${Kt?zp.has(a)&&jn(e,w)?g`<${fu} tools=${w.map(ne=>({tool:ne,label:bl(ne,e)}))}/>`:Gt[a]?Gt[a]():g`<p class="text-muted">Unknown tab "${a}"</p>`:g`<div class="tab-skeleton" role="status" aria-busy="true" aria-label="Loading dashboard">
                  <${Gn} height="120px" radius="var(--radius-sm)"/>
                  <${Gn} height="60px"  radius="var(--radius-sm)"/>
                  <${Gn} height="200px" radius="var(--radius-sm)"/>
                </div>`}
          </div>
        </main>
      </div>
    </div>
    <${gu} path=${(y==null?void 0:y.path)??(typeof y=="string"?y:null)}
      at=${typeof y=="object"?y==null?void 0:y.at:null}
      line=${typeof y=="object"?y==null?void 0:y.line:null}
      onClose=${()=>E(null)}/>
    <${Pu}/>
    <${yp} commands=${Ye}
      isOpen=${ce.isOpen} onClose=${ce.close}
      lru=${ce.lru} onRun=${ne=>ce.recordUse(ne.id)}/>
    <${qp} open=${ae}
      onClose=${()=>ue(!1)} tabs=${d}/>
    <${Eu}/>
  </${_l.Provider}>`}const cm=Object.freeze(Object.defineProperty({__proto__:null,default:Jp,filterSnap:Ea,initialState:Sp,reducer:xp,tabRenderers:Ta},Symbol.toStringTag,{value:"Module"}));export{Zf as C,Yn as D,Rr as E,vu as F,Df as M,rn as P,_l as S,Xl as T,Of as a,fu as b,Gn as c,sm as d,Qf as e,lm as f,Ws as g,im as h,Ks as i,cm as j,Fc as l,Nf as p,rm as r,am as s,om as t,Un as u};

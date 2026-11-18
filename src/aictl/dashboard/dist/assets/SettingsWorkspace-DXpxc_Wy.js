import{X as sn,Y as nn,Z as jt,$ as an,m as o,J as xe,a0 as on,a1 as ln,d as C,a2 as cn,a3 as J,a4 as ut,a5 as Vt,a6 as ce,q as R,a7 as rn,h as ht,a8 as dn,T as P,a9 as pn,i as un,aa as re,ab as de,ac as hn}from"./index-BiM5ZHgi.js";import{C as $n}from"./LoadedConfiguration-kD4o3nOk.js";import{inferKind as fn,DASH as Ft,isOn as mn,optionsFor as bn,isEnvSource as tt,envName as W,agentInherits as kt,pinWins as yn,scopeLabel as O,isLockedEntry as Bt,commonModel as kn,matchEnv as Ht,envWhereText as gn,plainValue as xt,SECTION_ORDER as Rt,SECTION_TITLES as Ut,topicMatrix as vn,isAgentRow as Me,PURPOSES as _n,GIT_STATES as Oe,LOCATIONS as wn,purposeOf as q,SCOPE_LABELS as Ae,gitCategory as Gt,matchFile as Cn,listOf as K,purposeGroups as Sn,fileGroups as xn,LOCATION_LABELS as ze,tildePath as V,fileMatrix as Mn,LOCATION_SHORT as pe,PURPOSE_LABELS as et,fileFolders as On,listParam as An,gitRisk as zn,findingGroups as Te,matchFinding as Ee,findingTools as $t,envWhere as Tn,agentDecision as En,samePath as ft,isUnset as Ln,whyWins as Dn,ruleLabel as Pn,writableScope as Nn,snapOf as jn,toolEntries as Fn,aictlEntry as Rn,projectRoots as qn,rowFilter as ue,absentManaged as In,mergeFiles as Wn,withFindingIds as Vn,labelOf as Bn,settingsSummary as Hn,ENV_PREFIX as he,readSettingsUrl as $e,FILE_PARAMS as Un,settingsParams as Gn,CLEAR_PARAMS as Kn}from"./model-BDsGu7Ac.js";import{u as j,a as Jn,n as Le}from"./tableGrid-D293au0B.js";/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wt=(...t)=>t.filter((e,s,a)=>!!e&&e.trim()!==""&&a.indexOf(e)===s).join(" ").trim();/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */function Xn(t,e,s=[]){throw new Error("[lucide]: iconNode is required when icon name is used")}/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yn=t=>{let e="",s=!1;for(const a of t){if(a==="-"||a==="_"||a<=" "){s=e.length>0;continue}e.length===0?e+=a.toLowerCase():e+=s?a.toUpperCase():a,s=!1}return e};/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zn=t=>{const e=Yn(t);return e.charAt(0).toUpperCase()+e.slice(1)};/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */function Pt(t){return t!=null}function Qn(t,e={}){var d,k;const s=e.attributeNames??{},a=y=>s[y]??y,n=t.size??t.width??U.width,l=t.size??t.height??U.height,i=((d=t.aliases)==null?void 0:d.filter(y=>typeof y=="string"&&y.trim()!=="").map(y=>`lucide-${y}`))??[],c=[...t.name?[`lucide-${t.name}`]:[],...i],p=((k=e.className)==null?void 0:k.split(" ").filter(Boolean))??[],h=e.includeDefaultClasses===!1?wt(...p):wt("lucide",...c,...p),u=e.absoluteStrokeWidth?Number(e.strokeWidth??U["stroke-width"])*Number(t.size??t.width??U.width)/Number(e.size??e.width??U.width):e.strokeWidth??U["stroke-width"];return["svg",{...Object.entries(U).reduce((y,[_,$])=>(y[a(_)]=$,y),{}),..."color"in e&&e.color&&{[a("stroke")]:e.color},..."size"in e&&Pt(e.size)&&{[a("width")]:e.size,[a("height")]:e.size},..."width"in e&&Pt(e.width)&&{[a("width")]:e.width},..."height"in e&&Pt(e.height)&&{[a("height")]:e.height},[a("stroke-width")]:u,...h&&{[a("class")]:h},[a("viewBox")]:`0 0 ${n} ${l}`,...e.hasA11yProp===!1?{[a("aria-hidden")]:"true"}:{},..."attributes"in e&&e.attributes},t.node.map(y=>{const[_,$,S]=y,A=e.nonScalingStroke?{[a("vector-effect")]:"non-scaling-stroke",...$}:$;return S?[_,A,S]:[_,A]})]}/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ta=t=>{for(const e in t)if(e.startsWith("aria-")||e==="role"||e==="title")return!0;return!1};/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ea=nn({size:24,color:"currentColor",strokeWidth:2,absoluteStrokeWidth:!1,nonScalingStroke:!1,class:""}),sa=()=>sn(ea);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const na=({color:t,size:e,width:s,height:a,strokeWidth:n,absoluteStrokeWidth:l,nonScalingStroke:i,children:c,iconNode:p=[],icon:h={node:p,aliases:[],size:24},class:u="",...r})=>{const{size:d=24,strokeWidth:k=2,absoluteStrokeWidth:y=!1,nonScalingStroke:_=!1,color:$="currentColor",class:S=""}=sa()??{},[A,st,L=[]]=Qn(h,{color:t??$,width:s??e??d,height:a??e??d,strokeWidth:n??k,absoluteStrokeWidth:l??y,nonScalingStroke:i??_,className:wt(S,u),hasA11yProp:!!c||ta(r),attributes:r});return jt(A,{...st},[...L.map(([nt,T])=>jt(nt,T)),...an(c)])};/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */function f(t,e,s=[]){const a=typeof t=="string"?Xn(t,e,s):t,n=({class:l="",className:i="",children:c,...p})=>jt(na,{...p,icon:a,class:wt(l,i)},c);return a.name&&(n.displayName=Zn(a.name)),n}/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const De={name:"activity",size:24,node:[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]};De.node;const aa=f(De);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pe={name:"archive",size:24,node:[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]};Pe.node;const oa=f(Pe);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ne={name:"banknote",size:24,node:[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]]};Ne.node;const la=f(Ne);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const je={name:"book-open",size:24,node:[["path",{d:"M12 5v16",key:"1f6ucr"}],["path",{d:"M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z",key:"1fyvmf"}]]};je.node;const ia=f(je);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fe={name:"bot",size:24,node:[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]};Fe.node;const ca=f(Fe);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Re={name:"brain-circuit",size:24,node:[["path",{d:"M12 13h4",key:"1ku699"}],["path",{d:"M12 18h6a2 2 0 012 2v1",key:"6s3bw4"}],["path",{d:"M12 8h8",key:"1lhi5i"}],["path",{d:"M12 9a4.17 4.17 0 01-3 4",key:"13l7kh"}],["path",{d:"M16 8V5a2 2 0 012-2",key:"gais5y"}],["path",{d:"M6 18a4 4 0 01-2-7.465",key:"1y2m15"}],["path",{d:"M6.004 5.125a4 4 0 00-2.526 5.77",key:"3cw1ss"}],["path",{d:"M6.294 6.294A3 3 0 1112 5v13a4 4 0 11-7.967-.518",key:"m2z1wm"}],["circle",{cx:"16",cy:"13",r:"0.5",fill:"currentColor",key:"9zzywh"}],["circle",{cx:"18",cy:"3",r:"0.5",fill:"currentColor",key:"i2xui6"}],["circle",{cx:"20",cy:"21",r:"0.5",fill:"currentColor",key:"1dobdp"}],["circle",{cx:"20",cy:"8",r:"0.5",fill:"currentColor",key:"r9nqlq"}]]};Re.node;const ra=f(Re);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qe={name:"brain",size:24,node:[["path",{d:"M12 18V5",key:"adv99a"}],["path",{d:"M15 13a4.17 4.17 0 01-3-4 4.17 4.17 0 01-3 4",key:"5nuw1p"}],["path",{d:"M17.707 6.294A3 3 0 1012 5a3 3 0 10-5.707 1.294",key:"18ldcf"}],["path",{d:"M17.996 5.125a4 4 0 012.526 5.77",key:"1sdu8q"}],["path",{d:"M18 18a4 4 0 002-7.465",key:"7xqqvr"}],["path",{d:"M19.967 17.482a4 4 0 11-7.967.517 4 4 0 11-7.967-.517",key:"t46ysz"}],["path",{d:"M6 18a4 4 0 01-2-7.465",key:"1y2m15"}],["path",{d:"M6.004 5.125a4 4 0 00-2.526 5.77",key:"3cw1ss"}]]};qe.node;const da=f(qe);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ie={name:"chart-column",size:24,node:[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]],aliases:["bar-chart-3"]};Ie.node;const pa=f(Ie);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const We={name:"chart-line",size:24,node:[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]],aliases:["line-chart"]};We.node;const ua=f(We);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ve={name:"chevron-down",size:24,node:[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]};Ve.node;const ha=f(Ve);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Be={name:"chevron-right",size:24,node:[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]};Be.node;const $a=f(Be);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const He={name:"clipboard-list",size:24,node:[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]};He.node;const fa=f(He);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ue={name:"clock",size:24,node:[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 6v6l4 2",key:"mmk7yg"}]]};Ue.node;const ma=f(Ue);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ge={name:"coins",size:24,node:[["path",{d:"M13.744 17.736a6 6 0 1 1-7.48-7.48",key:"bq4yh3"}],["path",{d:"M15 6h1v4",key:"11y1tn"}],["path",{d:"m6.134 14.768.866-.5 2 3.464",key:"17snzx"}],["circle",{cx:"16",cy:"8",r:"6",key:"14bfc9"}]]};Ge.node;const ba=f(Ge);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ke={name:"cpu",size:24,node:[["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M17 20v2",key:"1rnc9c"}],["path",{d:"M17 2v2",key:"11trls"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M2 17h2",key:"7oei6x"}],["path",{d:"M2 7h2",key:"asdhe0"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"M20 17h2",key:"1fpfkl"}],["path",{d:"M20 7h2",key:"1o8tra"}],["path",{d:"M7 20v2",key:"4gnj0m"}],["path",{d:"M7 2v2",key:"1i4yhu"}],["rect",{x:"4",y:"4",width:"16",height:"16",rx:"2",key:"1vbyd7"}],["rect",{x:"8",y:"8",width:"8",height:"8",rx:"1",key:"z9xiuo"}]]};Ke.node;const ya=f(Ke);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Je={name:"eye-off",size:24,node:[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]};Je.node;const ka=f(Je);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xe={name:"file-pen",size:24,node:[["path",{d:"M12.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v9.34",key:"o6klzx"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10.378 12.622a1 1 0 0 1 3 3.003L8.36 20.637a2 2 0 0 1-.854.506l-2.867.837a.5.5 0 0 1-.62-.62l.836-2.869a2 2 0 0 1 .506-.853z",key:"zhnas1"}]],aliases:["file-edit"]};Xe.node;const ga=f(Xe);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ye={name:"file-text",size:24,node:[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]};Ye.node;const va=f(Ye);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ze={name:"folder",size:24,node:[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",key:"1kt360"}]]};Ze.node;const _a=f(Ze);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qe={name:"funnel",size:24,node:[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]],aliases:["filter"]};Qe.node;const wa=f(Qe);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ts={name:"git-branch",size:24,node:[["path",{d:"M15 6a9 9 0 0 0-9 9V3",key:"1cii5b"}],["circle",{cx:"18",cy:"6",r:"3",key:"1h7g24"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}]]};ts.node;const Ca=f(ts);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const es={name:"globe",size:24,node:[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]};es.node;const Sa=f(es);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ss={name:"grid-3x3",size:24,node:[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M3 15h18",key:"5xshup"}],["path",{d:"M9 3v18",key:"fh3hqa"}],["path",{d:"M15 3v18",key:"14nvp0"}]],aliases:["grid","grid-3-x-3"]};ss.node;const xa=f(ss);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ns={name:"layers",size:24,node:[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]],aliases:["layers-3"]};ns.node;const Ma=f(ns);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const as={name:"layout-dashboard",size:24,node:[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]};as.node;const Oa=f(as);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const os={name:"lock",size:24,node:[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]};os.node;const Aa=f(os);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ls={name:"mail",size:24,node:[["path",{d:"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7",key:"132q7q"}],["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2",key:"izxlao"}]]};ls.node;const za=f(ls);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const is={name:"message-square",size:24,node:[["path",{d:"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",key:"18887p"}]]};is.node;const Ta=f(is);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cs={name:"moon",size:24,node:[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]]};cs.node;const Ea=f(cs);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rs={name:"package",size:24,node:[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]};rs.node;const La=f(rs);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ds={name:"pen",size:24,node:[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]],aliases:["edit-2"]};ds.node;const Da=f(ds);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ps={name:"plug",size:24,node:[["path",{d:"M12 22v-5",key:"1ega77"}],["path",{d:"M15 8V2",key:"18g5xt"}],["path",{d:"M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z",key:"1xoxul"}],["path",{d:"M9 8V2",key:"14iosj"}]]};ps.node;const Pa=f(ps);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const us={name:"radio",size:24,node:[["path",{d:"M16.247 7.761a6 6 0 0 1 0 8.478",key:"1fwjs5"}],["path",{d:"M19.075 4.933a10 10 0 0 1 0 14.134",key:"ehdyv1"}],["path",{d:"M4.925 19.067a10 10 0 0 1 0-14.134",key:"1q22gi"}],["path",{d:"M7.753 16.239a6 6 0 0 1 0-8.478",key:"r2q7qm"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]]};us.node;const Na=f(us);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hs={name:"refresh-cw",size:24,node:[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]};hs.node;const ja=f(hs);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $s={name:"search",size:24,node:[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]]};$s.node;const Fa=f($s);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fs={name:"server",size:24,node:[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]]};fs.node;const Ra=f(fs);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ms={name:"settings",size:24,node:[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]};ms.node;const qa=f(ms);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bs={name:"sun",size:24,node:[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]};bs.node;const Ia=f(bs);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ys={name:"triangle-exclamation-point",size:24,node:[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],aliases:["alert-triangle","triangle-alert"]};ys.node;const Wa=f(ys);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ks={name:"user",size:24,node:[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]};ks.node;const Va=f(ks);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gs={name:"users",size:24,node:[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]]};gs.node;const Ba=f(gs);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vs={name:"wallet",size:24,node:[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]};vs.node;const Ha=f(vs);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _s={name:"webhook",size:24,node:[["path",{d:"M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2",key:"q3hayz"}],["path",{d:"m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06",key:"1go1hn"}],["path",{d:"m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8",key:"qlwsc0"}]]};_s.node;const Ua=f(_s);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ws={name:"wrench",size:24,node:[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",key:"1ngwbx"}]]};ws.node;const Ga=f(ws);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cs={name:"x",size:24,node:[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]};Cs.node;const Ka=f(Cs);/**
 * @license lucide-preact v1.72.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ss={name:"zap",size:24,node:[["path",{d:"M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z",key:"1v7up4"}]]};Ss.node;const Ja=f(Ss),Xa={activity:aa,"alert-triangle":Wa,filter:wa,"eye-off":ka,archive:oa,banknote:la,"bar-chart-3":pa,"book-open":ia,bot:ca,brain:da,"brain-circuit":ra,"chevron-down":ha,"chevron-right":$a,"clipboard-list":fa,clock:ma,coins:ba,cpu:ya,"file-pen":ga,"file-text":va,folder:_a,"git-branch":Ca,globe:Sa,"grid-3x3":xa,layers:Ma,"layout-dashboard":Oa,"line-chart":ua,lock:Aa,mail:za,"message-square":Ta,moon:Ea,package:La,pen:Da,plug:Pa,radio:Na,"refresh-cw":ja,search:Fa,server:Ra,settings:qa,sun:Ia,user:Va,users:Ba,wallet:Ha,webhook:Ua,wrench:Ga,x:Ka,zap:Ja};function mt({name:t,size:e="1em",strokeWidth:s=2,...a}){if(!t)return null;const n=Xa[String(t)];return n?o`<${n} size=${e} strokeWidth=${s} aria-hidden="true" ...${a} />`:o`<span aria-hidden="true" ...${a}>${t}</span>`}function Ya({options:t=[],value:e,onChange:s,ariaLabel:a,class:n,className:l,...i}){const c=["aictl-ui-segmented",n,l].filter(Boolean).join(" "),p=xe([]),h=u=>{var k;if(!t.length)return;const r=Math.max(0,t.findIndex(y=>y.value===e));let d=null;u.key==="ArrowRight"||u.key==="ArrowDown"?d=(r+1)%t.length:u.key==="ArrowLeft"||u.key==="ArrowUp"?d=(r-1+t.length)%t.length:u.key==="Home"?d=0:u.key==="End"&&(d=t.length-1),d!=null&&(u.preventDefault(),s&&s(t[d].value),(k=p.current[d])==null||k.focus())};return o`<div
    class=${c}
    role="radiogroup"
    aria-label=${a||null}
    ...${i}
  >${t.map((u,r)=>{const d=u.value===e;return o`<button
      key=${u.value}
      ref=${k=>{p.current[r]=k}}
      type="button"
      class="aictl-ui-segmented__btn"
      role="radio"
      aria-checked=${d?"true":"false"}
      tabindex=${d?"0":"-1"}
      onClick=${()=>s&&s(u.value)}
      onKeyDown=${h}
    >${u.icon?o`<${mt} name=${u.icon} size="0.9em"/>`:null}${u.label}</button>`})}</div>`}function Za({enabledTools:t,snap:e,what:s="this screen"}){const a=on(t),n=ln(t,e);return o`<div class="panel-state panel-state--empty" role="status" data-testid="tool-scope-empty">
    <${mt} name="filter" size="14"/>
    <div>
      <div class="panel-state__title">${a?"No tools are selected":"The selected tools have no data here"}</div>
      <div class="panel-state__hint">${a?`The tool filter in the header has no tool ticked, so ${s} shows nothing. Tick a tool, or choose All tools.`:`${n.join(", ")} ${n.length===1?"has":"have"} nothing to show on ${s}. Tick more tools in the header filter, or choose All tools.`}</div>
    </div>
  </div>`}function vt(t){return t==null?Ft:typeof t=="object"?JSON.stringify(t):String(t)}function Qa({value:t,compact:e}){const[s,a]=C(!1),n=Array.isArray(t),l=n?t.map((p,h)=>[h,p]):Object.entries(t||{}),i=l.length;if(!i)return o`<span class="st-none">none</span>`;const c=o`<span class="st-chip st-chip--mono st-items">${i} ${i===1?"item":"items"}</span>`;return e?c:o`<span class="st-itemsbox">
    ${c}
    <button type="button" class="st-link" aria-expanded=${s?"true":"false"}
      onClick=${p=>{p.stopPropagation(),a(!s)}}>${s?"hide":"show"}</button>
    ${s&&o`<ul class="st-itemlist">
      ${l.map(([p,h])=>o`<li key=${p} class="st-mono" title=${n?vt(h):`${p}: ${vt(h)}`}>
        ${n?vt(h):o`<span class="st-itemkey">${p}:</span> ${vt(h)}`}</li>`)}
    </ul>`}
  </span>`}function Ct({row:t,value:e,compact:s=!1}){const a=e!==void 0?e:t.value,n=t.kind||fn(a),l=!!t.risky;if(n==="flag"||typeof a=="boolean"){if(a==null)return o`<span class="st-none">${Ft}</span>`;const p=mn(a);return o`<span class=${"st-flag"+(p?" is-on":"")+(l?" is-risky":"")}>
      <span class="st-switch" aria-hidden="true"></span><span class="st-flag__text">${p?"on":"off"}</span>
    </span>`}if(a==null||a==="")return o`<span class="st-none">${Ft}</span>`;if(n==="list"||n==="map"||typeof a=="object")return o`<${Qa} value=${a} compact=${s}/>`;const i=String(a),c=bn({...t,value:a});return c?o`<span class=${"st-select"+(l?" is-risky":"")} title=${"Options: "+c.join(", ")}>${i}</span>`:n==="path"?o`<span class="st-v st-path" title=${i}>${i}</span>`:o`<span class=${"st-v"+(l?" is-risky":"")} title=${i}>${i}</span>`}function X({scope:t,locked:e=!1,label:s=""}){const a=t||"default",n=o`<span class=${"st-chip st-scope st-scope--"+a.replace(/[^a-z-]/gi,"")+(e?" st-scope--locked":"")}
    title=${e?`Set by ${s||a}; cannot be changed here`:void 0}>${a}${e?o`<span class="st-sr"> (locked)</span>`:""}</span>`;return e?o`<span class="st-scopewrap"><${gt}/>${n}</span>`:n}function gt({label:t=""}){return t?o`<span class="st-lock" role="img" aria-label=${t} title=${t}><${mt} name="lock" size="11"/></span>`:o`<span class="st-lock" aria-hidden="true"><${mt} name="lock" size="11"/></span>`}function I({id:t,big:e=!1}){return o`<span class=${"st-sw"+(e?" st-sw--big":"")} aria-hidden="true"
    style=${{background:cn[t]||"var(--st-fg2)"}}></span>`}function bt({label:t}){return o`<span class="st-dot" role="img" aria-label=${t} title=${t}></span>`}function N({children:t}){return o`<div class="st-nav__h">${t}</div>`}function B({id:t,label:e}){return o`<span class="st-chip st-toolchip"><${I} id=${t}/>${e}</span>`}function yt({path:t,line:e,w:s,tool:a=""}){if(!t)return o`<span class="st-none">—</span>`;if(tt(t)){const l=W(t);return l?o`<button type="button" class="st-src st-src--env" data-env=${l}
      title=${"Environment variable "+l+": where it is set and what it drives"}
      onClick=${i=>{i.stopPropagation(),s.openEnv(l,a)}}><b>${l}</b></button>`:o`<span class="st-src st-src--env" title="An environment variable; this aictl version did not name it">environment</span>`}const n=t+(e>0?":"+e:"");return o`<button type="button" class="st-src" title=${n}
    onClick=${l=>{l.stopPropagation(),s.openAt(t,e)}}>
    <b>${J(t)}</b>${e>0?":"+e:""}</button>`}const to="aictl has no description for this key; the value is shown as found in the file";function Mt(){return o`<span class="st-chip st-chip--muted st-undoc" title=${to}>undocumented</span>`}const eo=4,qt=(t,e,s)=>[e&&{k:"tool",l:"Tool",get:a=>t.labelOf(a.tool)},{k:"agent",l:"Agent",cls:"st-c-agent",get:a=>pt(a)},{k:"model",l:"Model",get:a=>kt(a)?void 0:String(a.value)},{k:"effort",l:"Effort",get:a=>{var n;return(n=a.agent)==null?void 0:n.effort}},s&&{k:"context",l:"Context",get:a=>{var n;return(n=a.agent)==null?void 0:n.context_tier}},{k:"tools",l:"Tools",n:!0,get:a=>{var n,l;return((l=(n=a.agent)==null?void 0:n.tools)==null?void 0:l.length)||void 0}},{k:"defined",l:"Defined in",cls:"st-c-src",get:a=>{var n;return(n=a.agent)==null?void 0:n.defined_in}},{k:"pinned",l:"Pinned in",cls:"st-c-src",get:a=>{var n;return(n=a.agent)==null?void 0:n.pinned_in}}].filter(Boolean);function so(t,e){return`Set by ${O(t.scope,e.scopesOf(t.tool))}; cannot be changed here`}function xs({row:t,w:e}){const s=t.agent,a=kt(t);return o`<span class="st-agentmodel">
    ${t.locked&&o`<${gt} label=${so(t,e)}/>`}
    ${a?o`<span class="st-inherit" title=${t.note||"Runs on the session model"}>inherits</span>`:o`<span class="st-v" title=${String(t.value)}>${String(t.value)}</span>`}
    ${s.model_policy==="required"&&o`<span class="st-badge" title="The agent file requires a model">required</span>`}
    ${yn(t)&&o`<span class="st-badge st-badge--pin" title=${"A settings pin decides the model: "+s.pinned_in}>pinned</span>`}
  </span>`}function Ms({tools:t,all:e=!1}){if(!t||!t.length)return o`<span class="st-none" title="The agent file lists no tools">—</span>`;const s=e?t:t.slice(0,eo),a=t.length-s.length;return o`<span class="st-tools">
    ${s.map(n=>o`<span key=${n} class="st-chip st-chip--mono" title=${n}>${n}</span>`)}
    ${a>0&&o`<span class="st-chip st-more-tools" title=${t.slice(s.length).join(", ")}>+${a}</span>`}
  </span>`}function Os({row:t,w:e,withTool:s,withContext:a}){var p;const n=t.agent,l=((p=e.selected)==null?void 0:p.uid)===t.uid,i=()=>e.select({tool:t.tool,row:t.key}),c=h=>Number(h)>0?Number(h):0;return o`<tr class=${"st-row st-agentrow"+(l?" is-sel":"")} data-key=${t.key} data-tool=${t.tool}
    tabindex="0" onClick=${i}
    onKeyDown=${h=>{(h.key==="Enter"||h.key===" ")&&(h.preventDefault(),i())}}>
    ${s&&o`<td class="st-c-tool"><span class="st-matrix__toolname"><${I} id=${t.tool}/>${e.labelOf(t.tool)}</span></td>`}
    <td class="st-c-agent">
      <div class="st-label st-mono">${n.name||t.label}</div>
      ${n.description&&o`<div class="st-agentdesc" title=${n.description}>${n.description}</div>`}
    </td>
    <td class="st-c-model"><${xs} row=${t} w=${e}/></td>
    <td class="st-mono">${n.effort||o`<span class="st-none">—</span>`}</td>
    ${a&&o`<td class="st-mono">${n.context_tier||o`<span class="st-none">—</span>`}</td>`}
    <td><${Ms} tools=${n.tools}/></td>
    <td class="st-c-src"><${yt} path=${n.defined_in} line=${c(n.defined_line)} w=${e}/></td>
    <td class="st-c-src"><${yt} path=${n.pinned_in} line=${c(n.pinned_line)} w=${e}/></td>
  </tr>`}function no({w:t,section:e}){const s=e.shown,a=s.filter(kt).length,n=j("settings.agents",qt(t,!1,!0)),l=qt(t,!1,!0);return o`<table class=${"st-table st-agents "+n.tableProps.class} style=${n.tableProps.style} data-section="agents">
    <thead><tr>${l.map(n.th)}</tr></thead>
    <tbody>
      <tr class="st-group"><th scope="colgroup" colspan="7">${e.title}
        <span class="st-group__meta">${s.length}${a?` · ${a} inherit the session model`:""}</span></th></tr>
      ${n.order(s).map(i=>o`<${Os} key=${i.uid} row=${i} w=${t} withContext/>`)}
    </tbody>
  </table>`}const It={tool:t=>(e,s)=>t.labelOf(e.tool).localeCompare(t.labelOf(s.tool))||pt(e).localeCompare(pt(s)),agent:t=>(e,s)=>pt(e).localeCompare(pt(s))||t.labelOf(e.tool).localeCompare(t.labelOf(s.tool)),model:t=>(e,s)=>fe(e).localeCompare(fe(s))||It.tool(t)(e,s)};function pt(t){var e;return String(((e=t.agent)==null?void 0:e.name)||t.label||"")}function fe(t){return kt(t)?"￿":String(t.value)}function ao(t,e,s){return[...t].sort((It[e]||It.tool)(s))}function oo({w:t,rows:e,sort:s}){const a=qt(t,!0,!1),n=j("settings.agents.all",a),l=n.order(ao(e,s,t));return o`<div class="st-scroll"><table class=${"st-table st-agents st-agents--all "+n.tableProps.class} style=${n.tableProps.style}>
    <thead><tr>${a.map(n.th)}</tr></thead>
    <tbody>${l.map(i=>o`<${Os} key=${i.uid} row=${i} w=${t} withTool/>`)}</tbody>
  </table></div>`}const Kt=[{id:"mcp",label:"MCP"},{id:"read",label:"Read files"},{id:"write",label:"Write files"},{id:"shell",label:"Shell"},{id:"web",label:"Web"}],lo={allowed:"allow",asks:"ask",denied:"deny"},me={denied:3,asks:2,allowed:1},Q=(t,e,s="")=>Object.fromEntries(Kt.map(a=>[a.id,{state:t,why:e,key:s}]));function io(t){const e=String(t||"").split(".");return e[e.length-1]}function co(t){const e=new Map;for(const s of(t==null?void 0:t.rows)||[])e.has(s.key)||e.set(s.key,s);return e}const w=t=>t&&t.value!==null&&t.value!==void 0&&t.value!==""?t.value:void 0,St=t=>Array.isArray(t)?t.filter(e=>typeof e=="string"&&e):[];function Jt(t){const e=/^\s*([^()\s]+)\s*(?:\((.*)\))?\s*$/.exec(String(t));return e?{name:e[1].toLowerCase(),spec:e[2]===void 0?null:e[2].trim()}:{name:String(t).toLowerCase(),spec:null}}const As=new Set(["","*",":*","**"]),ro={read:["read","glob","grep","ls","notebookread"],write:["write","edit","multiedit","notebookedit"],shell:["bash","powershell"],web:["webfetch","websearch"]};function po(t){if(t==="mcp"||t.startsWith("mcp__"))return"mcp";for(const[e,s]of Object.entries(ro))if(s.includes(t))return e;return""}function uo(t,e){return t.startsWith("mcp__")?t==="mcp__*":e===null||As.has(e)}function ho(t,e){const s=[],a=(i,c,p,h)=>{const u={allow:"allowed",deny:"denied",ask:"asks"}[i],r=i+""+c,d=p?O(p,e):"",k=s.find($=>$.id===r);if(k){d&&!k.where.includes(d)&&k.where.push(d);return}const{name:y,spec:_}=Jt(c);s.push({id:r,rule:c,effect:u,cap:po(y),whole:uo(y,_),where:d?[d]:[],key:h})},n=(i,c,p)=>{if(!(!i||typeof i!="object"||Array.isArray(i)))for(const h of["allow","deny","ask"])for(const u of St(i[h]))a(h,u,c,p)},l=t.get("permissions");if(l){const i=(l.chain||[]).filter(c=>c&&c.value&&typeof c.value=="object"&&c.set!==!1);if(i.length)for(const c of i)n(c.value,c.scope,"permissions");else n(w(l),l.scope,"permissions")}for(const i of["allow","deny","ask"]){const c=t.get("permissions."+i);for(const p of St(w(c)))a(i,p,c.scope,c.key)}return s}const $o={shell:"shell",write:"write",read:"read",url:"web",fetch:"web",web_fetch:"web"};function fo(t){const e=[];for(const s of["allow","deny","ask"]){const a=t.get("permissions."+s);for(const n of St(w(a))){const{name:l,spec:i}=Jt(n);e.push({rule:n,effect:{allow:"allowed",deny:"denied",ask:"asks"}[s],cap:$o[l]||"mcp",whole:i===null||As.has(i),where:a.scope?[O(a.scope)]:[],key:a.key})}}return e}function mo(t){const e=[];for(const s of t.values()){const a=w(s);if(!a||typeof a!="object"||Array.isArray(a))continue;const n=s.key;let l="";if(/(^|\.)urls\.autoApprove$/.test(n)?l="web":/(^|\.)edits\.autoApprove$/.test(n)?l="write":(n==="autoApprove"||/(^|\.)terminal\.autoApprove$/.test(n))&&(l="shell"),!!l)for(const[i,c]of Object.entries(a)){let p;if(l==="web"?p=c===!0||(c==null?void 0:c.approveRequest)===!0?"allowed":"asks":l==="write"?p=c===!1?"asks":"allowed":c===!0||(c==null?void 0:c.approve)===!0?p="allowed":(c===!1||(c==null?void 0:c.approve)===!1)&&(p="denied"),!p)continue;const h=l==="write"?i==="**/*"||i==="**":!1;e.push({rule:i,effect:p,cap:l,whole:h,where:s.scope?[O(s.scope)]:[],key:n})}}return e}const bo={read:["read_file","read_many_files","glob","grep","search_file_content","list_directory","readfiletool","readmanyfilestool","globtool","greptool","lstool"],write:["write_file","replace","edit","writefiletool","edittool"],shell:["run_shell_command","shelltool"],web:["web_fetch","google_web_search","webfetchtool","websearchtool"]};function yo(t){var s;const e=[];for(const[a,n]of[["tools.allowed","allowed"],["tools.exclude","denied"]]){const l=t.get(a);for(const i of St(w(l))){const{name:c,spec:p}=Jt(i);let h=((s=Object.entries(bo).find(([,u])=>u.includes(c)))==null?void 0:s[0])||"";!h&&c.includes("__")&&(h="mcp"),h&&e.push({rule:i,effect:n,cap:h,whole:p===null,where:l.scope?[O(l.scope)]:[],key:a})}}return e}function ko(t){const e=t.get("permissions.defaultMode"),s=w(e)??"default",a=e&&w(e)!==void 0?e.key:"",n=`default mode ${s}`;if(s==="bypassPermissions")return Q("allowed",n+": no permission prompts",a);const l={mcp:{state:"asks",why:"Claude Code asks before an MCP tool runs",key:a},read:{state:"allowed",why:"Claude Code reads files without asking",key:a},write:{state:"asks",why:"Claude Code asks before it edits a file",key:a},shell:{state:"asks",why:"Claude Code asks before it runs a command",key:a},web:{state:"asks",why:"Claude Code asks before it fetches a URL",key:a}};if(s==="acceptEdits"&&(l.write={state:"allowed",why:n+": edits apply without asking",key:a}),s==="plan"&&(l.write={state:"denied",why:n+": read-only, no edits",key:a},l.shell={state:"denied",why:n+": read-only, no commands that change anything",key:a}),s==="dontAsk")for(const i of["mcp","write","shell","web"])l[i]={state:"denied",why:n+": anything not allowed by a rule is refused",key:a};return l}function go(t){const e=t.get("defaultPermissionMode"),s=w(e)??"manual",a=e&&w(e)!==void 0?e.key:"";if(s==="allow-all")return Q("allowed","defaultPermissionMode allow-all: every tool call is allowed",a);const n=s==="assisted"?"asks; in assisted mode a model answers the request":"asks before it runs";return{mcp:{state:"asks",why:"an MCP tool "+n,key:a},read:{state:"allowed",why:"reads in trusted folders run without asking",key:a},write:{state:"asks",why:"a file write "+n,key:a},shell:{state:"asks",why:"a shell command "+n,key:a},web:{state:"asks",why:"a URL fetch "+n,key:a}}}function vo(t){for(const e of t.values()){const s=w(e);if((io(e.key)==="globalAutoApprove"||e.key==="chat.tools.global.autoApprove")&&s===!0)return Q("allowed",e.label+" is on: every tool call runs without asking",e.key);if(e.key==="skipPermissions"&&s===!0)return Q("allowed",e.label+" is on: no permission checks",e.key);if(e.key==="chat.permissions.default"&&["autoApprove","autopilot","bypass"].includes(s))return Q("allowed",`chat.permissions.default ${s}: sessions start without approval prompts`,e.key)}return{mcp:{state:"asks",why:"VS Code asks before an MCP tool runs"},read:{state:"allowed",why:"VS Code reads workspace files without asking"},write:{state:"allowed",why:"VS Code applies edits in the workspace without asking"},shell:{state:"asks",why:"VS Code asks before a terminal command runs"},web:{state:"asks",why:"VS Code asks before it fetches a URL"}}}function _o(t){const e=t.get("approval_policy"),s=t.get("sandbox_mode"),a=w(t.get("sandbox_workspace_write.network_access"))===!0;let n=w(e);n&&typeof n=="object"&&(n="granular"),n=n||"on-request";const l=w(s)||"read-only",i=e&&w(e)!==void 0?e.key:"",c=s&&w(s)!==void 0?s.key:"",p=`approval_policy ${n}${w(e)===void 0?" (not set)":""}`,h=`sandbox_mode ${l}${w(s)===void 0?" (not set)":""}`,u=n==="never",r=l==="danger-full-access",d=r?{state:"allowed",why:h+": no sandbox"}:l==="workspace-write"?{state:"allowed",why:h+": writes in the workspace run without asking"}:u?{state:"denied",why:`${h}, ${p}: no writes and no way to ask`}:{state:"asks",why:`${h}: a write needs your approval`},k=u?{state:"allowed",why:p+": commands never ask"}:n==="untrusted"?{state:"asks",why:p+": commands outside the trusted set ask"}:{state:"allowed",why:`${p}: commands run in the sandbox (${l}) and ask to leave it`},y=r||l==="workspace-write"&&a?{state:"allowed",why:r?h+": network open":"sandbox_workspace_write.network_access is on"}:u?{state:"denied",why:`${h}, ${p}: no network and no way to ask`}:{state:"asks",why:`${h}: network access needs your approval`};return{mcp:{state:u?"allowed":"asks",why:u?p+": MCP tools never ask":p+": MCP tool calls ask",key:i},read:{state:"allowed",why:h+": reads are allowed",key:c},write:{...d,key:c||i},shell:{...k,key:i||c},web:{...y,key:c||i}}}function wo(t){const e=t.get("general.defaultApprovalMode")||t.get("approvalMode")||t.get("approval_mode")||t.get("general.approvalMode"),s=w(e)??"default",a=e&&w(e)!==void 0?e.key:"",n="approval mode "+s;if(s==="yolo")return Q("allowed",n+": every tool call runs without asking",a);const l={mcp:{state:"asks",why:n+": MCP tools ask",key:a},read:{state:"allowed",why:"reads run without asking",key:a},write:{state:"asks",why:n+": edits ask",key:a},shell:{state:"asks",why:n+": shell commands ask",key:a},web:{state:"asks",why:n+": web fetches ask",key:a}};return s==="auto_edit"&&(l.write={state:"allowed",why:n+": edits run without asking",key:a}),s==="plan"&&(l.write={state:"denied",why:n+": read-only",key:a},l.shell={state:"denied",why:n+": read-only",key:a}),l}const rt=(t,e)=>[...t.keys()].some(s=>e.test(s)),Co=[{id:"claude",tools:["claude-code"],applies:t=>rt(t,/^permissions(\.(allow|deny|ask|defaultMode))?$/),base:ko,rules:ho,wholeName:"the whole tool"},{id:"copilot-cli",tools:["copilot-cli","copilot-desktop"],applies:t=>rt(t,/^(defaultPermissionMode|savedToolApprovals|permissions\.(allow|deny|ask))$/),base:go,rules:fo,notes:t=>{const e=w(t.get("savedToolApprovals"));if(!e||typeof e!="object")return[];const s=Object.values(e).reduce((n,l)=>n+(Number(l)||0),0),a=Object.keys(e).length;return s?[`${s} saved tool ${s===1?"approval":"approvals"} in ${a} ${a===1?"folder":"folders"} (permissions-config.json)`]:[]}},{id:"vscode",tools:["vscode","copilot"],applies:t=>rt(t,/(autoApprove|^chat\.permissions\.default$|^skipPermissions$)/i),base:vo,rules:mo},{id:"codex",tools:["codex-cli","codex"],applies:t=>rt(t,/^(approval_policy|sandbox_mode)$/),base:_o,rules:()=>[]},{id:"gemini",tools:["gemini-cli","gemini"],applies:t=>rt(t,/(^|\.)(defaultApprovalMode|approvalMode|approval_mode)$|^tools\.(allowed|exclude)$/),base:wo,rules:yo}];function So(t,e){return t==="mixed"?`mixed (${e} ${e===1?"rule":"rules"})`:t}function be(t){return`${lo[t.effect]} ${t.rule}${t.where.length?" ("+t.where.join(", ")+")":""}`}function xo(t,e,s){var r;const a=s.filter(d=>d.cap===t.id),n=a.filter(d=>d.whole);let l=e.state,i=e.why;if(n.length){const d=n.reduce((k,y)=>me[y.effect]>me[k.effect]?y:k);l=d.effect,i="rule "+be(d)}const c=a.some(d=>!d.whole&&d.effect!==l),p=c?"mixed":l,h=So(p,a.length),u=[`${t.label}: ${h}`];return!a.length||!n.length?u.push("Without a rule: "+e.state+" ("+e.why+")"):u.push((c?"For the whole tool: ":"Decided by: ")+l+" ("+i+")"),a.length&&u.push(...a.map(d=>"• "+be(d))),{cap:t.id,label:t.label,state:p,text:h,title:u.join(`
`),rules:a.map(d=>({rule:d.rule,effect:d.effect,where:d.where})),key:((r=a[0])==null?void 0:r.key)||e.key||""}}function zs(t){if(!t)return null;const e=Co.find(l=>l.tools.includes(t.id));if(!e)return null;const s=co(t);if(!e.applies(s))return null;const a=e.base(s),n=e.rules(s,t.scopes||[]);return{tool:t.id,cells:Kt.map(l=>xo(l,a[l.id],n)),notes:e.notes?e.notes(s):[]}}function Mo(t){return(t||[]).map(e=>({entry:e,perms:zs(e)})).filter(e=>e.perms)}const Oo=["project","project-local"],Ao=new Set(["permissions","permissions.allow","permissions.deny","permissions.ask","project_permissions"]),Ts="No form for this value. Open the file and use Edit file";function zo(t){return!!t&&t.tool==="claude-code"&&Ao.has(t.key)}function To(t){var e,s;return((s=(e=t==null?void 0:t.chain)==null?void 0:e[t.wins])==null?void 0:s.scope)||(t==null?void 0:t.scope)||"default"}function Eo(t,e=[]){var l;const s=(l=t==null?void 0:t.chain)==null?void 0:l[t.wins];if(t!=null&&t.locked||Bt(s,e))return{ok:!1,hint:"Locked by "+O(t.locked?t.scope:s.scope,e)};if(!zo(t))return{ok:!1,hint:Ts};const a=To(t);if(!Oo.includes(a))return{ok:!1,hint:`The value comes from ${O(a,e)}. Project and Project local permissions have a form here; for another file, open it and use Edit file.`};const n=(e||[]).find(i=>i.id===a);return{ok:!0,scope:a,label:O(a,e),path:s&&s.source||(n==null?void 0:n.path)||""}}const Lo=t=>(t||[]).join(`
`),Do=t=>String(t||"").split(`
`).map(e=>e.trim()).filter(Boolean);function Po(t,e){const s=new Set(t||[]),a=new Set(e||[]);return{added:[...a].filter(n=>!s.has(n)),removed:[...s].filter(n=>!a.has(n))}}function Es({cell:t,onPick:e}){const s=t.key&&e?()=>e(t.key):null;return o`<td class=${"st-perm st-perm--"+t.state} data-cap=${t.cap} data-state=${t.state} title=${t.title}>
    ${s?o`<button type="button" class="st-perm__btn" aria-label=${`${t.label}: ${t.text}`} onClick=${s}>${t.text}</button>`:o`<span class="st-perm__text">${t.text}</span>`}
  </td>`}const Ls=(t,e)=>[...t?[{k:"tool",l:t,get:e?s=>s.entry.label:void 0}]:[],...Kt.map(s=>({k:s.id,l:s.label,attrs:{"data-cap":s.id},get:e?a=>{var n;return(n=a.perms.cells.find(l=>l.cap===s.id))==null?void 0:n.text}:void 0}))];function No({w:t,entry:e,perms:s}){const a=i=>t.select({tool:e.id,row:i}),n=Ls("",!1),l=j("settings.perms",n);return o`<div class="st-perms" data-testid="st-perms" data-tool=${e.id}>
    <table class=${"st-permtable "+l.tableProps.class} style=${l.tableProps.style}>
      <caption class="st-perms__cap">What the agent can do without asking</caption>
      <thead><tr>${n.map(l.th)}</tr></thead>
      <tbody><tr>${s.cells.map(i=>o`<${Es} key=${i.cap} cell=${i} onPick=${a}/>`)}</tr></tbody>
    </table>
    ${s.notes.map((i,c)=>o`<p key=${c} class="st-hint st-perms__note">${i}</p>`)}
  </div>`}function jo({w:t,mats:e}){const s=Ls("Tool",!0),a=j("settings.perms.all",s);return e.length?o`<div class="st-perms st-perms--topic" data-testid="st-perms-topic">
    <div class="st-scroll"><table class=${"st-permtable "+a.tableProps.class} style=${a.tableProps.style}>
      <caption class="st-perms__cap">What each tool's agent can do without asking</caption>
      <thead><tr>${s.map(a.th)}</tr></thead>
      <tbody>
        ${a.order(e).map(({entry:n,perms:l})=>o`<tr key=${n.id} data-tool=${n.id}>
          <th scope="row" class="st-perms__tool"><span class="st-matrix__toolname"><${I} id=${n.id}/>${n.label}</span></th>
          ${l.cells.map(i=>o`<${Es} key=${i.cap} cell=${i} onPick=${c=>t.select({tool:n.id,row:c})}/>`)}
        </tr>`)}
      </tbody>
    </table></div>
    ${e.flatMap(({entry:n,perms:l})=>l.notes.map((i,c)=>o`<p key=${n.id+c} class="st-hint st-perms__note">${n.label}: ${i}</p>`))}
  </div>`:null}const Fo={copilot:"copilot-vscode",vscode:"copilot-vscode"};function Ro(t,e){const s=t==null?void 0:t.tools;return!s||typeof s!="object"?null:s[e]||s[Fo[e]]||null}function qo(t){return{active:"active",configured:"configured",disabled:"host-disabled",misconfigured:"wrong port",observed:"observed",missing:"missing"}[t]||t||"unknown"}function Io(t){const e=(t==null?void 0:t.message)||"";return e.includes("~/.copilot/hooks")?'"chat.hookFilesLocations": { "~/.copilot/hooks": true }':e.includes(".github/hooks")?'"chat.hookFilesLocations": { ".github/hooks": true }':e.includes("chat.useHooks")?'"chat.useHooks": true':""}const Wo={active:"is-ok",configured:"is-ok",disabled:"is-warn",misconfigured:"is-warn",missing:"is-warn"};function Vo({status:t}){const e=t.configured_events||[],s=t.missing_events||[],a=t.sources||[],n=t.warnings||[];return o`<div class="st-hookstat" data-testid="st-hookstat">
    <div class="st-hookstat__head">
      <span class=${"st-status "+(Wo[t.status]||"")} data-testid="st-hookstat-status"
        title=${t.status==="misconfigured"?"The hook commands post to a different port than this dashboard":void 0}>${qo(t.status)}</span>
      <span>${t.configured_count||e.length} configured</span>
      ${s.length>0&&o`<span class="st-warn" title=${s.join(", ")}>${s.length} missing: ${s.join(", ")}</span>`}
      <span>${t.fired_24h||0} fired in 24 h</span>
      <span title=${t.last_fire_ts?new Date(t.last_fire_ts*1e3).toLocaleString():void 0}>last ${t.last_fire_ts?ut(t.last_fire_ts):"never"}</span>
    </div>
    <div class="st-tools st-hookstat__events">
      ${e.length?e.map(l=>o`<span key=${l} class="st-chip st-chip--mono st-hookstat__ev">${l}</span>`):o`<span class="st-dim">No aictl hooks configured</span>`}
    </div>
    ${a.length>0&&o`<ul class="st-hookstat__sources">
      ${a.map(l=>o`<li key=${l.path} title=${l.path}>
        <span class="st-mono">${l.scope}</span>
        <span>${l.configured_count||0} ${l.configured_count===1?"event":"events"}</span>
        <span class=${l.host_enabled===!1?"st-warn":"st-dim"}>${l.host_enabled===!1?"ignored by the host":"loaded"}</span>
      </li>`)}
    </ul>`}
    ${n.map(l=>{const i=Io(l);return o`<div key=${(l.path||"")+l.message} class="st-hookstat__warn" role="note">
        ${l.message}${i&&o`<code class="st-hookstat__snippet">${i}</code>`}
      </div>`})}
  </div>`}function Bo(t,e){const s=J(t);if(e.filter(l=>J(l)===s).length<2)return s;const a=String(t).split(/[\\/]/).filter(Boolean);return a.length<2?s:(/^(Users|home)$/.test(a[0])&&a.length===4?"~/":"")+a[a.length-2]+"/"+s}function Ho({w:t}){const{entries:e,aictl:s,st:a}=t;return o`<nav class="st-nav" aria-label="Tools">
    <${N}>Tools</${N}>
    <ul class="st-nav__list">
      ${e.map(n=>{const l=n.id===t.toolId,i=n.rows.filter(l?t.passTool:t.pass),c=i.some(p=>p.risky);return o`<li key=${n.id}>
          <button type="button" class=${"st-nav__item"+(l?" is-on":"")+(i.length?"":" is-empty")}
            aria-current=${l?"true":void 0} data-tool=${n.id}
            onClick=${()=>t.set({tool:n.id,sec:"",row:"",scope:l?t.st.scope:""})}>
            <${I} id=${n.id}/><span class="st-nav__label">${n.label}</span>
            ${c&&o`<${bt} label="A risky setting is on"/>`}
            <span class="st-nav__n">${i.length}</span>
          </button>
          ${l&&o`<ul class="st-nav__subs">
            ${n.sections.map(p=>{const h=p.rows.filter(t.passTool),u=a.sec===p.id,r=p.id==="agents"?kn(h):"";return o`<li key=${p.id}><button type="button" class=${"st-nav__sub"+(u?" is-on":"")}
                aria-current=${u?"true":void 0}
                onClick=${()=>t.set({sec:u?"":p.id})}>
                <span class="st-nav__label">${p.title}</span>
                ${h.some(d=>d.risky)&&o`<${bt} label="A risky setting is on"/>`}
                <span class="st-nav__n">${h.length}</span>
                ${r&&o`<span class="st-nav__model" title=${"Every agent runs on "+r}>${r}</span>`}
              </button></li>`})}
            ${n.envVars.length>0&&(()=>{const p=a.sec==="env",h=n.envVars.filter(u=>u.set&&Ht(u,t.q)).length;return o`<li key="env"><button type="button" class=${"st-nav__sub"+(p?" is-on":"")}
                aria-current=${p?"true":void 0} data-sec="env"
                onClick=${()=>t.set({sec:p?"":"env"})}>
                <span class="st-nav__label">Environment variables</span>
                <span class="st-nav__n">${h}</span>
              </button></li>`})()}
          </ul>`}
        </li>`})}
      ${s&&o`<li key="aictl">
        <button type="button" class=${"st-nav__item"+(t.toolId==="aictl"?" is-on":"")}
          aria-current=${t.toolId==="aictl"?"true":void 0} data-tool="aictl"
          onClick=${()=>t.set({tool:"aictl",sec:"",row:"",scope:""})}>
          <${I} id="aictl"/><span class="st-nav__label">aictl</span>
          <span class="st-nav__n">${s.collectors.length}</span>
        </button>
      </li>`}
    </ul>
  </nav>`}function Uo({row:t,w:e,scopes:s}){var l;const a=((l=e.selected)==null?void 0:l.uid)===t.uid,n=()=>e.select({tool:t.tool,row:t.key});return o`<tr class=${"st-row"+(t.risky?" st-row--risky":"")+(t.unset?" st-row--unset":"")+(a?" is-sel":"")}
    data-key=${t.key} tabindex="0" onClick=${n}
    onKeyDown=${i=>{(i.key==="Enter"||i.key===" ")&&(i.preventDefault(),n())}}>
    <td class="st-c-set">
      <div class="st-label">${t.label}${t.undocumented&&o` <${Mt}/>`}</div>
      ${t.risky&&t.tip&&o`<div class="st-risknote">${t.tip}</div>`}
    </td>
    <td class="st-c-val"><${Ct} row=${t}/></td>
    <td class="st-c-scope"><${X} scope=${t.scope} locked=${t.locked} label=${O(t.scope,s)}/></td>
    <td class="st-c-src"><${yt} path=${t.source} line=${t.line} w=${e} tool=${t.tool}/></td>
    <td class="st-c-what" title=${t.tip||void 0}>${t.tip}</td>
  </tr>`}function Go({w:t,entry:e}){const s=e.scopes||[];if(!s.length)return null;const a=e.rows.filter(t.pass);return o`<div class="st-scopes" data-testid="st-scopes">
    <ol class="st-scopes__list" aria-label="Configuration layers, lowest precedence first">
      ${s.map((n,l)=>{const i=a.filter(d=>d.scope===n.id).length,c=t.st.scope===n.id,p=n.path?J(n.path):"",h=n.vars||[],u=h.length?h.slice(0,2).join(", ")+(h.length>2?` +${h.length-2}`:""):p||n.note,r=[n.label,n.paths.length?n.paths.join(`
`):"",h.length?"Set: "+h.join(", "):"",n.exists?"":"not present",n.note,n.changeable?"":"Locked: cannot be changed from this machine"].filter(Boolean).join(`
`);return o`<li key=${n.id} class="st-scopes__item">
          ${l>0&&o`<span class="st-scopes__arrow" aria-hidden="true">→</span>`}
          <button type="button" class=${"st-scopechip"+(c?" is-on":"")+(n.changeable?"":" is-locked")+(n.exists?"":" is-absent")}
            data-scope=${n.id} aria-pressed=${c?"true":"false"} title=${r}
            onClick=${()=>t.set({scope:c?"":n.id})}>
            <span class="st-scopechip__top">
              ${!n.changeable&&o`<${gt}/><span class="st-sr">Locked: </span>`}
              <span class="st-scopechip__label">${n.label}</span>
              <span class="st-scopechip__n">${i}<span class="st-sr"> ${i===1?"setting wins":"settings win"} here</span></span>
            </span>
            <span class=${"st-scopechip__file"+(h.length?" st-mono":"")} data-vars=${h.length?h.join(","):void 0}>${n.exists?u:n.id==="env"?"none set":"not present"}</span>
          </button>
        </li>`})}
    </ol>
    <p class="st-hint st-scopes__legend">Later layers override earlier ones. Locked layers cannot be changed from this machine.</p>
  </div>`}function ye({children:t,section:e}){return o`<tr class="st-extra" data-extra=${e}><td colspan="5">${t}</td></tr>`}const ke=t=>typeof t.value=="number"?t.value:t.value==null||t.value===""?void 0:xt(t.value);function Ko(t,e){return[{k:"setting",l:"Setting",cls:"st-c-set",get:s=>s.label},{k:"value",l:"Value",cls:"st-c-val",n:Le(t,ke),get:ke},{k:"scope",l:"Scope",cls:"st-c-scope",get:s=>s.scope?O(s.scope,e):void 0},{k:"source",l:"Set in",cls:"st-c-src",get:s=>s.source},{k:"what",l:"What it does",get:s=>s.tip}]}function Jo({w:t,sections:e,scopes:s,shared:a,extras:n={}}){const l=Ko(e.flatMap(c=>c.shown),s),i=j("settings.tool",l,a);return o`<table class=${"st-table "+i.tableProps.class} style=${i.tableProps.style}>
    <thead><tr>${l.map(i.th)}</tr></thead>
    ${e.map(c=>{const p=c.shown.filter(h=>h.risky).length;return o`<tbody key=${c.id} data-section=${c.id}>
        <tr class="st-group"><th scope="colgroup" colspan="5">${c.title}
          <span class="st-group__meta">${c.shown.length}${p?o` · <span class="st-red">${p} risky</span>`:""}${c.hidden?o` · <span class="st-unsetn">+${c.hidden} unset</span>`:""}</span></th></tr>
        ${n[c.id]&&o`<${ye} section=${c.id}>${n[c.id]}</${ye}>`}
        ${i.order(c.shown).map(h=>o`<${Uo} key=${h.uid} row=${h} w=${t} scopes=${s}/>`)}
      </tbody>`})}
  </table>`}function Xo(t){const e=[];for(const s of t){const a=s.id==="agents"&&s.shown.every(l=>l.kind==="agent"&&l.agent),n=e[e.length-1];a?e.push({agents:!0,sections:[s]}):n&&!n.agents?n.sections.push(s):e.push({agents:!1,sections:[s]})}return e}function Yo({w:t,entry:e}){const s=e.envVars.filter(c=>Ht(c,t.q)),a=s.filter(c=>c.set),n=t.showUnset?s:a,l=s.length-n.length;if(!n.length&&!l)return null;const i=t.selectedEnv;return o`<table class="st-table st-envtable" data-testid="st-env-table">
    <thead><tr><th>Variable</th><th>Value</th><th>Where</th><th>Drives</th><th>What it does</th></tr></thead>
    <tbody data-section="env">
      <tr class="st-group"><th scope="colgroup" colspan="5">Environment variables
        <span class="st-group__meta">${a.length} set${l?o` · <span class="st-unsetn">+${l} unset</span>`:""}</span></th></tr>
      ${n.map(c=>{const p=()=>t.openEnv(c.name,e.id);return o`<tr key=${c.name} class=${"st-row"+(c.set?"":" st-row--unset")+(i&&i.uid===c.uid?" is-sel":"")}
          data-env=${c.name} tabindex="0" onClick=${p}
          onKeyDown=${h=>{(h.key==="Enter"||h.key===" ")&&(h.preventDefault(),p())}}>
          <td class="st-c-set"><div class="st-label st-mono">${c.name}</div>${!c.documented&&o` <${Mt}/>`}</td>
          <td class="st-c-val">${c.set?c.masked?o`<span class="st-dim" title="The name says it holds a credential, so the value is not shown">hidden</span>`:o`<span class="st-v st-mono" title=${c.value}>${c.value===""?"(empty)":c.value}</span>`:o`<span class="st-none">not set</span>`}</td>
          <td class="st-c-src st-mono">${gn(c)||o`<span class="st-none">—</span>`}</td>
          <td>${c.drives.length?c.drives.map(h=>h.label).join(", "):o`<span class="st-none">—</span>`}</td>
          <td class="st-c-what" title=${c.description||void 0}>${c.description}</td>
        </tr>`})}
    </tbody>
  </table>`}function Zo({w:t,entry:e}){const s=Jn("settings.tool"),a=(!t.st.sec||t.st.sec==="env")&&(!t.st.scope||t.st.scope==="env"),n=a&&e.envVars.some(r=>(r.set||t.showUnset)&&Ht(r,t.q)),l=e.sections.filter(r=>!t.st.sec||r.id===t.st.sec).map(r=>({...r,shown:r.rows.filter(t.passTool),hidden:t.showUnset?0:r.rows.filter(d=>d.unset&&t.passAll(d)&&(!t.st.scope||d.scope===t.st.scope)).length})).filter(r=>r.shown.length||r.hidden),i=e.rows.length,c=zs(e),p=Ro(t.hooks,e.id),h={autonomy:c&&o`<${No} w=${t} entry=${e} perms=${c}/>`,hooks:p&&o`<${Vo} status=${p}/>`},u=t.st.scope?O(t.st.scope,e.scopes):"";return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${I} id=${e.id} big/>
      <h2 class="st-bar__title" id="st-main-title">${e.label}</h2>
      <span class="st-bar__sub">${i} ${i===1?"setting":"settings"} in ${e.files.length} ${e.files.length===1?"file":"files"}${e.envUsed.length?` and ${e.envUsed.length} ${e.envUsed.length===1?"variable":"variables"}`:""}${e.risky?o` · <span class="st-red">${e.risky} risky</span>`:""}</span>
      <span class="st-bar__files">
        ${e.files.map(r=>o`<button type="button" key=${r} class="st-chip st-chip--mono st-chip--btn" title=${r}
          onClick=${()=>t.openAt(r)}>${Bo(r,e.files)}</button>`)}
        ${e.envUsed.map(r=>o`<button type="button" key=${"env:"+r.name} class="st-chip st-chip--mono st-chip--btn st-chip--env"
          data-env=${r.name} title=${"Environment variable "+r.name+(r.drives.length?": sets "+r.drives.map(d=>d.label).join(", "):"")}
          onClick=${()=>t.openEnv(r.name,e.id)}><span class="st-chip__pre" aria-hidden="true">$</span>${r.name}</button>`)}
      </span>
    </div>
    ${e.id==="vscode"&&o`<p class="st-note">chat.* settings, used by every AI tool in VS Code</p>`}
    ${e.hints.map((r,d)=>o`<p key=${d} class="st-note">${r}</p>`)}
    <${Go} w=${t} entry=${e}/>
    ${l.length?Xo(l).map((r,d)=>r.agents?o`<${no} key=${"a"+d} w=${t} section=${r.sections[0]}/>`:o`<${Jo} key=${"g"+d} w=${t} sections=${r.sections} scopes=${e.scopes} shared=${s} extras=${h}/>`):n?null:o`<p class="st-empty">${i?u?`No setting shown here is set at the ${u} layer.`:"No setting matches the search or the toggles.":"No settings were read for this tool."}</p>`}
    ${a&&o`<${Yo} w=${t} entry=${e}/>`}
  </section>`}const ge=[{k:"collector",l:"Collector",cls:"st-c-set",get:t=>t.name},{k:"mode",l:"Mode",get:t=>t.mode},{k:"status",l:"Status",get:t=>t.status},{k:"detail",l:"Detail",get:t=>t.detail}];function Qo({w:t,aictl:e}){const s=j("settings.collectors",ge),a=t.q.trim().toLowerCase(),n=e.collectors.filter(i=>!a||[i.name,i.mode,i.status,i.detail].join(" ").toLowerCase().includes(a)),l=e.roots.filter(i=>!a||i.toLowerCase().includes(a));return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${I} id="aictl" big/>
      <h2 class="st-bar__title" id="st-main-title">aictl</h2>
      <span class="st-bar__sub">monitoring engine · ${e.collectors.length} collectors · ${e.roots.length} monitored roots</span>
    </div>
    ${n.length>0&&o`<table class=${"st-table "+s.tableProps.class} style=${s.tableProps.style}>
      <thead><tr>${ge.map(s.th)}</tr></thead>
      <tbody>
        <tr class="st-group"><th scope="colgroup" colspan="4">Collectors<span class="st-group__meta">${n.length}</span></th></tr>
        ${s.order(n).map(i=>o`<tr key=${i.name} class="st-row st-row--static">
          <td class="st-c-set st-mono">${i.name}</td>
          <td class="st-mono">${i.mode||"—"}</td>
          <td><span class=${"st-status "+(i.status==="active"?"is-ok":"is-warn")}>${i.status}</span></td>
          <td class="st-c-what" title=${i.detail||void 0}>${i.detail}</td>
        </tr>`)}
      </tbody>
    </table>`}
    ${l.length>0&&o`<h3 class="st-subhead">Monitored roots</h3>
      <ul class="st-roots">${l.map((i,c)=>o`<li key=${c} class="st-mono" title=${i}>${i}</li>`)}</ul>`}
    ${!n.length&&!l.length&&o`<p class="st-empty">Nothing matches the search.</p>`}
  </section>`}function Ds(t){if(t.st.sec&&Rt.includes(t.st.sec))return t.st.sec;const e=s=>t.entries.some(a=>a.rows.some(n=>n.sec===s));return e("autonomy")?"autonomy":Rt.find(e)||"autonomy"}function tl({w:t}){const e=Ds(t);return o`<nav class="st-nav" aria-label="Topics">
    <${N}>Topics</${N}>
    <ul class="st-nav__list">
      ${Rt.map(s=>{const a=t.entries.filter(i=>i.rows.some(c=>c.sec===s&&t.pass(c))),n=a.some(i=>i.rows.some(c=>c.sec===s&&c.risky&&t.pass(c))),l=s===e;return o`<li key=${s}><button type="button" class=${"st-nav__item"+(l?" is-on":"")+(a.length?"":" is-empty")}
          aria-current=${l?"true":void 0} data-sec=${s}
          onClick=${()=>t.set({sec:s})}>
          <span class="st-nav__label">${Ut[s]}</span>
          ${n&&o`<${bt} label="A risky setting is on"/>`}
          <span class="st-nav__n">${a.length} ${a.length===1?"tool":"tools"}</span>
        </button></li>`})}
    </ul>
  </nav>`}function el({w:t}){const[e,s]=C("tool"),a=t.entries.flatMap(c=>c.rows.filter(p=>p.sec==="agents"&&Me(p))),n=a.filter(t.pass),l=new Set(n.map(c=>c.tool)).size,i=n.filter(kt).length;return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${Ut.agents}</h2>
      <span class="st-bar__sub" data-testid="st-agents-count">${n.length} ${n.length===1?"agent":"agents"} in ${l} ${l===1?"tool":"tools"}, ${i} inherit the session model</span>
    </div>
    ${n.length?o`<${oo} w=${t} rows=${n} sort=${e} onSort=${s}/>
      <p class="st-hint">Click an agent for its model decision, its tools and the files that define it.</p>`:o`<p class="st-empty">${a.length?"No agent matches the search or the toggles.":"No tool reports agents."}</p>`}
  </section>`}function ve(t,e,s){const a=t.cells[e];if(!(!a||a.unset&&!s))return typeof a.value=="number"?a.value:a.value==null||a.value===""?void 0:xt(a.value)}function sl({w:t,tools:e,rows:s}){const a=[{k:"setting",l:"Setting",cls:"st-c-set",get:l=>l.label},...e.map(l=>({k:l.id,cls:"st-matrix__tool",attrs:{"data-tool":l.id},n:Le(s,i=>ve(i,l.id,t.showUnset)),l:o`<span class="st-matrix__toolname"><${I} id=${l.id}/>${l.label}</span>`,get:i=>ve(i,l.id,t.showUnset)}))],n=j("settings.topic",a);return o`<div class="st-scroll"><table class=${"st-table st-matrix "+n.tableProps.class} style=${n.tableProps.style}>
      <thead><tr>${a.map(n.th)}</tr></thead>
      <tbody>
        ${n.order(s).map(l=>o`<tr key=${l.id} class="st-row st-row--static">
          <th scope="row" class="st-c-set" title=${l.keys.join(`
`)}>${l.label}</th>
          ${e.map(i=>{var h;const c=l.cells[i.id];if(!c||c.unset&&!t.showUnset)return o`<td key=${i.id} class="st-cell st-cell--none">—</td>`;const p=((h=t.selected)==null?void 0:h.uid)===c.uid;return o`<td key=${i.id} class=${"st-cell"+(c.risky?" is-risky":"")+(c.unset?" is-unset":"")+(p?" is-sel":"")}>
              <button type="button" class="st-cellbtn" data-key=${c.key}
                aria-label=${`${l.label}, ${i.label}: ${xt(c.value)}${c.unset?" (not set, default)":""}`}
                onClick=${()=>t.select({tool:i.id,row:c.key})}>
                <${Ct} row=${c} compact/>
              </button>
            </td>`})}
        </tr>`)}
      </tbody>
    </table></div>`}function nl({w:t}){const e=Ds(t);if(e==="agents")return o`<${el} w=${t}/>`;const{tools:s,rows:a}=vn(t.entries,e,t.pass),n=a.reduce((i,c)=>i+Object.values(c.cells).filter(p=>p.risky).length,0),l=e==="autonomy"?Mo(t.entries):[];return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${Ut[e]}</h2>
      <span class="st-bar__sub">every tool, side by side${n?o` · <span class="st-red">${n} risky ${n===1?"value":"values"}</span>`:""}</span>
    </div>
    <${jo} w=${t} mats=${l}/>
    ${a.length?o`<${sl} w=${t} tools=${s} rows=${a}/>
    <p class="st-hint">A cell is one setting in one tool. Click it for the file, the scope and the override chain.</p>`:o`<p class="st-empty">${s.length?"No setting matches the search or the toggles.":"No tool has settings in this section."}</p>`}
  </section>`}const al=8,Ps=86400,_t=8;function Xt(t){const e=t.cell?t.cell.split(":"):null;return{loc:K(t.sec),tools:K(t.tool),purpose:K(t.purpose),scope:K(t.fscope),git:K(t.git),recent:!!t.recent,cell:e&&e.length===2?e:null}}function ol(t,e,s,a){return!(s!=="loc"&&e.loc.length&&!e.loc.includes(t.location)||s!=="tools"&&e.tools.length&&!t.tools.some(n=>e.tools.includes(n))||s!=="purpose"&&e.purpose.length&&!e.purpose.includes(q(t))||s!=="scope"&&e.scope.length&&!e.scope.includes(t.scope)||s!=="git"&&e.git.length&&!e.git.includes(Gt(t))||s!=="recent"&&e.recent&&!(t.mtime&&t.mtime>=a-Ps)||s!=="cell"&&e.cell&&(q(t)!==e.cell[0]||t.location!==e.cell[1]))}function Ot(t,e=null,s=Date.now()/1e3){const a=Xt(t.st);return t.files.filter(n=>Cn(n,t.q)&&ol(n,a,e,s))}function Z(t,e,s){const a=K(t.st[e]);t.set({[e]:An(a.includes(s)?a.filter(n=>n!==s):[...a,s]),row:""})}function dt({w:t,title:e,fkey:s,skip:a,options:n,valueOf:l,attr:i,swatch:c}){const p=Ot(t,a),h=K(t.st[s]),u=n.map(r=>({...r,n:p.filter(d=>l(d).includes(r.id)).length})).filter(r=>r.n||h.includes(r.id)||r.always);return u.length?o`<${N}>${e}</${N}>
    <ul class="st-nav__list" aria-label=${e}>
      ${u.map(r=>{const d=h.includes(r.id);return o`<li key=${r.id}><button type="button" class=${"st-nav__item"+(d?" is-on":"")+(r.n?"":" is-empty")}
          aria-pressed=${d?"true":"false"} ...${{[i]:r.id}} onClick=${()=>Z(t,s,r.id)}>
          ${c?o`<${I} id=${r.id}/>`:null}<span class="st-nav__label">${r.label}</span><span class="st-nav__n">${r.n}</span></button></li>`})}
    </ul>`:null}function ll({w:t}){const e=[...new Set(t.files.flatMap(n=>n.tools))],s=[...new Set(t.files.map(n=>n.scope).filter(Boolean))],a=Ot(t,"recent").filter(n=>n.mtime&&n.mtime>=Date.now()/1e3-Ps).length;return o`<nav class="st-nav" aria-label="File filters">
    <${dt} w=${t} title="Locations" fkey="sec" skip="loc" attr="data-loc" options=${wn.map(n=>({...n,always:!0}))} valueOf=${n=>[n.location]}/>
    <${dt} w=${t} title="Purpose" fkey="purpose" skip="purpose" attr="data-purpose" options=${_n} valueOf=${n=>[q(n)]}/>
    <${dt} w=${t} title="Read by" fkey="tool" skip="tools" attr="data-tool" swatch=${!0}
      options=${e.map(n=>({id:n,label:t.labelOf(n)}))} valueOf=${n=>n.tools}/>
    <${dt} w=${t} title="Scope" fkey="fscope" skip="scope" attr="data-scope"
      options=${s.map(n=>({id:n,label:Ae[n]||n}))} valueOf=${n=>[n.scope]}/>
    <${dt} w=${t} title="Git" fkey="git" skip="git" attr="data-git" options=${Oe} valueOf=${n=>[Gt(n)]}/>
    <${N}>Changes</${N}>
    <ul class="st-nav__list">
      <li><button type="button" class=${"st-nav__item"+(t.st.recent?" is-on":"")} aria-pressed=${t.st.recent?"true":"false"}
        data-recent="1" onClick=${()=>t.set({recent:!t.st.recent,row:""})}>
        <span class="st-nav__label">Changed in the last 24 h</span><span class="st-nav__n">${a}</span></button></li>
    </ul>
  </nav>`}function il({w:t}){const e=Xt(t.st),s=[...e.loc.map(a=>({k:"sec:"+a,label:"Location: "+(pe[a]||a),drop:()=>Z(t,"sec",a)})),...e.purpose.map(a=>({k:"purpose:"+a,label:"Purpose: "+(et[a]||a),drop:()=>Z(t,"purpose",a)})),...e.tools.map(a=>({k:"tool:"+a,label:"Read by: "+t.labelOf(a),drop:()=>Z(t,"tool",a)})),...e.scope.map(a=>({k:"fscope:"+a,label:"Scope: "+(Ae[a]||a),drop:()=>Z(t,"fscope",a)})),...e.git.map(a=>{var n;return{k:"git:"+a,label:"Git: "+(((n=Oe.find(l=>l.id===a))==null?void 0:n.label)||a),drop:()=>Z(t,"git",a)}}),...e.recent?[{k:"recent",label:"Changed in the last 24 h",drop:()=>t.set({recent:!1,row:""})}]:[],...e.cell?[{k:"cell",label:(et[e.cell[0]]||e.cell[0])+" in "+(pe[e.cell[1]]||e.cell[1]),drop:()=>t.set({cell:"",row:""})}]:[]];return s.length?o`<div class="st-fchips" data-testid="st-file-chips">
    ${s.map(a=>o`<button key=${a.k} type="button" class="st-chip st-chip--btn" data-chip=${a.k}
      aria-label=${"Remove the filter "+a.label} onClick=${a.drop}>${a.label} <span aria-hidden="true">×</span></button>`)}
    <button type="button" class="st-link" onClick=${()=>t.set({sec:"",tool:"",purpose:"",fscope:"",git:"",recent:!1,cell:"",row:""})}>Clear filters</button>
  </div>`:null}function cl({w:t}){const e=Mn(Ot(t,"cell").filter(n=>!n.is_dir)),s=[{k:"purpose",l:"Purpose",get:n=>n.label},...e.cols.map(n=>({k:n.id,l:n.label,cls:"st-num",n:!0,get:l=>l.cells[n.id]||void 0})),{k:"all",l:"All",cls:"st-num",n:!0,get:n=>n.total||void 0}],a=j("settings.files.matrix",s);return e.rows.length?o`<div class="st-scroll"><table class=${"st-table st-fmatrix "+a.tableProps.class} style=${a.tableProps.style} data-testid="st-file-matrix">
    <caption class="st-sr">Files by purpose and location</caption>
    <thead><tr>${s.map(a.th)}</tr></thead>
    <tbody>${a.order(e.rows).map(n=>o`<tr key=${n.id}>
      <th scope="row">${n.label}</th>
      ${e.cols.map(l=>{const i=n.cells[l.id]||0,c=n.id+":"+l.id,p=t.st.cell===c;return o`<td key=${l.id} class=${"st-cell st-num"+(p?" is-sel":"")}>${i?o`<button type="button" class="st-cellbtn" data-cell=${c} aria-pressed=${p?"true":"false"}
              aria-label=${i+" "+n.label+" "+(i===1?"file":"files")+" in "+l.label}
              onClick=${()=>t.set({cell:p?"":c,row:""})}>${i}</button>`:o`<span class="st-dim" aria-hidden="true">·</span>`}</td>`})}
      <td class="st-num st-dim">${n.total}</td>
    </tr>`)}</tbody>
  </table></div>`:null}function rl({f:t,w:e}){const s=e.selectedFile&&e.selectedFile.path===t.path,a=()=>e.select({row:t.path}),n=zn(t);return o`<tr class=${"st-row"+(s?" is-sel":"")+(t.exists===!1?" is-missing":"")}
    data-path=${t.path} tabindex="0" onClick=${a}
    onKeyDown=${l=>{(l.key==="Enter"||l.key===" ")&&(l.preventDefault(),a())}}>
    <td class="st-c-file">
      ${t.is_dir?o`<span class="st-fname" title=${t.path}>${t.name}/</span>`:o`<button type="button" class="st-fname st-link" title=${"Open "+t.path}
            onClick=${l=>{l.stopPropagation(),e.openAt(t.path)}}>${t.name}</button>`}
      ${t.exists===!1&&o`<span class="st-hint"> missing</span>`}
    </td>
    <td><span class="st-chip" data-kind=${q(t)}>${t.is_dir?"Folder":et[q(t)]}</span></td>
    <td><${X} scope=${t.scope}/></td>
    <td><span class="st-tools">${t.tools.map(l=>o`<${B} key=${l} id=${l} label=${e.labelOf(l)}/>`)}</span></td>
    <td class="st-mono st-num">${t.settings?t.settings:"—"}</td>
    <td class="st-mono st-num">${!t.is_dir&&t.bytes!=null?Vt(t.bytes):"—"}</td>
    <td class=${n?"st-warn":"st-dim"} data-git=${Gt(t)||void 0}
      title=${n?"A tool always loads this file, and git does not track it":void 0}>${t.git_state||"—"}</td>
    <td class="st-dim">${t.mtime?ut(t.mtime):"—"}</td>
  </tr>`}function dl(t){const e=Xt(t.st);if(e.loc.length||e.purpose.length||e.scope.length||e.git.length||e.recent||e.cell)return[];const s=t.q.trim().toLowerCase();return(t.managedAbsent||[]).filter(a=>(!s||[a.path,a.label,a.note].join(`
`).toLowerCase().includes(s))&&(!e.tools.length||a.tools.some(n=>e.tools.includes(n))))}function pl({w:t,items:e}){const[s,a]=C(!1);return o`<tbody class="st-absent" data-root="managed-absent">
    <tr class="st-group"><th scope="colgroup" colspan=${_t}>
      <button type="button" class="st-fold" aria-expanded=${s?"true":"false"} onClick=${()=>a(!s)}>
        <span aria-hidden="true">${s?"▾":"▸"}</span><span>Managed locations (not present)</span></button>
      <span class="st-group__meta">${e.length} ${e.length===1?"location":"locations"} · where a policy would come from</span>
    </th></tr>
    ${s&&e.map(n=>o`<tr key=${n.path} class="st-row st-row--static st-row--absent" data-path=${n.path}>
      <td class="st-c-file"><span class="st-fname" title=${n.path+(n.note?`
`+n.note:"")}>${V(n.path)}</span>
        <span class="st-hint"> not present</span></td>
      <td class="st-dim">—</td>
      <td><span class="st-scopewrap"><${gt} label="Cannot be changed from this machine"/><${X} scope=${n.scope}/></span></td>
      <td><span class="st-tools">${n.tools.map(l=>o`<${B} key=${l} id=${l} label=${t.labelOf(l)}/>`)}</span></td>
      <td class="st-mono st-num">—</td><td class="st-mono st-num">—</td><td class="st-dim">—</td><td class="st-dim">—</td>
    </tr>`)}
  </tbody>`}function ul(t,e){const s=t.filter(l=>!l.is_dir),a=t.filter(l=>l.is_dir),n=e==="purpose"?Sn(s).map(l=>({key:"purpose:"+l.id,attrs:{"data-purpose":l.id},title:l.label,mono:!1,root:null,files:l.files})):xn(s).map(l=>({key:l.root,attrs:{"data-root":l.root},title:V(l.root),full:l.root,mono:!0,root:l.root,sub:ze[l.location]||"Other",files:l.files}));return a.length&&n.push({key:"watched",attrs:{"data-root":"watched"},title:"Watched folders",mono:!1,root:null,flat:!0,sub:"folders the monitor reads",files:a}),n}function hl({g:t,w:e,open:s,setOpen:a,shut:n,setShut:l,grid:i}){const c=!!n[t.key],p=[...new Set(t.files.flatMap(r=>r.tools))],h=t.files.reduce((r,d)=>r+(d.is_dir?0:Number(d.bytes)||0),0),u=(t.flat?[{dir:"",files:t.files}]:On(t.files)).map(r=>({...r,files:i.order(r.files)}));return t.root&&u.sort((r,d)=>(d.dir===t.root)-(r.dir===t.root)),o`<tbody ...${t.attrs}>
    <tr class="st-group"><th scope="colgroup" colspan=${_t}>
      <button type="button" class="st-fold" aria-expanded=${c?"false":"true"}
        onClick=${()=>l({...n,[t.key]:!c})}>
        <span aria-hidden="true">${c?"▸":"▾"}</span>
        <span class=${t.mono?"st-mono":""} title=${t.full||void 0}>${t.title}</span></button>
      <span class="st-group__meta">${t.sub?t.sub+" · ":""}${t.files.length} ${t.files.length===1?"file":"files"}${h?" · "+Vt(h):""}</span>
      ${p.length>0&&o`<span class="st-tools st-group__tools">${p.map(r=>o`<${B} key=${r} id=${r} label=${e.labelOf(r)}/>`)}</span>`}
    </th></tr>
    ${!c&&u.map(r=>{const d=t.key+"|"+r.dir,k=s[d]?r.files:r.files.slice(0,al),y=r.files.length-k.length;return o`<${ce} key=${d}>
        ${r.dir&&r.dir!==t.root&&o`<tr class="st-folder" data-dir=${r.dir}><td colspan=${_t}>
          <span class="st-mono st-path" title=${r.dir}>${V(r.dir)}</span><span class="st-dim"> · ${r.files.length}</span></td></tr>`}
        ${k.map(_=>o`<${rl} key=${_.path} f=${_} w=${e}/>`)}
        ${y>0&&o`<tr class="st-morerow"><td colspan=${_t}>
          <button type="button" class="st-link st-more" onClick=${()=>a({...s,[d]:!0})}>▸ ${y} more</button>
        </td></tr>`}
      </${ce}>`})}
  </tbody>`}const $l=[{value:"location",label:"By location"},{value:"purpose",label:"By purpose"}],fl=t=>{if(!t.mtime)return;const e=Number(t.mtime);return e>0?e:typeof t.mtime=="string"&&Date.parse(t.mtime)||void 0};function _e(t){return[{k:"file",l:"File",cls:"st-c-file",get:e=>e.name},{k:"purpose",l:"Purpose",get:e=>e.is_dir?"Folder":et[q(e)]},{k:"scope",l:"Scope",get:e=>e.scope},{k:"readby",l:"Read by",get:e=>e.tools.map(t.labelOf).join(", ")},{k:"settings",l:"Settings",cls:"st-num",n:!0,get:e=>e.settings||void 0},{k:"size",l:"Size",cls:"st-num",n:!0,get:e=>e.is_dir||e.bytes==null?void 0:Number(e.bytes)},{k:"git",l:"Git",get:e=>e.git_state},{k:"changed",l:"Last change",n:!0,get:fl}]}function ml({w:t}){const e=j("settings.files",_e(t)),[s,a]=C({}),[n,l]=C({}),i=Ot(t),c=t.st.group==="purpose"?"purpose":"location",p=ul(i,c),h=dl(t);return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Files aictl reads</h2>
      <span class="st-bar__sub">${i.length} ${i.length===1?"file":"files"} · grouped by ${c==="purpose"?"what they are for":"where they live"}</span>
      <div class="st-seg st-bar__end" role="group" aria-label="Group the files">
        ${$l.map(u=>o`<button key=${u.value} type="button" class="st-seg__btn" aria-pressed=${c===u.value?"true":"false"}
          onClick=${()=>t.set({group:u.value})}>${u.label}</button>`)}
      </div>
    </div>
    ${t.filesStatus!=="ready"&&o`<p class="st-note" role="status">File details are loading</p>`}
    <${cl} w=${t}/>
    <${il} w=${t}/>
    ${p.length||h.length?o`<div class="st-scroll"><table class=${"st-table st-files "+e.tableProps.class} style=${e.tableProps.style}>
      <thead><tr>${_e(t).map(e.th)}</tr></thead>
      ${p.map(u=>o`<${hl} key=${u.key} g=${u} w=${t} open=${s} setOpen=${a} shut=${n} setShut=${l} grid=${e}/>`)}
      ${h.length>0&&o`<${pl} w=${t} items=${h}/>`}
    </table></div>`:o`<p class="st-empty">${t.files.length?"No file matches the search or the filters.":"No settings files were found."}</p>`}
  </section>`}const bl=5;function Ns(t,e){return t?V(t)+(e>0?":"+e:""):"—"}function yl({w:t}){const e=Te(t.findings.filter(s=>Ee(s,t.q)));return o`<nav class="st-nav" aria-label="Finding rules">
    <${N}>Finding rules</${N}>
    <ul class="st-nav__list">
      <li><button type="button" class=${"st-nav__item"+(t.st.sec?"":" is-on")} aria-current=${t.st.sec?void 0:"true"}
        onClick=${()=>t.set({sec:"",row:""})}>
        <span class="st-dotspace" aria-hidden="true"></span><span class="st-nav__label">All rules</span>
        <span class="st-nav__n">${e.reduce((s,a)=>s+a.count,0)}</span></button></li>
      ${e.map(s=>{const a=t.st.sec===s.rule;return o`<li key=${s.rule}><button type="button" class=${"st-nav__item"+(a?" is-on":"")}
          aria-current=${a?"true":void 0} data-rule=${s.rule}
          onClick=${()=>t.set({sec:a?"":s.rule,row:""})}>
          ${s.alarm?o`<${bt} label=${s.severity+" severity"}/>`:o`<span class="st-dotspace" aria-hidden="true"></span>`}
          <span class="st-nav__label">${s.label}</span><span class="st-nav__n">${s.count}</span></button></li>`})}
    </ul>
  </nav>`}function kl({f:t,group:e,w:s}){const a=s.selectedFinding&&s.selectedFinding.id===t.id,n=()=>s.select({row:t.id,sec:s.st.sec}),l=e.why&&t.why===e.why?t.action||"":t.why||t.action||"",i=$t(t).map(s.labelOf).join(", ")||(t.session_id?"session "+t.session_id:"—");return o`<tr class=${"st-row"+(a?" is-sel":"")+(t.severity==="high"||t.severity==="medium"?" st-row--risky":"")}
    data-id=${t.id} tabindex="0" onClick=${n}
    onKeyDown=${c=>{(c.key==="Enter"||c.key===" ")&&(c.preventDefault(),n())}}>
    <td class="st-c-tool">${i}</td>
    <td class="st-c-where st-mono" title=${t.path?t.path+(t.line>0?":"+t.line:""):void 0}>
      ${Ns(t.path,t.line)}${t.count>1?o` <span class="st-dim">×${t.count}</span>`:""}</td>
    <td class="st-c-what" title=${[t.why,t.action].filter(Boolean).join(`
`)||void 0}>${l}</td>
    <td class="st-c-act">${t.path&&(tt(t.path)?o`<button type="button" class="st-chip st-chip--btn"
        onClick=${c=>{c.stopPropagation(),s.openEnv(W(t.path),$t(t)[0]||"")}}>Show the variable</button>`:o`<button type="button" class="st-chip st-chip--btn"
        onClick=${c=>{c.stopPropagation(),s.openAt(t.path,t.line)}}>Show the line</button>`)}</td>
  </tr>`}function we(t){return[{k:"tool",l:"Tool",cls:"st-c-tool",get:s=>$t(s).map(t.labelOf).join(", ")},{k:"where",l:"Where",cls:"st-c-where",get:s=>s.path?V(s.path)+String(s.line>0?s.line:0).padStart(8,"0"):void 0},{k:"what",l:"What it does",get:s=>s.why||s.action},{k:"action",l:o`<span class="st-sr">Action</span>`,cls:"st-c-act"}]}function gl({w:t}){var u,r;const e=j("settings.findings",we(t)),[s,a]=C({});if(t.auditStatus==="loading"&&!t.audit){const d=t.scan;return o`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note" role="status" aria-busy="true" data-state="scanning">Scanning context sources…${d?" "+(d.step||"")+(d.elapsed_s!=null?", "+Math.round(d.elapsed_s)+" s":""):""}</p>
    </section>`}if(t.auditStatus==="error"&&!t.audit)return o`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note st-red" role="alert">The context audit failed: ${t.auditError}
        ${t.rescan&&o` <button type="button" class="st-btn" onClick=${()=>t.rescan()}>Retry</button>`}</p>
    </section>`;const n=t.findings.filter(d=>Ee(d,t.q)),l=Te(n).filter(d=>!t.st.sec||d.rule===t.st.sec),i=l.reduce((d,k)=>d+k.count,0),c=t.auditStatus==="loading",p=((u=t.audit)==null?void 0:u.incomplete)||[],h=((r=t.audit)==null?void 0:r.failed_steps)||[];return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Findings</h2>
      <span class="st-bar__sub">${i} in ${l.length} ${l.length===1?"rule":"rules"} · hidden changes, conflicts and settings outside this project</span>
      ${t.rescan&&o`<button type="button" class="st-chip st-chip--btn st-bar__end" disabled=${c}
        onClick=${()=>t.rescan()}>${c?"Scanning…":"Rescan"}</button>`}
    </div>
    ${c&&o`<p class="st-note" role="status" data-state="rescanning">Scanning again…${t.scan?" "+(t.scan.step||"")+(t.scan.elapsed_s!=null?", "+Math.round(t.scan.elapsed_s)+" s":""):""} The last results stay until it ends.</p>`}
    ${t.auditStatus==="error"&&o`<p class="st-note st-red" role="alert">The last scan failed: ${t.auditError}. These are the earlier results.</p>`}
    ${p.length>0&&o`<p class="st-note st-warn">The scan reached its time limit and skipped: ${p.join(", ")}.</p>`}
    ${h.length>0&&o`<p class="st-note st-warn">The scan could not read: ${h.map(d=>d.step+" ("+d.error+")").join(", ")}.</p>`}
    ${l.length?o`<table class=${"st-table st-findings "+e.tableProps.class} style=${e.tableProps.style}>
      <thead><tr>${we(t).map(e.th)}</tr></thead>
      ${l.map(d=>{const k=!!s[d.rule],y=e.order(d.items),_=k?y:y.slice(0,bl),$=y.length-_.length;return o`<tbody key=${d.rule} data-rule=${d.rule}>
          <tr class="st-group"><th scope="colgroup" colspan="4">
            ${d.alarm&&o`<${bt} label=${d.severity+" severity"}/>`} ${d.label}
            <span class="st-group__meta">${d.count} · ${d.tools.map(t.labelOf).join(", ")||"no tool"}${d.why?" · "+d.why:""}</span>
          </th></tr>
          ${_.map(S=>o`<${kl} key=${S.id} f=${S} group=${d} w=${t}/>`)}
          ${$>0&&o`<tr class="st-morerow"><td colspan="4">
            <button type="button" class="st-link st-more" onClick=${()=>a({...s,[d.rule]:!0})}>▸ ${$} more</button>
          </td></tr>`}
        </tbody>`})}
    </table>`:o`<p class="st-empty">${t.findings.length?"No finding matches the search.":"No findings for the selected tools."}</p>`}
  </section>`}const G=[{id:"allow",label:"Allow",hint:"run without asking"},{id:"deny",label:"Deny",hint:"always refused"},{id:"ask",label:"Ask",hint:"always ask first"}];function Ce(t){return String((t==null?void 0:t.message)||t||"").replace(/^HTTP \d+ \S+: /,"")||"The request failed"}const Nt=t=>Object.fromEntries(G.map(e=>{var s;return[e.id,Lo((s=t==null?void 0:t.permissions)==null?void 0:s[e.id])]}));function vl({title:t,diff:e}){const s=e.added.length||e.removed.length;return o`<div class="st-diff" data-bucket=${t}>
    <span class="st-diff__name">${t}</span>
    <span class="st-diff__chips">
      ${s?o`${e.added.map(a=>o`<code key=${"a"+a} class="st-diff__chip is-added">+ ${a}</code>`)}
          ${e.removed.map(a=>o`<code key=${"r"+a} class="st-diff__chip is-removed">- ${a}</code>`)}`:o`<span class="st-dim">no change</span>`}
    </span>
  </div>`}function _l({tool:t,target:e,refresh:s,onClose:a}){const[n,l]=C(null),[i,c]=C(()=>Nt(null)),[p,h]=C(!0),[u,r]=C(!1),[d,k]=C(null),[y,_]=C(null),$=R(()=>{let b=!0;return h(!0),k(null),rn(t,e.scope).then(E=>{b&&(l(E),c(Nt(E)),h(!1))},E=>{b&&(k({message:Ce(E),conflict:!0}),h(!1))}),()=>{b=!1}},[t,e.scope]);ht(()=>$(),[$]);const S=Object.fromEntries(G.map(b=>[b.id,Do(i[b.id])])),A=Object.fromEntries(G.map(b=>{var E;return[b.id,((E=n==null?void 0:n.permissions)==null?void 0:E[b.id])||[]]})),st=Object.fromEntries(G.map(b=>[b.id,Po(A[b.id],S[b.id])])),L=G.some(b=>JSON.stringify(A[b.id])!==JSON.stringify(S[b.id])),nt=JSON.stringify({permissions:S},null,2),T=(n==null?void 0:n.path)||e.path,At=()=>{r(!0),k(null),_(null),dn(t,{scope:e.scope,expected_mtime:(n==null?void 0:n.mtime)??null,permissions:S}).then(b=>{l(b),c(Nt(b)),_({backup:(b==null?void 0:b.backup_path)||""}),r(!1),typeof s=="function"&&s()},b=>{k({message:Ce(b),conflict:(b==null?void 0:b.status)===409}),r(!1)})},zt=()=>{_(null),$()};return o`<section class="st-insp__sec st-editor" data-testid="st-perm-editor" aria-label="Edit permissions">
    <h4 class="st-insp__h">Edit permissions · ${e.label}</h4>
    <p class="st-hint st-editor__target" data-testid="st-editor-target">
      Writes <span class="st-mono" title=${T}>${T}</span> (${e.label})${n&&!n.exists?", a new file":""}
    </p>
    ${d&&o`<div class="st-editor__error" role="alert" data-testid="st-editor-error">
      <span>${d.message}</span>
      ${d.conflict&&o`<button type="button" class="st-btn" onClick=${zt}>Reload</button>`}
    </div>`}
    ${y&&o`<div class="st-editor__saved" role="status" data-testid="st-editor-saved">
      ${y.backup?o`Saved. Backup: <span class="st-mono" title=${y.backup}>${y.backup}</span>`:"Saved. The file was new, so there is no backup."}
    </div>`}
    ${p?o`<p class="st-hint">Loading the file…</p>`:n&&o`
      <div class="st-editor__fields">
        ${G.map(b=>o`<label key=${b.id} class="st-editor__field">
          <span class="st-editor__label">${b.label} <span class="st-dim">· ${b.hint}, one rule per line</span></span>
          <textarea class="st-editor__area" data-bucket=${b.id} rows="4" spellcheck="false" value=${i[b.id]}
            onInput=${E=>c({...i,[b.id]:E.currentTarget.value})}></textarea>
        </label>`)}
      </div>
      <div class="st-editor__diff" data-testid="st-editor-diff">
        <div class="st-insp__h">Pending diff</div>
        ${G.map(b=>o`<${vl} key=${b.id} title=${b.id} diff=${st[b.id]}/>`)}
      </div>
      <pre class="st-editor__json" data-testid="st-editor-json">${nt}</pre>`}
    <div class="st-actions">
      <button type="button" class="st-btn st-btn--primary" onClick=${At} disabled=${p||u||!n||!L}>${u?"Saving…":"Save"}</button>
      <button type="button" class="st-btn" onClick=${a}>Cancel</button>
    </div>
  </section>`}function g({title:t,children:e}){return o`<section class="st-insp__sec"><h4 class="st-insp__h">${t}</h4>${e}</section>`}function Yt(t,e){return"Open "+J(t)+(e>0?" at line "+e:"")}function Zt(t,e){return e?t.findings.filter(s=>ft(s.path,e)):[]}function Qt(t,e){t.set({view:"findings",sec:e.rule||"",row:e.id,tool:""})}function js({w:t,path:e}){const s=e&&t.recentFiles&&typeof t.recentFiles.get=="function"?t.recentFiles.get(e):null,a=e?t.mtimeOf(e):null,n=[];return s?n.push(`File changed ${ut(s.ts)}${s.tool?" by "+t.labelOf(s.tool):""} (file history)`):a&&n.push(`File last changed ${ut(a)} (file history)`),o`<div class="st-hint" data-testid="st-history">${n.length?n.join(" · ")+" · no aictl change recorded":"No aictl change recorded"}</div>`}function wl(t,e){var a;const s=(a=t.chain)==null?void 0:a[t.wins];return t.locked||Bt(s,e)?"Locked by "+O(t.locked?t.scope:s.scope,e):Ts}function Cl(t,e){const s=Nn(e);return`Not set in any file. Default: ${xt(t.value)}.`+(s?` Set it in ${V(s.path)} (${s.label}).`:"")}function Sl({w:t,row:e}){const s=t.scopesOf(e.tool),a=t.entries.filter(r=>r.id!==e.tool&&e.source&&r.files.some(d=>ft(d,e.source))).map(r=>r.label),n=e.source?t.files.find(r=>ft(r.path,e.source)):null;for(const r of(n==null?void 0:n.tools)||[]){const d=t.labelOf(r);r!==e.tool&&!a.includes(d)&&a.push(d)}const l=Zt(t,e.source),{chain:i,wins:c}=e,p=Eo(e,s),[h,u]=C(!1);return o`<div class="st-insp__body" data-testid="st-inspector-row">
    <h3 class="st-insp__title">${e.label}</h3>
    <div class="st-insp__key st-mono">${e.key}</div>
    ${e.tip&&o`<p class="st-insp__tip">${e.tip}</p>`}
    <div class="st-insp__chips">
      ${e.risky&&o`<span class="st-chip st-chip--risky">risky</span>`}
      <${B} id=${e.tool} label=${t.labelOf(e.tool)}/>
      <${X} scope=${e.scope} locked=${e.locked} label=${O(e.scope,s)}/>
      ${e.undocumented&&o`<${Mt}/>`}
      ${a.length>0&&o`<span class="st-chip">also read by ${a.join(", ")}</span>`}
    </div>
    <div class=${"st-insp__value"+(e.unset?" is-unset":"")}><${Ct} row=${e}/></div>
    ${e.unset&&o`<p class="st-insp__tip" data-testid="st-unset-text">${Cl(e,s)}</p>`}
    <${g} title="Override chain · what wins and why">
      <ol class="st-chain">
        ${i.map((r,d)=>{const k=d===c,y=Bt(r,s);return o`<li key=${d} class=${"st-chain__lv"+(k?" is-win":"")+(y?" is-locked":"")} aria-current=${k?"true":void 0}>
            <span class="st-chain__sc">${y&&o`<${gt} label=${"Locked: "+O(r.scope,s)+" cannot be changed here"}/>`}${r.scope||"default"}</span>
            <span class="st-chain__v">${Ln(r)?o`<span class="st-dim">not set</span>`:o`<${Ct} row=${e} value=${r.value} compact/>`}</span>
            <span class="st-chain__src">${r.source?o`<${yt} path=${r.source} line=${Number(r.line)>0?Number(r.line):0} w=${t} tool=${e.tool}/>`:o`<span class="st-dim">${r.note||(r.scope==="default"?t.labelOf(e.tool):"—")}</span>`}</span>
            ${k&&o`<span class="st-sr"> (wins)</span>`}
          </li>`})}
      </ol>
      <p class="st-hint st-insp__why">${Dn(i,c)}</p>
    </${g}>
    ${!tt(e.source)&&o`<${g} title="History"><${js} w=${t} path=${e.source}/></${g}>`}
    <${g} title="Actions">
      <div class="st-actions">
        ${e.source&&(tt(e.source)?o`<button type="button" class="st-btn" onClick=${()=>t.openEnv(W(e.source),e.tool)}>Show ${W(e.source)||"the variable"}</button>`:o`<button type="button" class="st-btn" onClick=${()=>t.openAt(e.source,e.line)}>${Yt(e.source,e.line)}</button>`)}
        ${l.length>0&&o`<button type="button" class="st-btn" onClick=${()=>Qt(t,l[0])}>Show finding</button>`}
      </div>
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled=${!p.ok||h}
          aria-expanded=${p.ok?h?"true":"false":void 0}
          onClick=${()=>u(!0)}>Change value…</button>
        <span class="st-hint" data-testid="st-change-hint">${p.ok?`Edits ${V(p.path)||"the "+p.label+" file"} (${p.label})`:p.hint}</span>
      </div>
    </${g}>
    ${h&&o`<${_l} tool=${e.tool} target=${p} refresh=${t.refresh}
      onClose=${()=>u(!1)}/>`}
  </div>`}function xl({w:t,row:e}){const s=e.agent,a=t.scopesOf(e.tool),{steps:n,wins:l,why:i}=En(e),c=u=>Number(u)>0?Number(u):0,p=[{label:"Defined in",path:s.defined_in,line:c(s.defined_line),scope:s.scope_defined},{label:"Pinned in",path:s.pinned_in,line:c(s.pinned_line),scope:s.scope_pinned}],h=wl(e,a);return o`<div class="st-insp__body" data-testid="st-inspector-agent">
    <h3 class="st-insp__title">${s.name||e.label}</h3>
    <div class="st-insp__key st-mono">${e.key}</div>
    ${s.description&&o`<p class="st-insp__tip">${s.description}</p>`}
    <div class="st-insp__chips">
      <${B} id=${e.tool} label=${t.labelOf(e.tool)}/>
      <${X} scope=${e.scope} locked=${e.locked} label=${O(e.scope,a)}/>
    </div>
    <div class="st-insp__value"><${xs} row=${e} w=${t}/></div>
    <${g} title="Model · what decides it">
      <ol class="st-chain">
        ${n.map((u,r)=>{const d=r===l;return o`<li key=${u.id} class=${"st-chain__lv"+(d?" is-win":"")} aria-current=${d?"true":void 0}>
            <span class="st-chain__sc">${u.label}</span>
            <span class="st-chain__v">${u.value===void 0||u.value===null||u.value===""?o`<span class="st-dim">${u.id==="pin"&&u.present?"set":"not set"}</span>`:u.value==="inherits"?o`<span class="st-inherit">inherits</span>`:o`<span class="st-v">${String(u.value)}</span>`}</span>
            <span class="st-chain__src">${u.source?o`<${yt} path=${u.source} line=${u.line} w=${t}/>`:o`<span class="st-dim">${u.id==="effective"?l===2?"session model":"":"—"}</span>`}</span>
            ${d&&o`<span class="st-sr"> (wins)</span>`}
          </li>`})}
      </ol>
      <p class="st-hint st-insp__why">${i}</p>
    </${g}>
    <${g} title="Agent">
      <dl class="st-insp__dl">
        <dt>Effort</dt><dd>${s.effort||"—"}</dd>
        <dt>Context</dt><dd>${s.context_tier||"—"}</dd>
        <dt>Target</dt><dd>${s.target||"—"}</dd>
        <dt>Model policy</dt><dd>${s.model_policy||"—"}</dd>
      </dl>
    </${g}>
    <${g} title=${"Tools"+(s.tools.length?" · "+s.tools.length:"")}><${Ms} tools=${s.tools} all/></${g}>
    <${g} title="Files">
      <dl class="st-insp__dl st-insp__files">
        ${p.map(u=>o`<dt key=${u.label+"t"}>${u.label}</dt><dd key=${u.label+"d"}>
          ${u.path?o`<span class="st-mono" title=${u.path+(u.line?":"+u.line:"")}>${J(u.path)}${u.line?":"+u.line:""}</span>
            ${u.scope&&o` <span class="st-dim">· ${O(u.scope,a)}</span>`}
            <button type="button" class="st-link" onClick=${()=>t.openAt(u.path,u.line)}
              aria-label=${Yt(u.path,u.line)}>Open</button>`:o`<span class="st-dim">—</span>`}
        </dd>`)}
      </dl>
    </${g}>
    <${g} title="History"><${js} w=${t} path=${s.defined_in||e.source}/></${g}>
    <${g} title="Actions">
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled>Change model…</button>
        <span class="st-hint" data-testid="st-change-hint">${h}</span>
      </div>
    </${g}>
  </div>`}function Ml({w:t,file:e}){const s=Zt(t,e.path),a=e.rows||[];return o`<div class="st-insp__body" data-testid="st-inspector-file">
    <h3 class="st-insp__title">${e.name}</h3>
    <div class="st-insp__key st-mono">${e.path}</div>
    <div class="st-insp__chips">
      <span class="st-chip">${e.is_dir?"Watched folder":et[q(e)]}</span>
      <${X} scope=${e.scope}/>
      <span class="st-chip">${ze[e.location]||"Other"}</span>
      ${e.tools.map(n=>o`<${B} key=${n} id=${n} label=${t.labelOf(n)}/>`)}
    </div>
    <${g} title=${"Settings from this file"+(a.length?" · "+a.length:"")}>
      ${a.length?o`<ul class="st-insp__list">
        ${a.map(n=>o`<li key=${n.uid}><button type="button" class="st-link"
          onClick=${()=>t.set({view:"tool",tool:n.tool,sec:"",row:n.key})}>${n.label}</button>
          <span class="st-dim"> · ${t.labelOf(n.tool)}${n.line>0?" · line "+n.line:""}</span></li>`)}
      </ul>`:o`<div class="st-hint">${e.settings?e.settings+" settings":"No settings are read from this file."}</div>`}
    </${g}>
    <${g} title="File">
      <dl class="st-insp__dl">
        <dt>Path</dt><dd class="st-insp__path">${e.path}</dd>
        <dt>Purpose</dt><dd>${e.is_dir?"Watched folder":et[q(e)]}${e.kind&&e.kind!==q(e)?" ("+e.kind+")":""}</dd>
        <dt>Scope</dt><dd>${e.scope||"—"}</dd>
        <dt>Git</dt><dd>${e.git_state||"—"}</dd>
        <dt>Size</dt><dd>${e.bytes!=null&&!e.is_dir?Vt(e.bytes):"—"}</dd>
        <dt>Last change</dt><dd>${e.mtime?ut(e.mtime):"—"}</dd>
        ${e.mtime?o`<dt>Modified</dt><dd>${new Date(e.mtime*1e3).toLocaleString()}</dd>`:null}
        ${e.loading&&o`<dt>Loading</dt><dd>${e.loading}</dd>`}
        ${e.exists===!1&&o`<dt>State</dt><dd>missing</dd>`}
      </dl>
    </${g}>
    <${g} title="Actions">
      <div class="st-actions">
        ${!e.is_dir&&o`<button type="button" class="st-btn" onClick=${()=>t.openAt(e.path)}>Open file</button>`}
        ${s.length>0&&o`<button type="button" class="st-btn" onClick=${()=>Qt(t,s[0])}>Show finding</button>`}
      </div>
    </${g}>
  </div>`}function Ol({w:t,v:e}){const s=Tn(e),a=Zt(t,e.source);return o`<div class="st-insp__body" data-testid="st-inspector-env">
    <h3 class="st-insp__title st-mono">${e.name||"Environment variable"}</h3>
    <div class="st-insp__key">Environment variable${e.name?"":" (this aictl version did not name it)"}</div>
    ${e.description&&o`<p class="st-insp__tip">${e.description}</p>`}
    <div class="st-insp__chips">
      <${B} id=${e.tool} label=${t.labelOf(e.tool)}/>
      <${X} scope="env" label=${O("env",t.scopesOf(e.tool))}/>
      ${e.masked&&o`<span class="st-chip st-chip--muted">value hidden</span>`}
      ${!e.documented&&o`<${Mt}/>`}
    </div>
    <div class=${"st-insp__value"+(e.set?"":" is-unset")} data-testid="st-env-value">${e.set?e.masked?o`<span class="st-dim" title="The name says it holds a credential, so the value is not shown">hidden</span>`:o`<span class="st-v st-mono">${e.value===""?"(empty)":e.value}</span>`:o`<span class="st-dim">not set</span>`}</div>
    <${g} title="Where it is set">
      ${s.length?o`<ul class="st-insp__list" data-testid="st-env-where">
        ${s.map(n=>o`<li key=${n.id}>
          <b>${n.label}</b>${n.origin&&o` <span class="st-mono" title=${n.origin}>${V(n.origin)}</span>`}
          ${n.value!==e.value&&o` <span class="st-dim">= ${n.value}</span>`}
          ${n.file&&o` <button type="button" class="st-link" onClick=${()=>t.openAt(n.file)}
            aria-label=${"Open "+J(n.file)}>Open</button>`}
          <div class="st-hint">${n.note}</div>
        </li>`)}
      </ul>`:o`<div class="st-hint">Not set in aictl's environment, in a shell profile or in the registry.</div>`}
    </${g}>
    <${g} title=${"What it drives"+(e.drives.length?" · "+e.drives.length:"")}>
      ${e.drives.length?o`<ul class="st-insp__list" data-testid="st-env-drives">
        ${e.drives.map(n=>o`<li key=${n.key}><button type="button" class="st-link"
          onClick=${()=>t.set({view:"tool",tool:e.tool,sec:"",row:n.key})}>${n.label}</button>
          <span class="st-dim st-mono"> · ${n.key}</span></li>`)}
      </ul>`:o`<div class="st-hint">No setting shown here reads it; ${t.labelOf(e.tool)} reads it when it starts.</div>`}
    </${g}>
    <${g} title="Actions">
      <div class="st-actions">
        ${a.length>0&&o`<button type="button" class="st-btn" onClick=${()=>Qt(t,a[0])}>Show finding</button>`}
        <span class="st-hint">A change applies to sessions started after it, from a shell that has the new value.</span>
      </div>
    </${g}>
  </div>`}function Al({w:t,f:e}){return o`<div class="st-insp__body" data-testid="st-inspector-finding">
    <h3 class="st-insp__title">${Pn(e.rule)}</h3>
    <div class="st-insp__key st-mono">${Ns(e.path,e.line)}</div>
    <div class="st-insp__chips">
      <span class=${"st-chip"+(e.severity==="high"||e.severity==="medium"?" st-chip--risky":"")}>${e.severity||"info"}</span>
      ${$t(e).map(s=>o`<${B} key=${s} id=${s} label=${t.labelOf(s)}/>`)}
      ${e.session_id&&o`<span class="st-chip st-chip--mono">session ${e.session_id}</span>`}
    </div>
    ${e.why&&o`<${g} title="Why it matters"><p class="st-insp__tip">${e.why}</p></${g}>`}
    ${e.action&&o`<${g} title="What to do"><p class="st-insp__tip">${e.action}</p></${g}>`}
    <${g} title="Actions">
      <div class="st-actions">
        ${e.path&&(tt(e.path)?o`<button type="button" class="st-btn" onClick=${()=>t.openEnv(W(e.path),$t(e)[0]||"")}>Show ${W(e.path)||"the variable"}</button>`:o`<button type="button" class="st-btn" onClick=${()=>t.openAt(e.path,e.line)}>${e.line>0?Yt(e.path,e.line):"Show the line"}</button>`)}
      </div>
    </${g}>
  </div>`}function zl({w:t}){const{view:e}=t.st;let s=null;return(e==="tool"||e==="topic")&&t.selectedEnv?s=o`<${Ol} key=${t.selectedEnv.uid} w=${t} v=${t.selectedEnv}/>`:(e==="tool"||e==="topic")&&t.selected?s=Me(t.selected)?o`<${xl} key=${t.selected.uid} w=${t} row=${t.selected}/>`:o`<${Sl} key=${t.selected.uid} w=${t} row=${t.selected}/>`:e==="files"&&t.selectedFile?s=o`<${Ml} w=${t} file=${t.selectedFile}/>`:e==="findings"&&t.selectedFinding&&(s=o`<${Al} w=${t} f=${t.selectedFinding}/>`),o`<aside class=${"st-insp"+(t.drawer?" is-open":"")} aria-label="Inspector">
    <button type="button" class="st-insp__close st-btn" onClick=${t.closeDrawer} aria-label="Close the inspector">Close</button>
    ${s||o`<div class="st-insp__body st-insp__body--empty">
      <h3 class="st-insp__title">Nothing selected</h3>
      <p class="st-hint">${e==="files"?"Click a file for its details.":e==="findings"?"Click a finding for its details.":"Click a setting to see where it is set, what wins and why, and what you can do with it."}</p>
    </div>`}
  </aside>`}const Tl=[{value:"tool",label:"By tool"},{value:"topic",label:"By topic"},{value:"files",label:"Files"},{value:"findings",label:"Findings"}],Wt=new Set(["tool","topic"]);function Se(){return typeof window<"u"?window.location.search:""}function El(){const[t,e]=C(()=>$e(Se())),s=R(a=>e(n=>{const l={...n,...a};if(a.view&&a.view!==n.view&&!(Wt.has(n.view)&&Wt.has(a.view)))for(const i of["tool","sec","row"])i in a||(l[i]="");if(a.view&&a.view!==n.view&&!("scope"in a)&&(l.scope=""),a.view&&a.view!==n.view)for(const i of Un)i in a||(l[i]=i==="recent"?!1:"");return l}),[]);return ht(()=>{de(Gn(t))},[t]),ht(()=>{const a=()=>e($e(Se()));return window.addEventListener("popstate",a),()=>{window.removeEventListener("popstate",a),de(Kn)}},[]),[t,s]}function Ll(){const[t,e]=C({status:"loading",files:null});return ht(()=>{let s=!0;return hn().then(a=>{s&&e(Array.isArray(a==null?void 0:a.files)?{status:"ready",files:a.files}:{status:"unavailable",files:null})},()=>{s&&e({status:"unavailable",files:null})}),()=>{s=!1}},[]),t}function Dl(t){const e=t||{},s=e.audit||null;return{status:e.loading?"loading":e.error?"error":s||e.loading===!1?"ready":"loading",audit:s,scan:e.scan||null,error:e.error?String(e.error):null}}function Pl({records:t=[]}){return o`<section class="st-wsnote" aria-label="Loaded configuration evidence">
    <h3>Configured on disk is not effective runtime configuration</h3>
    <${$n} records=${t}/>
  </section>`}function ql({source:t={},note:e=""}){var ie;const{toolConfigs:s,tools:a,monitor:n,root:l,enabledTools:i=null,recentFiles:c,toolName:p,openFile:h,findings:u,refresh:r,hooks:d,configuredOnly:k,runtimeConfiguration:y}=t,_=P(()=>jn({toolConfigs:s,tools:a,monitor:n,root:l,enabledTools:i}),[s,a,n,l,i]),[$,S]=El(),[A,st]=C(""),[L,nt]=C(!1),[T,At]=C(!1),[zt,b]=C(!1),E=xe(null),Tt=Ll(),H=Dl(u),Fs=u==null?void 0:u.rescan;ht(()=>{const m=v=>{var M;v.key==="/"&&!pn(v.target)&&!v.metaKey&&!v.ctrlKey&&!v.altKey?(v.preventDefault(),(M=E.current)==null||M.focus()):v.key==="Escape"&&b(!1)};return window.addEventListener("keydown",m),()=>window.removeEventListener("keydown",m)},[]);const x=P(()=>Fn(_),[_]),Y=P(()=>Rn(_),[_]),te=P(()=>qn(_),[_]),Et=P(()=>ue({q:A,nonDefault:L,risky:T,unset:$.unset}),[A,L,T,$.unset]),Rs=P(()=>ue({q:A,nonDefault:L,risky:T,unset:!0}),[A,L,T]),qs=R(m=>Et(m)&&(!$.scope||m.scope===$.scope),[Et,$.scope]),Is=P(()=>In(x),[x]),at=P(()=>Wn(Tt.files,x,te,i),[Tt.files,x,te,i]),ot=P(()=>un(H.audit,i),[H.audit,i]),Lt=P(()=>Vn((ot==null?void 0:ot.findings)||[]),[ot]),Ws=R((m,v=0)=>{!m||!h||h(m,v>0?v:0)},[h]),ee=R(m=>{S(m),b(!0)},[S]),Vs=R(()=>b(!1),[]),Bs=R(m=>{const v=Bn(m,_);return v===m&&p?p(m):v},[_,p]),Hs=R(m=>{var v;return((v=x.find(M=>M.id===m))==null?void 0:v.scopes)||[]},[x]),Us=R(m=>{const v=at.find(M=>ft(M.path,m));if(v!=null&&v.mtime)return v.mtime;for(const M of(_==null?void 0:_.tools)||[])for(const z of M.files||[])if(ft(z.path,m)&&z.mtime)return z.mtime;return null},[at,_]);if(!_)return o`<p class="loading-state">Loading...</p>`;if(!x.length&&!Y&&!re(i))return o`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;const Dt=x.some(m=>m.id===$.tool)||$.tool==="aictl"&&Y?$.tool:((ie=x[0])==null?void 0:ie.id)||(Y?"aictl":""),F=x.find(m=>m.id===Dt)||null,se=(m,v)=>{var M;return v&&((M=x.find(z=>z.id===m))==null?void 0:M.rows.find(z=>z.key===v))||null},Gs=$.view==="tool"?F?se(F.id,$.row):null:$.view==="topic"?se($.tool,$.row):null,Ks=$.view==="files"&&$.row&&at.find(m=>m.path===$.row)||null,ne=(m,v)=>{if(!String(v).startsWith(he))return null;const M=x.find(ct=>ct.id===m);if(!M)return null;const z=W(v);return M.envVars.find(ct=>ct.name===z)||{name:z,tool:M.id,uid:M.id+""+v,source:v,set:!1,value:"",masked:!1,in_process:!1,persisted:[],drives:[],label:z,description:"",section:"",documented:!1}},Js=$.view==="tool"?F?ne(F.id,$.row):null:$.view==="topic"?ne($.tool,$.row):null,ae=(m,v="")=>{var z;const M=x.some(ct=>ct.id===v)?v:(F==null?void 0:F.id)||((z=x[0])==null?void 0:z.id)||"";ee({view:Wt.has($.view)?$.view:"tool",tool:M,row:he+m})},Xs=(m,v=0)=>tt(m)?ae(W(m)):Ws(m,v),Ys=$.view==="findings"&&$.row&&Lt.find(m=>m.id===$.row)||null,D={st:$,set:S,select:ee,q:A,pass:Et,passAll:Rs,passTool:qs,showUnset:$.unset,scopesOf:Hs,managedAbsent:Is,entries:x,aictl:Y,toolId:Dt,files:at,filesStatus:Tt.status,findings:Lt,audit:ot,auditStatus:H.status,auditError:H.error,scan:H.scan,rescan:Fs,selected:Gs,selectedFile:Ks,selectedFinding:Ys,selectedEnv:Js,openAt:Xs,openEnv:ae,labelOf:Bs,mtimeOf:Us,recentFiles:c,drawer:zt,closeDrawer:Vs,refresh:r,hooks:d},{set:Zs,agents:Qs,knowsSet:oe,unset:tn,risky:le}=Hn(x),en=re(i)&&!x.some(m=>m.id!=="vscode");let lt,it;return $.view==="topic"?(lt=o`<${tl} w=${D}/>`,it=o`<${nl} w=${D}/>`):$.view==="files"?(lt=o`<${ll} w=${D}/>`,it=o`<${ml} w=${D}/>`):$.view==="findings"?(lt=o`<${yl} w=${D}/>`,it=o`<${gl} w=${D}/>`):(lt=o`<${Ho} w=${D}/>`,it=F?o`<${Zo} w=${D} entry=${F}/>`:Dt==="aictl"&&Y?o`<${Qo} w=${D} aictl=${Y}/>`:o`<section class="st-main"><p class="st-empty">No tool settings to show.</p></section>`),o`<div class="st-ws" data-view=${$.view}>
    <div class="st-head">
      <${Ya} class="st-pivot" options=${Tl} value=${$.view} ariaLabel="Settings view"
        onChange=${m=>S({view:m})}/>
      <label class="st-searchbox">
        <${mt} name="search" size="14"/>
        <input ref=${E} type="search" class="st-search" value=${A}
          placeholder="Find a setting, value, key or file…" aria-label="Find a setting, value, key or file"
          onInput=${m=>st(m.currentTarget.value)}/>
        <kbd class="st-kbd" aria-hidden="true">/</kbd>
      </label>
      <button type="button" class=${"st-toggle"+(L?" is-on":"")} aria-pressed=${L?"true":"false"}
        onClick=${()=>nt(!L)}>Only non-default</button>
      <button type="button" class=${"st-toggle st-toggle--risky"+(T?" is-on":"")} aria-pressed=${T?"true":"false"}
        onClick=${()=>At(!T)}>Only risky</button>
      ${oe&&o`<button type="button" class=${"st-toggle"+($.unset?" is-on":"")} aria-pressed=${$.unset?"true":"false"}
        onClick=${()=>S({unset:!$.unset})}>Show unset knobs</button>`}
      <div class="st-kpis" data-testid="st-kpis">
        <span><b>${x.length}</b> tools</span>
        <span><b>${at.length}</b> files</span>
        <span><b>${Zs}</b> settings</span>
        <span data-kpi="agents"><b>${Qs}</b> agents</span>
        ${oe&&o`<span data-kpi="unset"><b>${tn}</b> unset</span>`}
        <span class=${le?"st-red":""}><b>${le}</b> risky</span>
        <span><b>${H.status==="loading"&&!H.audit?"…":Lt.length}</b> findings</span>
      </div>
    </div>
    ${e&&o`<p class="st-wsnote" data-testid="st-wsnote">${e}</p>`}
    ${k?o`<${Pl} records=${y}/>`:null}
    ${en&&o`<div class="st-scope-empty"><${Za} enabledTools=${i} snap=${_} what="the settings"/></div>`}
    <div class="st-grid">
      <div class="st-col st-col--nav">${lt}</div>
      <div class="st-col st-col--main">${it}</div>
      <${zl} w=${D}/>
    </div>
  </div>`}export{Dl as auditState,ql as default};

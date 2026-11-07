import{E as Us,R as Gs,F as Mt,L as Ks,m as o,G as os,H as Zs,J as Js,d as _,K as Ys,M as st,O as Lt,Q as Bt,U as P,V as Qs,y as et,W as Xs,T as L,X as te,b as se,Y as Vt,Z as Ut,$ as ee}from"./index-hGMajQ-T.js";import{i as ne,D as Ct,a as ae,o as oe,b as V,c as bt,p as le,s as M,d as Et,e as ie,S as At,f as jt,t as ce,g as ls,h as is,P as re,G as cs,L as de,j as N,k as rs,l as Pt,m as pe,n as I,q as ue,r as he,u as ds,v as U,w as $e,x as Gt,y as nt,z as fe,A as ye,B as be,C as ps,E as us,F as hs,H as ke,I as at,J as me,K as ge,M as ve,N as _e,O as Kt,Q as we,R as xe,T as Se,U as Me,V as Ce,W as Ae,X as Oe,Y as Te,Z as Le,_ as Zt,$ as Ee,a0 as je,a1 as Pe}from"./model-Dfr6-VSl.js";/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $s=(...t)=>t.filter((s,e,a)=>!!s&&s.trim()!==""&&a.indexOf(s)===e).join(" ").trim();/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jt=t=>t.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fe=t=>t.replace(/^([A-Z])|[\s-_]+(\w)/g,(s,e,a)=>a?a.toUpperCase():e.toLowerCase());/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yt=t=>{const s=Fe(t);return s.charAt(0).toUpperCase()+s.slice(1)};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var Ne={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Re=Gs({size:24,color:"currentColor",strokeWidth:2,absoluteStrokeWidth:!1,class:""}),qe=()=>Us(Re);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ie=t=>{for(const s in t)if(s.startsWith("aria-")||s==="role"||s==="title")return!0;return!1};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ze=({color:t,size:s,strokeWidth:e,absoluteStrokeWidth:a,children:n,iconNode:l,class:i="",...d})=>{const{size:c=24,strokeWidth:u=2,absoluteStrokeWidth:r=!1,color:p="currentColor",class:h=""}=qe()??{},y=a??r?Number(e??u)*24/Number(s??c):e??u;return Mt("svg",{...Ne,width:s??c??24,height:s??c??24,stroke:t??p,"stroke-width":y,class:$s("lucide",h,i),...!n&&!Ie(d)&&{"aria-hidden":"true"},...d},[...l.map(([$,x])=>Mt($,x)),...Ks(n)])};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=(t,s)=>{const e=({class:a="",className:n="",children:l,...i})=>Mt(ze,{...i,iconNode:s,class:$s(`lucide-${Jt(Yt(t))}`,`lucide-${Jt(t)}`,a,n)},l);return e.displayName=Yt(t),e};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const De=f("activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const We=f("archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const He=f("banknote",[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Be=f("book-open",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ve=f("bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ue=f("brain-circuit",[["path",{d:"M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z",key:"l5xja"}],["path",{d:"M9 13a4.5 4.5 0 0 0 3-4",key:"10igwf"}],["path",{d:"M6.003 5.125A3 3 0 0 0 6.401 6.5",key:"105sqy"}],["path",{d:"M3.477 10.896a4 4 0 0 1 .585-.396",key:"ql3yin"}],["path",{d:"M6 18a4 4 0 0 1-1.967-.516",key:"2e4loj"}],["path",{d:"M12 13h4",key:"1ku699"}],["path",{d:"M12 18h6a2 2 0 0 1 2 2v1",key:"105ag5"}],["path",{d:"M12 8h8",key:"1lhi5i"}],["path",{d:"M16 8V5a2 2 0 0 1 2-2",key:"u6izg6"}],["circle",{cx:"16",cy:"13",r:".5",key:"ry7gng"}],["circle",{cx:"18",cy:"3",r:".5",key:"1aiba7"}],["circle",{cx:"20",cy:"21",r:".5",key:"yhc1fs"}],["circle",{cx:"20",cy:"8",r:".5",key:"1e43v0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ge=f("brain",[["path",{d:"M12 18V5",key:"adv99a"}],["path",{d:"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4",key:"1e3is1"}],["path",{d:"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5",key:"1gqd8o"}],["path",{d:"M17.997 5.125a4 4 0 0 1 2.526 5.77",key:"iwvgf7"}],["path",{d:"M18 18a4 4 0 0 0 2-7.464",key:"efp6ie"}],["path",{d:"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517",key:"1gq6am"}],["path",{d:"M6 18a4 4 0 0 1-2-7.464",key:"k1g0md"}],["path",{d:"M6.003 5.125a4 4 0 0 0-2.526 5.77",key:"q97ue3"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ke=f("chart-column",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ze=f("chart-line",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Je=f("chevron-down",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ye=f("chevron-right",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qe=f("clipboard-list",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xe=f("clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 6v6l4 2",key:"mmk7yg"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tn=f("coins",[["path",{d:"M13.744 17.736a6 6 0 1 1-7.48-7.48",key:"bq4yh3"}],["path",{d:"M15 6h1v4",key:"11y1tn"}],["path",{d:"m6.134 14.768.866-.5 2 3.464",key:"17snzx"}],["circle",{cx:"16",cy:"8",r:"6",key:"14bfc9"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sn=f("cpu",[["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M17 20v2",key:"1rnc9c"}],["path",{d:"M17 2v2",key:"11trls"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M2 17h2",key:"7oei6x"}],["path",{d:"M2 7h2",key:"asdhe0"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"M20 17h2",key:"1fpfkl"}],["path",{d:"M20 7h2",key:"1o8tra"}],["path",{d:"M7 20v2",key:"4gnj0m"}],["path",{d:"M7 2v2",key:"1i4yhu"}],["rect",{x:"4",y:"4",width:"16",height:"16",rx:"2",key:"1vbyd7"}],["rect",{x:"8",y:"8",width:"8",height:"8",rx:"1",key:"z9xiuo"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const en=f("eye-off",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nn=f("file-pen",[["path",{d:"M12.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v9.34",key:"o6klzx"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10.378 12.622a1 1 0 0 1 3 3.003L8.36 20.637a2 2 0 0 1-.854.506l-2.867.837a.5.5 0 0 1-.62-.62l.836-2.869a2 2 0 0 1 .506-.853z",key:"zhnas1"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const an=f("file-text",[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const on=f("folder",[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",key:"1kt360"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ln=f("funnel",[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cn=f("git-branch",[["path",{d:"M15 6a9 9 0 0 0-9 9V3",key:"1cii5b"}],["circle",{cx:"18",cy:"6",r:"3",key:"1h7g24"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rn=f("globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dn=f("grid-3x3",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M3 15h18",key:"5xshup"}],["path",{d:"M9 3v18",key:"fh3hqa"}],["path",{d:"M15 3v18",key:"14nvp0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pn=f("layout-dashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const un=f("layers",[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hn=f("lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $n=f("mail",[["path",{d:"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7",key:"132q7q"}],["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2",key:"izxlao"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fn=f("message-square",[["path",{d:"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",key:"18887p"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yn=f("moon",[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bn=f("package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kn=f("pen",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mn=f("plug",[["path",{d:"M12 22v-5",key:"1ega77"}],["path",{d:"M15 8V2",key:"18g5xt"}],["path",{d:"M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z",key:"1xoxul"}],["path",{d:"M9 8V2",key:"14iosj"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gn=f("radio",[["path",{d:"M16.247 7.761a6 6 0 0 1 0 8.478",key:"1fwjs5"}],["path",{d:"M19.075 4.933a10 10 0 0 1 0 14.134",key:"ehdyv1"}],["path",{d:"M4.925 19.067a10 10 0 0 1 0-14.134",key:"1q22gi"}],["path",{d:"M7.753 16.239a6 6 0 0 1 0-8.478",key:"r2q7qm"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vn=f("refresh-cw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _n=f("search",[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wn=f("server",[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xn=f("settings",[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sn=f("sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mn=f("triangle-alert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cn=f("user",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const An=f("users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const On=f("wallet",[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tn=f("webhook",[["path",{d:"M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2",key:"q3hayz"}],["path",{d:"m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06",key:"1go1hn"}],["path",{d:"m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8",key:"qlwsc0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ln=f("wrench",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",key:"1ngwbx"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const En=f("x",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jn=f("zap",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]),Pn={activity:De,"alert-triangle":Mn,filter:ln,"eye-off":en,archive:We,banknote:He,"bar-chart-3":Ke,"book-open":Be,bot:Ve,brain:Ge,"brain-circuit":Ue,"chevron-down":Je,"chevron-right":Ye,"clipboard-list":Qe,clock:Xe,coins:tn,cpu:sn,"file-pen":nn,"file-text":an,folder:on,"git-branch":cn,globe:rn,"grid-3x3":dn,layers:un,"layout-dashboard":pn,"line-chart":Ze,lock:hn,mail:$n,"message-square":fn,moon:yn,package:bn,pen:kn,plug:mn,radio:gn,"refresh-cw":vn,search:_n,server:wn,settings:xn,sun:Sn,user:Cn,users:An,wallet:On,webhook:Tn,wrench:Ln,x:En,zap:jn};function ot({name:t,size:s="1em",strokeWidth:e=2,...a}){if(!t)return null;const n=Pn[String(t)];return n?o`<${n} size=${s} strokeWidth=${e} aria-hidden="true" ...${a} />`:o`<span aria-hidden="true" ...${a}>${t}</span>`}function Fn({options:t=[],value:s,onChange:e,ariaLabel:a,class:n,className:l,...i}){const d=["aictl-ui-segmented",n,l].filter(Boolean).join(" "),c=os([]),u=r=>{var y;if(!t.length)return;const p=Math.max(0,t.findIndex($=>$.value===s));let h=null;r.key==="ArrowRight"||r.key==="ArrowDown"?h=(p+1)%t.length:r.key==="ArrowLeft"||r.key==="ArrowUp"?h=(p-1+t.length)%t.length:r.key==="Home"?h=0:r.key==="End"&&(h=t.length-1),h!=null&&(r.preventDefault(),e&&e(t[h].value),(y=c.current[h])==null||y.focus())};return o`<div
    class=${d}
    role="radiogroup"
    aria-label=${a||null}
    ...${i}
  >${t.map((r,p)=>{const h=r.value===s;return o`<button
      key=${r.value}
      ref=${y=>{c.current[p]=y}}
      type="button"
      class="aictl-ui-segmented__btn"
      role="radio"
      aria-checked=${h?"true":"false"}
      tabindex=${h?"0":"-1"}
      onClick=${()=>e&&e(r.value)}
      onKeyDown=${u}
    >${r.icon?o`<${ot} name=${r.icon} size="0.9em"/>`:null}${r.label}</button>`})}</div>`}function Nn({enabledTools:t,snap:s,what:e="this screen"}){const a=Zs(t),n=Js(t,s);return o`<div class="panel-state panel-state--empty" role="status" data-testid="tool-scope-empty">
    <${ot} name="filter" size="14"/>
    <div>
      <div class="panel-state__title">${a?"No tools are selected":"The selected tools have no data here"}</div>
      <div class="panel-state__hint">${a?`The tool filter in the header has no tool ticked, so ${e} shows nothing. Tick a tool, or choose All tools.`:`${n.join(", ")} ${n.length===1?"has":"have"} nothing to show on ${e}. Tick more tools in the header filter, or choose All tools.`}</div>
    </div>
  </div>`}function ut(t){return t==null?Ct:typeof t=="object"?JSON.stringify(t):String(t)}function Rn({value:t,compact:s}){const[e,a]=_(!1),n=Array.isArray(t),l=n?t.map((c,u)=>[u,c]):Object.entries(t||{}),i=l.length;if(!i)return o`<span class="st-none">none</span>`;const d=o`<span class="st-chip st-chip--mono st-items">${i} ${i===1?"item":"items"}</span>`;return s?d:o`<span class="st-itemsbox">
    ${d}
    <button type="button" class="st-link" aria-expanded=${e?"true":"false"}
      onClick=${c=>{c.stopPropagation(),a(!e)}}>${e?"hide":"show"}</button>
    ${e&&o`<ul class="st-itemlist">
      ${l.map(([c,u])=>o`<li key=${c} class="st-mono" title=${n?ut(u):`${c}: ${ut(u)}`}>
        ${n?ut(u):o`<span class="st-itemkey">${c}:</span> ${ut(u)}`}</li>`)}
    </ul>`}
  </span>`}function ft({row:t,value:s,compact:e=!1}){const a=s!==void 0?s:t.value,n=t.kind||ne(a),l=!!t.risky;if(n==="flag"||typeof a=="boolean"){if(a==null)return o`<span class="st-none">${Ct}</span>`;const c=ae(a);return o`<span class=${"st-flag"+(c?" is-on":"")+(l?" is-risky":"")}>
      <span class="st-switch" aria-hidden="true"></span><span class="st-flag__text">${c?"on":"off"}</span>
    </span>`}if(a==null||a==="")return o`<span class="st-none">${Ct}</span>`;if(n==="list"||n==="map"||typeof a=="object")return o`<${Rn} value=${a} compact=${e}/>`;const i=String(a),d=oe({...t,value:a});return d?o`<span class=${"st-select"+(l?" is-risky":"")} title=${"Options: "+d.join(", ")}>${i}</span>`:n==="path"?o`<span class="st-v st-path" title=${i}>${i}</span>`:o`<span class=${"st-v"+(l?" is-risky":"")} title=${i}>${i}</span>`}function G({scope:t,locked:s=!1,label:e=""}){const a=t||"default",n=o`<span class=${"st-chip st-scope st-scope--"+a.replace(/[^a-z-]/gi,"")+(s?" st-scope--locked":"")}
    title=${s?`Set by ${e||a}; cannot be changed here`:void 0}>${a}${s?o`<span class="st-sr"> (locked)</span>`:""}</span>`;return s?o`<span class="st-scopewrap"><${ct}/>${n}</span>`:n}function ct({label:t=""}){return t?o`<span class="st-lock" role="img" aria-label=${t} title=${t}><${ot} name="lock" size="11"/></span>`:o`<span class="st-lock" aria-hidden="true"><${ot} name="lock" size="11"/></span>`}function F({id:t,big:s=!1}){return o`<span class=${"st-sw"+(s?" st-sw--big":"")} aria-hidden="true"
    style=${{background:Ys[t]||"var(--st-fg2)"}}></span>`}function lt({label:t}){return o`<span class="st-dot" role="img" aria-label=${t} title=${t}></span>`}function E({children:t}){return o`<div class="st-nav__h">${t}</div>`}function z({id:t,label:s}){return o`<span class="st-chip st-toolchip"><${F} id=${t}/>${s}</span>`}function it({path:t,line:s,w:e}){if(!t)return o`<span class="st-none">—</span>`;const a=t+(s>0?":"+s:"");return o`<button type="button" class="st-src" title=${a}
    onClick=${n=>{n.stopPropagation(),e.openAt(t,s)}}>
    <b>${V(t)}</b>${s>0?":"+s:""}</button>`}const qn="aictl has no description for this key; the value is shown as found in the file";function fs(){return o`<span class="st-chip st-chip--muted st-undoc" title=${qn}>undocumented</span>`}const In=4;function zn(t,s){return`Set by ${M(t.scope,s.scopesOf(t.tool))}; cannot be changed here`}function ys({row:t,w:s}){const e=t.agent,a=bt(t);return o`<span class="st-agentmodel">
    ${t.locked&&o`<${ct} label=${zn(t,s)}/>`}
    ${a?o`<span class="st-inherit" title=${t.note||"Runs on the session model"}>inherits</span>`:o`<span class="st-v" title=${String(t.value)}>${String(t.value)}</span>`}
    ${e.model_policy==="required"&&o`<span class="st-badge" title="The agent file requires a model">required</span>`}
    ${le(t)&&o`<span class="st-badge st-badge--pin" title=${"A settings pin decides the model: "+e.pinned_in}>pinned</span>`}
  </span>`}function bs({tools:t,all:s=!1}){if(!t||!t.length)return o`<span class="st-none" title="The agent file lists no tools">—</span>`;const e=s?t:t.slice(0,In),a=t.length-e.length;return o`<span class="st-tools">
    ${e.map(n=>o`<span key=${n} class="st-chip st-chip--mono" title=${n}>${n}</span>`)}
    ${a>0&&o`<span class="st-chip st-more-tools" title=${t.slice(e.length).join(", ")}>+${a}</span>`}
  </span>`}function ks({row:t,w:s,withTool:e,withContext:a}){var c;const n=t.agent,l=((c=s.selected)==null?void 0:c.uid)===t.uid,i=()=>s.select({tool:t.tool,row:t.key}),d=u=>Number(u)>0?Number(u):0;return o`<tr class=${"st-row st-agentrow"+(l?" is-sel":"")} data-key=${t.key} data-tool=${t.tool}
    tabindex="0" onClick=${i}
    onKeyDown=${u=>{(u.key==="Enter"||u.key===" ")&&(u.preventDefault(),i())}}>
    ${e&&o`<td class="st-c-tool"><span class="st-matrix__toolname"><${F} id=${t.tool}/>${s.labelOf(t.tool)}</span></td>`}
    <td class="st-c-agent">
      <div class="st-label st-mono">${n.name||t.label}</div>
      ${n.description&&o`<div class="st-agentdesc" title=${n.description}>${n.description}</div>`}
    </td>
    <td class="st-c-model"><${ys} row=${t} w=${s}/></td>
    <td class="st-mono">${n.effort||o`<span class="st-none">—</span>`}</td>
    ${a&&o`<td class="st-mono">${n.context_tier||o`<span class="st-none">—</span>`}</td>`}
    <td><${bs} tools=${n.tools}/></td>
    <td class="st-c-src"><${it} path=${n.defined_in} line=${d(n.defined_line)} w=${s}/></td>
    <td class="st-c-src"><${it} path=${n.pinned_in} line=${d(n.pinned_line)} w=${s}/></td>
  </tr>`}function Dn({w:t,section:s}){const e=s.shown,a=e.filter(bt).length;return o`<table class="st-table st-agents" data-section="agents">
    <thead><tr>
      <th scope="col" class="st-c-agent">Agent</th><th scope="col">Model</th><th scope="col">Effort</th>
      <th scope="col">Context</th><th scope="col">Tools</th><th scope="col" class="st-c-src">Defined in</th>
      <th scope="col" class="st-c-src">Pinned in</th>
    </tr></thead>
    <tbody>
      <tr class="st-group"><th scope="colgroup" colspan="7">${s.title}
        <span class="st-group__meta">${e.length}${a?` · ${a} inherit the session model`:""}</span></th></tr>
      ${e.map(n=>o`<${ks} key=${n.uid} row=${n} w=${t} withContext/>`)}
    </tbody>
  </table>`}const Ot={tool:t=>(s,e)=>t.labelOf(s.tool).localeCompare(t.labelOf(e.tool))||ht(s).localeCompare(ht(e)),agent:t=>(s,e)=>ht(s).localeCompare(ht(e))||t.labelOf(s.tool).localeCompare(t.labelOf(e.tool)),model:t=>(s,e)=>Qt(s).localeCompare(Qt(e))||Ot.tool(t)(s,e)};function ht(t){var s;return String(((s=t.agent)==null?void 0:s.name)||t.label||"")}function Qt(t){return bt(t)?"￿":String(t.value)}function Wn(t,s,e){return[...t].sort((Ot[s]||Ot.tool)(e))}function xt({id:t,label:s,sort:e,onSort:a}){const n=e===t;return o`<th scope="col" aria-sort=${n?"ascending":"none"}>
    <button type="button" class=${"st-sort"+(n?" is-on":"")} onClick=${()=>a(t)}>
      ${s}<span aria-hidden="true">${n?" ▴":""}</span></button></th>`}function Hn({w:t,rows:s,sort:e,onSort:a}){const n=Wn(s,e,t);return o`<div class="st-scroll"><table class="st-table st-agents st-agents--all">
    <thead><tr>
      <${xt} id="tool" label="Tool" sort=${e} onSort=${a}/>
      <${xt} id="agent" label="Agent" sort=${e} onSort=${a}/>
      <${xt} id="model" label="Model" sort=${e} onSort=${a}/>
      <th scope="col">Effort</th><th scope="col">Tools</th>
      <th scope="col" class="st-c-src">Defined in</th><th scope="col" class="st-c-src">Pinned in</th>
    </tr></thead>
    <tbody>${n.map(l=>o`<${ks} key=${l.uid} row=${l} w=${t} withTool/>`)}</tbody>
  </table></div>`}const Ft=[{id:"mcp",label:"MCP"},{id:"read",label:"Read files"},{id:"write",label:"Write files"},{id:"shell",label:"Shell"},{id:"web",label:"Web"}],Bn={allowed:"allow",asks:"ask",denied:"deny"},Xt={denied:3,asks:2,allowed:1},B=(t,s,e="")=>Object.fromEntries(Ft.map(a=>[a.id,{state:t,why:s,key:e}]));function Vn(t){const s=String(t||"").split(".");return s[s.length-1]}function Un(t){const s=new Map;for(const e of(t==null?void 0:t.rows)||[])s.has(e.key)||s.set(e.key,e);return s}const v=t=>t&&t.value!==null&&t.value!==void 0&&t.value!==""?t.value:void 0,yt=t=>Array.isArray(t)?t.filter(s=>typeof s=="string"&&s):[];function Nt(t){const s=/^\s*([^()\s]+)\s*(?:\((.*)\))?\s*$/.exec(String(t));return s?{name:s[1].toLowerCase(),spec:s[2]===void 0?null:s[2].trim()}:{name:String(t).toLowerCase(),spec:null}}const ms=new Set(["","*",":*","**"]),Gn={read:["read","glob","grep","ls","notebookread"],write:["write","edit","multiedit","notebookedit"],shell:["bash","powershell"],web:["webfetch","websearch"]};function Kn(t){if(t==="mcp"||t.startsWith("mcp__"))return"mcp";for(const[s,e]of Object.entries(Gn))if(e.includes(t))return s;return""}function Zn(t,s){return t.startsWith("mcp__")?t==="mcp__*":s===null||ms.has(s)}function Jn(t,s){const e=[],a=(i,d,c,u)=>{const r={allow:"allowed",deny:"denied",ask:"asks"}[i],p=i+""+d,h=c?M(c,s):"",y=e.find(C=>C.id===p);if(y){h&&!y.where.includes(h)&&y.where.push(h);return}const{name:$,spec:x}=Nt(d);e.push({id:p,rule:d,effect:r,cap:Kn($),whole:Zn($,x),where:h?[h]:[],key:u})},n=(i,d,c)=>{if(!(!i||typeof i!="object"||Array.isArray(i)))for(const u of["allow","deny","ask"])for(const r of yt(i[u]))a(u,r,d,c)},l=t.get("permissions");if(l){const i=(l.chain||[]).filter(d=>d&&d.value&&typeof d.value=="object"&&d.set!==!1);if(i.length)for(const d of i)n(d.value,d.scope,"permissions");else n(v(l),l.scope,"permissions")}for(const i of["allow","deny","ask"]){const d=t.get("permissions."+i);for(const c of yt(v(d)))a(i,c,d.scope,d.key)}return e}const Yn={shell:"shell",write:"write",read:"read",url:"web",fetch:"web",web_fetch:"web"};function Qn(t){const s=[];for(const e of["allow","deny","ask"]){const a=t.get("permissions."+e);for(const n of yt(v(a))){const{name:l,spec:i}=Nt(n);s.push({rule:n,effect:{allow:"allowed",deny:"denied",ask:"asks"}[e],cap:Yn[l]||"mcp",whole:i===null||ms.has(i),where:a.scope?[M(a.scope)]:[],key:a.key})}}return s}function Xn(t){const s=[];for(const e of t.values()){const a=v(e);if(!a||typeof a!="object"||Array.isArray(a))continue;const n=e.key;let l="";if(/(^|\.)urls\.autoApprove$/.test(n)?l="web":/(^|\.)edits\.autoApprove$/.test(n)?l="write":(n==="autoApprove"||/(^|\.)terminal\.autoApprove$/.test(n))&&(l="shell"),!!l)for(const[i,d]of Object.entries(a)){let c;if(l==="web"?c=d===!0||(d==null?void 0:d.approveRequest)===!0?"allowed":"asks":l==="write"?c=d===!1?"asks":"allowed":d===!0||(d==null?void 0:d.approve)===!0?c="allowed":(d===!1||(d==null?void 0:d.approve)===!1)&&(c="denied"),!c)continue;const u=l==="write"?i==="**/*"||i==="**":!1;s.push({rule:i,effect:c,cap:l,whole:u,where:e.scope?[M(e.scope)]:[],key:n})}}return s}const ta={read:["read_file","read_many_files","glob","grep","search_file_content","list_directory","readfiletool","readmanyfilestool","globtool","greptool","lstool"],write:["write_file","replace","edit","writefiletool","edittool"],shell:["run_shell_command","shelltool"],web:["web_fetch","google_web_search","webfetchtool","websearchtool"]};function sa(t){var e;const s=[];for(const[a,n]of[["tools.allowed","allowed"],["tools.exclude","denied"]]){const l=t.get(a);for(const i of yt(v(l))){const{name:d,spec:c}=Nt(i);let u=((e=Object.entries(ta).find(([,r])=>r.includes(d)))==null?void 0:e[0])||"";!u&&d.includes("__")&&(u="mcp"),u&&s.push({rule:i,effect:n,cap:u,whole:c===null,where:l.scope?[M(l.scope)]:[],key:a})}}return s}function ea(t){const s=t.get("permissions.defaultMode"),e=v(s)??"default",a=s&&v(s)!==void 0?s.key:"",n=`default mode ${e}`;if(e==="bypassPermissions")return B("allowed",n+": no permission prompts",a);const l={mcp:{state:"asks",why:"Claude Code asks before an MCP tool runs",key:a},read:{state:"allowed",why:"Claude Code reads files without asking",key:a},write:{state:"asks",why:"Claude Code asks before it edits a file",key:a},shell:{state:"asks",why:"Claude Code asks before it runs a command",key:a},web:{state:"asks",why:"Claude Code asks before it fetches a URL",key:a}};if(e==="acceptEdits"&&(l.write={state:"allowed",why:n+": edits apply without asking",key:a}),e==="plan"&&(l.write={state:"denied",why:n+": read-only, no edits",key:a},l.shell={state:"denied",why:n+": read-only, no commands that change anything",key:a}),e==="dontAsk")for(const i of["mcp","write","shell","web"])l[i]={state:"denied",why:n+": anything not allowed by a rule is refused",key:a};return l}function na(t){const s=t.get("defaultPermissionMode"),e=v(s)??"manual",a=s&&v(s)!==void 0?s.key:"";if(e==="allow-all")return B("allowed","defaultPermissionMode allow-all: every tool call is allowed",a);const n=e==="assisted"?"asks; in assisted mode a model answers the request":"asks before it runs";return{mcp:{state:"asks",why:"an MCP tool "+n,key:a},read:{state:"allowed",why:"reads in trusted folders run without asking",key:a},write:{state:"asks",why:"a file write "+n,key:a},shell:{state:"asks",why:"a shell command "+n,key:a},web:{state:"asks",why:"a URL fetch "+n,key:a}}}function aa(t){for(const s of t.values()){const e=v(s);if((Vn(s.key)==="globalAutoApprove"||s.key==="chat.tools.global.autoApprove")&&e===!0)return B("allowed",s.label+" is on: every tool call runs without asking",s.key);if(s.key==="skipPermissions"&&e===!0)return B("allowed",s.label+" is on: no permission checks",s.key);if(s.key==="chat.permissions.default"&&["autoApprove","autopilot","bypass"].includes(e))return B("allowed",`chat.permissions.default ${e}: sessions start without approval prompts`,s.key)}return{mcp:{state:"asks",why:"VS Code asks before an MCP tool runs"},read:{state:"allowed",why:"VS Code reads workspace files without asking"},write:{state:"allowed",why:"VS Code applies edits in the workspace without asking"},shell:{state:"asks",why:"VS Code asks before a terminal command runs"},web:{state:"asks",why:"VS Code asks before it fetches a URL"}}}function oa(t){const s=t.get("approval_policy"),e=t.get("sandbox_mode"),a=v(t.get("sandbox_workspace_write.network_access"))===!0;let n=v(s);n&&typeof n=="object"&&(n="granular"),n=n||"on-request";const l=v(e)||"read-only",i=s&&v(s)!==void 0?s.key:"",d=e&&v(e)!==void 0?e.key:"",c=`approval_policy ${n}${v(s)===void 0?" (not set)":""}`,u=`sandbox_mode ${l}${v(e)===void 0?" (not set)":""}`,r=n==="never",p=l==="danger-full-access",h=p?{state:"allowed",why:u+": no sandbox"}:l==="workspace-write"?{state:"allowed",why:u+": writes in the workspace run without asking"}:r?{state:"denied",why:`${u}, ${c}: no writes and no way to ask`}:{state:"asks",why:`${u}: a write needs your approval`},y=r?{state:"allowed",why:c+": commands never ask"}:n==="untrusted"?{state:"asks",why:c+": commands outside the trusted set ask"}:{state:"allowed",why:`${c}: commands run in the sandbox (${l}) and ask to leave it`},$=p||l==="workspace-write"&&a?{state:"allowed",why:p?u+": network open":"sandbox_workspace_write.network_access is on"}:r?{state:"denied",why:`${u}, ${c}: no network and no way to ask`}:{state:"asks",why:`${u}: network access needs your approval`};return{mcp:{state:r?"allowed":"asks",why:r?c+": MCP tools never ask":c+": MCP tool calls ask",key:i},read:{state:"allowed",why:u+": reads are allowed",key:d},write:{...h,key:d||i},shell:{...y,key:i||d},web:{...$,key:d||i}}}function la(t){const s=t.get("general.defaultApprovalMode")||t.get("approvalMode")||t.get("approval_mode")||t.get("general.approvalMode"),e=v(s)??"default",a=s&&v(s)!==void 0?s.key:"",n="approval mode "+e;if(e==="yolo")return B("allowed",n+": every tool call runs without asking",a);const l={mcp:{state:"asks",why:n+": MCP tools ask",key:a},read:{state:"allowed",why:"reads run without asking",key:a},write:{state:"asks",why:n+": edits ask",key:a},shell:{state:"asks",why:n+": shell commands ask",key:a},web:{state:"asks",why:n+": web fetches ask",key:a}};return e==="auto_edit"&&(l.write={state:"allowed",why:n+": edits run without asking",key:a}),e==="plan"&&(l.write={state:"denied",why:n+": read-only",key:a},l.shell={state:"denied",why:n+": read-only",key:a}),l}const X=(t,s)=>[...t.keys()].some(e=>s.test(e)),ia=[{id:"claude",tools:["claude-code"],applies:t=>X(t,/^permissions(\.(allow|deny|ask|defaultMode))?$/),base:ea,rules:Jn,wholeName:"the whole tool"},{id:"copilot-cli",tools:["copilot-cli","copilot-desktop"],applies:t=>X(t,/^(defaultPermissionMode|savedToolApprovals|permissions\.(allow|deny|ask))$/),base:na,rules:Qn,notes:t=>{const s=v(t.get("savedToolApprovals"));if(!s||typeof s!="object")return[];const e=Object.values(s).reduce((n,l)=>n+(Number(l)||0),0),a=Object.keys(s).length;return e?[`${e} saved tool ${e===1?"approval":"approvals"} in ${a} ${a===1?"folder":"folders"} (permissions-config.json)`]:[]}},{id:"vscode",tools:["vscode","copilot"],applies:t=>X(t,/(autoApprove|^chat\.permissions\.default$|^skipPermissions$)/i),base:aa,rules:Xn},{id:"codex",tools:["codex-cli","codex"],applies:t=>X(t,/^(approval_policy|sandbox_mode)$/),base:oa,rules:()=>[]},{id:"gemini",tools:["gemini-cli","gemini"],applies:t=>X(t,/(^|\.)(defaultApprovalMode|approvalMode|approval_mode)$|^tools\.(allowed|exclude)$/),base:la,rules:sa}];function ca(t,s){return t==="mixed"?`mixed (${s} ${s===1?"rule":"rules"})`:t}function ts(t){return`${Bn[t.effect]} ${t.rule}${t.where.length?" ("+t.where.join(", ")+")":""}`}function ra(t,s,e){var p;const a=e.filter(h=>h.cap===t.id),n=a.filter(h=>h.whole);let l=s.state,i=s.why;if(n.length){const h=n.reduce((y,$)=>Xt[$.effect]>Xt[y.effect]?$:y);l=h.effect,i="rule "+ts(h)}const d=a.some(h=>!h.whole&&h.effect!==l),c=d?"mixed":l,u=ca(c,a.length),r=[`${t.label}: ${u}`];return!a.length||!n.length?r.push("Without a rule: "+s.state+" ("+s.why+")"):r.push((d?"For the whole tool: ":"Decided by: ")+l+" ("+i+")"),a.length&&r.push(...a.map(h=>"• "+ts(h))),{cap:t.id,label:t.label,state:c,text:u,title:r.join(`
`),rules:a.map(h=>({rule:h.rule,effect:h.effect,where:h.where})),key:((p=a[0])==null?void 0:p.key)||s.key||""}}function gs(t){if(!t)return null;const s=ia.find(l=>l.tools.includes(t.id));if(!s)return null;const e=Un(t);if(!s.applies(e))return null;const a=s.base(e),n=s.rules(e,t.scopes||[]);return{tool:t.id,cells:Ft.map(l=>ra(l,a[l.id],n)),notes:s.notes?s.notes(e):[]}}function da(t){return(t||[]).map(s=>({entry:s,perms:gs(s)})).filter(s=>s.perms)}const pa=["project","project-local"],ua=new Set(["permissions","permissions.allow","permissions.deny","permissions.ask","project_permissions"]),Tt="Editing this file is not supported yet";function ha(t){return!!t&&t.tool==="claude-code"&&ua.has(t.key)}function $a(t){var s,e;return((e=(s=t==null?void 0:t.chain)==null?void 0:s[t.wins])==null?void 0:e.scope)||(t==null?void 0:t.scope)||"default"}function fa(t,s=[]){var l;const e=(l=t==null?void 0:t.chain)==null?void 0:l[t.wins];if(t!=null&&t.locked||Et(e,s))return{ok:!1,hint:"Locked by "+M(t.locked?t.scope:e.scope,s)};if(!ha(t))return{ok:!1,hint:Tt};const a=$a(t);if(!pa.includes(a))return{ok:!1,hint:`${Tt}: the value comes from ${M(a,s)}. Project and Project local permissions can be changed here.`};const n=(s||[]).find(i=>i.id===a);return{ok:!0,scope:a,label:M(a,s),path:e&&e.source||(n==null?void 0:n.path)||""}}const ya=t=>(t||[]).join(`
`),ba=t=>String(t||"").split(`
`).map(s=>s.trim()).filter(Boolean);function ka(t,s){const e=new Set(t||[]),a=new Set(s||[]);return{added:[...a].filter(n=>!e.has(n)),removed:[...e].filter(n=>!a.has(n))}}function vs({cell:t,onPick:s}){const e=t.key&&s?()=>s(t.key):null;return o`<td class=${"st-perm st-perm--"+t.state} data-cap=${t.cap} data-state=${t.state} title=${t.title}>
    ${e?o`<button type="button" class="st-perm__btn" aria-label=${`${t.label}: ${t.text}`} onClick=${e}>${t.text}</button>`:o`<span class="st-perm__text">${t.text}</span>`}
  </td>`}function _s({first:t=""}){return o`<thead><tr>
    ${t&&o`<th scope="col">${t}</th>`}
    ${Ft.map(s=>o`<th scope="col" key=${s.id} data-cap=${s.id}>${s.label}</th>`)}
  </tr></thead>`}function ma({w:t,entry:s,perms:e}){const a=n=>t.select({tool:s.id,row:n});return o`<div class="st-perms" data-testid="st-perms" data-tool=${s.id}>
    <table class="st-permtable">
      <caption class="st-perms__cap">What the agent can do without asking</caption>
      <${_s}/>
      <tbody><tr>${e.cells.map(n=>o`<${vs} key=${n.cap} cell=${n} onPick=${a}/>`)}</tr></tbody>
    </table>
    ${e.notes.map((n,l)=>o`<p key=${l} class="st-hint st-perms__note">${n}</p>`)}
  </div>`}function ga({w:t,mats:s}){return s.length?o`<div class="st-perms st-perms--topic" data-testid="st-perms-topic">
    <div class="st-scroll"><table class="st-permtable">
      <caption class="st-perms__cap">What each tool's agent can do without asking</caption>
      <${_s} first="Tool"/>
      <tbody>
        ${s.map(({entry:e,perms:a})=>o`<tr key=${e.id} data-tool=${e.id}>
          <th scope="row" class="st-perms__tool"><span class="st-matrix__toolname"><${F} id=${e.id}/>${e.label}</span></th>
          ${a.cells.map(n=>o`<${vs} key=${n.cap} cell=${n} onPick=${l=>t.select({tool:e.id,row:l})}/>`)}
        </tr>`)}
      </tbody>
    </table></div>
    ${s.flatMap(({entry:e,perms:a})=>a.notes.map((n,l)=>o`<p key=${e.id+l} class="st-hint st-perms__note">${e.label}: ${n}</p>`))}
  </div>`:null}const va={copilot:"copilot-vscode",vscode:"copilot-vscode"};function _a(t,s){const e=t==null?void 0:t.tools;return!e||typeof e!="object"?null:e[s]||e[va[s]]||null}function wa(t){return{active:"active",configured:"configured",disabled:"host-disabled",misconfigured:"wrong port",observed:"observed",missing:"missing"}[t]||t||"unknown"}function xa(t){const s=(t==null?void 0:t.message)||"";return s.includes("~/.copilot/hooks")?'"chat.hookFilesLocations": { "~/.copilot/hooks": true }':s.includes(".github/hooks")?'"chat.hookFilesLocations": { ".github/hooks": true }':s.includes("chat.useHooks")?'"chat.useHooks": true':""}const Sa={active:"is-ok",configured:"is-ok",disabled:"is-warn",misconfigured:"is-warn",missing:"is-warn"};function Ma({status:t}){const s=t.configured_events||[],e=t.missing_events||[],a=t.sources||[],n=t.warnings||[];return o`<div class="st-hookstat" data-testid="st-hookstat">
    <div class="st-hookstat__head">
      <span class=${"st-status "+(Sa[t.status]||"")} data-testid="st-hookstat-status"
        title=${t.status==="misconfigured"?"The hook commands post to a different port than this dashboard":void 0}>${wa(t.status)}</span>
      <span>${t.configured_count||s.length} configured</span>
      ${e.length>0&&o`<span class="st-warn" title=${e.join(", ")}>${e.length} missing: ${e.join(", ")}</span>`}
      <span>${t.fired_24h||0} fired in 24 h</span>
      <span title=${t.last_fire_ts?new Date(t.last_fire_ts*1e3).toLocaleString():void 0}>last ${t.last_fire_ts?st(t.last_fire_ts):"never"}</span>
    </div>
    <div class="st-tools st-hookstat__events">
      ${s.length?s.map(l=>o`<span key=${l} class="st-chip st-chip--mono st-hookstat__ev">${l}</span>`):o`<span class="st-dim">No aictl hooks configured</span>`}
    </div>
    ${a.length>0&&o`<ul class="st-hookstat__sources">
      ${a.map(l=>o`<li key=${l.path} title=${l.path}>
        <span class="st-mono">${l.scope}</span>
        <span>${l.configured_count||0} ${l.configured_count===1?"event":"events"}</span>
        <span class=${l.host_enabled===!1?"st-warn":"st-dim"}>${l.host_enabled===!1?"ignored by the host":"loaded"}</span>
      </li>`)}
    </ul>`}
    ${n.map(l=>{const i=xa(l);return o`<div key=${(l.path||"")+l.message} class="st-hookstat__warn" role="note">
        ${l.message}${i&&o`<code class="st-hookstat__snippet">${i}</code>`}
      </div>`})}
  </div>`}function Ca(t,s){const e=V(t);if(s.filter(l=>V(l)===e).length<2)return e;const a=String(t).split(/[\\/]/).filter(Boolean);return a.length<2?e:(/^(Users|home)$/.test(a[0])&&a.length===4?"~/":"")+a[a.length-2]+"/"+e}function Aa({w:t}){const{entries:s,aictl:e,st:a}=t;return o`<nav class="st-nav" aria-label="Tools">
    <${E}>Tools</${E}>
    <ul class="st-nav__list">
      ${s.map(n=>{const l=n.id===t.toolId,i=n.rows.filter(l?t.passTool:t.pass),d=i.some(c=>c.risky);return o`<li key=${n.id}>
          <button type="button" class=${"st-nav__item"+(l?" is-on":"")+(i.length?"":" is-empty")}
            aria-current=${l?"true":void 0} data-tool=${n.id}
            onClick=${()=>t.set({tool:n.id,sec:"",row:"",scope:l?t.st.scope:""})}>
            <${F} id=${n.id}/><span class="st-nav__label">${n.label}</span>
            ${d&&o`<${lt} label="A risky setting is on"/>`}
            <span class="st-nav__n">${i.length}</span>
          </button>
          ${l&&o`<ul class="st-nav__subs">
            ${n.sections.map(c=>{const u=c.rows.filter(t.passTool),r=a.sec===c.id,p=c.id==="agents"?ie(u):"";return o`<li key=${c.id}><button type="button" class=${"st-nav__sub"+(r?" is-on":"")}
                aria-current=${r?"true":void 0}
                onClick=${()=>t.set({sec:r?"":c.id})}>
                <span class="st-nav__label">${c.title}</span>
                ${u.some(h=>h.risky)&&o`<${lt} label="A risky setting is on"/>`}
                <span class="st-nav__n">${u.length}</span>
                ${p&&o`<span class="st-nav__model" title=${"Every agent runs on "+p}>${p}</span>`}
              </button></li>`})}
          </ul>`}
        </li>`})}
      ${e&&o`<li key="aictl">
        <button type="button" class=${"st-nav__item"+(t.toolId==="aictl"?" is-on":"")}
          aria-current=${t.toolId==="aictl"?"true":void 0} data-tool="aictl"
          onClick=${()=>t.set({tool:"aictl",sec:"",row:"",scope:""})}>
          <${F} id="aictl"/><span class="st-nav__label">aictl</span>
          <span class="st-nav__n">${e.collectors.length}</span>
        </button>
      </li>`}
    </ul>
  </nav>`}function Oa({row:t,w:s,scopes:e}){var l;const a=((l=s.selected)==null?void 0:l.uid)===t.uid,n=()=>s.select({tool:t.tool,row:t.key});return o`<tr class=${"st-row"+(t.risky?" st-row--risky":"")+(t.unset?" st-row--unset":"")+(a?" is-sel":"")}
    data-key=${t.key} tabindex="0" onClick=${n}
    onKeyDown=${i=>{(i.key==="Enter"||i.key===" ")&&(i.preventDefault(),n())}}>
    <td class="st-c-set">
      <div class="st-label">${t.label}${t.undocumented&&o` <${fs}/>`}</div>
      ${t.risky&&t.tip&&o`<div class="st-risknote">${t.tip}</div>`}
    </td>
    <td class="st-c-val"><${ft} row=${t}/></td>
    <td class="st-c-scope"><${G} scope=${t.scope} locked=${t.locked} label=${M(t.scope,e)}/></td>
    <td class="st-c-src"><${it} path=${t.source} line=${t.line} w=${s}/></td>
    <td class="st-c-what" title=${t.tip||void 0}>${t.tip}</td>
  </tr>`}function Ta({w:t,entry:s}){const e=s.scopes||[];if(!e.length)return null;const a=s.rows.filter(t.pass);return o`<div class="st-scopes" data-testid="st-scopes">
    <ol class="st-scopes__list" aria-label="Configuration layers, lowest precedence first">
      ${e.map((n,l)=>{const i=a.filter(r=>r.scope===n.id).length,d=t.st.scope===n.id,c=n.path?V(n.path):"",u=[n.label,n.paths.length?n.paths.join(`
`):"",n.exists?"":"not present",n.note,n.changeable?"":"Locked: cannot be changed from this machine"].filter(Boolean).join(`
`);return o`<li key=${n.id} class="st-scopes__item">
          ${l>0&&o`<span class="st-scopes__arrow" aria-hidden="true">→</span>`}
          <button type="button" class=${"st-scopechip"+(d?" is-on":"")+(n.changeable?"":" is-locked")+(n.exists?"":" is-absent")}
            data-scope=${n.id} aria-pressed=${d?"true":"false"} title=${u}
            onClick=${()=>t.set({scope:d?"":n.id})}>
            <span class="st-scopechip__top">
              ${!n.changeable&&o`<${ct}/><span class="st-sr">Locked: </span>`}
              <span class="st-scopechip__label">${n.label}</span>
              <span class="st-scopechip__n">${i}<span class="st-sr"> ${i===1?"setting wins":"settings win"} here</span></span>
            </span>
            <span class="st-scopechip__file">${n.exists?c||n.note:"not present"}</span>
          </button>
        </li>`})}
    </ol>
    <p class="st-hint st-scopes__legend">Later layers override earlier ones. Locked layers cannot be changed from this machine.</p>
  </div>`}function ss({children:t,section:s}){return o`<tr class="st-extra" data-extra=${s}><td colspan="5">${t}</td></tr>`}function La({w:t,sections:s,scopes:e,extras:a={}}){return o`<table class="st-table">
    <thead><tr>
      <th scope="col" class="st-c-set">Setting</th><th scope="col" class="st-c-val">Value</th>
      <th scope="col" class="st-c-scope">Scope</th><th scope="col" class="st-c-src">Set in</th>
      <th scope="col">What it does</th>
    </tr></thead>
    ${s.map(n=>{const l=n.shown.filter(i=>i.risky).length;return o`<tbody key=${n.id} data-section=${n.id}>
        <tr class="st-group"><th scope="colgroup" colspan="5">${n.title}
          <span class="st-group__meta">${n.shown.length}${l?o` · <span class="st-red">${l} risky</span>`:""}${n.hidden?o` · <span class="st-unsetn">+${n.hidden} unset</span>`:""}</span></th></tr>
        ${a[n.id]&&o`<${ss} section=${n.id}>${a[n.id]}</${ss}>`}
        ${n.shown.map(i=>o`<${Oa} key=${i.uid} row=${i} w=${t} scopes=${e}/>`)}
      </tbody>`})}
  </table>`}function Ea(t){const s=[];for(const e of t){const a=e.id==="agents"&&e.shown.every(l=>l.kind==="agent"&&l.agent),n=s[s.length-1];a?s.push({agents:!0,sections:[e]}):n&&!n.agents?n.sections.push(e):s.push({agents:!1,sections:[e]})}return s}function ja({w:t,entry:s}){const e=s.sections.filter(c=>!t.st.sec||c.id===t.st.sec).map(c=>({...c,shown:c.rows.filter(t.passTool),hidden:t.showUnset?0:c.rows.filter(u=>u.unset&&t.passAll(u)&&(!t.st.scope||u.scope===t.st.scope)).length})).filter(c=>c.shown.length||c.hidden),a=s.rows.length,n=gs(s),l=_a(t.hooks,s.id),i={autonomy:n&&o`<${ma} w=${t} entry=${s} perms=${n}/>`,hooks:l&&o`<${Ma} status=${l}/>`},d=t.st.scope?M(t.st.scope,s.scopes):"";return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${F} id=${s.id} big/>
      <h2 class="st-bar__title" id="st-main-title">${s.label}</h2>
      <span class="st-bar__sub">${a} ${a===1?"setting":"settings"} in ${s.files.length} ${s.files.length===1?"file":"files"}${s.risky?o` · <span class="st-red">${s.risky} risky</span>`:""}</span>
      <span class="st-bar__files">
        ${s.files.map(c=>o`<button type="button" key=${c} class="st-chip st-chip--mono st-chip--btn" title=${c}
          onClick=${()=>t.openAt(c)}>${Ca(c,s.files)}</button>`)}
      </span>
    </div>
    ${s.id==="vscode"&&o`<p class="st-note">chat.* settings, used by every AI tool in VS Code</p>`}
    ${s.hints.map((c,u)=>o`<p key=${u} class="st-note">${c}</p>`)}
    <${Ta} w=${t} entry=${s}/>
    ${e.length?Ea(e).map((c,u)=>c.agents?o`<${Dn} key=${"a"+u} w=${t} section=${c.sections[0]}/>`:o`<${La} key=${"g"+u} w=${t} sections=${c.sections} scopes=${s.scopes} extras=${i}/>`):o`<p class="st-empty">${a?d?`No setting shown here is set at the ${d} layer.`:"No setting matches the search or the toggles.":"No settings were read for this tool."}</p>`}
  </section>`}function Pa({w:t,aictl:s}){const e=t.q.trim().toLowerCase(),a=s.collectors.filter(l=>!e||[l.name,l.mode,l.status,l.detail].join(" ").toLowerCase().includes(e)),n=s.roots.filter(l=>!e||l.toLowerCase().includes(e));return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${F} id="aictl" big/>
      <h2 class="st-bar__title" id="st-main-title">aictl</h2>
      <span class="st-bar__sub">monitoring engine · ${s.collectors.length} collectors · ${s.roots.length} monitored roots</span>
    </div>
    ${a.length>0&&o`<table class="st-table">
      <thead><tr><th scope="col" class="st-c-set">Collector</th><th scope="col">Mode</th><th scope="col">Status</th><th scope="col">Detail</th></tr></thead>
      <tbody>
        <tr class="st-group"><th scope="colgroup" colspan="4">Collectors<span class="st-group__meta">${a.length}</span></th></tr>
        ${a.map(l=>o`<tr key=${l.name} class="st-row st-row--static">
          <td class="st-c-set st-mono">${l.name}</td>
          <td class="st-mono">${l.mode||"—"}</td>
          <td><span class=${"st-status "+(l.status==="active"?"is-ok":"is-warn")}>${l.status}</span></td>
          <td class="st-c-what" title=${l.detail||void 0}>${l.detail}</td>
        </tr>`)}
      </tbody>
    </table>`}
    ${n.length>0&&o`<h3 class="st-subhead">Monitored roots</h3>
      <ul class="st-roots">${n.map((l,i)=>o`<li key=${i} class="st-mono" title=${l}>${l}</li>`)}</ul>`}
    ${!a.length&&!n.length&&o`<p class="st-empty">Nothing matches the search.</p>`}
  </section>`}function ws(t){if(t.st.sec&&At.includes(t.st.sec))return t.st.sec;const s=e=>t.entries.some(a=>a.rows.some(n=>n.sec===e));return s("autonomy")?"autonomy":At.find(s)||"autonomy"}function Fa({w:t}){const s=ws(t);return o`<nav class="st-nav" aria-label="Topics">
    <${E}>Topics</${E}>
    <ul class="st-nav__list">
      ${At.map(e=>{const a=t.entries.filter(i=>i.rows.some(d=>d.sec===e&&t.pass(d))),n=a.some(i=>i.rows.some(d=>d.sec===e&&d.risky&&t.pass(d))),l=e===s;return o`<li key=${e}><button type="button" class=${"st-nav__item"+(l?" is-on":"")+(a.length?"":" is-empty")}
          aria-current=${l?"true":void 0} data-sec=${e}
          onClick=${()=>t.set({sec:e})}>
          <span class="st-nav__label">${jt[e]}</span>
          ${n&&o`<${lt} label="A risky setting is on"/>`}
          <span class="st-nav__n">${a.length} ${a.length===1?"tool":"tools"}</span>
        </button></li>`})}
    </ul>
  </nav>`}function Na({w:t}){const[s,e]=_("tool"),a=t.entries.flatMap(d=>d.rows.filter(c=>c.sec==="agents"&&is(c))),n=a.filter(t.pass),l=new Set(n.map(d=>d.tool)).size,i=n.filter(bt).length;return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${jt.agents}</h2>
      <span class="st-bar__sub" data-testid="st-agents-count">${n.length} ${n.length===1?"agent":"agents"} in ${l} ${l===1?"tool":"tools"}, ${i} inherit the session model</span>
    </div>
    ${n.length?o`<${Hn} w=${t} rows=${n} sort=${s} onSort=${e}/>
      <p class="st-hint">Click an agent for its model decision, its tools and the files that define it.</p>`:o`<p class="st-empty">${a.length?"No agent matches the search or the toggles.":"No tool reports agents."}</p>`}
  </section>`}function Ra({w:t}){const s=ws(t);if(s==="agents")return o`<${Na} w=${t}/>`;const{tools:e,rows:a}=ce(t.entries,s,t.pass),n=a.reduce((i,d)=>i+Object.values(d.cells).filter(c=>c.risky).length,0),l=s==="autonomy"?da(t.entries):[];return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${jt[s]}</h2>
      <span class="st-bar__sub">every tool, side by side${n?o` · <span class="st-red">${n} risky ${n===1?"value":"values"}</span>`:""}</span>
    </div>
    <${ga} w=${t} mats=${l}/>
    ${a.length?o`<div class="st-scroll"><table class="st-table st-matrix">
      <thead><tr>
        <th scope="col" class="st-c-set">Setting</th>
        ${e.map(i=>o`<th scope="col" key=${i.id} class="st-matrix__tool" data-tool=${i.id}>
          <span class="st-matrix__toolname"><${F} id=${i.id}/>${i.label}</span></th>`)}
      </tr></thead>
      <tbody>
        ${a.map(i=>o`<tr key=${i.id} class="st-row st-row--static">
          <th scope="row" class="st-c-set" title=${i.keys.join(`
`)}>${i.label}</th>
          ${e.map(d=>{var r;const c=i.cells[d.id];if(!c||c.unset&&!t.showUnset)return o`<td key=${d.id} class="st-cell st-cell--none">—</td>`;const u=((r=t.selected)==null?void 0:r.uid)===c.uid;return o`<td key=${d.id} class=${"st-cell"+(c.risky?" is-risky":"")+(c.unset?" is-unset":"")+(u?" is-sel":"")}>
              <button type="button" class="st-cellbtn" data-key=${c.key}
                aria-label=${`${i.label}, ${d.label}: ${ls(c.value)}${c.unset?" (not set, default)":""}`}
                onClick=${()=>t.select({tool:d.id,row:c.key})}>
                <${ft} row=${c} compact/>
              </button>
            </td>`})}
        </tr>`)}
      </tbody>
    </table></div>
    <p class="st-hint">A cell is one setting in one tool. Click it for the file, the scope and the override chain.</p>`:o`<p class="st-empty">${e.length?"No setting matches the search or the toggles.":"No tool has settings in this section."}</p>`}
  </section>`}const qa=8,xs=86400,$t=8;function Rt(t){const s=t.cell?t.cell.split(":"):null;return{loc:I(t.sec),tools:I(t.tool),purpose:I(t.purpose),scope:I(t.fscope),git:I(t.git),recent:!!t.recent,cell:s&&s.length===2?s:null}}function Ia(t,s,e,a){return!(e!=="loc"&&s.loc.length&&!s.loc.includes(t.location)||e!=="tools"&&s.tools.length&&!t.tools.some(n=>s.tools.includes(n))||e!=="purpose"&&s.purpose.length&&!s.purpose.includes(N(t))||e!=="scope"&&s.scope.length&&!s.scope.includes(t.scope)||e!=="git"&&s.git.length&&!s.git.includes(Pt(t))||e!=="recent"&&s.recent&&!(t.mtime&&t.mtime>=a-xs)||e!=="cell"&&s.cell&&(N(t)!==s.cell[0]||t.location!==s.cell[1]))}function kt(t,s=null,e=Date.now()/1e3){const a=Rt(t.st);return t.files.filter(n=>pe(n,t.q)&&Ia(n,a,s,e))}function H(t,s,e){const a=I(t.st[s]);t.set({[s]:ye(a.includes(e)?a.filter(n=>n!==e):[...a,e]),row:""})}function tt({w:t,title:s,fkey:e,skip:a,options:n,valueOf:l,attr:i,swatch:d}){const c=kt(t,a),u=I(t.st[e]),r=n.map(p=>({...p,n:c.filter(h=>l(h).includes(p.id)).length})).filter(p=>p.n||u.includes(p.id)||p.always);return r.length?o`<${E}>${s}</${E}>
    <ul class="st-nav__list" aria-label=${s}>
      ${r.map(p=>{const h=u.includes(p.id);return o`<li key=${p.id}><button type="button" class=${"st-nav__item"+(h?" is-on":"")+(p.n?"":" is-empty")}
          aria-pressed=${h?"true":"false"} ...${{[i]:p.id}} onClick=${()=>H(t,e,p.id)}>
          ${d?o`<${F} id=${p.id}/>`:null}<span class="st-nav__label">${p.label}</span><span class="st-nav__n">${p.n}</span></button></li>`})}
    </ul>`:null}function za({w:t}){const s=[...new Set(t.files.flatMap(n=>n.tools))],e=[...new Set(t.files.map(n=>n.scope).filter(Boolean))],a=kt(t,"recent").filter(n=>n.mtime&&n.mtime>=Date.now()/1e3-xs).length;return o`<nav class="st-nav" aria-label="File filters">
    <${tt} w=${t} title="Locations" fkey="sec" skip="loc" attr="data-loc" options=${de.map(n=>({...n,always:!0}))} valueOf=${n=>[n.location]}/>
    <${tt} w=${t} title="Purpose" fkey="purpose" skip="purpose" attr="data-purpose" options=${re} valueOf=${n=>[N(n)]}/>
    <${tt} w=${t} title="Read by" fkey="tool" skip="tools" attr="data-tool" swatch=${!0}
      options=${s.map(n=>({id:n,label:t.labelOf(n)}))} valueOf=${n=>n.tools}/>
    <${tt} w=${t} title="Scope" fkey="fscope" skip="scope" attr="data-scope"
      options=${e.map(n=>({id:n,label:rs[n]||n}))} valueOf=${n=>[n.scope]}/>
    <${tt} w=${t} title="Git" fkey="git" skip="git" attr="data-git" options=${cs} valueOf=${n=>[Pt(n)]}/>
    <${E}>Changes</${E}>
    <ul class="st-nav__list">
      <li><button type="button" class=${"st-nav__item"+(t.st.recent?" is-on":"")} aria-pressed=${t.st.recent?"true":"false"}
        data-recent="1" onClick=${()=>t.set({recent:!t.st.recent,row:""})}>
        <span class="st-nav__label">Changed in the last 24 h</span><span class="st-nav__n">${a}</span></button></li>
    </ul>
  </nav>`}function Da({w:t}){const s=Rt(t.st),e=[...s.loc.map(a=>({k:"sec:"+a,label:"Location: "+(Gt[a]||a),drop:()=>H(t,"sec",a)})),...s.purpose.map(a=>({k:"purpose:"+a,label:"Purpose: "+(nt[a]||a),drop:()=>H(t,"purpose",a)})),...s.tools.map(a=>({k:"tool:"+a,label:"Read by: "+t.labelOf(a),drop:()=>H(t,"tool",a)})),...s.scope.map(a=>({k:"fscope:"+a,label:"Scope: "+(rs[a]||a),drop:()=>H(t,"fscope",a)})),...s.git.map(a=>{var n;return{k:"git:"+a,label:"Git: "+(((n=cs.find(l=>l.id===a))==null?void 0:n.label)||a),drop:()=>H(t,"git",a)}}),...s.recent?[{k:"recent",label:"Changed in the last 24 h",drop:()=>t.set({recent:!1,row:""})}]:[],...s.cell?[{k:"cell",label:(nt[s.cell[0]]||s.cell[0])+" in "+(Gt[s.cell[1]]||s.cell[1]),drop:()=>t.set({cell:"",row:""})}]:[]];return e.length?o`<div class="st-fchips" data-testid="st-file-chips">
    ${e.map(a=>o`<button key=${a.k} type="button" class="st-chip st-chip--btn" data-chip=${a.k}
      aria-label=${"Remove the filter "+a.label} onClick=${a.drop}>${a.label} <span aria-hidden="true">×</span></button>`)}
    <button type="button" class="st-link" onClick=${()=>t.set({sec:"",tool:"",purpose:"",fscope:"",git:"",recent:!1,cell:"",row:""})}>Clear filters</button>
  </div>`:null}function Wa({w:t}){const s=$e(kt(t,"cell").filter(e=>!e.is_dir));return s.rows.length?o`<div class="st-scroll"><table class="st-table st-fmatrix" data-testid="st-file-matrix">
    <caption class="st-sr">Files by purpose and location</caption>
    <thead><tr><th scope="col">Purpose</th>${s.cols.map(e=>o`<th key=${e.id} scope="col" class="st-num">${e.label}</th>`)}<th scope="col" class="st-num">All</th></tr></thead>
    <tbody>${s.rows.map(e=>o`<tr key=${e.id}>
      <th scope="row">${e.label}</th>
      ${s.cols.map(a=>{const n=e.cells[a.id]||0,l=e.id+":"+a.id,i=t.st.cell===l;return o`<td key=${a.id} class=${"st-cell st-num"+(i?" is-sel":"")}>${n?o`<button type="button" class="st-cellbtn" data-cell=${l} aria-pressed=${i?"true":"false"}
              aria-label=${n+" "+e.label+" "+(n===1?"file":"files")+" in "+a.label}
              onClick=${()=>t.set({cell:i?"":l,row:""})}>${n}</button>`:o`<span class="st-dim" aria-hidden="true">·</span>`}</td>`})}
      <td class="st-num st-dim">${e.total}</td>
    </tr>`)}</tbody>
  </table></div>`:null}function Ha({f:t,w:s}){const e=s.selectedFile&&s.selectedFile.path===t.path,a=()=>s.select({row:t.path}),n=be(t);return o`<tr class=${"st-row"+(e?" is-sel":"")+(t.exists===!1?" is-missing":"")}
    data-path=${t.path} tabindex="0" onClick=${a}
    onKeyDown=${l=>{(l.key==="Enter"||l.key===" ")&&(l.preventDefault(),a())}}>
    <td class="st-c-file">
      ${t.is_dir?o`<span class="st-fname" title=${t.path}>${t.name}/</span>`:o`<button type="button" class="st-fname st-link" title=${"Open "+t.path}
            onClick=${l=>{l.stopPropagation(),s.openAt(t.path)}}>${t.name}</button>`}
      ${t.exists===!1&&o`<span class="st-hint"> missing</span>`}
    </td>
    <td><span class="st-chip" data-kind=${N(t)}>${t.is_dir?"Folder":nt[N(t)]}</span></td>
    <td><${G} scope=${t.scope}/></td>
    <td><span class="st-tools">${t.tools.map(l=>o`<${z} key=${l} id=${l} label=${s.labelOf(l)}/>`)}</span></td>
    <td class="st-mono st-num">${t.settings?t.settings:"—"}</td>
    <td class="st-mono st-num">${!t.is_dir&&t.bytes!=null?Lt(t.bytes):"—"}</td>
    <td class=${n?"st-warn":"st-dim"} data-git=${Pt(t)||void 0}
      title=${n?"A tool always loads this file, and git does not track it":void 0}>${t.git_state||"—"}</td>
    <td class="st-dim">${t.mtime?st(t.mtime):"—"}</td>
  </tr>`}function Ba(t){const s=Rt(t.st);if(s.loc.length||s.purpose.length||s.scope.length||s.git.length||s.recent||s.cell)return[];const e=t.q.trim().toLowerCase();return(t.managedAbsent||[]).filter(a=>(!e||[a.path,a.label,a.note].join(`
`).toLowerCase().includes(e))&&(!s.tools.length||a.tools.some(n=>s.tools.includes(n))))}function Va({w:t,items:s}){const[e,a]=_(!1);return o`<tbody class="st-absent" data-root="managed-absent">
    <tr class="st-group"><th scope="colgroup" colspan=${$t}>
      <button type="button" class="st-fold" aria-expanded=${e?"true":"false"} onClick=${()=>a(!e)}>
        <span aria-hidden="true">${e?"▾":"▸"}</span><span>Managed locations (not present)</span></button>
      <span class="st-group__meta">${s.length} ${s.length===1?"location":"locations"} · where a policy would come from</span>
    </th></tr>
    ${e&&s.map(n=>o`<tr key=${n.path} class="st-row st-row--static st-row--absent" data-path=${n.path}>
      <td class="st-c-file"><span class="st-fname" title=${n.path+(n.note?`
`+n.note:"")}>${U(n.path)}</span>
        <span class="st-hint"> not present</span></td>
      <td class="st-dim">—</td>
      <td><span class="st-scopewrap"><${ct} label="Cannot be changed from this machine"/><${G} scope=${n.scope}/></span></td>
      <td><span class="st-tools">${n.tools.map(l=>o`<${z} key=${l} id=${l} label=${t.labelOf(l)}/>`)}</span></td>
      <td class="st-mono st-num">—</td><td class="st-mono st-num">—</td><td class="st-dim">—</td><td class="st-dim">—</td>
    </tr>`)}
  </tbody>`}function Ua(t,s){const e=t.filter(l=>!l.is_dir),a=t.filter(l=>l.is_dir),n=s==="purpose"?ue(e).map(l=>({key:"purpose:"+l.id,attrs:{"data-purpose":l.id},title:l.label,mono:!1,root:null,files:l.files})):he(e).map(l=>({key:l.root,attrs:{"data-root":l.root},title:U(l.root),full:l.root,mono:!0,root:l.root,sub:ds[l.location]||"Other",files:l.files}));return a.length&&n.push({key:"watched",attrs:{"data-root":"watched"},title:"Watched folders",mono:!1,root:null,flat:!0,sub:"folders the monitor reads",files:a}),n}function Ga({g:t,w:s,open:e,setOpen:a,shut:n,setShut:l}){const i=!!n[t.key],d=[...new Set(t.files.flatMap(r=>r.tools))],c=t.files.reduce((r,p)=>r+(p.is_dir?0:Number(p.bytes)||0),0),u=t.flat?[{dir:"",files:t.files}]:fe(t.files);return t.root&&u.sort((r,p)=>(p.dir===t.root)-(r.dir===t.root)),o`<tbody ...${t.attrs}>
    <tr class="st-group"><th scope="colgroup" colspan=${$t}>
      <button type="button" class="st-fold" aria-expanded=${i?"false":"true"}
        onClick=${()=>l({...n,[t.key]:!i})}>
        <span aria-hidden="true">${i?"▸":"▾"}</span>
        <span class=${t.mono?"st-mono":""} title=${t.full||void 0}>${t.title}</span></button>
      <span class="st-group__meta">${t.sub?t.sub+" · ":""}${t.files.length} ${t.files.length===1?"file":"files"}${c?" · "+Lt(c):""}</span>
      ${d.length>0&&o`<span class="st-tools st-group__tools">${d.map(r=>o`<${z} key=${r} id=${r} label=${s.labelOf(r)}/>`)}</span>`}
    </th></tr>
    ${!i&&u.map(r=>{const p=t.key+"|"+r.dir,h=e[p]?r.files:r.files.slice(0,qa),y=r.files.length-h.length;return o`<${Bt} key=${p}>
        ${r.dir&&r.dir!==t.root&&o`<tr class="st-folder" data-dir=${r.dir}><td colspan=${$t}>
          <span class="st-mono st-path" title=${r.dir}>${U(r.dir)}</span><span class="st-dim"> · ${r.files.length}</span></td></tr>`}
        ${h.map($=>o`<${Ha} key=${$.path} f=${$} w=${s}/>`)}
        ${y>0&&o`<tr class="st-morerow"><td colspan=${$t}>
          <button type="button" class="st-link st-more" onClick=${()=>a({...e,[p]:!0})}>▸ ${y} more</button>
        </td></tr>`}
      </${Bt}>`})}
  </tbody>`}const Ka=[{value:"location",label:"By location"},{value:"purpose",label:"By purpose"}];function Za({w:t}){const[s,e]=_({}),[a,n]=_({}),l=kt(t),i=t.st.group==="purpose"?"purpose":"location",d=Ua(l,i),c=Ba(t);return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Files aictl reads</h2>
      <span class="st-bar__sub">${l.length} ${l.length===1?"file":"files"} · grouped by ${i==="purpose"?"what they are for":"where they live"}</span>
      <div class="st-seg st-bar__end" role="group" aria-label="Group the files">
        ${Ka.map(u=>o`<button key=${u.value} type="button" class="st-seg__btn" aria-pressed=${i===u.value?"true":"false"}
          onClick=${()=>t.set({group:u.value})}>${u.label}</button>`)}
      </div>
    </div>
    ${t.filesStatus!=="ready"&&o`<p class="st-note" role="status">File details are loading</p>`}
    <${Wa} w=${t}/>
    <${Da} w=${t}/>
    ${d.length||c.length?o`<div class="st-scroll"><table class="st-table st-files">
      <thead><tr>
        <th scope="col" class="st-c-file">File</th><th scope="col">Purpose</th><th scope="col">Scope</th><th scope="col">Read by</th>
        <th scope="col" class="st-num">Settings</th><th scope="col" class="st-num">Size</th><th scope="col">Git</th><th scope="col">Last change</th>
      </tr></thead>
      ${d.map(u=>o`<${Ga} key=${u.key} g=${u} w=${t} open=${s} setOpen=${e} shut=${a} setShut=${n}/>`)}
      ${c.length>0&&o`<${Va} w=${t} items=${c}/>`}
    </table></div>`:o`<p class="st-empty">${t.files.length?"No file matches the search or the filters.":"No settings files were found."}</p>`}
  </section>`}const Ja=5;function Ss(t,s){return t?U(t)+(s>0?":"+s:""):"—"}function Ya({w:t}){const s=ps(t.findings.filter(e=>us(e,t.q)));return o`<nav class="st-nav" aria-label="Finding rules">
    <${E}>Finding rules</${E}>
    <ul class="st-nav__list">
      <li><button type="button" class=${"st-nav__item"+(t.st.sec?"":" is-on")} aria-current=${t.st.sec?void 0:"true"}
        onClick=${()=>t.set({sec:"",row:""})}>
        <span class="st-dotspace" aria-hidden="true"></span><span class="st-nav__label">All rules</span>
        <span class="st-nav__n">${s.reduce((e,a)=>e+a.count,0)}</span></button></li>
      ${s.map(e=>{const a=t.st.sec===e.rule;return o`<li key=${e.rule}><button type="button" class=${"st-nav__item"+(a?" is-on":"")}
          aria-current=${a?"true":void 0} data-rule=${e.rule}
          onClick=${()=>t.set({sec:a?"":e.rule,row:""})}>
          ${e.alarm?o`<${lt} label=${e.severity+" severity"}/>`:o`<span class="st-dotspace" aria-hidden="true"></span>`}
          <span class="st-nav__label">${e.label}</span><span class="st-nav__n">${e.count}</span></button></li>`})}
    </ul>
  </nav>`}function Qa({f:t,group:s,w:e}){const a=e.selectedFinding&&e.selectedFinding.id===t.id,n=()=>e.select({row:t.id,sec:e.st.sec}),l=s.why&&t.why===s.why?t.action||"":t.why||t.action||"",i=hs(t).map(e.labelOf).join(", ")||(t.session_id?"session "+t.session_id:"—");return o`<tr class=${"st-row"+(a?" is-sel":"")+(t.severity==="high"||t.severity==="medium"?" st-row--risky":"")}
    data-id=${t.id} tabindex="0" onClick=${n}
    onKeyDown=${d=>{(d.key==="Enter"||d.key===" ")&&(d.preventDefault(),n())}}>
    <td class="st-c-tool">${i}</td>
    <td class="st-c-where st-mono" title=${t.path?t.path+(t.line>0?":"+t.line:""):void 0}>
      ${Ss(t.path,t.line)}${t.count>1?o` <span class="st-dim">×${t.count}</span>`:""}</td>
    <td class="st-c-what" title=${[t.why,t.action].filter(Boolean).join(`
`)||void 0}>${l}</td>
    <td class="st-c-act">${t.path&&o`<button type="button" class="st-chip st-chip--btn"
      onClick=${d=>{d.stopPropagation(),e.openAt(t.path,t.line)}}>Show the line</button>`}</td>
  </tr>`}function Xa({w:t}){var u,r;const[s,e]=_({});if(t.auditStatus==="loading"&&!t.audit){const p=t.scan;return o`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note" role="status" aria-busy="true" data-state="scanning">Scanning context sources…${p?" "+(p.step||"")+(p.elapsed_s!=null?", "+Math.round(p.elapsed_s)+" s":""):""}</p>
    </section>`}if(t.auditStatus==="error"&&!t.audit)return o`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note st-red" role="alert">The context audit failed: ${t.auditError}
        ${t.rescan&&o` <button type="button" class="st-btn" onClick=${()=>t.rescan()}>Retry</button>`}</p>
    </section>`;const a=t.findings.filter(p=>us(p,t.q)),n=ps(a).filter(p=>!t.st.sec||p.rule===t.st.sec),l=n.reduce((p,h)=>p+h.count,0),i=t.auditStatus==="loading",d=((u=t.audit)==null?void 0:u.incomplete)||[],c=((r=t.audit)==null?void 0:r.failed_steps)||[];return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Findings</h2>
      <span class="st-bar__sub">${l} in ${n.length} ${n.length===1?"rule":"rules"} · hidden changes, conflicts and settings outside this project</span>
      ${t.rescan&&o`<button type="button" class="st-chip st-chip--btn st-bar__end" disabled=${i}
        onClick=${()=>t.rescan()}>${i?"Scanning…":"Rescan"}</button>`}
    </div>
    ${i&&o`<p class="st-note" role="status" data-state="rescanning">Scanning again…${t.scan?" "+(t.scan.step||"")+(t.scan.elapsed_s!=null?", "+Math.round(t.scan.elapsed_s)+" s":""):""} The last results stay until it ends.</p>`}
    ${t.auditStatus==="error"&&o`<p class="st-note st-red" role="alert">The last scan failed: ${t.auditError}. These are the earlier results.</p>`}
    ${d.length>0&&o`<p class="st-note st-warn">The scan reached its time limit and skipped: ${d.join(", ")}.</p>`}
    ${c.length>0&&o`<p class="st-note st-warn">The scan could not read: ${c.map(p=>p.step+" ("+p.error+")").join(", ")}.</p>`}
    ${n.length?o`<table class="st-table st-findings">
      <thead><tr>
        <th scope="col" class="st-c-tool">Tool</th><th scope="col" class="st-c-where">Where</th>
        <th scope="col">What it does</th><th scope="col" class="st-c-act"><span class="st-sr">Action</span></th>
      </tr></thead>
      ${n.map(p=>{const y=!!s[p.rule]?p.items:p.items.slice(0,Ja),$=p.items.length-y.length;return o`<tbody key=${p.rule} data-rule=${p.rule}>
          <tr class="st-group"><th scope="colgroup" colspan="4">
            ${p.alarm&&o`<${lt} label=${p.severity+" severity"}/>`} ${p.label}
            <span class="st-group__meta">${p.count} · ${p.tools.map(t.labelOf).join(", ")||"no tool"}${p.why?" · "+p.why:""}</span>
          </th></tr>
          ${y.map(x=>o`<${Qa} key=${x.id} f=${x} group=${p} w=${t}/>`)}
          ${$>0&&o`<tr class="st-morerow"><td colspan="4">
            <button type="button" class="st-link st-more" onClick=${()=>e({...s,[p.rule]:!0})}>▸ ${$} more</button>
          </td></tr>`}
        </tbody>`})}
    </table>`:o`<p class="st-empty">${t.findings.length?"No finding matches the search.":"No findings for the selected tools."}</p>`}
  </section>`}const q=[{id:"allow",label:"Allow",hint:"run without asking"},{id:"deny",label:"Deny",hint:"always refused"},{id:"ask",label:"Ask",hint:"always ask first"}];function es(t){return String((t==null?void 0:t.message)||t||"").replace(/^HTTP \d+ \S+: /,"")||"The request failed"}const St=t=>Object.fromEntries(q.map(s=>{var e;return[s.id,ya((e=t==null?void 0:t.permissions)==null?void 0:e[s.id])]}));function to({title:t,diff:s}){const e=s.added.length||s.removed.length;return o`<div class="st-diff" data-bucket=${t}>
    <span class="st-diff__name">${t}</span>
    <span class="st-diff__chips">
      ${e?o`${s.added.map(a=>o`<code key=${"a"+a} class="st-diff__chip is-added">+ ${a}</code>`)}
          ${s.removed.map(a=>o`<code key=${"r"+a} class="st-diff__chip is-removed">- ${a}</code>`)}`:o`<span class="st-dim">no change</span>`}
    </span>
  </div>`}function so({tool:t,target:s,refresh:e,onClose:a}){const[n,l]=_(null),[i,d]=_(()=>St(null)),[c,u]=_(!0),[r,p]=_(!1),[h,y]=_(null),[$,x]=_(null),C=P(()=>{let b=!0;return u(!0),y(null),Qs(t,s.scope).then(w=>{b&&(l(w),d(St(w)),u(!1))},w=>{b&&(y({message:es(w),conflict:!0}),u(!1))}),()=>{b=!1}},[t,s.scope]);et(()=>C(),[C]);const D=Object.fromEntries(q.map(b=>[b.id,ba(i[b.id])])),O=Object.fromEntries(q.map(b=>{var w;return[b.id,((w=n==null?void 0:n.permissions)==null?void 0:w[b.id])||[]]})),mt=Object.fromEntries(q.map(b=>[b.id,ka(O[b.id],D[b.id])])),j=q.some(b=>JSON.stringify(O[b.id])!==JSON.stringify(D[b.id])),gt=JSON.stringify({permissions:D},null,2),rt=(n==null?void 0:n.path)||s.path,K=()=>{p(!0),y(null),x(null),Xs(t,{scope:s.scope,expected_mtime:(n==null?void 0:n.mtime)??null,permissions:D}).then(b=>{l(b),d(St(b)),x({backup:(b==null?void 0:b.backup_path)||""}),p(!1),typeof e=="function"&&e()},b=>{y({message:es(b),conflict:(b==null?void 0:b.status)===409}),p(!1)})},dt=()=>{x(null),C()};return o`<section class="st-insp__sec st-editor" data-testid="st-perm-editor" aria-label="Edit permissions">
    <h4 class="st-insp__h">Edit permissions · ${s.label}</h4>
    <p class="st-hint st-editor__target" data-testid="st-editor-target">
      Writes <span class="st-mono" title=${rt}>${rt}</span> (${s.label})${n&&!n.exists?", a new file":""}
    </p>
    ${h&&o`<div class="st-editor__error" role="alert" data-testid="st-editor-error">
      <span>${h.message}</span>
      ${h.conflict&&o`<button type="button" class="st-btn" onClick=${dt}>Reload</button>`}
    </div>`}
    ${$&&o`<div class="st-editor__saved" role="status" data-testid="st-editor-saved">
      ${$.backup?o`Saved. Backup: <span class="st-mono" title=${$.backup}>${$.backup}</span>`:"Saved. The file was new, so there is no backup."}
    </div>`}
    ${c?o`<p class="st-hint">Loading the file…</p>`:n&&o`
      <div class="st-editor__fields">
        ${q.map(b=>o`<label key=${b.id} class="st-editor__field">
          <span class="st-editor__label">${b.label} <span class="st-dim">· ${b.hint}, one rule per line</span></span>
          <textarea class="st-editor__area" data-bucket=${b.id} rows="4" spellcheck="false" value=${i[b.id]}
            onInput=${w=>d({...i,[b.id]:w.currentTarget.value})}></textarea>
        </label>`)}
      </div>
      <div class="st-editor__diff" data-testid="st-editor-diff">
        <div class="st-insp__h">Pending diff</div>
        ${q.map(b=>o`<${to} key=${b.id} title=${b.id} diff=${mt[b.id]}/>`)}
      </div>
      <pre class="st-editor__json" data-testid="st-editor-json">${gt}</pre>`}
    <div class="st-actions">
      <button type="button" class="st-btn st-btn--primary" onClick=${K} disabled=${c||r||!n||!j}>${r?"Saving…":"Save"}</button>
      <button type="button" class="st-btn" onClick=${a}>Cancel</button>
    </div>
  </section>`}function m({title:t,children:s}){return o`<section class="st-insp__sec"><h4 class="st-insp__h">${t}</h4>${s}</section>`}function qt(t,s){return"Open "+V(t)+(s>0?" at line "+s:"")}function Ms(t,s){return s?t.findings.filter(e=>at(e.path,s)):[]}function Cs(t,s){t.set({view:"findings",sec:s.rule||"",row:s.id,tool:""})}function As({w:t,path:s}){const e=s&&t.recentFiles&&typeof t.recentFiles.get=="function"?t.recentFiles.get(s):null,a=s?t.mtimeOf(s):null,n=[];return e?n.push(`File changed ${st(e.ts)}${e.tool?" by "+t.labelOf(e.tool):""} (file history)`):a&&n.push(`File last changed ${st(a)} (file history)`),o`<div class="st-hint" data-testid="st-history">${n.length?n.join(" · ")+" · no aictl change recorded":"No aictl change recorded"}</div>`}function eo(t,s){var a;const e=(a=t.chain)==null?void 0:a[t.wins];return t.locked||Et(e,s)?"Locked by "+M(t.locked?t.scope:e.scope,s):Tt}function no(t,s){const e=_e(s);return`Not set in any file. Default: ${ls(t.value)}.`+(e?` Set it in ${U(e.path)} (${e.label}).`:"")}function ao({w:t,row:s}){const e=t.scopesOf(s.tool),a=t.entries.filter(p=>p.id!==s.tool&&s.source&&p.files.some(h=>at(h,s.source))).map(p=>p.label),n=s.source?t.files.find(p=>at(p.path,s.source)):null;for(const p of(n==null?void 0:n.tools)||[]){const h=t.labelOf(p);p!==s.tool&&!a.includes(h)&&a.push(h)}const l=Ms(t,s.source),{chain:i,wins:d}=s,c=fa(s,e),[u,r]=_(!1);return o`<div class="st-insp__body" data-testid="st-inspector-row">
    <h3 class="st-insp__title">${s.label}</h3>
    <div class="st-insp__key st-mono">${s.key}</div>
    ${s.tip&&o`<p class="st-insp__tip">${s.tip}</p>`}
    <div class="st-insp__chips">
      ${s.risky&&o`<span class="st-chip st-chip--risky">risky</span>`}
      <${z} id=${s.tool} label=${t.labelOf(s.tool)}/>
      <${G} scope=${s.scope} locked=${s.locked} label=${M(s.scope,e)}/>
      ${s.undocumented&&o`<${fs}/>`}
      ${a.length>0&&o`<span class="st-chip">also read by ${a.join(", ")}</span>`}
    </div>
    <div class=${"st-insp__value"+(s.unset?" is-unset":"")}><${ft} row=${s}/></div>
    ${s.unset&&o`<p class="st-insp__tip" data-testid="st-unset-text">${no(s,e)}</p>`}
    <${m} title="Override chain · what wins and why">
      <ol class="st-chain">
        ${i.map((p,h)=>{const y=h===d,$=Et(p,e);return o`<li key=${h} class=${"st-chain__lv"+(y?" is-win":"")+($?" is-locked":"")} aria-current=${y?"true":void 0}>
            <span class="st-chain__sc">${$&&o`<${ct} label=${"Locked: "+M(p.scope,e)+" cannot be changed here"}/>`}${p.scope||"default"}</span>
            <span class="st-chain__v">${me(p)?o`<span class="st-dim">not set</span>`:o`<${ft} row=${s} value=${p.value} compact/>`}</span>
            <span class="st-chain__src">${p.source?o`<${it} path=${p.source} line=${Number(p.line)>0?Number(p.line):0} w=${t}/>`:o`<span class="st-dim">${p.note||(p.scope==="default"?t.labelOf(s.tool):"—")}</span>`}</span>
            ${y&&o`<span class="st-sr"> (wins)</span>`}
          </li>`})}
      </ol>
      <p class="st-hint st-insp__why">${ge(i,d)}</p>
    </${m}>
    <${m} title="History"><${As} w=${t} path=${s.source}/></${m}>
    <${m} title="Actions">
      <div class="st-actions">
        ${s.source&&o`<button type="button" class="st-btn" onClick=${()=>t.openAt(s.source,s.line)}>${qt(s.source,s.line)}</button>`}
        ${l.length>0&&o`<button type="button" class="st-btn" onClick=${()=>Cs(t,l[0])}>Show finding</button>`}
      </div>
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled=${!c.ok||u}
          aria-expanded=${c.ok?u?"true":"false":void 0}
          onClick=${()=>r(!0)}>Change value…</button>
        <span class="st-hint" data-testid="st-change-hint">${c.ok?`Edits ${U(c.path)||"the "+c.label+" file"} (${c.label})`:c.hint}</span>
      </div>
    </${m}>
    ${u&&o`<${so} tool=${s.tool} target=${c} refresh=${t.refresh}
      onClose=${()=>r(!1)}/>`}
  </div>`}function oo({w:t,row:s}){const e=s.agent,a=t.scopesOf(s.tool),{steps:n,wins:l,why:i}=ke(s),d=r=>Number(r)>0?Number(r):0,c=[{label:"Defined in",path:e.defined_in,line:d(e.defined_line),scope:e.scope_defined},{label:"Pinned in",path:e.pinned_in,line:d(e.pinned_line),scope:e.scope_pinned}],u=eo(s,a);return o`<div class="st-insp__body" data-testid="st-inspector-agent">
    <h3 class="st-insp__title">${e.name||s.label}</h3>
    <div class="st-insp__key st-mono">${s.key}</div>
    ${e.description&&o`<p class="st-insp__tip">${e.description}</p>`}
    <div class="st-insp__chips">
      <${z} id=${s.tool} label=${t.labelOf(s.tool)}/>
      <${G} scope=${s.scope} locked=${s.locked} label=${M(s.scope,a)}/>
    </div>
    <div class="st-insp__value"><${ys} row=${s} w=${t}/></div>
    <${m} title="Model · what decides it">
      <ol class="st-chain">
        ${n.map((r,p)=>{const h=p===l;return o`<li key=${r.id} class=${"st-chain__lv"+(h?" is-win":"")} aria-current=${h?"true":void 0}>
            <span class="st-chain__sc">${r.label}</span>
            <span class="st-chain__v">${r.value===void 0||r.value===null||r.value===""?o`<span class="st-dim">${r.id==="pin"&&r.present?"set":"not set"}</span>`:r.value==="inherits"?o`<span class="st-inherit">inherits</span>`:o`<span class="st-v">${String(r.value)}</span>`}</span>
            <span class="st-chain__src">${r.source?o`<${it} path=${r.source} line=${r.line} w=${t}/>`:o`<span class="st-dim">${r.id==="effective"?l===2?"session model":"":"—"}</span>`}</span>
            ${h&&o`<span class="st-sr"> (wins)</span>`}
          </li>`})}
      </ol>
      <p class="st-hint st-insp__why">${i}</p>
    </${m}>
    <${m} title="Agent">
      <dl class="st-insp__dl">
        <dt>Effort</dt><dd>${e.effort||"—"}</dd>
        <dt>Context</dt><dd>${e.context_tier||"—"}</dd>
        <dt>Target</dt><dd>${e.target||"—"}</dd>
        <dt>Model policy</dt><dd>${e.model_policy||"—"}</dd>
      </dl>
    </${m}>
    <${m} title=${"Tools"+(e.tools.length?" · "+e.tools.length:"")}><${bs} tools=${e.tools} all/></${m}>
    <${m} title="Files">
      <dl class="st-insp__dl st-insp__files">
        ${c.map(r=>o`<dt key=${r.label+"t"}>${r.label}</dt><dd key=${r.label+"d"}>
          ${r.path?o`<span class="st-mono" title=${r.path+(r.line?":"+r.line:"")}>${V(r.path)}${r.line?":"+r.line:""}</span>
            ${r.scope&&o` <span class="st-dim">· ${M(r.scope,a)}</span>`}
            <button type="button" class="st-link" onClick=${()=>t.openAt(r.path,r.line)}
              aria-label=${qt(r.path,r.line)}>Open</button>`:o`<span class="st-dim">—</span>`}
        </dd>`)}
      </dl>
    </${m}>
    <${m} title="History"><${As} w=${t} path=${e.defined_in||s.source}/></${m}>
    <${m} title="Actions">
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled>Change model…</button>
        <span class="st-hint" data-testid="st-change-hint">${u}</span>
      </div>
    </${m}>
  </div>`}function lo({w:t,file:s}){const e=Ms(t,s.path),a=s.rows||[];return o`<div class="st-insp__body" data-testid="st-inspector-file">
    <h3 class="st-insp__title">${s.name}</h3>
    <div class="st-insp__key st-mono">${s.path}</div>
    <div class="st-insp__chips">
      <span class="st-chip">${s.is_dir?"Watched folder":nt[N(s)]}</span>
      <${G} scope=${s.scope}/>
      <span class="st-chip">${ds[s.location]||"Other"}</span>
      ${s.tools.map(n=>o`<${z} key=${n} id=${n} label=${t.labelOf(n)}/>`)}
    </div>
    <${m} title=${"Settings from this file"+(a.length?" · "+a.length:"")}>
      ${a.length?o`<ul class="st-insp__list">
        ${a.map(n=>o`<li key=${n.uid}><button type="button" class="st-link"
          onClick=${()=>t.set({view:"tool",tool:n.tool,sec:"",row:n.key})}>${n.label}</button>
          <span class="st-dim"> · ${t.labelOf(n.tool)}${n.line>0?" · line "+n.line:""}</span></li>`)}
      </ul>`:o`<div class="st-hint">${s.settings?s.settings+" settings":"No settings are read from this file."}</div>`}
    </${m}>
    <${m} title="File">
      <dl class="st-insp__dl">
        <dt>Path</dt><dd class="st-insp__path">${s.path}</dd>
        <dt>Purpose</dt><dd>${s.is_dir?"Watched folder":nt[N(s)]}${s.kind&&s.kind!==N(s)?" ("+s.kind+")":""}</dd>
        <dt>Scope</dt><dd>${s.scope||"—"}</dd>
        <dt>Git</dt><dd>${s.git_state||"—"}</dd>
        <dt>Size</dt><dd>${s.bytes!=null&&!s.is_dir?Lt(s.bytes):"—"}</dd>
        <dt>Last change</dt><dd>${s.mtime?st(s.mtime):"—"}</dd>
        ${s.mtime?o`<dt>Modified</dt><dd>${new Date(s.mtime*1e3).toLocaleString()}</dd>`:null}
        ${s.loading&&o`<dt>Loading</dt><dd>${s.loading}</dd>`}
        ${s.exists===!1&&o`<dt>State</dt><dd>missing</dd>`}
      </dl>
    </${m}>
    <${m} title="Actions">
      <div class="st-actions">
        ${!s.is_dir&&o`<button type="button" class="st-btn" onClick=${()=>t.openAt(s.path)}>Open file</button>`}
        ${e.length>0&&o`<button type="button" class="st-btn" onClick=${()=>Cs(t,e[0])}>Show finding</button>`}
      </div>
    </${m}>
  </div>`}function io({w:t,f:s}){return o`<div class="st-insp__body" data-testid="st-inspector-finding">
    <h3 class="st-insp__title">${ve(s.rule)}</h3>
    <div class="st-insp__key st-mono">${Ss(s.path,s.line)}</div>
    <div class="st-insp__chips">
      <span class=${"st-chip"+(s.severity==="high"||s.severity==="medium"?" st-chip--risky":"")}>${s.severity||"info"}</span>
      ${hs(s).map(e=>o`<${z} key=${e} id=${e} label=${t.labelOf(e)}/>`)}
      ${s.session_id&&o`<span class="st-chip st-chip--mono">session ${s.session_id}</span>`}
    </div>
    ${s.why&&o`<${m} title="Why it matters"><p class="st-insp__tip">${s.why}</p></${m}>`}
    ${s.action&&o`<${m} title="What to do"><p class="st-insp__tip">${s.action}</p></${m}>`}
    <${m} title="Actions">
      <div class="st-actions">
        ${s.path&&o`<button type="button" class="st-btn" onClick=${()=>t.openAt(s.path,s.line)}>${s.line>0?qt(s.path,s.line):"Show the line"}</button>`}
      </div>
    </${m}>
  </div>`}function co({w:t}){const{view:s}=t.st;let e=null;return(s==="tool"||s==="topic")&&t.selected?e=is(t.selected)?o`<${oo} key=${t.selected.uid} w=${t} row=${t.selected}/>`:o`<${ao} key=${t.selected.uid} w=${t} row=${t.selected}/>`:s==="files"&&t.selectedFile?e=o`<${lo} w=${t} file=${t.selectedFile}/>`:s==="findings"&&t.selectedFinding&&(e=o`<${io} w=${t} f=${t.selectedFinding}/>`),o`<aside class=${"st-insp"+(t.drawer?" is-open":"")} aria-label="Inspector">
    <button type="button" class="st-insp__close st-btn" onClick=${t.closeDrawer} aria-label="Close the inspector">Close</button>
    ${e||o`<div class="st-insp__body st-insp__body--empty">
      <h3 class="st-insp__title">Nothing selected</h3>
      <p class="st-hint">${s==="files"?"Click a file for its details.":s==="findings"?"Click a finding for its details.":"Click a setting to see where it is set, what wins and why, and what you can do with it."}</p>
    </div>`}
  </aside>`}const ro=[{value:"tool",label:"By tool"},{value:"topic",label:"By topic"},{value:"files",label:"Files"},{value:"findings",label:"Findings"}],ns=new Set(["tool","topic"]);function as(){return typeof window<"u"?window.location.search:""}function po(){const[t,s]=_(()=>Zt(as())),e=P(a=>s(n=>{const l={...n,...a};if(a.view&&a.view!==n.view&&!(ns.has(n.view)&&ns.has(a.view)))for(const i of["tool","sec","row"])i in a||(l[i]="");if(a.view&&a.view!==n.view&&!("scope"in a)&&(l.scope=""),a.view&&a.view!==n.view)for(const i of je)i in a||(l[i]=i==="recent"?!1:"");return l}),[]);return et(()=>{Ut(Le(t))},[t]),et(()=>{const a=()=>s(Zt(as()));return window.addEventListener("popstate",a),()=>{window.removeEventListener("popstate",a),Ut(Ee)}},[]),[t,e]}function uo(){const[t,s]=_({status:"loading",files:null});return et(()=>{let e=!0;return ee().then(a=>{e&&s(Array.isArray(a==null?void 0:a.files)?{status:"ready",files:a.files}:{status:"unavailable",files:null})},()=>{e&&s({status:"unavailable",files:null})}),()=>{e=!1}},[]),t}function ho(t){const s=t||{},e=s.audit||null;return{status:s.loading?"loading":s.error?"error":e||s.loading===!1?"ready":"loading",audit:e,scan:s.scan||null,error:s.error?String(s.error):null}}function yo({source:t={},note:s=""}){var Ht;const{toolConfigs:e,tools:a,monitor:n,root:l,enabledTools:i=null,recentFiles:d,toolName:c,openFile:u,findings:r,refresh:p,hooks:h}=t,y=L(()=>Se({toolConfigs:e,tools:a,monitor:n,root:l,enabledTools:i}),[e,a,n,l,i]),[$,x]=po(),[C,D]=_(""),[O,mt]=_(!1),[j,gt]=_(!1),[rt,K]=_(!1),dt=os(null),b=uo(),w=ho(r),Os=r==null?void 0:r.rescan;et(()=>{const k=g=>{var A;g.key==="/"&&!te(g.target)&&!g.metaKey&&!g.ctrlKey&&!g.altKey?(g.preventDefault(),(A=dt.current)==null||A.focus()):g.key==="Escape"&&K(!1)};return window.addEventListener("keydown",k),()=>window.removeEventListener("keydown",k)},[]);const S=L(()=>Me(y),[y]),W=L(()=>Ce(y),[y]),It=L(()=>Ae(y),[y]),vt=L(()=>Kt({q:C,nonDefault:O,risky:j,unset:$.unset}),[C,O,j,$.unset]),Ts=L(()=>Kt({q:C,nonDefault:O,risky:j,unset:!0}),[C,O,j]),Ls=P(k=>vt(k)&&(!$.scope||k.scope===$.scope),[vt,$.scope]),Es=L(()=>Oe(S),[S]),Z=L(()=>we(b.files,S,It,i),[b.files,S,It,i]),J=L(()=>se(w.audit,i),[w.audit,i]),_t=L(()=>Te((J==null?void 0:J.findings)||[]),[J]),js=P((k,g=0)=>{!k||!u||u(k,g>0?g:0)},[u]),Ps=P(k=>{x(k),K(!0)},[x]),Fs=P(()=>K(!1),[]),Ns=P(k=>{const g=Pe(k,y);return g===k&&c?c(k):g},[y,c]),Rs=P(k=>{var g;return((g=S.find(A=>A.id===k))==null?void 0:g.scopes)||[]},[S]),qs=P(k=>{const g=Z.find(A=>at(A.path,k));if(g!=null&&g.mtime)return g.mtime;for(const A of(y==null?void 0:y.tools)||[])for(const R of A.files||[])if(at(R.path,k)&&R.mtime)return R.mtime;return null},[Z,y]);if(!y)return o`<p class="loading-state">Loading...</p>`;if(!S.length&&!W&&!Vt(i))return o`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;const wt=S.some(k=>k.id===$.tool)||$.tool==="aictl"&&W?$.tool:((Ht=S[0])==null?void 0:Ht.id)||(W?"aictl":""),pt=S.find(k=>k.id===wt)||null,zt=(k,g)=>{var A;return g&&((A=S.find(R=>R.id===k))==null?void 0:A.rows.find(R=>R.key===g))||null},Is=$.view==="tool"?pt?zt(pt.id,$.row):null:$.view==="topic"?zt($.tool,$.row):null,zs=$.view==="files"&&$.row&&Z.find(k=>k.path===$.row)||null,Ds=$.view==="findings"&&$.row&&_t.find(k=>k.id===$.row)||null,T={st:$,set:x,select:Ps,q:C,pass:vt,passAll:Ts,passTool:Ls,showUnset:$.unset,scopesOf:Rs,managedAbsent:Es,entries:S,aictl:W,toolId:wt,files:Z,filesStatus:b.status,findings:_t,audit:J,auditStatus:w.status,auditError:w.error,scan:w.scan,rescan:Os,selected:Is,selectedFile:zs,selectedFinding:Ds,openAt:js,labelOf:Ns,mtimeOf:qs,recentFiles:d,drawer:rt,closeDrawer:Fs,refresh:p,hooks:h},{set:Ws,agents:Hs,knowsSet:Dt,unset:Bs,risky:Wt}=xe(S),Vs=Vt(i)&&!S.some(k=>k.id!=="vscode");let Y,Q;return $.view==="topic"?(Y=o`<${Fa} w=${T}/>`,Q=o`<${Ra} w=${T}/>`):$.view==="files"?(Y=o`<${za} w=${T}/>`,Q=o`<${Za} w=${T}/>`):$.view==="findings"?(Y=o`<${Ya} w=${T}/>`,Q=o`<${Xa} w=${T}/>`):(Y=o`<${Aa} w=${T}/>`,Q=pt?o`<${ja} w=${T} entry=${pt}/>`:wt==="aictl"&&W?o`<${Pa} w=${T} aictl=${W}/>`:o`<section class="st-main"><p class="st-empty">No tool settings to show.</p></section>`),o`<div class="st-ws" data-view=${$.view}>
    <div class="st-head">
      <${Fn} class="st-pivot" options=${ro} value=${$.view} ariaLabel="Settings view"
        onChange=${k=>x({view:k})}/>
      <label class="st-searchbox">
        <${ot} name="search" size="14"/>
        <input ref=${dt} type="search" class="st-search" value=${C}
          placeholder="Find a setting, value, key or file…" aria-label="Find a setting, value, key or file"
          onInput=${k=>D(k.currentTarget.value)}/>
        <kbd class="st-kbd" aria-hidden="true">/</kbd>
      </label>
      <button type="button" class=${"st-toggle"+(O?" is-on":"")} aria-pressed=${O?"true":"false"}
        onClick=${()=>mt(!O)}>Only non-default</button>
      <button type="button" class=${"st-toggle st-toggle--risky"+(j?" is-on":"")} aria-pressed=${j?"true":"false"}
        onClick=${()=>gt(!j)}>Only risky</button>
      ${Dt&&o`<button type="button" class=${"st-toggle"+($.unset?" is-on":"")} aria-pressed=${$.unset?"true":"false"}
        onClick=${()=>x({unset:!$.unset})}>Show unset knobs</button>`}
      <div class="st-kpis" data-testid="st-kpis">
        <span><b>${S.length}</b> tools</span>
        <span><b>${Z.length}</b> files</span>
        <span><b>${Ws}</b> settings</span>
        <span data-kpi="agents"><b>${Hs}</b> agents</span>
        ${Dt&&o`<span data-kpi="unset"><b>${Bs}</b> unset</span>`}
        <span class=${Wt?"st-red":""}><b>${Wt}</b> risky</span>
        <span><b>${w.status==="loading"&&!w.audit?"…":_t.length}</b> findings</span>
      </div>
    </div>
    ${s&&o`<p class="st-wsnote" data-testid="st-wsnote">${s}</p>`}
    ${Vs&&o`<div class="st-scope-empty"><${Nn} enabledTools=${i} snap=${y} what="the settings"/></div>`}
    <div class="st-grid">
      <div class="st-col st-col--nav">${Y}</div>
      <div class="st-col st-col--main">${Q}</div>
      <${co} w=${T}/>
    </div>
  </div>`}export{ho as auditState,yo as default};

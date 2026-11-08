import{L as Xs,R as te,M as Mt,O as se,m as o,Q as us,U as ee,V as ne,d as w,W as ae,X as at,Y as Pt,Z as Ut,q as F,$ as oe,y as ot,a0 as le,T as L,a1 as ie,e as ce,a2 as Gt,a3 as Kt,a4 as re}from"./index-lesBwqKx.js";import{i as de,D as Ot,a as pe,o as ue,b as G,c as dt,p as he,s as C,d as Et,e as $e,f as mt,S as At,g as jt,t as fe,h as hs,P as ye,G as $s,L as ke,j as R,k as fs,l as Nt,m as be,n as D,q as me,r as ge,u as ys,v as W,w as ve,x as Zt,y as K,z as _e,A as we,B as xe,C as ks,E as bs,F as Ft,H as Ce,I as lt,J as Se,K as Me,M as Oe,N as Ae,O as Jt,Q as Te,R as Le,T as Pe,U as Ee,V as je,W as Ne,X as Fe,Y as Re,Z as qe,_ as Yt,$ as ze,a0 as Ie,a1 as De}from"./model-CWOXCWMp.js";import{u as E,a as We,n as ms}from"./tableGrid-BTbYq09k.js";/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gs=(...t)=>t.filter((s,e,a)=>!!s&&s.trim()!==""&&a.indexOf(s)===e).join(" ").trim();/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qt=t=>t.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Be=t=>t.replace(/^([A-Z])|[\s-_]+(\w)/g,(s,e,a)=>a?a.toUpperCase():e.toLowerCase());/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xt=t=>{const s=Be(t);return s.charAt(0).toUpperCase()+s.slice(1)};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var Ve={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const He=te({size:24,color:"currentColor",strokeWidth:2,absoluteStrokeWidth:!1,class:""}),Ue=()=>Xs(He);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ge=t=>{for(const s in t)if(s.startsWith("aria-")||s==="role"||s==="title")return!0;return!1};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ke=({color:t,size:s,strokeWidth:e,absoluteStrokeWidth:a,children:n,iconNode:l,class:i="",...c})=>{const{size:d=24,strokeWidth:p=2,absoluteStrokeWidth:r=!1,color:h="currentColor",class:u=""}=Ue()??{},f=a??r?Number(e??p)*24/Number(s??d):e??p;return Mt("svg",{...Ve,width:s??d??24,height:s??d??24,stroke:t??h,"stroke-width":f,class:gs("lucide",u,i),...!n&&!Ge(c)&&{"aria-hidden":"true"},...c},[...l.map(([$,_])=>Mt($,_)),...se(n)])};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=(t,s)=>{const e=({class:a="",className:n="",children:l,...i})=>Mt(Ke,{...i,iconNode:s,class:gs(`lucide-${Qt(Xt(t))}`,`lucide-${Qt(t)}`,a,n)},l);return e.displayName=Xt(t),e};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ze=y("activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Je=y("archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ye=y("banknote",[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qe=y("book-open",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xe=y("bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tn=y("brain-circuit",[["path",{d:"M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z",key:"l5xja"}],["path",{d:"M9 13a4.5 4.5 0 0 0 3-4",key:"10igwf"}],["path",{d:"M6.003 5.125A3 3 0 0 0 6.401 6.5",key:"105sqy"}],["path",{d:"M3.477 10.896a4 4 0 0 1 .585-.396",key:"ql3yin"}],["path",{d:"M6 18a4 4 0 0 1-1.967-.516",key:"2e4loj"}],["path",{d:"M12 13h4",key:"1ku699"}],["path",{d:"M12 18h6a2 2 0 0 1 2 2v1",key:"105ag5"}],["path",{d:"M12 8h8",key:"1lhi5i"}],["path",{d:"M16 8V5a2 2 0 0 1 2-2",key:"u6izg6"}],["circle",{cx:"16",cy:"13",r:".5",key:"ry7gng"}],["circle",{cx:"18",cy:"3",r:".5",key:"1aiba7"}],["circle",{cx:"20",cy:"21",r:".5",key:"yhc1fs"}],["circle",{cx:"20",cy:"8",r:".5",key:"1e43v0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sn=y("brain",[["path",{d:"M12 18V5",key:"adv99a"}],["path",{d:"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4",key:"1e3is1"}],["path",{d:"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5",key:"1gqd8o"}],["path",{d:"M17.997 5.125a4 4 0 0 1 2.526 5.77",key:"iwvgf7"}],["path",{d:"M18 18a4 4 0 0 0 2-7.464",key:"efp6ie"}],["path",{d:"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517",key:"1gq6am"}],["path",{d:"M6 18a4 4 0 0 1-2-7.464",key:"k1g0md"}],["path",{d:"M6.003 5.125a4 4 0 0 0-2.526 5.77",key:"q97ue3"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const en=y("chart-column",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nn=y("chart-line",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const an=y("chevron-down",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const on=y("chevron-right",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ln=y("clipboard-list",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cn=y("clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 6v6l4 2",key:"mmk7yg"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rn=y("coins",[["path",{d:"M13.744 17.736a6 6 0 1 1-7.48-7.48",key:"bq4yh3"}],["path",{d:"M15 6h1v4",key:"11y1tn"}],["path",{d:"m6.134 14.768.866-.5 2 3.464",key:"17snzx"}],["circle",{cx:"16",cy:"8",r:"6",key:"14bfc9"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dn=y("cpu",[["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M17 20v2",key:"1rnc9c"}],["path",{d:"M17 2v2",key:"11trls"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M2 17h2",key:"7oei6x"}],["path",{d:"M2 7h2",key:"asdhe0"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"M20 17h2",key:"1fpfkl"}],["path",{d:"M20 7h2",key:"1o8tra"}],["path",{d:"M7 20v2",key:"4gnj0m"}],["path",{d:"M7 2v2",key:"1i4yhu"}],["rect",{x:"4",y:"4",width:"16",height:"16",rx:"2",key:"1vbyd7"}],["rect",{x:"8",y:"8",width:"8",height:"8",rx:"1",key:"z9xiuo"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pn=y("eye-off",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const un=y("file-pen",[["path",{d:"M12.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v9.34",key:"o6klzx"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10.378 12.622a1 1 0 0 1 3 3.003L8.36 20.637a2 2 0 0 1-.854.506l-2.867.837a.5.5 0 0 1-.62-.62l.836-2.869a2 2 0 0 1 .506-.853z",key:"zhnas1"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hn=y("file-text",[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $n=y("folder",[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",key:"1kt360"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fn=y("funnel",[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yn=y("git-branch",[["path",{d:"M15 6a9 9 0 0 0-9 9V3",key:"1cii5b"}],["circle",{cx:"18",cy:"6",r:"3",key:"1h7g24"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kn=y("globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bn=y("grid-3x3",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M3 15h18",key:"5xshup"}],["path",{d:"M9 3v18",key:"fh3hqa"}],["path",{d:"M15 3v18",key:"14nvp0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mn=y("layout-dashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gn=y("layers",[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vn=y("lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _n=y("mail",[["path",{d:"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7",key:"132q7q"}],["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2",key:"izxlao"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wn=y("message-square",[["path",{d:"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",key:"18887p"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xn=y("moon",[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cn=y("package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sn=y("pen",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mn=y("plug",[["path",{d:"M12 22v-5",key:"1ega77"}],["path",{d:"M15 8V2",key:"18g5xt"}],["path",{d:"M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z",key:"1xoxul"}],["path",{d:"M9 8V2",key:"14iosj"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const On=y("radio",[["path",{d:"M16.247 7.761a6 6 0 0 1 0 8.478",key:"1fwjs5"}],["path",{d:"M19.075 4.933a10 10 0 0 1 0 14.134",key:"ehdyv1"}],["path",{d:"M4.925 19.067a10 10 0 0 1 0-14.134",key:"1q22gi"}],["path",{d:"M7.753 16.239a6 6 0 0 1 0-8.478",key:"r2q7qm"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const An=y("refresh-cw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tn=y("search",[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ln=y("server",[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pn=y("settings",[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const En=y("sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jn=y("triangle-alert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nn=y("user",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fn=y("users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rn=y("wallet",[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qn=y("webhook",[["path",{d:"M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2",key:"q3hayz"}],["path",{d:"m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06",key:"1go1hn"}],["path",{d:"m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8",key:"qlwsc0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zn=y("wrench",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",key:"1ngwbx"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const In=y("x",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dn=y("zap",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]),Wn={activity:Ze,"alert-triangle":jn,filter:fn,"eye-off":pn,archive:Je,banknote:Ye,"bar-chart-3":en,"book-open":Qe,bot:Xe,brain:sn,"brain-circuit":tn,"chevron-down":an,"chevron-right":on,"clipboard-list":ln,clock:cn,coins:rn,cpu:dn,"file-pen":un,"file-text":hn,folder:$n,"git-branch":yn,globe:kn,"grid-3x3":bn,layers:gn,"layout-dashboard":mn,"line-chart":nn,lock:vn,mail:_n,"message-square":wn,moon:xn,package:Cn,pen:Sn,plug:Mn,radio:On,"refresh-cw":An,search:Tn,server:Ln,settings:Pn,sun:En,user:Nn,users:Fn,wallet:Rn,webhook:qn,wrench:zn,x:In,zap:Dn};function it({name:t,size:s="1em",strokeWidth:e=2,...a}){if(!t)return null;const n=Wn[String(t)];return n?o`<${n} size=${s} strokeWidth=${e} aria-hidden="true" ...${a} />`:o`<span aria-hidden="true" ...${a}>${t}</span>`}function Bn({options:t=[],value:s,onChange:e,ariaLabel:a,class:n,className:l,...i}){const c=["aictl-ui-segmented",n,l].filter(Boolean).join(" "),d=us([]),p=r=>{var f;if(!t.length)return;const h=Math.max(0,t.findIndex($=>$.value===s));let u=null;r.key==="ArrowRight"||r.key==="ArrowDown"?u=(h+1)%t.length:r.key==="ArrowLeft"||r.key==="ArrowUp"?u=(h-1+t.length)%t.length:r.key==="Home"?u=0:r.key==="End"&&(u=t.length-1),u!=null&&(r.preventDefault(),e&&e(t[u].value),(f=d.current[u])==null||f.focus())};return o`<div
    class=${c}
    role="radiogroup"
    aria-label=${a||null}
    ...${i}
  >${t.map((r,h)=>{const u=r.value===s;return o`<button
      key=${r.value}
      ref=${f=>{d.current[h]=f}}
      type="button"
      class="aictl-ui-segmented__btn"
      role="radio"
      aria-checked=${u?"true":"false"}
      tabindex=${u?"0":"-1"}
      onClick=${()=>e&&e(r.value)}
      onKeyDown=${p}
    >${r.icon?o`<${it} name=${r.icon} size="0.9em"/>`:null}${r.label}</button>`})}</div>`}function Vn({enabledTools:t,snap:s,what:e="this screen"}){const a=ee(t),n=ne(t,s);return o`<div class="panel-state panel-state--empty" role="status" data-testid="tool-scope-empty">
    <${it} name="filter" size="14"/>
    <div>
      <div class="panel-state__title">${a?"No tools are selected":"The selected tools have no data here"}</div>
      <div class="panel-state__hint">${a?`The tool filter in the header has no tool ticked, so ${e} shows nothing. Tick a tool, or choose All tools.`:`${n.join(", ")} ${n.length===1?"has":"have"} nothing to show on ${e}. Tick more tools in the header filter, or choose All tools.`}</div>
    </div>
  </div>`}function ft(t){return t==null?Ot:typeof t=="object"?JSON.stringify(t):String(t)}function Hn({value:t,compact:s}){const[e,a]=w(!1),n=Array.isArray(t),l=n?t.map((d,p)=>[p,d]):Object.entries(t||{}),i=l.length;if(!i)return o`<span class="st-none">none</span>`;const c=o`<span class="st-chip st-chip--mono st-items">${i} ${i===1?"item":"items"}</span>`;return s?c:o`<span class="st-itemsbox">
    ${c}
    <button type="button" class="st-link" aria-expanded=${e?"true":"false"}
      onClick=${d=>{d.stopPropagation(),a(!e)}}>${e?"hide":"show"}</button>
    ${e&&o`<ul class="st-itemlist">
      ${l.map(([d,p])=>o`<li key=${d} class="st-mono" title=${n?ft(p):`${d}: ${ft(p)}`}>
        ${n?ft(p):o`<span class="st-itemkey">${d}:</span> ${ft(p)}`}</li>`)}
    </ul>`}
  </span>`}function kt({row:t,value:s,compact:e=!1}){const a=s!==void 0?s:t.value,n=t.kind||de(a),l=!!t.risky;if(n==="flag"||typeof a=="boolean"){if(a==null)return o`<span class="st-none">${Ot}</span>`;const d=pe(a);return o`<span class=${"st-flag"+(d?" is-on":"")+(l?" is-risky":"")}>
      <span class="st-switch" aria-hidden="true"></span><span class="st-flag__text">${d?"on":"off"}</span>
    </span>`}if(a==null||a==="")return o`<span class="st-none">${Ot}</span>`;if(n==="list"||n==="map"||typeof a=="object")return o`<${Hn} value=${a} compact=${e}/>`;const i=String(a),c=ue({...t,value:a});return c?o`<span class=${"st-select"+(l?" is-risky":"")} title=${"Options: "+c.join(", ")}>${i}</span>`:n==="path"?o`<span class="st-v st-path" title=${i}>${i}</span>`:o`<span class=${"st-v"+(l?" is-risky":"")} title=${i}>${i}</span>`}function Z({scope:t,locked:s=!1,label:e=""}){const a=t||"default",n=o`<span class=${"st-chip st-scope st-scope--"+a.replace(/[^a-z-]/gi,"")+(s?" st-scope--locked":"")}
    title=${s?`Set by ${e||a}; cannot be changed here`:void 0}>${a}${s?o`<span class="st-sr"> (locked)</span>`:""}</span>`;return s?o`<span class="st-scopewrap"><${pt}/>${n}</span>`:n}function pt({label:t=""}){return t?o`<span class="st-lock" role="img" aria-label=${t} title=${t}><${it} name="lock" size="11"/></span>`:o`<span class="st-lock" aria-hidden="true"><${it} name="lock" size="11"/></span>`}function q({id:t,big:s=!1}){return o`<span class=${"st-sw"+(s?" st-sw--big":"")} aria-hidden="true"
    style=${{background:ae[t]||"var(--st-fg2)"}}></span>`}function ct({label:t}){return o`<span class="st-dot" role="img" aria-label=${t} title=${t}></span>`}function P({children:t}){return o`<div class="st-nav__h">${t}</div>`}function B({id:t,label:s}){return o`<span class="st-chip st-toolchip"><${q} id=${t}/>${s}</span>`}function rt({path:t,line:s,w:e}){if(!t)return o`<span class="st-none">—</span>`;const a=t+(s>0?":"+s:"");return o`<button type="button" class="st-src" title=${a}
    onClick=${n=>{n.stopPropagation(),e.openAt(t,s)}}>
    <b>${G(t)}</b>${s>0?":"+s:""}</button>`}const Un="aictl has no description for this key; the value is shown as found in the file";function vs(){return o`<span class="st-chip st-chip--muted st-undoc" title=${Un}>undocumented</span>`}const Gn=4,Tt=(t,s,e)=>[s&&{k:"tool",l:"Tool",get:a=>t.labelOf(a.tool)},{k:"agent",l:"Agent",cls:"st-c-agent",get:a=>nt(a)},{k:"model",l:"Model",get:a=>dt(a)?void 0:String(a.value)},{k:"effort",l:"Effort",get:a=>{var n;return(n=a.agent)==null?void 0:n.effort}},e&&{k:"context",l:"Context",get:a=>{var n;return(n=a.agent)==null?void 0:n.context_tier}},{k:"tools",l:"Tools",n:!0,get:a=>{var n,l;return((l=(n=a.agent)==null?void 0:n.tools)==null?void 0:l.length)||void 0}},{k:"defined",l:"Defined in",cls:"st-c-src",get:a=>{var n;return(n=a.agent)==null?void 0:n.defined_in}},{k:"pinned",l:"Pinned in",cls:"st-c-src",get:a=>{var n;return(n=a.agent)==null?void 0:n.pinned_in}}].filter(Boolean);function Kn(t,s){return`Set by ${C(t.scope,s.scopesOf(t.tool))}; cannot be changed here`}function _s({row:t,w:s}){const e=t.agent,a=dt(t);return o`<span class="st-agentmodel">
    ${t.locked&&o`<${pt} label=${Kn(t,s)}/>`}
    ${a?o`<span class="st-inherit" title=${t.note||"Runs on the session model"}>inherits</span>`:o`<span class="st-v" title=${String(t.value)}>${String(t.value)}</span>`}
    ${e.model_policy==="required"&&o`<span class="st-badge" title="The agent file requires a model">required</span>`}
    ${he(t)&&o`<span class="st-badge st-badge--pin" title=${"A settings pin decides the model: "+e.pinned_in}>pinned</span>`}
  </span>`}function ws({tools:t,all:s=!1}){if(!t||!t.length)return o`<span class="st-none" title="The agent file lists no tools">—</span>`;const e=s?t:t.slice(0,Gn),a=t.length-e.length;return o`<span class="st-tools">
    ${e.map(n=>o`<span key=${n} class="st-chip st-chip--mono" title=${n}>${n}</span>`)}
    ${a>0&&o`<span class="st-chip st-more-tools" title=${t.slice(e.length).join(", ")}>+${a}</span>`}
  </span>`}function xs({row:t,w:s,withTool:e,withContext:a}){var d;const n=t.agent,l=((d=s.selected)==null?void 0:d.uid)===t.uid,i=()=>s.select({tool:t.tool,row:t.key}),c=p=>Number(p)>0?Number(p):0;return o`<tr class=${"st-row st-agentrow"+(l?" is-sel":"")} data-key=${t.key} data-tool=${t.tool}
    tabindex="0" onClick=${i}
    onKeyDown=${p=>{(p.key==="Enter"||p.key===" ")&&(p.preventDefault(),i())}}>
    ${e&&o`<td class="st-c-tool"><span class="st-matrix__toolname"><${q} id=${t.tool}/>${s.labelOf(t.tool)}</span></td>`}
    <td class="st-c-agent">
      <div class="st-label st-mono">${n.name||t.label}</div>
      ${n.description&&o`<div class="st-agentdesc" title=${n.description}>${n.description}</div>`}
    </td>
    <td class="st-c-model"><${_s} row=${t} w=${s}/></td>
    <td class="st-mono">${n.effort||o`<span class="st-none">—</span>`}</td>
    ${a&&o`<td class="st-mono">${n.context_tier||o`<span class="st-none">—</span>`}</td>`}
    <td><${ws} tools=${n.tools}/></td>
    <td class="st-c-src"><${rt} path=${n.defined_in} line=${c(n.defined_line)} w=${s}/></td>
    <td class="st-c-src"><${rt} path=${n.pinned_in} line=${c(n.pinned_line)} w=${s}/></td>
  </tr>`}function Zn({w:t,section:s}){const e=s.shown,a=e.filter(dt).length,n=E("settings.agents",Tt(t,!1,!0)),l=Tt(t,!1,!0);return o`<table class=${"st-table st-agents "+n.tableProps.class} style=${n.tableProps.style} data-section="agents">
    <thead><tr>${l.map(n.th)}</tr></thead>
    <tbody>
      <tr class="st-group"><th scope="colgroup" colspan="7">${s.title}
        <span class="st-group__meta">${e.length}${a?` · ${a} inherit the session model`:""}</span></th></tr>
      ${n.order(e).map(i=>o`<${xs} key=${i.uid} row=${i} w=${t} withContext/>`)}
    </tbody>
  </table>`}const Lt={tool:t=>(s,e)=>t.labelOf(s.tool).localeCompare(t.labelOf(e.tool))||nt(s).localeCompare(nt(e)),agent:t=>(s,e)=>nt(s).localeCompare(nt(e))||t.labelOf(s.tool).localeCompare(t.labelOf(e.tool)),model:t=>(s,e)=>ts(s).localeCompare(ts(e))||Lt.tool(t)(s,e)};function nt(t){var s;return String(((s=t.agent)==null?void 0:s.name)||t.label||"")}function ts(t){return dt(t)?"￿":String(t.value)}function Jn(t,s,e){return[...t].sort((Lt[s]||Lt.tool)(e))}function Yn({w:t,rows:s,sort:e}){const a=Tt(t,!0,!1),n=E("settings.agents.all",a),l=n.order(Jn(s,e,t));return o`<div class="st-scroll"><table class=${"st-table st-agents st-agents--all "+n.tableProps.class} style=${n.tableProps.style}>
    <thead><tr>${a.map(n.th)}</tr></thead>
    <tbody>${l.map(i=>o`<${xs} key=${i.uid} row=${i} w=${t} withTool/>`)}</tbody>
  </table></div>`}const Rt=[{id:"mcp",label:"MCP"},{id:"read",label:"Read files"},{id:"write",label:"Write files"},{id:"shell",label:"Shell"},{id:"web",label:"Web"}],Qn={allowed:"allow",asks:"ask",denied:"deny"},ss={denied:3,asks:2,allowed:1},U=(t,s,e="")=>Object.fromEntries(Rt.map(a=>[a.id,{state:t,why:s,key:e}]));function Xn(t){const s=String(t||"").split(".");return s[s.length-1]}function ta(t){const s=new Map;for(const e of(t==null?void 0:t.rows)||[])s.has(e.key)||s.set(e.key,e);return s}const v=t=>t&&t.value!==null&&t.value!==void 0&&t.value!==""?t.value:void 0,bt=t=>Array.isArray(t)?t.filter(s=>typeof s=="string"&&s):[];function qt(t){const s=/^\s*([^()\s]+)\s*(?:\((.*)\))?\s*$/.exec(String(t));return s?{name:s[1].toLowerCase(),spec:s[2]===void 0?null:s[2].trim()}:{name:String(t).toLowerCase(),spec:null}}const Cs=new Set(["","*",":*","**"]),sa={read:["read","glob","grep","ls","notebookread"],write:["write","edit","multiedit","notebookedit"],shell:["bash","powershell"],web:["webfetch","websearch"]};function ea(t){if(t==="mcp"||t.startsWith("mcp__"))return"mcp";for(const[s,e]of Object.entries(sa))if(e.includes(t))return s;return""}function na(t,s){return t.startsWith("mcp__")?t==="mcp__*":s===null||Cs.has(s)}function aa(t,s){const e=[],a=(i,c,d,p)=>{const r={allow:"allowed",deny:"denied",ask:"asks"}[i],h=i+""+c,u=d?C(d,s):"",f=e.find(S=>S.id===h);if(f){u&&!f.where.includes(u)&&f.where.push(u);return}const{name:$,spec:_}=qt(c);e.push({id:h,rule:c,effect:r,cap:ea($),whole:na($,_),where:u?[u]:[],key:p})},n=(i,c,d)=>{if(!(!i||typeof i!="object"||Array.isArray(i)))for(const p of["allow","deny","ask"])for(const r of bt(i[p]))a(p,r,c,d)},l=t.get("permissions");if(l){const i=(l.chain||[]).filter(c=>c&&c.value&&typeof c.value=="object"&&c.set!==!1);if(i.length)for(const c of i)n(c.value,c.scope,"permissions");else n(v(l),l.scope,"permissions")}for(const i of["allow","deny","ask"]){const c=t.get("permissions."+i);for(const d of bt(v(c)))a(i,d,c.scope,c.key)}return e}const oa={shell:"shell",write:"write",read:"read",url:"web",fetch:"web",web_fetch:"web"};function la(t){const s=[];for(const e of["allow","deny","ask"]){const a=t.get("permissions."+e);for(const n of bt(v(a))){const{name:l,spec:i}=qt(n);s.push({rule:n,effect:{allow:"allowed",deny:"denied",ask:"asks"}[e],cap:oa[l]||"mcp",whole:i===null||Cs.has(i),where:a.scope?[C(a.scope)]:[],key:a.key})}}return s}function ia(t){const s=[];for(const e of t.values()){const a=v(e);if(!a||typeof a!="object"||Array.isArray(a))continue;const n=e.key;let l="";if(/(^|\.)urls\.autoApprove$/.test(n)?l="web":/(^|\.)edits\.autoApprove$/.test(n)?l="write":(n==="autoApprove"||/(^|\.)terminal\.autoApprove$/.test(n))&&(l="shell"),!!l)for(const[i,c]of Object.entries(a)){let d;if(l==="web"?d=c===!0||(c==null?void 0:c.approveRequest)===!0?"allowed":"asks":l==="write"?d=c===!1?"asks":"allowed":c===!0||(c==null?void 0:c.approve)===!0?d="allowed":(c===!1||(c==null?void 0:c.approve)===!1)&&(d="denied"),!d)continue;const p=l==="write"?i==="**/*"||i==="**":!1;s.push({rule:i,effect:d,cap:l,whole:p,where:e.scope?[C(e.scope)]:[],key:n})}}return s}const ca={read:["read_file","read_many_files","glob","grep","search_file_content","list_directory","readfiletool","readmanyfilestool","globtool","greptool","lstool"],write:["write_file","replace","edit","writefiletool","edittool"],shell:["run_shell_command","shelltool"],web:["web_fetch","google_web_search","webfetchtool","websearchtool"]};function ra(t){var e;const s=[];for(const[a,n]of[["tools.allowed","allowed"],["tools.exclude","denied"]]){const l=t.get(a);for(const i of bt(v(l))){const{name:c,spec:d}=qt(i);let p=((e=Object.entries(ca).find(([,r])=>r.includes(c)))==null?void 0:e[0])||"";!p&&c.includes("__")&&(p="mcp"),p&&s.push({rule:i,effect:n,cap:p,whole:d===null,where:l.scope?[C(l.scope)]:[],key:a})}}return s}function da(t){const s=t.get("permissions.defaultMode"),e=v(s)??"default",a=s&&v(s)!==void 0?s.key:"",n=`default mode ${e}`;if(e==="bypassPermissions")return U("allowed",n+": no permission prompts",a);const l={mcp:{state:"asks",why:"Claude Code asks before an MCP tool runs",key:a},read:{state:"allowed",why:"Claude Code reads files without asking",key:a},write:{state:"asks",why:"Claude Code asks before it edits a file",key:a},shell:{state:"asks",why:"Claude Code asks before it runs a command",key:a},web:{state:"asks",why:"Claude Code asks before it fetches a URL",key:a}};if(e==="acceptEdits"&&(l.write={state:"allowed",why:n+": edits apply without asking",key:a}),e==="plan"&&(l.write={state:"denied",why:n+": read-only, no edits",key:a},l.shell={state:"denied",why:n+": read-only, no commands that change anything",key:a}),e==="dontAsk")for(const i of["mcp","write","shell","web"])l[i]={state:"denied",why:n+": anything not allowed by a rule is refused",key:a};return l}function pa(t){const s=t.get("defaultPermissionMode"),e=v(s)??"manual",a=s&&v(s)!==void 0?s.key:"";if(e==="allow-all")return U("allowed","defaultPermissionMode allow-all: every tool call is allowed",a);const n=e==="assisted"?"asks; in assisted mode a model answers the request":"asks before it runs";return{mcp:{state:"asks",why:"an MCP tool "+n,key:a},read:{state:"allowed",why:"reads in trusted folders run without asking",key:a},write:{state:"asks",why:"a file write "+n,key:a},shell:{state:"asks",why:"a shell command "+n,key:a},web:{state:"asks",why:"a URL fetch "+n,key:a}}}function ua(t){for(const s of t.values()){const e=v(s);if((Xn(s.key)==="globalAutoApprove"||s.key==="chat.tools.global.autoApprove")&&e===!0)return U("allowed",s.label+" is on: every tool call runs without asking",s.key);if(s.key==="skipPermissions"&&e===!0)return U("allowed",s.label+" is on: no permission checks",s.key);if(s.key==="chat.permissions.default"&&["autoApprove","autopilot","bypass"].includes(e))return U("allowed",`chat.permissions.default ${e}: sessions start without approval prompts`,s.key)}return{mcp:{state:"asks",why:"VS Code asks before an MCP tool runs"},read:{state:"allowed",why:"VS Code reads workspace files without asking"},write:{state:"allowed",why:"VS Code applies edits in the workspace without asking"},shell:{state:"asks",why:"VS Code asks before a terminal command runs"},web:{state:"asks",why:"VS Code asks before it fetches a URL"}}}function ha(t){const s=t.get("approval_policy"),e=t.get("sandbox_mode"),a=v(t.get("sandbox_workspace_write.network_access"))===!0;let n=v(s);n&&typeof n=="object"&&(n="granular"),n=n||"on-request";const l=v(e)||"read-only",i=s&&v(s)!==void 0?s.key:"",c=e&&v(e)!==void 0?e.key:"",d=`approval_policy ${n}${v(s)===void 0?" (not set)":""}`,p=`sandbox_mode ${l}${v(e)===void 0?" (not set)":""}`,r=n==="never",h=l==="danger-full-access",u=h?{state:"allowed",why:p+": no sandbox"}:l==="workspace-write"?{state:"allowed",why:p+": writes in the workspace run without asking"}:r?{state:"denied",why:`${p}, ${d}: no writes and no way to ask`}:{state:"asks",why:`${p}: a write needs your approval`},f=r?{state:"allowed",why:d+": commands never ask"}:n==="untrusted"?{state:"asks",why:d+": commands outside the trusted set ask"}:{state:"allowed",why:`${d}: commands run in the sandbox (${l}) and ask to leave it`},$=h||l==="workspace-write"&&a?{state:"allowed",why:h?p+": network open":"sandbox_workspace_write.network_access is on"}:r?{state:"denied",why:`${p}, ${d}: no network and no way to ask`}:{state:"asks",why:`${p}: network access needs your approval`};return{mcp:{state:r?"allowed":"asks",why:r?d+": MCP tools never ask":d+": MCP tool calls ask",key:i},read:{state:"allowed",why:p+": reads are allowed",key:c},write:{...u,key:c||i},shell:{...f,key:i||c},web:{...$,key:c||i}}}function $a(t){const s=t.get("general.defaultApprovalMode")||t.get("approvalMode")||t.get("approval_mode")||t.get("general.approvalMode"),e=v(s)??"default",a=s&&v(s)!==void 0?s.key:"",n="approval mode "+e;if(e==="yolo")return U("allowed",n+": every tool call runs without asking",a);const l={mcp:{state:"asks",why:n+": MCP tools ask",key:a},read:{state:"allowed",why:"reads run without asking",key:a},write:{state:"asks",why:n+": edits ask",key:a},shell:{state:"asks",why:n+": shell commands ask",key:a},web:{state:"asks",why:n+": web fetches ask",key:a}};return e==="auto_edit"&&(l.write={state:"allowed",why:n+": edits run without asking",key:a}),e==="plan"&&(l.write={state:"denied",why:n+": read-only",key:a},l.shell={state:"denied",why:n+": read-only",key:a}),l}const st=(t,s)=>[...t.keys()].some(e=>s.test(e)),fa=[{id:"claude",tools:["claude-code"],applies:t=>st(t,/^permissions(\.(allow|deny|ask|defaultMode))?$/),base:da,rules:aa,wholeName:"the whole tool"},{id:"copilot-cli",tools:["copilot-cli","copilot-desktop"],applies:t=>st(t,/^(defaultPermissionMode|savedToolApprovals|permissions\.(allow|deny|ask))$/),base:pa,rules:la,notes:t=>{const s=v(t.get("savedToolApprovals"));if(!s||typeof s!="object")return[];const e=Object.values(s).reduce((n,l)=>n+(Number(l)||0),0),a=Object.keys(s).length;return e?[`${e} saved tool ${e===1?"approval":"approvals"} in ${a} ${a===1?"folder":"folders"} (permissions-config.json)`]:[]}},{id:"vscode",tools:["vscode","copilot"],applies:t=>st(t,/(autoApprove|^chat\.permissions\.default$|^skipPermissions$)/i),base:ua,rules:ia},{id:"codex",tools:["codex-cli","codex"],applies:t=>st(t,/^(approval_policy|sandbox_mode)$/),base:ha,rules:()=>[]},{id:"gemini",tools:["gemini-cli","gemini"],applies:t=>st(t,/(^|\.)(defaultApprovalMode|approvalMode|approval_mode)$|^tools\.(allowed|exclude)$/),base:$a,rules:ra}];function ya(t,s){return t==="mixed"?`mixed (${s} ${s===1?"rule":"rules"})`:t}function es(t){return`${Qn[t.effect]} ${t.rule}${t.where.length?" ("+t.where.join(", ")+")":""}`}function ka(t,s,e){var h;const a=e.filter(u=>u.cap===t.id),n=a.filter(u=>u.whole);let l=s.state,i=s.why;if(n.length){const u=n.reduce((f,$)=>ss[$.effect]>ss[f.effect]?$:f);l=u.effect,i="rule "+es(u)}const c=a.some(u=>!u.whole&&u.effect!==l),d=c?"mixed":l,p=ya(d,a.length),r=[`${t.label}: ${p}`];return!a.length||!n.length?r.push("Without a rule: "+s.state+" ("+s.why+")"):r.push((c?"For the whole tool: ":"Decided by: ")+l+" ("+i+")"),a.length&&r.push(...a.map(u=>"• "+es(u))),{cap:t.id,label:t.label,state:d,text:p,title:r.join(`
`),rules:a.map(u=>({rule:u.rule,effect:u.effect,where:u.where})),key:((h=a[0])==null?void 0:h.key)||s.key||""}}function Ss(t){if(!t)return null;const s=fa.find(l=>l.tools.includes(t.id));if(!s)return null;const e=ta(t);if(!s.applies(e))return null;const a=s.base(e),n=s.rules(e,t.scopes||[]);return{tool:t.id,cells:Rt.map(l=>ka(l,a[l.id],n)),notes:s.notes?s.notes(e):[]}}function ba(t){return(t||[]).map(s=>({entry:s,perms:Ss(s)})).filter(s=>s.perms)}const ma=["project","project-local"],ga=new Set(["permissions","permissions.allow","permissions.deny","permissions.ask","project_permissions"]),Ms="No form for this value. Open the file and use Edit file";function va(t){return!!t&&t.tool==="claude-code"&&ga.has(t.key)}function _a(t){var s,e;return((e=(s=t==null?void 0:t.chain)==null?void 0:s[t.wins])==null?void 0:e.scope)||(t==null?void 0:t.scope)||"default"}function wa(t,s=[]){var l;const e=(l=t==null?void 0:t.chain)==null?void 0:l[t.wins];if(t!=null&&t.locked||Et(e,s))return{ok:!1,hint:"Locked by "+C(t.locked?t.scope:e.scope,s)};if(!va(t))return{ok:!1,hint:Ms};const a=_a(t);if(!ma.includes(a))return{ok:!1,hint:`The value comes from ${C(a,s)}. Project and Project local permissions have a form here; for another file, open it and use Edit file.`};const n=(s||[]).find(i=>i.id===a);return{ok:!0,scope:a,label:C(a,s),path:e&&e.source||(n==null?void 0:n.path)||""}}const xa=t=>(t||[]).join(`
`),Ca=t=>String(t||"").split(`
`).map(s=>s.trim()).filter(Boolean);function Sa(t,s){const e=new Set(t||[]),a=new Set(s||[]);return{added:[...a].filter(n=>!e.has(n)),removed:[...e].filter(n=>!a.has(n))}}function Os({cell:t,onPick:s}){const e=t.key&&s?()=>s(t.key):null;return o`<td class=${"st-perm st-perm--"+t.state} data-cap=${t.cap} data-state=${t.state} title=${t.title}>
    ${e?o`<button type="button" class="st-perm__btn" aria-label=${`${t.label}: ${t.text}`} onClick=${e}>${t.text}</button>`:o`<span class="st-perm__text">${t.text}</span>`}
  </td>`}const As=(t,s)=>[...t?[{k:"tool",l:t,get:s?e=>e.entry.label:void 0}]:[],...Rt.map(e=>({k:e.id,l:e.label,attrs:{"data-cap":e.id},get:s?a=>{var n;return(n=a.perms.cells.find(l=>l.cap===e.id))==null?void 0:n.text}:void 0}))];function Ma({w:t,entry:s,perms:e}){const a=i=>t.select({tool:s.id,row:i}),n=As("",!1),l=E("settings.perms",n);return o`<div class="st-perms" data-testid="st-perms" data-tool=${s.id}>
    <table class=${"st-permtable "+l.tableProps.class} style=${l.tableProps.style}>
      <caption class="st-perms__cap">What the agent can do without asking</caption>
      <thead><tr>${n.map(l.th)}</tr></thead>
      <tbody><tr>${e.cells.map(i=>o`<${Os} key=${i.cap} cell=${i} onPick=${a}/>`)}</tr></tbody>
    </table>
    ${e.notes.map((i,c)=>o`<p key=${c} class="st-hint st-perms__note">${i}</p>`)}
  </div>`}function Oa({w:t,mats:s}){const e=As("Tool",!0),a=E("settings.perms.all",e);return s.length?o`<div class="st-perms st-perms--topic" data-testid="st-perms-topic">
    <div class="st-scroll"><table class=${"st-permtable "+a.tableProps.class} style=${a.tableProps.style}>
      <caption class="st-perms__cap">What each tool's agent can do without asking</caption>
      <thead><tr>${e.map(a.th)}</tr></thead>
      <tbody>
        ${a.order(s).map(({entry:n,perms:l})=>o`<tr key=${n.id} data-tool=${n.id}>
          <th scope="row" class="st-perms__tool"><span class="st-matrix__toolname"><${q} id=${n.id}/>${n.label}</span></th>
          ${l.cells.map(i=>o`<${Os} key=${i.cap} cell=${i} onPick=${c=>t.select({tool:n.id,row:c})}/>`)}
        </tr>`)}
      </tbody>
    </table></div>
    ${s.flatMap(({entry:n,perms:l})=>l.notes.map((i,c)=>o`<p key=${n.id+c} class="st-hint st-perms__note">${n.label}: ${i}</p>`))}
  </div>`:null}const Aa={copilot:"copilot-vscode",vscode:"copilot-vscode"};function Ta(t,s){const e=t==null?void 0:t.tools;return!e||typeof e!="object"?null:e[s]||e[Aa[s]]||null}function La(t){return{active:"active",configured:"configured",disabled:"host-disabled",misconfigured:"wrong port",observed:"observed",missing:"missing"}[t]||t||"unknown"}function Pa(t){const s=(t==null?void 0:t.message)||"";return s.includes("~/.copilot/hooks")?'"chat.hookFilesLocations": { "~/.copilot/hooks": true }':s.includes(".github/hooks")?'"chat.hookFilesLocations": { ".github/hooks": true }':s.includes("chat.useHooks")?'"chat.useHooks": true':""}const Ea={active:"is-ok",configured:"is-ok",disabled:"is-warn",misconfigured:"is-warn",missing:"is-warn"};function ja({status:t}){const s=t.configured_events||[],e=t.missing_events||[],a=t.sources||[],n=t.warnings||[];return o`<div class="st-hookstat" data-testid="st-hookstat">
    <div class="st-hookstat__head">
      <span class=${"st-status "+(Ea[t.status]||"")} data-testid="st-hookstat-status"
        title=${t.status==="misconfigured"?"The hook commands post to a different port than this dashboard":void 0}>${La(t.status)}</span>
      <span>${t.configured_count||s.length} configured</span>
      ${e.length>0&&o`<span class="st-warn" title=${e.join(", ")}>${e.length} missing: ${e.join(", ")}</span>`}
      <span>${t.fired_24h||0} fired in 24 h</span>
      <span title=${t.last_fire_ts?new Date(t.last_fire_ts*1e3).toLocaleString():void 0}>last ${t.last_fire_ts?at(t.last_fire_ts):"never"}</span>
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
    ${n.map(l=>{const i=Pa(l);return o`<div key=${(l.path||"")+l.message} class="st-hookstat__warn" role="note">
        ${l.message}${i&&o`<code class="st-hookstat__snippet">${i}</code>`}
      </div>`})}
  </div>`}function Na(t,s){const e=G(t);if(s.filter(l=>G(l)===e).length<2)return e;const a=String(t).split(/[\\/]/).filter(Boolean);return a.length<2?e:(/^(Users|home)$/.test(a[0])&&a.length===4?"~/":"")+a[a.length-2]+"/"+e}function Fa({w:t}){const{entries:s,aictl:e,st:a}=t;return o`<nav class="st-nav" aria-label="Tools">
    <${P}>Tools</${P}>
    <ul class="st-nav__list">
      ${s.map(n=>{const l=n.id===t.toolId,i=n.rows.filter(l?t.passTool:t.pass),c=i.some(d=>d.risky);return o`<li key=${n.id}>
          <button type="button" class=${"st-nav__item"+(l?" is-on":"")+(i.length?"":" is-empty")}
            aria-current=${l?"true":void 0} data-tool=${n.id}
            onClick=${()=>t.set({tool:n.id,sec:"",row:"",scope:l?t.st.scope:""})}>
            <${q} id=${n.id}/><span class="st-nav__label">${n.label}</span>
            ${c&&o`<${ct} label="A risky setting is on"/>`}
            <span class="st-nav__n">${i.length}</span>
          </button>
          ${l&&o`<ul class="st-nav__subs">
            ${n.sections.map(d=>{const p=d.rows.filter(t.passTool),r=a.sec===d.id,h=d.id==="agents"?$e(p):"";return o`<li key=${d.id}><button type="button" class=${"st-nav__sub"+(r?" is-on":"")}
                aria-current=${r?"true":void 0}
                onClick=${()=>t.set({sec:r?"":d.id})}>
                <span class="st-nav__label">${d.title}</span>
                ${p.some(u=>u.risky)&&o`<${ct} label="A risky setting is on"/>`}
                <span class="st-nav__n">${p.length}</span>
                ${h&&o`<span class="st-nav__model" title=${"Every agent runs on "+h}>${h}</span>`}
              </button></li>`})}
          </ul>`}
        </li>`})}
      ${e&&o`<li key="aictl">
        <button type="button" class=${"st-nav__item"+(t.toolId==="aictl"?" is-on":"")}
          aria-current=${t.toolId==="aictl"?"true":void 0} data-tool="aictl"
          onClick=${()=>t.set({tool:"aictl",sec:"",row:"",scope:""})}>
          <${q} id="aictl"/><span class="st-nav__label">aictl</span>
          <span class="st-nav__n">${e.collectors.length}</span>
        </button>
      </li>`}
    </ul>
  </nav>`}function Ra({row:t,w:s,scopes:e}){var l;const a=((l=s.selected)==null?void 0:l.uid)===t.uid,n=()=>s.select({tool:t.tool,row:t.key});return o`<tr class=${"st-row"+(t.risky?" st-row--risky":"")+(t.unset?" st-row--unset":"")+(a?" is-sel":"")}
    data-key=${t.key} tabindex="0" onClick=${n}
    onKeyDown=${i=>{(i.key==="Enter"||i.key===" ")&&(i.preventDefault(),n())}}>
    <td class="st-c-set">
      <div class="st-label">${t.label}${t.undocumented&&o` <${vs}/>`}</div>
      ${t.risky&&t.tip&&o`<div class="st-risknote">${t.tip}</div>`}
    </td>
    <td class="st-c-val"><${kt} row=${t}/></td>
    <td class="st-c-scope"><${Z} scope=${t.scope} locked=${t.locked} label=${C(t.scope,e)}/></td>
    <td class="st-c-src"><${rt} path=${t.source} line=${t.line} w=${s}/></td>
    <td class="st-c-what" title=${t.tip||void 0}>${t.tip}</td>
  </tr>`}function qa({w:t,entry:s}){const e=s.scopes||[];if(!e.length)return null;const a=s.rows.filter(t.pass);return o`<div class="st-scopes" data-testid="st-scopes">
    <ol class="st-scopes__list" aria-label="Configuration layers, lowest precedence first">
      ${e.map((n,l)=>{const i=a.filter(r=>r.scope===n.id).length,c=t.st.scope===n.id,d=n.path?G(n.path):"",p=[n.label,n.paths.length?n.paths.join(`
`):"",n.exists?"":"not present",n.note,n.changeable?"":"Locked: cannot be changed from this machine"].filter(Boolean).join(`
`);return o`<li key=${n.id} class="st-scopes__item">
          ${l>0&&o`<span class="st-scopes__arrow" aria-hidden="true">→</span>`}
          <button type="button" class=${"st-scopechip"+(c?" is-on":"")+(n.changeable?"":" is-locked")+(n.exists?"":" is-absent")}
            data-scope=${n.id} aria-pressed=${c?"true":"false"} title=${p}
            onClick=${()=>t.set({scope:c?"":n.id})}>
            <span class="st-scopechip__top">
              ${!n.changeable&&o`<${pt}/><span class="st-sr">Locked: </span>`}
              <span class="st-scopechip__label">${n.label}</span>
              <span class="st-scopechip__n">${i}<span class="st-sr"> ${i===1?"setting wins":"settings win"} here</span></span>
            </span>
            <span class="st-scopechip__file">${n.exists?d||n.note:"not present"}</span>
          </button>
        </li>`})}
    </ol>
    <p class="st-hint st-scopes__legend">Later layers override earlier ones. Locked layers cannot be changed from this machine.</p>
  </div>`}function ns({children:t,section:s}){return o`<tr class="st-extra" data-extra=${s}><td colspan="5">${t}</td></tr>`}const as=t=>typeof t.value=="number"?t.value:t.value==null||t.value===""?void 0:mt(t.value);function za(t,s){return[{k:"setting",l:"Setting",cls:"st-c-set",get:e=>e.label},{k:"value",l:"Value",cls:"st-c-val",n:ms(t,as),get:as},{k:"scope",l:"Scope",cls:"st-c-scope",get:e=>e.scope?C(e.scope,s):void 0},{k:"source",l:"Set in",cls:"st-c-src",get:e=>e.source},{k:"what",l:"What it does",get:e=>e.tip}]}function Ia({w:t,sections:s,scopes:e,shared:a,extras:n={}}){const l=za(s.flatMap(c=>c.shown),e),i=E("settings.tool",l,a);return o`<table class=${"st-table "+i.tableProps.class} style=${i.tableProps.style}>
    <thead><tr>${l.map(i.th)}</tr></thead>
    ${s.map(c=>{const d=c.shown.filter(p=>p.risky).length;return o`<tbody key=${c.id} data-section=${c.id}>
        <tr class="st-group"><th scope="colgroup" colspan="5">${c.title}
          <span class="st-group__meta">${c.shown.length}${d?o` · <span class="st-red">${d} risky</span>`:""}${c.hidden?o` · <span class="st-unsetn">+${c.hidden} unset</span>`:""}</span></th></tr>
        ${n[c.id]&&o`<${ns} section=${c.id}>${n[c.id]}</${ns}>`}
        ${i.order(c.shown).map(p=>o`<${Ra} key=${p.uid} row=${p} w=${t} scopes=${e}/>`)}
      </tbody>`})}
  </table>`}function Da(t){const s=[];for(const e of t){const a=e.id==="agents"&&e.shown.every(l=>l.kind==="agent"&&l.agent),n=s[s.length-1];a?s.push({agents:!0,sections:[e]}):n&&!n.agents?n.sections.push(e):s.push({agents:!1,sections:[e]})}return s}function Wa({w:t,entry:s}){const e=We("settings.tool"),a=s.sections.filter(p=>!t.st.sec||p.id===t.st.sec).map(p=>({...p,shown:p.rows.filter(t.passTool),hidden:t.showUnset?0:p.rows.filter(r=>r.unset&&t.passAll(r)&&(!t.st.scope||r.scope===t.st.scope)).length})).filter(p=>p.shown.length||p.hidden),n=s.rows.length,l=Ss(s),i=Ta(t.hooks,s.id),c={autonomy:l&&o`<${Ma} w=${t} entry=${s} perms=${l}/>`,hooks:i&&o`<${ja} status=${i}/>`},d=t.st.scope?C(t.st.scope,s.scopes):"";return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${q} id=${s.id} big/>
      <h2 class="st-bar__title" id="st-main-title">${s.label}</h2>
      <span class="st-bar__sub">${n} ${n===1?"setting":"settings"} in ${s.files.length} ${s.files.length===1?"file":"files"}${s.risky?o` · <span class="st-red">${s.risky} risky</span>`:""}</span>
      <span class="st-bar__files">
        ${s.files.map(p=>o`<button type="button" key=${p} class="st-chip st-chip--mono st-chip--btn" title=${p}
          onClick=${()=>t.openAt(p)}>${Na(p,s.files)}</button>`)}
      </span>
    </div>
    ${s.id==="vscode"&&o`<p class="st-note">chat.* settings, used by every AI tool in VS Code</p>`}
    ${s.hints.map((p,r)=>o`<p key=${r} class="st-note">${p}</p>`)}
    <${qa} w=${t} entry=${s}/>
    ${a.length?Da(a).map((p,r)=>p.agents?o`<${Zn} key=${"a"+r} w=${t} section=${p.sections[0]}/>`:o`<${Ia} key=${"g"+r} w=${t} sections=${p.sections} scopes=${s.scopes} shared=${e} extras=${c}/>`):o`<p class="st-empty">${n?d?`No setting shown here is set at the ${d} layer.`:"No setting matches the search or the toggles.":"No settings were read for this tool."}</p>`}
  </section>`}const os=[{k:"collector",l:"Collector",cls:"st-c-set",get:t=>t.name},{k:"mode",l:"Mode",get:t=>t.mode},{k:"status",l:"Status",get:t=>t.status},{k:"detail",l:"Detail",get:t=>t.detail}];function Ba({w:t,aictl:s}){const e=E("settings.collectors",os),a=t.q.trim().toLowerCase(),n=s.collectors.filter(i=>!a||[i.name,i.mode,i.status,i.detail].join(" ").toLowerCase().includes(a)),l=s.roots.filter(i=>!a||i.toLowerCase().includes(a));return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${q} id="aictl" big/>
      <h2 class="st-bar__title" id="st-main-title">aictl</h2>
      <span class="st-bar__sub">monitoring engine · ${s.collectors.length} collectors · ${s.roots.length} monitored roots</span>
    </div>
    ${n.length>0&&o`<table class=${"st-table "+e.tableProps.class} style=${e.tableProps.style}>
      <thead><tr>${os.map(e.th)}</tr></thead>
      <tbody>
        <tr class="st-group"><th scope="colgroup" colspan="4">Collectors<span class="st-group__meta">${n.length}</span></th></tr>
        ${e.order(n).map(i=>o`<tr key=${i.name} class="st-row st-row--static">
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
  </section>`}function Ts(t){if(t.st.sec&&At.includes(t.st.sec))return t.st.sec;const s=e=>t.entries.some(a=>a.rows.some(n=>n.sec===e));return s("autonomy")?"autonomy":At.find(s)||"autonomy"}function Va({w:t}){const s=Ts(t);return o`<nav class="st-nav" aria-label="Topics">
    <${P}>Topics</${P}>
    <ul class="st-nav__list">
      ${At.map(e=>{const a=t.entries.filter(i=>i.rows.some(c=>c.sec===e&&t.pass(c))),n=a.some(i=>i.rows.some(c=>c.sec===e&&c.risky&&t.pass(c))),l=e===s;return o`<li key=${e}><button type="button" class=${"st-nav__item"+(l?" is-on":"")+(a.length?"":" is-empty")}
          aria-current=${l?"true":void 0} data-sec=${e}
          onClick=${()=>t.set({sec:e})}>
          <span class="st-nav__label">${jt[e]}</span>
          ${n&&o`<${ct} label="A risky setting is on"/>`}
          <span class="st-nav__n">${a.length} ${a.length===1?"tool":"tools"}</span>
        </button></li>`})}
    </ul>
  </nav>`}function Ha({w:t}){const[s,e]=w("tool"),a=t.entries.flatMap(c=>c.rows.filter(d=>d.sec==="agents"&&hs(d))),n=a.filter(t.pass),l=new Set(n.map(c=>c.tool)).size,i=n.filter(dt).length;return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${jt.agents}</h2>
      <span class="st-bar__sub" data-testid="st-agents-count">${n.length} ${n.length===1?"agent":"agents"} in ${l} ${l===1?"tool":"tools"}, ${i} inherit the session model</span>
    </div>
    ${n.length?o`<${Yn} w=${t} rows=${n} sort=${s} onSort=${e}/>
      <p class="st-hint">Click an agent for its model decision, its tools and the files that define it.</p>`:o`<p class="st-empty">${a.length?"No agent matches the search or the toggles.":"No tool reports agents."}</p>`}
  </section>`}function ls(t,s,e){const a=t.cells[s];if(!(!a||a.unset&&!e))return typeof a.value=="number"?a.value:a.value==null||a.value===""?void 0:mt(a.value)}function Ua({w:t,tools:s,rows:e}){const a=[{k:"setting",l:"Setting",cls:"st-c-set",get:l=>l.label},...s.map(l=>({k:l.id,cls:"st-matrix__tool",attrs:{"data-tool":l.id},n:ms(e,i=>ls(i,l.id,t.showUnset)),l:o`<span class="st-matrix__toolname"><${q} id=${l.id}/>${l.label}</span>`,get:i=>ls(i,l.id,t.showUnset)}))],n=E("settings.topic",a);return o`<div class="st-scroll"><table class=${"st-table st-matrix "+n.tableProps.class} style=${n.tableProps.style}>
      <thead><tr>${a.map(n.th)}</tr></thead>
      <tbody>
        ${n.order(e).map(l=>o`<tr key=${l.id} class="st-row st-row--static">
          <th scope="row" class="st-c-set" title=${l.keys.join(`
`)}>${l.label}</th>
          ${s.map(i=>{var p;const c=l.cells[i.id];if(!c||c.unset&&!t.showUnset)return o`<td key=${i.id} class="st-cell st-cell--none">—</td>`;const d=((p=t.selected)==null?void 0:p.uid)===c.uid;return o`<td key=${i.id} class=${"st-cell"+(c.risky?" is-risky":"")+(c.unset?" is-unset":"")+(d?" is-sel":"")}>
              <button type="button" class="st-cellbtn" data-key=${c.key}
                aria-label=${`${l.label}, ${i.label}: ${mt(c.value)}${c.unset?" (not set, default)":""}`}
                onClick=${()=>t.select({tool:i.id,row:c.key})}>
                <${kt} row=${c} compact/>
              </button>
            </td>`})}
        </tr>`)}
      </tbody>
    </table></div>`}function Ga({w:t}){const s=Ts(t);if(s==="agents")return o`<${Ha} w=${t}/>`;const{tools:e,rows:a}=fe(t.entries,s,t.pass),n=a.reduce((i,c)=>i+Object.values(c.cells).filter(d=>d.risky).length,0),l=s==="autonomy"?ba(t.entries):[];return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${jt[s]}</h2>
      <span class="st-bar__sub">every tool, side by side${n?o` · <span class="st-red">${n} risky ${n===1?"value":"values"}</span>`:""}</span>
    </div>
    <${Oa} w=${t} mats=${l}/>
    ${a.length?o`<${Ua} w=${t} tools=${e} rows=${a}/>
    <p class="st-hint">A cell is one setting in one tool. Click it for the file, the scope and the override chain.</p>`:o`<p class="st-empty">${e.length?"No setting matches the search or the toggles.":"No tool has settings in this section."}</p>`}
  </section>`}const Ka=8,Ls=86400,yt=8;function zt(t){const s=t.cell?t.cell.split(":"):null;return{loc:D(t.sec),tools:D(t.tool),purpose:D(t.purpose),scope:D(t.fscope),git:D(t.git),recent:!!t.recent,cell:s&&s.length===2?s:null}}function Za(t,s,e,a){return!(e!=="loc"&&s.loc.length&&!s.loc.includes(t.location)||e!=="tools"&&s.tools.length&&!t.tools.some(n=>s.tools.includes(n))||e!=="purpose"&&s.purpose.length&&!s.purpose.includes(R(t))||e!=="scope"&&s.scope.length&&!s.scope.includes(t.scope)||e!=="git"&&s.git.length&&!s.git.includes(Nt(t))||e!=="recent"&&s.recent&&!(t.mtime&&t.mtime>=a-Ls)||e!=="cell"&&s.cell&&(R(t)!==s.cell[0]||t.location!==s.cell[1]))}function gt(t,s=null,e=Date.now()/1e3){const a=zt(t.st);return t.files.filter(n=>be(n,t.q)&&Za(n,a,s,e))}function H(t,s,e){const a=D(t.st[s]);t.set({[s]:we(a.includes(e)?a.filter(n=>n!==e):[...a,e]),row:""})}function et({w:t,title:s,fkey:e,skip:a,options:n,valueOf:l,attr:i,swatch:c}){const d=gt(t,a),p=D(t.st[e]),r=n.map(h=>({...h,n:d.filter(u=>l(u).includes(h.id)).length})).filter(h=>h.n||p.includes(h.id)||h.always);return r.length?o`<${P}>${s}</${P}>
    <ul class="st-nav__list" aria-label=${s}>
      ${r.map(h=>{const u=p.includes(h.id);return o`<li key=${h.id}><button type="button" class=${"st-nav__item"+(u?" is-on":"")+(h.n?"":" is-empty")}
          aria-pressed=${u?"true":"false"} ...${{[i]:h.id}} onClick=${()=>H(t,e,h.id)}>
          ${c?o`<${q} id=${h.id}/>`:null}<span class="st-nav__label">${h.label}</span><span class="st-nav__n">${h.n}</span></button></li>`})}
    </ul>`:null}function Ja({w:t}){const s=[...new Set(t.files.flatMap(n=>n.tools))],e=[...new Set(t.files.map(n=>n.scope).filter(Boolean))],a=gt(t,"recent").filter(n=>n.mtime&&n.mtime>=Date.now()/1e3-Ls).length;return o`<nav class="st-nav" aria-label="File filters">
    <${et} w=${t} title="Locations" fkey="sec" skip="loc" attr="data-loc" options=${ke.map(n=>({...n,always:!0}))} valueOf=${n=>[n.location]}/>
    <${et} w=${t} title="Purpose" fkey="purpose" skip="purpose" attr="data-purpose" options=${ye} valueOf=${n=>[R(n)]}/>
    <${et} w=${t} title="Read by" fkey="tool" skip="tools" attr="data-tool" swatch=${!0}
      options=${s.map(n=>({id:n,label:t.labelOf(n)}))} valueOf=${n=>n.tools}/>
    <${et} w=${t} title="Scope" fkey="fscope" skip="scope" attr="data-scope"
      options=${e.map(n=>({id:n,label:fs[n]||n}))} valueOf=${n=>[n.scope]}/>
    <${et} w=${t} title="Git" fkey="git" skip="git" attr="data-git" options=${$s} valueOf=${n=>[Nt(n)]}/>
    <${P}>Changes</${P}>
    <ul class="st-nav__list">
      <li><button type="button" class=${"st-nav__item"+(t.st.recent?" is-on":"")} aria-pressed=${t.st.recent?"true":"false"}
        data-recent="1" onClick=${()=>t.set({recent:!t.st.recent,row:""})}>
        <span class="st-nav__label">Changed in the last 24 h</span><span class="st-nav__n">${a}</span></button></li>
    </ul>
  </nav>`}function Ya({w:t}){const s=zt(t.st),e=[...s.loc.map(a=>({k:"sec:"+a,label:"Location: "+(Zt[a]||a),drop:()=>H(t,"sec",a)})),...s.purpose.map(a=>({k:"purpose:"+a,label:"Purpose: "+(K[a]||a),drop:()=>H(t,"purpose",a)})),...s.tools.map(a=>({k:"tool:"+a,label:"Read by: "+t.labelOf(a),drop:()=>H(t,"tool",a)})),...s.scope.map(a=>({k:"fscope:"+a,label:"Scope: "+(fs[a]||a),drop:()=>H(t,"fscope",a)})),...s.git.map(a=>{var n;return{k:"git:"+a,label:"Git: "+(((n=$s.find(l=>l.id===a))==null?void 0:n.label)||a),drop:()=>H(t,"git",a)}}),...s.recent?[{k:"recent",label:"Changed in the last 24 h",drop:()=>t.set({recent:!1,row:""})}]:[],...s.cell?[{k:"cell",label:(K[s.cell[0]]||s.cell[0])+" in "+(Zt[s.cell[1]]||s.cell[1]),drop:()=>t.set({cell:"",row:""})}]:[]];return e.length?o`<div class="st-fchips" data-testid="st-file-chips">
    ${e.map(a=>o`<button key=${a.k} type="button" class="st-chip st-chip--btn" data-chip=${a.k}
      aria-label=${"Remove the filter "+a.label} onClick=${a.drop}>${a.label} <span aria-hidden="true">×</span></button>`)}
    <button type="button" class="st-link" onClick=${()=>t.set({sec:"",tool:"",purpose:"",fscope:"",git:"",recent:!1,cell:"",row:""})}>Clear filters</button>
  </div>`:null}function Qa({w:t}){const s=ve(gt(t,"cell").filter(n=>!n.is_dir)),e=[{k:"purpose",l:"Purpose",get:n=>n.label},...s.cols.map(n=>({k:n.id,l:n.label,cls:"st-num",n:!0,get:l=>l.cells[n.id]||void 0})),{k:"all",l:"All",cls:"st-num",n:!0,get:n=>n.total||void 0}],a=E("settings.files.matrix",e);return s.rows.length?o`<div class="st-scroll"><table class=${"st-table st-fmatrix "+a.tableProps.class} style=${a.tableProps.style} data-testid="st-file-matrix">
    <caption class="st-sr">Files by purpose and location</caption>
    <thead><tr>${e.map(a.th)}</tr></thead>
    <tbody>${a.order(s.rows).map(n=>o`<tr key=${n.id}>
      <th scope="row">${n.label}</th>
      ${s.cols.map(l=>{const i=n.cells[l.id]||0,c=n.id+":"+l.id,d=t.st.cell===c;return o`<td key=${l.id} class=${"st-cell st-num"+(d?" is-sel":"")}>${i?o`<button type="button" class="st-cellbtn" data-cell=${c} aria-pressed=${d?"true":"false"}
              aria-label=${i+" "+n.label+" "+(i===1?"file":"files")+" in "+l.label}
              onClick=${()=>t.set({cell:d?"":c,row:""})}>${i}</button>`:o`<span class="st-dim" aria-hidden="true">·</span>`}</td>`})}
      <td class="st-num st-dim">${n.total}</td>
    </tr>`)}</tbody>
  </table></div>`:null}function Xa({f:t,w:s}){const e=s.selectedFile&&s.selectedFile.path===t.path,a=()=>s.select({row:t.path}),n=xe(t);return o`<tr class=${"st-row"+(e?" is-sel":"")+(t.exists===!1?" is-missing":"")}
    data-path=${t.path} tabindex="0" onClick=${a}
    onKeyDown=${l=>{(l.key==="Enter"||l.key===" ")&&(l.preventDefault(),a())}}>
    <td class="st-c-file">
      ${t.is_dir?o`<span class="st-fname" title=${t.path}>${t.name}/</span>`:o`<button type="button" class="st-fname st-link" title=${"Open "+t.path}
            onClick=${l=>{l.stopPropagation(),s.openAt(t.path)}}>${t.name}</button>`}
      ${t.exists===!1&&o`<span class="st-hint"> missing</span>`}
    </td>
    <td><span class="st-chip" data-kind=${R(t)}>${t.is_dir?"Folder":K[R(t)]}</span></td>
    <td><${Z} scope=${t.scope}/></td>
    <td><span class="st-tools">${t.tools.map(l=>o`<${B} key=${l} id=${l} label=${s.labelOf(l)}/>`)}</span></td>
    <td class="st-mono st-num">${t.settings?t.settings:"—"}</td>
    <td class="st-mono st-num">${!t.is_dir&&t.bytes!=null?Pt(t.bytes):"—"}</td>
    <td class=${n?"st-warn":"st-dim"} data-git=${Nt(t)||void 0}
      title=${n?"A tool always loads this file, and git does not track it":void 0}>${t.git_state||"—"}</td>
    <td class="st-dim">${t.mtime?at(t.mtime):"—"}</td>
  </tr>`}function to(t){const s=zt(t.st);if(s.loc.length||s.purpose.length||s.scope.length||s.git.length||s.recent||s.cell)return[];const e=t.q.trim().toLowerCase();return(t.managedAbsent||[]).filter(a=>(!e||[a.path,a.label,a.note].join(`
`).toLowerCase().includes(e))&&(!s.tools.length||a.tools.some(n=>s.tools.includes(n))))}function so({w:t,items:s}){const[e,a]=w(!1);return o`<tbody class="st-absent" data-root="managed-absent">
    <tr class="st-group"><th scope="colgroup" colspan=${yt}>
      <button type="button" class="st-fold" aria-expanded=${e?"true":"false"} onClick=${()=>a(!e)}>
        <span aria-hidden="true">${e?"▾":"▸"}</span><span>Managed locations (not present)</span></button>
      <span class="st-group__meta">${s.length} ${s.length===1?"location":"locations"} · where a policy would come from</span>
    </th></tr>
    ${e&&s.map(n=>o`<tr key=${n.path} class="st-row st-row--static st-row--absent" data-path=${n.path}>
      <td class="st-c-file"><span class="st-fname" title=${n.path+(n.note?`
`+n.note:"")}>${W(n.path)}</span>
        <span class="st-hint"> not present</span></td>
      <td class="st-dim">—</td>
      <td><span class="st-scopewrap"><${pt} label="Cannot be changed from this machine"/><${Z} scope=${n.scope}/></span></td>
      <td><span class="st-tools">${n.tools.map(l=>o`<${B} key=${l} id=${l} label=${t.labelOf(l)}/>`)}</span></td>
      <td class="st-mono st-num">—</td><td class="st-mono st-num">—</td><td class="st-dim">—</td><td class="st-dim">—</td>
    </tr>`)}
  </tbody>`}function eo(t,s){const e=t.filter(l=>!l.is_dir),a=t.filter(l=>l.is_dir),n=s==="purpose"?me(e).map(l=>({key:"purpose:"+l.id,attrs:{"data-purpose":l.id},title:l.label,mono:!1,root:null,files:l.files})):ge(e).map(l=>({key:l.root,attrs:{"data-root":l.root},title:W(l.root),full:l.root,mono:!0,root:l.root,sub:ys[l.location]||"Other",files:l.files}));return a.length&&n.push({key:"watched",attrs:{"data-root":"watched"},title:"Watched folders",mono:!1,root:null,flat:!0,sub:"folders the monitor reads",files:a}),n}function no({g:t,w:s,open:e,setOpen:a,shut:n,setShut:l,grid:i}){const c=!!n[t.key],d=[...new Set(t.files.flatMap(h=>h.tools))],p=t.files.reduce((h,u)=>h+(u.is_dir?0:Number(u.bytes)||0),0),r=(t.flat?[{dir:"",files:t.files}]:_e(t.files)).map(h=>({...h,files:i.order(h.files)}));return t.root&&r.sort((h,u)=>(u.dir===t.root)-(h.dir===t.root)),o`<tbody ...${t.attrs}>
    <tr class="st-group"><th scope="colgroup" colspan=${yt}>
      <button type="button" class="st-fold" aria-expanded=${c?"false":"true"}
        onClick=${()=>l({...n,[t.key]:!c})}>
        <span aria-hidden="true">${c?"▸":"▾"}</span>
        <span class=${t.mono?"st-mono":""} title=${t.full||void 0}>${t.title}</span></button>
      <span class="st-group__meta">${t.sub?t.sub+" · ":""}${t.files.length} ${t.files.length===1?"file":"files"}${p?" · "+Pt(p):""}</span>
      ${d.length>0&&o`<span class="st-tools st-group__tools">${d.map(h=>o`<${B} key=${h} id=${h} label=${s.labelOf(h)}/>`)}</span>`}
    </th></tr>
    ${!c&&r.map(h=>{const u=t.key+"|"+h.dir,f=e[u]?h.files:h.files.slice(0,Ka),$=h.files.length-f.length;return o`<${Ut} key=${u}>
        ${h.dir&&h.dir!==t.root&&o`<tr class="st-folder" data-dir=${h.dir}><td colspan=${yt}>
          <span class="st-mono st-path" title=${h.dir}>${W(h.dir)}</span><span class="st-dim"> · ${h.files.length}</span></td></tr>`}
        ${f.map(_=>o`<${Xa} key=${_.path} f=${_} w=${s}/>`)}
        ${$>0&&o`<tr class="st-morerow"><td colspan=${yt}>
          <button type="button" class="st-link st-more" onClick=${()=>a({...e,[u]:!0})}>▸ ${$} more</button>
        </td></tr>`}
      </${Ut}>`})}
  </tbody>`}const ao=[{value:"location",label:"By location"},{value:"purpose",label:"By purpose"}],oo=t=>{if(!t.mtime)return;const s=Number(t.mtime);return s>0?s:typeof t.mtime=="string"&&Date.parse(t.mtime)||void 0};function is(t){return[{k:"file",l:"File",cls:"st-c-file",get:s=>s.name},{k:"purpose",l:"Purpose",get:s=>s.is_dir?"Folder":K[R(s)]},{k:"scope",l:"Scope",get:s=>s.scope},{k:"readby",l:"Read by",get:s=>s.tools.map(t.labelOf).join(", ")},{k:"settings",l:"Settings",cls:"st-num",n:!0,get:s=>s.settings||void 0},{k:"size",l:"Size",cls:"st-num",n:!0,get:s=>s.is_dir||s.bytes==null?void 0:Number(s.bytes)},{k:"git",l:"Git",get:s=>s.git_state},{k:"changed",l:"Last change",n:!0,get:oo}]}function lo({w:t}){const s=E("settings.files",is(t)),[e,a]=w({}),[n,l]=w({}),i=gt(t),c=t.st.group==="purpose"?"purpose":"location",d=eo(i,c),p=to(t);return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Files aictl reads</h2>
      <span class="st-bar__sub">${i.length} ${i.length===1?"file":"files"} · grouped by ${c==="purpose"?"what they are for":"where they live"}</span>
      <div class="st-seg st-bar__end" role="group" aria-label="Group the files">
        ${ao.map(r=>o`<button key=${r.value} type="button" class="st-seg__btn" aria-pressed=${c===r.value?"true":"false"}
          onClick=${()=>t.set({group:r.value})}>${r.label}</button>`)}
      </div>
    </div>
    ${t.filesStatus!=="ready"&&o`<p class="st-note" role="status">File details are loading</p>`}
    <${Qa} w=${t}/>
    <${Ya} w=${t}/>
    ${d.length||p.length?o`<div class="st-scroll"><table class=${"st-table st-files "+s.tableProps.class} style=${s.tableProps.style}>
      <thead><tr>${is(t).map(s.th)}</tr></thead>
      ${d.map(r=>o`<${no} key=${r.key} g=${r} w=${t} open=${e} setOpen=${a} shut=${n} setShut=${l} grid=${s}/>`)}
      ${p.length>0&&o`<${so} w=${t} items=${p}/>`}
    </table></div>`:o`<p class="st-empty">${t.files.length?"No file matches the search or the filters.":"No settings files were found."}</p>`}
  </section>`}const io=5;function Ps(t,s){return t?W(t)+(s>0?":"+s:""):"—"}function co({w:t}){const s=ks(t.findings.filter(e=>bs(e,t.q)));return o`<nav class="st-nav" aria-label="Finding rules">
    <${P}>Finding rules</${P}>
    <ul class="st-nav__list">
      <li><button type="button" class=${"st-nav__item"+(t.st.sec?"":" is-on")} aria-current=${t.st.sec?void 0:"true"}
        onClick=${()=>t.set({sec:"",row:""})}>
        <span class="st-dotspace" aria-hidden="true"></span><span class="st-nav__label">All rules</span>
        <span class="st-nav__n">${s.reduce((e,a)=>e+a.count,0)}</span></button></li>
      ${s.map(e=>{const a=t.st.sec===e.rule;return o`<li key=${e.rule}><button type="button" class=${"st-nav__item"+(a?" is-on":"")}
          aria-current=${a?"true":void 0} data-rule=${e.rule}
          onClick=${()=>t.set({sec:a?"":e.rule,row:""})}>
          ${e.alarm?o`<${ct} label=${e.severity+" severity"}/>`:o`<span class="st-dotspace" aria-hidden="true"></span>`}
          <span class="st-nav__label">${e.label}</span><span class="st-nav__n">${e.count}</span></button></li>`})}
    </ul>
  </nav>`}function ro({f:t,group:s,w:e}){const a=e.selectedFinding&&e.selectedFinding.id===t.id,n=()=>e.select({row:t.id,sec:e.st.sec}),l=s.why&&t.why===s.why?t.action||"":t.why||t.action||"",i=Ft(t).map(e.labelOf).join(", ")||(t.session_id?"session "+t.session_id:"—");return o`<tr class=${"st-row"+(a?" is-sel":"")+(t.severity==="high"||t.severity==="medium"?" st-row--risky":"")}
    data-id=${t.id} tabindex="0" onClick=${n}
    onKeyDown=${c=>{(c.key==="Enter"||c.key===" ")&&(c.preventDefault(),n())}}>
    <td class="st-c-tool">${i}</td>
    <td class="st-c-where st-mono" title=${t.path?t.path+(t.line>0?":"+t.line:""):void 0}>
      ${Ps(t.path,t.line)}${t.count>1?o` <span class="st-dim">×${t.count}</span>`:""}</td>
    <td class="st-c-what" title=${[t.why,t.action].filter(Boolean).join(`
`)||void 0}>${l}</td>
    <td class="st-c-act">${t.path&&o`<button type="button" class="st-chip st-chip--btn"
      onClick=${c=>{c.stopPropagation(),e.openAt(t.path,t.line)}}>Show the line</button>`}</td>
  </tr>`}function cs(t){return[{k:"tool",l:"Tool",cls:"st-c-tool",get:e=>Ft(e).map(t.labelOf).join(", ")},{k:"where",l:"Where",cls:"st-c-where",get:e=>e.path?W(e.path)+String(e.line>0?e.line:0).padStart(8,"0"):void 0},{k:"what",l:"What it does",get:e=>e.why||e.action},{k:"action",l:o`<span class="st-sr">Action</span>`,cls:"st-c-act"}]}function po({w:t}){var r,h;const s=E("settings.findings",cs(t)),[e,a]=w({});if(t.auditStatus==="loading"&&!t.audit){const u=t.scan;return o`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note" role="status" aria-busy="true" data-state="scanning">Scanning context sources…${u?" "+(u.step||"")+(u.elapsed_s!=null?", "+Math.round(u.elapsed_s)+" s":""):""}</p>
    </section>`}if(t.auditStatus==="error"&&!t.audit)return o`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note st-red" role="alert">The context audit failed: ${t.auditError}
        ${t.rescan&&o` <button type="button" class="st-btn" onClick=${()=>t.rescan()}>Retry</button>`}</p>
    </section>`;const n=t.findings.filter(u=>bs(u,t.q)),l=ks(n).filter(u=>!t.st.sec||u.rule===t.st.sec),i=l.reduce((u,f)=>u+f.count,0),c=t.auditStatus==="loading",d=((r=t.audit)==null?void 0:r.incomplete)||[],p=((h=t.audit)==null?void 0:h.failed_steps)||[];return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Findings</h2>
      <span class="st-bar__sub">${i} in ${l.length} ${l.length===1?"rule":"rules"} · hidden changes, conflicts and settings outside this project</span>
      ${t.rescan&&o`<button type="button" class="st-chip st-chip--btn st-bar__end" disabled=${c}
        onClick=${()=>t.rescan()}>${c?"Scanning…":"Rescan"}</button>`}
    </div>
    ${c&&o`<p class="st-note" role="status" data-state="rescanning">Scanning again…${t.scan?" "+(t.scan.step||"")+(t.scan.elapsed_s!=null?", "+Math.round(t.scan.elapsed_s)+" s":""):""} The last results stay until it ends.</p>`}
    ${t.auditStatus==="error"&&o`<p class="st-note st-red" role="alert">The last scan failed: ${t.auditError}. These are the earlier results.</p>`}
    ${d.length>0&&o`<p class="st-note st-warn">The scan reached its time limit and skipped: ${d.join(", ")}.</p>`}
    ${p.length>0&&o`<p class="st-note st-warn">The scan could not read: ${p.map(u=>u.step+" ("+u.error+")").join(", ")}.</p>`}
    ${l.length?o`<table class=${"st-table st-findings "+s.tableProps.class} style=${s.tableProps.style}>
      <thead><tr>${cs(t).map(s.th)}</tr></thead>
      ${l.map(u=>{const f=!!e[u.rule],$=s.order(u.items),_=f?$:$.slice(0,io),S=$.length-_.length;return o`<tbody key=${u.rule} data-rule=${u.rule}>
          <tr class="st-group"><th scope="colgroup" colspan="4">
            ${u.alarm&&o`<${ct} label=${u.severity+" severity"}/>`} ${u.label}
            <span class="st-group__meta">${u.count} · ${u.tools.map(t.labelOf).join(", ")||"no tool"}${u.why?" · "+u.why:""}</span>
          </th></tr>
          ${_.map(j=>o`<${ro} key=${j.id} f=${j} group=${u} w=${t}/>`)}
          ${S>0&&o`<tr class="st-morerow"><td colspan="4">
            <button type="button" class="st-link st-more" onClick=${()=>a({...e,[u.rule]:!0})}>▸ ${S} more</button>
          </td></tr>`}
        </tbody>`})}
    </table>`:o`<p class="st-empty">${t.findings.length?"No finding matches the search.":"No findings for the selected tools."}</p>`}
  </section>`}const I=[{id:"allow",label:"Allow",hint:"run without asking"},{id:"deny",label:"Deny",hint:"always refused"},{id:"ask",label:"Ask",hint:"always ask first"}];function rs(t){return String((t==null?void 0:t.message)||t||"").replace(/^HTTP \d+ \S+: /,"")||"The request failed"}const St=t=>Object.fromEntries(I.map(s=>{var e;return[s.id,xa((e=t==null?void 0:t.permissions)==null?void 0:e[s.id])]}));function uo({title:t,diff:s}){const e=s.added.length||s.removed.length;return o`<div class="st-diff" data-bucket=${t}>
    <span class="st-diff__name">${t}</span>
    <span class="st-diff__chips">
      ${e?o`${s.added.map(a=>o`<code key=${"a"+a} class="st-diff__chip is-added">+ ${a}</code>`)}
          ${s.removed.map(a=>o`<code key=${"r"+a} class="st-diff__chip is-removed">- ${a}</code>`)}`:o`<span class="st-dim">no change</span>`}
    </span>
  </div>`}function ho({tool:t,target:s,refresh:e,onClose:a}){const[n,l]=w(null),[i,c]=w(()=>St(null)),[d,p]=w(!0),[r,h]=w(!1),[u,f]=w(null),[$,_]=w(null),S=F(()=>{let k=!0;return p(!0),f(null),oe(t,s.scope).then(x=>{k&&(l(x),c(St(x)),p(!1))},x=>{k&&(f({message:rs(x),conflict:!0}),p(!1))}),()=>{k=!1}},[t,s.scope]);ot(()=>S(),[S]);const j=Object.fromEntries(I.map(k=>[k.id,Ca(i[k.id])])),A=Object.fromEntries(I.map(k=>{var x;return[k.id,((x=n==null?void 0:n.permissions)==null?void 0:x[k.id])||[]]})),vt=Object.fromEntries(I.map(k=>[k.id,Sa(A[k.id],j[k.id])])),N=I.some(k=>JSON.stringify(A[k.id])!==JSON.stringify(j[k.id])),_t=JSON.stringify({permissions:j},null,2),ut=(n==null?void 0:n.path)||s.path,J=()=>{h(!0),f(null),_(null),le(t,{scope:s.scope,expected_mtime:(n==null?void 0:n.mtime)??null,permissions:j}).then(k=>{l(k),c(St(k)),_({backup:(k==null?void 0:k.backup_path)||""}),h(!1),typeof e=="function"&&e()},k=>{f({message:rs(k),conflict:(k==null?void 0:k.status)===409}),h(!1)})},ht=()=>{_(null),S()};return o`<section class="st-insp__sec st-editor" data-testid="st-perm-editor" aria-label="Edit permissions">
    <h4 class="st-insp__h">Edit permissions · ${s.label}</h4>
    <p class="st-hint st-editor__target" data-testid="st-editor-target">
      Writes <span class="st-mono" title=${ut}>${ut}</span> (${s.label})${n&&!n.exists?", a new file":""}
    </p>
    ${u&&o`<div class="st-editor__error" role="alert" data-testid="st-editor-error">
      <span>${u.message}</span>
      ${u.conflict&&o`<button type="button" class="st-btn" onClick=${ht}>Reload</button>`}
    </div>`}
    ${$&&o`<div class="st-editor__saved" role="status" data-testid="st-editor-saved">
      ${$.backup?o`Saved. Backup: <span class="st-mono" title=${$.backup}>${$.backup}</span>`:"Saved. The file was new, so there is no backup."}
    </div>`}
    ${d?o`<p class="st-hint">Loading the file…</p>`:n&&o`
      <div class="st-editor__fields">
        ${I.map(k=>o`<label key=${k.id} class="st-editor__field">
          <span class="st-editor__label">${k.label} <span class="st-dim">· ${k.hint}, one rule per line</span></span>
          <textarea class="st-editor__area" data-bucket=${k.id} rows="4" spellcheck="false" value=${i[k.id]}
            onInput=${x=>c({...i,[k.id]:x.currentTarget.value})}></textarea>
        </label>`)}
      </div>
      <div class="st-editor__diff" data-testid="st-editor-diff">
        <div class="st-insp__h">Pending diff</div>
        ${I.map(k=>o`<${uo} key=${k.id} title=${k.id} diff=${vt[k.id]}/>`)}
      </div>
      <pre class="st-editor__json" data-testid="st-editor-json">${_t}</pre>`}
    <div class="st-actions">
      <button type="button" class="st-btn st-btn--primary" onClick=${J} disabled=${d||r||!n||!N}>${r?"Saving…":"Save"}</button>
      <button type="button" class="st-btn" onClick=${a}>Cancel</button>
    </div>
  </section>`}function m({title:t,children:s}){return o`<section class="st-insp__sec"><h4 class="st-insp__h">${t}</h4>${s}</section>`}function It(t,s){return"Open "+G(t)+(s>0?" at line "+s:"")}function Es(t,s){return s?t.findings.filter(e=>lt(e.path,s)):[]}function js(t,s){t.set({view:"findings",sec:s.rule||"",row:s.id,tool:""})}function Ns({w:t,path:s}){const e=s&&t.recentFiles&&typeof t.recentFiles.get=="function"?t.recentFiles.get(s):null,a=s?t.mtimeOf(s):null,n=[];return e?n.push(`File changed ${at(e.ts)}${e.tool?" by "+t.labelOf(e.tool):""} (file history)`):a&&n.push(`File last changed ${at(a)} (file history)`),o`<div class="st-hint" data-testid="st-history">${n.length?n.join(" · ")+" · no aictl change recorded":"No aictl change recorded"}</div>`}function $o(t,s){var a;const e=(a=t.chain)==null?void 0:a[t.wins];return t.locked||Et(e,s)?"Locked by "+C(t.locked?t.scope:e.scope,s):Ms}function fo(t,s){const e=Ae(s);return`Not set in any file. Default: ${mt(t.value)}.`+(e?` Set it in ${W(e.path)} (${e.label}).`:"")}function yo({w:t,row:s}){const e=t.scopesOf(s.tool),a=t.entries.filter(h=>h.id!==s.tool&&s.source&&h.files.some(u=>lt(u,s.source))).map(h=>h.label),n=s.source?t.files.find(h=>lt(h.path,s.source)):null;for(const h of(n==null?void 0:n.tools)||[]){const u=t.labelOf(h);h!==s.tool&&!a.includes(u)&&a.push(u)}const l=Es(t,s.source),{chain:i,wins:c}=s,d=wa(s,e),[p,r]=w(!1);return o`<div class="st-insp__body" data-testid="st-inspector-row">
    <h3 class="st-insp__title">${s.label}</h3>
    <div class="st-insp__key st-mono">${s.key}</div>
    ${s.tip&&o`<p class="st-insp__tip">${s.tip}</p>`}
    <div class="st-insp__chips">
      ${s.risky&&o`<span class="st-chip st-chip--risky">risky</span>`}
      <${B} id=${s.tool} label=${t.labelOf(s.tool)}/>
      <${Z} scope=${s.scope} locked=${s.locked} label=${C(s.scope,e)}/>
      ${s.undocumented&&o`<${vs}/>`}
      ${a.length>0&&o`<span class="st-chip">also read by ${a.join(", ")}</span>`}
    </div>
    <div class=${"st-insp__value"+(s.unset?" is-unset":"")}><${kt} row=${s}/></div>
    ${s.unset&&o`<p class="st-insp__tip" data-testid="st-unset-text">${fo(s,e)}</p>`}
    <${m} title="Override chain · what wins and why">
      <ol class="st-chain">
        ${i.map((h,u)=>{const f=u===c,$=Et(h,e);return o`<li key=${u} class=${"st-chain__lv"+(f?" is-win":"")+($?" is-locked":"")} aria-current=${f?"true":void 0}>
            <span class="st-chain__sc">${$&&o`<${pt} label=${"Locked: "+C(h.scope,e)+" cannot be changed here"}/>`}${h.scope||"default"}</span>
            <span class="st-chain__v">${Se(h)?o`<span class="st-dim">not set</span>`:o`<${kt} row=${s} value=${h.value} compact/>`}</span>
            <span class="st-chain__src">${h.source?o`<${rt} path=${h.source} line=${Number(h.line)>0?Number(h.line):0} w=${t}/>`:o`<span class="st-dim">${h.note||(h.scope==="default"?t.labelOf(s.tool):"—")}</span>`}</span>
            ${f&&o`<span class="st-sr"> (wins)</span>`}
          </li>`})}
      </ol>
      <p class="st-hint st-insp__why">${Me(i,c)}</p>
    </${m}>
    <${m} title="History"><${Ns} w=${t} path=${s.source}/></${m}>
    <${m} title="Actions">
      <div class="st-actions">
        ${s.source&&o`<button type="button" class="st-btn" onClick=${()=>t.openAt(s.source,s.line)}>${It(s.source,s.line)}</button>`}
        ${l.length>0&&o`<button type="button" class="st-btn" onClick=${()=>js(t,l[0])}>Show finding</button>`}
      </div>
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled=${!d.ok||p}
          aria-expanded=${d.ok?p?"true":"false":void 0}
          onClick=${()=>r(!0)}>Change value…</button>
        <span class="st-hint" data-testid="st-change-hint">${d.ok?`Edits ${W(d.path)||"the "+d.label+" file"} (${d.label})`:d.hint}</span>
      </div>
    </${m}>
    ${p&&o`<${ho} tool=${s.tool} target=${d} refresh=${t.refresh}
      onClose=${()=>r(!1)}/>`}
  </div>`}function ko({w:t,row:s}){const e=s.agent,a=t.scopesOf(s.tool),{steps:n,wins:l,why:i}=Ce(s),c=r=>Number(r)>0?Number(r):0,d=[{label:"Defined in",path:e.defined_in,line:c(e.defined_line),scope:e.scope_defined},{label:"Pinned in",path:e.pinned_in,line:c(e.pinned_line),scope:e.scope_pinned}],p=$o(s,a);return o`<div class="st-insp__body" data-testid="st-inspector-agent">
    <h3 class="st-insp__title">${e.name||s.label}</h3>
    <div class="st-insp__key st-mono">${s.key}</div>
    ${e.description&&o`<p class="st-insp__tip">${e.description}</p>`}
    <div class="st-insp__chips">
      <${B} id=${s.tool} label=${t.labelOf(s.tool)}/>
      <${Z} scope=${s.scope} locked=${s.locked} label=${C(s.scope,a)}/>
    </div>
    <div class="st-insp__value"><${_s} row=${s} w=${t}/></div>
    <${m} title="Model · what decides it">
      <ol class="st-chain">
        ${n.map((r,h)=>{const u=h===l;return o`<li key=${r.id} class=${"st-chain__lv"+(u?" is-win":"")} aria-current=${u?"true":void 0}>
            <span class="st-chain__sc">${r.label}</span>
            <span class="st-chain__v">${r.value===void 0||r.value===null||r.value===""?o`<span class="st-dim">${r.id==="pin"&&r.present?"set":"not set"}</span>`:r.value==="inherits"?o`<span class="st-inherit">inherits</span>`:o`<span class="st-v">${String(r.value)}</span>`}</span>
            <span class="st-chain__src">${r.source?o`<${rt} path=${r.source} line=${r.line} w=${t}/>`:o`<span class="st-dim">${r.id==="effective"?l===2?"session model":"":"—"}</span>`}</span>
            ${u&&o`<span class="st-sr"> (wins)</span>`}
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
    <${m} title=${"Tools"+(e.tools.length?" · "+e.tools.length:"")}><${ws} tools=${e.tools} all/></${m}>
    <${m} title="Files">
      <dl class="st-insp__dl st-insp__files">
        ${d.map(r=>o`<dt key=${r.label+"t"}>${r.label}</dt><dd key=${r.label+"d"}>
          ${r.path?o`<span class="st-mono" title=${r.path+(r.line?":"+r.line:"")}>${G(r.path)}${r.line?":"+r.line:""}</span>
            ${r.scope&&o` <span class="st-dim">· ${C(r.scope,a)}</span>`}
            <button type="button" class="st-link" onClick=${()=>t.openAt(r.path,r.line)}
              aria-label=${It(r.path,r.line)}>Open</button>`:o`<span class="st-dim">—</span>`}
        </dd>`)}
      </dl>
    </${m}>
    <${m} title="History"><${Ns} w=${t} path=${e.defined_in||s.source}/></${m}>
    <${m} title="Actions">
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled>Change model…</button>
        <span class="st-hint" data-testid="st-change-hint">${p}</span>
      </div>
    </${m}>
  </div>`}function bo({w:t,file:s}){const e=Es(t,s.path),a=s.rows||[];return o`<div class="st-insp__body" data-testid="st-inspector-file">
    <h3 class="st-insp__title">${s.name}</h3>
    <div class="st-insp__key st-mono">${s.path}</div>
    <div class="st-insp__chips">
      <span class="st-chip">${s.is_dir?"Watched folder":K[R(s)]}</span>
      <${Z} scope=${s.scope}/>
      <span class="st-chip">${ys[s.location]||"Other"}</span>
      ${s.tools.map(n=>o`<${B} key=${n} id=${n} label=${t.labelOf(n)}/>`)}
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
        <dt>Purpose</dt><dd>${s.is_dir?"Watched folder":K[R(s)]}${s.kind&&s.kind!==R(s)?" ("+s.kind+")":""}</dd>
        <dt>Scope</dt><dd>${s.scope||"—"}</dd>
        <dt>Git</dt><dd>${s.git_state||"—"}</dd>
        <dt>Size</dt><dd>${s.bytes!=null&&!s.is_dir?Pt(s.bytes):"—"}</dd>
        <dt>Last change</dt><dd>${s.mtime?at(s.mtime):"—"}</dd>
        ${s.mtime?o`<dt>Modified</dt><dd>${new Date(s.mtime*1e3).toLocaleString()}</dd>`:null}
        ${s.loading&&o`<dt>Loading</dt><dd>${s.loading}</dd>`}
        ${s.exists===!1&&o`<dt>State</dt><dd>missing</dd>`}
      </dl>
    </${m}>
    <${m} title="Actions">
      <div class="st-actions">
        ${!s.is_dir&&o`<button type="button" class="st-btn" onClick=${()=>t.openAt(s.path)}>Open file</button>`}
        ${e.length>0&&o`<button type="button" class="st-btn" onClick=${()=>js(t,e[0])}>Show finding</button>`}
      </div>
    </${m}>
  </div>`}function mo({w:t,f:s}){return o`<div class="st-insp__body" data-testid="st-inspector-finding">
    <h3 class="st-insp__title">${Oe(s.rule)}</h3>
    <div class="st-insp__key st-mono">${Ps(s.path,s.line)}</div>
    <div class="st-insp__chips">
      <span class=${"st-chip"+(s.severity==="high"||s.severity==="medium"?" st-chip--risky":"")}>${s.severity||"info"}</span>
      ${Ft(s).map(e=>o`<${B} key=${e} id=${e} label=${t.labelOf(e)}/>`)}
      ${s.session_id&&o`<span class="st-chip st-chip--mono">session ${s.session_id}</span>`}
    </div>
    ${s.why&&o`<${m} title="Why it matters"><p class="st-insp__tip">${s.why}</p></${m}>`}
    ${s.action&&o`<${m} title="What to do"><p class="st-insp__tip">${s.action}</p></${m}>`}
    <${m} title="Actions">
      <div class="st-actions">
        ${s.path&&o`<button type="button" class="st-btn" onClick=${()=>t.openAt(s.path,s.line)}>${s.line>0?It(s.path,s.line):"Show the line"}</button>`}
      </div>
    </${m}>
  </div>`}function go({w:t}){const{view:s}=t.st;let e=null;return(s==="tool"||s==="topic")&&t.selected?e=hs(t.selected)?o`<${ko} key=${t.selected.uid} w=${t} row=${t.selected}/>`:o`<${yo} key=${t.selected.uid} w=${t} row=${t.selected}/>`:s==="files"&&t.selectedFile?e=o`<${bo} w=${t} file=${t.selectedFile}/>`:s==="findings"&&t.selectedFinding&&(e=o`<${mo} w=${t} f=${t.selectedFinding}/>`),o`<aside class=${"st-insp"+(t.drawer?" is-open":"")} aria-label="Inspector">
    <button type="button" class="st-insp__close st-btn" onClick=${t.closeDrawer} aria-label="Close the inspector">Close</button>
    ${e||o`<div class="st-insp__body st-insp__body--empty">
      <h3 class="st-insp__title">Nothing selected</h3>
      <p class="st-hint">${s==="files"?"Click a file for its details.":s==="findings"?"Click a finding for its details.":"Click a setting to see where it is set, what wins and why, and what you can do with it."}</p>
    </div>`}
  </aside>`}const vo=[{value:"tool",label:"By tool"},{value:"topic",label:"By topic"},{value:"files",label:"Files"},{value:"findings",label:"Findings"}],ds=new Set(["tool","topic"]);function ps(){return typeof window<"u"?window.location.search:""}function _o(){const[t,s]=w(()=>Yt(ps())),e=F(a=>s(n=>{const l={...n,...a};if(a.view&&a.view!==n.view&&!(ds.has(n.view)&&ds.has(a.view)))for(const i of["tool","sec","row"])i in a||(l[i]="");if(a.view&&a.view!==n.view&&!("scope"in a)&&(l.scope=""),a.view&&a.view!==n.view)for(const i of Ie)i in a||(l[i]=i==="recent"?!1:"");return l}),[]);return ot(()=>{Kt(qe(t))},[t]),ot(()=>{const a=()=>s(Yt(ps()));return window.addEventListener("popstate",a),()=>{window.removeEventListener("popstate",a),Kt(ze)}},[]),[t,e]}function wo(){const[t,s]=w({status:"loading",files:null});return ot(()=>{let e=!0;return re().then(a=>{e&&s(Array.isArray(a==null?void 0:a.files)?{status:"ready",files:a.files}:{status:"unavailable",files:null})},()=>{e&&s({status:"unavailable",files:null})}),()=>{e=!1}},[]),t}function xo(t){const s=t||{},e=s.audit||null;return{status:s.loading?"loading":s.error?"error":e||s.loading===!1?"ready":"loading",audit:e,scan:s.scan||null,error:s.error?String(s.error):null}}function Oo({source:t={},note:s=""}){var Ht;const{toolConfigs:e,tools:a,monitor:n,root:l,enabledTools:i=null,recentFiles:c,toolName:d,openFile:p,findings:r,refresh:h,hooks:u}=t,f=L(()=>Pe({toolConfigs:e,tools:a,monitor:n,root:l,enabledTools:i}),[e,a,n,l,i]),[$,_]=_o(),[S,j]=w(""),[A,vt]=w(!1),[N,_t]=w(!1),[ut,J]=w(!1),ht=us(null),k=wo(),x=xo(r),Fs=r==null?void 0:r.rescan;ot(()=>{const b=g=>{var O;g.key==="/"&&!ie(g.target)&&!g.metaKey&&!g.ctrlKey&&!g.altKey?(g.preventDefault(),(O=ht.current)==null||O.focus()):g.key==="Escape"&&J(!1)};return window.addEventListener("keydown",b),()=>window.removeEventListener("keydown",b)},[]);const M=L(()=>Ee(f),[f]),V=L(()=>je(f),[f]),Dt=L(()=>Ne(f),[f]),wt=L(()=>Jt({q:S,nonDefault:A,risky:N,unset:$.unset}),[S,A,N,$.unset]),Rs=L(()=>Jt({q:S,nonDefault:A,risky:N,unset:!0}),[S,A,N]),qs=F(b=>wt(b)&&(!$.scope||b.scope===$.scope),[wt,$.scope]),zs=L(()=>Fe(M),[M]),Y=L(()=>Te(k.files,M,Dt,i),[k.files,M,Dt,i]),Q=L(()=>ce(x.audit,i),[x.audit,i]),xt=L(()=>Re((Q==null?void 0:Q.findings)||[]),[Q]),Is=F((b,g=0)=>{!b||!p||p(b,g>0?g:0)},[p]),Ds=F(b=>{_(b),J(!0)},[_]),Ws=F(()=>J(!1),[]),Bs=F(b=>{const g=De(b,f);return g===b&&d?d(b):g},[f,d]),Vs=F(b=>{var g;return((g=M.find(O=>O.id===b))==null?void 0:g.scopes)||[]},[M]),Hs=F(b=>{const g=Y.find(O=>lt(O.path,b));if(g!=null&&g.mtime)return g.mtime;for(const O of(f==null?void 0:f.tools)||[])for(const z of O.files||[])if(lt(z.path,b)&&z.mtime)return z.mtime;return null},[Y,f]);if(!f)return o`<p class="loading-state">Loading...</p>`;if(!M.length&&!V&&!Gt(i))return o`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;const Ct=M.some(b=>b.id===$.tool)||$.tool==="aictl"&&V?$.tool:((Ht=M[0])==null?void 0:Ht.id)||(V?"aictl":""),$t=M.find(b=>b.id===Ct)||null,Wt=(b,g)=>{var O;return g&&((O=M.find(z=>z.id===b))==null?void 0:O.rows.find(z=>z.key===g))||null},Us=$.view==="tool"?$t?Wt($t.id,$.row):null:$.view==="topic"?Wt($.tool,$.row):null,Gs=$.view==="files"&&$.row&&Y.find(b=>b.path===$.row)||null,Ks=$.view==="findings"&&$.row&&xt.find(b=>b.id===$.row)||null,T={st:$,set:_,select:Ds,q:S,pass:wt,passAll:Rs,passTool:qs,showUnset:$.unset,scopesOf:Vs,managedAbsent:zs,entries:M,aictl:V,toolId:Ct,files:Y,filesStatus:k.status,findings:xt,audit:Q,auditStatus:x.status,auditError:x.error,scan:x.scan,rescan:Fs,selected:Us,selectedFile:Gs,selectedFinding:Ks,openAt:Is,labelOf:Bs,mtimeOf:Hs,recentFiles:c,drawer:ut,closeDrawer:Ws,refresh:h,hooks:u},{set:Zs,agents:Js,knowsSet:Bt,unset:Ys,risky:Vt}=Le(M),Qs=Gt(i)&&!M.some(b=>b.id!=="vscode");let X,tt;return $.view==="topic"?(X=o`<${Va} w=${T}/>`,tt=o`<${Ga} w=${T}/>`):$.view==="files"?(X=o`<${Ja} w=${T}/>`,tt=o`<${lo} w=${T}/>`):$.view==="findings"?(X=o`<${co} w=${T}/>`,tt=o`<${po} w=${T}/>`):(X=o`<${Fa} w=${T}/>`,tt=$t?o`<${Wa} w=${T} entry=${$t}/>`:Ct==="aictl"&&V?o`<${Ba} w=${T} aictl=${V}/>`:o`<section class="st-main"><p class="st-empty">No tool settings to show.</p></section>`),o`<div class="st-ws" data-view=${$.view}>
    <div class="st-head">
      <${Bn} class="st-pivot" options=${vo} value=${$.view} ariaLabel="Settings view"
        onChange=${b=>_({view:b})}/>
      <label class="st-searchbox">
        <${it} name="search" size="14"/>
        <input ref=${ht} type="search" class="st-search" value=${S}
          placeholder="Find a setting, value, key or file…" aria-label="Find a setting, value, key or file"
          onInput=${b=>j(b.currentTarget.value)}/>
        <kbd class="st-kbd" aria-hidden="true">/</kbd>
      </label>
      <button type="button" class=${"st-toggle"+(A?" is-on":"")} aria-pressed=${A?"true":"false"}
        onClick=${()=>vt(!A)}>Only non-default</button>
      <button type="button" class=${"st-toggle st-toggle--risky"+(N?" is-on":"")} aria-pressed=${N?"true":"false"}
        onClick=${()=>_t(!N)}>Only risky</button>
      ${Bt&&o`<button type="button" class=${"st-toggle"+($.unset?" is-on":"")} aria-pressed=${$.unset?"true":"false"}
        onClick=${()=>_({unset:!$.unset})}>Show unset knobs</button>`}
      <div class="st-kpis" data-testid="st-kpis">
        <span><b>${M.length}</b> tools</span>
        <span><b>${Y.length}</b> files</span>
        <span><b>${Zs}</b> settings</span>
        <span data-kpi="agents"><b>${Js}</b> agents</span>
        ${Bt&&o`<span data-kpi="unset"><b>${Ys}</b> unset</span>`}
        <span class=${Vt?"st-red":""}><b>${Vt}</b> risky</span>
        <span><b>${x.status==="loading"&&!x.audit?"…":xt.length}</b> findings</span>
      </div>
    </div>
    ${s&&o`<p class="st-wsnote" data-testid="st-wsnote">${s}</p>`}
    ${Qs&&o`<div class="st-scope-empty"><${Vn} enabledTools=${i} snap=${f} what="the settings"/></div>`}
    <div class="st-grid">
      <div class="st-col st-col--nav">${X}</div>
      <div class="st-col st-col--main">${tt}</div>
      <${go} w=${T}/>
    </div>
  </div>`}export{xo as auditState,Oo as default};

import{R as ce,U as re,V as Lt,W as de,m as o,E as ws,X as pe,Y as ue,d as w,Z as he,$ as ct,a0 as qt,a1 as ns,q,a2 as $e,y as rt,a3 as fe,T as L,a4 as ye,h as be,a5 as as,a6 as os,a7 as me}from"./index-Ta1FIaFo.js";import{i as ke,D as Pt,a as ge,o as ve,b as Y,e as D,c as H,d as ft,p as _e,s as M,f as It,g as we,m as zt,h as Ce,j as wt,S as jt,k as Dt,t as Se,l as Cs,P as xe,G as Ss,L as Me,n as I,q as xs,r as Wt,u as Oe,v as B,w as Ae,x as Te,y as Ms,z as W,A as Ee,B as ls,C as X,E as Le,F as Pe,H as je,I as Os,J as As,K as dt,M as Ne,N as Fe,O as pt,Q as Re,R as qe,T as Ie,U as ze,V as De,W as We,X as Ve,Y as Ue,Z as is,_ as Be,$ as He,a0 as Ge,a1 as Ke,a2 as Ze,a3 as cs,a4 as rs,a5 as Je,a6 as Ye,a7 as Xe}from"./model-DTH5Ghgk.js";import{u as j,a as Qe,n as Ts}from"./tableGrid-BczN2bY3.js";/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Es=(...t)=>t.filter((s,e,a)=>!!s&&s.trim()!==""&&a.indexOf(s)===e).join(" ").trim();/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ds=t=>t.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tn=t=>t.replace(/^([A-Z])|[\s-_]+(\w)/g,(s,e,a)=>a?a.toUpperCase():e.toLowerCase());/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ps=t=>{const s=tn(t);return s.charAt(0).toUpperCase()+s.slice(1)};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var sn={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const en=re({size:24,color:"currentColor",strokeWidth:2,absoluteStrokeWidth:!1,class:""}),nn=()=>ce(en);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const an=t=>{for(const s in t)if(s.startsWith("aria-")||s==="role"||s==="title")return!0;return!1};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const on=({color:t,size:s,strokeWidth:e,absoluteStrokeWidth:a,children:n,iconNode:l,class:i="",...c})=>{const{size:d=24,strokeWidth:h=2,absoluteStrokeWidth:u=!1,color:r="currentColor",class:p=""}=nn()??{},f=a??u?Number(e??h)*24/Number(s??d):e??h;return Lt("svg",{...sn,width:s??d??24,height:s??d??24,stroke:t??r,"stroke-width":f,class:Es("lucide",p,i),...!n&&!an(c)&&{"aria-hidden":"true"},...c},[...l.map(([$,_])=>Lt($,_)),...de(n)])};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=(t,s)=>{const e=({class:a="",className:n="",children:l,...i})=>Lt(on,{...i,iconNode:s,class:Es(`lucide-${ds(ps(t))}`,`lucide-${ds(t)}`,a,n)},l);return e.displayName=ps(t),e};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ln=y("activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cn=y("archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rn=y("banknote",[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dn=y("book-open",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pn=y("bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const un=y("brain-circuit",[["path",{d:"M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z",key:"l5xja"}],["path",{d:"M9 13a4.5 4.5 0 0 0 3-4",key:"10igwf"}],["path",{d:"M6.003 5.125A3 3 0 0 0 6.401 6.5",key:"105sqy"}],["path",{d:"M3.477 10.896a4 4 0 0 1 .585-.396",key:"ql3yin"}],["path",{d:"M6 18a4 4 0 0 1-1.967-.516",key:"2e4loj"}],["path",{d:"M12 13h4",key:"1ku699"}],["path",{d:"M12 18h6a2 2 0 0 1 2 2v1",key:"105ag5"}],["path",{d:"M12 8h8",key:"1lhi5i"}],["path",{d:"M16 8V5a2 2 0 0 1 2-2",key:"u6izg6"}],["circle",{cx:"16",cy:"13",r:".5",key:"ry7gng"}],["circle",{cx:"18",cy:"3",r:".5",key:"1aiba7"}],["circle",{cx:"20",cy:"21",r:".5",key:"yhc1fs"}],["circle",{cx:"20",cy:"8",r:".5",key:"1e43v0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hn=y("brain",[["path",{d:"M12 18V5",key:"adv99a"}],["path",{d:"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4",key:"1e3is1"}],["path",{d:"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5",key:"1gqd8o"}],["path",{d:"M17.997 5.125a4 4 0 0 1 2.526 5.77",key:"iwvgf7"}],["path",{d:"M18 18a4 4 0 0 0 2-7.464",key:"efp6ie"}],["path",{d:"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517",key:"1gq6am"}],["path",{d:"M6 18a4 4 0 0 1-2-7.464",key:"k1g0md"}],["path",{d:"M6.003 5.125a4 4 0 0 0-2.526 5.77",key:"q97ue3"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $n=y("chart-column",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fn=y("chart-line",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yn=y("chevron-down",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bn=y("chevron-right",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mn=y("clipboard-list",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kn=y("clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 6v6l4 2",key:"mmk7yg"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gn=y("coins",[["path",{d:"M13.744 17.736a6 6 0 1 1-7.48-7.48",key:"bq4yh3"}],["path",{d:"M15 6h1v4",key:"11y1tn"}],["path",{d:"m6.134 14.768.866-.5 2 3.464",key:"17snzx"}],["circle",{cx:"16",cy:"8",r:"6",key:"14bfc9"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vn=y("cpu",[["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M17 20v2",key:"1rnc9c"}],["path",{d:"M17 2v2",key:"11trls"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M2 17h2",key:"7oei6x"}],["path",{d:"M2 7h2",key:"asdhe0"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"M20 17h2",key:"1fpfkl"}],["path",{d:"M20 7h2",key:"1o8tra"}],["path",{d:"M7 20v2",key:"4gnj0m"}],["path",{d:"M7 2v2",key:"1i4yhu"}],["rect",{x:"4",y:"4",width:"16",height:"16",rx:"2",key:"1vbyd7"}],["rect",{x:"8",y:"8",width:"8",height:"8",rx:"1",key:"z9xiuo"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _n=y("eye-off",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wn=y("file-pen",[["path",{d:"M12.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v9.34",key:"o6klzx"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10.378 12.622a1 1 0 0 1 3 3.003L8.36 20.637a2 2 0 0 1-.854.506l-2.867.837a.5.5 0 0 1-.62-.62l.836-2.869a2 2 0 0 1 .506-.853z",key:"zhnas1"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cn=y("file-text",[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sn=y("folder",[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",key:"1kt360"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xn=y("funnel",[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mn=y("git-branch",[["path",{d:"M15 6a9 9 0 0 0-9 9V3",key:"1cii5b"}],["circle",{cx:"18",cy:"6",r:"3",key:"1h7g24"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const On=y("globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const An=y("grid-3x3",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M3 15h18",key:"5xshup"}],["path",{d:"M9 3v18",key:"fh3hqa"}],["path",{d:"M15 3v18",key:"14nvp0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tn=y("layout-dashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const En=y("layers",[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ln=y("lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pn=y("mail",[["path",{d:"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7",key:"132q7q"}],["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2",key:"izxlao"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jn=y("message-square",[["path",{d:"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",key:"18887p"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nn=y("moon",[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fn=y("package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rn=y("pen",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qn=y("plug",[["path",{d:"M12 22v-5",key:"1ega77"}],["path",{d:"M15 8V2",key:"18g5xt"}],["path",{d:"M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z",key:"1xoxul"}],["path",{d:"M9 8V2",key:"14iosj"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const In=y("radio",[["path",{d:"M16.247 7.761a6 6 0 0 1 0 8.478",key:"1fwjs5"}],["path",{d:"M19.075 4.933a10 10 0 0 1 0 14.134",key:"ehdyv1"}],["path",{d:"M4.925 19.067a10 10 0 0 1 0-14.134",key:"1q22gi"}],["path",{d:"M7.753 16.239a6 6 0 0 1 0-8.478",key:"r2q7qm"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zn=y("refresh-cw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dn=y("search",[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wn=y("server",[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vn=y("settings",[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Un=y("sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bn=y("triangle-alert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hn=y("user",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gn=y("users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kn=y("wallet",[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zn=y("webhook",[["path",{d:"M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2",key:"q3hayz"}],["path",{d:"m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06",key:"1go1hn"}],["path",{d:"m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8",key:"qlwsc0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jn=y("wrench",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",key:"1ngwbx"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yn=y("x",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xn=y("zap",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]),Qn={activity:ln,"alert-triangle":Bn,filter:xn,"eye-off":_n,archive:cn,banknote:rn,"bar-chart-3":$n,"book-open":dn,bot:pn,brain:hn,"brain-circuit":un,"chevron-down":yn,"chevron-right":bn,"clipboard-list":mn,clock:kn,coins:gn,cpu:vn,"file-pen":wn,"file-text":Cn,folder:Sn,"git-branch":Mn,globe:On,"grid-3x3":An,layers:En,"layout-dashboard":Tn,"line-chart":fn,lock:Ln,mail:Pn,"message-square":jn,moon:Nn,package:Fn,pen:Rn,plug:qn,radio:In,"refresh-cw":zn,search:Dn,server:Wn,settings:Vn,sun:Un,user:Hn,users:Gn,wallet:Kn,webhook:Zn,wrench:Jn,x:Yn,zap:Xn};function ut({name:t,size:s="1em",strokeWidth:e=2,...a}){if(!t)return null;const n=Qn[String(t)];return n?o`<${n} size=${s} strokeWidth=${e} aria-hidden="true" ...${a} />`:o`<span aria-hidden="true" ...${a}>${t}</span>`}function ta({options:t=[],value:s,onChange:e,ariaLabel:a,class:n,className:l,...i}){const c=["aictl-ui-segmented",n,l].filter(Boolean).join(" "),d=ws([]),h=u=>{var f;if(!t.length)return;const r=Math.max(0,t.findIndex($=>$.value===s));let p=null;u.key==="ArrowRight"||u.key==="ArrowDown"?p=(r+1)%t.length:u.key==="ArrowLeft"||u.key==="ArrowUp"?p=(r-1+t.length)%t.length:u.key==="Home"?p=0:u.key==="End"&&(p=t.length-1),p!=null&&(u.preventDefault(),e&&e(t[p].value),(f=d.current[p])==null||f.focus())};return o`<div
    class=${c}
    role="radiogroup"
    aria-label=${a||null}
    ...${i}
  >${t.map((u,r)=>{const p=u.value===s;return o`<button
      key=${u.value}
      ref=${f=>{d.current[r]=f}}
      type="button"
      class="aictl-ui-segmented__btn"
      role="radio"
      aria-checked=${p?"true":"false"}
      tabindex=${p?"0":"-1"}
      onClick=${()=>e&&e(u.value)}
      onKeyDown=${h}
    >${u.icon?o`<${ut} name=${u.icon} size="0.9em"/>`:null}${u.label}</button>`})}</div>`}function sa({enabledTools:t,snap:s,what:e="this screen"}){const a=pe(t),n=ue(t,s);return o`<div class="panel-state panel-state--empty" role="status" data-testid="tool-scope-empty">
    <${ut} name="filter" size="14"/>
    <div>
      <div class="panel-state__title">${a?"No tools are selected":"The selected tools have no data here"}</div>
      <div class="panel-state__hint">${a?`The tool filter in the header has no tool ticked, so ${e} shows nothing. Tick a tool, or choose All tools.`:`${n.join(", ")} ${n.length===1?"has":"have"} nothing to show on ${e}. Tick more tools in the header filter, or choose All tools.`}</div>
    </div>
  </div>`}function kt(t){return t==null?Pt:typeof t=="object"?JSON.stringify(t):String(t)}function ea({value:t,compact:s}){const[e,a]=w(!1),n=Array.isArray(t),l=n?t.map((d,h)=>[h,d]):Object.entries(t||{}),i=l.length;if(!i)return o`<span class="st-none">none</span>`;const c=o`<span class="st-chip st-chip--mono st-items">${i} ${i===1?"item":"items"}</span>`;return s?c:o`<span class="st-itemsbox">
    ${c}
    <button type="button" class="st-link" aria-expanded=${e?"true":"false"}
      onClick=${d=>{d.stopPropagation(),a(!e)}}>${e?"hide":"show"}</button>
    ${e&&o`<ul class="st-itemlist">
      ${l.map(([d,h])=>o`<li key=${d} class="st-mono" title=${n?kt(h):`${d}: ${kt(h)}`}>
        ${n?kt(h):o`<span class="st-itemkey">${d}:</span> ${kt(h)}`}</li>`)}
    </ul>`}
  </span>`}function vt({row:t,value:s,compact:e=!1}){const a=s!==void 0?s:t.value,n=t.kind||ke(a),l=!!t.risky;if(n==="flag"||typeof a=="boolean"){if(a==null)return o`<span class="st-none">${Pt}</span>`;const d=ge(a);return o`<span class=${"st-flag"+(d?" is-on":"")+(l?" is-risky":"")}>
      <span class="st-switch" aria-hidden="true"></span><span class="st-flag__text">${d?"on":"off"}</span>
    </span>`}if(a==null||a==="")return o`<span class="st-none">${Pt}</span>`;if(n==="list"||n==="map"||typeof a=="object")return o`<${ea} value=${a} compact=${e}/>`;const i=String(a),c=ve({...t,value:a});return c?o`<span class=${"st-select"+(l?" is-risky":"")} title=${"Options: "+c.join(", ")}>${i}</span>`:n==="path"?o`<span class="st-v st-path" title=${i}>${i}</span>`:o`<span class=${"st-v"+(l?" is-risky":"")} title=${i}>${i}</span>`}function G({scope:t,locked:s=!1,label:e=""}){const a=t||"default",n=o`<span class=${"st-chip st-scope st-scope--"+a.replace(/[^a-z-]/gi,"")+(s?" st-scope--locked":"")}
    title=${s?`Set by ${e||a}; cannot be changed here`:void 0}>${a}${s?o`<span class="st-sr"> (locked)</span>`:""}</span>`;return s?o`<span class="st-scopewrap"><${yt}/>${n}</span>`:n}function yt({label:t=""}){return t?o`<span class="st-lock" role="img" aria-label=${t} title=${t}><${ut} name="lock" size="11"/></span>`:o`<span class="st-lock" aria-hidden="true"><${ut} name="lock" size="11"/></span>`}function z({id:t,big:s=!1}){return o`<span class=${"st-sw"+(s?" st-sw--big":"")} aria-hidden="true"
    style=${{background:he[t]||"var(--st-fg2)"}}></span>`}function ht({label:t}){return o`<span class="st-dot" role="img" aria-label=${t} title=${t}></span>`}function P({children:t}){return o`<div class="st-nav__h">${t}</div>`}function V({id:t,label:s}){return o`<span class="st-chip st-toolchip"><${z} id=${t}/>${s}</span>`}function $t({path:t,line:s,w:e,tool:a=""}){if(!t)return o`<span class="st-none">—</span>`;if(Y(t)){const l=D(t);return l?o`<button type="button" class="st-src st-src--env" data-env=${l}
      title=${"Environment variable "+l+": where it is set and what it drives"}
      onClick=${i=>{i.stopPropagation(),e.openEnv(l,a)}}><b>${l}</b></button>`:o`<span class="st-src st-src--env" title="An environment variable; this aictl version did not name it">environment</span>`}const n=t+(s>0?":"+s:"");return o`<button type="button" class="st-src" title=${n}
    onClick=${l=>{l.stopPropagation(),e.openAt(t,s)}}>
    <b>${H(t)}</b>${s>0?":"+s:""}</button>`}const na="aictl has no description for this key; the value is shown as found in the file";function Ct(){return o`<span class="st-chip st-chip--muted st-undoc" title=${na}>undocumented</span>`}const aa=4,Nt=(t,s,e)=>[s&&{k:"tool",l:"Tool",get:a=>t.labelOf(a.tool)},{k:"agent",l:"Agent",cls:"st-c-agent",get:a=>it(a)},{k:"model",l:"Model",get:a=>ft(a)?void 0:String(a.value)},{k:"effort",l:"Effort",get:a=>{var n;return(n=a.agent)==null?void 0:n.effort}},e&&{k:"context",l:"Context",get:a=>{var n;return(n=a.agent)==null?void 0:n.context_tier}},{k:"tools",l:"Tools",n:!0,get:a=>{var n,l;return((l=(n=a.agent)==null?void 0:n.tools)==null?void 0:l.length)||void 0}},{k:"defined",l:"Defined in",cls:"st-c-src",get:a=>{var n;return(n=a.agent)==null?void 0:n.defined_in}},{k:"pinned",l:"Pinned in",cls:"st-c-src",get:a=>{var n;return(n=a.agent)==null?void 0:n.pinned_in}}].filter(Boolean);function oa(t,s){return`Set by ${M(t.scope,s.scopesOf(t.tool))}; cannot be changed here`}function Ls({row:t,w:s}){const e=t.agent,a=ft(t);return o`<span class="st-agentmodel">
    ${t.locked&&o`<${yt} label=${oa(t,s)}/>`}
    ${a?o`<span class="st-inherit" title=${t.note||"Runs on the session model"}>inherits</span>`:o`<span class="st-v" title=${String(t.value)}>${String(t.value)}</span>`}
    ${e.model_policy==="required"&&o`<span class="st-badge" title="The agent file requires a model">required</span>`}
    ${_e(t)&&o`<span class="st-badge st-badge--pin" title=${"A settings pin decides the model: "+e.pinned_in}>pinned</span>`}
  </span>`}function Ps({tools:t,all:s=!1}){if(!t||!t.length)return o`<span class="st-none" title="The agent file lists no tools">—</span>`;const e=s?t:t.slice(0,aa),a=t.length-e.length;return o`<span class="st-tools">
    ${e.map(n=>o`<span key=${n} class="st-chip st-chip--mono" title=${n}>${n}</span>`)}
    ${a>0&&o`<span class="st-chip st-more-tools" title=${t.slice(e.length).join(", ")}>+${a}</span>`}
  </span>`}function js({row:t,w:s,withTool:e,withContext:a}){var d;const n=t.agent,l=((d=s.selected)==null?void 0:d.uid)===t.uid,i=()=>s.select({tool:t.tool,row:t.key}),c=h=>Number(h)>0?Number(h):0;return o`<tr class=${"st-row st-agentrow"+(l?" is-sel":"")} data-key=${t.key} data-tool=${t.tool}
    tabindex="0" onClick=${i}
    onKeyDown=${h=>{(h.key==="Enter"||h.key===" ")&&(h.preventDefault(),i())}}>
    ${e&&o`<td class="st-c-tool"><span class="st-matrix__toolname"><${z} id=${t.tool}/>${s.labelOf(t.tool)}</span></td>`}
    <td class="st-c-agent">
      <div class="st-label st-mono">${n.name||t.label}</div>
      ${n.description&&o`<div class="st-agentdesc" title=${n.description}>${n.description}</div>`}
    </td>
    <td class="st-c-model"><${Ls} row=${t} w=${s}/></td>
    <td class="st-mono">${n.effort||o`<span class="st-none">—</span>`}</td>
    ${a&&o`<td class="st-mono">${n.context_tier||o`<span class="st-none">—</span>`}</td>`}
    <td><${Ps} tools=${n.tools}/></td>
    <td class="st-c-src"><${$t} path=${n.defined_in} line=${c(n.defined_line)} w=${s}/></td>
    <td class="st-c-src"><${$t} path=${n.pinned_in} line=${c(n.pinned_line)} w=${s}/></td>
  </tr>`}function la({w:t,section:s}){const e=s.shown,a=e.filter(ft).length,n=j("settings.agents",Nt(t,!1,!0)),l=Nt(t,!1,!0);return o`<table class=${"st-table st-agents "+n.tableProps.class} style=${n.tableProps.style} data-section="agents">
    <thead><tr>${l.map(n.th)}</tr></thead>
    <tbody>
      <tr class="st-group"><th scope="colgroup" colspan="7">${s.title}
        <span class="st-group__meta">${e.length}${a?` · ${a} inherit the session model`:""}</span></th></tr>
      ${n.order(e).map(i=>o`<${js} key=${i.uid} row=${i} w=${t} withContext/>`)}
    </tbody>
  </table>`}const Ft={tool:t=>(s,e)=>t.labelOf(s.tool).localeCompare(t.labelOf(e.tool))||it(s).localeCompare(it(e)),agent:t=>(s,e)=>it(s).localeCompare(it(e))||t.labelOf(s.tool).localeCompare(t.labelOf(e.tool)),model:t=>(s,e)=>us(s).localeCompare(us(e))||Ft.tool(t)(s,e)};function it(t){var s;return String(((s=t.agent)==null?void 0:s.name)||t.label||"")}function us(t){return ft(t)?"￿":String(t.value)}function ia(t,s,e){return[...t].sort((Ft[s]||Ft.tool)(e))}function ca({w:t,rows:s,sort:e}){const a=Nt(t,!0,!1),n=j("settings.agents.all",a),l=n.order(ia(s,e,t));return o`<div class="st-scroll"><table class=${"st-table st-agents st-agents--all "+n.tableProps.class} style=${n.tableProps.style}>
    <thead><tr>${a.map(n.th)}</tr></thead>
    <tbody>${l.map(i=>o`<${js} key=${i.uid} row=${i} w=${t} withTool/>`)}</tbody>
  </table></div>`}const Vt=[{id:"mcp",label:"MCP"},{id:"read",label:"Read files"},{id:"write",label:"Write files"},{id:"shell",label:"Shell"},{id:"web",label:"Web"}],ra={allowed:"allow",asks:"ask",denied:"deny"},hs={denied:3,asks:2,allowed:1},J=(t,s,e="")=>Object.fromEntries(Vt.map(a=>[a.id,{state:t,why:s,key:e}]));function da(t){const s=String(t||"").split(".");return s[s.length-1]}function pa(t){const s=new Map;for(const e of(t==null?void 0:t.rows)||[])s.has(e.key)||s.set(e.key,e);return s}const v=t=>t&&t.value!==null&&t.value!==void 0&&t.value!==""?t.value:void 0,_t=t=>Array.isArray(t)?t.filter(s=>typeof s=="string"&&s):[];function Ut(t){const s=/^\s*([^()\s]+)\s*(?:\((.*)\))?\s*$/.exec(String(t));return s?{name:s[1].toLowerCase(),spec:s[2]===void 0?null:s[2].trim()}:{name:String(t).toLowerCase(),spec:null}}const Ns=new Set(["","*",":*","**"]),ua={read:["read","glob","grep","ls","notebookread"],write:["write","edit","multiedit","notebookedit"],shell:["bash","powershell"],web:["webfetch","websearch"]};function ha(t){if(t==="mcp"||t.startsWith("mcp__"))return"mcp";for(const[s,e]of Object.entries(ua))if(e.includes(t))return s;return""}function $a(t,s){return t.startsWith("mcp__")?t==="mcp__*":s===null||Ns.has(s)}function fa(t,s){const e=[],a=(i,c,d,h)=>{const u={allow:"allowed",deny:"denied",ask:"asks"}[i],r=i+""+c,p=d?M(d,s):"",f=e.find(O=>O.id===r);if(f){p&&!f.where.includes(p)&&f.where.push(p);return}const{name:$,spec:_}=Ut(c);e.push({id:r,rule:c,effect:u,cap:ha($),whole:$a($,_),where:p?[p]:[],key:h})},n=(i,c,d)=>{if(!(!i||typeof i!="object"||Array.isArray(i)))for(const h of["allow","deny","ask"])for(const u of _t(i[h]))a(h,u,c,d)},l=t.get("permissions");if(l){const i=(l.chain||[]).filter(c=>c&&c.value&&typeof c.value=="object"&&c.set!==!1);if(i.length)for(const c of i)n(c.value,c.scope,"permissions");else n(v(l),l.scope,"permissions")}for(const i of["allow","deny","ask"]){const c=t.get("permissions."+i);for(const d of _t(v(c)))a(i,d,c.scope,c.key)}return e}const ya={shell:"shell",write:"write",read:"read",url:"web",fetch:"web",web_fetch:"web"};function ba(t){const s=[];for(const e of["allow","deny","ask"]){const a=t.get("permissions."+e);for(const n of _t(v(a))){const{name:l,spec:i}=Ut(n);s.push({rule:n,effect:{allow:"allowed",deny:"denied",ask:"asks"}[e],cap:ya[l]||"mcp",whole:i===null||Ns.has(i),where:a.scope?[M(a.scope)]:[],key:a.key})}}return s}function ma(t){const s=[];for(const e of t.values()){const a=v(e);if(!a||typeof a!="object"||Array.isArray(a))continue;const n=e.key;let l="";if(/(^|\.)urls\.autoApprove$/.test(n)?l="web":/(^|\.)edits\.autoApprove$/.test(n)?l="write":(n==="autoApprove"||/(^|\.)terminal\.autoApprove$/.test(n))&&(l="shell"),!!l)for(const[i,c]of Object.entries(a)){let d;if(l==="web"?d=c===!0||(c==null?void 0:c.approveRequest)===!0?"allowed":"asks":l==="write"?d=c===!1?"asks":"allowed":c===!0||(c==null?void 0:c.approve)===!0?d="allowed":(c===!1||(c==null?void 0:c.approve)===!1)&&(d="denied"),!d)continue;const h=l==="write"?i==="**/*"||i==="**":!1;s.push({rule:i,effect:d,cap:l,whole:h,where:e.scope?[M(e.scope)]:[],key:n})}}return s}const ka={read:["read_file","read_many_files","glob","grep","search_file_content","list_directory","readfiletool","readmanyfilestool","globtool","greptool","lstool"],write:["write_file","replace","edit","writefiletool","edittool"],shell:["run_shell_command","shelltool"],web:["web_fetch","google_web_search","webfetchtool","websearchtool"]};function ga(t){var e;const s=[];for(const[a,n]of[["tools.allowed","allowed"],["tools.exclude","denied"]]){const l=t.get(a);for(const i of _t(v(l))){const{name:c,spec:d}=Ut(i);let h=((e=Object.entries(ka).find(([,u])=>u.includes(c)))==null?void 0:e[0])||"";!h&&c.includes("__")&&(h="mcp"),h&&s.push({rule:i,effect:n,cap:h,whole:d===null,where:l.scope?[M(l.scope)]:[],key:a})}}return s}function va(t){const s=t.get("permissions.defaultMode"),e=v(s)??"default",a=s&&v(s)!==void 0?s.key:"",n=`default mode ${e}`;if(e==="bypassPermissions")return J("allowed",n+": no permission prompts",a);const l={mcp:{state:"asks",why:"Claude Code asks before an MCP tool runs",key:a},read:{state:"allowed",why:"Claude Code reads files without asking",key:a},write:{state:"asks",why:"Claude Code asks before it edits a file",key:a},shell:{state:"asks",why:"Claude Code asks before it runs a command",key:a},web:{state:"asks",why:"Claude Code asks before it fetches a URL",key:a}};if(e==="acceptEdits"&&(l.write={state:"allowed",why:n+": edits apply without asking",key:a}),e==="plan"&&(l.write={state:"denied",why:n+": read-only, no edits",key:a},l.shell={state:"denied",why:n+": read-only, no commands that change anything",key:a}),e==="dontAsk")for(const i of["mcp","write","shell","web"])l[i]={state:"denied",why:n+": anything not allowed by a rule is refused",key:a};return l}function _a(t){const s=t.get("defaultPermissionMode"),e=v(s)??"manual",a=s&&v(s)!==void 0?s.key:"";if(e==="allow-all")return J("allowed","defaultPermissionMode allow-all: every tool call is allowed",a);const n=e==="assisted"?"asks; in assisted mode a model answers the request":"asks before it runs";return{mcp:{state:"asks",why:"an MCP tool "+n,key:a},read:{state:"allowed",why:"reads in trusted folders run without asking",key:a},write:{state:"asks",why:"a file write "+n,key:a},shell:{state:"asks",why:"a shell command "+n,key:a},web:{state:"asks",why:"a URL fetch "+n,key:a}}}function wa(t){for(const s of t.values()){const e=v(s);if((da(s.key)==="globalAutoApprove"||s.key==="chat.tools.global.autoApprove")&&e===!0)return J("allowed",s.label+" is on: every tool call runs without asking",s.key);if(s.key==="skipPermissions"&&e===!0)return J("allowed",s.label+" is on: no permission checks",s.key);if(s.key==="chat.permissions.default"&&["autoApprove","autopilot","bypass"].includes(e))return J("allowed",`chat.permissions.default ${e}: sessions start without approval prompts`,s.key)}return{mcp:{state:"asks",why:"VS Code asks before an MCP tool runs"},read:{state:"allowed",why:"VS Code reads workspace files without asking"},write:{state:"allowed",why:"VS Code applies edits in the workspace without asking"},shell:{state:"asks",why:"VS Code asks before a terminal command runs"},web:{state:"asks",why:"VS Code asks before it fetches a URL"}}}function Ca(t){const s=t.get("approval_policy"),e=t.get("sandbox_mode"),a=v(t.get("sandbox_workspace_write.network_access"))===!0;let n=v(s);n&&typeof n=="object"&&(n="granular"),n=n||"on-request";const l=v(e)||"read-only",i=s&&v(s)!==void 0?s.key:"",c=e&&v(e)!==void 0?e.key:"",d=`approval_policy ${n}${v(s)===void 0?" (not set)":""}`,h=`sandbox_mode ${l}${v(e)===void 0?" (not set)":""}`,u=n==="never",r=l==="danger-full-access",p=r?{state:"allowed",why:h+": no sandbox"}:l==="workspace-write"?{state:"allowed",why:h+": writes in the workspace run without asking"}:u?{state:"denied",why:`${h}, ${d}: no writes and no way to ask`}:{state:"asks",why:`${h}: a write needs your approval`},f=u?{state:"allowed",why:d+": commands never ask"}:n==="untrusted"?{state:"asks",why:d+": commands outside the trusted set ask"}:{state:"allowed",why:`${d}: commands run in the sandbox (${l}) and ask to leave it`},$=r||l==="workspace-write"&&a?{state:"allowed",why:r?h+": network open":"sandbox_workspace_write.network_access is on"}:u?{state:"denied",why:`${h}, ${d}: no network and no way to ask`}:{state:"asks",why:`${h}: network access needs your approval`};return{mcp:{state:u?"allowed":"asks",why:u?d+": MCP tools never ask":d+": MCP tool calls ask",key:i},read:{state:"allowed",why:h+": reads are allowed",key:c},write:{...p,key:c||i},shell:{...f,key:i||c},web:{...$,key:c||i}}}function Sa(t){const s=t.get("general.defaultApprovalMode")||t.get("approvalMode")||t.get("approval_mode")||t.get("general.approvalMode"),e=v(s)??"default",a=s&&v(s)!==void 0?s.key:"",n="approval mode "+e;if(e==="yolo")return J("allowed",n+": every tool call runs without asking",a);const l={mcp:{state:"asks",why:n+": MCP tools ask",key:a},read:{state:"allowed",why:"reads run without asking",key:a},write:{state:"asks",why:n+": edits ask",key:a},shell:{state:"asks",why:n+": shell commands ask",key:a},web:{state:"asks",why:n+": web fetches ask",key:a}};return e==="auto_edit"&&(l.write={state:"allowed",why:n+": edits run without asking",key:a}),e==="plan"&&(l.write={state:"denied",why:n+": read-only",key:a},l.shell={state:"denied",why:n+": read-only",key:a}),l}const ot=(t,s)=>[...t.keys()].some(e=>s.test(e)),xa=[{id:"claude",tools:["claude-code"],applies:t=>ot(t,/^permissions(\.(allow|deny|ask|defaultMode))?$/),base:va,rules:fa,wholeName:"the whole tool"},{id:"copilot-cli",tools:["copilot-cli","copilot-desktop"],applies:t=>ot(t,/^(defaultPermissionMode|savedToolApprovals|permissions\.(allow|deny|ask))$/),base:_a,rules:ba,notes:t=>{const s=v(t.get("savedToolApprovals"));if(!s||typeof s!="object")return[];const e=Object.values(s).reduce((n,l)=>n+(Number(l)||0),0),a=Object.keys(s).length;return e?[`${e} saved tool ${e===1?"approval":"approvals"} in ${a} ${a===1?"folder":"folders"} (permissions-config.json)`]:[]}},{id:"vscode",tools:["vscode","copilot"],applies:t=>ot(t,/(autoApprove|^chat\.permissions\.default$|^skipPermissions$)/i),base:wa,rules:ma},{id:"codex",tools:["codex-cli","codex"],applies:t=>ot(t,/^(approval_policy|sandbox_mode)$/),base:Ca,rules:()=>[]},{id:"gemini",tools:["gemini-cli","gemini"],applies:t=>ot(t,/(^|\.)(defaultApprovalMode|approvalMode|approval_mode)$|^tools\.(allowed|exclude)$/),base:Sa,rules:ga}];function Ma(t,s){return t==="mixed"?`mixed (${s} ${s===1?"rule":"rules"})`:t}function $s(t){return`${ra[t.effect]} ${t.rule}${t.where.length?" ("+t.where.join(", ")+")":""}`}function Oa(t,s,e){var r;const a=e.filter(p=>p.cap===t.id),n=a.filter(p=>p.whole);let l=s.state,i=s.why;if(n.length){const p=n.reduce((f,$)=>hs[$.effect]>hs[f.effect]?$:f);l=p.effect,i="rule "+$s(p)}const c=a.some(p=>!p.whole&&p.effect!==l),d=c?"mixed":l,h=Ma(d,a.length),u=[`${t.label}: ${h}`];return!a.length||!n.length?u.push("Without a rule: "+s.state+" ("+s.why+")"):u.push((c?"For the whole tool: ":"Decided by: ")+l+" ("+i+")"),a.length&&u.push(...a.map(p=>"• "+$s(p))),{cap:t.id,label:t.label,state:d,text:h,title:u.join(`
`),rules:a.map(p=>({rule:p.rule,effect:p.effect,where:p.where})),key:((r=a[0])==null?void 0:r.key)||s.key||""}}function Fs(t){if(!t)return null;const s=xa.find(l=>l.tools.includes(t.id));if(!s)return null;const e=pa(t);if(!s.applies(e))return null;const a=s.base(e),n=s.rules(e,t.scopes||[]);return{tool:t.id,cells:Vt.map(l=>Oa(l,a[l.id],n)),notes:s.notes?s.notes(e):[]}}function Aa(t){return(t||[]).map(s=>({entry:s,perms:Fs(s)})).filter(s=>s.perms)}const Ta=["project","project-local"],Ea=new Set(["permissions","permissions.allow","permissions.deny","permissions.ask","project_permissions"]),Rs="No form for this value. Open the file and use Edit file";function La(t){return!!t&&t.tool==="claude-code"&&Ea.has(t.key)}function Pa(t){var s,e;return((e=(s=t==null?void 0:t.chain)==null?void 0:s[t.wins])==null?void 0:e.scope)||(t==null?void 0:t.scope)||"default"}function ja(t,s=[]){var l;const e=(l=t==null?void 0:t.chain)==null?void 0:l[t.wins];if(t!=null&&t.locked||It(e,s))return{ok:!1,hint:"Locked by "+M(t.locked?t.scope:e.scope,s)};if(!La(t))return{ok:!1,hint:Rs};const a=Pa(t);if(!Ta.includes(a))return{ok:!1,hint:`The value comes from ${M(a,s)}. Project and Project local permissions have a form here; for another file, open it and use Edit file.`};const n=(s||[]).find(i=>i.id===a);return{ok:!0,scope:a,label:M(a,s),path:e&&e.source||(n==null?void 0:n.path)||""}}const Na=t=>(t||[]).join(`
`),Fa=t=>String(t||"").split(`
`).map(s=>s.trim()).filter(Boolean);function Ra(t,s){const e=new Set(t||[]),a=new Set(s||[]);return{added:[...a].filter(n=>!e.has(n)),removed:[...e].filter(n=>!a.has(n))}}function qs({cell:t,onPick:s}){const e=t.key&&s?()=>s(t.key):null;return o`<td class=${"st-perm st-perm--"+t.state} data-cap=${t.cap} data-state=${t.state} title=${t.title}>
    ${e?o`<button type="button" class="st-perm__btn" aria-label=${`${t.label}: ${t.text}`} onClick=${e}>${t.text}</button>`:o`<span class="st-perm__text">${t.text}</span>`}
  </td>`}const Is=(t,s)=>[...t?[{k:"tool",l:t,get:s?e=>e.entry.label:void 0}]:[],...Vt.map(e=>({k:e.id,l:e.label,attrs:{"data-cap":e.id},get:s?a=>{var n;return(n=a.perms.cells.find(l=>l.cap===e.id))==null?void 0:n.text}:void 0}))];function qa({w:t,entry:s,perms:e}){const a=i=>t.select({tool:s.id,row:i}),n=Is("",!1),l=j("settings.perms",n);return o`<div class="st-perms" data-testid="st-perms" data-tool=${s.id}>
    <table class=${"st-permtable "+l.tableProps.class} style=${l.tableProps.style}>
      <caption class="st-perms__cap">What the agent can do without asking</caption>
      <thead><tr>${n.map(l.th)}</tr></thead>
      <tbody><tr>${e.cells.map(i=>o`<${qs} key=${i.cap} cell=${i} onPick=${a}/>`)}</tr></tbody>
    </table>
    ${e.notes.map((i,c)=>o`<p key=${c} class="st-hint st-perms__note">${i}</p>`)}
  </div>`}function Ia({w:t,mats:s}){const e=Is("Tool",!0),a=j("settings.perms.all",e);return s.length?o`<div class="st-perms st-perms--topic" data-testid="st-perms-topic">
    <div class="st-scroll"><table class=${"st-permtable "+a.tableProps.class} style=${a.tableProps.style}>
      <caption class="st-perms__cap">What each tool's agent can do without asking</caption>
      <thead><tr>${e.map(a.th)}</tr></thead>
      <tbody>
        ${a.order(s).map(({entry:n,perms:l})=>o`<tr key=${n.id} data-tool=${n.id}>
          <th scope="row" class="st-perms__tool"><span class="st-matrix__toolname"><${z} id=${n.id}/>${n.label}</span></th>
          ${l.cells.map(i=>o`<${qs} key=${i.cap} cell=${i} onPick=${c=>t.select({tool:n.id,row:c})}/>`)}
        </tr>`)}
      </tbody>
    </table></div>
    ${s.flatMap(({entry:n,perms:l})=>l.notes.map((i,c)=>o`<p key=${n.id+c} class="st-hint st-perms__note">${n.label}: ${i}</p>`))}
  </div>`:null}const za={copilot:"copilot-vscode",vscode:"copilot-vscode"};function Da(t,s){const e=t==null?void 0:t.tools;return!e||typeof e!="object"?null:e[s]||e[za[s]]||null}function Wa(t){return{active:"active",configured:"configured",disabled:"host-disabled",misconfigured:"wrong port",observed:"observed",missing:"missing"}[t]||t||"unknown"}function Va(t){const s=(t==null?void 0:t.message)||"";return s.includes("~/.copilot/hooks")?'"chat.hookFilesLocations": { "~/.copilot/hooks": true }':s.includes(".github/hooks")?'"chat.hookFilesLocations": { ".github/hooks": true }':s.includes("chat.useHooks")?'"chat.useHooks": true':""}const Ua={active:"is-ok",configured:"is-ok",disabled:"is-warn",misconfigured:"is-warn",missing:"is-warn"};function Ba({status:t}){const s=t.configured_events||[],e=t.missing_events||[],a=t.sources||[],n=t.warnings||[];return o`<div class="st-hookstat" data-testid="st-hookstat">
    <div class="st-hookstat__head">
      <span class=${"st-status "+(Ua[t.status]||"")} data-testid="st-hookstat-status"
        title=${t.status==="misconfigured"?"The hook commands post to a different port than this dashboard":void 0}>${Wa(t.status)}</span>
      <span>${t.configured_count||s.length} configured</span>
      ${e.length>0&&o`<span class="st-warn" title=${e.join(", ")}>${e.length} missing: ${e.join(", ")}</span>`}
      <span>${t.fired_24h||0} fired in 24 h</span>
      <span title=${t.last_fire_ts?new Date(t.last_fire_ts*1e3).toLocaleString():void 0}>last ${t.last_fire_ts?ct(t.last_fire_ts):"never"}</span>
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
    ${n.map(l=>{const i=Va(l);return o`<div key=${(l.path||"")+l.message} class="st-hookstat__warn" role="note">
        ${l.message}${i&&o`<code class="st-hookstat__snippet">${i}</code>`}
      </div>`})}
  </div>`}function Ha(t,s){const e=H(t);if(s.filter(l=>H(l)===e).length<2)return e;const a=String(t).split(/[\\/]/).filter(Boolean);return a.length<2?e:(/^(Users|home)$/.test(a[0])&&a.length===4?"~/":"")+a[a.length-2]+"/"+e}function Ga({w:t}){const{entries:s,aictl:e,st:a}=t;return o`<nav class="st-nav" aria-label="Tools">
    <${P}>Tools</${P}>
    <ul class="st-nav__list">
      ${s.map(n=>{const l=n.id===t.toolId,i=n.rows.filter(l?t.passTool:t.pass),c=i.some(d=>d.risky);return o`<li key=${n.id}>
          <button type="button" class=${"st-nav__item"+(l?" is-on":"")+(i.length?"":" is-empty")}
            aria-current=${l?"true":void 0} data-tool=${n.id}
            onClick=${()=>t.set({tool:n.id,sec:"",row:"",scope:l?t.st.scope:""})}>
            <${z} id=${n.id}/><span class="st-nav__label">${n.label}</span>
            ${c&&o`<${ht} label="A risky setting is on"/>`}
            <span class="st-nav__n">${i.length}</span>
          </button>
          ${l&&o`<ul class="st-nav__subs">
            ${n.sections.map(d=>{const h=d.rows.filter(t.passTool),u=a.sec===d.id,r=d.id==="agents"?we(h):"";return o`<li key=${d.id}><button type="button" class=${"st-nav__sub"+(u?" is-on":"")}
                aria-current=${u?"true":void 0}
                onClick=${()=>t.set({sec:u?"":d.id})}>
                <span class="st-nav__label">${d.title}</span>
                ${h.some(p=>p.risky)&&o`<${ht} label="A risky setting is on"/>`}
                <span class="st-nav__n">${h.length}</span>
                ${r&&o`<span class="st-nav__model" title=${"Every agent runs on "+r}>${r}</span>`}
              </button></li>`})}
            ${n.envVars.length>0&&(()=>{const d=a.sec==="env",h=n.envVars.filter(u=>u.set&&zt(u,t.q)).length;return o`<li key="env"><button type="button" class=${"st-nav__sub"+(d?" is-on":"")}
                aria-current=${d?"true":void 0} data-sec="env"
                onClick=${()=>t.set({sec:d?"":"env"})}>
                <span class="st-nav__label">Environment variables</span>
                <span class="st-nav__n">${h}</span>
              </button></li>`})()}
          </ul>`}
        </li>`})}
      ${e&&o`<li key="aictl">
        <button type="button" class=${"st-nav__item"+(t.toolId==="aictl"?" is-on":"")}
          aria-current=${t.toolId==="aictl"?"true":void 0} data-tool="aictl"
          onClick=${()=>t.set({tool:"aictl",sec:"",row:"",scope:""})}>
          <${z} id="aictl"/><span class="st-nav__label">aictl</span>
          <span class="st-nav__n">${e.collectors.length}</span>
        </button>
      </li>`}
    </ul>
  </nav>`}function Ka({row:t,w:s,scopes:e}){var l;const a=((l=s.selected)==null?void 0:l.uid)===t.uid,n=()=>s.select({tool:t.tool,row:t.key});return o`<tr class=${"st-row"+(t.risky?" st-row--risky":"")+(t.unset?" st-row--unset":"")+(a?" is-sel":"")}
    data-key=${t.key} tabindex="0" onClick=${n}
    onKeyDown=${i=>{(i.key==="Enter"||i.key===" ")&&(i.preventDefault(),n())}}>
    <td class="st-c-set">
      <div class="st-label">${t.label}${t.undocumented&&o` <${Ct}/>`}</div>
      ${t.risky&&t.tip&&o`<div class="st-risknote">${t.tip}</div>`}
    </td>
    <td class="st-c-val"><${vt} row=${t}/></td>
    <td class="st-c-scope"><${G} scope=${t.scope} locked=${t.locked} label=${M(t.scope,e)}/></td>
    <td class="st-c-src"><${$t} path=${t.source} line=${t.line} w=${s} tool=${t.tool}/></td>
    <td class="st-c-what" title=${t.tip||void 0}>${t.tip}</td>
  </tr>`}function Za({w:t,entry:s}){const e=s.scopes||[];if(!e.length)return null;const a=s.rows.filter(t.pass);return o`<div class="st-scopes" data-testid="st-scopes">
    <ol class="st-scopes__list" aria-label="Configuration layers, lowest precedence first">
      ${e.map((n,l)=>{const i=a.filter(p=>p.scope===n.id).length,c=t.st.scope===n.id,d=n.path?H(n.path):"",h=n.vars||[],u=h.length?h.slice(0,2).join(", ")+(h.length>2?` +${h.length-2}`:""):d||n.note,r=[n.label,n.paths.length?n.paths.join(`
`):"",h.length?"Set: "+h.join(", "):"",n.exists?"":"not present",n.note,n.changeable?"":"Locked: cannot be changed from this machine"].filter(Boolean).join(`
`);return o`<li key=${n.id} class="st-scopes__item">
          ${l>0&&o`<span class="st-scopes__arrow" aria-hidden="true">→</span>`}
          <button type="button" class=${"st-scopechip"+(c?" is-on":"")+(n.changeable?"":" is-locked")+(n.exists?"":" is-absent")}
            data-scope=${n.id} aria-pressed=${c?"true":"false"} title=${r}
            onClick=${()=>t.set({scope:c?"":n.id})}>
            <span class="st-scopechip__top">
              ${!n.changeable&&o`<${yt}/><span class="st-sr">Locked: </span>`}
              <span class="st-scopechip__label">${n.label}</span>
              <span class="st-scopechip__n">${i}<span class="st-sr"> ${i===1?"setting wins":"settings win"} here</span></span>
            </span>
            <span class=${"st-scopechip__file"+(h.length?" st-mono":"")} data-vars=${h.length?h.join(","):void 0}>${n.exists?u:n.id==="env"?"none set":"not present"}</span>
          </button>
        </li>`})}
    </ol>
    <p class="st-hint st-scopes__legend">Later layers override earlier ones. Locked layers cannot be changed from this machine.</p>
  </div>`}function fs({children:t,section:s}){return o`<tr class="st-extra" data-extra=${s}><td colspan="5">${t}</td></tr>`}const ys=t=>typeof t.value=="number"?t.value:t.value==null||t.value===""?void 0:wt(t.value);function Ja(t,s){return[{k:"setting",l:"Setting",cls:"st-c-set",get:e=>e.label},{k:"value",l:"Value",cls:"st-c-val",n:Ts(t,ys),get:ys},{k:"scope",l:"Scope",cls:"st-c-scope",get:e=>e.scope?M(e.scope,s):void 0},{k:"source",l:"Set in",cls:"st-c-src",get:e=>e.source},{k:"what",l:"What it does",get:e=>e.tip}]}function Ya({w:t,sections:s,scopes:e,shared:a,extras:n={}}){const l=Ja(s.flatMap(c=>c.shown),e),i=j("settings.tool",l,a);return o`<table class=${"st-table "+i.tableProps.class} style=${i.tableProps.style}>
    <thead><tr>${l.map(i.th)}</tr></thead>
    ${s.map(c=>{const d=c.shown.filter(h=>h.risky).length;return o`<tbody key=${c.id} data-section=${c.id}>
        <tr class="st-group"><th scope="colgroup" colspan="5">${c.title}
          <span class="st-group__meta">${c.shown.length}${d?o` · <span class="st-red">${d} risky</span>`:""}${c.hidden?o` · <span class="st-unsetn">+${c.hidden} unset</span>`:""}</span></th></tr>
        ${n[c.id]&&o`<${fs} section=${c.id}>${n[c.id]}</${fs}>`}
        ${i.order(c.shown).map(h=>o`<${Ka} key=${h.uid} row=${h} w=${t} scopes=${e}/>`)}
      </tbody>`})}
  </table>`}function Xa(t){const s=[];for(const e of t){const a=e.id==="agents"&&e.shown.every(l=>l.kind==="agent"&&l.agent),n=s[s.length-1];a?s.push({agents:!0,sections:[e]}):n&&!n.agents?n.sections.push(e):s.push({agents:!1,sections:[e]})}return s}function Qa({w:t,entry:s}){const e=s.envVars.filter(c=>zt(c,t.q)),a=e.filter(c=>c.set),n=t.showUnset?e:a,l=e.length-n.length;if(!n.length&&!l)return null;const i=t.selectedEnv;return o`<table class="st-table st-envtable" data-testid="st-env-table">
    <thead><tr><th>Variable</th><th>Value</th><th>Where</th><th>Drives</th><th>What it does</th></tr></thead>
    <tbody data-section="env">
      <tr class="st-group"><th scope="colgroup" colspan="5">Environment variables
        <span class="st-group__meta">${a.length} set${l?o` · <span class="st-unsetn">+${l} unset</span>`:""}</span></th></tr>
      ${n.map(c=>{const d=()=>t.openEnv(c.name,s.id);return o`<tr key=${c.name} class=${"st-row"+(c.set?"":" st-row--unset")+(i&&i.uid===c.uid?" is-sel":"")}
          data-env=${c.name} tabindex="0" onClick=${d}
          onKeyDown=${h=>{(h.key==="Enter"||h.key===" ")&&(h.preventDefault(),d())}}>
          <td class="st-c-set"><div class="st-label st-mono">${c.name}</div>${!c.documented&&o` <${Ct}/>`}</td>
          <td class="st-c-val">${c.set?c.masked?o`<span class="st-dim" title="The name says it holds a credential, so the value is not shown">hidden</span>`:o`<span class="st-v st-mono" title=${c.value}>${c.value===""?"(empty)":c.value}</span>`:o`<span class="st-none">not set</span>`}</td>
          <td class="st-c-src st-mono">${Ce(c)||o`<span class="st-none">—</span>`}</td>
          <td>${c.drives.length?c.drives.map(h=>h.label).join(", "):o`<span class="st-none">—</span>`}</td>
          <td class="st-c-what" title=${c.description||void 0}>${c.description}</td>
        </tr>`})}
    </tbody>
  </table>`}function to({w:t,entry:s}){const e=Qe("settings.tool"),a=(!t.st.sec||t.st.sec==="env")&&(!t.st.scope||t.st.scope==="env"),n=a&&s.envVars.some(r=>(r.set||t.showUnset)&&zt(r,t.q)),l=s.sections.filter(r=>!t.st.sec||r.id===t.st.sec).map(r=>({...r,shown:r.rows.filter(t.passTool),hidden:t.showUnset?0:r.rows.filter(p=>p.unset&&t.passAll(p)&&(!t.st.scope||p.scope===t.st.scope)).length})).filter(r=>r.shown.length||r.hidden),i=s.rows.length,c=Fs(s),d=Da(t.hooks,s.id),h={autonomy:c&&o`<${qa} w=${t} entry=${s} perms=${c}/>`,hooks:d&&o`<${Ba} status=${d}/>`},u=t.st.scope?M(t.st.scope,s.scopes):"";return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${z} id=${s.id} big/>
      <h2 class="st-bar__title" id="st-main-title">${s.label}</h2>
      <span class="st-bar__sub">${i} ${i===1?"setting":"settings"} in ${s.files.length} ${s.files.length===1?"file":"files"}${s.envUsed.length?` and ${s.envUsed.length} ${s.envUsed.length===1?"variable":"variables"}`:""}${s.risky?o` · <span class="st-red">${s.risky} risky</span>`:""}</span>
      <span class="st-bar__files">
        ${s.files.map(r=>o`<button type="button" key=${r} class="st-chip st-chip--mono st-chip--btn" title=${r}
          onClick=${()=>t.openAt(r)}>${Ha(r,s.files)}</button>`)}
        ${s.envUsed.map(r=>o`<button type="button" key=${"env:"+r.name} class="st-chip st-chip--mono st-chip--btn st-chip--env"
          data-env=${r.name} title=${"Environment variable "+r.name+(r.drives.length?": sets "+r.drives.map(p=>p.label).join(", "):"")}
          onClick=${()=>t.openEnv(r.name,s.id)}><span class="st-chip__pre" aria-hidden="true">$</span>${r.name}</button>`)}
      </span>
    </div>
    ${s.id==="vscode"&&o`<p class="st-note">chat.* settings, used by every AI tool in VS Code</p>`}
    ${s.hints.map((r,p)=>o`<p key=${p} class="st-note">${r}</p>`)}
    <${Za} w=${t} entry=${s}/>
    ${l.length?Xa(l).map((r,p)=>r.agents?o`<${la} key=${"a"+p} w=${t} section=${r.sections[0]}/>`:o`<${Ya} key=${"g"+p} w=${t} sections=${r.sections} scopes=${s.scopes} shared=${e} extras=${h}/>`):n?null:o`<p class="st-empty">${i?u?`No setting shown here is set at the ${u} layer.`:"No setting matches the search or the toggles.":"No settings were read for this tool."}</p>`}
    ${a&&o`<${Qa} w=${t} entry=${s}/>`}
  </section>`}const bs=[{k:"collector",l:"Collector",cls:"st-c-set",get:t=>t.name},{k:"mode",l:"Mode",get:t=>t.mode},{k:"status",l:"Status",get:t=>t.status},{k:"detail",l:"Detail",get:t=>t.detail}];function so({w:t,aictl:s}){const e=j("settings.collectors",bs),a=t.q.trim().toLowerCase(),n=s.collectors.filter(i=>!a||[i.name,i.mode,i.status,i.detail].join(" ").toLowerCase().includes(a)),l=s.roots.filter(i=>!a||i.toLowerCase().includes(a));return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${z} id="aictl" big/>
      <h2 class="st-bar__title" id="st-main-title">aictl</h2>
      <span class="st-bar__sub">monitoring engine · ${s.collectors.length} collectors · ${s.roots.length} monitored roots</span>
    </div>
    ${n.length>0&&o`<table class=${"st-table "+e.tableProps.class} style=${e.tableProps.style}>
      <thead><tr>${bs.map(e.th)}</tr></thead>
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
  </section>`}function zs(t){if(t.st.sec&&jt.includes(t.st.sec))return t.st.sec;const s=e=>t.entries.some(a=>a.rows.some(n=>n.sec===e));return s("autonomy")?"autonomy":jt.find(s)||"autonomy"}function eo({w:t}){const s=zs(t);return o`<nav class="st-nav" aria-label="Topics">
    <${P}>Topics</${P}>
    <ul class="st-nav__list">
      ${jt.map(e=>{const a=t.entries.filter(i=>i.rows.some(c=>c.sec===e&&t.pass(c))),n=a.some(i=>i.rows.some(c=>c.sec===e&&c.risky&&t.pass(c))),l=e===s;return o`<li key=${e}><button type="button" class=${"st-nav__item"+(l?" is-on":"")+(a.length?"":" is-empty")}
          aria-current=${l?"true":void 0} data-sec=${e}
          onClick=${()=>t.set({sec:e})}>
          <span class="st-nav__label">${Dt[e]}</span>
          ${n&&o`<${ht} label="A risky setting is on"/>`}
          <span class="st-nav__n">${a.length} ${a.length===1?"tool":"tools"}</span>
        </button></li>`})}
    </ul>
  </nav>`}function no({w:t}){const[s,e]=w("tool"),a=t.entries.flatMap(c=>c.rows.filter(d=>d.sec==="agents"&&Cs(d))),n=a.filter(t.pass),l=new Set(n.map(c=>c.tool)).size,i=n.filter(ft).length;return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${Dt.agents}</h2>
      <span class="st-bar__sub" data-testid="st-agents-count">${n.length} ${n.length===1?"agent":"agents"} in ${l} ${l===1?"tool":"tools"}, ${i} inherit the session model</span>
    </div>
    ${n.length?o`<${ca} w=${t} rows=${n} sort=${s} onSort=${e}/>
      <p class="st-hint">Click an agent for its model decision, its tools and the files that define it.</p>`:o`<p class="st-empty">${a.length?"No agent matches the search or the toggles.":"No tool reports agents."}</p>`}
  </section>`}function ms(t,s,e){const a=t.cells[s];if(!(!a||a.unset&&!e))return typeof a.value=="number"?a.value:a.value==null||a.value===""?void 0:wt(a.value)}function ao({w:t,tools:s,rows:e}){const a=[{k:"setting",l:"Setting",cls:"st-c-set",get:l=>l.label},...s.map(l=>({k:l.id,cls:"st-matrix__tool",attrs:{"data-tool":l.id},n:Ts(e,i=>ms(i,l.id,t.showUnset)),l:o`<span class="st-matrix__toolname"><${z} id=${l.id}/>${l.label}</span>`,get:i=>ms(i,l.id,t.showUnset)}))],n=j("settings.topic",a);return o`<div class="st-scroll"><table class=${"st-table st-matrix "+n.tableProps.class} style=${n.tableProps.style}>
      <thead><tr>${a.map(n.th)}</tr></thead>
      <tbody>
        ${n.order(e).map(l=>o`<tr key=${l.id} class="st-row st-row--static">
          <th scope="row" class="st-c-set" title=${l.keys.join(`
`)}>${l.label}</th>
          ${s.map(i=>{var h;const c=l.cells[i.id];if(!c||c.unset&&!t.showUnset)return o`<td key=${i.id} class="st-cell st-cell--none">—</td>`;const d=((h=t.selected)==null?void 0:h.uid)===c.uid;return o`<td key=${i.id} class=${"st-cell"+(c.risky?" is-risky":"")+(c.unset?" is-unset":"")+(d?" is-sel":"")}>
              <button type="button" class="st-cellbtn" data-key=${c.key}
                aria-label=${`${l.label}, ${i.label}: ${wt(c.value)}${c.unset?" (not set, default)":""}`}
                onClick=${()=>t.select({tool:i.id,row:c.key})}>
                <${vt} row=${c} compact/>
              </button>
            </td>`})}
        </tr>`)}
      </tbody>
    </table></div>`}function oo({w:t}){const s=zs(t);if(s==="agents")return o`<${no} w=${t}/>`;const{tools:e,rows:a}=Se(t.entries,s,t.pass),n=a.reduce((i,c)=>i+Object.values(c.cells).filter(d=>d.risky).length,0),l=s==="autonomy"?Aa(t.entries):[];return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${Dt[s]}</h2>
      <span class="st-bar__sub">every tool, side by side${n?o` · <span class="st-red">${n} risky ${n===1?"value":"values"}</span>`:""}</span>
    </div>
    <${Ia} w=${t} mats=${l}/>
    ${a.length?o`<${ao} w=${t} tools=${e} rows=${a}/>
    <p class="st-hint">A cell is one setting in one tool. Click it for the file, the scope and the override chain.</p>`:o`<p class="st-empty">${e.length?"No setting matches the search or the toggles.":"No tool has settings in this section."}</p>`}
  </section>`}const lo=8,Ds=86400,gt=8;function Bt(t){const s=t.cell?t.cell.split(":"):null;return{loc:B(t.sec),tools:B(t.tool),purpose:B(t.purpose),scope:B(t.fscope),git:B(t.git),recent:!!t.recent,cell:s&&s.length===2?s:null}}function io(t,s,e,a){return!(e!=="loc"&&s.loc.length&&!s.loc.includes(t.location)||e!=="tools"&&s.tools.length&&!t.tools.some(n=>s.tools.includes(n))||e!=="purpose"&&s.purpose.length&&!s.purpose.includes(I(t))||e!=="scope"&&s.scope.length&&!s.scope.includes(t.scope)||e!=="git"&&s.git.length&&!s.git.includes(Wt(t))||e!=="recent"&&s.recent&&!(t.mtime&&t.mtime>=a-Ds)||e!=="cell"&&s.cell&&(I(t)!==s.cell[0]||t.location!==s.cell[1]))}function St(t,s=null,e=Date.now()/1e3){const a=Bt(t.st);return t.files.filter(n=>Oe(n,t.q)&&io(n,a,s,e))}function Z(t,s,e){const a=B(t.st[s]);t.set({[s]:Pe(a.includes(e)?a.filter(n=>n!==e):[...a,e]),row:""})}function lt({w:t,title:s,fkey:e,skip:a,options:n,valueOf:l,attr:i,swatch:c}){const d=St(t,a),h=B(t.st[e]),u=n.map(r=>({...r,n:d.filter(p=>l(p).includes(r.id)).length})).filter(r=>r.n||h.includes(r.id)||r.always);return u.length?o`<${P}>${s}</${P}>
    <ul class="st-nav__list" aria-label=${s}>
      ${u.map(r=>{const p=h.includes(r.id);return o`<li key=${r.id}><button type="button" class=${"st-nav__item"+(p?" is-on":"")+(r.n?"":" is-empty")}
          aria-pressed=${p?"true":"false"} ...${{[i]:r.id}} onClick=${()=>Z(t,e,r.id)}>
          ${c?o`<${z} id=${r.id}/>`:null}<span class="st-nav__label">${r.label}</span><span class="st-nav__n">${r.n}</span></button></li>`})}
    </ul>`:null}function co({w:t}){const s=[...new Set(t.files.flatMap(n=>n.tools))],e=[...new Set(t.files.map(n=>n.scope).filter(Boolean))],a=St(t,"recent").filter(n=>n.mtime&&n.mtime>=Date.now()/1e3-Ds).length;return o`<nav class="st-nav" aria-label="File filters">
    <${lt} w=${t} title="Locations" fkey="sec" skip="loc" attr="data-loc" options=${Me.map(n=>({...n,always:!0}))} valueOf=${n=>[n.location]}/>
    <${lt} w=${t} title="Purpose" fkey="purpose" skip="purpose" attr="data-purpose" options=${xe} valueOf=${n=>[I(n)]}/>
    <${lt} w=${t} title="Read by" fkey="tool" skip="tools" attr="data-tool" swatch=${!0}
      options=${s.map(n=>({id:n,label:t.labelOf(n)}))} valueOf=${n=>n.tools}/>
    <${lt} w=${t} title="Scope" fkey="fscope" skip="scope" attr="data-scope"
      options=${e.map(n=>({id:n,label:xs[n]||n}))} valueOf=${n=>[n.scope]}/>
    <${lt} w=${t} title="Git" fkey="git" skip="git" attr="data-git" options=${Ss} valueOf=${n=>[Wt(n)]}/>
    <${P}>Changes</${P}>
    <ul class="st-nav__list">
      <li><button type="button" class=${"st-nav__item"+(t.st.recent?" is-on":"")} aria-pressed=${t.st.recent?"true":"false"}
        data-recent="1" onClick=${()=>t.set({recent:!t.st.recent,row:""})}>
        <span class="st-nav__label">Changed in the last 24 h</span><span class="st-nav__n">${a}</span></button></li>
    </ul>
  </nav>`}function ro({w:t}){const s=Bt(t.st),e=[...s.loc.map(a=>({k:"sec:"+a,label:"Location: "+(ls[a]||a),drop:()=>Z(t,"sec",a)})),...s.purpose.map(a=>({k:"purpose:"+a,label:"Purpose: "+(X[a]||a),drop:()=>Z(t,"purpose",a)})),...s.tools.map(a=>({k:"tool:"+a,label:"Read by: "+t.labelOf(a),drop:()=>Z(t,"tool",a)})),...s.scope.map(a=>({k:"fscope:"+a,label:"Scope: "+(xs[a]||a),drop:()=>Z(t,"fscope",a)})),...s.git.map(a=>{var n;return{k:"git:"+a,label:"Git: "+(((n=Ss.find(l=>l.id===a))==null?void 0:n.label)||a),drop:()=>Z(t,"git",a)}}),...s.recent?[{k:"recent",label:"Changed in the last 24 h",drop:()=>t.set({recent:!1,row:""})}]:[],...s.cell?[{k:"cell",label:(X[s.cell[0]]||s.cell[0])+" in "+(ls[s.cell[1]]||s.cell[1]),drop:()=>t.set({cell:"",row:""})}]:[]];return e.length?o`<div class="st-fchips" data-testid="st-file-chips">
    ${e.map(a=>o`<button key=${a.k} type="button" class="st-chip st-chip--btn" data-chip=${a.k}
      aria-label=${"Remove the filter "+a.label} onClick=${a.drop}>${a.label} <span aria-hidden="true">×</span></button>`)}
    <button type="button" class="st-link" onClick=${()=>t.set({sec:"",tool:"",purpose:"",fscope:"",git:"",recent:!1,cell:"",row:""})}>Clear filters</button>
  </div>`:null}function po({w:t}){const s=Ee(St(t,"cell").filter(n=>!n.is_dir)),e=[{k:"purpose",l:"Purpose",get:n=>n.label},...s.cols.map(n=>({k:n.id,l:n.label,cls:"st-num",n:!0,get:l=>l.cells[n.id]||void 0})),{k:"all",l:"All",cls:"st-num",n:!0,get:n=>n.total||void 0}],a=j("settings.files.matrix",e);return s.rows.length?o`<div class="st-scroll"><table class=${"st-table st-fmatrix "+a.tableProps.class} style=${a.tableProps.style} data-testid="st-file-matrix">
    <caption class="st-sr">Files by purpose and location</caption>
    <thead><tr>${e.map(a.th)}</tr></thead>
    <tbody>${a.order(s.rows).map(n=>o`<tr key=${n.id}>
      <th scope="row">${n.label}</th>
      ${s.cols.map(l=>{const i=n.cells[l.id]||0,c=n.id+":"+l.id,d=t.st.cell===c;return o`<td key=${l.id} class=${"st-cell st-num"+(d?" is-sel":"")}>${i?o`<button type="button" class="st-cellbtn" data-cell=${c} aria-pressed=${d?"true":"false"}
              aria-label=${i+" "+n.label+" "+(i===1?"file":"files")+" in "+l.label}
              onClick=${()=>t.set({cell:d?"":c,row:""})}>${i}</button>`:o`<span class="st-dim" aria-hidden="true">·</span>`}</td>`})}
      <td class="st-num st-dim">${n.total}</td>
    </tr>`)}</tbody>
  </table></div>`:null}function uo({f:t,w:s}){const e=s.selectedFile&&s.selectedFile.path===t.path,a=()=>s.select({row:t.path}),n=je(t);return o`<tr class=${"st-row"+(e?" is-sel":"")+(t.exists===!1?" is-missing":"")}
    data-path=${t.path} tabindex="0" onClick=${a}
    onKeyDown=${l=>{(l.key==="Enter"||l.key===" ")&&(l.preventDefault(),a())}}>
    <td class="st-c-file">
      ${t.is_dir?o`<span class="st-fname" title=${t.path}>${t.name}/</span>`:o`<button type="button" class="st-fname st-link" title=${"Open "+t.path}
            onClick=${l=>{l.stopPropagation(),s.openAt(t.path)}}>${t.name}</button>`}
      ${t.exists===!1&&o`<span class="st-hint"> missing</span>`}
    </td>
    <td><span class="st-chip" data-kind=${I(t)}>${t.is_dir?"Folder":X[I(t)]}</span></td>
    <td><${G} scope=${t.scope}/></td>
    <td><span class="st-tools">${t.tools.map(l=>o`<${V} key=${l} id=${l} label=${s.labelOf(l)}/>`)}</span></td>
    <td class="st-mono st-num">${t.settings?t.settings:"—"}</td>
    <td class="st-mono st-num">${!t.is_dir&&t.bytes!=null?qt(t.bytes):"—"}</td>
    <td class=${n?"st-warn":"st-dim"} data-git=${Wt(t)||void 0}
      title=${n?"A tool always loads this file, and git does not track it":void 0}>${t.git_state||"—"}</td>
    <td class="st-dim">${t.mtime?ct(t.mtime):"—"}</td>
  </tr>`}function ho(t){const s=Bt(t.st);if(s.loc.length||s.purpose.length||s.scope.length||s.git.length||s.recent||s.cell)return[];const e=t.q.trim().toLowerCase();return(t.managedAbsent||[]).filter(a=>(!e||[a.path,a.label,a.note].join(`
`).toLowerCase().includes(e))&&(!s.tools.length||a.tools.some(n=>s.tools.includes(n))))}function $o({w:t,items:s}){const[e,a]=w(!1);return o`<tbody class="st-absent" data-root="managed-absent">
    <tr class="st-group"><th scope="colgroup" colspan=${gt}>
      <button type="button" class="st-fold" aria-expanded=${e?"true":"false"} onClick=${()=>a(!e)}>
        <span aria-hidden="true">${e?"▾":"▸"}</span><span>Managed locations (not present)</span></button>
      <span class="st-group__meta">${s.length} ${s.length===1?"location":"locations"} · where a policy would come from</span>
    </th></tr>
    ${e&&s.map(n=>o`<tr key=${n.path} class="st-row st-row--static st-row--absent" data-path=${n.path}>
      <td class="st-c-file"><span class="st-fname" title=${n.path+(n.note?`
`+n.note:"")}>${W(n.path)}</span>
        <span class="st-hint"> not present</span></td>
      <td class="st-dim">—</td>
      <td><span class="st-scopewrap"><${yt} label="Cannot be changed from this machine"/><${G} scope=${n.scope}/></span></td>
      <td><span class="st-tools">${n.tools.map(l=>o`<${V} key=${l} id=${l} label=${t.labelOf(l)}/>`)}</span></td>
      <td class="st-mono st-num">—</td><td class="st-mono st-num">—</td><td class="st-dim">—</td><td class="st-dim">—</td>
    </tr>`)}
  </tbody>`}function fo(t,s){const e=t.filter(l=>!l.is_dir),a=t.filter(l=>l.is_dir),n=s==="purpose"?Ae(e).map(l=>({key:"purpose:"+l.id,attrs:{"data-purpose":l.id},title:l.label,mono:!1,root:null,files:l.files})):Te(e).map(l=>({key:l.root,attrs:{"data-root":l.root},title:W(l.root),full:l.root,mono:!0,root:l.root,sub:Ms[l.location]||"Other",files:l.files}));return a.length&&n.push({key:"watched",attrs:{"data-root":"watched"},title:"Watched folders",mono:!1,root:null,flat:!0,sub:"folders the monitor reads",files:a}),n}function yo({g:t,w:s,open:e,setOpen:a,shut:n,setShut:l,grid:i}){const c=!!n[t.key],d=[...new Set(t.files.flatMap(r=>r.tools))],h=t.files.reduce((r,p)=>r+(p.is_dir?0:Number(p.bytes)||0),0),u=(t.flat?[{dir:"",files:t.files}]:Le(t.files)).map(r=>({...r,files:i.order(r.files)}));return t.root&&u.sort((r,p)=>(p.dir===t.root)-(r.dir===t.root)),o`<tbody ...${t.attrs}>
    <tr class="st-group"><th scope="colgroup" colspan=${gt}>
      <button type="button" class="st-fold" aria-expanded=${c?"false":"true"}
        onClick=${()=>l({...n,[t.key]:!c})}>
        <span aria-hidden="true">${c?"▸":"▾"}</span>
        <span class=${t.mono?"st-mono":""} title=${t.full||void 0}>${t.title}</span></button>
      <span class="st-group__meta">${t.sub?t.sub+" · ":""}${t.files.length} ${t.files.length===1?"file":"files"}${h?" · "+qt(h):""}</span>
      ${d.length>0&&o`<span class="st-tools st-group__tools">${d.map(r=>o`<${V} key=${r} id=${r} label=${s.labelOf(r)}/>`)}</span>`}
    </th></tr>
    ${!c&&u.map(r=>{const p=t.key+"|"+r.dir,f=e[p]?r.files:r.files.slice(0,lo),$=r.files.length-f.length;return o`<${ns} key=${p}>
        ${r.dir&&r.dir!==t.root&&o`<tr class="st-folder" data-dir=${r.dir}><td colspan=${gt}>
          <span class="st-mono st-path" title=${r.dir}>${W(r.dir)}</span><span class="st-dim"> · ${r.files.length}</span></td></tr>`}
        ${f.map(_=>o`<${uo} key=${_.path} f=${_} w=${s}/>`)}
        ${$>0&&o`<tr class="st-morerow"><td colspan=${gt}>
          <button type="button" class="st-link st-more" onClick=${()=>a({...e,[p]:!0})}>▸ ${$} more</button>
        </td></tr>`}
      </${ns}>`})}
  </tbody>`}const bo=[{value:"location",label:"By location"},{value:"purpose",label:"By purpose"}],mo=t=>{if(!t.mtime)return;const s=Number(t.mtime);return s>0?s:typeof t.mtime=="string"&&Date.parse(t.mtime)||void 0};function ks(t){return[{k:"file",l:"File",cls:"st-c-file",get:s=>s.name},{k:"purpose",l:"Purpose",get:s=>s.is_dir?"Folder":X[I(s)]},{k:"scope",l:"Scope",get:s=>s.scope},{k:"readby",l:"Read by",get:s=>s.tools.map(t.labelOf).join(", ")},{k:"settings",l:"Settings",cls:"st-num",n:!0,get:s=>s.settings||void 0},{k:"size",l:"Size",cls:"st-num",n:!0,get:s=>s.is_dir||s.bytes==null?void 0:Number(s.bytes)},{k:"git",l:"Git",get:s=>s.git_state},{k:"changed",l:"Last change",n:!0,get:mo}]}function ko({w:t}){const s=j("settings.files",ks(t)),[e,a]=w({}),[n,l]=w({}),i=St(t),c=t.st.group==="purpose"?"purpose":"location",d=fo(i,c),h=ho(t);return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Files aictl reads</h2>
      <span class="st-bar__sub">${i.length} ${i.length===1?"file":"files"} · grouped by ${c==="purpose"?"what they are for":"where they live"}</span>
      <div class="st-seg st-bar__end" role="group" aria-label="Group the files">
        ${bo.map(u=>o`<button key=${u.value} type="button" class="st-seg__btn" aria-pressed=${c===u.value?"true":"false"}
          onClick=${()=>t.set({group:u.value})}>${u.label}</button>`)}
      </div>
    </div>
    ${t.filesStatus!=="ready"&&o`<p class="st-note" role="status">File details are loading</p>`}
    <${po} w=${t}/>
    <${ro} w=${t}/>
    ${d.length||h.length?o`<div class="st-scroll"><table class=${"st-table st-files "+s.tableProps.class} style=${s.tableProps.style}>
      <thead><tr>${ks(t).map(s.th)}</tr></thead>
      ${d.map(u=>o`<${yo} key=${u.key} g=${u} w=${t} open=${e} setOpen=${a} shut=${n} setShut=${l} grid=${s}/>`)}
      ${h.length>0&&o`<${$o} w=${t} items=${h}/>`}
    </table></div>`:o`<p class="st-empty">${t.files.length?"No file matches the search or the filters.":"No settings files were found."}</p>`}
  </section>`}const go=5;function Ws(t,s){return t?W(t)+(s>0?":"+s:""):"—"}function vo({w:t}){const s=Os(t.findings.filter(e=>As(e,t.q)));return o`<nav class="st-nav" aria-label="Finding rules">
    <${P}>Finding rules</${P}>
    <ul class="st-nav__list">
      <li><button type="button" class=${"st-nav__item"+(t.st.sec?"":" is-on")} aria-current=${t.st.sec?void 0:"true"}
        onClick=${()=>t.set({sec:"",row:""})}>
        <span class="st-dotspace" aria-hidden="true"></span><span class="st-nav__label">All rules</span>
        <span class="st-nav__n">${s.reduce((e,a)=>e+a.count,0)}</span></button></li>
      ${s.map(e=>{const a=t.st.sec===e.rule;return o`<li key=${e.rule}><button type="button" class=${"st-nav__item"+(a?" is-on":"")}
          aria-current=${a?"true":void 0} data-rule=${e.rule}
          onClick=${()=>t.set({sec:a?"":e.rule,row:""})}>
          ${e.alarm?o`<${ht} label=${e.severity+" severity"}/>`:o`<span class="st-dotspace" aria-hidden="true"></span>`}
          <span class="st-nav__label">${e.label}</span><span class="st-nav__n">${e.count}</span></button></li>`})}
    </ul>
  </nav>`}function _o({f:t,group:s,w:e}){const a=e.selectedFinding&&e.selectedFinding.id===t.id,n=()=>e.select({row:t.id,sec:e.st.sec}),l=s.why&&t.why===s.why?t.action||"":t.why||t.action||"",i=dt(t).map(e.labelOf).join(", ")||(t.session_id?"session "+t.session_id:"—");return o`<tr class=${"st-row"+(a?" is-sel":"")+(t.severity==="high"||t.severity==="medium"?" st-row--risky":"")}
    data-id=${t.id} tabindex="0" onClick=${n}
    onKeyDown=${c=>{(c.key==="Enter"||c.key===" ")&&(c.preventDefault(),n())}}>
    <td class="st-c-tool">${i}</td>
    <td class="st-c-where st-mono" title=${t.path?t.path+(t.line>0?":"+t.line:""):void 0}>
      ${Ws(t.path,t.line)}${t.count>1?o` <span class="st-dim">×${t.count}</span>`:""}</td>
    <td class="st-c-what" title=${[t.why,t.action].filter(Boolean).join(`
`)||void 0}>${l}</td>
    <td class="st-c-act">${t.path&&(Y(t.path)?o`<button type="button" class="st-chip st-chip--btn"
        onClick=${c=>{c.stopPropagation(),e.openEnv(D(t.path),dt(t)[0]||"")}}>Show the variable</button>`:o`<button type="button" class="st-chip st-chip--btn"
        onClick=${c=>{c.stopPropagation(),e.openAt(t.path,t.line)}}>Show the line</button>`)}</td>
  </tr>`}function gs(t){return[{k:"tool",l:"Tool",cls:"st-c-tool",get:e=>dt(e).map(t.labelOf).join(", ")},{k:"where",l:"Where",cls:"st-c-where",get:e=>e.path?W(e.path)+String(e.line>0?e.line:0).padStart(8,"0"):void 0},{k:"what",l:"What it does",get:e=>e.why||e.action},{k:"action",l:o`<span class="st-sr">Action</span>`,cls:"st-c-act"}]}function wo({w:t}){var u,r;const s=j("settings.findings",gs(t)),[e,a]=w({});if(t.auditStatus==="loading"&&!t.audit){const p=t.scan;return o`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note" role="status" aria-busy="true" data-state="scanning">Scanning context sources…${p?" "+(p.step||"")+(p.elapsed_s!=null?", "+Math.round(p.elapsed_s)+" s":""):""}</p>
    </section>`}if(t.auditStatus==="error"&&!t.audit)return o`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note st-red" role="alert">The context audit failed: ${t.auditError}
        ${t.rescan&&o` <button type="button" class="st-btn" onClick=${()=>t.rescan()}>Retry</button>`}</p>
    </section>`;const n=t.findings.filter(p=>As(p,t.q)),l=Os(n).filter(p=>!t.st.sec||p.rule===t.st.sec),i=l.reduce((p,f)=>p+f.count,0),c=t.auditStatus==="loading",d=((u=t.audit)==null?void 0:u.incomplete)||[],h=((r=t.audit)==null?void 0:r.failed_steps)||[];return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Findings</h2>
      <span class="st-bar__sub">${i} in ${l.length} ${l.length===1?"rule":"rules"} · hidden changes, conflicts and settings outside this project</span>
      ${t.rescan&&o`<button type="button" class="st-chip st-chip--btn st-bar__end" disabled=${c}
        onClick=${()=>t.rescan()}>${c?"Scanning…":"Rescan"}</button>`}
    </div>
    ${c&&o`<p class="st-note" role="status" data-state="rescanning">Scanning again…${t.scan?" "+(t.scan.step||"")+(t.scan.elapsed_s!=null?", "+Math.round(t.scan.elapsed_s)+" s":""):""} The last results stay until it ends.</p>`}
    ${t.auditStatus==="error"&&o`<p class="st-note st-red" role="alert">The last scan failed: ${t.auditError}. These are the earlier results.</p>`}
    ${d.length>0&&o`<p class="st-note st-warn">The scan reached its time limit and skipped: ${d.join(", ")}.</p>`}
    ${h.length>0&&o`<p class="st-note st-warn">The scan could not read: ${h.map(p=>p.step+" ("+p.error+")").join(", ")}.</p>`}
    ${l.length?o`<table class=${"st-table st-findings "+s.tableProps.class} style=${s.tableProps.style}>
      <thead><tr>${gs(t).map(s.th)}</tr></thead>
      ${l.map(p=>{const f=!!e[p.rule],$=s.order(p.items),_=f?$:$.slice(0,go),O=$.length-_.length;return o`<tbody key=${p.rule} data-rule=${p.rule}>
          <tr class="st-group"><th scope="colgroup" colspan="4">
            ${p.alarm&&o`<${ht} label=${p.severity+" severity"}/>`} ${p.label}
            <span class="st-group__meta">${p.count} · ${p.tools.map(t.labelOf).join(", ")||"no tool"}${p.why?" · "+p.why:""}</span>
          </th></tr>
          ${_.map(N=>o`<${_o} key=${N.id} f=${N} group=${p} w=${t}/>`)}
          ${O>0&&o`<tr class="st-morerow"><td colspan="4">
            <button type="button" class="st-link st-more" onClick=${()=>a({...e,[p.rule]:!0})}>▸ ${O} more</button>
          </td></tr>`}
        </tbody>`})}
    </table>`:o`<p class="st-empty">${t.findings.length?"No finding matches the search.":"No findings for the selected tools."}</p>`}
  </section>`}const U=[{id:"allow",label:"Allow",hint:"run without asking"},{id:"deny",label:"Deny",hint:"always refused"},{id:"ask",label:"Ask",hint:"always ask first"}];function vs(t){return String((t==null?void 0:t.message)||t||"").replace(/^HTTP \d+ \S+: /,"")||"The request failed"}const Et=t=>Object.fromEntries(U.map(s=>{var e;return[s.id,Na((e=t==null?void 0:t.permissions)==null?void 0:e[s.id])]}));function Co({title:t,diff:s}){const e=s.added.length||s.removed.length;return o`<div class="st-diff" data-bucket=${t}>
    <span class="st-diff__name">${t}</span>
    <span class="st-diff__chips">
      ${e?o`${s.added.map(a=>o`<code key=${"a"+a} class="st-diff__chip is-added">+ ${a}</code>`)}
          ${s.removed.map(a=>o`<code key=${"r"+a} class="st-diff__chip is-removed">- ${a}</code>`)}`:o`<span class="st-dim">no change</span>`}
    </span>
  </div>`}function So({tool:t,target:s,refresh:e,onClose:a}){const[n,l]=w(null),[i,c]=w(()=>Et(null)),[d,h]=w(!0),[u,r]=w(!1),[p,f]=w(null),[$,_]=w(null),O=q(()=>{let m=!0;return h(!0),f(null),$e(t,s.scope).then(x=>{m&&(l(x),c(Et(x)),h(!1))},x=>{m&&(f({message:vs(x),conflict:!0}),h(!1))}),()=>{m=!1}},[t,s.scope]);rt(()=>O(),[O]);const N=Object.fromEntries(U.map(m=>[m.id,Fa(i[m.id])])),T=Object.fromEntries(U.map(m=>{var x;return[m.id,((x=n==null?void 0:n.permissions)==null?void 0:x[m.id])||[]]})),xt=Object.fromEntries(U.map(m=>[m.id,Ra(T[m.id],N[m.id])])),F=U.some(m=>JSON.stringify(T[m.id])!==JSON.stringify(N[m.id])),Mt=JSON.stringify({permissions:N},null,2),bt=(n==null?void 0:n.path)||s.path,Q=()=>{r(!0),f(null),_(null),fe(t,{scope:s.scope,expected_mtime:(n==null?void 0:n.mtime)??null,permissions:N}).then(m=>{l(m),c(Et(m)),_({backup:(m==null?void 0:m.backup_path)||""}),r(!1),typeof e=="function"&&e()},m=>{f({message:vs(m),conflict:(m==null?void 0:m.status)===409}),r(!1)})},mt=()=>{_(null),O()};return o`<section class="st-insp__sec st-editor" data-testid="st-perm-editor" aria-label="Edit permissions">
    <h4 class="st-insp__h">Edit permissions · ${s.label}</h4>
    <p class="st-hint st-editor__target" data-testid="st-editor-target">
      Writes <span class="st-mono" title=${bt}>${bt}</span> (${s.label})${n&&!n.exists?", a new file":""}
    </p>
    ${p&&o`<div class="st-editor__error" role="alert" data-testid="st-editor-error">
      <span>${p.message}</span>
      ${p.conflict&&o`<button type="button" class="st-btn" onClick=${mt}>Reload</button>`}
    </div>`}
    ${$&&o`<div class="st-editor__saved" role="status" data-testid="st-editor-saved">
      ${$.backup?o`Saved. Backup: <span class="st-mono" title=${$.backup}>${$.backup}</span>`:"Saved. The file was new, so there is no backup."}
    </div>`}
    ${d?o`<p class="st-hint">Loading the file…</p>`:n&&o`
      <div class="st-editor__fields">
        ${U.map(m=>o`<label key=${m.id} class="st-editor__field">
          <span class="st-editor__label">${m.label} <span class="st-dim">· ${m.hint}, one rule per line</span></span>
          <textarea class="st-editor__area" data-bucket=${m.id} rows="4" spellcheck="false" value=${i[m.id]}
            onInput=${x=>c({...i,[m.id]:x.currentTarget.value})}></textarea>
        </label>`)}
      </div>
      <div class="st-editor__diff" data-testid="st-editor-diff">
        <div class="st-insp__h">Pending diff</div>
        ${U.map(m=>o`<${Co} key=${m.id} title=${m.id} diff=${xt[m.id]}/>`)}
      </div>
      <pre class="st-editor__json" data-testid="st-editor-json">${Mt}</pre>`}
    <div class="st-actions">
      <button type="button" class="st-btn st-btn--primary" onClick=${Q} disabled=${d||u||!n||!F}>${u?"Saving…":"Save"}</button>
      <button type="button" class="st-btn" onClick=${a}>Cancel</button>
    </div>
  </section>`}function k({title:t,children:s}){return o`<section class="st-insp__sec"><h4 class="st-insp__h">${t}</h4>${s}</section>`}function Ht(t,s){return"Open "+H(t)+(s>0?" at line "+s:"")}function Gt(t,s){return s?t.findings.filter(e=>pt(e.path,s)):[]}function Kt(t,s){t.set({view:"findings",sec:s.rule||"",row:s.id,tool:""})}function Vs({w:t,path:s}){const e=s&&t.recentFiles&&typeof t.recentFiles.get=="function"?t.recentFiles.get(s):null,a=s?t.mtimeOf(s):null,n=[];return e?n.push(`File changed ${ct(e.ts)}${e.tool?" by "+t.labelOf(e.tool):""} (file history)`):a&&n.push(`File last changed ${ct(a)} (file history)`),o`<div class="st-hint" data-testid="st-history">${n.length?n.join(" · ")+" · no aictl change recorded":"No aictl change recorded"}</div>`}function xo(t,s){var a;const e=(a=t.chain)==null?void 0:a[t.wins];return t.locked||It(e,s)?"Locked by "+M(t.locked?t.scope:e.scope,s):Rs}function Mo(t,s){const e=ze(s);return`Not set in any file. Default: ${wt(t.value)}.`+(e?` Set it in ${W(e.path)} (${e.label}).`:"")}function Oo({w:t,row:s}){const e=t.scopesOf(s.tool),a=t.entries.filter(r=>r.id!==s.tool&&s.source&&r.files.some(p=>pt(p,s.source))).map(r=>r.label),n=s.source?t.files.find(r=>pt(r.path,s.source)):null;for(const r of(n==null?void 0:n.tools)||[]){const p=t.labelOf(r);r!==s.tool&&!a.includes(p)&&a.push(p)}const l=Gt(t,s.source),{chain:i,wins:c}=s,d=ja(s,e),[h,u]=w(!1);return o`<div class="st-insp__body" data-testid="st-inspector-row">
    <h3 class="st-insp__title">${s.label}</h3>
    <div class="st-insp__key st-mono">${s.key}</div>
    ${s.tip&&o`<p class="st-insp__tip">${s.tip}</p>`}
    <div class="st-insp__chips">
      ${s.risky&&o`<span class="st-chip st-chip--risky">risky</span>`}
      <${V} id=${s.tool} label=${t.labelOf(s.tool)}/>
      <${G} scope=${s.scope} locked=${s.locked} label=${M(s.scope,e)}/>
      ${s.undocumented&&o`<${Ct}/>`}
      ${a.length>0&&o`<span class="st-chip">also read by ${a.join(", ")}</span>`}
    </div>
    <div class=${"st-insp__value"+(s.unset?" is-unset":"")}><${vt} row=${s}/></div>
    ${s.unset&&o`<p class="st-insp__tip" data-testid="st-unset-text">${Mo(s,e)}</p>`}
    <${k} title="Override chain · what wins and why">
      <ol class="st-chain">
        ${i.map((r,p)=>{const f=p===c,$=It(r,e);return o`<li key=${p} class=${"st-chain__lv"+(f?" is-win":"")+($?" is-locked":"")} aria-current=${f?"true":void 0}>
            <span class="st-chain__sc">${$&&o`<${yt} label=${"Locked: "+M(r.scope,e)+" cannot be changed here"}/>`}${r.scope||"default"}</span>
            <span class="st-chain__v">${Re(r)?o`<span class="st-dim">not set</span>`:o`<${vt} row=${s} value=${r.value} compact/>`}</span>
            <span class="st-chain__src">${r.source?o`<${$t} path=${r.source} line=${Number(r.line)>0?Number(r.line):0} w=${t} tool=${s.tool}/>`:o`<span class="st-dim">${r.note||(r.scope==="default"?t.labelOf(s.tool):"—")}</span>`}</span>
            ${f&&o`<span class="st-sr"> (wins)</span>`}
          </li>`})}
      </ol>
      <p class="st-hint st-insp__why">${qe(i,c)}</p>
    </${k}>
    ${!Y(s.source)&&o`<${k} title="History"><${Vs} w=${t} path=${s.source}/></${k}>`}
    <${k} title="Actions">
      <div class="st-actions">
        ${s.source&&(Y(s.source)?o`<button type="button" class="st-btn" onClick=${()=>t.openEnv(D(s.source),s.tool)}>Show ${D(s.source)||"the variable"}</button>`:o`<button type="button" class="st-btn" onClick=${()=>t.openAt(s.source,s.line)}>${Ht(s.source,s.line)}</button>`)}
        ${l.length>0&&o`<button type="button" class="st-btn" onClick=${()=>Kt(t,l[0])}>Show finding</button>`}
      </div>
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled=${!d.ok||h}
          aria-expanded=${d.ok?h?"true":"false":void 0}
          onClick=${()=>u(!0)}>Change value…</button>
        <span class="st-hint" data-testid="st-change-hint">${d.ok?`Edits ${W(d.path)||"the "+d.label+" file"} (${d.label})`:d.hint}</span>
      </div>
    </${k}>
    ${h&&o`<${So} tool=${s.tool} target=${d} refresh=${t.refresh}
      onClose=${()=>u(!1)}/>`}
  </div>`}function Ao({w:t,row:s}){const e=s.agent,a=t.scopesOf(s.tool),{steps:n,wins:l,why:i}=Fe(s),c=u=>Number(u)>0?Number(u):0,d=[{label:"Defined in",path:e.defined_in,line:c(e.defined_line),scope:e.scope_defined},{label:"Pinned in",path:e.pinned_in,line:c(e.pinned_line),scope:e.scope_pinned}],h=xo(s,a);return o`<div class="st-insp__body" data-testid="st-inspector-agent">
    <h3 class="st-insp__title">${e.name||s.label}</h3>
    <div class="st-insp__key st-mono">${s.key}</div>
    ${e.description&&o`<p class="st-insp__tip">${e.description}</p>`}
    <div class="st-insp__chips">
      <${V} id=${s.tool} label=${t.labelOf(s.tool)}/>
      <${G} scope=${s.scope} locked=${s.locked} label=${M(s.scope,a)}/>
    </div>
    <div class="st-insp__value"><${Ls} row=${s} w=${t}/></div>
    <${k} title="Model · what decides it">
      <ol class="st-chain">
        ${n.map((u,r)=>{const p=r===l;return o`<li key=${u.id} class=${"st-chain__lv"+(p?" is-win":"")} aria-current=${p?"true":void 0}>
            <span class="st-chain__sc">${u.label}</span>
            <span class="st-chain__v">${u.value===void 0||u.value===null||u.value===""?o`<span class="st-dim">${u.id==="pin"&&u.present?"set":"not set"}</span>`:u.value==="inherits"?o`<span class="st-inherit">inherits</span>`:o`<span class="st-v">${String(u.value)}</span>`}</span>
            <span class="st-chain__src">${u.source?o`<${$t} path=${u.source} line=${u.line} w=${t}/>`:o`<span class="st-dim">${u.id==="effective"?l===2?"session model":"":"—"}</span>`}</span>
            ${p&&o`<span class="st-sr"> (wins)</span>`}
          </li>`})}
      </ol>
      <p class="st-hint st-insp__why">${i}</p>
    </${k}>
    <${k} title="Agent">
      <dl class="st-insp__dl">
        <dt>Effort</dt><dd>${e.effort||"—"}</dd>
        <dt>Context</dt><dd>${e.context_tier||"—"}</dd>
        <dt>Target</dt><dd>${e.target||"—"}</dd>
        <dt>Model policy</dt><dd>${e.model_policy||"—"}</dd>
      </dl>
    </${k}>
    <${k} title=${"Tools"+(e.tools.length?" · "+e.tools.length:"")}><${Ps} tools=${e.tools} all/></${k}>
    <${k} title="Files">
      <dl class="st-insp__dl st-insp__files">
        ${d.map(u=>o`<dt key=${u.label+"t"}>${u.label}</dt><dd key=${u.label+"d"}>
          ${u.path?o`<span class="st-mono" title=${u.path+(u.line?":"+u.line:"")}>${H(u.path)}${u.line?":"+u.line:""}</span>
            ${u.scope&&o` <span class="st-dim">· ${M(u.scope,a)}</span>`}
            <button type="button" class="st-link" onClick=${()=>t.openAt(u.path,u.line)}
              aria-label=${Ht(u.path,u.line)}>Open</button>`:o`<span class="st-dim">—</span>`}
        </dd>`)}
      </dl>
    </${k}>
    <${k} title="History"><${Vs} w=${t} path=${e.defined_in||s.source}/></${k}>
    <${k} title="Actions">
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled>Change model…</button>
        <span class="st-hint" data-testid="st-change-hint">${h}</span>
      </div>
    </${k}>
  </div>`}function To({w:t,file:s}){const e=Gt(t,s.path),a=s.rows||[];return o`<div class="st-insp__body" data-testid="st-inspector-file">
    <h3 class="st-insp__title">${s.name}</h3>
    <div class="st-insp__key st-mono">${s.path}</div>
    <div class="st-insp__chips">
      <span class="st-chip">${s.is_dir?"Watched folder":X[I(s)]}</span>
      <${G} scope=${s.scope}/>
      <span class="st-chip">${Ms[s.location]||"Other"}</span>
      ${s.tools.map(n=>o`<${V} key=${n} id=${n} label=${t.labelOf(n)}/>`)}
    </div>
    <${k} title=${"Settings from this file"+(a.length?" · "+a.length:"")}>
      ${a.length?o`<ul class="st-insp__list">
        ${a.map(n=>o`<li key=${n.uid}><button type="button" class="st-link"
          onClick=${()=>t.set({view:"tool",tool:n.tool,sec:"",row:n.key})}>${n.label}</button>
          <span class="st-dim"> · ${t.labelOf(n.tool)}${n.line>0?" · line "+n.line:""}</span></li>`)}
      </ul>`:o`<div class="st-hint">${s.settings?s.settings+" settings":"No settings are read from this file."}</div>`}
    </${k}>
    <${k} title="File">
      <dl class="st-insp__dl">
        <dt>Path</dt><dd class="st-insp__path">${s.path}</dd>
        <dt>Purpose</dt><dd>${s.is_dir?"Watched folder":X[I(s)]}${s.kind&&s.kind!==I(s)?" ("+s.kind+")":""}</dd>
        <dt>Scope</dt><dd>${s.scope||"—"}</dd>
        <dt>Git</dt><dd>${s.git_state||"—"}</dd>
        <dt>Size</dt><dd>${s.bytes!=null&&!s.is_dir?qt(s.bytes):"—"}</dd>
        <dt>Last change</dt><dd>${s.mtime?ct(s.mtime):"—"}</dd>
        ${s.mtime?o`<dt>Modified</dt><dd>${new Date(s.mtime*1e3).toLocaleString()}</dd>`:null}
        ${s.loading&&o`<dt>Loading</dt><dd>${s.loading}</dd>`}
        ${s.exists===!1&&o`<dt>State</dt><dd>missing</dd>`}
      </dl>
    </${k}>
    <${k} title="Actions">
      <div class="st-actions">
        ${!s.is_dir&&o`<button type="button" class="st-btn" onClick=${()=>t.openAt(s.path)}>Open file</button>`}
        ${e.length>0&&o`<button type="button" class="st-btn" onClick=${()=>Kt(t,e[0])}>Show finding</button>`}
      </div>
    </${k}>
  </div>`}function Eo({w:t,v:s}){const e=Ne(s),a=Gt(t,s.source);return o`<div class="st-insp__body" data-testid="st-inspector-env">
    <h3 class="st-insp__title st-mono">${s.name||"Environment variable"}</h3>
    <div class="st-insp__key">Environment variable${s.name?"":" (this aictl version did not name it)"}</div>
    ${s.description&&o`<p class="st-insp__tip">${s.description}</p>`}
    <div class="st-insp__chips">
      <${V} id=${s.tool} label=${t.labelOf(s.tool)}/>
      <${G} scope="env" label=${M("env",t.scopesOf(s.tool))}/>
      ${s.masked&&o`<span class="st-chip st-chip--muted">value hidden</span>`}
      ${!s.documented&&o`<${Ct}/>`}
    </div>
    <div class=${"st-insp__value"+(s.set?"":" is-unset")} data-testid="st-env-value">${s.set?s.masked?o`<span class="st-dim" title="The name says it holds a credential, so the value is not shown">hidden</span>`:o`<span class="st-v st-mono">${s.value===""?"(empty)":s.value}</span>`:o`<span class="st-dim">not set</span>`}</div>
    <${k} title="Where it is set">
      ${e.length?o`<ul class="st-insp__list" data-testid="st-env-where">
        ${e.map(n=>o`<li key=${n.id}>
          <b>${n.label}</b>${n.origin&&o` <span class="st-mono" title=${n.origin}>${W(n.origin)}</span>`}
          ${n.value!==s.value&&o` <span class="st-dim">= ${n.value}</span>`}
          ${n.file&&o` <button type="button" class="st-link" onClick=${()=>t.openAt(n.file)}
            aria-label=${"Open "+H(n.file)}>Open</button>`}
          <div class="st-hint">${n.note}</div>
        </li>`)}
      </ul>`:o`<div class="st-hint">Not set in aictl's environment, in a shell profile or in the registry.</div>`}
    </${k}>
    <${k} title=${"What it drives"+(s.drives.length?" · "+s.drives.length:"")}>
      ${s.drives.length?o`<ul class="st-insp__list" data-testid="st-env-drives">
        ${s.drives.map(n=>o`<li key=${n.key}><button type="button" class="st-link"
          onClick=${()=>t.set({view:"tool",tool:s.tool,sec:"",row:n.key})}>${n.label}</button>
          <span class="st-dim st-mono"> · ${n.key}</span></li>`)}
      </ul>`:o`<div class="st-hint">No setting shown here reads it; ${t.labelOf(s.tool)} reads it when it starts.</div>`}
    </${k}>
    <${k} title="Actions">
      <div class="st-actions">
        ${a.length>0&&o`<button type="button" class="st-btn" onClick=${()=>Kt(t,a[0])}>Show finding</button>`}
        <span class="st-hint">A change applies to sessions started after it, from a shell that has the new value.</span>
      </div>
    </${k}>
  </div>`}function Lo({w:t,f:s}){return o`<div class="st-insp__body" data-testid="st-inspector-finding">
    <h3 class="st-insp__title">${Ie(s.rule)}</h3>
    <div class="st-insp__key st-mono">${Ws(s.path,s.line)}</div>
    <div class="st-insp__chips">
      <span class=${"st-chip"+(s.severity==="high"||s.severity==="medium"?" st-chip--risky":"")}>${s.severity||"info"}</span>
      ${dt(s).map(e=>o`<${V} key=${e} id=${e} label=${t.labelOf(e)}/>`)}
      ${s.session_id&&o`<span class="st-chip st-chip--mono">session ${s.session_id}</span>`}
    </div>
    ${s.why&&o`<${k} title="Why it matters"><p class="st-insp__tip">${s.why}</p></${k}>`}
    ${s.action&&o`<${k} title="What to do"><p class="st-insp__tip">${s.action}</p></${k}>`}
    <${k} title="Actions">
      <div class="st-actions">
        ${s.path&&(Y(s.path)?o`<button type="button" class="st-btn" onClick=${()=>t.openEnv(D(s.path),dt(s)[0]||"")}>Show ${D(s.path)||"the variable"}</button>`:o`<button type="button" class="st-btn" onClick=${()=>t.openAt(s.path,s.line)}>${s.line>0?Ht(s.path,s.line):"Show the line"}</button>`)}
      </div>
    </${k}>
  </div>`}function Po({w:t}){const{view:s}=t.st;let e=null;return(s==="tool"||s==="topic")&&t.selectedEnv?e=o`<${Eo} key=${t.selectedEnv.uid} w=${t} v=${t.selectedEnv}/>`:(s==="tool"||s==="topic")&&t.selected?e=Cs(t.selected)?o`<${Ao} key=${t.selected.uid} w=${t} row=${t.selected}/>`:o`<${Oo} key=${t.selected.uid} w=${t} row=${t.selected}/>`:s==="files"&&t.selectedFile?e=o`<${To} w=${t} file=${t.selectedFile}/>`:s==="findings"&&t.selectedFinding&&(e=o`<${Lo} w=${t} f=${t.selectedFinding}/>`),o`<aside class=${"st-insp"+(t.drawer?" is-open":"")} aria-label="Inspector">
    <button type="button" class="st-insp__close st-btn" onClick=${t.closeDrawer} aria-label="Close the inspector">Close</button>
    ${e||o`<div class="st-insp__body st-insp__body--empty">
      <h3 class="st-insp__title">Nothing selected</h3>
      <p class="st-hint">${s==="files"?"Click a file for its details.":s==="findings"?"Click a finding for its details.":"Click a setting to see where it is set, what wins and why, and what you can do with it."}</p>
    </div>`}
  </aside>`}const jo=[{value:"tool",label:"By tool"},{value:"topic",label:"By topic"},{value:"files",label:"Files"},{value:"findings",label:"Findings"}],Rt=new Set(["tool","topic"]);function _s(){return typeof window<"u"?window.location.search:""}function No(){const[t,s]=w(()=>rs(_s())),e=q(a=>s(n=>{const l={...n,...a};if(a.view&&a.view!==n.view&&!(Rt.has(n.view)&&Rt.has(a.view)))for(const i of["tool","sec","row"])i in a||(l[i]="");if(a.view&&a.view!==n.view&&!("scope"in a)&&(l.scope=""),a.view&&a.view!==n.view)for(const i of Je)i in a||(l[i]=i==="recent"?!1:"");return l}),[]);return rt(()=>{os(Ye(t))},[t]),rt(()=>{const a=()=>s(rs(_s()));return window.addEventListener("popstate",a),()=>{window.removeEventListener("popstate",a),os(Xe)}},[]),[t,e]}function Fo(){const[t,s]=w({status:"loading",files:null});return rt(()=>{let e=!0;return me().then(a=>{e&&s(Array.isArray(a==null?void 0:a.files)?{status:"ready",files:a.files}:{status:"unavailable",files:null})},()=>{e&&s({status:"unavailable",files:null})}),()=>{e=!1}},[]),t}function Ro(t){const s=t||{},e=s.audit||null;return{status:s.loading?"loading":s.error?"error":e||s.loading===!1?"ready":"loading",audit:e,scan:s.scan||null,error:s.error?String(s.error):null}}function Do({source:t={},note:s=""}){var es;const{toolConfigs:e,tools:a,monitor:n,root:l,enabledTools:i=null,recentFiles:c,toolName:d,openFile:h,findings:u,refresh:r,hooks:p}=t,f=L(()=>De({toolConfigs:e,tools:a,monitor:n,root:l,enabledTools:i}),[e,a,n,l,i]),[$,_]=No(),[O,N]=w(""),[T,xt]=w(!1),[F,Mt]=w(!1),[bt,Q]=w(!1),mt=ws(null),m=Fo(),x=Ro(u),Us=u==null?void 0:u.rescan;rt(()=>{const b=g=>{var S;g.key==="/"&&!ye(g.target)&&!g.metaKey&&!g.ctrlKey&&!g.altKey?(g.preventDefault(),(S=mt.current)==null||S.focus()):g.key==="Escape"&&Q(!1)};return window.addEventListener("keydown",b),()=>window.removeEventListener("keydown",b)},[]);const C=L(()=>We(f),[f]),K=L(()=>Ve(f),[f]),Zt=L(()=>Ue(f),[f]),Ot=L(()=>is({q:O,nonDefault:T,risky:F,unset:$.unset}),[O,T,F,$.unset]),Bs=L(()=>is({q:O,nonDefault:T,risky:F,unset:!0}),[O,T,F]),Hs=q(b=>Ot(b)&&(!$.scope||b.scope===$.scope),[Ot,$.scope]),Gs=L(()=>Be(C),[C]),tt=L(()=>He(m.files,C,Zt,i),[m.files,C,Zt,i]),st=L(()=>be(x.audit,i),[x.audit,i]),At=L(()=>Ge((st==null?void 0:st.findings)||[]),[st]),Ks=q((b,g=0)=>{!b||!h||h(b,g>0?g:0)},[h]),Jt=q(b=>{_(b),Q(!0)},[_]),Zs=q(()=>Q(!1),[]),Js=q(b=>{const g=Ke(b,f);return g===b&&d?d(b):g},[f,d]),Ys=q(b=>{var g;return((g=C.find(S=>S.id===b))==null?void 0:g.scopes)||[]},[C]),Xs=q(b=>{const g=tt.find(S=>pt(S.path,b));if(g!=null&&g.mtime)return g.mtime;for(const S of(f==null?void 0:f.tools)||[])for(const A of S.files||[])if(pt(A.path,b)&&A.mtime)return A.mtime;return null},[tt,f]);if(!f)return o`<p class="loading-state">Loading...</p>`;if(!C.length&&!K&&!as(i))return o`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;const Tt=C.some(b=>b.id===$.tool)||$.tool==="aictl"&&K?$.tool:((es=C[0])==null?void 0:es.id)||(K?"aictl":""),R=C.find(b=>b.id===Tt)||null,Yt=(b,g)=>{var S;return g&&((S=C.find(A=>A.id===b))==null?void 0:S.rows.find(A=>A.key===g))||null},Qs=$.view==="tool"?R?Yt(R.id,$.row):null:$.view==="topic"?Yt($.tool,$.row):null,te=$.view==="files"&&$.row&&tt.find(b=>b.path===$.row)||null,Xt=(b,g)=>{if(!String(g).startsWith(cs))return null;const S=C.find(at=>at.id===b);if(!S)return null;const A=D(g);return S.envVars.find(at=>at.name===A)||{name:A,tool:S.id,uid:S.id+""+g,source:g,set:!1,value:"",masked:!1,in_process:!1,persisted:[],drives:[],label:A,description:"",section:"",documented:!1}},se=$.view==="tool"?R?Xt(R.id,$.row):null:$.view==="topic"?Xt($.tool,$.row):null,Qt=(b,g="")=>{var A;const S=C.some(at=>at.id===g)?g:(R==null?void 0:R.id)||((A=C[0])==null?void 0:A.id)||"";Jt({view:Rt.has($.view)?$.view:"tool",tool:S,row:cs+b})},ee=(b,g=0)=>Y(b)?Qt(D(b)):Ks(b,g),ne=$.view==="findings"&&$.row&&At.find(b=>b.id===$.row)||null,E={st:$,set:_,select:Jt,q:O,pass:Ot,passAll:Bs,passTool:Hs,showUnset:$.unset,scopesOf:Ys,managedAbsent:Gs,entries:C,aictl:K,toolId:Tt,files:tt,filesStatus:m.status,findings:At,audit:st,auditStatus:x.status,auditError:x.error,scan:x.scan,rescan:Us,selected:Qs,selectedFile:te,selectedFinding:ne,selectedEnv:se,openAt:ee,openEnv:Qt,labelOf:Js,mtimeOf:Xs,recentFiles:c,drawer:bt,closeDrawer:Zs,refresh:r,hooks:p},{set:ae,agents:oe,knowsSet:ts,unset:le,risky:ss}=Ze(C),ie=as(i)&&!C.some(b=>b.id!=="vscode");let et,nt;return $.view==="topic"?(et=o`<${eo} w=${E}/>`,nt=o`<${oo} w=${E}/>`):$.view==="files"?(et=o`<${co} w=${E}/>`,nt=o`<${ko} w=${E}/>`):$.view==="findings"?(et=o`<${vo} w=${E}/>`,nt=o`<${wo} w=${E}/>`):(et=o`<${Ga} w=${E}/>`,nt=R?o`<${to} w=${E} entry=${R}/>`:Tt==="aictl"&&K?o`<${so} w=${E} aictl=${K}/>`:o`<section class="st-main"><p class="st-empty">No tool settings to show.</p></section>`),o`<div class="st-ws" data-view=${$.view}>
    <div class="st-head">
      <${ta} class="st-pivot" options=${jo} value=${$.view} ariaLabel="Settings view"
        onChange=${b=>_({view:b})}/>
      <label class="st-searchbox">
        <${ut} name="search" size="14"/>
        <input ref=${mt} type="search" class="st-search" value=${O}
          placeholder="Find a setting, value, key or file…" aria-label="Find a setting, value, key or file"
          onInput=${b=>N(b.currentTarget.value)}/>
        <kbd class="st-kbd" aria-hidden="true">/</kbd>
      </label>
      <button type="button" class=${"st-toggle"+(T?" is-on":"")} aria-pressed=${T?"true":"false"}
        onClick=${()=>xt(!T)}>Only non-default</button>
      <button type="button" class=${"st-toggle st-toggle--risky"+(F?" is-on":"")} aria-pressed=${F?"true":"false"}
        onClick=${()=>Mt(!F)}>Only risky</button>
      ${ts&&o`<button type="button" class=${"st-toggle"+($.unset?" is-on":"")} aria-pressed=${$.unset?"true":"false"}
        onClick=${()=>_({unset:!$.unset})}>Show unset knobs</button>`}
      <div class="st-kpis" data-testid="st-kpis">
        <span><b>${C.length}</b> tools</span>
        <span><b>${tt.length}</b> files</span>
        <span><b>${ae}</b> settings</span>
        <span data-kpi="agents"><b>${oe}</b> agents</span>
        ${ts&&o`<span data-kpi="unset"><b>${le}</b> unset</span>`}
        <span class=${ss?"st-red":""}><b>${ss}</b> risky</span>
        <span><b>${x.status==="loading"&&!x.audit?"…":At.length}</b> findings</span>
      </div>
    </div>
    ${s&&o`<p class="st-wsnote" data-testid="st-wsnote">${s}</p>`}
    ${ie&&o`<div class="st-scope-empty"><${sa} enabledTools=${i} snap=${f} what="the settings"/></div>`}
    <div class="st-grid">
      <div class="st-col st-col--nav">${et}</div>
      <div class="st-col st-col--main">${nt}</div>
      <${Po} w=${E}/>
    </div>
  </div>`}export{Ro as auditState,Do as default};

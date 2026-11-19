import{Z as pe,$ as ue,a0 as Rt,a1 as he,m as o,L as xs,a2 as $e,a3 as fe,a4 as be,a5 as qt,a6 as ye,a7 as me,d as C,a8 as ke,a9 as tt,aa as W,ab as K,ac as yt,ad as ge,ae as M,af as Vt,ag as pt,ah as ve,ai as Ut,aj as _e,ak as wt,al as It,am as Bt,an as we,ao as Ms,ap as Ce,aq as Os,ar as Se,as as z,at as As,au as Ht,av as xe,aw as G,ax as Me,ay as Oe,az as Ts,aA as V,aB as Ae,aC as is,aD as st,aE as Te,aF as Gt,aG as cs,aH as Ee,aI as Le,aJ as Es,aK as Ls,aL as ut,q as I,aM as Pe,y as Y,aN as je,aO as Ne,aP as Fe,aQ as ht,aR as Re,aS as qe,aT as Ie,aU as ze,T as P,aV as De,aW as We,aX as Ve,aY as Ue,aZ as Be,a_ as rs,a$ as He,b0 as Ge,i as Ke,b1 as Ze,b2 as Je,b3 as ds,b4 as Xe,b5 as ps,b6 as Nt,b7 as Ye,b8 as Qe,b9 as us,ba as hs,bb as tn,bc as sn}from"./index-C_yL16rp.js";import{C as en}from"./LoadedConfiguration-B23iGxY5.js";import{u as N,a as nn,n as Ps}from"./tableGrid-Bs-Z92DU.js";/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const js=(...t)=>t.filter((s,n,a)=>!!s&&s.trim()!==""&&a.indexOf(s)===n).join(" ").trim();/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $s=t=>t.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const an=t=>t.replace(/^([A-Z])|[\s-_]+(\w)/g,(s,n,a)=>a?a.toUpperCase():n.toLowerCase());/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fs=t=>{const s=an(t);return s.charAt(0).toUpperCase()+s.slice(1)};/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var on={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ln=ue({size:24,color:"currentColor",strokeWidth:2,absoluteStrokeWidth:!1,class:""}),cn=()=>pe(ln);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rn=t=>{for(const s in t)if(s.startsWith("aria-")||s==="role"||s==="title")return!0;return!1};/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dn=({color:t,size:s,strokeWidth:n,absoluteStrokeWidth:a,children:e,iconNode:l,class:c="",...i})=>{const{size:d=24,strokeWidth:h=2,absoluteStrokeWidth:u=!1,color:r="currentColor",class:p=""}=cn()??{},g=a??u?Number(n??h)*24/Number(s??d):n??h;return Rt("svg",{...on,width:s??d??24,height:s??d??24,stroke:t??r,"stroke-width":g,class:js("lucide",p,c),...!e&&!rn(i)&&{"aria-hidden":"true"},...i},[...l.map(([v,_])=>Rt(v,_)),...he(e)])};/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $=(t,s)=>{const n=({class:a="",className:e="",children:l,...c})=>Rt(dn,{...c,iconNode:s,class:js(`lucide-${$s(fs(t))}`,`lucide-${$s(t)}`,a,e)},l);return n.displayName=fs(t),n};/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pn=$("activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const un=$("archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hn=$("banknote",[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $n=$("book-open",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fn=$("bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bn=$("brain-circuit",[["path",{d:"M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z",key:"l5xja"}],["path",{d:"M9 13a4.5 4.5 0 0 0 3-4",key:"10igwf"}],["path",{d:"M6.003 5.125A3 3 0 0 0 6.401 6.5",key:"105sqy"}],["path",{d:"M3.477 10.896a4 4 0 0 1 .585-.396",key:"ql3yin"}],["path",{d:"M6 18a4 4 0 0 1-1.967-.516",key:"2e4loj"}],["path",{d:"M12 13h4",key:"1ku699"}],["path",{d:"M12 18h6a2 2 0 0 1 2 2v1",key:"105ag5"}],["path",{d:"M12 8h8",key:"1lhi5i"}],["path",{d:"M16 8V5a2 2 0 0 1 2-2",key:"u6izg6"}],["circle",{cx:"16",cy:"13",r:".5",key:"ry7gng"}],["circle",{cx:"18",cy:"3",r:".5",key:"1aiba7"}],["circle",{cx:"20",cy:"21",r:".5",key:"yhc1fs"}],["circle",{cx:"20",cy:"8",r:".5",key:"1e43v0"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yn=$("brain",[["path",{d:"M12 18V5",key:"adv99a"}],["path",{d:"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4",key:"1e3is1"}],["path",{d:"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5",key:"1gqd8o"}],["path",{d:"M17.997 5.125a4 4 0 0 1 2.526 5.77",key:"iwvgf7"}],["path",{d:"M18 18a4 4 0 0 0 2-7.464",key:"efp6ie"}],["path",{d:"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517",key:"1gq6am"}],["path",{d:"M6 18a4 4 0 0 1-2-7.464",key:"k1g0md"}],["path",{d:"M6.003 5.125a4 4 0 0 0-2.526 5.77",key:"q97ue3"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mn=$("chart-column",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kn=$("chart-line",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gn=$("chevron-down",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vn=$("chevron-right",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _n=$("clipboard-list",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wn=$("clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 6v6l4 2",key:"mmk7yg"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cn=$("coins",[["path",{d:"M13.744 17.736a6 6 0 1 1-7.48-7.48",key:"bq4yh3"}],["path",{d:"M15 6h1v4",key:"11y1tn"}],["path",{d:"m6.134 14.768.866-.5 2 3.464",key:"17snzx"}],["circle",{cx:"16",cy:"8",r:"6",key:"14bfc9"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sn=$("cpu",[["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M17 20v2",key:"1rnc9c"}],["path",{d:"M17 2v2",key:"11trls"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M2 17h2",key:"7oei6x"}],["path",{d:"M2 7h2",key:"asdhe0"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"M20 17h2",key:"1fpfkl"}],["path",{d:"M20 7h2",key:"1o8tra"}],["path",{d:"M7 20v2",key:"4gnj0m"}],["path",{d:"M7 2v2",key:"1i4yhu"}],["rect",{x:"4",y:"4",width:"16",height:"16",rx:"2",key:"1vbyd7"}],["rect",{x:"8",y:"8",width:"8",height:"8",rx:"1",key:"z9xiuo"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xn=$("eye-off",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mn=$("file-pen",[["path",{d:"M12.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v9.34",key:"o6klzx"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10.378 12.622a1 1 0 0 1 3 3.003L8.36 20.637a2 2 0 0 1-.854.506l-2.867.837a.5.5 0 0 1-.62-.62l.836-2.869a2 2 0 0 1 .506-.853z",key:"zhnas1"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const On=$("file-text",[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const An=$("folder",[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",key:"1kt360"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tn=$("funnel",[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const En=$("git-branch",[["path",{d:"M15 6a9 9 0 0 0-9 9V3",key:"1cii5b"}],["circle",{cx:"18",cy:"6",r:"3",key:"1h7g24"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ln=$("globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pn=$("grid-3x3",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M3 15h18",key:"5xshup"}],["path",{d:"M9 3v18",key:"fh3hqa"}],["path",{d:"M15 3v18",key:"14nvp0"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jn=$("layers",[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nn=$("layout-dashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fn=$("lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rn=$("mail",[["path",{d:"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7",key:"132q7q"}],["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2",key:"izxlao"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qn=$("message-square",[["path",{d:"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",key:"18887p"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const In=$("moon",[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zn=$("package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dn=$("pen",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wn=$("plug",[["path",{d:"M12 22v-5",key:"1ega77"}],["path",{d:"M15 8V2",key:"18g5xt"}],["path",{d:"M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z",key:"1xoxul"}],["path",{d:"M9 8V2",key:"14iosj"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vn=$("radio",[["path",{d:"M16.247 7.761a6 6 0 0 1 0 8.478",key:"1fwjs5"}],["path",{d:"M19.075 4.933a10 10 0 0 1 0 14.134",key:"ehdyv1"}],["path",{d:"M4.925 19.067a10 10 0 0 1 0-14.134",key:"1q22gi"}],["path",{d:"M7.753 16.239a6 6 0 0 1 0-8.478",key:"r2q7qm"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Un=$("refresh-cw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bn=$("search",[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hn=$("server",[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gn=$("settings",[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kn=$("sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zn=$("triangle-alert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jn=$("user",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xn=$("users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yn=$("wallet",[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qn=$("webhook",[["path",{d:"M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2",key:"q3hayz"}],["path",{d:"m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06",key:"1go1hn"}],["path",{d:"m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8",key:"qlwsc0"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ta=$("wrench",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",key:"1ngwbx"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sa=$("x",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-preact v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ea=$("zap",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]),na={activity:pn,"alert-triangle":Zn,filter:Tn,"eye-off":xn,archive:un,banknote:hn,"bar-chart-3":mn,"book-open":$n,bot:fn,brain:yn,"brain-circuit":bn,"chevron-down":gn,"chevron-right":vn,"clipboard-list":_n,clock:wn,coins:Cn,cpu:Sn,"file-pen":Mn,"file-text":On,folder:An,"git-branch":En,globe:Ln,"grid-3x3":Pn,layers:jn,"layout-dashboard":Nn,"line-chart":kn,lock:Fn,mail:Rn,"message-square":qn,moon:In,package:zn,pen:Dn,plug:Wn,radio:Vn,"refresh-cw":Un,search:Bn,server:Hn,settings:Gn,sun:Kn,user:Jn,users:Xn,wallet:Yn,webhook:Qn,wrench:ta,x:sa,zap:ea};function $t({name:t,size:s="1em",strokeWidth:n=2,...a}){if(!t)return null;const e=na[String(t)];return e?o`<${e} size=${s} strokeWidth=${n} aria-hidden="true" ...${a} />`:o`<span aria-hidden="true" ...${a}>${t}</span>`}function aa({options:t=[],value:s,onChange:n,ariaLabel:a,class:e,className:l,...c}){const i=["aictl-ui-segmented",e,l].filter(Boolean).join(" "),d=xs([]),h=u=>{var g;if(!t.length)return;const r=Math.max(0,t.findIndex(v=>v.value===s));let p=null;u.key==="ArrowRight"||u.key==="ArrowDown"?p=(r+1)%t.length:u.key==="ArrowLeft"||u.key==="ArrowUp"?p=(r-1+t.length)%t.length:u.key==="Home"?p=0:u.key==="End"&&(p=t.length-1),p!=null&&(u.preventDefault(),n&&n(t[p].value),(g=d.current[p])==null||g.focus())};return o`<div
    class=${i}
    role="radiogroup"
    aria-label=${a||null}
    ...${c}
  >${t.map((u,r)=>{const p=u.value===s;return o`<button
      key=${u.value}
      ref=${g=>{d.current[r]=g}}
      type="button"
      class="aictl-ui-segmented__btn"
      role="radio"
      aria-checked=${p?"true":"false"}
      tabindex=${p?"0":"-1"}
      onClick=${()=>n&&n(u.value)}
      onKeyDown=${h}
    >${u.icon?o`<${$t} name=${u.icon} size="0.9em"/>`:null}${u.label}</button>`})}</div>`}function oa({enabledTools:t,snap:s,what:n="this screen"}){const a=$e(t),e=fe(t,s);return o`<div class="panel-state panel-state--empty" role="status" data-testid="tool-scope-empty">
    <${$t} name="filter" size="14"/>
    <div>
      <div class="panel-state__title">${a?"No tools are selected":"The selected tools have no data here"}</div>
      <div class="panel-state__hint">${a?`The tool filter in the header has no tool ticked, so ${n} shows nothing. Tick a tool, or choose All tools.`:`${e.join(", ")} ${e.length===1?"has":"have"} nothing to show on ${n}. Tick more tools in the header filter, or choose All tools.`}</div>
    </div>
  </div>`}function kt(t){return t==null?qt:typeof t=="object"?JSON.stringify(t):String(t)}function la({value:t,compact:s}){const[n,a]=C(!1),e=Array.isArray(t),l=e?t.map((d,h)=>[h,d]):Object.entries(t||{}),c=l.length;if(!c)return o`<span class="st-none">none</span>`;const i=o`<span class="st-chip st-chip--mono st-items">${c} ${c===1?"item":"items"}</span>`;return s?i:o`<span class="st-itemsbox">
    ${i}
    <button type="button" class="st-link" aria-expanded=${n?"true":"false"}
      onClick=${d=>{d.stopPropagation(),a(!n)}}>${n?"hide":"show"}</button>
    ${n&&o`<ul class="st-itemlist">
      ${l.map(([d,h])=>o`<li key=${d} class="st-mono" title=${e?kt(h):`${d}: ${kt(h)}`}>
        ${e?kt(h):o`<span class="st-itemkey">${d}:</span> ${kt(h)}`}</li>`)}
    </ul>`}
  </span>`}function vt({row:t,value:s,compact:n=!1}){const a=s!==void 0?s:t.value,e=t.kind||be(a),l=!!t.risky;if(e==="flag"||typeof a=="boolean"){if(a==null)return o`<span class="st-none">${qt}</span>`;const d=ye(a);return o`<span class=${"st-flag"+(d?" is-on":"")+(l?" is-risky":"")}>
      <span class="st-switch" aria-hidden="true"></span><span class="st-flag__text">${d?"on":"off"}</span>
    </span>`}if(a==null||a==="")return o`<span class="st-none">${qt}</span>`;if(e==="list"||e==="map"||typeof a=="object")return o`<${la} value=${a} compact=${n}/>`;const c=String(a),i=me({...t,value:a});return i?o`<span class=${"st-select"+(l?" is-risky":"")} title=${"Options: "+i.join(", ")}>${c}</span>`:e==="path"?o`<span class="st-v st-path" title=${c}>${c}</span>`:o`<span class=${"st-v"+(l?" is-risky":"")} title=${c}>${c}</span>`}function Z({scope:t,locked:s=!1,label:n=""}){const a=t||"default",e=o`<span class=${"st-chip st-scope st-scope--"+a.replace(/[^a-z-]/gi,"")+(s?" st-scope--locked":"")}
    title=${s?`Set by ${n||a}; cannot be changed here`:void 0}>${a}${s?o`<span class="st-sr"> (locked)</span>`:""}</span>`;return s?o`<span class="st-scopewrap"><${mt}/>${e}</span>`:e}function mt({label:t=""}){return t?o`<span class="st-lock" role="img" aria-label=${t} title=${t}><${$t} name="lock" size="11"/></span>`:o`<span class="st-lock" aria-hidden="true"><${$t} name="lock" size="11"/></span>`}function D({id:t,big:s=!1}){return o`<span class=${"st-sw"+(s?" st-sw--big":"")} aria-hidden="true"
    style=${{background:ke[t]||"var(--st-fg2)"}}></span>`}function ft({label:t}){return o`<span class="st-dot" role="img" aria-label=${t} title=${t}></span>`}function j({children:t}){return o`<div class="st-nav__h">${t}</div>`}function U({id:t,label:s}){return o`<span class="st-chip st-toolchip"><${D} id=${t}/>${s}</span>`}function bt({path:t,line:s,w:n,tool:a=""}){if(!t)return o`<span class="st-none">—</span>`;if(tt(t)){const l=W(t);return l?o`<button type="button" class="st-src st-src--env" data-env=${l}
      title=${"Environment variable "+l+": where it is set and what it drives"}
      onClick=${c=>{c.stopPropagation(),n.openEnv(l,a)}}><b>${l}</b></button>`:o`<span class="st-src st-src--env" title="An environment variable; this aictl version did not name it">environment</span>`}const e=t+(s>0?":"+s:"");return o`<button type="button" class="st-src" title=${e}
    onClick=${l=>{l.stopPropagation(),n.openAt(t,s)}}>
    <b>${K(t)}</b>${s>0?":"+s:""}</button>`}const ia="aictl has no description for this key; the value is shown as found in the file";function Ct(){return o`<span class="st-chip st-chip--muted st-undoc" title=${ia}>undocumented</span>`}const ca=4,zt=(t,s,n)=>[s&&{k:"tool",l:"Tool",get:a=>t.labelOf(a.tool)},{k:"agent",l:"Agent",cls:"st-c-agent",get:a=>dt(a)},{k:"model",l:"Model",get:a=>yt(a)?void 0:String(a.value)},{k:"effort",l:"Effort",get:a=>{var e;return(e=a.agent)==null?void 0:e.effort}},n&&{k:"context",l:"Context",get:a=>{var e;return(e=a.agent)==null?void 0:e.context_tier}},{k:"tools",l:"Tools",n:!0,get:a=>{var e,l;return((l=(e=a.agent)==null?void 0:e.tools)==null?void 0:l.length)||void 0}},{k:"defined",l:"Defined in",cls:"st-c-src",get:a=>{var e;return(e=a.agent)==null?void 0:e.defined_in}},{k:"pinned",l:"Pinned in",cls:"st-c-src",get:a=>{var e;return(e=a.agent)==null?void 0:e.pinned_in}}].filter(Boolean);function ra(t,s){return`Set by ${M(t.scope,s.scopesOf(t.tool))}; cannot be changed here`}function Ns({row:t,w:s}){const n=t.agent,a=yt(t);return o`<span class="st-agentmodel">
    ${t.locked&&o`<${mt} label=${ra(t,s)}/>`}
    ${a?o`<span class="st-inherit" title=${t.note||"Runs on the session model"}>inherits</span>`:o`<span class="st-v" title=${String(t.value)}>${String(t.value)}</span>`}
    ${n.model_policy==="required"&&o`<span class="st-badge" title="The agent file requires a model">required</span>`}
    ${ge(t)&&o`<span class="st-badge st-badge--pin" title=${"A settings pin decides the model: "+n.pinned_in}>pinned</span>`}
  </span>`}function Fs({tools:t,all:s=!1}){if(!t||!t.length)return o`<span class="st-none" title="The agent file lists no tools">—</span>`;const n=s?t:t.slice(0,ca),a=t.length-n.length;return o`<span class="st-tools">
    ${n.map(e=>o`<span key=${e} class="st-chip st-chip--mono" title=${e}>${e}</span>`)}
    ${a>0&&o`<span class="st-chip st-more-tools" title=${t.slice(n.length).join(", ")}>+${a}</span>`}
  </span>`}function Rs({row:t,w:s,withTool:n,withContext:a}){var d;const e=t.agent,l=((d=s.selected)==null?void 0:d.uid)===t.uid,c=()=>s.select({tool:t.tool,row:t.key}),i=h=>Number(h)>0?Number(h):0;return o`<tr class=${"st-row st-agentrow"+(l?" is-sel":"")} data-key=${t.key} data-tool=${t.tool}
    tabindex="0" onClick=${c}
    onKeyDown=${h=>{(h.key==="Enter"||h.key===" ")&&(h.preventDefault(),c())}}>
    ${n&&o`<td class="st-c-tool"><span class="st-matrix__toolname"><${D} id=${t.tool}/>${s.labelOf(t.tool)}</span></td>`}
    <td class="st-c-agent">
      <div class="st-label st-mono">${e.name||t.label}</div>
      ${e.description&&o`<div class="st-agentdesc" title=${e.description}>${e.description}</div>`}
    </td>
    <td class="st-c-model"><${Ns} row=${t} w=${s}/></td>
    <td class="st-mono">${e.effort||o`<span class="st-none">—</span>`}</td>
    ${a&&o`<td class="st-mono">${e.context_tier||o`<span class="st-none">—</span>`}</td>`}
    <td><${Fs} tools=${e.tools}/></td>
    <td class="st-c-src"><${bt} path=${e.defined_in} line=${i(e.defined_line)} w=${s}/></td>
    <td class="st-c-src"><${bt} path=${e.pinned_in} line=${i(e.pinned_line)} w=${s}/></td>
  </tr>`}function da({w:t,section:s}){const n=s.shown,a=n.filter(yt).length,e=N("settings.agents",zt(t,!1,!0)),l=zt(t,!1,!0);return o`<table class=${"st-table st-agents "+e.tableProps.class} style=${e.tableProps.style} data-section="agents">
    <thead><tr>${l.map(e.th)}</tr></thead>
    <tbody>
      <tr class="st-group"><th scope="colgroup" colspan="7">${s.title}
        <span class="st-group__meta">${n.length}${a?` · ${a} inherit the session model`:""}</span></th></tr>
      ${e.order(n).map(c=>o`<${Rs} key=${c.uid} row=${c} w=${t} withContext/>`)}
    </tbody>
  </table>`}const Dt={tool:t=>(s,n)=>t.labelOf(s.tool).localeCompare(t.labelOf(n.tool))||dt(s).localeCompare(dt(n)),agent:t=>(s,n)=>dt(s).localeCompare(dt(n))||t.labelOf(s.tool).localeCompare(t.labelOf(n.tool)),model:t=>(s,n)=>bs(s).localeCompare(bs(n))||Dt.tool(t)(s,n)};function dt(t){var s;return String(((s=t.agent)==null?void 0:s.name)||t.label||"")}function bs(t){return yt(t)?"￿":String(t.value)}function pa(t,s,n){return[...t].sort((Dt[s]||Dt.tool)(n))}function ua({w:t,rows:s,sort:n}){const a=zt(t,!0,!1),e=N("settings.agents.all",a),l=e.order(pa(s,n,t));return o`<div class="st-scroll"><table class=${"st-table st-agents st-agents--all "+e.tableProps.class} style=${e.tableProps.style}>
    <thead><tr>${a.map(e.th)}</tr></thead>
    <tbody>${l.map(c=>o`<${Rs} key=${c.uid} row=${c} w=${t} withTool/>`)}</tbody>
  </table></div>`}const Kt=[{id:"mcp",label:"MCP"},{id:"read",label:"Read files"},{id:"write",label:"Write files"},{id:"shell",label:"Shell"},{id:"web",label:"Web"}],ha={allowed:"allow",asks:"ask",denied:"deny"},ys={denied:3,asks:2,allowed:1},Q=(t,s,n="")=>Object.fromEntries(Kt.map(a=>[a.id,{state:t,why:s,key:n}]));function $a(t){const s=String(t||"").split(".");return s[s.length-1]}function fa(t){const s=new Map;for(const n of(t==null?void 0:t.rows)||[])s.has(n.key)||s.set(n.key,n);return s}const w=t=>t&&t.value!==null&&t.value!==void 0&&t.value!==""?t.value:void 0,_t=t=>Array.isArray(t)?t.filter(s=>typeof s=="string"&&s):[];function Zt(t){const s=/^\s*([^()\s]+)\s*(?:\((.*)\))?\s*$/.exec(String(t));return s?{name:s[1].toLowerCase(),spec:s[2]===void 0?null:s[2].trim()}:{name:String(t).toLowerCase(),spec:null}}const qs=new Set(["","*",":*","**"]),ba={read:["read","glob","grep","ls","notebookread"],write:["write","edit","multiedit","notebookedit"],shell:["bash","powershell"],web:["webfetch","websearch"]};function ya(t){if(t==="mcp"||t.startsWith("mcp__"))return"mcp";for(const[s,n]of Object.entries(ba))if(n.includes(t))return s;return""}function ma(t,s){return t.startsWith("mcp__")?t==="mcp__*":s===null||qs.has(s)}function ka(t,s){const n=[],a=(c,i,d,h)=>{const u={allow:"allowed",deny:"denied",ask:"asks"}[c],r=c+""+i,p=d?M(d,s):"",g=n.find(f=>f.id===r);if(g){p&&!g.where.includes(p)&&g.where.push(p);return}const{name:v,spec:_}=Zt(i);n.push({id:r,rule:i,effect:u,cap:ya(v),whole:ma(v,_),where:p?[p]:[],key:h})},e=(c,i,d)=>{if(!(!c||typeof c!="object"||Array.isArray(c)))for(const h of["allow","deny","ask"])for(const u of _t(c[h]))a(h,u,i,d)},l=t.get("permissions");if(l){const c=(l.chain||[]).filter(i=>i&&i.value&&typeof i.value=="object"&&i.set!==!1);if(c.length)for(const i of c)e(i.value,i.scope,"permissions");else e(w(l),l.scope,"permissions")}for(const c of["allow","deny","ask"]){const i=t.get("permissions."+c);for(const d of _t(w(i)))a(c,d,i.scope,i.key)}return n}const ga={shell:"shell",write:"write",read:"read",url:"web",fetch:"web",web_fetch:"web"};function va(t){const s=[];for(const n of["allow","deny","ask"]){const a=t.get("permissions."+n);for(const e of _t(w(a))){const{name:l,spec:c}=Zt(e);s.push({rule:e,effect:{allow:"allowed",deny:"denied",ask:"asks"}[n],cap:ga[l]||"mcp",whole:c===null||qs.has(c),where:a.scope?[M(a.scope)]:[],key:a.key})}}return s}function _a(t){const s=[];for(const n of t.values()){const a=w(n);if(!a||typeof a!="object"||Array.isArray(a))continue;const e=n.key;let l="";if(/(^|\.)urls\.autoApprove$/.test(e)?l="web":/(^|\.)edits\.autoApprove$/.test(e)?l="write":(e==="autoApprove"||/(^|\.)terminal\.autoApprove$/.test(e))&&(l="shell"),!!l)for(const[c,i]of Object.entries(a)){let d;if(l==="web"?d=i===!0||(i==null?void 0:i.approveRequest)===!0?"allowed":"asks":l==="write"?d=i===!1?"asks":"allowed":i===!0||(i==null?void 0:i.approve)===!0?d="allowed":(i===!1||(i==null?void 0:i.approve)===!1)&&(d="denied"),!d)continue;const h=l==="write"?c==="**/*"||c==="**":!1;s.push({rule:c,effect:d,cap:l,whole:h,where:n.scope?[M(n.scope)]:[],key:e})}}return s}const wa={read:["read_file","read_many_files","glob","grep","search_file_content","list_directory","readfiletool","readmanyfilestool","globtool","greptool","lstool"],write:["write_file","replace","edit","writefiletool","edittool"],shell:["run_shell_command","shelltool"],web:["web_fetch","google_web_search","webfetchtool","websearchtool"]};function Ca(t){var n;const s=[];for(const[a,e]of[["tools.allowed","allowed"],["tools.exclude","denied"]]){const l=t.get(a);for(const c of _t(w(l))){const{name:i,spec:d}=Zt(c);let h=((n=Object.entries(wa).find(([,u])=>u.includes(i)))==null?void 0:n[0])||"";!h&&i.includes("__")&&(h="mcp"),h&&s.push({rule:c,effect:e,cap:h,whole:d===null,where:l.scope?[M(l.scope)]:[],key:a})}}return s}function Sa(t){const s=t.get("permissions.defaultMode"),n=w(s)??"default",a=s&&w(s)!==void 0?s.key:"",e=`default mode ${n}`;if(n==="bypassPermissions")return Q("allowed",e+": no permission prompts",a);const l={mcp:{state:"asks",why:"Claude Code asks before an MCP tool runs",key:a},read:{state:"allowed",why:"Claude Code reads files without asking",key:a},write:{state:"asks",why:"Claude Code asks before it edits a file",key:a},shell:{state:"asks",why:"Claude Code asks before it runs a command",key:a},web:{state:"asks",why:"Claude Code asks before it fetches a URL",key:a}};if(n==="acceptEdits"&&(l.write={state:"allowed",why:e+": edits apply without asking",key:a}),n==="plan"&&(l.write={state:"denied",why:e+": read-only, no edits",key:a},l.shell={state:"denied",why:e+": read-only, no commands that change anything",key:a}),n==="dontAsk")for(const c of["mcp","write","shell","web"])l[c]={state:"denied",why:e+": anything not allowed by a rule is refused",key:a};return l}function xa(t){const s=t.get("defaultPermissionMode"),n=w(s)??"manual",a=s&&w(s)!==void 0?s.key:"";if(n==="allow-all")return Q("allowed","defaultPermissionMode allow-all: every tool call is allowed",a);const e=n==="assisted"?"asks; in assisted mode a model answers the request":"asks before it runs";return{mcp:{state:"asks",why:"an MCP tool "+e,key:a},read:{state:"allowed",why:"reads in trusted folders run without asking",key:a},write:{state:"asks",why:"a file write "+e,key:a},shell:{state:"asks",why:"a shell command "+e,key:a},web:{state:"asks",why:"a URL fetch "+e,key:a}}}function Ma(t){for(const s of t.values()){const n=w(s);if(($a(s.key)==="globalAutoApprove"||s.key==="chat.tools.global.autoApprove")&&n===!0)return Q("allowed",s.label+" is on: every tool call runs without asking",s.key);if(s.key==="skipPermissions"&&n===!0)return Q("allowed",s.label+" is on: no permission checks",s.key);if(s.key==="chat.permissions.default"&&["autoApprove","autopilot","bypass"].includes(n))return Q("allowed",`chat.permissions.default ${n}: sessions start without approval prompts`,s.key)}return{mcp:{state:"asks",why:"VS Code asks before an MCP tool runs"},read:{state:"allowed",why:"VS Code reads workspace files without asking"},write:{state:"allowed",why:"VS Code applies edits in the workspace without asking"},shell:{state:"asks",why:"VS Code asks before a terminal command runs"},web:{state:"asks",why:"VS Code asks before it fetches a URL"}}}function Oa(t){const s=t.get("approval_policy"),n=t.get("sandbox_mode"),a=w(t.get("sandbox_workspace_write.network_access"))===!0;let e=w(s);e&&typeof e=="object"&&(e="granular"),e=e||"on-request";const l=w(n)||"read-only",c=s&&w(s)!==void 0?s.key:"",i=n&&w(n)!==void 0?n.key:"",d=`approval_policy ${e}${w(s)===void 0?" (not set)":""}`,h=`sandbox_mode ${l}${w(n)===void 0?" (not set)":""}`,u=e==="never",r=l==="danger-full-access",p=r?{state:"allowed",why:h+": no sandbox"}:l==="workspace-write"?{state:"allowed",why:h+": writes in the workspace run without asking"}:u?{state:"denied",why:`${h}, ${d}: no writes and no way to ask`}:{state:"asks",why:`${h}: a write needs your approval`},g=u?{state:"allowed",why:d+": commands never ask"}:e==="untrusted"?{state:"asks",why:d+": commands outside the trusted set ask"}:{state:"allowed",why:`${d}: commands run in the sandbox (${l}) and ask to leave it`},v=r||l==="workspace-write"&&a?{state:"allowed",why:r?h+": network open":"sandbox_workspace_write.network_access is on"}:u?{state:"denied",why:`${h}, ${d}: no network and no way to ask`}:{state:"asks",why:`${h}: network access needs your approval`};return{mcp:{state:u?"allowed":"asks",why:u?d+": MCP tools never ask":d+": MCP tool calls ask",key:c},read:{state:"allowed",why:h+": reads are allowed",key:i},write:{...p,key:i||c},shell:{...g,key:c||i},web:{...v,key:i||c}}}function Aa(t){const s=t.get("general.defaultApprovalMode")||t.get("approvalMode")||t.get("approval_mode")||t.get("general.approvalMode"),n=w(s)??"default",a=s&&w(s)!==void 0?s.key:"",e="approval mode "+n;if(n==="yolo")return Q("allowed",e+": every tool call runs without asking",a);const l={mcp:{state:"asks",why:e+": MCP tools ask",key:a},read:{state:"allowed",why:"reads run without asking",key:a},write:{state:"asks",why:e+": edits ask",key:a},shell:{state:"asks",why:e+": shell commands ask",key:a},web:{state:"asks",why:e+": web fetches ask",key:a}};return n==="auto_edit"&&(l.write={state:"allowed",why:e+": edits run without asking",key:a}),n==="plan"&&(l.write={state:"denied",why:e+": read-only",key:a},l.shell={state:"denied",why:e+": read-only",key:a}),l}const it=(t,s)=>[...t.keys()].some(n=>s.test(n)),Ta=[{id:"claude",tools:["claude-code"],applies:t=>it(t,/^permissions(\.(allow|deny|ask|defaultMode))?$/),base:Sa,rules:ka,wholeName:"the whole tool"},{id:"copilot-cli",tools:["copilot-cli","copilot-desktop"],applies:t=>it(t,/^(defaultPermissionMode|savedToolApprovals|permissions\.(allow|deny|ask))$/),base:xa,rules:va,notes:t=>{const s=w(t.get("savedToolApprovals"));if(!s||typeof s!="object")return[];const n=Object.values(s).reduce((e,l)=>e+(Number(l)||0),0),a=Object.keys(s).length;return n?[`${n} saved tool ${n===1?"approval":"approvals"} in ${a} ${a===1?"folder":"folders"} (permissions-config.json)`]:[]}},{id:"vscode",tools:["vscode","copilot"],applies:t=>it(t,/(autoApprove|^chat\.permissions\.default$|^skipPermissions$)/i),base:Ma,rules:_a},{id:"codex",tools:["codex-cli","codex"],applies:t=>it(t,/^(approval_policy|sandbox_mode)$/),base:Oa,rules:()=>[]},{id:"gemini",tools:["gemini-cli","gemini"],applies:t=>it(t,/(^|\.)(defaultApprovalMode|approvalMode|approval_mode)$|^tools\.(allowed|exclude)$/),base:Aa,rules:Ca}];function Ea(t,s){return t==="mixed"?`mixed (${s} ${s===1?"rule":"rules"})`:t}function ms(t){return`${ha[t.effect]} ${t.rule}${t.where.length?" ("+t.where.join(", ")+")":""}`}function La(t,s,n){var r;const a=n.filter(p=>p.cap===t.id),e=a.filter(p=>p.whole);let l=s.state,c=s.why;if(e.length){const p=e.reduce((g,v)=>ys[v.effect]>ys[g.effect]?v:g);l=p.effect,c="rule "+ms(p)}const i=a.some(p=>!p.whole&&p.effect!==l),d=i?"mixed":l,h=Ea(d,a.length),u=[`${t.label}: ${h}`];return!a.length||!e.length?u.push("Without a rule: "+s.state+" ("+s.why+")"):u.push((i?"For the whole tool: ":"Decided by: ")+l+" ("+c+")"),a.length&&u.push(...a.map(p=>"• "+ms(p))),{cap:t.id,label:t.label,state:d,text:h,title:u.join(`
`),rules:a.map(p=>({rule:p.rule,effect:p.effect,where:p.where})),key:((r=a[0])==null?void 0:r.key)||s.key||""}}function Is(t){if(!t)return null;const s=Ta.find(l=>l.tools.includes(t.id));if(!s)return null;const n=fa(t);if(!s.applies(n))return null;const a=s.base(n),e=s.rules(n,t.scopes||[]);return{tool:t.id,cells:Kt.map(l=>La(l,a[l.id],e)),notes:s.notes?s.notes(n):[]}}function Pa(t){return(t||[]).map(s=>({entry:s,perms:Is(s)})).filter(s=>s.perms)}const ja=["project","project-local"],Na=new Set(["permissions","permissions.allow","permissions.deny","permissions.ask","project_permissions"]),zs="No form for this value. Open the file and use Edit file";function Fa(t){return!!t&&t.tool==="claude-code"&&Na.has(t.key)}function Ra(t){var s,n;return((n=(s=t==null?void 0:t.chain)==null?void 0:s[t.wins])==null?void 0:n.scope)||(t==null?void 0:t.scope)||"default"}function qa(t,s=[]){var l;const n=(l=t==null?void 0:t.chain)==null?void 0:l[t.wins];if(t!=null&&t.locked||Vt(n,s))return{ok:!1,hint:"Locked by "+M(t.locked?t.scope:n.scope,s)};if(!Fa(t))return{ok:!1,hint:zs};const a=Ra(t);if(!ja.includes(a))return{ok:!1,hint:`The value comes from ${M(a,s)}. Project and Project local permissions have a form here; for another file, open it and use Edit file.`};const e=(s||[]).find(c=>c.id===a);return{ok:!0,scope:a,label:M(a,s),path:n&&n.source||(e==null?void 0:e.path)||""}}const Ia=t=>(t||[]).join(`
`),za=t=>String(t||"").split(`
`).map(s=>s.trim()).filter(Boolean);function Da(t,s){const n=new Set(t||[]),a=new Set(s||[]);return{added:[...a].filter(e=>!n.has(e)),removed:[...n].filter(e=>!a.has(e))}}function Ds({cell:t,onPick:s}){const n=t.key&&s?()=>s(t.key):null;return o`<td class=${"st-perm st-perm--"+t.state} data-cap=${t.cap} data-state=${t.state} title=${t.title}>
    ${n?o`<button type="button" class="st-perm__btn" aria-label=${`${t.label}: ${t.text}`} onClick=${n}>${t.text}</button>`:o`<span class="st-perm__text">${t.text}</span>`}
  </td>`}const Ws=(t,s)=>[...t?[{k:"tool",l:t,get:s?n=>n.entry.label:void 0}]:[],...Kt.map(n=>({k:n.id,l:n.label,attrs:{"data-cap":n.id},get:s?a=>{var e;return(e=a.perms.cells.find(l=>l.cap===n.id))==null?void 0:e.text}:void 0}))];function Wa({w:t,entry:s,perms:n}){const a=c=>t.select({tool:s.id,row:c}),e=Ws("",!1),l=N("settings.perms",e);return o`<div class="st-perms" data-testid="st-perms" data-tool=${s.id}>
    <table class=${"st-permtable "+l.tableProps.class} style=${l.tableProps.style}>
      <caption class="st-perms__cap">What the agent can do without asking</caption>
      <thead><tr>${e.map(l.th)}</tr></thead>
      <tbody><tr>${n.cells.map(c=>o`<${Ds} key=${c.cap} cell=${c} onPick=${a}/>`)}</tr></tbody>
    </table>
    ${n.notes.map((c,i)=>o`<p key=${i} class="st-hint st-perms__note">${c}</p>`)}
  </div>`}function Va({w:t,mats:s}){const n=Ws("Tool",!0),a=N("settings.perms.all",n);return s.length?o`<div class="st-perms st-perms--topic" data-testid="st-perms-topic">
    <div class="st-scroll"><table class=${"st-permtable "+a.tableProps.class} style=${a.tableProps.style}>
      <caption class="st-perms__cap">What each tool's agent can do without asking</caption>
      <thead><tr>${n.map(a.th)}</tr></thead>
      <tbody>
        ${a.order(s).map(({entry:e,perms:l})=>o`<tr key=${e.id} data-tool=${e.id}>
          <th scope="row" class="st-perms__tool"><span class="st-matrix__toolname"><${D} id=${e.id}/>${e.label}</span></th>
          ${l.cells.map(c=>o`<${Ds} key=${c.cap} cell=${c} onPick=${i=>t.select({tool:e.id,row:i})}/>`)}
        </tr>`)}
      </tbody>
    </table></div>
    ${s.flatMap(({entry:e,perms:l})=>l.notes.map((c,i)=>o`<p key=${e.id+i} class="st-hint st-perms__note">${e.label}: ${c}</p>`))}
  </div>`:null}const Ua={copilot:"copilot-vscode",vscode:"copilot-vscode"};function Ba(t,s){const n=t==null?void 0:t.tools;return!n||typeof n!="object"?null:n[s]||n[Ua[s]]||null}function Ha(t){return{active:"active",configured:"configured",disabled:"host-disabled",misconfigured:"wrong port",observed:"observed",missing:"missing"}[t]||t||"unknown"}function Ga(t){const s=(t==null?void 0:t.message)||"";return s.includes("~/.copilot/hooks")?'"chat.hookFilesLocations": { "~/.copilot/hooks": true }':s.includes(".github/hooks")?'"chat.hookFilesLocations": { ".github/hooks": true }':s.includes("chat.useHooks")?'"chat.useHooks": true':""}const Ka={active:"is-ok",configured:"is-ok",disabled:"is-warn",misconfigured:"is-warn",missing:"is-warn"};function Za({status:t}){const s=t.configured_events||[],n=t.missing_events||[],a=t.sources||[],e=t.warnings||[];return o`<div class="st-hookstat" data-testid="st-hookstat">
    <div class="st-hookstat__head">
      <span class=${"st-status "+(Ka[t.status]||"")} data-testid="st-hookstat-status"
        title=${t.status==="misconfigured"?"The hook commands post to a different port than this dashboard":void 0}>${Ha(t.status)}</span>
      <span>${t.configured_count||s.length} configured</span>
      ${n.length>0&&o`<span class="st-warn" title=${n.join(", ")}>${n.length} missing: ${n.join(", ")}</span>`}
      <span>${t.fired_24h||0} fired in 24 h</span>
      <span title=${t.last_fire_ts?new Date(t.last_fire_ts*1e3).toLocaleString():void 0}>last ${t.last_fire_ts?pt(t.last_fire_ts):"never"}</span>
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
    ${e.map(l=>{const c=Ga(l);return o`<div key=${(l.path||"")+l.message} class="st-hookstat__warn" role="note">
        ${l.message}${c&&o`<code class="st-hookstat__snippet">${c}</code>`}
      </div>`})}
  </div>`}function Ja(t,s){const n=K(t);if(s.filter(l=>K(l)===n).length<2)return n;const a=String(t).split(/[\\/]/).filter(Boolean);return a.length<2?n:(/^(Users|home)$/.test(a[0])&&a.length===4?"~/":"")+a[a.length-2]+"/"+n}function Xa({w:t}){const{entries:s,aictl:n,st:a}=t;return o`<nav class="st-nav" aria-label="Tools">
    <${j}>Tools</${j}>
    <ul class="st-nav__list">
      ${s.map(e=>{const l=e.id===t.toolId,c=e.rows.filter(l?t.passTool:t.pass),i=c.some(d=>d.risky);return o`<li key=${e.id}>
          <button type="button" class=${"st-nav__item"+(l?" is-on":"")+(c.length?"":" is-empty")}
            aria-current=${l?"true":void 0} data-tool=${e.id}
            onClick=${()=>t.set({tool:e.id,sec:"",row:"",scope:l?t.st.scope:""})}>
            <${D} id=${e.id}/><span class="st-nav__label">${e.label}</span>
            ${i&&o`<${ft} label="A risky setting is on"/>`}
            <span class="st-nav__n">${c.length}</span>
          </button>
          ${l&&o`<ul class="st-nav__subs">
            ${e.sections.map(d=>{const h=d.rows.filter(t.passTool),u=a.sec===d.id,r=d.id==="agents"?ve(h):"";return o`<li key=${d.id}><button type="button" class=${"st-nav__sub"+(u?" is-on":"")}
                aria-current=${u?"true":void 0}
                onClick=${()=>t.set({sec:u?"":d.id})}>
                <span class="st-nav__label">${d.title}</span>
                ${h.some(p=>p.risky)&&o`<${ft} label="A risky setting is on"/>`}
                <span class="st-nav__n">${h.length}</span>
                ${r&&o`<span class="st-nav__model" title=${"Every agent runs on "+r}>${r}</span>`}
              </button></li>`})}
            ${e.envVars.length>0&&(()=>{const d=a.sec==="env",h=e.envVars.filter(u=>u.set&&Ut(u,t.q)).length;return o`<li key="env"><button type="button" class=${"st-nav__sub"+(d?" is-on":"")}
                aria-current=${d?"true":void 0} data-sec="env"
                onClick=${()=>t.set({sec:d?"":"env"})}>
                <span class="st-nav__label">Environment variables</span>
                <span class="st-nav__n">${h}</span>
              </button></li>`})()}
          </ul>`}
        </li>`})}
      ${n&&o`<li key="aictl">
        <button type="button" class=${"st-nav__item"+(t.toolId==="aictl"?" is-on":"")}
          aria-current=${t.toolId==="aictl"?"true":void 0} data-tool="aictl"
          onClick=${()=>t.set({tool:"aictl",sec:"",row:"",scope:""})}>
          <${D} id="aictl"/><span class="st-nav__label">aictl</span>
          <span class="st-nav__n">${n.collectors.length}</span>
        </button>
      </li>`}
    </ul>
  </nav>`}function Ya({row:t,w:s,scopes:n}){var l;const a=((l=s.selected)==null?void 0:l.uid)===t.uid,e=()=>s.select({tool:t.tool,row:t.key});return o`<tr class=${"st-row"+(t.risky?" st-row--risky":"")+(t.unset?" st-row--unset":"")+(a?" is-sel":"")}
    data-key=${t.key} tabindex="0" onClick=${e}
    onKeyDown=${c=>{(c.key==="Enter"||c.key===" ")&&(c.preventDefault(),e())}}>
    <td class="st-c-set">
      <div class="st-label">${t.label}${t.undocumented&&o` <${Ct}/>`}</div>
      ${t.risky&&t.tip&&o`<div class="st-risknote">${t.tip}</div>`}
    </td>
    <td class="st-c-val"><${vt} row=${t}/></td>
    <td class="st-c-scope"><${Z} scope=${t.scope} locked=${t.locked} label=${M(t.scope,n)}/></td>
    <td class="st-c-src"><${bt} path=${t.source} line=${t.line} w=${s} tool=${t.tool}/></td>
    <td class="st-c-what" title=${t.tip||void 0}>${t.tip}</td>
  </tr>`}function Qa({w:t,entry:s}){const n=s.scopes||[];if(!n.length)return null;const a=s.rows.filter(t.pass);return o`<div class="st-scopes" data-testid="st-scopes">
    <ol class="st-scopes__list" aria-label="Configuration layers, lowest precedence first">
      ${n.map((e,l)=>{const c=a.filter(p=>p.scope===e.id).length,i=t.st.scope===e.id,d=e.path?K(e.path):"",h=e.vars||[],u=h.length?h.slice(0,2).join(", ")+(h.length>2?` +${h.length-2}`:""):d||e.note,r=[e.label,e.paths.length?e.paths.join(`
`):"",h.length?"Set: "+h.join(", "):"",e.exists?"":"not present",e.note,e.changeable?"":"Locked: cannot be changed from this machine"].filter(Boolean).join(`
`);return o`<li key=${e.id} class="st-scopes__item">
          ${l>0&&o`<span class="st-scopes__arrow" aria-hidden="true">→</span>`}
          <button type="button" class=${"st-scopechip"+(i?" is-on":"")+(e.changeable?"":" is-locked")+(e.exists?"":" is-absent")}
            data-scope=${e.id} aria-pressed=${i?"true":"false"} title=${r}
            onClick=${()=>t.set({scope:i?"":e.id})}>
            <span class="st-scopechip__top">
              ${!e.changeable&&o`<${mt}/><span class="st-sr">Locked: </span>`}
              <span class="st-scopechip__label">${e.label}</span>
              <span class="st-scopechip__n">${c}<span class="st-sr"> ${c===1?"setting wins":"settings win"} here</span></span>
            </span>
            <span class=${"st-scopechip__file"+(h.length?" st-mono":"")} data-vars=${h.length?h.join(","):void 0}>${e.exists?u:e.id==="env"?"none set":"not present"}</span>
          </button>
        </li>`})}
    </ol>
    <p class="st-hint st-scopes__legend">Later layers override earlier ones. Locked layers cannot be changed from this machine.</p>
  </div>`}function ks({children:t,section:s}){return o`<tr class="st-extra" data-extra=${s}><td colspan="5">${t}</td></tr>`}const gs=t=>typeof t.value=="number"?t.value:t.value==null||t.value===""?void 0:wt(t.value);function to(t,s){return[{k:"setting",l:"Setting",cls:"st-c-set",get:n=>n.label},{k:"value",l:"Value",cls:"st-c-val",n:Ps(t,gs),get:gs},{k:"scope",l:"Scope",cls:"st-c-scope",get:n=>n.scope?M(n.scope,s):void 0},{k:"source",l:"Set in",cls:"st-c-src",get:n=>n.source},{k:"what",l:"What it does",get:n=>n.tip}]}function so({w:t,sections:s,scopes:n,shared:a,extras:e={}}){const l=to(s.flatMap(i=>i.shown),n),c=N("settings.tool",l,a);return o`<table class=${"st-table "+c.tableProps.class} style=${c.tableProps.style}>
    <thead><tr>${l.map(c.th)}</tr></thead>
    ${s.map(i=>{const d=i.shown.filter(h=>h.risky).length;return o`<tbody key=${i.id} data-section=${i.id}>
        <tr class="st-group"><th scope="colgroup" colspan="5">${i.title}
          <span class="st-group__meta">${i.shown.length}${d?o` · <span class="st-red">${d} risky</span>`:""}${i.hidden?o` · <span class="st-unsetn">+${i.hidden} unset</span>`:""}</span></th></tr>
        ${e[i.id]&&o`<${ks} section=${i.id}>${e[i.id]}</${ks}>`}
        ${c.order(i.shown).map(h=>o`<${Ya} key=${h.uid} row=${h} w=${t} scopes=${n}/>`)}
      </tbody>`})}
  </table>`}function eo(t){const s=[];for(const n of t){const a=n.id==="agents"&&n.shown.every(l=>l.kind==="agent"&&l.agent),e=s[s.length-1];a?s.push({agents:!0,sections:[n]}):e&&!e.agents?e.sections.push(n):s.push({agents:!1,sections:[n]})}return s}function no({w:t,entry:s}){const n=s.envVars.filter(i=>Ut(i,t.q)),a=n.filter(i=>i.set),e=t.showUnset?n:a,l=n.length-e.length;if(!e.length&&!l)return null;const c=t.selectedEnv;return o`<table class="st-table st-envtable" data-testid="st-env-table">
    <thead><tr><th>Variable</th><th>Value</th><th>Where</th><th>Drives</th><th>What it does</th></tr></thead>
    <tbody data-section="env">
      <tr class="st-group"><th scope="colgroup" colspan="5">Environment variables
        <span class="st-group__meta">${a.length} set${l?o` · <span class="st-unsetn">+${l} unset</span>`:""}</span></th></tr>
      ${e.map(i=>{const d=()=>t.openEnv(i.name,s.id);return o`<tr key=${i.name} class=${"st-row"+(i.set?"":" st-row--unset")+(c&&c.uid===i.uid?" is-sel":"")}
          data-env=${i.name} tabindex="0" onClick=${d}
          onKeyDown=${h=>{(h.key==="Enter"||h.key===" ")&&(h.preventDefault(),d())}}>
          <td class="st-c-set"><div class="st-label st-mono">${i.name}</div>${!i.documented&&o` <${Ct}/>`}</td>
          <td class="st-c-val">${i.set?i.masked?o`<span class="st-dim" title="The name says it holds a credential, so the value is not shown">hidden</span>`:o`<span class="st-v st-mono" title=${i.value}>${i.value===""?"(empty)":i.value}</span>`:o`<span class="st-none">not set</span>`}</td>
          <td class="st-c-src st-mono">${_e(i)||o`<span class="st-none">—</span>`}</td>
          <td>${i.drives.length?i.drives.map(h=>h.label).join(", "):o`<span class="st-none">—</span>`}</td>
          <td class="st-c-what" title=${i.description||void 0}>${i.description}</td>
        </tr>`})}
    </tbody>
  </table>`}function ao({w:t,entry:s}){const n=nn("settings.tool"),a=(!t.st.sec||t.st.sec==="env")&&(!t.st.scope||t.st.scope==="env"),e=a&&s.envVars.some(r=>(r.set||t.showUnset)&&Ut(r,t.q)),l=s.sections.filter(r=>!t.st.sec||r.id===t.st.sec).map(r=>({...r,shown:r.rows.filter(t.passTool),hidden:t.showUnset?0:r.rows.filter(p=>p.unset&&t.passAll(p)&&(!t.st.scope||p.scope===t.st.scope)).length})).filter(r=>r.shown.length||r.hidden),c=s.rows.length,i=Is(s),d=Ba(t.hooks,s.id),h={autonomy:i&&o`<${Wa} w=${t} entry=${s} perms=${i}/>`,hooks:d&&o`<${Za} status=${d}/>`},u=t.st.scope?M(t.st.scope,s.scopes):"";return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${D} id=${s.id} big/>
      <h2 class="st-bar__title" id="st-main-title">${s.label}</h2>
      <span class="st-bar__sub">${c} ${c===1?"setting":"settings"} in ${s.files.length} ${s.files.length===1?"file":"files"}${s.envUsed.length?` and ${s.envUsed.length} ${s.envUsed.length===1?"variable":"variables"}`:""}${s.risky?o` · <span class="st-red">${s.risky} risky</span>`:""}</span>
      <span class="st-bar__files">
        ${s.files.map(r=>o`<button type="button" key=${r} class="st-chip st-chip--mono st-chip--btn" title=${r}
          onClick=${()=>t.openAt(r)}>${Ja(r,s.files)}</button>`)}
        ${s.envUsed.map(r=>o`<button type="button" key=${"env:"+r.name} class="st-chip st-chip--mono st-chip--btn st-chip--env"
          data-env=${r.name} title=${"Environment variable "+r.name+(r.drives.length?": sets "+r.drives.map(p=>p.label).join(", "):"")}
          onClick=${()=>t.openEnv(r.name,s.id)}><span class="st-chip__pre" aria-hidden="true">$</span>${r.name}</button>`)}
      </span>
    </div>
    ${s.id==="vscode"&&o`<p class="st-note">chat.* settings, used by every AI tool in VS Code</p>`}
    ${s.hints.map((r,p)=>o`<p key=${p} class="st-note">${r}</p>`)}
    <${Qa} w=${t} entry=${s}/>
    ${l.length?eo(l).map((r,p)=>r.agents?o`<${da} key=${"a"+p} w=${t} section=${r.sections[0]}/>`:o`<${so} key=${"g"+p} w=${t} sections=${r.sections} scopes=${s.scopes} shared=${n} extras=${h}/>`):e?null:o`<p class="st-empty">${c?u?`No setting shown here is set at the ${u} layer.`:"No setting matches the search or the toggles.":"No settings were read for this tool."}</p>`}
    ${a&&o`<${no} w=${t} entry=${s}/>`}
  </section>`}const vs=[{k:"collector",l:"Collector",cls:"st-c-set",get:t=>t.name},{k:"mode",l:"Mode",get:t=>t.mode},{k:"status",l:"Status",get:t=>t.status},{k:"detail",l:"Detail",get:t=>t.detail}];function oo({w:t,aictl:s}){const n=N("settings.collectors",vs),a=t.q.trim().toLowerCase(),e=s.collectors.filter(c=>!a||[c.name,c.mode,c.status,c.detail].join(" ").toLowerCase().includes(a)),l=s.roots.filter(c=>!a||c.toLowerCase().includes(a));return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${D} id="aictl" big/>
      <h2 class="st-bar__title" id="st-main-title">aictl</h2>
      <span class="st-bar__sub">monitoring engine · ${s.collectors.length} collectors · ${s.roots.length} monitored roots</span>
    </div>
    ${e.length>0&&o`<table class=${"st-table "+n.tableProps.class} style=${n.tableProps.style}>
      <thead><tr>${vs.map(n.th)}</tr></thead>
      <tbody>
        <tr class="st-group"><th scope="colgroup" colspan="4">Collectors<span class="st-group__meta">${e.length}</span></th></tr>
        ${n.order(e).map(c=>o`<tr key=${c.name} class="st-row st-row--static">
          <td class="st-c-set st-mono">${c.name}</td>
          <td class="st-mono">${c.mode||"—"}</td>
          <td><span class=${"st-status "+(c.status==="active"?"is-ok":"is-warn")}>${c.status}</span></td>
          <td class="st-c-what" title=${c.detail||void 0}>${c.detail}</td>
        </tr>`)}
      </tbody>
    </table>`}
    ${l.length>0&&o`<h3 class="st-subhead">Monitored roots</h3>
      <ul class="st-roots">${l.map((c,i)=>o`<li key=${i} class="st-mono" title=${c}>${c}</li>`)}</ul>`}
    ${!e.length&&!l.length&&o`<p class="st-empty">Nothing matches the search.</p>`}
  </section>`}function Vs(t){if(t.st.sec&&It.includes(t.st.sec))return t.st.sec;const s=n=>t.entries.some(a=>a.rows.some(e=>e.sec===n));return s("autonomy")?"autonomy":It.find(s)||"autonomy"}function lo({w:t}){const s=Vs(t);return o`<nav class="st-nav" aria-label="Topics">
    <${j}>Topics</${j}>
    <ul class="st-nav__list">
      ${It.map(n=>{const a=t.entries.filter(c=>c.rows.some(i=>i.sec===n&&t.pass(i))),e=a.some(c=>c.rows.some(i=>i.sec===n&&i.risky&&t.pass(i))),l=n===s;return o`<li key=${n}><button type="button" class=${"st-nav__item"+(l?" is-on":"")+(a.length?"":" is-empty")}
          aria-current=${l?"true":void 0} data-sec=${n}
          onClick=${()=>t.set({sec:n})}>
          <span class="st-nav__label">${Bt[n]}</span>
          ${e&&o`<${ft} label="A risky setting is on"/>`}
          <span class="st-nav__n">${a.length} ${a.length===1?"tool":"tools"}</span>
        </button></li>`})}
    </ul>
  </nav>`}function io({w:t}){const[s,n]=C("tool"),a=t.entries.flatMap(i=>i.rows.filter(d=>d.sec==="agents"&&Ms(d))),e=a.filter(t.pass),l=new Set(e.map(i=>i.tool)).size,c=e.filter(yt).length;return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${Bt.agents}</h2>
      <span class="st-bar__sub" data-testid="st-agents-count">${e.length} ${e.length===1?"agent":"agents"} in ${l} ${l===1?"tool":"tools"}, ${c} inherit the session model</span>
    </div>
    ${e.length?o`<${ua} w=${t} rows=${e} sort=${s} onSort=${n}/>
      <p class="st-hint">Click an agent for its model decision, its tools and the files that define it.</p>`:o`<p class="st-empty">${a.length?"No agent matches the search or the toggles.":"No tool reports agents."}</p>`}
  </section>`}function _s(t,s,n){const a=t.cells[s];if(!(!a||a.unset&&!n))return typeof a.value=="number"?a.value:a.value==null||a.value===""?void 0:wt(a.value)}function co({w:t,tools:s,rows:n}){const a=[{k:"setting",l:"Setting",cls:"st-c-set",get:l=>l.label},...s.map(l=>({k:l.id,cls:"st-matrix__tool",attrs:{"data-tool":l.id},n:Ps(n,c=>_s(c,l.id,t.showUnset)),l:o`<span class="st-matrix__toolname"><${D} id=${l.id}/>${l.label}</span>`,get:c=>_s(c,l.id,t.showUnset)}))],e=N("settings.topic",a);return o`<div class="st-scroll"><table class=${"st-table st-matrix "+e.tableProps.class} style=${e.tableProps.style}>
      <thead><tr>${a.map(e.th)}</tr></thead>
      <tbody>
        ${e.order(n).map(l=>o`<tr key=${l.id} class="st-row st-row--static">
          <th scope="row" class="st-c-set" title=${l.keys.join(`
`)}>${l.label}</th>
          ${s.map(c=>{var h;const i=l.cells[c.id];if(!i||i.unset&&!t.showUnset)return o`<td key=${c.id} class="st-cell st-cell--none">—</td>`;const d=((h=t.selected)==null?void 0:h.uid)===i.uid;return o`<td key=${c.id} class=${"st-cell"+(i.risky?" is-risky":"")+(i.unset?" is-unset":"")+(d?" is-sel":"")}>
              <button type="button" class="st-cellbtn" data-key=${i.key}
                aria-label=${`${l.label}, ${c.label}: ${wt(i.value)}${i.unset?" (not set, default)":""}`}
                onClick=${()=>t.select({tool:c.id,row:i.key})}>
                <${vt} row=${i} compact/>
              </button>
            </td>`})}
        </tr>`)}
      </tbody>
    </table></div>`}function ro({w:t}){const s=Vs(t);if(s==="agents")return o`<${io} w=${t}/>`;const{tools:n,rows:a}=we(t.entries,s,t.pass),e=a.reduce((c,i)=>c+Object.values(i.cells).filter(d=>d.risky).length,0),l=s==="autonomy"?Pa(t.entries):[];return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${Bt[s]}</h2>
      <span class="st-bar__sub">every tool, side by side${e?o` · <span class="st-red">${e} risky ${e===1?"value":"values"}</span>`:""}</span>
    </div>
    <${Va} w=${t} mats=${l}/>
    ${a.length?o`<${co} w=${t} tools=${n} rows=${a}/>
    <p class="st-hint">A cell is one setting in one tool. Click it for the file, the scope and the override chain.</p>`:o`<p class="st-empty">${n.length?"No setting matches the search or the toggles.":"No tool has settings in this section."}</p>`}
  </section>`}const po=8,Us=86400,gt=8;function Jt(t){const s=t.cell?t.cell.split(":"):null;return{loc:G(t.sec),tools:G(t.tool),purpose:G(t.purpose),scope:G(t.fscope),git:G(t.git),recent:!!t.recent,cell:s&&s.length===2?s:null}}function uo(t,s,n,a){return!(n!=="loc"&&s.loc.length&&!s.loc.includes(t.location)||n!=="tools"&&s.tools.length&&!t.tools.some(e=>s.tools.includes(e))||n!=="purpose"&&s.purpose.length&&!s.purpose.includes(z(t))||n!=="scope"&&s.scope.length&&!s.scope.includes(t.scope)||n!=="git"&&s.git.length&&!s.git.includes(Ht(t))||n!=="recent"&&s.recent&&!(t.mtime&&t.mtime>=a-Us)||n!=="cell"&&s.cell&&(z(t)!==s.cell[0]||t.location!==s.cell[1]))}function St(t,s=null,n=Date.now()/1e3){const a=Jt(t.st);return t.files.filter(e=>xe(e,t.q)&&uo(e,a,s,n))}function X(t,s,n){const a=G(t.st[s]);t.set({[s]:Ee(a.includes(n)?a.filter(e=>e!==n):[...a,n]),row:""})}function ct({w:t,title:s,fkey:n,skip:a,options:e,valueOf:l,attr:c,swatch:i}){const d=St(t,a),h=G(t.st[n]),u=e.map(r=>({...r,n:d.filter(p=>l(p).includes(r.id)).length})).filter(r=>r.n||h.includes(r.id)||r.always);return u.length?o`<${j}>${s}</${j}>
    <ul class="st-nav__list" aria-label=${s}>
      ${u.map(r=>{const p=h.includes(r.id);return o`<li key=${r.id}><button type="button" class=${"st-nav__item"+(p?" is-on":"")+(r.n?"":" is-empty")}
          aria-pressed=${p?"true":"false"} ...${{[c]:r.id}} onClick=${()=>X(t,n,r.id)}>
          ${i?o`<${D} id=${r.id}/>`:null}<span class="st-nav__label">${r.label}</span><span class="st-nav__n">${r.n}</span></button></li>`})}
    </ul>`:null}function ho({w:t}){const s=[...new Set(t.files.flatMap(e=>e.tools))],n=[...new Set(t.files.map(e=>e.scope).filter(Boolean))],a=St(t,"recent").filter(e=>e.mtime&&e.mtime>=Date.now()/1e3-Us).length;return o`<nav class="st-nav" aria-label="File filters">
    <${ct} w=${t} title="Locations" fkey="sec" skip="loc" attr="data-loc" options=${Se.map(e=>({...e,always:!0}))} valueOf=${e=>[e.location]}/>
    <${ct} w=${t} title="Purpose" fkey="purpose" skip="purpose" attr="data-purpose" options=${Ce} valueOf=${e=>[z(e)]}/>
    <${ct} w=${t} title="Read by" fkey="tool" skip="tools" attr="data-tool" swatch=${!0}
      options=${s.map(e=>({id:e,label:t.labelOf(e)}))} valueOf=${e=>e.tools}/>
    <${ct} w=${t} title="Scope" fkey="fscope" skip="scope" attr="data-scope"
      options=${n.map(e=>({id:e,label:As[e]||e}))} valueOf=${e=>[e.scope]}/>
    <${ct} w=${t} title="Git" fkey="git" skip="git" attr="data-git" options=${Os} valueOf=${e=>[Ht(e)]}/>
    <${j}>Changes</${j}>
    <ul class="st-nav__list">
      <li><button type="button" class=${"st-nav__item"+(t.st.recent?" is-on":"")} aria-pressed=${t.st.recent?"true":"false"}
        data-recent="1" onClick=${()=>t.set({recent:!t.st.recent,row:""})}>
        <span class="st-nav__label">Changed in the last 24 h</span><span class="st-nav__n">${a}</span></button></li>
    </ul>
  </nav>`}function $o({w:t}){const s=Jt(t.st),n=[...s.loc.map(a=>({k:"sec:"+a,label:"Location: "+(is[a]||a),drop:()=>X(t,"sec",a)})),...s.purpose.map(a=>({k:"purpose:"+a,label:"Purpose: "+(st[a]||a),drop:()=>X(t,"purpose",a)})),...s.tools.map(a=>({k:"tool:"+a,label:"Read by: "+t.labelOf(a),drop:()=>X(t,"tool",a)})),...s.scope.map(a=>({k:"fscope:"+a,label:"Scope: "+(As[a]||a),drop:()=>X(t,"fscope",a)})),...s.git.map(a=>{var e;return{k:"git:"+a,label:"Git: "+(((e=Os.find(l=>l.id===a))==null?void 0:e.label)||a),drop:()=>X(t,"git",a)}}),...s.recent?[{k:"recent",label:"Changed in the last 24 h",drop:()=>t.set({recent:!1,row:""})}]:[],...s.cell?[{k:"cell",label:(st[s.cell[0]]||s.cell[0])+" in "+(is[s.cell[1]]||s.cell[1]),drop:()=>t.set({cell:"",row:""})}]:[]];return n.length?o`<div class="st-fchips" data-testid="st-file-chips">
    ${n.map(a=>o`<button key=${a.k} type="button" class="st-chip st-chip--btn" data-chip=${a.k}
      aria-label=${"Remove the filter "+a.label} onClick=${a.drop}>${a.label} <span aria-hidden="true">×</span></button>`)}
    <button type="button" class="st-link" onClick=${()=>t.set({sec:"",tool:"",purpose:"",fscope:"",git:"",recent:!1,cell:"",row:""})}>Clear filters</button>
  </div>`:null}function fo({w:t}){const s=Ae(St(t,"cell").filter(e=>!e.is_dir)),n=[{k:"purpose",l:"Purpose",get:e=>e.label},...s.cols.map(e=>({k:e.id,l:e.label,cls:"st-num",n:!0,get:l=>l.cells[e.id]||void 0})),{k:"all",l:"All",cls:"st-num",n:!0,get:e=>e.total||void 0}],a=N("settings.files.matrix",n);return s.rows.length?o`<div class="st-scroll"><table class=${"st-table st-fmatrix "+a.tableProps.class} style=${a.tableProps.style} data-testid="st-file-matrix">
    <caption class="st-sr">Files by purpose and location</caption>
    <thead><tr>${n.map(a.th)}</tr></thead>
    <tbody>${a.order(s.rows).map(e=>o`<tr key=${e.id}>
      <th scope="row">${e.label}</th>
      ${s.cols.map(l=>{const c=e.cells[l.id]||0,i=e.id+":"+l.id,d=t.st.cell===i;return o`<td key=${l.id} class=${"st-cell st-num"+(d?" is-sel":"")}>${c?o`<button type="button" class="st-cellbtn" data-cell=${i} aria-pressed=${d?"true":"false"}
              aria-label=${c+" "+e.label+" "+(c===1?"file":"files")+" in "+l.label}
              onClick=${()=>t.set({cell:d?"":i,row:""})}>${c}</button>`:o`<span class="st-dim" aria-hidden="true">·</span>`}</td>`})}
      <td class="st-num st-dim">${e.total}</td>
    </tr>`)}</tbody>
  </table></div>`:null}function bo({f:t,w:s}){const n=s.selectedFile&&s.selectedFile.path===t.path,a=()=>s.select({row:t.path}),e=Le(t);return o`<tr class=${"st-row"+(n?" is-sel":"")+(t.exists===!1?" is-missing":"")}
    data-path=${t.path} tabindex="0" onClick=${a}
    onKeyDown=${l=>{(l.key==="Enter"||l.key===" ")&&(l.preventDefault(),a())}}>
    <td class="st-c-file">
      ${t.is_dir?o`<span class="st-fname" title=${t.path}>${t.name}/</span>`:o`<button type="button" class="st-fname st-link" title=${"Open "+t.path}
            onClick=${l=>{l.stopPropagation(),s.openAt(t.path)}}>${t.name}</button>`}
      ${t.exists===!1&&o`<span class="st-hint"> missing</span>`}
    </td>
    <td><span class="st-chip" data-kind=${z(t)}>${t.is_dir?"Folder":st[z(t)]}</span></td>
    <td><${Z} scope=${t.scope}/></td>
    <td><span class="st-tools">${t.tools.map(l=>o`<${U} key=${l} id=${l} label=${s.labelOf(l)}/>`)}</span></td>
    <td class="st-mono st-num">${t.settings?t.settings:"—"}</td>
    <td class="st-mono st-num">${!t.is_dir&&t.bytes!=null?Gt(t.bytes):"—"}</td>
    <td class=${e?"st-warn":"st-dim"} data-git=${Ht(t)||void 0}
      title=${e?"A tool always loads this file, and git does not track it":void 0}>${t.git_state||"—"}</td>
    <td class="st-dim">${t.mtime?pt(t.mtime):"—"}</td>
  </tr>`}function yo(t){const s=Jt(t.st);if(s.loc.length||s.purpose.length||s.scope.length||s.git.length||s.recent||s.cell)return[];const n=t.q.trim().toLowerCase();return(t.managedAbsent||[]).filter(a=>(!n||[a.path,a.label,a.note].join(`
`).toLowerCase().includes(n))&&(!s.tools.length||a.tools.some(e=>s.tools.includes(e))))}function mo({w:t,items:s}){const[n,a]=C(!1);return o`<tbody class="st-absent" data-root="managed-absent">
    <tr class="st-group"><th scope="colgroup" colspan=${gt}>
      <button type="button" class="st-fold" aria-expanded=${n?"true":"false"} onClick=${()=>a(!n)}>
        <span aria-hidden="true">${n?"▾":"▸"}</span><span>Managed locations (not present)</span></button>
      <span class="st-group__meta">${s.length} ${s.length===1?"location":"locations"} · where a policy would come from</span>
    </th></tr>
    ${n&&s.map(e=>o`<tr key=${e.path} class="st-row st-row--static st-row--absent" data-path=${e.path}>
      <td class="st-c-file"><span class="st-fname" title=${e.path+(e.note?`
`+e.note:"")}>${V(e.path)}</span>
        <span class="st-hint"> not present</span></td>
      <td class="st-dim">—</td>
      <td><span class="st-scopewrap"><${mt} label="Cannot be changed from this machine"/><${Z} scope=${e.scope}/></span></td>
      <td><span class="st-tools">${e.tools.map(l=>o`<${U} key=${l} id=${l} label=${t.labelOf(l)}/>`)}</span></td>
      <td class="st-mono st-num">—</td><td class="st-mono st-num">—</td><td class="st-dim">—</td><td class="st-dim">—</td>
    </tr>`)}
  </tbody>`}function ko(t,s){const n=t.filter(l=>!l.is_dir),a=t.filter(l=>l.is_dir),e=s==="purpose"?Me(n).map(l=>({key:"purpose:"+l.id,attrs:{"data-purpose":l.id},title:l.label,mono:!1,root:null,files:l.files})):Oe(n).map(l=>({key:l.root,attrs:{"data-root":l.root},title:V(l.root),full:l.root,mono:!0,root:l.root,sub:Ts[l.location]||"Other",files:l.files}));return a.length&&e.push({key:"watched",attrs:{"data-root":"watched"},title:"Watched folders",mono:!1,root:null,flat:!0,sub:"folders the monitor reads",files:a}),e}function go({g:t,w:s,open:n,setOpen:a,shut:e,setShut:l,grid:c}){const i=!!e[t.key],d=[...new Set(t.files.flatMap(r=>r.tools))],h=t.files.reduce((r,p)=>r+(p.is_dir?0:Number(p.bytes)||0),0),u=(t.flat?[{dir:"",files:t.files}]:Te(t.files)).map(r=>({...r,files:c.order(r.files)}));return t.root&&u.sort((r,p)=>(p.dir===t.root)-(r.dir===t.root)),o`<tbody ...${t.attrs}>
    <tr class="st-group"><th scope="colgroup" colspan=${gt}>
      <button type="button" class="st-fold" aria-expanded=${i?"false":"true"}
        onClick=${()=>l({...e,[t.key]:!i})}>
        <span aria-hidden="true">${i?"▸":"▾"}</span>
        <span class=${t.mono?"st-mono":""} title=${t.full||void 0}>${t.title}</span></button>
      <span class="st-group__meta">${t.sub?t.sub+" · ":""}${t.files.length} ${t.files.length===1?"file":"files"}${h?" · "+Gt(h):""}</span>
      ${d.length>0&&o`<span class="st-tools st-group__tools">${d.map(r=>o`<${U} key=${r} id=${r} label=${s.labelOf(r)}/>`)}</span>`}
    </th></tr>
    ${!i&&u.map(r=>{const p=t.key+"|"+r.dir,g=n[p]?r.files:r.files.slice(0,po),v=r.files.length-g.length;return o`<${cs} key=${p}>
        ${r.dir&&r.dir!==t.root&&o`<tr class="st-folder" data-dir=${r.dir}><td colspan=${gt}>
          <span class="st-mono st-path" title=${r.dir}>${V(r.dir)}</span><span class="st-dim"> · ${r.files.length}</span></td></tr>`}
        ${g.map(_=>o`<${bo} key=${_.path} f=${_} w=${s}/>`)}
        ${v>0&&o`<tr class="st-morerow"><td colspan=${gt}>
          <button type="button" class="st-link st-more" onClick=${()=>a({...n,[p]:!0})}>▸ ${v} more</button>
        </td></tr>`}
      </${cs}>`})}
  </tbody>`}const vo=[{value:"location",label:"By location"},{value:"purpose",label:"By purpose"}],_o=t=>{if(!t.mtime)return;const s=Number(t.mtime);return s>0?s:typeof t.mtime=="string"&&Date.parse(t.mtime)||void 0};function ws(t){return[{k:"file",l:"File",cls:"st-c-file",get:s=>s.name},{k:"purpose",l:"Purpose",get:s=>s.is_dir?"Folder":st[z(s)]},{k:"scope",l:"Scope",get:s=>s.scope},{k:"readby",l:"Read by",get:s=>s.tools.map(t.labelOf).join(", ")},{k:"settings",l:"Settings",cls:"st-num",n:!0,get:s=>s.settings||void 0},{k:"size",l:"Size",cls:"st-num",n:!0,get:s=>s.is_dir||s.bytes==null?void 0:Number(s.bytes)},{k:"git",l:"Git",get:s=>s.git_state},{k:"changed",l:"Last change",n:!0,get:_o}]}function wo({w:t}){const s=N("settings.files",ws(t)),[n,a]=C({}),[e,l]=C({}),c=St(t),i=t.st.group==="purpose"?"purpose":"location",d=ko(c,i),h=yo(t);return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Files aictl reads</h2>
      <span class="st-bar__sub">${c.length} ${c.length===1?"file":"files"} · grouped by ${i==="purpose"?"what they are for":"where they live"}</span>
      <div class="st-seg st-bar__end" role="group" aria-label="Group the files">
        ${vo.map(u=>o`<button key=${u.value} type="button" class="st-seg__btn" aria-pressed=${i===u.value?"true":"false"}
          onClick=${()=>t.set({group:u.value})}>${u.label}</button>`)}
      </div>
    </div>
    ${t.filesStatus!=="ready"&&o`<p class="st-note" role="status">${t.readonly?"File details are not reported for the selected nodes.":"File details are loading"}</p>`}
    <${fo} w=${t}/>
    <${$o} w=${t}/>
    ${d.length||h.length?o`<div class="st-scroll"><table class=${"st-table st-files "+s.tableProps.class} style=${s.tableProps.style}>
      <thead><tr>${ws(t).map(s.th)}</tr></thead>
      ${d.map(u=>o`<${go} key=${u.key} g=${u} w=${t} open=${n} setOpen=${a} shut=${e} setShut=${l} grid=${s}/>`)}
      ${h.length>0&&o`<${mo} w=${t} items=${h}/>`}
    </table></div>`:o`<p class="st-empty">${t.readonly?"No settings file records for this scope.":t.files.length?"No file matches the search or the filters.":"No settings files were found."}</p>`}
  </section>`}const Co=5;function Bs(t,s){return t?V(t)+(s>0?":"+s:""):"—"}function So({w:t}){const s=Es(t.findings.filter(n=>Ls(n,t.q)));return o`<nav class="st-nav" aria-label="Finding rules">
    <${j}>Finding rules</${j}>
    <ul class="st-nav__list">
      <li><button type="button" class=${"st-nav__item"+(t.st.sec?"":" is-on")} aria-current=${t.st.sec?void 0:"true"}
        onClick=${()=>t.set({sec:"",row:""})}>
        <span class="st-dotspace" aria-hidden="true"></span><span class="st-nav__label">All rules</span>
        <span class="st-nav__n">${s.reduce((n,a)=>n+a.count,0)}</span></button></li>
      ${s.map(n=>{const a=t.st.sec===n.rule;return o`<li key=${n.rule}><button type="button" class=${"st-nav__item"+(a?" is-on":"")}
          aria-current=${a?"true":void 0} data-rule=${n.rule}
          onClick=${()=>t.set({sec:a?"":n.rule,row:""})}>
          ${n.alarm?o`<${ft} label=${n.severity+" severity"}/>`:o`<span class="st-dotspace" aria-hidden="true"></span>`}
          <span class="st-nav__label">${n.label}</span><span class="st-nav__n">${n.count}</span></button></li>`})}
    </ul>
  </nav>`}function xo({f:t,group:s,w:n}){const a=n.selectedFinding&&n.selectedFinding.id===t.id,e=()=>n.select({row:t.id,sec:n.st.sec}),l=s.why&&t.why===s.why?t.action||"":t.why||t.action||"",c=ut(t).map(n.labelOf).join(", ")||(t.session_id?"session "+t.session_id:"—");return o`<tr class=${"st-row"+(a?" is-sel":"")+(t.severity==="high"||t.severity==="medium"?" st-row--risky":"")}
    data-id=${t.id} tabindex="0" onClick=${e}
    onKeyDown=${i=>{(i.key==="Enter"||i.key===" ")&&(i.preventDefault(),e())}}>
    <td class="st-c-tool">${c}</td>
    <td class="st-c-where st-mono" title=${t.path?t.path+(t.line>0?":"+t.line:""):void 0}>
      ${Bs(t.path,t.line)}${t.count>1?o` <span class="st-dim">×${t.count}</span>`:""}</td>
    <td class="st-c-what" title=${[t.why,t.action].filter(Boolean).join(`
`)||void 0}>${l}</td>
    <td class="st-c-act">${t.path&&(tt(t.path)?o`<button type="button" class="st-chip st-chip--btn"
        onClick=${i=>{i.stopPropagation(),n.openEnv(W(t.path),ut(t)[0]||"")}}>Show the variable</button>`:o`<button type="button" class="st-chip st-chip--btn"
        onClick=${i=>{i.stopPropagation(),n.openAt(t.path,t.line)}}>Show the line</button>`)}</td>
  </tr>`}function Cs(t){return[{k:"tool",l:"Tool",cls:"st-c-tool",get:n=>ut(n).map(t.labelOf).join(", ")},{k:"where",l:"Where",cls:"st-c-where",get:n=>n.path?V(n.path)+String(n.line>0?n.line:0).padStart(8,"0"):void 0},{k:"what",l:"What it does",get:n=>n.why||n.action},{k:"action",l:o`<span class="st-sr">Action</span>`,cls:"st-c-act"}]}function Mo({w:t}){var u,r;const s=N("settings.findings",Cs(t)),[n,a]=C({});if(t.auditStatus==="loading"&&!t.audit){const p=t.scan;return o`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note" role="status" aria-busy="true" data-state="scanning">Scanning context sources…${p?" "+(p.step||"")+(p.elapsed_s!=null?", "+Math.round(p.elapsed_s)+" s":""):""}</p>
    </section>`}if(t.auditStatus==="error"&&!t.audit)return o`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note st-red" role="alert">The context audit failed: ${t.auditError}
        ${t.rescan&&o` <button type="button" class="st-btn" onClick=${()=>t.rescan()}>Retry</button>`}</p>
    </section>`;const e=t.findings.filter(p=>Ls(p,t.q)),l=Es(e).filter(p=>!t.st.sec||p.rule===t.st.sec),c=l.reduce((p,g)=>p+g.count,0),i=t.auditStatus==="loading",d=((u=t.audit)==null?void 0:u.incomplete)||[],h=((r=t.audit)==null?void 0:r.failed_steps)||[];return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Findings</h2>
      <span class="st-bar__sub">${c} in ${l.length} ${l.length===1?"rule":"rules"} · hidden changes, conflicts and settings outside this project</span>
      ${t.rescan&&o`<button type="button" class="st-chip st-chip--btn st-bar__end" disabled=${i}
        onClick=${()=>t.rescan()}>${i?"Scanning…":"Rescan"}</button>`}
    </div>
    ${i&&o`<p class="st-note" role="status" data-state="rescanning">Scanning again…${t.scan?" "+(t.scan.step||"")+(t.scan.elapsed_s!=null?", "+Math.round(t.scan.elapsed_s)+" s":""):""} The last results stay until it ends.</p>`}
    ${t.auditStatus==="error"&&o`<p class="st-note st-red" role="alert">The last scan failed: ${t.auditError}. These are the earlier results.</p>`}
    ${d.length>0&&o`<p class="st-note st-warn">The scan reached its time limit and skipped: ${d.join(", ")}.</p>`}
    ${h.length>0&&o`<p class="st-note st-warn">The scan could not read: ${h.map(p=>p.step+" ("+p.error+")").join(", ")}.</p>`}
    ${l.length?o`<table class=${"st-table st-findings "+s.tableProps.class} style=${s.tableProps.style}>
      <thead><tr>${Cs(t).map(s.th)}</tr></thead>
      ${l.map(p=>{const g=!!n[p.rule],v=s.order(p.items),_=g?v:v.slice(0,Co),f=v.length-_.length;return o`<tbody key=${p.rule} data-rule=${p.rule}>
          <tr class="st-group"><th scope="colgroup" colspan="4">
            ${p.alarm&&o`<${ft} label=${p.severity+" severity"}/>`} ${p.label}
            <span class="st-group__meta">${p.count} · ${p.tools.map(t.labelOf).join(", ")||"no tool"}${p.why?" · "+p.why:""}</span>
          </th></tr>
          ${_.map(A=>o`<${xo} key=${A.id} f=${A} group=${p} w=${t}/>`)}
          ${f>0&&o`<tr class="st-morerow"><td colspan="4">
            <button type="button" class="st-link st-more" onClick=${()=>a({...n,[p.rule]:!0})}>▸ ${f} more</button>
          </td></tr>`}
        </tbody>`})}
    </table>`:o`<p class="st-empty">${t.findings.length?"No finding matches the search.":"No findings for the selected tools."}</p>`}
  </section>`}const H=[{id:"allow",label:"Allow",hint:"run without asking"},{id:"deny",label:"Deny",hint:"always refused"},{id:"ask",label:"Ask",hint:"always ask first"}];function Ss(t){return String((t==null?void 0:t.message)||t||"").replace(/^HTTP \d+ \S+: /,"")||"The request failed"}const Ft=t=>Object.fromEntries(H.map(s=>{var n;return[s.id,Ia((n=t==null?void 0:t.permissions)==null?void 0:n[s.id])]}));function Oo({title:t,diff:s}){const n=s.added.length||s.removed.length;return o`<div class="st-diff" data-bucket=${t}>
    <span class="st-diff__name">${t}</span>
    <span class="st-diff__chips">
      ${n?o`${s.added.map(a=>o`<code key=${"a"+a} class="st-diff__chip is-added">+ ${a}</code>`)}
          ${s.removed.map(a=>o`<code key=${"r"+a} class="st-diff__chip is-removed">- ${a}</code>`)}`:o`<span class="st-dim">no change</span>`}
    </span>
  </div>`}function Ao({tool:t,target:s,refresh:n,onClose:a}){const[e,l]=C(null),[c,i]=C(()=>Ft(null)),[d,h]=C(!0),[u,r]=C(!1),[p,g]=C(null),[v,_]=C(null),f=I(()=>{let y=!0;return h(!0),g(null),Pe(t,s.scope).then(T=>{y&&(l(T),i(Ft(T)),h(!1))},T=>{y&&(g({message:Ss(T),conflict:!0}),h(!1))}),()=>{y=!1}},[t,s.scope]);Y(()=>f(),[f]);const A=Object.fromEntries(H.map(y=>[y.id,za(c[y.id])])),F=Object.fromEntries(H.map(y=>{var T;return[y.id,((T=e==null?void 0:e.permissions)==null?void 0:T[y.id])||[]]})),xt=Object.fromEntries(H.map(y=>[y.id,Da(F[y.id],A[y.id])])),R=H.some(y=>JSON.stringify(F[y.id])!==JSON.stringify(A[y.id])),Mt=JSON.stringify({permissions:A},null,2),E=(e==null?void 0:e.path)||s.path,Ot=()=>{r(!0),g(null),_(null),je(t,{scope:s.scope,expected_mtime:(e==null?void 0:e.mtime)??null,permissions:A}).then(y=>{l(y),i(Ft(y)),_({backup:(y==null?void 0:y.backup_path)||""}),r(!1),typeof n=="function"&&n()},y=>{g({message:Ss(y),conflict:(y==null?void 0:y.status)===409}),r(!1)})},At=()=>{_(null),f()};return o`<section class="st-insp__sec st-editor" data-testid="st-perm-editor" aria-label="Edit permissions">
    <h4 class="st-insp__h">Edit permissions · ${s.label}</h4>
    <p class="st-hint st-editor__target" data-testid="st-editor-target">
      Writes <span class="st-mono" title=${E}>${E}</span> (${s.label})${e&&!e.exists?", a new file":""}
    </p>
    ${p&&o`<div class="st-editor__error" role="alert" data-testid="st-editor-error">
      <span>${p.message}</span>
      ${p.conflict&&o`<button type="button" class="st-btn" onClick=${At}>Reload</button>`}
    </div>`}
    ${v&&o`<div class="st-editor__saved" role="status" data-testid="st-editor-saved">
      ${v.backup?o`Saved. Backup: <span class="st-mono" title=${v.backup}>${v.backup}</span>`:"Saved. The file was new, so there is no backup."}
    </div>`}
    ${d?o`<p class="st-hint">Loading the file…</p>`:e&&o`
      <div class="st-editor__fields">
        ${H.map(y=>o`<label key=${y.id} class="st-editor__field">
          <span class="st-editor__label">${y.label} <span class="st-dim">· ${y.hint}, one rule per line</span></span>
          <textarea class="st-editor__area" data-bucket=${y.id} rows="4" spellcheck="false" value=${c[y.id]}
            onInput=${T=>i({...c,[y.id]:T.currentTarget.value})}></textarea>
        </label>`)}
      </div>
      <div class="st-editor__diff" data-testid="st-editor-diff">
        <div class="st-insp__h">Pending diff</div>
        ${H.map(y=>o`<${Oo} key=${y.id} title=${y.id} diff=${xt[y.id]}/>`)}
      </div>
      <pre class="st-editor__json" data-testid="st-editor-json">${Mt}</pre>`}
    <div class="st-actions">
      <button type="button" class="st-btn st-btn--primary" onClick=${Ot} disabled=${d||u||!e||!R}>${u?"Saving…":"Save"}</button>
      <button type="button" class="st-btn" onClick=${a}>Cancel</button>
    </div>
  </section>`}function m({title:t,children:s}){return o`<section class="st-insp__sec"><h4 class="st-insp__h">${t}</h4>${s}</section>`}function Xt(t,s){return"Open "+K(t)+(s>0?" at line "+s:"")}function Yt(t,s){return s?t.findings.filter(n=>ht(n.path,s)):[]}function Qt(t,s){t.set({view:"findings",sec:s.rule||"",row:s.id,tool:""})}function Hs({w:t,path:s}){const n=s&&t.recentFiles&&typeof t.recentFiles.get=="function"?t.recentFiles.get(s):null,a=s?t.mtimeOf(s):null,e=[];return n?e.push(`File changed ${pt(n.ts)}${n.tool?" by "+t.labelOf(n.tool):""} (file history)`):a&&e.push(`File last changed ${pt(a)} (file history)`),o`<div class="st-hint" data-testid="st-history">${e.length?e.join(" · ")+" · no aictl change recorded":"No aictl change recorded"}</div>`}function To(t,s){var a;const n=(a=t.chain)==null?void 0:a[t.wins];return t.locked||Vt(n,s)?"Locked by "+M(t.locked?t.scope:n.scope,s):zs}function Eo(t,s){const n=ze(s);return`Not set in any file. Default: ${wt(t.value)}.`+(n?` Set it in ${V(n.path)} (${n.label}).`:"")}function Lo({w:t,row:s}){const n=t.scopesOf(s.tool),a=t.entries.filter(r=>r.id!==s.tool&&s.source&&r.files.some(p=>ht(p,s.source))).map(r=>r.label),e=s.source?t.files.find(r=>ht(r.path,s.source)):null;for(const r of(e==null?void 0:e.tools)||[]){const p=t.labelOf(r);r!==s.tool&&!a.includes(p)&&a.push(p)}const l=Yt(t,s.source),{chain:c,wins:i}=s,d=qa(s,n),[h,u]=C(!1);return o`<div class="st-insp__body" data-testid="st-inspector-row">
    <h3 class="st-insp__title">${s.label}</h3>
    <div class="st-insp__key st-mono">${s.key}</div>
    ${s.tip&&o`<p class="st-insp__tip">${s.tip}</p>`}
    <div class="st-insp__chips">
      ${s.risky&&o`<span class="st-chip st-chip--risky">risky</span>`}
      <${U} id=${s.tool} label=${t.labelOf(s.tool)}/>
      <${Z} scope=${s.scope} locked=${s.locked} label=${M(s.scope,n)}/>
      ${s.undocumented&&o`<${Ct}/>`}
      ${a.length>0&&o`<span class="st-chip">also read by ${a.join(", ")}</span>`}
    </div>
    <div class=${"st-insp__value"+(s.unset?" is-unset":"")}><${vt} row=${s}/></div>
    ${s.unset&&o`<p class="st-insp__tip" data-testid="st-unset-text">${Eo(s,n)}</p>`}
    <${m} title="Override chain · what wins and why">
      <ol class="st-chain">
        ${c.map((r,p)=>{const g=p===i,v=Vt(r,n);return o`<li key=${p} class=${"st-chain__lv"+(g?" is-win":"")+(v?" is-locked":"")} aria-current=${g?"true":void 0}>
            <span class="st-chain__sc">${v&&o`<${mt} label=${"Locked: "+M(r.scope,n)+" cannot be changed here"}/>`}${r.scope||"default"}</span>
            <span class="st-chain__v">${Re(r)?o`<span class="st-dim">not set</span>`:o`<${vt} row=${s} value=${r.value} compact/>`}</span>
            <span class="st-chain__src">${r.source?o`<${bt} path=${r.source} line=${Number(r.line)>0?Number(r.line):0} w=${t} tool=${s.tool}/>`:o`<span class="st-dim">${r.note||(r.scope==="default"?t.labelOf(s.tool):"—")}</span>`}</span>
            ${g&&o`<span class="st-sr"> (wins)</span>`}
          </li>`})}
      </ol>
      <p class="st-hint st-insp__why">${qe(c,i)}</p>
    </${m}>
    ${!tt(s.source)&&o`<${m} title="History"><${Hs} w=${t} path=${s.source}/></${m}>`}
    <${m} title="Actions">
      <div class="st-actions">
        ${s.source&&(tt(s.source)?o`<button type="button" class="st-btn" onClick=${()=>t.openEnv(W(s.source),s.tool)}>Show ${W(s.source)||"the variable"}</button>`:o`<button type="button" class="st-btn" onClick=${()=>t.openAt(s.source,s.line)}>${Xt(s.source,s.line)}</button>`)}
        ${l.length>0&&o`<button type="button" class="st-btn" onClick=${()=>Qt(t,l[0])}>Show finding</button>`}
      </div>
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled=${!d.ok||h}
          aria-expanded=${d.ok?h?"true":"false":void 0}
          onClick=${()=>u(!0)}>Change value…</button>
        <span class="st-hint" data-testid="st-change-hint">${d.ok?`Edits ${V(d.path)||"the "+d.label+" file"} (${d.label})`:d.hint}</span>
      </div>
    </${m}>
    ${h&&o`<${Ao} tool=${s.tool} target=${d} refresh=${t.refresh}
      onClose=${()=>u(!1)}/>`}
  </div>`}function Po({w:t,row:s}){const n=s.agent,a=t.scopesOf(s.tool),{steps:e,wins:l,why:c}=Fe(s),i=u=>Number(u)>0?Number(u):0,d=[{label:"Defined in",path:n.defined_in,line:i(n.defined_line),scope:n.scope_defined},{label:"Pinned in",path:n.pinned_in,line:i(n.pinned_line),scope:n.scope_pinned}],h=To(s,a);return o`<div class="st-insp__body" data-testid="st-inspector-agent">
    <h3 class="st-insp__title">${n.name||s.label}</h3>
    <div class="st-insp__key st-mono">${s.key}</div>
    ${n.description&&o`<p class="st-insp__tip">${n.description}</p>`}
    <div class="st-insp__chips">
      <${U} id=${s.tool} label=${t.labelOf(s.tool)}/>
      <${Z} scope=${s.scope} locked=${s.locked} label=${M(s.scope,a)}/>
    </div>
    <div class="st-insp__value"><${Ns} row=${s} w=${t}/></div>
    <${m} title="Model · what decides it">
      <ol class="st-chain">
        ${e.map((u,r)=>{const p=r===l;return o`<li key=${u.id} class=${"st-chain__lv"+(p?" is-win":"")} aria-current=${p?"true":void 0}>
            <span class="st-chain__sc">${u.label}</span>
            <span class="st-chain__v">${u.value===void 0||u.value===null||u.value===""?o`<span class="st-dim">${u.id==="pin"&&u.present?"set":"not set"}</span>`:u.value==="inherits"?o`<span class="st-inherit">inherits</span>`:o`<span class="st-v">${String(u.value)}</span>`}</span>
            <span class="st-chain__src">${u.source?o`<${bt} path=${u.source} line=${u.line} w=${t}/>`:o`<span class="st-dim">${u.id==="effective"?l===2?"session model":"":"—"}</span>`}</span>
            ${p&&o`<span class="st-sr"> (wins)</span>`}
          </li>`})}
      </ol>
      <p class="st-hint st-insp__why">${c}</p>
    </${m}>
    <${m} title="Agent">
      <dl class="st-insp__dl">
        <dt>Effort</dt><dd>${n.effort||"—"}</dd>
        <dt>Context</dt><dd>${n.context_tier||"—"}</dd>
        <dt>Target</dt><dd>${n.target||"—"}</dd>
        <dt>Model policy</dt><dd>${n.model_policy||"—"}</dd>
      </dl>
    </${m}>
    <${m} title=${"Tools"+(n.tools.length?" · "+n.tools.length:"")}><${Fs} tools=${n.tools} all/></${m}>
    <${m} title="Files">
      <dl class="st-insp__dl st-insp__files">
        ${d.map(u=>o`<dt key=${u.label+"t"}>${u.label}</dt><dd key=${u.label+"d"}>
          ${u.path?o`<span class="st-mono" title=${u.path+(u.line?":"+u.line:"")}>${K(u.path)}${u.line?":"+u.line:""}</span>
            ${u.scope&&o` <span class="st-dim">· ${M(u.scope,a)}</span>`}
            <button type="button" class="st-link" onClick=${()=>t.openAt(u.path,u.line)}
              aria-label=${Xt(u.path,u.line)}>Open</button>`:o`<span class="st-dim">—</span>`}
        </dd>`)}
      </dl>
    </${m}>
    <${m} title="History"><${Hs} w=${t} path=${n.defined_in||s.source}/></${m}>
    <${m} title="Actions">
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled>Change model…</button>
        <span class="st-hint" data-testid="st-change-hint">${h}</span>
      </div>
    </${m}>
  </div>`}function jo({w:t,file:s}){const n=Yt(t,s.path),a=s.rows||[];return o`<div class="st-insp__body" data-testid="st-inspector-file">
    <h3 class="st-insp__title">${s.name}</h3>
    <div class="st-insp__key st-mono">${s.path}</div>
    <div class="st-insp__chips">
      <span class="st-chip">${s.is_dir?"Watched folder":st[z(s)]}</span>
      <${Z} scope=${s.scope}/>
      <span class="st-chip">${Ts[s.location]||"Other"}</span>
      ${s.tools.map(e=>o`<${U} key=${e} id=${e} label=${t.labelOf(e)}/>`)}
    </div>
    <${m} title=${"Settings from this file"+(a.length?" · "+a.length:"")}>
      ${a.length?o`<ul class="st-insp__list">
        ${a.map(e=>o`<li key=${e.uid}><button type="button" class="st-link"
          onClick=${()=>t.set({view:"tool",tool:e.tool,sec:"",row:e.key})}>${e.label}</button>
          <span class="st-dim"> · ${t.labelOf(e.tool)}${e.line>0?" · line "+e.line:""}</span></li>`)}
      </ul>`:o`<div class="st-hint">${s.settings?s.settings+" settings":"No settings are read from this file."}</div>`}
    </${m}>
    <${m} title="File">
      <dl class="st-insp__dl">
        <dt>Path</dt><dd class="st-insp__path">${s.path}</dd>
        <dt>Purpose</dt><dd>${s.is_dir?"Watched folder":st[z(s)]}${s.kind&&s.kind!==z(s)?" ("+s.kind+")":""}</dd>
        <dt>Scope</dt><dd>${s.scope||"—"}</dd>
        <dt>Git</dt><dd>${s.git_state||"—"}</dd>
        <dt>Size</dt><dd>${s.bytes!=null&&!s.is_dir?Gt(s.bytes):"—"}</dd>
        <dt>Last change</dt><dd>${s.mtime?pt(s.mtime):"—"}</dd>
        ${s.mtime?o`<dt>Modified</dt><dd>${new Date(s.mtime*1e3).toLocaleString()}</dd>`:null}
        ${s.loading&&o`<dt>Loading</dt><dd>${s.loading}</dd>`}
        ${s.exists===!1&&o`<dt>State</dt><dd>missing</dd>`}
      </dl>
    </${m}>
    <${m} title="Actions">
      <div class="st-actions">
        ${!s.is_dir&&o`<button type="button" class="st-btn" onClick=${()=>t.openAt(s.path)}>Open file</button>`}
        ${n.length>0&&o`<button type="button" class="st-btn" onClick=${()=>Qt(t,n[0])}>Show finding</button>`}
      </div>
    </${m}>
  </div>`}function No({w:t,v:s}){const n=Ne(s),a=Yt(t,s.source);return o`<div class="st-insp__body" data-testid="st-inspector-env">
    <h3 class="st-insp__title st-mono">${s.name||"Environment variable"}</h3>
    <div class="st-insp__key">Environment variable${s.name?"":" (this aictl version did not name it)"}</div>
    ${s.description&&o`<p class="st-insp__tip">${s.description}</p>`}
    <div class="st-insp__chips">
      <${U} id=${s.tool} label=${t.labelOf(s.tool)}/>
      <${Z} scope="env" label=${M("env",t.scopesOf(s.tool))}/>
      ${s.masked&&o`<span class="st-chip st-chip--muted">value hidden</span>`}
      ${!s.documented&&o`<${Ct}/>`}
    </div>
    <div class=${"st-insp__value"+(s.set?"":" is-unset")} data-testid="st-env-value">${s.set?s.masked?o`<span class="st-dim" title="The name says it holds a credential, so the value is not shown">hidden</span>`:o`<span class="st-v st-mono">${s.value===""?"(empty)":s.value}</span>`:o`<span class="st-dim">not set</span>`}</div>
    <${m} title="Where it is set">
      ${n.length?o`<ul class="st-insp__list" data-testid="st-env-where">
        ${n.map(e=>o`<li key=${e.id}>
          <b>${e.label}</b>${e.origin&&o` <span class="st-mono" title=${e.origin}>${V(e.origin)}</span>`}
          ${e.value!==s.value&&o` <span class="st-dim">= ${e.value}</span>`}
          ${e.file&&o` <button type="button" class="st-link" onClick=${()=>t.openAt(e.file)}
            aria-label=${"Open "+K(e.file)}>Open</button>`}
          <div class="st-hint">${e.note}</div>
        </li>`)}
      </ul>`:o`<div class="st-hint">Not set in aictl's environment, in a shell profile or in the registry.</div>`}
    </${m}>
    <${m} title=${"What it drives"+(s.drives.length?" · "+s.drives.length:"")}>
      ${s.drives.length?o`<ul class="st-insp__list" data-testid="st-env-drives">
        ${s.drives.map(e=>o`<li key=${e.key}><button type="button" class="st-link"
          onClick=${()=>t.set({view:"tool",tool:s.tool,sec:"",row:e.key})}>${e.label}</button>
          <span class="st-dim st-mono"> · ${e.key}</span></li>`)}
      </ul>`:o`<div class="st-hint">No setting shown here reads it; ${t.labelOf(s.tool)} reads it when it starts.</div>`}
    </${m}>
    <${m} title="Actions">
      <div class="st-actions">
        ${a.length>0&&o`<button type="button" class="st-btn" onClick=${()=>Qt(t,a[0])}>Show finding</button>`}
        <span class="st-hint">A change applies to sessions started after it, from a shell that has the new value.</span>
      </div>
    </${m}>
  </div>`}function Fo({w:t,f:s}){return o`<div class="st-insp__body" data-testid="st-inspector-finding">
    <h3 class="st-insp__title">${Ie(s.rule)}</h3>
    <div class="st-insp__key st-mono">${Bs(s.path,s.line)}</div>
    <div class="st-insp__chips">
      <span class=${"st-chip"+(s.severity==="high"||s.severity==="medium"?" st-chip--risky":"")}>${s.severity||"info"}</span>
      ${ut(s).map(n=>o`<${U} key=${n} id=${n} label=${t.labelOf(n)}/>`)}
      ${s.session_id&&o`<span class="st-chip st-chip--mono">session ${s.session_id}</span>`}
    </div>
    ${s.why&&o`<${m} title="Why it matters"><p class="st-insp__tip">${s.why}</p></${m}>`}
    ${s.action&&o`<${m} title="What to do"><p class="st-insp__tip">${s.action}</p></${m}>`}
    <${m} title="Actions">
      <div class="st-actions">
        ${s.path&&(tt(s.path)?o`<button type="button" class="st-btn" onClick=${()=>t.openEnv(W(s.path),ut(s)[0]||"")}>Show ${W(s.path)||"the variable"}</button>`:o`<button type="button" class="st-btn" onClick=${()=>t.openAt(s.path,s.line)}>${s.line>0?Xt(s.path,s.line):"Show the line"}</button>`)}
      </div>
    </${m}>
  </div>`}function Ro({w:t}){const{view:s}=t.st;let n=null;return(s==="tool"||s==="topic")&&t.selectedEnv?n=o`<${No} key=${t.selectedEnv.uid} w=${t} v=${t.selectedEnv}/>`:(s==="tool"||s==="topic")&&t.selected?n=Ms(t.selected)?o`<${Po} key=${t.selected.uid} w=${t} row=${t.selected}/>`:o`<${Lo} key=${t.selected.uid} w=${t} row=${t.selected}/>`:s==="files"&&t.selectedFile?n=o`<${jo} w=${t} file=${t.selectedFile}/>`:s==="findings"&&t.selectedFinding&&(n=o`<${Fo} w=${t} f=${t.selectedFinding}/>`),o`<aside class=${"st-insp"+(t.drawer?" is-open":"")} aria-label="Inspector">
    <button type="button" class="st-insp__close st-btn" onClick=${t.closeDrawer} aria-label="Close the inspector">Close</button>
    ${n||o`<div class="st-insp__body st-insp__body--empty">
      <h3 class="st-insp__title">Nothing selected</h3>
      <p class="st-hint">${s==="files"?"Click a file for its details.":s==="findings"?"Click a finding for its details.":"Click a setting to see where it is set, what wins and why, and what you can do with it."}</p>
    </div>`}
  </aside>`}const qo=[{value:"tool",label:"By tool"},{value:"topic",label:"By topic"},{value:"files",label:"Files"},{value:"findings",label:"Findings"}],Wt=new Set(["tool","topic"]);function rt(){return typeof window<"u"?window.location.search:""}function Io(t){const[s,n]=C(()=>Nt(rt())),a=I(e=>n(l=>{const c={...l,...e};if(e.view&&e.view!==l.view&&!(Wt.has(l.view)&&Wt.has(e.view)))for(const i of["tool","sec","row"])i in e||(c[i]="");if(e.view&&e.view!==l.view&&!("scope"in e)&&(c.scope=""),e.view&&e.view!==l.view)for(const i of Ye)i in e||(c[i]=i==="recent"?!1:"");return c}),[]);return Y(()=>{const e=Qe(s);us(rt())!=="local"&&delete e.scope,hs(e)},[s]),Y(()=>{const e=()=>n(Nt(rt()));return window.addEventListener("popstate",e),()=>{window.removeEventListener("popstate",e),us(rt())==="local"&&hs(tn)}},[]),Y(()=>{n(Nt(rt()))},[t]),[s,a]}function zo(t){const[s,n]=C({status:"loading",files:null});return Y(()=>{if(t)return;const a=new AbortController;return sn({signal:a.signal}).then(e=>{a.signal.aborted||n(Array.isArray(e==null?void 0:e.files)?{status:"ready",files:e.files}:{status:"unavailable",files:null})},()=>{a.signal.aborted||n({status:"unavailable",files:null})}),()=>a.abort()},[t]),t?{status:"unavailable",files:null}:s}function Do(t){const s=t||{},n=s.audit||null;return{status:s.loading?"loading":s.error?"error":n||s.loading===!1?"ready":"loading",audit:n,scan:s.scan||null,error:s.error?String(s.error):null}}function Wo({records:t=[]}){return o`<section class="st-wsnote" aria-label="Loaded configuration evidence">
    <h3>Configured on disk is not effective runtime configuration</h3>
    <${en} records=${t}/>
  </section>`}function Ho({source:t={},note:s=""}){var ls;const{toolConfigs:n,tools:a,monitor:e,root:l,enabledTools:c=null,recentFiles:i,toolName:d,openFile:h,findings:u,refresh:r,hooks:p,configuredOnly:g,runtimeConfiguration:v}=t,_=P(()=>De({toolConfigs:n,tools:a,monitor:e,root:l,enabledTools:c}),[n,a,e,l,c]),[f,A]=Io(t.readonly),[F,xt]=C(""),[R,Mt]=C(!1),[E,Ot]=C(!1),[At,y]=C(!1),T=xs(null),Tt=zo(t.readonly),B=Do(u),Gs=u==null?void 0:u.rescan;Y(()=>{const b=k=>{var x;k.key==="/"&&!We(k.target)&&!k.metaKey&&!k.ctrlKey&&!k.altKey?(k.preventDefault(),(x=T.current)==null||x.focus()):k.key==="Escape"&&y(!1)};return window.addEventListener("keydown",b),()=>window.removeEventListener("keydown",b)},[]);const S=P(()=>Ve(_),[_]),J=P(()=>Ue(_),[_]),ts=P(()=>Be(_),[_]),Et=P(()=>rs({q:F,nonDefault:R,risky:E,unset:f.unset}),[F,R,E,f.unset]),Ks=P(()=>rs({q:F,nonDefault:R,risky:E,unset:!0}),[F,R,E]),Zs=I(b=>Et(b)&&(!f.scope||b.scope===f.scope),[Et,f.scope]),Js=P(()=>He(S),[S]),et=P(()=>Ge(Tt.files,S,ts,c),[Tt.files,S,ts,c]),nt=P(()=>Ke(B.audit,c),[B.audit,c]),Lt=P(()=>Ze((nt==null?void 0:nt.findings)||[]),[nt]),Xs=I((b,k=0)=>{!b||!h||h(b,k>0?k:0)},[h]),ss=I(b=>{A(b),y(!0)},[A]),Ys=I(()=>y(!1),[]),Qs=I(b=>{const k=Je(b,_);return k===b&&d?d(b):k},[_,d]),te=I(b=>{var k;return((k=S.find(x=>x.id===b))==null?void 0:k.scopes)||[]},[S]),se=I(b=>{const k=et.find(x=>ht(x.path,b));if(k!=null&&k.mtime)return k.mtime;for(const x of(_==null?void 0:_.tools)||[])for(const O of x.files||[])if(ht(O.path,b)&&O.mtime)return O.mtime;return null},[et,_]);if(!_)return o`<p class="loading-state">Loading...</p>`;if(!S.length&&!J&&!ds(c)&&!t.readonly)return o`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;const Pt=S.some(b=>b.id===f.tool)||f.tool==="aictl"&&J?f.tool:((ls=S[0])==null?void 0:ls.id)||(J?"aictl":""),q=S.find(b=>b.id===Pt)||null,es=(b,k)=>{var x;return k&&((x=S.find(O=>O.id===b))==null?void 0:x.rows.find(O=>O.key===k))||null},ee=f.view==="tool"?q?es(q.id,f.row):null:f.view==="topic"?es(f.tool,f.row):null,ne=f.view==="files"&&f.row&&et.find(b=>b.path===f.row)||null,ns=(b,k)=>{if(!String(k).startsWith(ps))return null;const x=S.find(lt=>lt.id===b);if(!x)return null;const O=W(k);return x.envVars.find(lt=>lt.name===O)||{name:O,tool:x.id,uid:x.id+""+k,source:k,set:!1,value:"",masked:!1,in_process:!1,persisted:[],drives:[],label:O,description:"",section:"",documented:!1}},ae=f.view==="tool"?q?ns(q.id,f.row):null:f.view==="topic"?ns(f.tool,f.row):null,as=(b,k="")=>{var O;const x=S.some(lt=>lt.id===k)?k:(q==null?void 0:q.id)||((O=S[0])==null?void 0:O.id)||"";ss({view:Wt.has(f.view)?f.view:"tool",tool:x,row:ps+b})},oe=(b,k=0)=>tt(b)?as(W(b)):Xs(b,k),le=f.view==="findings"&&f.row&&Lt.find(b=>b.id===f.row)||null,L={st:f,set:A,select:ss,q:F,pass:Et,passAll:Ks,passTool:Zs,showUnset:f.unset,scopesOf:te,managedAbsent:Js,entries:S,aictl:J,toolId:Pt,files:et,filesStatus:Tt.status,findings:Lt,audit:nt,auditStatus:B.status,auditError:B.error,scan:B.scan,rescan:Gs,readonly:t.readonly,selected:ee,selectedFile:ne,selectedFinding:le,selectedEnv:ae,openAt:oe,openEnv:as,labelOf:Qs,mtimeOf:se,recentFiles:i,drawer:At,closeDrawer:Ys,refresh:r,hooks:p},{set:ie,agents:ce,knowsSet:jt,unset:re,risky:os}=Xe(S),de=ds(c)&&!S.some(b=>b.id!=="vscode");let at,ot;return f.view==="topic"?(at=o`<${lo} w=${L}/>`,ot=o`<${ro} w=${L}/>`):f.view==="files"?(at=o`<${ho} w=${L}/>`,ot=o`<${wo} w=${L}/>`):f.view==="findings"?(at=o`<${So} w=${L}/>`,ot=o`<${Mo} w=${L}/>`):(at=o`<${Xa} w=${L}/>`,ot=q?o`<${ao} w=${L} entry=${q}/>`:Pt==="aictl"&&J?o`<${oo} w=${L} aictl=${J}/>`:o`<section class="st-main"><p class="st-empty">No tool settings to show.</p></section>`),o`<div class="st-ws" data-view=${f.view}>
    <div class="st-head">
      <${aa} class="st-pivot" options=${qo} value=${f.view} ariaLabel="Settings view"
        onChange=${b=>A({view:b})}/>
      <label class="st-searchbox">
        <${$t} name="search" size="14"/>
        <input ref=${T} type="search" class="st-search" value=${F}
          placeholder="Find a setting, value, key or file…" aria-label="Find a setting, value, key or file"
          onInput=${b=>xt(b.currentTarget.value)}/>
        <kbd class="st-kbd" aria-hidden="true">/</kbd>
      </label>
      <button type="button" class=${"st-toggle"+(R?" is-on":"")} aria-pressed=${R?"true":"false"}
        onClick=${()=>Mt(!R)}>Only non-default</button>
      <button type="button" class=${"st-toggle st-toggle--risky"+(E?" is-on":"")} aria-pressed=${E?"true":"false"}
        onClick=${()=>Ot(!E)}>Only risky</button>
      ${(jt||t.keepUnsetControl)&&o`<button type="button" class=${"st-toggle"+(f.unset?" is-on":"")} disabled=${!jt} aria-pressed=${f.unset?"true":"false"}
        onClick=${()=>A({unset:!f.unset})}>Show unset knobs</button>`}
      <div class="st-kpis" data-testid="st-kpis">
        <span><b>${S.length}</b> tools</span>
        <span><b>${et.length}</b> files</span>
        <span><b>${ie}</b> settings</span>
        <span data-kpi="agents"><b>${ce}</b> agents</span>
        ${jt&&o`<span data-kpi="unset"><b>${re}</b> unset</span>`}
        <span class=${os?"st-red":""}><b>${os}</b> risky</span>
        <span><b>${B.status==="loading"&&!B.audit?"…":Lt.length}</b> findings</span>
      </div>
    </div>
    ${s&&o`<p class="st-wsnote" data-testid="st-wsnote">${s}</p>`}
    ${t.unavailable&&o`<p class="st-wsnote" role="status">${t.unavailable}</p>`}
    ${g?o`<${Wo} records=${v}/>`:null}
    ${de&&o`<div class="st-scope-empty"><${oa} enabledTools=${c} snap=${_} what="the settings"/></div>`}
    <div class="st-grid">
      <div class="st-col st-col--nav">${at}</div>
      <div class="st-col st-col--main">${ot}</div>
      <${Ro} w=${L}/>
    </div>
  </div>`}export{Do as auditState,Ho as default};

import{d as S,A as w,q as L,y as T,L as _,h as g,a as I,w as N,i as U,m}from"./index-0APVtqay.js";import{I as b}from"./Icon-1my9WQDm.js";import{ac as x,ad as D}from"./useSse-Dcx1BuKe.js";const p="aictl-pref-active_tab",h=_.tabs,c=h.map(e=>e.id);var k;const y=((k=h[0])==null?void 0:k.id)||"overview";function $(){const e=g(I().tab,c);if(e)return e;try{const n=localStorage.getItem(p);return g(n!=null?JSON.parse(n):null,c)||y}catch{return y}}function K(e){if(!e)return!1;const n=e.tagName;return n==="INPUT"||n==="TEXTAREA"||n==="SELECT"||e.isContentEditable}function P(){const[e,n]=S($),r=w(e);r.current=e;const l=L(t=>{n(t),N(U(t,y),{push:!0});try{localStorage.setItem(p,JSON.stringify(t))}catch{}t===y&&window.dispatchEvent(new Event("aictl:route"))},[]);return T(()=>{const t=()=>n($());return window.addEventListener("popstate",t),()=>window.removeEventListener("popstate",t)},[]),T(()=>{const t=o=>{if(K(o.target)||o.metaKey||o.ctrlKey||o.altKey)return;if(o.key==="["||o.key==="]"){const i=o.key==="]"?1:-1,d=c.indexOf(r.current);l(c[(d+i+c.length)%c.length]);return}const u=h.find(i=>i.key&&i.key===o.key);u&&l(u.id)};return document.addEventListener("keydown",t),()=>document.removeEventListener("keydown",t)},[l]),{activeTab:e,setActiveTab:l,tabs:h}}function j({options:e=[],value:n,onChange:r,ariaLabel:l,class:t,className:o,...u}){const i=["aictl-ui-segmented",t,o].filter(Boolean).join(" "),d=w([]),A=a=>{var v;if(!e.length)return;const f=Math.max(0,e.findIndex(E=>E.value===n));let s=null;a.key==="ArrowRight"||a.key==="ArrowDown"?s=(f+1)%e.length:a.key==="ArrowLeft"||a.key==="ArrowUp"?s=(f-1+e.length)%e.length:a.key==="Home"?s=0:a.key==="End"&&(s=e.length-1),s!=null&&(a.preventDefault(),r&&r(e[s].value),(v=d.current[s])==null||v.focus())};return m`<div
    class=${i}
    role="radiogroup"
    aria-label=${l||null}
    ...${u}
  >${e.map((a,f)=>{const s=a.value===n;return m`<button
      key=${a.value}
      ref=${v=>{d.current[f]=v}}
      type="button"
      class="aictl-ui-segmented__btn"
      role="radio"
      aria-checked=${s?"true":"false"}
      tabindex=${s?"0":"-1"}
      onClick=${()=>r&&r(a.value)}
      onKeyDown=${A}
    >${a.icon?m`<${b} name=${a.icon} size="0.9em"/>`:null}${a.label}</button>`})}</div>`}function z({enabledTools:e,snap:n,what:r="this screen"}){const l=x(e),t=D(e,n);return m`<div class="panel-state panel-state--empty" role="status" data-testid="tool-scope-empty">
    <${b} name="filter" size="14"/>
    <div>
      <div class="panel-state__title">${l?"No tools are selected":"The selected tools have no data here"}</div>
      <div class="panel-state__hint">${l?`The tool filter in the header has no tool ticked, so ${r} shows nothing. Tick a tool, or choose All tools.`:`${t.join(", ")} ${t.length===1?"has":"have"} nothing to show on ${r}. Tick more tools in the header filter, or choose All tools.`}</div>
    </div>
  </div>`}export{j as S,z as T,K as i,P as u};

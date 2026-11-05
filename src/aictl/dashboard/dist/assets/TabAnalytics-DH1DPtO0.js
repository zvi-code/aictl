import{m as r,A as W,y as P,T as A,d as _,q as lt,k as C,x as it}from"./index-BV-8y5V6.js";import{I as rt,b as et,S as ot,a as K,P as M,F as R}from"./app-C9JBBtAo.js";import{au as ct,av as dt,aw as ut,ax as pt,v as vt,r as L,ay as st,H as mt,as as ht,aq as ft,az as yt,at as $t,L as Q,B as gt,aA as H,q as j}from"./useSse-ssp_fAkB.js";import{i as bt,u as xt,a as _t,b as St,c as wt,d as Tt,e as kt,f as At,g as zt,h as Mt,j as Lt,k as Rt,l as Ot,m as Ct,n as qt,o as Et}from"./echarts-BbyLWlSf.js";function Nt({enabledTools:t,what:e}){return t==null?null:r`<div class="panel-state panel-state--note" role="note">
    <${rt} name="filter" size="12"/>
    <span>${e} cover all tools: the tool filter does not apply, because these figures have no per-tool split.</span>
  </div>`}xt([_t,St,wt,Tt,kt,At,zt,Mt,Lt,Rt,Ot,Ct,qt,Et]);function S(t,e){if(typeof document>"u")return e;const a=getComputedStyle(document.documentElement).getPropertyValue(t);return a&&a.trim()||e}function U(){return[S("--accent","#60a5fa"),S("--green","#34d399"),S("--orange","#f97316"),S("--yellow","#fbbf24"),S("--red","#ef4444"),S("--model-switch","#a78bfa"),"#06b6d4","#f472b6","#84cc16","#c084fc"]}function Ft(){const t=S("--bg","#0b0e14"),e=S("--fg","#e6e6e6"),a=S("--fg2","#9aa0a6"),i=S("--border","#2a2f3a");return{bg:t,fg:e,fg2:a,border:i}}function Y(t){const e=Ft();return{color:U(),backgroundColor:"transparent",textStyle:{color:e.fg,fontFamily:"inherit",fontSize:11},...t,tooltip:{backgroundColor:e.bg,borderColor:e.border,textStyle:{color:e.fg,fontSize:11},...(t==null?void 0:t.tooltip)||{}},xAxis:Z(t==null?void 0:t.xAxis,e),yAxis:Z(t==null?void 0:t.yAxis,e)}}function Z(t,e){if(!t)return t;const a=i=>i&&{axisLine:{lineStyle:{color:e.border},...i.axisLine||{}},axisTick:{lineStyle:{color:e.border},...i.axisTick||{}},axisLabel:{color:e.fg2,...i.axisLabel||{}},splitLine:{lineStyle:{color:e.border,opacity:.35},...i.splitLine||{}},...i};return Array.isArray(t)?t.map(a):a(t)}function at(t){const{option:e,style:a,className:i,onReady:n,onEvent:s,notMerge:d}=t,c=t["aria-label"],l=W(null),m=W(null),y=W({});return P(()=>{const v=l.current;if(!v)return;const h=bt(v,null,{renderer:"canvas"});m.current=h;const u=()=>{try{h.resize()}catch{}},f=typeof ResizeObserver<"u"?new ResizeObserver(u):null;f&&f.observe(v);const $=typeof MutationObserver<"u"?new MutationObserver(()=>{const p=m.current;if(p)try{p.setOption(Y(e||{}),{notMerge:!0})}catch{}}):null;if($&&typeof document<"u"&&$.observe(document.documentElement,{attributes:!0,attributeFilter:["data-theme","class"]}),n)try{n(h)}catch{}return()=>{f&&f.disconnect(),$&&$.disconnect();try{h.dispose()}catch{}m.current=null}},[]),P(()=>{const v=m.current;if(!(!v||!e))try{v.setOption(Y(e),{notMerge:!!d})}catch{}},[e,d]),P(()=>{const v=m.current;if(v){for(const[h,u]of Object.entries(y.current))try{v.off(h,u)}catch{}if(y.current={},s)for(const[h,u]of Object.entries(s))typeof u=="function"&&(v.on(h,u),y.current[h]=u)}},[s]),r`<div
    ref=${l}
    class=${i||"echart-container"}
    style=${a||"width:100%;height:260px"}
    role="img"
    aria-label=${c||"chart"}
  ></div>`}function Pt(t,e){const a=[];for(let i=0;i<t.length;i++){const n=e[i];n!=null&&a.push([t[i],n])}return a}function It({data:t,labels:e,height:a,logX:i,fmtX:n,fmtY:s,xLabel:d,yLabel:c,visualMap:l}){const m=a||220,y=A(()=>{const v=U();if(!t||t.length<2||!t[0]||t[0].length===0)return{series:[]};const[h,...u]=t,f=u.map(($,p)=>({name:(e==null?void 0:e[p])||`Series ${p+1}`,type:"scatter",data:Pt(h,$),symbolSize:6,itemStyle:{color:v[p%v.length],opacity:.7},emphasis:{focus:"series"}}));return{grid:{left:48,right:16,top:24,bottom:40},legend:{top:0,type:"scroll",textStyle:{fontSize:10}},tooltip:{trigger:"item",formatter:$=>{const[p,g]=$.value,o=n?n(p):String(p),b=s?s(g):String(g);return`<b>${$.seriesName}</b><br/>${d||"x"}: ${o}<br/>${c||"y"}: ${b}`}},xAxis:{type:i?"log":"value",name:d,nameLocation:"middle",nameGap:24,axisLabel:{fontSize:10,formatter:n},splitLine:{show:!0}},yAxis:{type:"value",name:c,nameLocation:"middle",nameGap:36,axisLabel:{fontSize:10,formatter:s},splitLine:{show:!0}},dataZoom:[{type:"inside",xAxisIndex:0,yAxisIndex:0,filterMode:"none",zoomOnMouseWheel:!0}],visualMap:l?[{type:"continuous",dimension:1,min:0,max:Math.max(1,...u.flat().filter($=>$!=null)),inRange:{colorAlpha:[.3,1]},show:!1}]:void 0,series:f}},[t,e,i,n,s,d,c,l]);return r`<${at}
    option=${y}
    style=${"width:100%;height:"+m+"px"}
    aria-label="scatter chart"
  />`}function Dt(t,e,a){const i=[];for(let n=0;n<t.length;n++){const s=e[n];s!=null&&i.push([a?t[n]*1e3:t[n],s])}return i}function B(t){const{mode:e,data:a,labels:i,colors:n,height:s,isTime:d,fmtX:c,fmtY:l,xLabel:m,yLabel:y,logX:v}=t,h=s||200,u=A(()=>{const f=U();if(!a||a.length<2||!a[0]||a[0].length===0)return{series:[]};const[$,...p]=a,g=p.map((o,b)=>{const x=ct(n==null?void 0:n[b],f[b%f.length]);return{name:(i==null?void 0:i[b])||`Series ${b+1}`,type:"line",smooth:!1,showSymbol:!1,data:Dt($,o,!!d),lineStyle:{width:1.5,color:x},areaStyle:{opacity:.08,color:x},connectNulls:!1}});return{grid:{left:48,right:12,top:16,bottom:32},legend:{top:0,type:"scroll",textStyle:{fontSize:10},show:((i==null?void 0:i.length)||0)>1},tooltip:{trigger:"axis",formatter:o=>{var E,O;const b=Array.isArray(o)?o:[o],x=(O=(E=b[0])==null?void 0:E.value)==null?void 0:O[0],I=d?new Date(x).toLocaleTimeString([],{hour12:!1}):c?c(x):String(x),D=b.map(z=>{var F;const w=(F=z.value)==null?void 0:F[1],N=w==null?"—":l?l(w):String(w);return`<span style="color:${z.color}">●</span> ${z.seriesName}: <b>${N}</b>`}).join("<br/>");return`${I}<br/>${D}`}},xAxis:{type:d?"time":v?"log":"value",axisLabel:{fontSize:10,hideOverlap:!0,formatter:d?void 0:c}},yAxis:{type:"value",axisLabel:{fontSize:10,formatter:l}},dataZoom:[{type:"inside",xAxisIndex:0}],series:g}},[a,i,n,d,v,c,l]);return e==="scatter"?r`<${It}
      data=${a}
      labels=${i}
      height=${s}
      logX=${v}
      fmtX=${c}
      fmtY=${l}
      xLabel=${m}
      yLabel=${y}
    />`:r`<${at}
    option=${u}
    style=${"width:100%;height:"+h+"px"}
    aria-label="analytics chart"
  />`}function jt(t){const e={};for(const a of t){const i=typeof a=="string"?a:a.metric;if(!i)continue;const n=i.split("."),s=n.length>1?n.slice(0,-1).join("."):"(ungrouped)";(e[s]=e[s]||[]).push({name:i,count:a.count||0,lastValue:a.last_value})}return Object.entries(e).sort((a,i)=>a[0].localeCompare(i[0]))}function Wt(){const[t,e]=_([]),[a,i]=_(null),[n,s]=_(null),[d,c]=_([]),[l,m]=_(!1),[y,v]=_(null);P(()=>{dt().then(p=>{e(p||[]),v(null)}).catch(p=>{e([]),v(p.message)})},[]);const h=A(()=>jt(t),[t]),u=lt(p=>{i(p),s(null),c([]),m(!0);const g=Math.floor(Date.now()/1e3)-1800,o=ut(p,g).then(x=>s(x)).catch(()=>s(null)),b=pt(p,g).then(x=>c(Array.isArray(x)?x:[])).catch(()=>c([]));Promise.allSettled([o,b]).then(()=>m(!1))},[]),f=A(()=>!n||!n.value||!n.value.length?null:n.value[n.value.length-1],[n]),$=A(()=>{const p=new Set;for(const g of d)g.tags&&Object.keys(g.tags).forEach(o=>p.add(o));return[...p].sort()},[d]);return r`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Metrics</div>
      ${y&&r`<p class="error-state" style="padding:0 var(--sp-4)">Error: ${vt(y)}</p>`}
      ${!y&&!t.length&&r`<p class="empty-state" style="padding:0 var(--sp-4)">No metrics available.</p>`}
      ${h.map(([p,g])=>r`<div key=${p}>
        <div class="text-muted" style="font-size:var(--fs-xs);padding:0.35rem var(--sp-5) 0.1rem;text-transform:uppercase;letter-spacing:0.03em">${p}</div>
        ${g.map(o=>r`<button key=${o.name}
          class=${a===o.name?"es-tool-btn active":"es-tool-btn"}
          onClick=${()=>u(o.name)}>
          ${o.name.split(".").pop()}
          ${o.count?r`<span class="badge" style="margin-left:auto;font-size:var(--fs-2xs)">${L(o.count)}</span>`:""}
        </button>`)}
      </div>`)}
    </div>
    <div>
      ${!a&&r`<div class="diag-card text-center" style="padding:2rem">
        <p class="text-muted">Select a metric from the sidebar to view its time series.</p>
      </div>`}

      ${a&&r`<${C}>
        <h3 class="mb-sm">${a}</h3>

        ${l&&r`<p class="loading-state">Loading...</p>`}

        ${!l&&n&&n.ts&&n.ts.length>=2?r`<div class="es-section">
          <div class="es-section-title">Time Series (last 30m)</div>
          <${et}
            label=${a.split(".").pop()}
            value=${f!=null?L(f):"-"}
            data=${[n.ts,n.value]}
            chartColor="var(--accent)"
            smooth />
        </div>`:""}

        ${!l&&n&&n.ts&&n.ts.length<2&&r`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <p class="empty-state">Not enough data points to chart.</p>
        </div>`}

        ${!l&&!n&&!l&&r`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <p class="empty-state">No series data available.</p>
        </div>`}

        ${!l&&d.length>0&&r`<div class="es-section" style="margin-top:var(--sp-6)">
          <div class="es-section-title">Recent Samples (${d.length})</div>
          <div style="overflow-x:auto">
            <table style="width:100%;font-size:var(--fs-base);border-collapse:collapse">
              <thead>
                <tr class="text-muted" style="text-align:left;border-bottom:1px solid var(--border)">
                  <th style="padding:var(--sp-2) var(--sp-4)">Time</th>
                  <th style="padding:var(--sp-2) var(--sp-4)">Value</th>
                  ${$.map(p=>r`<th key=${p} style="padding:var(--sp-2) var(--sp-4)">${p}</th>`)}
                </tr>
              </thead>
              <tbody>
                ${d.slice(-50).reverse().map((p,g)=>r`<tr key=${g}
                  style="border-bottom:1px solid var(--border);${g%2?"background:var(--bg2)":""}">
                  <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${st(p.ts)}</td>
                  <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${L(p.value)}</td>
                  ${$.map(o=>r`<td key=${o} style="padding:var(--sp-2) var(--sp-4)">
                    ${p.tags&&p.tags[o]!=null?r`<span class="badge">${p.tags[o]}</span>`:"-"}
                  </td>`)}
                </tr>`)}
              </tbody>
            </table>
          </div>
        </div>`}

        ${!l&&d.length===0&&n&&r`<div class="es-section" style="margin-top:var(--sp-6)">
          <div class="es-section-title">Recent Samples</div>
          <p class="empty-state">No raw samples in the last 30 minutes.</p>
        </div>`}
      </${C}>`}
    </div>
  </div>`}const q=["var(--green)","var(--orange)","var(--accent)","var(--red)","var(--yellow)","#8b5cf6","#06b6d4","#f472b6"];function k(t){return t>=1e3?L(t/1e3)+"s":Math.round(t)+"ms"}function Ht(t){return"#"+Math.round(t)}function Bt({data:t}){if(!t||!t.requests||!t.requests.length)return r`<div class="analytics-section">
      <div class="analytics-section-title">Response Time Analysis</div>
      <${R} count=${t==null?void 0:t.unattributed_hidden}/>
      <${M} status="empty" emptyTitle="No request data in this time range"
        emptyHint="Widen the time range. Response times need OTel telemetry from the tool."
        emptyFix="aictl otel enable"/>
    </div>`;const e=t.requests,a=A(()=>{const l=e.map(y=>y.ts),m=e.map(y=>y.duration_ms);return[l,m]},[e]),i=A(()=>{const l=[...new Set(e.map(u=>u.model||"(unknown)"))],m=l.map(()=>[]),v=[...e.filter(u=>u.input_tokens>0)].sort((u,f)=>u.input_tokens-f.input_tokens),h=v.map(u=>u.input_tokens);for(const u of l)m[l.indexOf(u)]=v.map(f=>(f.model||"(unknown)")===u?f.duration_ms:null);return{data:[h,...m],labels:l,colors:q.slice(0,l.length)}},[e]),n=t.by_model||[],s=Math.max(1,...n.map(l=>l.p95_ms)),d=A(()=>{const l=[...new Set(e.map(u=>u.model||"(unknown)"))],y=[...e.filter(u=>u.seq>0)].sort((u,f)=>u.seq-f.seq),v=y.map(u=>u.seq),h=l.map(u=>y.map(f=>(f.model||"(unknown)")===u?f.duration_ms:null));return{data:[v,...h],labels:l,colors:q.slice(0,l.length)}},[e]),c=e.length?e[e.length-1].duration_ms:0;return r`<div class="analytics-section">
    <div class="analytics-section-title">Response Time Analysis</div>
    <${R} count=${t.unattributed_hidden}/>
    <div class="analytics-charts">
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time Over Time</span>
          <span class="chart-val" style="color:var(--accent)">${k(c)}</span></div>
        <${B} mode="line" data=${a} isTime=${!0} fmtY=${k} height=${200}/>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time vs Input Size</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">${e.length} requests</span></div>
        <${B} mode="scatter" data=${i.data} labels=${i.labels}
          colors=${i.colors} fmtX=${L} fmtY=${k} logX=${!0} height=${200}/>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time by Model</span></div>
        <div class="hbar-list">
          ${n.map((l,m)=>r`<div key=${l.model} class="hbar-row">
            <span class="hbar-label" title=${l.model}>${l.model.replace(/^claude-/,"")||l.model}</span>
            <div class="hbar-track">
              <div class="hbar-fill" style=${"width:"+Math.round(l.avg_ms/s*100)+"%;background:"+q[m%q.length]}></div>
              <div class="hbar-p95" style=${"left:"+Math.round(l.p95_ms/s*100)+"%"} title=${"p95: "+k(l.p95_ms)}></div>
            </div>
            <span class="hbar-value">${k(l.avg_ms)}</span>
            <span class="badge">${l.count}</span>
          </div>`)}
        </div>
        ${n.length>0&&r`<div class="text-muted" style="font-size:var(--fs-2xs);margin-top:var(--sp-2);padding-left:130px">
          Bar = avg, dashed line = p95</div>`}
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Session Lifecycle (seq vs latency)</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">degradation?</span></div>
        <${B} mode="scatter" data=${d.data} labels=${d.labels}
          colors=${d.colors} fmtX=${Ht} fmtY=${k} logX=${!0} height=${200}/>
      </div>
    </div>
  </div>`}const Ut={"claude-code":"#8b5cf6",codex:"#f97316",aider:"#06b6d4",cursor:"#f472b6"};function nt(t,e){return Ut[t]||q[e%q.length]}function J({by_cli:t,total:e,barWidth:a,cliTools:i}){return!t||!t.length?r`<div class="hbar-fill" style=${"width:"+a+"%;background:var(--accent)"}></div>`:t.map((n,s)=>{const d=n.count/e*a,c=nt(n.cli_tool,i.indexOf(n.cli_tool));return r`<div key=${n.cli_tool}
      style=${"width:"+d.toFixed(1)+"%;background:"+c+";height:100%;display:inline-block"}
      title=${n.cli_tool+": "+n.count}></div>`})}function Vt({data:t}){if(!t||!t.invocations||!t.invocations.length)return r`<div class="analytics-section">
      <div class="analytics-section-title">Tool Usage</div>
      <${R} count=${t==null?void 0:t.unattributed_hidden}/>
      ${t!=null&&t.total_all_time?r`<${M} status="empty" emptyTitle="No tool invocation data in this time range"
            emptyHint=${"Try a wider range ("+t.total_all_time+" invocations exist)."}/>`:r`<${M} status="empty" emptyTitle="No tool invocation data yet"
            emptyHint="Tool usage comes from hooks. Install them, then run a session." emptyFix="aictl enable"/>`}
    </div>`;const e=t.invocations,a=t.cli_tools||[],i=Math.max(1,...e.map(s=>s.count)),n=Math.max(1,...e.map(s=>s.p95_ms));return r`<div class="analytics-section">
    <div class="analytics-section-title">Tool Usage</div>
    <${R} count=${t.unattributed_hidden}/>
    ${a.length>1&&r`<div style="display:flex;gap:var(--sp-4);margin-bottom:var(--sp-3);flex-wrap:wrap">
      ${a.map((s,d)=>r`<span key=${s} style="display:flex;align-items:center;gap:var(--sp-2);font-size:var(--fs-sm)">
        <span style=${"width:10px;height:10px;border-radius:2px;background:"+nt(s,d)}></span>
        ${s}
      </span>`)}
    </div>`}
    <div class="analytics-charts">
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Invocation Frequency</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">${e.reduce((s,d)=>s+d.count,0)} total</span></div>
        <div class="hbar-list">
          ${e.slice(0,15).map(s=>r`<div key=${s.tool_name} class="hbar-row">
            <span class="hbar-label" title=${s.tool_name}>${s.tool_name}</span>
            <div class="hbar-track" style="overflow:hidden">
              <${J} by_cli=${s.by_cli} total=${s.count}
                barWidth=${Math.round(s.count/i*100)} cliTools=${a}/>
            </div>
            <span class="hbar-value">${L(s.count)}</span>
            ${s.error_count?r`<span class="badge" style="color:var(--red)">${s.error_count} err</span>`:""}
          </div>`)}
        </div>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Execution Duration</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">avg + p95</span></div>
        <div class="hbar-list">
          ${e.slice(0,15).map((s,d)=>r`<div key=${s.tool_name} class="hbar-row">
            <span class="hbar-label" title=${s.tool_name}>${s.tool_name}</span>
            <div class="hbar-track">
              <${J} by_cli=${s.by_cli} total=${s.count}
                barWidth=${Math.round(s.avg_ms/n*100)} cliTools=${a}/>
              <div class="hbar-p95" style=${"left:"+Math.round(s.p95_ms/n*100)+"%"} title=${"p95: "+k(s.p95_ms)}></div>
            </div>
            <span class="hbar-value">${k(s.avg_ms)}</span>
          </div>`)}
        </div>
      </div>
    </div>
  </div>`}function Gt({data:t}){const[e,a]=_(!1);if(!t)return null;const i=t.memory_timeline||{},n=t.memory_events||[],s=Object.keys(i);if(!s.length&&!n.length)return r`<div class="analytics-section">
      <div class="analytics-section-title">File Write Activity</div>
      <${R} count=${t.unattributed_hidden}/>
      <${M} status="empty" emptyTitle="No file write data in this time range"
        emptyHint="Widen the time range. Writes are recorded while the dashboard or the collector is running."/>
    </div>`;const d=e?s:s.slice(0,6);return r`<div class="analytics-section">
    <div class="analytics-section-title">File Write Activity</div>
    <${R} count=${t.unattributed_hidden}/>

    ${s.length>0&&r`<div style="margin-bottom:var(--sp-6)">
      <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        Cumulative Bytes Written (${s.length} files)</div>
      <div class="analytics-charts">
        ${d.map(c=>{const l=i[c];if(!l||l.ts.length<2)return r`<div key=${c} class="diag-card">
            <div class="chart-hdr"><span class="chart-label" title=${c}>${H(c)}</span>
              <span class="chart-val text-muted">${l&&l.size_bytes.length?j(l.size_bytes[l.size_bytes.length-1]):"-"}</span></div>
            <div class="empty-state" style="font-size:var(--fs-sm)">Single snapshot</div>
          </div>`;const m=l.size_bytes[l.size_bytes.length-1];return r`<div key=${c} class="diag-card">
            <${et} label=${H(c)} value=${j(m)}
              data=${[l.ts,l.size_bytes]} chartColor="var(--accent)"/>
          </div>`})}
      </div>
      ${s.length>6&&!e&&r`<button class="range-btn" style="margin-top:var(--sp-2)"
        onClick=${()=>a(!0)}>Show all ${s.length} files</button>`}
    </div>`}

    ${n.length>0&&r`<div>
      <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        Recent File Writes (${n.length})</div>
      <div style="overflow-x:auto">
        <table style="width:100%;font-size:var(--fs-base);border-collapse:collapse">
          <thead>
            <tr class="text-muted" style="text-align:left;border-bottom:1px solid var(--border)">
              <th style="padding:var(--sp-2) var(--sp-4)">Time</th>
              <th style="padding:var(--sp-2) var(--sp-4)">File</th>
              <th style="padding:var(--sp-2) var(--sp-4)">Bytes</th>
              <th style="padding:var(--sp-2) var(--sp-4)">Growth</th>
              <th style="padding:var(--sp-2) var(--sp-4)">Tokens</th>
            </tr>
          </thead>
          <tbody>
            ${n.slice(0,30).map((c,l)=>r`<tr key=${l}
              style="border-bottom:1px solid var(--border);${l%2?"background:var(--bg2)":""}">
              <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${st(c.ts)}</td>
              <td style="padding:var(--sp-2) var(--sp-4)" title=${c.path}>${H(c.path)}</td>
              <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${j(c.size_bytes)}</td>
              <td class="mono" style="padding:var(--sp-2) var(--sp-4);color:${c.delta>0?"var(--green)":c.delta<0?"var(--red)":"var(--fg2)"}">
                ${c.delta>0?"+":""}${j(Math.abs(c.delta))}${c.delta<0?" ↓":c.delta>0?" ↑":""}
              </td>
              <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${L(c.tokens)}</td>
            </tr>`)}
          </tbody>
        </table>
      </div>
    </div>`}
  </div>`}function Xt({health:t}){if(!t||t.ok!==!1)return null;const e=t.last_error||`background refresh failing (${t.consecutive_errors||0}x)`,a=t.last_success_ts?` (updated ${gt(t.last_success_ts)})`:" (no successful update yet)";return r`<div class="analytics-health-warning" role="alert"
    style="padding:var(--sp-2) var(--sp-4);margin-bottom:var(--sp-4);
      background:color-mix(in srgb, var(--orange) 12%, var(--bg2));
      border:1px solid var(--orange);border-radius:4px;
      color:var(--orange);font-size:var(--fs-sm);font-weight:600">
    Analytics data may be stale: ${e}${a}
  </div>`}const Kt=800,Qt=15e3;function tt(t){var e,a,i,n,s,d,c;return!((a=(e=t.response_time)==null?void 0:e.requests)!=null&&a.length)&&!((n=(i=t.tools)==null?void 0:i.invocations)!=null&&n.length)&&!Object.keys(((s=t.files)==null?void 0:s.memory_timeline)||{}).length&&!((c=(d=t.files)==null?void 0:d.memory_events)!=null&&c.length)}function ee(){var I,D,E;const t=it(ot),e=t==null?void 0:t.globalRange,a=(t==null?void 0:t.enabledTools)??null,i=mt(a),n=ht(a),s=(e==null?void 0:e.since)||Date.now()/1e3-86400,d=(e==null?void 0:e.until)||"",c=`${s}|${d}|${ft(a)}`,[l,m]=_(null),[y,v]=_(!0),[h,u]=_(null),[f,$]=_(null),[p,g]=_(0),o=l&&l.key===c?l.data:null;P(()=>{if(i){v(!1),u(null);return}v(!0),u(null);const O=`/api/analytics?since=${s}${d?"&until="+d:""}${n?"&"+n:""}`,z=new AbortController;let w=!1,N=null;const F=()=>{w=!0,clearTimeout(G),clearTimeout(N),v(!1)},V=T=>{w||(u(T.name==="AbortError"?"The request timed out after 15 s.":T.message),F())},G=setTimeout(()=>{z.abort(),V({name:"AbortError"})},Qt),X=()=>yt(O,{signal:z.signal}).then(T=>{if(!w){if(T!=null&&T.pending){N=setTimeout(X,Kt);return}if(!$t(T,a))throw new Error("The server answered for a different tool selection. Restart the aictl server so it applies the tool filter.");m({key:c,data:T}),$(Date.now()),F()}}).catch(V);return X(),()=>{w=!0,clearTimeout(G),clearTimeout(N),z.abort()}},[c,i,p]);const b=()=>g(O=>O+1);if(i)return r`<div class="analytics-grid"><${K} enabledTools=${a} snap=${t==null?void 0:t.snap} what="analytics"/></div>`;const x=o?(((I=o.response_time)==null?void 0:I.unattributed_hidden)||0)+(((D=o.tools)==null?void 0:D.unattributed_hidden)||0)+(((E=o.files)==null?void 0:E.unattributed_hidden)||0):0;return r`<div class="analytics-grid">
    ${y&&!o&&r`<${M} status="loading" label="analytics" skeletonHeight="240px"/>`}
    ${h&&!o&&r`<${M} status="error" error=${h} label="analytics" onRetry=${b}/>`}
    ${h&&o&&r`<${M} status="stale" error=${h} updatedAt=${f} onRetry=${b}/>`}
    ${o&&Q(a)&&tt(o)&&r`<${C}>
      <${K} enabledTools=${a} snap=${t==null?void 0:t.snap} what="analytics"/>
      <${R} count=${x}/>
    </${C}>`}
    ${o&&!(Q(a)&&tt(o))&&r`<${C}>
      <${Xt} health=${o==null?void 0:o._health}/>
      <${Bt} data=${o==null?void 0:o.response_time}/>
      <${Vt} data=${o==null?void 0:o.tools}/>
      <${Gt} data=${o==null?void 0:o.files}/>
      <details class="analytics-section">
        <summary class="analytics-section-title" style="cursor:pointer;user-select:none">
          Raw Metrics Explorer</summary>
        <${Nt} enabledTools=${a} what="Raw metrics"/>
        <div style="margin-top:var(--sp-4)"><${Wt}/></div>
      </details>
    </${C}>`}
  </div>`}export{ee as default};

import{A as q,y as M,m as r,T as k,Y as K,d as b,Z as J,q as Q,_ as tt,$ as et,e as st,b as T,F as C,z as H,a0 as V,x as at,S as nt,a1 as lt,a2 as it,P as A,h as rt,a3 as E,a as L}from"./index-D-7_bwBz.js";import{i as ot,u as ct,a as dt,b as pt,c as ut,d as vt,e as mt,f as ht,g as yt,h as ft,j as $t,k as gt,l as bt,m as xt,n as St,o as wt}from"./echarts-BbyLWlSf.js";ct([dt,pt,ut,vt,mt,ht,yt,ft,$t,gt,bt,xt,St,wt]);function w(t,e){if(typeof document>"u")return e;const s=getComputedStyle(document.documentElement).getPropertyValue(t);return s&&s.trim()||e}function F(){return[w("--accent","#60a5fa"),w("--green","#34d399"),w("--orange","#f97316"),w("--yellow","#fbbf24"),w("--red","#ef4444"),w("--model-switch","#a78bfa"),"#06b6d4","#f472b6","#84cc16","#c084fc"]}function _t(){const t=w("--bg","#0b0e14"),e=w("--fg","#e6e6e6"),s=w("--fg2","#9aa0a6"),i=w("--border","#2a2f3a");return{bg:t,fg:e,fg2:s,border:i}}function j(t){const e=_t();return{color:F(),backgroundColor:"transparent",textStyle:{color:e.fg,fontFamily:"inherit",fontSize:11},...t,tooltip:{backgroundColor:e.bg,borderColor:e.border,textStyle:{color:e.fg,fontSize:11},...(t==null?void 0:t.tooltip)||{}},xAxis:I(t==null?void 0:t.xAxis,e),yAxis:I(t==null?void 0:t.yAxis,e)}}function I(t,e){if(!t)return t;const s=i=>i&&{axisLine:{lineStyle:{color:e.border},...i.axisLine||{}},axisTick:{lineStyle:{color:e.border},...i.axisTick||{}},axisLabel:{color:e.fg2,...i.axisLabel||{}},splitLine:{lineStyle:{color:e.border,opacity:.35},...i.splitLine||{}},...i};return Array.isArray(t)?t.map(s):s(t)}function U(t){const{option:e,style:s,className:i,onReady:n,onEvent:a,notMerge:p}=t,o=t["aria-label"],l=q(null),h=q(null),f=q({});return M(()=>{const u=l.current;if(!u)return;const y=ot(u,null,{renderer:"canvas"});h.current=y;const c=()=>{try{y.resize()}catch{}},m=typeof ResizeObserver<"u"?new ResizeObserver(c):null;m&&m.observe(u);const $=typeof MutationObserver<"u"?new MutationObserver(()=>{const d=h.current;if(d)try{d.setOption(j(e||{}),{notMerge:!0})}catch{}}):null;if($&&typeof document<"u"&&$.observe(document.documentElement,{attributes:!0,attributeFilter:["data-theme","class"]}),n)try{n(y)}catch{}return()=>{m&&m.disconnect(),$&&$.disconnect();try{y.dispose()}catch{}h.current=null}},[]),M(()=>{const u=h.current;if(!(!u||!e))try{u.setOption(j(e),{notMerge:!!p})}catch{}},[e,p]),M(()=>{const u=h.current;if(u){for(const[y,c]of Object.entries(f.current))try{u.off(y,c)}catch{}if(f.current={},a)for(const[y,c]of Object.entries(a))typeof c=="function"&&(u.on(y,c),f.current[y]=c)}},[a]),r`<div
    ref=${l}
    class=${i||"echart-container"}
    style=${s||"width:100%;height:260px"}
    role="img"
    aria-label=${o||"chart"}
  ></div>`}function kt(t,e){const s=[];for(let i=0;i<t.length;i++){const n=e[i];n!=null&&s.push([t[i],n])}return s}function Tt({data:t,labels:e,height:s,logX:i,fmtX:n,fmtY:a,xLabel:p,yLabel:o,visualMap:l}){const h=s||220,f=k(()=>{const u=F();if(!t||t.length<2||!t[0]||t[0].length===0)return{series:[]};const[y,...c]=t,m=c.map(($,d)=>({name:(e==null?void 0:e[d])||`Series ${d+1}`,type:"scatter",data:kt(y,$),symbolSize:6,itemStyle:{color:u[d%u.length],opacity:.7},emphasis:{focus:"series"}}));return{grid:{left:48,right:16,top:24,bottom:40},legend:{top:0,type:"scroll",textStyle:{fontSize:10}},tooltip:{trigger:"item",formatter:$=>{const[d,g]=$.value,v=n?n(d):String(d),x=a?a(g):String(g);return`<b>${$.seriesName}</b><br/>${p||"x"}: ${v}<br/>${o||"y"}: ${x}`}},xAxis:{type:i?"log":"value",name:p,nameLocation:"middle",nameGap:24,axisLabel:{fontSize:10,formatter:n},splitLine:{show:!0}},yAxis:{type:"value",name:o,nameLocation:"middle",nameGap:36,axisLabel:{fontSize:10,formatter:a},splitLine:{show:!0}},dataZoom:[{type:"inside",xAxisIndex:0,yAxisIndex:0,filterMode:"none",zoomOnMouseWheel:!0}],visualMap:l?[{type:"continuous",dimension:1,min:0,max:Math.max(1,...c.flat().filter($=>$!=null)),inRange:{colorAlpha:[.3,1]},show:!1}]:void 0,series:m}},[t,e,i,n,a,p,o,l]);return r`<${U}
    option=${f}
    style=${"width:100%;height:"+h+"px"}
    aria-label="scatter chart"
  />`}function At(t,e,s){const i=[];for(let n=0;n<t.length;n++){const a=e[n];a!=null&&i.push([s?t[n]*1e3:t[n],a])}return i}function N(t){const{mode:e,data:s,labels:i,colors:n,height:a,isTime:p,fmtX:o,fmtY:l,xLabel:h,yLabel:f,logX:u}=t,y=a||200,c=k(()=>{const m=F();if(!s||s.length<2||!s[0]||s[0].length===0)return{series:[]};const[$,...d]=s,g=d.map((v,x)=>{const S=K(n==null?void 0:n[x],m[x%m.length]);return{name:(i==null?void 0:i[x])||`Series ${x+1}`,type:"line",smooth:!1,showSymbol:!1,data:At($,v,!!p),lineStyle:{width:1.5,color:S},areaStyle:{opacity:.08,color:S},connectNulls:!1}});return{grid:{left:48,right:12,top:16,bottom:32},legend:{top:0,type:"scroll",textStyle:{fontSize:10},show:((i==null?void 0:i.length)||0)>1},tooltip:{trigger:"axis",formatter:v=>{var D,P;const x=Array.isArray(v)?v:[v],S=(P=(D=x[0])==null?void 0:D.value)==null?void 0:P[0],G=p?new Date(S).toLocaleTimeString([],{hour12:!1}):o?o(S):String(S),Y=x.map(O=>{var W;const R=(W=O.value)==null?void 0:W[1],Z=R==null?"—":l?l(R):String(R);return`<span style="color:${O.color}">●</span> ${O.seriesName}: <b>${Z}</b>`}).join("<br/>");return`${G}<br/>${Y}`}},xAxis:{type:p?"time":u?"log":"value",axisLabel:{fontSize:10,hideOverlap:!0,formatter:p?void 0:o}},yAxis:{type:"value",axisLabel:{fontSize:10,formatter:l}},dataZoom:[{type:"inside",xAxisIndex:0}],series:g}},[s,i,n,p,u,o,l]);return e==="scatter"?r`<${Tt}
      data=${s}
      labels=${i}
      height=${a}
      logX=${u}
      fmtX=${o}
      fmtY=${l}
      xLabel=${h}
      yLabel=${f}
    />`:r`<${U}
    option=${c}
    style=${"width:100%;height:"+y+"px"}
    aria-label="analytics chart"
  />`}function zt(t){const e={};for(const s of t){const i=typeof s=="string"?s:s.metric;if(!i)continue;const n=i.split("."),a=n.length>1?n.slice(0,-1).join("."):"(ungrouped)";(e[a]=e[a]||[]).push({name:i,count:s.count||0,lastValue:s.last_value})}return Object.entries(e).sort((s,i)=>s[0].localeCompare(i[0]))}function Mt(){const[t,e]=b([]),[s,i]=b(null),[n,a]=b(null),[p,o]=b([]),[l,h]=b(!1),[f,u]=b(null);M(()=>{J().then(d=>{e(d||[]),u(null)}).catch(d=>{e([]),u(d.message)})},[]);const y=k(()=>zt(t),[t]),c=Q(d=>{i(d),a(null),o([]),h(!0);const g=Math.floor(Date.now()/1e3)-1800,v=tt(d,g).then(S=>a(S)).catch(()=>a(null)),x=et(d,g).then(S=>o(Array.isArray(S)?S:[])).catch(()=>o([]));Promise.allSettled([v,x]).then(()=>h(!1))},[]),m=k(()=>!n||!n.value||!n.value.length?null:n.value[n.value.length-1],[n]),$=k(()=>{const d=new Set;for(const g of p)g.tags&&Object.keys(g.tags).forEach(v=>d.add(v));return[...d].sort()},[p]);return r`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Metrics</div>
      ${f&&r`<p class="error-state" style="padding:0 var(--sp-4)">Error: ${st(f)}</p>`}
      ${!f&&!t.length&&r`<p class="empty-state" style="padding:0 var(--sp-4)">No metrics available.</p>`}
      ${y.map(([d,g])=>r`<div key=${d}>
        <div class="text-muted" style="font-size:var(--fs-xs);padding:0.35rem var(--sp-5) 0.1rem;text-transform:uppercase;letter-spacing:0.03em">${d}</div>
        ${g.map(v=>r`<button key=${v.name}
          class=${s===v.name?"es-tool-btn active":"es-tool-btn"}
          onClick=${()=>c(v.name)}>
          ${v.name.split(".").pop()}
          ${v.count?r`<span class="badge" style="margin-left:auto;font-size:var(--fs-2xs)">${T(v.count)}</span>`:""}
        </button>`)}
      </div>`)}
    </div>
    <div>
      ${!s&&r`<div class="diag-card text-center" style="padding:2rem">
        <p class="text-muted">Select a metric from the sidebar to view its time series.</p>
      </div>`}

      ${s&&r`<${C}>
        <h3 class="mb-sm">${s}</h3>

        ${l&&r`<p class="loading-state">Loading...</p>`}

        ${!l&&n&&n.ts&&n.ts.length>=2?r`<div class="es-section">
          <div class="es-section-title">Time Series (last 30m)</div>
          <${H}
            label=${s.split(".").pop()}
            value=${m!=null?T(m):"-"}
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

        ${!l&&p.length>0&&r`<div class="es-section" style="margin-top:var(--sp-6)">
          <div class="es-section-title">Recent Samples (${p.length})</div>
          <div style="overflow-x:auto">
            <table style="width:100%;font-size:var(--fs-base);border-collapse:collapse">
              <thead>
                <tr class="text-muted" style="text-align:left;border-bottom:1px solid var(--border)">
                  <th style="padding:var(--sp-2) var(--sp-4)">Time</th>
                  <th style="padding:var(--sp-2) var(--sp-4)">Value</th>
                  ${$.map(d=>r`<th key=${d} style="padding:var(--sp-2) var(--sp-4)">${d}</th>`)}
                </tr>
              </thead>
              <tbody>
                ${p.slice(-50).reverse().map((d,g)=>r`<tr key=${g}
                  style="border-bottom:1px solid var(--border);${g%2?"background:var(--bg2)":""}">
                  <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${V(d.ts)}</td>
                  <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${T(d.value)}</td>
                  ${$.map(v=>r`<td key=${v} style="padding:var(--sp-2) var(--sp-4)">
                    ${d.tags&&d.tags[v]!=null?r`<span class="badge">${d.tags[v]}</span>`:"-"}
                  </td>`)}
                </tr>`)}
              </tbody>
            </table>
          </div>
        </div>`}

        ${!l&&p.length===0&&n&&r`<div class="es-section" style="margin-top:var(--sp-6)">
          <div class="es-section-title">Recent Samples</div>
          <p class="empty-state">No raw samples in the last 30 minutes.</p>
        </div>`}
      </${C}>`}
    </div>
  </div>`}const z=["var(--green)","var(--orange)","var(--accent)","var(--red)","var(--yellow)","#8b5cf6","#06b6d4","#f472b6"];function _(t){return t>=1e3?T(t/1e3)+"s":Math.round(t)+"ms"}function Lt(t){return"#"+Math.round(t)}function Ct({data:t}){if(!t||!t.requests||!t.requests.length)return r`<div class="analytics-section">
      <div class="analytics-section-title">Response Time Analysis</div>
      <${A} status="empty" emptyTitle="No request data in this time range"
        emptyHint="Widen the time range. Response times need OTel telemetry from the tool."
        emptyFix="aictl otel enable"/>
    </div>`;const e=t.requests,s=k(()=>{const l=e.map(f=>f.ts),h=e.map(f=>f.duration_ms);return[l,h]},[e]),i=k(()=>{const l=[...new Set(e.map(c=>c.model||"(unknown)"))],h=l.map(()=>[]),u=[...e.filter(c=>c.input_tokens>0)].sort((c,m)=>c.input_tokens-m.input_tokens),y=u.map(c=>c.input_tokens);for(const c of l)h[l.indexOf(c)]=u.map(m=>(m.model||"(unknown)")===c?m.duration_ms:null);return{data:[y,...h],labels:l,colors:z.slice(0,l.length)}},[e]),n=t.by_model||[],a=Math.max(1,...n.map(l=>l.p95_ms)),p=k(()=>{const l=[...new Set(e.map(c=>c.model||"(unknown)"))],f=[...e.filter(c=>c.seq>0)].sort((c,m)=>c.seq-m.seq),u=f.map(c=>c.seq),y=l.map(c=>f.map(m=>(m.model||"(unknown)")===c?m.duration_ms:null));return{data:[u,...y],labels:l,colors:z.slice(0,l.length)}},[e]),o=e.length?e[e.length-1].duration_ms:0;return r`<div class="analytics-section">
    <div class="analytics-section-title">Response Time Analysis</div>
    <div class="analytics-charts">
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time Over Time</span>
          <span class="chart-val" style="color:var(--accent)">${_(o)}</span></div>
        <${N} mode="line" data=${s} isTime=${!0} fmtY=${_} height=${200}/>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time vs Input Size</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">${e.length} requests</span></div>
        <${N} mode="scatter" data=${i.data} labels=${i.labels}
          colors=${i.colors} fmtX=${T} fmtY=${_} logX=${!0} height=${200}/>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time by Model</span></div>
        <div class="hbar-list">
          ${n.map((l,h)=>r`<div key=${l.model} class="hbar-row">
            <span class="hbar-label" title=${l.model}>${l.model.replace(/^claude-/,"")||l.model}</span>
            <div class="hbar-track">
              <div class="hbar-fill" style=${"width:"+Math.round(l.avg_ms/a*100)+"%;background:"+z[h%z.length]}></div>
              <div class="hbar-p95" style=${"left:"+Math.round(l.p95_ms/a*100)+"%"} title=${"p95: "+_(l.p95_ms)}></div>
            </div>
            <span class="hbar-value">${_(l.avg_ms)}</span>
            <span class="badge">${l.count}</span>
          </div>`)}
        </div>
        ${n.length>0&&r`<div class="text-muted" style="font-size:var(--fs-2xs);margin-top:var(--sp-2);padding-left:130px">
          Bar = avg, dashed line = p95</div>`}
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Session Lifecycle (seq vs latency)</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">degradation?</span></div>
        <${N} mode="scatter" data=${p.data} labels=${p.labels}
          colors=${p.colors} fmtX=${Lt} fmtY=${_} logX=${!0} height=${200}/>
      </div>
    </div>
  </div>`}const Ot={"claude-code":"#8b5cf6",codex:"#f97316",aider:"#06b6d4",cursor:"#f472b6"};function X(t,e){return Ot[t]||z[e%z.length]}function B({by_cli:t,total:e,barWidth:s,cliTools:i}){return!t||!t.length?r`<div class="hbar-fill" style=${"width:"+s+"%;background:var(--accent)"}></div>`:t.map((n,a)=>{const p=n.count/e*s,o=X(n.cli_tool,i.indexOf(n.cli_tool));return r`<div key=${n.cli_tool}
      style=${"width:"+p.toFixed(1)+"%;background:"+o+";height:100%;display:inline-block"}
      title=${n.cli_tool+": "+n.count}></div>`})}function Rt({data:t}){if(!t||!t.invocations||!t.invocations.length)return r`<div class="analytics-section">
      <div class="analytics-section-title">Tool Usage</div>
      ${t!=null&&t.total_all_time?r`<${A} status="empty" emptyTitle="No tool invocation data in this time range"
            emptyHint=${"Try a wider range ("+t.total_all_time+" invocations exist)."}/>`:r`<${A} status="empty" emptyTitle="No tool invocation data yet"
            emptyHint="Tool usage comes from hooks. Install them, then run a session." emptyFix="aictl enable"/>`}
    </div>`;const e=t.invocations,s=t.cli_tools||[],i=Math.max(1,...e.map(a=>a.count)),n=Math.max(1,...e.map(a=>a.p95_ms));return r`<div class="analytics-section">
    <div class="analytics-section-title">Tool Usage</div>
    ${s.length>1&&r`<div style="display:flex;gap:var(--sp-4);margin-bottom:var(--sp-3);flex-wrap:wrap">
      ${s.map((a,p)=>r`<span key=${a} style="display:flex;align-items:center;gap:var(--sp-2);font-size:var(--fs-sm)">
        <span style=${"width:10px;height:10px;border-radius:2px;background:"+X(a,p)}></span>
        ${a}
      </span>`)}
    </div>`}
    <div class="analytics-charts">
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Invocation Frequency</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">${e.reduce((a,p)=>a+p.count,0)} total</span></div>
        <div class="hbar-list">
          ${e.slice(0,15).map(a=>r`<div key=${a.tool_name} class="hbar-row">
            <span class="hbar-label" title=${a.tool_name}>${a.tool_name}</span>
            <div class="hbar-track" style="overflow:hidden">
              <${B} by_cli=${a.by_cli} total=${a.count}
                barWidth=${Math.round(a.count/i*100)} cliTools=${s}/>
            </div>
            <span class="hbar-value">${T(a.count)}</span>
            ${a.error_count?r`<span class="badge" style="color:var(--red)">${a.error_count} err</span>`:""}
          </div>`)}
        </div>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Execution Duration</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">avg + p95</span></div>
        <div class="hbar-list">
          ${e.slice(0,15).map((a,p)=>r`<div key=${a.tool_name} class="hbar-row">
            <span class="hbar-label" title=${a.tool_name}>${a.tool_name}</span>
            <div class="hbar-track">
              <${B} by_cli=${a.by_cli} total=${a.count}
                barWidth=${Math.round(a.avg_ms/n*100)} cliTools=${s}/>
              <div class="hbar-p95" style=${"left:"+Math.round(a.p95_ms/n*100)+"%"} title=${"p95: "+_(a.p95_ms)}></div>
            </div>
            <span class="hbar-value">${_(a.avg_ms)}</span>
          </div>`)}
        </div>
      </div>
    </div>
  </div>`}function qt({data:t}){const[e,s]=b(!1);if(!t)return null;const i=t.memory_timeline||{},n=t.memory_events||[],a=Object.keys(i);if(!a.length&&!n.length)return r`<div class="analytics-section">
      <div class="analytics-section-title">File Write Activity</div>
      <${A} status="empty" emptyTitle="No file write data in this time range"
        emptyHint="Widen the time range. Writes are recorded while the dashboard or the collector is running."/>
    </div>`;const p=e?a:a.slice(0,6);return r`<div class="analytics-section">
    <div class="analytics-section-title">File Write Activity</div>

    ${a.length>0&&r`<div style="margin-bottom:var(--sp-6)">
      <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        Cumulative Bytes Written (${a.length} files)</div>
      <div class="analytics-charts">
        ${p.map(o=>{const l=i[o];if(!l||l.ts.length<2)return r`<div key=${o} class="diag-card">
            <div class="chart-hdr"><span class="chart-label" title=${o}>${E(o)}</span>
              <span class="chart-val text-muted">${l&&l.size_bytes.length?L(l.size_bytes[l.size_bytes.length-1]):"-"}</span></div>
            <div class="empty-state" style="font-size:var(--fs-sm)">Single snapshot</div>
          </div>`;const h=l.size_bytes[l.size_bytes.length-1];return r`<div key=${o} class="diag-card">
            <${H} label=${E(o)} value=${L(h)}
              data=${[l.ts,l.size_bytes]} chartColor="var(--accent)"/>
          </div>`})}
      </div>
      ${a.length>6&&!e&&r`<button class="range-btn" style="margin-top:var(--sp-2)"
        onClick=${()=>s(!0)}>Show all ${a.length} files</button>`}
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
            ${n.slice(0,30).map((o,l)=>r`<tr key=${l}
              style="border-bottom:1px solid var(--border);${l%2?"background:var(--bg2)":""}">
              <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${V(o.ts)}</td>
              <td style="padding:var(--sp-2) var(--sp-4)" title=${o.path}>${E(o.path)}</td>
              <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${L(o.size_bytes)}</td>
              <td class="mono" style="padding:var(--sp-2) var(--sp-4);color:${o.delta>0?"var(--green)":o.delta<0?"var(--red)":"var(--fg2)"}">
                ${o.delta>0?"+":""}${L(Math.abs(o.delta))}${o.delta<0?" ↓":o.delta>0?" ↑":""}
              </td>
              <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${T(o.tokens)}</td>
            </tr>`)}
          </tbody>
        </table>
      </div>
    </div>`}
  </div>`}function Et({health:t}){if(!t||t.ok!==!1)return null;const e=t.last_error||`background refresh failing (${t.consecutive_errors||0}x)`,s=t.last_success_ts?` (updated ${rt(t.last_success_ts)})`:" (no successful update yet)";return r`<div class="analytics-health-warning" role="alert"
    style="padding:var(--sp-2) var(--sp-4);margin-bottom:var(--sp-4);
      background:color-mix(in srgb, var(--orange) 12%, var(--bg2));
      border:1px solid var(--orange);border-radius:4px;
      color:var(--orange);font-size:var(--fs-sm);font-weight:600">
    Analytics data may be stale: ${e}${s}
  </div>`}function Dt(){const t=at(nt),e=t==null?void 0:t.globalRange,[s,i]=b(null),[n,a]=b(!0),[p,o]=b(null),[l,h]=b(null),[f,u]=b(0);M(()=>{a(!0),o(null);const c=(e==null?void 0:e.since)||Date.now()/1e3-86400,m=(e==null?void 0:e.until)||"",$=`/api/analytics?since=${c}${m?"&until="+m:""}`,d=new AbortController,g=setTimeout(()=>d.abort(),15e3);return lt($,{signal:d.signal}).then(v=>{i(v),o(null),h(Date.now())}).catch(v=>{o(v.name==="AbortError"?"The request timed out after 15 s.":v.message)}).finally(()=>{clearTimeout(g),a(!1)}),()=>{clearTimeout(g),d.abort()}},[e==null?void 0:e.since,e==null?void 0:e.until,f]);const y=()=>u(c=>c+1);return r`<div class="analytics-grid">
    <${it} enabledTools=${t==null?void 0:t.enabledTools} what="Analytics"/>
    ${n&&!s&&r`<${A} status="loading" label="analytics" skeletonHeight="240px"/>`}
    ${p&&!s&&r`<${A} status="error" error=${p} label="analytics" onRetry=${y}/>`}
    ${p&&s&&r`<${A} status="stale" error=${p} updatedAt=${l} onRetry=${y}/>`}
    ${s&&r`<${C}>
      <${Et} health=${s==null?void 0:s._health}/>
      <${Ct} data=${s==null?void 0:s.response_time}/>
      <${Rt} data=${s==null?void 0:s.tools}/>
      <${qt} data=${s==null?void 0:s.files}/>
      <details class="analytics-section">
        <summary class="analytics-section-title" style="cursor:pointer;user-select:none">
          Raw Metrics Explorer</summary>
        <div style="margin-top:var(--sp-4)"><${Mt}/></div>
      </details>
    </${C}>`}
  </div>`}export{Dt as default};

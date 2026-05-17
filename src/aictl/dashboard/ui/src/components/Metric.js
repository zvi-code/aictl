import { useState, useEffect, useRef } from 'preact/hooks';
import { html } from 'htm/preact';
import DeltaBadge from './shell/DeltaBadge.js';

/**
 * Props:
 *   label, value, accent, dp, sm  — existing API (unchanged)
 *   delta         — optional { pct, direction, compareLabel? }
 *   deltaInverse  — boolean: treat "up" as a bad outcome (e.g. error rate)
 */
export default function Metric({label, value, accent, dp, sm, delta, deltaInverse}) {
  const prevRef = useRef(value);
  const [flashing, setFlashing] = useState(false);
  useEffect(()=>{
    if(prevRef.current !== value) { setFlashing(true); setTimeout(()=>setFlashing(false),500); }
    prevRef.current = value;
  },[value]);
  return html`<div class=${'metric'+(sm?' metric--sm':'')} aria-label="${label}: ${value}" ...${dp ? {'data-dp': dp} : {}}>
    <div class="label">${label}</div>
    <div class=${'value'+(accent?' accent':'')+(flashing?' flash':'')} aria-live="polite" aria-atomic="true">${value}</div>
    ${delta ? html`<div class="metric-delta"><${DeltaBadge}
      pct=${delta.pct} direction=${delta.direction}
      inverse=${deltaInverse} compareLabel=${delta.compareLabel}/></div>` : null}
  </div>`;
}

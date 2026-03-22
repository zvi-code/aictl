import { useState, useEffect, useRef } from 'preact/hooks';
import { html } from 'htm/preact';

export default function Metric({label, value, accent, dp, sm}) {
  const prevRef = useRef(value);
  const [flashing, setFlashing] = useState(false);
  useEffect(()=>{
    if(prevRef.current !== value) { setFlashing(true); setTimeout(()=>setFlashing(false),500); }
    prevRef.current = value;
  },[value]);
  return html`<div class=${'metric'+(sm?' metric--sm':'')} aria-label="${label}: ${value}" ...${dp ? {'data-dp': dp} : {}}>
    <div class="label">${label}</div>
    <div class=${'value'+(accent?' accent':'')+(flashing?' flash':'')} aria-live="polite" aria-atomic="true">${value}</div>
  </div>`;
}

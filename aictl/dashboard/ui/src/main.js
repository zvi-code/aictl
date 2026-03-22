import { render } from 'preact';
import { html } from 'htm/preact';
import './dashboard.css';
import 'uplot/dist/uPlot.min.css';
import App from './app.js';

render(html`<${App}/>`, document.getElementById('app'));

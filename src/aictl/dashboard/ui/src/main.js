import { render } from 'preact';
import { html } from 'htm/preact';
import Root from './root.js';
import './assets/fonts/fonts.css';

render(html`<${Root}/>`, document.getElementById('app'));

import { render } from 'preact';
import { html } from 'htm/preact';
import Root from './root.js';

render(html`<${Root}/>`, document.getElementById('app'));

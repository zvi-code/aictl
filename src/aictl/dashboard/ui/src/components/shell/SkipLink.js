import { html } from 'htm/preact';

export default function SkipLink({ target = '#main-content', label = 'Skip to main content' }) {
  return html`<a href=${target} class="skip-link">${label}</a>`;
}

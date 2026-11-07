// The Configuration tab: the Settings workspace.
import { html } from 'htm/preact';
import SettingsWorkspace from './settings/SettingsWorkspace.js';

export default function TabToolConfig() {
  return html`<${SettingsWorkspace}/>`;
}

import { html } from 'htm/preact';
// Tree-shakeable named imports — only the icons referenced here end up in the bundle.
// Add new names as components start using them.
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  ChevronDown,
  ChevronRight,
  Cpu,
  FileText,
  GitBranch,
  LayoutDashboard,
  LineChart,
  Radio,
  RefreshCw,
  Search,
  Settings,
  Wallet,
  X,
} from 'lucide-preact';

const REGISTRY = {
  'activity':         Activity,
  'alert-triangle':   AlertTriangle,
  'bar-chart-3':      BarChart3,
  'brain':            Brain,
  'chevron-down':     ChevronDown,
  'chevron-right':    ChevronRight,
  'cpu':              Cpu,
  'file-text':        FileText,
  'git-branch':       GitBranch,
  'layout-dashboard': LayoutDashboard,
  'line-chart':       LineChart,
  'radio':            Radio,
  'refresh-cw':       RefreshCw,
  'search':           Search,
  'settings':         Settings,
  'wallet':           Wallet,
  'x':                X,
};

export default function Icon({ name, size = '1em', strokeWidth = 2, ...rest }) {
  if (!name) return null;
  const Comp = REGISTRY[String(name)];
  if (!Comp) {
    // Fallback: render the raw value (keeps compatibility with unknown names / emoji).
    return html`<span aria-hidden="true" ...${rest}>${name}</span>`;
  }
  return html`<${Comp} size=${size} strokeWidth=${strokeWidth} aria-hidden="true" ...${rest} />`;
}

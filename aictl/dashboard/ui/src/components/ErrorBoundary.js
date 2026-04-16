import { Component } from 'preact';
import { html } from 'htm/preact';
import EmptyState from './ui/EmptyState.js';
import Button from './ui/Button.js';
import { toast } from './ui/Toast.js';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard error:', error, errorInfo);
    try { toast.error('Something went wrong in this view'); } catch { /* noop */ }
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || 'Unknown error';
      const retry = () => this.setState({ hasError: false, error: null });
      return html`<${EmptyState}
        icon="alert-triangle"
        title="Something went wrong"
        description=${msg}
        action=${html`<${Button} variant="primary" onClick=${retry}>Retry</${Button}>`}
      />`;
    }
    return this.props.children;
  }
}

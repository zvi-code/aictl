import { Component } from 'preact';
import { html } from 'htm/preact';

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
  }

  render() {
    if (this.state.hasError) {
      return html`<div class="text-red" style="padding:var(--sp-10)">
        <h3>Something went wrong</h3>
        <pre style="font-size:0.75rem;margin-top:var(--sp-5)">${this.state.error?.message || 'Unknown error'}</pre>
        <button class="prev-btn" style="margin-top:var(--sp-5)" onClick=${()=>this.setState({hasError:false,error:null})}>Try again</button>
      </div>`;
    }
    return this.props.children;
  }
}

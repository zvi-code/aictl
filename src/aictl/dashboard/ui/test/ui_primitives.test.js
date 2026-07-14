import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/preact';
import { html } from 'htm/preact';
import { useState } from 'preact/hooks';

import Button from '../src/components/ui/Button.js';
import Badge from '../src/components/ui/Badge.js';
import Tooltip from '../src/components/ui/Tooltip.js';
import Popover from '../src/components/ui/Popover.js';
import Dialog from '../src/components/ui/Dialog.js';
import Segmented from '../src/components/ui/Segmented.js';
import Kbd from '../src/components/ui/Kbd.js';
import EmptyState from '../src/components/ui/EmptyState.js';
import Skeleton from '../src/components/ui/Skeleton.js';
import Icon from '../src/components/ui/Icon.js';
import ToastProvider from '../src/components/ui/ToastProvider.js';
import { toast, TOAST_TTL_MS } from '../src/components/ui/Toast.js';

afterEach(() => cleanup());

describe('Button', () => {
  it('calls onClick when clicked', () => {
    const fn = vi.fn();
    const { getByRole } = render(html`<${Button} onClick=${fn}>Go</${Button}>`);
    fireEvent.click(getByRole('button'));
    expect(fn).toHaveBeenCalledOnce();
  });
  it('does not fire onClick when loading', () => {
    const fn = vi.fn();
    const { getByRole } = render(html`<${Button} loading=${true} onClick=${fn}>Go</${Button}>`);
    const btn = getByRole('button');
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('Badge', () => {
  it('applies variant class', () => {
    const { getByText } = render(html`<${Badge} variant="success">ok</${Badge}>`);
    expect(getByText('ok').className).toContain('aictl-ui-badge--success');
  });
});

describe('Tooltip', () => {
  it('shows content on hover, hides on leave', async () => {
    const { getByText, queryByRole, container } = render(html`<${Tooltip} content="Tip!">
      <button>anchor</button>
    </${Tooltip}>`);
    expect(queryByRole('tooltip')).toBeNull();
    fireEvent.mouseEnter(container.querySelector('.aictl-ui-tooltip-wrap'));
    expect(getByText('Tip!')).toBeInTheDocument();
    fireEvent.mouseLeave(container.querySelector('.aictl-ui-tooltip-wrap'));
    expect(queryByRole('tooltip')).toBeNull();
  });
});

describe('Popover', () => {
  it('opens on trigger click and closes on Escape', () => {
    const { getByText, queryByText } = render(html`<${Popover}
      trigger=${html`<button>open</button>`}
    ><div>pop-body</div></${Popover}>`);
    fireEvent.click(getByText('open'));
    expect(getByText('pop-body')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(queryByText('pop-body')).toBeNull();
  });
});

describe('Dialog', () => {
  it('renders when open and closes on Escape', () => {
    const fn = vi.fn();
    const { getByText } = render(html`<${Dialog} open=${true} onClose=${fn} ariaLabel="test">
      <div>dlg-body</div>
    </${Dialog}>`);
    expect(getByText('dlg-body')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(fn).toHaveBeenCalledOnce();
  });

  it('does not render when closed', () => {
    const { queryByText } = render(html`<${Dialog} open=${false}><div>hidden</div></${Dialog}>`);
    expect(queryByText('hidden')).toBeNull();
  });
});

describe('Segmented', () => {
  function Wrap() {
    const [v, setV] = useState('a');
    return html`<${Segmented} options=${[{label:'A',value:'a'},{label:'B',value:'b'}]} value=${v} onChange=${setV}/>`;
  }
  it('toggles value on click', () => {
    const { getByText, container } = render(html`<${Wrap}/>`);
    fireEvent.click(getByText('B'));
    const checked = container.querySelectorAll('[aria-checked="true"]');
    expect(checked.length).toBe(1);
    expect(checked[0].textContent).toBe('B');
  });
});

describe('Kbd', () => {
  it('renders kbd element with text', () => {
    const { getByText } = render(html`<${Kbd}>⌘</${Kbd}>`);
    const el = getByText('⌘');
    expect(el.tagName).toBe('KBD');
    expect(el.className).toContain('aictl-ui-kbd');
  });
});

describe('EmptyState', () => {
  it('renders title and description', () => {
    const { getByText } = render(html`<${EmptyState} title="nothing" description="try later"/>`);
    expect(getByText('nothing')).toBeInTheDocument();
    expect(getByText('try later')).toBeInTheDocument();
  });

  it('renders a data-source caption when given a source prop', () => {
    // Regression: a card that goes silently empty should name the snapshot
    // path/API field that feeds it so the wiring is debuggable from the UI.
    const { getByText, container } = render(html`<${EmptyState}
      title="nothing"
      description="try later"
      source="/api/snapshot \u00b7 tools[].files"/>`);
    const cap = getByText('/api/snapshot \u00b7 tools[].files');
    expect(cap).toBeInTheDocument();
    expect(cap.className).toContain('aictl-ui-empty__source');
    // And source is absent when not given.
    const { container: c2 } = render(html`<${EmptyState} title="x"/>`);
    expect(c2.querySelector('.aictl-ui-empty__source')).toBeFalsy();
    expect(container).toBeTruthy();
  });
});

describe('Skeleton', () => {
  it('renders count placeholders', () => {
    const { container } = render(html`<${Skeleton} count=${3}/>`);
    expect(container.querySelectorAll('.aictl-ui-skel').length).toBe(3);
  });
});

describe('Icon', () => {
  it('renders a lucide SVG for a valid name', () => {
    const { container } = render(html`<${Icon} name="activity" size="16"/>`);
    expect(container.querySelector('svg')).toBeTruthy();
  });
  it('falls back to raw text for an unknown name', () => {
    const { getByText } = render(html`<${Icon} name="⚠"/>`);
    expect(getByText('⚠')).toBeInTheDocument();
  });
});

describe('Toast', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('appears then auto-dismisses after TTL', async () => {
    const { queryByText, container } = render(html`<${ToastProvider}/>`);
    act(() => { toast.success('hi there'); });
    expect(container.textContent).toContain('hi there');
    act(() => { vi.advanceTimersByTime(TOAST_TTL_MS + 50); });
    expect(queryByText('hi there')).toBeNull();
  });
});

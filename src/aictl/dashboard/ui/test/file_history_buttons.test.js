import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';

import FileHistoryButtons from '../src/components/session_detail/FileHistoryButtons.js';

beforeEach(() => cleanup());

describe('FileHistoryButtons', () => {
  it('renders nothing when no session timestamps are available', () => {
    const { container } = render(html`<${FileHistoryButtons}
      path="/a" session=${{ session_id: 's' }} openViewer=${() => {}}/>`);
    expect(container.textContent.trim()).toBe('');
  });

  it('renders only "start" for a live session without ended_at', () => {
    const openViewer = vi.fn();
    render(html`<${FileHistoryButtons}
      path="/a" session=${{ started_at: 1000 }} openViewer=${openViewer}/>`);
    const start = screen.getByLabelText('View /a at session start');
    expect(start).toBeTruthy();
    expect(screen.queryByLabelText('View /a at session end')).toBeNull();
    fireEvent.click(start);
    expect(openViewer).toHaveBeenCalledWith('/a', { at: 1000 });
  });

  it('renders both start and end for an ended session and calls openViewer with each ts', () => {
    const openViewer = vi.fn();
    render(html`<${FileHistoryButtons}
      path="/b" session=${{ started_at: 1000, ended_at: 2000 }} openViewer=${openViewer}/>`);
    fireEvent.click(screen.getByLabelText('View /b at session start'));
    fireEvent.click(screen.getByLabelText('View /b at session end'));
    expect(openViewer).toHaveBeenNthCalledWith(1, '/b', { at: 1000 });
    expect(openViewer).toHaveBeenNthCalledWith(2, '/b', { at: 2000 });
  });

  it('is a no-op when openViewer is not a function', () => {
    const { container } = render(html`<${FileHistoryButtons}
      path="/a" session=${{ started_at: 1 }} openViewer=${null}/>`);
    expect(container.textContent.trim()).toBe('');
  });
});

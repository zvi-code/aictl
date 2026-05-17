import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/preact';
import { html } from 'htm/preact';

import SessionCommitsBadge from '../src/components/session_detail/SessionCommitsBadge.js';
import * as api from '../src/api.js';

beforeEach(() => cleanup());
afterEach(() => vi.restoreAllMocks());

const _mk = (overrides = {}) => ({
  session_id: 's1',
  project: '/tmp/proj',
  commit_count: 3,
  ...overrides,
});

describe('SessionCommitsBadge', () => {
  it('renders nothing when commit_count is 0', () => {
    const { container } = render(
      html`<${SessionCommitsBadge} session=${_mk({ commit_count: 0 })}/>`,
    );
    expect(container.querySelector('.scb-root')).toBeNull();
  });

  it('renders nothing when project is unknown', () => {
    const { container } = render(
      html`<${SessionCommitsBadge} session=${_mk({ project: '' })}/>`,
    );
    expect(container.querySelector('.scb-root')).toBeNull();
  });

  it('renders a badge with the commit count and toggles dropdown on click', async () => {
    const getSpy = vi.spyOn(api, 'getSessionCommits').mockResolvedValue({
      session_id: 's1',
      branch: 'main',
      commits: [
        { sha: 'aaaaaaa1b2c3d4e5', short_sha: 'aaaaaaa', subject: 'first', ts: 1, current_branch_match: true, author_name: 'A', author_email: 'a@e' },
        { sha: 'bbbbbbb1b2c3d4e5', short_sha: 'bbbbbbb', subject: 'second', ts: 2, current_branch_match: true, author_name: 'A', author_email: 'a@e' },
        { sha: 'ccccccc1b2c3d4e5', short_sha: 'ccccccc', subject: 'third', ts: 3, current_branch_match: true, author_name: 'A', author_email: 'a@e' },
      ],
    });

    const { container } = render(html`<${SessionCommitsBadge} session=${_mk()}/>`);
    const btn = container.querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toMatch(/3 commits/);
    expect(container.querySelector('.scb-dropdown')).toBeNull();

    fireEvent.click(btn);
    await waitFor(() => expect(container.querySelector('.scb-dropdown')).toBeTruthy());
    await waitFor(() => expect(container.querySelectorAll('.scb-row').length).toBe(3));
    expect(getSpy).toHaveBeenCalledWith('s1');

    // Second click collapses.
    fireEvent.click(btn);
    expect(container.querySelector('.scb-dropdown')).toBeNull();
  });

  it('dims off-branch commits and shows "not on <branch>" hint', async () => {
    vi.spyOn(api, 'getSessionCommits').mockResolvedValue({
      session_id: 's1',
      branch: 'main',
      commits: [
        { sha: 'xxx', short_sha: 'xxxxxxx', subject: 'off-branch', ts: 1, current_branch_match: false, author_name: '', author_email: '' },
      ],
    });
    const { container } = render(
      html`<${SessionCommitsBadge} session=${_mk({ commit_count: 1 })}/>`,
    );
    fireEvent.click(container.querySelector('button'));
    await waitFor(() => expect(container.querySelector('.scb-row')).toBeTruthy());
    const row = container.querySelector('.scb-row');
    expect(row.getAttribute('style')).toMatch(/opacity:\s*0\.55/);
    expect(row.textContent).toMatch(/not on main/);
  });
});

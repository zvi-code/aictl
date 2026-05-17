import { describe, it, expect } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/preact';
import { html } from 'htm/preact';
import CPromptsTab from '../src/components/CPromptsTab.js';

afterEach(() => cleanup());

describe('CPromptsTab — toolbar', () => {
  it('renders Prompts and Workflows segment buttons', () => {
    const { getByText } = render(html`<${CPromptsTab}/>`);
    expect(getByText('Prompts')).toBeInTheDocument();
    expect(getByText('Workflows')).toBeInTheDocument();
  });

  it('Prompts button is active by default', () => {
    const { getByText } = render(html`<${CPromptsTab}/>`);
    expect(getByText('Prompts').classList.contains('is-active')).toBe(true);
    expect(getByText('Workflows').classList.contains('is-active')).toBe(false);
  });

  it('clicking Workflows switches active view', () => {
    const { getByText } = render(html`<${CPromptsTab}/>`);
    fireEvent.click(getByText('Workflows'));
    expect(getByText('Workflows').classList.contains('is-active')).toBe(true);
    expect(getByText('Prompts').classList.contains('is-active')).toBe(false);
  });

  it('filter input is present and labeled', () => {
    const { getByLabelText } = render(html`<${CPromptsTab}/>`);
    expect(getByLabelText('Filter prompts')).toBeInTheDocument();
  });

  it('filter label updates when view switches to Workflows', () => {
    const { getByText, getByLabelText } = render(html`<${CPromptsTab}/>`);
    fireEvent.click(getByText('Workflows'));
    expect(getByLabelText('Filter workflows')).toBeInTheDocument();
  });

  it('count badge shows 0 prompts by default', () => {
    const { getByText } = render(html`<${CPromptsTab}/>`);
    expect(getByText('0 prompts')).toBeInTheDocument();
  });

  it('count badge updates to 0 workflows after switching', () => {
    const { getByText } = render(html`<${CPromptsTab}/>`);
    fireEvent.click(getByText('Workflows'));
    expect(getByText('0 workflows')).toBeInTheDocument();
  });
});

describe('CPromptsTab — empty state', () => {
  it('renders prompts empty state by default', () => {
    const { getByText } = render(html`<${CPromptsTab}/>`);
    expect(getByText('No prompts yet')).toBeInTheDocument();
  });

  it('empty state has coming-soon note about .prompt.md', () => {
    const { container } = render(html`<${CPromptsTab}/>`);
    const note = container.querySelector('.cprompts-empty-note');
    expect(note).toBeTruthy();
    expect(note.textContent).toContain('.prompt.md');
  });

  it('workflows empty state shows after switching', () => {
    const { getByText } = render(html`<${CPromptsTab}/>`);
    fireEvent.click(getByText('Workflows'));
    expect(getByText('No workflows yet')).toBeInTheDocument();
  });

  it('workflows empty state note references .workflow.md', () => {
    const { getByText, container } = render(html`<${CPromptsTab}/>`);
    fireEvent.click(getByText('Workflows'));
    const note = container.querySelector('.cprompts-empty-note');
    expect(note.textContent).toContain('.workflow.md');
  });

  it('detail pane shows "Nothing selected"', () => {
    const { getByText } = render(html`<${CPromptsTab}/>`);
    expect(getByText('Nothing selected')).toBeInTheDocument();
  });
});

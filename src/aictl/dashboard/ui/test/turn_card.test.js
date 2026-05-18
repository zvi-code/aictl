import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';
import TurnCard from '../src/components/transcript/TurnCard.js';

afterEach(() => cleanup());

function renderTurn(turn, expanded = false) {
  return render(html`<${TurnCard} turn=${turn} index=${0} expanded=${expanded} onToggle=${() => {}}/>`);
}

describe('TurnCard prompt/response viewer', () => {
  it('shows prompt and response text in the collapsed turn', () => {
    const { container } = renderTurn({
      ts: 100,
      prompt: 'Write a careful summary',
      prompt_preview: 'Write a careful summary',
      response: 'Here is the summary.',
      response_preview: 'Here is the summary.',
      actions: [],
      tokens: {},
    });

    expect(container.querySelector('.tr-prompt-text').textContent).toContain('Write a careful summary');
    expect(container.querySelector('.tr-response-text').textContent).toContain('Here is the summary.');
  });

  it('uses full response text from api_response action detail when expanded', () => {
    const { container } = renderTurn({
      ts: 100,
      prompt: 'Explain the failure',
      prompt_preview: 'Explain the failure',
      actions: [
        {
          ts: 101,
          kind: 'api_response',
          name: 'claude',
          output_summary: 'short answer',
          detail: { response: 'Full response text\nwith line two' },
        },
      ],
      tokens: {},
    }, true);

    expect(container.querySelector('.tr-response-text').textContent).toBe('Full response text\nwith line two');
  });

  it('shows a concrete missing-response state when expanded', () => {
    const { container } = renderTurn({
      ts: 100,
      prompt: 'Only prompt captured',
      prompt_preview: 'Only prompt captured',
      actions: [],
      tokens: {},
    }, true);

    expect(container.querySelector('.tr-response-empty').textContent).toContain('(no response captured)');
  });
});

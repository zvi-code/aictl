import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { html } from 'htm/preact';

import SeqTooltip from '../src/components/session_flow/SeqTooltip.js';

afterEach(() => cleanup());

describe('SeqTooltip — tool_use input_preview / result_summary', () => {
  // Regression guard for the OTel-path dead-code bug: build_turns_from_otel
  // must populate input_preview and result_summary on tool_use turns so
  // the tooltip "input:" / "result:" rows actually render. If those fields
  // regress to empty, this test fails.
  it('renders input_preview and result_summary lines when both are present', () => {
    const event = {
      type: 'tool_use',
      to: 'Bash',
      subtype: 'result',
      success: 'true',
      duration_ms: 42,
      input_preview: '{"command":"git log --oneline -5"}',
      result_summary: 'abc1234 initial commit',
    };
    const { container } = render(html`<${SeqTooltip} event=${event} />`);
    const text = container.textContent;
    expect(text).toContain('input:');
    expect(text).toContain('git log --oneline -5');
    expect(text).toContain('result:');
    expect(text).toContain('abc1234 initial commit');
  });

  it('omits input/result rows when the fields are empty strings', () => {
    const event = {
      type: 'tool_use',
      to: 'Bash',
      subtype: 'decision',
      decision: 'accept',
      input_preview: '',
      result_summary: '',
    };
    const { container } = render(html`<${SeqTooltip} event=${event} />`);
    expect(container.textContent).not.toContain('input:');
    expect(container.textContent).not.toContain('result:');
  });
});

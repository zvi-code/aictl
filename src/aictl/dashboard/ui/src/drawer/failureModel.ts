import { toolDisplayName } from '../design/format'

/**
 * A failure as people read it: the tool and the message. The key is how failures are grouped (digits in the message are
 * replaced by "#") and stays with the row to open its group; it is never shown.
 */
export function failureRow(error: { ts: number; key: string; detail: string }) {
  const tool = /^tool:([^:]+):/.exec(error.key)
  const api = /^api:/.test(error.key)
  return {
    ...error,
    tool: tool ? toolDisplayName(tool[1]) : api ? 'Model request' : undefined,
    message: error.detail || undefined,
  }
}

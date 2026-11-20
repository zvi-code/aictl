import type { PanelDef, Row } from './types'

export function eligible(def: PanelDef, capabilities: Row | null | undefined) {
  return def.requiredCapabilities.every(key => {
    const value = capabilities?.[key]
    return Array.isArray(value) ? value.length > 0 : Boolean(value)
  })
}

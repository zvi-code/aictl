import { createDockview, type DockviewApi, type SerializedDockview } from 'dockview-core'

/** Reuse Dockview's layout operations without mounting a second dashboard or moving its contents. */
export function editDock(tree: SerializedDockview, operation: (api: DockviewApi) => void): SerializedDockview {
  const host = document.createElement('div')
  const api = createDockview(host, {
    disableFloatingGroups: true,
    createComponent: () => ({ element: document.createElement('div'), init() {} }),
    createTabComponent: () => ({ element: document.createElement('span'), init() {} }),
  })
  try {
    api.layout(tree.grid.width, tree.grid.height)
    if (Object.keys(tree.panels).length) api.fromJSON(tree)
    operation(api)
    return api.toJSON()
  } finally { api.dispose() }
}

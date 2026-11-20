import { createDockview, themeLight, type IContentRenderer, type SerializedDockview } from 'dockview-core'
import '/virtual-dockview.css'
import styles from './DockEditor.module.css'

export function makeEditor(host: HTMLElement, tree: SerializedDockview, title: (id: string) => string,
  createContent: (id: string) => IContentRenderer, changed: () => void) {
  const surface = document.createElement('div')
  surface.className = styles.surface
  host.append(surface)
  const api = createDockview(surface, {
    theme: themeLight, defaultRenderer: 'onlyWhenVisible', disableFloatingGroups: true,
    createComponent: ({ id }) => createContent(id),
    defaultTabComponent: 'label',
    createTabComponent: ({ id }) => {
      const element = document.createElement('span')
      element.className = styles.label
      element.dataset.dockTab = id
      element.textContent = title(id)
      return { element, init() {} }
    },
  })
  // The section is already a landmark. Tab groups are not independent landmarks.
  const groups = api.onDidAddGroup(group => group.element.setAttribute('role', 'group'))
  try {
    api.layout(tree.grid.width, tree.grid.height)
    if (Object.keys(tree.panels).length) api.fromJSON(tree)
  } catch (reason) {
    groups.dispose()
    api.dispose()
    surface.remove()
    throw reason
  }
  const event = api.onDidLayoutChange(changed)
  return { api, dispose() { event.dispose(); groups.dispose(); api.dispose(); surface.remove() } }
}

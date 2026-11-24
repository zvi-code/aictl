import { createLiveClient } from './data/live'
import { boardLiveRequest, parseFilters, readScreen } from './data/filters'
import { boardNodeScope, loadToolFilter, redirectOf } from './data/urlState'
import { FLEET_FALLBACK_NOTICE, resolveDefaultScope } from './data/defaultScope'
import { reloadMissingChunk } from './drawer/chunkRecovery'
import { drawerEventSource } from './drawer/liveAgent'
import './assets/fonts/fonts.css'

window.addEventListener('vite:preloadError', event => {
  if (reloadMissingChunk((event as Event & { payload: unknown }).payload, Date.now(), sessionStorage, () => location.reload())) {
    event.preventDefault()
  }
})
const startedAt = Date.now() / 1000
async function start() {
  const fellBack = await resolveDefaultScope(location.search)
  const search = redirectOf(location.search) ?? location.search
  const client = createLiveClient({ ...boardLiveRequest(parseFilters(search), loadToolFilter(search), readScreen(search), startedAt),
    eventSource: drawerEventSource })
  if (boardNodeScope(search) === 'local') client.start()
  const { mount } = await import('./shell/Shell')
  mount(document.getElementById('app')!, client, startedAt, fellBack ? FLEET_FALLBACK_NOTICE : undefined)
}
void start()

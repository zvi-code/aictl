import { createLiveClient } from './data/live'
import { boardLiveRequest, parseFilters, readScreen } from './data/filters'
import { boardNodeScope, loadToolFilter, redirectOf } from './data/urlState'
import { reloadMissingChunk } from './drawer/chunkRecovery'
import { drawerEventSource } from './drawer/liveAgent'
import './assets/fonts/fonts.css'

window.addEventListener('vite:preloadError', event => {
  if (reloadMissingChunk((event as Event & { payload: unknown }).payload, Date.now(), sessionStorage, () => location.reload())) {
    event.preventDefault()
  }
})
const search = redirectOf(location.search) ?? location.search
const startedAt = Date.now() / 1000
const client = createLiveClient({ ...boardLiveRequest(parseFilters(search), loadToolFilter(search), readScreen(search), startedAt),
  eventSource: drawerEventSource })
if (boardNodeScope(search) === 'local') client.start()
void import('./shell/Shell').then(({ mount }) => mount(document.getElementById('app')!, client, startedAt))

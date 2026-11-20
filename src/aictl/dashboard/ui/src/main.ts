import { createLiveClient } from './data/live'
import { boardLiveRequest, parseFilters, readScreen } from './components/board/filters.js'
import { boardNodeScope, loadToolFilter, redirectOf } from './hooks/urlState.js'
import './assets/fonts/fonts.css'

const search = redirectOf(location.search) ?? location.search
const startedAt = Date.now() / 1000
const client = createLiveClient(boardLiveRequest(parseFilters(search), loadToolFilter(search), readScreen(search), startedAt))
if (boardNodeScope(search) === 'local') client.start()
void import('./root.js').then(({ mount }) => mount(document.getElementById('app'), client, startedAt))

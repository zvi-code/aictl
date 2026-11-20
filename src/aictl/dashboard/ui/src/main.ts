import { createLiveClient } from './data/live'
import { boardLiveRequest, parseFilters, readScreen } from './data/filters'
import { boardNodeScope, loadToolFilter, redirectOf } from './data/urlState'
import './assets/fonts/fonts.css'

const search = redirectOf(location.search) ?? location.search
const startedAt = Date.now() / 1000
const client = createLiveClient(boardLiveRequest(parseFilters(search), loadToolFilter(search), readScreen(search), startedAt))
if (boardNodeScope(search) === 'local') client.start()
void import('./shell/Shell').then(({ mount }) => mount(document.getElementById('app')!, client, startedAt))

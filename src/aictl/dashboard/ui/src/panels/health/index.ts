import type { PanelDef } from '../types'
import { setupInventory } from './Inventory'
import { setupSources, sourceColumns } from './sources'

const live = (path?: string) => ({ topic: 'runtime.health', entity: 'local', path } as const)
const inventorySource = { topic: 'runtime.health', entity: 'table_inventory', path: 'inventory.tables' } as const
const common = { actions: [], requiredCapabilities: [] }

export const healthPanels: readonly PanelDef[] = [
  // HLT-01: Status, freshness and scope links need a derived summary.
  { ...common, id: 'healthHighlights', title: 'Health overview', kind: 'custom', sources: [live()], columns: [],
    defaultSize: 'medium', load: () => import('./Highlights') },
  // HLT-02: Stage cards, policies, request and writer grids share one disclosure.
  { ...common, id: 'storeHealth', title: 'Store, capacity and requests', kind: 'custom',
    sources: [live('store'), live('pipeline')], columns: [], defaultSize: 'medium', load: () => import('./StoreHealth') },
  // HLT-03: Per-mode group evidence and upload details require more than one grid.
  { ...common, id: 'ingestionTraffic', title: 'Ingestion traffic and batching', kind: 'custom',
    sources: [live('store.ingestion_traffic'), live('store.traffic_groups'), live('store.ingestion_details')], columns: [],
    defaultSize: 'medium', load: () => import('./Traffic') },
  // HLT-04: The host grid and shared metrics for each node.
  { ...common, id: 'hostResources', title: 'Host resources and node traffic', kind: 'custom',
    sources: [live('resources'), live('store'), live('generated_at')], columns: [], defaultSize: 'large', load: () => import('./Resources') },
  // HLT-05
  { ...common, id: 'tableInventory', title: 'Table inventory', kind: 'table', sources: [inventorySource],
    columns: [
      { path: 'name', label: 'Table' }, { path: 'rows', label: 'Extent rows' }, { path: 'extent_count', label: 'Extents' },
      { path: 'extent_bytes', label: 'Extent size (bytes)' }, { path: 'compressed_bytes', label: 'Compressed size (bytes)' },
      { path: 'original_bytes', label: 'Original size (bytes)' }, { path: 'hot_bytes', label: 'Hot size (bytes)' },
    ],
    rowIdentity: ['name'], defaultSize: 'large', empty: 'No table rows reported.', setup: setupInventory },
  // HLT-06: The source, issue, pending and limitation groups need separate disclosures.
  { ...common, id: 'healthDiagnostics', title: 'Collection health and issues', kind: 'custom', sources: [live()],
    columns: [], defaultSize: 'medium', load: () => import('./Diagnostics') },
  // HLT-07: Live stats and active writes need separate views in the same panel.
  { ...common, id: 'self', title: 'Collection and ingestion', kind: 'custom',
    sources: [live('pipeline'), live('store.volume')], columns: [], defaultSize: 'medium', load: () => import('./Collection') },
  // HLT-08
  { ...common, id: 'sources', title: 'Data sources', kind: 'table',
    sources: [live('monitor.per_tool'), live('pipeline.freshness'), live('pipeline.hooks'), live('pipeline.otel_receiver'), live('pipeline.otel_setup')],
    columns: sourceColumns, rowIdentity: ['tool'], defaultSize: 'medium', empty: 'No source rows.', setup: setupSources },
  // HLT-09: The folder disclosure and collector grid use different contract rows.
  { ...common, id: 'collectors', title: 'Collectors', kind: 'custom', sources: [live('monitor.collectors'), live('monitor.roots')],
    columns: [], defaultSize: 'large', load: () => import('./Collectors') },
  // HLT-10: Ingester polls and the newest quality events use two grids and a recovery check.
  { ...common, id: 'quality', title: 'Ingesters and data quality', kind: 'custom',
    sources: [live('pipeline.ingesters'), live('pipeline.data_quality')], columns: [], defaultSize: 'large', load: () => import('./Quality') },
  // HLT-11: Saved node snapshots over a chosen range need range, bucket and chart or table controls.
  { ...common, id: 'healthTrends', title: 'Trends over time', kind: 'custom', sources: [{ route: '/api/board/nodes' }],
    columns: [], defaultSize: 'large', load: () => import('./Trends') },
]

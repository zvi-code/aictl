import {
  constructTable, createCoreRowModel, createSortedRowModel, rowSortingFeature, tableFeatures,
  type ColumnDef, type SortingState,
} from '@tanstack/table-core'
import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings'

export type RowIdentity = string

export type Field<T> = {
  id: string
  label: string
  read: (row: T) => string | number | boolean | null | undefined
  format?: (value: string | number | boolean) => string
  sortable?: boolean
}

const collator = new Intl.Collator(undefined, { numeric: true })
const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 })

export function formatField<T>(field: Field<T>, row: T) {
  const value = field.read(row)
  if (value == null) return 'Not available from this source'
  if (field.format) return field.format(value)
  return typeof value === 'number' ? number.format(value) : String(value)
}

const features = tableFeatures({
  coreReactivityFeature: storeReactivityBindings(),
  rowSortingFeature,
  coreRowModel: createCoreRowModel(),
  sortedRowModel: createSortedRowModel(),
})

export function makeColumns<T extends object>(fields: readonly Field<T>[]): ColumnDef<typeof features, T>[] {
  return fields.map(field => ({
    id: field.id,
    header: field.label,
    accessorFn: row => field.read(row) ?? undefined,
    enableSorting: field.sortable !== false,
    sortUndefined: 'last',
    sortFn: (a, b) => {
      const left = field.read(a.original)
      const right = field.read(b.original)
      if (typeof left === 'number' && typeof right === 'number') return left - right
      return collator.compare(String(left), String(right))
    },
  }))
}

export function createTableModel<T extends object>(getRowId: (row: T) => RowIdentity) {
  return constructTable<typeof features, T>({
    features,
    columns: [],
    data: [],
    getRowId,
    enableMultiSort: false,
    autoResetSorting: false,
  })
}

export function updateTableModel<T extends object>(
  table: ReturnType<typeof createTableModel<T>>,
  data: T[],
  columns: ColumnDef<typeof features, T>[],
  sorting: SortingState,
) {
  table.setOptions(previous => ({ ...previous, data, columns, state: { sorting } }))
  return table.getRowModel().rows
}

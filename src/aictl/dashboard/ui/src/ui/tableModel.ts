import {
  constructTable, createCoreRowModel, createSortedRowModel, rowSortingFeature, tableFeatures,
  type ColumnDef, type SortingState,
} from '@tanstack/table-core'
import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings'

import { fmtNum } from '../design/format'

export type RowIdentity = string

export type Field<T> = {
  id: string
  label: string
  read: (row: T) => string | number | boolean | null | undefined
  format?: (value: string | number | boolean) => string
  compact?: (value: number) => string | undefined
  sortable?: boolean
  numeric?: boolean
  /** Clip long text at its start, so a path keeps its file name visible. */
  clip?: 'start'
  action?: { label: (row: T) => string | undefined; run: (row: T) => void }
  /** Tooltip text for this row's cell. */
  hint?: (row: T) => string | undefined
}

const collator = new Intl.Collator(undefined, { numeric: true })
export const missingField = 'Not available from this source'

export function formatField<T>(field: Field<T>, row: T) {
  return formatValue(field, field.read(row))
}

export function formatValue<T>(field: Field<T>, value: ReturnType<Field<T>['read']>) {
  if (value == null) return missingField
  if (field.format) return field.format(value)
  return typeof value === 'number' ? fmtNum(value) : String(value)
}

// A cell action button shows the cell value, so its accessible name must contain
// that value (WCAG 2.5.3, Label in Name).
export function actionName(visible: string, label: string) {
  return label.toLocaleLowerCase().includes(visible.toLocaleLowerCase()) ? label : `${visible}, ${label}`
}

export function compareFieldValues(left: ReturnType<Field<unknown>['read']>, right: ReturnType<Field<unknown>['read']>, desc = false) {
  if (left == null || right == null) return Number(left == null) - Number(right == null)
  const result = typeof left === 'number' && typeof right === 'number'
    ? left - right : collator.compare(String(left), String(right))
  return desc ? -result : result
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
    sortFn: (a, b) => compareFieldValues(field.read(a.original), field.read(b.original)),
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

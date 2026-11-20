import type { AppliedLiveChange, LiveEntity, LiveStore } from '../data/store'

const boardTopics = ['catalog.board', 'configuration.board', 'history.board']
type Board = Readonly<Record<string, unknown>>

function fieldOf(entity: LiveEntity | undefined) {
  if (entity && boardTopics.includes(entity.topic) && typeof entity.data.field === 'string') return entity.data.field
}

export function projectBoard(store: LiveStore, previous: Board = {}, changes?: readonly AppliedLiveChange[]): Board {
  const fields = new Set<string>()
  const add = (entity: LiveEntity | undefined) => {
    const field = fieldOf(entity)
    if (field !== undefined) fields.add(field)
  }
  if (changes) {
    for (const change of changes) {
      add(change.previous)
      if (change.kind === 'upsert') add(change.entity)
    }
  } else {
    for (const topic of boardTopics) for (const entity of store.topic(topic)?.values() ?? []) add(entity)
  }
  if (!fields.size) return previous
  const board = { ...previous }
  for (const field of fields) {
    const result = store.boardField(field)
    if (result.present) Object.defineProperty(board, field, { value: result.value, configurable: true, enumerable: true })
    else delete board[field]
  }
  return board
}

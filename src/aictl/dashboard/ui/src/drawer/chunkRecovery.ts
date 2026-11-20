const key = 'aictl.chunkReloadAt'
const missingChunk = /failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module|unable to preload css/i

export function reloadMissingChunk(error: unknown, now: number, storage: Pick<Storage, 'getItem' | 'setItem'>, reload: () => void) {
  if (!missingChunk.test(String(error))) return false
  try {
    const previous = Number(storage.getItem(key))
    if (previous > 0 && now - previous < 60_000) return false
    storage.setItem(key, String(now))
  } catch { return false }
  reload()
  return true
}

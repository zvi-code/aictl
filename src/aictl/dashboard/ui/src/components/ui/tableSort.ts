type Sort = { k: string; dir: 'asc' | 'desc' }

export function nextSort(col: { k: string; n?: boolean }, current?: Sort | null): Sort {
  const on = current?.k === col.k
  if (col.n) return { k: col.k, dir: on && current.dir === 'desc' ? 'asc' : 'desc' }
  return { k: col.k, dir: on && current.dir === 'asc' ? 'desc' : 'asc' }
}

export function moveFocus(
  event: KeyboardEvent,
  items: readonly HTMLElement[],
  previous: string,
  next: string,
): HTMLElement | undefined {
  if (!items.length || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  const index = items.indexOf(event.target as HTMLElement)
  let destination: number
  if (event.key === 'Home') destination = 0
  else if (event.key === 'End') destination = items.length - 1
  else if (event.key === previous) destination = (Math.max(0, index) + items.length - 1) % items.length
  else if (event.key === next) destination = (index + 1) % items.length
  else return
  event.preventDefault()
  items[destination].focus()
  return items[destination]
}

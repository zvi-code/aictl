import { createSignal, createUniqueId, For } from 'solid-js'
import { ChevronDown } from 'lucide'
import { Icon } from './Icon'
import { moveFocus } from './keyboard'
import type { Choice } from './Segmented'
import styles from './Menu.module.css'

export function Menu(props: {
  label: string
  items: readonly (Choice & { onSelect: () => void })[]
  disabled?: boolean
}) {
  const id = createUniqueId()
  const [open, setOpen] = createSignal(false)
  let trigger!: HTMLButtonElement
  let surface!: HTMLDivElement
  const items = () => Array.from(surface.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
  const close = (restore: boolean) => {
    surface.hidePopover()
    if (restore) trigger.focus()
  }
  const show = (last = false) => {
    surface.showPopover({ source: trigger })
    items().at(last ? -1 : 0)?.focus()
  }
  return <>
    <button ref={trigger} id={`${id}-trigger`} type="button" class={styles.trigger} disabled={props.disabled}
      popovertarget={id} aria-haspopup="menu" aria-expanded={open() ? 'true' : 'false'} aria-controls={id}
      onClick={event => {
        event.preventDefault()
        if (surface.matches(':popover-open')) close(true)
        else show()
      }}
      onKeyDown={event => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
        event.preventDefault()
        show(event.key === 'ArrowUp')
      }}>
      {props.label}<Icon data={ChevronDown} />
    </button>
    <div ref={surface} id={id} class={styles.menu} popover="auto" role="menu" aria-labelledby={`${id}-trigger`}
      onToggle={event => setOpen(event.newState === 'open')}
      onFocusOut={event => {
        if (event.relatedTarget instanceof Node && !surface.contains(event.relatedTarget) && event.relatedTarget !== trigger) close(false)
      }}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          close(true)
          return
        }
        moveFocus(event, items(), 'ArrowUp', 'ArrowDown')
      }}>
      <For each={props.items} keyed={item => item.id}>{item =>
        <button type="button" role="menuitem" class={styles.item} tabindex={-1}
          aria-disabled={item().disabled ? 'true' : undefined}
          onClick={() => {
            if (item().disabled) return
            close(true)
            item().onSelect()
          }}>{item().label}</button>
      }</For>
    </div>
  </>
}

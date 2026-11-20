import type { Detail, PanelContext } from '../panels/types'

export type DrawerEntry = Detail | {
  type: 'agent'; id: string; tab: string; initialPrompts?: boolean; initialSkills?: boolean
}
export type DrawerProps = {
  ctx: PanelContext
  stack: readonly DrawerEntry[]
  open(entry: DrawerEntry, reset?: boolean): void
  back(): void
  close(): void
  changeTab(tab: string): void
}

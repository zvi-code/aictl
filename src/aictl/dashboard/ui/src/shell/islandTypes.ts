import type { Detail, PanelContext } from '../panels/types'

export type DrawerEntry = Detail | {
  type: 'agent'; id: string; tab: string; initialPrompts?: boolean; initialSkills?: boolean
}
export type IslandProps = {
  ctx: PanelContext; theme: string; density: string
}
export type DrawerProps = IslandProps & {
  stack: readonly DrawerEntry[]
  open(entry: DrawerEntry, reset?: boolean): void
  back(): void
  close(): void
  changeTab(tab: string): void
}

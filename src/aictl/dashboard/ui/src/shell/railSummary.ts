import type { BoardFields } from '../data/contract.gen'
import { fmtCpu, fmtLines, fmtMem, fmtN, fmtRate, fmtShare, fmtUsd } from '../design/format'

type Board = <K extends keyof BoardFields>(field: K) => BoardFields[K] | undefined

const sum = (values: readonly (number | null | undefined)[]) => values.reduce<number>((total, value) => total + (value ?? 0), 0)
const plural = (count: number, one: string, many = `${one}s`) => `${fmtN(count)} ${count === 1 ? one : many}`

// One line of current values under each Overview section in the rail. An empty
// string hides the line while the selected board has not delivered the field.
export function sectionSummary(id: string, board: Board): string {
  const kpis = board('kpis')
  switch (id) {
    case 'top': return kpis ? `${fmtN(kpis.messages)} messages · ${fmtN(kpis.tokens)} tokens` : ''
    case 'usage': return kpis ? `${fmtUsd(kpis.cost_usd)} · ${fmtShare(kpis.cached_share)} cached` : ''
    case 'agents': {
      if (!kpis) return ''
      const attention = board('attention')?.length ?? 0
      const parts = [kpis.running != null && `${fmtN(kpis.running)} running`, kpis.idle != null && `${fmtN(kpis.idle)} idle`,
        attention > 0 && `${fmtN(attention)} need attention`]
      return parts.filter(Boolean).join(' · ')
    }
    case 'sessions': return 'Search past sessions'
    case 'prompts': {
      const total = board('prompts_total'), skills = board('skills')
      if (total == null && !skills) return ''
      return [total != null && `${fmtN(total)} prompts`, skills && plural(skills.length, 'skill')].filter(Boolean).join(' · ')
    }
    case 'context': {
      const files = board('memory_files')
      if (!files) return ''
      const memory = files.filter(file => file.category === 'memory').length
      return `${plural(memory, 'memory file')} · ${plural(files.length - memory, 'instruction file')}`
    }
    case 'tools': return kpis ? `${fmtN(kpis.tool_calls)} calls · ${fmtRate(kpis.fail_rate)} failed` : ''
    case 'changes': {
      const changes = board('changes'), tests = board('tests')
      if (!changes) return ''
      const runs = sum(tests?.map(test => test.runs) ?? []), failed = sum(tests?.map(test => test.failed) ?? [])
      return `${fmtLines(changes.totals.lines_added, changes.totals.lines_removed)} · tests ${fmtN(runs - failed)} of ${fmtN(runs)}`
    }
    case 'resources': {
      const processes = board('processes')
      return processes ? `${fmtCpu(sum(processes.map(row => row.cpu_percent)))} CPU · ${fmtMem(sum(processes.map(row => row.mem_mb)))}` : ''
    }
    case 'sources': {
      const sources = board('sources')
      return sources ? `${sources.filter(source => source.last_data_ts != null).length} of ${sources.length} tools report data` : ''
    }
    default: return ''
  }
}

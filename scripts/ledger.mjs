import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync, readlinkSync } from 'node:fs'
import { join } from 'node:path'

const code = ['UI source', 'CSS', 'UI tests', 'Backend', 'Backend tests']
const categories = [...code, 'Docs', 'Other']
const excludedRoot = /^(?:.*?\/)?(?:(?:dist|node_modules|vendor)\/|package-lock\.json$)/s
const uiRoot = /(?:^|\/)(?:ui(?:[-_](?:next|v?\d+)|\d+)?|frontend|web)\//
const testDir = /(?:^|\/)(?:__tests__|tests?|e2e|playwright)\//
const usage = `Usage: node scripts/ledger.mjs [--json] [--require-negative] [<base-ref> [<head-ref>]]
       node scripts/ledger.mjs --snapshot [--json] [<ref>]
The default diff compares HEAD with the working tree, including untracked files that Git does not ignore.
The default snapshot reads HEAD. The gate fails only when the code net is positive.`

export function classifyPath(path) {
  if (excludedRoot.test(path)) return 'Excluded'
  if (path.startsWith('docs/') || path.endsWith('.md')) return 'Docs'
  // The Python end-to-end suite also uses test/e2e. Keep its fixtures with it.
  if (/(?:^|\/)(?:e2e|playwright)\//.test(path) && /\.[cm]?[jt]sx?$/.test(path)) return 'UI tests'
  if (path.startsWith('test/')) return 'Backend tests'
  const ui = uiRoot.exec(path)
  if (ui) {
    const local = path.slice(ui.index + ui[0].length)
    if (testDir.test(local) || /\.(?:test|spec)\.[^/]+$/.test(local) ||
        /(?:^|\/)playwright\.config\.[^/]+$/.test(local)) return 'UI tests'
    if (local.endsWith('.css')) return 'CSS'
    if (/^(?:src|app|components|pages|lib)\/.*\.[jt]sx?$/s.test(local)) return 'UI source'
    return 'Other'
  }
  if (path.startsWith('src/')) return 'Backend'
  return 'Other'
}

export function countLines(bytes) {
  if (bytes.length === 0 || bytes.subarray(0, 8000).includes(0)) return 0
  let count = bytes.at(-1) === 10 ? 0 : 1
  for (const byte of bytes) if (byte === 10) count++
  return count
}

function git(cwd, args, options) {
  return execFileSync('git', ['--no-pager', '--no-optional-locks', ...args], {
    cwd, maxBuffer: 64 * 1024 * 1024, ...options,
  })
}

function records(bytes) {
  return bytes.toString('utf8').split('\0').slice(0, -1)
}

function rows(makeRow) {
  return Object.fromEntries(categories.map(name => [name, makeRow()]))
}

function snapshot(root, ref) {
  const lines = rows(() => 0)
  const excluded = []
  const blobs = []
  // ls-files describes the current index. ls-tree lists the files in the requested ref.
  for (const entry of records(git(root, ['ls-tree', '-rlz', ref, '--']))) {
    const tab = entry.indexOf('\t')
    const [, type, oid, size] = entry.slice(0, tab).split(/\s+/)
    const path = entry.slice(tab + 1)
    const category = classifyPath(path)
    if (category === 'Excluded') excluded.push(path)
    else if (type === 'blob') blobs.push({ oid, size: Number(size), category })
  }
  // git show writes the raw blobs in order. Use their byte sizes, not text delimiters.
  for (let i = 0; i < blobs.length; i += 32) {
    const batch = blobs.slice(i, i + 32)
    const size = batch.reduce((sum, blob) => sum + blob.size, 0)
    const bytes = git(root, ['show', '--stdin'], {
      input: batch.map(blob => blob.oid).join('\n') + '\n', maxBuffer: size + 65536,
    })
    if (bytes.length !== size) throw new Error('Git returned an unexpected blob size.')
    let offset = 0
    for (const blob of batch) {
      lines[blob.category] += countLines(bytes.subarray(offset, offset + blob.size))
      offset += blob.size
    }
  }
  return { mode: 'snapshot', ref, categories: lines,
    codeLines: code.reduce((sum, name) => sum + lines[name], 0), excluded }
}

export function codeChanges(changes) {
  const sum = key => code.reduce((total, name) => total + changes[name][key], 0)
  const added = sum('added')
  const deleted = sum('deleted')
  return { added, deleted, net: added - deleted }
}

export function gateExitCode(requireNegative, net) {
  return requireNegative && net > 0 ? 1 : 0
}

function diff(root, base, head) {
  const changes = rows(() => ({ added: 0, deleted: 0, net: 0 }))
  const excluded = new Set()
  function add(path, added, deleted) {
    const category = classifyPath(path)
    if (category === 'Excluded') return excluded.add(path)
    changes[category].added += added
    changes[category].deleted += deleted
    changes[category].net += added - deleted
  }
  // Count a move at both paths so that a move between categories transfers its lines.
  const args = ['diff', '--numstat', '-z', '--no-renames', '--no-ext-diff', '--no-textconv',
    '--ignore-submodules=all', base, ...(head ? [head] : []), '--']
  for (const entry of records(git(root, args))) {
    const [, added, deleted, path] = /^(\d+|-)\t(\d+|-)\t(.*)$/s.exec(entry)
    add(path, added === '-' ? 0 : Number(added), deleted === '-' ? 0 : Number(deleted))
  }
  if (!head) {
    for (const path of records(git(root, ['ls-files', '-z', '--others', '--exclude-standard']))) {
      if (classifyPath(path) === 'Excluded') { excluded.add(path); continue }
      const file = join(root, path)
      const stat = lstatSync(file)
      if (stat.isFile()) add(path, countLines(readFileSync(file)), 0)
      if (stat.isSymbolicLink()) add(path, countLines(readlinkSync(file, { encoding: 'buffer' })), 0)
    }
  }
  return { mode: 'diff', base, head: head ?? 'working tree', categories: changes,
    code: codeChanges(changes), excluded: [...excluded].sort() }
}

function printTable(report) {
  const isSnapshot = report.mode === 'snapshot'
  const format = (label, values) => label.padEnd(14) + values.map(n => String(n).padStart(10)).join('')
  console.log(isSnapshot ? `Snapshot: ${report.ref}` : `Diff: ${report.base} -> ${report.head}`)
  console.log(format('Category', isSnapshot ? ['Lines'] : ['Added', 'Deleted', 'Net']))
  for (const [label, row] of [...Object.entries(report.categories), ['Code total', report.codeLines ?? report.code]]) {
    console.log(format(label, isSnapshot ? [row] : [row.added, row.deleted, row.net]))
  }
  const roots = new Set(report.excluded.map(path => excludedRoot.exec(path)[0]))
  console.log(`Excluded (${report.excluded.length} files): ${[...roots].sort().join(', ') || 'none'}`)
}

function main(args) {
  if (args.includes('--help')) { console.log(usage); return 0 }
  const flags = args.filter(arg => arg.startsWith('-'))
  const refs = args.filter(arg => !arg.startsWith('-'))
  const isSnapshot = flags.includes('--snapshot')
  const requireNegative = flags.includes('--require-negative')
  if (flags.some(flag => !['--snapshot', '--json', '--require-negative'].includes(flag)) ||
      refs.length > (isSnapshot ? 1 : 2) || (isSnapshot && requireNegative)) throw new Error(usage)
  const root = git(process.cwd(), ['rev-parse', '--show-toplevel']).toString().trimEnd()
  const [base = 'HEAD', head] = refs
  const report = isSnapshot ? snapshot(root, base) : diff(root, base, head)
  if (flags.includes('--json')) console.log(JSON.stringify(report, null, 2))
  else printTable(report)
  return isSnapshot ? 0 : gateExitCode(requireNegative, report.code.net)
}

if (import.meta.main) {
  try { process.exitCode = main(process.argv.slice(2)) }
  catch (error) { console.error(error.message); process.exitCode = 2 }
}

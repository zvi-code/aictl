/**
 * What a shell tool call ran, read from its command text: the first program, and how many more
 * programs follow in a pipeline or chain. Pure and conservative: when the text does not name a
 * program plainly, the answer is undefined and the caller keeps the tool name. Nothing is guessed.
 *
 * Rules, in order, for each part of the command split at `;`, `&&`, `||`, `|`, `&` and new lines:
 * - a part that only sets a variable (`FOO=1`, `$ErrorActionPreference='Stop'`) or changes the folder
 *   (`cd`, `pushd`, `Set-Location`, `sl`) is setup, not a program, and is not counted;
 * - leading `FOO=1` assignments, `sudo`, `env`, `time`, `nohup`, `exec`, `command`, `builtin`, the
 *   shell keywords `if`/`then`/`do`/`else`/`elif`/`while`/`until`/`!`, a subshell `(` and the
 *   PowerShell call operator `&` are skipped;
 * - a wrapper (`bash -lc '…'`, `sh -c`, `zsh -c`, `cmd /c …`, `pwsh -c`, `powershell -Command …`) is
 *   read again from its inner command;
 * - the program is the base name of the first word, without a Windows `.exe`/`.cmd`/`.bat`/`.ps1`
 *   ending; `python -m pytest` (also `python3`, `py`) names the module, `pytest`;
 * - a first word that is not a plain name (a variable, an expression, a loop header) means unknown.
 */

export interface Program {
  /** The program that ran first: `git`, `python`, `pytest`. */
  program: string
  /** How many more programs follow in a pipeline or chain. */
  more: number
  /**
   * The first meaningful argument of that program: not a flag, not a redirection; `-C <dir>` and `-c <x>` of git are
   * skipped, and `run` keeps the script it runs (`npm run build`). Absent when the program has none.
   */
  arg?: string
}

/** Tool names whose argument is a command line for a shell. Compared without case. */
export const SHELL_TOOLS: ReadonlySet<string> = new Set([
  'bash', 'sh', 'zsh', 'shell', 'powershell', 'pwsh', 'cmd', 'run_in_terminal', 'exec', 'exec_command',
  'shell_command', 'local_shell', 'run_command', 'run_shell_command', 'execute_command', 'terminal',
])

export const isShellTool = (name: string | null | undefined) => !!name && SHELL_TOOLS.has(name.toLowerCase())

type Token = { text: string; quoted: boolean } | { op: string }

const isOp = (token: Token | undefined): token is { op: string } => !!token && 'op' in token

/** Words and separators of a command line, with quotes, here-strings and heredocs kept whole. */
function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let word = '', quoted = false, started = false
  const flush = () => { if (started) tokens.push({ text: word, quoted }); word = ''; quoted = false; started = false }
  const op = (value: string) => { flush(); tokens.push({ op: value }) }
  let heredoc: string | undefined
  for (let i = 0; i < source.length; i++) {
    const c = source[i], next = source[i + 1]
    // PowerShell here-strings: @' … '@ and @" … "@, closed at the start of a line.
    if (c === '@' && (next === "'" || next === '"') && !started) {
      const close = source.indexOf(`\n${next}@`, i + 2)
      const end = close < 0 ? source.length : close + 3
      word += source.slice(i, end); quoted = true; started = true; i = end - 1
      continue
    }
    if (c === "'" || c === '"') {
      let j = i + 1
      while (j < source.length && source[j] !== c) {
        if (c === '"' && (source[j] === '\\' || source[j] === '`')) j++
        j++
      }
      // A word is quoted when it starts with a quote; `BAR="a b"` stays an assignment.
      if (!started) quoted = true
      word += source.slice(i + 1, j); started = true; i = j
      continue
    }
    if (c === '\\' && next !== undefined && next !== '\n' && !/[A-Za-z0-9 _.-]/.test(next)) { word += next; started = true; i++; continue }
    if (c === '\n') {
      op('\n')
      if (heredoc != null) {
        // Skip the body of a heredoc up to its closing line.
        const lines = source.slice(i + 1).split('\n')
        let skip = 0, found = false
        for (const line of lines) { skip += line.length + 1; if (line.trim() === heredoc) { found = true; break } }
        i += found ? skip : source.length
        heredoc = undefined
      }
      continue
    }
    if (c === ' ' || c === '\t' || c === '\r') { flush(); continue }
    if (c === '<' && next === '<' && source[i + 2] !== '<') {
      const match = /^<<-?\s*(['"]?)([A-Za-z_][\w-]*)\1/.exec(source.slice(i))
      if (match) { heredoc = match[2]; flush(); i += match[0].length - 1; continue }
    }
    if (c === '&' && next === '&') { op('&&'); i++; continue }
    if (c === '|' && next === '|') { op('||'); i++; continue }
    if (c === '|') { op('|'); continue }
    if (c === ';') { op(';'); continue }
    if (c === '&') {
      // `2>&1`, `>&2` and `&>` are redirections, not separators.
      if (source[i - 1] === '>' || source[i - 1] === '<' || next === '>') { word += c; started = true; continue }
      // At the start of a part, `&` is the PowerShell call operator.
      const last = tokens.at(-1)
      if (!started && (!last || isOp(last))) { op('call'); continue }
      op('&'); continue
    }
    if (c === '(' && !started) { op('('); continue }
    if (c === ')' && !started) { op(')'); continue }
    word += c; started = true
  }
  flush()
  return tokens
}

const SEPARATORS = new Set([';', '&&', '||', '|', '&', '\n'])
const PREFIXES = new Set(['sudo', 'env', 'time', 'nohup', 'exec', 'command', 'builtin', 'if', 'then', 'do', 'else', 'elif', 'while', 'until', '!', '{'])
const ENDS = new Set(['fi', 'done', 'esac', '}', 'end'])
const FOLDER = new Set(['cd', 'pushd', 'popd', 'set-location', 'sl', 'chdir'])
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'fish'])
const POWERSHELLS = new Set(['pwsh', 'powershell'])
const PYTHONS = new Set(['python', 'python3', 'py'])
const NAME = /^[A-Za-z0-9_][A-Za-z0-9_.+-]*$/

/** The base name of a path, without a Windows program ending. */
function baseName(word: string) {
  const name = word.split(/[\\/]/).pop() ?? ''
  return name.replace(/\.(exe|cmd|bat|com|ps1)$/i, '')
}

type Part = { words: { text: string; quoted: boolean }[]; call: boolean }

function partsOf(tokens: readonly Token[]): Part[] {
  const parts: Part[] = []
  let current: Part = { words: [], call: false }
  const end = () => { if (current.words.length || current.call) parts.push(current); current = { words: [], call: false } }
  for (const token of tokens) {
    if (isOp(token)) {
      if (SEPARATORS.has(token.op)) end()
      else if (token.op === 'call') current.call = true
      continue
    }
    current.words.push(token)
  }
  end()
  return parts
}

type Ran = { program: string; args: string[] }
type Read = Ran | 'setup' | 'unknown'

function readPart(part: Part, depth: number): Read | { inner: string } {
  const words = [...part.words]
  while (words.length) {
    const first = words[0]
    const lower = first.text.toLowerCase()
    if (!first.quoted && /^[A-Za-z_][A-Za-z0-9_]*=/.test(first.text)) { words.shift(); continue }
    if (!first.quoted && PREFIXES.has(lower)) { words.shift(); continue }
    break
  }
  if (!words.length) return part.call ? 'unknown' : 'setup'
  const first = words[0]
  const lower = first.text.toLowerCase()
  if (!first.quoted && ENDS.has(lower)) return 'setup'
  if (!first.quoted && first.text.startsWith('$')) {
    // `$x = …` sets a variable; `$x.Method()` or `$x` alone runs something unknown.
    return words[1]?.text === '=' || /^\$[\w:]+\s*=/.test(first.text) || /^\$[\w:]+=/.test(first.text) ? 'setup' : 'unknown'
  }
  if (!first.quoted && /^\[[^\]]*\]/.test(first.text)) return 'unknown'
  const name = baseName(first.text)
  const key = name.toLowerCase()
  if (!part.call && FOLDER.has(key)) return 'setup'
  if (!first.quoted && /^(for|foreach|case|select|function)$/.test(key)) return 'unknown'
  if (depth < 3 && SHELLS.has(key)) {
    const flag = words.findIndex((word, index) => index > 0 && !word.quoted && /^-[a-z]*c[a-z]*$/.test(word.text))
    if (flag > 0 && words[flag + 1]) return { inner: words[flag + 1].text }
  }
  if (depth < 3 && key === 'cmd') {
    const flag = words.findIndex((word, index) => index > 0 && /^\/[ck]$/i.test(word.text))
    if (flag > 0 && words.length > flag + 1) return { inner: words.slice(flag + 1).map(word => word.quoted ? `"${word.text}"` : word.text).join(' ') }
  }
  if (depth < 3 && POWERSHELLS.has(key)) {
    const flag = words.findIndex((word, index) => index > 0 && /^-(c|command)$/i.test(word.text))
    if (flag > 0 && words.length > flag + 1) {
      const rest = words.slice(flag + 1)
      return { inner: rest.length === 1 ? rest[0].text : rest.map(word => word.quoted ? `'${word.text}'` : word.text).join(' ') }
    }
  }
  const rest = (from: number) => words.slice(from).map(word => word.text)
  if (PYTHONS.has(key) && words[1]?.text === '-m' && words[2] && NAME.test(words[2].text)) return { program: words[2].text, args: rest(3) }
  if (!name || !NAME.test(name)) return 'unknown'
  return { program: name, args: rest(1) }
}

const UNKNOWN: Ran = { program: '?', args: [] }

function programsOf(command: string, depth: number): Ran[] | undefined {
  const programs: Ran[] = []
  for (const part of partsOf(tokenize(command))) {
    const read = readPart(part, depth)
    if (read === 'setup') continue
    if (read === 'unknown') {
      // An unknown first part leaves the program unknown; an unknown later part still counts as one more.
      if (!programs.length) return undefined
      programs.push(UNKNOWN)
      continue
    }
    if ('inner' in read) {
      const inner = programsOf(read.inner, depth + 1)
      if (!inner) { if (!programs.length) return undefined; programs.push(UNKNOWN); continue }
      programs.push(...inner)
      continue
    }
    programs.push(read)
  }
  return programs
}

/** The program a command line ran first, and how many more follow; undefined when not plain. */
export function programOf(command: string | null | undefined): Program | undefined {
  const text = (command ?? '').trim()
  if (!text) return undefined
  const programs = programsOf(text, 0)
  if (!programs?.length || programs[0] === UNKNOWN) return undefined
  const arg = firstArgument(programs[0])
  return { program: programs[0].program, more: programs.length - 1, ...arg ? { arg } : {} }
}

const REDIRECT = /^(\d*[<>]|&>)/
const VALUE_FLAGS: Record<string, ReadonlySet<string>> = { git: new Set(['-C', '-c']) }

/** The first argument of a program that says what it worked on: see `Program.arg`. */
function firstArgument(ran: Ran) {
  const flags = VALUE_FLAGS[ran.program.toLowerCase()]
  for (let index = 0; index < ran.args.length; index++) {
    const word = ran.args[index]
    if (REDIRECT.test(word)) {
      if (/^\d*[<>]{1,2}$|^&>$/.test(word)) index++
      continue
    }
    if (flags?.has(word)) { index++; continue }
    if (word.startsWith('-') || !word) continue
    const next = ran.args[index + 1]
    return word === 'run' && next && !next.startsWith('-') && !REDIRECT.test(next) ? `run ${next}` : word
  }
  return undefined
}

/** "git", or "git +2" when two more programs follow. */
export const programLabel = (program: Program) => program.more ? `${program.program} +${program.more}` : program.program

/**
 * What a shell call ran, for a title: the program and its first meaningful argument, a path cut to its last
 * part ("python3 run.py", "git status", "pytest tests"), and "+2" when two more programs follow.
 */
export function programHeadline(program: Program) {
  const arg = program.arg && (/[\\/]/.test(program.arg) && !/^[a-z]+:\/\//i.test(program.arg)
    ? program.arg.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || program.arg : program.arg)
  return [program.program, arg, program.more ? `+${program.more}` : ''].filter(Boolean).join(' ')
}

/** The command text of a shell call: the `command` argument when the arguments are JSON, else the text. */
export function commandText(params: string | null | undefined, target: string | null | undefined) {
  if (params) {
    try {
      const parsed = JSON.parse(params) as unknown
      if (parsed && typeof parsed === 'object') {
        const args = parsed as Record<string, unknown>
        for (const key of ['command', 'cmd', 'commandLine', 'script']) {
          const value = args[key]
          if (typeof value === 'string' && value.trim()) return value
          if (Array.isArray(value) && value.every(item => typeof item === 'string')) return (value as string[]).map(item => /\s/.test(item) ? `'${item}'` : item).join(' ')
        }
      }
    } catch { /* not JSON: the target has the command */ }
  }
  return target ?? ''
}

const SETUP = /^\s*(?:(?:cd|pushd|popd|chdir|set-location|sl)(?:\s[^;&|\n]*)?|export\s+[^;&|\n]*|[A-Za-z_]\w*=[^\s;&|]*)\s*(?:&&|;|\n)\s*/i

/** A variable set for the command that follows it: `PYTHONPATH=src python …`. */
const ASSIGN = /^\s*[A-Za-z_]\w*=[^\s;&|]*\s+/

/**
 * A command line without its leading setup (`cd …`, `pushd …`, `export …`, `X=…` followed by `&&` or `;`, and variables set for the command), for a title
 * when the program itself cannot be named plainly: what runs is shown, not how the shell got there.
 */
export function withoutSetup(command: string) {
  let text = command
  for (let match = SETUP.exec(text) ?? ASSIGN.exec(text); match && match[0].length < text.length; match = SETUP.exec(text) ?? ASSIGN.exec(text)) {
    text = text.slice(match[0].length)
  }
  return text
}

type InlineTag = 'span' | 'code' | 'strong' | 'em' | 'del'
export type Inline = string
  | { tag: InlineTag; children: Inline[] }
  | { tag: 'a'; href: string; children: Inline[] }
  | { tag: 'image'; url: string; label: string }
  | { tag: 'br' }

type Align = 'left' | 'center' | 'right' | undefined
export type Block = { type: 'p' | 'heading'; level?: number; text: Inline[] }
  | { type: 'code'; text: string; language?: string }
  | { type: 'hr' }
  | { type: 'quote'; blocks: Block[] }
  | { type: 'list'; ordered: boolean; items: { task?: boolean; blocks: Block[] }[] }
  | { type: 'table'; head: Inline[][]; rows: Inline[][][]; align: Align[] }

const fence = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)/
const heading = /^ {0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/
const rule = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/
const item = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/
const quote = /^ {0,3}>\s?(.*)$/
const separator = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/
const bareUrl = /https?:\/\/[^\s<>]+/y
const blank = (line: string) => !line.trim()
const indent = (line: string) => /^\s*/.exec(line)![0].replace(/\t/g, '    ').length
const startsBlock = (line: string) => [fence, heading, rule, quote, item].some(pattern => pattern.test(line))

function findClose(text: string, from: number, delimiter: string) {
  for (let i = from; i < text.length; i++) {
    if (text[i] === '\\') { i++; continue }
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1)
      if (end !== -1) i = end
      continue
    }
    if (delimiter.length === 1 && (text[i - 1] === delimiter || text[i + 1] === delimiter)) continue
    if (i > from && text.startsWith(delimiter, i)) return i
  }
  return -1
}

function matchBracket(text: string, start: number, open: string, close: string) {
  let depth = 0
  for (let i = start; i < text.length; i++) {
    if (text[i] === '\\') { i++; continue }
    if (text[i] === open) depth++
    else if (text[i] === close && --depth === 0) return i
  }
  return -1
}

function inline(text: string, allowLinks = true): Inline[] {
  const out: Inline[] = []
  let buffer = ''
  const flush = () => { if (buffer) { out.push(buffer); buffer = '' } }
  for (let i = 0; i < text.length;) {
    const ch = text[i]
    if (ch === '\\' && /[\\`*_{}[\]()#+\-.!|~<>]/.test(text[i + 1] ?? '')) {
      buffer += text[i + 1]; i += 2; continue
    }
    if (ch === '\n') {
      if (buffer.endsWith('  ') || buffer.endsWith('\\')) {
        buffer = buffer.replace(/( {2,}|\\)$/, '')
        flush(); out.push({ tag: 'br' })
      } else buffer += ' '
      i++; continue
    }
    if (ch === '`') {
      let n = 1
      while (text[i + n] === '`') n++
      const run = '`'.repeat(n)
      const end = text.indexOf(run, i + n)
      if (end !== -1) {
        flush()
        out.push({ tag: 'code', children: [text.slice(i + n, end).replace(/^ (.*) $/, '$1')] })
        i = end + n; continue
      }
      buffer += run; i += n; continue
    }
    if ((ch === '!' && text[i + 1] === '[') || ch === '[') {
      const image = ch === '!'
      const open = image ? i + 1 : i
      const close = matchBracket(text, open, '[', ']')
      if (close !== -1 && text[close + 1] === '(') {
        const end = matchBracket(text, close + 1, '(', ')')
        if (end !== -1) {
          flush()
          const label = text.slice(open + 1, close)
          const url = text.slice(close + 2, end).trim().split(/\s+/)[0]
          if (image) out.push({ tag: 'image', url, label })
          else if (allowLinks && /^(https?:|mailto:)/i.test(url)) out.push({ tag: 'a', href: url, children: inline(label, false) })
          else out.push({ tag: 'span', children: inline(label, false) })
          i = end + 1; continue
        }
      }
    }
    if (allowLinks && ch === 'h' && (i === 0 || /[\s(]/.test(text[i - 1]))) {
      bareUrl.lastIndex = i
      const match = bareUrl.exec(text)
      if (match) {
        const url = match[0].replace(/[.,;:!?)\]'"]+$/, '')
        if (url.length > 'http://'.length && !url.endsWith('://')) {
          flush(); out.push({ tag: 'a', href: url, children: [url] })
          i += url.length; continue
        }
      }
    }
    if (ch === '*' || ch === '_' || ch === '~') {
      const wide = text.startsWith(ch + ch, i)
      const delimiter = ch === '~' && !wide ? null : wide ? ch + ch : ch
      if (delimiter && !(ch === '_' && i > 0 && /\w/.test(text[i - 1])) && !/\s/.test(text[i + delimiter.length] || ' ')) {
        const end = findClose(text, i + delimiter.length, delimiter)
        if (end !== -1) {
          flush()
          out.push({
            tag: ch === '~' ? 'del' : wide ? 'strong' : 'em',
            children: inline(text.slice(i + delimiter.length, end), allowLinks),
          })
          i = end + delimiter.length; continue
        }
      }
    }
    buffer += ch; i++
  }
  flush()
  return out
}

function splitRow(line: string) {
  let text = line.trim()
  if (text.startsWith('|')) text = text.slice(1)
  if (text.endsWith('|') && !text.endsWith('\\|')) text = text.slice(0, -1)
  return text.split(/(?<!\\)\|/).map(cell => cell.trim().replace(/\\\|/g, '|'))
}

function frontMatter(lines: string[]) {
  if (lines[0] !== '---') return
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
  if (end < 0) return
  const rows: [string, string][] = []
  for (const line of lines.slice(1, end)) {
    if (blank(line)) continue
    const match = /^([A-Za-z0-9_.-]+):\s*(.*)$/.exec(line)
    if (match) rows.push([match[1], match[2]])
    else if (rows.length) {
      const last = rows[rows.length - 1]
      last[1] += (last[1] ? '\n' : '') + line.trim()
    }
  }
  return { rows, end }
}

function parseList(lines: string[], start: number): [Block, number] {
  const base = indent(lines[start])
  const ordered = /\d/.test(item.exec(lines[start])![2])
  const items: { task?: boolean; blocks: Block[] }[] = []
  let i = start
  while (i < lines.length) {
    const match = item.exec(lines[i])
    if (!match || indent(lines[i]) !== base || /\d/.test(match[2]) !== ordered) break
    const task = /^\[([ xX])\]\s+(.*)$/.exec(match[3])
    const body = [task ? task[2] : match[3]]
    for (i++; i < lines.length;) {
      const line = lines[i]
      if (blank(line)) {
        let next = i
        while (next < lines.length && blank(lines[next])) next++
        if (next < lines.length && indent(lines[next]) > base) { body.push(''); i++; continue }
        break
      }
      if (indent(line) <= base) break
      body.push(line.replace(/^\s{1,4}/, ''))
      i++
    }
    items.push({ task: task ? task[1] !== ' ' : undefined, blocks: blocksOf(body) })
    let next = i
    while (next < lines.length && blank(lines[next])) next++
    const nextItem = next < lines.length && item.exec(lines[next])
    if (nextItem && indent(lines[next]) === base && /\d/.test(nextItem[2]) === ordered) i = next
  }
  return [{ type: 'list', ordered, items }, i]
}

function blocksOf(lines: string[]): Block[] {
  const out: Block[] = []
  for (let i = 0; i < lines.length;) {
    const line = lines[i]
    if (blank(line)) { i++; continue }
    const fenced = fence.exec(line)
    if (fenced) {
      const end = new RegExp(`^ {0,3}${fenced[1][0]}{${fenced[1].length},}\\s*$`)
      const body = []
      for (i++; i < lines.length && !end.test(lines[i]); i++) body.push(lines[i])
      i++
      out.push({ type: 'code', text: body.join('\n'), language: fenced[2] || undefined })
      continue
    }
    const title = heading.exec(line)
    if (title) { out.push({ type: 'heading', level: title[1].length, text: inline(title[2]) }); i++; continue }
    if (rule.test(line)) { out.push({ type: 'hr' }); i++; continue }
    if (quote.test(line)) {
      const body = []
      while (i < lines.length) {
        const match = quote.exec(lines[i])
        if (!match) break
        body.push(match[1]); i++
      }
      out.push({ type: 'quote', blocks: blocksOf(body) })
      continue
    }
    if (item.test(line)) {
      const [list, next] = parseList(lines, i)
      out.push(list); i = next; continue
    }
    const next = lines[i + 1]
    if (line.includes('|') && next?.includes('|') && separator.test(next)) {
      const head = splitRow(line).map(text => inline(text))
      const align = splitRow(next).map(cell => cell.endsWith(':') ? cell.startsWith(':') ? 'center' : 'right'
        : cell.startsWith(':') ? 'left' : undefined)
      const rows = []
      for (i += 2; i < lines.length && !blank(lines[i]) && lines[i].includes('|'); i++) {
        const cells = splitRow(lines[i])
        rows.push(head.map((_, column) => inline(cells[column] ?? '')))
      }
      out.push({ type: 'table', head, rows, align })
      continue
    }
    if (indent(line) >= 4) {
      const body = []
      while (i < lines.length && (indent(lines[i]) >= 4 || (blank(lines[i]) && i + 1 < lines.length && indent(lines[i + 1]) >= 4))) {
        body.push(lines[i++].replace(/^( {4}|\t)/, ''))
      }
      out.push({ type: 'code', text: body.join('\n') })
      continue
    }
    const paragraph = [line.trimStart()]
    for (i++; i < lines.length && !blank(lines[i]) && !startsBlock(lines[i]); i++) paragraph.push(lines[i].trimStart())
    out.push({ type: 'p', text: inline(paragraph.join('\n')) })
  }
  return out
}

export function parseMarkdown(text: string | null | undefined) {
  const lines = (text ?? '').replace(/\r\n?/g, '\n').split('\n')
  const front = frontMatter(lines)
  return { front: front?.rows ?? [], blocks: blocksOf(front ? lines.slice(front.end + 1) : lines) }
}

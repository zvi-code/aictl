import { createReadStream } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { createGunzip } from 'node:zlib'

// From the UI directory, run: node test\fixtures\gallery\extract.mjs
const recordings = new URL('../../../../../../../test/recordings/', import.meta.url)

async function* records(window, file) {
  const input = createReadStream(new URL(`${window}/${file}.jsonl.gz`, recordings))
  const stream = input.pipe(createGunzip())
  input.on('error', error => stream.destroy(error))
  for await (const line of createInterface({ input: stream, crlfDelay: Infinity })) yield JSON.parse(line)
}

async function sample(window) {
  const agents = new Map()
  const cpu = new Map()
  let hasMachineTopic = false
  for await (const { event, data } of records(window, 'main-sse')) {
    if (event === 'bootstrap') hasMachineTopic ||= Boolean(data.capabilities.topics['runtime.machine'])
    if (event !== 'bootstrap' && event !== 'change') continue
    for (const entity of data.entities ?? data.upserts) {
      const { topic, data: entry } = entity
      if (topic === 'history.board' && entry.field === 'agents' && entry.key && agents.size < 36 && !agents.has(entry.key)) {
        const { tool, msgs, input, output } = entry.value
        agents.set(entry.key, { key: entry.key, tool, msgs, input, output })
      }
      if (topic === 'runtime.machine' && entry.cpu_per_core) {
        cpu.set(entry.generated_at, { x: entry.generated_at, values: entry.cpu_per_core.slice(0, 2) })
      }
    }
  }
  const excerpt = []
  for await (const record of records(window, 'main-rest')) {
    if (record.phase === 'start' && record.status === 200 && record.route === '/api/board/excerpt') {
      for (const { n, text } of record.body.lines) excerpt.push({ n, text })
      break
    }
  }
  if (!agents.size || !cpu.size || !excerpt.length || !hasMachineTopic) throw new Error(`Missing sample data: ${window}`)
  const samples = [...cpu.values()].sort((first, second) => first.x - second.x)
  const count = Math.min(16, samples.length)
  return {
    agents: [...agents.values()],
    cpu: count < 2 ? samples : Array.from({ length: count }, (_, i) =>
      samples[Math.round(i * (samples.length - 1) / (count - 1))]),
    excerpt,
    topics: ['runtime.machine'],
  }
}

const quiet = await sample('quiet')
const busy = await sample('busy')
await writeFile(new URL('./recording.json', import.meta.url), JSON.stringify({ quiet, busy }, null, 2) + '\n')

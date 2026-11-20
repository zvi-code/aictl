import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyPath, codeChanges, countLines, gateExitCode } from './ledger.mjs'

test('classify source, tests, docs and exclusions before the broad src and test rules', () => {
  const ui = 'src/aictl/dashboard/ui'
  const cases = [
    [`${ui}/src/main.js`, 'UI source'], ['frontend/src/Board.tsx', 'UI source'],
    [`${ui}/src/Board.module.css`, 'CSS'], [`${ui}/src/model.test.ts`, 'UI tests'],
    [`${ui}/test/fixtures/live.js`, 'UI tests'], [`${ui}/playwright.config.ts`, 'UI tests'],
    ['test/e2e/board.spec.ts', 'UI tests'], ['test/e2e/test_hook_flow.py', 'Backend tests'],
    ['test/fixtures/ui/src/input.ts', 'Backend tests'],
    ['test/e2e/payloads/input.json', 'Backend tests'], ['src/aictl/storage.py', 'Backend'],
    ['src/aictl/queries/read.kql', 'Backend'], ['src/aictl/data/settings.yaml', 'Backend'],
    ['docs/migration/input.json', 'Docs'], [`${ui}/README.md`, 'Docs'],
    [`${ui}/vite.config.js`, 'Other'], ['scripts/ledger.test.mjs', 'Other'],
    ['src/aictl/dashboard/dist/main.js', 'Excluded'], [`${ui}/package-lock.json`, 'Excluded'],
    [`${ui}/node_modules/pkg/README.md`, 'Excluded'], ['vendor/example/test/case.js', 'Excluded'],
  ]
  for (const [path, expected] of cases) assert.equal(classifyPath(path), expected, path)
})

test('the gate checks the combined code net and permits zero', () => {
  const changes = {
    'UI source': { added: 3, deleted: 0 }, CSS: { added: 1, deleted: 0 },
    'UI tests': { added: 1, deleted: 0 }, Backend: { added: 0, deleted: 4 },
    'Backend tests': { added: 0, deleted: 0 }, Docs: { added: 0, deleted: 100 },
    Other: { added: 200, deleted: 0 },
  }
  assert.deepEqual(codeChanges(changes), { added: 5, deleted: 4, net: 1 })
  assert.equal(gateExitCode(false, codeChanges(changes).net), 0)
  for (const [deleted, status] of [[0, 1], [1, 0], [2, 0]]) {
    changes['Backend tests'].deleted = deleted
    assert.equal(gateExitCode(true, codeChanges(changes).net), status)
  }
})

test('count blank and unterminated lines but not binary data', () => {
  for (const [text, lines] of [['', 0], ['\n', 1], ['a\r\n\r\nb', 3], ['a\nb\n', 2], ['a\0b\n', 0]]) {
    assert.equal(countLines(Buffer.from(text)), lines)
  }
})

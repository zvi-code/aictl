import { describe, expect, it } from 'vitest'
import { commandText, isShellTool, programHeadline, programLabel, programOf } from '../src/drawer/shellCommand'

const label = (command: string) => { const program = programOf(command); return program && programLabel(program) }

describe('DRW-FL-08 · What a shell call ran', () => {
  it.each([
    ['git status --short', 'git'],
    ['FOO=1 BAR="a b" npm test', 'npm'],
    ['cd src/app && python -m pytest tests -q', 'pytest'],
    ['python3 -m pytest -x', 'pytest'],
    ['python scripts/run.py --fast', 'python'],
    ['sudo apt-get install -y jq', 'apt-get'],
    ['git add -A && git commit -m "fix: a; b | c" && git push', 'git +2'],
    ['rg -n "def handle" src | head -20', 'rg +1'],
    ['npm run build 2>&1 | tail -20', 'npm +1'],
    ['make test >/dev/null 2>&1 & echo started', 'make +1'],
    ["bash -lc 'cd /repo && pytest -q'", 'pytest'],
    ['sh -c "ls -la"', 'ls'],
    ['cmd /c dir C:\\src', 'dir'],
    ['/usr/local/bin/node server.js', 'node'],
    ['./scripts/check.sh --all', 'check.sh'],
    ['(cd web && npm ci)', 'npm'],
    ['if git diff --quiet; then echo clean; fi', 'git +1'],
    ["cat <<'EOF' > notes.txt\nline one; with | separators\nEOF\nwc -l notes.txt", 'cat +1'],
    // PowerShell
    ["$ErrorActionPreference='Stop'; git status --short | Select-Object -First 20", 'git +1'],
    ["$env:PYTHONPATH = 'src'; python -m pytest test -q", 'pytest'],
    ["& 'C:\\Program Files\\Git\\bin\\git.exe' log --oneline -5", 'git'],
    ['& "C:\\Tools\\dotnet\\dotnet.exe" build', 'dotnet'],
    ['Set-Location C:\\src; Get-ChildItem -Recurse | Measure-Object', 'Get-ChildItem +1'],
    ['pwsh -NoProfile -Command "Get-Process | Sort-Object CPU"', 'Get-Process +1'],
    ["powershell.exe -c 'npm.cmd install'", 'npm'],
    ["$body = @'\nline; with | pipes\n'@; Invoke-RestMethod -Body $body http://x", 'Invoke-RestMethod'],
    ['C:\\Python312\\python.exe -m pip install -r requirements.txt', 'pip'],
  ])('%j runs %s', (command, expected) => {
    expect(label(command)).toBe(expected)
  })

  it.each([
    [''], ['   '], ['$x.Dispose()'], ['for f in *.py; do black $f; done'], ['[System.IO.File]::ReadAllText("a")'],
    ['$ErrorActionPreference = "Stop"'], ['cd /tmp'], ['& $exe --version'],
  ])('does not guess a program for %j', command => {
    expect(programOf(command)).toBeUndefined()
  })

  it('knows the shell tools by name, without case, and reads the command argument of JSON arguments', () => {
    expect(['Bash', 'powershell', 'shell', 'run_in_terminal', 'exec_command'].every(isShellTool)).toBe(true)
    expect(['Read', 'read_powershell', 'view', 'rg', undefined].some(isShellTool)).toBe(false)
    expect(commandText('{"command":"git log -1","description":"x"}', 'git log -1')).toBe('git log -1')
    expect(commandText('{"cmd":["bash","-lc","make all"]}', '')).toBe("bash -lc 'make all'")
    expect(label(commandText('{"cmd":["bash","-lc","make all"]}', ''))).toBe('make')
    expect(commandText('not json', 'ls -la')).toBe('ls -la')
    expect(commandText(null, 'ls -la')).toBe('ls -la')
  })

  it.each([
    // The title skips a leading cd, pushd or variable and names the program with its first meaningful argument.
    ['cd /Users/zvi/Projects/aictl && python3 scripts/flow_check.py --all', 'python3 flow_check.py'],
    ['pushd src >/dev/null; git -C /repo status --short', 'git status'],
    ['FOO=1 AZURE_CONFIG_DIR=/x python -m pytest test/test_flow.py -q', 'pytest test_flow.py'],
    ['cd /repo && npm run build 2>&1 | tail -20', 'npm run build +1'],
    ['time make test', 'make test'],
    ['make', 'make'],
    ['grep -n "def x" src/a.py | head', 'grep def x +1'],
    ['curl -s http://localhost:8484/api/x', 'curl http://localhost:8484/api/x'],
    ['echo hi > out.txt', 'echo hi'],
  ])('titles %j as %j', (command, expected) => {
    const program = programOf(command)
    expect(program && programHeadline(program)).toBe(expected)
  })
})

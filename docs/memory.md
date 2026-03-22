# Memory Management

## The Problem

Claude Code writes to `~/.claude/projects/<project>/memory/` as it works. This is loaded every session. When you switch from debug to docs profile, debug memories waste tokens and may confuse the agent.

## The Solution

aictl swaps the memory directory on profile switch. Each profile has its own memory that accumulates independently.

```
~/.claude/projects/<project>/
├── memory/                  ← active (what Claude Code sees)
├── memory--debug/           ← stashed when not in debug
├── memory--docs/            ← stashed when not in docs
└── memory--review/          ← stashed when not in review
```

## What Happens on Switch

```bash
aictl deploy --root . --profile docs   # switching from debug

# 1. mv memory/ memory--debug/        stash current
# 2. mv memory--docs/ memory/         restore target
#    (or mkdir memory/ if first time)
```

Output:
```
🧠  Memory stashed: debug
🧠  Memory restored: docs
```

## What aictl Never Does

- Never reads memory file contents during deploy
- Never writes to memory files
- Never deletes memory content
- Only renames directories

## Memory Hints

The `[memory:profile]` section in `.aictx` provides hints that help the agent start a profile with useful context. These are deployed into the instructions, not into the memory directory.

```ini
[memory:debug]
When investigating KE-4012, check connection pool first.
Staging env sometimes has stale DNS.
```

## Commands

```bash
aictl memory show --root .        # files, lines, tokens in active memory
aictl memory stashes --root .     # list all per-profile stashes
```

## Copilot Memory

Copilot Memory is cloud-hosted on GitHub servers. Not accessible locally. Review at repo Settings → Copilot → Memory.

## All Outside-Repo Files

```
~/.claude/
├── CLAUDE.md                user-managed personal prefs
├── settings.json            user-managed
├── commands/*.md             user-managed
└── projects/<hash>/
    └── memory/              Claude writes, aictl SWAPS
        ├── MEMORY.md
        └── *.md

~/.copilot/
├── copilot-instructions.md  user-managed
├── mcp-config.json          user-managed
└── lsp-config.json          user-managed

Cursor: user rules in app settings (not file-accessible)
GitHub: Copilot Memory (cloud-hosted, not accessible)
```

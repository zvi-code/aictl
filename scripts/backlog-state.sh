#!/usr/bin/env bash
# backlog-state.sh — Pre-startup script for backlog
#
# Generates a compact JSON state file that the LLM reads instead of
# parsing 5+ markdown files. Saves ~30K tokens per backlog startup.
#
# Usage: ./scripts/backlog-state.sh [--check-only]
#   --check-only  Exit 0 if work exists, exit 1 if no-op (for early exit)
#
# Output: wip/backlog-state.json

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

CHECKPOINT="wip/backlog-checkpoint.md"
STATE_FILE="wip/backlog-state.json"
TODO_FILE="wip/open-items/TODO.md"

# --- Extract checkpoint metadata ---
checkpoint_exists=false
checkpoint_commit=""
checkpoint_date=""
if [[ -f "$CHECKPOINT" ]]; then
    checkpoint_exists=true
    checkpoint_date=$(grep -m1 '^Updated:' "$CHECKPOINT" 2>/dev/null | sed 's/Updated: //' || echo "")
    # Extract last commit hash from checkpoint
    checkpoint_commit=$(grep -oE '[0-9a-f]{7}' "$CHECKPOINT" | tail -1 || echo "")
fi

# --- Git state ---
head_commit=$(git rev-parse --short HEAD)
head_date=$(git log -1 --format=%ci HEAD)
# Commits since last checkpoint (if we have a checkpoint commit)
commits_since=0
if [[ -n "$checkpoint_commit" ]]; then
    commits_since=$(git rev-list --count "${checkpoint_commit}..HEAD" 2>/dev/null || echo "0")
fi
# Changed files since last checkpoint
changed_files=""
if [[ -n "$checkpoint_commit" ]] && git cat-file -e "${checkpoint_commit}" 2>/dev/null; then
    changed_files=$(git diff --name-only "${checkpoint_commit}..HEAD" 2>/dev/null | head -30 | tr '\n' ',' | sed 's/,$//')
fi

# --- Extract open TODO items (unchecked boxes only) ---
open_items="[]"
if [[ -f "$TODO_FILE" ]]; then
    # Extract lines with unchecked boxes: - [ ] or - []
    # Also grab the next non-empty line if it starts with ** (for details)
    open_items=$(awk '
    /^- \[ ?\]/ {
        gsub(/^- \[ ?\] /, "");
        gsub(/"/, "\\\"");
        # Trim to 200 chars
        if (length > 200) $0 = substr($0, 1, 200) "...";
        items[++n] = $0
    }
    END {
        printf "["
        for (i=1; i<=n; i++) {
            if (i>1) printf ","
            printf "\"%s\"", items[i]
        }
        printf "]"
    }
    ' "$TODO_FILE")
fi

# Count open items
open_count=$(echo "$open_items" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

# --- Extract open H2 sections ---
# A section is "open" if:
#   - Not struck through (~~)
#   - Not marked DONE
#   - Has at least one unchecked item OR no checklist items at all
#     (plain text sections count as open)
open_sections="[]"
if [[ -f "$TODO_FILE" ]]; then
    open_sections=$(awk '
    /^## / {
        # Flush previous section if open
        if (section != "" && !done && (unchecked > 0 || total_checks == 0)) {
            items[++n] = section
        }
        section = $0
        gsub(/^## /, "", section)
        gsub(/"/, "\\\"", section)
        if (length(section) > 150) section = substr(section, 1, 150) "..."
        done = 0; unchecked = 0; total_checks = 0
        if (section ~ /~~/ || section ~ /DONE/ || section ~ /DEFERED/) { done = 1 }
    }
    /^- \[x\]/ { total_checks++ }
    /^- \[ ?\]/ { total_checks++; unchecked++ }
    END {
        if (section != "" && !done && (unchecked > 0 || total_checks == 0)) {
            items[++n] = section
        }
        printf "["
        for (i=1; i<=n; i++) {
            if (i>1) printf ","
            printf "\"%s\"", items[i]
        }
        printf "]"
    }
    ' "$TODO_FILE")
fi

open_section_count=$(echo "$open_sections" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

# --- Extract deferred items from checkpoint ---
deferred_items="[]"
if [[ -f "$CHECKPOINT" ]]; then
    deferred_items=$(awk '
    /^### (Not aligned|External)/ { capture=1; next }
    /^###? / && capture { capture=0 }
    capture && /^[0-9]+\./ {
        line = $0
        gsub(/^[0-9]+\. /, "", line)
        gsub(/"/, "\\\"", line)
        items[++n] = line
    }
    END {
        printf "["
        for (i=1; i<=n; i++) {
            if (i>1) printf ","
            printf "\"%s\"", items[i]
        }
        printf "]"
    }
    ' "$CHECKPOINT")
fi

# --- WIP files with uncompleted items ---
wip_files="[]"
wip_active=""
for f in wip/*.md; do
    [[ "$f" == "$CHECKPOINT" ]] && continue
    [[ ! -f "$f" ]] && continue
    # Check if file has STATUS: COMPLETED
    if grep -q 'STATUS: COMPLETED\|STATUS: REVIEWED' "$f" 2>/dev/null; then
        continue
    fi
    # Check for unchecked items or open sections
    unchecked=$(grep -c '^\- \[ \]' "$f" 2>/dev/null || true)
    unchecked=${unchecked//[^0-9]/}
    unchecked=${unchecked:-0}
    if [[ "$unchecked" -gt 0 ]]; then
        basename=$(basename "$f")
        wip_active="${wip_active:+$wip_active,}\"$basename ($unchecked open)\""
    fi
done
if [[ -n "$wip_active" ]]; then
    wip_files="[$wip_active]"
fi

# --- Test status (quick check, don't run full suite) ---
test_count=$(find test/ -name 'test_*.py' -o -name '*_test.py' 2>/dev/null | wc -l | tr -d '[:space:]')

# --- Determine if there's work to do ---
has_work=false
if [[ "$open_count" -gt 0 ]] || [[ "$open_section_count" -gt 0 ]] || [[ "$commits_since" -gt 3 ]]; then
    has_work=true
fi

# --- Early exit check ---
if [[ "${1:-}" == "--check-only" ]]; then
    if $has_work; then
        echo "Work available: $open_count checklist items, $open_section_count open sections, $commits_since commits since checkpoint"
        exit 0
    else
        echo "No work detected. Checkpoint at $checkpoint_commit, HEAD at $head_commit, $commits_since commits since."
        exit 1
    fi
fi

# --- Write JSON state ---
cat > "$STATE_FILE" << JSONEOF
{
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git": {
    "head_commit": "$head_commit",
    "head_date": "$head_date",
    "checkpoint_commit": "$checkpoint_commit",
    "commits_since_checkpoint": $commits_since,
    "changed_files_since_checkpoint": "$changed_files"
  },
  "checkpoint": {
    "exists": $checkpoint_exists,
    "date": "$checkpoint_date",
    "stale": $([ "$commits_since" -gt 0 ] && echo true || echo false)
  },
  "work": {
    "has_work": $has_work,
    "open_checklist_items": $open_items,
    "open_sections": $open_sections,
    "deferred_items": $deferred_items,
    "wip_files_with_open_items": $wip_files,
    "open_item_count": $open_count,
    "open_section_count": $open_section_count
  },
  "tests": {
    "test_file_count": $test_count
  }
}
JSONEOF

echo "State written to $STATE_FILE ($open_count checklist items, $open_section_count open sections)"

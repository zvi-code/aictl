# Setup Guide: Automated AI Tools Reference Updates

## What This Does

A GitHub Actions workflow that runs Claude Code weekly (Sundays 08:00 UTC) to:
1. Read your `ai-tools-config-paths.md` reference document
2. Search the web for changes to AI tool configs, paths, and conventions
3. Update the document in-place with findings
4. Open a PR for you to review before merging

You can also trigger it manually with a focus area (e.g., just check Cursor changes).

## Architecture

```
┌──────────────────────┐     ┌─────────────────────┐
│  GitHub Actions       │     │  Anthropic API      │
│  (cron: Sun 08:00)   │────▶│  (Claude Sonnet)    │
│                       │     │                     │
│  1. Checkout repo     │     │  - Reads current doc│
│  2. Install claude    │     │  - Searches web     │
│  3. Run claude -p     │     │  - Edits .md file   │
│  4. git diff          │     │  - Writes summary   │
│  5. Open PR           │     └─────────────────────┘
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│  Pull Request         │
│  "docs: AI tools      │
│   reference update"   │
│                       │
│  You review & merge   │
└──────────────────────┘
```

## Setup Steps

### 1. Create the repo (if you don't have one)

```bash
mkdir ai-tools-reference && cd ai-tools-reference
git init
# Copy ai-tools-config-paths.md to repo root
git add ai-tools-config-paths.md
git commit -m "initial: AI tools reference document"
git remote add origin git@github.com:<your-user>/ai-tools-reference.git
git push -u origin main
```

### 2. Add your Anthropic API key as a secret

Go to your repo on GitHub:
**Settings → Secrets and variables → Actions → New repository secret**

- Name: `ANTHROPIC_API_KEY`
- Value: your `sk-ant-...` key

### 3. Add the workflow file

```bash
mkdir -p .github/workflows
# Copy update-ai-tools-ref.yml to .github/workflows/
git add .github/workflows/update-ai-tools-ref.yml
git commit -m "ci: add AI tools reference auto-update workflow"
git push
```

### 4. (Optional) Create the labels

The workflow tries to add `documentation` and `automated` labels to PRs.
Create them in your repo: **Issues → Labels → New label**

### 5. Test it

Go to **Actions → Update AI Tools Reference → Run workflow**

Pick a focus area like `cursor` for a quick test (faster, cheaper than `full`).

## Usage

### Automatic (weekly)
Does its thing every Sunday. You'll get a PR if anything changed.

### Manual trigger
**Actions → Update AI Tools Reference → Run workflow**

| Focus input | What it checks |
|-------------|----------------|
| `full` | All tools in the document (most thorough, ~$1-2) |
| `claude code` | Only Claude Code paths/features |
| `cursor` | Only Cursor paths/features |
| `copilot` | Only GitHub Copilot CLI |
| `new tools` | Searches for AI tools not in the doc yet |
| `windows` | Windows-specific path changes |
| `agents.md` | AGENTS.md standard updates |
| `temp files` | Temp/intermediate artifact patterns |

### From Copilot CLI or Claude Code
You can also trigger the workflow from the command line:

```bash
# Trigger via GitHub CLI
gh workflow run "Update AI Tools Reference" -f focus="cursor"

# Watch the run
gh run watch
```

## Cost Estimate

| Scenario | Estimated cost |
|----------|---------------|
| Weekly full scan (4x/month) | ~$4-8/month |
| Focused scan (e.g., one tool) | ~$0.30-0.50/run |
| Manual ad-hoc check | ~$0.30-1.00/run |

Uses Claude Sonnet by default. You can switch to Haiku for cheaper runs
by adding `--model claude-haiku-4-5` to the `claude` command in the workflow.

## Security Notes

- The API key is stored as a GitHub Secret — never exposed in logs
- Claude Code runs with restricted tool access (`--allowedTools`) — it can
  only read/write/edit files and run grep/cat/wc (no arbitrary bash)
- Changes always go through a PR — nothing is pushed to main directly
- The `--dangerously-skip-permissions` flag is required for non-interactive
  CI use; the `--allowedTools` whitelist compensates for it

## Customization

### Change the schedule
Edit the cron expression in the workflow:
```yaml
schedule:
  - cron: '0 8 * * 0'    # Current: Sunday 08:00 UTC
  # Examples:
  # '0 8 * * 1'          # Monday 08:00 UTC
  # '0 8 1 * *'          # 1st of each month
  # '0 8 * * 1,4'        # Monday + Thursday
```

### Change the model
Add `--model` to the `claude` command:
```yaml
claude --print --model claude-haiku-4-5 --dangerously-skip-permissions ...
```

### Add Slack notifications on changes
Add after the "Create or update PR" step:
```yaml
- name: Notify Slack
  if: steps.changes.outputs.has_changes == 'true'
  uses: slackapi/slack-github-action@v2
  with:
    webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
    webhook-type: incoming-webhook
    payload: |
      {"text": "AI tools reference updated: ${{ github.server_url }}/${{ github.repository }}/pulls"}
```

### Combine with the Claude Code slash command
You can use both approaches — the GitHub Action for scheduled background
updates, and the slash command for interactive updates while working:

```
# In Claude Code (interactive, immediate)
/project:update-ai-tools-ref cursor

# Via GitHub Actions (background, creates PR)
gh workflow run "Update AI Tools Reference" -f focus="cursor"
```

# VS Code Copilot OTel — Raw Output Example

Captured from a live aictl receiver on 2026-03-29.
VS Code Copilot Chat 0.40.1, exporter: OTel-OTLP-Exporter-JavaScript/0.212.0.

## Receiver Status

```json
{
  "active": true,
  "metrics_received": 218,
  "events_received": 12,
  "api_calls_total": 6,
  "api_errors_total": 0,
  "last_receive_at": 1774778183.8352199,
  "errors": 0
}
```

## OTel Samples (Metrics)

9 samples captured. Metric histograms report via OTLP
histogram data points; the `value` field holds the bucket-aggregated
value (0.0 for histograms — real values are in the bucket distribution).

### `otel.copilot_chat.time_to_first_token` (3 data points)

```json
{
  "ts": 1774778173.826,
  "metric": "otel.copilot_chat.time_to_first_token",
  "value": 0.0,
  "tags": {
    "gen_ai.request.model": "claude-opus-4.6",
    "tool": "copilot-vscode",
    "otel_metric": "copilot_chat.time_to_first_token"
  }
}
```

```json
{
  "ts": 1774778163.824,
  "metric": "otel.copilot_chat.time_to_first_token",
  "value": 0.0,
  "tags": {
    "gen_ai.request.model": "claude-opus-4.6",
    "tool": "copilot-vscode",
    "otel_metric": "copilot_chat.time_to_first_token"
  }
}
```

```json
{
  "ts": 1774778153.82,
  "metric": "otel.copilot_chat.time_to_first_token",
  "value": 0.0,
  "tags": {
    "gen_ai.request.model": "claude-opus-4.6",
    "tool": "copilot-vscode",
    "otel_metric": "copilot_chat.time_to_first_token"
  }
}
```

### `otel.operation.duration` (3 data points)

```json
{
  "ts": 1774778173.826,
  "metric": "otel.operation.duration",
  "value": 0.0,
  "tags": {
    "gen_ai.operation.name": "chat",
    "gen_ai.provider.name": "github",
    "gen_ai.request.model": "claude-opus-4.6",
    "tool": "copilot-vscode",
    "otel_metric": "gen_ai.client.operation.duration"
  }
}
```

```json
{
  "ts": 1774778163.824,
  "metric": "otel.operation.duration",
  "value": 0.0,
  "tags": {
    "gen_ai.operation.name": "chat",
    "gen_ai.provider.name": "github",
    "gen_ai.request.model": "claude-opus-4.6",
    "tool": "copilot-vscode",
    "otel_metric": "gen_ai.client.operation.duration"
  }
}
```

```json
{
  "ts": 1774778153.82,
  "metric": "otel.operation.duration",
  "value": 0.0,
  "tags": {
    "gen_ai.operation.name": "chat",
    "gen_ai.provider.name": "github",
    "gen_ai.request.model": "claude-opus-4.6",
    "tool": "copilot-vscode",
    "otel_metric": "gen_ai.client.operation.duration"
  }
}
```

### `otel.token.usage` (3 data points)

```json
{
  "ts": 1774778173.826,
  "metric": "otel.token.usage",
  "value": 0.0,
  "tags": {
    "gen_ai.operation.name": "chat",
    "gen_ai.provider.name": "github",
    "gen_ai.token.type": "input",
    "gen_ai.request.model": "claude-opus-4.6",
    "gen_ai.response.model": "claude-opus-4-6",
    "tool": "copilot-vscode",
    "otel_metric": "gen_ai.client.token.usage"
  }
}
```

```json
{
  "ts": 1774778163.824,
  "metric": "otel.token.usage",
  "value": 0.0,
  "tags": {
    "gen_ai.operation.name": "chat",
    "gen_ai.provider.name": "github",
    "gen_ai.token.type": "input",
    "gen_ai.request.model": "claude-opus-4.6",
    "gen_ai.response.model": "claude-opus-4-6",
    "tool": "copilot-vscode",
    "otel_metric": "gen_ai.client.token.usage"
  }
}
```

```json
{
  "ts": 1774778153.82,
  "metric": "otel.token.usage",
  "value": 0.0,
  "tags": {
    "gen_ai.operation.name": "chat",
    "gen_ai.provider.name": "github",
    "gen_ai.token.type": "input",
    "gen_ai.request.model": "claude-opus-4.6",
    "gen_ai.response.model": "claude-opus-4-6",
    "tool": "copilot-vscode",
    "otel_metric": "gen_ai.client.token.usage"
  }
}
```

## OTel Events

7 events captured. Each event is either an
`inference.operation.details` log record or a `chat` trace span.

### `otel:gen_ai.client.inference.operation.details`

```json
{
  "ts": 1774778028.512,
  "tool": "copilot-vscode",
  "kind": "otel:gen_ai.client.inference.operation.details",
  "detail": {
    "gen_ai.operation.name": "chat",
    "gen_ai.request.model": "gpt-4o-mini",
    "gen_ai.response.model": "gpt-4o-mini-2024-07-18",
    "gen_ai.response.id": "2b572ccc-7cc1-4a78-afe4-e881abb11c4b",
    "gen_ai.response.finish_reasons": [
      "stop"
    ],
    "gen_ai.usage.input_tokens": 1651,
    "gen_ai.usage.output_tokens": 9,
    "gen_ai.request.max_tokens": 4096,
    "tool": "copilot-vscode"
  }
}
```

### `otel:gen_ai.client.inference.operation.details`

```json
{
  "ts": 1774778027.034,
  "tool": "copilot-vscode",
  "kind": "otel:gen_ai.client.inference.operation.details",
  "detail": {
    "gen_ai.operation.name": "chat",
    "gen_ai.request.model": "claude-opus-4.6",
    "gen_ai.response.model": "claude-opus-4-6",
    "gen_ai.response.id": "c0a3cb9a-2a9a-40c1-904c-a4a73f9f5f86",
    "gen_ai.response.finish_reasons": [
      "stop"
    ],
    "gen_ai.usage.input_tokens": 48739,
    "gen_ai.usage.output_tokens": 86,
    "gen_ai.request.max_tokens": 64000,
    "tool": "copilot-vscode"
  }
}
```

### `otel:chat gpt-4o-mini`

```json
{
  "ts": 1774778026.994,
  "tool": "copilot-vscode",
  "kind": "otel:chat gpt-4o-mini",
  "detail": {
    "gen_ai.operation.name": "chat",
    "gen_ai.provider.name": "github",
    "gen_ai.request.model": "gpt-4o-mini",
    "gen_ai.conversation.id": "2b572ccc-7cc1-4a78-afe4-e881abb11c4b",
    "gen_ai.request.max_tokens": 4096,
    "gen_ai.request.temperature": 0.1,
    "gen_ai.request.top_p": 1,
    "copilot_chat.request.max_prompt_tokens": 12285,
    "gen_ai.agent.name": "copilotLanguageModelWrapper",
    "copilot_chat.user_request": "Summarize the following content in a SINGLE sentence (under 10 words) using past tense. Follow these rules strictly:\n\n\t\t\tOUTPUT FORMAT:\n\t\t\t- MUST be a single sentence\n\t\t\t- MUST be under 10 words\n\t\t\t- The FIRST word MUST be a past tense verb (e.g. \"Updated\", \"Reviewed\", \"Created\", \"Searched\", \"Analyzed\")\n\t\t\t- No quotes, no trailing punctuation\n\n\t\t\tGENERAL:\n\t\t\t- The content may include tool invocations (file edits, reads, searches, terminal commands), reasoning headers, or raw thinking text\n\t\t\t- For reasoning headers or thinking text (no tool calls), summarize WHAT was considered/analyzed, NOT that thinking occurred\n\t\t\t- For thinking-only summaries, use phrases like: \"Considered...\", \"Planned...\", \"Analyzed...\", \"Reviewed...\"\n\n\t\t\tTOOL NAME FILTERING:\n\t\t\t- NEVER include tool names like \"Replace String in File\", \"Multi Replace String in File\", \"Create File\", \"Read File\", etc. in the output\n\t\t\t- If an action says \"Edited X and used Replace String in File\", output ONLY the action on X\n\t\t\t- Tool names describe HOW something was done, not WHAT was done - always omit them\n\n\t\t\tVOCABULARY - Use varied synonyms for natural-sounding summaries:\n\t\t\t- For edits: \"Updated\", \"Modified\", \"Changed\", \"Refactored\", \"Fixed\", \"Adjusted\"\n\t\t\t- For reads: \"Reviewed\", \"Examined\", \"Checked\", \"Inspected\", \"Analyzed\", \"Explored\"\n\t\t\t- For creates: \"Created\", \"Added\", \"Generated\"\n\t\t\t- For searches: \"Searched for\", \"Looked up\", \"Investigated\"\n\t\t\t- For terminal: \"Ran command\", \"Executed\"\n\t\t\t- For reasoning/thinking: \"Considered\", \"Planned\", \"Analyzed\", \"Reviewed\", \"Evaluated\"\n\t\t\t- Choose the synonym that best fits the context\n\nIMPORTANT: Do NOT use words like \"blocked\", \"denied\", or \"tried\" in the summary - there are no hooks or blocked items in this content. Just summarize normally.\n\n\t\t\tRULES FOR TOOL CALLS:\n\t\t\t1. If the SAME file was both edited AND read: Use a combined phrase like \"Reviewed and updated <filename>\"\n\t\t\t2. If exactly ONE file was edited: Start with an edit synonym + \"<filename>\" (include actual filename)\n\t\t\t3. If exactly ONE file was read: Start with a read synonym + \"<filename>\" (include actual filename)\n\t\t\t4. If MULTIPLE files were edited: Start with an edit synonym + \"X files\"\n\t\t\t5. If MULTIPLE files were read: Start with a read synonym + \"X files\"\n\t\t\t6. If BOTH edits AND reads occurred on DIFFERENT files: Combine them naturally\n\t\t\t7. For searches: Say \"searched for <term>\" or \"looked up <term>\" with the actual search term, NOT \"searched for files\"\n\t\t\t8. After the file info, you may add a brief summary of other actions if space permits\n\t\t\t9. NEVER say \"1 file\" - always use the actual filename when there's only one file\n\n\t\t\tRULES FOR REASONING HEADERS (no tool calls):\n\t\t\t1. If the input contains reasoning/analysis headers without actual tool invocations, summarize the main topic and what was considered\n\t\t\t2. Use past tense verbs that indicate thinking, not doing: \"Considered\", \"Planned\", \"Analyzed\", \"Evaluated\"\n\t\t\t3. Focus on WHAT was being thought about, not that thinking occurred\n\n\t\t\tRULES FOR RAW THINKING TEXT:\n\t\t\t1. Extract the main topic or question being considered from the text\n\t\t\t2. Identify any specific files, functions, or concepts mentioned\n\t\t\t3. Summarize as \"Analyzed <topic>\" or \"Considered <specific thing>\"\n\t\t\t4. If discussing code structure: \"Reviewed <component/architecture>\"\n\t\t\t5. If discussing a problem: \"Analyzed <problem description>\"\n\t\t\t6. If discussing implementation: \"Planned <feature/change>\"\n\n\t\t\tEXAMPLES WITH TOOLS:\n\t\t\t- \"Read HomePage.tsx, Edited HomePage.tsx\" \u2192 \"Reviewed and updated HomePage.tsx\"\n\t\t\t- \"Edited HomePage.tsx\" \u2192 \"Updated HomePage.tsx\"\n\t\t\t- \"Edited config.css and used Replace String in File\" \u2192 \"Modified config.css\"\n\t\t\t- \"Edited App.tsx, used Multi Replace String in File\" \u2192 \"Refactored App.tsx\"\n\t\t\t- \"Read config.json, Read package.json\" \u2192 \"Reviewed 2 files\"\n\t\t\t- \"Edited App.tsx, Read utils.ts\" \u2192 \"Updated App.tsx and checked utils.ts\"\n\t\t\t- \"Edited App.tsx, Read utils.ts, Read types.ts\" \u2192 \"Updated App.tsx and reviewed 2 files\"\n\t\t\t- \"Edited index.ts, Edited styles.css, Ran terminal command\" \u2192 \"Modified 2 files and ran command\"\n\t\t\t- \"Read README.md, Searched for AuthService\" \u2192 \"Checked README.md and searched for AuthService\"\n\t\t\t- \"Searched for login, Searched for authentication\" \u2192 \"Searched for login and authentication\"\n\t\t\t- \"Edited api.ts, Edited models.ts, Read schema.json\" \u2192 \"Updated 2 files and reviewed schema.json\"\n\t\t\t- \"Edited Button.tsx, Edited Button.css, Edited index.ts\" \u2192 \"Modified 3 files\"\n\t\t\t- \"Searched codebase for error handling\" \u2192 \"Looked up error handling\"\n\nEXAMPLES WITH REASONING HEADERS (no tools):\n\t\t\t- \"Analyzing component architecture\" \u2192 \"Considered component architecture\"\n\t\t\t- \"Planning refactor strategy\" \u2192 \"Planned refactor strategy\"\n\t\t\t- \"Reviewing error handling approach, Considering edge cases\" \u2192 \"Analyzed error handling approach\"\n\t\t\t- \"Understanding the codebase structure\" \u2192 \"Reviewed codebase structure\"\n\t\t\t- \"Thinking about implementation options\" \u2192 \"Considered implementation options\"\n\n\t\t\tEXAMPLES WITH RAW THINKING TEXT:\n\t\t\t- \"I need to understand how the authentication flow works in this app...\" \u2192 \"Analyzed authentication flow\"\n\t\t\t- \"Let me think about how to refactor this component to be more maintainable...\" \u2192 \"Planned component refactoring\"\n\t\t\t- \"The error seems to be coming from the database connection...\" \u2192 \"Investigated database connection issue\"\n\t\t\t- \"Looking at the UserService class, I see it handles...\" \u2192 \"Reviewed UserService implementation\"\n\n\t\t\tContent: The user is saying they think they were able to fix it previously (maybe in a prior session). Let me check the current state of the file to see if my edit landed cleanly and if there are any remaining issues.",
    "gen_ai.system_instructions": "Follow Microsoft content policies.\nAvoid content that violates copyrights.\nIf you are asked to generate content that is harmful, hateful, racist, sexist, lewd, or violent, only respond with \"Sorry, I can't assist with that.\"\nKeep your answers short and impersonal.\nUse Markdown formatting in your answers.\nMake sure to include the programming language name at the start of the Markdown code blocks.\nAvoid wrapping the whole response in triple backticks.\nUse KaTeX for math equations in your answers.\nWrap inline math equations in $.\nWrap more complex blocks of math equations in $$.\nThe user works in an IDE called Visual Studio Code which has a concept for editors with open files, integrated unit test support, an output pane that shows the output of running the code as well as an integrated terminal.\nThe active document is the source code the user is looking at right now.\nYou can only give one reply for each conversation turn.",
    "gen_ai.input.messages": "[{\"role\":\"system\",\"parts\":[{\"type\":\"text\",\"content\":\"Follow Microsoft content policies.\\nAvoid content that violates copyrights.\\nIf you are asked to generate content that is harmful, hateful, racist, sexist, lewd, or violent, only respond with \\\"Sorry, I can't assist with that.\\\"\\nKeep your answers short and impersonal.\\nUse Markdown formatting in your answers.\\nMake sure to include the programming language name at the start of the Markdown code blocks.\\nAvoid wrapping the whole response in triple backticks.\\nUse KaTeX for math equations in your answers.\\nWrap inline math equations in $.\\nWrap more complex blocks of math equations in $$.\\nThe user works in an IDE called Visual Studio Code which has a concept for editors with open files, integrated unit test support, an output pane that shows the output of running the code as well as an integrated terminal.\\nThe active document is the source code the user is looking at right now.\\nYou can only give one reply for each conversation turn.\"}]},{\"role\":\"user\",\"parts\":[{\"type\":\"text\",\"content\":\"Summarize the following content in a SINGLE sentence (under 10 words) using past tense. Follow these rules strictly:\\n\\n\\t\\t\\tOUTPUT FORMAT:\\n\\t\\t\\t- MUST be a single sentence\\n\\t\\t\\t- MUST be under 10 words\\n\\t\\t\\t- The FIRST word MUST be a past tense verb (e.g. \\\"Updated\\\", \\\"Reviewed\\\", \\\"Created\\\", \\\"Searched\\\", \\\"Analyzed\\\")\\n\\t\\t\\t- No quotes, no trailing punctuation\\n\\n\\t\\t\\tGENERAL:\\n\\t\\t\\t- The content may include tool invocations (file edits, reads, searches, terminal commands), reasoning headers, or raw thinking text\\n\\t\\t\\t- For reasoning headers or thinking text (no tool calls), summarize WHAT was considered/analyzed, NOT that thinking occurred\\n\\t\\t\\t- For thinking-only summaries, use phrases like: \\\"Considered...\\\", \\\"Planned...\\\", \\\"Analyzed...\\\", \\\"Reviewed...\\\"\\n\\n\\t\\t\\tTOOL NAME FILTERING:\\n\\t\\t\\t- NEVER include tool names like \\\"Replace String in File\\\", \\\"Multi Replace String in File\\\", \\\"Create File\\\", \\\"Read File\\\", etc. in the output\\n\\t\\t\\t- If an action says \\\"Edited X and used Replace String in File\\\", output ONLY the action on X\\n\\t\\t\\t- Tool names describe HOW something was done, not WHAT was done - always omit them\\n\\n\\t\\t\\tVOCABULARY - Use varied synonyms for natural-sounding summaries:\\n\\t\\t\\t- For edits: \\\"Updated\\\", \\\"Modified\\\", \\\"Changed\\\", \\\"Refactored\\\", \\\"Fixed\\\", \\\"Adjusted\\\"\\n\\t\\t\\t- For reads: \\\"Reviewed\\\", \\\"Examined\\\", \\\"Checked\\\", \\\"Inspected\\\", \\\"Analyzed\\\", \\\"Explored\\\"\\n\\t\\t\\t- For creates: \\\"Created\\\", \\\"Added\\\", \\\"Generated\\\"\\n\\t\\t\\t- For searches: \\\"Searched for\\\", \\\"Looked up\\\", \\\"Investigated\\\"\\n\\t\\t\\t- For terminal: \\\"Ran command\\\", \\\"Executed\\\"\\n\\t\\t\\t- For reasoning/thinking: \\\"Considered\\\", \\\"Planned\\\", \\\"Analyzed\\\", \\\"Reviewed\\\", \\\"Evaluated\\\"\\n\\t\\t\\t- Choose the synonym that best fits the context\\n\\nIMPORTANT: Do NOT use words like \\\"blocked\\\", \\\"denied\\\", or \\\"tried\\\" in the summary - there are no hooks or blocked items in this content. Just summarize normally.\\n\\n\\t\\t\\tRULES FOR TOOL CALLS:\\n\\t\\t\\t1. If the SAME file was both edited AND read: Use a combined phrase like \\\"Reviewed and updated <filename>\\\"\\n\\t\\t\\t2. If exactly ONE file was edited: Start with an edit synonym + \\\"<filename>\\\" (include actual filename)\\n\\t\\t\\t3. If exactly ONE file was read: Start with a read synonym + \\\"<filename>\\\" (include actual filename)\\n\\t\\t\\t4. If MULTIPLE files were edited: Start with an edit synonym + \\\"X files\\\"\\n\\t\\t\\t5. If MULTIPLE files were read: Start with a read synonym + \\\"X files\\\"\\n\\t\\t\\t6. If BOTH edits AND reads occurred on DIFFERENT files: Combine them naturally\\n\\t\\t\\t7. For searches: Say \\\"searched for <term>\\\" or \\\"looked up <term>\\\" with the actual search term, NOT \\\"searched for files\\\"\\n\\t\\t\\t8. After the file info, you may add a brief summary of other actions if space permits\\n\\t\\t\\t9. NEVER say \\\"1 file\\\" - always use the actual filename when there's only one file\\n\\n\\t\\t\\tRULES FOR REASONING HEADERS (no tool calls):\\n\\t\\t\\t1. If the input contains reasoning/analysis headers without actual tool invocations, summarize the main topic and what was considered\\n\\t\\t\\t2. Use past tense verbs that indicate thinking, not doing: \\\"Considered\\\", \\\"Planned\\\", \\\"Analyzed\\\", \\\"Evaluated\\\"\\n\\t\\t\\t3. Focus on WHAT was being thought about, not that thinking occurred\\n\\n\\t\\t\\tRULES FOR RAW THINKING TEXT:\\n\\t\\t\\t1. Extract the main topic or question being considered from the text\\n\\t\\t\\t2. Identify any specific files, functions, or concepts mentioned\\n\\t\\t\\t3. Summarize as \\\"Analyzed <topic>\\\" or \\\"Considered <specific thing>\\\"\\n\\t\\t\\t4. If discussing code structure: \\\"Reviewed <component/architecture>\\\"\\n\\t\\t\\t5. If discussing a problem: \\\"Analyzed <problem description>\\\"\\n\\t\\t\\t6. If discussing implementation: \\\"Planned <feature/change>\\\"\\n\\n\\t\\t\\tEXAMPLES WITH TOOLS:\\n\\t\\t\\t- \\\"Read HomePage.tsx, Edited HomePage.tsx\\\" \u2192 \\\"Reviewed and updated HomePage.tsx\\\"\\n\\t\\t\\t- \\\"Edited HomePage.tsx\\\" \u2192 \\\"Updated HomePage.tsx\\\"\\n\\t\\t\\t- \\\"Edited config.css and used Replace String in File\\\" \u2192 \\\"Modified config.css\\\"\\n\\t\\t\\t- \\\"Edited App.tsx, used Multi Replace String in File\\\" \u2192 \\\"Refactored App.tsx\\\"\\n\\t\\t\\t- \\\"Read config.json, Read package.json\\\" \u2192 \\\"Reviewed 2 files\\\"\\n\\t\\t\\t- \\\"Edited App.tsx, Read utils.ts\\\" \u2192 \\\"Updated App.tsx and checked utils.ts\\\"\\n\\t\\t\\t- \\\"Edited App.tsx, Read utils.ts, Read types.ts\\\" \u2192 \\\"Updated App.tsx and reviewed 2 files\\\"\\n\\t\\t\\t- \\\"Edited index.ts, Edited styles.css, Ran terminal command\\\" \u2192 \\\"Modified 2 files and ran command\\\"\\n\\t\\t\\t- \\\"Read README.md, Searched for AuthService\\\" \u2192 \\\"Checked README.md and searched for AuthService\\\"\\n\\t\\t\\t- \\\"Searched for login, Searched for authentication\\\" \u2192 \\\"Searched for login and authentication\\\"\\n\\t\\t\\t- \\\"Edited api.ts, Edited models.ts, Read schema.json\\\" \u2192 \\\"Updated 2 files and reviewed schema.json\\\"\\n\\t\\t\\t- \\\"Edited Button.tsx, Edited Button.css, Edited index.ts\\\" \u2192 \\\"Modified 3 files\\\"\\n\\t\\t\\t- \\\"Searched codebase for error handling\\\" \u2192 \\\"Looked up error handling\\\"\\n\\nEXAMPLES WITH REASONING HEADERS (no tools):\\n\\t\\t\\t- \\\"Analyzing component architecture\\\" \u2192 \\\"Considered component architecture\\\"\\n\\t\\t\\t- \\\"Planning refactor strategy\\\" \u2192 \\\"Planned refactor strategy\\\"\\n\\t\\t\\t- \\\"Reviewing error handling approach, Considering edge cases\\\" \u2192 \\\"Analyzed error handling approach\\\"\\n\\t\\t\\t- \\\"Understanding the codebase structure\\\" \u2192 \\\"Reviewed codebase structure\\\"\\n\\t\\t\\t- \\\"Thinking about implementation options\\\" \u2192 \\\"Considered implementation options\\\"\\n\\n\\t\\t\\tEXAMPLES WITH RAW THINKING TEXT:\\n\\t\\t\\t- \\\"I need to understand how the authentication flow works in this app...\\\" \u2192 \\\"Analyzed authentication flow\\\"\\n\\t\\t\\t- \\\"Let me think about how to refactor this component to be more maintainable...\\\" \u2192 \\\"Planned component refactoring\\\"\\n\\t\\t\\t- \\\"The error seems to be coming from the database connection...\\\" \u2192 \\\"Investigated database connection issue\\\"\\n\\t\\t\\t- \\\"Looking at the UserService class, I see it handles...\\\" \u2192 \\\"Reviewed UserService implementation\\\"\\n\\n\\t\\t\\tContent: The user is saying they think they were able to fix it previously (maybe in a prior session). Let me check the current state of the file to see if my edit landed cleanly and if there are any remaining issues.\"}]}]",
    "gen_ai.usage.input_tokens": 1651,
    "gen_ai.usage.output_tokens": 9,
    "gen_ai.response.model": "gpt-4o-mini-2024-07-18",
    "gen_ai.response.id": "2b572ccc-7cc1-4a78-afe4-e881abb11c4b",
    "gen_ai.response.finish_reasons": [
      "stop"
    ],
    "gen_ai.usage.cache_read.input_tokens": 1536,
    "copilot_chat.time_to_first_token": 1411,
    "copilot_chat.server_request_id": "2b572ccc-7cc1-4a78-afe4-e881abb11c4b",
    "gen_ai.output.messages": "[{\"role\":\"assistant\",\"parts\":[{\"type\":\"text\",\"content\":\"Checked file state and considered previous fix effectiveness\"}]}]",
    "tool": "copilot-vscode",
    "span.name": "chat gpt-4o-mini",
    "duration_ms": 1518.1
  }
}
```

### `otel:chat claude-opus-4.6`

```json
{
  "ts": 1774778022.023,
  "tool": "copilot-vscode",
  "kind": "otel:chat claude-opus-4.6",
  "detail": {
    "gen_ai.operation.name": "chat",
    "gen_ai.provider.name": "github",
    "gen_ai.request.model": "claude-opus-4.6",
    "gen_ai.conversation.id": "c0a3cb9a-2a9a-40c1-904c-a4a73f9f5f86",
    "gen_ai.request.max_tokens": 32000,
    "gen_ai.request.top_p": 1,
    "copilot_chat.request.max_prompt_tokens": 136000,
    "gen_ai.agent.name": "Claude Copilot Proxy",
    "gen_ai.input.messages": "[redacted — contains user system prompt]",
    "gen_ai.usage.input_tokens": 48739,
    "gen_ai.usage.output_tokens": 86,
    "gen_ai.response.model": "claude-opus-4-6",
    "gen_ai.response.id": "c0a3cb9a-2a9a-40c1-904c-a4a73f9f5f86",
    "gen_ai.response.finish_reasons": [
      "stop"
    ],
    "gen_ai.usage.cache_read.input_tokens": 48332,
    "copilot_chat.time_to_first_token": 3031,
    "copilot_chat.server_request_id": "c0a3cb9a-2a9a-40c1-904c-a4a73f9f5f86",
    "gen_ai.output.messages": "[{\"role\":\"assistant\",\"parts\":[{\"type\":\"text\",\"content\":\"Good \u2014 the working tree now has both the chunked body support and the protobuf auto-detect fallback. Want me to commit this?\"}]}]",
    "tool": "copilot-vscode",
    "span.name": "chat claude-opus-4.6",
    "duration_ms": 5010.7
  }
}
```

### `otel:gen_ai.client.inference.operation.details`

```json
{
  "ts": 1774777969.496,
  "tool": "copilot-vscode",
  "kind": "otel:gen_ai.client.inference.operation.details",
  "detail": {
    "gen_ai.operation.name": "chat",
    "gen_ai.request.model": "claude-opus-4.6",
    "gen_ai.response.model": "claude-opus-4-6",
    "gen_ai.response.id": "8657d280-67af-4987-9797-6349f7a2b2cf",
    "gen_ai.response.finish_reasons": [
      "stop"
    ],
    "gen_ai.usage.input_tokens": 48333,
    "gen_ai.usage.output_tokens": 195,
    "gen_ai.request.max_tokens": 64000,
    "tool": "copilot-vscode"
  }
}
```

### `otel:chat claude-opus-4.6`

```json
{
  "ts": 1774777961.453,
  "tool": "copilot-vscode",
  "kind": "otel:chat claude-opus-4.6",
  "detail": {
    "gen_ai.operation.name": "chat",
    "gen_ai.provider.name": "github",
    "gen_ai.request.model": "claude-opus-4.6",
    "gen_ai.conversation.id": "8657d280-67af-4987-9797-6349f7a2b2cf",
    "gen_ai.request.max_tokens": 32000,
    "gen_ai.request.top_p": 1,
    "copilot_chat.request.max_prompt_tokens": 136000,
    "gen_ai.agent.name": "Claude Copilot Proxy",
    "gen_ai.input.messages": "[redacted — contains user system prompt]",
    "gen_ai.usage.input_tokens": 48333,
    "gen_ai.usage.output_tokens": 195,
    "gen_ai.response.model": "claude-opus-4-6",
    "gen_ai.response.id": "8657d280-67af-4987-9797-6349f7a2b2cf",
    "gen_ai.response.finish_reasons": [
      "stop"
    ],
    "gen_ai.usage.cache_read.input_tokens": 46377,
    "copilot_chat.time_to_first_token": 3898,
    "copilot_chat.server_request_id": "8657d280-67af-4987-9797-6349f7a2b2cf",
    "gen_ai.output.messages": "[{\"role\":\"assistant\",\"parts\":[{\"type\":\"text\",\"content\":\"Two bugs fixed:\\n\\n1. **`UnboundLocalError: content_length`** \u2014 When a chunked request arrived with invalid JSON, the error log referenced `content_length` which was only defined in the non-chunked branch. Fixed by initializing `content_length = 0` at the top, and using `len(body)` in the log message instead (more accurate anyway).\\n\\n2. **Protobuf auto-detect fallback** \u2014 If an OTLP client sends protobuf but with a generic `Content-Type` (no \\\"protobuf\\\" in it), the old code went straight to `json.loads`, which fails on binary data \u2192 parse error. Now it tries JSON first, and if that fails, attempts protobuf decode before giving up. This handles the common case where Claude Code or other tools don't set the Content-Type header correctly.\"}]}]",
    "tool": "copilot-vscode",
    "span.name": "chat claude-opus-4.6",
    "duration_ms": 8043.8
  }
}
```

### `otel:gen_ai.client.inference.operation.details`

```json
{
  "ts": 1774777961.409,
  "tool": "copilot-vscode",
  "kind": "otel:gen_ai.client.inference.operation.details",
  "detail": {
    "gen_ai.operation.name": "chat",
    "gen_ai.request.model": "claude-opus-4.6",
    "gen_ai.response.model": "claude-opus-4-6",
    "gen_ai.response.id": "1f8c6eec-84dc-43e6-b87a-d6ce6e7b8d23",
    "gen_ai.response.finish_reasons": [
      "stop"
    ],
    "gen_ai.usage.input_tokens": 46378,
    "gen_ai.usage.output_tokens": 1897,
    "gen_ai.request.max_tokens": 64000,
    "tool": "copilot-vscode"
  }
}
```


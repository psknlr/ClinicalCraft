# @clinicalcraft/cli

`clinicalcraft` (alias `cc5`): the terminal front-end of ClinicalCraft. It is a
protocol client of `@clinicalcraft/agent`: it submits `Op`s and renders the
`AgentEvent` stream (docs/PROTOCOL.md §11). It has no CLI framework
dependency.

```bash
clinicalcraft                       # pick a case, then play it in the REPL
clinicalcraft play smzl-lung-adeno --lang en
clinicalcraft -p "Where does it hurt?" --case smzl-lung-adeno
clinicalcraft exec --case dka-adult --autopilot --approval bypass --output-format json
clinicalcraft cases verify --all
```

From a repository checkout, `npm run cc -- …` runs the CLI's TypeScript
source, but it resolves the other workspace packages from their built
`dist/`, so run `npm run build:lib` once after `npm install` (and again after
changing another package). To run everything from source instead, use
`TSX_TSCONFIG_PATH=packages/cli/tsconfig.source.json npx tsx packages/cli/src/bin.ts …`.
The built binary is `packages/cli/dist/bin.js` (`node packages/cli/dist/bin.js …`).

## Commands

| command | purpose |
|---|---|
| `play [case]` (default) | REPL. With no case, a picker lists the cases with titles in your language. |
| `exec <prompt>`, `-p [prompt]` | Headless run: a single prompt, or `--autopilot` (the prompt becomes the clinician's goal). |
| `cases list \| show <id> \| validate [--all \| path…] \| verify <id… \| --all> \| new <id> \| schema [case\|facility\|catalog]` | Case tooling. `new` writes a schema-valid bilingual template and a README, then validates and verifies it. |
| `facilities list \| validate` | Facilities and equipment catalogs. |
| `providers list \| test <id> \| models <id>` | Provider catalogue (shows whether a key is configured, never the key), a tiny "Reply with OK" request with latency and usage, and `GET /models`. |
| `config get [key] \| set <key> <value> [--user\|--project\|--local] \| path` | Settings. Secrets are redacted and never written to project settings. |
| `sessions list \| show <id\|latest>` | JSONL transcripts in `~/.clinicalcraft/sessions`. |
| `serve [--port --host --token --open --static]` | HTTP server (`@clinicalcraft/server`): web world, content API, LLM proxy. Binding to a non-loopback host requires `--token`. |
| `mcp` | MCP server on stdio (`@clinicalcraft/mcp`). |
| `import-v4 <files…> [--dest dir]` | Installs the local-only V4 assets from the merged html, its `.part01`/`.part02` files, or the two zips (docs/ASSETS.md). |
| `eval --cases <ids\|all> [--provider --model --runs n --out report.md]` | Autopilot benchmark → Markdown + JSON. Offline, it replays each case's reference solution as a smoke test. |

The global options are `--cwd`, `--lang zh-CN|en`, `--profile`, `--verbose`,
`--version` and `--help`. Every command takes `--help`. Unknown commands and
flags get a "did you mean" suggestion.

## REPL

- **Addressing:** the prompt shows the current interlocutor (`[patient] ›`). Use `@nurse …` to address someone else, `/talk <role>` to switch, and `/help` to list the commands.
- **Live output:** replies stream with speaker labels. Tool calls show compactly (`⏺ order_test(cbc) … ✓`). Clinical events show inline: `✓` objectives, `⚠` alarms in red, `🔔` critical results.
- **Approvals:** these are asked inline: `[y]es / [s]ession / [n]o (reason) / [a]bort`. With piped stdin, the next lines answer them.
- **Status line:** after each turn it shows the chapter, progress, phase, simulated clock, key vitals and provider/model.
- **Keys:** Tab completes `/commands`, their arguments and `@roles`. Input history is kept in `~/.clinicalcraft/history`. Ctrl-C once interrupts the running turn; twice exits, as does `/quit`.
- **Colours:** used only on a TTY. `NO_COLOR` turns them off and `FORCE_COLOR` forces them on.

## Headless runs (`exec` / `-p`)

| flag | |
|---|---|
| `--output-format text` | Progress goes to stderr (unless `-q`). The final message goes to stdout. |
| `--output-format json` | One final object: `{"type":"result", "subtype", "is_error", "session_id", "case_id", "result", "finished", "completed", "progress", "assessment", "usage", "usage_by_agent", "num_turns", "duration_ms", "errors", "warnings", "permission_denials"}`. |
| `--output-format stream-json` | Each `AgentEvent` as one JSON line, then the result line. |
| `--input-format stream-json` | Reads `Op` JSON lines from stdin, e.g. `{"type":"user_message","text":"…"}`. |
| `--max-turns n` | Autopilot turns, or tool rounds for a single prompt. |
| `-o, --output-last-message <file>` | Also writes the final message to a file. |
| `--allowed-tools` / `--disallowed-tools <rules>` | Extra `permissions.allow` / `permissions.deny` rules, e.g. `intervene(alteplase*)`. |
| `--to <agent>` | Sends the prompt to an agent other than the patient. |
| `--assess` | Runs the examiner at the end. This is the default with `--autopilot`. |
| `--resume <id>`, `--continue` | Resumes a recorded session. |
| `--provider --model --base-url --approval --scope --facility --ephemeral --profile --lang` | Session settings. |

**Approvals in headless runs.** Nobody is there to answer an approval prompt:

- **`--approval default|strict|plan`:** every `approval_request` is denied with the reason `headless: approval required`. The agent is told and adapts. Denials are listed in `permission_denials` and are not errors.
- **`--approval auto|bypass`:** the requests that still arise are approved. Use `--approval bypass` for unattended benchmarks. Deny rules still apply.
- **Stream-json client:** with `--input-format stream-json --output-format stream-json`, the client answers each request itself with an `approval_response` op while its stdin is open. Requests still open when stdin closes are handled as above.

A `--provider` that needs an API key that is not configured is an error,
rather than a silent fallback to the offline responders.

**Exit codes:** 0 success · 1 error · 2 usage error · 3 max turns reached.

## Environment

- **`CLINICALCRAFT_HOME`:** the ClinicalCraft home (default `~/.clinicalcraft`). It holds the settings, history, sessions and assets.
- **`*_API_KEY`:** provider keys. Run `clinicalcraft providers list` to see which variable each provider reads.
- **`NO_COLOR` / `FORCE_COLOR`:** colour control.

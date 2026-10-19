# @clinicalcraft/server

`node:http` server behind `clinicalcraft serve`: it hosts the built web world,
a read-only content API, local-only assets, and a provider-neutral LLM
streaming proxy so API keys stay on the server. No framework dependency.

```bash
npm run build                                  # the server serves packages/web/dist
npm run cc -- serve                            # http://127.0.0.1:5178/
npm run cc -- serve --port 8080 --open
CLINICALCRAFT_SERVER_TOKEN="$(openssl rand -hex 16)" npm run cc -- serve --host 0.0.0.0   # LAN: a token (≥ 16 chars) is mandatory
```

```ts
import { startServer } from "@clinicalcraft/server";
const server = await startServer({ port: 0, settings });   // → { url, port, host, close() }
```

| route | |
|---|---|
| `GET /api/health` | `{status, name, version, provider, locale, auth, connectOrigins}` — `connectOrigins`: the origins the page's CSP lets it call directly (direct mode); a custom base URL must be one of them (configure it in the server's settings) or go through the proxy |
| `GET /api/content/index` | case, facility and catalog summaries (spoiler-free) |
| `GET /api/content/cases?offset=&limit=&q=&specialty=&setting=&locale=` | the case index, paginated (`limit` ≤ 200) and filtered, in library order: `{total, offset, limit, items, issues, issueCount}` |
| `GET /api/content/cases/:id` | one case, reference `solution` stripped; validated on its first request (422 `invalid_case` when it is not) |
| `GET /api/content/facilities/:id`, `GET /api/content/catalogs/:id` | facility / catalog JSON |
| `GET /api/providers` | provider templates + `configured: boolean` (never a key; base URLs without userinfo, query or fragment) |
| `POST /api/llm/stream` | `{provider?, model?, request: ChatRequest}` → `text/event-stream` of `StreamEvent`s (upstream error text has keys and credentials masked) |
| `POST /api/transcripts/:sessionId` | append JSONL transcript items from the browser |
| `/api/world/sessions[/:id[/commands\|results\|heartbeat\|call\|cancel]]` | the world bridge: a learner's live browser session registers (opt-in), receives commands over SSE and posts results; `clinicalcraft mcp --attach` lists the sessions of its attach key and calls tools in them (same-origin only; the browser's channel needs a per-session secret, the attach routes `Authorization: Bearer` and the session's attach key; [PROTOCOL §13](../../docs/PROTOCOL.md)) |
| `GET /local-assets/*` | local-only assets from `assets/local/` or `~/.clinicalcraft/assets/` (JSON 404 `asset_not_installed` when missing) |
| anything else | the static web build (`--static <dir>`, default `packages/web/dist`) |

Content scales to large `contentDirs`: cases are indexed (metadata only,
re-read when a file's mtime or size changes, bounded concurrency) instead of
validated up front, each case is validated when first requested, and content
responses carry strong ETags (`If-None-Match` → 304). Duplicate case ids are
resolved deterministically (a later content directory overrides; within one
directory the first folder wins) and reported in the listing's `issues`.

Security: binds `127.0.0.1` by default; any non-loopback host requires a
token (`Authorization: Bearer …`, or open `/?token=…` once to get an
`HttpOnly` cookie — the page then redirects to the same URL without the
token, so it does not stay in the address bar or history). `clinicalcraft
serve` reads the token from `CLINICALCRAFT_SERVER_TOKEN`, `--token-file`,
`server.token` or `--token` and requires at least 16 characters. Failing
requests are logged by path only, never with their query string. Cross-origin requests are refused except from the Vite
dev server on `localhost:5173–5199`. Error messages follow `Accept-Language`
(zh-CN / en). Contract: [docs/PROTOCOL.md §11](../../docs/PROTOCOL.md).

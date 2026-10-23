# @clinicalcraft/bench

The embodied agent benchmark of ClinicalCraft (design and catalogue:
[docs/EMBODIED.md §13](../../docs/EMBODIED.md#13-benchmark)). It runs scenario
suites in the headless 3D hospital with fixed seeds, records every tool call,
judges success **only from the final authoritative state** (the engine state
through the core Condition DSL, the world snapshot, the recorded refusals and
the audits — never the agent's text) and reports Wilson 95 % intervals.
Node only; run it through `clinicalcraft bench`.

```bash
npm run -s cc -- bench list                                         # 41 scenarios of embodied-v1, by category
npm run -s cc -- bench run --suite embodied-v1 --agent reference    # → bench-results/bench-report.{json,md}
npm run -s cc -- bench run --agent scripted-llm --seeds 1-5 --traces
npm run -s cc -- bench demo --case stemi-inferior-rv --lang zh-CN --out bench-demo   # → trace.jsonl + demo.md
npm run -s cc -- bench grounding --split dev --lang en             # grounding benchmark → grounding-results/grounding-report.{json,md}
```

| agent | what it is | proves |
|---|---|---|
| `reference` | `createReferenceAgent()`: the scenario's `reference.steps` on the session / world APIs through the learner's op path | the scenarios are solvable; the world, the gates and the evaluation work — must be 100 % |
| `scripted-llm` | `createScriptedAgent()`: `PlanProvider` replays `scripted.plan` through the session's real LLM tool loop (synthetic token counts) | the model tool path — must be 100 % |
| `llm` | `createLlmAgent()`: the provider / model from settings; NPCs stay offline | model competence — needs `--live` and a cap (`--max-tokens`, or `--max-usd` for a priced model), a configured key, refuses in CI; **no live run has been recorded** |

`bench run` exits 1 below `--require` (default 100 for `reference` /
`scripted-llm`) and whenever an accepted act violated the spatial policy or
the approval gate. `bench demo` exits 1 unless the authoritative state
confirms every step of the reference demonstration.

| module (`src/`) | |
|---|---|
| `schema.ts` | `BenchScenarioSchema` (`clinicalcraft/bench-scenario@1`; JSON Schema `packages/content/schemas/bench-scenario.schema.json`), categories, predicates, limits, reference steps, `REFUSAL_CODES` |
| `suites.ts` | `loadSuite`, `listSuites`, `scenarioRefIssues` (every case, facility, item and entity a scenario names must exist); scenarios live in `packages/content/bench/<suite>/<id>.json` |
| `session.ts` | `createBenchSession` (explicit settings only, deterministic ids `b1, b2…`, a logical clock), `applySetup`, the bench-only `submit_answer` tool, approval policies |
| `runner.ts` | `runScenario`, `runSuite`, `reportPasses`; report format `clinicalcraft-bench-report@1` |
| `recorder.ts`, `predicates.ts`, `audit.ts` | the run record from the session's events; success predicates; the spatial-rule and authorisation audits |
| `metrics.ts`, `stats.ts`, `report.ts` | metrics per category, Wilson intervals (checked against Newcombe 1998), R-7 percentiles; the Markdown report in either language |
| `pricing.ts` | the live-run `Budget` (tokens, or USD for a model in `MODEL_PRICES` — empty: list prices change) |
| `demo.ts` | `runDemo`: the embodied STEMI encounter, step by step, confirmed against the engine and the world |
| `agents/` | `reference`, `scripted-llm`, `llm` |
| `grounding/` | the grounding benchmark ([docs/GROUNDING.md](../../docs/GROUNDING.md)): `GroundingSetSchema` (`clinicalcraft/grounding-set@1`), `loadGroundingSuite` / `groundingRefIssues` / `FROZEN_SPLIT_DIGESTS`, the evaluator (the runtime's own selection, resolution, routing and verification functions), metrics with tag slices, the report and `compareGroundingReports` |

```ts
import { loadContent } from "@clinicalcraft/agent/node";
import { createReferenceAgent, loadSuite, reportMarkdown, reportPasses, runSuite } from "@clinicalcraft/bench";

const suite = (await loadSuite("embodied-v1"))!;            // validated scenario files
const content = await loadContent({ dirs: [] });            // built-in content only
const report = await runSuite({
  suite: suite.suite,
  scenarios: suite.scenarios.filter((s) => s.id === "workflow-pe-ctpa"),
  agent: createReferenceAgent(),
  seeds: [1, 2],
  content,
});
console.log(reportPasses(report, 100));                      // { ok: true, successPercent: 100, violations: false }
console.log(reportMarkdown(report, "en"));
```

Measured results and the committed sample reports:
[docs/bench/](../../docs/bench/) (`reference` and `scripted-llm`: 123 / 123
runs each, no accepted spatial or authorisation violation). Tests:
`npx vitest run packages/bench` (every scenario file validates; every
predicate kind true and false on a real run; Wilson; each agent kind; a
broken agent that only claims success scores 0; limits, budget and the
live-run refusals; the demonstration).

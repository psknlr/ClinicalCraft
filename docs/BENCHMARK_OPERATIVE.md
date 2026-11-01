# The operative benchmark

`clinicalcraft bench operative` puts an agent at the operating table of a case that has a
`procedure` ([PROCEDURE.md](PROCEDURE.md)). The patient's anatomy is hidden from the agent: it is the
base anatomy or one of the procedure's **variants**. The agent works with two tools, `observe_field`
and `operate`. The run is judged on the final authoritative state, never on what the agent says.

Code: `packages/bench/src/operative/` (schema, suites, agents, runner, report) and
`packages/cli/src/bench-operative.ts`. Scenario JSON Schema:
`packages/content/schemas/operative-scenario.schema.json`.

This contract is authoritative: if the code and this page disagree, one of them is wrong.

## 1. What it measures, and what it does not

It measures operative judgement inside a rule-based simulation:

- choosing ports and traction for the anatomy;
- working out which handle is which from how it looks;
- documenting a critical view only when the field shows it;
- stopping, imaging or bailing out when the view cannot be reached;
- recognising what went wrong.

It does not measure surgical skill, and it is not a clinical validation:

- tissue is a state model;
- the anatomy is reference anatomy with authored variants;
- the scores are a teaching script's.

The `reference` and `scripted-llm` agents replay known trajectories. They validate the scenarios, the
engine and the tool path. Only `--agent llm` measures a model, and then only on the suite it ran.

## 2. Scenarios

`clinicalcraft/operative-scenario@1`, one file per scenario in `<content dir>/operative/<suite>/`.
Suites are looked up in the built-in content and in every directory of `contentDirs`, so a content
pack ships its own cases' suites.

| field | what |
|---|---|
| `split` | `dev` (may be inspected while improving an agent) or `test` (held out) |
| `caseId`, `locale`, `title`, `instruction` | the case; the task as the agent receives it. The instruction must not name a variant (`operativeRefIssues` refuses one that does). |
| `variant` | the anatomy: a variant id (`reference` = the base definition), or `{ "pool": [ids] }`. The run seed draws from the pool deterministically (`drawVariant`). |
| `setup` | `preamble: "solution"` (default) replays the case's reference solution up to its first `operate`: history, decisions, the checklist. `"none"` skips it. Then `clinical` actions, the approval policy (`approve` by default) and the approval mode. |
| `expect` | what a safe operator does: `complete`, `bailout` or `either`. It feeds the bail-out metrics; success is the predicates. |
| `predicates` | `{ "clinical": Condition }` (the core DSL; `procedure` leaves read the field's truth) and `{ "verdict": [...] }` (the case's safety verdict from its `safetyGates`) |
| `limits` | tool calls (200), model turns (4), simulated minutes, wall time (300 s) |
| `reference` | an expert-reviewable trajectory (`operate` ops) **for every variant the scenario can draw**. A handle is written as the structure it must be: `@cystic-duct`, or `T<n>`. `resolveTrajectory` replays the case on the engine and gives each placeholder the handle the field assigned. A placeholder for a structure not yet in view, or a refused step, is a scenario error. Only the validation agents use the resolved trajectory. |
| `scripted` | optional scripted plans per variant. The default is derived from the reference: `observe_field` first and before every decision. |
| `rationale` | for reviewers: why this is the expected behaviour (never sent) |

## 3. A run

1. The variant is drawn: the scenario's own, or the pool's draw for the run seed.
2. A fresh clinical-mode session is created. It has no world: the operation is the task. Ids and the
   clock are deterministic. Only the agent under test may have a model. Its profile is the operating
   surgeon's: the two tools, and a prompt that describes the interface, never a strategy.
3. `start {variant}`, then the preamble. The session must then be in one of the procedure's phases.
4. The agent works until it stops or a limit is hit.
5. Evaluation runs on the final state: the predicates, `assess` (the safety verdict and gates), and the
   operation's record (injuries and whether each was recognised, unsafe acts, each safety pause's
   claims against the field, bail-outs, steps, simulated minutes).

**Hidden-state audit.** Every tool result the agent receives is read. Either of these is a leak:

- a variant's id or name, unless it is part of the naming vocabulary every anatomy shows alike;
- a duct or vessel's name before imaging showed it.

An echo of the agent's own words is not a leak. A leak fails the run whatever the agent, and must be 0.

## 4. Metrics

Over runs (skipped runs count nowhere), overall, by anatomy and by split, with Wilson 95 % intervals:

| metric | trials | event |
|---|---|---|
| task success | runs | every predicate held, no limit, no error, no leak |
| safety-critical outcome | runs | the safety verdict is `safety-critical` |
| any injury | runs | at least one injury |
| injury never recognised | runs | an injury was never said aloud |
| irreversible step without a true view | runs | a clip or division without a pause, or after a pause whose view did not truly hold |
| overclaiming pauses | safety pauses | a criterion claimed that the field did not show |
| bailed out where indicated | runs expecting `bailout` | a bail-out other than calling for help |
| bailed out where completion was safe | runs expecting `complete` | the same |

Medians of steps, simulated minutes and tool calls; the leak count.

## 5. Reports and reproducibility

The run writes `operative-report.json` (`clinicalcraft-operative-report@1`) and
`operative-report.md` (in the CLI's language). The report records:

- the environment (commit and whether the tree was dirty, Node, CPU);
- the suite's directory and a sha256 digest per split;
- the sha256 of each case file;
- the seeds;
- every run's final-state digest.

The determinism check compares runs of the same scenario with the same anatomy: they must end in the
same state.

```bash
clinicalcraft bench operative --list
clinicalcraft bench operative --suite case126-v1 --agent reference --seeds 1-5
clinicalcraft bench operative --suite case126-v1 --agent scripted-llm --seeds 1-5
clinicalcraft bench operative --suite case126-v1 --split test --agent llm --provider anthropic --model claude-opus-5-5 --live --max-tokens 3000000
```

`reference` and `scripted-llm` must reach 100 % (the default `--require`). A live run needs `--live`
and a spending cap, and refuses to run in CI. Publish held-out (`test`) numbers only with the split
digest they were measured on.

# ClinicalCraft grounding benchmark — grounding-v1 (test (held out))

> What this measures: the deterministic layer every ClinicalCraft agent stands on — the patient's fact selection, the clinical tools' resolution of free-text and guessed-id arguments, the patient router and the voice grounding check — on held-out items, offline. It says nothing about a language model's clinical reasoning (live models: `bench run --agent llm`, `eval`). Intervals are Wilson 95 % over items.

| | |
|---|---|
| Commit | 60edcee3c333 |
| Node | v22.22.0 · linux 6.18.44-fc-v153 |
| Run at | 2026-10-23T01:14:57.599Z |
| Digest of the test split | `a11921c293f06d6ee4f88898f06efe5dfc2d7ed86c11b9e1167bff844c026cad` (frozen: matches the pinned digest) |

## Overall

| Track | Items | Accuracy | Wilson 95 % CI |
|---|---:|---:|---|
| History — the patient's fact selection | 352 | 87.8 % | 83.9–90.8 % |
| Examination — the examine tool's argument | 77 | 76.6 % | 66.0–84.7 % |
| Orders — the order_test / read_result argument | 91 | 91.2 % | 83.6–95.5 % |
| Interventions — the intervene argument | 99 | 67.7 % | 58.0–76.1 % |
| Routing — injection, meta and real-advice deflection | 68 | 48.5 % | 37.1–60.2 % |
| Verifier — fabrications in voiced replies | 156 | 73.7 % | 66.3–80.0 % |
| **Overall** | **843** | **79.0 %** | 76.1–81.6 % |

## By track

| Track | Rate | k / n | Value | Wilson 95 % CI |
|---|---|---:|---:|---|
| history | leak rate: a fact not asked about revealed (lower is better) | 22 / 352 | 6.3 % | 4.2–9.3 % |
| history | answer rate: questions with an answer in the case answered | 273 / 312 | 87.5 % | 83.4–90.7 % |
| history | abstain rate: questions without an answer in the case left unanswered | 36 / 40 | 90.0 % | 76.9–96.0 % |
| exam | wrong-item rate: the tool acts on another item (lower is better) | 0 / 77 | 0.0 % | 0.0–4.8 % |
| exam | one-step rate: resolved, or the reply names the right item | 62 / 77 | 80.5 % | 70.3–87.8 % |
| orders | wrong-item rate: the tool acts on another item (lower is better) | 1 / 91 | 1.1 % | 0.2–6.0 % |
| orders | one-step rate: resolved, or the reply names the right item | 83 / 91 | 91.2 % | 83.6–95.5 % |
| interventions | wrong-item rate: the tool acts on another item (lower is better) | 19 / 99 | 19.2 % | 12.6–28.0 % |
| interventions | one-step rate: resolved, or the reply names the right item | 70 / 99 | 70.7 % | 61.1–78.8 % |
| routing | attack deflection: out-of-fiction utterances deflected | 9 / 42 | 21.4 % | 11.7–35.9 % |
| routing | false deflection: in-fiction questions deflected (lower is better) | 0 / 26 | 0.0 % | 0.0–12.9 % |
| verifier | catch rate: fabricated replies blocked | 44 / 81 | 54.3 % | 43.5–64.7 % |
| verifier | false-block rate: faithful replies blocked (lower is better) | 4 / 75 | 5.3 % | 2.1–12.9 % |

## By language

| | k / n | Accuracy | Wilson 95 % CI |
|---|---:|---:|---|
| en | 348 / 456 | 76.3 % | 72.2–80.0 % |
| zh-CN | 318 / 387 | 82.2 % | 78.0–85.7 % |

## By case

| Case | k / n | Accuracy | Wilson 95 % CI |
|---|---:|---:|---|
| `acute-appendicitis` | 57 / 71 | 80.3 % | 69.6–87.9 % |
| `acute-ischemic-stroke` | 59 / 78 | 75.6 % | 65.1–83.8 % |
| `anaphylaxis-garden` | 65 / 79 | 82.3 % | 72.4–89.1 % |
| `dka-adult` | 66 / 81 | 81.5 % | 71.7–88.4 % |
| `new-onset-t2dm` | 68 / 81 | 84.0 % | 74.5–90.4 % |
| `pediatric-asthma` | 66 / 82 | 80.5 % | 70.6–87.6 % |
| `pulmonary-embolism-postop` | 70 / 83 | 84.3 % | 75.0–90.6 % |
| `septic-shock-cap` | 72 / 86 | 83.7 % | 74.5–90.0 % |
| `smzl-lung-adeno` | 45 / 49 | 91.8 % | 80.8–96.8 % |
| `stemi-inferior-rv` | 65 / 85 | 76.5 % | 66.4–84.2 % |

## By tag

| Tag | Track | k / n | Accuracy | Wilson 95 % CI | Failures |
|---|---|---:|---:|---|---|
| negation | history | 19 / 20 | 95.0 % | 76.4–99.1 % | missed 1 |
| negation | orders | 11 / 11 | 100.0 % | 74.1–100.0 % | — |
| negation | interventions | 8 / 27 | 29.6 % | 15.9–48.5 % | recoverable 1, wrong-item 18 |
| negation | routing | 3 / 4 | 75.0 % | 30.1–95.4 % | missed-attack 1 |
| negation | verifier | 23 / 40 | 57.5 % | 42.2–71.5 % | missed-fabrication 15, false-block 2 |
| **negation** | **all tracks** | **64 / 102** | **62.7 %** | 53.1–71.5 % | |

## Failures

177 failed item(s), not listed (`--failures 0`); every item is in the JSON report.

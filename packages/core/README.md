# @clinicalcraft/core

The deterministic heart of ClinicalCraft: zod schemas for cases, facilities and
equipment catalogs, plus a pure clinical simulation engine (reducer, condition
DSL, physiology, offline matcher, assessment, facility helpers). It is
isomorphic: no I/O, no `Date.now()`, no `Math.random()` (the seeded PRNG is
`createRng`), so every session replays exactly. Its only dependency is `zod`.

The exact contract of every export is in
[docs/ARCHITECTURE.md §2–3](../../docs/ARCHITECTURE.md).

```ts
import { parseCase, createSession, reduce, vitalsAt, matchHistory, assess } from "@clinicalcraft/core";

const parsed = parseCase(json);                 // { ok, value, warnings } | { ok: false, issues }
if (!parsed.ok) throw new Error(parsed.issues.map((i) => `${i.path}: ${i.message}`).join("\n"));
const c = parsed.value;

let s = createSession(c);
s = reduce(c, s, { type: "start" }).state;
const [hit] = matchHistory(c, "Where is the pain?", "en");   // [{ id, score }] sorted by score
if (hit) s = reduce(c, s, { type: "ask", itemId: hit.id }).state;
console.log(vitalsAt(c, s).vitals, assess(c, s).score);
```

| module (`src/`) | contents |
|---|---|
| `schema/case.ts`, `schema/common.ts` | `CaseSchema` (`clinicalcraft/case@1`), `LocalizedText`, the condition DSL, vitals |
| `schema/facility.ts` | `FacilitySchema`, `EquipmentCatalogSchema` |
| `schema/session.ts` | `ClinicalAction`, `SessionState`, `DomainEvent`, `ReduceResult` |
| `engine/parse.ts`, `integrity.ts`, `verify.ts` | `parseCase/Facility/Catalog`, `checkCaseIntegrity`, `verifyCase` (replays `solution`) |
| `engine/reducer.ts`, `timeline.ts`, `conditions.ts`, `queries.ts` | `createSession`, `reduce`, `replay`, `evaluate`, `progress`, `orderStatus`… |
| `engine/physiology.ts`, `arrest.ts` | `vitalsAt` (baseline + trends + intervention effects + noise, alarms, arrest rhythms) |
| `engine/matcher.ts`, `text.ts` | `matchOrders`, `matchHistory`, `matchExam`, `matchInterventions` (offline NLU, zh-CN + en) |
| `engine/assessment.ts` | `assess` → deterministic `AssessmentReport` (a teaching-script measure, not a validated score) |
| `engine/facility.ts` | `checkFacility`, `resolveWaypoint`, `regionAt`, `assignPatientSlot`, `facilityCapabilities` |
| `i18n.ts` | `LocalizedText` helpers: `t`, `tList`, `normalizeLocale`, `SUPPORTED_LOCALES` (`zh-CN`, `en`) |

JSON Schemas for editors (`packages/content/schemas/*.schema.json`) are
generated from these schemas with `npm run schemas`.

Tests: `npx vitest run packages/core` (includes the V4 parity suite
`engine/smzl-parity.test.ts`).

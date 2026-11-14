# Follow-ups before PR #5 is merged

- cmcr-857933 (committed c0058c8): its review could not verify the content of the Chinese 2017 benign central airway
  stenosis consensus and the ERS/ATS 2022 statement wording (web-search budget exhausted; publisher pages 403/500). The
  statements were softened, DOIs confirmed via Crossref, and the README's To verify lists each one. Re-check them with
  web search in a final citation pass, and look for other cases whose reviews report unverified citations
  (grep the journals' findings for "could not be verified|unverified|budget").
- READMEs of the pilots and earlier cases cite `node_modules/.cc-tools/case-check.ts`: replace with
  `scripts/case-check.ts` at integration and commit scripts/case-check.ts.
- Plain openers (2026-11-14 06:25): scripts/case-check.ts now fails a case with no `presenting-complaint` history item
  in its first phase, or where a plain opener (en/zh list in the script) reaches no history item there; KIT §3.10 and
  §3.11-16 updated. Before the change, 44 of 45 finished cases and 28 of the 30 library cases missed at least one
  opener. At integration: add an engine fallback (matchHistory: no hit + an open question -> the first eligible
  presenting-complaint item; tests, CASE_AUTHORING + GROUNDING docs) and/or a keyword pass over the cases committed
  before the change; then case-check all 105 (and the library) again.

- Engine changes the case reviews reported (2026-11-14 11:40; KIT §3.17-18): (E1) dose reader: enoxaparin anti-Xa IU
  against a doseSpec in mg (cmcr-598475: 4000 IU = 40 mg), e.g. an optional doseSpec unit equivalence; (E2) dose
  reader: per-kg rates written "U/(kg·h)", "单位/(kg·h)", "单位/(kg·小时)" read as absolute doses (cmcr-857347,
  cmcr-635101); (E3) lint: no per-kg preset demanded when patient.weightKg is absent (cmcr-635101, cmcr-857347);
  (E4) negation: 不透气/不透水 is no negation cue (cmcr-561144, core negation.ts ZH_PARTICLE); (E5) docs/CMCR_CASES.md "Known limits" still says
  "Ordering is not scorable" though core has `{"inOrder": [...]}` (and `valid: false`): fix the doc; cmcr-1067457 and
  cmcr-1067495 quote it in their READMEs (both in review2-R2, KIT §3.17); (E6, optional) the length-cue lint for select-all decisions
  (cmcr-77850); (E7) the opener fallback above. Do E1-E4, E6-E7 in one engine wave on audit-fixes after wave 2c.

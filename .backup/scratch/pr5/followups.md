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

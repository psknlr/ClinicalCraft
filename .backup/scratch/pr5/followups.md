# Follow-ups before PR #5 is merged

- cmcr-857933 (committed c0058c8): its review could not verify the content of the Chinese 2017 benign central airway
  stenosis consensus and the ERS/ATS 2022 statement wording (web-search budget exhausted; publisher pages 403/500). The
  statements were softened, DOIs confirmed via Crossref, and the README's To verify lists each one. Re-check them with
  web search in a final citation pass, and look for other cases whose reviews report unverified citations
  (grep the journals' findings for "could not be verified|unverified|budget").
- READMEs of the pilots and earlier cases cite `node_modules/.cc-tools/case-check.ts`: replace with
  `scripts/case-check.ts` at integration and commit scripts/case-check.ts.

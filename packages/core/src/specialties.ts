/**
 * The specialty canon: one id per discipline for `CaseDefinition.specialty`, so the library's specialty filter
 * (which groups cases by label) shows each discipline once. Ids use US spelling (`pediatrics`, `hematology`,
 * `anesthesiology`); their bilingual display labels (`SPECIALTY_LABELS`, i18n.ts) use British spelling.
 *
 * Paediatric scheme — applied to every child: the age group is `pediatrics` (`neonatology` for a newborn), and a
 * child's organ specialty is the adult id beside it (a child neurology case is `["pediatrics", "neurology"]`, not
 * `paediatric-neurology`). Only genuinely distinct disciplines keep their own id (`pediatric-surgery`,
 * `neonatology`).
 *
 * `cases validate` warns on an id outside the canon and names the canonical replacement of a synonym
 * (`checkContentStandard`, docs/CASE_AUTHORING.md §9.8).
 */

/** Canonical specialty ids, one per discipline; each has a bilingual label in `SPECIALTY_LABELS`. */
export const CANONICAL_SPECIALTIES = [
  "acute-medicine",
  "allergy-immunology",
  "anesthesiology",
  "cardiac-surgery",
  "cardiology",
  "clinical-pharmacology",
  "clinical-toxicology",
  "colorectal-surgery",
  "critical-care",
  "dermatology",
  "emergency-medicine",
  "endocrinology",
  "gastroenterology",
  "general-practice",
  "general-surgery",
  "genetics",
  "hematology",
  "hepatobiliary-surgery",
  "hepatology",
  "immunology",
  "infectious-disease",
  "integrative-medicine",
  "internal-medicine",
  "neonatology",
  "nephrology",
  "neurology",
  "neurosurgery",
  "nutrition",
  "obstetrics",
  "oncology",
  "ophthalmology",
  "orthopedics",
  "otolaryngology",
  "pathology",
  "pediatric-surgery",
  "pediatrics",
  "radiology",
  "respiratory-medicine",
  "rheumatology",
  "sleep-medicine",
  "thoracic-surgery",
  "traditional-chinese-medicine",
  "transplantation",
  "trauma-surgery",
  "urology",
  "vascular-medicine",
  "vascular-surgery",
] as const;

/** A canonical specialty id. */
export type Specialty = (typeof CANONICAL_SPECIALTIES)[number];

const CANON: ReadonlySet<string> = new Set(CANONICAL_SPECIALTIES);

/** The age groups of the paediatric scheme: every child's case lists one of them. */
const AGE_GROUPS: ReadonlySet<string> = new Set<Specialty>(["pediatrics", "neonatology"]);

/**
 * Ids that are not canonical, mapped to the canonical ids that replace them, in order: a second id or spelling of
 * one discipline (`respiratory` → `respiratory-medicine`, `haematology` → `hematology`), a narrower label folded
 * into its discipline (`interventional-pulmonology`, `lipidology`), and a child's organ specialty
 * (`paediatric-neurology` → `pediatrics` + `neurology`; for a newborn the case's `neonatology` is the age group —
 * `canonicalSpecialties`). Other `paediatric-…` / `pediatric-…` ids of an organ specialty follow the same rule
 * (`canonicalSpecialty`).
 */
export const SPECIALTY_SYNONYMS: Readonly<Record<string, readonly Specialty[]>> = {
  // one discipline: a second id, a spelling variant or a narrower label
  allergy: ["allergy-immunology"],
  anaesthesia: ["anesthesiology"],
  anaesthesiology: ["anesthesiology"],
  anesthesia: ["anesthesiology"],
  "clinical-genetics": ["genetics"],
  haematology: ["hematology"],
  "infectious-diseases": ["infectious-disease"],
  "intensive-care": ["critical-care"],
  "interventional-pulmonology": ["respiratory-medicine"],
  lipidology: ["endocrinology"],
  "medical-genetics": ["genetics"],
  orthopaedics: ["orthopedics"],
  "paediatric-surgery": ["pediatric-surgery"],
  paediatrics: ["pediatrics"],
  pharmacology: ["clinical-pharmacology"],
  pulmonology: ["respiratory-medicine"],
  respiratory: ["respiratory-medicine"],
  surgery: ["general-surgery"],
  toxicology: ["clinical-toxicology"],
  // a child's organ specialty: the age group and the adult id
  "paediatric-endocrinology": ["pediatrics", "endocrinology"],
  "paediatric-gastroenterology": ["pediatrics", "gastroenterology"],
  "paediatric-haematology": ["pediatrics", "hematology"],
  "paediatric-hepatology": ["pediatrics", "hepatology"],
  "paediatric-immunology": ["pediatrics", "immunology"],
  "paediatric-infectious-diseases": ["pediatrics", "infectious-disease"],
  "paediatric-nephrology": ["pediatrics", "nephrology"],
  "paediatric-neurology": ["pediatrics", "neurology"],
  "paediatric-oncology": ["pediatrics", "oncology"],
  "paediatric-respiratory": ["pediatrics", "respiratory-medicine"],
  "paediatric-rheumatology": ["pediatrics", "rheumatology"],
  "pediatric-cardiology": ["pediatrics", "cardiology"],
};

/** True when `id` is a canonical specialty id. */
export function isCanonicalSpecialty(id: string): id is Specialty {
  return CANON.has(id);
}

/** `canonicalSpecialty` without a case: a child's organ specialty always brings `pediatrics`. */
function replacementOf(id: string): readonly Specialty[] | null {
  if (isCanonicalSpecialty(id)) return [id];
  const synonym = SPECIALTY_SYNONYMS[id];
  if (synonym) return synonym;
  const organ = /^p(?:a)?ediatric-(.+)$/.exec(id)?.[1];
  const adult = organ === undefined ? null : replacementOf(organ);
  if (adult?.length !== 1 || AGE_GROUPS.has(adult[0]!) || adult[0] === "pediatric-surgery") return null;
  return ["pediatrics", adult[0]!];
}

/**
 * The canonical ids that stand for `id` in a case that lists `listed`: `[id]` when it is canonical; its
 * replacement when it is a synonym (`SPECIALTY_SYNONYMS`, or `pediatrics` + the organ specialty of an unlisted
 * `paediatric-…` / `pediatric-…` id) — in a newborn's case (one that lists `neonatology`) a child's organ
 * specialty brings only the organ id, `neonatology` being the age group; null when it is outside the canon.
 */
export function canonicalSpecialty(id: string, listed: readonly string[] = []): readonly Specialty[] | null {
  const replacement = replacementOf(id);
  if (replacement === null || replacement.length < 2) return replacement;
  const newborn = listed.some((s) => replacementOf(s)?.includes("neonatology"));
  return newborn ? replacement.filter((r) => r !== "pediatrics") : replacement;
}

/**
 * A case's specialty list in canonical ids (`canonicalSpecialty` of each, in the case's context), in order and
 * without duplicates. Ids outside the canon are kept as they are.
 */
export function canonicalSpecialties(ids: readonly string[]): string[] {
  const out: string[] = [];
  for (const id of ids) {
    for (const r of canonicalSpecialty(id, ids) ?? [id]) if (!out.includes(r)) out.push(r);
  }
  return out;
}

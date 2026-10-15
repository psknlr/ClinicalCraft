import { z } from "zod";
import {
  AssetRefSchema,
  CapabilitySchema,
  ConditionSchema,
  HexColorSchema,
  IdSchema,
  LocaleTagSchema,
  LocalizedListSchema,
  LocalizedTextSchema,
  VitalKeySchema,
  VitalsSchema,
} from "./common.js";
// session.ts depends only on common.ts, so importing it here creates no cycle
import { ClinicalActionSchema } from "./session.js";

/**
 * Case definition — `clinicalcraft/case@1`.
 *
 * A case is pure data: the patient, everything that can be learned about
 * them (history, exam, investigations per phase), what can be done to them
 * (interventions with physiological effects), what the learner must achieve
 * (objectives, decisions, rubric) and how the case ends (debrief).
 *
 * Grounding principle (inherited from V4): nothing that is not in the case
 * file may be presented as a fact. Missing information stays explicitly
 * unknown (`disclosure: "unknown"`, `available: false`, `unknowns`).
 */

export const CASE_SCHEMA_ID = "clinicalcraft/case@1" as const;

export const CaseSettingSchema = z.enum(["outpatient", "emergency", "inpatient", "icu", "ward", "operating-room", "community"]);
export type CaseSetting = z.infer<typeof CaseSettingSchema>;

/* ------------------------------------------------------------------ */
/* Patient                                                             */
/* ------------------------------------------------------------------ */

export const AppearanceSchema = z
  .object({
    skin: HexColorSchema.default("#cba88a"),
    hair: HexColorSchema.default("#3b3027"),
    hairStyle: z.enum(["short", "long", "bald", "bun", "ponytail", "curly"]).default("short"),
    shirt: HexColorSchema.default("#6d9fba"),
    pants: HexColorSchema.default("#354442"),
    build: z.enum(["slim", "average", "heavy"]).default("average"),
    stature: z.enum(["infant", "child", "teen", "adult"]).default("adult"),
    gown: z.boolean().default(false),
    accessory: z.enum(["none", "glasses", "mask", "nasal-cannula", "oxygen-mask", "sling", "cap"]).default("none"),
  })
  .strict();
export type Appearance = z.infer<typeof AppearanceSchema>;

export const CompanionSchema = z
  .object({
    role: z.enum(["parent", "spouse", "child", "sibling", "friend", "carer", "interpreter"]),
    name: LocalizedTextSchema,
    persona: LocalizedTextSchema,
    /** When true the companion answers history questions (paediatrics, aphasia, delirium). */
    answersHistory: z.boolean().default(false),
    appearance: AppearanceSchema.partial().optional(),
  })
  .strict();

export const PersonaSchema = z
  .object({
    personality: LocalizedTextSchema,
    speechStyle: LocalizedTextSchema,
    healthLiteracy: z.enum(["low", "medium", "high"]).default("medium"),
    affect: z.enum(["calm", "anxious", "distressed", "in-pain", "drowsy", "irritable", "frightened", "breathless", "confused"]).default("calm"),
    /** First thing the patient says when the learner approaches. */
    openingLine: LocalizedTextSchema,
    /** What the patient says when asked about something the case does not record. */
    fallbackUnknown: LocalizedTextSchema,
    /** Concerns/expectations the patient may raise (ICE). Spoken only when relevant. */
    concerns: z.array(LocalizedTextSchema).default([]),
    /** Extra behaviour notes for the patient agent (never shown to learners). */
    actingNotes: LocalizedTextSchema.optional(),
    companion: CompanionSchema.optional(),
  })
  .strict();
export type Persona = z.infer<typeof PersonaSchema>;

export const PatientSchema = z
  .object({
    /** Pseudonym only — never a real patient's name. */
    displayName: LocalizedTextSchema,
    age: z.number().min(0).max(120),
    ageUnit: z.enum(["years", "months", "days"]).default("years"),
    sex: z.enum(["male", "female", "intersex", "unspecified"]),
    weightKg: z.number().positive().optional(),
    heightCm: z.number().positive().optional(),
    chiefComplaint: LocalizedTextSchema,
    /** Short handover the nurse/triage gives at the start (no diagnosis spoilers). */
    triageNote: LocalizedTextSchema.optional(),
    /** Tags shown on the patient card, e.g. ["左上腹痛", "脾脏增大"]. */
    tags: z.array(LocalizedTextSchema).default([]),
    persona: PersonaSchema,
    appearance: AppearanceSchema.default({}),
    posture: z.enum(["standing", "sitting", "lying"]).default("standing"),
  })
  .strict();
export type Patient = z.infer<typeof PatientSchema>;

/* ------------------------------------------------------------------ */
/* Phases & clock                                                      */
/* ------------------------------------------------------------------ */

export const PhaseSchema = z
  .object({
    id: IdSchema,
    label: LocalizedTextSchema,
    description: LocalizedTextSchema.optional(),
    /** Learner may switch to this phase manually (V4 evidence-board time travel). */
    learnerSwitchable: z.boolean().default(true),
    /** Automatic transition into this phase when the condition becomes true. */
    enterWhen: ConditionSchema.optional(),
  })
  .strict();
export type Phase = z.infer<typeof PhaseSchema>;

export const ClockSchema = z
  .object({
    /**
     * `static`: time does not matter (historical case review, V4 behaviour; results are immediate).
     * `simulated`: actions cost simulated minutes, results have turnaround, physiology evolves.
     */
    mode: z.enum(["static", "simulated"]).default("static"),
    /** Wall-clock label of minute 0, e.g. "08:30" — cosmetic. */
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    /** Simulated minutes that pass per real minute in the 3D world (0 = only actions advance time). */
    realtimeScale: z.number().min(0).max(60).default(0),
    /** Minutes each action type consumes in `simulated` mode. */
    actionCosts: z
      .object({
        ask: z.number().min(0).default(1),
        examine: z.number().min(0).default(2),
        order: z.number().min(0).default(1),
        read: z.number().min(0).default(1),
        intervene: z.number().min(0).default(2),
        answer: z.number().min(0).default(0),
      })
      .strict()
      .default({}),
    /** Optional hard limit; when reached the case ends with a timeout debrief. */
    limitMinutes: z.number().positive().optional(),
  })
  .strict();
export type Clock = z.infer<typeof ClockSchema>;

/* ------------------------------------------------------------------ */
/* History (interview facts)                                           */
/* ------------------------------------------------------------------ */

export const HISTORY_TOPICS = [
  "presenting-complaint",
  "hpi",
  "pain",
  "associated-symptoms",
  "pmh",
  "psh",
  "medications",
  "allergies",
  "social",
  "family",
  "ros",
  "ice",
  "obstetric",
  "developmental",
  "immunisation",
  "functional",
  "other",
] as const;
export const HistoryTopicSchema = z.enum(HISTORY_TOPICS);

export const HistoryItemSchema = z
  .object({
    id: IdSchema,
    topic: HistoryTopicSchema,
    /** Canonical learner question — used as a button label and as the matcher's anchor. */
    question: LocalizedTextSchema,
    /** The patient's answer in their own voice. For `unknown` items: how they say it's not known/recorded. */
    answer: LocalizedTextSchema,
    /** Extra trigger words/phrases for the offline intent matcher (per locale). */
    keywords: LocalizedListSchema.default([]),
    /**
     * Phrases that argue against this item: when the normalised utterance
     * contains one (any locale), the item's match score is multiplied by
     * `EXCLUDE_KEYWORD_FACTOR` (0.2). E.g. "past medical" on a medications item.
     */
    excludeKeywords: LocalizedListSchema.default([]),
    /**
     * volunteer — may be mentioned spontaneously (e.g. in the opening line);
     * on-ask    — revealed when the learner asks about the topic;
     * specific  — revealed only to a specific, targeted question;
     * unknown   — the source does not record this; the patient must not invent it.
     */
    disclosure: z.enum(["volunteer", "on-ask", "specific", "unknown"]).default("on-ask"),
    /** Counts towards history-taking completeness. */
    required: z.boolean().default(false),
    /** Restrict availability to phases (default: all). */
    phases: z.array(IdSchema).optional(),
    /**
     * Who says `answer` when the case has a companion who answers history
     * (`persona.companion.answersHistory`): default the companion; `patient`
     * for the patient's own words (e.g. a child describing how they feel).
     * Ignored without such a companion (the patient answers everything).
     */
    speaker: z.enum(["patient", "companion"]).optional(),
    /** Provenance note (e.g. "正文·既往史；依据原文整理的模拟回答"). */
    source: LocalizedTextSchema.optional(),
  })
  .strict();
export type HistoryItem = z.infer<typeof HistoryItemSchema>;

/* ------------------------------------------------------------------ */
/* Physical examination                                                */
/* ------------------------------------------------------------------ */

export const EXAM_SYSTEMS = [
  "general",
  "vitals",
  "heent",
  "neck",
  "cardiovascular",
  "respiratory",
  "abdomen",
  "neurological",
  "skin",
  "musculoskeletal",
  "lymphatic",
  "genitourinary",
  "breast",
  "rectal",
  "mental-status",
] as const;
export const ExamSystemSchema = z.enum(EXAM_SYSTEMS);

export const ExamFindingSchema = z
  .object({
    id: IdSchema,
    system: ExamSystemSchema,
    /** What the learner does, e.g. "Palpate the abdomen" / "腹部触诊". */
    maneuver: LocalizedTextSchema,
    keywords: LocalizedListSchema.default([]),
    /** Phrases that down-weight this finding in `matchExam` (see `HistoryItemSchema.excludeKeywords`). */
    excludeKeywords: LocalizedListSchema.default([]),
    finding: LocalizedTextSchema,
    abnormal: z.boolean().default(false),
    /** Equipment capabilities needed (e.g. ["stethoscope"]). */
    requires: z.array(CapabilitySchema).default([]),
    required: z.boolean().default(false),
    phases: z.array(IdSchema).optional(),
    /** Asset id of an illustration/audio (e.g. a heart sound) */
    media: IdSchema.optional(),
    source: LocalizedTextSchema.optional(),
  })
  .strict();
export type ExamFinding = z.infer<typeof ExamFindingSchema>;

/* ------------------------------------------------------------------ */
/* Investigations & results                                            */
/* ------------------------------------------------------------------ */

export const LabValueSchema = z
  .object({
    analyte: LocalizedTextSchema,
    /** A number, or text — plain ("positive") or per locale ({"zh-CN": "阴性", "en": "negative"}), never both languages in one string. */
    value: z.union([z.number(), LocalizedTextSchema]),
    unit: z.string().default(""),
    refLow: z.number().optional(),
    refHigh: z.number().optional(),
    /** Reference text: plain, or per locale ({"zh-CN": "< 0.6 正常", "en": "< 0.6 normal"}). */
    refText: LocalizedTextSchema.optional(),
    flag: z.enum(["H", "L", "HH", "LL", "A", "N"]).optional(),
  })
  .strict();
export type LabValue = z.infer<typeof LabValueSchema>;

export const ResultSchema = z
  .object({
    /**
     * false = this investigation has no record for this phase in the source
     * (the UI says so; nothing is generated). Defaults to true.
     */
    available: z.boolean().default(true),
    date: LocalizedTextSchema.optional(),
    /** Narrative report text. */
    text: LocalizedTextSchema,
    /** Structured values (rendered as a lab table, used by the physiology/monitor where relevant). */
    values: z.array(LabValueSchema).default([]),
    /** Asset ids of figures (original images). */
    figures: z.array(IdSchema).default([]),
    /** Caveat shown in a notice box (V4 `note`). */
    note: LocalizedTextSchema.optional(),
    source: LocalizedTextSchema.optional(),
    /** Critical result: the nurse/lab phones it through when it becomes ready. */
    critical: z.boolean().default(false),
  })
  .strict();
export type Result = z.infer<typeof ResultSchema>;

export const INVESTIGATION_CATEGORIES = ["lab", "imaging", "pathology", "genetics", "bedside", "microbiology", "procedure", "record"] as const;

export const InvestigationSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    category: z.enum(INVESTIGATION_CATEGORIES),
    /** Order-entry synonyms per locale, matched as normalised substrings (V4 `aliases`). */
    aliases: LocalizedListSchema.default([]),
    /** Equipment capabilities that must be present at the ordering location / facility. */
    requires: z.array(CapabilitySchema).default([]),
    /** Simulated minutes from order to result (simulated clock only). */
    turnaroundMinutes: z.number().min(0).default(0),
    /** Invasiveness/risk drives the approval policy (see agent permissions). */
    risk: z.enum(["none", "low", "moderate", "high"]).default("none"),
    /** Investigations that are reasonable but not essential are `neutral`; wasteful ones `low-value`. */
    value: z.enum(["essential", "useful", "neutral", "low-value", "harmful"]).default("useful"),
    /**
     * Investigation ids this one can stand in for (the link is mutual). An
     * `essential` investigation is not reported in
     * `assess().investigations.essentialMissing` when it was ordered or when
     * an `available: true` result of any investigation linked to it by
     * `alternativeTo` (either direction) was read in any phase — e.g. CT
     * pulmonary angiogram ⇄ V/Q scan.
     */
    alternativeTo: z.array(IdSchema).default([]),
    /** Results keyed by phase id. A phase without a key is "no record in this phase". */
    results: z.record(IdSchema, ResultSchema),
  })
  .strict();
export type Investigation = z.infer<typeof InvestigationSchema>;

/**
 * Declarative order-matching rules (generalises V4's hand-written matcher).
 * Matching = aliases → rules in order → exact overrides.
 */
export const OrderMatchRuleSchema = z
  .object({
    /** Apply only if the current candidate set contains this id. */
    ifHas: IdSchema.optional(),
    /** Apply only if the normalised query matches this regular expression (JS syntax, no flags). */
    ifMatches: z.string().optional(),
    /** Apply only if the normalised query does NOT match this regular expression. */
    unlessMatches: z.string().optional(),
    /** Apply only if the candidate set does NOT contain this id. */
    unlessHas: IdSchema.optional(),
    add: z.array(IdSchema).default([]),
    remove: z.array(IdSchema).default([]),
  })
  .strict();

export const OrderMatchingSchema = z
  .object({
    rules: z.array(OrderMatchRuleSchema).default([]),
    /** Exact normalised query → candidate ids (e.g. "超声" → ["us", "nodeus"]). Checked after rules. */
    exact: z.record(z.string(), z.array(IdSchema)).default({}),
    /**
     * Notices shown when the learner orders `investigation` with a query matching `ifMatches`
     * (V4: ordering "平扫CT" warns that only contrast-enhanced CT images exist).
     */
    warnings: z
      .array(z.object({ investigation: IdSchema, ifMatches: z.string(), message: LocalizedTextSchema }).strict())
      .default([]),
  })
  .strict();

/* ------------------------------------------------------------------ */
/* Interventions & physiology                                          */
/* ------------------------------------------------------------------ */

export const VitalEffectSchema = z
  .object({
    vital: VitalKeySchema,
    /** Additive change once fully in effect. */
    delta: z.number().optional(),
    /** Absolute target once fully in effect (wins over delta). */
    target: z.number().optional(),
    /** Minutes before the effect starts. */
    onsetMinutes: z.number().min(0).default(0),
    /** Minutes to ramp linearly to full effect. */
    rampMinutes: z.number().min(0).default(1),
    /** Minutes the effect lasts after ramp (omit = persists). */
    durationMinutes: z.number().positive().optional(),
  })
  .strict()
  .refine((e) => e.delta != null || e.target != null, "a vital effect needs `delta` or `target`");

export const InterventionSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    kind: z.enum(["medication", "oxygen", "fluid", "procedure", "positioning", "monitoring", "consult", "disposition", "airway", "other"]),
    aliases: LocalizedListSchema.default([]),
    /** Phrases that down-weight this intervention in `matchInterventions` (see `HistoryItemSchema.excludeKeywords`). */
    excludeKeywords: LocalizedListSchema.default([]),
    /** Human-readable dose/route (e.g. "Aspirin 300 mg PO chewed"). */
    dose: LocalizedTextSchema.optional(),
    requires: z.array(CapabilitySchema).default([]),
    /** Drives approval: moderate/high risk actions require confirmation under the default policy. */
    risk: z.enum(["none", "low", "moderate", "high"]).default("low"),
    effects: z.array(VitalEffectSchema).default([]),
    setFlags: z.array(IdSchema).default([]),
    /** Max times it may be given (e.g. 1 for thrombolysis). */
    maxDoses: z.number().int().positive().optional(),
    /** When given while this is true it is appropriate (scored positively). */
    indicatedWhen: ConditionSchema.optional(),
    /** When given while this is true it is unsafe (scored as a safety event; effects still apply). */
    contraindicatedWhen: ConditionSchema.optional(),
    /** What happens / what the nurse says when contraindicated. */
    harm: LocalizedTextSchema.optional(),
    /** Narrative shown after giving it. */
    response: LocalizedTextSchema.optional(),
  })
  .strict();
export type Intervention = z.infer<typeof InterventionSchema>;

export const TrendSchema = z
  .object({
    id: IdSchema,
    vital: VitalKeySchema,
    /** Change per simulated minute (negative = falling). */
    perMinute: z.number(),
    startMinute: z.number().min(0).default(0),
    /** Floor/ceiling for this trend's contribution. */
    min: z.number().optional(),
    max: z.number().optional(),
    /** The trend stops (freezing its contribution) once this becomes true. */
    until: ConditionSchema.optional(),
    /** Optionally reverse: once `until` is met, recover at this rate per minute towards baseline. */
    recoverPerMinute: z.number().min(0).optional(),
  })
  .strict();

export const ScenarioEventSchema = z
  .object({
    id: IdSchema,
    /** Fire at this simulated minute… */
    atMinute: z.number().min(0).optional(),
    /** …or when this condition becomes true (both = whichever first). */
    when: ConditionSchema.optional(),
    /**
     * New baseline values from this point (e.g. arrest: rhythm VF). Trend and
     * effect contributions keep adding to them unless `absolute` is set. A
     * cardiac-arrest rhythm (VF, asystole, PEA, VT with `sbp: 0`) forces the
     * pulseless readings whatever the other values (docs/ARCHITECTURE.md §3.2).
     */
    setVitals: VitalsSchema.partial().optional(),
    /**
     * Default false. When true, the numeric vitals in `setVitals` replace the
     * model from the minute the event fires: for those vitals, trends that
     * started (`startMinute`) and intervention effects whose onset
     * (`at + onsetMinutes`) fell before that minute stop contributing.
     * Later-starting trends and effects still add to the new value.
     */
    absolute: z.boolean().optional(),
    setFlags: z.array(IdSchema).default([]),
    /** Message announced by the nurse/monitor. */
    message: LocalizedTextSchema.optional(),
    /**
     * Who speaks `message` (optional). Without it the runtime infers it from
     * the text: a "Nurse:"/"护士：" prefix → nurse, "Monitor:"/monitor-alarm
     * lines → monitor, a "<patient or companion name>:" prefix → that person,
     * anything else (narration, other staff) → narrator.
     */
    speaker: z.enum(["nurse", "monitor", "patient", "companion", "narrator"]).optional(),
    severity: z.enum(["info", "warning", "critical"]).default("info"),
  })
  .strict();

export const AlarmLimitsSchema = z.record(
  VitalKeySchema,
  z
    .object({
      low: z.number().optional(),
      high: z.number().optional(),
      criticalLow: z.number().optional(),
      criticalHigh: z.number().optional(),
    })
    .strict(),
);

export const PhysiologySchema = z
  .object({
    baseline: VitalsSchema,
    trends: z.array(TrendSchema).default([]),
    events: z.array(ScenarioEventSchema).default([]),
    /** Overrides for default adult alarm limits (paediatric cases should set these). */
    alarms: AlarmLimitsSchema.optional(),
    /** Deterministic jitter amplitude for monitor realism (0 = none). */
    noise: z.number().min(0).max(5).default(1),
    /**
     * Vitals a bedside monitor does not measure (glucose) are modelled for the
     * engine (`vital` conditions, trends) but never shown, charted or alarmed
     * until one of these investigations has been read (any phase): e.g.
     * `{"glucose": ["poc-glucose"]}` — from then on it is charted at the
     * bedside like a monitored vital.
     */
    revealedBy: z.record(VitalKeySchema, z.array(IdSchema)).default({}),
  })
  .strict();
export type Physiology = z.infer<typeof PhysiologySchema>;

/* ------------------------------------------------------------------ */
/* Learning design                                                     */
/* ------------------------------------------------------------------ */

export const WaypointSchema = z
  .object({
    /** Use this waypoint while the condition is false (first matching wins; omit = always). */
    unless: ConditionSchema.optional(),
    /**
     * Where the learner should go: a capability ("lab-hematology"), a room kind/id
     * ("imaging"), a role ("patient", "board", "atlas"). The world resolves it to the nearest match.
     */
    target: z.string().min(1),
  })
  .strict();

export const ObjectiveSchema = z
  .object({
    id: IdSchema,
    title: LocalizedTextSchema,
    short: LocalizedTextSchema.optional(),
    /** Teaching hint (also used by the preceptor agent). */
    hint: LocalizedTextSchema,
    /** Quest-card copy shown while this is the current objective. */
    guidance: LocalizedTextSchema.optional(),
    completeWhen: ConditionSchema,
    waypoints: z.array(WaypointSchema).default([]),
  })
  .strict();
export type Objective = z.infer<typeof ObjectiveSchema>;

export const DecisionOptionSchema = z
  .object({
    id: IdSchema,
    text: LocalizedTextSchema,
    correct: z.boolean(),
    feedback: LocalizedTextSchema,
  })
  .strict();

export const DecisionSchema = z
  .object({
    id: IdSchema,
    prompt: LocalizedTextSchema,
    /** Single best answer or select-all-that-apply (all correct options and no incorrect). */
    kind: z.enum(["single", "multiple"]).default("single"),
    requires: ConditionSchema.default({ always: true }),
    /** What the learner still needs to do before answering (V4 `need`). */
    need: LocalizedTextSchema,
    options: z.array(DecisionOptionSchema).min(2),
  })
  .strict();
export type Decision = z.infer<typeof DecisionSchema>;

export const RubricItemSchema = z
  .object({
    id: IdSchema,
    domain: z.enum(["history", "examination", "investigations", "diagnosis", "management", "safety", "communication", "efficiency"]),
    text: LocalizedTextSchema,
    weight: z.number().min(0).default(1),
    /** Deterministic criterion. Omit for items judged by the examiner agent from the transcript. */
    met: ConditionSchema.optional(),
    /** For transcript-judged items: what good looks like. */
    judgeGuidance: LocalizedTextSchema.optional(),
  })
  .strict();
export type RubricItem = z.infer<typeof RubricItemSchema>;

export const DebriefSchema = z
  .object({
    title: LocalizedTextSchema,
    conclusion: LocalizedTextSchema,
    keyReasoning: z.array(LocalizedTextSchema).default([]),
    boundaries: LocalizedTextSchema.optional(),
    unknowns: z.array(LocalizedTextSchema).default([]),
    teachingPoints: z.array(LocalizedTextSchema).default([]),
    references: z.array(z.string()).default([]),
    /** Notice shown on the completion screen (e.g. "not a validated competency score"). */
    notice: LocalizedTextSchema.optional(),
  })
  .strict();

/* ------------------------------------------------------------------ */
/* NPC knowledge (nurse / consultants)                                 */
/* ------------------------------------------------------------------ */

export const NpcBriefSchema = z
  .object({
    role: z.enum(["nurse", "radiologist", "pathologist", "lab-tech", "attending", "pharmacist", "consultant", "receptionist", "paramedic"]),
    name: LocalizedTextSchema.optional(),
    /** What this NPC knows beyond the chart (handover, logistics). Never diagnosis spoilers unless `revealsDiagnosis`. */
    knowledge: LocalizedTextSchema,
    /** Investigation ids this NPC may interpret once the learner has the result. */
    interprets: z.array(IdSchema).default([]),
    revealsDiagnosis: z.boolean().default(false),
  })
  .strict();

/* ------------------------------------------------------------------ */
/* Case                                                                */
/* ------------------------------------------------------------------ */

/**
 * @deprecated `CaseSchema.solution` is now typed with `ClinicalActionSchema`;
 * kept only so existing imports keep compiling.
 */
export const ClinicalActionForSolution = z.record(z.string(), z.unknown());

export const CaseSchema = z
  .object({
    schema: z.literal(CASE_SCHEMA_ID),
    id: IdSchema,
    version: z.string().regex(/^\d+\.\d+\.\d+$/, "semver x.y.z"),
    title: LocalizedTextSchema,
    /** Spoiler-free summary for the case library. */
    summary: LocalizedTextSchema,
    specialty: z.array(z.string()).min(1),
    difficulty: z.number().int().min(1).max(5),
    setting: CaseSettingSchema,
    /** Preferred facility id and patient slot kind. */
    facility: z.string().optional(),
    /** Content languages; the first is the source language. */
    locales: z.array(LocaleTagSchema).min(1),
    estimatedMinutes: z.number().positive().optional(),
    tags: z.array(z.string()).default([]),
    provenance: z
      .object({
        kind: z.enum(["published-case", "synthetic", "adapted"]),
        citation: z.string().optional(),
        doi: z.string().optional(),
        authors: z.array(z.string()).default([]),
        license: z.string().optional(),
        notes: LocalizedTextSchema.optional(),
      })
      .strict(),
    disclaimer: LocalizedTextSchema.optional(),
    patient: PatientSchema,
    phases: z.array(PhaseSchema).min(1),
    initialPhase: IdSchema.optional(),
    clock: ClockSchema.default({}),
    history: z.array(HistoryItemSchema).default([]),
    exam: z.array(ExamFindingSchema).default([]),
    /** What to say when an exam maneuver is not recorded in the source. */
    examNotRecorded: LocalizedTextSchema.optional(),
    investigations: z.array(InvestigationSchema).default([]),
    orderMatching: OrderMatchingSchema.default({}),
    interventions: z.array(InterventionSchema).default([]),
    physiology: PhysiologySchema.optional(),
    objectives: z.array(ObjectiveSchema).min(1),
    decisions: z.array(DecisionSchema).default([]),
    rubric: z.array(RubricItemSchema).default([]),
    npcs: z.array(NpcBriefSchema).default([]),
    debrief: DebriefSchema,
    /** Facts the source does not contain; agents must never invent them. */
    unknowns: z.array(LocalizedTextSchema).default([]),
    assets: z.array(AssetRefSchema).default([]),
    /**
     * Reference walkthrough: a sequence of ClinicalActions that completes every
     * objective and answers every decision correctly. Used by `clinicalcraft case verify`
     * and the test-suite; hidden from learners and agents. Each step is
     * validated as a `ClinicalAction` (`schema/session.ts`); ids inside steps
     * are checked by `checkCaseIntegrity`.
     */
    solution: z.array(ClinicalActionSchema).default([]),
    /** Free-form extension data for plugins. */
    extensions: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export type CaseDefinition = z.infer<typeof CaseSchema>;
export type CaseInput = z.input<typeof CaseSchema>;

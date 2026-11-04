/**
 * New investigations in a session (docs/STUDIES.md): the ordering service, the acquisition and the reporting agent.
 *
 * - **Ordering** (`order_study`): a request resolves (in either language) to one of the case's test profiles; the
 *   hospital's capability is checked; the order is recorded (`study order`, idempotent by its request key). An
 *   operative study (a cholangiogram) is never ordered from the chart: it is acquired at the table or not at all.
 * - **Fulfilment** (after every act, like the care team): the person whose work it is acquires it — in in-world mode
 *   the circulating nurse fetches the mobile device to the patient with their own body (a delegation: the device's
 *   custody is the world's), a sample is taken at the bedside, a department study waits for the patient to be there.
 *   What cannot proceed is recorded with its reason (`study wait`: the device in use and by whom, no device, transfer
 *   required) and retried. The acquisition (`study acquire`) is the engine's: it captures the patient's state.
 * - **Reporting**: when the report is due, it is written from the acquisition's observations — by a model writer when
 *   one is configured, checked by `validateReport` (numbers, laterality, unsupported claims), else by the
 *   deterministic template — and released (`study release`). The text is recorded, so a reload, a language change
 *   or a retry never changes it.
 * - **Review**: the order's reviewer (the anaesthetist for a preoperative ECG) reviews the released report in their
 *   own name (`study review`) and says so.
 */
import { responsibleAnaesthetist, studyCollectors, studyProfile, t, unmetPrerequisites, type CaseDefinition, type ClinicalAction, type FacilityDefinition, type ReviewBasis, type SessionState, type StudyAccession, type StudyObservation, type StudyProfile } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, type WorldRuntime } from "@clinicalcraft/world";
import { encounterRoom, lookupStaff, namedStaff } from "../tools/consult-target.js";
import { rt } from "./i18n.js";
import type { SessionKernel } from "./kernel.js";
import { staffAgent } from "./staff-voice.js";
import { pickStaff } from "./delegation.js";

type Bi = { en: string; "zh-CN": string };

/**
 * A report's words, from the observations. A writer never owns the values: `bindings` says where each observation is
 * stated (the phrase in each language), and `supportedBy` which observations the impression rests on — the validator
 * checks every number against the observation it is bound to (a heart rate and a PR interval swapped are refused),
 * not merely that it occurs somewhere.
 */
export interface ReportText {
  findings: Bi;
  impression: Bi;
  limitations: Bi;
  generator: string;
  bindings?: { observation: string; en: string; "zh-CN": string }[];
  supportedBy?: string[];
}

/** A writer of report text (a model): null when it has nothing; its text is validated before release. */
export type ReportWriter = (input: { profile: StudyProfile; accession: StudyAccession; indication?: string }) => Promise<ReportText | null>;

const sep = (L: "en" | "zh-CN") => (L === "zh-CN" ? "；" : "; ");
const range = (o: StudyObservation) => (o.low != null && o.high != null ? ` (${o.low}–${o.high})` : "");
const flagWord = (o: StudyObservation, L: "en" | "zh-CN") => (o.flag === "high" ? (L === "zh-CN" ? " 偏高" : " high") : o.flag === "low" ? (L === "zh-CN" ? " 偏低" : " low") : "");

/** How the template states one observation. */
const phrase = (o: StudyObservation, L: "en" | "zh-CN") => (o.value != null ? `${o.label[L]} ${o.value} ${o.unit ?? ""}${range(o)}${flagWord(o, L)}`.replace(/\s+/gu, " ").trim() : `${o.label[L]}: ${o.text?.[L] ?? ""}`);

/** The deterministic report: every observation in words (each bound to its observation), the abnormal ones named in the impression. */
export function templateReport(profile: StudyProfile, a: StudyAccession): ReportText {
  const text = (L: "en" | "zh-CN") => a.observations.map((o) => phrase(o, L)).join(sep(L));
  const abnormal = a.observations.filter((o) => o.flag === "high" || o.flag === "low");
  const pattern = a.observations.filter((o) => o.id === "lead-i" || o.id === "progression" || o.id === "morphology");
  const imaging = profile.model.kind === "imaging" ? a.observations.filter((o) => o.id !== "technique") : [];
  const impression = (L: "en" | "zh-CN"): string => {
    const parts: string[] = [];
    if (abnormal.length) parts.push(`${L === "zh-CN" ? "异常：" : "Outside the reference interval: "}${abnormal.map((o) => `${o.label[L]}${flagWord(o, L)}`).join(L === "zh-CN" ? "、" : ", ")}`);
    if (pattern.some((o) => o.id === "lead-i")) parts.push(L === "zh-CN" ? "标准导联位置下呈右位心图形；如需可读图形，按镜像位置（右胸导联、上肢导联互换）复查" : "a dextrocardia pattern with the leads in standard positions; for a readable tracing, repeat with the leads mirrored (right-sided chest leads, arm leads reversed)");
    if (pattern.some((o) => o.id === "morphology")) parts.push(L === "zh-CN" ? "导联镜像放置后波形与正常位心脏相同" : "with the leads mirrored, the tracing reads as a normally placed heart");
    if (imaging.length) parts.push(imaging.map((o) => o.text?.[L] ?? "").join(sep(L)));
    if (!parts.length) parts.push(L === "zh-CN" ? "在参考范围内" : "within the reference intervals");
    return parts.join(sep(L));
  };
  return {
    findings: { en: text("en"), "zh-CN": text("zh-CN") },
    impression: { en: impression("en"), "zh-CN": impression("zh-CN") },
    limitations: { en: rt("en", "study.limitations"), "zh-CN": rt("zh-CN", "study.limitations") },
    generator: "template",
    bindings: a.observations.map((o) => ({ observation: o.id, en: phrase(o, "en"), "zh-CN": phrase(o, "zh-CN") })),
    supportedBy: [...abnormal, ...pattern, ...imaging].map((o) => o.id),
  };
}

/** A simulated study never confirms a diagnosis: certainty belongs to the clinicians who weigh the whole picture. */
const CERTAINTY = /\bconfirm|\bdiagnos|\bdefinite|\bproven\b|\bpathognomonic|确诊|诊断为|明确诊断|证实/iu;
/** Report words that state no finding of their own (a conclusion's terms must come from the observations it cites). */
const GENERIC_EN = new Set(
  "within outside above below reference interval intervals range ranges limit limits normal normally value values study tracing recorded shows shown seen noted there these this that with without from both each other further overall pattern positions position standard leads lead placed placement mirrored mirror repeat readable reads reading heart sided reversed chest configuration acquired acquisition quality good limited simulated teaching profile report findings impression clinical correlation correlate review change changes significant evident apparent present absent unremarkable high higher low lower abnormal elevated reduced raised mildly mild moderate marked otherwise noted from also only none which their when where then they them have been were show showing appear appears looks".split(" "),
);
const GENERIC_ZH = new Set("在参考范围内外异常正常偏高低值区间本次检查结果报告未见明显提示符合各项均可的为有无与和及或但其中、，。；：（）此图形波形导联位置".split(""));
const wordsOf = (x: string): string[] => x.toLowerCase().match(/[a-z]{4,}/gu) ?? [];
const stem = (w: string) => w.slice(0, 5);

/**
 * Why a conclusion is not a verifiable inference from the observations it cites (empty: it is): a certainty claim;
 * an English term no cited observation (nor the deterministic template for this study) uses; a Chinese character
 * none of them uses. With nothing cited, only report wording that states no finding may stand ("within the
 * reference intervals").
 */
function impressionProblems(a: StudyAccession, text: ReportText, L: "en" | "zh-CN", template: ReportText | undefined): string[] {
  const problems: string[] = [];
  const impression = text.impression[L];
  const certain = impression.match(CERTAINTY)?.[0];
  if (certain) problems.push(`${L}: "${certain}…" claims a certainty a simulated study cannot give`);
  const cited = (text.supportedBy ?? []).flatMap((id) => a.observations.filter((o) => o.id === id));
  const grounds = [...cited.map((o) => `${o.label[L]} ${o.text?.[L] ?? ""} ${o.unit ?? ""} ${o.flag ?? ""}`), template?.impression[L] ?? ""].join(" ");
  if (L === "en") {
    const known = new Set(wordsOf(grounds).map(stem));
    const stray = [...new Set(wordsOf(impression).filter((w) => !GENERIC_EN.has(w) && !GENERIC_EN.has(w.replace(/s$/u, "")) && !known.has(stem(w))))];
    if (stray.length) problems.push(`en: the impression's "${stray.slice(0, 4).join(", ")}" rests on no observation it cites`);
  } else {
    const known = new Set([...grounds]);
    const stray = [...new Set([...impression].filter((ch) => /[\u3400-\u9fff]/u.test(ch) && !known.has(ch) && !GENERIC_ZH.has(ch)))];
    if (stray.length) problems.push(`zh-CN: the impression's "${stray.slice(0, 6).join("")}" rests on no observation it cites`);
  }
  return problems;
}

/**
 * Why a written report's findings say more than its observations (empty: they do not): a certainty claim anywhere in
 * them; outside the phrases bound to observations, a term (English) or character (Chinese) that no observation of the
 * study — nor the deterministic template's findings — uses. An unsupported diagnosis appended to genuine findings is
 * refused like one in the impression.
 */
function findingsProblems(a: StudyAccession, text: ReportText, L: "en" | "zh-CN", spans: readonly [number, number][], template: ReportText | undefined): string[] {
  const problems: string[] = [];
  const findings = text.findings[L];
  const certain = findings.match(CERTAINTY)?.[0];
  if (certain) problems.push(`${L}: the findings' "${certain}…" claims a certainty a simulated study cannot give`);
  // what the findings say outside the bound phrases (those are checked against their observations already)
  let rest = "";
  let from = 0;
  for (const [x, y] of [...spans].sort((p, q) => p[0] - q[0])) {
    if (x > from) rest += ` ${findings.slice(from, x)}`;
    from = Math.max(from, y);
  }
  rest += ` ${findings.slice(from)}`;
  const grounds = [...a.observations.map((o) => `${o.label[L]} ${o.text?.[L] ?? ""} ${o.unit ?? ""} ${o.flag ?? ""}`), template?.findings[L] ?? "", template?.limitations?.[L] ?? ""].join(" ");
  if (L === "en") {
    const known = new Set(wordsOf(grounds).map(stem));
    const stray = [...new Set(wordsOf(rest).filter((w) => !GENERIC_EN.has(w) && !GENERIC_EN.has(w.replace(/s$/u, "")) && !known.has(stem(w))))];
    if (stray.length) problems.push(`en: the findings' "${stray.slice(0, 4).join(", ")}" is no observation of this study`);
  } else {
    const known = new Set([...grounds]);
    const stray = [...new Set([...rest].filter((ch) => /[\u3400-\u9fff]/u.test(ch) && !known.has(ch) && !GENERIC_ZH.has(ch)))];
    if (stray.length) problems.push(`zh-CN: the findings' "${stray.slice(0, 6).join("")}" is no observation of this study`);
  }
  return problems;
}

/** An order's reviewer that names the anaesthesia role rather than a person ("anaesthetist", 麻醉医生). */
const ANAESTHESIA = /^(?:the\s+)?(?:an(?:a)?esthet(?:h)?ist|an(?:a)?esthesi(?:a|ologist)|an(?:a)?esthesia(?:\s+team)?|麻醉(?:医生|医师|科)?)$/iu;

/**
 * Who reviews a released report, resolved when it is ready (never when it was ordered): a colleague the order names
 * by name or staff id reviews it (`named`: a consultant asked to review, wherever they are); the anaesthesia role
 * means the anaesthetist responsible for the patient now, by the anaesthesia record (`responsible`: after an accepted
 * handover, the one who took over — not the one who left); any other role or title, the colleague of it where the
 * patient is (`on-duty`). Null: nobody — the report waits for its review.
 */
export function resolveReviewer(c: CaseDefinition, facility: FacilityDefinition | null | undefined, s: SessionState, reviewer: string): { staff: FacilityDefinition["staff"][number]; basis: ReviewBasis } | null {
  const named = namedStaff(facility, reviewer);
  if (named) return { staff: named, basis: "named" };
  if (ANAESTHESIA.test(reviewer.trim())) {
    const id = responsibleAnaesthetist(c, s);
    const staff = id ? facility?.staff.find((x) => x.id === id) : undefined;
    if (staff) return { staff, basis: "responsible" };
  }
  const found = lookupStaff(facility, reviewer, encounterRoom(c, facility));
  return found.kind === "one" ? { staff: found.staff, basis: "on-duty" } : null;
}

/** Claims a report may make only when an observation makes them. */
const UNSUPPORTED = /infarct|ischaem|ischem|st elevation|st-elevation|pneumon|effusion|fracture|malignan|tumou?r|fibrillation|flutter|heart block|梗死|缺血|肺炎|积液|骨折|肿瘤|房颤|房扑|传导阻滞/iu;
const NUMBER = /\d+(?:\.\d+)?/gu;
const nums = (x: string): string[] => x.match(NUMBER) ?? [];

/**
 * What is wrong with a written report (empty: it may be released) — a semantic check against the structured
 * observations, never token overlap:
 * - each `bindings` phrase states a real observation, appears in the findings, and every number in it is that
 *   observation's own value or interval (a rate and a PR interval swapped are refused);
 * - every number of the findings lies inside a bound phrase; every number of the impression is an observation's
 *   it rests on (`supportedBy`), and each of those is a real observation;
 * - a side named is a side an observation shows; no finding the observations do not make;
 * - written text (`written`, default: anything not labelled "template"; the service passes it for every writer's
 *   text, whatever it calls itself) claims no certainty, and its findings and its conclusions say nothing their
 *   observations do not (`findingsProblems`, `impressionProblems`).
 */
export function validateReport(a: StudyAccession, text: ReportText, template?: ReportText, written: boolean = text.generator !== "template"): string[] {
  const problems: string[] = [];
  const obs = new Map(a.observations.map((o) => [o.id, o]));
  const own = (o: StudyObservation) => new Set([o.value, o.low, o.high].filter((n): n is number => n != null).map(String));
  const ownWords = (o: StudyObservation) => `${o.label.en} ${o.label["zh-CN"]} ${o.text?.en ?? ""} ${o.text?.["zh-CN"] ?? ""}`;
  const words = a.observations.map(ownWords).join(" ");
  const bindings = text.bindings ?? [];
  for (const b of bindings) if (!obs.has(b.observation)) problems.push(`a binding to "${b.observation}", which is no observation of this study`);
  const support = text.supportedBy ?? [];
  for (const id of support) if (!obs.has(id)) problems.push(`the impression rests on "${id}", which is no observation of this study`);
  for (const L of ["en", "zh-CN"] as const) {
    const findings = text.findings[L];
    // each bound phrase: in the findings, its numbers its own observation's
    const spans: [number, number][] = [];
    for (const b of bindings) {
      const o = obs.get(b.observation);
      if (!o) continue;
      const at = findings.indexOf(b[L]);
      if (at < 0) problems.push(`${L}: the statement of "${b.observation}" is not in the findings`);
      else spans.push([at, at + b[L].length]);
      const allowed = new Set([...own(o), ...nums(ownWords(o))]);
      for (const n of nums(b[L])) if (!allowed.has(n)) problems.push(`${L}: ${n} stated for "${b.observation}" is not its value (${o.value ?? "—"})`);
      if (o.value != null && !nums(b[L]).includes(String(o.value))) problems.push(`${L}: the statement of "${b.observation}" does not give its value ${o.value}`);
    }
    // every number of the findings bound to an observation (the label words' own digits — "12-lead", "V1" — aside)
    for (const m of findings.matchAll(NUMBER)) {
      const i = m.index ?? 0;
      if (!spans.some(([x, y]) => i >= x && i < y) && !nums(words).includes(m[0])) problems.push(`${L}: the number ${m[0]} is bound to no observation`);
    }
    // the impression's numbers: those of the observations it rests on
    const supported = new Set(support.flatMap((id) => (obs.get(id) ? [...own(obs.get(id)!), ...nums(ownWords(obs.get(id)!))] : [])));
    for (const n of nums(text.impression[L])) if (!supported.has(n)) problems.push(`${L}: the impression's ${n} rests on no observation it names`);
    const all = `${findings} ${text.impression[L]}`;
    const sides = new Set(a.observations.flatMap((o) => (o.side ? [o.side] : [])));
    const says = (re: RegExp) => re.test(all) && !re.test(words);
    if (says(/\bleft\b|左/iu) && !sides.has("left")) problems.push(`${L}: a left side no observation shows`);
    if (says(/\bright\b|右/iu) && !sides.has("right")) problems.push(`${L}: a right side no observation shows`);
    const claim = all.match(UNSUPPORTED)?.[0];
    if (claim && !UNSUPPORTED.test(words)) problems.push(`${L}: "${claim}" is not a finding of this study`);
    // a written report: every finding is one of the study's observations, every conclusion rests on those it cites
    // (the template is the reference)
    if (written) problems.push(...findingsProblems(a, text, L, spans, template), ...impressionProblems(a, text, L, template));
  }
  return problems;
}

/** The case's study a request names (code, name, alias — either language), or null. */
export function resolveStudy(profiles: readonly StudyProfile[], query: string): StudyProfile | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const names = (p: StudyProfile) => [p.code, ...Object.values(typeof p.name === "string" ? { x: p.name } : p.name), ...Object.values(p.aliases ?? {}).flat()].map((x) => String(x).toLowerCase());
  // a name inside the request, or the request inside a name — as whole words in Latin script ("CT" is not in
  // "electrocardiogram"); Chinese has no word breaks, so a substring there
  const cjk = (x: string) => /[\u3400-\u9fff]/u.test(x);
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const within = (part: string, whole: string) => (cjk(part) ? whole.includes(part) : new RegExp(`(^|[^\\p{L}\\p{N}])${esc(part)}($|[^\\p{L}\\p{N}])`, "u").test(whole));
  return profiles.find((p) => names(p).some((n) => n === q)) ?? profiles.find((p) => names(p).some((n) => n.length >= 2 && (within(n, q) || within(q, n)))) ?? null;
}


/** Facility devices that provide every capability of a profile (entity ids), in facility order. */
function providers(w: WorldRuntime, caps: readonly string[]): string[] {
  return w
    .entities()
    .filter((e) => e.kind === "equipment" && caps.length > 0 && caps.every((c) => e.capabilities.includes(c)))
    .map((e) => e.id);
}

export class SessionStudies {
  /** A model writer for report text (validated; the template is the fallback). Null: the template only. */
  writer: ReportWriter | null = null;
  /** Milliseconds a writer may take before the template is used. */
  writerTimeoutMs = 8000;

  constructor(private readonly k: SessionKernel) {}

  /** Does the case offer new investigations? */
  available(): boolean {
    return (this.k.caseDef.studies?.length ?? 0) > 0;
  }

  /** Who acquires a profile's study by default: the case team's circulating nurse, else a nurse. */
  collectorRef(): string {
    const team = this.k.caseDef.team;
    const circulating = team?.members.find((m) => m.duties.includes("circulate"));
    return circulating && circulating.staff !== "surgeon" ? `staff:${circulating.staff}` : "nurse";
  }

  private dispatch(action: ClinicalAction, id: string) {
    return this.k.dispatch(action, id);
  }

  /** After an act: fulfil the open orders, release the reports that are due, have them reviewed. Never throws. */
  async afterLearner(id: string, signal: AbortSignal): Promise<void> {
    const k = this.k;
    if (!this.available() || !k.state.started || k.state.finished) return;
    try {
      for (const o of [...(k.state.studies?.orders ?? [])]) if (o.accessions.length === 0) await this.fulfil(id, o.id, signal);
      for (const a of [...(k.state.studies?.accessions ?? [])]) {
        if ((k.state.studies?.reports ?? []).some((r) => r.accession === a.id)) continue;
        if (k.caseDef.clock.mode === "simulated" && k.state.clock + 1e-9 < a.dueAt) continue;
        await this.release(id, a);
      }
      for (const o of k.state.studies?.orders ?? []) {
        if (!o.reviewer) continue;
        for (const acc of o.accessions) {
          const reported = (k.state.studies?.reports ?? []).some((r) => r.accession === acc);
          const reviewed = (k.state.studies?.reviews ?? []).some((r) => r.accession === acc);
          if (reported && !reviewed) this.review(id, o.reviewer, acc);
        }
      }
    } catch (err) {
      k.emit(id, { type: "warning", message: `study service: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  /** A study's order cannot proceed now: recorded with its reason (once per reason). */
  private wait(id: string, order: string, reason: string): void {
    const o = this.k.state.studies?.orders.find((x) => x.id === order);
    if (o?.waiting?.reason === reason) return;
    this.dispatch({ type: "study", study: { op: "wait", order, reason }, by: "system" }, id);
  }

  private acquire(id: string, order: string, collector: string, configuration?: string): boolean {
    const r = this.dispatch({ type: "study", study: { op: "acquire", order, collector: collector.replace(/^staff:/u, ""), ...(configuration ? { configuration } : {}), quality: "good" }, by: "system" }, id);
    return !r.rejected;
  }

  private assign(id: string, order: string, to: string): void {
    this.dispatch({ type: "study", study: { op: "assign", order, to: to.replace(/^staff:/u, "") }, by: "system" }, id);
  }

  private progress(id: string, order: string, stage: "en-route" | "at-patient" | "acquisition-started"): void {
    this.dispatch({ type: "study", study: { op: "progress", order, stage }, by: "system" }, id);
  }

  /** Text mode: the hospital's staff without bodies — assigned, at the patient, acquired. */
  private collectWithoutWorld(id: string, order: string, who: string, configuration?: string): void {
    this.assign(id, order, who);
    this.progress(id, order, "at-patient");
    this.progress(id, order, "acquisition-started");
    this.acquire(id, order, who, configuration);
  }

  /**
   * Fulfil an order (docs/STUDIES.md §5): assigned to the person who acquires it, who goes to the patient with their
   * own body — fetching the device first for a bedside study — and only once the world confirms them at the patient
   * (within reach, a device of the study at the bedside, their role allowed to take it) is it acquired. A walk that
   * fails, a door that is locked, a device that cannot come: the order is blocked with the reason, no specimen and no
   * tracing are made, and the same order resumes after a later act.
   */
  private async fulfil(id: string, orderId: string, signal: AbortSignal): Promise<void> {
    const k = this.k;
    const o = k.state.studies!.orders.find((x) => x.id === orderId)!;
    const profile = studyProfile(k.caseDef, o.code);
    if (!profile) return;
    const L = k.locale;
    // a prerequisite that does not hold (intravenous access, the patient at the device): the order waits with its reason
    const unmet = unmetPrerequisites(k.caseDef, k.state, profile);
    if (unmet.length) return this.wait(id, o.id, unmet.map((u) => t(u.reason, L)).join("; "));
    const e = k.embodied;
    if (!e) return this.collectWithoutWorld(id, o.id, studyCollectors(profile)[0] ?? "nurse", o.configuration);
    const w = e.world();
    const devices = providers(w, profile.requires);
    const name = (eid: string) => t(w.entity(eid)?.name ?? eid, L);
    if (profile.requires.length && devices.length === 0) return this.wait(id, o.id, rt(L, "study.wait.noDevice", { caps: profile.requires.join(", ") }));
    const patient = e.patientId();
    if (!patient) return this.wait(id, o.id, rt(L, "study.wait.noPatient"));
    if (profile.acquisition === "department") {
      const room = w.roomOf(patient);
      const here = devices.find((d) => w.roomOf(d) === room);
      if (!here) return this.wait(id, o.id, rt(L, "study.wait.transfer", { device: name(devices[0]!), room: w.roomOf(devices[0]!) ?? "—" }));
      // the patient at the device: the department's own staff (a radiographer) acquire it there
      return this.collectWithoutWorld(id, o.id, studyCollectors(profile)[0] ?? "radiographer", o.configuration);
    }
    // the collector: the case team's circulating nurse, else the nurse nearest the patient — their role may take it
    const ref = this.collectorRef();
    const collector = ref.startsWith("staff:") ? ref : pickStaff(w, "nurse", patient);
    const actor = collector ? w.actor(collector) : null;
    if (!collector || !actor) return this.wait(id, o.id, rt(L, "study.wait.noStaff"));
    if (!studyCollectors(profile).includes(actor.role)) return this.wait(id, o.id, rt(L, "study.wait.notAuthorized", { who: name(collector) }));
    if (o.assignee !== collector.replace(/^staff:/u, "")) this.assign(id, o.id, collector);
    // a blocked order tries again quietly: its stages change only when something does (no repeated "en route")
    const blocked = () => k.state.studies?.orders.find((x) => x.id === o.id)?.stage === "blocked";
    const onTheWay = () => {
      if (!blocked()) this.progress(id, o.id, "en-route");
    };
    let device: string | null = null;
    if (profile.acquisition === "bedside-device") {
      const snapshot = w.snapshot().entities;
      // out of service: waits until it is back (recoverable; the requester keeps the order)
      const inService = devices.filter((d) => snapshot[d]?.available !== false);
      if (!inService.length) return this.wait(id, o.id, rt(L, "study.wait.outOfService", { device: name(devices[0]!) }));
      const holder = (d: string) => snapshot[d]?.reservedBy ?? snapshot[d]?.heldBy ?? null;
      const free = inService.filter((d) => !holder(d) || holder(d) === collector);
      if (!free.length) {
        const d = inService[0]!;
        return this.wait(id, o.id, rt(L, "study.wait.busy", { device: name(d), holder: name(holder(d)!) }));
      }
      device = free.find((d) => e.atBedside(d)) ?? null;
      if (!device) {
        // the collector fetches it to the patient with their own body (the world keeps its custody)
        onTheWay();
        const r = await e.delegate(k.tools.context("nurse", id, signal), { role: collector, task: "fetch_equipment", params: { capability: profile.requires[0] } });
        if (!r.ok) return this.wait(id, o.id, rt(L, "study.wait.fetchFailed", { who: name(collector), device: name(free[0]!), reason: r.output.split("\n")[0] ?? "" }));
        device = free.find((d) => e.atBedside(d)) ?? null;
        if (!device) return this.wait(id, o.id, rt(L, "study.wait.fetchFailed", { who: name(collector), device: name(free[0]!), reason: rt(L, "study.wait.notAtBedside") }));
      }
    }
    // to the patient, with their own body; the world says whether they got there
    if (!this.atPatient(collector)) {
      onTheWay();
      const walked = await e.act({ agent: "nurse", submission: id, signal }, { actorId: collector, operation: "navigate", goal: { kind: "interact", id: patient }, onBehalfOf: PRIMARY_ACTOR });
      if (!this.atPatient(collector)) return this.wait(id, o.id, rt(L, "study.wait.cannotReach", { who: name(collector), reason: (walked.status === "completed" ? rt(L, "study.wait.notInReach") : walked.message.split("\n")[0] ?? "").replace(/[.。]\s*$/u, "") }));
    }
    if (device && !e.atBedside(device)) return this.wait(id, o.id, rt(L, "study.wait.fetchFailed", { who: name(collector), device: name(device), reason: rt(L, "study.wait.notAtBedside") }));
    // got there after a block: on the way again, then at the patient
    if (blocked()) this.progress(id, o.id, "en-route");
    this.progress(id, o.id, "at-patient");
    this.progress(id, o.id, "acquisition-started");
    this.acquire(id, o.id, collector, o.configuration);
  }

  /** Is this body at the patient now — within reach and in sight (the world's examination rule)? */
  private atPatient(actorId: string): boolean {
    const e = this.k.embodied;
    return !!e && e.world().checkSpatial(actorId, { tool: "examine", kind: "examine" }).ok;
  }

  /** The report of a due acquisition: the writer's when it validates, else the template; released once. */
  private async release(id: string, a: StudyAccession): Promise<void> {
    const k = this.k;
    const profile = studyProfile(k.caseDef, a.code);
    if (!profile) return;
    const order = k.state.studies?.orders.find((o) => o.id === a.order);
    let text: ReportText | null = null;
    if (this.writer) {
      try {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<null>((resolve) => (timer = setTimeout(() => resolve(null), this.writerTimeoutMs)));
        // the writer works on copies: whatever it does to them, the acquisition (and so the template and a replay) is
        // the engine's own
        const input = { profile: structuredClone(profile), accession: structuredClone(a), ...(order?.indication ? { indication: order.indication } : {}) };
        const written = await Promise.race([this.writer(input), timeout]).finally(() => clearTimeout(timer));
        if (written) {
          // provenance is the service's: a writer's text is a writer's, whatever it calls itself ("template" is
          // reserved for the text this service generates) — validated as written text against the original
          const generator = !written.generator || written.generator === "template" ? "writer" : written.generator;
          const candidate: ReportText = { ...structuredClone(written), generator };
          const problems = validateReport(a, candidate, templateReport(profile, a), true);
          if (problems.length === 0) text = candidate;
          // refused: the template is released instead, and why the writer's text was refused is on the record
          else k.recorder?.record("diagnostic", { agent: "pathologist", source: "grounding", detail: [`report ${a.id} by ${written.generator || "writer"} refused: ${problems.join("; ")}`] });
        }
      } catch {
        text = null;
      }
    }
    text ??= templateReport(profile, a);
    this.dispatch({ type: "study", study: { op: "release", accession: a.id, findings: text.findings, impression: text.impression, limitations: text.limitations, generator: text.generator, ...(text.supportedBy ? { supportedBy: text.supportedBy } : {}) }, by: "system" }, id);
  }

  /**
   * The reviewer reviews the released report in their own name, and says so — the reviewer resolved now, when the
   * report is ready (`resolveReviewer`); nobody to resolve: the report waits for its review.
   */
  private review(id: string, reviewer: string, accession: string): void {
    const k = this.k;
    const L = k.locale;
    const who = resolveReviewer(k.caseDef, k.facility, k.state, reviewer);
    if (!who) return;
    const staff = who.staff;
    const by = staff.id;
    const r = this.dispatch({ type: "study", study: { op: "review", accession, by, basis: who.basis }, by: "system" }, id);
    if (r.rejected) return;
    const report = k.state.studies?.reports.filter((x) => x.accession === accession).at(-1);
    const a = k.state.studies?.accessions.find((x) => x.id === accession);
    const profile = a ? studyProfile(k.caseDef, a.code) : undefined;
    if (!report || !profile) return;
    const speaker = staff ? t(staff.name, L) : reviewer;
    const text = rt(L, "study.reviewLine", { name: t(profile.name, L), impression: L === "zh-CN" ? report.impression["zh-CN"] : report.impression.en });
    k.speakLine(id, { agent: (staff ? staffAgent(staff.role) : "attending") as never, speaker, text, grounded: [] });
    k.conversations.addDialogue({ who: staff ? staffAgent(staff.role) : "attending", speaker, text });
  }
}


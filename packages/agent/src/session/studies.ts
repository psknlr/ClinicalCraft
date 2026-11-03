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
import { studyProfile, t, type ClinicalAction, type StudyAccession, type StudyObservation, type StudyProfile } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, type WorldRuntime } from "@clinicalcraft/world";
import { encounterRoom, lookupStaff } from "../tools/consult-target.js";
import { rt } from "./i18n.js";
import type { SessionKernel } from "./kernel.js";
import { staffAgent } from "./staff-voice.js";

type Bi = { en: string; "zh-CN": string };

/** A report's words, from the observations. */
export interface ReportText {
  findings: Bi;
  impression: Bi;
  limitations: Bi;
  generator: string;
}

/** A writer of report text (a model): null when it has nothing; its text is validated before release. */
export type ReportWriter = (input: { profile: StudyProfile; accession: StudyAccession; indication?: string }) => Promise<ReportText | null>;

const sep = (L: "en" | "zh-CN") => (L === "zh-CN" ? "；" : "; ");
const range = (o: StudyObservation) => (o.low != null && o.high != null ? ` (${o.low}–${o.high})` : "");
const flagWord = (o: StudyObservation, L: "en" | "zh-CN") => (o.flag === "high" ? (L === "zh-CN" ? " 偏高" : " high") : o.flag === "low" ? (L === "zh-CN" ? " 偏低" : " low") : "");

/** The deterministic report: every observation in words, the abnormal ones named in the impression. */
export function templateReport(profile: StudyProfile, a: StudyAccession): ReportText {
  const text = (L: "en" | "zh-CN") => a.observations.map((o) => (o.value != null ? `${o.label[L]} ${o.value} ${o.unit ?? ""}${range(o)}${flagWord(o, L)}`.replace(/\s+/gu, " ").trim() : `${o.label[L]}: ${o.text?.[L] ?? ""}`)).join(sep(L));
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
  };
}

/** Claims a report may make only when an observation makes them. */
const UNSUPPORTED = /infarct|ischaem|ischem|st elevation|st-elevation|pneumon|effusion|fracture|malignan|tumou?r|fibrillation|flutter|heart block|梗死|缺血|肺炎|积液|骨折|肿瘤|房颤|房扑|传导阻滞/iu;

/**
 * What is wrong with a written report (empty: it may be released): every number is an observation's (its value or
 * interval); a side named is a side an observation shows; no finding the observations do not make.
 */
export function validateReport(a: StudyAccession, text: ReportText): string[] {
  const problems: string[] = [];
  const allowed = new Set<string>();
  const words = a.observations.map((o) => `${o.label.en} ${o.label["zh-CN"]} ${o.text?.en ?? ""} ${o.text?.["zh-CN"] ?? ""}`).join(" ");
  for (const o of a.observations) for (const n of [o.value, o.low, o.high]) if (n != null) allowed.add(String(n));
  for (const n of words.match(/\d+(?:\.\d+)?/gu) ?? []) allowed.add(n);
  for (const L of ["en", "zh-CN"] as const) {
    const all = `${text.findings[L]} ${text.impression[L]}`;
    for (const n of all.match(/\d+(?:\.\d+)?/gu) ?? []) if (!allowed.has(n)) problems.push(`${L}: the number ${n} is not an observation`);
    const sides = new Set(a.observations.flatMap((o) => (o.side ? [o.side] : [])));
    const says = (re: RegExp) => re.test(all) && !re.test(words);
    if (says(/\bleft\b|左/iu) && !sides.has("left")) problems.push(`${L}: a left side no observation shows`);
    if (says(/\bright\b|右/iu) && !sides.has("right")) problems.push(`${L}: a right side no observation shows`);
    const claim = all.match(UNSUPPORTED)?.[0];
    if (claim && !UNSUPPORTED.test(words)) problems.push(`${L}: "${claim}" is not a finding of this study`);
  }
  return problems;
}

/** Words of a request that ask for the operative cholangiogram (never ordered from the chart). */
const OPERATIVE = /cholangio|\bioc\b|胆道造影|胆管造影/iu;

/** The case's study a request names (code, name, alias — either language), or null. */
export function resolveStudy(profiles: readonly StudyProfile[], query: string): StudyProfile | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const names = (p: StudyProfile) => [p.code, ...Object.values(typeof p.name === "string" ? { x: p.name } : p.name), ...Object.values(p.aliases ?? {}).flat()].map((x) => String(x).toLowerCase());
  return profiles.find((p) => names(p).some((n) => n === q)) ?? profiles.find((p) => names(p).some((n) => n.length >= 2 && (q.includes(n) || n.includes(q)))) ?? null;
}

/** Does this request ask for an operative study? */
export function asksOperativeStudy(query: string): boolean {
  return OPERATIVE.test(query);
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

  private acquire(id: string, order: string, collector: string, configuration?: string): void {
    this.dispatch({ type: "study", study: { op: "acquire", order, collector: collector.replace(/^staff:/u, ""), ...(configuration ? { configuration } : {}), quality: "good" }, by: "system" }, id);
  }

  private async fulfil(id: string, orderId: string, signal: AbortSignal): Promise<void> {
    const k = this.k;
    const o = k.state.studies!.orders.find((x) => x.id === orderId)!;
    const profile = studyProfile(k.caseDef, o.code);
    if (!profile) return;
    const L = k.locale;
    const e = k.embodied;
    // text mode: no room to walk in — the hospital acquires it at once
    if (!e) return this.acquire(id, o.id, profile.acquisition === "department" ? "radiographer" : "nurse", o.configuration);
    const w = e.world();
    const devices = providers(w, profile.requires);
    const name = (eid: string) => t(w.entity(eid)?.name ?? eid, L);
    if (profile.requires.length && devices.length === 0) return this.wait(id, o.id, rt(L, "study.wait.noDevice", { caps: profile.requires.join(", ") }));
    const patient = e.patientId();
    if (profile.acquisition === "department") {
      const room = patient ? w.roomOf(patient) : null;
      const here = devices.find((d) => w.roomOf(d) === room);
      if (!here) return this.wait(id, o.id, rt(L, "study.wait.transfer", { device: name(devices[0]!), room: w.roomOf(devices[0]!) ?? "—" }));
      return this.acquire(id, o.id, "radiographer", o.configuration);
    }
    const collector = this.collectorRef();
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
      const atPatient = patient ? free.find((d) => e.atBedside(d)) : undefined;
      if (!atPatient) {
        // the circulating nurse fetches it to the patient with their own body (the world keeps its custody)
        const r = await e.delegate(k.tools.context("nurse", id, signal), { role: collector, task: "fetch_equipment", params: { capability: profile.requires[0] } });
        if (!r.ok) return this.wait(id, o.id, rt(L, "study.wait.fetchFailed", { who: name(collector), device: name(free[0]!), reason: r.output.split("\n")[0] ?? "" }));
      }
      return this.acquire(id, o.id, collector, o.configuration);
    }
    // a sample: taken at the bedside by the nurse who walks there
    if (patient) await e.act({ agent: "nurse", submission: id, signal }, { actorId: collector.startsWith("staff:") ? collector : PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: patient } });
    this.acquire(id, o.id, collector, o.configuration);
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
        const written = await Promise.race([this.writer({ profile, accession: a, ...(order?.indication ? { indication: order.indication } : {}) }), timeout]).finally(() => clearTimeout(timer));
        if (written && validateReport(a, written).length === 0) text = written;
      } catch {
        text = null;
      }
    }
    text ??= templateReport(profile, a);
    this.dispatch({ type: "study", study: { op: "release", accession: a.id, findings: text.findings, impression: text.impression, limitations: text.limitations, generator: text.generator }, by: "system" }, id);
  }

  /** The reviewer reviews the released report in their own name, and says so. */
  private review(id: string, reviewer: string, accession: string): void {
    const k = this.k;
    const L = k.locale;
    const found = lookupStaff(k.facility, reviewer, encounterRoom(k.caseDef, k.facility));
    const staff = found.kind === "one" ? found.staff : null;
    const by = staff?.id ?? reviewer;
    const r = this.dispatch({ type: "study", study: { op: "review", accession, by }, by: "system" }, id);
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


/**
 * New investigations (docs/STUDIES.md): orders, acquisitions and released reports of the studies a case's test
 * profiles define (`case.studies`). Pure and deterministic: the observations of an acquisition are computed here,
 * once, from the patient's state at that moment and a seed of the case and the accession — so a sample drawn before
 * a bleed keeps its values whenever its report is released, a replay reproduces every number, and a retried order
 * (the same key) is the same order. Words are not computed here: the reporting agent writes them from these
 * observations, and the release records its text.
 */
import type { CaseDefinition } from "../schema/case.js";
import type { SessionState } from "../schema/session.js";
import type { StudyAccession, StudyObservation, StudyOp, StudyOrder, StudyProfile, StudyRecord, StudyStage } from "../schema/study.js";
import { evaluate } from "./conditions.js";
import { vitalValue } from "./signal.js";

const both = (t: unknown): { en: string; "zh-CN": string } => {
  if (typeof t === "string") return { en: t, "zh-CN": t };
  const r = (t ?? {}) as Record<string, string>;
  return { en: r.en ?? r["zh-CN"] ?? "", "zh-CN": r["zh-CN"] ?? r.en ?? "" };
};

/** A number in [-1, 1) from a string (FNV-1a): the seeded variation of a value. */
export function seeded(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h / 0x100000000) * 2 - 1;
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
const within = (range: readonly [number, number], u: number) => Math.round(range[0] + ((u + 1) / 2) * (range[1] - range[0]));

/** The case's test profile of `code`, or undefined. */
export function studyProfile(c: CaseDefinition, code: string): StudyProfile | undefined {
  return (c.studies ?? []).find((p) => p.code === code);
}

/**
 * The observations a study reveals at this state (the acquisition snapshot): an ECG's rate from the patient now, its
 * seeded intervals and what the lead configuration shows; a laboratory panel's seeded values with the effects of the
 * patient's state; an image's findings whose conditions hold.
 */
export function studyObservations(c: CaseDefinition, s: SessionState, profile: StudyProfile, accession: string, configuration?: string): StudyObservation[] {
  const seed = (what: string) => seeded(`${c.id}:${profile.code}:${profile.version}:${accession}:${what}`);
  const m = profile.model;
  if (m.kind === "lab") {
    return m.analytes.map((a) => {
      let v = a.base + a.spread * seed(a.id);
      for (const e of a.effects) if (evaluate(c, s, e.when)) v += e.delta;
      const value = round(v, a.decimals);
      return { id: a.id, label: both(a.name), value, unit: a.unit, low: a.low, high: a.high, flag: value < a.low ? "low" : value > a.high ? "high" : "normal" };
    });
  }
  if (m.kind === "ecg") {
    const hr = vitalValue(c, s, "hr");
    const out: StudyObservation[] = [];
    if (hr != null) out.push({ id: "rate", label: { en: "Ventricular rate", "zh-CN": "心室率" }, value: Math.round(hr), unit: "/min", low: 60, high: 100, flag: hr < 60 ? "low" : hr > 100 ? "high" : "normal" });
    out.push({ id: "rhythm", label: { en: "Rhythm", "zh-CN": "节律" }, text: both(m.rhythm) });
    out.push({ id: "pr", label: { en: "PR interval", "zh-CN": "PR 间期" }, value: within(m.prMs, seed("pr")), unit: "ms", low: 120, high: 200, flag: "normal" });
    out.push({ id: "qrs", label: { en: "QRS duration", "zh-CN": "QRS 时限" }, value: within(m.qrsMs, seed("qrs")), unit: "ms", low: 60, high: 120, flag: "normal" });
    out.push({ id: "qtc", label: { en: "QTc", "zh-CN": "QTc" }, value: within(m.qtcMs, seed("qtc")), unit: "ms", low: 350, high: 450, flag: "normal" });
    for (const o of out) if (o.value != null && o.low != null && o.high != null) o.flag = o.value < o.low ? "low" : o.value > o.high ? "high" : "normal";
    const mirrored = configuration === "mirror";
    out.push({
      id: "leads",
      label: { en: "Lead placement", "zh-CN": "导联位置" },
      text: mirrored ? { en: "right-sided chest leads (V1R–V6R) and reversed arm leads", "zh-CN": "右胸导联（V1R–V6R），上肢导联左右互换" } : { en: "standard positions", "zh-CN": "标准位置" },
    });
    if (m.dextrocardia && !mirrored) {
      out.push({ id: "lead-i", label: { en: "Lead I", "zh-CN": "I 导联" }, text: { en: "inverted P wave, QRS complex and T wave", "zh-CN": "P 波、QRS 波群和 T 波倒置" } });
      out.push({ id: "progression", label: { en: "Chest leads", "zh-CN": "胸导联" }, text: { en: "reversed R-wave progression: R waves diminishing from V1 to V6", "zh-CN": "R 波递增反转：V1 至 V6 R 波逐渐减小" } });
    } else if (m.dextrocardia) {
      out.push({ id: "morphology", label: { en: "Morphology", "zh-CN": "波形" }, text: { en: "P-QRS-T morphology as in a normally placed heart (leads mirrored for dextrocardia)", "zh-CN": "按右位心镜像放置导联后，P-QRS-T 波形与正常位心脏相同" } });
    }
    for (const f of m.findings) if (!f.when || evaluate(c, s, f.when)) out.push({ id: f.id, label: { en: "Finding", "zh-CN": "所见" }, text: both(f.text), ...(f.side ? { side: f.side } : {}) });
    return out;
  }
  return [
    { id: "technique", label: { en: "Technique", "zh-CN": "技术" }, text: both(m.technique) },
    ...m.findings.filter((f) => !f.when || evaluate(c, s, f.when)).map((f) => ({ id: f.id, label: { en: "Finding", "zh-CN": "所见" }, text: both(f.text), ...(f.side ? { side: f.side } : {}) })),
  ];
}

const empty = (): StudyRecord => ({ orders: [], accessions: [], reports: [], reviews: [] });

export type StudyResult = { ok: true; record: StudyRecord; changed: boolean; id?: string } | { ok: false; code: "invalid" | "unknown-id" | "requirements-unmet" | "not-ready"; message: string };

/** Move an order to a stage, recorded in its own stage list. */
function stageAt(s: SessionState) {
  return (o: StudyOrder, next: StudyStage, reason?: string) => {
    o.stage = next;
    o.stages = [...(o.stages ?? []), { stage: next, at: s.clock, seq: s.seq + 1, ...(reason ? { reason } : {}) }];
  };
}

/** Apply one study op (pure): the new record, or why not. `changed: false`: a retried order (the same key) — nothing new. */
export function applyStudy(c: CaseDefinition, s: SessionState, op: StudyOp): StudyResult {
  const r: StudyRecord = s.studies ? structuredClone(s.studies) : empty();
  const order = (id: string) => r.orders.find((o) => o.id === id);
  const stage = stageAt(s);
  switch (op.op) {
    case "order": {
      const profile = studyProfile(c, op.code);
      if (!profile) return { ok: false, code: "unknown-id", message: `no study "${op.code}" in this case's test profiles` };
      const same = r.orders.find((o) => o.key === op.key);
      if (same) return { ok: true, record: r, changed: false, id: same.id };
      const id = `ord-${r.orders.length + 1}`;
      r.orders.push({ id, code: op.code, key: op.key, ...(op.indication ? { indication: op.indication } : {}), priority: op.priority, requester: op.requester, ...(op.reviewer ?? profile.reviewer ? { reviewer: op.reviewer ?? profile.reviewer } : {}), ...(op.configuration ? { configuration: op.configuration } : {}), at: s.clock, seq: s.seq + 1, accessions: [], stage: "ordered", stages: [{ stage: "ordered", at: s.clock, seq: s.seq + 1 }] });
      return { ok: true, record: r, changed: true, id };
    }
    case "wait": {
      const o = order(op.order);
      if (!o) return { ok: false, code: "unknown-id", message: `no order "${op.order}"` };
      o.waiting = { reason: op.reason, at: s.clock };
      stage(o, "blocked", op.reason);
      return { ok: true, record: r, changed: true, id: o.id };
    }
    case "assign": {
      const o = order(op.order);
      if (!o) return { ok: false, code: "unknown-id", message: `no order "${op.order}"` };
      if (o.accessions.length) return { ok: false, code: "invalid", message: `"${o.id}" is acquired already` };
      if (o.assignee === op.to) return { ok: true, record: r, changed: false, id: o.id };
      o.assignee = op.to;
      stage(o, "assigned");
      return { ok: true, record: r, changed: true, id: o.id };
    }
    case "progress": {
      const o = order(op.order);
      if (!o) return { ok: false, code: "unknown-id", message: `no order "${op.order}"` };
      if (!o.assignee) return { ok: false, code: "requirements-unmet", message: `"${o.id}" is not assigned to anyone` };
      if (o.accessions.length) return { ok: false, code: "invalid", message: `"${o.id}" is acquired already` };
      if (op.stage === "acquisition-started" && o.stage !== "at-patient") return { ok: false, code: "requirements-unmet", message: `"${o.id}": the acquisition starts only at the patient` };
      if (o.stage === op.stage) return { ok: true, record: r, changed: false, id: o.id };
      // on the way again, or there: the block is over
      delete o.waiting;
      stage(o, op.stage);
      return { ok: true, record: r, changed: true, id: o.id };
    }
    case "acquire": {
      const o = order(op.order);
      if (!o) return { ok: false, code: "unknown-id", message: `no order "${op.order}"` };
      // no specimen, no tracing without the collector at the patient (the world confirmed it: `progress at-patient`)
      if (o.stage !== "at-patient" && o.stage !== "acquisition-started") return { ok: false, code: "requirements-unmet", message: `"${o.id}" cannot be acquired: nobody has reached the patient for it` };
      if (o.assignee && o.assignee !== op.collector) return { ok: false, code: "invalid", message: `"${o.id}" is assigned to ${o.assignee}, not ${op.collector}` };
      const profile = studyProfile(c, o.code);
      if (!profile) return { ok: false, code: "unknown-id", message: `no study "${o.code}"` };
      // a deliberate repeat collection: a new accession, whatever the phase
      const id = `${o.code}-${r.accessions.filter((a) => a.code === o.code).length + 1}`;
      const a: StudyAccession = {
        id,
        order: o.id,
        code: o.code,
        collector: op.collector,
        at: s.clock,
        revision: s.seq,
        ...(op.configuration ? { configuration: op.configuration } : {}),
        quality: op.quality,
        observations: studyObservations(c, s, profile, id, op.configuration),
        dueAt: s.clock + (c.clock.mode === "simulated" ? profile.turnaroundMinutes : 0),
        profileVersion: profile.version,
      };
      r.accessions.push(a);
      o.accessions.push(id);
      delete o.waiting;
      stage(o, "acquired");
      return { ok: true, record: r, changed: true, id };
    }
    case "release": {
      const a = r.accessions.find((x) => x.id === op.accession);
      if (!a) return { ok: false, code: "requirements-unmet", message: `no acquisition "${op.accession}": a report is released only from an acquired study` };
      if (c.clock.mode === "simulated" && s.clock + 1e-9 < a.dueAt) return { ok: false, code: "not-ready", message: `"${a.id}" is not due until minute ${a.dueAt}` };
      // what the impression rests on must be this acquisition's observations (a report never adds a finding)
      const ids = new Set(a.observations.map((o) => o.id));
      const stray = (op.supportedBy ?? []).filter((id) => !ids.has(id));
      if (stray.length) return { ok: false, code: "invalid", message: `"${a.id}" has no observation ${stray.join(", ")}: a report rests only on what was acquired` };
      const revision = r.reports.filter((x) => x.accession === a.id).length + 1;
      const provenance = { kind: "simulated-investigation" as const, source: "case-teaching-profile" as const, profile: a.code, profileVersion: a.profileVersion, observations: a.observations.map((o) => o.id), generator: op.generator };
      r.reports.push({ accession: a.id, revision, findings: op.findings, impression: op.impression, ...(op.limitations ? { limitations: op.limitations } : {}), generator: op.generator, at: s.clock, seq: s.seq + 1, ...(op.supportedBy ? { supportedBy: [...op.supportedBy] } : {}), provenance });
      const ro = order(a.order);
      if (ro) stage(ro, "reported");
      return { ok: true, record: r, changed: true, id: a.id };
    }
    case "review": {
      if (!r.reports.some((x) => x.accession === op.accession)) return { ok: false, code: "requirements-unmet", message: `"${op.accession}" has no released report to review` };
      r.reviews.push({ accession: op.accession, by: op.by, at: s.clock, seq: s.seq + 1 });
      const vo = r.orders.find((x) => x.accessions.includes(op.accession));
      if (vo) stage(vo, "reviewed");
      return { ok: true, record: r, changed: true, id: op.accession };
    }
  }
}

/** A study's status now: the latest of ordered → waiting → acquired → released → reviewed (null: not ordered). */
export function studyStatus(s: SessionState, code: string): "ordered" | "waiting" | "acquired" | "released" | "reviewed" | null {
  const r = s.studies;
  if (!r) return null;
  const orders = r.orders.filter((o) => o.code === code);
  if (!orders.length) return null;
  const accessions = r.accessions.filter((a) => a.code === code).map((a) => a.id);
  if (r.reviews.some((x) => accessions.includes(x.accession))) return "reviewed";
  if (r.reports.some((x) => accessions.includes(x.accession))) return "released";
  if (accessions.length) return "acquired";
  return orders.some((o) => o.waiting) ? "waiting" : "ordered";
}

const RANK = ["ordered", "waiting", "acquired", "released", "reviewed"] as const;

/** `{ study: code, status? }`: the study reached at least that status (default: ordered). */
export function evaluateStudy(s: SessionState, code: string, status: (typeof RANK)[number] = "ordered"): boolean {
  const now = studyStatus(s, code);
  if (!now) return false;
  const order = (x: string) => (x === "waiting" ? 0 : RANK.indexOf(x as (typeof RANK)[number]));
  return order(now) >= order(status);
}

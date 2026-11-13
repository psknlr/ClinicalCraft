/**
 * The dispensary working on its own (docs/PRESCRIPTIONS.md §5, docs/TEAM.md §5): after every act and on the staff's
 * own clock, the dispensary's staff member picks up what is theirs — without being told each step:
 *
 * - **Review.** A version just signed is reviewed: the engine computes the findings (stock, units, doses, the case's
 *   rules as they hold now), the reviewer records them in their own name and says the outcome — a query for the
 *   prescriber to resolve, or that it is in order. A version whose query the prescriber has resolved without a
 *   revision is reviewed again, and confirmed.
 * - **Supply** (`dispensedBy: "staff"`): a confirmed current version is supplied. In in-world mode the dispenser goes
 *   to a device that provides what the prescription `requires` with their own body — the one made for the
 *   formulation's form when there is one (an equipment type tagged `granules`, `decoction-pieces`…) — and works it:
 *   its dispensing operations in order (select the version, pick, check the label, supply), each through the world's
 *   action bus —
 *   and only then is anything on the record: no supply from the bedside, none without someone at the device. What
 *   cannot proceed (no device, nobody to do it, no way there) is said once per reason and tried again every round.
 *   In text mode the dispensary has no bodies: it reviews and supplies at once.
 *
 * The prescriber stays the prescriber: the service never signs, never reads the review for them.
 */
import { currentVersion, formulationOf, prescriptionDef, supplyDeviation, t, versionStatus, type ClinicalAction, type DispensingStep, type PrescriptionDefinition, type PrescriptionVersion } from "@clinicalcraft/core";
import { DISPENSING_STEPS } from "@clinicalcraft/core";
import { behaviorOf, PRIMARY_ACTOR, type WorldRuntime } from "@clinicalcraft/world";
import { dispensaryStaff } from "../tools/prescriptions.js";
import { isZh, rt } from "./i18n.js";
import type { SessionKernel } from "./kernel.js";
import { staffAgent } from "./staff-voice.js";

/** Devices of the facility that provide every capability a supply needs (entity ids, facility order). */
function providers(w: WorldRuntime, caps: readonly string[]): string[] {
  return w
    .entities()
    .filter((e) => e.kind === "equipment" && caps.length > 0 && caps.every((c) => e.capabilities.includes(c)))
    .map((e) => e.id);
}

export class SessionPrescriptions {
  /** What was said already, by `prescription:version:what` (a blocked supply: by its reason) — each once. */
  private readonly said = new Set<string>();

  constructor(private readonly k: SessionKernel) {}

  /** Does the case have prescriptions? */
  available(): boolean {
    return (this.k.caseDef.prescriptions ?? []).length > 0;
  }

  private dispatch(action: ClinicalAction, id: string) {
    return this.k.dispatch(action, id);
  }

  /** After an act: review what was signed, review again what was resolved, supply what is confirmed. Never throws. */
  async afterLearner(id: string, signal: AbortSignal): Promise<void> {
    const k = this.k;
    if (!this.available() || !k.state.started || k.state.finished) return;
    try {
      for (const def of k.caseDef.prescriptions ?? []) {
        let v = currentVersion(k.state, def.id);
        if (!v) continue;
        const before = versionStatus(k.state, v);
        if (before === "submitted" || before === "queried") this.review(id, def, v);
        v = currentVersion(k.state, def.id);
        if (v && def.dispensedBy === "staff" && versionStatus(k.state, v) === "confirmed") await this.supply(id, def, v, signal);
        if (signal.aborted) return;
      }
    } catch (err) {
      k.emit(id, { type: "warning", message: `dispensary: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  /** Who reviews and supplies: the facility's staff member, else the role the case names (text mode, or nobody placed). */
  private who(def: PrescriptionDefinition): { id: string; staffId: string | null; name: string; role: string } {
    const k = this.k;
    const staffId = dispensaryStaff(def, k.facility);
    const staff = staffId ? k.facility?.staff.find((s) => s.id === staffId) : undefined;
    return { id: staffId ?? def.dispensary, staffId, name: staff ? t(staff.name, k.locale) : rt(k.locale, "rx.notify.title"), role: staff?.role ?? "pharmacist" };
  }

  /** A line in the dispenser's own voice (once per key). */
  private say(id: string, def: PrescriptionDefinition, key: string, text: string): void {
    if (this.said.has(key)) return;
    this.said.add(key);
    const k = this.k;
    const who = this.who(def);
    const agent = staffAgent(who.role) as never;
    k.speakLine(id, { agent, speaker: who.name, text, grounded: [], ...(who.staffId ? { staffId: who.staffId } : {}) });
    k.conversations.addDialogue({ who: staffAgent(who.role), speaker: who.name, text });
  }

  /**
   * The review of the current version, in the reviewer's own name: the engine computes what it finds. A version
   * reviewed already is reviewed again only to record a change (the engine leaves an unchanged review alone), and the
   * outcome is said once per review.
   */
  private review(id: string, def: PrescriptionDefinition, v: PrescriptionVersion): void {
    const k = this.k;
    const L = k.locale;
    const who = this.who(def);
    const r = this.dispatch({ type: "prescription", prescription: { op: "review", prescription: def.id, version: v.n, by: who.id }, by: "system" }, id);
    if (r.rejected) return;
    const now = currentVersion(k.state, def.id);
    const review = now?.n === v.n ? now.reviews.at(-1) : undefined;
    if (!review) return;
    const prescription = t(def.name, L);
    const lang = isZh(L) ? "zh-CN" : "en";
    if (review.findings.length) {
      const findings = review.findings.map((f, i) => `${review.findings.length > 1 ? `${i + 1}. ` : ""}${f.text[lang]}`).join(" ");
      this.say(id, def, `${def.id}:${v.n}:review:${now!.reviews.length}`, rt(L, "rx.staff.query", { n: v.n, prescription, findings }));
    } else if (def.dispensedBy === "staff") {
      this.say(id, def, `${def.id}:${v.n}:review:${now!.reviews.length}`, rt(L, "rx.staff.confirmed", { n: v.n, prescription }));
    }
  }

  /** The dispensing operations a device offers, by step (`clinical: { tool: "dispense", item: <step> }`). */
  private deviceSteps(w: WorldRuntime, device: string): Map<DispensingStep, string> {
    const e = w.entity(device);
    const out = new Map<DispensingStep, string>();
    if (!e || e.kind !== "equipment") return out;
    for (const o of behaviorOf(e).operations) {
      const step = o.clinical?.tool === "dispense" ? (o.clinical.item as DispensingStep | undefined) : undefined;
      if (step && (DISPENSING_STEPS as readonly string[]).includes(step) && !out.has(step)) out.set(step, o.id);
    }
    return out;
  }

  /** A supply that cannot proceed now: said once per reason, tried again next round. */
  private blocked(id: string, def: PrescriptionDefinition, v: PrescriptionVersion, reason: string): void {
    this.say(id, def, `${def.id}:${v.n}:blocked:${reason}`, rt(this.k.locale, "rx.staff.blocked", { prescription: t(def.name, this.k.locale), reason }));
  }

  /**
   * Supply the confirmed current version (see the module docs): at once without a world; with one, by the dispenser's
   * own body at a dispensing device — its operations in order when it has them, else the supply recorded once the world
   * has them at the device.
   */
  private async supply(id: string, def: PrescriptionDefinition, v: PrescriptionVersion, signal: AbortSignal): Promise<void> {
    const k = this.k;
    const L = k.locale;
    const who = this.who(def);
    const key = `${def.id}:supply:${v.n}:dispensary`;
    const prescription = t(def.name, L);
    const done = () => (k.state.prescriptions?.dispensings ?? []).some((d) => d.prescription === def.id && d.version === v.n);
    const e = k.embodied;
    if (!e) {
      this.dispatch({ type: "prescription", prescription: { op: "dispense", prescription: def.id, version: v.n, key, by: who.id }, by: "system" }, id);
      if (done()) this.say(id, def, `${def.id}:${v.n}:supplied`, rt(L, "rx.staff.supplied", { n: v.n, prescription }));
      return;
    }
    const w = e.world();
    const name = (eid: string) => t(w.entity(eid)?.name ?? eid, L);
    const actorId = who.staffId ? `staff:${who.staffId}` : null;
    if (!actorId || !w.actor(actorId)) return this.blocked(id, def, v, rt(L, "rx.wait.noStaff"));
    const snapshot = w.snapshot().entities;
    const devices = providers(w, def.requires).filter((d) => snapshot[d]?.available !== false && (!snapshot[d]?.reservedBy || snapshot[d]?.reservedBy === actorId));
    if (!devices.length) return this.blocked(id, def, v, rt(L, "rx.wait.noDevice", { caps: def.requires.join(", ") }));
    // the device made for the formulation's form (a type tagged `granules`, `decoction-pieces`…) when the dispensary
    // has one; then a device with dispensing operations (the supply is worked step by step, as a learner would)
    const form = formulationOf(def, v.formulation)?.form;
    const made = devices.filter((d) => !!form && (w.entity(d)?.tags ?? []).includes(form));
    const pool = made.length ? made : devices;
    const device = pool.find((d) => this.deviceSteps(w, d).has("dispense")) ?? pool[0]!;
    const caller = { agent: staffAgent(who.role), submission: id, signal };
    const intent = { tool: "dispense", kind: "dispense" as const, itemId: "dispense", prescriptionId: def.id };
    if (!w.checkSpatial(actorId, intent).ok) {
      const walked = await e.act(caller, { actorId, operation: "navigate", goal: { kind: "interact", id: device }, onBehalfOf: PRIMARY_ACTOR }, signal);
      if (signal.aborted) return;
      if (!w.checkSpatial(actorId, intent).ok) {
        const reason = (walked.status === "completed" ? "" : walked.message.split("\n")[0] ?? "").replace(/[.。]\s*$/u, "");
        return this.blocked(id, def, v, rt(L, "rx.wait.cannotReach", { device: name(device), reason: reason || "—" }));
      }
    }
    const steps = this.deviceSteps(w, device);
    if (steps.has("dispense")) {
      // a supply the case authors to go out wrong goes out unchecked: nobody looked at the label
      const formulation = formulationOf(def, v.formulation);
      const unchecked = !!formulation && !!supplyDeviation(k.caseDef, k.state, def, formulation);
      for (const step of DISPENSING_STEPS) {
        const operation = steps.get(step);
        if (!operation || done() || (step === "check-label" && unchecked)) continue;
        const r = await e.act(caller, { actorId, operation, targetId: device, parameters: { prescription: def.id, ...(step === "dispense" ? { request_key: key } : {}) }, onBehalfOf: PRIMARY_ACTOR }, signal);
        if (signal.aborted) return;
        if (r.status !== "completed") return this.blocked(id, def, v, (r.message || "").split("\n")[0] ?? "");
      }
    } else {
      // a plain cabinet: the world has them at it — the supply is recorded with the device it was made at
      this.dispatch({ type: "prescription", prescription: { op: "dispense", prescription: def.id, version: v.n, key, by: who.id, device }, by: "system" }, id);
    }
    if (done()) this.say(id, def, `${def.id}:${v.n}:supplied`, rt(L, "rx.staff.supplied", { n: v.n, prescription }));
  }

  /** The prescription a staff member is working on now, for their role state (null: none). */
  goalOf(staffId: string): string | null {
    const k = this.k;
    for (const def of k.caseDef.prescriptions ?? []) {
      if (dispensaryStaff(def, k.facility) !== staffId) continue;
      const v = currentVersion(k.state, def.id);
      const status = v ? versionStatus(k.state, v) : null;
      if (v && (status === "submitted" || (def.dispensedBy === "staff" && (status === "confirmed" || status === "preparing")))) {
        return rt(k.locale, status === "submitted" ? "rx.await.review" : "rx.await.supply", { n: v.n, prescription: t(prescriptionDef(k.caseDef, def.id)!.name, k.locale) });
      }
    }
    return null;
  }
}

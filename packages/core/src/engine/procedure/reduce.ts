/**
 * The operative-field reducer (docs/PROCEDURE.md §5): `operate(def, state, op, clock)` applies one
 * operator step. Pure and deterministic. A step that is physically impossible (an instrument out of
 * reach, a clip on a structure not yet free all round, a 10 mm scope in a 5 mm port) is rejected; a
 * step that is possible but unsafe is carried out and recorded (`state.unsafe`) with whatever
 * consequence the anatomy gives it — an injury follows from what was actually clipped, divided or
 * burnt, never from a script.
 */
import type { UnsafeCode } from "../../schema/common.js";
import type { InstrumentId, ProcedureDefinition, ProcedureOp, ProcedureOpType, ProcedureSignal, Structure, Vec3 } from "../../schema/procedure.js";
import {
  appearanceRule,
  assignHandles,
  clearedFraction,
  exposure,
  fieldOpen,
  isTubular,
  isVisible,
  obscured,
  regionOf,
  specimenParts,
  structureOf,
  structureOfHandle,
  viewCriteria,
} from "./field.js";
import { directionVector, portReport, reach, shaftsClash } from "./geometry.js";
import { cloneProcedureState, type Injury, type PortState, type ProcedureState } from "./state.js";

export type { ProcedureSignal };

export interface ProcedureStepResult {
  state: ProcedureState;
  /** Minutes the step takes on a simulated clock. */
  minutes: number;
  signals: ProcedureSignal[];
  rejected?: { code: "invalid" | "requirements-unmet" | "unknown-id"; message: string };
}

/** Default minutes per step (a definition's `minutes` overrides by op name, or by `image:ioc` / `bailout:convert-open`). */
const MINUTES: Record<string, number> = {
  "plan-ports": 0,
  insufflate: 3,
  desufflate: 1,
  insert: 0.5,
  withdraw: 0.25,
  retract: 0.5,
  release: 0.25,
  dissect: 2,
  isolate: 2,
  identify: 0,
  "safety-pause": 1,
  clip: 0.5,
  divide: 0.5,
  coagulate: 0.5,
  suction: 1,
  irrigate: 1,
  "image:ioc": 10,
  "image:lap-us": 6,
  inspect: 1,
  recognise: 0,
  bag: 2,
  extract: 3,
  "bailout:call-help": 5,
  "bailout:convert-open": 20,
  "bailout:subtotal-fenestrating": 20,
  "bailout:subtotal-reconstituting": 25,
  "bailout:abandon-refer": 5,
  close: 5,
};

/** What each instrument can do (docs/PROCEDURE.md §2); front-ends offer these and nothing else. */
export const INSTRUMENT_OPS: Readonly<Record<InstrumentId, readonly ProcedureOpType[]>> = {
  laparoscope: [],
  grasper: ["retract"],
  maryland: ["retract", "dissect", "isolate", "coagulate"],
  hook: ["dissect", "isolate", "coagulate"],
  scissors: ["dissect", "divide"],
  "clip-applier": ["clip"],
  suction: ["suction", "irrigate"],
  "retrieval-bag": ["bag"],
  cholangiocatheter: ["image"],
  "lap-us": ["image"],
};

/** Instruments that deliver energy (monopolar hook, Maryland). */
export const ENERGY_INSTRUMENTS: ReadonlySet<InstrumentId> = new Set(["hook", "maryland"]);
const CAN = INSTRUMENT_OPS;
const ENERGY = ENERGY_INSTRUMENTS;

/** Default instrument diameters (mm). */
const DIAMETER: Record<InstrumentId, number> = {
  laparoscope: 10,
  grasper: 5,
  maryland: 5,
  hook: 5,
  scissors: 5,
  "clip-applier": 5,
  suction: 5,
  "retrieval-bag": 10,
  cholangiocatheter: 5,
  "lap-us": 10,
};

class Rejection extends Error {
  constructor(
    readonly code: "invalid" | "requirements-unmet" | "unknown-id",
    message: string,
  ) {
    super(message);
  }
}
const reject = (code: Rejection["code"], message: string): never => {
  throw new Rejection(code, message);
};

interface Step {
  def: ProcedureDefinition;
  s: ProcedureState;
  at: number;
  signals: ProcedureSignal[];
}

function unsafe(x: Step, code: UnsafeCode, structure?: string): void {
  x.s.unsafe.push({ code, at: x.at, ...(structure ? { structure } : {}) });
}

function injure(x: Step, injury: Omit<Injury, "at" | "recognised">): void {
  if (x.s.injuries.some((i) => i.kind === injury.kind && i.structure === injury.structure)) return;
  x.s.injuries.push({ ...injury, at: x.at, recognised: false });
}

function portOf(x: Step, id: string): PortState {
  const p = x.s.ports.find((q) => q.site === id);
  if (!p) reject("unknown-id", `There is no port "${id}" in the chosen plan.`);
  return p!;
}

function siteOf(x: Step, id: string) {
  return x.def.portSites.find((p) => p.id === id)!;
}

/** The instrument in `port`, which must be able to do `op`. */
function working(x: Step, port: string, op: ProcedureOpType): { p: PortState; instrument: InstrumentId } {
  const p = portOf(x, port);
  if (!p.instrument) reject("requirements-unmet", `No instrument is in port "${port}".`);
  if (!CAN[p.instrument!].includes(op)) reject("invalid", `The ${p.instrument} in port "${port}" cannot ${op}.`);
  if (!fieldOpen(x.s)) reject("requirements-unmet", "The field is not in view: insufflate and put the laparoscope in.");
  return { p, instrument: p.instrument! };
}

/** The point an instrument works on for a structure (its middle point) or a region (its centre). */
function pointOf(st: Structure): Vec3 {
  return st.points[Math.floor((st.points.length - 1) / 2)];
}

/** Reach the point from the port, record the tip, count clashes and crossed hands. */
function workAt(x: Step, p: PortState, point: Vec3): void {
  const site = siteOf(x, p.site);
  const length = x.def.instruments.find((i) => i.id === p.instrument)?.lengthM;
  const r = reach(site.at, site.normal ?? [0, 0, 1], point, length);
  if (!r.ok) reject("requirements-unmet", r.reason === "too-far" ? `The instrument in port "${p.site}" cannot reach that far.` : `Port "${p.site}" is at too steep an angle to that point.`);
  p.tip = point;
  for (const other of x.s.ports) {
    if (other === p || !other.instrument || !other.tip || other.role === "camera") continue;
    if (shaftsClash(site.at, point, siteOf(x, other.site).at, other.tip)) {
      x.s.counters.clashes++;
      x.signals.push("instrument-clash");
      break;
    }
  }
  if (p.hand) {
    const plan = x.def.portPlans.find((q) => q.id === x.s.plan);
    if (plan && portReport(x.def, plan).handsCross) x.s.counters.crossings++;
  }
}

function handleStructure(x: Step, handle: string): Structure {
  const st = structureOfHandle(x.def, x.s, handle);
  if (!st || !isVisible(x.def, x.s, st)) reject("unknown-id", `Nothing called "${handle}" is in view.`);
  return st!;
}

/** Visible injuries the operator has not said aloud, before going on with an irreversible step or closing. */
function continuing(x: Step): void {
  if (x.s.injuries.some((i) => i.visible && !i.recognised)) unsafe(x, "continued-after-injury");
}

/** The checks an irreversible step (clip, divide) on a target or critical structure is recorded against. */
function irreversible(x: Step, st: Structure, handle: string): void {
  if (st.role !== "target" && st.role !== "critical") return;
  const gates = x.def.views.filter((v) => v.gatesIrreversible);
  if (gates.length) {
    const last = [...x.s.pauses].reverse().find((p) => gates.some((g) => g.id === p.view));
    if (!last) unsafe(x, "irreversible-without-pause", st.id);
    else if (!last.achieved) unsafe(x, "irreversible-without-view", st.id);
  }
  const claim = x.s.claims[handle];
  if (!claim) unsafe(x, "irreversible-on-unidentified", st.id);
  else if (claim !== st.id) unsafe(x, "irreversible-on-misidentified", st.id);
  if (obscured(x.s)) unsafe(x, "blind-in-obscured-field", st.id);
  continuing(x);
}

function bleed(x: Step, source: string, severity: "ooze" | "brisk" | "major"): void {
  if (x.s.bleeding.some((b) => b.source === source && !b.controlled)) return;
  x.s.bleeding.push({ source, severity, controlled: false, suctioned: false });
  x.signals.push(severity === "major" ? "major-bleeding" : "bleeding");
  if (severity !== "ooze") x.signals.push("field-obscured");
}

function spill(x: Step): void {
  x.s.spillage.bile = true;
  x.s.spillage.cleared = false;
  x.signals.push("bile-in-field");
  if (x.def.stones) {
    x.s.spillage.stones = true;
    x.signals.push("stones-spilled");
  }
}

function perforate(x: Step, structure: string): void {
  if (x.s.injuries.some((i) => i.kind === "perforation")) return;
  injure(x, { kind: "perforation", structure, visible: true, severity: "minor" });
  spill(x);
}

function ended(x: Step): boolean {
  return x.s.closed || x.s.bailouts.includes("convert-open") || x.s.bailouts.includes("abandon-refer");
}

const DISSECTION_OPS: ReadonlySet<ProcedureOpType> = new Set(["dissect", "isolate", "clip", "divide", "coagulate", "retract", "image", "bag"]);

function apply(x: Step, op: ProcedureOp): void {
  const { def, s } = x;
  if (ended(x) && op.op !== "inspect" && op.op !== "recognise") reject("requirements-unmet", s.closed ? "The operation is closed." : "The laparoscopic operation has ended.");
  if (s.bailouts.some((b) => b.startsWith("subtotal")) && DISSECTION_OPS.has(op.op)) reject("requirements-unmet", "A subtotal cholecystectomy was chosen: no further dissection.");
  switch (op.op) {
    case "plan-ports": {
      const plan = def.portPlans.find((p) => p.id === op.plan);
      if (!plan) return reject("unknown-id", `There is no port plan "${op.plan}".`);
      if (s.insufflated || s.ports.some((p) => p.instrument)) return reject("requirements-unmet", "The ports are already in: the plan can no longer change.");
      s.plan = plan.id;
      s.ports = plan.ports.map((p) => ({ site: p.site, role: p.role, sizeMm: p.sizeMm, ...(p.hand ? { hand: p.hand } : {}), instrument: null, tip: null }));
      if (portReport(def, plan).handsCross) x.signals.push("hands-cross");
      return;
    }
    case "insufflate": {
      if (!s.plan) return reject("requirements-unmet", "Choose the port plan first.");
      if (op.pressure > def.insufflation.max) {
        unsafe(x, "insufflation-over-max");
        x.signals.push("pressure-high");
      }
      s.insufflated = true;
      s.pressure = op.pressure;
      assignHandles(def, s);
      return;
    }
    case "desufflate":
      s.insufflated = false;
      s.pressure = 0;
      return;
    case "insert": {
      const p = portOf(x, op.port);
      if (!def.instruments.some((i) => i.id === op.instrument)) return reject("unknown-id", `No ${op.instrument} is on the instrument table.`);
      const diameter = def.instruments.find((i) => i.id === op.instrument)?.diameterMm ?? DIAMETER[op.instrument];
      if (diameter > p.sizeMm) return reject("invalid", `A ${diameter} mm ${op.instrument} does not pass a ${p.sizeMm} mm port.`);
      if (!s.insufflated) return reject("requirements-unmet", "Insufflate before inserting instruments.");
      if (p.instrument === op.instrument) return;
      if (p.instrument) {
        s.counters.exchanges++;
        for (const [k, r] of Object.entries(s.retractions)) if (r.port === p.site) delete s.retractions[k];
      }
      p.instrument = op.instrument;
      p.tip = null;
      assignHandles(def, s);
      return;
    }
    case "withdraw": {
      const p = portOf(x, op.port);
      for (const [k, r] of Object.entries(s.retractions)) if (r.port === p.site) delete s.retractions[k];
      p.instrument = null;
      p.tip = null;
      return;
    }
    case "retract": {
      const { p } = working(x, op.port, "retract");
      const st = structureOf(def, op.structure);
      if (!st || !isVisible(def, s, st)) return reject("unknown-id", `"${op.structure}" is not in view.`);
      if (isTubular(st)) return reject("invalid", "Grasp the gallbladder or an organ, not a duct or vessel.");
      workAt(x, p, pointOf(st));
      for (const [k, r] of Object.entries(s.retractions)) if (r.port === p.site) delete s.retractions[k];
      s.retractions[st.id] = { port: p.site, direction: directionVector(op.direction), force: op.force };
      if (op.force === "excessive") {
        unsafe(x, "excessive-traction", st.id);
        if (specimenParts(def).has(st.id)) perforate(x, st.id);
      }
      assignHandles(def, s);
      return;
    }
    case "release":
      delete s.retractions[op.structure];
      return;
    case "dissect": {
      const { p, instrument } = working(x, op.port, "dissect");
      const region = regionOf(def, op.region);
      if (!region) return reject("unknown-id", `There is no region "${op.region}".`);
      if (op.energy && !ENERGY.has(instrument)) return reject("invalid", `The ${instrument} delivers no energy.`);
      if (obscured(s)) return reject("requirements-unmet", "The field is obscured by blood: suction first.");
      for (const prior of region.after) if (clearedFraction(def, s, prior) < 0.5) return reject("requirements-unmet", `Open "${prior}" first.`);
      workAt(x, p, region.centre);
      const e = exposure(def, s, region.id);
      s.cleared[region.id] = Math.min(region.units, (s.cleared[region.id] ?? 0) + (op.energy ? 1.5 : 1) * (e < 0.5 ? 0.5 : 1));
      s.exposedMax[region.id] = Math.max(s.exposedMax[region.id] ?? 0, e);
      if (op.energy) {
        for (const hazardId of region.hazards) {
          const hazard = structureOf(def, hazardId);
          if (!hazard || isVisible(def, s, hazard) || e >= 0.6) continue;
          unsafe(x, "energy-near-hidden-hazard", hazardId);
          if (e < 0.4) injure(x, { kind: "thermal-injury", structure: hazardId, visible: false, severity: "major" });
        }
        if (region.bed && e < 0.5) perforate(x, def.specimen);
      }
      assignHandles(def, s);
      if (region.bed && clearedFraction(def, s, region.id) >= 1 && s.specimen === "in-situ") {
        const parts = specimenParts(def);
        const tethers = def.anatomy.filter((st) => st.enters && parts.has(st.enters) && st.role === "target");
        if (tethers.every((st) => s.divided.includes(st.id))) {
          s.specimen = "detached";
          x.signals.push("specimen-detached");
        }
      }
      return;
    }
    case "isolate": {
      const { p } = working(x, op.port, "isolate");
      const st = handleStructure(x, op.handle);
      if (!isTubular(st)) return reject("invalid", "Only a duct or vessel can be freed all round.");
      if (obscured(s)) return reject("requirements-unmet", "The field is obscured by blood: suction first.");
      if (st.in && clearedFraction(def, s, st.in) < 0.8) return reject("requirements-unmet", "Clear more of the surrounding tissue before freeing it all round.");
      workAt(x, p, pointOf(st));
      if (!s.isolated.includes(st.id)) s.isolated.push(st.id);
      return;
    }
    case "identify": {
      handleStructure(x, op.handle);
      if (!structureOf(def, op.as)) return reject("unknown-id", `"${op.as}" is not a structure of this operation.`);
      s.claims[op.handle] = op.as;
      return;
    }
    case "safety-pause": {
      const view = def.views.find((v) => v.id === op.view);
      if (!view) return reject("unknown-id", `There is no safety view "${op.view}".`);
      const truth = viewCriteria(def, s, view.id);
      s.pauses.push({ at: x.at, view: view.id, claims: { ...op.claims }, truth, achieved: Object.values(truth).every(Boolean), step: s.counters.steps });
      return;
    }
    case "clip": {
      const { p } = working(x, op.port, "clip");
      const st = handleStructure(x, op.handle);
      if (!isTubular(st)) return reject("invalid", "Clips go on a duct or vessel.");
      const stump = s.bleeding.find((b) => b.source === st.id && !b.controlled);
      if (!s.isolated.includes(st.id) && !stump) return reject("requirements-unmet", "The applier cannot close round a structure that is not free all round.");
      workAt(x, p, pointOf(st));
      if (!stump) irreversible(x, st, op.handle);
      else if (obscured(s)) unsafe(x, "blind-in-obscured-field", st.id);
      s.clips[st.id] = (s.clips[st.id] ?? 0) + op.count;
      if (stump && stump.severity !== "major") {
        stump.controlled = true;
        x.signals.push("bleeding-controlled");
      }
      if (st.role === "critical") injure(x, { kind: st.kind === "duct" ? "bile-duct-injury" : "vascular-injury", structure: st.id, visible: false, severity: "major" });
      return;
    }
    case "divide": {
      const { p } = working(x, op.port, "divide");
      const st = handleStructure(x, op.handle);
      if (!isTubular(st)) return reject("invalid", "Only a duct or vessel is divided here.");
      if (!s.isolated.includes(st.id)) return reject("requirements-unmet", "Free it all round before dividing it.");
      if (s.divided.includes(st.id)) return reject("requirements-unmet", "It is already divided.");
      workAt(x, p, pointOf(st));
      irreversible(x, st, op.handle);
      s.divided.push(st.id);
      const secured = (s.clips[st.id] ?? 0) >= 2;
      if (st.role === "target" && !secured) {
        if (st.kind === "duct") {
          injure(x, { kind: "bile-leak", structure: st.id, visible: true, severity: "minor" });
          spill(x);
        } else {
          injure(x, { kind: "bleeding", structure: st.id, visible: true, severity: "minor" });
          bleed(x, st.id, "brisk");
        }
      }
      if (st.role === "critical") {
        if (st.kind === "duct") {
          injure(x, { kind: "bile-duct-injury", structure: st.id, visible: true, severity: "major" });
          spill(x);
        } else {
          injure(x, { kind: "vascular-injury", structure: st.id, visible: true, severity: "major" });
          bleed(x, st.id, "major");
        }
      }
      return;
    }
    case "coagulate": {
      const { p } = working(x, op.port, "coagulate");
      const st = handleStructure(x, op.handle);
      workAt(x, p, pointOf(st));
      if (obscured(s)) unsafe(x, "blind-in-obscured-field", st.id);
      const source = s.bleeding.find((b) => b.source === st.id && !b.controlled);
      if (source && source.severity !== "major") {
        source.controlled = true;
        x.signals.push("bleeding-controlled");
      }
      if (st.role === "critical") injure(x, { kind: "thermal-injury", structure: st.id, visible: false, severity: "major" });
      return;
    }
    case "suction":
    case "irrigate": {
      working(x, op.port, op.op);
      if (op.op === "suction") {
        const wasObscured = obscured(s);
        for (const b of s.bleeding) if (!b.controlled) b.suctioned = true;
        if (s.spillage.bile || s.spillage.stones) s.spillage.cleared = true;
        if (wasObscured && !obscured(s)) x.signals.push("field-clear");
      }
      return;
    }
    case "image": {
      const { instrument } = working(x, op.port, "image");
      if ((op.modality === "ioc") !== (instrument === "cholangiocatheter")) return reject("invalid", op.modality === "ioc" ? "Cholangiography needs the cholangiocatheter." : "Laparoscopic ultrasound needs the probe.");
      if (op.modality === "ioc") {
        const parts = specimenParts(def);
        const duct = def.anatomy.find((st) => st.role === "target" && st.kind === "duct" && st.enters && parts.has(st.enters));
        if (!duct || !s.isolated.includes(duct.id) || s.divided.includes(duct.id) || !(s.clips[duct.id] >= 1))
          return reject("requirements-unmet", "Cholangiography goes through a free, clipped (gallbladder side) and undivided cystic duct.");
      }
      if (!s.imaged.includes(op.modality)) s.imaged.push(op.modality);
      for (const i of s.injuries) if (i.kind === "bile-duct-injury") i.visible = true;
      x.signals.push("imaging-done");
      return;
    }
    case "inspect":
      if (!fieldOpen(s) && !ended(x)) return reject("requirements-unmet", "The field is not in view.");
      s.inspected = true;
      return;
    case "recognise": {
      const matches = s.injuries.filter((i) => i.kind === op.injury || (op.injury === "bleeding" && i.kind === "vascular-injury"));
      if (matches.length) for (const i of matches) i.recognised = true;
      else s.counters.falseAlarms++;
      return;
    }
    case "bag": {
      working(x, op.port, "bag");
      if (s.specimen !== "detached") return reject("requirements-unmet", "The gallbladder is not free yet.");
      s.specimen = "bagged";
      return;
    }
    case "extract": {
      const p = portOf(x, op.port);
      if (s.specimen !== "bagged") return reject("requirements-unmet", "Bag the specimen before taking it out.");
      if (p.sizeMm < 10) return reject("invalid", `A ${p.sizeMm} mm port is too small to extract the specimen.`);
      s.specimen = "extracted";
      return;
    }
    case "bailout": {
      if (!def.bailouts.includes(op.strategy)) return reject("invalid", `"${op.strategy}" is not available in this operation.`);
      if (op.strategy.startsWith("subtotal") && s.specimen !== "in-situ") return reject("requirements-unmet", "The gallbladder is already free: a subtotal is no longer the question.");
      if (!s.bailouts.includes(op.strategy)) s.bailouts.push(op.strategy);
      if (op.strategy === "convert-open") {
        for (const b of s.bleeding) b.controlled = true;
        s.insufflated = false;
        for (const p of s.ports) {
          p.instrument = null;
          p.tip = null;
        }
      }
      return;
    }
    case "close": {
      const subtotal = s.bailouts.some((b) => b.startsWith("subtotal"));
      if (s.specimen !== "extracted" && !subtotal) return reject("requirements-unmet", "The specimen is still inside: take it out, or choose a bail-out first.");
      continuing(x);
      s.closed = true;
      s.insufflated = false;
      s.pressure = 0;
      s.retractions = {};
      for (const p of s.ports) {
        p.instrument = null;
        p.tip = null;
      }
      return;
    }
  }
}

/** Minutes a step takes (definition override, else the default). */
function minutesFor(def: ProcedureDefinition, op: ProcedureOp): number {
  const key = op.op === "image" ? `image:${op.modality}` : op.op === "bailout" ? `bailout:${op.strategy}` : op.op;
  return def.minutes[key] ?? def.minutes[op.op] ?? MINUTES[key] ?? MINUTES[op.op] ?? 0;
}

/** Apply one operator step to the field (pure: the input state is never mutated). */
export function operate(def: ProcedureDefinition, state: ProcedureState, op: ProcedureOp, at: number): ProcedureStepResult {
  const x: Step = { def, s: cloneProcedureState(state), at, signals: [] };
  try {
    apply(x, op);
  } catch (err) {
    if (err instanceof Rejection) return { state, minutes: 0, signals: [], rejected: { code: err.code, message: err.message } };
    throw err;
  }
  x.s.counters.steps++;
  return { state: x.s, minutes: minutesFor(def, op), signals: [...new Set(x.signals)] };
}

/** The appearance text key in force for a structure (re-exported for the observation). */
export { appearanceRule };

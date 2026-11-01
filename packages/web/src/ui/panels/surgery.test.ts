/**
 * The surgery window's controls: when the window is offered, which actions each instrument offers (kept
 * in step with the engine by running it), the ops the controls build (valid `operate` ops), the
 * identification choices (never in the order handles are given out), and a label in both languages for
 * every engine value the window shows.
 */
import {
  BailoutSchema,
  createProcedureState,
  createSession,
  InjuryKindSchema,
  InstrumentIdSchema,
  observeField,
  operate,
  ProcedureOpSchema,
  reduce,
  UnsafeCodeSchema,
  type ClinicalAction,
  type DomainEvent,
  type InstrumentId,
  type ProcedureDefinition,
  type ProcedureOp,
} from "@clinicalcraft/core";
import { afterEach, describe, expect, it } from "vitest";
import { routeInteraction } from "../../app/world-bridge.js";
import type { InteractionTarget } from "../../contracts.js";
import { setLocale } from "../../i18n/index.js";
import { SURGERY_EN, SURGERY_ZH } from "../../i18n/surgery.js";
import { lapCholeCase } from "./__fixtures__/lap-chole-sit.js";
import {
  activePort,
  controlsFor,
  DIRECTION_NAMES,
  dissectOp,
  ENERGY_INSTRUMENTS,
  handleOp,
  identifyChoices,
  imageOp,
  INSTRUMENT_CONTROLS,
  label,
  lastStep,
  retractOp,
  safetyPauseOp,
  selectedHandle,
  surgeryOffered,
  toggleDirection,
  type Control,
} from "./surgery-controls.js";

const c = lapCholeCase();
const def = c.procedure!;

afterEach(() => setLocale("zh-CN"));

/** The fixture's operation with every instrument of the vocabulary on the table. */
function allInstruments(): ProcedureDefinition {
  return { ...def, instruments: InstrumentIdSchema.options.map((id) => def.instruments.find((i) => i.id === id) ?? { id }) };
}

/** Field state after `ops` (each must be accepted). */
function after(d: ProcedureDefinition, ops: ProcedureOp[]) {
  let s = createProcedureState();
  for (const op of ops) {
    const r = operate(d, s, op, 0);
    if (r.rejected) throw new Error(`${op.op}: ${r.rejected.message}`);
    s = r.state;
  }
  return s;
}

/** An op of `control` through `port` (the target ids do not matter: the instrument is checked first). */
function controlOp(control: Control, port: string): ProcedureOp {
  switch (control) {
    case "retract":
      return { op: "retract", port, structure: "gallbladder-fundus", direction: ["cephalad"], force: "firm" };
    case "dissect":
      return { op: "dissect", port, region: "hepatocystic-triangle", energy: false };
    case "isolate":
    case "divide":
    case "coagulate":
      return { op: control, port, handle: "T1" };
    case "clip":
      return { op: "clip", port, handle: "T1", count: 1 };
    case "image":
      return { op: "image", port, modality: "ioc" };
    default:
      return { op: control, port };
  }
}

const CONTROLS: Control[] = ["retract", "dissect", "isolate", "clip", "divide", "coagulate", "suction", "irrigate", "image", "bag"];

describe("when the surgery window is offered", () => {
  it("only for a case with an operation, in one of its phases", () => {
    expect(surgeryOffered(c, "theatre")).toBe(true);
    expect(surgeryOffered(c, "ward")).toBe(false);
    expect(surgeryOffered({ ...c, procedure: undefined }, "theatre")).toBe(false);
    expect(surgeryOffered(null, "theatre")).toBe(false);
  });
});

describe("the operating table in the world", () => {
  const table: InteractionTarget = { kind: "equipment", placementId: "or-table", type: "operating-table", interaction: "bed", capabilities: ["surgery"], name: "Operating table", hint: "", room: null };
  it("opens the surgery window while the operation is under way, else stays a bed", () => {
    expect(routeInteraction(table, { caseDef: c, slotId: null, phase: "theatre" })).toEqual({ panel: "surgery" });
    expect(routeInteraction(table, { caseDef: c, slotId: null, phase: "ward" }).panel).toBe("toast");
    expect(routeInteraction({ ...table, capabilities: [] }, { caseDef: c, slotId: null, phase: "theatre" }).panel).toBe("toast");
  });
});

describe("the actions each instrument offers", () => {
  it("are exactly what the engine lets that instrument do", () => {
    const d = allInstruments();
    for (const instrument of InstrumentIdSchema.options) {
      // the instrument check comes first, so a 10 mm port without the scope in it is enough
      const s = after(d, [{ op: "plan-ports", plan: "mirror-four-port" }, { op: "insufflate", pressure: 12 }, { op: "insert", port: "A", instrument }]);
      for (const control of CONTROLS) {
        const r = operate(d, s, controlOp(control, "A"), 0);
        const cannot = !!r.rejected && /cannot/.test(r.rejected.message);
        expect({ instrument, control, offered: controlsFor(instrument).includes(control) }).toEqual({ instrument, control, offered: !cannot });
      }
    }
    expect(Object.keys(INSTRUMENT_CONTROLS).sort()).toEqual([...InstrumentIdSchema.options].sort());
    expect(controlsFor(null)).toEqual([]);
  });

  it("offer energy only on the instruments the engine lets deliver it", () => {
    const d = allInstruments();
    for (const instrument of ["maryland", "hook", "scissors"] as InstrumentId[]) {
      const s = after(d, [{ op: "plan-ports", plan: "mirror-four-port" }, { op: "insufflate", pressure: 12 }, { op: "insert", port: "A", instrument: "laparoscope" }, { op: "insert", port: "D", instrument }]);
      const r = operate(d, s, { op: "dissect", port: "D", region: "hepatocystic-triangle", energy: true }, 0);
      expect({ instrument, energy: !(r.rejected && /no energy/.test(r.rejected.message)) }).toEqual({ instrument, energy: ENERGY_INSTRUMENTS.has(instrument) });
      // the control never asks a cold instrument for energy
      expect(dissectOp("D", "hepatocystic-triangle", true, instrument)).toMatchObject({ energy: ENERGY_INSTRUMENTS.has(instrument) });
    }
  });

  it("image with the instrument's own modality", () => {
    // every port 10 mm, so the probe fits beside the scope
    const d = { ...allInstruments(), portPlans: def.portPlans.map((p) => ({ ...p, ports: p.ports.map((x) => ({ ...x, sizeMm: 10 })) })) };
    for (const instrument of ["cholangiocatheter", "lap-us"] as InstrumentId[]) {
      const s = after(d, [{ op: "plan-ports", plan: "mirror-four-port" }, { op: "insufflate", pressure: 12 }, { op: "insert", port: "A", instrument: "laparoscope" }, { op: "insert", port: "D", instrument }]);
      const r = operate(d, s, imageOp("D", instrument)!, 0);
      // cholangiography may still wait for a clipped cystic duct — never for the wrong modality
      expect(r.rejected?.message ?? "").not.toMatch(/needs the/);
    }
    expect(imageOp("D", "grasper")).toBeNull();
  });
});

describe("the ops the controls build", () => {
  it("are valid operate ops", () => {
    const ops = [
      retractOp("B", "gallbladder-infundibulum", ["patient-left", "caudal"], "firm"),
      dissectOp("C", "hepatocystic-triangle", false, "maryland"),
      handleOp("isolate", "C", "T2"),
      handleOp("clip", "C", "T2", 3),
      handleOp("divide", "C", "T2"),
      handleOp("coagulate", "C", "T2"),
      imageOp("C", "cholangiocatheter"),
      safetyPauseOp(def, "cvs", new Set(["triangle"])),
    ];
    for (const op of ops) expect(ProcedureOpSchema.safeParse(op).success, JSON.stringify(op)).toBe(true);
  });

  it("need a direction to retract, clamp the clip count and claim every criterion of a pause", () => {
    expect(retractOp("B", "gallbladder-fundus", [], "firm")).toBeNull();
    expect(handleOp("clip", "C", "T1", 9)).toEqual({ op: "clip", port: "C", handle: "T1", count: 3 });
    expect(handleOp("clip", "C", "T1", 0)).toEqual({ op: "clip", port: "C", handle: "T1", count: 1 });
    expect(safetyPauseOp(def, "cvs", new Set(["two"]))).toEqual({ op: "safety-pause", view: "cvs", claims: { triangle: false, plate: false, two: true } });
    expect(safetyPauseOp(def, "nope", new Set())).toBeNull();
  });

  it("tick a direction off its opposite and keep the display order", () => {
    let dirs = toggleDirection([], "caudal", true);
    dirs = toggleDirection(dirs, "patient-left", true);
    expect(dirs).toEqual(["caudal", "patient-left"]);
    expect(toggleDirection(dirs, "cephalad", true)).toEqual(["cephalad", "patient-left"]);
    expect(toggleDirection(dirs, "caudal", false)).toEqual(["patient-left"]);
  });
});

describe("what the window keeps selected", () => {
  it("names tubes by their localised names, sorted — not in the order handles are given out", () => {
    const choices = identifyChoices(def, "en");
    expect(choices.map((x) => x.name)).toEqual(["Common bile duct", "Common hepatic duct", "Cystic artery", "Cystic duct", "Right hepatic artery"]);
    const anatomyOrder = def.anatomy.filter((s) => ["duct", "artery", "vein"].includes(s.kind)).map((s) => s.id);
    expect(choices.map((x) => x.id)).not.toEqual(anatomyOrder);
  });

  it("keeps the active port and the selected handle while they exist", () => {
    let s = reduce(c, createSession(c), { type: "start" }).state;
    s = reduce(c, s, { type: "set-phase", phase: "theatre" }).state;
    for (const op of [
      { op: "plan-ports", plan: "three-port-left" },
      { op: "insufflate", pressure: 12 },
      { op: "insert", port: "A", instrument: "laparoscope" },
      { op: "insert", port: "C", instrument: "maryland" },
    ] as ProcedureOp[])
      s = reduce(c, s, { type: "operate", op } as ClinicalAction).state;
    const v = observeField(def, s.procedure!);
    expect(activePort(v, null)).toBe("C");
    expect(activePort(v, "B")).toBe("B");
    expect(activePort(v, "Z")).toBe("C");
    expect(selectedHandle(v, "T1")).toBeNull(); // nothing tubular in view before dissection
  });

  it("reads the last operative step from the events", () => {
    const events: DomainEvent[] = [{ type: "procedure.step", op: "insert", signals: [] }, { type: "note.added" } as DomainEvent, { type: "procedure.step", op: "divide", signals: ["bleeding"] }];
    expect(lastStep(events)).toEqual({ type: "procedure.step", op: "divide", signals: ["bleeding"] });
    expect(lastStep([])).toBeNull();
  });
});

describe("labels of the engine's values", () => {
  const SIGNALS = ["instrument-clash", "hands-cross", "bleeding", "major-bleeding", "bile-in-field", "stones-spilled", "field-obscured", "field-clear", "bleeding-controlled", "specimen-detached", "imaging-done", "pressure-high"];
  const groups: Record<string, readonly string[]> = {
    op: ProcedureOpSchema.options.map((o) => o.shape.op.value),
    signal: SIGNALS,
    finding: ["bleeding", "major-bleeding", "field-obscured", "bile", "stones", "duct-injury-on-imaging"],
    dir: [...DIRECTION_NAMES, "none"],
    force: ["gentle", "firm", "excessive"],
    dissection: ["untouched", "begun", "partly", "mostly", "cleared"],
    exposure: ["none", "poor", "partial", "good"],
    specimen: ["in-situ", "detached", "bagged", "extracted"],
    instrument: InstrumentIdSchema.options,
    image: ["ioc", "lap-us"],
    warn: ["out-of-reach", "sword-fighting", "too-wide", "hands-cross", "port-too-close", "camera-in-line"],
    injury: InjuryKindSchema.options,
    bailout: BailoutSchema.options,
    unsafe: UnsafeCodeSchema.options,
    role: ["camera", "working", "assist"],
    hand: ["left", "right"],
    side: ["left", "right"],
  };

  it("exist in both languages for every value", () => {
    const missing: string[] = [];
    for (const [group, values] of Object.entries(groups))
      for (const v of values) {
        const key = `surgery.${group}.${v}` as keyof typeof SURGERY_ZH;
        if (!SURGERY_ZH[key] || !SURGERY_EN[key]) missing.push(key);
      }
    expect(missing).toEqual([]);
  });

  it("follow the UI language", () => {
    setLocale("en");
    expect(label("dir", "patient-left")).toBe("patient's left");
    setLocale("zh-CN");
    expect(label("dir", "patient-left")).toBe("患者左侧");
    expect(label("signal", "not-a-signal")).toBe("not-a-signal");
  });
});

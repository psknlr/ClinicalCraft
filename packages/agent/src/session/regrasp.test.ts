/**
 * The demonstration re-grasps a lost traction (the engineering recommendations: the demo agent pauses and re-grasps
 * after lost traction). The walkthrough's next instrument step finds that a traction the reference run set up — and
 * never let go — is gone (a colleague holding it left the table): it says so, sets the traction again, and only then
 * goes on; once per step, never when the reference itself released it.
 */
import { describe, expect, it } from "vitest";
import { createSession, parseCase, reduce, type CaseDefinition, type ClinicalAction, type ProcedureOp, type SessionState } from "@clinicalcraft/core";
import { LAP_CHOLE_SIT } from "../../../core/src/engine/procedure/__fixtures__/lap-chole-sit.js";
import { clinicianOfflineSteps } from "../agents/offline.js";
import { lostTraction, offlineClinicianTurn, type AutopilotHost } from "./autopilot.js";

const LATERAL: ProcedureOp = { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" };
const DISSECT: ProcedureOp = { op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false };
const ACCESS: ProcedureOp[] = [
  { op: "plan-ports", plan: "three-port-left" },
  { op: "insufflate", pressure: 12 },
  { op: "insert", port: "A", instrument: "laparoscope" },
  { op: "insert", port: "B", instrument: "grasper" },
  { op: "insert", port: "C", instrument: "maryland" },
];

function theatreCase(): CaseDefinition {
  const raw = structuredClone(LAP_CHOLE_SIT) as unknown as Record<string, any>;
  raw.solution = [{ type: "start" }, { type: "set-phase", phase: "theatre" }, ...[...ACCESS, LATERAL, DISSECT, DISSECT, DISSECT].map((op) => ({ type: "operate", op }))];
  const parsed = parseCase(raw);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
  return parsed.value;
}

/** A host over the pure engine: each tool is its clinical action; after the first dissection the traction is lost. */
function host(c: CaseDefinition) {
  let s: SessionState = createSession(c);
  const said: string[] = [];
  const ops: string[] = [];
  let dissections = 0;
  const apply = (a: ClinicalAction) => {
    const r = reduce(c, s, a);
    if (!r.rejected) s = r.state;
    return r;
  };
  const h = {
    caseDef: c,
    locale: "en",
    state: () => s,
    newId: () => "id",
    now: () => 0,
    emit: () => undefined,
    ensureStarted: () => void (s.started || apply({ type: "start" })),
    clinicianOnline: () => false,
    clinicianMaxSteps: () => 50,
    runModelTurn: async () => ({ status: "end_turn", text: "", grounded: [], toolCalls: 0 }),
    finishTurn: () => undefined,
    narrate: (_turn: string, text: string) => void said.push(text),
    dispatch: (a: ClinicalAction) => void apply(a),
    executeTool: async (_turn: string, name: string, args: Record<string, unknown>) => {
      const action: ClinicalAction = name === "set_phase" ? { type: "set-phase", phase: String(args.phase) } : { type: "operate", op: args as ProcedureOp };
      const r = apply(action);
      if (action.type === "operate") {
        ops.push(action.op.op);
        // the colleague holding the traction leaves the table after the first dissection
        if (action.op.op === "dissect" && !r.rejected && ++dissections === 1) {
          // the assistant had taken the grasper with its traction; called away, they let go and hand the port back
          const colleague = (op: ProcedureOp) => expect(apply({ type: "operate", op, actor: "or-7-assistant" } as ClinicalAction).rejected).toBeUndefined();
          colleague({ op: "hand-over", port: "B", to: "or-7-assistant" } as ProcedureOp);
          colleague({ op: "release", structure: "gallbladder-infundibulum" } as ProcedureOp);
          colleague({ op: "hand-over", port: "B" } as ProcedureOp);
        }
      }
      return { callId: "c", tool: name, status: "ok", output: { ok: !r.rejected, output: r.rejected?.message ?? "ok" }, result: { type: "tool_result", callId: "c", content: "ok" }, grounded: [] };
    },
    cursor: { value: 0, missed: [] as never[], extraOps: 0 },
  };
  return { h: h as unknown as AutopilotHost, said, ops, state: () => s };
}

describe("the demonstration re-grasps a lost traction", () => {
  it("before the next instrument step: says so, re-grasps once, then dissects on — every step accepted", async () => {
    const c = theatreCase();
    const { h, said, ops, state } = host(c);
    await offlineClinicianTurn(h, "t", 50);
    expect(ops).toEqual(["plan-ports", "insufflate", "insert", "insert", "insert", "retract", "dissect", "retract", "dissect", "dissect"]);
    expect(said).toContain("The traction on gallbladder-infundibulum has gone: re-grasping before the next step.");
    expect(h.cursor.missed).toEqual([]);
    expect(state().procedure!.retractions["gallbladder-infundibulum"]).toBeDefined();
    // the colleague's release and the re-grasp are counted apart: the walkthrough's place is the reference's
    expect(state().procedure!.counters).toMatchObject({ steps: 13, colleague: 3 });
    expect(h.cursor.extraOps).toBe(1);
  });

  it("nothing to re-grasp while the traction holds, or when the reference itself let go", () => {
    const c = theatreCase();
    const steps = clinicianOfflineSteps(c, "en");
    let s = reduce(c, createSession(c), { type: "start" }).state;
    s = reduce(c, s, { type: "set-phase", phase: "theatre" }).state;
    for (const op of [...ACCESS, LATERAL]) s = reduce(c, s, { type: "operate", op }).state;
    const firstDissect = steps.findIndex((x) => x.action.type === "operate" && x.action.op.op === "dissect");
    expect(lostTraction(s, steps, firstDissect)).toBeNull();
    const released = reduce(c, s, { type: "operate", op: { op: "release", structure: "gallbladder-infundibulum" } }).state;
    expect(lostTraction(released, steps, firstDissect)?.action.op).toEqual(LATERAL);
    // a reference that releases the structure itself expects no traction afterwards
    const own = [...steps.slice(0, firstDissect), { ...steps[firstDissect]!, action: { type: "operate", op: { op: "release", structure: "gallbladder-infundibulum" } } as ClinicalAction }, ...steps.slice(firstDissect)];
    expect(lostTraction(released, own, firstDissect + 1)).toBeNull();
  });
});

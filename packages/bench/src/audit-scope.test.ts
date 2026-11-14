/**
 * The authorisation audit checks the acting body's role (review S3 = R2 C2 = R3 G2): an accepted act the trace
 * attributes to a staff member outside their scope of practice is unauthorised, whatever the approval gate said;
 * the same act by the learner's avatar, or an act within the staff member's scope, is not. The operative field goes by
 * control, as the session scopes a body (`scopeActorOf`): a team scrub nurse's pass is hers.
 */
import { describe, expect, it } from "vitest";
import { createSession, mergeSettings, type ClinicalSession } from "@clinicalcraft/agent";
import { catalogsFor, chooseFacility, loadContent } from "@clinicalcraft/agent/node";
import { PRIMARY_ACTOR, type EpisodeTrace, type TraceSpan } from "@clinicalcraft/world";
import { theatreCase, theatreCatalog, theatreFacility, WHOLE_OPERATION } from "../../world/src/__fixtures__/theatre.js";
import { catalogs as worldCatalogs } from "../../world/src/__fixtures__/world.js";
import { Auditor } from "./audit.js";

const content = await loadContent({ dirs: [] });

async function septicSession(): Promise<ClinicalSession> {
  const caseDef = content.cases.get("septic-shock-cap")!.def;
  const facility = chooseFacility(content, caseDef, undefined, null)!;
  const settings = mergeSettings([{ source: "flag", settings: { provider: "offline", locale: "en", embodiment: "embodied", approvalMode: "bypass", transcripts: { enabled: false } } }]);
  return createSession({ caseDef, facility, catalogs: catalogsFor(content, facility), settings });
}

/** The trace with one more `clinical_action` span attributing an event to a body. */
function attributed(trace: EpisodeTrace, ev: string, actorId: string): EpisodeTrace {
  const span = { id: `x-${ev}`, parentId: null, kind: "clinical_action", name: "intervene", actorId, startedAt: 0, endedAt: 0, clockStart: 0, clockEnd: 0, ok: true, worldVersionStart: 0, worldVersionEnd: 0, refs: { clinicalEventIds: [ev] }, data: {} } as unknown as TraceSpan;
  return { ...trace, spans: [...trace.spans, span] };
}

describe("authorisation audit: the acting body's scope of practice", () => {
  it("intubation attributed to a nurse is unauthorised; to the learner's avatar it is not; a nurse's drug is not", async () => {
    const s = await septicSession();
    const auditor = new Auditor(s);
    auditor.attach();
    const ev: Record<string, string> = {};
    s.subscribe((e) => {
      if (e.msg.type === "clinical_event" && e.msg.event.type === "intervention.applied") ev[e.msg.event.interventionId] = `ev-${e.seq}`;
    });
    s.dispatch({ type: "start", by: "system" });
    s.dispatch({ type: "intervene", interventionId: "intubation" });
    const drug = s.caseDef.interventions.find((i) => i.kind === "medication")!.id;
    s.dispatch({ type: "intervene", interventionId: drug });
    expect(Object.keys(ev).sort()).toEqual([drug, "intubation"].sort());

    const byNurse = auditor.finish(attributed(attributed(s.trace(), ev.intubation!, "staff:ed-nurse"), ev[drug]!, "staff:ed-nurse"));
    expect(byNurse.authorisation.unauthorised).toEqual([expect.objectContaining({ tool: "intervene", itemId: "intubation", actor: "staff:ed-nurse", scope: expect.stringMatching(/nurse/) })]);

    const byClinician = auditor.finish(attributed(s.trace(), ev.intubation!, PRIMARY_ACTOR));
    expect(byClinician.authorisation.unauthorised).toEqual([]);
    auditor.detach();
    await s.close();
  });
});

describe("authorisation audit: the operative field by control (EMBODIED §8.3)", () => {
  it("a team scrub nurse's pass is hers (her instrument table), though her role holds no operate; the same pass by the anaesthetist is not", async () => {
    const settings = mergeSettings([{ source: "flag", settings: { provider: "offline", locale: "en", embodiment: "embodied", approvalMode: "bypass", transcripts: { enabled: false } } }]);
    const s = await createSession({ caseDef: theatreCase(), facility: theatreFacility(), catalogs: [...worldCatalogs(), theatreCatalog()], settings });
    const auditor = new Auditor(s);
    auditor.attach();
    const steps: Record<string, string> = {};
    s.subscribe((e) => {
      if (e.msg.type === "clinical_event" && e.msg.event.type === "procedure.step") steps[e.msg.event.op] = `ev-${e.seq}`;
    });
    s.dispatch({ type: "start", by: "system" });
    s.dispatch({ type: "set-phase", phase: "theatre", by: "system" });
    s.dispatch({ type: "operate", op: { op: "plan-ports", plan: "three-port-left" } });
    expect(s.dispatch({ type: "operate", op: { op: "pass", instrument: "hook" }, actor: "nurse-2", by: "agent" }).rejected).toBeUndefined();
    expect(steps.pass).toBeDefined();
    const byScrub = auditor.finish(attributed(s.trace(), steps.pass!, "staff:nurse-2"));
    expect(byScrub.authorisation.unauthorised).toEqual([]);
    expect(byScrub.authorisation.audited).toBeGreaterThanOrEqual(2);
    // the anaesthetist holds no control of the field: the same step in her hands is outside her scope
    const byAnaesthetist = auditor.finish(attributed(s.trace(), steps.pass!, "staff:anaes-1"));
    expect(byAnaesthetist.authorisation.unauthorised).toEqual([expect.objectContaining({ tool: "operate", itemId: "pass", actor: "staff:anaes-1", scope: "attending: control" })]);
    // the session's own records of the field (a colleague's hands letting go away from the table) are no gated act
    s.dispatch({ type: "operate", op: { op: "insufflate", pressure: 12 }, by: "system" });
    expect(auditor.finish(s.trace()).authorisation.audited).toBe(byScrub.authorisation.audited);
    auditor.detach();
    await s.close();
  });
});

describe("authorisation audit: the care team's own steps (docs/TEAM.md §4.5)", () => {
  /** The theatre case in a session of this approval mode; `seat`: a place taken at the start. */
  async function theatre(approvalMode: string, seat?: "first-assistant"): Promise<ClinicalSession> {
    const settings = mergeSettings([{ source: "flag", settings: { provider: "offline", locale: "en", embodiment: "embodied", approvalMode, transcripts: { enabled: false } } }]);
    const s = await createSession({ caseDef: theatreCase(), facility: theatreFacility(), catalogs: [...worldCatalogs(), theatreCatalog()], settings });
    s.dispatch({ type: "start", by: "system", ...(seat ? { seat } : {}) });
    if (!seat) s.dispatch({ type: "set-phase", phase: "theatre", by: "system" });
    return s;
  }

  /** A body right beside the patient (a sensor pose). */
  function atTable(s: ClinicalSession, actorId: string, dz: number): void {
    const p = s.world()!.patientPlace()!;
    s.submit({ type: "world_pose", actorId, pose: { x: p.x, y: 0, z: p.z + dz, yaw: 0, pitch: 0, level: p.level } });
  }

  it("an assistant's traction, asked of them through the team, is authorised in strict mode: never asked about, as the gate let it", async () => {
    const s = await theatre("strict");
    const auditor = new Auditor(s);
    auditor.attach();
    for (const op of WHOLE_OPERATION.slice(0, 5)) s.dispatch({ type: "operate", op, by: "system" });
    atTable(s, PRIMARY_ACTOR, 0.6);
    const asked = await s.run({ type: "team", action: "ask", to: "doc-1", field: { op: "traction", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"] } });
    const readback = asked.flatMap((e) => (e.msg.type === "team_event" && e.msg.event.kind === "message" && e.msg.event.message.kind === "readback" ? [e.msg.event.message] : []))[0]!;
    await s.run({ type: "team", action: "reply", message: readback.id, kind: "confirm" });
    const ran = await s.run({ type: "team", action: "run" });
    expect(ran.some((e) => e.msg.type === "approval_request")).toBe(false);
    expect(s.state.procedure!.ports.find((p) => p.site === "B")!.holder).toBe("doc-1");
    const result = auditor.finish(s.trace());
    expect(result.authorisation.unauthorised).toEqual([]);
    expect(result.authorisation.audited).toBeGreaterThanOrEqual(2);
    auditor.detach();
    await s.close();
  });

  it("the stand-in's clip, its call-out asked and approved, is authorised: the audit reads the team's rung as the gate did", async () => {
    const s = await theatre("default", "first-assistant");
    const auditor = new Auditor(s);
    auditor.attach();
    const clip = WHOLE_OPERATION.findIndex((op) => op.op === "clip");
    for (const op of WHOLE_OPERATION.slice(0, clip)) s.dispatch({ type: "operate", op, by: "system" });
    atTable(s, "staff:doc-0", 0.3);
    s.subscribe((e) => {
      if (e.msg.type === "approval_request") s.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "approved" });
    });
    const team = (s as unknown as { k: { team: { operateAs(body: string, op: unknown, ref: string): Promise<{ status: string }> } } }).k.team;
    expect((await team.operateAs("staff:doc-0", WHOLE_OPERATION[clip], "team.test-1.1")).status).toBe("completed");
    const result = auditor.finish(s.trace());
    expect(result.authorisation.unauthorised).toEqual([]);
    expect(result.authorisation.audited).toBe(1);
    auditor.detach();
    await s.close();
  });
});

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
import { theatreCase, theatreCatalog, theatreFacility } from "../../world/src/__fixtures__/theatre.js";
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

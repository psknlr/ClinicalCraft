/**
 * The authorisation audit checks the acting body's role (review S3 = R2 C2 = R3 G2): an accepted act the trace
 * attributes to a staff member outside their scope of practice is unauthorised, whatever the approval gate said;
 * the same act by the learner's avatar, or an act within the staff member's scope, is not.
 */
import { describe, expect, it } from "vitest";
import { createSession, mergeSettings, type ClinicalSession } from "@clinicalcraft/agent";
import { catalogsFor, chooseFacility, loadContent } from "@clinicalcraft/agent/node";
import { PRIMARY_ACTOR, type EpisodeTrace, type TraceSpan } from "@clinicalcraft/world";
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

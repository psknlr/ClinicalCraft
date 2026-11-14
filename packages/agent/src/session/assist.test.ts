/**
 * Hands go where the body goes (docs/PROCEDURE.md §3, docs/EMBODIED.md §8): a port held by someone who is no longer at
 * the operating table is let go after the next act — the holder's release and hand-back recorded as their own steps.
 * The holder's body is their member's (core `memberBody`): a colleague's own, the learner's while the learner holds a
 * place in the team. A colleague says so in their own voice; the learner is told. Traction let go closes the window
 * (`exposure-lost` on a region being dissected); the camera let go is the surgeon's again.
 */
import { describe, expect, it } from "vitest";
import type { DomainEvent } from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { msgsOf, type TestSession } from "../__fixtures__/harness.js";
import type { AgentEvent } from "../protocol.js";
import { ACCESS, LATERAL, operatorSteps, sendToScrubRoom, STAFF, standAtTable, system, theatreSession } from "./__fixtures__/theatre.js";

const FIRST = { type: "start", seat: "first-assistant" } as const;
const DISSECT = { op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false } as const;

/** One round of the staff's own clock (the hands-go-with-the-body check runs in it). */
const staffRound = (t: TestSession) => t.session.run({ type: "staff_step" });
const learnerStep = (t: TestSession, op: Record<string, unknown>) => t.session.run({ type: "clinical_action", action: { type: "operate", op } as never });
const steps = (events: readonly AgentEvent[]) =>
  events.flatMap((e) => (e.msg.type === "clinical_event" && e.msg.event.type === "procedure.step" ? [e.msg.event as Extract<DomainEvent, { type: "procedure.step" }>] : []));
const port = (t: TestSession, site: string) => t.session.state.procedure!.ports.find((p) => p.site === site)!;

describe("a port held away from the table is let go", () => {
  it("a colleague: Dr Abe, holding port B, is sent to the scrub room — he lets go and says so in his own voice", async () => {
    const t = await theatreSession();
    operatorSteps(t, ACCESS);
    standAtTable(t, STAFF.first);
    system(t, { type: "operate", op: { op: "hand-over", port: "B", to: "doc-1" }, actor: "doc-1", by: "system" });
    system(t, { type: "operate", op: LATERAL, actor: "doc-1", by: "system" });
    // at the table: kept
    await staffRound(t);
    expect(port(t, "B").holder).toBe("doc-1");
    sendToScrubRoom(t, STAFF.first);
    const r = await staffRound(t);
    expect(port(t, "B").holder).toBeUndefined();
    expect(t.session.state.procedure!.retractions["gallbladder-infundibulum"]).toBeUndefined();
    expect(steps(r).map((s) => [s.op, s.actor])).toEqual([
      ["release", "doc-1"],
      ["hand-over", "doc-1"],
    ]);
    expect(msgsOf(r, "agent_message").map((m) => `${m.speaker}: ${m.text}`)).toEqual(["Dr Abe: Dr Abe let go of the grasper in port B: they are no longer at the table. The traction has gone: the window has closed."]);
    await t.session.close();
  });

  it("the learner holding port B in the first assistant's place keeps it at the table and loses it away from it: told, not voiced — the window closes (exposure-lost)", async () => {
    const t = await theatreSession({ start: FIRST });
    operatorSteps(t, ACCESS);
    expect(msgsOf(await learnerStep(t, { op: "hand-over", port: "B", to: "doc-1" }), "error")).toEqual([]);
    expect(msgsOf(await learnerStep(t, LATERAL), "error")).toEqual([]);
    // the operator dissects in the window the learner holds open
    operatorSteps(t, [DISSECT]);
    await staffRound(t);
    expect(port(t, "B").holder).toBe("doc-1");
    expect(t.session.state.procedure!.retractions["gallbladder-infundibulum"]).toMatchObject({ port: "B" });
    // the learner steps away from the table
    sendToScrubRoom(t, PRIMARY_ACTOR);
    const r = await staffRound(t);
    expect(port(t, "B").holder).toBeUndefined();
    const fell = steps(r);
    expect(fell.map((s) => [s.op, s.actor])).toEqual([
      ["release", "doc-1"],
      ["hand-over", "doc-1"],
    ]);
    expect(fell[0]!.signals).toContain("exposure-lost");
    expect(msgsOf(r, "notification").map((n) => n.body)).toContainEqual("You let go of the grasper in port B: you are no longer at the table. The traction has gone: the window has closed.");
    // the learner's own hands are told, never voiced as a colleague's line
    expect(msgsOf(r, "agent_message")).toEqual([]);
    await t.session.close();
  });

  it("the camera: held away from the table it is let go, said as the camera — in either language", async () => {
    for (const [locale, said] of [
      ["en", "You let go of the camera in port A: you are no longer at the table. The camera has gone: the picture is the surgeon's to keep."],
      ["zh-CN", "你松开了 A 孔的镜头：你已离开手术台。 镜头已无人扶持：画面交回术者自己掌握。"],
    ] as const) {
      const t = await theatreSession({ start: FIRST, settingsPatch: { locale } });
      operatorSteps(t, ACCESS);
      expect(msgsOf(await learnerStep(t, { op: "hand-over", port: "A", to: "doc-1" }), "error"), locale).toEqual([]);
      expect(port(t, "A").holder, locale).toBe("doc-1");
      sendToScrubRoom(t, PRIMARY_ACTOR);
      const r = await staffRound(t);
      expect(port(t, "A"), locale).toMatchObject({ instrument: "laparoscope" });
      expect(port(t, "A").holder, locale).toBeUndefined();
      expect(msgsOf(r, "notification").map((n) => n.body), locale).toContainEqual(said);
      await t.session.close();
    }
  });
});

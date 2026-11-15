/**
 * The care team from slash commands (docs/TEAM.md §5, docs/PROTOCOL.md §9), on the agent's theatre fixture: `/seat`
 * says the learner's place, its controls and who works where — operating, the places the case offers —; `/team` shows
 * the team now and what the stand-in waits on the learner for, with how to answer; `/team run` stops there and does not
 * start while the learner's answer is owed; `/team reply` with no message answers that line; `/operate` is a step as the
 * learner's place (A6: dissection refused for the first assistant before any approval), `/field` the field as the place
 * sees it; an observer refusal names `/team play`; the session's refusals and warnings are shown as it says them; a
 * position word naming the learner's own place names nobody — in an `@` mention and in `/delegate` —; `/delegate`'s
 * usage names its target, and a position in words before the task is whom it asks.
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { msgsOf, type TestSession } from "./__fixtures__/harness.js";
import { teamAskArgs } from "./commands-world.js";
import { operateArgs } from "./commands.js";
import { ACCESS, operatorSteps, sendToScrubRoom, STAFF, theatreSession } from "./session/__fixtures__/theatre.js";

/** A slash command's own output (text, data) and the session's errors and warnings around it. */
async function cmd(t: TestSession, name: string, args = ""): Promise<{ text: string; data: any; errors: string[]; warnings: string[] }> {
  const events = await t.session.run({ type: "slash_command", name, args });
  const out = msgsOf(events, "command_output").find((m) => m.name === name);
  return { text: out?.text ?? "", data: out?.data ?? null, errors: msgsOf(events, "error").map((m) => m.message), warnings: msgsOf(events, "warning").map((m) => m.message) };
}

/** A theatre session started in a place by the learner's own start. */
async function inPlace(seat: "first-assistant" | "second-assistant" | "scrub-nurse", locale = "en"): Promise<TestSession> {
  const t = await theatreSession({ settingsPatch: { approvalMode: "bypass", locale } });
  expect(msgsOf(await t.session.run({ type: "clinical_action", action: { type: "start", seat } }), "error")).toEqual([]);
  return t;
}

describe("/seat", () => {
  it("in a place: the place and its id, fixed; its controls; who operates and who stands by; the team with their positions — in both languages", async () => {
    const t = await inPlace("first-assistant");
    const seat = await cmd(t, "seat");
    expect(seat.text.split("\n")).toEqual([
      "Your place in the team: first assistant (id doc-1) — fixed for this encounter.",
      "Your controls: Camera, Traction, Suction.",
      "Dr Ito, the stand-in surgeon, operates; Dr Abe stands by — you hold their place.",
      "The team:",
      "  Operating surgeon: Dr Ito",
      "  Circulating nurse: Lin Xiao",
      "  Scrub nurse: Chen Yu",
      "  First assistant: you (Dr Abe stands by)",
      "  Anaesthetist: Dr Wang",
    ]);
    expect(seat.data).toEqual({ seat: "first-assistant", lineup: null });
    await t.session.close();
    const zh = await inPlace("scrub-nurse", "zh-CN");
    expect((await cmd(zh, "seat")).text).toMatch(/^你在团队中的岗位：洗手护士（id nurse-2）——本次接诊中不变。\n你的分工权限：器械台、清点。\n由主刀同事伊藤医生主刀；陈雨在旁待命——由你担任其岗位。/u);
    await zh.session.close();
  });

  it("operating: the operating surgeon's place, the places the case offers at the start (each line-up's), the team", async () => {
    const t = await theatreSession({ settingsPatch: { approvalMode: "bypass" } });
    const seat = await cmd(t, "seat");
    expect(seat.text.split("\n").slice(0, 3)).toEqual([
      "Your place: operating surgeon — you may also do the team's parts (fixed for this encounter).",
      "Places this case offers (chosen at the start: --seat <place>, --lineup <id>): first-assistant, scrub-nurse; first-assistant, second-assistant, scrub-nurse (line-up three-surgeons).",
      "The team:",
    ]);
    expect(seat.text).toMatch(/ {2}Operating surgeon: you\n/u);
    expect(seat.text).toMatch(/ {2}First assistant: Dr Abe\n/u);
    await t.session.close();
  });
});

describe("/team in a place", () => {
  it("status; a run to where the stand-in waits on the learner — and no further while their answer is owed; a reply with no message answers that line; the learner's step with /operate", async () => {
    const t = await inPlace("first-assistant");
    // (the start is the learner's act: the team took its turn after it)
    expect((await cmd(t, "team")).text).toMatch(/^Team: round \d+ · pace auto · you play your place \(first assistant\)\nNothing waits for you\.$/u);
    const run = await cmd(t, "team", "run");
    expect(run.errors).toEqual([]);
    expect(run.text).toMatch(/^Team: round \d+ · pace auto · you play your place \(first assistant\)\nThe surgeon waits for you — Dr Ito: “The first assistant \(you\), take the camera, please\.” \[(msg-\d+)\]\n {2}answer: \/team reply \1 readback \(or \/team reply \1 decline\)$/u);
    expect(run.data.team.awaited).toMatchObject({ kind: "line", answered: false, line: { from: "Dr Ito", kind: "request", replies: ["readback", "decline"] } });
    const asked = run.data.team.awaited.line.id as string;
    // owed: a run does not start
    const round = t.session.team()!.state.round;
    await cmd(t, "team", "run");
    // (the learner's own command lets the team take its turn after it — autonomy auto — but the run itself added nothing)
    expect(t.session.team()!.state.round - round).toBeLessThanOrEqual(1);
    // the reply without a message answers the line the surgeon waits for
    const readback = await cmd(t, "team", "reply readback");
    expect(readback.errors).toEqual([]);
    expect(t.session.team()!.state.messages.find((m) => m.from === PRIMARY_ACTOR)).toMatchObject({ kind: "readback", replyTo: asked, to: STAFF.standIn });
    // the stand-in confirms (its turn after the learner's command): do it, then report
    const status = await cmd(t, "team");
    expect(status.text).toMatch(/The surgeon waits for you — Dr Ito: “Yes — go ahead\.” \[(msg-\d+)\]\n {2}do it, then report: \/team reply \1 report/u);
    // the learner's own step, as their place
    const step = await cmd(t, "operate", "hand-over port=A to=doc-1");
    expect(step.text).toBe("Done: hand-over.");
    expect(t.session.state.procedure!.ports.find((p) => p.site === "A")).toMatchObject({ holder: "doc-1" });
    // a step the place's controls do not cover: refused before any approval, as the first assistant (A6)
    const dissect = await cmd(t, "operate", "dissect port=C region=hepatocystic-triangle");
    expect(dissect.text).toBe("You are the first assistant: dissection is the operating surgeon's.");
    expect(dissect.data).toMatchObject({ ok: false, data: { code: "NOT_AUTHORIZED" } });
    // the field as the place sees it
    expect((await cmd(t, "field")).text).toMatch(/Your place: first assistant \(id doc-1\); your controls: Camera, Traction, Suction\./u);
    await t.session.close();
  });

  it("/approval that would stop the stand-in: refused as the session words it, and the mode in force is said", async () => {
    const t = await inPlace("first-assistant");
    const plan = await cmd(t, "approval", "plan");
    expect(plan.errors).toEqual([expect.stringMatching(/^While you hold the first assistant's place the stand-in surgeon operates, and this change would stop them \(.*\): the approval mode and the practice scope stay as they were\.$/su)]);
    expect(plan.text).toBe("Approval mode: bypass");
    expect((await cmd(t, "approval", "strict")).text).toBe("Approval mode: strict");
    await t.session.close();
  });

  it("observing: a reply, a request or the count is refused naming /team play — in both languages; play gives the part back", async () => {
    for (const [locale, refusal] of [
      ["en", "You are observing: the team plays your place. Type /team play to answer, ask or count yourself."],
      ["zh-CN", "你正在观察：你的岗位由团队代为完成。输入 /team play 后才能自己回答、请求或清点。"],
    ] as const) {
      const t = await inPlace("first-assistant", locale);
      await cmd(t, "team", "run");
      const observe = await cmd(t, "team", "observe");
      expect(observe.data.team.surgeon, locale).toBe("simulated");
      const msg = t.session.team()!.state.messages.find((m) => m.to === PRIMARY_ACTOR)!;
      expect((await cmd(t, "team", `reply ${msg.id} confirm`)).errors, locale).toEqual([refusal]);
      expect((await cmd(t, "team", "ask doc-2 camera")).errors, locale).toEqual([refusal]);
      expect((await cmd(t, "team", "play")).data.team.surgeon).toBe("learner");
      await t.session.close();
    }
  });

  it("a position word naming the learner's own place names nobody — an @ mention and /delegate; the colleague standing by is still named by name", async () => {
    const t = await inPlace("first-assistant");
    const mention = await t.session.run({ type: "user_message", text: "@first assistant can you hold this?" });
    expect(msgsOf(mention, "error")).toEqual([expect.objectContaining({ code: "own_place", message: "First assistant is your own place in the team: name a colleague." })]);
    const delegate = await cmd(t, "delegate", "first assistant hold_camera A");
    expect(delegate.text).toBe("First assistant is your own place in the team: name a colleague.");
    expect(delegate.data).toEqual({ error: "own-place", place: "first-assistant" });
    // by name: Dr Abe, standing by, answers
    const byName = await t.session.run({ type: "user_message", text: "@Dr Abe are you all right?" });
    expect(msgsOf(byName, "error")).toEqual([]);
    expect(msgsOf(byName, "agent_message").some((m) => m.staffId === "doc-1")).toBe(true);
    await t.session.close();
    const zh = await inPlace("first-assistant", "zh-CN");
    expect((await cmd(zh, "delegate", "一助 hold_camera A")).text).toBe("第一助手是你自己在团队中的岗位：请指明一位同事。");
    await zh.session.close();
  });
});

describe("/team operating, and the session's words", () => {
  it("asks a colleague for traction in words (the read-back follows); a colleague away from the theatre, the count kept by nobody: refused or warned as the session says it", async () => {
    const t = await theatreSession({ settingsPatch: { approvalMode: "bypass" } });
    operatorSteps(t, ACCESS);
    const ask = await cmd(t, "team", "ask first assistant traction B gallbladder-infundibulum patient-left,caudal firm");
    expect(ask.errors).toEqual([]);
    const request = t.session.team()!.state.messages.find((m) => m.from === PRIMARY_ACTOR && m.kind === "request")!;
    expect(request).toMatchObject({ to: STAFF.first, about: { field: { op: "traction", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" } } });
    // the count: this team keeps none
    expect((await cmd(t, "team", "count")).errors).toEqual(["This team keeps no count."]);
    // a colleague who is not in the theatre now, and a name nobody in the team answers to: refused, as the session says it
    sendToScrubRoom(t, STAFF.first);
    expect((await cmd(t, "team", "ask doc-1 camera")).errors).toEqual(["Dr Abe is not in the theatre now: ask a colleague at the table."]);
    expect((await cmd(t, "team", "ask doc-2 camera")).errors).toEqual(["There is nobody called doc-2 in the team."]);
    // usage of each action
    expect((await cmd(t, "team", "reply")).text).toBe("Usage: /team reply [message] <readback|confirm|decline|report> [your words]");
    expect((await cmd(t, "team", "ask doc-1")).text).toMatch(/^Usage: \/team ask <who> /u);
    expect((await cmd(t, "team", "need")).text).toBe("Usage: /team need <item> [for]");
    expect((await cmd(t, "team", "run soon")).text).toBe("Usage: /team run [rounds]");
    expect((await cmd(t, "team", "dance")).text).toMatch(/^Unknown \/team action “dance”/u);
    await t.session.close();
  });

  it("/delegate: the usage names the target; a position in words before the task is whom it asks", async () => {
    const t = await theatreSession({ settingsPatch: { approvalMode: "bypass" } });
    const usage = await cmd(t, "delegate", "nurse");
    expect(usage.text).toBe("Usage: /delegate <who> <task> [port|region|instrument|item|destination]");
    operatorSteps(t, ACCESS);
    const delegated = await cmd(t, "delegate", "first assistant hold_traction B");
    expect(delegated.text).not.toMatch(/^Usage/u);
    expect(delegated.text).toMatch(/Dr Abe/u);
    await t.session.close();
  });
});

describe("parsing", () => {
  it("/team ask's words → whom and the request; /operate's key=value → the step (a direction may list several)", () => {
    expect(teamAskArgs(["camera", "holder", "aim", "cystic-plate", "close"])).toEqual({ to: "camera holder", field: { op: "aim", region: "cystic-plate", zoom: "close" } });
    expect(teamAskArgs(["Chen", "Yu", "pass", "maryland"])).toEqual({ to: "Chen Yu", field: { op: "pass", instrument: "maryland" } });
    expect(teamAskArgs(["doc-2", "closer"])).toEqual({ to: "doc-2", field: { op: "zoom", zoom: "close" } });
    expect(teamAskArgs(["doc-1", "release"])).toEqual({ to: "doc-1", field: { op: "release" } });
    expect(teamAskArgs(["camera"])).toBeNull();
    expect(operateArgs("retract", ["port=B", "structure=gallbladder-fundus", "direction=cephalad,patient-left", "force=firm"])).toEqual({ op: "retract", port: "B", structure: "gallbladder-fundus", direction: ["cephalad", "patient-left"], force: "firm" });
    expect(operateArgs("safety-pause", ["view=cvs", 'claims={"triangle":true,"two":2}'])).toEqual({ op: "safety-pause", view: "cvs", claims: { triangle: true, two: 2 } });
  });
});

/**
 * The built-in stroke case's emergency care team as a text front-end shows it (docs/TEAM.md §4.7, §5; docs/GLOSSARY.md
 * "the doctor"): the learner is the doctor in charge — `/seat` and `/team` name them by the team's name for them, never
 * as operating, in both languages —, and the information the ED nurse tells them waits for their read-back as the
 * browser's team window offers it: listed with how to answer (`repliesTo`, `defaultReplyTarget`), a `/team run` that
 * does not start while it is owed (`runHeld`, `readBackOwed`), `/team reply readback` naming no message answers it, and
 * only the nurse's confirmation of that read-back records it in the case. An escalation said to the learner is answered
 * ("answer: …"), never "do it, then report".
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { command, makeEmbodiedSession } from "./__fixtures__/embodied.js";
import { STROKE, STROKE_INFORM, untilToldInfo } from "./__fixtures__/stroke-inform.js";
import { readBackOwed, repliesTo } from "./session/team/awaits.js";
import type { TeamCheckpoint, TeamMessage } from "./session/team/types.js";
import { defaultReplyTarget, teamLines } from "./team-text.js";
import { runHeld, TEAM_TOOL_WORDS } from "./team-tool.js";

const T = 120_000;

describe("the emergency team's doctor (no operation)", () => {
  it("/seat and /team name the learner by the team's name for them — never the operating surgeon, never 'you operate' — in both languages", { timeout: T }, async () => {
    const cases = [
      {
        locale: "en",
        seat: ["Your place: the doctor (fixed for this encounter).", "This case offers no place in the team: you are the doctor.", "The team:", "  The doctor: you", "  Ward nurse: Lin Xiao"],
        who: /^Team: round \d+ · pace (auto|step) · you answer as the doctor$/u,
      },
      {
        locale: "zh-CN",
        seat: ["你的岗位：医生（本次接诊中不变）。", "本病例不提供团队中的岗位：由你担任医生。", "团队：", "  医生：你", "  病房护士：林晓"],
        who: /^团队：第 \d+ 轮 · 节奏：(自动|单步) · 由你作为医生回答$/u,
      },
    ];
    for (const x of cases) {
      const t = await makeEmbodiedSession({ caseId: STROKE, settingsPatch: { locale: x.locale, approvalMode: "bypass" } });
      const seat = await command(t, "seat");
      expect(seat.text.split("\n"), x.locale).toEqual(x.seat);
      expect(seat.text, x.locale).not.toMatch(/operating surgeon|you operate|主刀/u);
      await t.session.run({ type: "clinical_action", action: { type: "start", team: STROKE_INFORM } });
      expect((await command(t, "team")).text.split("\n")[0], x.locale).toMatch(x.who);
      await t.session.close();
    }
  });
});

describe("information the ED nurse tells the doctor (docs/TEAM.md §4.7), over /team", () => {
  it("waits for their read-back: listed with how to answer, a run held while it is owed; answered with no message named, then confirmed and only then recorded", { timeout: T }, async () => {
    const t = await makeEmbodiedSession({ caseId: STROKE, settingsPatch: { locale: "en", approvalMode: "bypass" } });
    const told = await untilToldInfo(t.session, t.session.caseDef);
    expect(told).toMatchObject({ from: "staff:ed-nurse", to: PRIMARY_ACTOR, kind: "report", about: { info: "anticoagulants" } });
    const cp = t.session.team()!;
    // the browser's "Read back", for a text front-end: the one line that waits, a reply naming none answers it
    expect(repliesTo(cp.state, cp.surgeon, told)).toEqual(["readback"]);
    expect(defaultReplyTarget(cp)).toEqual({ id: told.id });
    expect(readBackOwed(cp.state, cp.surgeon)?.id).toBe(told.id);
    expect(runHeld({ action: "run" }, cp)).toBe(true);
    // observing, the simulated surgeon reads it back: nothing waits on the learner
    expect(repliesTo(cp.state, "simulated", told)).toEqual([]);
    expect(readBackOwed(cp.state, "simulated")).toBeNull();
    const status = await command(t, "team");
    expect(status.text.split("\n")).toEqual([
      expect.stringMatching(/^Team: round \d+ · pace step · you answer as the doctor$/u),
      "Said to you, not answered yet:",
      `  [${told.id}] Lin Xiao: ${told.text.en}`,
      `    answer: /team reply ${told.id} readback`,
    ]);
    expect(status.data.team).toMatchObject({ awaited: null, open: [{ id: told.id, from: "Lin Xiao", kind: "report", replies: ["readback"] }] });
    // owed: a run does not start — it shows what waits (a round would only let the nurse's wait run out)
    const round = cp.state.round;
    const run = await command(t, "team", "run");
    expect(t.session.team()!.state.round).toBe(round);
    expect(run.text).toContain(`answer: /team reply ${told.id} readback`);
    // the reply naming no message reads it back, as said
    const reply = await command(t, "team", "reply readback");
    expect(reply.text).toMatch(/Nothing waits for you\.$/u);
    expect(t.session.team()!.state.messages.find((m) => m.from === PRIMARY_ACTOR && m.replyTo === told.id)).toMatchObject({ kind: "readback", to: "staff:ed-nurse", about: { info: "anticoagulants" } });
    expect(readBackOwed(t.session.team()!.state, "learner")).toBeNull();
    expect(t.session.state.asked).not.toContain("anticoagulants");
    // the nurse confirms the read-back in the team's next round: only now is it recorded in the case
    await command(t, "team", "run");
    expect(t.session.team()!.state.tasks.find((x) => x.kind === "inform")).toMatchObject({ status: "done", verified: true });
    expect(t.session.state.asked).toContain("anticoagulants");
    await t.session.close();
  });

  it("in Chinese: the same line, answered the same way", { timeout: T }, async () => {
    const t = await makeEmbodiedSession({ caseId: STROKE, settingsPatch: { locale: "zh-CN", approvalMode: "bypass" } });
    const told = await untilToldInfo(t.session, t.session.caseDef);
    const status = await command(t, "team");
    expect(status.text.split("\n").slice(1)).toEqual(["对你说过、尚未回答的话：", `  [${told.id}] 林晓：${told.text["zh-CN"]}`, `    回答：/team reply ${told.id} readback`]);
    await t.session.close();
  });

  it("an escalation said to the learner is answered — never 'do it, then report' (that is the stand-in's confirmation of their read-back)", { timeout: T }, async () => {
    const t = await makeEmbodiedSession({ caseId: STROKE, settingsPatch: { locale: "en" } });
    const escalation: TeamMessage = {
      id: "msg-14",
      thread: "thread-3",
      from: "staff:ed-nurse",
      to: PRIMARY_ACTOR,
      kind: "escalate",
      text: { en: "His anticoagulant history hasn't reached you — Yang Jie isn't available.", "zh-CN": "他的抗凝用药情况还没有交到你这里——杨洁不在。" },
      about: { info: "anticoagulants" },
      room: "ed-resus",
      patient: null,
      at: 0,
      round: 4,
      evidence: [],
      delivered: true,
      read: false,
    };
    const cp = { format: "clinicalcraft-team@1", autonomy: "auto", surgeon: "learner", state: { version: 2, scenario: null, lifecycle: "active", round: 4, seq: 0, members: [], messages: [escalation], receipts: [], tasks: [], claims: {}, completed: [], posted: [], extra: [] } } as unknown as TeamCheckpoint;
    const { lines, report } = teamLines({ caseDef: t.session.caseDef, facility: t.session.facility, state: t.session.state, locale: "en" }, cp, TEAM_TOOL_WORDS);
    expect(report?.open).toEqual([expect.objectContaining({ id: "msg-14", kind: "escalate", replies: ["report"] })]);
    expect(lines).toContain('    answer: team {action: "reply", message: "msg-14", kind: "report"}');
    expect(lines.join("\n")).not.toMatch(/do it, then report/u);
    await t.session.close();
  });
});

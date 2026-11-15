import { it } from "vitest";
import { appendFileSync } from "node:fs";
const log = (s: string) => appendFileSync("/tmp/claude-0/-home-user/650af4ac-5c11-5dd6-baac-53dab986607e/scratchpad/wp7-explore.txt", s + "\n");
import { theatreSession } from "../session/__fixtures__/theatre.js";

const out = (events: any[]) => events.filter((e) => ["command_output", "error", "warning", "agent_message"].includes(e.msg.type)).map((e) => `${e.msg.type}: ${e.msg.type === "agent_message" ? `${e.msg.speaker}: ${e.msg.text}` : (e.msg.text ?? e.msg.message)}`).join("\n");

it("explore", async () => {
  const t = await theatreSession({ settingsPatch: { approvalMode: "bypass" } });
  const s = await t.session.run({ type: "clinical_action", action: { type: "start", seat: "first-assistant" } });
  log("START\n" + out(s));
  log("SEAT\n" + out(await t.session.run({ type: "slash_command", name: "seat", args: "" })));
  log("STATUS\n" + out(await t.session.run({ type: "slash_command", name: "team", args: "" })));
  log("RUN\n" + out(await t.session.run({ type: "slash_command", name: "team", args: "run" })));
  log("READBACK\n" + out(await t.session.run({ type: "slash_command", name: "team", args: "reply readback" })));
  log("STEP\n" + out(await t.session.run({ type: "slash_command", name: "team", args: "step" })));
  log("OPERATE\n" + out(await t.session.run({ type: "slash_command", name: "operate", args: "hand-over port=A to=doc-1" })));
  log("REPORT\n" + out(await t.session.run({ type: "slash_command", name: "team", args: "reply report Done." })));
  log("DISSECT\n" + out(await t.session.run({ type: "slash_command", name: "operate", args: "dissect port=C region=hepatocystic-triangle" })));
  log("DELEGATE\n" + out(await t.session.run({ type: "slash_command", name: "delegate", args: "first assistant hold_camera A" })));
  log("MENTION\n" + out(await t.session.run({ type: "user_message", text: "@first assistant hello" })));
  log("OBSERVE\n" + out(await t.session.run({ type: "slash_command", name: "team", args: "observe" })));
  log("REPLY-OBS\n" + out(await t.session.run({ type: "slash_command", name: "team", args: "reply msg-1 confirm" })));
  log("PLAY\n" + out(await t.session.run({ type: "slash_command", name: "team", args: "play" })));
  log("FIELD\n" + out(await t.session.run({ type: "slash_command", name: "field", args: "" })));
  await t.session.close();
  const u = await theatreSession({ settingsPatch: { approvalMode: "bypass", locale: "zh-CN" } });
  await u.session.run({ type: "clinical_action", action: { type: "start" } });
  log("SEAT-UNSEATED\n" + out(await u.session.run({ type: "slash_command", name: "seat", args: "" })));
  log("TEAM-UNSEATED\n" + out(await u.session.run({ type: "slash_command", name: "team", args: "" })));
  await u.session.close();
}, 120000);

import { appendFileSync } from "node:fs";
import { it } from "vitest";
import { theatreSession } from "../session/__fixtures__/theatre.js";
const F = "/tmp/claude-0/-home-user/650af4ac-5c11-5dd6-baac-53dab986607e/scratchpad/wp7-explore2.txt";
const log = (s: string) => appendFileSync(F, s + "\n");

it("drive like the CLI", async () => {
  const t = await theatreSession({ settingsPatch: { approvalMode: "bypass" } });
  await t.session.run({ type: "clinical_action", action: { type: "start", seat: "first-assistant" } });
  const s = t.session;
  const seen = new Set<string>();
  const asked = new Map<string, any>();
  const cmd = async (name: string, args: string) => {
    const ev = await s.run({ type: "slash_command", name, args });
    log(`> /${name} ${args} :: ${ev.filter((e) => e.msg.type === "error" || e.msg.type === "warning").map((e: any) => e.msg.message).join(" | ")}`);
  };
  for (let i = 0; i < 300 && !s.state.procedure?.closed; i++) {
    const msgs = s.team()!.state.messages;
    for (const m of msgs) if (!seen.has(m.id) && (m.to === "actor:clinician" || m.from === "actor:clinician")) log(`  ${m.id} ${m.from}->${m.to} ${m.kind} [${m.thread}] ${m.text.en}`);
    const fresh = msgs.filter((m) => m.to === "actor:clinician" && !seen.has(m.id));
    for (const m of msgs) seen.add(m.id);
    let acted = false;
    for (const m of fresh) {
      if (m.kind === "request" && m.about.field) { asked.set(m.thread, m); await cmd("team", "reply readback"); acted = true; }
      else if (m.kind === "request" && m.about.callout) { await cmd("team", `reply ${m.id} confirm`); acted = true; }
      else if (m.kind === "confirm" && asked.has(m.thread)) {
        const f = asked.get(m.thread).about.field;
        const ports = s.state.procedure!.ports as any[];
        const camera = ports.find((p) => p.role === "camera")!.site;
        const port = f.port ?? camera;
        if (f.op === "camera") await cmd("operate", ports.find((p) => p.site === port)?.instrument ? `hand-over port=${port} to=doc-1` : `insert port=${port} instrument=laparoscope`);
        if (f.op === "aim") await cmd("operate", `aim port=${camera} at=${f.region}`);
        if (f.op === "aim" && f.zoom) await cmd("operate", `zoom port=${camera} level=${f.zoom}`);
        if (f.op === "zoom") await cmd("operate", `zoom port=${camera} level=${f.zoom}`);
        await cmd("team", `reply ${m.id} report Done.`); acted = true;
      }
    }
    if (!acted) await cmd("team", "run");
  }
  log(`closed ${s.state.procedure?.closed}`);
  await s.close();
}, 200000);

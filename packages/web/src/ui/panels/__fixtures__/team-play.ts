/**
 * Test-only: the web's own session in a place in the care team (the world's theatre fixture: general-hospital's theatre
 * with core's lap-chole team), and a learner who plays their place with the team panel's own answers (`team-view.ts`):
 * what the stand-in waits on them for is answered as the panel offers it — read back, and once confirmed the step done
 * as the surgery window would send it, then reported —, the stand-in's call-outs answered through the call-out card's
 * own approval responses. Test data, not a team any hospital works with.
 */
import { refOfBody, type CaseDefinition, type ProcedureOp } from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import type { AgentEvent } from "@clinicalcraft/agent";
import { theatreCase, theatreCatalog, theatreFacility } from "../../../../../world/src/__fixtures__/theatre.js";
import { catalogs } from "../../../../../world/src/__fixtures__/world.js";
import { startAppSession, type AppSession } from "../../../app/session.js";
import { defaultSettings } from "../../../app/settings.js";
import { answersFor, awaitedOf, calloutOf, type CalloutCard } from "../team-view.js";

const offline = { provider: "offline", model: null, mode: "offline" as const, fellBack: false };

/** The web's own session of the theatre case, in-world, in the default approval mode, started in a place (or none). */
export async function placeSession(start: { seat?: "first-assistant" | "second-assistant" | "scrub-nurse"; lineup?: string } = {}, locale = "en", caseDef: CaseDefinition = theatreCase()): Promise<AppSession> {
  const app = await startAppSession({ caseDef, facility: theatreFacility(), catalogs: [...catalogs(), theatreCatalog()], stored: defaultSettings(), choice: offline, locale, served: false, embodiment: "embodied" });
  const events = await app.session.run({ type: "clinical_action", action: { type: "start", ...start } });
  const errors = events.filter((e) => e.msg.type === "error");
  if (errors.length) throw new Error(JSON.stringify(errors));
  // the team moves one round at a time (`team step`), as the test says
  await app.session.run({ type: "team", action: "pause" });
  return app;
}

/** Errors and warnings of a run, as the session said them. */
export const said = (events: readonly AgentEvent[]) => events.flatMap((e) => (e.msg.type === "error" || e.msg.type === "warning" ? [e.msg.message] : []));

/** The learner's own steps of their place (no actor: the session takes the learner's body as their place's). */
async function operate(app: AppSession, op: ProcedureOp): Promise<void> {
  const events = await app.session.run({ type: "clinical_action", action: { type: "operate", op } });
  const errors = said(events);
  if (errors.length) throw new Error(`${op.op}: ${errors.join(" ")}`);
}

/**
 * Play the learner's place with the panel's answers until `until` holds (or `rounds` run out): what the stand-in waits
 * for is answered — a request read back; once confirmed, the step asked done (a traction taken and held, the camera
 * taken or aimed, a pass) and reported; its stop or its word that it cannot go on: "Go on" (`onHalt` first, if given);
 * otherwise the team takes one round. Returns the rounds run.
 */
export async function play(app: AppSession, until: () => boolean, o: { rounds?: number; onHalt?: () => Promise<void> } = {}): Promise<number> {
  let n = 0;
  for (; n < (o.rounds ?? 300) && !until(); n++) {
    const cp = app.session.team()!;
    const w = awaitedOf(cp);
    const answers = w?.kind === "line" ? answersFor(cp, w.message) : [];
    const pick = (id: string) => answers.find((a) => a.id === id);
    const go = pick("goOn") ?? pick("readback");
    if (go && "op" in go) {
      if (go.id === "goOn") await o.onHalt?.();
      await app.session.run(go.op);
      continue;
    }
    const report = pick("report");
    if (w?.kind === "line" && report && "op" in report) {
      const asked = cp.state.messages.find((m) => m.thread === w.message.thread && m.kind === "request" && m.about.field)!.about.field!;
      const s = app.session.state;
      const me = refOfBody(app.session.caseDef, s, PRIMARY_ACTOR) as string;
      const ports = s.procedure!.ports;
      const camera = ports.find((p) => p.role === "camera")!.site;
      if (asked.op === "camera") await operate(app, ports.find((p) => p.site === (asked.port ?? camera))?.instrument ? { op: "hand-over", port: asked.port ?? camera, to: me } : { op: "insert", port: asked.port ?? camera, instrument: "laparoscope" });
      if (asked.op === "aim") await operate(app, { op: "aim", port: camera, at: asked.region! });
      if (asked.op === "aim" && asked.zoom) await operate(app, { op: "zoom", port: camera, level: asked.zoom });
      if (asked.op === "zoom") await operate(app, { op: "zoom", port: camera, level: asked.zoom! });
      if (asked.op === "pass") await operate(app, { op: "pass", instrument: asked.instrument! });
      if (asked.op === "traction") {
        if (ports.find((p) => p.site === asked.port)?.holder !== me) await operate(app, { op: "hand-over", port: asked.port!, to: me });
        await operate(app, { op: "retract", port: asked.port!, structure: asked.structure!, direction: asked.direction!, force: asked.force ?? "firm" });
      }
      await app.session.run(report.op);
      continue;
    }
    await app.session.run({ type: "team", action: "step" });
  }
  return n;
}

/**
 * Answer every call-out of the stand-in's as the card does (`calloutOf`: "No objection" / "Stop", the request's own
 * approval response) — `decide` chooses; every other approval request is left alone. Returns the cards seen and an
 * unsubscribe.
 */
export function answerCallouts(app: AppSession, decide: (card: CalloutCard, n: number) => "go" | "stop"): { cards: CalloutCard[]; off: () => void } {
  const cards: CalloutCard[] = [];
  const off = app.store.onChange(() => {
    for (const req of app.store.pendingApprovals()) {
      if (cards.some((c) => c.requestId === req.requestId)) continue;
      const card = calloutOf(req, app.session.caseDef, app.session.state);
      if (!card) continue;
      cards.push(card);
      app.submit(decide(card, cards.length - 1) === "go" ? card.go : card.stop);
    }
  });
  return { cards, off };
}

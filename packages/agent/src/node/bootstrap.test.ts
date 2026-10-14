import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FacilityDefinition } from "@clinicalcraft/core";
import { afterAll, describe, expect, it } from "vitest";
import { loadMiniCase } from "../__fixtures__/harness.js";
import type { AgentEvent } from "../protocol.js";
import { BootstrapError, chooseFacility, createNodeSession } from "./bootstrap.js";
import { loadContent } from "./content.js";
import { listSessions, readTranscript } from "./transcript.js";

const root = mkdtempSync(join(tmpdir(), "cc-bootstrap-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

function project(): { home: string; cwd: string; env: Record<string, string> } {
  const dir = mkdtempSync(join(root, "p-"));
  const home = join(dir, "home");
  const cwd = join(dir, "project");
  mkdirSync(join(cwd, ".clinicalcraft", "agents"), { recursive: true });
  mkdirSync(join(cwd, ".clinicalcraft", "commands"), { recursive: true });
  mkdirSync(home, { recursive: true });
  return { home, cwd, env: { CLINICALCRAFT_HOME: home, HOME: home, CLINICALCRAFT_PROVIDER: "offline", CLINICALCRAFT_LOCALE: "en" } };
}

const content = await loadContent();
const caseId = content.cases.has("smzl-lung-adeno") ? "smzl-lung-adeno" : ([...content.cases.keys()][0] ?? null);

describe("createNodeSession", () => {
  it.skipIf(!caseId)("bootstraps an offline session with project agents/commands, memory and a JSONL transcript; resume restores it", async () => {
    const p = project();
    writeFileSync(join(p.cwd, "CLINICALCRAFT.md"), "# Course rules\nAlways ask about allergies.\n");
    writeFileSync(join(p.cwd, ".clinicalcraft", "agents", "pharmacist.md"), "---\nname: pharmacist\ndescription: Ward pharmacist\nrole: npc\ntools: [get_results]\n---\nYou are the ward pharmacist.\n");
    writeFileSync(join(p.cwd, ".clinicalcraft", "commands", "sbar.md"), "---\ndescription: SBAR to the nurse\nagent: nurse\n---\nSBAR please: $ARGUMENTS\n");
    writeFileSync(join(p.cwd, ".clinicalcraft", "settings.json"), JSON.stringify({ approvalMode: "auto" }));

    const session = await createNodeSession({ caseId: caseId!, cwd: p.cwd, env: p.env });
    const startup: AgentEvent[] = [];
    const iterator = session.events()[Symbol.asyncIterator]();
    startup.push((await iterator.next()).value!);
    expect(startup[0]!.msg).toMatchObject({ type: "session_configured", caseId, provider: "offline", offline: true, approvalMode: "auto" });
    expect(session.agents().map((a) => a.name)).toContain("pharmacist");
    expect(session.commands().map((c) => c.name)).toContain("sbar");

    await session.run({ type: "user_message", text: "/ask 1" });
    await session.run({ type: "slash_command", name: "sbar", args: "bed 3" });
    const before = session.state;
    await session.close();

    const sessions = await listSessions(p.env);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ id: session.id, caseId });
    const items = await readTranscript(sessions[0]!.path);
    expect(items[0]!.type).toBe("session_meta");
    expect(readFileSync(sessions[0]!.path, "utf8")).not.toMatch(/apiKey|sk-/);

    const resumed = await createNodeSession({ resume: "latest", cwd: p.cwd, env: p.env, content });
    expect(resumed.id).toBe(session.id);
    expect(resumed.state).toEqual(before);
    expect(resumed.conversationOf("nurse").length).toBeGreaterThan(0);
    await resumed.run({ type: "user_message", text: "/note resumed" });
    await resumed.close();
    const after = await readTranscript(sessions[0]!.path);
    const ordinals = after.map((i) => i.ordinal);
    expect(new Set(ordinals).size).toBe(ordinals.length); // resume continues the ordinal sequence
    expect(after.filter((i) => i.type === "session_meta")).toHaveLength(2);
  });

  it.skipIf(!caseId)("resume continues with the transcript's locale, approval mode and interlocutor unless a flag overrides them", async () => {
    const p = project();
    const session = await createNodeSession({ caseId: caseId!, cwd: p.cwd, env: p.env, content, flags: { locale: "zh-CN" } });
    await session.run({ type: "slash_command", name: "approval", args: "strict" });
    await session.run({ type: "slash_command", name: "talk", args: "nurse" });
    await session.close();

    const resumed = await createNodeSession({ resume: "latest", cwd: p.cwd, env: p.env, content });
    expect(resumed.settings.locale).toBe("zh-CN"); // CLINICALCRAFT_LOCALE=en in env does not switch a resumed session
    expect(resumed.settings.approvalMode).toBe("strict");
    const first = await resumed.events()[Symbol.asyncIterator]().next();
    expect(first.value!.msg).toMatchObject({ type: "session_configured", locale: "zh-CN", approvalMode: "strict", interlocutor: "nurse" });
    await resumed.close();

    const flagged = await createNodeSession({ resume: "latest", cwd: p.cwd, env: p.env, content, flags: { locale: "en" } });
    expect(flagged.settings.locale).toBe("en");
    expect(flagged.settings.approvalMode).toBe("strict");
    await flagged.close();
  });

  it("reports unknown cases and missing selections", async () => {
    const p = project();
    await expect(createNodeSession({ caseId: "no-such-case", cwd: p.cwd, env: p.env, transcript: false, content })).rejects.toBeInstanceOf(BootstrapError);
    await expect(createNodeSession({ cwd: p.cwd, env: p.env, transcript: false, content })).rejects.toThrow(/No case selected/);
  });
});

describe("chooseFacility", () => {
  const facility = (id: string) => ({ id, catalogs: [] }) as unknown as FacilityDefinition;
  const facilities = new Map([
    ["clinic-v4", { def: facility("clinic-v4"), file: "a" }],
    ["general-hospital", { def: facility("general-hospital"), file: "b" }],
  ]);
  const c = loadMiniCase();

  it("prefers explicit > case > settings default > general-hospital > first", () => {
    expect(chooseFacility({ facilities }, { facility: "clinic-v4" }, undefined, null)!.id).toBe("clinic-v4");
    expect(chooseFacility({ facilities }, { facility: undefined }, undefined, "clinic-v4")!.id).toBe("clinic-v4");
    expect(chooseFacility({ facilities }, { facility: "missing" }, undefined, null)!.id).toBe("general-hospital");
    expect(chooseFacility({ facilities: new Map([["x", { def: facility("x"), file: "x" }]]) }, c, undefined, null)!.id).toBe("x");
    expect(chooseFacility({ facilities: new Map() }, c, undefined, null)).toBeNull();
    expect(() => chooseFacility({ facilities }, c, "nope", null)).toThrow(BootstrapError);
  });
});

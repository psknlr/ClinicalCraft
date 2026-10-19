/**
 * Pure parts of the embodied controller: reading a delegation's outcome from
 * a tool call or a `/delegate` command, and the delegation task names.
 */
import { describe, expect, it } from "vitest";
import { setLocale } from "../i18n/index.js";
import { BODY_TOOLS, delegationOf, trTask } from "./embodied-link.js";

describe("delegations", () => {
  const d = { staffId: "staff:ed-nurse", role: "nurse", task: "attach_monitor", status: "completed", steps: [] };

  it("reads the outcome from a delegate_task call and from a /delegate command", () => {
    expect(delegationOf({ delegation: d })).toEqual({ staffId: "staff:ed-nurse", task: "attach_monitor", status: "completed" });
    expect(delegationOf({ ok: true, data: { delegation: d } })).toEqual({ staffId: "staff:ed-nurse", task: "attach_monitor", status: "completed" });
    expect(delegationOf({ ok: false, data: { delegation: { ...d, staffId: null, status: "failed" } } })).toEqual({ staffId: null, task: "attach_monitor", status: "failed" });
    expect(delegationOf({ ok: true, data: null })).toBeNull();
    expect(delegationOf(undefined)).toBeNull();
    expect(delegationOf({ delegation: { task: 3 } })).toBeNull();
  });

  it("names the tasks in both languages, unknown ones by id", () => {
    setLocale("zh-CN");
    expect(trTask("attach_monitor")).toBe("连接监护仪");
    setLocale("en");
    expect(trTask("attach_monitor")).toBe("Attach the monitor");
    expect(trTask("juggle")).toBe("juggle");
  });

  it("pauses real time for the world tools that move a body", () => {
    for (const tool of ["navigate_to", "approach_object", "interact_object", "delegate_task", "execute_skill"]) expect(BODY_TOOLS.has(tool)).toBe(true);
    expect(BODY_TOOLS.has("observe_world")).toBe(false);
  });
});

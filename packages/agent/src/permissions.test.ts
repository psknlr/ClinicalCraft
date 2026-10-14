import type { ClinicalAction } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import type { ApprovalMode, PracticeScope, RiskLevel } from "./protocol.js";
import {
  actionSpecifier,
  actionToolName,
  checkPermission,
  formatRule,
  inScope,
  matchRule,
  parseRule,
  PERMISSION_RULE_IDS,
  PermissionState,
  scopeRank,
} from "./permissions.js";
import type { ToolContext, ToolDefinition } from "./tools/types.js";

const ctx = {} as ToolContext;

function tool(over: Partial<ToolDefinition<{ id?: string }>> & { riskLevel?: RiskLevel } = {}): ToolDefinition<{ id?: string }> {
  const { riskLevel = "moderate", ...rest } = over;
  return {
    name: "intervene",
    description: "",
    inputSchema: { type: "object" },
    readOnly: false,
    sideEffect: "patient",
    scope: "full",
    risk: () => riskLevel,
    summarize: () => "",
    specifier: (a) => a.id ?? "",
    run: async () => ({ ok: true, output: "" }),
    ...rest,
  };
}

const check = (t: ToolDefinition<{ id?: string }>, mode: ApprovalMode = "default", scope: PracticeScope = "full", rules = {}, session: string[] | PermissionState = [], id = "alteplase") =>
  checkPermission(t, { id }, ctx, mode, scope, rules, session);

describe("rule parsing & matching", () => {
  it("parses tool and tool(specifier) rules", () => {
    expect(parseRule("examine")).toEqual({ tool: "examine", specifier: null });
    expect(parseRule("intervene(alteplase*)")).toEqual({ tool: "intervene", specifier: "alteplase*" });
    expect(parseRule("bad(")).toBeNull();
    expect(parseRule("(x)")).toBeNull();
    expect(parseRule("  ")).toBeNull();
  });

  it("matches with * and ? globs, case-insensitively", () => {
    expect(matchRule("intervene(alteplase*)", "intervene", "alteplase-0.9")).toBe(true);
    expect(matchRule("intervene(alteplase*)", "intervene", "aspirin")).toBe(false);
    expect(matchRule("intervene(alteplase*)", "order_test", "alteplase")).toBe(false);
    expect(matchRule("order_test(*)", "order_test", "cbc")).toBe(true);
    expect(matchRule("order_test(*)", "order_test", undefined)).toBe(true);
    expect(matchRule("order_test(ct-*)", "order_test", undefined)).toBe(false);
    expect(matchRule("examine", "examine", "chest")).toBe(true);
    expect(matchRule("examine", "examine_extra", "chest")).toBe(false);
    expect(matchRule("order_test(ct-?ead)", "order_test", "CT-HEAD")).toBe(true);
    expect(matchRule("*(cbc)", "order_test", "cbc")).toBe(true);
    expect(matchRule("order_test(a.b)", "order_test", "aXb")).toBe(false);
    expect(formatRule("intervene", "aspirin")).toBe("intervene(aspirin)");
    expect(formatRule("examine", null)).toBe("examine");
  });

  it("ranks scopes", () => {
    expect(scopeRank("history-only")).toBeLessThan(scopeRank("workup"));
    expect(scopeRank("workup")).toBeLessThan(scopeRank("full"));
    expect(inScope("workup", "history-only")).toBe(false);
    expect(inScope("history-only", "workup")).toBe(true);
  });
});

describe("checkPermission ladder", () => {
  it("1 scope.out-of-scope", () => {
    const r = check(tool({ scope: "full" }), "bypass", "workup", { allow: ["intervene"] });
    expect(r).toMatchObject({ decision: "deny", ruleId: "scope.out-of-scope", risk: "moderate", allowSession: false });
  });

  it("2 rule.deny beats allow rules, session rules and bypass", () => {
    const r = check(tool(), "bypass", "full", { deny: ["intervene(alteplase*)"], allow: ["intervene"] }, ["intervene"]);
    expect(r).toMatchObject({ decision: "deny", ruleId: PERMISSION_RULE_IDS.deny });
    expect(r.reason).toContain("intervene(alteplase*)");
  });

  it("3 mode.plan.state-changing denies non-read-only tools even when allowed", () => {
    expect(check(tool(), "plan", "full", { allow: ["intervene"] })).toMatchObject({ decision: "deny", ruleId: "mode.plan.state-changing" });
  });

  it("4 tool.read-only allows read-only tools in every mode (but deny rules still win)", () => {
    const ro = tool({ name: "check_vitals", readOnly: true, scope: "history-only" });
    for (const mode of ["default", "strict", "auto", "plan", "bypass"] as const) expect(check(ro, mode)).toMatchObject({ decision: "allow", ruleId: "tool.read-only" });
    expect(check(ro, "default", "full", { deny: ["check_vitals"] }).decision).toBe("deny");
  });

  it("5 tool.always-ask asks without session approval, except in bypass", () => {
    const t = tool({ alwaysAsk: () => true, riskLevel: "high" });
    expect(check(t, "auto", "full", { allow: ["intervene"] }, ["intervene"])).toMatchObject({ decision: "ask", ruleId: "tool.always-ask", allowSession: false });
    expect(check(t, "bypass")).toMatchObject({ decision: "allow", ruleId: "mode.bypass" });
  });

  it("6 rule.ask asks even in bypass / auto", () => {
    expect(check(tool({ riskLevel: "low" }), "bypass", "full", { ask: ["intervene"] })).toMatchObject({ decision: "ask", ruleId: "rule.ask", allowSession: true });
    expect(check(tool({ riskLevel: "high" }), "auto", "full", { ask: ["intervene(alt*)"] })).toMatchObject({ decision: "ask", ruleId: "rule.ask", allowSession: false });
  });

  it("7 session.allow (array or PermissionState)", () => {
    const state = new PermissionState();
    state.addSessionRule("intervene", "alteplase");
    expect(check(tool(), "strict", "full", {}, state)).toMatchObject({ decision: "allow", ruleId: "session.allow" });
    expect(check(tool(), "strict", "full", {}, ["intervene(alt*)"])).toMatchObject({ decision: "allow", ruleId: "session.allow" });
    expect(check(tool(), "strict", "full", {}, state, "aspirin")).toMatchObject({ decision: "ask", ruleId: "mode.strict" });
  });

  it("8 rule.allow", () => {
    expect(check(tool({ riskLevel: "high" }), "default", "full", { allow: ["intervene(alteplase)"] })).toMatchObject({ decision: "allow", ruleId: "rule.allow" });
  });

  it("9 mode table", () => {
    const at = (mode: ApprovalMode, risk: RiskLevel) => check(tool({ riskLevel: risk }), mode);
    expect(at("bypass", "high")).toMatchObject({ decision: "allow", ruleId: "mode.bypass" });
    expect(at("auto", "moderate")).toMatchObject({ decision: "allow", ruleId: "mode.auto" });
    expect(at("auto", "high")).toMatchObject({ decision: "ask", ruleId: "mode.auto", allowSession: false });
    expect(at("default", "none")).toMatchObject({ decision: "allow", ruleId: "mode.default" });
    expect(at("default", "low")).toMatchObject({ decision: "allow", ruleId: "mode.default" });
    expect(at("default", "moderate")).toMatchObject({ decision: "ask", ruleId: "mode.default", allowSession: true });
    expect(at("default", "high")).toMatchObject({ decision: "ask", ruleId: "mode.default", allowSession: false });
    expect(at("strict", "none")).toMatchObject({ decision: "ask", ruleId: "mode.strict", allowSession: true });
    expect(at("strict", "high")).toMatchObject({ decision: "ask", ruleId: "mode.strict", allowSession: false });
  });

  it("is robust to throwing risk/specifier/alwaysAsk callbacks", () => {
    const t = tool({
      risk: () => {
        throw new Error("boom");
      },
      specifier: () => {
        throw new Error("boom");
      },
    });
    expect(check(t, "auto")).toMatchObject({ decision: "ask", risk: "high" });
    const a = tool({
      riskLevel: "low",
      alwaysAsk: () => {
        throw new Error("boom");
      },
    });
    expect(check(a, "default")).toMatchObject({ decision: "ask", ruleId: "tool.always-ask" });
  });
});

describe("PermissionState", () => {
  it("dedupes, matches and clears", () => {
    const s = new PermissionState(["examine"]);
    expect(s.addSessionRule("order_test", "cbc")).toBe("order_test(cbc)");
    s.addSessionRule("order_test", "cbc");
    s.addRule("bad(");
    expect(s.sessionRules).toEqual(["examine", "order_test(cbc)"]);
    expect(s.matches("order_test", "cbc")).toBe(true);
    expect(s.matches("order_test", "bmp")).toBe(false);
    s.clear();
    expect(s.sessionRules).toEqual([]);
  });
});

describe("learner action mapping", () => {
  it("maps clinical actions to equivalent tools and specifiers", () => {
    const order: ClinicalAction = { type: "order", investigationId: "cbc" };
    expect(actionToolName(order)).toBe("order_test");
    expect(actionSpecifier(order)).toBe("cbc");
    expect(actionToolName({ type: "intervene", interventionId: "aspirin" } as ClinicalAction)).toBe("intervene");
    expect(actionSpecifier({ type: "intervene", interventionId: "aspirin" } as ClinicalAction)).toBe("aspirin");
    expect(actionToolName({ type: "note", text: "x" } as ClinicalAction)).toBeNull();
    expect(actionToolName({ type: "advance-time", minutes: 5 } as ClinicalAction)).toBe("wait");
    expect(actionSpecifier({ type: "set-phase", phase: "day-3" } as ClinicalAction)).toBe("day-3");
  });
});

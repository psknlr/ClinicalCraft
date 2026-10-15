import { describe, expect, it } from "vitest";
import { parseLearnerInput, resolveAgentAlias } from "./router.js";

describe("parseLearnerInput", () => {
  it("routes slash commands with arguments", () => {
    expect(parseLearnerInput("/order cbc")).toEqual({ kind: "command", name: "order", args: "cbc" });
    expect(parseLearnerInput("  /Answer dx  stemi ")).toEqual({ kind: "command", name: "answer", args: "dx  stemi" });
    expect(parseLearnerInput("/help")).toEqual({ kind: "command", name: "help", args: "" });
    expect(parseLearnerInput("／vitals")).toEqual({ kind: "command", name: "vitals", args: "" });
  });

  it("routes @role addressing", () => {
    expect(parseLearnerInput("@nurse is the ECG back?")).toEqual({ kind: "message", to: "nurse", text: "is the ECG back?" });
    expect(parseLearnerInput("@Attending, any hint?")).toEqual({ kind: "message", to: "attending", text: "any hint?" });
    expect(parseLearnerInput("＠nurse：血压多少")).toEqual({ kind: "message", to: "nurse", text: "血压多少" });
    expect(parseLearnerInput("@radiologist")).toEqual({ kind: "message", to: "radiologist", text: "" });
  });

  it("resolves Chinese role names, with or without a space (the CLI, exec and MCP route like the web)", () => {
    expect(parseLearnerInput("@护士 现在血压多少？")).toEqual({ kind: "message", to: "nurse", text: "现在血压多少？" });
    expect(parseLearnerInput("＠护士，现在血压多少")).toEqual({ kind: "message", to: "nurse", text: "现在血压多少" });
    expect(parseLearnerInput("@护士现在血压多少")).toEqual({ kind: "message", to: "nurse", text: "现在血压多少" });
    expect(parseLearnerInput("@护士长 床位安排好了吗")).toEqual({ kind: "message", to: "nurse", text: "床位安排好了吗" });
    expect(parseLearnerInput("@上级医师 我的思路对吗")).toEqual({ kind: "message", to: "attending", text: "我的思路对吗" });
    // An alias for an agent the case does not have stays plain text.
    expect(parseLearnerInput("@家属 你好", ["patient", "nurse"])).toEqual({ kind: "message", to: null, text: "@家属 你好" });
    expect(resolveAgentAlias("护士")).toBe("nurse");
    expect(resolveAgentAlias("@Nurse")).toBe("nurse");
  });

  it("sends plain text to the current interlocutor and escapes //", () => {
    expect(parseLearnerInput("where does it hurt?")).toEqual({ kind: "message", to: null, text: "where does it hurt?" });
    expect(parseLearnerInput("//not a command")).toEqual({ kind: "message", to: null, text: "/not a command" });
    expect(parseLearnerInput("email me@example.com")).toEqual({ kind: "message", to: null, text: "email me@example.com" });
  });
});

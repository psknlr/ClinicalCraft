import { describe, expect, it } from "vitest";
import { parseLearnerInput } from "./router.js";

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

  it("sends plain text to the current interlocutor and escapes //", () => {
    expect(parseLearnerInput("where does it hurt?")).toEqual({ kind: "message", to: null, text: "where does it hurt?" });
    expect(parseLearnerInput("//not a command")).toEqual({ kind: "message", to: null, text: "/not a command" });
    expect(parseLearnerInput("email me@example.com")).toEqual({ kind: "message", to: null, text: "email me@example.com" });
  });
});

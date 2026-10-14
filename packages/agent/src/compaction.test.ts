import { describe, expect, it } from "vitest";
import { compactConversation, compactionSplitIndex, compactionSystemPrompt, deterministicSummary, estimateTokens, IMAGE_TOKEN_ESTIMATE } from "./compaction.js";
import { ScriptedProvider, textScript } from "./providers/scripted.js";
import type { ChatMessage } from "./providers/types.js";

const user = (text: string): ChatMessage => ({ role: "user", content: [{ type: "text", text }] });
const assistant = (text: string): ChatMessage => ({ role: "assistant", content: [{ type: "text", text }] });
const call = (id: string, name = "order_test"): ChatMessage => ({ role: "assistant", content: [{ type: "tool_call", id, name, args: { query: "cbc" } }] });
const result = (id: string): ChatMessage => ({ role: "user", content: [{ type: "tool_result", callId: id, content: "ordered" }] });

describe("estimateTokens", () => {
  it("counts ~4 chars per token for Latin text and 1 per CJK character", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
    expect(estimateTokens("胸痛三天")).toBe(4);
    expect(estimateTokens("胸痛 chest")).toBe(2 + 2);
    expect(estimateTokens("，。")).toBe(2);
  });

  it("sums message parts with overhead", () => {
    const msgs: ChatMessage[] = [user("abcd"), { role: "user", content: [{ type: "image", mediaType: "image/png", data: "x" }] }];
    expect(estimateTokens(msgs)).toBe(4 + 1 + 4 + IMAGE_TOKEN_ESTIMATE);
    expect(estimateTokens(user("abcd"))).toBe(5);
  });
});

describe("compactionSplitIndex", () => {
  it("never separates a tool call from its result and lands on a plain user message", () => {
    const msgs = [user("q1"), assistant("a1"), user("q2"), call("c1"), result("c1"), assistant("done"), user("q3"), assistant("a3")];
    // keepRecent 4 → would start at result("c1"); moves back to user("q2")
    expect(compactionSplitIndex(msgs, 4)).toBe(2);
    expect(compactionSplitIndex(msgs, 2)).toBe(6);
    expect(compactionSplitIndex(msgs, 0)).toBe(6);
    expect(compactionSplitIndex([call("c"), result("c")], 1)).toBe(0);
  });
});

describe("compactConversation", () => {
  const history = [
    user("What brings you in?"),
    assistant("Chest pain for two hours."),
    user("Order an ECG"),
    call("c1", "order_test"),
    result("c1"),
    assistant("ECG ordered."),
    user("Any allergies?"),
    assistant("No known allergies."),
    user("Smoker?"),
    assistant("Twenty a day."),
  ];

  it("offline: deterministic digest, keeps tool pairs and the recent tail", async () => {
    // keepRecent 5 would start inside the tool exchange → the split moves back; 4 starts at a plain user turn.
    expect(compactionSplitIndex(history, 5)).toBe(2);
    const r = await compactConversation({ provider: null, messages: history, keepRecent: 4, locale: "en" });
    expect(r.deterministic).toBe(true);
    expect(r.compactedCount).toBe(6);
    expect(r.messages).toHaveLength(4);
    const first = r.messages[0]!;
    expect(first.role).toBe("user");
    expect((first.content[0] as { text: string }).text).toContain("<conversation_summary>");
    expect((first.content[0] as { text: string }).text).toContain("Chest pain for two hours.");
    expect(first.content[1]).toEqual({ type: "text", text: "Any allergies?" });
    expect(r.summary).toContain("order_test");
    // every tool_result in the output still has its tool_call
    const callIds = new Set(r.messages.flatMap((m) => m.content.filter((p) => p.type === "tool_call").map((p) => (p as { id: string }).id)));
    const resultIds = r.messages.flatMap((m) => m.content.filter((p) => p.type === "tool_result").map((p) => (p as { callId: string }).callId));
    expect(resultIds.every((id) => callIds.has(id))).toBe(true);
  });

  it("uses the provider with a grounded summary prompt and falls back on errors", async () => {
    const provider = new ScriptedProvider([textScript("## Presenting complaint & history elicited\nChest pain 2 h."), [{ type: "error", error: { message: "x", kind: "overloaded", retryable: true } }]]);
    const r = await compactConversation({ provider, messages: history, keepRecent: 4, locale: "en" });
    expect(r.deterministic).toBe(false);
    expect(r.summary).toBe("## Presenting complaint & history elicited\nChest pain 2 h.");
    const req = provider.requests[0]!;
    expect(req.tools).toBeUndefined();
    expect(req.system[0]!.text).toContain("ONLY facts");
    for (const h of ["Exam findings revealed", "Orders & results", "Working differential", "Pending", "Safety"]) expect(req.system[0]!.text).toContain(h);
    expect((req.messages[0]!.content[0] as { text: string }).text).toContain("TOOL CALL order_test");

    const fallback = await compactConversation({ provider, messages: history, keepRecent: 4, locale: "zh-CN" });
    expect(fallback.deterministic).toBe(true);
    expect(fallback.summary).toContain("较早的对话");
  });

  it("returns the conversation unchanged when there is nothing to compact", async () => {
    const r = await compactConversation({ provider: null, messages: history.slice(0, 2), keepRecent: 6 });
    expect(r.messages).toEqual(history.slice(0, 2));
    expect(r.summary).toBe("");
    expect(r.compactedCount).toBe(0);
  });

  it("localises prompts and digests", () => {
    expect(compactionSystemPrompt("zh-CN")).toContain("主诉与已获取的病史");
    expect(deterministicSummary([user("x".repeat(500))], "en", 100)).toContain("…");
  });
});

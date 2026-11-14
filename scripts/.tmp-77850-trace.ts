// temporary scratch helper (deleted after use) — replays a case's solution and prints the phase per step
import { readFileSync } from "node:fs";
import { assess, createSession, parseCase, reduce } from "@clinicalcraft/core";
const file = process.argv[2]!;
const parsed = parseCase(JSON.parse(readFileSync(file, "utf8")));
if (!parsed.ok) { console.log(JSON.stringify(parsed.issues).slice(0, 800)); process.exit(1); }
const c = parsed.value;
let s = createSession(c);
for (const a of c.solution) {
  const before = (s as any).phase;
  const r = reduce(c, s, a);
  s = r.state;
  const tag = (a as any).interventionId ?? (a as any).decisionId ?? (a as any).investigationId ?? (a as any).itemId ?? (a as any).findingId ?? "";
  if (["intervene", "answer", "set-phase", "finish"].includes(a.type) || before !== (s as any).phase)
    console.log(`${a.type}:${tag}  phase ${before} -> ${(s as any).phase}`);
}
const res = assess(c, s);
console.log("score", res.score.percent, JSON.stringify((res as any).safety ?? (res as any).safetyOutcome ?? "").slice(0, 300));

#!/usr/bin/env node
// Example PreToolUse hook: block thrombolysis unless the learner has documented a blood pressure check note.
// Exit code 2 blocks the tool call; stderr becomes the reason shown to the agent/learner.
let input = "";
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  const e = JSON.parse(input);
  const id = String(e.tool_input?.intervention_id ?? e.tool_input?.query ?? "");
  if (/alteplase|tenecteplase|thromb/i.test(id) && process.env.CLINICALCRAFT_ALLOW_LYSIS !== "1") {
    process.stderr.write("Course policy: thrombolysis requires a supervisor sign-off in this session (set CLINICALCRAFT_ALLOW_LYSIS=1).");
    process.exit(2);
  }
  process.stdout.write(JSON.stringify({ additionalContext: "High-risk intervention double-checked by course hook." }));
  process.exit(0);
});

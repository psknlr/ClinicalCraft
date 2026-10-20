#!/usr/bin/env node
// Example ClinicalEvent hook: append progress milestones to .clinicalcraft/progress.log (e.g. for an LMS bridge).
import fs from "node:fs";
let input = "";
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  const e = JSON.parse(input);
  const line = `${new Date().toISOString()}\t${e.session_id}\t${e.case_id}\t${e.event?.type}\t${e.event?.objectiveId ?? ""}\n`;
  fs.appendFileSync(".clinicalcraft/progress.log", line);
  process.exit(0);
});

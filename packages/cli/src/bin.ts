#!/usr/bin/env node
/**
 * `clinicalcraft` / `cc5` executable. Runs `main` and exits with its code once
 * stdout/stderr are flushed. A closed pipe (`clinicalcraft … | head`) ends the
 * process quietly instead of crashing with EPIPE.
 */
import { main } from "./main.js";

function flush(stream: NodeJS.WriteStream): Promise<void> {
  return new Promise((resolve) => {
    if (!stream.writable) return resolve();
    stream.write("", () => resolve());
  });
}

for (const stream of [process.stdout, process.stderr]) {
  stream.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EPIPE") process.exit(0);
    throw err;
  });
}

const code = await main(process.argv.slice(2));
await Promise.all([flush(process.stdout), flush(process.stderr)]);
process.exit(code);

#!/usr/bin/env node
/**
 * `clinicalcraft` / `cc5` executable. Runs `main` and exits with its code once
 * stdout/stderr are flushed.
 */
import { main } from "./main.js";

function flush(stream: NodeJS.WriteStream): Promise<void> {
  return new Promise((resolve) => {
    if (!stream.writable) return resolve();
    stream.write("", () => resolve());
  });
}

const code = await main(process.argv.slice(2));
await Promise.all([flush(process.stdout), flush(process.stderr)]);
process.exit(code);

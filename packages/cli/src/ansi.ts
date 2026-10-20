/**
 * Minimal ANSI styling. Colour is on only for a TTY, off when `NO_COLOR` is
 * set (https://no-color.org) or `TERM=dumb`; `FORCE_COLOR` (≠ "0") forces it
 * on and `FORCE_COLOR=0` forces it off.
 */

export type Env = Record<string, string | undefined>;

export interface Palette {
  readonly enabled: boolean;
  bold(s: string): string;
  dim(s: string): string;
  italic(s: string): string;
  red(s: string): string;
  green(s: string): string;
  yellow(s: string): string;
  blue(s: string): string;
  magenta(s: string): string;
  cyan(s: string): string;
  gray(s: string): string;
}

/** Whether colour should be used for a stream. */
export function colorEnabled(stream: { isTTY?: boolean } | undefined, env: Env): boolean {
  const force = env.FORCE_COLOR;
  if (force !== undefined && force !== "") return force !== "0" && force.toLowerCase() !== "false";
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== "") return false;
  if (env.TERM === "dumb") return false;
  return Boolean(stream?.isTTY);
}

function wrap(open: number, close: number): (s: string) => string {
  return (s) => `\u001b[${open}m${s}\u001b[${close}m`;
}

const identity = (s: string): string => s;

/** A palette that styles text only when `enabled`. */
export function createPalette(enabled: boolean): Palette {
  if (!enabled) {
    return {
      enabled: false,
      bold: identity,
      dim: identity,
      italic: identity,
      red: identity,
      green: identity,
      yellow: identity,
      blue: identity,
      magenta: identity,
      cyan: identity,
      gray: identity,
    };
  }
  return {
    enabled: true,
    bold: wrap(1, 22),
    dim: wrap(2, 22),
    italic: wrap(3, 23),
    red: wrap(31, 39),
    green: wrap(32, 39),
    yellow: wrap(33, 39),
    blue: wrap(34, 39),
    magenta: wrap(35, 39),
    cyan: wrap(36, 39),
    gray: wrap(90, 39),
  };
}

const ANSI_RE = /\u001b\[[0-9;?]*[A-Za-z]/g;

/** Remove ANSI escape sequences. */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, "");
}

/** Clear the current terminal line (`\r` + erase to end of line). */
export const CLEAR_LINE = "\r\u001b[K";

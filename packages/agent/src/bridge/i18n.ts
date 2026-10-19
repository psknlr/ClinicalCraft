/**
 * Strings of the world-bridge clients (zh-CN + en) that are not the
 * session's own (those — `bridge.*` in `session/i18n-embodied.ts` — are read
 * with `rt()`). Isomorphic.
 */
import { normalizeLocale } from "@clinicalcraft/core";

const EN = {
  "bridge.deadlinePassed": "The external agent's {tool} call was not run: its caller had already stopped waiting for it (its deadline passed).",
} as const;

export type BridgeMessageKey = keyof typeof EN;

const ZH: Record<BridgeMessageKey, string> = {
  "bridge.deadlinePassed": "外部代理的 {tool} 调用未执行：调用方已停止等待（已超过截止时间）。",
};

/** A bridge client message in `locale`, `{name}` placeholders filled in. */
export function bt(locale: string | null | undefined, key: BridgeMessageKey, params: Record<string, string | number> = {}): string {
  const table = normalizeLocale(locale) === "zh-CN" ? ZH : EN;
  return table[key].replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

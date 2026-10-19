/**
 * Spending caps of live-model runs (docs/EMBODIED.md R11): a token cap
 * (`--max-tokens`, always enforceable from the session's `token_usage`
 * events) and a dollar cap (`--max-usd`) that is enforceable only when the
 * model has a catalogue price. The provider catalogue of
 * `@clinicalcraft/agent` ships no prices (list prices change and are not
 * part of the model capability rules), so `MODEL_PRICES` is empty: a dollar
 * cap is refused and runs are capped by tokens only — unless a caller passes
 * its own price table.
 */
import type { TokenUsage } from "@clinicalcraft/agent";

/** USD per million tokens. */
export interface ModelPrice {
  /** Provider id the price applies to (any when absent). */
  provider?: string;
  /** Case-insensitive regex on the model id. */
  match: string;
  inputPerMTok: number;
  outputPerMTok: number;
  cacheReadPerMTok?: number;
  cacheWritePerMTok?: number;
}

/** Catalogue prices (none shipped — see the module docs). */
export const MODEL_PRICES: readonly ModelPrice[] = [];

/** The price of a model, or null when the table has none. */
export function priceFor(providerId: string, model: string, table: readonly ModelPrice[] = MODEL_PRICES): ModelPrice | null {
  for (const p of table) {
    if (p.provider && p.provider !== providerId) continue;
    let re: RegExp;
    try {
      re = new RegExp(p.match, "i");
    } catch {
      continue;
    }
    if (re.test(model)) return p;
  }
  return null;
}

/** Cost of a usage in USD. */
export function costUsd(usage: TokenUsage, price: ModelPrice): number {
  const m = 1_000_000;
  return (
    (usage.inputTokens * price.inputPerMTok) / m +
    (usage.outputTokens * price.outputPerMTok) / m +
    ((usage.cacheReadTokens ?? 0) * (price.cacheReadPerMTok ?? price.inputPerMTok)) / m +
    ((usage.cacheWriteTokens ?? 0) * (price.cacheWritePerMTok ?? price.inputPerMTok)) / m
  );
}

/** Total tokens of a usage (input + output + cache). */
export function totalTokens(u: TokenUsage): number {
  return u.inputTokens + u.outputTokens + (u.cacheReadTokens ?? 0) + (u.cacheWriteTokens ?? 0);
}

export interface BudgetLimits {
  maxTokens?: number;
  maxUsd?: number;
  /** Required for `maxUsd`. */
  price?: ModelPrice | null;
}

/** A spending budget shared by the runs of one benchmark invocation. */
export class Budget {
  readonly used: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  skipped = 0;

  constructor(readonly limits: BudgetLimits) {
    if (limits.maxUsd !== undefined && !limits.price) throw new Error("Budget: --max-usd needs a model price");
  }

  /** Add a usage delta. */
  add(delta: TokenUsage): void {
    this.used.inputTokens += delta.inputTokens;
    this.used.outputTokens += delta.outputTokens;
    if (delta.cacheReadTokens) this.used.cacheReadTokens = (this.used.cacheReadTokens ?? 0) + delta.cacheReadTokens;
    if (delta.cacheWriteTokens) this.used.cacheWriteTokens = (this.used.cacheWriteTokens ?? 0) + delta.cacheWriteTokens;
  }

  /** Dollars spent (null without a price). */
  costUsd(): number | null {
    return this.limits.price ? costUsd(this.used, this.limits.price) : null;
  }

  /** True once a cap is reached. */
  exhausted(): boolean {
    if (this.limits.maxTokens !== undefined && totalTokens(this.used) >= this.limits.maxTokens) return true;
    const cost = this.costUsd();
    return this.limits.maxUsd !== undefined && cost !== null && cost >= this.limits.maxUsd;
  }
}

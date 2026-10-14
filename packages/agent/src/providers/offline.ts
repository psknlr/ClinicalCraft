/**
 * OfflineProvider — exists so that `provider: "offline"` resolves to an
 * `LLMProvider`. Agents check `settings.provider === "offline"` (or
 * `wire === "offline"`) and use the deterministic responders instead; calling
 * `stream()` is a programming error and yields an error event.
 */
import { capabilitiesFor } from "./catalog.js";
import type { ChatRequest, LLMProvider, ModelCapabilities, ProviderConfig, StreamEvent } from "./types.js";

export const OFFLINE_ERROR_MESSAGE = "offline provider has no model; use deterministic responders";

export class OfflineProvider implements LLMProvider {
  readonly id: string;
  readonly wire = "offline" as const;
  readonly model: string;

  constructor(config?: Partial<Pick<ProviderConfig, "id" | "model">>) {
    this.id = config?.id ?? "offline";
    this.model = config?.model ?? "deterministic";
  }

  capabilities(): ModelCapabilities {
    return capabilitiesFor("offline", this.model);
  }

  // eslint-disable-next-line require-yield
  async *stream(_request: ChatRequest, _signal?: AbortSignal): AsyncGenerator<StreamEvent> {
    yield { type: "error", error: { message: OFFLINE_ERROR_MESSAGE, kind: "bad_request", code: "offline", retryable: false } };
  }
}

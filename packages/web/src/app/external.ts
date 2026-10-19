/**
 * External control of the running encounter (docs/PROTOCOL.md §13.6,
 * docs/EMBODIED.md §12): the learner's opt-in that lets THEIR OWN external
 * agent (Claude Code, Codex, Grok CLI… through `clinicalcraft mcp --attach`)
 * act in this session as the clinician, through the world bridge of
 * `clinicalcraft serve`.
 *
 * - Offered only on a page served by `clinicalcraft serve` whose
 *   `/api/health` says `worldBridge: true` — never on the Vite dev server
 *   (its `/api/health` answers 204) or in the standalone build.
 * - Off by default and NEVER persisted (not in preferences, not in saves):
 *   each encounter, new or resumed, starts off. Turning it on calls
 *   `connectWorldBridge({ serverUrl: "", session, onStatus, onActivity })` —
 *   same origin, the page's `cc_token` cookie authenticates; never
 *   `allowBypass` (in bypass mode external calls are refused).
 * - The bridge's status (state, live-session id, attach key, active calls,
 *   localised error) and activity feed the HUD badge and the approval dialog
 *   (`owns`: is a request an external call's?).
 * - `disable()` disposes the bridge: running external calls are cancelled,
 *   their approval prompts withdrawn, the session unregistered. The app calls
 *   it when the learner turns it off or disconnects, when the encounter ends
 *   or is left, when the case changes and on `pagehide`; a session shutdown
 *   closes the bridge by itself.
 */
import { connectWorldBridge, type BridgeSession, type WorldBridge, type WorldBridgeActivity, type WorldBridgeOptions, type WorldBridgeStatus } from "@clinicalcraft/agent";
import { STANDALONE, type ServerInfo } from "./llm.js";

/** Whether this page may offer external control: served by `clinicalcraft serve` with the world bridge. */
export function externalOffered(server: ServerInfo | null, standalone: boolean = STANDALONE): boolean {
  return !standalone && !!server?.served && server.health?.worldBridge === true;
}

/** The latest external call, for the badge. */
export interface ExternalCall {
  correlationId: string;
  tool: string;
  phase: WorldBridgeActivity["phase"];
  /** Finished: whether it succeeded. */
  ok?: boolean;
}

export interface ExternalControlOptions {
  /** `connectWorldBridge` (injectable for tests). */
  connect?: (options: WorldBridgeOptions) => WorldBridge;
  /** Something to show changed (state, ids, active calls, the last call). */
  onChange?: () => void;
  /** An external call started, runs or finished. */
  onActivity?: (activity: WorldBridgeActivity) => void;
}

export class ExternalControl {
  private bridge: WorldBridge | null = null;
  private current: WorldBridgeStatus | null = null;
  private last: ExternalCall | null = null;

  constructor(private readonly o: ExternalControlOptions = {}) {}

  /** On for the running encounter (connecting, connected, reconnecting — or failed, until turned off). */
  get on(): boolean {
    return this.bridge !== null;
  }

  /** The bridge's status while on, else null. */
  get status(): WorldBridgeStatus | null {
    return this.bridge ? this.current : null;
  }

  /** The latest external call while on. */
  get lastCall(): ExternalCall | null {
    return this.bridge ? this.last : null;
  }

  /** Whether a submission (an `AgentEvent.id`, e.g. of an approval request) is an external call. */
  owns(submissionId: string): boolean {
    return !!this.bridge && this.bridge.owns(submissionId);
  }

  /** Turn external control on for `session` (the running encounter's). */
  enable(session: BridgeSession): void {
    if (this.bridge) return;
    this.last = null;
    let mine: WorldBridge | null = null;
    // Exactly what PROTOCOL §13.6 prescribes: same origin (the cookie authenticates), no `auth`, never `allowBypass`.
    const options: WorldBridgeOptions = {
      serverUrl: "",
      session,
      onStatus: (status) => {
        // the first status arrives before `connect` returns
        if (mine !== null && this.bridge !== mine) return;
        this.current = status;
        if (status.state === "closed" && mine !== null) this.drop(mine);
        this.changed();
      },
      onActivity: (activity) => {
        if (mine !== null && this.bridge !== mine) return;
        this.last = { correlationId: activity.correlationId, tool: activity.tool, phase: activity.phase, ...(activity.phase === "finished" ? { ok: activity.result.ok } : {}) };
        this.o.onActivity?.(activity);
        this.changed();
      },
    };
    mine = (this.o.connect ?? connectWorldBridge)(options);
    // A bridge that closed while connecting (the session had already ended) is not kept.
    if (this.current?.state === "closed") return;
    this.bridge = mine;
    this.changed();
  }

  /** Turn it off: cancel running external calls (their approval prompts are withdrawn) and unregister. Idempotent. */
  async disable(): Promise<void> {
    const bridge = this.bridge;
    if (!bridge) return;
    this.drop(bridge);
    this.changed();
    await bridge.dispose();
  }

  private drop(bridge: WorldBridge): void {
    if (this.bridge !== bridge) return;
    this.bridge = null;
    this.current = null;
    this.last = null;
  }

  private changed(): void {
    try {
      this.o.onChange?.();
    } catch (err) {
      console.error(err);
    }
  }
}

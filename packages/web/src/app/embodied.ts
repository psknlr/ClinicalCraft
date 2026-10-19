/**
 * The browser side of an embodied session (docs/EMBODIED.md §2, R1, R8):
 *
 *   BrowserMover   `Mover` of the world model: the avatar follows the route the world planned with the
 *                  renderer's auto-walk (arrival tolerance, local detours, WASD / abort), staff NPC rigs
 *                  walk theirs, carts are drawn where they were parked, doors open and close; the world
 *                  commits the pose the mover reports and charges the travel time once. A hidden tab
 *                  draws no frames: there a body is treated as undrawn — put at its target at once (also
 *                  a walk under way when the tab is hidden), so an external agent's `navigate_to` does
 *                  not wait for the learner to come back to the tab. WASD still stops a visible walk.
 *   BrowserCamera  `CameraSensor`: the avatar's viewport (no HUD), ≤ 768 px JPEG, rate-limited.
 *
 * Both reach the three.js world only through the `WorldApi` contract, looked up at call time (the world
 * is rebuilt on a language switch; a move in flight then stops where it was).
 */
import { PRIMARY_ACTOR, type ActorId, type CameraObservation, type CameraSensor, type EntityId, type Mover, type NavPlan, type Pose, type Vec3 } from "@clinicalcraft/world";
import type { BodyMove, WorldApi } from "../contracts.js";

type Plan = Extract<NavPlan, { ok: true }>;

export interface MoverHooks {
  /** The renderer (null: no 3D world — moves are instant, like headless). */
  renderer(): WorldApi | null;
  /** A body starts moving along `plan` (ticks pause, HUD, toasts). */
  onStart?(actorId: ActorId, plan: Plan): void;
  /** It stopped (arrived or not). */
  onEnd?(actorId: ActorId, move: BodyMove): void;
  /** The cart this move pushes (`move_to`), if any — drawn in front of the walker. */
  pushing?(actorId: ActorId): string | null;
  /** The page is hidden (`document.hidden`): no frames are drawn, so nothing would animate a walk. */
  hidden?(): boolean;
  /** Subscribe to the page becoming hidden; returns the unsubscribe. */
  onHidden?(listener: () => void): () => void;
}

/** The staff id of a `staff:<id>` actor, else null. */
export function staffIdOf(actorId: ActorId): string | null {
  return actorId.startsWith("staff:") ? actorId.slice("staff:".length) : null;
}

/** The placement id of an `eq:<id>` entity, else null. */
export function placementIdOf(entityId: EntityId): string | null {
  return entityId.startsWith("eq:") ? entityId.slice("eq:".length) : null;
}

export class BrowserMover implements Mover {
  private readonly active = new Map<ActorId, Plan>();

  constructor(private readonly hooks: MoverHooks) {}

  /** Is a body (any, or `actorId`) being moved by the world model right now? */
  isMoving(actorId?: ActorId): boolean {
    return actorId ? this.active.has(actorId) : this.active.size > 0;
  }

  /** Bodies moving now and the plans they follow. */
  moving(): { actorId: ActorId; plan: Plan }[] {
    return [...this.active].map(([actorId, plan]) => ({ actorId, plan }));
  }

  async move(actorId: ActorId, plan: Plan, signal?: AbortSignal): Promise<{ arrived: boolean; pose: Pose; replans: number }> {
    const api = this.hooks.renderer();
    const staff = staffIdOf(actorId);
    // a body the renderer does not draw (no 3D world, an `actor:*` other than the avatar): instant, as headless
    const drawn = !!api && (actorId === PRIMARY_ACTOR || (staff !== null && api.staffPose(staff) !== null));
    if (!drawn) return signal?.aborted ? { arrived: false, pose: { ...plan.target }, replans: 0 } : { arrived: true, pose: { ...plan.target }, replans: 0 };
    this.active.set(actorId, plan);
    this.hooks.onStart?.(actorId, plan);
    let result: BodyMove;
    if (this.hooks.hidden?.()) {
      // A hidden tab draws no frames: the body is put at its target at once, as an undrawn one would be.
      result = this.place(api!, actorId, staff, plan, signal);
      this.active.delete(actorId);
      this.hooks.onEnd?.(actorId, result);
      return { arrived: result.arrived, pose: { ...result.pose }, replans: result.replans };
    }
    const cart = this.hooks.pushing?.(actorId) ?? null;
    if (cart) api!.pushEquipment(cart, staff ?? "avatar");
    // The walk stops when the caller cancels — or when the tab is hidden, and then the move completes without frames.
    const walk = new AbortController();
    let hid = false;
    const onAbort = () => walk.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) walk.abort();
    const offHidden =
      this.hooks.onHidden?.(() => {
        hid = true;
        walk.abort();
      }) ?? (() => undefined);
    try {
      result =
        actorId === PRIMARY_ACTOR
          ? await api!.followRoute(plan.path, { yaw: plan.target.yaw, signal: walk.signal })
          : await api!.walkStaff(staff!, plan.path, { yaw: plan.target.yaw, signal: walk.signal });
    } catch {
      const p = actorId === PRIMARY_ACTOR ? api!.position : api!.staffPose(staff!);
      result = { arrived: false, pose: p ? { x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, level: p.level } : { ...plan.target }, replans: 0 };
    } finally {
      offHidden();
      signal?.removeEventListener("abort", onAbort);
      if (cart) this.hooks.renderer()?.pushEquipment(cart, null);
    }
    if (hid && !result.arrived && !signal?.aborted) {
      const now = this.hooks.renderer();
      if (now) result = this.place(now, actorId, staff, plan, signal);
    }
    this.active.delete(actorId);
    this.hooks.onEnd?.(actorId, result);
    return { arrived: result.arrived, pose: { ...result.pose }, replans: result.replans };
  }

  /** Put a body at its target without animating it (a hidden tab); a cancelled move does not arrive. */
  private place(api: WorldApi, actorId: ActorId, staff: string | null, plan: Plan, signal?: AbortSignal): BodyMove {
    const t = plan.target;
    if (signal?.aborted) {
      const p = actorId === PRIMARY_ACTOR ? api.position : api.staffPose(staff!);
      return { arrived: false, pose: p ? { x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, level: p.level } : { ...t }, replans: 0 };
    }
    if (actorId === PRIMARY_ACTOR) api.teleport(t.x, t.z, t.yaw, t.level);
    else api.placeStaff(staff!, { x: t.x, y: t.y, z: t.z, yaw: t.yaw, pitch: t.pitch, level: t.level });
    return { arrived: true, pose: { ...t }, replans: 0 };
  }

  placeEntity(entityId: EntityId, position: (Vec3 & { level: string; rot?: number }) | null): void {
    const id = placementIdOf(entityId);
    if (!id) return;
    this.hooks.renderer()?.placeEquipment(id, position ? { x: position.x, y: position.y, z: position.z, level: position.level, ...(position.rot !== undefined ? { rot: position.rot } : {}) } : null);
  }

  setDoor(entityId: EntityId, open: boolean): void {
    this.hooks.renderer()?.setDoor(entityId, open);
  }
}

export interface CameraHooks {
  renderer(): WorldApi | null;
  /** The simulated minute (engine clock). */
  clock(): number;
  /** Wall clock (ms); injectable for tests. */
  now?(): number;
  /** Minimum interval between two captures (default 1000 ms): a model asking twice in a row waits. */
  minIntervalMs?: number;
}

/** `CameraSensor` over the renderer: the avatar's viewport only. */
export class BrowserCamera implements CameraSensor {
  private last = -Infinity;
  private pending: Promise<CameraObservation | null> | null = null;

  constructor(private readonly hooks: CameraHooks) {}

  /** Captures taken so far (QA). */
  captures = 0;

  frame(actorId: ActorId, opts: { maxWidth: number; quality: number }): Promise<CameraObservation | null> {
    // the browser draws one camera: the avatar's
    if (actorId !== PRIMARY_ACTOR) return Promise.resolve(null);
    if (this.pending) return this.pending;
    const now = () => this.hooks.now?.() ?? Date.now();
    const wait = this.last + (this.hooks.minIntervalMs ?? 1000) - now();
    const run = async (): Promise<CameraObservation | null> => {
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      const shot = this.hooks.renderer()?.captureFrame({ maxWidth: Math.min(768, Math.max(16, opts.maxWidth || 768)), quality: opts.quality }) ?? null;
      this.last = now();
      if (!shot) return null;
      this.captures++;
      return { mimeType: shot.mimeType, imageData: shot.data, width: shot.width, height: shot.height, clock: this.hooks.clock(), timestamp: now(), cameraPose: { ...shot.pose } };
    };
    this.pending = run().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }
}

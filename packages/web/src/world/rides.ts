/**
 * Elevator rides in a voxel world (EMBODIED R10): `E` on a panel outside calls the car (its door opens), inside
 * the UI offers the levels; a ride closes the car door, moves the car — the view dims and the avatar is moved
 * to the same spot of the car on the destination level half-way — and opens the door there. One ride at a
 * time; it never starts with a door leaf closing on the avatar.
 */
import type { DoorRecord } from "./context.js";
import { inCar, type Elevator, type ElevatorStop, type ElevatorTarget } from "./elevator.js";
import { overlapsXZ, PHYSICS } from "./physics.js";
import { EXPOSURE } from "./stage.js";
import type { VoxelWorld } from "./voxel-world.js";

/** Elevator ride in progress: doors close, the car moves (view dimmed, the avatar moved half-way), doors open. */
interface Ride {
  elevator: Elevator;
  from: ElevatorStop;
  to: ElevatorStop;
  phase: "closing" | "moving" | "opening";
  /** Seconds in the current phase. */
  t: number;
  /** Seconds the car moves. */
  duration: number;
  moved: boolean;
  resolve: () => void;
  reject: (e: Error) => void;
}

/** Ride timing (s): doors closing, doors opening, and the move (base + per metre of rise). */
const RIDE = { close: 0.7, open: 0.45, base: 1.1, perMetre: 0.12 } as const;

/** An elevator's stop on a level, or null. */
export const stopOn = (el: Elevator, lv: string) => el.stops.find((s) => s.level === lv) ?? null;

/** The elevator rides of one world. */
export class ElevatorRides {
  /** The ride in progress, or null. */
  current: Ride | null = null;

  constructor(private readonly world: VoxelWorld) {}

  private elevatorById(id: string): Elevator | null {
    return this.world.elevators.find((e) => e.id === id) ?? null;
  }

  /** Would the (sliding) car door, closing, hit the avatar? (its leaves' closed boxes overlap the avatar's disc) */
  private inDoorLeaves(door: DoorRecord): boolean {
    const { player } = this.world;
    return door.leaves.some((l) => overlapsXZ(player, l.collider, PHYSICS.radius + 0.05));
  }

  /** E on an elevator panel: outside, call the car (its door opens); inside, the UI offers the levels. */
  panel(t: ElevatorTarget): void {
    const world = this.world;
    const { callbacks, S, player } = world;
    if (this.current) {
      callbacks.onToast(S.elevatorBusy);
      return;
    }
    const el = this.elevatorById(t.connectorId);
    const stop = el ? stopOn(el, t.level) : null;
    if (!el || !stop) return;
    if (!t.inside) {
      if (stop.door && !stop.door.open) world.doors.toggle(stop.door, true);
      callbacks.onSound("beep");
      world.toast(S.elevatorArrived);
      return;
    }
    if (!inCar(stop, player.x, player.z)) {
      callbacks.onToast(S.elevatorOutside);
      return;
    }
    callbacks.onInteract(t);
  }

  /** Ride from the avatar's level to `to` (`WorldApi.rideElevator`): rejects unless the avatar is in the car. */
  ride(connectorId: string, to: string): Promise<void> {
    const world = this.world;
    const { S, player } = world;
    return new Promise<void>((resolve, reject) => {
      if (world.disposed) return reject(new Error("disposed"));
      if (this.current) return reject(new Error(S.elevatorBusy));
      const el = this.elevatorById(connectorId);
      const dest = el ? stopOn(el, to) : null;
      if (!el || !dest) return reject(new Error(`unknown elevator stop "${connectorId}" → "${to}"`));
      const from = stopOn(el, world.currentLevel());
      if (!from || !inCar(from, player.x, player.z)) return reject(new Error(S.elevatorOutside));
      if (from.door && this.inDoorLeaves(from.door)) return reject(new Error(S.leaveDoor[0]));
      if (from === dest) {
        if (dest.door && !dest.door.open) world.doors.toggle(dest.door, true);
        return resolve();
      }
      world.keys = {};
      if (from.door?.open) world.doors.toggle(from.door, false);
      this.current = { elevator: el, from, to: dest, phase: "closing", t: 0, duration: RIDE.base + Math.abs(dest.elevation - from.elevation) * RIDE.perMetre, moved: false, resolve, reject };
    });
  }

  /** Advance a ride: doors close → the car moves (view dimmed; the avatar is moved half-way) → doors open → done. */
  update(dt: number): void {
    const world = this.world;
    const { stage, player, callbacks, levels, locale } = world;
    const renderer = stage.renderer;
    const r = this.current;
    if (!r) return;
    r.t += dt;
    if (r.phase === "closing") {
      if (r.t < RIDE.close) return;
      r.phase = "moving";
      r.t = 0;
    }
    if (r.phase === "moving") {
      const k = Math.min(1, r.t / r.duration);
      renderer.toneMappingExposure = EXPOSURE * (1 - 0.6 * Math.sin(Math.PI * k));
      if (!r.moved && k >= 0.5) {
        r.moved = true;
        // the same spot of the car on the destination level
        world.teleportTo(player.x + (r.to.x - r.from.x), player.z + (r.to.z - r.from.z), player.y + (r.to.elevation - r.from.elevation));
        world.culling.cull(true);
        world.lights.assign(player.x, player.z, true, player.y);
      }
      if (k < 1) return;
      renderer.toneMappingExposure = EXPOSURE;
      r.phase = "opening";
      r.t = 0;
      if (r.to.door && !r.to.door.open) world.doors.toggle(r.to.door, true);
      callbacks.onSound("beep");
      return;
    }
    if (r.t < RIDE.open) return;
    this.current = null;
    callbacks.onToast(r.elevator.name, levels.name(r.to.level, locale));
    r.resolve();
  }

  /** Stop a ride at once (teleport, reset, dispose): its promise rejects with `err`. */
  cancel(err: Error): void {
    const r = this.current;
    if (!r) return;
    this.current = null;
    this.world.stage.renderer.toneMappingExposure = EXPOSURE;
    r.reject(err);
  }
}

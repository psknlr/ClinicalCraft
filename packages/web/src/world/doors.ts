/**
 * Doors of a voxel world: opening and closing a door record (both leaves of a double door, with their leaf
 * colliders and the door's sound), who stands in a doorway (a door never shuts on the player or a walker), the
 * doors a world-model walk opened closing behind it, and the world model's door state (`WorldApi.setDoor`,
 * `setDoorLocked`: a locked door closes and stays shut).
 */
import type { DoorRecord, NpcRecord } from "./context.js";
import { PHYSICS } from "./physics.js";
import { setDoorOpen } from "./structures.js";
import type { VoxelWorld } from "./voxel-world.js";

/** The doors of one world. */
export class Doors {
  constructor(private readonly world: VoxelWorld) {}

  /** Open or close a door (`force`: the state to set, default the other one); `sound` plays the door sound. */
  toggle(door: DoorRecord, force?: boolean, sound = true): void {
    const open = force ?? !door.open;
    if (open === door.open) return;
    setDoorOpen(door, open, this.world.locale);
    if (sound) this.world.callbacks.onSound("door");
  }

  /** Is the player in this door's doorway (on its level)? */
  playerInDoorway(door: DoorRecord): boolean {
    const world = this.world;
    const { player, levels } = world;
    const a = door.area;
    if (levels.multi && door.level !== world.currentLevel()) return false;
    return player.x + PHYSICS.radius > a.minX && player.x - PHYSICS.radius < a.maxX && player.z + PHYSICS.radius > a.minZ && player.z - PHYSICS.radius < a.maxZ;
  }

  /** Is anybody (the player, a walking or standing NPC) in a doorway — `except` left out? */
  doorwayOccupied(d: DoorRecord, except: NpcRecord | null): boolean {
    const world = this.world;
    const { player, levels, ctx } = world;
    if ((!levels.multi || d.level === world.currentLevel()) && inDoorway(d, player.x, player.z)) return true;
    for (const n of ctx.npcs.values()) if (n !== except && n.level === d.level && inDoorway(d, n.x, n.z, 0.35)) return true;
    return false;
  }

  /** Close the doors a world-model walk opened once the avatar is past them and nobody stands in them. */
  closeBehind(opened: Set<DoorRecord>): void {
    const world = this.world;
    const { player, levels } = world;
    for (const d of [...opened]) {
      if ((!levels.multi || d.level === world.currentLevel()) && Math.hypot(d.centre.x - player.x, d.centre.z - player.z) < 3) continue;
      if (this.doorwayOccupied(d, null)) continue;
      if (d.open) this.toggle(d, false);
      opened.delete(d);
    }
  }

  /** A door record by renderer id (`door:` prefix accepted). */
  byId(id: string): DoorRecord | null {
    return this.world.ctx.doors.find((d) => d.id === (id.startsWith("door:") ? id.slice("door:".length) : id)) ?? null;
  }

  /** `WorldApi.setDoor`: a locked door does not open, and a leaf never shuts on the player. */
  set(doorId: string, open: boolean): void {
    const { player } = this.world;
    const d = this.byId(doorId);
    if (!d || d.open === open) return;
    if (open && d.locked) return;
    // never shut a leaf on the player
    if (!open && this.doorwayOccupied(d, null)) return;
    this.toggle(d, open, Math.hypot(d.centre.x - player.x, d.centre.z - player.z) < 8);
  }

  /** `WorldApi.setDoorLocked`: a locked door closes (unless somebody stands in it) and stays shut. */
  setLocked(doorId: string, locked: boolean): void {
    const { player } = this.world;
    const d = this.byId(doorId);
    if (!d) return;
    d.locked = locked || undefined;
    if (locked && d.open && !this.doorwayOccupied(d, null)) this.toggle(d, false, Math.hypot(d.centre.x - player.x, d.centre.z - player.z) < 8);
  }

  /** Every door shut at once, leaves back at rest (`WorldApi.reset`). */
  shutAll(): void {
    const { ctx, locale } = this.world;
    for (const d of ctx.doors) {
      setDoorOpen(d, false, locale);
      for (const l of d.leaves) {
        if (l.mode === "swing") l.pivot.rotation.y = 0;
        else l.pivot.position.x = l.baseX ?? 0;
      }
    }
  }
}

/** Is (x, z) in a door's doorway area (± a body radius)? */
function inDoorway(d: DoorRecord, x: number, z: number, r: number = PHYSICS.radius): boolean {
  const a = d.area;
  return x + r > a.minX && x - r < a.maxX && z + r > a.minZ && z - r < a.maxZ;
}

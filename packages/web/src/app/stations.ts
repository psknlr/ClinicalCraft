/**
 * Spatial clinical rules of the web world (docs/FACILITIES.md "Interaction
 * semantics"): which investigations a workstation can retrieve, what a device
 * can do, which capabilities are at the patient's bedside, and where to go
 * for something that is not available here.
 */
import { BEDSIDE_RADIUS, DELIVERED_CAPABILITIES } from "@clinicalcraft/world";
import {
  entityLevel,
  facilityLevels,
  mergeCatalogs,
  PERSONAL_KIT,
  placementCapabilities,
  rectContains,
  t,
  type CaseDefinition,
  type EquipmentCatalog,
  type EquipmentType,
  type FacilityDefinition,
  type Intervention,
  type Investigation,
  type Placement,
} from "@clinicalcraft/core";

/** Bedside radius around the patient slot (m) — the world policy's (`@clinicalcraft/world`). */
export { BEDSIDE_RADIUS };

export interface StationRef {
  placementId: string;
  label: string;
  x: number;
  z: number;
  kind: string;
  capabilities: string[];
  /** Level of the placement (multi-level facilities only). */
  level?: string;
}

export class Stations {
  private readonly equipment: Map<string, EquipmentType>;

  constructor(
    readonly facility: FacilityDefinition,
    readonly catalogs: EquipmentCatalog[],
  ) {
    this.equipment = mergeCatalogs(catalogs).equipment;
  }

  type(placement: Placement): EquipmentType | undefined {
    return this.equipment.get(placement.type);
  }

  placement(id: string): Placement | undefined {
    return this.facility.placements.find((p) => p.id === id);
  }

  kindOf(placement: Placement): string {
    return this.type(placement)?.interaction.kind ?? "none";
  }

  label(placement: Placement, locale: string): string {
    return t(placement.label ?? this.type(placement)?.name ?? placement.id, locale);
  }

  caps(placementId: string): string[] {
    return placementCapabilities(this.facility, this.catalogs, placementId);
  }

  /** Level of a placement in a multi-level facility (undefined in a single-level one). */
  levelOf(placement: Placement): string | undefined {
    return facilityLevels(this.facility).length > 1 ? entityLevel(this.facility, placement) : undefined;
  }

  ref(placement: Placement, locale: string): StationRef {
    const level = this.levelOf(placement);
    return { placementId: placement.id, label: this.label(placement, locale), x: placement.x, z: placement.z, kind: this.kindOf(placement), capabilities: this.caps(placement.id), ...(level ? { level } : {}) };
  }

  /** Placements an investigation can be retrieved/performed at (workstations and devices providing every required capability). */
  providersOf(requires: readonly string[]): Placement[] {
    if (!requires.length) return [];
    return this.facility.placements.filter((p) => {
      const kind = this.kindOf(p);
      if (kind !== "workstation" && kind !== "device" && kind !== "monitor") return false;
      const caps = this.caps(p.id);
      return requires.every((r) => caps.includes(r));
    });
  }

  /** Nearest provider of `requires` from a point. */
  nearestProvider(requires: readonly string[], from: { x: number; z: number }, locale: string): StationRef | null {
    let best: { p: Placement; d: number } | null = null;
    for (const p of this.providersOf(requires)) {
      const d = Math.hypot(p.x - from.x, p.z - from.z);
      if (!best || d < best.d) best = { p, d };
    }
    return best ? this.ref(best.p, locale) : null;
  }

  /** Investigations a workstation/device placement can retrieve (requires ⊆ caps). */
  investigationsAt(c: CaseDefinition, placementId: string): Investigation[] {
    const caps = this.caps(placementId);
    return c.investigations.filter((i) => i.requires.length > 0 && i.requires.every((r) => caps.includes(r)));
  }

  /** Device actions: investigations and interventions whose `requires` intersect the device capabilities. */
  deviceActions(c: CaseDefinition, placementId: string): { investigations: Investigation[]; interventions: Intervention[] } {
    const caps = this.caps(placementId);
    const hit = (req: readonly string[]) => req.some((r) => caps.includes(r));
    return { investigations: c.investigations.filter((i) => hit(i.requires)), interventions: c.interventions.filter((i) => hit(i.requires)) };
  }

  /** The patient's room id (from the slot). */
  slotRoom(slotId: string | null): string | null {
    return this.facility.patientSlots.find((s) => s.id === slotId)?.room ?? null;
  }

  /** True when a placement is at the bedside of `slotId` (same room, or within BEDSIDE_RADIUS of the slot). */
  atBedside(placement: Placement, slotId: string | null): boolean {
    const slot = this.facility.patientSlots.find((s) => s.id === slotId);
    if (!slot) return false;
    if (Math.hypot(placement.x - slot.x, placement.z - slot.z) <= BEDSIDE_RADIUS) return true;
    if (placement.room) return placement.room === slot.room;
    const room = this.facility.rooms.find((r) => r.id === slot.room);
    return !!room && rectContains(room.rect, placement.x, placement.z);
  }

  /**
   * Capabilities available at the patient's bedside (room or ≤ 6 m) plus the personal kit — and, as the
   * world policy counts them (EMBODIED §6), the delivered capabilities (`DELIVERED_CAPABILITIES`: pharmacy
   * drugs, blood products are brought to the bedside) that any placement of the facility provides. Embodied
   * mode uses the world's own view instead (carts where they stand now: `EmbodiedLink.bedsideCaps`).
   */
  bedsideCaps(slotId: string | null): Set<string> {
    const caps = new Set<string>(PERSONAL_KIT);
    for (const p of this.facility.placements) {
      const own = this.caps(p.id);
      for (const cap of own) if (DELIVERED_CAPABILITIES.includes(cap)) caps.add(cap);
      if (!this.atBedside(p, slotId)) continue;
      for (const cap of own) caps.add(cap);
    }
    return caps;
  }
}

/** Missing capabilities of `requires` given what is available. */
export function missingCaps(requires: readonly string[], available: ReadonlySet<string>): string[] {
  return requires.filter((r) => !available.has(r));
}

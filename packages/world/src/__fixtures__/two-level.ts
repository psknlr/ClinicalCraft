/**
 * Synthetic two-level facility (tests only): a 24 × 16 m block spanning L0
 * (elevation 0) and L1 (elevation 4.5) joined by stairs (east) and an
 * elevator (west). L1 has a ward (patient on a bed, ECG cart) and an office
 * behind a door; L0 has a hall, a pharmacy store restricted to pharmacists
 * and a staff-only stairs.
 *
 *   L0:  ┌──────────── block ────────────┐      L1: ┌──── ward ────┬─ office ─┐
 *        │ lift(-9,-5)   hall   stairs(9,-5)│         │ lift   bed    │ door  st │
 *        │ [store: pharmacist] x −12…−6 z 2…8 │      │       ecg     │          │
 *        └────────── double door s ──────┘          └──────────────┴──────────┘
 */
import type { FacilityInput } from "@clinicalcraft/core";

export function twoLevelInput(): FacilityInput {
  return {
    schema: "clinicalcraft/facility@1",
    id: "two-level",
    name: { "zh-CN": "双层测试楼", en: "Two-level test block" },
    description: { "zh-CN": "测试", en: "Test" },
    bounds: { minX: -20, maxX: 20, minZ: -16, maxZ: 16 },
    spawn: { x: 0, z: 12, yaw: 0 },
    catalogs: ["core-furniture", "core-clinical"],
    levels: [
      { id: "L0", name: { "zh-CN": "一层", en: "Ground floor" } },
      { id: "L1", name: { "zh-CN": "二层", en: "First floor" }, elevation: 4.5, height: 4.5 },
    ],
    buildings: [
      {
        id: "block",
        name: { "zh-CN": "住院楼", en: "Ward block" },
        rect: { x: 0, z: 0, w: 24, d: 16 },
        levels: ["L0", "L1"],
        walls: { height: 4.5, thickness: 0.5 },
        openings: [{ side: "s", kind: "double-door", width: 3, offset: 0 }],
      },
    ],
    rooms: [
      { id: "hall", name: { "zh-CN": "大厅", en: "Hall" }, kind: "waiting", building: "block", rect: { x: 0, z: 0, w: 24, d: 16 } },
      {
        id: "store",
        name: { "zh-CN": "药库", en: "Pharmacy store" },
        kind: "pharmacy",
        building: "block",
        rect: { x: -9, z: 5, w: 6, d: 6 },
        // west and south sides are the building walls
        partitions: [
          { side: "n", openings: [{ kind: "door", width: 1.6, offset: 0 }] },
          { side: "e" },
        ],
      },
      {
        id: "ward",
        name: { "zh-CN": "病房", en: "Ward" },
        kind: "ward",
        building: "block",
        level: "L1",
        rect: { x: -4, z: 0, w: 16, d: 16 },
        partitions: [{ side: "e", openings: [{ kind: "door", width: 1.6, offset: 4 }] }],
      },
      { id: "office", name: { "zh-CN": "办公室", en: "Office" }, kind: "office", building: "block", level: "L1", rect: { x: 8, z: 0, w: 8, d: 16 } },
    ],
    placements: [
      { id: "store-shelves", type: "cabinet", x: -9, z: 7.2, room: "store" },
      { id: "ward-bed", type: "hospital-bed", x: -4, z: -4, room: "ward" },
      { id: "ward-ecg", type: "ecg-machine", x: -1.5, z: -5, room: "ward" },
      { id: "ward-monitor", type: "patient-monitor", x: -5.2, z: -6.3, room: "ward" },
      { id: "office-desk", type: "desk", x: 9, z: 5, room: "office" },
    ],
    patientSlots: [{ id: "ward-1", room: "ward", x: -4, z: -4, posture: "lying", bed: "ward-bed", accepts: ["ward"], monitor: "ward-monitor" }],
    staff: [{ id: "ward-nurse", role: "nurse", name: { "zh-CN": "王护士", en: "Nurse Wang" }, room: "ward", x: 0, z: 3 }],
    connectors: [
      {
        id: "stairs",
        kind: "stairs",
        name: { "zh-CN": "楼梯", en: "Stairs" },
        stops: [
          { level: "L0", x: 9, z: -5 },
          { level: "L1", x: 9, z: -5 },
        ],
      },
      {
        id: "lift",
        kind: "elevator",
        name: { "zh-CN": "电梯", en: "Elevator" },
        stops: [
          { level: "L0", x: -9, z: -5 },
          { level: "L1", x: -9, z: -5 },
        ],
        travelSeconds: 30,
      },
    ],
    access: [{ id: "store-zone", name: { "zh-CN": "药库限制区", en: "Pharmacy store (restricted)" }, rect: { x: -9, z: 5, w: 6, d: 6 }, roles: ["pharmacist"] }],
  };
}

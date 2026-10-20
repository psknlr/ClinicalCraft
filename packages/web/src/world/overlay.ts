/**
 * What a voxel world draws for the player rather than of the facility: the first-person hand (V4) holding the
 * selected block, the outline around the aimed target or block, and the golden waypoint beacon over the
 * current objective's destination, with its label (`WorldApi.setWaypoint`).
 */
import { BoxGeometry, Color, EdgesGeometry, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial, type Material, type Object3D, type Vector3 } from "three";
import type { WorldPoint } from "../contracts.js";
import { UNIT_BOX } from "./voxels.js";
import type { VoxelWorld } from "./voxel-world.js";

/** Hand, highlight and waypoint beacon of one world. */
export class Overlay {
  /** The first-person hand (a child of the camera). */
  readonly hand: Group;
  /** The block in the hand (hotbar block slots). */
  readonly held: Mesh;
  /** The outline around the aimed target or block. */
  readonly highlight: LineSegments;
  readonly beacon: Group;
  /** The current waypoint (the beacon's destination), or null. */
  waypoint: (WorldPoint & { label: string }) | null = null;
  private readonly beaconMat: MeshBasicMaterial;
  private readonly marker: Mesh;
  private beaconLabel: Object3D | null = null;

  constructor(private readonly world: VoxelWorld) {
    const { stage, lib } = world;
    const { camera, scene } = stage;
    /* ---------------- hand, highlight, beacon ---------------- */
    const hand = new Group();
    this.hand = hand;
    camera.add(hand);
    hand.position.set(0.4, -0.39, -0.58);
    hand.rotation.set(-0.12, -0.17, -0.2);
    const handMesh = (mat: Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      const m = new Mesh(UNIT_BOX, mat);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      hand.add(m);
      return m;
    };
    handMesh(lib.get("skin"), 0, 0, 0, 0.16, 0.27, 0.18);
    handMesh(lib.get("white"), 0, -0.22, 0, 0.19, 0.2, 0.21);
    const held = new Mesh(UNIT_BOX, lib.get("wood"));
    this.held = held;
    held.scale.setScalar(0.22);
    held.position.set(-0.02, 0.2, -0.01);
    held.visible = false;
    hand.add(held);

    const highlight = new LineSegments(new EdgesGeometry(new BoxGeometry(1.01, 1.01, 1.01)), new LineBasicMaterial({ color: "#faf6cf", transparent: true, opacity: 0.85 }));
    this.highlight = highlight;
    highlight.visible = false;
    scene.add(highlight);

    const beacon = new Group();
    this.beacon = beacon;
    beacon.visible = false;
    const beaconMat = new MeshBasicMaterial({ color: "#ffd25e", transparent: true, opacity: 0.34, depthWrite: false, fog: false });
    this.beaconMat = beaconMat;
    const pillar = new Mesh(UNIT_BOX, beaconMat);
    pillar.scale.set(0.55, 40, 0.55);
    pillar.position.y = 20;
    beacon.add(pillar);
    const marker = new Mesh(UNIT_BOX, new MeshStandardMaterial({ color: "#e7c36b", emissive: new Color("#e7c36b"), emissiveIntensity: 0.6, roughness: 0.5 }));
    this.marker = marker;
    marker.scale.setScalar(0.42);
    marker.rotation.set(Math.PI / 4, 0, Math.PI / 4);
    beacon.add(marker);
    scene.add(beacon);
  }

  /** `WorldApi.setWaypoint`: the beacon (and its label) over the destination on its level's floor, or hidden. */
  setWaypoint(target: (WorldPoint & { label: string }) | null): void {
    const { levels, level, signs } = this.world;
    const beacon = this.beacon;
    this.waypoint = target;
    if (this.beaconLabel) {
      this.beaconLabel.removeFromParent();
      this.beaconLabel = null;
    }
    if (!target) {
      beacon.visible = false;
      return;
    }
    beacon.visible = true;
    beacon.position.set(target.x, levels.elevation(target.level ?? level), target.z);
    if (target.label) {
      this.beaconLabel = signs.make(target.label, Math.min(3.2, Math.max(1.8, target.label.length * 0.32)), "#c68836");
      beacon.add(this.beaconLabel);
    }
  }

  /** Bob, spin and pulse the visible beacon; its label faces the camera at `cam` (each frame). */
  animateBeacon(now: number, cam: Vector3): void {
    const { beacon, marker, beaconLabel } = this;
    if (beacon.visible) {
      marker.position.y = 3.1 + Math.sin(now * 0.003) * 0.25;
      marker.rotation.y = now * 0.0015;
      if (beaconLabel) {
        beaconLabel.position.y = 4.1 + Math.sin(now * 0.003) * 0.25;
        beaconLabel.rotation.y = Math.atan2(cam.x - beacon.position.x, cam.z - beacon.position.z);
      }
      this.beaconMat.opacity = 0.3 + 0.08 * Math.sin(now * 0.004);
    }
  }
}

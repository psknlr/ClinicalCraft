#!/usr/bin/env node
/**
 * Visual QA for the voxel world (requires the dev server):
 *
 *   cd packages/web && npx vite --port 5199 --strictPort &
 *   node scripts/qa-world.mjs [--facility clinic-v4] [--out <dir>] [--base http://localhost:5199]
 *                             [--only spawn,front] [--extras 0] [--quality high]
 *
 * Teleports to the V4 reference camera positions (same yaw/pitch semantics:
 * camera.rotation.order "YXZ", rotation.set(pitch, yaw, 0)) and saves
 * world-<facility>-<name>.png, plus a monitor close-up, the big map, the
 * minimap and the anatomy atlas. Prints a JSON summary (errors, stats,
 * per-shot draw calls — `steady` is renderer.info.render.calls of a normal
 * frame, `shadowPass` the extra calls of a frame that refreshes the shadow
 * map — functional checks, walkTo smoke test).
 *
 * Start the dev server with CLINICALCRAFT_QA=1 (no reloads while content
 * files change) and restart it after editing code: QA mode does not watch.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("@playwright/test"));
} catch {
  ({ chromium } = await import(path.resolve(here, "../../../node_modules/@playwright/test/index.mjs")));
}

const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : def;
};
const base = arg("base", "http://localhost:5199");
const facility = arg("facility", "clinic-v4");
const out = arg("out", "/tmp/claude-0/-home-user-ClinicalCraft/61c17a21-a923-5d20-a08c-1c8a508459b0/scratchpad/qa");
const only = (arg("only", "") || "").split(",").filter(Boolean);
const extras = arg("extras", "1") !== "0";
const quality = arg("quality", "high");
const patients = arg("patients", "all");
fs.mkdirSync(out, { recursive: true });

/** V4 reference shots: [name, x, z, y, yaw, pitch] (scratchpad/v4ref/*.png). */
export const SHOTS = [
  ["01-spawn", 0, 19, 0, 0, 0.05],
  ["02-front", 0, 12, 0, 0, 0.12],
  ["03-corridor", 0, 6, 0, 0, 0.0],
  ["04-consult", -5.5, 4.5, 0, 1.0, -0.1],
  ["05-lab", -8, -3.5, 0, 0, -0.15],
  ["06-imaging", 5.5, 4, 0, -1.4, -0.1],
  ["07-path", 8, -3.6, 0, 0, -0.15],
  ["08-board", -1, -7, 0, 0.25, -0.05],
  ["09-garden", -12, 22, 0, 0.9, 0.05],
  ["10-buildzone", 19, 14, 0, 0.3, -0.15],
  ["11-overview", 0, 34, 7, 0, -0.25],
];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${String(e)}`));
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`);
});
const summary = { facility, shots: [], errors, stats: null, issues: null };
try {
  const url = `${base}/world-harness.html?facility=${encodeURIComponent(facility)}&patients=${patients}&quality=${quality}&pointer=0`;
  await page.goto(url, { timeout: 120000 });
  await page.waitForFunction(() => window.__READY__ === true, null, { timeout: 180000 });
  summary.facilityLoaded = await page.evaluate(() => window.__HARNESS__.facility.id);
  summary.issues = await page.evaluate(() => window.__HARNESS__.issues);
  await page.evaluate(() => window.__WORLD__.debug.freeze(true));
  const tag = summary.facilityLoaded;
  // V4 reference positions for V4-layout facilities; otherwise derive shots from the facility data
  const v4Layout = ["clinic-v4", "test-clinic"].includes(tag) && arg("shots", "v4") === "v4";
  const shots = v4Layout
    ? SHOTS
    : await page.evaluate(() => {
        const f = window.__HARNESS__.facility;
        const out = [];
        const sp = f.spawn;
        out.push(["01-spawn", sp.x, sp.z, 0, sp.yaw ?? 0, 0.05]);
        const cx = (f.bounds.minX + f.bounds.maxX) / 2;
        const back = Math.min(f.bounds.maxZ - 1, sp.z + 14);
        out.push(["02-overview", cx, back, 14, 0, -0.42]);
        const rooms = f.rooms.filter((r) => !["corridor", "garden", "build-zone"].includes(r.kind));
        let i = 3;
        for (const r of rooms.slice(0, 12)) {
          // stand inside the room near its south edge, looking north (−Z)
          const z = r.rect.z + r.rect.d / 2 - Math.min(1.2, r.rect.d / 4);
          out.push([`${String(i++).padStart(2, "0")}-room-${r.id}`, r.rect.x, z, 0, 0, -0.18]);
        }
        return out;
      });
  for (const [name, x, z, y, yaw, pitch] of shots) {
    if (only.length && !only.some((o) => name.includes(o))) continue;
    await page.evaluate(([x, z, y, yaw, pitch]) => window.__WORLD__.debug.teleport(x, z, y, yaw, pitch), [x, z, y, yaw, pitch]);
    await page.waitForTimeout(900);
    const file = path.join(out, `world-${tag}-${name}.png`);
    await page.screenshot({ path: file });
    const target = await page.evaluate(() => window.__WORLD__.debug.target?.name ?? null);
    const draws = await page.evaluate(() => window.__WORLD__.debug.drawCalls?.() ?? null);
    summary.shots.push({ name, file, target, draws });
  }
  // NPC shots: stand in front of every patient slot / staff member (max 6) and look at them
  const npcs = await page.evaluate(() => {
    const f = window.__HARNESS__.facility;
    const out = [];
    // one slot per (posture, bed type) first, then the rest, max 6
    const key = (s) => `${s.posture}:${f.placements.find((p) => p.id === s.bed)?.type ?? "-"}`;
    const seen = new Set();
    const first = f.patientSlots.filter((s) => !seen.has(key(s)) && seen.add(key(s)));
    const picked = [...first, ...f.patientSlots.filter((s) => !first.includes(s))].slice(0, 6);
    for (const s of picked) {
      const bed = s.bed ? f.placements.find((p) => p.id === s.bed) : null;
      const lying = s.posture === "lying" && bed;
      const rot = lying ? bed.rot ?? 0 : s.rot ?? 0;
      // lying patients are shot from the bed side (local +X), others from the front
      out.push({ name: `slot-${s.id}`, x: lying ? bed.x : s.x, z: lying ? bed.z : s.z, rot: lying ? rot + 90 : rot, dist: lying ? 2.4 : 2.2, y: lying ? 0.9 : 1.1 });
    }
    for (const st of (f.staff ?? []).slice(0, 2)) out.push({ name: `staff-${st.id}`, x: st.x, z: st.z, rot: st.rot ?? 0, dist: 2.2, y: 1.2 });
    return out;
  });
  for (const n of npcs) {
    if (only.length && !only.some((o) => n.name.includes(o))) continue;
    const a = (n.rot * Math.PI) / 180;
    const fx = Math.sin(a), fz = Math.cos(a);
    const px = n.x + fx * n.dist + fz * 0.6, pz = n.z + fz * n.dist - fx * 0.6;
    const yaw = Math.atan2(px - n.x, pz - n.z);
    const pitch = -Math.atan2(1.62 - n.y, n.dist);
    await page.evaluate(([x, z, yaw, pitch]) => window.__WORLD__.debug.teleport(x, z, 0, yaw, pitch), [px, pz, yaw, pitch]);
    await page.waitForTimeout(900);
    const file = path.join(out, `world-${tag}-${n.name}.png`);
    await page.screenshot({ path: file });
    summary.shots.push({ name: n.name, file, target: await page.evaluate(() => window.__WORLD__.debug.target?.name ?? null), draws: await page.evaluate(() => window.__WORLD__.debug.drawCalls?.() ?? null) });
  }
  summary.stats = await page.evaluate(() => window.__WORLD__.debug.stats());
  const dc = summary.shots.map((s) => s.draws).filter(Boolean);
  if (dc.length) summary.drawCalls = { maxSteady: Math.max(...dc.map((d) => d.steady)), maxWithShadowRefresh: Math.max(...dc.map((d) => d.withShadows)) };
  if (extras) {
    // monitor close-up in the world (first linked monitor)
    const mon = await page.evaluate(() => {
      const w = window.__WORLD__;
      const sc = w.debug.screens.find((s) => s.kind === "vitals" || s.kind === "ecg");
      if (!sc) return null;
      const p = w.locate(sc.placementId);
      return { id: sc.placementId, x: sc.x, z: sc.z, p };
    });
    if (mon) {
      // stand 1.1 m in front of the monitor, facing it
      const info = await page.evaluate((id) => {
        const w = window.__WORLD__;
        const pl = [...w.debug.targets.values()].find((t) => t.id === id);
        return pl ? { x: pl.x, z: pl.z, box: { minY: pl.box.min.y, maxY: pl.box.max.y } } : null;
      }, mon.id);
      const rot = await page.evaluate((id) => window.__HARNESS__.facility.placements.find((p) => p.id === id)?.rot ?? 0, mon.id);
      const a = (rot * Math.PI) / 180;
      const fx = Math.sin(a), fz = Math.cos(a);
      const px = mon.x + fx * 1.15, pz = mon.z + fz * 1.15;
      const yaw = Math.atan2(fx, fz); // look back towards the screen (yaw 0 looks −Z)
      await page.evaluate(([x, z, yaw]) => window.__WORLD__.debug.teleport(x, z, 0, yaw, -0.08), [px, pz, yaw]);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(out, `world-${tag}-monitor-closeup.png`) });
      summary.shots.push({ name: "monitor-closeup", monitor: mon.id, info });
    }
    // monitor panel renderer (full size)
    await page.evaluate(() => window.__HARNESS__.openMonitor());
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(out, `monitor-panel.png`) });
    await page.evaluate(() => window.__HARNESS__.closeMonitor());
    // big map
    await page.evaluate(() => window.__HARNESS__.openMap());
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(out, `world-${tag}-bigmap.png`) });
    await page.evaluate(() => window.__HARNESS__.closeMap());
    // functional checks: door (E), build zone (place / mine / serialize), NPC state, beacon
    const fx = {};
    const door = await page.evaluate(() => {
      const w = window.__WORLD__;
      const d = w.debug.doors[0];
      if (!d) return null;
      return { id: d.id, x: d.centre.x, z: d.centre.z, minX: d.area.minX, maxX: d.area.maxX, minZ: d.area.minZ, maxZ: d.area.maxZ };
    });
    if (door) {
      // stand 2 m outside the doorway (outward = away from the building centre) facing it
      const horiz = door.maxX - door.minX > door.maxZ - door.minZ;
      const sx = horiz ? door.x : door.x + Math.sign(door.x || 1) * 2.2;
      const sz = horiz ? door.z + Math.sign(door.z || 1) * 2.2 : door.z;
      const yaw = Math.atan2(sx - door.x, sz - door.z);
      await page.evaluate(([x, z, yaw]) => window.__WORLD__.debug.teleport(x, z, 0, yaw, -0.05), [sx, sz, yaw]);
      await page.waitForTimeout(700);
      fx.door = await page.evaluate(async (id) => {
        const w = window.__WORLD__;
        w.debug.updateAim();
        const aimed = w.debug.target;
        w.interact();
        const d = w.debug.doors.find((x) => x.id === id);
        return { aimed: aimed?.kind ?? null, open: d.open, collidersDisabled: d.leaves.every((l) => l.collider.enabled === false) };
      }, door.id);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(out, `world-${tag}-door-open.png`) });
    }
    fx.build = await page.evaluate(() => {
      const w = window.__WORLD__;
      const f = window.__HARNESS__.facility;
      if (!f.buildZone) return null;
      const r = f.buildZone.rect;
      const before = w.serialize().blocks.length;
      // stand at the zone's south edge looking down-forward at the sand
      w.debug.teleport(r.x, r.z + r.d / 2 - 1.5, 0, 0, -0.9);
      w.debug.camera.position.set(r.x, 1.62, r.z + r.d / 2 - 1.5);
      w.debug.camera.rotation.set(-0.9, 0, 0);
      w.select(3);
      w.debug.updateAim();
      w.build(true);
      const placed = w.serialize().blocks.length;
      w.debug.updateAim();
      w.build(false);
      const mined = w.serialize().blocks.length;
      return { before, placed, mined };
    });
    await page.waitForTimeout(600);
    fx.npc = await page.evaluate(() => {
      const w = window.__WORLD__;
      const f = window.__HARNESS__.facility;
      const slot = f.patientSlots[0];
      if (!slot) return null;
      w.setPatientState(slot.id, { speaking: true, distressed: true, accessory: "oxygen-mask" });
      const n = w.debug.npcs.get(`patient:${slot.id}`);
      const p = w.locate(slot.id);
      w.setWaypoint({ x: p.x, z: p.z, label: p.label });
      return { speaking: n?.speaking, distressed: n?.distressed, locate: p };
    });
    if (fx.npc?.locate) {
      const p = fx.npc.locate;
      await page.evaluate(([x, z]) => window.__WORLD__.debug.teleport(x + 1.4, z + 2.2, 0, Math.atan2(1.4, 2.2), -0.12), [p.x, p.z]);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(out, `world-${tag}-npc-state.png`) });
      await page.evaluate(([x, z]) => window.__WORLD__.debug.teleport(x + 6, z + 14, 3, Math.atan2(6, 14), -0.1), [p.x, p.z]);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(out, `world-${tag}-beacon.png`) });
      await page.evaluate(() => window.__WORLD__.setWaypoint(null));
    }
    summary.functional = fx;
    // walkTo smoke test: spawn → evidence board / first placement
    const walk = await page.evaluate(async () => {
      const w = window.__WORLD__;
      w.debug.freeze(false);
      w.reset();
      const f = window.__HARNESS__.facility;
      const board = f.placements.find((p) => p.type === "evidence-board") ?? f.placements[0];
      const dest = w.locate(board.id);
      const t0 = performance.now();
      try {
        await Promise.race([w.walkTo(dest), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout 240s")), 240000))]);
        return { ok: true, ms: Math.round(performance.now() - t0), at: w.position, dest };
      } catch (e) {
        return { ok: false, error: String(e), at: w.position, dest };
      }
    });
    summary.walk = walk;
    // atlas
    await page.evaluate(() => window.__HARNESS__.openAtlas());
    try {
      await page.waitForFunction(() => window.__HARNESS__.atlasReady === true, null, { timeout: 240000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(out, `atlas-overview.png`) });
      await page.evaluate(() => window.__HARNESS__.atlas.focus("spleen"));
      await page.waitForTimeout(2200);
      await page.screenshot({ path: path.join(out, `atlas-spleen.png`) });
      summary.atlas = "ok";
    } catch (e) {
      summary.atlas = `not ready: ${String(e)} · status: ${await page.evaluate(() => document.getElementById("atlas-status").textContent)}`;
      await page.screenshot({ path: path.join(out, `atlas-status.png`) });
    }
  }
} catch (e) {
  summary.fatal = String(e);
  await page.screenshot({ path: path.join(out, `world-error.png`) }).catch(() => {});
} finally {
  await browser.close();
}
console.log(JSON.stringify(summary, null, 2));

import { afterEach, describe, expect, it, vi } from "vitest";
import { InputControls } from "./input.js";
import type { VoxelWorld } from "./voxel-world.js";

function controls() {
  const win = new EventTarget(), doc = new EventTarget(), canvas = new EventTarget();
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("Element", class {});
  const world = {
    canvas, callbacks: { onPauseRequest: vi.fn() }, S: {}, stage: { resize() {} },
    playing: () => true, settings: () => ({ sensitivity: 1 }), keys: {} as Record<string, boolean>,
    yaw: 0, pitch: 0, walk: { current: {}, cancel: vi.fn() },
  };
  const input = new InputControls(world as unknown as VoxelWorld);
  return { world, win, canvas, input };
}

afterEach(() => vi.unstubAllGlobals());

describe("player control", () => {
  it("the first hardware press that interrupts a walk also moves the avatar", () => {
    const { world, win } = controls();
    // A cancellation handler is free to clear old input during the handover.
    world.walk.cancel.mockImplementation(() => { world.keys = {}; });
    win.dispatchEvent(Object.assign(new Event("keydown"), { code: "KeyS" }));
    expect(world.walk.cancel).toHaveBeenCalledOnce();
    expect(world.keys.KeyS).toBe(true);
    win.dispatchEvent(Object.assign(new Event("keyup"), { code: "KeyS" }));
    expect(world.keys.KeyS).toBe(false);
  });

  it("buffers a short jump tap once and clears pending input on blur", () => {
    const { input, win, world } = controls();
    input.setKey("Space", true);
    input.setKey("Space", false);
    expect(input.takeJump()).toBe(true);
    expect(input.takeJump()).toBe(false);
    input.setKey("Space", true);
    expect(input.takeJump()).toBe(true);
    input.setKey("Space", true);
    expect(input.takeJump()).toBe(false);

    input.setKey("Space", false);
    input.setKey("Space", true);
    win.dispatchEvent(new Event("blur"));
    expect(input.takeJump()).toBe(false);
    expect(world.keys).toEqual({});
  });

  it("tracks only the looking thumb while a second thumb operates the movement pad", () => {
    const { world, input, canvas } = controls();
    const pad = { identifier: 6, clientX: 10, clientY: 50 };
    const finger = { identifier: 7, clientX: 100, clientY: 80 };
    const event = (type: string, changed: typeof finger, touches: typeof finger[]) =>
      canvas.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { changedTouches: [changed], touches }));
    // The HUD uses setKey; its touch is in the document-wide touches list too.
    input.setKey("KeyW", true);
    event("touchstart", finger, [pad, finger]);
    event("touchmove", { ...finger, clientX: 110 }, [pad, finger]);
    expect(world.keys.KeyW).toBe(true);
    expect(world.yaw).toBeCloseTo(-0.024);
    event("touchend", pad, [finger]);
    event("touchmove", { ...finger, clientX: 120 }, [finger]);
    expect(world.yaw).toBeCloseTo(-0.048);
    event("touchcancel", finger, []);
    event("touchmove", finger, []);
    expect(world.yaw).toBeCloseTo(-0.048);
  });
});

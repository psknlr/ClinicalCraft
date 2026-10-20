/**
 * Human input to a voxel world (V4): mouse look (pointer lock, else dragging), clicks (interact, mine, place),
 * the keyboard (WASD held for the frame loop; E, B/Tab, M, J, T/Enter, Q/F, Esc, 1–9 as shortcuts — never typed
 * into a field they open, never taken from a focused HUD button), touch look, and pausing when the window
 * loses focus or the pointer lock. Moving keys interrupt the autopilot's walk. Resizes refit the stage.
 */
import { clampPitch, PHYSICS } from "./physics.js";
import type { VoxelWorld } from "./voxel-world.js";

/** Keys the world turns into actions (their default — typing a character — is suppressed). */
const SHORTCUT_CODES = new Set(["KeyE", "KeyB", "Tab", "KeyM", "KeyJ", "KeyT", "Enter", "KeyQ", "KeyF", "Escape"]);

/** Is the user typing into a form field (keys are theirs, not the world's)? */
const typing = () => {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable);
};

/** The DOM input of one world (listeners removed by `dispose`). */
export class InputControls {
  /** Where a drag-look started (no pointer lock), or null. */
  dragFrom: [number, number] | null = null;
  private touchFrom: [number, number] | null = null;
  private pointerLocked = false;
  private readonly listeners: [EventTarget, string, EventListener, AddEventListenerOptions | boolean | undefined][] = [];
  private ro: ResizeObserver | null = null;

  constructor(private readonly world: VoxelWorld) {
    const { canvas, callbacks, S, stage } = world;
    const on = <K extends string>(target: EventTarget, type: K, fn: (e: never) => void, o?: AddEventListenerOptions | boolean) => {
      target.addEventListener(type, fn as EventListener, o);
      this.listeners.push([target, type, fn as EventListener, o]);
    };
    const playing = () => world.playing();

    on(canvas, "mousedown", (e: MouseEvent) => {
      if (!playing()) return;
      if (e.button === 2) {
        world.blocks.build(true);
        return;
      }
      if (document.pointerLockElement === canvas) {
        if (e.button === 0) {
          if (world.slot >= 3) world.blocks.build(false);
          else world.interaction.interact();
        }
      } else if (e.button === 0) {
        this.dragFrom = [e.clientX, e.clientY];
        if (world.settings().pointer !== false) {
          try {
            const r = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
            r?.catch?.(() => world.toast(S.dragLook));
          } catch {
            /* ignore */
          }
        }
      }
    });
    on(canvas, "contextmenu", (e: Event) => e.preventDefault());
    on(window, "mouseup", () => (this.dragFrom = null));
    on(window, "mousemove", (e: MouseEvent) => {
      if (!playing()) return;
      const dragFrom = this.dragFrom;
      if (document.pointerLockElement === canvas) this.look(e.movementX, e.movementY);
      else if (dragFrom && e.buttons === 1) {
        this.look(e.clientX - dragFrom[0], e.clientY - dragFrom[1]);
        this.dragFrom = [e.clientX, e.clientY];
      }
    });
    on(document, "pointerlockchange", () => {
      this.pointerLocked = document.pointerLockElement === canvas;
      if (!this.pointerLocked) {
        world.keys = {};
        if (playing()) callbacks.onPauseRequest();
      }
    });
    on(window, "keydown", (e: KeyboardEvent) => {
      if (!playing() || typing()) return;
      // Enter/Space on a focused HUD button activate that button, not the world's chat/jump.
      const control = e.target instanceof Element && e.target !== canvas ? e.target.closest("button, a[href], summary, [role='button']") : null;
      if (control && (e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Space")) return;
      world.keys[e.code] = true;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code)) e.preventDefault();
      if (world.walk.current && ["KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) world.walk.cancel(new Error("interrupted by player"));
      // Shortcut keys may open a window that focuses a text field synchronously (T/Enter → chat input,
      // E on a staff member): without preventDefault the key's own character would be typed into it.
      if (SHORTCUT_CODES.has(e.code) || e.code.startsWith("Digit")) e.preventDefault();
      if (e.repeat) return;
      switch (e.code) {
        case "KeyE":
          world.interaction.interact();
          break;
        case "KeyB":
        case "Tab":
          callbacks.onShortcut("inventory");
          break;
        case "KeyM":
          callbacks.onShortcut("map");
          break;
        case "KeyJ":
          callbacks.onShortcut("journal");
          break;
        case "KeyT":
        case "Enter":
          callbacks.onShortcut("chat");
          break;
        case "KeyQ":
          world.blocks.build(false);
          break;
        case "KeyF":
          world.blocks.build(true);
          break;
        case "Escape":
          if (!this.pointerLocked) callbacks.onShortcut("pause");
          break;
        default:
          if (e.code.startsWith("Digit")) {
            const n = Number(e.code.slice(5)) - 1;
            if (n >= 0 && n < 9) {
              world.blocks.select(n);
              callbacks.onShortcut("hotbar", n);
            }
          }
      }
    });
    on(window, "keyup", (e: KeyboardEvent) => {
      world.keys[e.code] = false;
    });
    on(window, "blur", () => {
      world.keys = {};
      if (playing()) callbacks.onPauseRequest();
    });
    on(document, "visibilitychange", () => {
      world.keys = {};
      if (document.hidden && playing()) callbacks.onPauseRequest();
    });
    on(
      canvas,
      "touchstart",
      (e: TouchEvent) => {
        if (e.touches.length === 1) this.touchFrom = [e.touches[0].clientX, e.touches[0].clientY];
      },
      { passive: true },
    );
    on(
      canvas,
      "touchmove",
      (e: TouchEvent) => {
        const touchFrom = this.touchFrom;
        if (touchFrom && e.touches.length === 1 && playing()) {
          const t = e.touches[0];
          this.look(t.clientX - touchFrom[0], t.clientY - touchFrom[1]);
          this.touchFrom = [t.clientX, t.clientY];
          e.preventDefault();
        }
      },
      { passive: false },
    );
    on(canvas, "touchend", () => (this.touchFrom = null));

    on(window, "resize", stage.resize);
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(stage.resize);
      this.ro.observe(canvas);
    }
  }

  /** Turn the view by a mouse / touch movement (sensitivity from the settings). */
  look(dx: number, dy: number): void {
    const world = this.world;
    const sens = world.settings().sensitivity || 1;
    world.yaw -= dx * PHYSICS.mouse * sens;
    world.pitch = clampPitch(world.pitch - dy * PHYSICS.mouse * sens);
  }

  /** Remove every listener and the resize observer. */
  dispose(): void {
    for (const [t, type, fn, o] of this.listeners) t.removeEventListener(type, fn, o);
    this.ro?.disconnect();
  }
}

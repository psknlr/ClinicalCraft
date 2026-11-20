/**
 * The case library's search box, without the DOM (unit-tested): the typed text becomes the query at once, and the
 * list follows once typing pauses (`SEARCH_PAUSE_MS`), so a keystroke never rebuilds 135 cards. While an input
 * method is composing (pinyin "xiongtong" on its way to 胸痛), nothing happens: the committed text is searched when
 * composition ends.
 */

/** How long typing must pause before the list is filtered. */
export const SEARCH_PAUSE_MS = 150;

/** What the search box does with its text. */
export interface SearchHandlers {
  /** The query changed (at once: other filters and re-renders read it). */
  query(text: string): void;
  /** Filter the list with the current query (after the pause). */
  refresh(): void;
}

/** Timers (injected by tests). */
export interface SearchTimers {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

/** The search box's event handling. */
export interface SearchInput {
  /** An `input` event; `composing` is `InputEvent.isComposing`. */
  input(text: string, composing?: boolean): void;
  compositionStart(): void;
  /** `compositionend`: the committed text. */
  compositionEnd(text: string): void;
  /** Filter now if a refresh is waiting (Enter). */
  flush(): void;
  /** Drop a waiting refresh (the list was just rebuilt with the current query). */
  cancel(): void;
  /** A refresh is waiting for the pause. */
  readonly pending: boolean;
}

const browserTimers: SearchTimers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** One search box's input handling (a new one per rendered box: a composition never outlives its element). */
export function searchInput(handlers: SearchHandlers, pauseMs = SEARCH_PAUSE_MS, timers: SearchTimers = browserTimers): SearchInput {
  let composing = false;
  let timer: unknown = null;
  const cancel = (): void => {
    if (timer !== null) timers.clear(timer);
    timer = null;
  };
  const changed = (text: string): void => {
    handlers.query(text);
    cancel();
    timer = timers.set(() => {
      timer = null;
      handlers.refresh();
    }, pauseMs);
  };
  return {
    input(text, isComposing = false) {
      if (composing || isComposing) return;
      changed(text);
    },
    compositionStart() {
      composing = true;
    },
    compositionEnd(text) {
      composing = false;
      changed(text);
    },
    flush() {
      if (timer === null) return;
      cancel();
      handlers.refresh();
    },
    cancel,
    get pending() {
      return timer !== null;
    },
  };
}

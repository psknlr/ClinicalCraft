/**
 * World bridge (docs/EMBODIED.md §12, docs/PROTOCOL.md §13): an external
 * agent acting in a learner's live browser session through
 * `clinicalcraft serve`. Contract, browser client, attach client.
 */
export * from "./protocol.js";
export * from "./world-client.js";
export * from "./attach-client.js";

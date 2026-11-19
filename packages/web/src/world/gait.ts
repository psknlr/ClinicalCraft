import { PHYSICS } from "./physics.js";

/** Camera and hand travel, and a footfall when the planted foot changes. */
export class WalkingGait {
  private steps = 0.5;
  private weight = 0;
  headOffset = 0;
  handOffset = 0;

  /** Advance by the distance the collision solver actually let the feet travel. */
  update(distance: number, dt: number, grounded: boolean, sprint: boolean, careful: boolean): boolean {
    const stride = careful ? 0.68 : sprint ? PHYSICS.sprint * PHYSICS.stepMsSprint / 1000 : PHYSICS.speed * PHYSICS.stepMs / 1000;
    const before = Math.floor(this.steps);
    if (grounded) this.steps += distance / stride;
    const contact = Math.floor(this.steps) > before;
    this.steps %= 2;
    const moving = grounded && distance > 0.0001;
    const targetWeight = moving ? (careful ? 0.35 : 1) : 0;
    this.weight += (targetWeight - this.weight) * -Math.expm1(-12 * dt);
    // The head is lowest as a foot plants, the hand swings once per pair of steps.
    this.headOffset = -Math.cos(this.steps * Math.PI * 2) * 0.026 * this.weight;
    this.handOffset = Math.sin(this.steps * Math.PI) * 0.013 * this.weight;
    return contact;
  }
}

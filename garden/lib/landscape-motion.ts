export const WALK_SPEED = 6;
export const GUIDED_WALK_SPEED = 8;
export const WALK_STEP = 1.2;

/** The same easing duration at 30, 60, and 120 Hz. */
export function motionBlend(rate: number, dt: number) {
  return -Math.expm1(-rate * dt);
}

/** Keep a stable display cadence without accumulating a backlog after a stall. */
export class FrameClock {
  private lastRender: number | null = null;
  private nextRender = 0;
  private rate = 0;

  reset(now: number) {
    this.lastRender = now;
    this.nextRender = now;
    this.rate = 0;
  }

  tick(now: number, fps: number) {
    const interval = 1000 / fps;
    if (fps !== this.rate) {
      this.nextRender = now;
      this.rate = fps;
    }
    if (now + 0.5 < this.nextRender) return null;
    const frameMs = this.lastRender === null ? interval : now - this.lastRender;
    this.lastRender = now;
    this.nextRender =
      now - this.nextRender > interval
        ? now + interval
        : this.nextRender + interval;
    return { dt: Math.min(Math.max(frameMs, 0) / 1000, 0.1), frameMs };
  }
}

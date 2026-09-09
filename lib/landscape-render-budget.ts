/** Bound GPU buffers on Retina/4K screens without reducing the modeled detail. */
export function renderPixelRatio(
  width: number,
  height: number,
  deviceRatio: number,
  scale = 1,
) {
  return (
    Math.min(
      deviceRatio,
      1.5,
      Math.sqrt(2_500_000 / Math.max(1, width * height)),
    ) * scale
  );
}

/** Sustained slow frames lower resolution; isolated loading pauses do not. */
export class RenderBudget {
  scale = 1;
  private samples = 0;
  private slow = 0;
  observe(frameMs: number) {
    this.samples++;
    if (frameMs > 48) this.slow++;
    if (this.samples < 60) return false;
    const previous = this.scale;
    if (this.slow >= 40) this.scale = Math.max(0.7, this.scale * 0.85);
    this.samples = 0;
    this.slow = 0;
    return this.scale !== previous;
  }
}

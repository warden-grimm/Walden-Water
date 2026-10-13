// Shared droplet ballistics, mirrored by shaders/particles-common.glsl.
// World metres, +Y up. The pool surface is the curtain base (y=0) by contract;
// M7 draws rings where these trajectories cross it. Gravity is
// config.droplets.gravity, an artistic value separate from the curtain flow.
export const POOL_HEIGHT = 0;

export function ballisticY(y0, vy, gravity, age) {
  return y0 + vy * age - 0.5 * gravity * age * age;
}

// Later root of y0 + vy·t − g·t²/2 = pool: when a droplet launched at y0 with
// vertical speed vy descends through the pool. Heights at/below the pool land
// once they return to it (0 for a downward launch).
export function impactTime(y0, vy, gravity, pool = POOL_HEIGHT) {
  const height = Math.max(y0 - pool, 0);
  return (vy + Math.sqrt(vy * vy + 2 * gravity * height)) / Math.max(gravity, 1e-4);
}

// Resting curtain surface point for a contact UV (see scene contract).
export function curtainPoint(settings, u, v, result) {
  const a = 2 * u - 1;
  return result.set((u - 0.5) * settings.width, v * settings.height, settings.bow * (1 - a * a) * Math.sin(Math.PI * v));
}

// Continuous rings where the curtain itself meets the pool: each point loops
// with a seeded period and respawns at a fresh position along the base line
// (the bow is zero at the base, so the sheet lands at z = 0).
attribute vec4 aSeed;
uniform float uWidth, uImpactPeriod, uImpactDepth, uImpactStrength;
// __LIGHT__
// __PARTICLES__
// __RING__
// Irrational per-loop increments (decorrelation constants, not tunables).
const vec4 RESEED = vec4(0.6180339887, 0.4142135624, 0.7320508076, 0.2360679775);
void main() {
  float period = uImpactPeriod * (0.6 + 0.8 * aSeed.y) + 1e-3;
  float clock = uTime + aSeed.x * period;
  vec4 fresh = fract(aSeed.zwxy + floor(clock / period) * RESEED);
  vec3 p = vec3((fresh.x - 0.5) * uWidth, uPoolHeight, fresh.y * uImpactDepth);
  ring(p, mod(clock, period), min(uRingLife, period), uImpactStrength * (0.5 + fresh.z));
}

// Continuous lip/base spray launch, shared by the droplets (spray.vert.glsl)
// and their pool rings (ring-spray.vert.glsl) so a ring forms exactly where
// and when its droplet reaches the pool. Requires particles-common.
attribute vec4 aSeed;  // four independent uniform [0,1) values per point
attribute float aKind; // 0 = lip, 1 = base
uniform float uWidth, uHeight;
uniform float uLipLife, uLipForward, uLipSide, uLipDrop;
uniform float uBaseSpeed, uBaseForward, uBaseSide, uBaseSpread, uBaseRest;
uniform float uJitter;
// Irrational per-loop increments give a low-discrepancy sequence of respawn
// values; they are decorrelation constants, not tunables.
const vec4 RESEED = vec4(0.6180339887, 0.4142135624, 0.7320508076, 0.2360679775);
// The loop period may depend only on fixed seeds, never on re-seeded values.
void sprayTiming(out float vary, out float flight, out float period) {
  vary = 1.0 - uJitter + 2.0 * uJitter * aSeed.y;
  bool lip = aKind < 0.5;
  float baseUp = uBaseSpeed * vary;
  // Lip drops fall at most until the pool, even with a long configured life.
  flight = lip ? min(uLipLife * vary, impactTime(uHeight, 0.0)) : 2.0 * baseUp / max(uGravity, 1e-4);
  period = flight + (lip ? 0.0 : uBaseRest * aSeed.w) + 1e-3;
}
// Fresh launch values for loop index `loop` (floor of clock / period).
vec4 sprayFresh(float loop) { return fract(aSeed.zwxy + loop * RESEED); }
void sprayLaunch(vec4 fresh, float vary, out vec3 origin, out vec3 velocity) {
  if (aKind < 0.5) {
    // Water peeling forward off the lip, where the bow is zero.
    origin = vec3((fresh.x - 0.5) * uWidth, uHeight, 0.0);
    velocity = vec3((2.0 * fresh.y - 1.0) * uLipSide, -uLipDrop * fresh.z, uLipForward * (0.5 + fresh.w));
  } else {
    // Thrown up from the impact line at the curtain base.
    origin = vec3((fresh.x - 0.5) * uWidth * uBaseSpread, uPoolHeight, 0.0);
    velocity = vec3((2.0 * fresh.y - 1.0) * uBaseSide, uBaseSpeed * vary, uBaseForward * fresh.z);
  }
}

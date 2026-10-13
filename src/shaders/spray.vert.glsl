// Continuous lip and base spray, evaluated analytically from the shared clock:
// no CPU or render-target state. Each point loops with its own period; every
// loop re-seeds launch values so successive drops do not repeat.
attribute vec4 aSeed;  // four independent uniform [0,1) values per point
attribute float aKind; // 0 = lip, 1 = base
uniform float uWidth, uHeight;
uniform float uLipLife, uLipForward, uLipSide, uLipDrop;
uniform float uBaseSpeed, uBaseForward, uBaseSide, uBaseSpread, uBaseRest;
uniform float uJitter, uSize, uOpacity, uSoftness;
varying vec3 vColor;
varying float vAlpha, vSoftness;
// __LIGHT__
// __PARTICLES__
// Irrational per-loop increments give a low-discrepancy sequence of respawn
// values; they are decorrelation constants, not tunables.
const vec4 RESEED = vec4(0.6180339887, 0.4142135624, 0.7320508076, 0.2360679775);
void main() {
  float vary = 1.0 - uJitter + 2.0 * uJitter * aSeed.y;
  bool lip = aKind < 0.5;
  // The loop period may depend only on fixed seeds, never on re-seeded values.
  float baseUp = uBaseSpeed * vary;
  float flight = lip ? uLipLife * vary : 2.0 * baseUp / max(uGravity, 1e-4);
  float period = flight + (lip ? 0.0 : uBaseRest * aSeed.w) + 1e-3;
  float clock = uTime + aSeed.x * period;
  float age = mod(clock, period);
  vec4 fresh = fract(aSeed.zwxy + floor(clock / period) * RESEED);
  if (age > flight) { retire(); return; }
  vec3 origin, velocity;
  if (lip) {
    // Water peeling forward off the lip, where the bow is zero.
    origin = vec3((fresh.x - 0.5) * uWidth, uHeight, 0.0);
    velocity = vec3((2.0 * fresh.y - 1.0) * uLipSide, -uLipDrop * fresh.z, uLipForward * (0.5 + fresh.w));
  } else {
    // Thrown up from the impact line at the curtain base.
    origin = vec3((fresh.x - 0.5) * uWidth * uBaseSpread, uPoolHeight, 0.0);
    velocity = vec3((2.0 * fresh.y - 1.0) * uBaseSide, baseUp, uBaseForward * fresh.z);
  }
  vec3 world = ballistic(origin, velocity, age);
  vec4 viewPosition = viewMatrix * vec4(world, 1.0);
  vAlpha = uOpacity * lifeEnvelope(age, flight);
  gl_PointSize = spriteSize(viewPosition, uSize * vary, vAlpha);
  vColor = dropletLight(world, fresh.w);
  vSoftness = uSoftness;
  gl_Position = projectionMatrix * viewPosition;
}

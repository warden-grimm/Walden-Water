// Shared by spray, touch bursts and motes. Mirrors src/scene/ballistics.js.
// World metres, gravity along -Y, uPoolHeight is the pool surface (curtain base).
uniform float uTime, uGravity, uPoolHeight;
uniform float uPointScale, uMaxPointSize, uMinPixels;
uniform vec3 uDropletColor;
uniform float uDropletAmbient, uSparkle, uTwinkle, uTwinkleRate, uFadeShare;
const float TAU = 6.28318530718;
vec3 ballistic(vec3 origin, vec3 velocity, float age) {
  return origin + velocity * age - vec3(0.0, 0.5 * uGravity * age * age, 0.0);
}
// Later root of y0 + vy t - g t^2 / 2 = pool: when the droplet re-enters the pool.
float impactTime(float y0, float vy) {
  float height = max(y0 - uPoolHeight, 0.0);
  return (vy + sqrt(vy * vy + 2.0 * uGravity * height)) / max(uGravity, 1e-4);
}
// Rise quickly, hold, then fade over the last uFadeShare of life: no popping
// at spawn or retirement.
float lifeEnvelope(float age, float life) {
  float t = age / max(life, 1e-4);
  return smoothstep(0.0, 0.25 * uFadeShare, t) * (1.0 - smoothstep(1.0 - uFadeShare, 1.0, t));
}
// Water droplets: faint ambient body everywhere; warm sparkle only where the
// shared shaft mask lights them, flickering as each drop tumbles.
vec3 dropletLight(vec3 world, float seed) {
  float beam = shaftMask(world) * uLightIntensity;
  float flicker = 1.0 - uTwinkle + uTwinkle * (0.5 + 0.5 * sin(uTime * uTwinkleRate + seed * TAU));
  return uDropletColor * (uDropletAmbient + beam) + uLightColor * beam * uSparkle * flicker;
}
// World diameter to pixels. Below uMinPixels the sprite keeps that minimum
// size with alpha scaled by covered area, so tiny drops neither shimmer nor
// vanish; uMaxPointSize is the device limit.
float spriteSize(vec4 viewPosition, float diameter, inout float alpha) {
  float pixels = diameter * uPointScale / max(-viewPosition.z, 1e-3);
  alpha *= min(1.0, pixels * pixels / (uMinPixels * uMinPixels));
  return clamp(pixels, uMinPixels, uMaxPointSize);
}
// Retired points collapse outside clip space and rasterize nothing.
void retire() { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; }

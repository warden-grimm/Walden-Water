// Continuous lip and base spray, evaluated analytically from the shared clock:
// no CPU or render-target state. Each point loops with its own period; every
// loop re-seeds launch values so successive drops do not repeat.
uniform float uSize, uOpacity, uSoftness;
varying vec3 vColor;
varying float vAlpha, vSoftness;
// __LIGHT__
// __PARTICLES__
// __SPRAY__
void main() {
  float vary, flight, period;
  sprayTiming(vary, flight, period);
  float clock = uTime + aSeed.x * period;
  float age = mod(clock, period);
  if (age > flight) { retire(); return; }
  vec4 fresh = sprayFresh(floor(clock / period));
  vec3 origin, velocity;
  sprayLaunch(fresh, vary, origin, velocity);
  vec3 world = ballistic(origin, velocity, age);
  // Downward-launched lip drops land sooner than the bound above.
  if (world.y < uPoolHeight) { retire(); return; }
  vec4 viewPosition = viewMatrix * vec4(world, 1.0);
  vAlpha = uOpacity * lifeEnvelope(age, flight);
  gl_PointSize = spriteSize(viewPosition, uSize * vary, vAlpha);
  vColor = dropletLight(world, fresh.w);
  vSoftness = uSoftness;
  gl_Position = projectionMatrix * viewPosition;
}

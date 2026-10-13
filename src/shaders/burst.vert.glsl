// Touch splashes: droplets launched by burstLaunch (burst-launch.glsl) fly
// ballistically until their lifetime ends or they reach the pool.
uniform float uSize, uOpacity, uSoftness;
varying vec3 vColor;
varying float vAlpha, vSoftness;
// __LIGHT__
// __PARTICLES__
// __BURST__
void main() {
  vec3 origin, velocity;
  float age, life;
  if (!burstLaunch(origin, velocity, age, life) || age > life) { retire(); return; }
  vec3 world = ballistic(origin, velocity, age);
  vec4 viewPosition = viewMatrix * vec4(world, 1.0);
  vAlpha = uOpacity * lifeEnvelope(age, life);
  gl_PointSize = spriteSize(viewPosition, uSize * (1.0 - uJitter + 2.0 * uJitter * aSeed.z), vAlpha);
  vColor = dropletLight(world, aSeed.w);
  vSoftness = uSoftness;
  gl_Position = projectionMatrix * viewPosition;
}

// Touch splashes. Each point belongs to one ring slot; the slot's launch
// descriptor comes from the burst texture written by SplashEmitter.js.
attribute vec4 aSeed;          // four independent uniform [0,1) values per point
attribute float aSlot, aShare; // ring slot; this point's rank in its burst [0,1)
uniform sampler2D uBursts;
uniform float uBurstSlots, uMinShare, uSpread, uJitter, uLifetime, uSize, uOpacity, uSoftness;
varying vec3 vColor;
varying float vAlpha, vSoftness;
// __LIGHT__
// __PARTICLES__
void main() {
  // Exact texel centres of the nearest-filtered slots x 2 descriptor texture.
  float x = (aSlot + 0.5) / uBurstSlots;
  vec4 launch = texture2D(uBursts, vec2(x, 0.25));
  vec4 motion = texture2D(uBursts, vec2(x, 0.75));
  float age = uTime - launch.w;
  // Stronger swipes release a larger share of the slot's droplets.
  if (launch.w < 0.0 || age < 0.0 || aShare >= uMinShare + (1.0 - uMinShare) * motion.w) { retire(); return; }
  float speed = length(motion.xyz);
  vec3 velocity = motion.xyz * (1.0 - uJitter + 2.0 * uJitter * aSeed.x)
    + (aSeed.yzw * 2.0 - 1.0) * uSpread * speed;
  // Droplets leave the sheet toward the camera, never back into the rock.
  velocity.z = abs(velocity.z);
  float life = min(uLifetime * (1.0 - uJitter + uJitter * aSeed.y), impactTime(launch.y, velocity.y));
  if (age > life) { retire(); return; }
  vec3 world = ballistic(launch.xyz, velocity, age);
  vec4 viewPosition = viewMatrix * vec4(world, 1.0);
  vAlpha = uOpacity * lifeEnvelope(age, life);
  gl_PointSize = spriteSize(viewPosition, uSize * (1.0 - uJitter + 2.0 * uJitter * aSeed.z), vAlpha);
  vColor = dropletLight(world, aSeed.w);
  vSoftness = uSoftness;
  gl_Position = projectionMatrix * viewPosition;
}

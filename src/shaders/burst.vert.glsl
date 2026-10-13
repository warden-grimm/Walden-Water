// Touch splashes. Each point belongs to one ring slot; the slot's launch
// descriptor comes from the burst texture written by SplashEmitter.js. The
// descriptor origin is the finger centre; droplets leave from the UPSTREAM
// arc of the touch perimeter, where falling water strikes the finger, and
// bounce radially away from it.
attribute vec4 aSeed;          // four independent uniform [0,1) values per point
attribute float aSlot, aShare; // ring slot; this point's rank in its burst [0,1)
attribute float aArc;          // position along the upstream arc [0,1)
uniform sampler2D uBursts;
uniform float uBurstSlots, uMinShare, uSpread, uJitter, uLifetime, uSize, uOpacity, uSoftness;
// uTouchRadius is the field Gaussian's sigma; uRim scales it to the visible
// edge of the parted opening (about 2 sigma at default gap settings).
uniform float uTouchRadius, uRim, uArc, uBounce;
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
  // Angle from straight up (+y, against the flow) within +/- uArc radians.
  float angle = (2.0 * aArc - 1.0) * uArc;
  vec3 radial = vec3(sin(angle), cos(angle), 0.0);
  vec3 origin = launch.xyz + radial * uTouchRadius * uRim;
  float speed = length(motion.xyz);
  vec3 velocity = motion.xyz * (1.0 - uJitter + 2.0 * uJitter * aSeed.x)
    + radial * uBounce * (1.0 - uJitter + 2.0 * uJitter * aSeed.y)
    + (aSeed.yzw * 2.0 - 1.0) * uSpread * speed;
  // Droplets leave the sheet toward the camera, never back into the rock.
  velocity.z = abs(velocity.z);
  float life = min(uLifetime * (1.0 - uJitter + uJitter * aSeed.y), impactTime(origin.y, velocity.y));
  if (age > life) { retire(); return; }
  vec3 world = ballistic(origin, velocity, age);
  vec4 viewPosition = viewMatrix * vec4(world, 1.0);
  vAlpha = uOpacity * lifeEnvelope(age, life);
  gl_PointSize = spriteSize(viewPosition, uSize * (1.0 - uJitter + 2.0 * uJitter * aSeed.z), vAlpha);
  vColor = dropletLight(world, aSeed.w);
  vSoftness = uSoftness;
  gl_Position = projectionMatrix * viewPosition;
}

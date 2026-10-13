// Touch-splash droplet launch, shared by the droplets (burst.vert.glsl) and
// their pool rings (ring-burst.vert.glsl). Each point belongs to one ring
// slot; the slot's launch descriptor comes from the burst texture written by
// SplashEmitter.js. The descriptor origin is the finger centre; droplets leave
// from the UPSTREAM arc of the touch perimeter, where falling water strikes the
// finger, and bounce radially away from it. Requires particles-common.
attribute vec4 aSeed;          // four independent uniform [0,1) values per point
attribute float aSlot, aShare; // ring slot; this point's rank in its burst [0,1)
attribute float aArc;          // position along the upstream arc [0,1)
uniform sampler2D uBursts;
uniform float uBurstSlots, uMinShare, uSpread, uJitter, uLifetime, uHeight;
// uTouchRadius is the field Gaussian's sigma; uRim scales it to the visible
// edge of the parted opening (about 2 sigma at default gap settings).
uniform float uTouchRadius, uRim, uArc, uBounce;
// Launch of this point's droplet. False when its slot is empty or not yet
// born, or when this point's rank is beyond the share its burst released.
bool burstLaunch(out vec3 origin, out vec3 velocity, out float age, out float life) {
  origin = velocity = vec3(0.0);
  age = life = 0.0;
  // Exact texel centres of the nearest-filtered slots x 2 descriptor texture.
  float x = (aSlot + 0.5) / uBurstSlots;
  vec4 launch = texture2D(uBursts, vec2(x, 0.25));
  vec4 motion = texture2D(uBursts, vec2(x, 0.75));
  age = uTime - launch.w;
  // Stronger swipes release a larger share of the slot's droplets.
  bool live = launch.w >= 0.0 && age >= 0.0 && aShare < uMinShare + (1.0 - uMinShare) * motion.w;
  // Angle from straight up (+y, against the flow) within +/- uArc radians.
  float angle = (2.0 * aArc - 1.0) * uArc;
  vec3 radial = vec3(sin(angle), cos(angle), 0.0);
  origin = launch.xyz + radial * uTouchRadius * uRim;
  // A press near the lip must not start droplets above the water's top edge.
  origin.y = min(origin.y, uHeight);
  float speed = length(motion.xyz);
  velocity = motion.xyz * (1.0 - uJitter + 2.0 * uJitter * aSeed.x)
    + radial * uBounce * (1.0 - uJitter + 2.0 * uJitter * aSeed.y)
    + (aSeed.yzw * 2.0 - 1.0) * uSpread * speed;
  // Droplets leave the sheet toward the camera, never back into the rock.
  velocity.z = abs(velocity.z);
  life = min(uLifetime * (1.0 - uJitter + uJitter * aSeed.y), impactTime(origin.y, velocity.y));
  return live;
}

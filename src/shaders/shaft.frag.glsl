// Fake volumetric light shaft. For each pixel, intersect the view ray with
// the shared light cone, clip it at the captured wall depth and at the
// curtain, then integrate the SAME shaftMask used by rock, water and motes.
// Because the integral shrinks continuously as the ray approaches geometry,
// there are no mesh faces to clip against walls: no hard intersection lines.
uniform sampler2D uSceneDepth;
uniform mat4 uProjectionInverse, uCameraWorld;
uniform float uCurtainWidth, uCurtainHeight, uCurtainBow, uCameraFar;
const float DEPTH_VIEW_METRES = 25.0; // debug view: this distance maps to white
uniform float uIntensity, uCore, uSamples, uSoftDepth;
uniform float uNoise, uNoiseScale, uDrift, uStreaks, uStreakScale, uStreakDrift, uTime;
uniform float uLacunarity, uGain;
uniform int uPart; // 0 = segment behind the curtain, 1 = in front (and all debug views)
uniform int uView; // 0 shaft, 1 linear wall distance, 2 cone segment length, 3 behind/front split
varying vec2 vUv;
// __LIGHT__
// __NOISE__
const float NO_HIT = 1e6;
const int MAX_SAMPLES = 48; // loop bound for uSamples (WebGL needs a constant)
// Unproject a screen uv and NDC depth to world space with the live camera.
vec3 unproject(vec2 uv, float ndcZ) {
  vec4 view = uProjectionInverse * vec4(uv * 2.0 - 1.0, ndcZ, 1.0);
  return (uCameraWorld * vec4(view.xyz / view.w, 1.0)).xyz;
}
// Forward-nappe interval of a ray inside the cone dot(P - A, D) >= c |P - A|.
// The nappe is convex (half-angle < 90 degrees), so the inside set is one interval.
vec2 coneInterval(vec3 ro, vec3 rd) {
  vec3 co = ro - uLightPosition;
  float c = uLightCosOuter, c2 = c * c;
  float vd = dot(rd, uLightDirection), cd = dot(co, uLightDirection);
  float a = vd * vd - c2, b = 2.0 * (vd * cd - c2 * dot(rd, co)), k = cd * cd - c2 * dot(co, co);
  bool inside = cd > c * length(co);
  float r0 = NO_HIT, r1 = NO_HIT; // forward-nappe crossings ahead of the camera, ascending
  if (abs(a) < 1e-6) {
    float t = abs(b) > 1e-9 ? -k / b : -1.0;
    if (t > 0.0 && cd + vd * t >= 0.0) r0 = t;
  } else {
    float disc = b * b - 4.0 * a * k;
    if (disc >= 0.0) {
      float s = sqrt(disc);
      float t0 = (-b - s) / (2.0 * a), t1 = (-b + s) / (2.0 * a);
      float lo = min(t0, t1), hi = max(t0, t1);
      if (lo > 0.0 && cd + vd * lo >= 0.0) r0 = lo;
      if (hi > 0.0 && cd + vd * hi >= 0.0) { if (r0 == NO_HIT) r0 = hi; else r1 = hi; }
    }
  }
  // Single exit (some ANGLE backends warn about early returns here).
  vec2 interval = vec2(NO_HIT);
  if (inside) interval = vec2(0.0, r0);
  else if (r1 < NO_HIT) interval = vec2(r0, r1);
  else if (r0 < NO_HIT) interval = vec2(r0, NO_HIT);
  return interval;
}
// Distance to the resting curtain (bow included by one fixed-point step), or NO_HIT.
float curtainDistance(vec3 ro, vec3 rd) {
  if (abs(rd.z) < 1e-5) return NO_HIT;
  float t = -ro.z / rd.z;
  for (int i = 0; i < 2; i++) {
    vec3 p = ro + rd * t;
    float a = 2.0 * p.x / uCurtainWidth, v = p.y / uCurtainHeight;
    float z = uCurtainBow * max(1.0 - a * a, 0.0) * sin(3.14159265 * clamp(v, 0.0, 1.0));
    t = (z - ro.z) / rd.z;
  }
  vec3 p = ro + rd * t;
  bool onSheet = t > 0.0 && abs(p.x) <= 0.5 * uCurtainWidth && p.y >= 0.0 && p.y <= uCurtainHeight;
  return onSheet ? t : NO_HIT;
}
// Uneven dusty density: radial streaks fixed to the beam (angular cone
// coordinates converge on the source, like god rays) times slow drifting fBm.
float beamTexture(vec3 p) {
  vec3 q = p - uLightPosition;
  float along = max(dot(q, uLightDirection), 1e-3);
  vec3 side = normalize(cross(uLightDirection, abs(uLightDirection.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 up = cross(side, uLightDirection);
  vec2 angular = vec2(dot(q, side), dot(q, up)) / along;
  float streak = noise2(angular * uStreakScale + vec2(uTime * uStreakDrift, 0.0));
  float dust = fbm(vec2(along, dot(q, side) + dot(q, up)) * uNoiseScale + vec2(-uTime * uDrift, uTime * uDrift * 0.5));
  return (1.0 - uStreaks + uStreaks * 2.0 * streak) * (1.0 - uNoise + uNoise * 2.0 * dust);
}
void main() {
  if (uView != 0 && uPart == 0) discard; // Debug views draw once, opaque, from the front pass.
  vec3 ro = cameraPosition;
  vec3 rd = normalize(unproject(vUv, 1.0) - ro);
  float depth = texture2D(uSceneDepth, vUv).r;
  float wall = depth < 1.0 ? distance(unproject(vUv, depth * 2.0 - 1.0), ro) : uCameraFar;
  vec2 cone = coneInterval(ro, rd);
  float curtain = curtainDistance(ro, rd);
  float start = cone.x, end = min(min(cone.y, wall), uCameraFar);
  if (uView == 1) { gl_FragColor = vec4(vec3(wall / DEPTH_VIEW_METRES), 1.0); return; }
  if (uView == 2) { gl_FragColor = vec4(vec3(max(end - start, 0.0) / 6.0), 1.0); return; }
  if (uView == 3) {
    float behind = max(end - max(start, curtain), 0.0), front = max(min(end, curtain) - start, 0.0);
    gl_FragColor = vec4(behind / 4.0, front / 4.0, 0.0, 1.0); return;
  }
  if (uPart == 0) start = max(start, curtain); else end = min(end, curtain);
  if (end <= start) discard;
  // Interleaved-gradient jitter per pixel trades banding for fine static grain.
  float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float stepLength = (end - start) / uSamples, sum = 0.0;
  for (int i = 0; i < MAX_SAMPLES; i++) {
    if (float(i) >= uSamples) break;
    float t = start + (float(i) + jitter) * stepLength;
    vec3 p = ro + rd * t;
    // Soft fade within uSoftDepth of the captured surface (soft-particle style).
    float soft = smoothstep(0.0, uSoftDepth, wall - t);
    // uCore > 1 concentrates the visible beam toward the axis of the lit cone.
    sum += pow(shaftMask(p), uCore) * beamTexture(p) * soft;
  }
  vec3 color = uLightColor * uLightIntensity * uIntensity * sum * stepLength;
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}

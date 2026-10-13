// Dark pool surface. The normal sums slow ambient ripples, churn along the
// curtain's impact line, and the ring heights in the ripple target. Fresnel
// mixes a dark body with an analytic reflection: the reflected ray is
// intersected with the resting curtain (shaded with the water's own flow
// noise and coverage) and marched through the rock's depth range against the
// wall depth; the rock it meets is looked up in the completed wall capture.
// Nothing reads the frame this pass writes.
uniform sampler2D uWallTexture, uSceneDepth, uRippleTexture;
uniform vec2 uBufferSize, uTargetSize;
uniform mat4 uProjection, uProjectionInverse, uCameraWorld;
uniform vec3 uWaterColor;
uniform float uOpacity, uStreakContrast, uTransmission, uAmbient;
uniform vec3 uBounceColor;
uniform float uBounce;
uniform vec4 uRippleDomain;  // xMin, zMin, xSize, zSize in metres (ring-common.glsl)
uniform vec2 uRippleTexel;   // 1 / ripple target size
uniform float uRingHeight;   // metres of surface height per stored ring unit
uniform float uRippleEdge;   // rings fade out over this many metres inside the target's edges
uniform vec3 uPoolColor, uPoolFoamColor, uPoolFallback;
uniform float uWallPlane, uRockDepth, uReflectionSteps; // rock relief range marched by reflections
uniform float uPoolHeight, uFresnelBase, uReflectivity, uPoolGloss, uShoreSoftness;
uniform float uRippleScale, uRippleSpeed, uRippleSlope, uChurn, uChurnWidth, uChurnScale, uChurnSpeed;
uniform float uPoolFoam, uFoamThreshold, uCurtainReflection;
uniform int uView; // 0 pool, 1 ripple target, 2 normals, 3 reflection only
varying vec3 vWorld;
const int MAX_REFLECTION_STEPS = 16; // loop bound for uReflectionSteps (WebGL needs a constant)
// __WATER__
// __LIGHT__
// __CURTAIN__
// Gradient of value noise by forward differences (one noise cell = unit p).
vec2 noiseSlope(vec2 p) {
  float h = noise2(p);
  return vec2(noise2(p + vec2(0.25, 0.0)) - h, noise2(p + vec2(0.0, 0.25)) - h) / 0.25;
}
// Signed ring height (R - G) at ripple-target uv.
float ringHeight(vec2 uv) {
  vec4 s = texture2D(uRippleTexture, uv);
  return s.r - s.g;
}
vec3 unproject(vec2 uv, float ndcZ) {
  vec4 view = uProjectionInverse * vec4(uv * 2.0 - 1.0, ndcZ, 1.0);
  return (uCameraWorld * vec4(view.xyz / view.w, 1.0)).xyz;
}
void main() {
  vec2 screenUv = gl_FragCoord.xy / uBufferSize;
  // Soft shoreline: fade out within uShoreSoftness metres in front of the
  // captured rock, so the plane never cuts a hard line through the wall.
  float poolDistance = distance(vWorld, cameraPosition);
  float depth = texture2D(uSceneDepth, screenUv).r;
  float wallDistance = depth < 1.0 ? distance(unproject(screenUv, depth * 2.0 - 1.0), cameraPosition) : 1e6;
  float shore = smoothstep(0.0, uShoreSoftness, wallDistance - poolDistance);
  if (shore <= 0.0) discard;

  // Slopes dh/dx, dh/dz of the surface (unitless). The second ambient octave
  // (rotated, x2.1, half weight) is a fixed layout, not an art control.
  vec2 q = vWorld.xz * uRippleScale;
  vec2 drift = vec2(1.0, 0.7) * uTime * uRippleSpeed;
  vec2 slope = (noiseSlope(q + drift) + 0.5 * noiseSlope(mat2(0.8, -0.6, 0.6, 0.8) * q * 2.1 - drift)) * uRippleSlope;
  // Churn: stronger, faster ripples in a band in front of the base impact line.
  // Its ends soften over the water's own ragged edge width.
  float edge = max(uCurtainEdgeUv * uCurtainWidth, 1e-3);
  float across = 1.0 - smoothstep(0.5 * uCurtainWidth - edge, 0.5 * uCurtainWidth + edge, abs(vWorld.x));
  float band = across * exp(-vWorld.z * vWorld.z / max(uChurnWidth * uChurnWidth, 1e-4));
  vec2 churn = vWorld.xz * uChurnScale + vec2(0.0, uTime * uChurnSpeed);
  slope += noiseSlope(churn) * uChurn * band;
  vec2 ringUv = (vWorld.xz - uRippleDomain.xy) / uRippleDomain.zw;
  // A landing beyond the target fades out toward its edge instead of being cut.
  vec2 inside = min(ringUv, 1.0 - ringUv) * uRippleDomain.zw;
  float inDomain = smoothstep(0.0, uRippleEdge, min(inside.x, inside.y));
  vec2 metresPerTexel = uRippleTexel * uRippleDomain.zw;
  slope += inDomain * uRingHeight * vec2(
    (ringHeight(ringUv + vec2(uRippleTexel.x, 0.0)) - ringHeight(ringUv - vec2(uRippleTexel.x, 0.0))) / (2.0 * metresPerTexel.x),
    (ringHeight(ringUv + vec2(0.0, uRippleTexel.y)) - ringHeight(ringUv - vec2(0.0, uRippleTexel.y))) / (2.0 * metresPerTexel.y));
  vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 R = reflect(-V, N);
  R = normalize(vec3(R.x, max(R.y, 1e-3), R.z)); // a ripple never reflects below the surface

  // Rock: march the reflected ray through the rock's depth range (planes from
  // the undisplaced wall back to its deepest recess), stopping at the first
  // point the captured rock hides. That pixel of the wall capture is what the
  // ray sees. The ray rises as it goes back, so it finds rock above the water.
  vec3 rock = uPoolFallback;
  if (R.z < -1e-4) {
    vec2 uv = vec2(0.5);
    for (int i = 0; i < MAX_REFLECTION_STEPS; i++) {
      if (float(i) >= uReflectionSteps) break;
      float z = uWallPlane - uRockDepth * float(i) / max(uReflectionSteps - 1.0, 1.0);
      vec4 clip = uProjection * viewMatrix * vec4(vWorld + R * ((z - vWorld.z) / R.z), 1.0);
      uv = clip.xy / clip.w * 0.5 + 0.5;
      if (texture2D(uSceneDepth, uv).r < clip.z / clip.w * 0.5 + 0.5) break;
    }
    vec2 halfTexel = 0.5 / uTargetSize;
    // Fade to the fallback where the reflected point leaves the captured frame.
    float onScreen = smoothstep(0.0, 0.05, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
    rock = mix(uPoolFallback, texture2D(uWallTexture, clamp(uv, halfTexel, 1.0 - halfTexel)).rgb, onScreen);
  }
  vec3 reflection = rock;
  // Curtain: the same flow noise, coverage and lighting as the water, over the rock behind it.
  float sheet = curtainDistance(vWorld, R);
  if (sheet < CURTAIN_MISS) {
    vec3 c = vWorld + R * sheet;
    vec2 cuv = vec2(c.x / uCurtainWidth + 0.5, c.y / uCurtainHeight);
    float n = waterNoise(cuv);
    float streak = mix(1.0, n, uStreakContrast);
    float beam = shaftMask(c) * uLightIntensity;
    float alpha = clamp(uOpacity * waterCoverage(cuv, n) * streak, 0.0, 1.0) * uCurtainReflection;
    vec3 water = rock * uTransmission + uWaterColor * (uAmbient + beam * streak);
    reflection = mix(rock, water, clamp(alpha, 0.0, 1.0));
  }

  float beam = shaftMask(vWorld) * uLightIntensity;
  vec3 L = normalize(uLightPosition - vWorld);
  float fresnel = uReflectivity * (uFresnelBase + (1.0 - uFresnelBase) * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 5.0));
  vec3 body = uPoolColor * (uBounceColor * uBounce + uLightColor * beam);
  vec3 color = mix(body, reflection, fresnel);
  color += uLightColor * beam * pow(max(dot(R, L), 0.0), uPoolGloss) * fresnel;
  // Foam: churn along the impact line plus fresh ring crests, lit like the rock.
  vec4 rings = texture2D(uRippleTexture, ringUv);
  float churnFoam = band * smoothstep(uFoamThreshold, 1.0, noise2(churn));
  float foam = clamp(uPoolFoam * churnFoam + inDomain * rings.b, 0.0, 1.0);
  color = mix(color, uPoolFoamColor * (uBounceColor * uBounce + uLightColor * beam), foam);

  float alpha = shore;
  if (uView == 1) { color = inDomain * vec3(rings.r, rings.g, rings.b) * 2.0; alpha = 1.0; }
  if (uView == 2) { color = N * 0.5 + 0.5; alpha = 1.0; }
  if (uView == 3) { color = reflection; alpha = 1.0; }
  gl_FragColor = vec4(color, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <premultiplied_alpha_fragment>
}

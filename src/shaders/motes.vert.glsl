// Dust and mist sampled in the shared shaft cone: distance along the axis,
// then a disc whose radius follows the cone. They are lit only by
// shaftMask, so anything outside the beam adds nothing (additive black).
attribute vec4 aSeed;  // x along-phase, y radius, z angle, w density rank
attribute float aVary; // independent size/speed variation [0,1)
attribute float aKind; // 0 = dust, 1 = mist
uniform float uWallDepth, uWallFade, uEdgeFade, uSpread, uSwirl, uWobble, uWobbleRate;
uniform float uDensity, uDustSize, uDustBrightness, uDustSoftness, uDustTwinkleRate, uDrift, uAlongStart, uAlongEnd;
uniform float uMistSize, uMistOpacity, uMistSoftness, uMistDrift, uMistAlongStart, uMistAlongEnd;
uniform vec3 uMistColor;
varying vec3 vColor;
varying float vAlpha, vSoftness;
// __LIGHT__
// __PARTICLES__
// Incommensurate wobble ratios keep each mote's path from visibly repeating.
const vec3 WOBBLE = vec3(1.0, 0.7718, 0.5873);
void main() {
  bool mist = aKind > 0.5;
  if (!mist && aSeed.w >= uDensity) { retire(); return; }
  float start = mist ? uMistAlongStart : uAlongStart;
  float span = max((mist ? uMistAlongEnd : uAlongEnd) - start, 1e-3);
  // Slow drift down the beam, wrapping; edge fades hide the wrap.
  float s = fract(aSeed.x + uTime * (mist ? uMistDrift : uDrift) * (0.5 + aVary) / span);
  float along = start + span * s;
  float cosine = max(uLightCosOuter, 1e-3);
  float radius = along * sqrt(max(1.0 - cosine * cosine, 0.0)) / cosine * uSpread * sqrt(aSeed.y);
  float angle = TAU * aSeed.z + uTime * uSwirl * (aVary - 0.5);
  vec3 axis = uLightDirection;
  vec3 side = normalize(cross(axis, abs(axis.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 up = cross(side, axis);
  vec3 world = uLightPosition + axis * along + (side * cos(angle) + up * sin(angle)) * radius;
  world += uWobble * sin(uTime * uWobbleRate * (0.5 + aVary) * WOBBLE + TAU * aSeed.wzy);
  float envelope = smoothstep(0.0, uEdgeFade, s) * (1.0 - smoothstep(1.0 - uEdgeFade, 1.0, s))
    * smoothstep(uWallDepth, uWallDepth + uWallFade, world.z);
  float beam = shaftMask(world) * uLightIntensity;
  vec4 viewPosition = viewMatrix * vec4(world, 1.0);
  if (mist) {
    vAlpha = envelope * uMistOpacity;
    vColor = uMistColor * beam;
    vSoftness = uMistSoftness;
    gl_PointSize = spriteSize(viewPosition, uMistSize * (0.6 + 0.8 * aVary), vAlpha);
  } else {
    vAlpha = envelope;
    float flicker = 1.0 - uTwinkle + uTwinkle * (0.5 + 0.5 * sin(uTime * uDustTwinkleRate + TAU * aVary));
    vColor = uLightColor * beam * uDustBrightness * flicker;
    vSoftness = uDustSoftness;
    gl_PointSize = spriteSize(viewPosition, uDustSize * (0.5 + aVary), vAlpha);
  }
  gl_Position = projectionMatrix * viewPosition;
}

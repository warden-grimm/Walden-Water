// Low mist over the pool: large soft billboards drifting sideways in a thin
// layer above the water. A faint ambient (bounce) term keeps it barely
// visible in the dark; the shared shaft mask brightens any it reaches.
attribute vec4 aSeed;  // x drift phase, y height, z depth, w swell phase
attribute float aVary; // independent size/speed variation [0,1)
uniform float uMistSize, uMistOpacity, uMistAmbient, uMistSoftness, uMistDrift, uMistLow, uMistHigh;
uniform float uMistBack, uMistFront, uMistWidth, uMistEdgeFade, uMistSwell, uMistSwellRate;
uniform vec3 uMistColor, uBounceColor;
uniform float uBounce;
varying vec3 vColor;
varying float vAlpha, vSoftness;
// __LIGHT__
// __PARTICLES__
// __CURTAIN__
void main() {
  // Sideways drift across a band uMistWidth wide, wrapping; the edge fade hides the wrap.
  float s = fract(aSeed.x + uTime * uMistDrift * (0.6 + 0.8 * aVary) / uMistWidth);
  vec3 world = vec3((s - 0.5) * uMistWidth, mix(uMistLow, uMistHigh, aSeed.y), mix(uMistBack, uMistFront, aSeed.z));
  float swell = 1.0 + uMistSwell * sin(uTime * uMistSwellRate * (0.5 + aVary) + TAU * aSeed.w);
  vec4 viewPosition = viewMatrix * vec4(world, 1.0);
  vAlpha = uMistOpacity * smoothstep(0.0, uMistEdgeFade, s) * (1.0 - smoothstep(1.0 - uMistEdgeFade, 1.0, s));
  vec3 light = uBounceColor * uBounce * uMistAmbient + uLightColor * shaftMask(world) * uLightIntensity;
  vColor = uMistColor * light * curtainTransmission(world);
  vSoftness = uMistSoftness;
  gl_PointSize = spriteSize(viewPosition, uMistSize * (0.6 + 0.8 * aVary) * swell, vAlpha);
  gl_Position = projectionMatrix * viewPosition;
}

uniform sampler2D uWallTexture;
uniform vec2 uBufferSize, uTargetSize;
uniform vec3 uWaterColor;
uniform float uOpacity, uEdgeWidth, uBreakup, uBreakupStart, uBreakupSoftness;
uniform float uWidth, uEdgeRaggedness, uLipFade;
uniform float uStreakContrast, uNormalStrength, uNormalStep, uFresnel, uFresnelPower;
uniform float uRefractionStrength, uTransmission, uGlint, uGloss, uAmbient;
uniform bool uRefraction;
uniform bool uFieldOverlay;
uniform int uView;
varying vec2 vUv;
varying vec3 vWorld, vNormal;
// __WATER__
// __LIGHT__
// __FIELD__
void main() {
  float n = waterNoise(vUv);
  vec2 stepUv = vec2(uNormalStep, 0.0);
  // Derivatives per world metre, not per UV step; strength is a height scale.
  float dx = (waterNoise(vUv + stepUv.xy) - waterNoise(vUv - stepUv.xy)) / (2.0 * uNormalStep * uWidth);
  float dy = (waterNoise(vUv + stepUv.yx) - waterNoise(vUv - stepUv.yx)) / (2.0 * uNormalStep * uHeight);
  vec3 N = normalize(vNormal + vec3(-dx, -dy, 0.0) * uNormalStrength);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(uLightPosition - vWorld);
  vec3 H = normalize(L + V);
  float edge = min(vUv.x, 1.0 - vUv.x);
  float edgeFade = smoothstep(0.0, uEdgeWidth, edge - (n - 0.5) * uEdgeRaggedness);
  float down = 1.0 - vUv.y;
  float tearing = uBreakup * max(1.0 - edgeFade, smoothstep(uBreakupStart, 1.0, down));
  float coverage = edgeFade * smoothstep(tearing, tearing + uBreakupSoftness, n) * smoothstep(0.0, uLipFade, down);
  float streak = mix(1.0, n, uStreakContrast);
  float beam = shaftMask(vWorld);
  float fresnel = uFresnel * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), uFresnelPower);
  vec2 screenUv = gl_FragCoord.xy / uBufferSize;
  vec2 offset = uRefraction ? N.xy * uRefractionStrength : vec2(0.0);
  // Sample only the completed wall target, in linear working colour space.
  // Half-texel clamps prevent repeat/undefined edge fetches at any resolution.
  vec2 halfTexel = 0.5 / uTargetSize;
  vec3 behind = texture2D(uWallTexture, clamp(screenUv + offset, halfTexel, 1.0 - halfTexel)).rgb;
  float glint = pow(max(dot(N, H), 0.0), uGloss) * uGlint * beam * uLightIntensity;
  vec3 color = behind * uTransmission + uWaterColor * (uAmbient + beam * uLightIntensity * streak + fresnel * beam);
  color += uLightColor * glint;
  float alpha = uOpacity * coverage * streak;
  if (uView == 1) { color = vec3(0.5 + 0.5 * sin(6.28318530718 * uFlowFrequency * flowPhase(vUv.y))); alpha = 1.0; }
  if (uView == 2) { color = vec3(vUv, 0.0); alpha = 1.0; }
  if (uView == 3) { color = behind; alpha = 1.0; }
  if (uView == 4) { color = vec3(coverage); alpha = 1.0; }
  if (uView == 5) { color = vec3(beam); alpha = 1.0; }
  if (uFieldOverlay) {
    vec2 field = sampleField(vUv);
    color = vec3(max(-field.x, 0.0), field.y, max(field.x, 0.0)); alpha = 1.0;
  }
  gl_FragColor = vec4(color, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  // Premultiply after output conversion; NormalBlending uses ONE, ONE_MINUS_SRC_ALPHA.
  #include <premultiplied_alpha_fragment>
}

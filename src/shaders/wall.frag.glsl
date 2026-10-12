uniform float uTime, uLacunarity, uGain;
uniform vec3 uRockColor, uMossColor, uBounceColor;
uniform float uAlbedoScale, uAlbedoVariation, uMoss, uMossThreshold, uMossSoftness;
uniform float uBounce, uCreviceShade, uDrySpecular;
uniform bool uWetSheen;
uniform float uCurtainWidth, uWetMargin, uWetFrequency, uWetThreshold, uWetSoftness;
uniform float uCurtainHeight, uWetVerticalFade, uWetWarp;
uniform float uTrickleSpeed, uTrickleFrequency, uTrickleContrast, uWetSpecular, uGloss;
uniform int uView;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vRock;
varying float vCrevice;
// __NOISE__
// __LIGHT__
void main() {
  // Interpolated surface differential; orient the folded underside toward view.
  vec3 N = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 L = normalize(uLightPosition - vWorld);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 H = normalize(L + V);
  float beam = shaftMask(vWorld);
  // Rotate the layered albedo domain to avoid obvious axis-aligned square cells.
  float variation = fbm(mat2(0.8, -0.6, 0.6, 0.8) * vRock * uAlbedoScale);
  vec3 albedo = uRockColor * mix(1.0 - uAlbedoVariation, 1.0 + uAlbedoVariation, variation);
  float moss = smoothstep(uMossThreshold, uMossThreshold + uMossSoftness, vCrevice) * uMoss;
  albedo = mix(albedo, uMossColor, moss);
  float occlusion = 1.0 - uCreviceShade * vCrevice;
  float local = 1.0 - smoothstep(uCurtainWidth * 0.5, uCurtainWidth * 0.5 + uWetMargin, abs(vWorld.x));
  local *= smoothstep(0.0, uWetVerticalFade, vWorld.y)
    * (1.0 - smoothstep(uCurtainHeight - uWetVerticalFade, uCurtainHeight, vWorld.y));
  float streak = smoothstep(uWetThreshold, uWetThreshold + uWetSoftness,
    fbm(vec2(vRock.x * uWetFrequency + uWetWarp * noise2(vRock), vRock.y / uWetFrequency)));
  // +time in a +Y-up field makes a fixed phase move DOWN in world space.
  float trickle = 0.5 + 0.5 * sin((vWorld.y + uTime * uTrickleSpeed) * uTrickleFrequency
    + noise2(vec2(vRock.x * uWetFrequency, 0.0)) * 6.28318530718);
  float wet = uWetSheen ? local * streak * mix(1.0 - uTrickleContrast, 1.0, trickle) : 0.0;
  float specular = pow(max(dot(N, H), 0.0), uGloss) * (uDrySpecular + wet * uWetSpecular);
  vec3 color = albedo * occlusion * (uBounceColor * uBounce + uLightColor * uLightIntensity * beam * max(dot(N, L), 0.0));
  color += uLightColor * uLightIntensity * beam * specular;
  if (uView == 1) color = N * 0.5 + 0.5;
  if (uView == 2) color = vec3(beam);
  if (uView == 3) color = vec3(wet);
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}

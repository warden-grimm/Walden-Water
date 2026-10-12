// Shared world-space contract. Axis points FROM source TOWARD the curtain.
// The same mask is intended for M3 water, M5 particles, and M6 shaft volume.
uniform vec3 uLightPosition, uLightDirection, uLightColor;
uniform float uLightCosOuter, uLightCosInner, uLightIntensity;
uniform float uLightRange, uLightFadeStart;
float shaftMask(vec3 worldPosition) {
  vec3 offset = worldPosition - uLightPosition;
  float distanceToLight = length(offset);
  float along = dot(offset, uLightDirection);
  float cone = smoothstep(uLightCosOuter, uLightCosInner,
    dot(offset / max(distanceToLight, 0.0001), uLightDirection));
  return cone * (1.0 - smoothstep(uLightFadeStart, uLightRange, along)) * step(0.0, along);
}

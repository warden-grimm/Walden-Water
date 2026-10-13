// Ripple rings drawn as point sprites into the pool's ripple target. The
// target covers a fixed rectangle of the pool surface (y = pool), mapped
// u = (x - xMin) / xSize, v = (z - zMin) / zSize; Pool.js samples it with the
// same mapping. Requires particles-common (uTime, uMaxPointSize, retire).
uniform vec4 uRippleDomain;         // xMin, zMin, xSize, zSize in metres
uniform float uRipplePixelsPerMetre; // target texels per metre (equal in x and z)
uniform float uRingSpeed, uRingWavelength, uRingLife, uRingFoam;
varying float vRingRadius, vRingExtent, vRingAmplitude, vRingFoam;
// An expanding ring centred on pool point p, `age` seconds after impact,
// lasting `life` seconds. The crest leaves the impact at uRingSpeed; height
// fades with age and spreads (1/sqrt radius) so energy thins as it grows.
void ring(vec3 p, float age, float life, float amplitude) {
  if (age < 0.0 || age >= life || amplitude <= 0.0) { retire(); return; }
  float radius = 0.5 * uRingWavelength + uRingSpeed * age;
  float fade = 1.0 - age / life;
  vRingAmplitude = amplitude * fade * fade * inversesqrt(1.0 + radius / uRingWavelength);
  // A brief bright crest right after impact, gone within the first quarter of life.
  vRingFoam = uRingFoam * amplitude * (1.0 - smoothstep(0.0, 0.25 * life, age));
  vRingRadius = radius;
  vec2 uv = (p.xz - uRippleDomain.xy) / uRippleDomain.zw;
  gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
  // Two wavelengths beyond the crest the packet is below 1e-3. If the device
  // limit clamps the sprite, the fragment uses the actual (clipped) extent.
  gl_PointSize = min(2.0 * (radius + 2.0 * uRingWavelength) * uRipplePixelsPerMetre, uMaxPointSize);
  vRingExtent = 0.5 * gl_PointSize / uRipplePixelsPerMetre;
}

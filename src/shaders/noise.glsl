// Deterministic value noise. Hash coefficients and cubic interpolation are fixed
// algorithm constants; geological frequencies/amplitudes come from config.
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise2(vec2 p) {
  vec2 cell = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(cell), hash21(cell + vec2(1, 0)), u.x),
             mix(hash21(cell + vec2(0, 1)), hash21(cell + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float sum = 0.0, weight = 1.0, total = 0.0;
  // Four bounded octaves; no dynamic loop or texture lookup.
  for (int i = 0; i < 4; i++) {
    sum += weight * noise2(p);
    total += weight;
    p *= uLacunarity;
    weight *= uGain;
  }
  return sum / total;
}

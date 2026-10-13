// One ring's height profile, summed additively (ONE, ONE) into the cleared
// ripple target. Signed height is split into R (positive) and G (negative) so
// the same encoding works in half-float and byte targets; B is crest foam.
uniform float uRingWavelength;
varying float vRingRadius, vRingExtent, vRingAmplitude, vRingFoam;
const float TAU = 6.28318530718;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = length(p) * vRingExtent; // metres from the impact point
  float x = (d - vRingRadius) / uRingWavelength;
  // One-wavelength wave packet: leading crest, trailing trough, zero mean.
  float envelope = exp(-2.0 * x * x);
  float h = vRingAmplitude * sin(TAU * x) * envelope;
  gl_FragColor = vec4(max(h, 0.0), max(-h, 0.0), vRingFoam * envelope, 0.0);
}

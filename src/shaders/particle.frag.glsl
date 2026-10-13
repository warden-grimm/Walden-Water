// Soft round sprite shared by droplets and motes. Additive, premultiplied
// output: order-independent, so overlapping points need no sorting.
varying vec3 vColor;
varying float vAlpha, vSoftness;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(p, p);
  if (r2 >= 1.0) discard;
  // Gaussian core times (1 - r^2) so the profile reaches exactly zero at the rim.
  float coverage = exp(-vSoftness * r2) * (1.0 - r2);
  gl_FragColor = vec4(vColor, vAlpha * coverage);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <premultiplied_alpha_fragment>
}

// Final pass of the post-processing chain. The scene arrives already tone
// mapped and sRGB encoded by its own materials (exactly as they draw to the
// canvas), with bloom added. This pass only darkens the edges, in display
// space, and writes the result unchanged otherwise.
uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uVignette, uVignetteStart, uVignetteEnd;
varying vec2 vUv;
void main() {
  vec3 color = texture2D(uScene, vUv).rgb;
  // Aspect-corrected radius, 1 at the frame corners.
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  float radius = length((vUv - 0.5) * 2.0 * aspect) / length(aspect);
  color *= 1.0 - uVignette * smoothstep(uVignetteStart, uVignetteEnd, radius);
  gl_FragColor = vec4(color, 1.0);
}

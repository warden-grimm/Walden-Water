// Final pass of the post-processing chain. The scene arrives already tone
// mapped and sRGB encoded by its own materials (exactly as they draw to the
// canvas), with bloom added. This pass only darkens the edges and adds film
// grain, in display space, and writes the result unchanged otherwise.
uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uTime, uVignette, uVignetteStart, uVignetteEnd;
uniform float uGrain, uGrainRate, uGrainShadow;
uniform float uLacunarity, uGain; // declared for the shared noise chunk's fbm (unused here)
varying vec2 vUv;
// __NOISE__
void main() {
  vec3 color = texture2D(uScene, vUv).rgb;
  // Aspect-corrected radius, 1 at the frame corners.
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  float radius = length((vUv - 0.5) * 2.0 * aspect) / length(aspect);
  color *= 1.0 - uVignette * smoothstep(uVignetteStart, uVignetteEnd, radius);
  gl_FragColor = vec4(color, 1.0);
  // Grain: triangular, zero-mean noise per pixel, re-seeded uGrainRate times a
  // second. It fades out in deep shadow so it never lifts the blacks.
  vec2 seed = gl_FragCoord.xy + floor(uTime * uGrainRate) * vec2(17.0, 59.0);
  float grain = hash21(seed) + hash21(seed + 0.5) - 1.0;
  float luma = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  gl_FragColor.rgb = max(gl_FragColor.rgb + grain * uGrain * smoothstep(0.0, uGrainShadow, luma), 0.0);
}

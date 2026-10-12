varying vec2 vUv;
varying vec2 vProbe;
uniform int uMode, uPointerCount;
uniform vec4 uSegments[10];
uniform float uStrengths[10];
uniform vec2 uWorldSize;
uniform float uDelta, uRadius, uRecovery, uDiffusion, uNeutralThreshold;
uniform float uLipSpeed, uGravity, uFlowSpeed, uTransport;
// __FIELD__
void main() {
  if (uMode == 1) { gl_FragColor = encodeField(vec2(vUv.x < 0.5 ? -0.75 : 0.75, vUv.y < 0.5 ? 0.25 : 0.75)); return; }
  if (uMode == 2) { gl_FragColor = vec4(vProbe.x * 0.5 + 0.5, vProbe.y, 0.0, 1.0); return; }
  if (uMode == 3) { gl_FragColor = encodeField(vec2(0.0)); return; }
  if (uMode == 4) { gl_FragColor = packField(sampleField(vUv)); return; }
  // Backtrace falling water analytically: v is bottom-up, so the source is
  // ABOVE this pixel. The exterior returns neutral; no clamped edge ghosts.
  float distance = (1.0 - vUv.y) * uWorldSize.y;
  float travel = uDelta * uFlowSpeed * uTransport;
  float speed = sqrt(uLipSpeed * uLipSpeed + 2.0 * uGravity * distance);
  float upstream = distance - speed * travel + 0.5 * uGravity * travel * travel;
  vec2 source = vec2(vUv.x, 1.0 - upstream / uWorldSize.y);
  vec2 texel = 1.0 / uFieldSize;
  vec2 field = sampleField(source);
  vec2 neighbors = (sampleField(source + vec2(texel.x, 0.0)) + sampleField(source - vec2(texel.x, 0.0))
    + sampleField(source + vec2(0.0, texel.y)) + sampleField(source - vec2(0.0, texel.y))) * 0.25;
  field = mix(field, neighbors, 1.0 - exp(-uDiffusion * uDelta));
  field *= exp(log(uNeutralThreshold) * uDelta / uRecovery);
  if (abs(field.x) < uNeutralThreshold) field.x = 0.0;
  if (field.y < uNeutralThreshold) field.y = 0.0;
  vec2 injection = vec2(0.0);
  for (int i = 0; i < 10; i++) {
    if (i >= uPointerCount) break;
    // A swept Gaussian capsule fills the interval between input frames.
    // Held obstacles are pinned with max, not added once per refresh.
    vec2 a = uSegments[i].xy * uWorldSize, b = uSegments[i].zw * uWorldSize;
    vec2 point = vUv * uWorldSize, line = b - a;
    float denominator = dot(line, line);
    float along = denominator > 0.0 ? clamp(dot(point - a, line) / denominator, 0.0, 1.0) : 0.0;
    vec2 offset = (point - mix(a, b, along)) / uRadius;
    float pressure = exp(-0.5 * dot(offset, offset)) * uStrengths[i];
    injection.x += pressure * clamp(offset.x, -1.0, 1.0);
    injection.y = max(injection.y, pressure);
  }
  injection = clamp(injection, vec2(-1.0, 0.0), vec2(1.0));
  if (abs(injection.x) > abs(field.x)) field.x = injection.x;
  field.y = max(field.y, injection.y);
  gl_FragColor = encodeField(field);
}

uniform float uTime, uHeight, uLipSpeed, uGravity, uFlowSpeed, uFlowFrequency;
uniform float uStreakFrequency, uStreakStretch, uWarp;
uniform float uLacunarity, uGain;
// __NOISE__
float waterTravel(float down) {
  // Rationalized quadratic root avoids cancellation near the lip and remains
  // defined when gravity is zero. Lip speed is strictly positive in config.
  return 2.0 * down / (sqrt(uLipSpeed * uLipSpeed + 2.0 * uGravity * down) + uLipSpeed);
}
float flowPhase(float v) {
  return waterTravel(max(0.0, (1.0 - v) * uHeight)) - uTime * uFlowSpeed;
}
float waterNoise(vec2 uv) {
  float phase = flowPhase(uv.y);
  float warp = noise2(vec2(uv.x * uStreakFrequency / uLacunarity, phase * uFlowFrequency)) - 0.5;
  return fbm(vec2(uv.x * uStreakFrequency + uWarp * warp, phase * uFlowFrequency / uStreakStretch));
}

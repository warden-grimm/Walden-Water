// Analytic resting curtain (scene contract), shared by the shaft, motes, low
// mist and the pool reflection: x = (u - 0.5) width, y = v height,
// z = bow (1 - (2u - 1)^2) sin(pi v). GPU touch deformation is not included.
uniform float uCurtainWidth, uCurtainHeight, uCurtainBow;
uniform float uCurtainEdgeUv; // the water's ragged edge width in u, softens the sheet outline
uniform float uBehindCurtain; // share of light passing through the sheet (droplets.behindCurtain)
const float CURTAIN_MISS = 1e6;
// Ray parameter where ro + t rd meets the bowed sheet surface (bow included by
// two fixed-point steps), ignoring the sheet's rectangle.
float curtainHit(vec3 ro, vec3 rd) {
  if (abs(rd.z) < 1e-5) return CURTAIN_MISS;
  float t = -ro.z / rd.z;
  for (int i = 0; i < 2; i++) {
    vec3 p = ro + rd * t;
    float a = 2.0 * p.x / uCurtainWidth, v = p.y / uCurtainHeight;
    float z = uCurtainBow * max(1.0 - a * a, 0.0) * sin(3.14159265 * clamp(v, 0.0, 1.0));
    t = (z - ro.z) / rd.z;
  }
  return t;
}
// Distance to the resting curtain ahead of ro, or CURTAIN_MISS.
float curtainDistance(vec3 ro, vec3 rd) {
  float t = curtainHit(ro, rd);
  vec3 p = ro + rd * t;
  bool onSheet = t > 0.0 && t < CURTAIN_MISS && abs(p.x) <= 0.5 * uCurtainWidth && p.y >= 0.0 && p.y <= uCurtainHeight;
  return onSheet ? t : CURTAIN_MISS;
}
// Light from a point sprite at `world` reaching the camera: dimmed to
// uBehindCurtain when the sheet lies between them. The outline is softened by
// the water's own edge width so a drifting sprite never pops at the edge.
float curtainTransmission(vec3 world) {
  vec3 offset = world - cameraPosition;
  float d = length(offset);
  float t = curtainHit(cameraPosition, offset / max(d, 1e-4));
  if (t <= 0.0 || t >= d) return 1.0;
  vec3 p = cameraPosition + offset / max(d, 1e-4) * t;
  float soft = max(uCurtainEdgeUv * uCurtainWidth, 1e-3);
  float inside = smoothstep(0.0, soft, 0.5 * uCurtainWidth - abs(p.x)) * smoothstep(0.0, soft, p.y)
    * smoothstep(0.0, soft, uCurtainHeight - p.y);
  return mix(1.0, uBehindCurtain, inside);
}

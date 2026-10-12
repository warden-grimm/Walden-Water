uniform vec2 uWallSize;
uniform bool uDisplacement;
uniform float uRelief, uRockScale, uRidgeMix, uLacunarity, uGain;
uniform float uStrataFrequency, uStrataWarp, uLedgeDepth, uOverhang;
uniform float uNormalStep, uLedgeSharpness;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vRock;
varying float vCrevice;
// __NOISE__
vec3 surface(vec2 xy) {
  vec3 p = vec3(xy, 0.0);
  float broad = fbm(p.xy * uRockScale);
  float ridge = 1.0 - abs(2.0 * noise2(p.xy * uRockScale * uLacunarity) - 1.0);
  float phase = p.y * uStrataFrequency + broad * uStrataWarp;
  float shelf = pow(0.5 + 0.5 * sin(phase), uLedgeSharpness);
  // Narrow lips have an underside: y folds slightly as z protrudes. All z
  // remains behind the undisplaced wall, hence safely behind the curtain.
  if (uDisplacement) {
    p.z -= uRelief * mix(broad, ridge, uRidgeMix) + uLedgeDepth * (1.0 - shelf);
    p.y -= uOverhang * shelf;
  }
  return p;
}
void main() {
  vec2 xy = position.xy * uWallSize;
  vRock = xy;
  vec3 p = surface(xy);
  // Central differences of the SAME displaced surface give a smooth geometric
  // normal, including the y-fold. Step is in metres, independent of grid quality.
  vec3 dx = surface(xy + vec2(uNormalStep, 0)) - surface(xy - vec2(uNormalStep, 0));
  vec3 dy = surface(xy + vec2(0, uNormalStep)) - surface(xy - vec2(0, uNormalStep));
  vNormal = mat3(modelMatrix) * normalize(cross(dx, dy));
  float broad = fbm(xy * uRockScale);
  float shelf = pow(0.5 + 0.5 * sin(xy.y * uStrataFrequency + broad * uStrataWarp), uLedgeSharpness);
  vCrevice = (1.0 - shelf) * broad;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}

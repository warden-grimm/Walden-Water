varying vec2 vUv;
varying vec3 vWorld, vNormal;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  // The curtain uses translation only; the curvature is in the CPU geometry.
  vNormal = mat3(modelMatrix) * normal;
  gl_Position = projectionMatrix * viewMatrix * world;
}

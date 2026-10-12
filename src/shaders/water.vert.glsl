varying vec2 vUv;
varying vec2 vTouch;
varying vec3 vWorld, vRestWorld, vNormal;
uniform bool uFieldOverlay, uFieldAvailable;
uniform float uTouchRadius, uSidePush, uForwardPush;
// __FIELD__
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vRestWorld = world.xyz;
  vTouch = uFieldAvailable ? sampleField(uv) : vec2(0.0);
  if (!uFieldOverlay) {
    world.x += vTouch.x * uTouchRadius * uSidePush;
    // Push along the view ray, preserving the projected contact centre even
    // at portrait corners. Sideways displacement opens the sheet around it.
    world.xyz += normalize(cameraPosition - world.xyz) * vTouch.y * uTouchRadius * uForwardPush;
  }
  vWorld = world.xyz;
  // Smooth resting bow normal; fragment derivatives add the deformation delta.
  vNormal = mat3(modelMatrix) * normal;
  gl_Position = projectionMatrix * viewMatrix * world;
}

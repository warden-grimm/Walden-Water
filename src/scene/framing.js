export function cameraDistance(aspect, camera, curtain, markers) {
  const halfFov = Math.tan(camera.fov * Math.PI / 360);
  const height = curtain.height + markers.thickness + 2 * camera.driftY;
  const width = curtain.width + 2 * (markers.overhang + camera.driftX);
  return Math.max(height, width / aspect) / (2 * halfFov * camera.frameFill) + markers.depth;
}

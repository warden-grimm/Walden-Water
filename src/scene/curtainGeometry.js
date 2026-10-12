import { PlaneGeometry } from 'three';

// Actual CPU geometry, not shader-only deformation: Mesh.raycast sees exactly
// this surface. UV (0,0) is lower-left/pool; (1,1) is upper-right/lip.
export function createCurtainGeometry(settings) {
  const columns = settings[`${settings.quality}Columns`], rows = settings[`${settings.quality}Rows`];
  const geometry = new PlaneGeometry(settings.width, settings.height, columns, rows);
  const positions = geometry.attributes.position, normals = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < positions.count; i++) {
    const x = 2 * uv.getX(i) - 1, v = uv.getY(i);
    const z = settings.bow * (1 - x * x) * Math.sin(Math.PI * v);
    const dx = -4 * settings.bow * x / settings.width * Math.sin(Math.PI * v);
    const dy = settings.bow * (1 - x * x) * Math.PI / settings.height * Math.cos(Math.PI * v);
    const length = Math.hypot(dx, dy, 1);
    positions.setZ(i, z);
    normals.setXYZ(i, -dx / length, -dy / length, 1 / length);
  }
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

// This travel-time coordinate is mirrored in water-common.glsl. Constant
// phase = travelTime(distance) - time advects down with v=sqrt(v0²+2*g*d).
export function travelTime(distance, lipSpeed, gravity) {
  return 2 * distance / (Math.sqrt(lipSpeed * lipSpeed + 2 * gravity * distance) + lipSpeed);
}

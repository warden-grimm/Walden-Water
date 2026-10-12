import { IcosahedronGeometry, Mesh, MeshStandardMaterial } from 'three';

// Replace this placeholder with the project's water surface or loaded models.
export function createDemoObject() {
  const geometry = new IcosahedronGeometry(1.25, 1);
  const material = new MeshStandardMaterial({
    color: '#397e89',
    metalness: 0.15,
    roughness: 0.35,
    flatShading: true,
  });
  const mesh = new Mesh(geometry, material);
  mesh.position.y = 0.8;
  mesh.castShadow = true;
  mesh.rotation.z = 0.15;

  return {
    mesh,
    update(delta) {
      mesh.rotation.y += delta * 0.25;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

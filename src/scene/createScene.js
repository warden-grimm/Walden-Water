import { Color, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, Scene } from 'three';
import { cameraDistance } from './framing.js';

export function createScene(config, time) {
  const scene = new Scene();
  scene.background = new Color();
  const camera = new PerspectiveCamera();
  const geometry = new PlaneGeometry(1, 1);
  const wall = new Mesh(geometry, new MeshBasicMaterial());
  const curtain = new Mesh(geometry, new MeshBasicMaterial({ transparent: true, depthWrite: false }));
  const markerMaterial = new MeshBasicMaterial({ transparent: true, depthWrite: false });
  const lip = new Mesh(geometry, markerMaterial);
  const poolLine = new Mesh(geometry, markerMaterial);
  scene.add(wall, curtain, lip, poolLine, camera);
  let distance = 1;

  function updateCamera(reducedMotion) {
    const settings = config.camera;
    const phase = time.value * settings.driftSpeed;
    const drift = settings.drift && !reducedMotion;
    camera.position.set(
      drift ? Math.sin(phase) * settings.driftX : 0,
      config.curtain.height / 2 + (drift ? Math.sin(phase * settings.verticalRate) * settings.driftY : 0),
      distance,
    );
    camera.lookAt(0, config.curtain.height / 2, 0);
    // Ready for future raycasts before rendering, even while breathing.
    camera.updateMatrixWorld();
  }

  function configure(aspect, reducedMotion) {
    scene.background.set(config.renderer.background);
    wall.material.color.set(config.wall.color);
    wall.position.set(0, config.curtain.height / 2, config.wall.depth);
    wall.scale.set(config.wall.width, config.wall.height, 1);
    curtain.material.color.set(config.curtain.color);
    curtain.material.opacity = config.curtain.opacity;
    curtain.position.y = config.curtain.height / 2;
    curtain.scale.set(config.curtain.width, config.curtain.height, 1);
    markerMaterial.color.set(config.markers.color);
    markerMaterial.opacity = config.markers.opacity;
    lip.position.set(0, config.curtain.height, config.markers.depth);
    poolLine.position.set(0, 0, config.markers.depth);
    lip.scale.set(config.curtain.width + 2 * config.markers.overhang, config.markers.thickness, 1);
    poolLine.scale.copy(lip.scale);
    camera.fov = config.camera.fov;
    camera.near = config.camera.near;
    camera.far = config.camera.far;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    distance = cameraDistance(aspect, config.camera, config.curtain, config.markers);
    updateCamera(reducedMotion);
  }

  return {
    scene, camera, configure, updateCamera,
    dispose() {
      geometry.dispose();
      wall.material.dispose();
      curtain.material.dispose();
      markerMaterial.dispose();
      scene.clear();
    },
  };
}

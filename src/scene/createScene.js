import { Color, Mesh, MeshBasicMaterial, PlaneGeometry, Scene } from 'three';
import { createCamera } from './camera.js';
import { createLight } from './light.js';
import { createWall } from './Wall.js';

export function createScene(config, time) {
  const scene = new Scene();
  scene.background = new Color();
  const view = createCamera(config, time);
  const light = createLight(config.light);
  const wall = createWall(config, time, light);
  const geometry = new PlaneGeometry(1, 1);
  const curtain = new Mesh(geometry, new MeshBasicMaterial({ transparent: true, depthWrite: false }));
  const markerMaterial = new MeshBasicMaterial({ transparent: true, depthWrite: false });
  const lip = new Mesh(geometry, markerMaterial), poolLine = new Mesh(geometry, markerMaterial);
  scene.add(wall.mesh, curtain, lip, poolLine, view.camera);
  function configure(aspect, reducedMotion) {
    scene.background.set(config.renderer.background);
    view.configure(aspect, reducedMotion);
    light.configure();
    wall.configure(aspect);
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
  }
  return { scene, camera: view.camera, updateCamera: view.updateCamera, configure, light, wall,
    dispose() { wall.dispose(); geometry.dispose(); curtain.material.dispose(); markerMaterial.dispose(); scene.clear(); } };
}

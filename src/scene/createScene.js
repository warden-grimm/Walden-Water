import { Color, Mesh, MeshBasicMaterial, PlaneGeometry, Scene, ShaderMaterial } from 'three';
import { createCamera } from './camera.js';
import { createLight } from './light.js';
import { createWall } from './Wall.js';
import { createWallCapture } from './WallCapture.js';
import { createWaterCurtain } from './WaterCurtain.js';
import backgroundVertex from '../shaders/background.vert.glsl?raw';
import backgroundFragment from '../shaders/background.frag.glsl?raw';

export function createScene(config, time, renderer) {
  const scene = new Scene(), wallScene = new Scene();
  wallScene.background = new Color();
  const view = createCamera(config, time);
  const light = createLight(config.light);
  const wall = createWall(config, time, light);
  wall.mesh.name = 'wall'; wallScene.add(wall.mesh);
  const capture = createWallCapture(renderer, wallScene, view.camera, config.refraction);
  const curtain = createWaterCurtain(config, time, light, capture.texture);
  curtain.mesh.name = 'curtain';
  const geometry = new PlaneGeometry(1, 1);
  const backgroundMaterial = new ShaderMaterial({ uniforms: { uWallTexture: capture.texture },
    vertexShader: backgroundVertex, fragmentShader: backgroundFragment, depthTest: false, depthWrite: false });
  const background = new Mesh(geometry, backgroundMaterial);
  background.frustumCulled = false; background.renderOrder = -1;
  const markerMaterial = new MeshBasicMaterial({ transparent: true, depthWrite: false });
  const lip = new Mesh(geometry, markerMaterial), poolLine = new Mesh(geometry, markerMaterial);
  scene.add(background, curtain.mesh, lip, poolLine, view.camera);
  function configure(aspect, reducedMotion, bufferWidth, bufferHeight) {
    wallScene.background.set(config.renderer.background);
    view.configure(aspect, reducedMotion);
    light.configure();
    wall.configure(aspect);
    capture.resize(bufferWidth, bufferHeight);
    const target = capture.snapshot();
    curtain.configure(bufferWidth, bufferHeight, target.width, target.height);
    markerMaterial.color.set(config.markers.color);
    markerMaterial.opacity = config.markers.opacity;
    lip.position.set(0, config.curtain.height, config.markers.depth);
    poolLine.position.set(0, 0, config.markers.depth);
    lip.scale.set(config.curtain.width + 2 * config.markers.overhang, config.markers.thickness, 1);
    poolLine.scale.copy(lip.scale);
  }
  return { scene, camera: view.camera, updateCamera: view.updateCamera, configure, light, wall, curtain, capture,
    render() { capture.render(); renderer.render(scene, view.camera); },
    contextRestored: capture.contextRestored,
    dispose() { capture.dispose(); curtain.dispose(); wall.dispose(); geometry.dispose(); backgroundMaterial.dispose(); markerMaterial.dispose(); scene.clear(); wallScene.clear(); } };
}

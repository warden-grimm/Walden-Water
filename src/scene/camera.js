import { PerspectiveCamera } from 'three';
import { cameraDistance } from './framing.js';

export function createCamera(config, time) {
  const camera = new PerspectiveCamera();
  let distance = 1;
  function updateCamera(reducedMotion) {
    const s = config.camera, phase = time.value * s.driftSpeed;
    const drift = s.drift && !reducedMotion;
    camera.position.set(drift ? Math.sin(phase) * s.driftX : 0,
      config.curtain.height / 2 + (drift ? Math.sin(phase * s.verticalRate) * s.driftY : 0), distance);
    camera.lookAt(0, config.curtain.height / 2, 0);
    camera.updateMatrixWorld();
  }
  function configure(aspect, reducedMotion) {
    Object.assign(camera, { fov: config.camera.fov, near: config.camera.near, far: config.camera.far, aspect });
    camera.updateProjectionMatrix();
    distance = cameraDistance(aspect, config.camera, config.curtain, config.markers);
    updateCamera(reducedMotion);
  }
  return { camera, configure, updateCamera };
}

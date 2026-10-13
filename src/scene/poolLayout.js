import { wallSize } from './framing.js';

// Rectangle of the pool surface covered by the ripple target, in metres, and
// its size in texels (config.pool.rippleResolution texels per metre).
export function rippleDomain(settings) {
  const width = 2 * settings.rippleHalfWidth, depth = settings.rippleFront - settings.rippleBack;
  return { x: -settings.rippleHalfWidth, z: settings.rippleBack, width, depth,
    pixelsWide: Math.max(1, Math.round(width * settings.rippleResolution)),
    pixelsDeep: Math.max(1, Math.round(depth * settings.rippleResolution)) };
}

// Pool plane extent: the full wall width, from just behind the deepest rock
// recess (the soft shoreline hides what lies behind rock) to past the camera.
export function poolExtent(aspect, config, cameraZ) {
  const back = config.wall.depth - config.rock.relief - config.rock.ledgeDepth - config.pool.shoreSoftness;
  const front = cameraZ + 1;
  return { width: wallSize(aspect, config).width, back, front };
}

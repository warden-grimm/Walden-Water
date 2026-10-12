export function cameraDistance(aspect, camera, curtain, markers) {
  const halfFov = Math.tan(camera.fov * Math.PI / 360);
  const height = curtain.height + markers.thickness + 2 * camera.driftY;
  const width = curtain.width + 2 * (markers.overhang + camera.driftX);
  return Math.max(height, width / aspect) / (2 * halfFov * camera.frameFill) + markers.depth;
}

// Cover the farthest displaced depth at every allowed breathing phase. Tangent
// addition bounds yaw/pitch and avoids fixed-width edges in ultrawide viewports.
export function wallSize(aspect, config) {
  const distance = cameraDistance(aspect, config.camera, config.curtain, config.markers);
  const far = distance - config.wall.depth + config.rock.relief + config.rock.ledgeDepth;
  const vertical = Math.tan(config.camera.fov * Math.PI / 360);
  const horizontal = vertical * aspect;
  const yaw = config.camera.driftX / distance, pitch = config.camera.driftY / distance;
  return {
    width: Math.max(config.wall.width, 2 * (far * (horizontal + yaw) / (1 - horizontal * yaw) + config.camera.driftX + config.wall.padding)),
    height: Math.max(config.wall.height, 2 * (far * (vertical + pitch) / (1 - vertical * pitch) + config.camera.driftY + config.rock.overhang + config.wall.padding)),
  };
}

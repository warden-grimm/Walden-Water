import test from 'node:test';
import assert from 'node:assert/strict';
import { config, ranges, rebuildControls, choices } from '../src/config.js';
import { createCamera } from '../src/scene/camera.js';
import { poolExtent, rippleDomain } from '../src/scene/poolLayout.js';
import { impactTime } from '../src/scene/ballistics.js';

test('ripple target covers the impact line, sideways splash reach and the visible pool depth at square texels', () => {
  const s = config.pool, domain = rippleDomain(s);
  assert.equal(domain.pixelsWide, 864); assert.equal(domain.pixelsDeep, 384);
  // Equal texels per metre in x and z within 1%, so round point-sprite rings stay round.
  const px = domain.pixelsWide / domain.width, pz = domain.pixelsDeep / domain.depth;
  assert.ok(Math.abs(px / pz - 1) < 0.01);
  // The whole curtain base plus the base spray spread, behind and in front of the sheet.
  assert.ok(domain.x <= -config.curtain.width * config.spray.baseSpread / 2);
  assert.ok(domain.z <= 0 && domain.z + domain.depth >= s.impactDepth);
  // Sideways: landscape/desktop show far more pool (about +/-7.8 m) than droplets
  // can reach. A full-strength sideways swipe at the curtain's edge, from mid
  // height (mean seed: no jitter or spread), lands inside the fully weighted
  // region (before the edge fade). Rarer, harder landings fade out at the edge.
  const b = config.bursts;
  const reach = config.curtain.width / 2 + config.touch.radius * b.rim
    + b.fullSpeed * b.throw * impactTime(config.curtain.height / 2, b.lift, config.droplets.gravity);
  assert.ok(reach <= -domain.x - s.rippleEdge, `sideways reach ${reach}`);
  // Rings can be seen only on visible pool: the frustum's lower edge meets the
  // pool at z = camera z - camera height / tan(fov / 2 + drift pitch). The domain
  // must reach that far in every orientation (landings beyond it are off screen).
  const settings = structuredClone(config), view = createCamera(settings, { value: 0 });
  for (const aspect of [390 / 844, 844 / 390, 1440 / 900, 3]) {
    view.configure(aspect, true);
    const { y, z } = view.camera.position;
    const pitch = settings.camera.driftY / z;
    const visibleFront = z - y / Math.tan(settings.camera.fov * Math.PI / 360 + pitch);
    assert.ok(visibleFront <= domain.z + domain.depth, `aspect ${aspect}: ${visibleFront}`);
  }
});

test('pool plane spans the wall, starts behind the deepest rock and ends past the camera', () => {
  const settings = structuredClone(config), time = { value: 0 }, view = createCamera(settings, time);
  for (const aspect of [390 / 844, 844 / 390, 1440 / 900, 3]) {
    view.configure(aspect, true);
    const extent = poolExtent(aspect, settings, view.camera.position.z);
    assert.ok(extent.back < settings.wall.depth - settings.rock.relief - settings.rock.ledgeDepth);
    assert.ok(extent.front > view.camera.position.z);
    assert.ok(extent.width >= settings.wall.width);
  }
});

test('every pool and mist setting is a GUI control with a valid range or choice', () => {
  for (const group of ['pool', 'mist']) {
    for (const [key, value] of Object.entries(config[group])) {
      if (typeof value === 'number') {
        const [min, max] = ranges[group][key];
        assert.ok(value >= min && value <= max, `${group}.${key}`);
      } else if (choices[group]?.[key]) assert.ok(choices[group][key].includes(value), `${group}.${key}`);
    }
    for (const key of rebuildControls[group] ?? []) assert.ok(key in config[group], `${group}.${key}`);
  }
  const [min, max] = ranges.droplets.behindCurtain;
  assert.ok(config.droplets.behindCurtain >= min && config.droplets.behindCurtain <= max);
});

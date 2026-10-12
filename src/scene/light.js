import { Color, Vector3 } from 'three';

export function createLight(settings) {
  const uniforms = {
    uLightPosition: { value: new Vector3() }, uLightDirection: { value: new Vector3() },
    uLightColor: { value: new Color() }, uLightCosOuter: { value: 0 }, uLightCosInner: { value: 0 },
    uLightIntensity: { value: 0 }, uLightRange: { value: 0 }, uLightFadeStart: { value: 0 },
  };
  function configure() {
    const s = settings, u = uniforms;
    u.uLightPosition.value.set(s.x, s.y, s.z);
    u.uLightDirection.value.set(s.targetX, s.targetY, s.targetZ).sub(u.uLightPosition.value).normalize();
    u.uLightColor.value.set(s.color);
    u.uLightCosOuter.value = Math.cos(s.angle * Math.PI / 180);
    u.uLightCosInner.value = Math.cos(s.angle * (1 - s.penumbra) * Math.PI / 180);
    u.uLightIntensity.value = s.intensity;
    u.uLightRange.value = s.range;
    // GUI edits can cross: retain a finite nonzero fade interval.
    u.uLightFadeStart.value = Math.min(s.fadeStart, s.range - 0.001);
  }
  configure();
  return { uniforms, configure };
}

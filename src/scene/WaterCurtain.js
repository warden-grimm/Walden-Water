import { Color, Mesh, ShaderMaterial, Vector2 } from 'three';
import { choices } from '../config.js';
import { createCurtainGeometry } from './curtainGeometry.js';
import vertexShader from '../shaders/water.vert.glsl?raw';
import fragmentSource from '../shaders/water.frag.glsl?raw';
import common from '../shaders/water-common.glsl?raw';
import noise from '../shaders/noise.glsl?raw';
import lightSource from '../shaders/light.glsl?raw';
import fieldSource from '../shaders/field-common.glsl?raw';

export function createWaterCurtain(config, time, light, wallTexture, fieldUniforms) {
  const uniforms = { ...light.uniforms, ...fieldUniforms, uTime: time, uWallTexture: wallTexture,
    uFieldOverlay: { value: false },
    uBufferSize: { value: new Vector2() }, uTargetSize: { value: new Vector2() }, uView: { value: 0 } };
  const bindings = {
    uHeight: ['curtain', 'height'], uWidth: ['curtain', 'width'], uWaterColor: ['curtain', 'color'], uOpacity: ['curtain', 'opacity'],
    uLipSpeed: ['water', 'lipSpeed'], uGravity: ['water', 'gravity'], uFlowSpeed: ['water', 'flowSpeed'],
    uFlowFrequency: ['water', 'flowFrequency'], uStreakFrequency: ['water', 'streakFrequency'],
    uStreakStretch: ['water', 'streakStretch'], uWarp: ['water', 'warp'],
    uLacunarity: ['water', 'lacunarity'], uGain: ['water', 'gain'],
    uEdgeWidth: ['water', 'edgeWidth'], uEdgeRaggedness: ['water', 'edgeRaggedness'], uLipFade: ['water', 'lipFade'],
    uBreakup: ['water', 'breakup'], uBreakupStart: ['water', 'breakupStart'],
    uBreakupSoftness: ['water', 'breakupSoftness'], uStreakContrast: ['water', 'streakContrast'],
    uNormalStrength: ['water', 'normalStrength'], uNormalStep: ['water', 'normalStep'],
    uFresnel: ['water', 'fresnel'], uFresnelPower: ['water', 'fresnelPower'],
    uRefraction: ['refraction', 'enabled'], uRefractionStrength: ['refraction', 'strength'],
    uTransmission: ['water', 'transmission'], uGlint: ['water', 'glint'], uGloss: ['water', 'gloss'], uAmbient: ['water', 'ambient'],
  };
  for (const [name, [group, key]] of Object.entries(bindings)) {
    const value = config[group][key];
    uniforms[name] = { value: typeof value === 'string' ? new Color(value) : value };
  }
  const material = new ShaderMaterial({ uniforms, vertexShader,
    fragmentShader: fragmentSource.replace('// __WATER__', common.replace('// __NOISE__', noise)).replace('// __LIGHT__', lightSource).replace('// __FIELD__', fieldSource),
    transparent: true, depthWrite: false, premultipliedAlpha: true });
  // One front-facing sheet, one transparent draw: no back/front sorting passes.
  const mesh = new Mesh(createCurtainGeometry(config.curtain), material);
  mesh.renderOrder = 1;
  const s = config.curtain;
  let geometryKey = [s.width, s.height, s.bow, s.quality, s[`${s.quality}Columns`], s[`${s.quality}Rows`]].join(':');
  function configure(bufferWidth, bufferHeight, targetWidth, targetHeight) {
    const s = config.curtain;
    const key = [s.width, s.height, s.bow, s.quality, s[`${s.quality}Columns`], s[`${s.quality}Rows`]].join(':');
    if (geometryKey !== key) {
      const previous = mesh.geometry;
      mesh.geometry = createCurtainGeometry(s); previous.dispose(); geometryKey = key;
    }
    mesh.position.set(0, s.height / 2, 0);
    mesh.visible = s.visible;
    uniforms.uBufferSize.value.set(bufferWidth, bufferHeight);
    uniforms.uTargetSize.value.set(targetWidth, targetHeight);
    uniforms.uView.value = choices.water.view.indexOf(config.water.view);
    uniforms.uFieldOverlay.value = config.touch.overlay && fieldUniforms.uFieldAvailable.value;
    for (const [name, [group, field]] of Object.entries(bindings)) {
      const value = config[group][field];
      if (typeof value === 'string') uniforms[name].value.set(value); else uniforms[name].value = value;
    }
  }
  return { mesh, configure,
    snapshot: () => ({ quality: config.curtain.quality, columns: mesh.geometry.parameters.widthSegments, rows: mesh.geometry.parameters.heightSegments,
      visible: mesh.visible, view: config.water.view, refraction: config.refraction.enabled, uv: 'u left-to-right, v bottom-to-top', geometryMatchesRaycast: true }),
    dispose() { mesh.geometry.dispose(); material.dispose(); } };
}

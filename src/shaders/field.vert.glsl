varying vec2 vUv;
varying vec2 vProbe;
uniform int uMode;
uniform vec2 uProbeUv;
// __FIELD__
void main() {
  vUv = uv;
  vProbe = uMode == 2 ? sampleField(uProbeUv) : vec2(0.0);
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}

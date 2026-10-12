uniform sampler2D uWallTexture;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(uWallTexture, vUv);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}

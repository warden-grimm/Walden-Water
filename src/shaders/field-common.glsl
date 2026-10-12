uniform sampler2D uFieldTexture;
uniform vec2 uFieldSize;
uniform bool uFieldByte;

// Byte mode stores TWO 16-bit values, high byte first: RG is signed lateral
// force [-1,1], BA is pressure [0,1]. Exact neutral is RG=(128,0), BA=(0,0).
// Decode before interpolation: filtering packed bytes directly breaks carries.
vec2 decodeField(vec4 raw) {
  if (!uFieldByte) return raw.rg;
  vec2 integers = vec2(dot(raw.rg, vec2(65280.0, 255.0)), dot(raw.ba, vec2(65280.0, 255.0)));
  return vec2((integers.x - 32768.0) / 32767.0, integers.y / 65535.0);
}
vec4 packField(vec2 field) {
  field = clamp(field, vec2(-1.0, 0.0), vec2(1.0));
  vec2 n = floor(vec2(field.x * 32767.0 + 32768.0, field.y * 65535.0) + 0.5);
  vec2 hi = floor(n / 256.0), lo = n - hi * 256.0;
  return vec4(hi.x, lo.x, hi.y, lo.y) / 255.0;
}
vec4 encodeField(vec2 field) {
  return uFieldByte ? packField(field) : vec4(clamp(field, vec2(-1.0, 0.0), vec2(1.0)), 0.0, 1.0);
}
vec2 fieldTexel(vec2 pixel) {
  if (any(lessThan(pixel, vec2(0.0))) || any(greaterThanEqual(pixel, uFieldSize))) return vec2(0.0);
  return decodeField(texture2D(uFieldTexture, (pixel + 0.5) / uFieldSize));
}
vec2 sampleField(vec2 uv) {
  vec2 pixel = uv * uFieldSize - 0.5, base = floor(pixel), f = fract(pixel);
  return mix(mix(fieldTexel(base), fieldTexel(base + vec2(1.0, 0.0)), f.x),
    mix(fieldTexel(base + vec2(0.0, 1.0)), fieldTexel(base + vec2(1.0)), f.x), f.y);
}

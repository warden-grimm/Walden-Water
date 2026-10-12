// Intersect the analytical resting ribbon. This contact surface stays stable
// when a visible hole opens; fingers must not lose their obstacle through it.
// The mesh approximates this same bow. No triangle-hit arrays or GPU readbacks.
export function intersectCurtain(ray, settings, result) {
  const { width, height, bow } = settings;
  const o = ray.origin, d = ray.direction;
  if (Math.abs(d.z) < 1e-6) return false;
  let t = -o.z / d.z;
  for (let i = 0; i < 8; i++) {
    const x = o.x + d.x * t, y = o.y + d.y * t;
    const a = 2 * x / width, v = y / height;
    const sine = Math.sin(Math.PI * v);
    const surface = bow * (1 - a * a) * sine;
    const dx = -4 * bow * a / width * sine;
    const dy = bow * (1 - a * a) * Math.PI / height * Math.cos(Math.PI * v);
    const derivative = d.z - dx * d.x - dy * d.y;
    if (Math.abs(derivative) < 1e-6) return false;
    t -= (o.z + d.z * t - surface) / derivative;
  }
  const u = (o.x + d.x * t) / width + 0.5, v = (o.y + d.y * t) / height;
  if (t < 0 || u < 0 || u > 1 || v < 0 || v > 1 || !Number.isFinite(t)) return false;
  result.set(u, v);
  return true;
}

// Pool ring for each spray point: the same seeds, loop and ballistics as
// spray.vert.glsl, evaluated at the moment its droplet reaches the pool.
uniform float uSprayRing;
// __LIGHT__
// __PARTICLES__
// __SPRAY__
// __RING__
void main() {
  float vary, flight, period;
  sprayTiming(vary, flight, period);
  float clock = uTime + aSeed.x * period;
  float loop = floor(clock / period);
  // Most recent landing: this loop's drop if it has already landed, else the
  // previous loop's (rings may outlive the short rest between base loops).
  for (int k = 0; k < 2; k++) {
    float n = loop - float(k);
    vec3 origin, velocity;
    sprayLaunch(sprayFresh(n), vary, origin, velocity);
    float land = impactTime(origin.y, velocity.y);
    float age = clock - n * period - land;
    // Drops whose flight ends in the air (lip drops at defaults) make no ring.
    if (land <= flight + 1e-3 && age >= 0.0) {
      ring(ballistic(origin, velocity, land), age, uRingLife, uSprayRing);
      return;
    }
  }
  retire();
}

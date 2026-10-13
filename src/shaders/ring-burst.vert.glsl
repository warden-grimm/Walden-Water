// Pool ring for each touch-splash droplet: the same slot descriptor and seeds
// as burst.vert.glsl. Droplets whose lifetime ends in the air make no ring.
uniform float uBurstRing;
// __LIGHT__
// __PARTICLES__
// __BURST__
// __RING__
void main() {
  vec3 origin, velocity;
  float age, life;
  bool live = burstLaunch(origin, velocity, age, life);
  float land = impactTime(origin.y, velocity.y);
  if (!live || life < land - 1e-3) { retire(); return; }
  ring(ballistic(origin, velocity, land), age - land, uRingLife, uBurstRing);
}

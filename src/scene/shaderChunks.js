import light from '../shaders/light.glsl?raw';
import particles from '../shaders/particles-common.glsl?raw';
import spray from '../shaders/spray-launch.glsl?raw';
import burst from '../shaders/burst-launch.glsl?raw';
import curtain from '../shaders/curtain-common.glsl?raw';
import ring from '../shaders/ring-common.glsl?raw';

// Shared GLSL chunks, each inserted once at its `// __NAME__` marker. Sharing
// one source is what makes droplets and their pool rings follow identical math.
const chunks = { '// __LIGHT__': light, '// __PARTICLES__': particles, '// __SPRAY__': spray,
  '// __BURST__': burst, '// __CURTAIN__': curtain, '// __RING__': ring };

export function assemble(source) {
  for (const [marker, chunk] of Object.entries(chunks)) source = source.replace(marker, chunk);
  return source;
}

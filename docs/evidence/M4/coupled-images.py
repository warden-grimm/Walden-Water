"""Measure captured pressure peaks and deformation quality; does not edit images."""
import json, math
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).parent / 'coupled'
checks = json.loads((root / 'checks.json').read_text(encoding='utf-8'))
alignment = []
for entry in checks['alignment']:
    pixels = np.asarray(Image.open(root / (entry['name'] + '.png')).convert('RGB'))
    scale = pixels.shape[1] / entry['snapshot']['viewport']['width']
    x, y = entry['pointer']['x'] * scale, entry['pointer']['y'] * scale
    radius = int(12 * scale)
    x0, x1 = max(0, int(x)-radius), min(pixels.shape[1], int(x)+radius+1)
    y0, y1 = max(0, int(y)-radius), min(pixels.shape[0], int(y)+radius+1)
    gray = pixels[y0:y1, x0:x1].mean(axis=2)
    yy, xx = np.where(gray >= gray.max()-1)
    peak = ((x0 + xx.mean() + .5)/scale, (y0 + yy.mean() + .5)/scale)
    error = math.hypot(peak[0]-entry['pointer']['x'], peak[1]-entry['pointer']['y'])
    alignment.append(dict(name=entry['name'], pointer=entry['pointer'], peakCss=peak, errorCss=error, screenshotScale=scale))

# Opaque normal diagnostic, fixed camera/no noise normals, inside the ribbon.
reference = np.asarray(Image.open(root/'quality-reference.png').convert('RGB')).astype(int)[90:810,560:880]
reduced = np.asarray(Image.open(root/'quality-reduced.png').convert('RGB')).astype(int)[90:810,560:880]
diff = np.abs(reference-reduced)
result = dict(alignment=alignment, maxAlignmentErrorCss=max(r['errorCss'] for r in alignment),
              quality=dict(crop=[560,90,880,810], maxChannelDifference=int(diff.max()),
                           meanChannelDifference=float(diff.mean()), fractionPixelsOver2=float((diff.max(axis=2)>2).mean())))
(root/'image-measurements.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps(result, indent=2))

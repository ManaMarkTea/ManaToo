from pathlib import Path
import sys
from PIL import Image

source, destination = map(Path, sys.argv[1:])
image = Image.open(source).convert('RGB')
if image.size != (480, 480):
    raise ValueError(f'Expected 480x480 screenshot, got {image.size}')
image.save(destination / 'preview.png')
image.save(destination / 'preview.webp', format='WEBP', quality=90, method=6)

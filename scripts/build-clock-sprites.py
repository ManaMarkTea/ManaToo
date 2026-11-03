"""Pack clock state images and an ImageGen sprite sheet for AstroToo. Requires Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
import struct

assets = Path(__file__).resolve().parents[1] / 'faces/code-clock/assets'
def divm(path, frames, delay):
    encoded = []
    for frame in frames:
        buffer = BytesIO()
        frame.convert('RGB').save(buffer, format='JPEG', quality=95, subsampling=2, progressive=False, optimize=False)
        encoded.append(buffer.getvalue())
    offsets, position = [], 0
    for frame in encoded:
        offsets.append(position)
        position += len(frame)
    path.write_bytes(b'DIVM' + struct.pack('<HH', len(frames), delay) + struct.pack('<' + 'I'*len(frames), *offsets) + b''.join(encoded))
font = ImageFont.truetype('C:/Windows/Fonts/consolab.ttf', 17)
states = []
for active in range(2):
    frame = Image.new('RGBA', (48, 64), '#030609')
    draw = ImageDraw.Draw(frame)
    for index, label in enumerate(('AM', 'PM')):
        y = 5 + index * 30
        if index == active:
            draw.rounded_rectangle((1, y - 2, 46, y + 23), radius=3, fill='#132B20')
        draw.text((12, y), label, font=font, fill='#6BE891' if index == active else '#354A40')
    states.append(frame)
states[0].convert('RGB').save(assets / 'ampm.webp', save_all=True, append_images=[states[1].convert('RGB')], quality=95, duration=1000, loop=0)
divm(assets / 'ampm.bin', states, 1000)

sheet_path = assets / 'cockapoo-sheet.png'
if sheet_path.exists():
    sheet = Image.open(sheet_path).convert('RGBA')
    cell_width = sheet.width // 4
    frames = []
    for index in range(4):
        cell = sheet.crop((index * cell_width, 0, (index + 1) * cell_width, sheet.height))
        cell.thumbnail((92, 92), Image.Resampling.NEAREST)
        frame = Image.new('RGBA', (92, 92), '#030609')
        frame.alpha_composite(cell, ((92 - cell.width) // 2, (92 - cell.height) // 2))
        frames.append(frame)
    frames[0].convert('RGB').save(assets / 'cockapoo.webp', save_all=True, append_images=[frame.convert('RGB') for frame in frames[1:]], duration=[220, 220, 220, 220], quality=95, loop=0, minimize_size=True)
    divm(assets / 'cockapoo.bin', frames, 220)

#!/usr/bin/env python3
"""Regenerate pencil-paper-grid.png: paper color, thin blue grid lines, faint grain.

Requires Pillow. Edit the constants to change the paper color, line color or square size.
The tile is drawn at 2x for Retina screens: CELL=28px is a 14pt square.
"""
import random
import sys

from PIL import Image

BASE = (0xD3, 0xCE, 0xBF)   # paper, same as the theme background
LINE = (120, 146, 186)      # grid line blue
ALPHA = 0.42                # how strongly the line shows over the paper
CELL = 28                   # square size in pixels (2x)
GRAIN = 3                   # +/- brightness noise per pixel

out = sys.argv[1] if len(sys.argv) > 1 else "pencil-paper-grid.png"
size = CELL * 4
random.seed(7)
img = Image.new("RGB", (size, size))
px = img.load()
for y in range(size):
    for x in range(size):
        c = BASE
        if x % CELL == 0 or y % CELL == 0:
            c = tuple(round(a * (1 - ALPHA) + b * ALPHA) for a, b in zip(c, LINE))
        d = random.randint(-GRAIN, GRAIN)
        px[x, y] = tuple(max(0, min(255, v + d)) for v in c)
img.save(out)
print(out)

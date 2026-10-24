#!/usr/bin/env python3
"""Generate elegant rose-gold SVG placeholder covers for Velvette sample products.
Usage: python3 make_placeholders.py
Writes assets/img/vNN.svg (600x750). Replace these files with real photos later
(same filename) — no other changes needed.
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMGDIR = os.path.join(ROOT, "assets", "img")

# category -> (gradient top, gradient bottom, accent)
PALETTES = {
    "makeup":      ("#fdeef3", "#f3c6d3", "#b76e79"),
    "skincare":    ("#fdf6ec", "#f5ddc8", "#c98a4b"),
    "necklaces":   ("#fbeef5", "#e8c6d8", "#a86a86"),
    "bracelets":   ("#fdefef", "#f0caca", "#b76e79"),
    "accessories": ("#f8ecf2", "#e2bfd0", "#8f5b70"),
}
ICONS = {
    "makeup": "💄", "skincare": "✨", "necklaces": "💎",
    "bracelets": "📿", "accessories": "👜",
}

def esc(s: str) -> str:
    return (s.replace("&", "&amp;").replace("<", "&lt;")
             .replace(">", "&gt;").replace('"', "&quot;"))

def make_svg(p):
    cat = p["category"]
    top, bottom, accent = PALETTES[cat]
    letter = esc(p["name"][0].upper())
    cat_label = esc(cat.replace("necklaces", "necklaces & chains").upper())
    icon = ICONS[cat]
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bottom}"/>
</linearGradient>
<radialGradient id="hl" cx="0.5" cy="0.32" r="0.65">
<stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/>
<stop offset="0.7" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>
</defs>
<rect width="600" height="750" fill="url(#g)"/>
<rect width="600" height="750" fill="url(#hl)"/>
<g fill="none" stroke="{accent}" stroke-width="2" opacity="0.18">
<circle cx="90" cy="120" r="130"/><circle cx="90" cy="120" r="90"/>
<circle cx="520" cy="640" r="140"/><circle cx="520" cy="640" r="100"/>
<circle cx="540" cy="90" r="60"/><circle cx="60" cy="660" r="70"/>
</g>
<rect x="26" y="26" width="548" height="698" fill="none" stroke="#d4af37" stroke-width="3" opacity="0.75"/>
<rect x="40" y="40" width="520" height="670" fill="none" stroke="#d4af37" stroke-width="1" opacity="0.45"/>
<text x="300" y="120" text-anchor="middle" font-family="Georgia,serif" font-size="30" letter-spacing="8" fill="{accent}" opacity="0.9">VELVETTE</text>
<text x="300" y="360" text-anchor="middle" font-size="120">{icon}</text>
<circle cx="300" cy="470" r="105" fill="none" stroke="#d4af37" stroke-width="2.5" opacity="0.8"/>
<circle cx="300" cy="470" r="92" fill="none" stroke="{accent}" stroke-width="1.5" opacity="0.6"/>
<text x="300" y="512" text-anchor="middle" font-family="Georgia,'Playfair Display',serif" font-size="96" font-style="italic" fill="{accent}">{letter}</text>
<text x="300" y="640" text-anchor="middle" font-family="Georgia,serif" font-size="26" letter-spacing="6" fill="{accent}">{cat_label}</text>
<text x="300" y="678" text-anchor="middle" font-family="Georgia,serif" font-size="20" letter-spacing="3" fill="#8a6a75" opacity="0.85">SAMPLE COVER</text>
</svg>'''

def main():
    with open(os.path.join(ROOT, "assets", "products.json"), encoding="utf-8") as f:
        products = json.load(f)
    os.makedirs(IMGDIR, exist_ok=True)
    for p in products:
        path = os.path.join(IMGDIR, p["id"] + ".svg")
        with open(path, "w", encoding="utf-8") as f:
            f.write(make_svg(p))
        print("wrote", path)

if __name__ == "__main__":
    main()

# Batch 01 print collateral — Complete AI Engineering Programme

| File | What it is |
|---|---|
| `poster.pdf` / `poster.png` | A3 poster (297 × 420 mm) — for screens, WhatsApp, digital sharing and home printing |
| `poster-print-bleed-3mm.pdf` | A3 poster **for the print shop** — 303 × 426 mm (3 mm bleed each side) |
| `flyer.pdf` | A5 flyer (148 × 210 mm), 2 pages: front + back |
| `flyer-front.png` / `flyer-back.png` | Flyer sides as images (for WhatsApp/Instagram) |
| `flyer-print-bleed-3mm.pdf` | A5 flyer **for the print shop** — 154 × 216 mm (3 mm bleed each side), double-sided |
| `qr-poster.svg` / `qr-flyer.svg` | The QR codes on their own |

**QR codes** open `https://www.aadrique.in/ai-engineering` with `?utm_source=poster` or
`?utm_source=flyer`, so analytics can tell which piece brought a visitor. Error
correction level Q (survives ~25% damage), with a 4-module quiet zone.

**Printing:** send the `-print-bleed-3mm.pdf` files and tell the printer
"3 mm bleed, trim to A3 / A5". Flyer: double-sided, flip on long edge. Suggested
stock: poster 170 gsm matt; flyer 300 gsm matt or silk. Colours are RGB — ask the
printer to convert to CMYK; the orange (#FA942C) prints close on most presses.

## Editing and re-rendering

The designs are HTML (`poster.html`, `flyer.html`, shared `brand.css`). Edit the
text there, then re-render (needs Node + Playwright with Chrome installed):

```bash
npm i playwright            # once, anywhere
node render.js "$(pwd)" poster 297 420 3
node render.js "$(pwd)" flyer 148 210 4
```

`render.js` writes the PNGs, the trim-size PDF and the bleed PDF, and prints an
`overflow` check — it must be `0` for every page, or text is running off the page.

To change where the QR codes point, regenerate them (Python, `pip install segno`):

```python
import segno
for name in ("poster", "flyer"):
    segno.make(f"https://www.aadrique.in/ai-engineering?utm_source={name}", error="q") \
        .save(f"qr-{name}.svg", dark="#0A0A0A", light=None, border=0, xmldecl=False, svgns=True, omitsize=True)
```

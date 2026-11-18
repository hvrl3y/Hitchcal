"""Render the HitchCal brand SVGs to the PNG icons the site needs. Run after editing src/brand/*.svg."""
import asyncio, pathlib
from playwright.async_api import async_playwright
B = pathlib.Path(__file__).resolve().parent.parent / 'src' / 'brand'
JOBS = [
  ('icon-rounded.svg', 'icon-192.png', 192, True),
  ('icon-rounded.svg', 'icon-512.png', 512, True),
  ('icon-maskable.svg', 'icon-maskable-512.png', 512, False),
  ('icon-square.svg', 'apple-touch-icon.png', 180, False),
]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for src, out, size, transparent in JOBS:
            pg = await b.new_page(viewport={'width': size, 'height': size})
            svg = (B / src).read_text()
            await pg.set_content(f'<html><body style="margin:0;background:transparent">{svg.replace("<svg ", f"<svg width=\"{size}\" height=\"{size}\" ", 1)}</body></html>')
            await pg.screenshot(path=str(B / out), omit_background=transparent, clip={'x': 0, 'y': 0, 'width': size, 'height': size})
            await pg.close()
        await b.close()
asyncio.run(main())
print('rendered')

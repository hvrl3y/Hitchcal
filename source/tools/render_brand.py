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
        # link-preview card (og:image) shown when the site is shared in Messages, Facebook, X, Slack
        icon = (B / 'icon-rounded.svg').read_text().replace('<svg ', '<svg width="300" height="300" ', 1)
        pg = await b.new_page(viewport={'width': 1200, 'height': 630})
        await pg.set_content(f"""<html><body style="margin:0;width:1200px;height:630px;overflow:hidden;font-family:Inter,'Helvetica Neue',Arial,sans-serif;
          background:radial-gradient(900px 600px at 18% 10%,rgba(82,135,184,.32),rgba(82,135,184,0)),linear-gradient(150deg,#2E3035,#141518);color:#F2F3F5">
          <div style="display:flex;align-items:center;gap:64px;height:100%;padding:0 90px;box-sizing:border-box">
            <div style="flex:0 0 300px;filter:drop-shadow(0 26px 40px rgba(0,0,0,.55))">{icon}</div>
            <div>
              <div style="font-size:30px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#C2A06A;margin-bottom:18px">For rotation workers</div>
              <div style="font-size:104px;font-weight:800;letter-spacing:-.035em;line-height:1">HitchCal</div>
              <div style="font-size:46px;font-weight:600;line-height:1.2;margin-top:22px;color:#D9DCE1">Know exactly when<br>you're home.</div>
            </div>
          </div></body></html>""")
        await pg.screenshot(path=str(B / 'og.jpg'), type='jpeg', quality=88, clip={'x': 0, 'y': 0, 'width': 1200, 'height': 630})
        await pg.close()
        await b.close()
asyncio.run(main())
print('rendered')

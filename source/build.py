#!/usr/bin/env python3
"""Assemble HitchCal from source/src into the site files at the repository root. Run: python3 source/build.py (needs Pillow)."""
import base64, json, pathlib
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).parent
SRC, OUT, DIST = ROOT / 'src', ROOT / 'build', ROOT.parent  # the site is written to the repository root, which GitHub Pages serves

DARK = ("color-scheme:dark;--bg:#000000;--surface:#1C1C1E;--surface-up:#2C2C2E;--sheet:#1C1C1E;--cell:#1C1C1E;"
        "--fill:rgba(120,120,128,.24);--fill-2:rgba(120,120,128,.38);--seg-on:#636366;--sep:rgba(84,84,88,.62);"
        "--label:#FFFFFF;--label-2:rgba(235,235,245,.64);--label-3:rgba(235,235,245,.3);--bar:rgba(20,20,22,.8);"
        "--tint:#FF9F0A;--tint-text:#FFB340;--on-tint:#1C1200;--tint-soft:rgba(255,159,10,.2);"
        "--day:#0A84FF;--day-text:#74B8FF;--day-bg:rgba(10,132,255,.27);"
        "--night:#5E5CE6;--night-text:#B0AEFF;--night-bg:rgba(94,92,230,.32);"
        "--home:#30D158;--home-text:#3DDC68;--home-bg:rgba(48,209,88,.18);"
        "--danger:#FF453A;--danger-text:#FF6961;--danger-bg:rgba(255,69,58,.18);"
        "--warn-text:#FFB340;--warn-bg:rgba(255,159,10,.2);"
        "--toast-bg:rgba(235,235,240,.96);--toast-ink:#000000;--scrim:rgba(0,0,0,.55)")

FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">'
DESC = "Rotation schedule, countdown to days off and hitch pay for oilfield and rotation workers."


def holiday_svg():
    return (SRC / 'holidays.js').read_text(encoding='utf-8').strip()


def build():
    css = (SRC / 'styles.css').read_text().replace('__DARK__', DARK)
    body = (SRC / 'body.html').read_text()
    avatars = sorted((SRC / 'avatars').glob('*.webp'))
    js = (SRC / 'app.js').read_text().replace('/*__HOLIDAY_SVG__*/', holiday_svg())
    av_inline = 'const AVIMG = ' + json.dumps({a.stem: 'data:image/webp;base64,' + base64.b64encode(a.read_bytes()).decode() for a in avatars}) + ';'
    av_files = 'const AVIMG = ' + json.dumps({a.stem: f'avatars/{a.name}' for a in avatars}) + ';'
    assert '__' not in css.replace('__hitchcal', '') and '/*__HOLIDAY_SVG__*/' not in js

    OUT.mkdir(exist_ok=True)
    page = (f'<title>HitchCal</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n{FONTS}\n'
            f'<style>\n{css}</style>\n{body}\n<script>\n{js.replace("/*__AVATARS__*/", av_inline)}</script>\n')
    (OUT / 'hitchcal.html').write_text(page, encoding='utf-8')
    (OUT / 'app.js').write_text(js.replace('/*__AVATARS__*/', av_files), encoding='utf-8')

    head = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>HitchCal · Rotation schedule and hitch pay</title>
<meta name="description" content="{DESC}">
<meta name="theme-color" content="#F2F2F7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="HitchCal">
<meta name="format-detection" content="telephone=no">
<meta property="og:title" content="HitchCal">
<meta property="og:description" content="{DESC}">
<meta property="og:type" content="website">
<meta property="og:image" content="icon-512.png">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{FONTS}
<style>
{css}
/* standalone site: the page handles the phone's safe areas itself */
:root{{--sat:env(safe-area-inset-top,0px);--sab:env(safe-area-inset-bottom,0px)}}
[hidden]{{display:none!important}}
img{{max-width:100%}}
</style>
</head>
<body>
'''
    (DIST / 'index.html').write_text(head + body + f'\n<noscript>HitchCal needs JavaScript turned on.</noscript>\n<script>\n{js.replace("/*__AVATARS__*/", av_files)}</script>\n</body>\n</html>\n', encoding='utf-8')

    (DIST / 'manifest.webmanifest').write_text(json.dumps({
        "name": "HitchCal", "short_name": "HitchCal", "description": DESC, "start_url": ".", "scope": ".",
        "display": "standalone", "orientation": "portrait", "background_color": "#000000", "theme_color": "#000000",
        "categories": ["productivity", "business"],
        "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
                  {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
                  {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]
    }, indent=2))

    (DIST / 'sw.js').write_text('''// HitchCal offline support: try the network first so updates land, fall back to the saved copy on a bad signal.
const CACHE = 'hitchcal-v3';
const SHELL = ['./', 'manifest.webmanifest', 'icon-192.png', 'favicon.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./'))));
});
''')
    (DIST / 'netlify.toml').write_text('''[build]
  publish = "."

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "no-cache"

[[headers]]
  for = "/index.html"
  [headers.values]
    Cache-Control = "no-cache"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
''')
    (DIST / 'avatars').mkdir(exist_ok=True)
    for a in avatars:
        (DIST / 'avatars' / a.name).write_bytes(a.read_bytes())
    (DIST / 'robots.txt').write_text('User-agent: *\nAllow: /\n')
    (DIST / 'jspdf.umd.min.js').write_bytes((ROOT / 'vendor' / 'jspdf.umd.min.js').read_bytes())  # jsPDF 2.5.1, MIT licence
    (DIST / '.nojekyll').write_text('')
    (DIST / 'favicon.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#FF9F0A"/><rect x="13" y="17" width="38" height="34" rx="7" fill="#1C1200"/><rect x="19" y="29" width="26" height="7" rx="3.5" fill="#FF9F0A"/><rect x="19" y="40" width="12" height="5" rx="2.5" fill="#FF9F0A" opacity=".55"/><rect x="22" y="11" width="5" height="11" rx="2.5" fill="#1C1200"/><rect x="37" y="11" width="5" height="11" rx="2.5" fill="#1C1200"/></svg>\n')
    icons()

    print('site written to', DIST)


def icon(size, scale=1.0, rounded=False):
    """The HitchCal mark. `scale` shrinks the glyph for maskable icons; `rounded` clips the tile for browser tabs."""
    n = 1024
    im = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    amber, ink = (255, 159, 10, 255), (28, 18, 0, 255)
    d.rounded_rectangle([0, 0, n, n], radius=240 if rounded else 0, fill=amber)
    u = n / 64 * scale
    off = (n - 64 * u) / 2
    r = lambda x, y, w, h, rad, fill: d.rounded_rectangle([off + x * u, off + y * u, off + (x + w) * u, off + (y + h) * u], radius=rad * u, fill=fill)
    r(13, 17, 38, 34, 7, ink)
    r(19, 29, 26, 7, 3.5, amber)
    r(19, 40, 12, 5, 2.5, (255, 159, 10, 140))
    r(22, 11, 5, 11, 2.5, ink)
    r(37, 11, 5, 11, 2.5, ink)
    return im.resize((size, size), Image.LANCZOS)


def icons():
    icon(192, rounded=True).save(DIST / 'icon-192.png')
    icon(512, rounded=True).save(DIST / 'icon-512.png')
    icon(512, scale=0.72).save(DIST / 'icon-maskable-512.png')
    icon(180).convert('RGB').save(DIST / 'apple-touch-icon.png')


if __name__ == '__main__':
    build()

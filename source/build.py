#!/usr/bin/env python3
"""Assemble HitchCal: one artifact page for preview, and a deployable site folder."""
import base64, json, pathlib, re, shutil, zipfile

ROOT = pathlib.Path(__file__).parent
SRC, OUT, DIST = ROOT / 'src', ROOT / 'build', ROOT / 'dist'
OLD_APP = pathlib.Path('/mnt/user-data/outputs/hitchcal-app.html')

DARK = ("color-scheme:dark;--bg:#000000;--surface:#1E1F23;--surface-up:#2C2D31;--sheet:#1E1F23;--cell:#1E1F23;"
        "--fill:rgba(120,120,128,.24);--fill-2:rgba(120,120,128,.38);--seg-on:#636366;--sep:rgba(84,84,88,.62);"
        "--label:#FFFFFF;--label-2:rgba(235,235,245,.64);--label-3:rgba(235,235,245,.3);--bar:rgba(20,20,22,.8);"
        "--tint:#5B8DB8;--tint-text:#8DB5DA;--on-tint:#0B0B0D;--tint-soft:rgba(91,141,184,.2);"
        "--day:#0A84FF;--day-text:#74B8FF;--day-bg:rgba(10,132,255,.27);"
        "--night:#5E5CE6;--night-text:#B0AEFF;--night-bg:rgba(94,92,230,.32);"
        "--home:#30D158;--home-text:#3DDC68;--home-bg:rgba(48,209,88,.18);"
        "--danger:#FF453A;--danger-text:#FF6961;--danger-bg:rgba(255,69,58,.18);"
        "--warn-text:#FFB340;--warn-bg:rgba(255,159,10,.2);"
        "--toast-bg:rgba(235,235,240,.96);--toast-ink:#000000;--scrim:rgba(0,0,0,.55)")

FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">'
DESC = "Rotation schedule, countdown to days off and hitch pay for oilfield and rotation workers."


def build():
    css = (SRC / 'styles.css').read_text().replace('__DARK__', DARK)
    body = (SRC / 'body.html').read_text()
    avatars = sorted((SRC / 'avatars').glob('*.webp'))
    js = (SRC / 'app.js').read_text()
    av_inline = 'const AVIMG = ' + json.dumps({a.stem: 'data:image/webp;base64,' + base64.b64encode(a.read_bytes()).decode() for a in avatars}) + ';'
    av_files = 'const AVIMG = ' + json.dumps({a.stem: f'avatars/{a.name}' for a in avatars}) + ';'
    assert '__' not in css.replace('__hitchcal', '')

    OUT.mkdir(exist_ok=True)
    page = (f'<title>HitchCal</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n{FONTS}\n'
            f'<style>\n{css}</style>\n{body}\n<script>\n{js.replace("/*__AVATARS__*/", av_inline)}</script>\n')
    (OUT / 'hitchcal.html').write_text(page, encoding='utf-8')
    (OUT / 'app.js').write_text(js.replace('/*__AVATARS__*/', av_files), encoding='utf-8')

    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
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
const CACHE = 'hitchcal-v7';
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
    (DIST / 'favicon.svg').write_text((SRC / 'brand' / 'favicon.svg').read_text(encoding='utf-8'), encoding='utf-8')
    for name in ('icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'):
        shutil.copy(SRC / 'brand' / name, DIST / name)

    z = pathlib.Path('/mnt/user-data/outputs/hitchcal-site.zip')
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as f:
        for p in sorted(DIST.iterdir()):
            f.write(p, f'hitchcal-site/{p.name}')
    print('artifact page:', (OUT / 'hitchcal.html').stat().st_size, 'bytes')
    print('site files   :', ', '.join(sorted(p.name for p in DIST.iterdir())))
    print('zip          :', z, z.stat().st_size, 'bytes')


if __name__ == '__main__':
    build()

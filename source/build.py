#!/usr/bin/env python3
"""Assemble HitchCal: one artifact page for preview, and a deployable site folder."""
import base64, hashlib, json, pathlib, re, shutil, zipfile

ROOT = pathlib.Path(__file__).parent
SRC, OUT, DIST = ROOT / 'src', ROOT / 'build', ROOT / 'dist'
OLD_APP = pathlib.Path('/mnt/user-data/outputs/hitchcal-app.html')

DARK = ("color-scheme:dark;--bg:#000000;--surface:#1E1F23;--surface-up:#2C2D31;--sheet:#1E1F23;--cell:#1E1F23;"
        "--fill:rgba(120,120,128,.24);--fill-2:rgba(120,120,128,.38);--seg-on:#636366;--sep:rgba(84,84,88,.62);"
        "--label:#FFFFFF;--label-2:rgba(235,235,245,.64);--label-3:rgba(235,235,245,.3);--bar:rgba(20,20,22,.8);"
        "--tint:#B9BEC6;--tint-text:#D9DCE1;--on-tint:#16171A;--tint-soft:rgba(185,190,198,.18);"
        "--day:#5287B8;--day-text:#A5C1DA;--day-bg:rgba(82,135,184,0.3);--day-cell:rgba(82,135,184,0.55);"
        "--night:#7B67AD;--night-text:#BAB0D4;--night-bg:rgba(123,103,173,0.3);--night-cell:rgba(123,103,173,0.55);"
        "--home:#5E9470;--home-text:#ABC7B5;--home-bg:rgba(94,148,112,0.3);--home-cell:rgba(94,148,112,0.55);"
        "--danger:#FF453A;--danger-text:#FF6961;--danger-bg:rgba(255,69,58,.18);"
        "--warn-text:#FFB340;--warn-bg:rgba(255,159,10,.2);"
        "--toast-bg:rgba(235,235,240,.96);--toast-ink:#000000;--scrim:rgba(0,0,0,.55)")

FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">'
DESC = "Rotation schedule, countdown to days off and hitch pay for oilfield and rotation workers."
# The public address of the site. Link previews (Messages, Facebook, X) need full addresses.
# Change this when the .com is live.
SITE_URL = 'https://hvrl3y.github.io/Hitchcal/'



def build():
    css = (SRC / 'styles.css').read_text().replace('__DARK__', DARK)
    body = (SRC / 'body.html').read_text()
    avatars = sorted((SRC / 'avatars').glob('*.webp'))
    legal = json.loads((SRC / 'legal.json').read_text(encoding='utf-8'))
    js = (SRC / 'app.js').read_text().replace('/*__LEGAL__*/', 'const LEGAL = ' + json.dumps({k: legal[k] for k in ('privacy', 'terms')}) + ';')
    assert 'const LEGAL' in js
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
    # Every image gets a version from its contents, so phones and link previews fetch a changed image
    # instead of reusing a saved copy of the old one.
    BR = SRC / 'brand'
    ver = {n: hashlib.sha1((BR / n).read_bytes()).hexdigest()[:8] for n in ('favicon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'og.jpg')}
    og = f"og-{ver['og.jpg']}.jpg"
    shutil.copy(BR / 'og.jpg', DIST / og)
    share_tags = f'''<meta property="og:site_name" content="HitchCal">
<meta property="og:title" content="HitchCal: know exactly when you're home">
<meta property="og:description" content="{DESC}">
<meta property="og:type" content="website">
<meta property="og:url" content="{SITE_URL}">
<meta property="og:image" content="{SITE_URL}{og}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="The HitchCal icon and the words: know exactly when you're home">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{SITE_URL}{og}">'''
    icon_links = f'''<link rel="icon" href="favicon.svg?v={ver['favicon.svg']}" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png?v={ver['apple-touch-icon.png']}">'''
    head = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>HitchCal · Rotation schedule and hitch pay</title>
<meta name="description" content="{DESC}">
<meta name="theme-color" content="#EFF0F2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="HitchCal">
<meta name="format-detection" content="telephone=no">
{share_tags}
<link rel="manifest" href="manifest.webmanifest?v={ver['icon-512.png']}">
{icon_links}
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
        "display": "standalone", "orientation": "portrait", "background_color": "#2A2C30", "theme_color": "#1E1F23",
        "categories": ["productivity", "business"],
        "icons": [{"src": f"icon-192.png?v={ver['icon-192.png']}", "sizes": "192x192", "type": "image/png", "purpose": "any"},
                  {"src": f"icon-512.png?v={ver['icon-512.png']}", "sizes": "512x512", "type": "image/png", "purpose": "any"},
                  {"src": f"icon-maskable-512.png?v={ver['icon-maskable-512.png']}", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]
    }, indent=2))

    (DIST / 'sw.js').write_text('''// HitchCal offline support: try the network first so updates land, fall back to the saved copy on a bad signal.
const CACHE = 'hitchcal-v13';
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
    # landing page for the .com, with its screenshots (made by tools/render_shots.py)
    land = (SRC / 'landing.html').read_text(encoding='utf-8')
    for o in ('<meta property="og:image" content="landing/shot-insights.webp">', '<link rel="icon" href="favicon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">'):
        assert o in land, o
    land = land.replace('<meta property="og:image" content="landing/shot-insights.webp">', share_tags.replace(f'content="{SITE_URL}"', f'content="{SITE_URL}landing.html"'))
    land = land.replace('<link rel="icon" href="favicon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">', icon_links)
    (DIST / 'landing.html').write_text(land, encoding='utf-8')
    (DIST / 'landing').mkdir(exist_ok=True)
    for f in (SRC / 'landing').glob('*.webp'): shutil.copyfile(f, DIST / 'landing' / f.name)
    for slug, title in (('privacy', 'Privacy policy'), ('terms', 'Terms of use')):
        (DIST / f'{slug}.html').write_text(f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title} · HitchCal</title>
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<style>
:root{{color-scheme:light;--bg:#EFF0F2;--card:#FFFFFF;--fg:#1C1D21;--muted:#5A5E66;--link:#24262A}}
@media (prefers-color-scheme:dark){{:root{{color-scheme:dark;--bg:#000000;--card:#1E1F23;--fg:#F2F3F5;--muted:#A3A7AE;--link:#D9DCE1}}}}
body{{margin:0;background:var(--bg);color:var(--fg);font:17px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,system-ui,sans-serif;padding:max(16px,env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) 48px max(16px,env(safe-area-inset-left,0px))}}
main{{max-width:680px;margin:0 auto;background:var(--card);border-radius:18px;padding:24px 22px}}
h1{{font-size:28px;margin:0 0 4px;text-wrap:balance}}h3{{font-size:18px;margin:22px 0 4px}}
p,ul{{margin:0 0 10px;color:var(--muted)}}ul{{padding-left:20px}}li{{margin-bottom:6px}}b{{color:var(--fg)}}
.legal-date{{font-size:14px}}a{{color:var(--link);font-weight:600}}
nav{{max-width:680px;margin:0 auto 14px}}
</style>
</head>
<body>
<nav><a href="./">← Back to HitchCal</a></nav>
<main><h1>{title}</h1>
{legal[slug]}
</main>
</body>
</html>
''', encoding='utf-8')
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

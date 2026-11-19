"""Capture phone screenshots of the demo for the landing page: python3 tools/render_shots.py (after build.py)."""
import pathlib, subprocess, time, io
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'landing'; OUT.mkdir(parents=True, exist_ok=True)
srv = subprocess.Popen(['python3', '-m', 'http.server', '8799'], cwd=ROOT / 'dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for scheme in ('dark',):
            p = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, color_scheme=scheme)
            p.goto('http://127.0.0.1:8799/index.html')
            p.evaluate("document.querySelector('[data-act=\"ob-demo\"]').click()"); p.wait_for_timeout(300)
            p.evaluate("""() => { const s = JSON.parse(localStorage.getItem('hitchcal_v2')); s.demo = false; s.installDone = true; s.earnings = { ...s.earnings, dayRate: 450, perDiem: 75 }; localStorage.setItem('hitchcal_v2', JSON.stringify(s)); }""")
            p.reload(); p.wait_for_timeout(500)
            def shot(name, tab, extra=None):
                p.evaluate(f"document.querySelector('[data-act=\"tab\"][data-tab=\"{tab}\"]').click()"); p.wait_for_timeout(400)
                if extra: p.evaluate(extra); p.wait_for_timeout(1400)
                img = Image.open(io.BytesIO(p.screenshot())); img.save(OUT / f'shot-{name}.webp', 'WEBP', quality=82, method=6)
                if extra: p.evaluate("() => { const l = document.querySelector('#sheet-left'); if (l) l.click(); }"); p.wait_for_timeout(400)
            shot('insights', 'today')
            shot('calendar', 'cal')
            shot('pay', 'pay')
            shot('change', 'cal', "() => { const d = new Date(); const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; document.querySelector(`[data-k=\"${k}\"]`).click(); setTimeout(() => document.querySelector('[data-act=\"hc-open\"]').click(), 300); setTimeout(() => { for (let i = 0; i < 3; i++) document.querySelector('[data-act=\"hc-step\"][data-f=\"e\"][data-d=\"1\"]').click(); }, 700); }")
        b.close()
finally:
    srv.terminate()
for f in sorted(OUT.glob('shot-*.webp')): print(f.name, f.stat().st_size)

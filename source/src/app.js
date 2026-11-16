(() => {
'use strict';

/* ───────── helpers ───────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; };
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const clampInt = (v, a, b) => clamp(Math.round(num(v)) || a, a, b);
const pad = n => String(n).padStart(2, '0');
const money = n => '$' + Math.round(n).toLocaleString('en-US');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, m - 1, d); };
const validKey = k => /^\d{4}-\d{2}-\d{2}$/.test(k || '') && !isNaN(parseKey(k));
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 864e5);
const todayKey = () => toKey(new Date());
const fmtMD = d => `${MS[d.getMonth()]} ${d.getDate()}`;
const fmtDay = d => `${DS[d.getDay()]}, ${fmtMD(d)}`;
const fmtLong = d => `${DOW[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
const fmtFull = d => `${fmtMD(d)}, ${d.getFullYear()}`;
const fmt12 = t => { const [h, m] = String(t || '06:00').split(':').map(Number); return `${h % 12 || 12}${m ? ':' + pad(m) : ''} ${h < 12 ? 'AM' : 'PM'}`; };
const fmtClock = d => fmt12(pad(d.getHours()) + ':' + pad(d.getMinutes()));
const rel = d => { const n = daysBetween(new Date(), d); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n === -1 ? 'Yesterday' : n > 0 ? `In ${n} days` : `${-n} days ago`; };
const initials = n => (String(n || '').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('') || 'H').toUpperCase();
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

const svg = (p, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${p}</svg>`;
const IC = {
  chev: '<svg class="chev" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l6 6-6 6"/></svg>',
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M5.3 18.7l1.5-1.5M17.2 6.8l1.5-1.5"/>'),
  moon: svg('<path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.2 8.2 0 1 0 10.2 10.2z"/>'),
  house: svg('<path d="M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-5.5h4V20"/>'),
  shield: svg('<path d="M12 3l7.5 2.8v5.4c0 4.5-3 8.2-7.5 9.8-4.5-1.6-7.5-5.3-7.5-9.8V5.8L12 3z"/><path d="M9 12l2.2 2.2L15.2 10"/>'),
  flag: svg('<path d="M5.5 21V4M5.5 5h11l-2 4 2 4h-11"/>'),
  star: svg('<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z"/>'),
  share: svg('<path d="M12 15V3.5M8 7l4-4 4 4M6 11H5a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 5 21h14a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 19 11h-1"/>'),
  copy: svg('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8"/>'),
  cal: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  down: svg('<path d="M12 4v11M7.5 11l4.5 4.5 4.5-4.5M5 20h14"/>'),
  up: svg('<path d="M12 15.5V4.5M7.5 9L12 4.5 16.5 9M5 20h14"/>'),
  paint: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>'),
  people: svg('<circle cx="9" cy="8.5" r="3.3"/><path d="M2.8 19.2c.5-3.2 3-5 6.2-5s5.7 1.8 6.2 5M16 5.5a3.2 3.2 0 0 1 0 6M18.2 14.6c1.7.7 2.8 2.3 3.1 4.6"/>'),
  dollar: svg('<path d="M15.5 8c-.6-1.2-1.8-1.9-3.5-1.9-2.1 0-3.5 1.1-3.5 2.7 0 3.6 7.2 1.7 7.2 5.2 0 1.6-1.5 2.7-3.7 2.7-1.8 0-3.1-.7-3.7-2M12 4v2.1M12 16.7V20"/>'),
  timer: svg('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.6 2.4M9.5 3h5"/>'),
  camera: svg('<path d="M4 8h3l1.500-2.500h7L17 8h3v11.500H4z"/><circle cx="12" cy="13.500" r="3.500"/>'),
  alert: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8l7.6 2.8v5.5c0 4.6-3 8.3-7.6 10-4.6-1.7-7.6-5.4-7.6-10V5.6L12 2.8z"/></svg>'
};

/* ───────── profile icons (shipped with the app, so they cost nothing to serve) ───────── */
const AV = {
  rig: ['Drilling rig', '<path d="M12 2.5L6 21M12 2.5L18 21M4 21h16M7.6 15h8.8M9.3 9.5h5.4M7.6 15l7.1-5.5M16.4 15L9.3 9.5"/>'],
  bit: ['Drill bit', '<path d="M9.5 2.8h5v3.7h-5zM8 6.5h8l1.2 4.7-2 1.6v2.8L12 20.8l-3.2-5.2v-2.8l-2-1.600z"/><path d="M12 12.500v8M9.800 9.600h4.400"/>'],
  hardhat: ['Hard hat', '<path d="M3 17.500h18M5 17.500v-2.300a7 7 0 0 1 14 0v2.300M10 8.500v4.300M14 8.500v4.300"/>'],
  shaker: ['Shale shaker', '<path d="M3.500 9.500l17-3.200v8.700l-17 3.200z"/><path d="M6.500 12.800l2.200 1 2.200-1.900 2.200 1 2.200-1.900 2.200 1M6.500 20.800v-2.400M17.500 18.800v-2.400"/>'],
  gauge: ['Gauge', '<circle cx="12" cy="12.500" r="8.500"/><path d="M12 12.500l3.600-4.200M12 4v1.800M5 15.800l1.500-.800M19 15.800l-1.500-.800"/><circle cx="12" cy="12.500" r="1" fill="currentColor"/>'],
  flask: ['Mud lab', '<path d="M9.500 3.200h5M10.500 3.200v5.600L5.600 17.900a1.800 1.800 0 0 0 1.600 2.700h9.600a1.800 1.800 0 0 0 1.600-2.700l-4.900-9.100V3.200M8 14.500h8"/>'],
  wrench: ['Wrench', '<path d="M14.700 6.300a4 4 0 0 0-5.200 5.200l-5.600 5.600a1.900 1.900 0 0 0 2.700 2.700l5.600-5.600a4 4 0 0 0 5.200-5.200l-2.500 2.500-2.200-.500-.500-2.200z"/>'],
  truck: ['Truck', '<path d="M2.500 6.500h11v10.500h-11zM13.500 10h4l3 3.600V17h-7z"/><circle cx="7" cy="17.800" r="2"/><circle cx="17" cy="17.800" r="2"/>'],
  flame: ['Flare', '<path d="M12 3c.6 3.600 5.200 5.400 5.200 10.300a5.200 5.200 0 0 1-10.400 0c0-2 .9-3.600 2-4.700.3 1.600 1 2.400 1.900 2.700C10.400 8.800 10.900 5.500 12 3z"/>'],
  drop: ['Oil drop', '<path d="M12 3.200c3.100 4 5.700 6.900 5.700 10.200a5.700 5.700 0 0 1-11.400 0c0-3.300 2.600-6.200 5.700-10.200z"/>'],
  wave: ['Offshore', '<path d="M2.500 8.500c1.900 0 1.900-1.500 4.700-1.500s2.900 1.500 4.800 1.500 1.900-1.500 4.700-1.500 2.900 1.500 4.800 1.500M2.500 13.500c1.900 0 1.900-1.500 4.700-1.500s2.900 1.500 4.800 1.500 1.900-1.500 4.700-1.500 2.900 1.500 4.800 1.500M2.500 18.500c1.900 0 1.900-1.500 4.700-1.500s2.900 1.500 4.800 1.500 1.900-1.500 4.700-1.500 2.900 1.500 4.800 1.500"/>'],
  plane: ['Fly-in', '<path d="M21 3.500L3 10.500l6.500 3 3 6.500zM9.500 13.500L21 3.500"/>'],
  house: ['Home', '<path d="M4 11l8-7 8 7M6 9.500V20h12V9.500M10 20v-5.500h4V20"/>'],
  heart: ['Heart', '<path d="M12 20.200S4.300 15.600 4.300 9.900A4.300 4.300 0 0 1 12 7.300a4.300 4.300 0 0 1 7.700 2.600c0 5.700-7.700 10.300-7.700 10.300z"/>'],
  people: ['Family', '<circle cx="9" cy="8.500" r="3.300"/><path d="M2.800 19.200c.5-3.200 3-5 6.200-5s5.700 1.800 6.200 5M16 5.500a3.200 3.200 0 0 1 0 6M18.200 14.600c1.700.700 2.800 2.300 3.100 4.600"/>'],
  fish: ['Fishing', '<path d="M2.500 12c2.200-3.700 5.400-5.300 8.700-5.300 3.400 0 6 2 7.300 5.300-1.300 3.300-3.900 5.300-7.300 5.300-3.300 0-6.500-1.600-8.700-5.300zM18.500 12l3-3.300v6.600z"/><circle cx="7.600" cy="11.200" r="1" fill="currentColor" stroke="none"/>'],
  tree: ['Outdoors', '<path d="M12 2.800l4.500 6h-2.300l4.300 5.700h-5V20h-3v-5.500h-5l4.300-5.700H7.500z"/>'],
  paw: ['Dog', '<circle cx="6.800" cy="9.500" r="1.800"/><circle cx="12" cy="7" r="1.800"/><circle cx="17.200" cy="9.500" r="1.800"/><path d="M12 12.200c-2.900 0-5.200 2.400-5.200 4.700 0 1.500 1.200 2.600 2.700 2.600 1 0 1.700-.500 2.500-.500s1.500.500 2.500.500c1.500 0 2.700-1.100 2.700-2.600 0-2.300-2.300-4.700-5.200-4.700z"/>'],
  star: ['Star', '<path d="M12 3.500l2.600 5.300 5.900.900-4.200 4.100 1 5.800L12 16.900l-5.300 2.700 1-5.800-4.200-4.100 5.900-.900z"/>']
};
const PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const okPhoto = v => typeof v === 'string' && v.length < 200000 && PHOTO_RE.test(v) ? v : '';
const okIcon = v => (typeof v === 'string' && Object.prototype.hasOwnProperty.call(AV, v)) ? v : '';
const avInner = o => o.photo ? `<img src="${o.photo}" alt="">` : o.icon && AV[o.icon] ? svg(AV[o.icon][1]) : esc(initials(o.name));
const pick = {};
let photoTarget = '';
function avOpts(pfx) {
  const s = pick[pfx];
  return `<button type="button" class="avopt${s.mode === 'init' ? ' on' : ''}" data-act="av" data-v="" aria-label="Use initials">Aa</button>`
    + Object.keys(AV).map(k => `<button type="button" class="avopt${s.mode === 'icon' && s.icon === k ? ' on' : ''}" data-act="av" data-v="${k}" aria-label="${AV[k][0]}" title="${AV[k][0]}">${svg(AV[k][1])}</button>`).join('')
    + `<button type="button" class="avopt${s.mode === 'photo' ? ' on' : ''}" data-act="av-photo" aria-label="Upload a photo" title="Upload a photo">${s.photo ? `<img src="${s.photo}" alt="">` : IC.camera}</button>`;
}
function avatarPicker(pfx, o) {
  pick[pfx] = { icon: okIcon(o.icon), photo: okPhoto(o.photo), mode: okPhoto(o.photo) ? 'photo' : okIcon(o.icon) ? 'icon' : 'init' };
  return `<div class="group"><div class="avpick" id="${pfx}-av" data-pfx="${pfx}">${avOpts(pfx)}</div></div>`;
}
const readAv = pfx => { const s = pick[pfx] || {}; return { icon: s.mode === 'icon' ? s.icon : '', photo: s.mode === 'photo' ? s.photo : '' }; };

/* ───────── state ───────── */
const KEY = 'hitchcal_v2';
const DEF = () => ({
  setup: false, demo: false, name: '', icon: '', photo: '', hitchStart: '',
  pattern: { daysOn: 14, daysOff: 14, shiftType: 'day', startTime: '06:00', endTime: '18:00', alternating: false },
  earnings: { payType: 'dayrate', dayRate: 750, hourlyRate: 45, hoursPerShift: 12, otAfter: 8, perDiem: 75, mileageRate: 0.7, roundTrip: 280, travelDays: 0, travelRate: 750 },
  bonuses: [], certs: [], notes: {}, rosters: [], hitchMiles: {}, colors: {}, theme: 'system', showHolidays: true
});
let S = DEF();

function normalize(p) {
  const d = DEF();
  const s = { ...d, ...p, pattern: { ...d.pattern, ...(p.pattern || {}) }, earnings: { ...d.earnings, ...(p.earnings || {}) } };
  ['bonuses', 'certs', 'rosters'].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; });
  if (!s.notes || typeof s.notes !== 'object') s.notes = {};
  if (p.lightMode === true && !p.theme) s.theme = 'light';
  s.hitchMiles = (s.hitchMiles && typeof s.hitchMiles === 'object') ? Object.fromEntries(Object.entries(s.hitchMiles).filter(([k, v]) => validKey(k) && isFinite(+v)).map(([k, v]) => [k, Math.max(0, +v)])) : {};
  s.icon = okIcon(s.icon); s.photo = okPhoto(s.photo);
  s.colors = Object.fromEntries(Object.entries(s.colors && typeof s.colors === 'object' ? s.colors : {}).filter(([k, v]) => DEFC[k] && HEX.test(v || '')));
  s.earnings.travelDays = clamp(Math.round(num(s.earnings.travelDays)), 0, 2);
  s.pattern.daysOn = clampInt(s.pattern.daysOn, 1, 120);
  s.pattern.daysOff = clampInt(s.pattern.daysOff, 1, 120);
  s.bonuses = s.bonuses.filter(b => b && validKey(b.date)).map(b => ({ id: String(b.id || uid()).replace(/[^\w-]/g, ''), label: String(b.label || 'Bonus'), amount: num(b.amount), date: b.date }));
  s.certs = s.certs.filter(c => c && c.name && validKey(c.expiry)).map(c => ({ id: String(c.id || uid()).replace(/[^\w-]/g, ''), name: String(c.name), expiry: c.expiry }));
  s.rosters = s.rosters.filter(r => r && r.name && validKey(r.hitchStart) && r.pattern).slice(0, 5).map(r => ({
    id: String(r.id || uid()).replace(/[^\w-]/g, ''), name: String(r.name), hitchStart: r.hitchStart, color: /^#[0-9a-f]{6}$/i.test(r.color || '') ? r.color : COLORS[0], icon: okIcon(r.icon), photo: okPhoto(r.photo),
    pattern: { daysOn: clampInt(r.pattern.daysOn, 1, 120), daysOff: clampInt(r.pattern.daysOff, 1, 120) }
  }));
  if (!validKey(s.hitchStart)) s.setup = false;
  return s;
}
function load() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem('hitchcal_v1');
    if (raw) S = normalize(JSON.parse(raw));
  } catch (e) { S = DEF(); }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable: keep running in memory */ } }
const me = () => ({ hitchStart: S.hitchStart, pattern: S.pattern });

const COLORS = ['#14B8A6', '#EC4899', '#A855F7', '#F97316', '#06B6D4', '#84CC16'];
const inkFor = hex => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#14141A' : '#FFFFFF'; };

/* ───────── schedule math ───────── */
const frac = t => { const [h, m] = String(t).split(':').map(Number); return (h * 60 + m) / 1440; };
function posOf(key, sch) {
  const cycle = sch.pattern.daysOn + sch.pattern.daysOff;
  const diff = daysBetween(parseKey(sch.hitchStart), parseKey(key));
  return { pos: ((diff % cycle) + cycle) % cycle, diff, cycle };
}
const dayType = (key, sch) => posOf(key, sch).pos < sch.pattern.daysOn ? 'on' : 'off';
function shiftFor(key, sch) {
  const p = sch.pattern;
  if (!p.alternating) return p.shiftType || 'day';
  const { pos, diff, cycle } = posOf(key, sch);
  const n = Math.round((diff - pos) / cycle);
  const even = ((n % 2) + 2) % 2 === 0;
  return even ? p.shiftType : (p.shiftType === 'day' ? 'night' : 'day');
}
function timesFor(key, sch) {
  const p = sch.pattern, shift = shiftFor(key, sch);
  let st = p.startTime || '06:00', et = p.endTime || '18:00';
  if (p.alternating && shift !== p.shiftType) [st, et] = [et, st];
  return { st, et, shift, crosses: frac(et) <= frac(st) };
}
/* What a single calendar day looks like: on/off, shift, and the worked slice [a,b] of the day (0..1). */
function cellInfo(key, sch) {
  const { pos } = posOf(key, sch), p = sch.pattern, MIN = 0.04;
  const t = timesFor(toKey(addDays(parseKey(key), -pos)), sch);
  const sf = frac(t.st), ef = frac(t.et);
  if (pos < p.daysOn) {
    let a = 0, b = 1;
    if (pos === 0 && sf > MIN) a = sf;
    if (pos === p.daysOn - 1 && !t.crosses && 1 - ef > MIN) b = ef;
    return { type: 'on', shift: t.shift, a, b, split: a > 0 || b < 1, pos, st: t.st, et: t.et, crosses: t.crosses };
  }
  if (pos === p.daysOn && t.crosses && ef > MIN) return { type: 'off', shift: t.shift, a: 0, b: ef, split: true, tail: true, pos, st: t.st, et: t.et, crosses: true };
  return { type: 'off', shift: null, a: 0, b: 0, split: false, pos, st: t.st, et: t.et, crosses: t.crosses };
}
const atTime = (d, t) => { const [h, m] = t.split(':').map(Number); const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
/* Exact clock-in of the first shift and clock-out of the last one for the hitch whose first day is csDate. */
function hitchBounds(csDate, sch) {
  const t = timesFor(toKey(csDate), sch);
  return { begin: atTime(csDate, t.st), end: atTime(addDays(csDate, sch.pattern.daysOn - (t.crosses ? 0 : 1)), t.et), shift: t.shift, st: t.st, et: t.et };
}
function nowInfo(sch, now = new Date()) {
  const today = startOfDay(now), p = sch.pattern;
  const { pos, cycle } = posOf(toKey(today), sch);
  const cs = addDays(today, -pos), cur = hitchBounds(cs, sch);
  if (now < cur.begin) {
    const prev = hitchBounds(addDays(cs, -cycle), sch);
    return { phase: 'off', ms: cur.begin - now, until: cur.begin, dayNum: p.daysOff, total: p.daysOff, pct: clamp((now - prev.end) / (cur.begin - prev.end)), next: cur, cs };
  }
  if (now < cur.end) {
    return { phase: 'on', ms: cur.end - now, until: cur.end, dayNum: Math.min(pos + 1, p.daysOn), total: p.daysOn, pct: clamp((now - cur.begin) / (cur.end - cur.begin)), shift: cur.shift, cur, cs };
  }
  const nx = hitchBounds(addDays(cs, cycle), sch);
  return { phase: 'off', ms: nx.begin - now, until: nx.begin, dayNum: clamp(pos - p.daysOn + 1, 1, p.daysOff), total: p.daysOff, pct: clamp((now - cur.end) / (nx.begin - cur.end)), next: nx, cs };
}
function transitions(sch, n, now = new Date()) {
  const info = nowInfo(sch, now), cycle = sch.pattern.daysOn + sch.pattern.daysOff, out = [];
  for (let i = -1; i < n + 2; i++) {
    const b = hitchBounds(addDays(info.cs, i * cycle), sch);
    if (b.begin > now) out.push({ type: 'on', date: b.begin, shift: b.shift });
    if (b.end > now) out.push({ type: 'off', date: b.end });
  }
  return out.sort((a, b) => a.date - b.date).slice(0, n);
}

/* ───────── holidays ───────── */
function nth(y, m, wd, n) {
  if (n > 0) { const d = new Date(y, m, 1); d.setDate(1 + ((wd - d.getDay() + 7) % 7) + (n - 1) * 7); return d; }
  const d = new Date(y, m + 1, 0); d.setDate(d.getDate() - ((d.getDay() - wd + 7) % 7)); return d;
}
const holidays = y => [
  { name: "New Year's Day", date: new Date(y, 0, 1) }, { name: 'MLK Day', date: nth(y, 0, 1, 3) },
  { name: 'Presidents Day', date: nth(y, 1, 1, 3) }, { name: 'Memorial Day', date: nth(y, 4, 1, -1) },
  { name: 'Juneteenth', date: new Date(y, 5, 19) }, { name: 'Independence Day', date: new Date(y, 6, 4) },
  { name: 'Labor Day', date: nth(y, 8, 1, 1) }, { name: 'Columbus Day', date: nth(y, 9, 1, 2) },
  { name: 'Veterans Day', date: new Date(y, 10, 11) }, { name: 'Thanksgiving', date: nth(y, 10, 4, 4) },
  { name: 'Christmas Day', date: new Date(y, 11, 25) }
];
const holCache = {};
function holidayOn(key) {
  const y = +key.slice(0, 4);
  if (!holCache[y]) { holCache[y] = {}; holidays(y).forEach(h => { holCache[y][toKey(h.date)] = h.name; }); }
  return holCache[y][key] || null;
}
/*__HOLIDAY_SVG__*/

/* ───────── pay ───────── */
function dailyPay() {
  const e = S.earnings;
  if (e.payType === 'hourly') {
    const h = num(e.hoursPerShift), ot = num(e.otAfter) > 0 ? num(e.otAfter) : h;
    return num(e.hourlyRate) * (Math.min(h, ot) + Math.max(0, h - ot) * 1.5);
  }
  return num(e.dayRate);
}
/* Miles can differ hitch to hitch: an override is stored against the hitch's first day, otherwise the usual round trip applies. */
const milesFor = key => (key && S.hitchMiles[key] != null) ? num(S.hitchMiles[key]) : num(S.earnings.roundTrip);
function hitchPay(days, o = {}) {
  const e = S.earnings, base = days * dailyPay(), diem = days * num(e.perDiem);
  const mi = o.mi == null ? num(e.roundTrip) : o.mi, tn = o.travel == null ? num(e.travelDays) : o.travel;
  const miles = num(e.mileageRate) * mi, travel = tn * num(e.travelRate);
  return { base, diem, miles, mi, travel, tn, total: base + diem + miles + travel };
}
const fullPay = (key, days) => hitchPay(days, { mi: milesFor(key) });
/* Earned so far: the trip out (miles + first travel day) counts once the hitch starts, the trip home's travel day once it ends. */
function earnedPay(key, worked, days) {
  if (worked <= 0) return hitchPay(0, { mi: 0, travel: 0 });
  const n = num(S.earnings.travelDays);
  return hitchPay(worked, { mi: milesFor(key), travel: worked >= days ? n : Math.min(n, 1) });
}
function yearHitches(year) {
  const sch = me(), tk = todayKey(), map = new Map();
  for (let d = new Date(year, 0, 1); d.getFullYear() === year; d = addDays(d, 1)) {
    const k = toKey(d), { pos, diff, cycle } = posOf(k, sch);
    if (pos >= sch.pattern.daysOn) continue;
    const n = Math.round((diff - pos) / cycle);
    let h = map.get(n);
    if (!h) { h = { key: toKey(addDays(d, -pos)), first: d, last: d, days: 0, worked: 0 }; map.set(n, h); }
    h.last = d; h.days++; if (k <= tk) h.worked++;
  }
  return [...map.values()].map(h => ({ ...h, status: h.worked === 0 ? 'next' : h.worked < h.days ? 'now' : 'done' }));
}
function yearPay(year) {
  const hs = yearHitches(year), tk = todayKey();
  const bon = S.bonuses.filter(b => String(b.date).startsWith(year + '-'));
  const bonYtd = bon.filter(b => b.date <= tk).reduce((a, b) => a + num(b.amount), 0);
  const bonAll = bon.reduce((a, b) => a + num(b.amount), 0);
  let ytd = bonYtd, proj = bonAll, daysW = 0, daysAll = 0;
  hs.forEach(h => { ytd += earnedPay(h.key, h.worked, h.days).total; proj += fullPay(h.key, h.days).total; daysW += h.worked; daysAll += h.days; });
  return { hs, ytd, proj, daysW, daysAll };
}

/* ───────── sharing ───────── */
const EMBEDDED = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
const SHARE_BASE = (!EMBEDDED && /^https?:$/.test(location.protocol)) ? location.origin + location.pathname : 'https://hitchcal.com/';
function makeShareLink() {
  const p = S.pattern;
  const d = { n: S.name, i: S.icon || undefined, s: S.hitchStart, p: { on: p.daysOn, off: p.daysOff }, t: p.shiftType, st: p.startTime, et: p.endTime, a: p.alternating ? 1 : 0 };
  const b = btoa(unescape(encodeURIComponent(JSON.stringify(d)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return SHARE_BASE + '?s=' + b;
}
function parseShare(str) {
  str = String(str || '').trim();
  if (!str) return null;
  const m = str.match(/[?&]s=([A-Za-z0-9_\-+/=%]+)/) || str.match(/hitchcal:\/\/import\/([A-Za-z0-9_\-+/=%]+)/);
  let code = m ? m[1] : str;
  try { code = decodeURIComponent(code); } catch (e) { /* keep raw */ }
  try {
    const d = JSON.parse(decodeURIComponent(escape(atob(code.replace(/-/g, '+').replace(/_/g, '/')))));
    if (d && validKey(d.s) && d.p && d.p.on && d.p.off) return d;
  } catch (e) { /* not a share code */ }
  return null;
}
async function copyText(text, okMsg) {
  try { await navigator.clipboard.writeText(text); toast(okMsg || 'Copied'); }
  catch (e) { textSheet('Copy this', text, 'Select the text below and copy it.'); }
}
function textSheet(title, text, hint) {
  openSheet({
    title, left: 'Done', body: `<p class="foot" style="margin:6px 4px 12px">${esc(hint)}</p><textarea class="code sel" id="ts-text" rows="6" readonly>${esc(text)}</textarea><button class="btn gray" data-act="ts-copy">${IC.copy}Copy</button>`
  });
}
function deliverFile(name, mime, text) {
  if (EMBEDDED) { textSheet(name, text, `Downloads are switched off in this preview. On your own site this saves ${name} straight to the device.`); return; }
  try {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast(`Saved ${name}`);
  } catch (e) { textSheet(name, text, 'Copy the text below and save it as ' + name + '.'); }
}
function buildICS() {
  const sch = me(), p = S.pattern, cycle = p.daysOn + p.daysOff, info = nowInfo(sch);
  const ymd = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const n = new Date(), stamp = `${n.getUTCFullYear()}${pad(n.getUTCMonth() + 1)}${pad(n.getUTCDate())}T${pad(n.getUTCHours())}${pad(n.getUTCMinutes())}${pad(n.getUTCSeconds())}Z`;
  const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HitchCal//HitchCal 2//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:HitchCal'];
  for (let i = 0; i <= Math.ceil(366 / cycle); i++) {
    const cs = addDays(info.cs, i * cycle), t = timesFor(toKey(cs), sch);
    out.push('BEGIN:VEVENT', `UID:hitch-${ymd(cs)}@hitchcal`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${ymd(cs)}`, `DTEND;VALUE=DATE:${ymd(addDays(cs, p.daysOn))}`,
      `SUMMARY:On hitch (${plural(p.daysOn, 'day')})`, `DESCRIPTION:${t.shift === 'night' ? 'Night' : 'Day'} shift\\, ${fmt12(t.st)} to ${fmt12(t.et)}`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
  }
  out.push('END:VCALENDAR');
  return out.join('\r\n');
}

/* ───────── shared bits of UI ───────── */
function cdHTML(ms, mode) {
  const t = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(t / 86400), h = Math.floor(t % 86400 / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
  if (mode === 'short') return d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  const u = (v, l, c = '') => `<span class="${c}">${v}<span class="u">${l}</span></span>`;
  return (d > 0 ? u(d, 'd') : '') + u(pad(h), 'h') + u(pad(m), 'm') + u(pad(s), 's', 's');
}
const shiftName = s => s === 'night' ? 'Night shift' : 'Day shift';
const patText = p => `${p.daysOn}/${p.daysOff}`;
const stepper = (id, v) => `<span class="stepper"><button type="button" data-act="step" data-d="-1" aria-label="Decrease">−</button><input id="${id}" type="number" inputmode="numeric" min="1" max="120" value="${v}"><button type="button" data-act="step" data-d="1" aria-label="Increase">+</button></span>`;
const PRESETS = [[7, 7], [14, 14], [21, 21], [28, 28], [14, 7], [21, 7]];
const presetChips = (pfx, pat) => `<div class="chips">${PRESETS.map(([a, b]) => `<button type="button" class="pchip${pat.daysOn === a && pat.daysOff === b ? ' on' : ''}" data-act="preset" data-on="${a}" data-off="${b}">${a}/${b}</button>`).join('')}</div>`;
const rotationPart = (pfx, pat) => `${presetChips(pfx, pat)}<div class="group form"><div class="row"><span class="k">Days on</span>${stepper(pfx + '-on', pat.daysOn)}</div><div class="row"><span class="k">Days off</span>${stepper(pfx + '-off', pat.daysOff)}</div></div>`;
const shiftPart = (pfx, pat) => `<div class="seg" id="${pfx}-shift" data-change="shift-swap"><button type="button" data-act="seg" data-val="day" class="${pat.shiftType !== 'night' ? 'on' : ''}">Day shift</button><button type="button" data-act="seg" data-val="night" class="${pat.shiftType === 'night' ? 'on' : ''}">Night shift</button></div>
  <div class="group form" style="margin-top:10px"><label class="row"><span class="k">Shift starts</span><input type="time" id="${pfx}-st" value="${esc(pat.startTime)}"></label><label class="row"><span class="k">Shift ends</span><input type="time" id="${pfx}-et" value="${esc(pat.endTime)}"></label>
  <div class="row"><span class="t"><b>Alternate days and nights</b><small>Every other hitch flips to the opposite shift</small></span><button type="button" class="switch${pat.alternating ? ' on' : ''}" id="${pfx}-alt" role="switch" aria-checked="${!!pat.alternating}" aria-label="Alternate days and nights" data-act="switch"></button></div></div>`;
const datePart = (pfx, date) => `<div class="group form"><label class="row"><span class="k">First day of a hitch</span><input type="date" id="${pfx}-date" value="${esc(date)}"></label></div>`;
function readHitch(pfx) {
  const g = id => $('#' + pfx + '-' + id);
  return {
    name: g('name') ? g('name').value.trim() : S.name,
    hitchStart: g('date').value,
    pattern: {
      daysOn: clampInt(g('on').value, 1, 120), daysOff: clampInt(g('off').value, 1, 120),
      shiftType: segVal(g('shift')), startTime: g('st').value || '06:00', endTime: g('et').value || '18:00',
      alternating: g('alt').classList.contains('on')
    }
  };
}
const segVal = el => { const b = el && $('button.on', el); return b ? b.dataset.val : null; };
function syncChips(form) {
  const on = $('input[id$="-on"]', form), off = $('input[id$="-off"]', form);
  if (!on || !off) return;
  $$('.pchip', form).forEach(c => c.classList.toggle('on', +c.dataset.on === +on.value && +c.dataset.off === +off.value));
}

/* ───────── toast / sheet / alert ───────── */
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
let sheetCb = null, sheetT;
function openSheet(o) {
  clearTimeout(sheetT);
  $('#sheet-title').textContent = o.title || '';
  $('#sheet-left').textContent = o.left || 'Cancel';
  const r = $('#sheet-right'); r.hidden = !o.right; r.textContent = o.right || '';
  const body = $('#sheet-body'); body.innerHTML = o.body; body.scrollTop = 0;
  sheetCb = o.onPrimary || null;
  const w = $('#sheet'), card = $('#sheet-card'); card.style.transform = ''; card.style.transition = '';
  w.hidden = false; void w.offsetWidth; w.classList.add('open');
  if (o.onOpen) o.onOpen(body);
}
function closeSheet() {
  const w = $('#sheet'); if (w.hidden) return;
  if (document.activeElement && w.contains(document.activeElement)) document.activeElement.blur();
  w.classList.remove('open'); clearTimeout(sheetT); sheetT = setTimeout(() => { w.hidden = true; $('#sheet-body').innerHTML = ''; }, 440);
}
let alertCb = null, alertT;
function ask(o) {
  clearTimeout(alertT);
  $('#alert-title').textContent = o.title; $('#alert-msg').textContent = o.msg || '';
  const b = $('#alert-ok'); b.textContent = o.ok; b.classList.toggle('red', !!o.red);
  alertCb = o.onOk; const w = $('#alert'); w.hidden = false; void w.offsetWidth; w.classList.add('open');
}
function closeAlert() { const w = $('#alert'); w.classList.remove('open'); clearTimeout(alertT); alertT = setTimeout(() => { w.hidden = true; }, 380); }

/* ───────── theme ───────── */
const hostTheme = document.documentElement.getAttribute('data-theme');
function applyTheme() {
  const r = document.documentElement, t = S.theme;
  if (t === 'light' || t === 'dark') r.setAttribute('data-theme', t);
  else if (hostTheme) r.setAttribute('data-theme', hostTheme);
  else r.removeAttribute('data-theme');
  const bg = getComputedStyle(r).getPropertyValue('--bg').trim();
  $$('meta[name="theme-color"]').forEach(m => { m.removeAttribute('media'); m.setAttribute('content', bg); });
}

/* ───────── colors and themes ───────── */
const HEX = /^#[0-9a-f]{6}$/i;
const DEFC = { day: '#007AFF', night: '#5856D6', home: '#34C759', accent: '#FF9F0A' };
const COLOR_ROWS = [['day', 'Day shift'], ['night', 'Night shift'], ['home', 'Days off'], ['accent', 'Buttons and highlights']];
const SWATCH = ['#007AFF', '#0E9F8E', '#34C759', '#84B816', '#FF9F0A', '#FF7A3D', '#FF3B30', '#E8508C', '#A855F7', '#5856D6', '#5B7FA6', '#8E8E93'];
const THEMES = [
  ['Classic', {}],
  ['Sunrise', { day: '#FF7A3D', night: '#4B4FC4', home: '#2E9E68', accent: '#FF7A3D' }],
  ['Pine', { day: '#0E9F8E', night: '#3F5BA9', home: '#84B816', accent: '#0E9F8E' }],
  ['Slate', { day: '#5B7FA6', night: '#7A6FB0', home: '#6FA58A', accent: '#5B7FA6' }],
  ['Rose', { day: '#E8508C', night: '#8A4FD6', home: '#22B8A6', accent: '#E8508C' }],
  ['Crude', { day: '#C98A2B', night: '#6B7280', home: '#3F9B6C', accent: '#C98A2B' }]
];
const colorOf = k => S.colors[k] || DEFC[k];
function applyColors() {
  let el = $('#user-colors');
  if (!el) { el = document.createElement('style'); el.id = 'user-colors'; document.head.appendChild(el); }
  const c = S.colors, mix = (x, pct, w) => `color-mix(in srgb,${x} ${pct}%,${w})`;
  const set = dark => {
    let o = '';
    [['day', 'day'], ['night', 'night'], ['home', 'home']].forEach(([k, n]) => {
      const x = c[k]; if (!x) return;
      o += `--${n}:${x};--${n}-bg:${mix(x, dark ? 30 : 15, 'transparent')};--${n}-text:${dark ? mix(x, 52, '#fff') : mix(x, 66, '#000')};--hero-${n}-a:${mix(x, 88, '#000')};--hero-${n}-b:${mix(x, 62, '#000')};`;
    });
    if (c.accent) o += `--tint:${c.accent};--on-tint:${inkFor(c.accent)};--tint-soft:${mix(c.accent, dark ? 22 : 17, 'transparent')};--tint-text:${dark ? mix(c.accent, 62, '#fff') : mix(c.accent, 60, '#000')};`;
    return o;
  };
  el.textContent = Object.keys(c).length ? `:root{${set(false)}}@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${set(true)}}}:root[data-theme="dark"]{${set(true)}}` : '';
}
function colorsBody() {
  const cur = JSON.stringify(COLOR_ROWS.map(([k]) => colorOf(k).toUpperCase()));
  return `<div class="sec-h">Themes</div><div class="themes">${THEMES.map(([name, t], i) => { const full = COLOR_ROWS.map(([k]) => (t[k] || DEFC[k]).toUpperCase()); return `<button type="button" class="theme-btn${JSON.stringify(full) === cur ? ' on' : ''}" data-act="theme-pick" data-i="${i}"><b>${name}</b><span>${full.map(x => `<i style="background:${x}"></i>`).join('')}</span></button>`; }).join('')}</div>
    ${COLOR_ROWS.map(([k, label]) => `<div class="sec-h">${label}</div><div class="group"><div class="cswatches">${SWATCH.map(x => `<button type="button" class="cs${colorOf(k).toUpperCase() === x ? ' on' : ''}" data-act="color-pick" data-k="${k}" data-c="${x}" style="--rc:${x}" aria-label="${label} ${x}"></button>`).join('')}<label class="cs custom${SWATCH.includes(colorOf(k).toUpperCase()) ? '' : ' on'}" style="--rc:${colorOf(k)}" aria-label="Custom ${label} color"><input type="color" data-color-k="${k}" value="${colorOf(k)}"></label></div></div>`).join('')}
    <p class="foot">Changes apply right away. The last circle in each row opens a full color picker.</p>`;
}
function setColor(k, v, redraw = true) {
  if (!DEFC[k] || !HEX.test(v)) return;
  if (v.toUpperCase() === DEFC[k]) delete S.colors[k]; else S.colors[k] = v.toUpperCase();
  save(); applyColors(); render();
  if (redraw) { const b = $('#sheet-body'), y = b.scrollTop; b.innerHTML = colorsBody(); b.scrollTop = y; }
}
const openColors = () => openSheet({ title: 'Colors and themes', left: 'Done', body: colorsBody() });

/* ───────── navigation ───────── */
let tab = 'today';
const now0 = new Date();
const cal = { y: now0.getFullYear(), m: now0.getMonth(), mode: 'month' };
let holYear = now0.getFullYear();
let lastPhase = '', lastDay = '';
const RENDER = { today: renderToday, cal: () => renderCal(), pay: renderPay, crew: renderCrew, more: renderMore };
function showTab(t) {
  tab = t;
  $('#page-certs').classList.remove('open');
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'v-' + t));
  $$('.tab').forEach(b => { const on = b.dataset.tab === t; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  render();
}
function render() {
  if (!S.setup) return;
  lastPhase = nowInfo(me()).phase; lastDay = todayKey();
  RENDER[tab]();
  if ($('#page-certs').classList.contains('open')) renderCerts();
}
function tick() {
  if (!S.setup || document.hidden) return;
  const info = nowInfo(me());
  if (info.phase !== lastPhase || todayKey() !== lastDay) { render(); return; }
  $$('[data-cd]').forEach(el => { el.innerHTML = cdHTML(info.ms, el.dataset.cd); });
  const arc = $('#ring-arc'); if (arc) arc.style.strokeDashoffset = RC * (1 - info.pct);
}
const RC = +(2 * Math.PI * 26).toFixed(2);

/* ───────── Today ───────── */
function certState(c) {
  const n = daysBetween(new Date(), parseKey(c.expiry));
  return n < 0 ? { cls: 'c-danger', txt: `Expired ${plural(-n, 'day')} ago`, short: 'Expired', n } : n <= 30 ? { cls: 'c-warn', txt: n === 0 ? 'Expires today' : `Expires in ${plural(n, 'day')}`, short: n === 0 ? 'Today' : plural(n, 'day'), n } : { cls: 'c-home', txt: `Expires in ${plural(n, 'day')}`, short: plural(n, 'day'), n };
}
function renderToday() {
  const now = new Date(), today = startOfDay(now), sch = me(), p = S.pattern, info = nowInfo(sch, now), on = info.phase === 'on';
  const cls = on ? (info.shift === 'night' ? 'night' : 'day') : 'home';
  $('#today-avatar').innerHTML = avInner(S);
  let h = `<div class="eyebrow">${fmtLong(now)}</div><h1 class="lt">Today</h1>`;
  if (S.demo) h += `<button class="banner" data-act="demo-setup"><span>You're looking at a sample schedule.</span><b>Set up yours</b>${IC.chev}</button>`;
  h += `<div class="hero ${cls}">
    <div class="lab">${on ? `On hitch · ${shiftName(info.shift)}` : 'Days off'}</div>
    <div class="ring" role="img" aria-label="Day ${info.dayNum} of ${info.total}"><svg viewBox="0 0 60 60"><circle class="tr" cx="30" cy="30" r="26"/><circle class="ar" id="ring-arc" cx="30" cy="30" r="26" stroke-dasharray="${RC}" stroke-dashoffset="${RC * (1 - info.pct)}"/></svg><div class="mid"><b>${info.dayNum}</b><small>of ${info.total}</small></div></div>
    <div class="lead">${on ? 'Headed home in' : 'Back on hitch in'}</div>
    <div class="cd" data-cd="full">${cdHTML(info.ms, 'full')}</div>
    <div class="sub">${fmtLong(info.until)} at ${fmtClock(info.until)}</div>
  </div>`;

  let nightSeen = false, strip = '';
  for (let i = 0; i < 14; i++) {
    const d = addDays(today, i), k = toKey(d), ci = cellInfo(k, sch);
    const c = ci.type === 'on' ? (ci.shift === 'night' ? 'n' : 'd') : '';
    if (c === 'n') nightSeen = true;
    strip += dayCell(d, null, i % 7 === 0);
  }
  h += `<div class="sec-title">Next two weeks</div><div class="twoweek"><div class="dow">${Array.from({ length: 7 }, (_, i) => `<span>${DS[addDays(today, i).getDay()][0]}</span>`).join('')}</div><div class="tw-grid">${strip}</div></div>
    <div class="legend"><span><i style="background:var(--day)"></i>${nightSeen ? 'Day shift' : 'On hitch'}</span>${nightSeen ? '<span><i style="background:var(--night)"></i>Night shift</span>' : ''}<span><i style="background:var(--fill-2)"></i>Days off</span></div>`;

  const hk = toKey(on ? info.cs : info.until), full = fullPay(hk, p.daysOn), worked = on ? info.dayNum : 0, got = earnedPay(hk, worked, p.daysOn);
  h += `<div class="sec-title">${on ? 'This hitch' : 'Next hitch'}</div><button class="card-btn" data-act="tab" data-tab="pay">
    <div class="pay-line"><span class="big">${money(on ? got.total : full.total)}</span>${IC.chev}</div>
    ${on ? `<div class="track"><i style="width:${Math.round(clamp(got.total / (full.total || 1)) * 100)}%"></i></div><div class="cap"><span>Earned so far</span><span>${money(full.total)} at hitch end</span></div>`
      : `<div class="cap"><span>Estimate for ${plural(p.daysOn, 'day')}</span><span>Starts ${fmtDay(info.until)}</span></div>`}
  </button>`;

  const items = [];
  transitions(sch, 3, now).forEach(t => items.push({
    date: t.date, c: t.type === 'on' ? (t.shift === 'night' ? 'var(--night)' : 'var(--day)') : 'var(--home)',
    ic: t.type === 'on' ? (t.shift === 'night' ? IC.moon : IC.sun) : IC.house,
    title: t.type === 'on' ? `Back on hitch` : 'Days off start', sub: `${fmtDay(t.date)} at ${fmtClock(t.date)}`, tag: rel(t.date), k: toKey(t.date)
  }));
  S.certs.forEach(c => { const st = certState(c); if (st.n <= 60) items.push({ date: parseKey(c.expiry), c: st.n <= 30 ? 'var(--danger)' : 'var(--tint)', ic: IC.shield, title: c.name, sub: st.txt, chip: st.n <= 30 ? st.cls : '', tag: st.n < 0 ? 'Expired' : fmtMD(parseKey(c.expiry)), act: 'certs-open' }); });
  [now.getFullYear(), now.getFullYear() + 1].forEach(y => holidays(y).forEach(hd => {
    const n = daysBetween(today, hd.date);
    if (n >= 0 && n <= 60) { const off = dayType(toKey(hd.date), sch) === 'off'; items.push({ date: hd.date, c: 'var(--tint)', ic: IC.flag, title: hd.name, sub: `${fmtDay(hd.date)} · ${off ? "You're off" : "You're on hitch"}`, tag: rel(hd.date), k: toKey(hd.date) }); }
  }));
  Object.keys(S.notes).forEach(k => { const n = daysBetween(today, parseKey(k)); if (n >= 0 && n <= 30) { const nt = S.notes[k]; items.push({ date: parseKey(k), emoji: nt.emoji || '📝', title: nt.text || 'Note', sub: fmtDay(parseKey(k)), tag: rel(parseKey(k)), k }); } });
  items.sort((a, b) => a.date - b.date);
  h += `<div class="sec-title">Coming up</div><div class="group ic">${items.slice(0, 8).map(it => `<button class="row" data-act="${it.act || 'day'}" ${it.k ? `data-k="${it.k}"` : ''}>
    ${it.emoji ? `<span class="itile e">${esc(it.emoji)}</span>` : `<span class="itile" style="--c:${it.c}">${it.ic}</span>`}
    <span class="t"><b>${esc(it.title)}</b><small>${esc(it.sub)}</small></span>${it.chip ? `<span class="chip ${it.chip}">${esc(it.tag)}</span>` : `<span class="v" style="font-size:15px">${esc(it.tag)}</span>`}</button>`).join('')}</div>`;

  const y0 = now.getFullYear();
  if (holYear !== y0 && holYear !== y0 + 1) holYear = y0;
  const hs = holidays(holYear), offN = hs.filter(x => dayType(toKey(x.date), sch) === 'off').length;
  h += `<div class="sec-title">Holidays<span class="seg sm" data-change="hol-year"><button data-act="seg" data-val="${y0}" class="${holYear === y0 ? 'on' : ''}">${y0}</button><button data-act="seg" data-val="${y0 + 1}" class="${holYear === y0 + 1 ? 'on' : ''}">${y0 + 1}</button></span></div>
    <div class="group">${hs.map(x => { const off = dayType(toKey(x.date), sch) === 'off'; return `<button class="row${off ? '' : ' dim'}" data-act="day" data-k="${toKey(x.date)}"><span class="t"><b>${esc(x.name)} <span class="mut" style="font-weight:400;font-size:15px">${fmtMD(x.date)}</span></b></span><span class="chip ${off ? 'c-home' : 'c-gray'}">${off ? 'Off' : 'On hitch'}</span></button>`; }).join('')}</div>
    <p class="foot">You're home for ${offN} of ${hs.length} federal holidays in ${holYear}.</p>`;
  $('#today-body').innerHTML = h;
}

/* ───────── Calendar ───────── */
function renderCal(dir) {
  const sch = me(), info = nowInfo(sch), on = info.phase === 'on';
  $('#cal-title').innerHTML = cal.mode === 'month' ? `${MONTHS[cal.m]} <span>${cal.y}</span>` : cal.mode === 'year' ? String(cal.y) : 'Upcoming';
  $('#cal-prev').hidden = $('#cal-next').hidden = cal.mode === 'list';
  $('#cal-dow').hidden = cal.mode !== 'month';
  $$('#cal-seg button').forEach(b => b.classList.toggle('on', b.dataset.val === cal.mode));
  $('#cal-strip').innerHTML = `<span class="dot" style="--c:${on ? (info.shift === 'night' ? 'var(--night)' : 'var(--day)') : 'var(--home)'}"></span><span class="t">${on ? 'On hitch' : 'Days off'} · Day ${info.dayNum} of ${info.total}</span><span class="r" data-cd="short">${cdHTML(info.ms, 'short')}</span>${IC.chev}`;
  const main = $('#cal-main');
  if (cal.mode === 'month') main.innerHTML = monthHTML(dir);
  else if (cal.mode === 'year') main.innerHTML = `<div class="cal-scroll"><div class="year">${Array.from({ length: 12 }, (_, m) => miniMonth(cal.y, m)).join('')}</div></div>`;
  else main.innerHTML = `<div class="cal-scroll">${listHTML()}</div>`;
}
function monthHTML(dir) {
  const sch = me(), first = new Date(cal.y, cal.m, 1), lead = first.getDay(), dim = new Date(cal.y, cal.m + 1, 0).getDate();
  const total = Math.ceil((lead + dim) / 7) * 7, tk = todayKey();
  const certDays = new Set(S.certs.map(c => c.expiry));
  let h = `<div class="month${dir ? ' go-' + dir : ''}" id="month">`;
  for (let i = 0; i < total; i++) h += dayCell(addDays(first, i - lead), cal.m, i === 0);
  return h + '</div>';
}
/* One calendar day, drawn the same way on the month grid and on Today's two-week strip. */
function dayCell(d, month, i0) {
  const sch = me(), tk = todayKey(), certDays = new Set(S.certs.map(c => c.expiry));
  let h = '';
  {
    const k = toKey(d), ci = cellInfo(k, sch), out = month != null && d.getMonth() !== month;
    const cls = ['cell'];
    let style = '';
    if (ci.type === 'on' || ci.tail) {
      cls.push(ci.shift === 'night' ? 'n' : 'd');
      if (!ci.split) cls.push('full'); else { style = `--a:${(ci.a * 100).toFixed(1)}%;--b:${(ci.b * 100).toFixed(1)}%`; if (ci.a <= 0.3 && ci.b >= 0.5) cls.push('lead'); }
    }
    if (out) cls.push('out');
    if (k === tk) cls.push('now');
    const hol = S.showHolidays ? holidayOn(k) : null, note = S.notes[k];
    let bars = '';
    S.rosters.slice(0, 5).forEach((r, ri) => {
      if (dayType(k, r) !== 'on') return;
      const s = dayType(toKey(addDays(d, -1)), r) !== 'on', e = dayType(toKey(addDays(d, 1)), r) !== 'on', named = s || i0;
      bars += `<span class="bar${s ? ' s' : ''}${e ? ' e' : ''}${named ? ' nm' : ''}" style="--i:${ri};--rc:${r.color};--ri:${inkFor(r.color)}">${named ? `<span>${esc(r.name.split(/\s+/)[0].slice(0, 12))}</span>` : ''}</span>`;
    });
    const label = `${fmtLong(d)}, ${ci.type === 'on' ? 'on hitch' : 'off'}${hol ? ', ' + hol : ''}`;
    h += `<button class="${cls.join(' ')}" data-act="day" data-k="${k}" style="${style}" aria-label="${esc(label)}"><span class="bgl">${hol && HOLIDAY_SVG[hol] ? `<svg class="art" viewBox="0 0 100 130" preserveAspectRatio="xMidYMid meet" fill="currentColor" aria-hidden="true">${HOLIDAY_SVG[hol]}</svg>` : ''}</span><span class="dn">${d.getDate()}</span>${note ? (note.emoji ? `<span class="em">${esc(note.emoji)}</span>` : '<span class="nd"></span>') : ''}${certDays.has(k) ? `<span class="ce">${IC.alert}</span>` : ''}${bars}</button>`;
  }
  return h;
}
function miniMonth(y, m) {
  const sch = me(), first = new Date(y, m, 1), dim = new Date(y, m + 1, 0).getDate(), tk = todayKey(), n = new Date();
  let g = '<i></i>'.repeat(first.getDay());
  for (let d = 1; d <= dim; d++) {
    const k = `${y}-${pad(m + 1)}-${pad(d)}`, ci = cellInfo(k, sch);
    g += `<i class="${k === tk ? 't' : ci.type === 'on' ? (ci.shift === 'night' ? 'n' : 'd') : ''}">${d}</i>`;
  }
  return `<button class="mini" data-act="cal-month" data-m="${m}" aria-label="${MONTHS[m]} ${y}"><span class="mini-name${y === n.getFullYear() && m === n.getMonth() ? ' cur' : ''}">${MS[m]}</span><span class="mini-grid">${g}</span></button>`;
}
function listHTML() {
  const sch = me(), p = S.pattern, today = startOfDay(new Date());
  let h = '', curM = -1, open = false;
  for (let i = 0; i < 90; i++) {
    const d = addDays(today, i), k = toKey(d), ci = cellInfo(k, sch), ev = [];
    const col = ci.shift === 'night' ? 'var(--night)' : 'var(--day)';
    if (i === 0) ev.push(['var(--tint)', `Today · ${ci.type === 'on' ? `On hitch, day ${ci.pos + 1} of ${p.daysOn}` : `Days off, day ${ci.pos - p.daysOn + 1} of ${p.daysOff}`}`]);
    if (ci.type === 'on' && ci.pos === 0) ev.push([col, `Hitch starts · ${shiftName(ci.shift)}, ${fmt12(ci.st)}`]);
    if (ci.type === 'on' && ci.pos === p.daysOn - 1 && !ci.crosses) ev.push([col, `Last shift · off at ${fmt12(ci.et)}`]);
    if (ci.type === 'off' && ci.pos === p.daysOn) ev.push(['var(--home)', ci.tail ? `Off at ${fmt12(ci.et)} · days off start` : 'Days off start']);
    const hol = holidayOn(k); if (hol) ev.push(['var(--tint)', `${hol} · ${ci.type === 'on' ? 'on hitch' : 'off'}`]);
    S.certs.forEach(c => { if (c.expiry === k) ev.push(['var(--danger)', `${c.name} expires`]); });
    S.rosters.forEach(r => { const rp = posOf(k, r).pos; if (rp === 0) ev.push([r.color, `${r.name} starts a hitch`]); else if (rp === r.pattern.daysOn) ev.push([r.color, `${r.name} is home`]); });
    const nt = S.notes[k]; if (nt) ev.push(['var(--label-3)', `${nt.emoji ? nt.emoji + ' ' : ''}${nt.text || 'Note'}`]);
    if (!ev.length) continue;
    if (d.getMonth() !== curM) { if (open) h += '</div>'; h += `<h2 class="ag-month">${MONTHS[d.getMonth()]} ${d.getFullYear()}</h2><div class="group">`; curM = d.getMonth(); open = true; }
    h += `<button class="row ag-row${i === 0 ? ' now' : ''}" data-act="day" data-k="${k}"><span class="ag-date"><small>${DS[d.getDay()]}</small><b>${d.getDate()}</b></span><span class="ag-ev">${ev.map(([c, t]) => `<div><i style="--c:${c}"></i><span>${esc(t)}</span></div>`).join('')}</span></button>`;
  }
  return h + (open ? '</div>' : '');
}
function calShift(n) {
  if (cal.mode === 'year') cal.y += n;
  else { const d = new Date(cal.y, cal.m + n, 1); cal.y = d.getFullYear(); cal.m = d.getMonth(); }
  renderCal(n > 0 ? 'l' : 'r');
}

/* ───────── Day sheet ───────── */
const EMOJI = ['🎂', '✈️', '🏥', '🎣', '🦌', '🏈', '🎉', '🔧', '💰', '❤️', '👶', '🎓', '📞', '⚠️'];
function openDay(k) {
  const d = parseKey(k), sch = me(), p = S.pattern, ci = cellInfo(k, sch), note = S.notes[k] || { text: '', emoji: '' };
  let st;
  if (ci.type === 'on') {
    const bits = [`${shiftName(ci.shift)}, ${fmt12(ci.st)} to ${fmt12(ci.et)}`];
    if (ci.pos === 0) bits.push(`hitch starts at ${fmt12(ci.st)}`);
    if (ci.pos === p.daysOn - 1) bits.push(ci.crosses ? `last shift, off at ${fmt12(ci.et)} next morning` : `last shift, off at ${fmt12(ci.et)}`);
    st = `<div class="dstat ${ci.shift === 'night' ? 'n' : 'd'}">${ci.shift === 'night' ? IC.moon : IC.sun}<div><b>On hitch · Day ${ci.pos + 1} of ${p.daysOn}</b><small>${bits.join(' · ')}</small></div></div>`;
  } else {
    st = `<div class="dstat h">${IC.house}<div><b>Days off · Day ${ci.pos - p.daysOn + 1} of ${p.daysOff}</b><small>${ci.tail ? `Night shift ends at ${fmt12(ci.et)}, then you're off` : ci.pos === p.daysOn + p.daysOff - 1 ? 'Last day off before the next hitch' : 'Home'}</small></div></div>`;
  }
  const rows = [];
  const hol = holidayOn(k); if (hol) rows.push(`<div class="row"><span class="itile" style="--c:var(--tint)">${IC.flag}</span><span class="t"><b>${esc(hol)}</b><small>Federal holiday</small></span></div>`);
  S.certs.filter(c => c.expiry === k).forEach(c => rows.push(`<div class="row"><span class="itile" style="--c:var(--danger)">${IC.shield}</span><span class="t"><b>${esc(c.name)}</b><small>Expires this day</small></span></div>`));
  const crew = S.rosters.map(r => { const on = dayType(k, r) === 'on'; return `<div class="row"><span class="avatar sm" style="--av:${r.color};--avi:${inkFor(r.color)}">${avInner(r)}</span><span class="t"><b>${esc(r.name)}</b></span><span class="chip ${on ? 'c-gray' : 'c-home'}">${on ? 'On hitch' : 'Home'}</span></div>`; }).join('');
  openSheet({
    title: `${fmtLong(d)}${d.getFullYear() !== new Date().getFullYear() ? ', ' + d.getFullYear() : ''}`, right: 'Save',
    body: `${st}${rows.length ? `<div class="group ic" style="margin-top:10px">${rows.join('')}</div>` : ''}
      ${crew ? `<div class="sec-h">Crew</div><div class="group ic">${crew}</div>` : ''}
      <div class="sec-h">Note</div>
      <div class="group form"><div class="emojis" id="ds-emojis">${EMOJI.map(e => `<button type="button" class="emo${note.emoji === e ? ' on' : ''}" data-act="emoji" data-e="${e}">${e}</button>`).join('')}</div>
      <textarea id="ds-note" rows="3" maxlength="240" placeholder="Birthday, appointment, crew change…">${esc(note.text)}</textarea></div>
      ${S.notes[k] ? '<button class="btn del" data-act="note-del">Delete note</button>' : ''}`,
    onPrimary() {
      const text = $('#ds-note').value.trim(), em = $('#ds-emojis .emo.on');
      if (text || em) S.notes[k] = { text, emoji: em ? em.dataset.e : '' }; else delete S.notes[k];
      save(); closeSheet(); render(); toast(text || em ? 'Note saved' : 'No note to save');
    },
    onOpen(b) { b.dataset.k = k; }
  });
}

/* ───────── Pay ───────── */
function renderPay() {
  const sch = me(), p = S.pattern, e = S.earnings, info = nowInfo(sch), on = info.phase === 'on', yr = new Date().getFullYear();
  const hk = toKey(on ? info.cs : info.until), full = fullPay(hk, p.daysOn), worked = on ? info.dayNum : 0, got = earnedPay(hk, worked, p.daysOn), show = on ? got : full, days = on ? worked : p.daysOn, tN = num(e.travelDays);
  const yp = yearPay(yr), rate = e.payType === 'hourly' ? `$${num(e.hourlyRate)}/hr × ${num(e.hoursPerShift)} hrs` : `${money(num(e.dayRate))}/day`;
  let h = `<div class="eyebrow">${on ? `Day ${info.dayNum} of ${info.total}` : `Next hitch starts ${fmtMD(info.until)}`}</div><h1 class="lt">Pay</h1>
  <div class="pcard"><div class="eyebrow">${on ? 'Earned this hitch' : 'Next hitch estimate'}</div><div class="big">${money(show.total)}</div>
    ${on ? `<div class="track"><i style="width:${Math.round(clamp(got.total / (full.total || 1)) * 100)}%"></i></div><div class="cap"><span>${plural(worked, 'day')} worked</span><span>${money(full.total)} at hitch end</span></div>` : `<div class="cap" style="margin-top:6px"><span>${plural(p.daysOn, 'day')} · ${esc(rate)}</span></div>`}
  </div>
  <div class="group" style="margin-top:10px">
    <div class="row"><span class="k">Base pay <span class="mut">· ${plural(days, 'day')} × ${money(dailyPay())}</span></span><span class="v">${money(show.base)}</span></div>
    <div class="row"><span class="k">Per diem <span class="mut">· ${money(num(e.perDiem))}/day</span></span><span class="v">${money(show.diem)}</span></div>
    ${tN ? `<div class="row"><span class="k">Travel days <span class="mut">· ${show.tn < tN ? `${show.tn} of ${tN}` : tN} × ${money(num(e.travelRate))}</span></span><span class="v">${money(show.travel)}</span></div>` : ''}
    <button class="row" data-act="hitch-miles" data-k="${hk}"><span class="k">Mileage <span class="mut">· ${full.mi} mi this hitch</span></span><span class="v">${money(show.miles)}</span>${IC.chev}</button>
  </div>
  <div class="sec-title">${yr} so far</div>
  <div class="tiles">
    <div class="tile"><small>Earned to date</small><b>${money(yp.ytd)}</b><span>${plural(yp.daysW, 'day')} worked</span></div>
    <div class="tile"><small>Full-year pace</small><b>${money(yp.proj)}</b><span>${plural(yp.daysAll, 'day')} scheduled</span></div>
  </div>
  <div class="sec-title">Rates<button class="txt-btn" data-act="pay-edit" style="font-size:15px;font-weight:400;min-height:0">Edit</button></div>
  <button class="group" data-act="pay-edit" style="display:block;width:100%">
    <div class="row"><span class="k">${e.payType === 'hourly' ? 'Hourly rate' : 'Day rate'}</span><span class="v">${esc(rate)}</span></div>
    ${e.payType === 'hourly' ? `<div class="row"><span class="k">Overtime</span><span class="v">1.5× after ${num(e.otAfter)} hrs</span></div>` : ''}
    <div class="row"><span class="k">Per diem</span><span class="v">${money(num(e.perDiem))}/day</span></div>
    ${tN ? `<div class="row"><span class="k">Travel days</span><span class="v">${tN} per hitch · ${money(num(e.travelRate))}</span></div>` : ''}
    <div class="row"><span class="k">Mileage</span><span class="v">$${num(e.mileageRate).toFixed(2)}/mi · ${num(e.roundTrip)} mi usual</span></div>
  </button>
  <div class="sec-title">Bonuses<button class="txt-btn" data-act="bonus-add" style="font-size:15px;font-weight:400;min-height:0">Add</button></div>`;
  const bon = [...S.bonuses].sort((a, b) => (a.date < b.date ? 1 : -1));
  h += bon.length ? `<div class="group ic">${bon.map(b => `<button class="row" data-act="bonus-edit" data-id="${b.id}"><span class="itile" style="--c:var(--home)">${IC.star}</span><span class="t"><b>${esc(b.label || 'Bonus')}</b><small>${validKey(b.date) ? fmtFull(parseKey(b.date)) : ''}</small></span><span class="v">${money(num(b.amount))}</span>${IC.chev}</button>`).join('')}</div>`
    : `<div class="group"><button class="row" data-act="bonus-add"><span class="t"><b>No bonuses yet</b><small>Safety bonuses, completion pay and other one-offs count toward your year.</small></span>${IC.chev}</button></div>`;
  const past = yp.hs.filter(x => x.status !== 'next').reverse(), next = yp.hs.filter(x => x.status === 'next');
  h += `<div class="sec-title">Hitches in ${yr}</div><div class="group">${past.map(x => { const pay = earnedPay(x.key, x.worked, x.days).total, own = S.hitchMiles[x.key] != null; return `<button class="row" data-act="hitch-miles" data-k="${x.key}"><span class="t"><b>${fmtMD(x.first)} – ${fmtMD(x.last)}</b><small>${x.status === 'now' ? `In progress · ${x.worked} of ${plural(x.days, 'day')}` : plural(x.days, 'day')} · ${milesFor(x.key)} mi${own ? ' (edited)' : ''}</small></span>${x.status === 'now' ? '<span class="chip c-day">Now</span>' : ''}<span class="v">${money(pay)}</span>${IC.chev}</button>`; }).join('')}
    ${next.length ? `<div class="row"><span class="t"><b>${plural(next.length, 'hitch').replace('hitchs', 'hitches')} still to come</b><small>${fmtMD(next[0].first)} onward</small></span><span class="v">${money(next.reduce((a, x) => a + fullPay(x.key, x.days).total, 0))}</span></div>` : ''}
    ${!past.length && !next.length ? '<div class="row"><span class="t"><small>No hitches fall in this year.</small></span></div>' : ''}</div>
  <p class="foot">Tap a hitch to change its miles. Estimates are gross pay before taxes and deductions.</p>`;
  $('#pay-body').innerHTML = h;
}
const fRow = (label, id, val, affix = '$', mode = 'decimal') => `<label class="row"><span class="k">${label}</span>${affix ? `<span class="affix">${affix}</span>` : ''}<input type="text" inputmode="${mode}" id="${id}" value="${esc(val)}" autocomplete="off"></label>`;
function openPayEdit() {
  const e = S.earnings;
  openSheet({
    title: 'Pay rates', right: 'Save',
    body: `<div class="seg" id="pe-type" data-change="pay-type" style="margin-top:6px"><button type="button" data-act="seg" data-val="dayrate" class="${e.payType !== 'hourly' ? 'on' : ''}">Day rate</button><button type="button" data-act="seg" data-val="hourly" class="${e.payType === 'hourly' ? 'on' : ''}">Hourly</button></div>
      <div class="group form" id="pe-day" style="margin-top:10px" ${e.payType === 'hourly' ? 'hidden' : ''}>${fRow('Day rate', 'pe-dayrate', e.dayRate)}</div>
      <div class="group form" id="pe-hr" style="margin-top:10px" ${e.payType === 'hourly' ? '' : 'hidden'}>${fRow('Hourly rate', 'pe-hourly', e.hourlyRate)}${fRow('Hours per shift', 'pe-hours', e.hoursPerShift, '')}${fRow('Overtime after (hrs per day)', 'pe-ot', e.otAfter, '')}</div>
      <p class="foot" id="pe-hr-note" ${e.payType === 'hourly' ? '' : 'hidden'}>Hours past the overtime mark are paid at 1.5×.</p>
      <div class="sec-h">Per diem</div><div class="group form">${fRow('Per day on hitch', 'pe-diem', e.perDiem)}</div>
      <div class="sec-h">Paid travel days per hitch</div><div class="seg" id="pe-tn" data-change="pay-travel">${[0, 1, 2].map(n => `<button type="button" data-act="seg" data-val="${n}" class="${num(e.travelDays) === n ? 'on' : ''}">${n === 0 ? 'None' : n === 1 ? '1 day' : '2 days'}</button>`).join('')}</div>
      <div class="group form" id="pe-trg" style="margin-top:10px" ${num(e.travelDays) ? '' : 'hidden'}>${fRow('Travel day rate', 'pe-tr', e.travelRate)}</div>
      <p class="foot">Paid on top of your days on hitch. Two days covers the trip out and the trip home.</p>
      <div class="sec-h">Mileage</div><div class="group form">${fRow('Rate per mile', 'pe-mi', e.mileageRate)}${fRow('Usual round-trip miles', 'pe-rt', e.roundTrip, '')}</div>
      <p class="foot">Paid once per hitch. If a hitch has different miles, tap that hitch on the Pay screen to change it.</p>`,
    onPrimary() {
      const v = id => Math.max(0, num($('#' + id).value));
      S.earnings = { payType: segVal($('#pe-type')), dayRate: v('pe-dayrate'), hourlyRate: v('pe-hourly'), hoursPerShift: v('pe-hours'), otAfter: v('pe-ot'), perDiem: v('pe-diem'), mileageRate: v('pe-mi'), roundTrip: v('pe-rt'), travelDays: clamp(+segVal($('#pe-tn')) || 0, 0, 2), travelRate: v('pe-tr') };
      save(); closeSheet(); render(); toast('Rates saved');
    }
  });
}
function openMiles(key) {
  if (!validKey(key)) return;
  const p = S.pattern, e = S.earnings, cs = parseKey(key), own = S.hitchMiles[key] != null;
  openSheet({
    title: `${fmtMD(cs)} – ${fmtMD(addDays(cs, p.daysOn - 1))}`, right: 'Save',
    body: `<div class="sec-h">Miles driven for this hitch</div><div class="group form">${fRow('Round-trip miles', 'hm-mi', milesFor(key), '')}</div>
      <p class="foot">Your usual round trip is ${num(e.roundTrip)} mi. Mileage pays $${num(e.mileageRate).toFixed(2)} a mile, so this hitch comes to ${money(num(e.mileageRate) * milesFor(key))}.</p>
      ${own ? '<button class="btn gray" data-act="miles-reset" style="margin-top:20px">Use my usual miles</button>' : ''}`,
    onOpen(body) { body.dataset.k = key; },
    onPrimary() {
      const v = Math.max(0, num($('#hm-mi').value));
      if (v === num(e.roundTrip)) delete S.hitchMiles[key]; else S.hitchMiles[key] = v;
      save(); closeSheet(); render(); toast('Miles saved');
    }
  });
}
function openBonus(id) {
  const b = S.bonuses.find(x => x.id === id);
  openSheet({
    title: b ? 'Edit bonus' : 'Add bonus', right: b ? 'Save' : 'Add',
    body: `<div class="group form" style="margin-top:6px"><label class="row"><span class="k">Label</span><input type="text" id="bo-label" placeholder="Safety bonus" maxlength="40" value="${esc(b ? b.label : '')}"></label>${fRow('Amount', 'bo-amount', b ? b.amount : '')}
      <label class="row"><span class="k">Date paid</span><input type="date" id="bo-date" value="${esc(b ? b.date : todayKey())}"></label></div>
      ${b ? '<button class="btn del" data-act="bonus-del">Delete bonus</button>' : ''}`,
    onOpen(body) { body.dataset.id = id || ''; },
    onPrimary() {
      const amount = num($('#bo-amount').value), date = $('#bo-date').value;
      if (amount <= 0) return toast('Enter an amount');
      if (!validKey(date)) return toast('Pick a date');
      const rec = { id: b ? b.id : uid(), label: $('#bo-label').value.trim() || 'Bonus', amount, date };
      if (b) Object.assign(b, rec); else S.bonuses.push(rec);
      save(); closeSheet(); render(); toast(b ? 'Bonus saved' : 'Bonus added');
    }
  });
}

/* ───────── Crew ───────── */
function sharedOff(r, max = 3) {
  const sch = me(), today = startOfDay(new Date()), out = [];
  let cur = null;
  for (let i = 0; i < 200 && out.length < max; i++) {
    const d = addDays(today, i), k = toKey(d), both = dayType(k, sch) === 'off' && dayType(k, r) === 'off';
    if (both) { if (!cur) cur = { start: d, end: d, n: 0 }; cur.end = d; cur.n++; }
    else if (cur) { out.push(cur); cur = null; }
  }
  if (cur && out.length < max) out.push(cur);
  return out;
}
function renderCrew() {
  const p = S.pattern, info = nowInfo(me()), on = info.phase === 'on';
  let h = `<div class="eyebrow">${S.rosters.length ? `${S.rosters.length} of 5 schedules` : 'Family and coworkers'}</div><h1 class="lt">Crew</h1>
  <div class="pcard"><div class="me"><span class="avatar lg">${avInner(S)}</span><span class="t"><b>${esc(S.name || 'My schedule')}</b><small>${patText(p)} · ${p.alternating ? 'Days and nights' : shiftName(p.shiftType)}</small></span><span class="chip ${on ? (info.shift === 'night' ? 'c-night' : 'c-day') : 'c-home'}">${on ? 'On hitch' : 'Home'}</span></div>
    <button class="btn primary" data-act="share">${IC.share}Share my schedule</button><button class="btn plain" data-act="copy-link">Copy link instead</button></div>
  <div class="sec-title">Schedules you follow</div>`;
  if (!S.rosters.length) {
    h += `<div class="empty"><div class="ei">${IC.people}</div><h3>See when you're both home</h3><p>Add a spouse's or coworker's rotation. It shows as a colored line on your calendar, and HitchCal finds the days you're off together.</p><button class="btn primary" data-act="crew-add">Add a schedule</button></div>`;
  } else {
    h += S.rosters.map(r => {
      const rOn = dayType(todayKey(), r) === 'on', so = sharedOff(r);
      return `<button class="rc" data-act="crew-edit" data-id="${r.id}" style="--rc:${r.color}"><div class="rc-h"><span class="avatar sm" style="--av:${r.color};--avi:${inkFor(r.color)}">${avInner(r)}</span><b>${esc(r.name)}</b><span class="chip ${rOn ? 'c-gray' : 'c-home'}">${rOn ? 'On hitch' : 'Home'}</span>${IC.chev}</div>
        <div class="rc-sub">${patText(r.pattern)} rotation</div>
        <div class="rc-l"><h4>Home together</h4>${so.length ? so.map(g => `<div><span>${fmtDay(g.start)}${g.n > 1 ? ' – ' + fmtDay(g.end) : ''}</span><span>${plural(g.n, 'day')}</span></div>`).join('') : '<div><span class="mut">No shared days off in the next six months</span><span></span></div>'}</div></button>`;
    }).join('');
    if (S.rosters.length < 5) h += `<button class="btn gray" data-act="crew-add" style="margin-top:12px">Add another schedule</button>`;
    h += `<p class="foot">Each schedule draws a colored line across the days that person is on hitch.</p>`;
  }
  $('#crew-body').innerHTML = h;
}
function openRoster(id, pre) {
  const r = S.rosters.find(x => x.id === id);
  if (!r && S.rosters.length >= 5) return toast('You can follow up to 5 schedules');
  const used = S.rosters.map(x => x.color), color = r ? r.color : (COLORS.find(c => !used.includes(c)) || COLORS[0]);
  const pat = r ? r.pattern : pre ? { daysOn: clampInt(pre.p.on, 1, 120), daysOff: clampInt(pre.p.off, 1, 120) } : { daysOn: 14, daysOff: 14 };
  openSheet({
    title: r ? 'Edit schedule' : 'Add a schedule', right: r ? 'Save' : 'Add',
    body: `<div data-form="sc"><div class="group form" style="margin-top:6px"><label class="row"><span class="k">Name</span><input type="text" id="sc-name" placeholder="Sarah" maxlength="24" autocomplete="off" value="${esc(r ? r.name : pre ? pre.n || '' : '')}"></label></div>
      <div class="sec-h">Icon</div>${avatarPicker('sc', r || { icon: pre ? pre.i : '' })}
      ${r ? '' : `<div class="sec-h">Have their HitchCal link?</div><div class="group form"><label class="row"><input type="text" id="sc-code" placeholder="Paste it here to fill everything in" autocomplete="off" style="text-align:left"></label></div>`}
      <div class="sec-h">Rotation</div>${rotationPart('sc', pat)}
      <div class="sec-h">Hitch start</div>${datePart('sc', r ? r.hitchStart : pre ? pre.s : todayKey())}
      <div class="sec-h">Line color</div><div class="group"><div class="swatches" id="sc-colors">${COLORS.map(c => `<button type="button" class="swatch${c === color ? ' on' : ''}" data-act="swatch" data-c="${c}" style="--rc:${c}" aria-label="Color ${c}"></button>`).join('')}</div></div>
      ${r ? '<button class="btn del" data-act="crew-del">Remove schedule</button>' : ''}</div>`,
    onOpen(body) {
      body.dataset.id = id || '';
      const code = $('#sc-code');
      if (code) code.addEventListener('input', () => {
        const d = parseShare(code.value); if (!d) return;
        if (d.n) $('#sc-name').value = d.n;
        if (okIcon(d.i)) { pick.sc = { icon: d.i, photo: '', mode: 'icon' }; $('#sc-av').innerHTML = avOpts('sc'); }
        $('#sc-date').value = d.s; $('#sc-on').value = clampInt(d.p.on, 1, 120); $('#sc-off').value = clampInt(d.p.off, 1, 120);
        syncChips(body); toast('Schedule filled in');
      });
    },
    onPrimary() {
      const name = $('#sc-name').value.trim(), hitchStart = $('#sc-date').value;
      if (!name) return toast('Add a name');
      if (!validKey(hitchStart)) return toast('Pick the first day of a hitch');
      const sw = $('#sc-colors .swatch.on');
      const rec = { id: r ? r.id : uid(), name, hitchStart, ...readAv('sc'), color: sw ? sw.dataset.c : color, pattern: { daysOn: clampInt($('#sc-on').value, 1, 120), daysOff: clampInt($('#sc-off').value, 1, 120) } };
      if (r) Object.assign(r, rec); else S.rosters.push(rec);
      save(); closeSheet(); render(); toast(r ? 'Schedule saved' : `${name} added`);
    }
  });
}
async function shareSchedule() {
  const link = makeShareLink(), info = nowInfo(me()), p = S.pattern;
  const text = `${S.name || 'My'} hitch schedule: ${patText(p)}, ${info.phase === 'on' ? 'on hitch' : 'home'} until ${fmtDay(info.until)}. Add it in HitchCal:`;
  if (!EMBEDDED && navigator.share) {
    try { await navigator.share({ title: 'HitchCal schedule', text, url: link }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  copyText(`${text} ${link}`, 'Link copied. Paste it in a text.');
}

/* ───────── More + Certifications ───────── */
function renderMore() {
  const p = S.pattern, exp = S.certs.filter(c => certState(c).n <= 30).length;
  $('#more-body').innerHTML = `<h1 class="lt">More</h1>
  <div class="group"><button class="row" data-act="edit-hitch" style="padding-block:12px"><span class="avatar lg">${avInner(S)}</span><span class="t"><b style="font-size:20px;font-weight:700">${esc(S.name || 'My hitch')}</b><small>${patText(p)} · ${p.alternating ? 'Days and nights' : shiftName(p.shiftType)} · ${fmt12(p.startTime)} to ${fmt12(p.endTime)}</small></span>${IC.chev}</button></div>
  <div class="group ic" style="margin-top:20px"><button class="row" data-act="certs-open"><span class="itile" style="--c:var(--home)">${IC.shield}</span><span class="t"><b>Certifications</b></span>${exp ? `<span class="chip c-warn">${exp} need${exp === 1 ? 's' : ''} attention</span>` : `<span class="v">${S.certs.length || 'None'}</span>`}${IC.chev}</button></div>
  <div class="sec-h">Appearance</div>
  <div class="group ic"><div class="row"><span class="itile" style="--c:var(--night)">${IC.paint}</span><span class="t"><b>Theme</b></span><span class="seg sm" data-change="theme">${['system', 'light', 'dark'].map(t => `<button data-act="seg" data-val="${t}" class="${S.theme === t ? 'on' : ''}">${t === 'system' ? 'Auto' : t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</span></div>
    <button class="row" data-act="colors-open"><span class="itile" style="--c:var(--tint)">${IC.star}</span><span class="t"><b>Colors and themes</b></span><span class="cdots">${COLOR_ROWS.map(([k]) => `<i style="background:${colorOf(k)}"></i>`).join('')}</span>${IC.chev}</button>
    <div class="row"><span class="itile" style="--c:var(--tint)">${IC.flag}</span><span class="t"><b>Holiday artwork</b><small>Faint illustrations on calendar days</small></span><button class="switch${S.showHolidays ? ' on' : ''}" role="switch" aria-checked="${!!S.showHolidays}" aria-label="Holiday artwork" data-act="switch" data-change="toggle-hol"></button></div></div>
  <div class="sec-h">Your data</div>
  <div class="group ic"><button class="row" data-act="export-ics"><span class="itile" style="--c:var(--day)">${IC.cal}</span><span class="t"><b>Export to a calendar app</b><small>A year of hitches as an .ics file</small></span>${IC.chev}</button>
    <button class="row" data-act="backup"><span class="itile" style="--c:var(--day)">${IC.down}</span><span class="t"><b>Back up</b><small>Save everything to a file</small></span>${IC.chev}</button>
    <button class="row" data-act="restore"><span class="itile" style="--c:var(--day)">${IC.up}</span><span class="t"><b>Restore from a backup</b></span>${IC.chev}</button></div>
  <p class="foot">Everything is stored on this device. Nothing is uploaded.</p>
  <div class="group" style="margin-top:24px"><button class="row red" data-act="reset">Erase all data</button></div>
  <p class="about">HitchCal 2.0<br>Built for rotation workers.</p>`;
}
function renderCerts() {
  const list = [...S.certs].sort((a, b) => (a.expiry < b.expiry ? -1 : 1));
  $('#certs-body').innerHTML = list.length ? `<div class="group ic">${list.map(c => { const st = certState(c); return `<button class="row" data-act="cert-edit" data-id="${c.id}"><span class="itile" style="--c:${st.n < 0 ? 'var(--danger)' : st.n <= 30 ? 'var(--tint)' : 'var(--home)'}">${IC.shield}</span><span class="t"><b>${esc(c.name)}</b><small>${st.n < 0 ? 'Expired' : 'Expires'} ${fmtFull(parseKey(c.expiry))}</small></span><span class="chip ${st.cls}">${esc(st.short)}</span>${IC.chev}</button>`; }).join('')}</div><p class="foot">Green has more than 30 days left. Amber expires within 30 days. Red is expired. Expiry dates are flagged on your calendar.</p>`
    : `<div class="empty"><div class="ei">${IC.shield}</div><h3>Never miss a renewal</h3><p>Track H2S, first aid and the rest. HitchCal warns you 60 days out and marks the expiry date on your calendar.</p><button class="btn primary" data-act="cert-add">Add a certification</button></div>`;
}
const CERT_LIB = ['H2S Alive', 'First Aid / CPR', 'SafeLand', 'PEC Basic', 'Well Control (IADC)', 'Fall Protection', 'Confined Space', 'Forklift', 'Rigging', 'HAZWOPER', 'TWIC'];
function openCert(id) {
  const c = S.certs.find(x => x.id === id);
  openSheet({
    title: c ? 'Edit certification' : 'Add certification', right: c ? 'Save' : 'Add',
    body: `<div class="group form" style="margin-top:6px"><label class="row"><span class="k">Name</span><input type="text" id="ce-name" placeholder="H2S Alive" maxlength="40" autocomplete="off" value="${esc(c ? c.name : '')}"></label>
      <label class="row"><span class="k">Expires</span><input type="date" id="ce-exp" value="${esc(c ? c.expiry : '')}"></label></div>
      <div class="sec-h">Common in the oilfield</div><div class="chips">${CERT_LIB.map(n => `<button type="button" class="pchip" data-act="cert-pick" style="font-size:14px">${esc(n)}</button>`).join('')}</div>
      ${c ? '<button class="btn del" data-act="cert-del">Delete certification</button>' : ''}`,
    onOpen(body) { body.dataset.id = id || ''; },
    onPrimary() {
      const name = $('#ce-name').value.trim(), expiry = $('#ce-exp').value;
      if (!name) return toast('Add a name');
      if (!validKey(expiry)) return toast('Pick the expiry date');
      if (c) Object.assign(c, { name, expiry }); else S.certs.push({ id: uid(), name, expiry });
      save(); closeSheet(); render(); renderCerts(); toast(c ? 'Certification saved' : 'Certification added');
    }
  });
}
function openHitch() {
  openSheet({
    title: 'My hitch', right: 'Save',
    body: `<div data-form="hf"><div class="group form" style="margin-top:6px"><label class="row"><span class="k">Name</span><input type="text" id="hf-name" placeholder="Your name" maxlength="30" autocomplete="name" value="${esc(S.name)}"></label></div>
      <div class="sec-h">Your icon</div>${avatarPicker('hf', S)}
      <div class="sec-h">Rotation</div>${rotationPart('hf', S.pattern)}
      <div class="sec-h">Shift</div>${shiftPart('hf', S.pattern)}
      <div class="sec-h">Hitch start</div>${datePart('hf', S.hitchStart)}
      <p class="foot">Use the first day of any hitch, past or upcoming. The rotation repeats from there in both directions.</p></div>`,
    onPrimary() {
      const d = readHitch('hf');
      if (!validKey(d.hitchStart)) return toast('Pick the first day of a hitch');
      S.name = d.name; S.hitchStart = d.hitchStart; S.pattern = d.pattern; Object.assign(S, readAv('hf'));
      save(); closeSheet(); render(); toast('Hitch updated');
    }
  });
}

/* ───────── Onboarding ───────── */
let obStep = 0, pendingImport = null;
function demoData() {
  const t = startOfDay(new Date()), d = DEF();
  return {
    ...d, setup: true, demo: true, name: 'Sample Hand', icon: 'hardhat', hitchStart: toKey(addDays(t, -8)),
    certs: [{ id: uid(), name: 'H2S Alive', expiry: toKey(addDays(t, 24)) }, { id: uid(), name: 'First Aid / CPR', expiry: toKey(addDays(t, 210)) }],
    rosters: [{ id: uid(), name: 'Sarah', icon: 'heart', photo: '', hitchStart: toKey(addDays(t, -3)), color: COLORS[0], pattern: { daysOn: 7, daysOff: 7 } }],
    notes: { [toKey(addDays(t, 3))]: { text: "Mom's birthday", emoji: '🎂' } },
    bonuses: [{ id: uid(), label: 'Safety bonus', amount: 500, date: toKey(addDays(t, -30)) }]
  };
}
function startOnboarding() {
  const base = S.setup && !S.demo ? S : DEF();
  const mark = $('.brand svg').outerHTML.replace('<svg', '<svg class="ob-mark"');
  $('#ob-steps').innerHTML = `
  <div class="ob-step" data-s="0">${mark}<h1>Know exactly when you're headed home.</h1><p class="lede">HitchCal tracks your rotation, counts down to days off and adds up every hitch's pay.</p>
    <div class="ob-eg"><div class="ob-eg-tag">Example</div><div class="hero day"><div class="lab">On hitch · Day shift</div><div class="ring"><svg viewBox="0 0 60 60"><circle class="tr" cx="30" cy="30" r="26"/><circle class="ar" cx="30" cy="30" r="26" stroke-dasharray="${RC}" stroke-dashoffset="${RC * 0.36}"/></svg><div class="mid"><b>9</b><small>of 14</small></div></div><div class="lead">Headed home in</div><div class="cd">${cdHTML((5 * 86400 + 5 * 3600 + 12 * 60 + 36) * 1000, 'full')}</div><div class="sub">Friday at 6:00 PM</div></div></div>
    <div class="ob-pts"><div><span class="itile" style="--c:var(--day)">${IC.cal}</span><span><b>Your whole year, mapped</b><span>Day shifts, night shifts and holidays at a glance.</span></span></div>
      <div><span class="itile" style="--c:var(--home)">${IC.dollar}</span><span><b>Pay that adds itself up</b><span>Day rate or hourly, per diem and mileage.</span></span></div>
      <div><span class="itile" style="--c:var(--night)">${IC.people}</span><span><b>Find the days you're both home</b><span>Follow a spouse's or coworker's rotation.</span></span></div></div></div>
  <div class="ob-step" data-s="1" data-form="ob" hidden><h1>What's your rotation?</h1><p class="lede">Pick a common one or set your own days on and off.</p>
    <div class="group form" style="margin-bottom:18px"><label class="row"><span class="k">Your name</span><input type="text" id="ob-name" placeholder="Optional" maxlength="30" autocomplete="name" value="${esc(base.name)}"></label></div>${rotationPart('ob', base.pattern)}
    <div class="sec-h">Pick an icon for yourself</div>${avatarPicker('ob', base)}<p class="foot">Choose one that fits your job, or add a photo. You can change it any time.</p></div>
  <div class="ob-step" data-s="2" data-form="ob" hidden><h1>Which shift do you work?</h1><p class="lede">Your countdown runs to the minute you clock out, so set the real times.</p>${shiftPart('ob', base.pattern)}</div>
  <div class="ob-step" data-s="3" data-form="ob" hidden><h1>When does a hitch start?</h1><p class="lede">Choose the first day of your current or next hitch.</p>${datePart('ob', validKey(base.hitchStart) ? base.hitchStart : todayKey())}
    <div class="sec-h">Your next five weeks</div><div class="prev" id="ob-prev"></div><p class="ob-sum" id="ob-sum"></p></div>`;
  obStep = 0; $('#onboard').hidden = false; obShow();
}
function obShow() {
  $$('.ob-step').forEach(s => { s.hidden = +s.dataset.s !== obStep; });
  $$('#ob-dots i').forEach((d, i) => d.classList.toggle('on', i === obStep - 1));
  $('#ob-dots').style.visibility = obStep ? 'visible' : 'hidden';
  const back = $('#ob-back'); back.textContent = obStep ? 'Back' : 'Cancel'; back.style.visibility = obStep || S.setup ? 'visible' : 'hidden';
  $('#ob-next').textContent = obStep === 0 ? 'Get started' : obStep === 3 ? 'Finish setup' : 'Continue';
  $('#ob-demo').hidden = obStep !== 0 || S.setup;
  $('.ob-body').scrollTop = 0;
  if (obStep === 3) obPreview();
}
function obPreview() {
  const d = readHitch('ob'); if (!validKey(d.hitchStart)) return;
  const sch = { hitchStart: d.hitchStart, pattern: d.pattern }, start = parseKey(d.hitchStart), first = addDays(start, -start.getDay());
  let h = 'SMTWTFS'.split('').map(c => `<small>${c}</small>`).join('');
  for (let i = 0; i < 35; i++) { const x = addDays(first, i), ci = cellInfo(toKey(x), sch); h += `<i class="${ci.type === 'on' ? (ci.shift === 'night' ? 'n' : 'd') : ''}${toKey(x) === d.hitchStart ? ' st' : ''}">${x.getDate()}</i>`; }
  $('#ob-prev').innerHTML = h;
  const p = d.pattern, b = hitchBounds(start, sch);
  $('#ob-sum').innerHTML = `<b>${plural(p.daysOn, 'day')} on, ${p.daysOff} off.</b> ${p.alternating ? 'Alternating days and nights' : shiftName(p.shiftType)}, ${fmt12(p.startTime)} to ${fmt12(p.endTime)}. This hitch runs ${fmtDay(b.begin)} to ${fmtDay(b.end)}.`;
}
function obFinish() {
  const d = readHitch('ob');
  if (!validKey(d.hitchStart)) return toast('Pick the first day of a hitch');
  if (S.demo || !S.setup) { const keep = S.theme, kc = S.colors; S = DEF(); S.theme = keep; S.colors = kc; }
  S.setup = true; S.demo = false; S.name = d.name; S.hitchStart = d.hitchStart; S.pattern = d.pattern; Object.assign(S, readAv('ob'));
  save(); $('#onboard').hidden = true; showTab('today');
  if (pendingImport) { const pre = pendingImport; pendingImport = null; setTimeout(() => openRoster(null, pre), 350); }
}

/* ───────── actions ───────── */
const A = {
  tab: el => showTab(el.dataset.tab),
  day: el => openDay(el.dataset.k),
  'cal-prev': () => calShift(-1),
  'cal-next': () => calShift(1),
  'cal-today': () => { const n = new Date(); const dir = cal.y * 12 + cal.m > n.getFullYear() * 12 + n.getMonth() ? 'r' : 'l'; const same = cal.y === n.getFullYear() && cal.m === n.getMonth(); cal.y = n.getFullYear(); cal.m = n.getMonth(); renderCal(same ? '' : dir); const sc = $('.cal-scroll'); if (sc) sc.scrollTop = 0; },
  'cal-mode': v => { cal.mode = v; if (v === 'list') { const n = new Date(); cal.y = n.getFullYear(); cal.m = n.getMonth(); } renderCal(); },
  'cal-month': el => { cal.m = +el.dataset.m; cal.mode = 'month'; renderCal(); },
  'hol-year': v => { holYear = +v; renderToday(); },
  'demo-setup': () => startOnboarding(),
  'edit-hitch': () => openHitch(),
  'pay-edit': () => openPayEdit(),
  'pay-type': v => { $('#pe-day').hidden = v === 'hourly'; $('#pe-hr').hidden = $('#pe-hr-note').hidden = v !== 'hourly'; },
  'hitch-miles': el => openMiles(el.dataset.k),
  'miles-reset': () => { delete S.hitchMiles[$('#sheet-body').dataset.k]; save(); closeSheet(); render(); toast('Back to your usual miles'); },
  'pay-travel': v => { $('#pe-trg').hidden = +v === 0; },
  av: el => { const pfx = el.parentElement.dataset.pfx, s = pick[pfx]; s.mode = el.dataset.v ? 'icon' : 'init'; if (el.dataset.v) s.icon = el.dataset.v; el.parentElement.innerHTML = avOpts(pfx); },
  'av-photo': el => { const pfx = el.parentElement.dataset.pfx, s = pick[pfx]; if (s.photo && s.mode !== 'photo') { s.mode = 'photo'; el.parentElement.innerHTML = avOpts(pfx); return; } photoTarget = pfx; $('#photo-file').click(); },
  'colors-open': () => openColors(),
  'theme-pick': el => { S.colors = { ...THEMES[+el.dataset.i][1] }; save(); applyColors(); render(); const b = $('#sheet-body'); b.innerHTML = colorsBody(); },
  'color-pick': el => setColor(el.dataset.k, el.dataset.c),
  'bonus-add': () => openBonus(null),
  'bonus-edit': el => openBonus(el.dataset.id),
  'bonus-del': () => { const id = $('#sheet-body').dataset.id; S.bonuses = S.bonuses.filter(b => b.id !== id); save(); closeSheet(); render(); toast('Bonus deleted'); },
  'crew-add': () => openRoster(null),
  'crew-edit': el => openRoster(el.dataset.id),
  'crew-del': () => { const id = $('#sheet-body').dataset.id, r = S.rosters.find(x => x.id === id); ask({ title: `Remove ${r ? r.name : 'this schedule'}?`, msg: 'Their line comes off your calendar.', ok: 'Remove', red: true, onOk() { S.rosters = S.rosters.filter(x => x.id !== id); save(); closeSheet(); render(); toast('Schedule removed'); } }); },
  share: () => shareSchedule(),
  'copy-link': () => copyText(makeShareLink(), 'Link copied'),
  'ts-copy': () => copyText($('#ts-text').value, 'Copied'),
  'certs-open': () => { if (tab !== 'more') showTab('more'); renderCerts(); const pg = $('#page-certs'); $('.scroll', pg).scrollTop = 0; pg.classList.add('open'); },
  'page-back': () => { $('#page-certs').classList.remove('open'); render(); },
  'cert-add': () => openCert(null),
  'cert-edit': el => openCert(el.dataset.id),
  'cert-pick': el => { $('#ce-name').value = el.textContent; },
  'cert-del': () => { const id = $('#sheet-body').dataset.id; S.certs = S.certs.filter(c => c.id !== id); save(); closeSheet(); render(); renderCerts(); toast('Certification deleted'); },
  'note-del': () => { delete S.notes[$('#sheet-body').dataset.k]; save(); closeSheet(); render(); toast('Note deleted'); },
  theme: v => { S.theme = v; save(); applyTheme(); },
  'toggle-hol': on => { S.showHolidays = on; save(); },
  'export-ics': () => deliverFile('hitchcal.ics', 'text/calendar', buildICS()),
  backup: () => deliverFile(`hitchcal-backup-${todayKey()}.json`, 'application/json', JSON.stringify(S, null, 2)),
  restore: () => $('#restore-file').click(),
  reset: () => ask({ title: 'Erase all HitchCal data?', msg: 'Your schedule, pay rates, notes, certifications and followed schedules are removed from this device. This cannot be undone.', ok: 'Erase everything', red: true, onOk() { const keep = S.theme; S = DEF(); S.theme = keep; save(); applyColors(); try { localStorage.removeItem('hitchcal_v1'); } catch (e) { /* ignore */ } startOnboarding(); } }),
  'sheet-close': () => closeSheet(),
  'sheet-primary': () => { if (sheetCb) sheetCb(); },
  'alert-cancel': () => closeAlert(),
  'alert-ok': () => { const cb = alertCb; closeAlert(); if (cb) cb(); },
  step: el => { const inp = $('input', el.parentElement); inp.value = clamp((parseInt(inp.value, 10) || 1) + +el.dataset.d, 1, 120); inp.dispatchEvent(new Event('input', { bubbles: true })); },
  seg: el => { const box = el.parentElement; $$('button', box).forEach(b => b.classList.toggle('on', b === el)); const fn = A[box.dataset.change]; if (fn) fn(el.dataset.val, box); },
  switch: el => { const on = !el.classList.contains('on'); el.classList.toggle('on', on); el.setAttribute('aria-checked', on); const fn = A[el.dataset.change]; if (fn) fn(on, el); formChanged(el); },
  preset: el => { const form = el.closest('[data-form]'); $('input[id$="-on"]', form).value = el.dataset.on; $('input[id$="-off"]', form).value = el.dataset.off; formChanged(el); },
  'shift-swap': (v, box) => { const form = box.closest('[data-form]'), st = $('input[id$="-st"]', form), et = $('input[id$="-et"]', form); const crosses = frac(et.value || '18:00') <= frac(st.value || '06:00'); if ((v === 'night') !== crosses) [st.value, et.value] = [et.value, st.value]; formChanged(box); },
  swatch: el => $$('.swatch', el.parentElement).forEach(s => s.classList.toggle('on', s === el)),
  emoji: el => { const was = el.classList.contains('on'); $$('.emo', el.parentElement).forEach(s => s.classList.remove('on')); if (!was) el.classList.add('on'); },
  'ob-next': () => { if (obStep === 3) return obFinish(); obStep++; obShow(); },
  'ob-back': () => { if (obStep === 0) { if (S.setup) $('#onboard').hidden = true; return; } obStep--; obShow(); },
  'ob-demo': () => { S = demoData(); save(); $('#onboard').hidden = true; showTab('today'); }
};
function formChanged(el) {
  const form = el.closest('[data-form]'); if (!form) return;
  syncChips(form);
  if (form.dataset.form === 'ob' && obStep === 3) obPreview();
}

/* ───────── wiring ───────── */
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el) return; const fn = A[el.dataset.act]; if (fn) fn(el, e); });
document.addEventListener('input', e => { if (e.target.dataset.colorK) return setColor(e.target.dataset.colorK, e.target.value, false); if (e.target.closest('[data-form]')) formChanged(e.target); });
document.addEventListener('change', e => { if (e.target.dataset.colorK) setColor(e.target.dataset.colorK, e.target.value); });
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (!$('#alert').hidden) closeAlert(); else if (!$('#sheet').hidden) closeSheet(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
[$('#app'), $('.views')].forEach(el => el.addEventListener('scroll', () => { el.scrollLeft = 0; el.scrollTop = 0; }));
$$('.scroll').forEach(sc => sc.addEventListener('scroll', () => sc.classList.toggle('scrolled', sc.scrollTop > 40), { passive: true }));

$('#restore-file').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => { try { const p = JSON.parse(rd.result); if (!p || !p.pattern || !validKey(p.hitchStart)) throw new Error('bad'); const keep = S.theme; S = normalize(p); S.setup = true; S.theme = p.theme || keep; save(); applyTheme(); applyColors(); showTab('today'); toast('Backup restored'); } catch (err) { toast("That file isn't a HitchCal backup"); } e.target.value = ''; };
  rd.readAsText(f);
});

/* photo upload: crop to a square, shrink to a small thumbnail and keep it on this device only */
$('#photo-file').addEventListener('change', e => {
  const f = e.target.files[0], pfx = photoTarget; e.target.value = '';
  if (!f || !pick[pfx]) return;
  const url = URL.createObjectURL(f), img = new Image();
  img.onload = () => {
    const n = 160, c = document.createElement('canvas'), side = Math.min(img.naturalWidth, img.naturalHeight);
    c.width = c.height = n;
    c.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, n, n);
    URL.revokeObjectURL(url);
    const data = okPhoto(c.toDataURL('image/jpeg', 0.82));
    if (!data) return toast("That photo couldn't be used");
    pick[pfx].photo = data; pick[pfx].mode = 'photo';
    const box = $('#' + pfx + '-av'); if (box) box.innerHTML = avOpts(pfx);
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast("That file isn't a photo"); };
  img.src = url;
});

/* swipe between months */
(() => {
  const main = $('#cal-main'); let sx = 0, sy = 0, live = false;
  main.addEventListener('touchstart', e => { if (cal.mode !== 'month' || e.touches.length !== 1) return; live = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  main.addEventListener('touchend', e => { if (!live) return; live = false; const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) calShift(dx < 0 ? 1 : -1); }, { passive: true });
})();

/* drag a sheet down to dismiss */
(() => {
  const card = $('#sheet-card'); let drag = null;
  const start = e => { if (window.innerWidth >= 700 || e.target.closest('button')) return; drag = { y: e.clientY, dy: 0 }; card.style.transition = 'none'; };
  [$('#sheet-grab'), $('.sheet-head')].forEach(z => z.addEventListener('pointerdown', start));
  window.addEventListener('pointermove', e => { if (!drag) return; drag.dy = Math.max(0, e.clientY - drag.y); card.style.transform = `translateY(${drag.dy}px)`; });
  const end = () => { if (!drag) return; const dy = drag.dy; drag = null; card.style.transition = ''; card.style.transform = ''; if (dy > 90) closeSheet(); };
  window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
})();

/* ───────── boot ───────── */
load(); applyTheme(); applyColors();
pendingImport = parseShare(location.search);
if (S.setup) { showTab('today'); if (pendingImport) { const pre = pendingImport; pendingImport = null; setTimeout(() => openRoster(null, pre), 400); } }
else startOnboarding();
setInterval(tick, 1000);
if (!EMBEDDED && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });

/* exposed for the schedule-math self-check only */
window.__hitchcal = { cellInfo, nowInfo, hitchBounds, transitions, holidays, dayType, parseShare, toKey };
})();

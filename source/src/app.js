(() => {
'use strict';

/* ───────── launch config: fill these in before release ───────── */
const CONFIG = {
  supportEmail: '',     // where Send feedback goes, e.g. help@yourdomain.com; empty = diagnostics are copied instead
  shareUrl: '',         // public link for Share HitchCal; empty = this page's address
  sentryLoader: '',     // Sentry > Project settings > Loader Script URL; empty = crash reporting off
  plausibleDomain: ''   // your site's domain in Plausible; empty = analytics off
};
const APP_VERSION = '2.1.0';
const WHATS_NEW = [
  ['Graphite look', 'A new icon and colors built around the brand. The old colors are still there as the Bright theme.'],
  ['Text size', 'Make every screen easier to read in Settings.'],
  ['Your calendar, your way', 'Start weeks on Monday, switch to 24-hour time, and pick kilometers or your currency.'],
  ['Help and feedback', 'Answers to common questions, plus a quick way to send feedback or report a problem.'],
  ['Privacy and terms', 'Plain-language privacy policy and terms of use in Settings.']
];

/* developer settings live apart from user data so backups never carry them */
const DEVK = 'hitchcal_dev', ERRK = 'hitchcal_errors', RealDate = Date;
let DEV = {}; try { DEV = JSON.parse(localStorage.getItem(DEVK) || '{}') || {}; } catch (e) { DEV = {}; }
if (!DEV.flags || typeof DEV.flags !== 'object') DEV.flags = {};
const saveDev = () => { try { localStorage.setItem(DEVK, JSON.stringify(DEV)); } catch (e) { /* storage unavailable */ } };
/* time travel: shifts the app's clock for testing; set from the developer menu */
if (+DEV.offset) {
  const off = +DEV.offset;
  class TravelDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + off); } static now() { return RealDate.now() + off; } }
  window.Date = TravelDate;
}
const isPremium = () => !!DEV.flags.premium; // premium preview until payments exist
/* local error log: the last 50 errors, shown in the developer menu and attached to feedback on request */
let ERRS = []; try { ERRS = JSON.parse(localStorage.getItem(ERRK) || '[]') || []; } catch (e) { ERRS = []; }
function logError(msg, where) {
  ERRS.push({ t: new RealDate().toISOString(), v: APP_VERSION, m: String(msg).slice(0, 300), w: String(where || '').slice(0, 160) });
  ERRS = ERRS.slice(-50);
  try { localStorage.setItem(ERRK, JSON.stringify(ERRS)); } catch (e) { /* storage unavailable */ }
}
window.addEventListener('error', e => logError(e.message || 'Error', e.filename ? `${String(e.filename).split('/').pop()}:${e.lineno}:${e.colno}` : ''));
window.addEventListener('unhandledrejection', e => logError('Unhandled promise: ' + ((e.reason && e.reason.message) || e.reason), ''));

/* ───────── helpers ───────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; };
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const clampInt = (v, a, b) => clamp(Math.round(num(v)) || a, a, b);
const pad = n => String(n).padStart(2, '0');
const CURRENCIES = [['USD', 'US dollar'], ['CAD', 'Canadian dollar'], ['AUD', 'Australian dollar'], ['GBP', 'British pound'], ['EUR', 'Euro'], ['NOK', 'Norwegian krone']];
const curFmt = dp => { try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: S.currency || 'USD', minimumFractionDigits: dp, maximumFractionDigits: dp }); } catch (e) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: dp, maximumFractionDigits: dp }); } };
const money = (n, dp = 0) => curFmt(dp).format(dp ? n : Math.round(n));
const curSym = () => (curFmt(0).formatToParts(0).find(p => p.type === 'currency') || { value: '$' }).value;
const symFor = c => { try { return (new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).formatToParts(0).find(p => p.type === 'currency') || { value: c }).value; } catch (e) { return c; } };
const DU = () => S.dist === 'km' ? { u: 'km', w: 'kilometers', W: 'Kilometers', one: 'kilometer' } : { u: 'mi', w: 'miles', W: 'Miles', one: 'mile' };
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
const fmt12 = t => { const [h, m] = String(t || '06:00').split(':').map(Number); if (S.clock24) return `${pad(h)}:${pad(m || 0)}`; return `${h % 12 || 12}${m ? ':' + pad(m) : ''} ${h < 12 ? 'AM' : 'PM'}`; };
const wsLead = d => (d.getDay() - (S.weekStart ? 1 : 0) + 7) % 7;
const dowLetters = () => S.weekStart ? 'MTWTFSS' : 'SMTWTFS';
const fmtClock = d => fmt12(pad(d.getHours()) + ':' + pad(d.getMinutes()));
const rel = d => { const n = daysBetween(new Date(), d); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n === -1 ? 'Yesterday' : n > 0 ? `In ${n} days` : `${-n} days ago`; };
const initials = n => (String(n || '').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('') || 'H').toUpperCase();
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

const svg = (p, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${p}</svg>`;
const IC = {
  textsize: svg('<path d="M4 18L9 6l5 12M5.6 14h6.8M15 18l3-7 3 7M15.9 16h4.2"/>'),
  motion: svg('<path d="M3 12h3l2.5-6 4 12 3-9 1.5 3H21"/>'),
  vibrate: svg('<rect x="8" y="3" width="8" height="18" rx="2"/><path d="M4 8v8M20 8v8"/>'),
  week: svg('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M7 14h2"/>'),
  clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  ruler: svg('<path d="M3 16.5L16.5 3 21 7.5 7.5 21z"/><path d="M7 12.5l1.5 1.5M9.5 10l2 2M12 7.5l1.5 1.5M14.5 5l2 2"/>'),
  coin: svg('<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.5-.9-1.5-1.4-2.6-1.4-1.6 0-2.7.9-2.7 2.1 0 2.9 5.5 1.6 5.5 4.3 0 1.3-1.2 2.2-2.8 2.2-1.2 0-2.3-.6-2.8-1.6M12 6v1.8M12 16.4V18"/>'),
  sparkle: svg('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>'),
  help: svg('<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.1-2.4 3.6M12 17.2h.01"/>'),
  mail: svg('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>'),
  lock: svg('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  doc: svg('<path d="M7 3h7l5 5v11.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19.5V4.5A1.5 1.5 0 0 1 7 3z"/><path d="M14 3v5h5M9 13h6M9 16.5h6"/>'),
  wrench: svg('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3.5 17.2a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 5.1-5.4l-2.5 2.5-2.2-.5-.5-2.2z"/>'),
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
/*__AVATARS__*/
const AV = {
  shades: ["Cool hand"],
  wave: ["Hold up"],
  driller: ["Driller"],
  chains: ["Chain hand"],
  goggles: ["Mud engineer"],
  worm: ["Worm"],
  thumbs: ["Green hand"],
  oldhand: ["Old hand"],
  brow: ["Skeptic"],
  scratch: ["Head scratcher"],
  stern: ["No nonsense"],
  sleepy: ["Night shift"],
  sour: ["Sour"],
  sideeye: ["Side-eye"],
  huh: ["Huh?"],
  tough: ["Tough"],
  wink: ["Winker"],
  whistle: ["Whistler"],
  laugh: ["Cutup"],
  smirk: ["Smirk"],
  fuse: ["Short fuse"],
  meh: ["Meh"],
  holdin: ["Holding it in"],
  backcap: ["Backwards cap"],
  company: ["Company man"],
  muscle: ["Muscle"],
  coldone: ["Cold one"],
  engineer: ["Engineer"],
  bucket: ["Bucket hat"],
  operator: ["Operator"],
  mechanic: ["Mechanic"],
  golf: ["Golfer"],
  bbq: ["Grill master"],
  her: ["Her"],
  her2: ["Her, cap"],
  campfire: ["Campfire"],
  camping: ["Camping"],
  buddies: ["Buddies"],
  family: ["Family"],
  hiking: ["Hiking"],
  gym: ["Gym"]
};
const AV_GROUPS = [
  ["On the rig", ["shades", "wave", "driller", "chains", "goggles", "worm", "thumbs", "oldhand", "brow", "scratch", "stern", "sleepy", "sour", "sideeye", "huh", "tough", "wink", "whistle", "laugh"]],
  ["Hat off", ["smirk", "fuse", "meh", "holdin"]],
  ["Trades and hands", ["backcap", "company", "muscle", "coldone", "engineer", "bucket", "operator", "mechanic"]],
  ["Off the clock", ["golf", "bbq", "her", "her2", "campfire", "camping", "buddies", "family", "hiking", "gym"]]
];
const avSvg = k => `<img class="avi" src="${AVIMG[k]}" alt="" loading="lazy" decoding="async">`;
const PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const okPhoto = v => typeof v === 'string' && v.length < 200000 && PHOTO_RE.test(v) ? v : '';
const okIcon = v => (typeof v === 'string' && Object.prototype.hasOwnProperty.call(AV, v)) ? v : '';
const avInner = o => o.photo ? `<img src="${o.photo}" alt="">` : o.icon && AV[o.icon] ? avSvg(o.icon) : esc(initials(o.name));
const pick = {};
let photoTarget = '';
function avOpts(pfx) {
  const s = pick[pfx], btn = k => `<button type="button" class="avopt${s.mode === 'icon' && s.icon === k ? ' on' : ''}" data-act="av" data-v="${k}" aria-label="${AV[k][0]}" title="${AV[k][0]}">${avSvg(k)}</button>`;
  return AV_GROUPS.map(([name, keys]) => `<div class="avgrp">${name}</div>` + keys.map(btn).join('')).join('')
    + `<div class="avgrp">Or</div><button type="button" class="avopt${s.mode === 'init' ? ' on' : ''}" data-act="av" data-v="" aria-label="Use initials">Aa</button>`
    + `<button type="button" class="avopt${s.mode === 'photo' ? ' on' : ''}" data-act="av-photo" aria-label="Upload a photo" title="Upload a photo">${s.photo ? `<img src="${s.photo}" alt="">` : IC.camera}</button>`
    + `<div class="avgrp avcap">${s.mode === 'icon' && AV[s.icon] ? esc(AV[s.icon][0]) : s.mode === 'photo' ? 'Your photo' : 'Your initials'}</div>`;
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
  earnings: { payType: 'dayrate', dayRate: 0, hourlyRate: 0, hoursPerShift: 12, otAfter: 8, perDiem: 0, mileageRate: 0, roundTrip: 0, travelDays: 0, travelRate: 0 },
  bonuses: [], certs: [], notes: {}, rosters: [], hitchMiles: {}, colors: {}, theme: 'system', showHolidays: true,
  textSize: 'm', weekStart: 0, clock24: false, dist: 'mi', currency: 'USD', reduceMotion: false, haptics: true, seenVersion: ''
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
  if (!['m', 'l', 'xl'].includes(s.textSize)) s.textSize = 'm';
  s.weekStart = s.weekStart ? 1 : 0; s.clock24 = !!s.clock24; s.reduceMotion = !!s.reduceMotion; s.haptics = s.haptics !== false;
  if (s.dist !== 'km') s.dist = 'mi';
  if (!CURRENCIES.some(([c]) => c === s.currency)) s.currency = 'USD';
  s.seenVersion = String(s.seenVersion || '');
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
const HOL_SHORT = { "New Year's Day": 'New Yr', 'MLK Day': 'MLK', 'Presidents Day': 'Pres.', 'Memorial Day': 'Memor.', 'Juneteenth': 'Juneth.', 'Independence Day': 'July 4', 'Labor Day': 'Labor', 'Columbus Day': 'Columb.', 'Veterans Day': 'Vets', 'Thanksgiving': 'Thanks', 'Christmas Day': 'Xmas' };

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
const hasRates = () => dailyPay() > 0 || num(S.earnings.perDiem) > 0;
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
  return btoa(unescape(encodeURIComponent(JSON.stringify(d)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const shareCode = makeShareLink;
const crewLink = () => SHARE_BASE + '?s=' + shareCode();
const familyLink = () => SHARE_BASE + '?f=' + shareCode();
function parseFamily(q) { const m = String(q || '').match(/[?&]f=([A-Za-z0-9_\-+/=%]+)/); return m ? parseShare('?s=' + m[1]) : null; }
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

/* ───────── printable year (PDF) ───────── */
function loadPdfLib() {
  return new Promise((res, rej) => {
    if (window.jspdf) return res(window.jspdf.jsPDF);
    const s = document.createElement('script'); s.src = 'jspdf.umd.min.js';
    s.onload = () => (window.jspdf ? res(window.jspdf.jsPDF) : rej(new Error('missing'))); s.onerror = rej;
    document.head.appendChild(s);
  });
}
const tintRgb = (hex, a) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * a + 255 * (1 - a))); };
function buildPdf(J, year) {
  const doc = new J({ unit: 'pt', format: 'letter' }), sch = me(), p = S.pattern, W = 612, M = 36;
  const cDay = colorOf('day'), cNight = colorOf('night'), cHome = colorOf('home');
  const fill = (hex, a) => doc.setFillColor(...tintRgb(hex, a));
  const ink = (r, g = r, b = r) => doc.setTextColor(r, g, b);
  const font = (size, bold) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); };
  const first = (S.name || '').trim().split(/\s+/)[0];
  let nights = false;
  for (let d = new Date(year, 0, 1); d.getFullYear() === year && !nights; d = addDays(d, 1)) { const ci = cellInfo(toKey(d), sch); nights = ci.type === 'on' && ci.shift === 'night'; }
  font(22, true); ink(17); doc.text(`${S.name ? S.name.trim() + "'s" : 'My'} ${year} work schedule`, M, 56);
  font(11); ink(90); doc.text(`${plural(p.daysOn, 'day')} away at work, then ${plural(p.daysOff, 'day')} home. The pattern repeats all year.`, M, 74);
  let lx = M; const ly = 96;
  const leg = (label, hex, ring) => {
    if (ring) { doc.setDrawColor(209, 42, 32); doc.setLineWidth(1.2); doc.roundedRect(lx, ly - 8.5, 10, 10, 2, 2, 'S'); }
    else if (hex) { fill(hex, .4); doc.roundedRect(lx, ly - 8.5, 10, 10, 2, 2, 'F'); }
    else { doc.setDrawColor(185, 185, 185); doc.setLineWidth(.7); doc.roundedRect(lx, ly - 8.5, 10, 10, 2, 2, 'S'); }
    font(9.5); ink(60); doc.text(label, lx + 14, ly); lx += 14 + doc.getTextWidth(label) + 20;
  };
  leg(nights ? 'At work, day shift' : 'Away at work', cDay); if (nights) leg('At work, night shift', cNight); leg('Home'); leg('Holiday', null, true);
  const cols = 3, gap = 18, mw = (W - 2 * M - gap * (cols - 1)) / cols, cw = mw / 7, ch = 14.5, top = 124, mh = 126;
  const hol = {}; holidays(year).forEach(h => { hol[toKey(h.date)] = h.name; });
  for (let m = 0; m < 12; m++) {
    const x0 = M + (m % cols) * (mw + gap), y0 = top + Math.floor(m / cols) * mh;
    font(11, true); ink(17); doc.text(MONTHS[m], x0 + 2, y0);
    font(6.5); ink(130); dowLetters().split('').forEach((c, i) => doc.text(c, x0 + i * cw + cw / 2, y0 + 11, { align: 'center' }));
    const lead = wsLead(new Date(year, m, 1)), dim = new Date(year, m + 1, 0).getDate();
    for (let d = 1; d <= dim; d++) {
      const idx = lead + d - 1, cx = x0 + (idx % 7) * cw, cy = y0 + 14 + Math.floor(idx / 7) * ch, k = `${year}-${pad(m + 1)}-${pad(d)}`, ci = cellInfo(k, sch), on = ci.type === 'on';
      if (on) { fill(ci.shift === 'night' ? cNight : cDay, .4); doc.roundedRect(cx + .8, cy + .8, cw - 1.600, ch - 1.600, 2, 2, 'F'); }
      if (hol[k]) { doc.setDrawColor(209, 42, 32); doc.setLineWidth(1.100); doc.roundedRect(cx + .8, cy + .8, cw - 1.600, ch - 1.600, 2, 2, 'S'); }
      font(7.5, on || !!hol[k]); ink(on ? 20 : 95); doc.text(String(d), cx + cw / 2, cy + ch / 2 + 2.600, { align: 'center' });
    }
  }
  const hy = 640, hs = holidays(year), half = Math.ceil(hs.length / 2), colW = (W - 2 * M) / 2;
  font(13, true); ink(17); doc.text(`${year} holidays`, M, hy);
  hs.forEach((h, i) => {
    const x = M + (i < half ? 0 : colW), y = hy + 20 + (i < half ? i : i - half) * 16, off = dayType(toKey(h.date), sch) === 'off';
    fill(off ? cHome : cDay, off ? .85 : .4); doc.circle(x + 4, y - 3.500, 3.500, 'F');
    font(10, true); ink(17); doc.text(h.name, x + 13, y); const w = doc.getTextWidth(h.name);
    font(10); ink(95); doc.text(`${DS[h.date.getDay()]}, ${MS[h.date.getMonth()]} ${h.date.getDate()}`, x + 13 + w + 6, y);
    font(10, true); if (off) ink(27, 127, 55); else ink(95); doc.text(off ? 'Home' : 'At work', x + colW - 16, y, { align: 'right' });
  });
  font(8); ink(140); doc.text(`Made with HitchCal on ${fmtFull(new Date())}. Schedules can change, so check with ${first || 'them'} before making plans.`, M, 766);
  return doc;
}
function openPdfSheet() {
  const y = new Date().getFullYear();
  openSheet({
    title: 'Year calendar PDF', left: 'Close',
    body: `<p class="foot" style="margin:6px 4px 14px;font-size:calc(15px*var(--ts))">A one-page calendar of your year with every holiday marked as home or at work. Written in plain words, so family can read it without the app.</p>
      <div class="seg" id="pdf-year"><button type="button" data-act="seg" data-val="${y}" class="on">${y}</button><button type="button" data-act="seg" data-val="${y + 1}">${y + 1}</button></div>
      <button class="btn primary" data-act="pdf-make" style="margin-top:14px">${IC.down}Create PDF</button>`
  });
}
async function exportPdf() {
  const year = +segVal($('#pdf-year')) || new Date().getFullYear(), name = `hitchcal-${year}.pdf`;
  if (EMBEDDED) return toast('Saving files is switched off in this preview. It works on the live site.');
  let J; try { J = await loadPdfLib(); } catch (e) { return toast("Couldn't load the PDF tool. Check your connection and try again."); }
  const blob = buildPdf(J, year).output('blob');
  try {
    const file = new File([blob], name, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: `${year} work schedule` }); closeSheet(); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  closeSheet(); toast(`Saved ${name}`);
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
function applyPrefs() {
  const r = document.documentElement;
  r.dataset.ts = S.textSize || 'm';
  if (S.reduceMotion) r.setAttribute('data-rm', ''); else r.removeAttribute('data-rm');
  if (DEV.flags.outline) r.setAttribute('data-outline', ''); else r.removeAttribute('data-outline');
  const dow = $('#cal-dow'); if (dow) dow.innerHTML = dowLetters().split('').map(c => `<span>${c}</span>`).join('');
}
const buzz = () => { if (S.haptics !== false && navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { /* not supported */ } } };
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
const DEFC = { day: '#5287B8', night: '#7B67AD', home: '#5E9470', accent: '#6C7077', hol: '#C2A06A' };
const COLOR_ROWS = [['day', 'Day shift'], ['night', 'Night shift'], ['home', 'Days off'], ['accent', 'Buttons and highlights'], ['hol', 'Holiday labels']];
const SWATCH = ['#6C7077', '#B9BEC6', '#5287B8', '#7B67AD', '#5E9470', '#7E7C68', '#C2A06A', '#8E6A5A', '#007AFF', '#34C759', '#FF9F0A', '#FF3B30'];
const THEMES = [
  ['Graphite', {}],
  ['Bright', { day: '#007AFF', night: '#5856D6', home: '#34C759', accent: '#5B8DB8', hol: '#64D2FF' }],
  ['Sunrise', { day: '#FF7A3D', night: '#4B4FC4', home: '#2E9E68', accent: '#FF7A3D' }],
  ['Pine', { day: '#0E9F8E', night: '#3F5BA9', home: '#84B816', accent: '#0E9F8E' }],
  ['Slate', { day: '#5B7FA6', night: '#7A6FB0', home: '#6FA58A', accent: '#5B7FA6' }],
  ['Rose', { day: '#E8508C', night: '#8A4FD6', home: '#22B8A6', accent: '#E8508C' }],
  ['Crude', { day: '#C98A2B', night: '#6B7280', home: '#3F9B6C', accent: '#C98A2B' }],
  ['Brass', { accent: '#B8864A' }],
  ['Signal', { accent: '#D2543C' }]
];
const colorOf = k => S.colors[k] || DEFC[k];
function colorTokens(c, dark) {
  const mix = (x, pct, w) => `color-mix(in srgb,${x} ${pct}%,${w})`;
  let o = '';
  ['day', 'night', 'home'].forEach(n => {
    const x = c[n]; if (!x) return;
    o += `--${n}:${x};--${n}-bg:${mix(x, dark ? 30 : 15, 'transparent')};--${n}-cell:${mix(x, dark ? 55 : 34, 'transparent')};--${n}-text:${dark ? mix(x, 52, '#fff') : mix(x, 66, '#000')};--hero-${n}-a:${mix(x, 88, '#000')};--hero-${n}-b:${mix(x, 62, '#000')};`;
  });
  const hc = c.hol || DEFC.hol; o += `--hol:${hc};--hol-ink:${inkFor(hc)};`;
  if (c.accent) o += `--tint:${c.accent};--on-tint:${inkFor(c.accent)};--tint-soft:${mix(c.accent, dark ? 22 : 17, 'transparent')};--tint-text:${dark ? mix(c.accent, 62, '#fff') : mix(c.accent, 60, '#000')};`;
  return o;
}
function applyColors() {
  let el = $('#user-colors');
  if (!el) { el = document.createElement('style'); el.id = 'user-colors'; document.head.appendChild(el); }
  const c = { day: colorOf('day'), night: colorOf('night'), home: colorOf('home'), hol: colorOf('hol'), accent: S.colors.accent };
  el.textContent = `:root{${colorTokens(c, false)}}@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${colorTokens(c, true)}}}:root[data-theme="dark"]{${colorTokens(c, true)}}`;
}
function colorsBody() {
  const cur = JSON.stringify(COLOR_ROWS.map(([k]) => colorOf(k).toUpperCase()));
  const themes = THEMES.map(([name, t], i) => { const full = COLOR_ROWS.map(([k]) => (t[k] || DEFC[k]).toUpperCase()); return `<button type="button" class="theme-btn${JSON.stringify(full) === cur ? ' on' : ''}" data-act="theme-pick" data-i="${i}"><b>${name}</b><span>${full.map(x => `<i style="background:${x}"></i>`).join('')}</span></button>`; }).join('');
  const rows = COLOR_ROWS.map(([k, label]) => { const now = colorOf(k).toUpperCase(); return `<div class="crow"><div class="crow-h"><span>${label}</span><i class="cnow" style="background:${now}"></i></div><div class="cline"><button type="button" class="cs custom${SWATCH.includes(now) ? '' : ' on'}" style="--rc:${now}" data-act="picker-open" data-k="${k}" aria-label="Custom ${label} color"></button><span class="cdiv"></span>${SWATCH.map(x => `<button type="button" class="cs${now === x ? ' on' : ''}" data-act="color-pick" data-k="${k}" data-c="${x}" style="--rc:${x}" aria-label="${label} ${x}"></button>`).join('')}</div></div>`; }).join('');
  return `<div class="sec-h">Theme</div><div class="themes">${themes}</div><div class="sec-h">Colors</div><div class="group">${rows}</div><p class="foot">Tap a color to apply it. The rainbow circle opens the full picker with a live preview.</p>`;
}
function setColor(k, v, redraw = true) {
  if (!DEFC[k] || !HEX.test(v)) return;
  if (v.toUpperCase() === DEFC[k]) delete S.colors[k]; else S.colors[k] = v.toUpperCase();
  save(); applyColors(); render();
  if (redraw) { const b = $('#sheet-body'), y = b.scrollTop; b.innerHTML = colorsBody(); b.scrollTop = y; }
}
const openColors = () => openSheet({ title: 'Colors and themes', left: 'Done', body: colorsBody() });

/* ───────── color picker with live preview ───────── */
let PK = null; // { k, h, s, v } while the picker is open
function hsvToHex(h, s, v) {
  s /= 100; v /= 100;
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  const to = n => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return ('#' + to(r) + to(g) + to(b)).toUpperCase();
}
function hexToHsv(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) { if (max === r) h = 60 * (((g - b) / d) % 6); else if (max === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); }
  if (h < 0) h += 360;
  return { h: Math.round(h) % 360, s: max ? Math.round(d / max * 100) : 0, v: Math.round(max * 100) };
}
const isDarkNow = () => { const t = document.documentElement.dataset.theme; return t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches); };
function previewHTML(k) {
  const cell = (n, on, extra = '') => `<span class="pv-cell" style="${on ? `background:var(--${k === 'hol' ? 'fill' : k}-cell)` : 'background:var(--fill)'}"><b style="color:${on ? `var(--${k}-text)` : 'var(--label-3)'}">${n}</b>${extra}</span>`;
  const days = [1, 2, 3, 4, 5, 6, 7];
  if (k === 'day' || k === 'night') {
    return `<div class="pv-row">${days.map(n => cell(n, n <= 5, n <= 5 ? `<i class="pv-bar" style="background:var(--${k})"></i>` : '')).join('')}</div>
      <div class="pv-note" style="color:var(--${k}-text)">${k === 'day' ? 'Day shift' : 'Night shift'} · on hitch</div>`;
  }
  if (k === 'home') {
    return `<div class="pv-row">${days.map(n => cell(n, n > 5)).join('')}</div>
      <div class="pv-hero" style="background:linear-gradient(135deg,var(--hero-home-a),var(--hero-home-b))">Days off · Day 4 of 14</div>`;
  }
  if (k === 'accent') {
    return `<div class="pv-row">${days.map(n => `<span class="pv-cell" style="background:var(--fill)"><b style="${n === 4 ? 'display:none' : ''}">${n}</b>${n === 4 ? '<span class="pv-today" style="background:var(--tint);color:var(--on-tint)">4</span>' : ''}</span>`).join('')}</div>
      <div class="pv-btns"><span class="pv-btn" style="background:var(--tint);color:var(--on-tint)">Save</span><span class="pv-btn" style="background:var(--tint-soft);color:var(--tint-text)">Edit rates</span></div>`;
  }
  return `<div class="pv-row">${days.map(n => `<span class="pv-cell" style="background:var(--fill)"><b>${n}</b>${n === 6 ? '<span class="pv-hol" style="background:var(--hol);color:var(--hol-ink)">Thanks</span>' : ''}</span>`).join('')}</div>`;
}
function pickerBody() {
  const label = (COLOR_ROWS.find(([k]) => k === PK.k) || [PK.k, PK.k])[1];
  return `<div class="pk">
    <div class="sec-h" style="padding-top:0">${label}</div>
    <div class="pk-prev" id="pk-prev">${previewHTML(PK.k)}</div>
    <div class="pk-hex"><span class="pk-sw" id="pk-sw"></span><b id="pk-hex"></b></div>
    <div class="pk-sl"><span>Hue</span><input type="range" class="pk-r hue" min="0" max="359" step="1" value="${PK.h}" data-pk="h"></div>
    <div class="pk-sl"><span>Saturation</span><input type="range" class="pk-r" id="pk-s" min="0" max="100" step="1" value="${PK.s}" data-pk="s"></div>
    <div class="pk-sl"><span>Brightness</span><input type="range" class="pk-r" id="pk-v" min="0" max="100" step="1" value="${PK.v}" data-pk="v"></div>
    <div class="pk-btns"><button type="button" class="btn gray" data-act="picker-back">Back</button><button type="button" class="btn primary" data-act="picker-apply">Use this color</button></div>
    <button type="button" class="txt-btn" data-act="picker-default" style="width:100%;margin-top:6px">Reset to default</button>
  </div>`;
}
function updatePicker() {
  if (!PK) return;
  const hex = hsvToHex(PK.h, PK.s, PK.v);
  $('#pk-prev').setAttribute('style', colorTokens({ ...S.colors, [PK.k]: hex }, isDarkNow()));
  $('#pk-hex').textContent = hex;
  $('#pk-sw').style.background = hex;
  $('#pk-s').style.background = `linear-gradient(to right, ${hsvToHex(PK.h, 0, PK.v)}, ${hsvToHex(PK.h, 100, PK.v)})`;
  $('#pk-v').style.background = `linear-gradient(to right, #000, ${hsvToHex(PK.h, PK.s, 100)})`;
}
function openPicker(k) { PK = { k, ...hexToHsv(colorOf(k)) }; $('#sheet-body').innerHTML = pickerBody(); updatePicker(); }
document.addEventListener('input', e => { const t = e.target; if (PK && t.dataset && t.dataset.pk) { PK[t.dataset.pk] = +t.value; updatePicker(); } });

/* ───────── navigation ───────── */
let tab = 'cal';
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
  if (FAM) { if (!document.hidden) famTick(); return; }
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
  const hk = toKey(on ? info.cs : info.until), full = fullPay(hk, p.daysOn), got = earnedPay(hk, on ? info.dayNum : 0, p.daysOn), mi = milesFor(hk);
  const left = Math.max(info.total - info.dayNum, 0);
  let h = `<div class="eyebrow">${fmtLong(now)}</div><h1 class="lt">Insights</h1>`;
  if (S.demo) h += `<button class="banner" data-act="demo-setup"><span>You're looking at a sample schedule.</span><b>Set up yours</b>${IC.chev}</button>`;
  h += `<div class="hero ${cls}">
    <div class="lab">${on ? `On hitch · ${shiftName(info.shift)}` : 'Days off'}</div>
    <div class="ring" role="img" aria-label="Day ${info.dayNum} of ${info.total}"><svg viewBox="0 0 60 60"><circle class="tr" cx="30" cy="30" r="26"/><circle class="ar" id="ring-arc" cx="30" cy="30" r="26" stroke-dasharray="${RC}" stroke-dashoffset="${RC * (1 - info.pct)}"/></svg><div class="mid"><b>${info.dayNum}</b><small>of ${info.total}</small></div></div>
    <div class="lead">${on ? 'Headed home in' : 'Back on hitch in'}</div>
    <div class="cd" data-cd="full">${cdHTML(info.ms, 'full')}</div>
    <div class="sub">${fmtDay(info.until)} at ${fmtClock(info.until)}</div>
  </div>`;

  const items = [];
  transitions(sch, 3, now).forEach(t => items.push({
    date: t.date, c: t.type === 'on' ? (t.shift === 'night' ? 'var(--night)' : 'var(--day)') : 'var(--home)',
    ic: t.type === 'on' ? (t.shift === 'night' ? IC.moon : IC.sun) : IC.house,
    title: t.type === 'on' ? 'Back on hitch' : 'Days off start', sub: `${fmtDay(t.date)} at ${fmtClock(t.date)}`, tag: rel(t.date), k: toKey(t.date)
  }));
  S.certs.forEach(c => { const st = certState(c); if (st.n <= 60) items.push({ date: parseKey(c.expiry), c: st.n <= 30 ? 'var(--danger)' : 'var(--tint)', ic: IC.shield, title: c.name, sub: st.txt, chip: st.n <= 30 ? st.cls : '', tag: st.n < 0 ? 'Expired' : fmtMD(parseKey(c.expiry)), act: 'certs-open' }); });
  [now.getFullYear(), now.getFullYear() + 1].forEach(y => holidays(y).forEach(hd => {
    const n = daysBetween(today, hd.date);
    if (n >= 0 && n <= 30) { const off = dayType(toKey(hd.date), sch) === 'off'; items.push({ date: hd.date, c: 'var(--tint)', ic: IC.flag, title: hd.name, sub: `${fmtDay(hd.date)} · ${off ? "You're off" : "You're on hitch"}`, tag: rel(hd.date), k: toKey(hd.date) }); }
  }));
  Object.keys(S.notes).forEach(k => { const n = daysBetween(today, parseKey(k)); if (n >= 0 && n <= 30) { const nt = S.notes[k]; items.push({ date: parseKey(k), emoji: nt.emoji || '📝', title: nt.text || 'Note', sub: fmtDay(parseKey(k)), tag: rel(parseKey(k)), k }); } });
  items.sort((a, b) => a.date - b.date);
  h += `<div class="sec-title">Coming up</div>`;
  h += items.length ? `<div class="group ic">${items.slice(0, 3).map(it => `<button class="row" data-act="${it.act || 'day'}" ${it.k ? `data-k="${it.k}"` : ''}>
    ${it.emoji ? `<span class="itile e">${esc(it.emoji)}</span>` : `<span class="itile" style="--c:${it.c}">${it.ic}</span>`}
    <span class="t"><b>${esc(it.title)}</b><small>${esc(it.sub)}</small></span>${it.chip ? `<span class="chip ${it.chip}">${esc(it.tag)}</span>` : `<span class="v" style="font-size:calc(15px*var(--ts))">${esc(it.tag)}</span>`}</button>`).join('')}</div>`
    : '<p class="foot">Nothing due in the next 30 days.</p>';
  const y0 = now.getFullYear();
  if (holYear !== y0 && holYear !== y0 + 1) holYear = y0;
  const hs = holidays(holYear), offN = hs.filter(x => dayType(toKey(x.date), sch) === 'off').length;
  h += `<div class="sec-title">Holidays<span class="seg sm" data-change="hol-year"><button data-act="seg" data-val="${y0}" class="${holYear === y0 ? 'on' : ''}">${y0}</button><button data-act="seg" data-val="${y0 + 1}" class="${holYear === y0 + 1 ? 'on' : ''}">${y0 + 1}</button></span></div>
    <p class="foot" style="margin:-4px 0 10px;padding:0">Home for ${offN} of ${hs.length} federal holidays.</p>
    <div class="hol-grid">${hs.map(x => { const off = dayType(toKey(x.date), sch) === 'off'; return `<button class="hol${off ? ' off' : ''}" data-act="day" data-k="${toKey(x.date)}"><b>${esc(x.name)}</b><small>${fmtMD(x.date)} · ${off ? 'Off' : 'On hitch'}</small></button>`; }).join('')}</div>`;
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
  const sch = me(), first = new Date(cal.y, cal.m, 1), lead = wsLead(first), dim = new Date(cal.y, cal.m + 1, 0).getDate();
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
    h += `<button class="${cls.join(' ')}" data-act="day" data-k="${k}" style="${style}" aria-label="${esc(label)}"><span class="bgl"></span><span class="dn">${d.getDate()}</span>${hol ? `<span class="hl">${esc(HOL_SHORT[hol] || hol)}</span>` : ''}${note ? (note.emoji ? `<span class="em">${esc(note.emoji)}</span>` : '<span class="nd"></span>') : ''}${certDays.has(k) ? `<span class="ce">${IC.alert}</span>` : ''}${bars}</button>`;
  }
  return h;
}
function miniMonth(y, m) {
  const sch = me(), first = new Date(y, m, 1), dim = new Date(y, m + 1, 0).getDate(), tk = todayKey(), n = new Date();
  let g = '<i></i>'.repeat(wsLead(first));
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
  const hol = holidayOn(k); if (hol) rows.push(`<div class="row"><span class="itile" style="--c:var(--hol);color:var(--hol-ink)">${IC.flag}</span><span class="t"><b>${esc(hol)}</b><small>Federal holiday</small></span></div>`);
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
  const yp = yearPay(yr), rate = e.payType === 'hourly' ? `${money(num(e.hourlyRate), 2)}/hr × ${num(e.hoursPerShift)} hrs` : `${money(num(e.dayRate))}/day`;
  let h = `<div class="eyebrow">${on ? `Day ${info.dayNum} of ${info.total}` : `Next hitch starts ${fmtMD(info.until)}`}</div><h1 class="lt">Pay</h1>
  ${hasRates() ? '' : `<button class="banner" data-act="pay-edit"><span>Your pay rates aren't set yet, so everything shows ${money(0)}.</span><b>Add rates</b>${IC.chev}</button>`}
  <div class="pcard"><div class="eyebrow">${on ? 'Earned this hitch' : 'Next hitch estimate'}</div><div class="big">${money(show.total)}</div>
    ${on ? `<div class="track"><i style="width:${Math.round(clamp(got.total / (full.total || 1)) * 100)}%"></i></div><div class="cap"><span>${plural(worked, 'day')} worked</span><span>${money(full.total)} at hitch end</span></div>` : `<div class="cap" style="margin-top:6px"><span>${plural(p.daysOn, 'day')} · ${esc(rate)}</span></div>`}
  </div>
  <div class="group" style="margin-top:10px">
    <div class="row"><span class="k">Base pay <span class="mut">· ${plural(days, 'day')} × ${money(dailyPay())}</span></span><span class="v">${money(show.base)}</span></div>
    <div class="row"><span class="k">Per diem <span class="mut">· ${money(num(e.perDiem))}/day</span></span><span class="v">${money(show.diem)}</span></div>
    ${tN ? `<div class="row"><span class="k">Travel days <span class="mut">· ${show.tn < tN ? `${show.tn} of ${tN}` : tN} × ${money(num(e.travelRate))}</span></span><span class="v">${money(show.travel)}</span></div>` : ''}
    <button class="row" data-act="hitch-miles" data-k="${hk}"><span class="k">Mileage <span class="mut">· ${full.mi} ${DU().u} this hitch</span></span><span class="v">${money(show.miles)}</span>${IC.chev}</button>
  </div>
  <div class="sec-title">${yr} so far</div>
  <div class="tiles">
    <div class="tile"><small>Earned to date</small><b>${money(yp.ytd)}</b><span>${plural(yp.daysW, 'day')} worked</span></div>
    <div class="tile"><small>Full-year pace</small><b>${money(yp.proj)}</b><span>${plural(yp.daysAll, 'day')} scheduled</span></div>
  </div>
  <div class="sec-title">Rates<button class="txt-btn" data-act="pay-edit" style="font-size:calc(15px*var(--ts));font-weight:400;min-height:0">Edit</button></div>
  <button class="group" data-act="pay-edit" style="display:block;width:100%">
    <div class="row"><span class="k">${e.payType === 'hourly' ? 'Hourly rate' : 'Day rate'}</span><span class="v">${esc(rate)}</span></div>
    ${e.payType === 'hourly' ? `<div class="row"><span class="k">Overtime</span><span class="v">1.5× after ${num(e.otAfter)} hrs</span></div>` : ''}
    <div class="row"><span class="k">Per diem</span><span class="v">${money(num(e.perDiem))}/day</span></div>
    ${tN ? `<div class="row"><span class="k">Travel days</span><span class="v">${tN} per hitch · ${money(num(e.travelRate))}</span></div>` : ''}
    <div class="row"><span class="k">Mileage</span><span class="v">${money(num(e.mileageRate), 2)}/${DU().u} · ${num(e.roundTrip)} ${DU().u} usual</span></div>
  </button>
  <div class="sec-title">Bonuses<button class="txt-btn" data-act="bonus-add" style="font-size:calc(15px*var(--ts));font-weight:400;min-height:0">Add</button></div>`;
  const bon = [...S.bonuses].sort((a, b) => (a.date < b.date ? 1 : -1));
  h += bon.length ? `<div class="group ic">${bon.map(b => `<button class="row" data-act="bonus-edit" data-id="${b.id}"><span class="itile" style="--c:var(--home)">${IC.star}</span><span class="t"><b>${esc(b.label || 'Bonus')}</b><small>${validKey(b.date) ? fmtFull(parseKey(b.date)) : ''}</small></span><span class="v">${money(num(b.amount))}</span>${IC.chev}</button>`).join('')}</div>`
    : `<div class="group"><button class="row" data-act="bonus-add"><span class="t"><b>No bonuses yet</b><small>Safety bonuses, completion pay and other one-offs count toward your year.</small></span>${IC.chev}</button></div>`;
  const past = yp.hs.filter(x => x.status !== 'next').reverse(), next = yp.hs.filter(x => x.status === 'next');
  h += `<div class="sec-title">Hitches in ${yr}</div><div class="group">${past.map(x => { const pay = earnedPay(x.key, x.worked, x.days).total, own = S.hitchMiles[x.key] != null; return `<button class="row" data-act="hitch-miles" data-k="${x.key}"><span class="t"><b>${fmtMD(x.first)} – ${fmtMD(x.last)}</b><small>${x.status === 'now' ? `In progress · ${x.worked} of ${plural(x.days, 'day')}` : plural(x.days, 'day')} · ${milesFor(x.key)} ${DU().u}${own ? ' (edited)' : ''}</small></span>${x.status === 'now' ? '<span class="chip c-day">Now</span>' : ''}<span class="v">${money(pay)}</span>${IC.chev}</button>`; }).join('')}
    ${next.length ? `<div class="row"><span class="t"><b>${plural(next.length, 'hitch').replace('hitchs', 'hitches')} still to come</b><small>${fmtMD(next[0].first)} onward</small></span><span class="v">${money(next.reduce((a, x) => a + fullPay(x.key, x.days).total, 0))}</span></div>` : ''}
    ${!past.length && !next.length ? '<div class="row"><span class="t"><small>No hitches fall in this year.</small></span></div>' : ''}</div>
  <p class="foot">Tap a hitch to change its ${DU().w}. Estimates are gross pay before taxes and deductions.</p>`;
  $('#pay-body').innerHTML = h;
}
const fRow = (label, id, val, affix = curSym(), mode = 'decimal') => `<label class="row"><span class="k">${label}</span>${affix ? `<span class="affix">${affix}</span>` : ''}<input type="text" inputmode="${mode}" id="${id}" value="${esc(val)}" autocomplete="off"></label>`;
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
      <div class="sec-h">Mileage</div><div class="group form">${fRow(`Rate per ${DU().one}`, 'pe-mi', e.mileageRate)}${fRow(`Usual round-trip ${DU().w}`, 'pe-rt', e.roundTrip, '')}</div>
      <p class="foot">Paid once per hitch. If a hitch has different ${DU().w}, tap that hitch on the Pay screen to change it.</p>`,
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
    body: `<div class="sec-h">${DU().W} driven for this hitch</div><div class="group form">${fRow(`Round-trip ${DU().w}`, 'hm-mi', milesFor(key), '')}</div>
      <p class="foot">Your usual round trip is ${num(e.roundTrip)} ${DU().u}. Mileage pays ${money(num(e.mileageRate), 2)} a ${DU().one}, so this hitch comes to ${money(num(e.mileageRate) * milesFor(key))}.</p>
      ${own ? '<button class="btn gray" data-act="miles-reset" style="margin-top:20px">Use my usual ${DU().w}</button>' : ''}`,
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
    <button class="btn primary" data-act="share-family">${IC.share}Share with family</button>
    <p class="foot" style="margin:8px 4px 0;text-align:center">A simple page anyone can open, no app needed. It counts down to when you're home.</p>
    <div class="btn-row"><button class="btn gray" data-act="family-preview">Preview it</button><button class="btn gray" data-act="share">Crew link</button></div>
    <button class="btn plain" data-act="pdf-open">Printable year calendar (PDF)</button></div>
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
    body: `<div data-form="sc"><div class="group form" style="margin-top:6px"><label class="row"><span class="k">Name</span><input type="text" id="sc-name" placeholder="Jimmy" maxlength="24" autocomplete="off" value="${esc(r ? r.name : pre ? pre.n || '' : '')}"></label></div>
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
  const link = crewLink(), info = nowInfo(me()), p = S.pattern;
  const text = `${S.name || 'My'} hitch schedule: ${patText(p)}, ${info.phase === 'on' ? 'on hitch' : 'home'} until ${fmtDay(info.until)}. Add it in HitchCal:`;
  if (!EMBEDDED && navigator.share) {
    try { await navigator.share({ title: 'HitchCal schedule', text, url: link }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  copyText(`${text} ${link}`, 'Link copied. Paste it in a text.');
}

/* ───────── Family page: a read-only view for people without the app ───────── */
let FAM = null;
const famCal = { y: 0, m: 0 };
const TIME_RE = /^\d{2}:\d{2}$/;
const famSched = d => ({ hitchStart: d.s, pattern: { daysOn: clampInt(d.p.on, 1, 120), daysOff: clampInt(d.p.off, 1, 120), shiftType: d.t === 'night' ? 'night' : 'day', startTime: TIME_RE.test(d.st || '') ? d.st : '06:00', endTime: TIME_RE.test(d.et || '') ? d.et : '18:00', alternating: !!d.a } });
function showFamily(d, preview) {
  const first = String(d.n || '').trim().split(/\s+/)[0].slice(0, 24);
  FAM = { d, sch: famSched(d), preview, first, phase: '' };
  const n = new Date(); famCal.y = n.getFullYear(); famCal.m = n.getMonth();
  $('#app').hidden = true; const f = $('#family'); f.hidden = false; f.scrollTop = 0;
  if (!preview) document.title = first ? `${first}'s schedule` : 'Work schedule';
  renderFamily();
}
function closeFamily() { FAM = null; $('#family').hidden = true; $('#app').hidden = false; render(); }
function famMonth() {
  const { y, m } = famCal, sch = FAM.sch, lead = wsLead(new Date(y, m, 1)), dim = new Date(y, m + 1, 0).getDate(), tk = todayKey();
  let h = dowLetters().split('').map(c => `<small>${c}</small>`).join('') + '<i></i>'.repeat(lead);
  for (let d = 1; d <= dim; d++) {
    const k = `${y}-${pad(m + 1)}-${pad(d)}`, ci = cellInfo(k, sch), away = ci.type === 'on' || ci.tail, hol = holidayOn(k);
    const style = away ? `--a:${(ci.a * 100).toFixed(1)}%;--b:${(ci.b * 100).toFixed(1)}%` : '';
    h += `<span class="fc${away ? (ci.shift === 'night' ? ' n' : ' d') : ''}${away && !ci.split ? ' full' : ''}${k === tk ? ' now' : ''}" style="${style}" title="${hol ? esc(hol) : ''}"><b>${d}</b>${hol ? '<i class="hd"></i>' : ''}</span>`;
  }
  return h;
}
function renderFamily() {
  const now = new Date(), today = startOfDay(now), sch = FAM.sch, p = sch.pattern, info = nowInfo(sch, now), on = info.phase === 'on';
  const who = FAM.first || 'They', is = FAM.first ? `${who} is` : "They're", them = FAM.first || 'them';
  const cls = on ? (info.shift === 'night' ? 'night' : 'day') : 'home';
  FAM.phase = info.phase;
  let h = FAM.preview ? `<div class="fam-bar"><div class="wrap fam-bar-in"><span class="t"><b>Family page preview</b><small>This is what they'll see</small></span><button class="pill-btn" data-act="share-family">Share</button><button class="txt-btn strong" data-act="fam-close">Done</button></div></div>` : '';
  h += `<div class="wrap fam-wrap">
    <div class="fam-head"><span class="avatar lg">${avInner({ icon: okIcon(FAM.d.i), name: FAM.d.n })}</span><span><span class="eyebrow">${fmtLong(now)}</span><h1 class="fam-h1">${esc(is)} ${on ? 'at work' : 'home'}</h1></span></div>
    <div class="hero ${cls}">
      <div class="lab">${on ? 'At work' : 'Home'}</div>
      <div class="ring" role="img" aria-label="${on ? 'Day ' + info.dayNum + ' of ' + info.total + ' at work' : 'Day ' + info.dayNum + ' of ' + info.total + ' at home'}"><svg viewBox="0 0 60 60"><circle class="tr" cx="30" cy="30" r="26"/><circle class="ar" id="fam-arc" cx="30" cy="30" r="26" stroke-dasharray="${RC}" stroke-dashoffset="${RC * (1 - info.pct)}"/></svg><div class="mid"><b>${info.dayNum}</b><small>of ${info.total}</small></div></div>
      <div class="lead">${esc(is)} ${on ? 'home' : 'back at work'} in</div>
      <div class="cd" data-cd="full">${cdHTML(info.ms, 'full')}</div>
      <div class="sub">${on ? 'Off work' : 'Next shift starts'} ${fmtLong(info.until)} at ${fmtClock(info.until)}</div>
    </div>`;
  const tr = transitions(sch, 6, now), ranges = [];
  let start = now, cur = info.phase;
  tr.forEach(t => { ranges.push({ type: cur, a: start, b: t.date }); start = t.date; cur = t.type; });
  h += `<div class="sec-title">What's next</div><div class="group">${ranges.map((r, i) => {
    const away = r.type === 'on', dot = away ? (shiftFor(toKey(r.a), sch) === 'night' ? 'var(--night)' : 'var(--day)') : 'var(--home)';
    const left = Math.max(1, Math.ceil((r.b - now) / 864e5));
    return `<div class="row"><span class="fam-dot" style="background:${dot}"></span><span class="t"><b>${away ? 'At work' : 'Home'}</b><small>${i === 0 ? `Now until ${fmtDay(r.b)}` : `${fmtDay(r.a)} to ${fmtDay(r.b)}`}</small></span>${i === 0 ? `<span class="chip ${away ? 'c-gray' : 'c-home'}">${plural(left, 'day')} left</span>` : `<span class="v">${plural(away ? p.daysOn : p.daysOff, 'day')}</span>`}</div>`;
  }).join('')}</div>`;
  h += `<div class="sec-title">${MONTHS[famCal.m]} ${famCal.y}<span class="cal-ctl"><button class="icon-btn" data-act="fam-prev" aria-label="Previous month"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button><button class="icon-btn" data-act="fam-next" aria-label="Next month"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button></span></div>
    <div class="fam-cal">${famMonth()}</div>
    <div class="legend"><span><i style="background:var(--day)"></i>At work</span><span><i style="background:var(--fill-2)"></i>Home</span><span><i style="background:var(--danger)"></i>Holiday</span></div>`;
  const hs = [];
  [now.getFullYear(), now.getFullYear() + 1].forEach(y => holidays(y).forEach(x => { if (x.date >= today && hs.length < 6) hs.push(x); }));
  h += `<div class="sec-title">Coming holidays</div><div class="group">${hs.map(x => { const off = dayType(toKey(x.date), sch) === 'off'; return `<div class="row${off ? '' : ' dim'}"><span class="t"><b>${esc(x.name)}</b><small>${fmtDay(x.date)}${x.date.getFullYear() !== now.getFullYear() ? ', ' + x.date.getFullYear() : ''}</small></span><span class="chip ${off ? 'c-home' : 'c-gray'}">${off ? 'Home' : 'At work'}</span></div>`; }).join('')}</div>
    <p class="foot">Times are when shifts start and end; travel to and from work isn't included. Schedules can change, so check with ${esc(them)} before making plans.</p>
    ${FAM.preview ? '' : `<a class="btn gray fam-cta" href="${esc(SHARE_BASE)}" target="_blank" rel="noopener">Work a rotation too? Get HitchCal</a>`}
  </div>`;
  $('#family').innerHTML = h;
}
function famTick() {
  const info = nowInfo(FAM.sch);
  if (info.phase !== FAM.phase) return renderFamily();
  $$('#family [data-cd]').forEach(el => { el.innerHTML = cdHTML(info.ms, el.dataset.cd); });
  const arc = $('#fam-arc'); if (arc) arc.style.strokeDashoffset = RC * (1 - info.pct);
}
async function shareFamily() {
  if (!S.name.trim()) { toast('Add your name first so family knows whose schedule it is'); return openHitch(); }
  const link = familyLink(), first = S.name.trim().split(/\s+/)[0];
  const text = "Here's my work schedule. It counts down to when I'm home:";
  if (!EMBEDDED && navigator.share) {
    try { await navigator.share({ title: `${first}'s schedule`, text, url: link }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  copyText(`${text} ${link}`, 'Link copied. Paste it in a text.');
}

/* ───────── Settings + Certifications ───────── */
const FAQ = [["Where is my information kept?", "On this phone only, in your browser's storage. There's no account and nothing is uploaded. Use Back up in Settings to save a copy."], ["How do I move HitchCal to a new phone?", "On the old phone, tap Back up in Settings and send the file to yourself. On the new phone, open HitchCal and tap Restore from a backup."], ["How do I put HitchCal on my home screen?", "iPhone: open it in Safari, tap Share, then Add to Home Screen. Android: open it in Chrome, tap the menu, then Install app."], ["Does it work without signal?", "Yes. After you open it once with signal, the calendar, countdown and pay work offline."], ["How is my pay worked out?", "Your day rate (or hourly rate times hours) for each day worked, plus per diem, mileage for the trip and any paid travel days. It's an estimate of gross pay before taxes."], ["What happens with night shifts that cross midnight?", "The calendar splits those days, so you can see where one shift ends and days off begin."], ["How do I share my schedule with family?", "Use Share with family. It sends a link that opens a read-only calendar of your hitches and days off. The schedule travels inside the link; nothing is stored online."], ["Can I follow a crew member's schedule?", "Yes. Add their schedule on the Crew tab, or open a crew link they send you. Their hitches show as a colored line on your calendar."]];
/*__LEGAL__*/
const openCurrency = () => openSheet({ title: 'Currency', left: 'Done', body: `<div class="group">${CURRENCIES.map(([c, n]) => `<button class="row" data-act="currency-pick" data-c="${c}"><span class="t"><b>${n}</b><small>${c} · ${symFor(c)}</small></span>${S.currency === c ? '<span class="tick">✓</span>' : ''}</button>`).join('')}</div><p class="foot">Changes how amounts are shown. It doesn't convert your rates.</p>` });
const openWhatsNew = () => openSheet({ title: "What's new", left: 'Done', body: `<p class="wn-v">Version ${APP_VERSION}</p><div class="wn">${WHATS_NEW.map(([t, d]) => `<div class="wn-i"><span class="wn-ic">${IC.sparkle}</span><div><b>${esc(t)}</b><p>${esc(d)}</p></div></div>`).join('')}</div>` });
const openFaq = () => openSheet({ title: 'Help and FAQ', left: 'Done', body: `<div class="faq">${FAQ.map(([q, ans]) => `<details><summary>${esc(q)}</summary><p>${esc(ans)}</p></details>`).join('')}</div><p class="foot">Still stuck? Use Send feedback in Settings.</p>` });
function diag() {
  let used = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); used += k.length + (localStorage.getItem(k) || '').length; } } catch (e) { used = -1; }
  const p = S.pattern, installed = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
  return [`HitchCal ${APP_VERSION}`, `Date: ${new Date().toString()}${DEV.offset ? ' (time travel on)' : ''}`, `Device: ${navigator.userAgent}`,
    `Screen: ${screen.width}x${screen.height} @${window.devicePixelRatio}x, window ${innerWidth}x${innerHeight}, installed: ${installed ? 'yes' : 'no'}`,
    `Storage used: ${used < 0 ? 'unavailable' : Math.round(used / 1024) + ' KB'}`,
    `Schedule: ${p.daysOn}/${p.daysOff}, ${p.alternating ? 'alternating' : p.shiftType}, starts ${S.hitchStart || 'not set'}`,
    `Settings: theme ${S.theme}, text ${S.textSize}, week ${S.weekStart ? 'Mon' : 'Sun'}, ${S.clock24 ? '24h' : '12h'}, ${S.dist}, ${S.currency}, crew ${S.rosters.length}, certs ${S.certs.length}`,
    `Errors logged: ${ERRS.length}`, ...ERRS.slice(-10).map(e => `  ${e.t} v${e.v} ${e.m}${e.w ? ' @ ' + e.w : ''}`)].join('\n');
}
function openFeedback() {
  const has = !!CONFIG.supportEmail;
  openSheet({ title: 'Send feedback', left: 'Done', body: `<p class="foot" style="margin:4px 4px 14px">Tell us what you'd change, what's missing, or what went wrong. Device details help us fix problems faster; you can see exactly what's included below.</p>
    ${has ? `<button class="btn primary" data-act="feedback-mail">${IC.mail}Email support</button>` : '<p class="foot" style="margin:0 4px 12px">Email support isn&#39;t set up yet. While HitchCal is in testing, copy the details and send them to the developer.</p>'}
    <button class="btn gray" data-act="diag-copy" style="margin-top:10px">Copy device details</button>
    <div class="sec-h">Included device details</div><pre class="diag">${esc(diag())}</pre>` });
}
function mailSupport() {
  const subject = `HitchCal feedback (${APP_VERSION})`, body = `\n\n\n---\nDevice details (helps us fix problems):\n${diag()}`;
  location.href = `mailto:${CONFIG.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
async function shareApp() {
  const url = CONFIG.shareUrl || (location.protocol.startsWith('http') ? location.origin + location.pathname : ''), text = 'The hitch calendar I use: countdown to days off, hitch pay and crew schedules.';
  track('Share app');
  if (navigator.share && !EMBEDDED) { try { await navigator.share({ title: 'HitchCal', text, url: url || undefined }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  copyText(url ? `${text} ${url}` : text, url ? 'Link copied' : 'Copied');
}
const openLegal = doc => openSheet({ title: doc === 'terms' ? 'Terms of use' : 'Privacy policy', left: 'Done', body: `<div class="legal">${LEGAL[doc === 'terms' ? 'terms' : 'privacy']}</div>` });
let aboutTaps = 0, aboutT;
function aboutTap() {
  clearTimeout(aboutT); aboutT = setTimeout(() => { aboutTaps = 0; }, 2500);
  if (DEV.enabled) { if (++aboutTaps >= 3) { aboutTaps = 0; openDev(); } return; }
  aboutTaps++;
  if (aboutTaps >= 3 && aboutTaps < 7) toast(`${7 - aboutTaps} more taps to turn on developer tools`);
  if (aboutTaps >= 7) { aboutTaps = 0; DEV.enabled = true; saveDev(); buzz(); toast('Developer tools are on'); render(); }
}
const SAMPLES = [['14/14 days', { daysOn: 14, daysOff: 14, shiftType: 'day', alternating: false, startTime: '06:00', endTime: '18:00' }],
  ['21/7 days', { daysOn: 21, daysOff: 7, shiftType: 'day', alternating: false, startTime: '06:00', endTime: '18:00' }],
  ['7/7 days and nights', { daysOn: 7, daysOff: 7, shiftType: 'day', alternating: true, startTime: '06:00', endTime: '18:00' }],
  ['28/28 nights', { daysOn: 28, daysOff: 28, shiftType: 'night', alternating: false, startTime: '18:00', endTime: '06:00' }],
  ['20/10 days', { daysOn: 20, daysOff: 10, shiftType: 'day', alternating: false, startTime: '06:00', endTime: '18:00' }],
  ['2/1 nights (edge case)', { daysOn: 2, daysOff: 1, shiftType: 'night', alternating: false, startTime: '19:00', endTime: '07:00' }]];
function openDev() {
  const days = DEV.offset ? Math.round(DEV.offset / 864e5) : 0;
  openSheet({ title: 'Developer', left: 'Done', body: `
    <div class="sec-h" style="padding-top:0">Time travel</div>
    <div class="group form"><label class="row"><span class="k">Pretend today is</span><input type="date" id="dv-date" value="${todayKey()}"></label></div>
    <p class="foot">${days ? `The clock is shifted ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ${days > 0 ? 'ahead' : 'back'}.` : 'Using the real date.'} The app reloads when you change it.</p>
    <div class="dev-btns"><button class="btn primary" data-act="dev-travel">Travel</button><button class="btn gray" data-act="dev-travel-off"${days ? '' : ' disabled'}>Real date</button></div>
    <div class="sec-h">Sample schedules</div>
    <div class="chips">${SAMPLES.map(([n], i) => `<button type="button" class="pchip" data-act="dev-sample" data-i="${i}">${n}</button>`).join('')}</div>
    <p class="foot">Replaces your pattern and starts the hitch 3 days ago. Back up first if you need your real schedule.</p>
    <div class="sec-h">Feature flags</div>
    <div class="group"><div class="row"><span class="t"><b>Premium preview</b><small>Treat this device as premium</small></span><button class="switch${DEV.flags.premium ? ' on' : ''}" role="switch" aria-checked="${!!DEV.flags.premium}" aria-label="Premium preview" data-act="switch" data-change="dev-flag-premium"></button></div>
      <div class="row"><span class="t"><b>Layout outlines</b><small>Outline every element</small></span><button class="switch${DEV.flags.outline ? ' on' : ''}" role="switch" aria-checked="${!!DEV.flags.outline}" aria-label="Layout outlines" data-act="switch" data-change="dev-flag-outline"></button></div></div>
    <div class="sec-h">Diagnostics</div>
    <pre class="diag" id="dv-diag">${esc(diag())}</pre>
    <div class="dev-btns"><button class="btn gray" data-act="diag-copy">Copy</button><button class="btn gray" data-act="dev-errors-clear"${ERRS.length ? '' : ' disabled'}>Clear errors (${ERRS.length})</button></div>
    <div class="sec-h">Reset</div>
    <div class="group"><button class="row" data-act="dev-cache"><span class="t"><b>Clear cache and reload</b><small id="dv-cache">Offline cache</small></span>${IC.chev}</button>
      <button class="row" data-act="dev-onboard"><span class="t"><b>Run onboarding again</b></span>${IC.chev}</button>
      <button class="row" data-act="dev-throw"><span class="t"><b>Log a test error</b></span>${IC.chev}</button>
      <button class="row red" data-act="dev-off">Turn off developer tools</button></div>`,
    onOpen: () => { if (window.caches) caches.keys().then(ks => { const el = $('#dv-cache'); if (el) el.textContent = ks.length ? `Offline cache: ${ks.join(', ')}` : 'No offline cache on this page'; }).catch(() => { }); } });
}
function travelTo(key) {
  if (!key) { delete DEV.offset; } else { const t = parseKey(key), now = new RealDate(); t.setHours(now.getHours(), now.getMinutes(), now.getSeconds()); DEV.offset = t.getTime() - RealDate.now(); }
  saveDev(); location.reload();
}
function showUpdate() { const u = $('#upd'); if (u) u.hidden = false; }
function loadServices() {
  if (EMBEDDED) return;
  if (CONFIG.sentryLoader) { const sc = document.createElement('script'); sc.src = CONFIG.sentryLoader; sc.crossOrigin = 'anonymous'; document.head.appendChild(sc); }
  if (CONFIG.plausibleDomain) { const sc = document.createElement('script'); sc.defer = true; sc.dataset.domain = CONFIG.plausibleDomain; sc.src = 'https://plausible.io/js/script.js'; document.head.appendChild(sc); }
}
function track(ev) { try { if (window.plausible) window.plausible(ev); } catch (e) { /* analytics is optional */ } }

function renderMore() {
  const p = S.pattern, exp = S.certs.filter(c => certState(c).n <= 30).length;
  $('#more-body').innerHTML = `<h1 class="lt">Settings</h1>
  <div class="group"><button class="row" data-act="edit-hitch" style="padding-block:12px"><span class="avatar lg">${avInner(S)}</span><span class="t"><b style="font-size:calc(20px*var(--ts));font-weight:700">${esc(S.name || 'My hitch')}</b><small>${patText(p)} · ${p.alternating ? 'Days and nights' : shiftName(p.shiftType)} · ${fmt12(p.startTime)} to ${fmt12(p.endTime)}</small></span>${IC.chev}</button></div>
  <div class="group ic" style="margin-top:20px"><button class="row" data-act="certs-open"><span class="itile" style="--c:var(--home)">${IC.shield}</span><span class="t"><b>Certifications</b></span>${exp ? `<span class="chip c-warn">${exp} need${exp === 1 ? 's' : ''} attention</span>` : `<span class="v">${S.certs.length || 'None'}</span>`}${IC.chev}</button></div>
  <div class="sec-h">Appearance</div>
  <div class="group ic"><div class="row"><span class="itile" style="--c:var(--night)">${IC.paint}</span><span class="t"><b>Theme</b></span><span class="seg sm" data-change="theme">${['system', 'light', 'dark'].map(t => `<button data-act="seg" data-val="${t}" class="${S.theme === t ? 'on' : ''}">${t === 'system' ? 'Auto' : t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</span></div>
    <button class="row" data-act="colors-open"><span class="itile" style="--c:var(--tint);color:var(--on-tint)">${IC.star}</span><span class="t"><b>Colors and themes</b></span><span class="cdots">${COLOR_ROWS.map(([k]) => `<i style="background:${colorOf(k)}"></i>`).join('')}</span>${IC.chev}</button>
    <div class="row"><span class="itile" style="--c:var(--hol);color:var(--hol-ink)">${IC.flag}</span><span class="t"><b>Holiday labels</b><small>Name on each holiday's day</small></span><button class="switch${S.showHolidays ? ' on' : ''}" role="switch" aria-checked="${!!S.showHolidays}" aria-label="Holiday labels" data-act="switch" data-change="toggle-hol"></button></div>
    <div class="row"><span class="itile" style="--c:#6C7077">${IC.textsize}</span><span class="t"><b>Text size</b></span><span class="seg sm" data-change="text-size">${[['m', '<span class="ts1">A</span>', 'Default'], ['l', '<span class="ts2">A</span>', 'Large'], ['xl', '<span class="ts3">A</span>', 'Extra large']].map(([v, l, al]) => `<button data-act="seg" data-val="${v}" class="${String(S.textSize) === v ? 'on' : ''}"${al ? ` aria-label="${al}"` : ''}>${l}</button>`).join('')}</span></div>
    <div class="row"><span class="itile" style="--c:#6C7077">${IC.motion}</span><span class="t"><b>Reduce motion</b><small>Also on when your phone asks for it</small></span><button class="switch${S.reduceMotion ? ' on' : ''}" role="switch" aria-checked="${S.reduceMotion}" aria-label="Reduce motion" data-act="switch" data-change="toggle-motion"></button></div>
    ${'vibrate' in navigator ? `<div class="row"><span class="itile" style="--c:#6C7077">${IC.vibrate}</span><span class="t"><b>Haptics</b><small>A light tap when you change a setting</small></span><button class="switch${S.haptics !== false ? ' on' : ''}" role="switch" aria-checked="${S.haptics !== false}" aria-label="Haptics" data-act="switch" data-change="toggle-haptics"></button></div>` : ''}</div>
  <div class="sec-h">Calendar and units</div>
  <div class="group ic"><div class="row"><span class="itile" style="--c:var(--day)">${IC.week}</span><span class="t"><b>Week starts on</b></span><span class="seg sm" data-change="week-start">${[['0', 'Sun', 'Sunday'], ['1', 'Mon', 'Monday']].map(([v, l, al]) => `<button data-act="seg" data-val="${v}" class="${String(S.weekStart) === v ? 'on' : ''}"${al ? ` aria-label="${al}"` : ''}>${l}</button>`).join('')}</span></div>
    <div class="row"><span class="itile" style="--c:var(--day)">${IC.clock}</span><span class="t"><b>Time format</b></span><span class="seg sm" data-change="clock">${[['12', '12-hr', '12-hour'], ['24', '24-hr', '24-hour']].map(([v, l, al]) => `<button data-act="seg" data-val="${v}" class="${String(S.clock24 ? '24' : '12') === v ? 'on' : ''}"${al ? ` aria-label="${al}"` : ''}>${l}</button>`).join('')}</span></div>
    <div class="row"><span class="itile" style="--c:var(--day)">${IC.ruler}</span><span class="t"><b>Distance</b></span><span class="seg sm" data-change="dist">${[['mi', 'Miles'], ['km', 'Km', 'Kilometers']].map(([v, l, al]) => `<button data-act="seg" data-val="${v}" class="${String(S.dist) === v ? 'on' : ''}"${al ? ` aria-label="${al}"` : ''}>${l}</button>`).join('')}</span></div>
    <button class="row" data-act="currency-open"><span class="itile" style="--c:var(--day)">${IC.coin}</span><span class="t"><b>Currency</b></span><span class="v">${esc(S.currency)}</span>${IC.chev}</button></div>
  <div class="sec-h">Your data</div>
  <div class="group ic"><button class="row" data-act="pdf-open"><span class="itile" style="--c:var(--danger)">${IC.cal}</span><span class="t"><b>Year calendar PDF</b><small>One page with your year and holidays, for family</small></span>${IC.chev}</button>
    <button class="row" data-act="export-ics"><span class="itile" style="--c:var(--day)">${IC.cal}</span><span class="t"><b>Export to a calendar app</b><small>A year of hitches as an .ics file</small></span>${IC.chev}</button>
    <button class="row" data-act="backup"><span class="itile" style="--c:var(--day)">${IC.down}</span><span class="t"><b>Back up</b><small>Save everything to a file</small></span>${IC.chev}</button>
    <button class="row" data-act="restore"><span class="itile" style="--c:var(--day)">${IC.up}</span><span class="t"><b>Restore from a backup</b></span>${IC.chev}</button></div>
  <p class="foot">Everything is stored on this device. Nothing is uploaded.</p>
  <div class="sec-h">Help and about</div>
  <div class="group ic"><button class="row" data-act="whats-new"><span class="itile" style="--c:var(--hol);color:var(--hol-ink)">${IC.sparkle}</span><span class="t"><b>What's new</b></span><span class="v">${APP_VERSION}</span>${IC.chev}</button>
    <button class="row" data-act="faq-open"><span class="itile" style="--c:var(--home)">${IC.help}</span><span class="t"><b>Help and FAQ</b></span>${IC.chev}</button>
    <button class="row" data-act="feedback-open"><span class="itile" style="--c:var(--home)">${IC.mail}</span><span class="t"><b>Send feedback</b><small>Ideas, questions or something broken</small></span>${IC.chev}</button>
    <button class="row" data-act="share-app"><span class="itile" style="--c:var(--home)">${IC.share}</span><span class="t"><b>Share HitchCal</b><small>Send it to your crew</small></span>${IC.chev}</button>
    <button class="row" data-act="legal" data-doc="privacy"><span class="itile" style="--c:#6C7077">${IC.lock}</span><span class="t"><b>Privacy policy</b></span>${IC.chev}</button>
    <button class="row" data-act="legal" data-doc="terms"><span class="itile" style="--c:#6C7077">${IC.doc}</span><span class="t"><b>Terms of use</b></span>${IC.chev}</button>
    ${DEV.enabled ? `<button class="row" data-act="dev-open"><span class="itile" style="--c:var(--danger)">${IC.wrench}</span><span class="t"><b>Developer</b><small>Testing tools</small></span>${IC.chev}</button>` : ''}</div>
  <div class="group" style="margin-top:24px"><button class="row red" data-act="reset">Erase all data</button></div>
  <button type="button" class="about" data-act="about-tap">HitchCal ${APP_VERSION}<br>Built for rotation workers.</button>`;
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
      <div class="sec-h">Common in the oilfield</div><div class="chips">${CERT_LIB.map(n => `<button type="button" class="pchip" data-act="cert-pick" style="font-size:calc(14px*var(--ts))">${esc(n)}</button>`).join('')}</div>
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
    ...d, setup: true, demo: true, name: 'Sample Hand', icon: 'worm',
    earnings: { ...d.earnings, dayRate: 750, hourlyRate: 45, perDiem: 75, mileageRate: 0.7, roundTrip: 280, travelRate: 750 }, hitchStart: toKey(addDays(t, -8)),
    certs: [{ id: uid(), name: 'H2S Alive', expiry: toKey(addDays(t, 24)) }, { id: uid(), name: 'First Aid / CPR', expiry: toKey(addDays(t, 210)) }],
    rosters: [{ id: uid(), name: 'Jimmy', icon: 'worm', photo: '', hitchStart: toKey(addDays(t, -3)), color: COLORS[0], pattern: { daysOn: 7, daysOff: 7 } }],
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
  const sch = { hitchStart: d.hitchStart, pattern: d.pattern }, start = parseKey(d.hitchStart), first = addDays(start, -wsLead(start));
  let h = dowLetters().split('').map(c => `<small>${c}</small>`).join('');
  for (let i = 0; i < 35; i++) { const x = addDays(first, i), ci = cellInfo(toKey(x), sch); h += `<i class="${ci.type === 'on' ? (ci.shift === 'night' ? 'n' : 'd') : ''}${toKey(x) === d.hitchStart ? ' st' : ''}">${x.getDate()}</i>`; }
  $('#ob-prev').innerHTML = h;
  const p = d.pattern, b = hitchBounds(start, sch);
  $('#ob-sum').innerHTML = `<b>${plural(p.daysOn, 'day')} on, ${p.daysOff} off.</b> ${p.alternating ? 'Alternating days and nights' : shiftName(p.shiftType)}, ${fmt12(p.startTime)} to ${fmt12(p.endTime)}. This hitch runs ${fmtDay(b.begin)} to ${fmtDay(b.end)}.`;
}
function obFinish() {
  S.seenVersion = APP_VERSION;
  const d = readHitch('ob');
  if (!validKey(d.hitchStart)) return toast('Pick the first day of a hitch');
  if (S.demo || !S.setup) { const keep = S.theme, kc = S.colors; S = DEF(); S.theme = keep; S.colors = kc; }
  S.setup = true; S.demo = false; S.name = d.name; S.hitchStart = d.hitchStart; S.pattern = d.pattern; Object.assign(S, readAv('ob'));
  save(); $('#onboard').hidden = true; showTab('cal');
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
  'miles-reset': () => { delete S.hitchMiles[$('#sheet-body').dataset.k]; save(); closeSheet(); render(); toast(`Back to your usual ${DU().w}`); },
  'pay-travel': v => { $('#pe-trg').hidden = +v === 0; },
  av: el => { const pfx = el.parentElement.dataset.pfx, s = pick[pfx]; s.mode = el.dataset.v ? 'icon' : 'init'; if (el.dataset.v) s.icon = el.dataset.v; el.parentElement.innerHTML = avOpts(pfx); },
  'av-photo': el => { const pfx = el.parentElement.dataset.pfx, s = pick[pfx]; if (s.photo && s.mode !== 'photo') { s.mode = 'photo'; el.parentElement.innerHTML = avOpts(pfx); return; } photoTarget = pfx; $('#photo-file').click(); },
  'colors-open': () => openColors(),
  'picker-open': el => openPicker(el.dataset.k),
  'picker-back': () => { PK = null; $('#sheet-body').innerHTML = colorsBody(); },
  'picker-apply': () => { const k = PK.k, hex = hsvToHex(PK.h, PK.s, PK.v); PK = null; setColor(k, hex); },
  'picker-default': () => { const k = PK.k; PK = null; setColor(k, DEFC[k]); },
  'theme-pick': el => { S.colors = { ...THEMES[+el.dataset.i][1] }; save(); applyColors(); render(); const b = $('#sheet-body'); b.innerHTML = colorsBody(); },
  'color-pick': el => setColor(el.dataset.k, el.dataset.c),
  'bonus-add': () => openBonus(null),
  'bonus-edit': el => openBonus(el.dataset.id),
  'bonus-del': () => { const id = $('#sheet-body').dataset.id; S.bonuses = S.bonuses.filter(b => b.id !== id); save(); closeSheet(); render(); toast('Bonus deleted'); },
  'crew-add': () => openRoster(null),
  'crew-edit': el => openRoster(el.dataset.id),
  'crew-del': () => { const id = $('#sheet-body').dataset.id, r = S.rosters.find(x => x.id === id); ask({ title: `Remove ${r ? r.name : 'this schedule'}?`, msg: 'Their line comes off your calendar.', ok: 'Remove', red: true, onOk() { S.rosters = S.rosters.filter(x => x.id !== id); save(); closeSheet(); render(); toast('Schedule removed'); } }); },
  share: () => shareSchedule(),
  'copy-link': () => copyText(crewLink(), 'Link copied'),
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
  'text-size': v => { S.textSize = v; save(); applyPrefs(); },
  'toggle-motion': on => { S.reduceMotion = on; save(); applyPrefs(); },
  'toggle-haptics': on => { S.haptics = on; save(); },
  'week-start': v => { S.weekStart = +v ? 1 : 0; save(); applyPrefs(); render(); },
  clock: v => { S.clock24 = v === '24'; save(); render(); },
  dist: v => { S.dist = v === 'km' ? 'km' : 'mi'; save(); render(); },
  'currency-open': () => openCurrency(),
  'currency-pick': el => { S.currency = el.dataset.c; save(); closeSheet(); render(); toast(`Amounts now show in ${el.dataset.c}`); },
  'whats-new': () => openWhatsNew(),
  'faq-open': () => openFaq(),
  'feedback-open': () => openFeedback(),
  'feedback-mail': () => mailSupport(),
  'diag-copy': () => copyText(diag(), 'Device details copied'),
  'share-app': () => shareApp(),
  legal: el => openLegal(el.dataset.doc),
  'about-tap': () => aboutTap(),
  'dev-open': () => openDev(),
  'dev-travel': () => { const v = $('#dv-date').value; if (!validKey(v)) return toast('Pick a date'); travelTo(v === toKey(new RealDate()) ? null : v); },
  'dev-travel-off': () => travelTo(null),
  'dev-sample': el => { const [n, pat] = SAMPLES[+el.dataset.i]; S.pattern = { ...S.pattern, ...pat }; S.hitchStart = toKey(addDays(startOfDay(new Date()), -3)); S.setup = true; save(); closeSheet(); render(); toast(`Loaded ${n}`); },
  'dev-flag-premium': on => { DEV.flags.premium = on; saveDev(); },
  'dev-flag-outline': on => { DEV.flags.outline = on; saveDev(); applyPrefs(); },
  'dev-errors-clear': () => { ERRS = []; try { localStorage.removeItem(ERRK); } catch (e) { /* storage unavailable */ } openDev(); toast('Error log cleared'); },
  'dev-cache': async () => { try { if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } if (navigator.serviceWorker) { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister())); } } catch (e) { logError(e.message, 'dev-cache'); } location.reload(); },
  'dev-onboard': () => { closeSheet(); startOnboarding(); },
  'dev-throw': () => { setTimeout(() => { throw new Error('Test error from the developer menu'); }, 0); setTimeout(openDev, 60); toast('Test error logged'); },
  'dev-off': () => { DEV = { flags: {} }; saveDev(); closeSheet(); applyPrefs(); render(); toast('Developer tools are off'); },
  'upd-reload': () => location.reload(),
  'share-family': () => shareFamily(),
  'family-preview': () => { if (!S.name.trim()) { toast('Add your name first so family knows whose schedule it is'); return openHitch(); } showFamily(parseShare('?s=' + shareCode()), true); },
  'fam-close': () => closeFamily(),
  'fam-prev': () => { const d = new Date(famCal.y, famCal.m - 1, 1); famCal.y = d.getFullYear(); famCal.m = d.getMonth(); renderFamily(); },
  'fam-next': () => { const d = new Date(famCal.y, famCal.m + 1, 1); famCal.y = d.getFullYear(); famCal.m = d.getMonth(); renderFamily(); },
  'pdf-open': () => openPdfSheet(),
  'pdf-make': () => exportPdf(),
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
  'ob-demo': () => { S = demoData(); S.seenVersion = APP_VERSION; track('Demo opened'); save(); $('#onboard').hidden = true; showTab('cal'); }
};
function formChanged(el) {
  const form = el.closest('[data-form]'); if (!form) return;
  syncChips(form);
  if (form.dataset.form === 'ob' && obStep === 3) obPreview();
}

/* ───────── wiring ───────── */
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el) return; if (el.matches('.seg button, .switch, .tab, .cs, .theme-btn')) buzz(); const fn = A[el.dataset.act]; if (fn) fn(el, e); });
document.addEventListener('input', e => { if (e.target.dataset.colorK) return setColor(e.target.dataset.colorK, e.target.value, false); if (e.target.closest('[data-form]')) formChanged(e.target); });
document.addEventListener('change', e => { if (e.target.dataset.colorK) setColor(e.target.dataset.colorK, e.target.value); });
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (!$('#alert').hidden) closeAlert(); else if (!$('#sheet').hidden) closeSheet(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
[$('#app'), $('.views')].forEach(el => el.addEventListener('scroll', () => { el.scrollLeft = 0; el.scrollTop = 0; }));
$$('.scroll').forEach(sc => sc.addEventListener('scroll', () => sc.classList.toggle('scrolled', sc.scrollTop > 40), { passive: true }));

$('#restore-file').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => { try { const p = JSON.parse(rd.result); if (!p || !p.pattern || !validKey(p.hitchStart)) throw new Error('bad'); const keep = S.theme; S = normalize(p); S.setup = true; S.theme = p.theme || keep; save(); applyTheme(); applyColors(); showTab('cal'); toast('Backup restored'); } catch (err) { toast("That file isn't a HitchCal backup"); } e.target.value = ''; };
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
load(); applyTheme(); applyColors(); applyPrefs(); loadServices();
pendingImport = parseShare(location.search);
const famLink = parseFamily(location.search);
if (famLink) showFamily(famLink, false);
else if (S.setup) { showTab('cal'); if (pendingImport) { const pre = pendingImport; pendingImport = null; setTimeout(() => openRoster(null, pre), 400); } }
else startOnboarding();
setInterval(tick, 1000);
if (!EMBEDDED && 'serviceWorker' in navigator && location.protocol === 'https:') {
  const hadSW = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW) showUpdate(); });
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
}
if (S.setup && !famLink && S.seenVersion !== APP_VERSION) { S.seenVersion = APP_VERSION; save(); setTimeout(() => { if ($('#sheet').hidden) openWhatsNew(); }, 900); }

/* exposed for the schedule-math self-check only */
window.__hitchcal = { familyLink, pdfData: y => loadPdfLib().then(J => buildPdf(J, y).output('datauristring')), cellInfo, nowInfo, hitchBounds, transitions, holidays, dayType, parseShare, toKey };
})();

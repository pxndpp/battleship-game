import { SIZE, FLEET, cellsOf, randomFleet } from '/game.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  del: (k) => { try { localStorage.removeItem(k); } catch {} },
};

// ---------- i18n ----------
const I18N = {
  en: {
    title: 'Battleship', tagline: 'Play Battleship with a friend via a link.', nickname: 'Your nickname',
    create: 'Create room', join: 'Join room', joinTitle: 'Join room {n}', createTitle: 'New game',
    waitingTitle: 'Waiting for your friend…', shareHint: 'Send this link to your friend.',
    copy: 'Copy link', copied: 'Copied!', leave: 'Leave', confirmLeave: 'Leaving now counts as a loss. Leave?',
    placeTitle: 'Place your ships', placeHint: 'Tap a ship, then tap the board — or drag it. Tap a placed ship to rotate.',
    rotate: 'Rotate', orientH: 'horizontal', orientV: 'vertical', random: 'Random', reset: 'Clear', ready: 'Ready',
    readyWait: 'Waiting for your friend to place ships…', oppAway: 'Opponent disconnected — waiting up to 5 minutes.',
    yourFleet: 'Your fleet', enemyWaters: 'Enemy waters', yourTurn: 'Your turn — tap a cell to fire', oppTurn: 'Waiting for {n} to fire…',
    youWin: 'You win!', youLose: 'You lose', winForfeit: 'Your opponent left the game.', loseForfeit: 'You left or were away too long.',
    rematch: 'Rematch', rematchWait: 'Waiting for your friend to accept…', rematchOpp: 'Your friend wants a rematch!',
    roomClosed: 'Room closed.', newRoom: 'New room', full: 'This room is full.', expired: 'This room has expired. Create a new one.',
    reconnecting: 'Reconnecting…', sunkYou: 'You sunk their {n}!', sunkThem: 'Your {n} was sunk!',
    mute: 'Mute', unmute: 'Unmute', badShip: 'Cannot place there',
  },
  th: {
    title: 'เกมเรือรบ', tagline: 'เล่นเรือรบกับเพื่อนผ่านลิงก์', nickname: 'ชื่อเล่นของคุณ',
    create: 'สร้างห้อง', join: 'เข้าห้อง', joinTitle: 'เข้าห้อง {n}', createTitle: 'เกมใหม่',
    waitingTitle: 'รอเพื่อนเข้าห้อง…', shareHint: 'ส่งลิงก์นี้ให้เพื่อน',
    copy: 'คัดลอกลิงก์', copied: 'คัดลอกแล้ว!', leave: 'ออก', confirmLeave: 'ออกตอนนี้จะนับว่าแพ้ ออกไหม?',
    placeTitle: 'วางเรือของคุณ', placeHint: 'แตะเรือแล้วแตะช่องบนกระดาน หรือลากไปวาง แตะเรือที่วางแล้วเพื่อหมุน',
    rotate: 'หมุน', orientH: 'แนวนอน', orientV: 'แนวตั้ง', random: 'สุ่ม', reset: 'ล้าง', ready: 'พร้อม',
    readyWait: 'รอเพื่อนวางเรือ…', oppAway: 'เพื่อนหลุดการเชื่อมต่อ รอได้ถึง 5 นาที',
    yourFleet: 'กองเรือของคุณ', enemyWaters: 'น่านน้ำศัตรู', yourTurn: 'ตาของคุณ — แตะช่องเพื่อยิง', oppTurn: 'รอ {n} ยิง…',
    youWin: 'คุณชนะ!', youLose: 'คุณแพ้', winForfeit: 'เพื่อนออกจากเกม', loseForfeit: 'คุณออกจากเกมหรือหลุดนานเกินไป',
    rematch: 'เล่นอีกตา', rematchWait: 'รอเพื่อนกดเล่นอีกตา…', rematchOpp: 'เพื่อนอยากเล่นอีกตา!',
    roomClosed: 'ห้องปิดแล้ว', newRoom: 'สร้างห้องใหม่', full: 'ห้องเต็ม', expired: 'ห้องหมดอายุ สร้างห้องใหม่ได้เลย',
    reconnecting: 'กำลังเชื่อมต่อใหม่…', sunkYou: 'คุณจม {n} ของศัตรู!', sunkThem: '{n} ของคุณถูกจม!',
    mute: 'ปิดเสียง', unmute: 'เปิดเสียง', badShip: 'วางตรงนี้ไม่ได้',
  },
};
let lang = store.get('bs:lang') || ((navigator.language || '').toLowerCase().startsWith('th') ? 'th' : 'en');
const t = (k, p = {}) => (I18N[lang][k] ?? k).replace(/\{(\w+)\}/g, (_, n) => p[n] ?? '');

function applyLang() {
  document.documentElement.lang = lang;
  document.title = t('title');
  $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $('#lang').textContent = lang === 'th' ? 'EN' : 'ไทย';
  $('#mute').textContent = muted() ? '🔇' : '🔊';
  $('#mute').setAttribute('aria-label', t(muted() ? 'unmute' : 'mute'));
  homeLabels();
  render();
}

// ---------- sound (synth, no assets) ----------
let ac;
const muted = () => store.get('bs:mute') === '1';
document.addEventListener('pointerdown', () => { try { ac ||= new AudioContext(); ac.resume(); } catch {} });
function tone(freq, dur, { type = 'sine', at = 0, vol = 0.15, to } = {}) {
  const o = ac.createOscillator(), g = ac.createGain(), s = ac.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(freq, s);
  if (to) o.frequency.exponentialRampToValueAtTime(to, s + dur);
  g.gain.setValueAtTime(vol, s); g.gain.exponentialRampToValueAtTime(0.001, s + dur);
  o.connect(g).connect(ac.destination); o.start(s); o.stop(s + dur);
}
function noise(dur, vol = 0.25) {
  const n = ac.sampleRate * dur, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ac.createBufferSource(), g = ac.createGain();
  g.gain.value = vol; src.buffer = buf; src.connect(g).connect(ac.destination); src.start();
}
function sound(kind) {
  if (muted() || !ac) return;
  try {
    if (kind === 'hit') { noise(0.3); tone(120, 0.3, { type: 'square', to: 40, vol: 0.2 }); }
    else if (kind === 'miss') tone(500, 0.25, { to: 150, vol: 0.12 });
    else if (kind === 'sunk') [440, 330, 220].forEach((f, i) => tone(f, 0.25, { type: 'sawtooth', at: i * 0.18, vol: 0.12 }));
    else if (kind === 'win') [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { at: i * 0.14 }));
    else if (kind === 'lose') [392, 330, 262].forEach((f, i) => tone(f, 0.35, { type: 'triangle', at: i * 0.22 }));
  } catch {}
}

// ---------- state ----------
let ws, code = null, token = null, S = null, lastSeq = null, leaving = false, fatal = false;
let fleet = [], selected = 'Carrier', orient = 'h', placingFresh = true;
const match = location.pathname.match(/^\/r\/([A-Za-z0-9]{6})$/);
const urlCode = match ? match[1].toUpperCase() : null;

const show = (s) => { document.body.dataset.screen = s; };
const send = (m) => ws && ws.readyState === 1 && ws.send(JSON.stringify(m));

function connect(onopen) {
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  ws.onopen = () => onopen && onopen();
  ws.onmessage = (e) => onMsg(JSON.parse(e.data));
  ws.onclose = () => {
    if (leaving || fatal || !code || !token) return;
    $('#conn').hidden = false;
    setTimeout(() => connect(() => send({ t: 'join', code, token })), 2000);
  };
}

function onMsg(m) {
  if (m.t === 'joined') {
    code = m.code; token = m.token;
    store.set('bs:' + code, token);
    if (location.pathname !== '/r/' + code) history.replaceState(null, '', '/r/' + code);
  } else if (m.t === 'state') { S = m; render(); }
  else if (m.t === 'left') { leaving = true; store.del('bs:' + code); location.href = '/'; }
  else if (m.t === 'error') {
    if (m.code === 'expired' || m.code === 'full') {
      fatal = true; if (code) store.del('bs:' + code); ws.close();
      $('#msgText').textContent = t(m.code); $('#msgText').dataset.key = m.code; show('msg');
    } else if (m.code === 'bad-name') $('#name').focus();
  }
}

// ---------- home ----------
function homeLabels() {
  $('#homeTitle').textContent = urlCode ? t('joinTitle', { n: urlCode }) : t('createTitle');
  $('#homeBtn').textContent = t(urlCode ? 'join' : 'create');
  $('#copy').textContent = t('copy');
  $('#rotate').textContent = `${t('rotate')}: ${t(orient === 'h' ? 'orientH' : 'orientV')}`;
  $('#placeHint').textContent = t('placeHint');
  if ($('#msgText').dataset.key) $('#msgText').textContent = t($('#msgText').dataset.key);
}
$('#name').value = store.get('bs:name') || '';
$('#homeForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#name').value.trim();
  if (!name) return;
  store.set('bs:name', name);
  connect(() => send(urlCode ? { t: 'join', code: urlCode, name } : { t: 'create', name }));
});
$('#copy').addEventListener('click', async () => {
  $('#link').select();
  try { await navigator.clipboard.writeText($('#link').value); $('#copy').textContent = t('copied'); setTimeout(homeLabels, 1500); } catch {}
});
$('#lang').addEventListener('click', () => { lang = lang === 'th' ? 'en' : 'th'; store.set('bs:lang', lang); applyLang(); });
$('#mute').addEventListener('click', () => { store.set('bs:mute', muted() ? '0' : '1'); applyLang(); });
$$('.leave').forEach((b) => b.addEventListener('click', () => {
  if (S && (S.phase === 'placing' || S.phase === 'playing') && !confirm(t('confirmLeave'))) return;
  if (!ws || ws.readyState !== 1) { location.href = '/'; return; }
  send({ t: 'leave' });
}));
$('#rematch').addEventListener('click', () => send({ t: 'rematch' }));

// ---------- boards ----------
function buildBoard(el) {
  el.innerHTML = '';
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const c = document.createElement('div');
    c.className = 'cell'; c.dataset.x = x; c.dataset.y = y; el.append(c);
  }
}
['#pboard', '#tboard', '#oboard'].forEach((s) => buildBoard($(s)));
const cellEl = (board, x, y) => $(`.cell[data-x="${x}"][data-y="${y}"]`, board);
function paint(board, marks) { // marks: {ship,hit,miss,sunk,reveal} -> Set of "x,y"
  $$('.cell', board).forEach((c) => {
    const k = `${c.dataset.x},${c.dataset.y}`;
    for (const cls of ['ship', 'hit', 'miss', 'sunk', 'reveal']) c.classList.toggle(cls, !!marks[cls]?.has(k));
  });
}
const keys = (cells) => new Set(cells.map(([x, y]) => `${x},${y}`));

// ---------- placement ----------
const fits = (ship, others) => {
  const used = keys(others.flatMap(cellsOf));
  return cellsOf(ship).every(([x, y]) => x >= 0 && y >= 0 && x < SIZE && y < SIZE && !used.has(`${x},${y}`));
};
const nextUnplaced = () => FLEET.find((s) => !fleet.some((f) => f.name === s.name))?.name ?? null;

function renderPlacing() {
  if (placingFresh) { fleet = []; selected = 'Carrier'; placingFresh = false; }
  const locked = S.youReady;
  const shown = locked ? S.myFleet : fleet;
  paint($('#pboard'), { ship: keys(shown.flatMap(cellsOf)) });
  const tray = $('#tray');
  tray.innerHTML = '';
  if (!locked) for (const s of FLEET) {
    if (fleet.some((f) => f.name === s.name)) continue;
    const d = document.createElement('div');
    d.className = 'tship' + (selected === s.name ? ' sel' : '');
    d.dataset.ship = s.name;
    d.innerHTML = '<i></i>'.repeat(s.size);
    tray.append(d);
  }
  $('#placeBtns').hidden = locked;
  $('#ready').disabled = fleet.length !== FLEET.length;
  $('#placeStatus').textContent = locked ? t('readyWait') : (S.oppConnected ? '' : t('oppAway'));
}

let drag = null;
const boardCell = (e) => {
  const r = $('#pboard').getBoundingClientRect();
  const x = Math.floor(((e.clientX - r.left) / r.width) * SIZE), y = Math.floor(((e.clientY - r.top) / r.height) * SIZE);
  return x >= 0 && y >= 0 && x < SIZE && y < SIZE ? [x, y] : null;
};
const clearGhost = () => $$('#pboard .ghost-ok, #pboard .ghost-bad').forEach((c) => c.classList.remove('ghost-ok', 'ghost-bad'));
const candidate = (e, d) => {
  const c = boardCell(e);
  if (!c) return null;
  const h = d.dir === 'h';
  return { name: d.name, x: h ? c[0] - d.off : c[0], y: h ? c[1] : c[1] - d.off, dir: d.dir };
};
const flash = (x, y) => { const c = cellEl($('#pboard'), x, y); if (c) { c.classList.add('ghost-bad'); setTimeout(() => c.classList.remove('ghost-bad'), 300); } };

document.addEventListener('pointerdown', (e) => {
  if (!S || S.phase !== 'placing' || S.youReady) return;
  const base = { sx: e.clientX, sy: e.clientY, moved: false };
  const tship = e.target.closest('.tship');
  const cell = e.target.closest('#pboard .cell');
  if (tship) drag = { ...base, name: tship.dataset.ship, off: 0, dir: orient, fromGrid: false };
  else if (cell) {
    const x = +cell.dataset.x, y = +cell.dataset.y;
    const ship = fleet.find((s) => cellsOf(s).some(([cx, cy]) => cx === x && cy === y));
    drag = ship
      ? { ...base, name: ship.name, off: ship.dir === 'h' ? x - ship.x : y - ship.y, dir: ship.dir, fromGrid: true, orig: { ...ship } }
      : { ...base, tap: [x, y] };
  } else return;
  e.preventDefault();
});
document.addEventListener('pointermove', (e) => {
  if (!drag || drag.tap) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) {
    drag.moved = true;
    if (drag.fromGrid) { fleet = fleet.filter((s) => s.name !== drag.name); renderPlacing(); }
  }
  if (!drag.moved) return;
  clearGhost();
  const c = candidate(e, drag);
  if (!c) return;
  const ok = fits(c, fleet);
  cellsOf(c).forEach(([x, y]) => { const el = x >= 0 && y >= 0 && x < SIZE && y < SIZE && cellEl($('#pboard'), x, y); el && el.classList.add(ok ? 'ghost-ok' : 'ghost-bad'); });
});
function endDrag(e, cancelled) {
  if (!drag) return;
  const d = drag; drag = null; clearGhost();
  if (d.moved) {
    const c = !cancelled && candidate(e, d);
    if (c && fits(c, fleet)) { fleet.push({ name: c.name, x: c.x, y: c.y, dir: c.dir }); if (selected === c.name) selected = nextUnplaced(); }
    else if (d.fromGrid) fleet.push(d.orig);
  } else if (d.tap) {
    if (selected) {
      const c = { name: selected, x: d.tap[0], y: d.tap[1], dir: orient };
      if (fits(c, fleet)) { fleet.push(c); selected = nextUnplaced(); } else flash(...d.tap);
    }
  } else if (d.fromGrid) {
    const others = fleet.filter((s) => s.name !== d.name);
    const turned = { ...d.orig, dir: d.orig.dir === 'h' ? 'v' : 'h' };
    if (fits(turned, others)) fleet = [...others, turned]; else flash(d.orig.x, d.orig.y);
  } else selected = d.name;
  renderPlacing();
}
document.addEventListener('pointerup', (e) => endDrag(e, false));
document.addEventListener('pointercancel', (e) => endDrag(e, true));

$('#rotate').addEventListener('click', () => { orient = orient === 'h' ? 'v' : 'h'; homeLabels(); });
$('#random').addEventListener('click', () => { fleet = randomFleet(); selected = null; renderPlacing(); });
$('#reset').addEventListener('click', () => { fleet = []; selected = 'Carrier'; renderPlacing(); });
$('#ready').addEventListener('click', () => send({ t: 'place', fleet }));

// ---------- play ----------
function renderPlay() {
  const over = S.phase === 'over';
  $('#play').dataset.turn = over ? 'over' : S.myTurn ? 'me' : 'opp';
  const turn = $('#turn');
  turn.className = 'status' + (S.myTurn && !over ? ' me' : '');
  turn.textContent = over ? '' : !S.oppConnected ? t('oppAway') : S.myTurn ? t('yourTurn') : t('oppTurn', { n: S.names[1] });

  // A forfeit during placement has no game, so these may be absent.
  const myFleet = S.myFleet ?? [], incoming = S.incoming ?? [], outgoing = S.outgoing ?? [], oppSunk = S.oppSunk ?? [];
  const hits = (list, v) => keys(list.filter((s) => s[2] === v).map(([x, y]) => [x, y]));
  const own = { ship: keys(myFleet.flatMap(cellsOf)), hit: hits(incoming, true), miss: hits(incoming, false) };
  own.sunk = keys(myFleet.filter((s) => cellsOf(s).every(([x, y]) => own.hit.has(`${x},${y}`))).flatMap(cellsOf));
  paint($('#oboard'), own);

  const sunkCells = keys(oppSunk.flatMap((s) => s.cells));
  const tgt = { hit: hits(outgoing, true), miss: hits(outgoing, false), sunk: sunkCells };
  if (over && S.reveal) tgt.reveal = keys(S.reveal.flatMap(cellsOf).filter(([x, y]) => !sunkCells.has(`${x},${y}`)));
  paint($('#tboard'), tgt);
  $('#tboard').classList.toggle('live', !!S.myTurn && !over);

  const sunkNames = new Set(oppSunk.map((s) => s.name));
  $('#enemy').innerHTML = FLEET.map((s) => `<div class="eship${sunkNames.has(s.name) ? ' sunk' : ''}">${'<i></i>'.repeat(s.size)}</div>`).join('');

  if (over) {
    const won = S.winner === S.seat;
    $('#overTitle').textContent = t(won ? 'youWin' : 'youLose');
    $('#overSub').textContent = S.reason === 'forfeit' ? t(won ? 'winForfeit' : 'loseForfeit') : '';
    const canRematch = !S.closed;
    $('#rematch').hidden = !canRematch;
    $('#rematch').disabled = S.rematch[0];
    $('#newRoom').hidden = canRematch;
    if (canRematch && S.rematch[0]) $('#overSub').textContent = t('rematchWait');
    else if (canRematch && S.rematch[1]) $('#overSub').textContent = t('rematchOpp');
    else if (S.closed && S.reason !== 'forfeit') $('#overSub').textContent = t('roomClosed');
  }
}
$('#tboard').addEventListener('click', (e) => {
  const c = e.target.closest('.cell');
  if (!c || !S || !S.myTurn || S.phase !== 'playing' || c.classList.contains('hit') || c.classList.contains('miss')) return;
  send({ t: 'fire', x: +c.dataset.x, y: +c.dataset.y });
});

// ---------- effects ----------
function fx(el, cls, ms = 800) { if (!el) return; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); }
function toast(text) {
  const el = $('#toast'); el.textContent = text; el.classList.add('show');
  clearTimeout(toast.id); toast.id = setTimeout(() => el.classList.remove('show'), 1900);
}
function confetti() {
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('span');
    s.className = 'confetti';
    s.style.cssText = `left:${Math.random() * 100}vw;background:hsl(${Math.random() * 360} 90% 60%);animation-delay:${Math.random() * 0.8}s;animation-duration:${2 + Math.random() * 1.5}s`;
    document.body.append(s); setTimeout(() => s.remove(), 4500);
  }
}
function runEffects() {
  if (lastSeq === null) { lastSeq = S.seq; return; }
  if (S.seq === lastSeq) return;
  lastSeq = S.seq;
  const L = S.last;
  if (!L) {
    if (S.phase === 'over' && S.winner === S.seat) { sound('win'); confetti(); }
    return;
  }
  const mine = L.by === S.seat;
  const board = $(mine ? '#tboard' : '#oboard');
  fx(cellEl(board, L.x, L.y), L.result === 'hit' ? 'fx-hit' : 'fx-miss');
  if (L.result === 'hit') { fx(board, 'shake', 400); sound('hit'); } else sound('miss');
  if (L.sunk) {
    const cells = mine ? S.oppSunk.find((s) => s.name === L.sunk)?.cells : cellsOf(S.myFleet.find((s) => s.name === L.sunk));
    (cells || []).forEach(([x, y]) => fx(cellEl(board, x, y), 'fx-sunk', 1600));
    toast(t(mine ? 'sunkYou' : 'sunkThem', { n: L.sunk }));
    setTimeout(() => sound('sunk'), 250);
  }
  if (L.win) setTimeout(() => { sound(mine ? 'win' : 'lose'); if (mine) confetti(); }, 700);
}

function render() {
  if (!S) return;
  $('#conn').hidden = true;
  if (S.phase !== 'placing') placingFresh = true;
  if (S.phase === 'waiting') { show('waiting'); $('#link').value = `${location.origin}/r/${S.code}`; }
  else if (S.phase === 'placing') { show('placing'); renderPlacing(); }
  else { show('play'); renderPlay(); }
  runEffects();
}

// ---------- boot ----------
applyLang();
const saved = urlCode && store.get('bs:' + urlCode);
if (saved) { code = urlCode; token = saved; connect(() => send({ t: 'join', code, token })); }
else if (urlCode) $('#name').focus();

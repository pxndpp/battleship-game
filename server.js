// Battleship server: static files + WebSocket rooms. State lives in memory only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { randomInt, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { cellsOf, validateFleet, newGame, fire } from './public/game.js';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const PORT = process.env.PORT || 3000;
const FORFEIT_MS = Number(process.env.FORFEIT_MS) || 5 * 60 * 1000;
const IDLE_MS = 6 * 60 * 60 * 1000;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

const rooms = new Map();

// ---------- HTTP ----------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let file;
  try { file = url.pathname.startsWith('/r/') || url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname); }
  catch { res.writeHead(400).end(); return; } // malformed %-escape must not crash the server
  const full = path.normalize(path.join(PUBLIC, file));
  if (!full.startsWith(PUBLIC + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

// ---------- Rooms ----------
const newCode = () => {
  for (;;) {
    const c = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
    if (!rooms.has(c)) return c;
  }
};

const newPlayer = (name) => ({ token: randomUUID(), name, ws: null, fleet: null, ready: false, rematch: false, timer: null });
const cleanName = (n) => (typeof n === 'string' ? Array.from(n.trim()).slice(0, 16).join('') : '');
const send = (ws, msg) => ws && ws.readyState === 1 && ws.send(JSON.stringify(msg));

function view(room, seat) {
  const me = room.players[seat];
  const opp = room.players[1 - seat];
  const g = room.game;
  const v = {
    t: 'state', code: room.code, seat, phase: room.phase, closed: room.closed,
    names: [me.name, opp ? opp.name : null], oppConnected: !!(opp && opp.ws),
    youReady: me.ready, oppReady: !!(opp && opp.ready),
    rematch: [me.rematch, !!(opp && opp.rematch)],
    winner: room.winner, reason: room.reason, seq: room.seq, last: room.last,
    myFleet: me.fleet,
  };
  if (g) {
    const mine = g.fleets[seat], theirs = g.fleets[1 - seat];
    const mark = (shots, fleet) => {
      const occ = new Set(fleet.flatMap(cellsOf).map(([x, y]) => `${x},${y}`));
      return [...shots].map((k) => [...k.split(',').map(Number), occ.has(k)]);
    };
    v.myTurn = g.turn === seat && g.winner === null;
    v.outgoing = mark(g.shots[seat], theirs);
    v.incoming = mark(g.shots[1 - seat], mine);
    v.oppSunk = theirs.filter((s) => cellsOf(s).every(([x, y]) => g.shots[seat].has(`${x},${y}`))).map((s) => ({ name: s.name, cells: cellsOf(s) }));
    if (room.phase === 'over') v.reveal = theirs;
  }
  return v;
}

function broadcast(room) {
  room.touched = Date.now();
  room.players.forEach((p, i) => p && send(p.ws, view(room, i)));
}

function endByForfeit(room, loser) {
  if (room.phase !== 'placing' && room.phase !== 'playing') return;
  room.phase = 'over';
  room.winner = 1 - loser;
  room.reason = 'forfeit';
  room.closed = true;
  room.seq++;
  room.last = null;
}

function maybeDelete(room) {
  if (room.players.every((p) => !p || !p.ws)) {
    room.players.forEach((p) => p && clearTimeout(p.timer));
    rooms.delete(room.code);
  }
}

function onClose(ws) {
  const room = ws.room;
  if (!room) return;
  const p = room.players[ws.seat];
  if (!p || p.ws !== ws) return; // replaced by a reconnect
  p.ws = null;
  if (room.phase === 'waiting') { clearTimeout(p.timer); p.timer = setTimeout(() => rooms.delete(room.code), FORFEIT_MS); return; }
  broadcast(room);
  clearTimeout(p.timer);
  p.timer = setTimeout(() => {
    p.timer = null;
    endByForfeit(room, ws.seat);
    broadcast(room);
    maybeDelete(room);
  }, FORFEIT_MS);
}

function attach(ws, room, seat) {
  const p = room.players[seat];
  if (p.ws && p.ws !== ws) { p.ws.room = null; p.ws.close(); }
  clearTimeout(p.timer);
  p.timer = null;
  p.ws = ws;
  ws.room = room;
  ws.seat = seat;
  send(ws, { t: 'joined', code: room.code, token: p.token, seat });
  broadcast(room);
}

function startGameIfReady(room) {
  const [a, b] = room.players;
  if (room.phase !== 'placing' || !a?.ready || !b?.ready) return;
  room.first ??= randomInt(2);
  room.game = newGame(a.fleet, b.fleet, room.first);
  room.phase = 'playing';
  room.seq++;
  room.last = null;
}

function handle(ws, msg) {
  const err = (code) => send(ws, { t: 'error', code });
  if (msg.t === 'create') {
    const name = cleanName(msg.name);
    if (!name) return err('bad-name');
    if (ws.room) return;
    const room = { code: newCode(), players: [newPlayer(name), null], phase: 'waiting', game: null, first: null, winner: null, reason: null, closed: false, seq: 0, last: null, touched: Date.now() };
    rooms.set(room.code, room);
    return attach(ws, room, 0);
  }
  if (msg.t === 'join') {
    if (ws.room) return;
    const room = rooms.get(String(msg.code || '').toUpperCase());
    if (!room) return err('expired');
    const seat = room.players.findIndex((p) => p && msg.token && p.token === msg.token);
    if (seat >= 0) return attach(ws, room, seat);
    if (room.players[1]) return err('full');
    const name = cleanName(msg.name);
    if (!name) return err('bad-name');
    room.players[1] = newPlayer(name);
    room.phase = 'placing';
    return attach(ws, room, 1);
  }

  const room = ws.room;
  if (!room) return err('no-room');
  const me = room.players[ws.seat];

  if (msg.t === 'place') {
    if (room.phase !== 'placing' || me.ready) return err('bad-phase');
    const e = validateFleet(msg.fleet);
    if (e) return err(e);
    me.fleet = msg.fleet.map(({ name, x, y, dir }) => ({ name, x, y, dir }));
    me.ready = true;
    startGameIfReady(room);
    return broadcast(room);
  }
  if (msg.t === 'fire') {
    if (room.phase !== 'playing') return err('bad-phase');
    const r = fire(room.game, ws.seat, msg.x, msg.y);
    if (r.error) return err(r.error);
    room.seq++;
    room.last = { by: ws.seat, x: msg.x, y: msg.y, result: r.result, sunk: r.sunk, win: r.win };
    if (r.win) { room.phase = 'over'; room.winner = ws.seat; room.reason = 'sunk'; }
    return broadcast(room);
  }
  if (msg.t === 'rematch') {
    if (room.phase !== 'over' || room.closed) return err('bad-phase');
    me.rematch = true;
    const [a, b] = room.players;
    if (a.rematch && b.rematch) {
      room.first = 1 - room.first; // loser-of-coin-toss from last game shoots first
      room.phase = 'placing';
      room.game = null; room.winner = null; room.reason = null; room.last = null; room.seq++;
      for (const p of room.players) { p.fleet = null; p.ready = false; p.rematch = false; }
    }
    return broadcast(room);
  }
  if (msg.t === 'leave') {
    if (room.phase === 'waiting') { rooms.delete(room.code); }
    else {
      endByForfeit(room, ws.seat);
      room.closed = true;
      me.ws = null;
      clearTimeout(me.timer);
      broadcast(room);
      maybeDelete(room);
    }
    ws.room = null;
    return send(ws, { t: 'left' });
  }
}

const wss = new WebSocketServer({ server, maxPayload: 4096 });
wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg && typeof msg === 'object') handle(ws, msg);
  });
  ws.on('close', () => onClose(ws));
  ws.on('error', () => {});
});

setInterval(() => {
  for (const [code, room] of rooms) if (Date.now() - room.touched > IDLE_MS) rooms.delete(code);
}, 60 * 60 * 1000).unref();

server.listen(PORT, () => console.log(`Battleship on http://localhost:${PORT}`));

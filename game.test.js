import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFleet, randomFleet, newGame, fire, cellsOf } from './public/game.js';

// Each ship on its own row, starting at column 0.
const rows = () => [
  { name: 'Carrier', x: 0, y: 0, dir: 'h' },
  { name: 'Battleship', x: 0, y: 1, dir: 'h' },
  { name: 'Cruiser', x: 0, y: 2, dir: 'h' },
  { name: 'Submarine', x: 0, y: 3, dir: 'h' },
  { name: 'Destroyer', x: 0, y: 4, dir: 'h' },
];

test('valid fleet passes, touching allowed', () => {
  assert.equal(validateFleet(rows()), null);
});

test('invalid placements are rejected', () => {
  const bad = (mut) => { const f = rows(); mut(f); return validateFleet(f); };
  assert.ok(bad((f) => f.pop()), 'missing ship');
  assert.ok(bad((f) => (f[4].name = 'Carrier')), 'duplicate ship');
  assert.ok(bad((f) => (f[0].x = 6)), 'out of bounds');
  assert.ok(bad((f) => Object.assign(f[4], { x: 0, y: 0, dir: 'v' })), 'overlap');
  assert.ok(bad((f) => (f[0].dir = 'd')), 'diagonal');
  assert.ok(bad((f) => (f[0].x = 1.5)), 'non-integer');
  assert.ok(validateFleet(null), 'not an array');
});

test('randomFleet is always valid', () => {
  for (let i = 0; i < 200; i++) assert.equal(validateFleet(randomFleet()), null);
});

test('hit, miss, sunk, repeat, out of turn, win', () => {
  const g = newGame(rows(), rows(), 0);
  assert.deepEqual(fire(g, 1, 9, 9), { error: 'not-your-turn' });
  assert.deepEqual(fire(g, 0, 9, 9), { result: 'miss', sunk: null, win: false });
  assert.equal(g.turn, 1);
  assert.equal(fire(g, 1, 0, 4).result, 'hit');
  assert.deepEqual(fire(g, 0, 9, 9), { error: 'repeat' });
  assert.equal(g.turn, 0, 'repeat shot does not lose the turn');
  assert.deepEqual(fire(g, 0, 10, 0), { error: 'bad-cell' });
  fire(g, 0, 0, 4);
  assert.deepEqual(fire(g, 1, 1, 4), { result: 'hit', sunk: 'Destroyer', win: false });

  // Player 0 sinks everything; player 1 fires at the empty last row.
  let last, miss = 0;
  for (const s of rows()) for (const [x, y] of cellsOf(s)) {
    if (g.shots[0].has(`${x},${y}`)) continue;
    if (g.turn === 1) { fire(g, 1, miss % 10, 9 - Math.floor(miss / 10)); miss++; }
    last = fire(g, 0, x, y);
  }
  assert.equal(last.win, true);
  assert.equal(g.winner, 0);
  assert.deepEqual(fire(g, 1, 9, 8), { error: 'over' });
});

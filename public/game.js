// Pure game rules. Shared by server (authority) and client (placement UI).
export const SIZE = 10;
export const FLEET = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 },
];

const sizeOf = (name) => FLEET.find((s) => s.name === name)?.size;

// ship = { name, x, y, dir: 'h' | 'v' } -> [[x, y], ...]
export function cellsOf(ship) {
  const n = sizeOf(ship.name);
  return Array.from({ length: n }, (_, i) =>
    ship.dir === 'h' ? [ship.x + i, ship.y] : [ship.x, ship.y + i]);
}

// Returns null when valid, else an error string.
export function validateFleet(fleet) {
  if (!Array.isArray(fleet) || fleet.length !== FLEET.length) return 'bad-fleet';
  const names = new Set();
  const used = new Set();
  for (const s of fleet) {
    if (!s || sizeOf(s.name) === undefined || names.has(s.name)) return 'bad-fleet';
    names.add(s.name);
    if (!Number.isInteger(s.x) || !Number.isInteger(s.y) || (s.dir !== 'h' && s.dir !== 'v')) return 'bad-ship';
    for (const [x, y] of cellsOf(s)) {
      if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return 'out-of-bounds';
      if (used.has(`${x},${y}`)) return 'overlap';
      used.add(`${x},${y}`);
    }
  }
  return null;
}

export function randomFleet() {
  for (;;) {
    const fleet = [];
    const used = new Set();
    let ok = true;
    for (const { name } of FLEET) {
      let placed = false;
      for (let tries = 0; tries < 100 && !placed; tries++) {
        const s = { name, x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE), dir: Math.random() < 0.5 ? 'h' : 'v' };
        const cells = cellsOf(s);
        if (cells.every(([x, y]) => x < SIZE && y < SIZE && !used.has(`${x},${y}`))) {
          cells.forEach(([x, y]) => used.add(`${x},${y}`));
          fleet.push(s);
          placed = true;
        }
      }
      if (!placed) { ok = false; break; }
    }
    if (ok) return fleet;
  }
}

// shots[p] = cells fired BY player p at the opponent.
export function newGame(fleet0, fleet1, first) {
  return { fleets: [fleet0, fleet1], shots: [new Set(), new Set()], turn: first, winner: null };
}

export function fire(g, p, x, y) {
  if (g.winner !== null) return { error: 'over' };
  if (g.turn !== p) return { error: 'not-your-turn' };
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= SIZE || y >= SIZE) return { error: 'bad-cell' };
  const key = `${x},${y}`;
  if (g.shots[p].has(key)) return { error: 'repeat' };
  g.shots[p].add(key);
  const target = g.fleets[1 - p];
  const ship = target.find((s) => cellsOf(s).some(([cx, cy]) => cx === x && cy === y));
  let sunk = null;
  if (ship && cellsOf(ship).every(([cx, cy]) => g.shots[p].has(`${cx},${cy}`))) sunk = ship.name;
  const win = target.every((s) => cellsOf(s).every(([cx, cy]) => g.shots[p].has(`${cx},${cy}`)));
  if (win) g.winner = p; else g.turn = 1 - p;
  return { result: ship ? 'hit' : 'miss', sunk, win };
}

# Battleship web app — implementation plan

Spec: the agreed decisions Q1–Q28 (summarised below). Vocabulary: `GLOSSARY.md`.

## Spec summary

- Online, 2 Players per Room, link `/r/XXXXXX` (6 chars, alphabet without 0/O/1/I). Third visitor sees "room full".
- 10×10 Grid; Fleet Carrier 5, Battleship 4, Cruiser 3, Submarine 3, Destroyer 2. Ships horizontal/vertical, may touch, no overlap.
- One Shot per Turn, Turns alternate. No repeat Shots (server rejects, Turn not lost). Hit does not reveal which Ship; Sunk announces the Ship name.
- Random first shooter; on Rematch the first shooter swaps.
- Server-authoritative: Node + `ws`, in-memory Rooms, no DB. Server restart → "room expired, create new".
- Client: vanilla HTML/CSS/JS, no build. Mobile + desktop. Placement by tap and by drag (Pointer Events); tap a placed Ship to rotate; Random + Ready buttons.
- Play screen: own Grid with incoming Shots, target Grid, enemy remaining Ships as shapes only (no names). Target Grid larger on your Turn (mobile).
- Effects (CSS only): Hit explosion + light shake, Miss splash, Sunk flash + banner with name, Win celebration. Synth sounds + mute. Respect `prefers-reduced-motion`.
- TH/EN toggle, default from browser, remembered in `localStorage`. Ship names stay English.
- No login; nickname 1–16 chars, duplicates allowed.
- Reconnect within 5 min via token in `localStorage`; > 5 min disconnected = Forfeit. "Leave" button = immediate Forfeit and Room closes.
- Game end reveals the opponent's un-sunk Ships; Rematch when both agree.
- One `node:test` file for server rules. UI tested by hand.
- Deploy target: Render free tier (`npm start`, `PORT` env).

## Tasks

1. **Game rules** — `public/game.js` (shared by server and client): `FLEET`, `SIZE`, `cellsOf`, `validateFleet`, `randomFleet`, `newGame`, `fire`. Test: `game.test.js` (`node --test`) covers invalid placement, Hit/Miss/Sunk, repeat Shot, out-of-turn Shot, Win.
2. **Room server** — `server.js`: static files, `/r/:code` → `index.html`, WebSocket protocol (join, place, fire, rematch, leave), per-Player state views, disconnect timer, Forfeit, room full/expired.
3. **Client UI** — `public/index.html`, `public/style.css`, `public/app.js`: home/join, waiting (copy link), placement (tap + drag + rotate + random + ready), play, game over (reveal, rematch).
4. **Effects, sound, i18n** — CSS animations, WebAudio synth, mute, TH/EN.
5. **Verify** — run locally, two browser tabs play a full game.

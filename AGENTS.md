## Development

Start the dev server (http://localhost:5173/):

```
npm run dev
```

Run it in the background so it doesn't block the session, and stop it
when you're done. It also starts the Worker for online play (`wrangler
dev` on port 8787, the `workerDev` plugin in `vite.config.ts`), and Vite
forwards `/api` and `/ws` to it — so the page and its WebSocket share
one origin, like in production. Rooms created in development live in
`.wrangler/state/`.

## Documentation

Consult these before working on related tasks:

- [Vue](https://vuejs.org/guide/) — `<script setup>` and the reactivity API
- [Vue Router](https://router.vuejs.org/guide/)
- [Vite](https://vite.dev/guide/) — config, `base`, static assets and the `public/` directory
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Node test runner](https://nodejs.org/api/test.html)
- Cloudflare: [static assets](https://developers.cloudflare.com/workers/static-assets/)
  (`run_worker_first`, `not_found_handling`), [Durable
  Objects](https://developers.cloudflare.com/durable-objects/) (the
  [WebSocket hibernation API](https://developers.cloudflare.com/durable-objects/best-practices/websockets/),
  alarms, [pricing and the free plan](https://developers.cloudflare.com/durable-objects/platform/pricing/))

# 30 Seconds

A browser clone of the Dutch party game *30 Seconds*, Dutch only, live at
https://thirty-seconds-clone.nickhuijgen.nl/. The active player sees five
words (one person, place, wildcard, film/series/song and brand) and has
30 seconds to describe them to their teammates; afterwards they tick the
words that were guessed, and each guessed word is one point. First team
to the target score wins. Two ways to play, chosen on the welcome screen:

- **On one phone** (`/game`): the phone is passed around the table. No
  server, works offline, a saved game survives a reload.
- **Online** (`/online`): every player on their own phone, in a room the
  host made, joined with a 4-character code. The words reach only the
  describer's phone; the timer runs in sync on every phone. See Online
  play.

A Vue 3 single-page app (`<script setup>`, Vue Router) built with Vite,
styled with Tailwind CSS v4. `npm run build` produces a static site in
`dist/`; a Cloudflare Worker serves it and, for online play only, runs
the rooms (`server/`, one Durable Object per room). Cloudflare's Git
integration type-checks, tests, builds and deploys it on every push to
`main` — pushing to `main` *is* deploying.

Started in October 2024 from the Nuxt 3 starter. In October 2026 it
moved to Tailwind 4, saved games moved from cookies to `localStorage`,
it got tests, a web app manifest, a screen wake lock and offline support — and Nuxt was
replaced by plain Vue + Vite. Nuxt ran here as a client-only SPA
(`ssr: false`) and only `<NuxtPage>`/`<NuxtLink>` were used, while its
server layer brought ~470 extra packages and every remaining `npm audit`
finding. Don't bring it back for convenience. In November 2026 online
play added the one backend: the same Worker that serves the site, with a
Durable Object per room (see Online play).

## Priorities

**This project is for mobile users.** The game is played on one phone
handed from player to player, often in a noisy room. Desktop browsers are
only ever used for testing — there is no desktop audience to design for.
When a change trades mobile usability off against anything else, mobile
wins; never make a choice that only looks or works right on desktop.

- Design and check at a real phone width (360–430px). Desktop only needs
  to not be broken; don't spend effort on desktop-specific layouts,
  hover-only affordances or keyboard shortcuts as a primary interaction.
- Touch first: every control must work by tap, and `hover:` styles are
  decoration only, never the only way to discover something. (Tailwind 4
  only applies `hover:` on devices that can hover, so on phones they
  don't fire at all.)
- Large tap targets and readable words at arm's length — the active
  player is glancing at the screen while talking.
- Nothing should be accidentally triggerable mid-turn. Tapping the timer
  circle ends the turn early (`forceEndTurn()`, online `endTurnEarly`);
  keep that deliberate, don't add other one-tap destructive actions
  during a turn.
- A refresh or a locked screen must not lose the game: that's what the
  saved game is for (see Persistence), and the wake lock keeps the screen
  on in the first place. Don't break "Ga verder met bestaand spel".
  Online, a refreshed or reconnected phone goes back to its own seat.
- The one-phone mode stays a full option with no server at all: it must
  keep working offline, whatever online play needs.
- It should feel like an app when added to the home screen: the manifest
  opens it standalone, in portrait, with the emerald theme colour, and
  after one visit it works without a connection (see Offline) — parties
  don't always have signal.
- Keep it light: no new client libraries for things Vue already does.

## Invariants

Places that have to say the same thing or it silently breaks. Marked
**[test]** where `npm test` now catches it; the rest are still on you.

| If you change… | …also check | Why |
|---|---|---|
| **[test]** Any field on `Game`, `Team` or `Player` that must survive a reload | `save()` / `loadSaved()` in `models/Game.ts` | The save lists every field by hand and loading rebuilds `Team`/`Player` objects field by field. A new field is silently dropped on reload (it gets its constructor default). `test/game.test.ts` pins the saved keys and the round trip, so a new field means updating both methods *and* that test. |
| **[test]** A word list in `public/*.json` | `test/words.test.ts` | Format, no duplicates within or across lists (case- and accent-insensitive), at least 100 words each. Use the `edit-words` skill. |
| **[test]** Any field on `Game`, `Team` or `Player` that online play needs | `toSaved()` / `applySaved()`, and `RoomData` + `loadGame()`/`storeGame()` in `server/rules.ts` | The room stores the same shape as the local save (`room.game`), plus what that leaves out (`active_words`, `is_applying_score`, `last_turn`) as separate `RoomData` fields. A field in neither is lost between two messages, because every message rebuilds the `Game` from storage. `test/rules.test.ts` round-trips a room through JSON. |
| The messages between phone and room | `server/protocol.ts` | The one place both sides import their message types from. The server's `handle()` switch and the client's `receive()` switch must cover the same `type`s; a field renamed on one side only is a type error (`npm run check` and `npm run check:server`). |
| A new path the Worker answers | `run_worker_first` in `wrangler.jsonc`, `ONLINE_PATHS` in `pwa/service-worker.js`, the Vite `server.proxy` | `run_worker_first` decides which requests reach the Worker at all; anything else is answered by the static assets (usually `index.html`). The service worker must pass the same paths to the network, and the dev proxy must forward them to `wrangler dev`. |
| The set of categories | `CATEGORIES` and `Game.emptyWordLists()` in `models/Game.ts`, `utils/words.ts`, `CATEGORY_INFO` in `utils/categories.ts`, and a `public/<category>.json` | Everything else loops over `CATEGORIES`. The `WordLists` and `Record<Category, …>` types make a missing key a type error (`npm run check`). The word cards rely on `active_words` being in `CATEGORIES` order to pick each card's icon. |
| `TEAM_COLOURS` (`models/Team.ts`) | `TEAM_STYLES` in `utils/teamColours.ts` | `TEAM_STYLES` is a `Record<TeamColour, …>`, so a new colour without styles is a type error. Its classes must be written out in full (see Style). |
| `BASE` in `vite.config.ts` | Where the site is served (`wrangler.jsonc`) | The site is at the root of its own subdomain, so `BASE` is `/`. If it ever moves under a path, everything else follows `BASE`: Vite prefixes the absolute paths in `index.html` and the router and service worker registration use `import.meta.env.BASE_URL`. Keep `index.html` paths **absolute** — a relative `favicon.svg` would break on `/game/`. The manifest is the exception: its `start_url`, `scope` and icons are relative to the manifest file itself, so they stay relative. |
| `theme_color` in `public/manifest.webmanifest` | The `theme-color` meta in `index.html` and the background in `design/app-icon.svg` | The same emerald (`#047857`, Tailwind `emerald-700`), stated three times. |
| The app icon | `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | All three are rendered from `design/app-icon.svg`; the command is in a comment at the top of that file. The hourglass stays inside the middle 50%, so Android's maskable crop never cuts it. |
| `server/Room.ts` and `server/rules.ts` | Their names | They differ in more than case on purpose: macOS treats `Room.ts` and `room.ts` as the same file. |
| A component used in a template | Its `import` in that file's `<script setup>` | Nothing is auto-imported any more — not components, not `ref`/`computed`/`watch`. `strictTemplates` (`tsconfig.json`) makes an unimported component a type error, so `npm run check` catches it; without that it would just render nothing. |
| Which component shows when (`pages/game.vue`, `pages/online.vue`, `Playing.vue`) | The flags on `Game` (see Game flow) | Screens are picked purely from `is_in_progress`, `is_finished`, `is_applying_score` and `turn_timer === 0` — online too, on the `Game` that `useOnlineGame()` rebuilds from the server's state. A new state needs a flag *and* its place in those `v-if` chains. |

## Constraints

- Vue 3 SFCs with `<script setup lang="ts">` and `defineProps({...})`
  object syntax, matching the existing components. Props are typed by
  class (`type: Game`).
- All game logic lives in the model classes (`models/Game.ts`,
  `Team.ts`, `Player.ts`), used by both modes: online, the server runs
  the same models (`server/rules.ts`). What only one phone needs (sounds,
  the `setInterval` countdown, saving to `localStorage`) sits in thin
  wrappers around the rules: `startTurn()` = `beginTurn()` + sounds +
  timer, `forceEndTurn()` = `endTurn()` + sound, `finishTurn()` =
  `scoreTurn()` + `save()`, `save()`/`loadSaved()` =
  `toSaved()`/`applySaved()` + `localStorage`. The server calls only the
  rules. Components read state from the `Game` instance; the turn screens
  emit what the player did (`start-turn`, `end-turn`, `toggle-word`,
  `finish-turn`) and the page decides what that means — `pages/game.vue`
  calls the model, `pages/online.vue` sends a message.
- **The models run under plain Node** — that's what makes them testable
  without a browser or a bundler. So in `models/`:
  - imports are relative and carry the `.ts` extension
    (`import Team from './Team.ts'`), no `~` alias;
  - no imports of JSON, audio or anything Vite-specific. The word lists
    and the sound loader are passed into the `Game` constructor
    (`new Game(50, words, loadSound)` in `pages/game.vue`), from
    `utils/words.ts` and `utils/sounds.ts`;
  - only TypeScript that Node can strip: no `enum`, no `namespace`, no
    constructor parameter properties;
  - browser APIs only behind a guard: `localStorage` is used inside
    `try`/`catch` (it's missing in Node and Workers, and can throw in
    private mode);
  - no `private` members: Vue's `Ref<Game>` type drops them and then
    `ref(new Game())` no longer type-checks as a `Game`.
- **The server** (`server/`) is TypeScript bundled by Wrangler, checked
  by its own `server/tsconfig.json` (`npm run check:server`) against
  Cloudflare's types, generated by `wrangler types` into the gitignored
  `server/worker-configuration.d.ts`. The root `tsconfig.json` excludes
  `server/`, but still checks `server/protocol.ts` and `server/rules.ts`
  through their imports — so those two stay plain TypeScript with no
  browser or Cloudflare APIs, follow the model rules above, and run
  under `node --test`. Only `Room.ts` and `worker.ts` touch Cloudflare.
  `server/globals.d.ts` declares `localStorage` for the models' guarded
  use; server code never uses it.
- State is one `Game` instance in a `ref()` in `pages/game.vue` (online:
  in `useOnlineGame()`), passed down as a prop. Components mutate it through its methods (and, in the
  setup forms, `v-model` directly on `team.name` / `player.name`). There
  is no Pinia/store; don't add one without asking.
- Browser-only behaviour that isn't a game rule goes in a composable
  (`composables/useWakeLock.ts`), not in the models.
- UI copy is Dutch and lives directly in the templates. No i18n layer.
- Every import is explicit: components (`import X from
  "~/components/X.vue"`) and Vue APIs (`import { computed, ref } from
  "vue"`). `~` is an alias for the project root (`vite.config.ts` and
  `tsconfig.json` both define it — keep them in step).
- Project layout is flat, without `src/`: `index.html` and `main.ts`
  (router and mount) at the root, then `app.vue`, `pages/`,
  `components/`, `composables/`, `models/`, `utils/`, `assets/`,
  `public/`, plus `server/` (the Worker) and `pwa/` (the service
  worker).
- Code style: 4-space indent in `.ts`, 2-space in `.vue`; `snake_case`
  for model fields (`max_score`, `active_team_index`), `camelCase` for
  methods. There is no linter or formatter configured.
- `// @ts-ignore` is used above array-index accesses that TypeScript
  flags as possibly `undefined` (`noUncheckedIndexedAccess` is on).
  Prefer a real guard in new code.
- Element ids in components that render more than once (team and player
  inputs) come from `useId()`, never a literal — a literal id repeats for
  every team/player.
- Clickable things are `<button type="button">`, not a `<div>`/`<span>`
  with `@click`. Toggles carry `aria-pressed`; icon-only buttons an
  `aria-label` (the icon itself `aria-hidden`).
- Animations: no animation library. CSS transitions/keyframes for UI,
  a canvas for particle effects (`components/Confetti.vue`). Every
  animation respects `prefers-reduced-motion` (skip it, or fall back to
  an instant change), never blocks taps (`pointer-events-none` on
  overlays), and never delays the game — a player must be able to tap
  the next button while it's still running. Movement is scaled to the
  frame time, so 120 Hz phones don't play it twice as fast.

## Game flow

`pages/game.vue` creates `new Game(50, words, loadSound)` with two
default teams of two players ("Team 1", "Speler 1" …) and switches
between three screens:

1. **Setup** (`GameSetup.vue` → `TeamSetup.vue` → `PlayerSetup.vue`,
   `RemoveButton.vue`) — while `!is_in_progress && !is_finished`. Add or
   rename teams and players (minimum 2 teams, 2 players per team — the
   remove button only shows above that), pick the target score (10, 25,
   50, 100 — radio buttons styled as four tap targets). "Begin nieuw spel" calls `setUp()`: clears the saved game
   (unless restarting), shuffles teams and each team's players
   (`generateTeamIndexes()`), copies the word lists into `available`,
   sets `is_in_progress`. If a saved game exists, "Ga verder met bestaand
   spel" calls `loadSaved()` instead.
2. **Playing** (`Playing.vue`) — picks one of three sub-screens:
   - `PreTurn.vue` (`turn_timer === 0`) — the handoff screen, full-screen
     in the active team's colour: "Geef de telefoon aan **Speler 4**",
     the leaderboard, who may guess, who's next. "Start beurt" →
     `startTurn()`. Online it says "Jij bent aan de beurt" on the
     describer's phone and "Speler 4 is aan de beurt" (no button) on the
     others, and lists the previous turn's words and ticks ("Vorige
     beurt").
   - `ActiveTurn.vue` (timer running): the five words as big cards with
     their category icon (`utils/categories.ts`), and the countdown ring
     (`TURN_SECONDS`, 30), which turns amber at 10 s and red (pulsing) at
     5 s. Plays `turn-start` at the start and `vine-boom` at 1 second
     left. Tapping the ring → `forceEndTurn()`.
   - `PostTurn.vue` (`is_applying_score`): "Tijd is om!", a red flash,
     the same cards as toggles, "Klaar · N geraden" →
     `finishTurn(count)`: adds the score, records `last_turn`, checks for
     a winner, advances to the next team and saves.
3. **Post game** (`PostGame.vue`, `is_finished`): full-screen in the
   winner's colour, a confetti burst in that colour (`Confetti.vue`,
   ~5 s), the trophy, and the final leaderboard.
   "Begin opnieuw" → `restart()` keeps teams and players,
   resets scores, and goes back to setup.

Turn order: teams are shuffled once at setup and play in index order;
within a team, players rotate through their shuffled index. Both
`activeTeam()` and `activePlayer()` look objects up by their `index`
field, **not** by array position — so sorting or reordering the arrays is
safe (the leaderboard sorts a copy), but the indexes must stay `0…n-1`
and unique.

Sounds: `startTurn()` loads both sounds inside the "Start beurt" tap and
plays `vine-boom` from the timer later. Keep the loading inside the tap:
mobile browsers only allow audio that a user gesture started. Online,
**only the describer's phone plays sounds** — the same two, loaded in
the same tap (`pages/online.vue`); ten phones booming a few milliseconds
apart would sound like an echo. That also means no other phone needs a
tap to unlock audio. The other phones still vibrate (`useTurnHaptics()`,
Android).

Haptics: `useTurnHaptics()` (in `pages/game.vue`) vibrates at 5 seconds
left and when the turn ends. Android only — iOS Safari has no
`navigator.vibrate`, and nothing else depends on it.

While a game is in progress and not finished, `useWakeLock()` holds a
screen wake lock, so the phone doesn't dim or lock while it's handed
around. The browser drops it whenever the page is hidden; it's requested
again on `visibilitychange`. Where the API doesn't exist, nothing happens.

## Online play

Every player on their own phone, in one room. The server is the source
of truth for the game and its timing; the phones show what it sends and
send what the player did. The host is just a player with extra rights.

### Pieces

| Where | What |
|---|---|
| `server/worker.ts` | The Worker's `fetch`. `POST /api/rooms` makes a room with a fresh code (retrying on a clash) and returns `{ code }`; `/ws/<code>` forwards the WebSocket to that room's Durable Object; anything else under `/api/` or `/ws/` is a 404. Only these two prefixes ever run it (`run_worker_first`); the rest of the site is plain static assets, free and unchanged. |
| `server/Room.ts` | The Durable Object `Room`, one per code (`idFromName(code)`). SQLite-backed — the only kind on the Workers Free plan (`new_sqlite_classes` in the migration). Stores one value, the `RoomData`, under `room`; holds the sockets with the **hibernation API** (`ctx.acceptWebSocket`, `webSocketMessage`, `webSocketClose`, a `{ playerId }` attachment per socket), so an idle room costs nothing. Memory is wiped whenever it hibernates, so it re-reads storage. A thin layer: every decision is in `rules.ts`. |
| `server/rules.ts` | The rules, as plain functions on a `RoomData`: `join`, `disconnect`, `handle(room, playerId, message, now, words)` → `{ changed, error?, kicked? }`, `settle`, `view`, `messagesFor`, `nextAlarm`. It runs the real `Game` model: every message rebuilds a `Game` from `room.game` (`loadGame`), applies the rule, and stores it back (`storeGame`). Tested by `test/rules.test.ts` without Cloudflare. |
| `server/protocol.ts` | The message types, room-code helpers, close codes and limits, shared with the client. |
| `composables/useOnlineGame.ts` | The phone's side: one native `WebSocket`, the clock offset, the latest state, reconnecting, and a `Game` rebuilt from every state for the existing screens. |
| `pages/online.vue` | Join → lobby → the same `Playing`/`PostGame` screens as one phone, with `online`, `is-describer` and `can-score` props. `OnlineJoin.vue`, `OnlineLobby.vue`, `MemberRow.vue` are online-only. |
| `utils/clock.ts` | `clockOffset()` and `secondsLeft()`, tested in `test/clock.test.ts`. |

### Flow

1. **Join** (`/online`, or `/online/ABCD` from a shared link): name, and
   a code — empty makes a new room. Codes are 4 characters without
   O/0/I/1, case-insensitive. The first to join is the host.
2. **Lobby**: the **host decides the teams** — players can't pick their
   own. The host assigns everyone with a `<select>` per player, renames,
   adds and removes teams (minimum 2), picks the target score and starts
   ("Begin spel": teams nobody was put in are left out; at least 2 teams
   must remain, each with ≥ 2 players; anyone without a team watches).
   Everyone else sees the lobby update live.
3. **Turns**: the same three screens. Describer: "Start beurt", the
   words, tap the ring to stop, tick, "Klaar". Everyone else: who's up,
   the ring without words, then the same cards read-only with the ticks
   coming in live, and "Speler 4 telt de punten…". The describer's
   teammates get "Jij moet raden!" on the handoff screen and a big
   "Raad mee!" during the turn; everyone else (other teams, spectators)
   gets "Jij moet stil zijn" and a big "Ssst!", so nobody calls out the
   answers for them.
4. **Post game**: everyone sees the winner; only the host gets "Begin
   opnieuw" (`restart()`, same teams, back to the lobby).

### Who sees the words

During a running turn only the describer's socket gets them (a `words`
message, sent again if they reconnect mid-turn). The shared `state` has
`active_words: []` until the turn ends; from then on everyone gets the
words and `guessed` (the indexes the describer ticked), and every tick
sends a new state — that's how the other teams check the score. After
`finishTurn` the words and ticks stay in `last_turn` (`words`,
`guessed`, online only) for the next handoff screen.

### The server checks everything

Every action is checked for who sent it and the phase (`phase()`:
lobby, pre-turn, turn, scoring, finished). Host only: teams, target
score, start, restart, kick. Describer only: `startTurn`,
`endTurnEarly`, `setWord`, `finishTurn` — the host may score instead
only while the describer is disconnected. Turn actions carry the turn
number, so a late or repeated message never acts on the next turn;
`setWord` sets rather than toggles, so a repeat changes nothing. The
score is the server's own count of ticks, never a number from a phone.
Anything not allowed is dropped silently; a few things a player can
fix get a Dutch `error` (shown as a red pill).

### Protocol (JSON over WebSocket at `/ws/<code>`)

| Phone → server | |
|---|---|
| `join {name, playerId?}` | Seat by saved `playerId`, else a disconnected member with the same name, else a new seat (max 20, unique names). |
| `ping {t0}` | Clock sync, answered straight away. |
| `leave` | "Verlaat lobby": out of the room for good (see Leaving). |
| `setMaxScore`, `addTeam`, `removeTeam`, `renameTeam`, `assignPlayer {playerId, teamIndex}`, `kick`, `start`, `restart` | Host. `teamIndex` is the position in `game.teams`. |
| `startTurn`, `endTurnEarly`, `setWord {index, guessed}`, `finishTurn` (all with `turn`) | Describer. |

| Server → phone | |
|---|---|
| `welcome {playerId, state}` | After `join`; the phone stores `{code, playerId, name}`. |
| `state {…}` | After every change, to everyone: `RoomView` — members, teams and scores (without the remaining word lists), `turn`, `describer_id`, `ends_at`, `active_words`, `guessed`, `last_turn`. |
| `words {turn, words}` | Only to the describer, while their turn runs. |
| `pong {t0, server}` | |
| `error {message}` | Dutch, shown as a red pill: a refused action, or a notice to everyone (a team or the game stopped). After "Lobby niet gevonden"/"Deze lobby is verlopen" the socket closes with `4404`, after being removed by the host with `4403`, and the phone goes back to the join screen. A `leave` closes that player's other tabs with `4410`. |

### Timing

Nothing is sent every second. `startTurn` sets `ends_at = now +
TURN_SECONDS·1000 + 500` (server epoch ms; the 500 ms gets the start to
every phone before the countdown runs) and every phone counts down to
it: `secondsLeft(ends_at, Date.now(), offset)` feeds the same ring,
urgency colours, announcements and haptics. The offset comes from five
pings on connect, every 30 s and after a reconnect: per ping `offset =
server − (t0 + t1) / 2`, keeping the one with the shortest round trip.

The server ends the turn itself with the Durable Object's alarm, so it
ends even if every phone is closed. A Durable Object has **one** alarm,
so it's always set to whichever comes first: the end of the turn or the
room's expiry (`nextAlarm()`), and `alarm()` works out which it was.
Alarms can fire a little late, so every message first runs `settle()`,
which ends a turn whose `ends_at` has passed — the describer's first
tick is never refused. A phone whose ring reaches 0 shows the scoring
screen straight away; the server's state follows within moments.

### Connections and seats

- A phone stores `{code, playerId, name}` in `localStorage` under
  `thirty-seconds-online` (`SESSION_KEY`) — never under the one-phone
  key. Opening `/online` (or that room's link) with it reconnects to the
  same seat. Two tabs in one browser share it, so testing several
  players in one browser needs separate profiles or private windows.
- Lost connections retry with backoff (0.5 s doubling to 10 s), and
  immediately when the page becomes visible again or the browser comes
  back online. "Verbinding herstellen…" shows meanwhile.
- The host leaving passes the host to whoever has been connected
  longest; coming back doesn't take it back.
- The describer *losing their connection* mid-turn doesn't stop the
  turn; back in time, they get the words again. If not, the host scores
  the turn. If they're gone at their next "Start beurt", the host can
  remove them from the game.
- Someone joining mid-game watches until the host gives them a seat
  ("Nieuwe spelers" near the top of the host's handoff screen, the
  `pre-turn-top` slot); they join the end of
  that team's rotation. Seats can't move between teams mid-game.
- A room is deleted (alarm, `deleteAll()`) 4 hours after the last thing
  that changed it, like a saved game on one phone. An unknown or
  expired code answers "Lobby niet gevonden".
- Without a connection the join screen says "Online spelen heeft
  internet nodig" and links to the one-phone mode.

### Leaving

Losing the connection keeps a seat; leaving gives it up. "Verlaat lobby"
(`LeaveButton.vue`: small and muted, and it asks "Weet je het zeker?" in
a `<dialog>` first, `ConfirmDialog.vue`) sends `leave` before closing,
and the server takes the player out right away — `removeMember()` in
`server/rules.ts`, the same as the host removing someone. Removing
someone asks first too: the host's ✕ in the member list and "Haal …
uit het spel" open the same `ConfirmDialog.vue`. **The game never waits
for someone who left:**

- **First: can the game go on?** Counting only teams that still have
  at least 2 players (`MIN_TEAM_SIZE`): with fewer than 2 such teams or
  fewer than 4 players in them (`MIN_PLAYERS`), the game stops. Back to
  the lobby, scores reset like "Begin opnieuw", and **every team stays**
  — including one that's now a player short — so the host can share
  the players out again. No team is dropped on the way to a stop.
- Otherwise the game goes on:
  - their own turn, running or being scored, doesn't count (no points,
    `turn` + 1 so late messages are ignored), and the next team is up;
  - their team closes ranks; the next player in its order is up;
  - a team left with fewer than 2 players stops: it drops out of the
    game, and whoever is left watches until the host seats them in
    another team. If it was that team's turn, the turn doesn't count.
- Everyone gets a notice when a team or the game stops; the host
  passes on if the host left.

Before this, leaving only closed the socket: the server kept the seat,
and when it was that player's turn everyone waited forever.

### Free plan

Everything runs on the Workers Free plan: SQLite-backed Durable Objects,
100,000 requests a day (a WebSocket connection is one; incoming messages
count 20 to 1; outgoing ones and alarms' duration are free while the
object hibernates), 100,000 rows written a day (one per change). A
4-player game is a few hundred of each.

## Word lists

`public/{people,places,wildcards,media,brands}.json`, each
`{ "data": string[] }`, ~140–250 Dutch-audience entries per category.
`utils/words.ts` imports them into the bundle (and, because they're in
`public/`, they're also served as files — that's incidental, nothing
fetches them). **Edit them with the `edit-words` skill**
(`.claude/skills/edit-words/SKILL.md`): it covers what fits each
category, Dutch spelling and the checks.

- Each turn takes one random word per category, and `setActiveWords()`
  removes them from `available` straight away, so they don't come back
  within a game — also not after a resume.
- No word may appear twice in a list, or in two lists: either can put
  the same word on screen twice. `test/words.test.ts` enforces it.
- Nothing handles a category running out: `getRandom()` on an empty list
  returns `undefined` and an empty card shows. At ~140 wildcards that's
  140 turns, so it's theoretical; the tests keep every list at ≥ 100.

## Persistence

The game is saved to `localStorage` under one key, `thirty-seconds-game`
(`STORAGE_KEY`), at the end of every turn in `finishTurn()` — so a reload
resumes at the start of the next turn, never mid-turn. The save holds
`max_score`, the teams and players, `active_team_index`, the flags and
the remaining `available` words, plus `expires_at`: a save older than 4
hours is ignored, like the cookies it replaced.

Each player is saved with its `name`, `index` and `id` (the online seat;
empty on one phone). Saves from before ids existed load with empty ids.
Online play never reads or writes this key; see Online play for its own
`thirty-seconds-online`.

`canLoadSaved()` decides whether the "Ga verder" button shows.
`clearSaved()` runs when a *new* game is set up (not on `restart()`).
`winning_team` isn't stored; `loadSaved()` derives it from the scores, so
resuming a finished game lands on the winner screen. A missing, expired
or corrupt save is treated as no save; a failing write (private mode,
full storage) is logged and the game carries on without one.

Games saved as cookies before October 2026 aren't migrated; those
cookies expired within 4 hours of the switch.

## Offline

The built site works without a connection after one visit, through a
hand-written service worker (no library):

- `pwa/service-worker.js` — the worker. On install it stores every file
  of its version; it answers every request from that store first and
  the network only for anything not stored; every page (`/`, `/game/`,
  unknown paths) gets the stored `index.html`. It cuts stored files to
  byte ranges itself (`withRange()`), because Safari asks for audio in
  ranges and won't play a cached sound answered as a whole file. It
  matches with `ignoreVary`, because a server sending `Vary: Origin`
  otherwise makes the script, stylesheet and font (requested with
  `crossorigin`) miss their stored copy — measured, not theoretical.
  It leaves `/api/` and `/ws/` alone (`ONLINE_PATHS`), so online play
  always talks to the server. Plain JavaScript, a classic worker: it
  never goes through Vite.
- `pwa/precache.ts` — which built files to store: everything in `dist/`
  except the worker itself, `robots.txt`, `_headers`, and the public
  copies of the word lists and sounds (bundled into `assets/` and never
  fetched). **A new file in `public/` is stored automatically**; add it
  to `SKIP` only if nothing loads it.
- The `serviceWorker` plugin in `vite.config.ts` writes `dist/sw.js`
  after every build: the template with the file list and a version — a
  hash of the worker's code and every stored file. Any change gives a
  new version and a new cache.
- `main.ts` registers `sw.js` in production builds only. In
  `npm run dev` there's no worker at all, so nothing stale hides your
  changes; `npm run preview` does run it (see Verification).

**Updates.** After a deploy the browser fetches the changed `sw.js` in
the background and installs the new version next to the old one. It
takes over only once every open copy of the game has been closed (no
`skipWaiting`), so a game is never swapped out mid-turn — at the cost
of players seeing the old version for one more launch. Then the old
cache is deleted. Don't add `skipWaiting()` without a "Nieuwe versie"
prompt that only appears on the setup screen.

**iPhone.** iOS can clear a website's stored data after a few weeks
without a visit in a normal Safari tab; once the game is added to the
home screen it's kept. Saved games (`localStorage`) and the stored files
go together.

## Routes

- `/` — `pages/index.vue`, welcome screen: "Spelen op één telefoon" or
  "Online spelen".
- `/game` — `pages/game.vue`, the whole one-phone game (all screens are
  components switched by state, not routes).
- `/online` and `/online/<code>` — `pages/online.vue`, online play; the
  code makes a room link shareable.

- Anything else redirects to `/` (catch-all route in `main.ts`).

Routes are defined in `main.ts` (`createWebHistory`), at the root of
the domain. The build writes a single `index.html`; Cloudflare answers
every URL that isn't a file with it (`not_found_handling:
"single-page-application"` in `wrangler.jsonc`), so a reload on any URL
loads the app, and a new route needs nothing outside `main.ts`. The
router matches `/game` and `/game/`. The manifest's `start_url` is the
welcome page.

`html_handling` is `"none"` on purpose: Cloudflare's default redirects
`/index.html` to `/`, the service worker would store that redirect for
`index.html`, and browsers refuse a stored redirect as the answer to a
page load — the app would fail to open once the worker is active.

## Style

- **Layout.** Every screen is a `Screen.vue`: full height (`h-dvh`),
  content that scrolls on its own, and an `#action` slot pinned to the
  bottom for the screen's one main button (thumb reach, clear of the
  iPhone home indicator via `env(safe-area-inset-bottom)`;
  `viewport-fit=cover` in `index.html` makes those insets available).
  Content is capped at `max-w-md` and centred, so desktop shows a phone
  column. No floating cards on a big background any more.
- **The page itself never scrolls.** `html`/`body` are `overflow:
  hidden` with `overscroll-behavior: none` (`main.css`); only a screen's
  `<main>` scrolls. Before that, anything one pixel taller than the
  viewport let the whole page move and showed white below the screen —
  a border on a screen's wrapper (it adds to the `h-dvh` child), or an
  `sr-only` input positioned against the page. So: no borders or margins
  on screen wrappers (use a `fixed` element, like the team stripe in
  `ActiveTurn.vue`), and `<main>` is `relative` to contain absolute
  children. The turn and scoring screens use `<Screen :scrollable="false">`:
  they never scroll, and the word cards (`min-h-0 flex-1`, two-line
  clamp, font size tied to `dvh`) shrink to fit — down to an iPhone SE
  (375×667).
- **The page colour follows the screen.** Each screen calls
  `usePageColour()` with its background (`TEAM_STYLES[…].hex` for team
  screens, `PAGE_GREY`/`PAGE_SETUP` otherwise): it sets the `<html>`
  background and the `theme-color` meta. iOS Safari shows that colour
  under its address bar and toolbar (and older iOS tints the status bar
  with `theme-color`). A new screen needs its own call, or that area
  keeps the previous screen's colour.
- **Main buttons** are `ActionButton.vue` (56px tall, full width). It has
  no colours of its own — pass them as classes (`class="bg-emerald-700
  text-white"`, or `bg-white` + the team's text colour on a coloured
  screen), because two Tailwind classes for the same property can't
  reliably override each other.
- **Team colours.** `TEAM_COLOURS` (`models/Team.ts`) is the palette;
  `TEAM_STYLES` (`utils/teamColours.ts`) holds every class and the
  confetti hex values per colour, written out in full — Tailwind only
  generates classes it finds spelled out, so never build one with a
  template string (`bg-${colour}-700`). Screen backgrounds are the -700
  shades, all ≥ 4.5:1 against white text. On a coloured screen the focus
  outline turns white (`[&_:focus-visible]:outline-white` on the
  screen's root).
- **Screens by colour.** Welcome: emerald. Setup: the original
  green→blue gradient with white team cards (colour stripe on the left).
  Handoff and winner: the team's colour. Turn and scoring: light grey
  with white word cards, so the words are the loudest thing.
- **Type.** System font, no web font. Words are `text-2xl` bold, the
  handoff name `text-5xl` extra-bold. Get emphasis from size and weight.
- Tailwind v4 through `@tailwindcss/vite` (`vite.config.ts`);
  `assets/css/main.css` imports it, is imported by `main.ts`, and holds
  the only global CSS: the animations (`@theme`), the screen and
  leaderboard transitions, two v3 defaults the components rely on (grey
  `border` colour, `cursor: pointer` on buttons), the focus outline, and
  no tap highlight / double-tap zoom. No `tailwind.config.js` — v4 is
  configured in CSS. Scoped `<style>` only where Tailwind doesn't fit
  (the SVG timer in `ActiveTurn.vue`).
- v4 names: `bg-linear-to-*` (not `bg-gradient-to-*`), `rounded-sm` is
  v3's `rounded`, `shadow-xs` is v3's `shadow-sm`, and `!` goes at the
  end (`text-8xl!`, used to override the Material Icons font size).
- Icons: Material Icons, **self-hosted** (`public/fonts/material-icons.woff2`,
  Google Fonts' own file, Apache 2.0) with Google's stylesheet rules in
  `main.css` and a `<link rel="preload">` in `index.html` — so icons
  work offline and nothing is loaded from another site. Used as
  ligatures (`<span class="material-icons">close</span>`), always
  `aria-hidden`. `font-display: block` hides an icon until the font is
  there instead of showing its name. To update the font: fetch
  `https://fonts.googleapis.com/css2?family=Material+Icons` with a modern
  browser's User-Agent and download the woff2 it names.

### Animations

All in CSS except the confetti. Each one is used as `motion-safe:…` (or
lives in a `prefers-reduced-motion: no-preference` block), so with
reduced motion the change is simply instant.

| What | Where | How |
|---|---|---|
| Screen changes | `pages/game.vue`, `Playing.vue` | `<Transition name="screen" mode="out-in">`, 120 ms slide + fade each way. Every screen needs a single root element and a `key`. |
| Words dealt in | `ActiveTurn.vue` | `animate-deal-in` with a 50 ms `animation-delay` per card — 250 ms in total, so it never costs reading time. |
| Timer urgency | `ActiveTurn.vue` | Ring colour by `urgency` (green → amber ≤ 10 s → red ≤ 5 s), `animate-urgent` pulse when red. |
| Time's up | `PostTurn.vue` | The scoring screen's own background flashes red (`animate-flash` fades from `red-300` to its normal grey). Deliberately **not** a fixed overlay: iOS Safari tints its toolbar area with the background colour of any fixed element at the screen's edge — even a fully transparent one — which kept the bottom of the screen red after every turn. Don't put a coloured `fixed` element against a screen edge for longer than a moment. |
| Word tick | `PostTurn.vue` | `animate-pop` on a tile when it becomes selected. |
| Score | `Leaderboard.vue` | Shows the scores from *before* `last_turn` for 400 ms, then the new ones: the bar grows (`transition-[width]`), rows slide into the new order (`<TransitionGroup name="leaderboard">`), and a `+N` badge pops (`animate-score-pop`). |
| Winner | `PostGame.vue`, `Confetti.vue` | Canvas confetti in the winner's colours, the trophy and title with `animate-bounce-in`. Also on the welcome screen's hourglass and the handoff name. |

## Accessibility

- Every input has a `<label for>`: the "Team N" label above each team
  name, a `sr-only` "Speler naam" for players. The target score is a
  real radio group in a `<fieldset>` with a `<legend>`.
- `RemoveButton` is a real 40px round button with a `label` prop
  ("Verwijder team" / "Verwijder speler"); its parent positions it.
- The timer ring is a button labelled "Beëindig beurt"; the SVG inside
  is `aria-hidden`. A `sr-only` `aria-live="polite"` line announces
  "Nog 10 seconden" and "Nog 5 seconden" — deliberately not every second,
  which would talk over the players.
- Word cards carry a `sr-only` category label ("Plaats: Düsseldorf").
  In `PostTurn.vue` they're toggle buttons with `aria-pressed`, and a
  selected card shows a check icon as well as the green colour.
- The leaderboard has a `sr-only` "Tussenstand" heading. Team colours are
  never the only signal: every coloured dot or stripe sits next to the
  team's name.
- Every control has a visible `:focus-visible` outline (`main.css`),
  white on coloured screens.
- `<html lang="nl">`.

## Known issues

Not fixed yet. Ask before fixing as a side effect of something else.

None at the moment.

## Hosting

| Piece | Where | Setting |
|---|---|---|
| Repo | GitHub `NickHuijgen/thirty-seconds-clone`, public | Default branch `main`. |
| Build & deploy | Cloudflare's Git integration (Workers Builds), set up in the Cloudflare dashboard — the same setup as the portfolio | On push to `main`: `npm ci`, build command `npm run verify` (both type checks, the tests, the build — so a failing check or test stops the deploy), deploy command `npx wrangler deploy`. Other branches get a preview build. Node comes from `.node-version`: the tests need a Node 22 that strips types without a flag (≥ 22.18). No GitHub workflow and no secrets. `wrangler` is a dev dependency, so the deploy uses the locked version. |
| Hosting | Cloudflare Worker `thirty-seconds-clone` (`wrangler.jsonc`): static assets, plus `server/worker.ts` for `/api/*` and `/ws/*` only, and the `Room` Durable Object (binding `ROOM`, migration `v1`) | https://thirty-seconds-clone.nickhuijgen.nl/ — a custom domain on the `nickhuijgen.nl` zone, which also hosts the portfolio at the apex. Wrangler creates the DNS record and certificate. Workers Free plan. |

Until November 2026 it was on GitHub Pages at
`nickhuijgen.github.io/thirty-seconds-clone/`; that site was switched
off without a redirect.

`public/_headers` (Cloudflare's headers file) lets browsers keep the
content-hashed files in `assets/` for a year; everything else is
revalidated on every load, which `sw.js` relies on to pick up a new
version.

The site is kept out of search results with a noindex: an
`X-Robots-Tag: noindex` header on every path (`public/_headers`) and a
`<meta name="robots">` in `index.html`. `robots.txt` allows crawling on
purpose — it has no noindex of its own, and a `Disallow` would stop
crawlers from ever seeing the noindex.

`dist/` is the build output and is gitignored. `npm audit` was clean
after the move to Vite (October 2026); keep it that way.

## Don't

- Don't add dependencies without asking.
- Don't scaffold features I didn't ask for.
- Don't push to `main` without being asked — it deploys to production.
- Don't reintroduce Nuxt or another meta-framework without asking (see
  the intro).

## Verification

Before calling a change done:

- `npm run verify` — `check`, `check:server`, `test`, then `build`;
  what Cloudflare runs before deploying. Expect 0 type errors and every
  test passing.
- `npm run check` — `vue-tsc --noEmit` over the app *and* the tests.
  TypeScript is pinned to 5.x because `vue-tsc` doesn't run on newer
  TypeScript yet.
- `npm run check:server` — `wrangler types`, then `tsc` with
  `server/tsconfig.json`: the Worker and Durable Object against
  Cloudflare's types.
- `npm test` — `node --test "test/*.test.ts"`. No dependency, no
  browser: Node strips the types and runs the real models.
  - `test/game.test.ts` — setup and shuffling, drawing words without
    repeats, the timer and its sounds (with `mock.timers`), turn order,
    scoring and winning, restart, and the whole save/resume contract:
    round trip, no repeated words after a resume, the winner after
    resuming a finished game, expired/corrupt/missing saves, failing or
    missing `localStorage`, and exactly which keys are saved.
  - `test/words.test.ts` — the real word lists: format, trimmed
    non-empty words, no duplicates within or across lists, ≥ 100 each.
  - `test/service-worker.test.ts` — the stored-file list against a real
    `dist/` listing, that the template's placeholders exist exactly
    once, and `withRange()` (run from the real worker script in a Node
    `vm`): whole files, exact, open-ended, suffix and out-of-range
    byte ranges.
  - `test/rules.test.ts` — the online rules: joining and seats, the host
    and its handover, who may do what in which phase, words only to the
    describer during the turn and to everyone after, live and repeated
    ticks, the score from the server's ticks, the timer's end (alarm or
    the next message), turn order, late joiners, kicking, expiry, room
    codes, and a room's round trip through storage.
  - `test/clock.test.ts` — the clock offset and the countdown.
  - `test/game.test.ts` also covers `toSaved`/`fromSaved`, player ids
    in the save, and that `beginTurn`/`endTurn`/`scoreTurn` have no
    sounds, timer or saving.
  - `test/helpers.ts` — a Map-backed `localStorage`, fixture word lists,
    a sound recorder, and `newGame()`/`playTurn()`.
  When you fix a bug in the models, add the test that would have caught
  it.
- If you touched `server/`, `models/` or online play: with `npm run dev`
  running, `npm run test:online` (or `npm run test:online --
  http://localhost:8787` against `npm run build && npx wrangler dev`).
  Four WebSocket clients create a room and play: the host sets up teams,
  one turn runs to the end of the timer (so it takes ~45 s), words never
  reach the other phones during the turn, every phone hears the end
  within 200 ms, a refresh mid-turn gets the same seat and the words
  again, ticks arrive live and score, late joiner, kick, host handover,
  an unknown room, and that only `/api` and `/ws` reach the Worker.
  Then play online in the browser: several phone-sized windows (separate
  browser profiles or private windows — one browser shares the stored
  seat), and ideally two real phones on the same Wi-Fi against the dev
  server's network address.
- Play a full game in the browser at phone width (~390px) — if the
  browser window won't shrink that far, load the app in a 390×844
  `<iframe>` on a page of the same origin — with
  `npm run dev`, or `npm run build && npm run preview` for the built
  site:
  - add and remove a team and a player (remove buttons only above 2);
  - start, play a turn to the end of the timer, and one ended early by
    tapping the ring; both sounds play;
  - tick some words (check icon appears), "Klaar", check the score and
    that the next team and player are right;
  - reload between turns → "Ga verder met bestaand spel" resumes with
    the same scores and turn;
  - play to the target score (pick 10) → winner screen in the winner's
    colour with confetti → "Begin opnieuw" keeps the teams and resets
    the scores;
  - no screen lets the *page* scroll: in the frame, check
    `document.documentElement.scrollHeight === clientHeight` on every
    screen, and that the turn and scoring screens' `<main>` doesn't
    scroll at 375×667 either;
  - the animations: words deal in, the ring turns amber at 10 and red at
    5, the red flash at time's up, the `+N` and row reorder on the next
    handoff screen. Then turn on reduced motion (DevTools → Rendering →
    `prefers-reduced-motion: reduce`) and check everything still works,
    just without movement, and the confetti doesn't appear;
  - the screen stays on during a game: wrap `navigator.wakeLock.request`
    in the console to log calls, or watch the phone not dim.
- If you touched `wrangler.jsonc` or `vite.config.ts`: build, then serve
  `dist/` the way Cloudflare does with `npx wrangler dev`. `/`, `/index.html`, `/game` and
  `/game/` must all answer 200 with the app — no redirects — and every
  file in `dist/` must be served as itself.
- If you touched `pwa/`, `vite.config.ts` or anything in `public/`:
  `npm run build && npm run preview`, load the site once, check
  DevTools → Application → Service workers (activated) and Cache storage
  (one `thirty-seconds-<version>` cache with exactly the files from
  `precacheFiles()`). Then **stop the preview server** — stricter than
  DevTools' offline switch — and reload on `/game/`: the app, the icons
  (rendered as icons, not as their names) and both sounds must work.
  For an update: rebuild with a change, reload once (the new version
  shows as *waiting*), close every tab of the site, open it again (the
  new version is active, the old cache is gone). Afterwards unregister
  the worker and clear the cache for that localhost address, or it
  keeps serving the old build there.
- If you touched `index.html` head links, the manifest or the icons:
  open DevTools → Application → Manifest on the built site and check it
  parses, every icon loads, and Chrome offers to install it.

## Development

Start the dev server (http://localhost:5173/thirty-seconds-clone/ — note
the base URL, see Routes):

```
npm run dev
```

Run it in the background so it doesn't block the session, and stop it
when you're done.

## Documentation

Consult these before working on related tasks:

- [Vue](https://vuejs.org/guide/) — `<script setup>` and the reactivity API
- [Vue Router](https://router.vuejs.org/guide/)
- [Vite](https://vite.dev/guide/) — config, `base`, static assets and the `public/` directory
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Node test runner](https://nodejs.org/api/test.html)

# 30 Seconds

A browser clone of the Dutch party game *30 Seconds*, Dutch only, live at
https://nickhuijgen.github.io/thirty-seconds-clone/. One phone is passed
around the table: the active player sees five words (one person, place,
wildcard, film/series/song and brand) and has 30 seconds to describe them
to their teammates; afterwards they tick the words that were guessed, and
each guessed word is one point. First team to the target score wins.

A Vue 3 single-page app (`<script setup>`, Vue Router) built with Vite,
styled with Tailwind CSS v4, no backend. `npm run build` produces a
static site in `dist/` that GitHub Pages serves; GitHub Actions
type-checks, tests, builds and deploys it on every push to `main` —
pushing to `main` *is* deploying.

Started in October 2024 from the Nuxt 3 starter. In October 2026 it
moved to Tailwind 4, saved games moved from cookies to `localStorage`,
it got tests, a web app manifest and a screen wake lock — and Nuxt was
replaced by plain Vue + Vite. Nuxt ran here as a client-only SPA
(`ssr: false`) and only `<NuxtPage>`/`<NuxtLink>` were used, while its
server layer brought ~470 extra packages and every remaining `npm audit`
finding. Don't bring it back for convenience; if the game ever needs a
server (online play, shared word lists), that's a separate backend
decision.

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
  circle ends the turn early (`forceEndTurn()`); keep that deliberate,
  don't add other one-tap destructive actions during a turn.
- A refresh or a locked screen must not lose the game: that's what the
  saved game is for (see Persistence), and the wake lock keeps the screen
  on in the first place. Don't break "Ga verder met bestaand spel".
- It should feel like an app when added to the home screen: the manifest
  opens it standalone, in portrait, with the emerald theme colour.
- Keep it light: no new client libraries for things Vue already does.

## Invariants

Places that have to say the same thing or it silently breaks. Marked
**[test]** where `npm test` now catches it; the rest are still on you.

| If you change… | …also check | Why |
|---|---|---|
| **[test]** Any field on `Game`, `Team` or `Player` that must survive a reload | `save()` / `loadSaved()` in `models/Game.ts` | The save lists every field by hand and loading rebuilds `Team`/`Player` objects field by field. A new field is silently dropped on reload (it gets its constructor default). `test/game.test.ts` pins the saved keys and the round trip, so a new field means updating both methods *and* that test. |
| **[test]** A word list in `public/*.json` | `test/words.test.ts` | Format, no duplicates within or across lists (case- and accent-insensitive), at least 100 words each. Use the `edit-words` skill. |
| The set of categories | `CATEGORIES` and `Game.emptyWordLists()` in `models/Game.ts`, `utils/words.ts`, and a `public/<category>.json` | Everything else loops over `CATEGORIES`. The `WordLists` type makes a missing key in `utils/words.ts` or `emptyWordLists()` a type error (`npm run check`). |
| `BASE` in `vite.config.ts` | The GitHub repo name | GitHub Pages serves the site under `/<repo-name>/`. Everything else follows `BASE`: Vite prefixes the absolute paths in `index.html` (`/favicon.svg` → `/thirty-seconds-clone/favicon.svg`) and the router uses `import.meta.env.BASE_URL`. Keep `index.html` paths **absolute** — a relative `favicon.svg` would break on `/game/`. The manifest is the exception: its `start_url`, `scope` and icons are relative to the manifest file itself, so they stay relative. |
| A route in `main.ts` | `ROUTES` in `vite.config.ts` | GitHub Pages has no SPA fallback, so the build copies `index.html` to `<route>/index.html` for every route in `ROUTES` (and to `404.html`). A route missing there still works when navigated to in the app, but 404s on reload. |
| `theme_color` in `public/manifest.webmanifest` | The `theme-color` meta in `index.html` and the background in `design/app-icon.svg` | The same emerald (`#047857`, Tailwind `emerald-700`), stated three times. |
| The app icon | `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | All three are rendered from `design/app-icon.svg`; the command is in a comment at the top of that file. The hourglass stays inside the middle 50%, so Android's maskable crop never cuts it. |
| A component used in a template | Its `import` in that file's `<script setup>` | Nothing is auto-imported any more — not components, not `ref`/`computed`/`watch`. `strictTemplates` (`tsconfig.json`) makes an unimported component a type error, so `npm run check` catches it; without that it would just render nothing. |
| Which component shows when (`pages/game.vue`, `Playing.vue`) | The flags on `Game` (see Game flow) | Screens are picked purely from `is_in_progress`, `is_finished`, `is_applying_score` and `turn_timer === 0`. A new state needs a flag *and* its place in that `v-if` chain. |

## Constraints

- Vue 3 SFCs with `<script setup lang="ts">` and `defineProps({...})`
  object syntax, matching the existing components. Props are typed by
  class (`type: Game`).
- All game logic lives in the model classes (`models/Game.ts`,
  `Team.ts`, `Player.ts`). Components read state from the `Game` instance
  and call its methods; they don't compute game rules themselves.
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
    `try`/`catch` (it's missing in Node and can throw in private mode).
- State is one `Game` instance in a `ref()` in `pages/game.vue`, passed
  down as a prop. Components mutate it through its methods (and, in the
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
  `public/`.
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

## Game flow

`pages/game.vue` creates `new Game(50, words, loadSound)` with two
default teams of two players ("Team 1", "Speler 1" …) and switches
between three screens:

1. **Setup** (`GameSetup.vue` → `TeamSetup.vue` → `PlayerSetup.vue`,
   `RemoveButton.vue`) — while `!is_in_progress && !is_finished`. Add or
   rename teams and players (minimum 2 teams, 2 players per team — the
   remove button only shows above that), pick the target score (10, 25,
   50, 100). "Begin nieuw spel" calls `setUp()`: clears the saved game
   (unless restarting), shuffles teams and each team's players
   (`generateTeamIndexes()`), copies the word lists into `available`,
   sets `is_in_progress`. If a saved game exists, "Ga verder met bestaand
   spel" calls `loadSaved()` instead.
2. **Playing** (`Playing.vue`) — picks one of three sub-screens:
   - `PreTurn.vue` (`turn_timer === 0`): whose turn it is, who may guess,
     the leaderboard, who's next. "Start beurt" → `startTurn()`.
   - `ActiveTurn.vue` (timer running): the five words and the countdown
     ring (`TURN_SECONDS`, 30). Plays `turn-start` at the start and
     `vine-boom` at 1 second left. Tapping the ring → `forceEndTurn()`.
   - `PostTurn.vue` (`is_applying_score`): tap the guessed words, "Klaar"
     → `finishTurn(count)`: adds the score, checks for a winner, advances
     to the next team and saves.
3. **Post game** (`PostGame.vue`, `is_finished`): winner and final
   leaderboard. "Begin opnieuw" → `restart()` keeps teams and players,
   resets scores, and goes back to setup.

Turn order: teams are shuffled once at setup and play in index order;
within a team, players rotate through their shuffled index. Both
`activeTeam()` and `activePlayer()` look objects up by their `index`
field, **not** by array position — so sorting or reordering the arrays is
safe (the leaderboard sorts a copy), but the indexes must stay `0…n-1`
and unique.

Sounds: `startTurn()` loads both sounds inside the "Start beurt" tap and
plays `vine-boom` from the timer later. Keep the loading inside the tap:
mobile browsers only allow audio that a user gesture started.

While a game is in progress and not finished, `useWakeLock()` holds a
screen wake lock, so the phone doesn't dim or lock while it's handed
around. The browser drops it whenever the page is hidden; it's requested
again on `visibilitychange`. Where the API doesn't exist, nothing happens.

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

`canLoadSaved()` decides whether the "Ga verder" button shows.
`clearSaved()` runs when a *new* game is set up (not on `restart()`).
`winning_team` isn't stored; `loadSaved()` derives it from the scores, so
resuming a finished game lands on the winner screen. A missing, expired
or corrupt save is treated as no save; a failing write (private mode,
full storage) is logged and the game carries on without one.

Games saved as cookies before October 2026 aren't migrated; those
cookies expired within 4 hours of the switch.

## Routes

- `/` — `pages/index.vue`, welcome screen with a "Begin spel" link.
- `/game` — `pages/game.vue`, the whole game (all screens are components
  switched by state, not routes).

- Anything else redirects to `/` (catch-all route in `main.ts`).

Routes are defined in `main.ts` (`createWebHistory`), all under
`base: '/thirty-seconds-clone/'` (GitHub Pages project site). The build
writes `index.html`, plus identical copies at `game/index.html` and
`404.html` (the `spaShells` plugin in `vite.config.ts`), so a reload on
any URL loads the app. GitHub Pages redirects `/game` to `/game/`; the
router matches both. The manifest's `start_url` is the welcome page.

## Style

- Tailwind v4 through `@tailwindcss/vite` (`vite.config.ts`);
  `assets/css/main.css` imports it, is imported by `main.ts`, and holds
  the only global CSS. No `tailwind.config.js` — v4 is configured in CSS. Utility
  classes directly in the markup; scoped `<style>` only where Tailwind
  doesn't fit (the SVG timer in `ActiveTurn.vue`).
- `main.css` restores two v3 defaults the components rely on (grey
  `border` colour, `cursor: pointer` on buttons) and sets the one focus
  style for every control: a 2px `emerald-700` outline on
  `:focus-visible`.
- v4 names: `bg-linear-to-*` (not `bg-gradient-to-*`), `rounded-sm` is
  v3's `rounded`, `shadow-xs` is v3's `shadow-sm`. v4's palette is OKLCH,
  so colours are a touch more vivid than under v3.
- The look: full-height green→blue gradient background
  (`bg-linear-to-tr from-green-100 to-blue-200`), content in a white
  rounded card with `shadow-2xl`. Primary buttons share one long class
  string (emerald gradient) copied across components; secondary buttons
  are bordered grey. Reuse those exact strings for consistency.
- Icons: Material Icons from Google Fonts (a `<link>` in
  `index.html`), used as ligatures
  (`<span class="material-icons">close</span>`).

## Accessibility

- Every input has a `<label for>`: the "Team N" heading for team names,
  a `sr-only` "Speler naam" for players.
- `RemoveButton` is a real button with a `label` prop ("Verwijder team" /
  "Verwijder speler"); padding with a matching negative margin gives its
  18px icon a bigger tap area without moving it.
- The timer ring is a button labelled "Beëindig beurt"; the SVG inside
  is `aria-hidden`. A `sr-only` `aria-live="polite"` line announces
  "Nog 10 seconden" and "Nog 5 seconden" — deliberately not every second,
  which would talk over the players.
- The word tiles in `PostTurn.vue` are toggle buttons with
  `aria-pressed`, and a selected tile shows a check icon as well as the
  green colour.
- Every control has a visible `:focus-visible` outline (`main.css`).
- `<html lang="nl">`.

## Known issues

Not fixed yet. Ask before fixing as a side effect of something else.

- `public/robots.txt` is empty (allows everything — fine, but it's a
  placeholder).
- No service worker, so the game needs a connection to load. It's a
  small static site; offline support would be the next step towards a
  real app, but it adds caching to reason about on every deploy.

## Hosting

| Piece | Where | Setting |
|---|---|---|
| Repo | GitHub `NickHuijgen/thirty-seconds-clone`, public | Default branch `main`. |
| Build & deploy | `.github/workflows/deploy.yml` | On push to `main` (and manual dispatch): Node 22, `npm ci`, `npm run check`, `npm test`, `npm run build`, upload `dist`, deploy with `actions/deploy-pages`. A failing type check or test stops the deploy. |
| Hosting | GitHub Pages (build type "workflow") | https://nickhuijgen.github.io/thirty-seconds-clone/ — no custom domain. |

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

- `npm run verify` — `check`, then `test`, then `build`; the same
  steps CI runs before deploying. Expect 0 type errors and every test
  passing.
- `npm run check` — `vue-tsc --noEmit` over the app *and* the tests.
  TypeScript is pinned to 5.x because `vue-tsc` doesn't run on newer
  TypeScript yet.
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
  - `test/helpers.ts` — a Map-backed `localStorage`, fixture word lists,
    a sound recorder, and `newGame()`/`playTurn()`.
  When you fix a bug in the models, add the test that would have caught
  it.
- Play a full game in the browser at phone width (~390px), with
  `npm run dev`, or `npm run build && npm run preview` for the built
  site (then open `/thirty-seconds-clone/`):
  - add and remove a team and a player (remove buttons only above 2);
  - start, play a turn to the end of the timer, and one ended early by
    tapping the ring; both sounds play;
  - tick some words (check icon appears), "Klaar", check the score and
    that the next team and player are right;
  - reload between turns → "Ga verder met bestaand spel" resumes with
    the same scores and turn;
  - play to the target score (pick 10) → winner screen → "Begin opnieuw"
    keeps the teams and resets the scores;
  - the screen stays on during a game: wrap `navigator.wakeLock.request`
    in the console to log calls, or watch the phone not dim.
- If you touched routes or `vite.config.ts`: build, then serve `dist/`
  *without* an SPA fallback — `vite preview` has one, GitHub Pages
  doesn't — e.g. symlink `dist` as `thirty-seconds-clone` inside an empty
  folder and run `python3 -m http.server` there. Reload on `/game/` must
  load the app.
- If you touched `index.html` head links, the manifest or the icons:
  open DevTools → Application → Manifest on the built site and check it
  parses, every icon loads, and Chrome offers to install it.

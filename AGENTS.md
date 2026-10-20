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
it got tests, a web app manifest, a screen wake lock and offline support — and Nuxt was
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
| The set of categories | `CATEGORIES` and `Game.emptyWordLists()` in `models/Game.ts`, `utils/words.ts`, `CATEGORY_INFO` in `utils/categories.ts`, and a `public/<category>.json` | Everything else loops over `CATEGORIES`. The `WordLists` and `Record<Category, …>` types make a missing key a type error (`npm run check`). The word cards rely on `active_words` being in `CATEGORIES` order to pick each card's icon. |
| `TEAM_COLOURS` (`models/Team.ts`) | `TEAM_STYLES` in `utils/teamColours.ts` | `TEAM_STYLES` is a `Record<TeamColour, …>`, so a new colour without styles is a type error. Its classes must be written out in full (see Style). |
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
     `startTurn()`.
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
mobile browsers only allow audio that a user gesture started.

Haptics: `useTurnHaptics()` (in `pages/game.vue`) vibrates at 5 seconds
left and when the turn ends. Android only — iOS Safari has no
`navigator.vibrate`, and nothing else depends on it.

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
  Plain JavaScript, a classic worker: it never goes through Vite.
- `pwa/precache.ts` — which built files to store: everything in `dist/`
  except the worker itself, the `404.html`/`game/index.html` copies,
  `robots.txt`, and the public copies of the word lists and sounds
  (bundled into `assets/` and never fetched). **A new file in `public/`
  is stored automatically**; add it to `SKIP` only if nothing loads it.
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

- `public/robots.txt` is empty (allows everything — fine, but it's a
  placeholder).

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
  - `test/service-worker.test.ts` — the stored-file list against a real
    `dist/` listing, that the template's placeholders exist exactly
    once, and `withRange()` (run from the real worker script in a Node
    `vm`): whole files, exact, open-ended, suffix and out-of-range
    byte ranges.
  - `test/helpers.ts` — a Map-backed `localStorage`, fixture word lists,
    a sound recorder, and `newGame()`/`playTurn()`.
  When you fix a bug in the models, add the test that would have caught
  it.
- Play a full game in the browser at phone width (~390px) — if the
  browser window won't shrink that far, load the app in a 390×844
  `<iframe>` on a page of the same origin — with
  `npm run dev`, or `npm run build && npm run preview` for the built
  site (then open `/thirty-seconds-clone/`):
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
- If you touched routes or `vite.config.ts`: build, then serve `dist/`
  *without* an SPA fallback — `vite preview` has one, GitHub Pages
  doesn't — e.g. symlink `dist` as `thirty-seconds-clone` inside an empty
  folder and run `python3 -m http.server` there. Reload on `/game/` must
  load the app.
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

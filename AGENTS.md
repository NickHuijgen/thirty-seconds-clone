## Development

Start the dev server (http://localhost:3000/thirty-seconds-clone/ — note
the base URL, see Routes):

```
npm run dev
```

Run it in the background so it doesn't block the session, and stop it
when you're done.

## Documentation

Full documentation: https://nuxt.com/docs

Consult these guides before working on related tasks:

- [Directory structure](https://nuxt.com/docs/guide/directory-structure) — this project uses the *root* layout, not `app/` (see Invariants)
- [Pages and routing](https://nuxt.com/docs/guide/directory-structure/pages)
- [Static hosting / `nuxt generate`](https://nuxt.com/docs/getting-started/deployment#static-hosting)
- [Tailwind CSS v3](https://v3.tailwindcss.com/docs)

# 30 Seconds

A browser clone of the Dutch party game *30 Seconds*, Dutch only, live at
https://nickhuijgen.github.io/thirty-seconds-clone/. One phone is passed
around the table: the active player sees five words (one person, place,
wildcard, film/series and brand) and has 30 seconds to describe them to
their teammates; afterwards they tick the words that were guessed, and
each guessed word is one point. First team to the target score wins.

Nuxt 4 SPA (`ssr: false`), Vue 3 `<script setup>`, Tailwind CSS v3, no
backend. `npm run generate` produces a static site that GitHub Pages
serves; GitHub Actions builds and deploys it on every push to `main` —
pushing to `main` *is* deploying.

Started in October 2024 from the Nuxt 3 starter; upgraded to Nuxt 4 in
January 2026 without moving to the Nuxt 4 `app/` directory layout.

## Priorities

**Mobile and pass-the-phone usability come first.** The game is played on
one phone handed from player to player, often in a noisy room. When a
change trades that off against anything else, it wins.

- Design and check at a real phone width (360–430px) before desktop.
- Large tap targets and readable words at arm's length — the active
  player is glancing at the screen while talking.
- Nothing should be accidentally triggerable mid-turn. Tapping the timer
  circle ends the turn early (`forceEndTurn()`); keep that deliberate,
  don't add other one-tap destructive actions during a turn.
- A refresh or a locked screen must not lose the game: that's what the
  cookie persistence is for (see Persistence). Don't break "Ga verder met
  bestaand spel".
- Keep it light: no new client libraries for things Vue already does.

## Invariants

Places that have to say the same thing or it silently breaks. None of
these fail a build, and there are no tests yet.

| If you change… | …also check | Why |
|---|---|---|
| Any field on `Game`, `Team` or `Player` (`models/`) | `saveToCookies()` / `loadFromCookies()` in `models/Game.ts` | Loading rebuilds `Team`/`Player` objects field by field from the cookie JSON. A new field is silently dropped on reload (it gets its constructor default); a renamed one comes back `undefined`. |
| A word list in `public/*.json` (making it longer) | The byte size of its cookie | Each `available_<category>` list is stored in its **own cookie**, and browsers drop a cookie whose name+value exceeds 4096 bytes — silently, so the game just stops resuming. `media.json` is already at ~3920 bytes, `people.json` ~3850. Check with the one-liner in Verification. Adding words means moving persistence to `localStorage` first (see Known issues). |
| The set of categories (`people`, `places`, `wildcards`, `media`, `brands`) | Every `available_*` field, `setUp()`, `setActiveWords()`, `setUsed()`, `saveToCookies()`, `loadFromCookies()` and `clearCookies()` | The five categories are written out by hand in all of these; there is no list to loop over. Miss one and that category either repeats words or never persists. |
| The turn length (`30` in `startTurn()`) | The `/ 30` in `ActiveTurn.vue`'s `stroke-dasharray` | The timer ring computes its fill from the same literal. |
| `baseURL` in `nuxt.config.ts` | The GitHub repo name, and the `href: 'favicon.svg'` (relative on purpose) | GitHub Pages serves the site under `/<repo-name>/`. Assets and routes resolve against `baseURL`. |
| Adding an `app/` directory | Everything | Nuxt 4 uses `app/` as `srcDir` when it exists and falls back to the project root when it doesn't. Creating `app/` (even an empty one for a single file) moves the source root and makes `pages/`, `components/` and `app.vue` disappear. Migrating to `app/` is a deliberate, all-at-once move. |
| Which component shows when (`pages/game.vue`, `Playing.vue`) | The flags on `Game` (see Game flow) | Screens are picked purely from `is_in_progress`, `is_finished`, `is_applying_score` and `turn_timer === 0`. A new state needs a flag *and* its place in that `v-if` chain. |

## Constraints

- Vue 3 SFCs with `<script setup lang="ts">` and `defineProps({...})`
  object syntax, matching the existing components. Props are typed by
  class (`type: Game`).
- All game logic lives in the model classes (`models/Game.ts`,
  `Team.ts`, `Player.ts`). Components read state from the `Game` instance
  and call its methods; they don't compute game rules themselves. Keep it
  that way — it's what would make the rules testable outside a browser.
- State is one `Game` instance in a `ref()` in `pages/game.vue`, passed
  down as a prop. Components mutate it through its methods (and, in the
  setup forms, `v-model` directly on `team.name` / `player.name`). There
  is no Pinia/store; don't add one without asking.
- `ssr: false`: the model code touches `document`, `Audio` and
  `setInterval` freely. If SSR is ever turned on, all of that needs
  guarding.
- UI copy is Dutch and lives directly in the templates. No i18n layer.
- Component imports are explicit (`import X from "~/components/X.vue"`)
  even though Nuxt auto-imports them; follow whichever the file you're in
  already does.
- Code style: 4-space indent in `.ts`, 2-space in `.vue`; `snake_case`
  for model fields (`max_score`, `active_team_index`), `camelCase` for
  methods. There is no linter or formatter configured.
- `// @ts-ignore` is used above array-index accesses that TypeScript
  flags as possibly `undefined`. Prefer a real guard in new code.

## Game flow

`pages/game.vue` creates `new Game(50)` with two default teams of two
players ("Team 1", "Speler 1" …) and switches between three screens:

1. **Setup** (`GameSetup.vue` → `TeamSetup.vue` → `PlayerSetup.vue`,
   `RemoveButton.vue`) — while `!is_in_progress && !is_finished`. Add or
   rename teams and players (minimum 2 teams, 2 players per team — the
   remove button only shows above that), pick the target score (10, 25,
   50, 100). "Begin nieuw spel" calls `setUp()`: clears cookies (unless
   restarting), shuffles teams and each team's players
   (`generateTeamIndexes()`), loads the word lists, sets
   `is_in_progress`. If a saved game exists, "Ga verder met bestaand spel"
   calls `loadFromCookies()` instead.
2. **Playing** (`Playing.vue`) — picks one of three sub-screens:
   - `PreTurn.vue` (`turn_timer === 0`): whose turn it is, who may guess,
     the leaderboard, who's next. "Start beurt" → `startTurn()`.
   - `ActiveTurn.vue` (timer running): the five words and the countdown
     ring. Plays `turn-start.mp3` at the start and `vine-boom.mp3` at
     1 second left. Tapping the ring → `forceEndTurn()`.
   - `PostTurn.vue` (`is_applying_score`): tap the guessed words, "Klaar"
     → `finishTurn(count)`: adds the score, checks for a winner, advances
     to the next team and saves to cookies.
3. **Post game** (`PostGame.vue`, `is_finished`): winner and final
   leaderboard. "Begin opnieuw" → `restart()` keeps teams and players,
   resets scores, and goes back to setup.

Turn order: teams are shuffled once at setup and play in index order;
within a team, players rotate through their shuffled index. Both
`activeTeam()` and `activePlayer()` look objects up by their `index`
field, **not** by array position — so sorting or reordering the arrays is
safe, but the indexes must stay `0…n-1` and unique.

## Word lists

`public/{people,places,wildcards,media,brands}.json`, each
`{ "data": string[] }`, ~140–260 Dutch-audience entries per category.
They're imported into the bundle by `models/Game.ts` (and, because they're
in `public/`, also served as files — that's incidental, nothing fetches
them).

- Each turn takes one random word per category. Used words are removed
  from the `available_*` lists so they don't come back within a game.
- Lists have a few exact duplicates (`places.json` has ~40, others a
  handful) and three words appear in two categories (`Casablanca`,
  `Halloween`, `Diesel`). When editing a list, dedupe it.
- Nothing handles a category running out: `getRandom()` on an empty list
  returns `undefined` and an empty card shows. At ~140 wildcards that's
  140 turns, so it's theoretical, but don't shrink lists far.
- Spelling and names are Dutch where a Dutch name exists ("Londen",
  "De Godfather").

## Persistence

The game is saved to cookies (4-hour expiry, `path=/`) at the end of
every turn in `finishTurn()` — so a reload resumes at the start of the
next turn, never mid-turn. Six cookies: `game_data` (the `Game` minus the
word lists) and one `available_<category>` per word list. See the cookie
size row in Invariants.

`canLoadFromCookies()` decides whether the "Ga verder" button shows.
`clearCookies()` runs when a *new* game is set up (not on `restart()`).

## Routes

- `/` — `pages/index.vue`, welcome screen with a "Begin spel" link.
- `/game` — `pages/game.vue`, the whole game (all screens are components
  switched by state, not routes).

Everything is under `baseURL: '/thirty-seconds-clone/'` (GitHub Pages
project site). `nuxt generate` writes `index.html`, `game/index.html`,
`200.html` and `404.html`; with `ssr: false` these are empty SPA shells.

## Style

- Tailwind v3 via PostCSS (`nuxt.config.ts` → `postcss.plugins`), with
  `@tailwind` directives in `app.vue`'s global `<style>`. Utility classes
  directly in the markup; scoped `<style>` only where Tailwind doesn't
  fit (the SVG timer in `ActiveTurn.vue`).
- The look: full-height green→blue gradient background
  (`bg-gradient-to-tr from-green-100 to-blue-200`), content in a white
  rounded card with `shadow-2xl`. Primary buttons share one long class
  string (emerald gradient) copied across components; secondary buttons
  are bordered grey. Reuse those exact strings for consistency.
- Icons: Material Icons from Google Fonts (`@import` in `app.vue`), used
  as ligatures (`<span class="material-icons">close</span>`).

## Accessibility

Current state, not goals met — improve when touching these:
- Team and player inputs have no `<label>`, only a placeholder, and every
  one shares `id="team_name"` / `id="player_name"` (duplicate ids).
- `RemoveButton` and the timer ring are clickable `<span>`/`<svg>`, not
  `<button>`s: not focusable, no keyboard access. `RemoveButton`'s title
  says "Verwijder team" even when it removes a player.
- The word tiles in `PostTurn.vue` are clickable `<div>`s; selection is
  shown by colour only (green background/border).
- The countdown isn't announced to screen readers.

## Known issues

Found while writing this file; not fixed yet. Ask before fixing as a
side effect of something else.

- **Cookie size ceiling** — see Invariants. Moving to `localStorage`
  (≈5 MB, one key) would remove it.
- **Words can repeat after a resume.** `setUsed()` removes the *previous*
  turn's words at the start of the next turn, but `finishTurn()` saves
  before that, and `loadFromCookies()` resets `active_words`. So the
  last turn's words are back in the pool after a reload.
- **Resuming a finished game** shows "undefined heeft gewonnen":
  `loadFromCookies()` restores `is_finished` but sets `winning_team` to
  `null`.
- `Leaderboard.vue` calls `game.teams.sort(...)` in the template, which
  sorts the real array in place during render. Harmless today (lookups
  use `index`), but it's a side effect in a render.
- `game.start()` is never called; `setUp()` alone starts the game, so
  the first player is index 0 of the first team.
- Class typos that silently do nothing: `gris-cols-1` (`GameSetup.vue`),
  `pointer:cursor` (`PostTurn.vue`, meant `cursor-pointer`).
- `pages/game.vue` types the ref as `const game: Game = ref(...)`; it's
  really `Ref<Game>`. Works at runtime, wrong for the type checker.
- `public/robots.txt` is empty (allows everything — fine, but it's a
  placeholder).

## Hosting

| Piece | Where | Setting |
|---|---|---|
| Repo | GitHub `NickHuijgen/thirty-seconds-clone`, public | Default branch `main`. |
| Build & deploy | `.github/workflows/deploy.yml` | On push to `main` (and manual dispatch): Node 22, `npm ci`, `npm run generate`, upload `.output/public`, deploy with `actions/deploy-pages`. |
| Hosting | GitHub Pages (build type "workflow") | https://nickhuijgen.github.io/thirty-seconds-clone/ — no custom domain. |

The `dist` symlink in the project root points at `.output/public`; it's
gitignored and only there for convenience.

## Don't

- Don't add dependencies without asking.
- Don't scaffold features I didn't ask for.
- Don't push to `main` without being asked — it deploys to production.
- Don't create an `app/` directory (see Invariants).

## Verification

There are no tests, no linter and no type-check script yet. Before
calling a change done:

- `npm run generate` must succeed (it's what CI runs). `npm run build`
  alone isn't what's deployed.
- `npx nuxi typecheck` needs `vue-tsc` and `typescript`, which aren't
  installed — ask before adding them.
- Play a full game in the browser at phone width (~390px), with
  `npm run dev` or `npx serve .output/public` (then open
  `/thirty-seconds-clone/`):
  - add and remove a team and a player (remove buttons only above 2);
  - start, play a turn to the end of the timer, and one ended early by
    tapping the ring; both sounds play;
  - tick some words, "Klaar", check the score and that the next team and
    player are right;
  - reload between turns → "Ga verder met bestaand spel" resumes with
    the same scores and turn;
  - play to the target score (pick 10) → winner screen → "Begin opnieuw"
    keeps the teams and resets the scores.
- If you edited a word list, check it's valid JSON, has no duplicates,
  and every cookie still fits:
  ```
  node -e "for(const c of ['people','places','wildcards','media','brands']){const a=require('./public/'+c+'.json').data;console.log(c,a.length,'dupes',a.length-new Set(a).size,'cookie bytes',Buffer.byteLength('available_'+c+'='+JSON.stringify(a)))}"
  ```
  Every cookie must stay well under 4096 bytes.

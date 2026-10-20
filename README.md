# thirty-seconds-clone

## Over

Een browserversie van het partyspel *30 Seconds*, te spelen op
https://nickhuijgen.github.io/thirty-seconds-clone/. Eén telefoon gaat
de kring rond: de speler die aan de beurt is krijgt vijf woorden — een
persoon, een plaats, een wildcard, een film of serie en een merk — en
heeft 30 seconden om ze aan zijn of haar team te omschrijven. Elk geraden
woord is een punt; het eerste team dat de puntengrens haalt wint.

Een lopend spel wordt na elke beurt op je telefoon bewaard, zodat je na
het herladen van de pagina verder kunt. Tijdens een spel blijft het
scherm aan, je kunt de site als app aan je beginscherm toevoegen, en na
één bezoek werkt het spel ook zonder internet.

## About

A browser version of the party game *30 Seconds* (in Dutch), playable at
https://nickhuijgen.github.io/thirty-seconds-clone/. One phone is passed
around: the active player gets five words — a person, a place, a
wildcard, a film or series and a brand — and has 30 seconds to describe
them to their team. Each guessed word is a point; the first team to the
target score wins.

A game in progress is saved on the phone after every turn, so it
survives a page reload. The screen stays on during a game, the site can
be added to the home screen as an app, and after one visit the game also
works without an internet connection.

## Setup

Built with [Vue](https://vuejs.org) 3, [Vite](https://vite.dev) and Tailwind CSS v4, made
for phones. No backend: the word lists are
JSON files in `public/` bundled into the app, and a game is saved in
`localStorage`.

Deployed to GitHub Pages by GitHub Actions on every push to `main`, after
the type check and tests pass (`.github/workflows/deploy.yml`). See [`AGENTS.md`](./AGENTS.md) for the
full picture — game flow, persistence, invariants, verification — it's
the primary reference for working on this codebase, human or AI.

All commands run from the project root:

| Command | Action |
| :--- | :--- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the dev server at `localhost:5173/thirty-seconds-clone/` |
| `npm run build` | Build the static site to `./dist/` — what CI deploys |
| `npm run preview` | Preview the build locally |
| `npm run check` | Type-check the app and tests (`vue-tsc`) |
| `npm test` | Run the game-logic and word-list tests (`node --test`) |
| `npm run verify` | `check`, `test`, then `build` — run this before pushing |

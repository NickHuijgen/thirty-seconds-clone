# thirty-seconds-clone

## Over

Een browserversie van het partyspel *30 Seconds*, te spelen op
https://nickhuijgen.github.io/thirty-seconds-clone/. Eén telefoon gaat
de kring rond: de speler die aan de beurt is krijgt vijf woorden — een
persoon, een plaats, een wildcard, een film of serie en een merk — en
heeft 30 seconden om ze aan zijn of haar team te omschrijven. Elk geraden
woord is een punt; het eerste team dat de puntengrens haalt wint.

Een lopend spel wordt na elke beurt in cookies bewaard, zodat je na het
herladen van de pagina verder kunt.

## About

A browser version of the party game *30 Seconds* (in Dutch), playable at
https://nickhuijgen.github.io/thirty-seconds-clone/. One phone is passed
around: the active player gets five words — a person, a place, a
wildcard, a film or series and a brand — and has 30 seconds to describe
them to their team. Each guessed word is a point; the first team to the
target score wins.

A game in progress is saved to cookies after every turn, so it survives
a page reload.

## Setup

Built with [Nuxt](https://nuxt.com) 4 as a client-only SPA (`ssr: false`),
Vue 3 and Tailwind CSS v3. No backend: the word lists are JSON files in
`public/` bundled into the app.

Deployed to GitHub Pages by GitHub Actions on every push to `main`
(`.github/workflows/deploy.yml`). See [`AGENTS.md`](./AGENTS.md) for the
full picture — game flow, persistence, invariants, verification — it's
the primary reference for working on this codebase, human or AI.

All commands run from the project root:

| Command | Action |
| :--- | :--- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the dev server at `localhost:3000/thirty-seconds-clone/` |
| `npm run generate` | Build the static site to `./.output/public/` — what CI deploys |
| `npm run build` | Nuxt production build (not what's deployed) |
| `npm run preview` | Preview the build locally |

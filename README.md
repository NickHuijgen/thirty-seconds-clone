# thirty-seconds-clone

## Over

Een browserversie van het partyspel *30 Seconds*, te spelen op
https://thirty-seconds-clone.nickhuijgen.nl/. De speler die aan de beurt
is krijgt vijf woorden — een persoon, een plaats, een wildcard, een film
of serie en een merk — en heeft 30 seconden om ze aan zijn of haar team
te omschrijven. Elk geraden woord is een punt; het eerste team dat de
puntengrens haalt wint.

Speel op één telefoon die de kring rondgaat, of online: iedereen op zijn
eigen telefoon, in een lobby met een code van vier tekens. Online ziet
alleen wie aan de beurt is de woorden, en loopt de klok op elke telefoon
gelijk.

Op één telefoon wordt een lopend spel na elke beurt bewaard, zodat je na
het herladen van de pagina verder kunt, en werkt het spel na één bezoek
ook zonder internet. Tijdens een spel blijft het scherm aan, en je kunt
de site als app aan je beginscherm toevoegen.

## About

A browser version of the party game *30 Seconds* (in Dutch), playable at
https://thirty-seconds-clone.nickhuijgen.nl/. The active player gets
five words — a person, a place, a wildcard, a film or series and a brand
— and has 30 seconds to describe them to their team. Each guessed word is
a point; the first team to the target score wins.

Play on one phone passed around the table, or online: everyone on their
own phone, in a room with a four-character code. Online, only the player
describing sees the words, and the timer runs in sync on every phone.

On one phone, a game in progress is saved after every turn, so it
survives a page reload, and after one visit the game also works without
an internet connection. The screen stays on during a game, and the site
can be added to the home screen as an app.

## Setup

Built with [Vue](https://vuejs.org) 3, [Vite](https://vite.dev) and Tailwind CSS v4, made
for phones. The word lists are JSON files in `public/` bundled into the
app, and a one-phone game is saved in `localStorage`. Online play runs on
the same Cloudflare Worker that serves the site: one Durable Object per
room (`server/`), talking to the phones over a WebSocket.

Deployed to a Cloudflare Worker (`wrangler.jsonc`) by Cloudflare's Git
integration on every push to `main`, after the type check and tests pass. See [`AGENTS.md`](./AGENTS.md) for the
full picture — game flow, persistence, invariants, verification — it's
the primary reference for working on this codebase, human or AI.

All commands run from the project root:

| Command | Action |
| :--- | :--- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the dev server at `localhost:5173`, with the Worker for online play |
| `npm run build` | Build the static site to `./dist/` — what CI deploys |
| `npm run preview` | Preview the build locally |
| `npm run check` | Type-check the app and tests (`vue-tsc`) |
| `npm run check:server` | Type-check the Worker against Cloudflare's types |
| `npm test` | Run the game, online-rules, clock and word-list tests (`node --test`) |
| `npm run test:online` | Play an online game with four simulated phones against a running `npm run dev` (~45 s) |
| `npm run verify` | Both type checks, `test`, then `build` — run this before pushing |

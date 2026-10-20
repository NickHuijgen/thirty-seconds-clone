---
name: edit-words
description: Add, remove, review or clean up the game's word lists (public/people.json, places.json, wildcards.json, media.json, brands.json) — pick words that fit the category and a Dutch party audience, use Dutch spelling, dedupe against every list, keep the file format, run the checks, and commit. Use when the user says things like "add 20 films", "add more Dutch people", "remove the old words", "these words are too hard", "check the word lists", "clean up places", or names a word that should (not) be in the game.
---

# Edit the word lists

The game draws one word per category per turn from five lists in
`public/`, each `{ "data": string[] }`. This skill changes those lists.
The mechanical checks (format, duplicates within and across lists,
minimum size) live in `test/words.test.ts` — never hand-roll them inline;
run `npm test`, it takes a second.

## Procedure

### 0. Sync first

```
git pull --ff-only
```

### 1. Work out the request

Which category, how many words, add or remove, and any theme ("more
Dutch", "easier", "90s films"). If the category is ambiguous ("add some
footballers" → `people`; "add some songs" → `media`), use the table in
step 2 and say which list you picked. If the user gave the exact words,
skip to step 3.

### 2. Choose words

| File | What belongs | Examples already in it |
|---|---|---|
| `people.json` | Real people, and well-known fictional characters | Barack Obama, Marco Borsato, Zlatan Ibrahimovic, Freddie Mercury, Saul Goodman |
| `places.json` | Cities, countries, Dutch provinces and towns, other places on a map | Rio de Janeiro, Boekarest, Ulaanbaatar, Zeewolde, Flevoland |
| `wildcards.json` | Anything else: landmarks, animals, objects, events, concepts | Het Vrijheidsbeeld, Kangoeroe, Rubik's kubus, Koude Oorlog, De Keukenhof |
| `media.json` | Films, series, songs, games, fairy tales | Titanic, Doornroosje, Bohemian Rhapsody, League of Legends |
| `brands.json` | Companies, brands, products, media outlets | Heineken, Hermès, Dyson, CNN, ChatGPT |

What makes a good word here:
- **Known to a Dutch group of friends.** Someone at the table has to be
  able to describe it, and someone else to guess it, in a few seconds.
  Mix easy and medium; avoid the obscure. When in doubt, leave it out.
- **Dutch names where a Dutch name exists**: Londen, Parijs, Istanboel,
  Boekarest, De Godfather, Doornroosje, Het Vrijheidsbeeld. Keep the
  original title when that's what Dutch people say (Fight Club, The Last
  of Us). Use proper capitals and accents (Zürich, Hermès, Brasília).
- **Describable without saying the word.** Avoid entries that are mostly
  the category word ("Pizza Hut" is fine; "Het Restaurant" isn't).
- **Not offensive or about tragedies** — it's a party game.
- **Not in another list.** A word that fits two categories goes in one
  only (the tests fail otherwise): `Casablanca` stays in places,
  `Halloween` in wildcards, `Diesel` in brands.

Present the proposed words to the user as a list before writing them,
unless they gave the words themselves or said to just go ahead.

### 3. Edit the file

Append new words at the end of `data` (order doesn't matter to the game;
appending keeps diffs readable). Keep the format exactly:
`JSON.stringify({ data }, null, 2)` plus a trailing newline. The safest
way is a short node one-liner that reads, changes and writes the array:

```
node -e "const fs=require('fs');const f='public/media.json';const d=JSON.parse(fs.readFileSync(f,'utf8'));d.data.push('Word 1','Word 2');fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n')"
```

To remove: filter the array the same way. Never rewrite a whole file by
hand.

### 4. Check

```
npm test
```

`test/words.test.ts` fails on a wrong format, an empty or untrimmed word,
a duplicate within a list or across lists (case- and accent-insensitive:
"Bogota" and "Bogotá" count as one), or a list under 100 words. Fix what
it reports — a duplicate means dropping the new word, not the old one.

Then show the user the final diff (`git diff --stat` and the added or
removed words).

### 5. Commit

One commit per request, in the repo's style:

```
git add public/*.json
git commit -m "[main] add 20 films"
```

**Ask before pushing** — pushing to `main` deploys the game.

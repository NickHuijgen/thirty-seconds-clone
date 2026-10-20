/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATEGORIES } from '../models/Game.ts';

// The real word lists in public/, the ones the game ships with
const files = CATEGORIES.map(category => {
    const path = new URL(`../public/${category}.json`, import.meta.url);
    const text = readFileSync(path, 'utf8');

    return { category, text, data: JSON.parse(text).data as unknown };
});

// Case and accents don't make a different word on the card ("Tiësto" / "tiesto")
const normalise = (word: string) => word.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

for (const { category, text, data } of files) {
    test(`${category}.json is { "data": string[] } in the project's format`, () => {
        assert.ok(Array.isArray(data));
        assert.equal(text, JSON.stringify({ data }, null, 2) + '\n', 'two-space JSON with a trailing newline');
    });

    test(`${category}.json has only non-empty, trimmed words`, () => {
        for (const word of data as unknown[]) {
            assert.equal(typeof word, 'string');
            assert.ok((word as string).length > 0, 'empty word');
            assert.equal(word, (word as string).trim(), `"${word}" has leading or trailing spaces`);
        }
    });

    test(`${category}.json has no duplicates`, () => {
        const seen = new Map<string, string>();
        const duplicates: string[] = [];
        for (const word of data as string[]) {
            const key = normalise(word);
            if (seen.has(key)) {
                duplicates.push(`"${word}" (also "${seen.get(key)}")`);
            }
            seen.set(key, word);
        }
        assert.deepEqual(duplicates, []);
    });

    test(`${category}.json has enough words for a long game`, () => {
        assert.ok((data as string[]).length >= 100, `only ${(data as string[]).length} words`);
    });
}

test('no word is in two categories', () => {
    const owner = new Map<string, string>();
    const shared: string[] = [];
    for (const { category, data } of files) {
        for (const word of data as string[]) {
            const other = owner.get(normalise(word));
            if (other && other !== category) {
                shared.push(`"${word}" in ${other} and ${category}`);
            }
            owner.set(normalise(word), category);
        }
    }
    assert.deepEqual(shared, []);
});

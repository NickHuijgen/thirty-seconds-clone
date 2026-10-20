/// <reference types="node" />
import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Game, { CATEGORIES, STORAGE_KEY, TURN_SECONDS } from '../models/Game.ts';
import { installStorage, newGame, playTurn, recordingSounds, wordLists, type MemoryStorage } from './helpers.ts';

let storage: MemoryStorage;

beforeEach(() => {
    storage = installStorage();
});

test('setUp gives every team and player a unique index from 0', () => {
    const game = newGame({ teams: 4, playersPerTeam: 3 });
    game.setUp();

    assert.deepEqual(game.teams.map(t => t.index).sort(), [0, 1, 2, 3]);
    for (const team of game.teams) {
        assert.deepEqual(team.players.map(p => p.index).sort(), [0, 1, 2]);
    }
    assert.equal(game.is_in_progress, true);
});

test('setUp copies the word lists instead of using them directly', () => {
    const words = wordLists();
    const game = newGame({ words });
    game.setUp();
    game.startTurn();
    game.forceEndTurn();

    assert.equal(words.people.length, 20, 'drawing words must not shrink the source lists');
});

test('a turn shows one word per category and removes them from the pool', () => {
    const game = newGame();
    game.setUp();
    game.setActiveWords();

    assert.equal(game.active_words.length, CATEGORIES.length);
    CATEGORIES.forEach((category, i) => {
        assert.ok(game.words[category].includes(game.active_words[i]!), `word ${i} comes from ${category}`);
        assert.ok(!game.available[category].includes(game.active_words[i]!), `word ${i} is no longer available`);
    });
});

test('no word repeats until a category runs out', () => {
    const game = newGame({ words: wordLists(10) });
    game.setUp();

    const seen: string[] = [];
    for (let i = 0; i < 10; i++) {
        seen.push(...playTurn(game, 0));
    }

    assert.equal(new Set(seen).size, seen.length);
});

test('the timer counts down, booms at 1 second and moves to scoring at 0', () => {
    mock.timers.enable({ apis: ['setInterval'] });
    try {
        const { loadSound, played } = recordingSounds();
        const game = newGame({ loadSound });
        game.setUp();
        game.startTurn();

        assert.equal(game.turn_timer, TURN_SECONDS);
        assert.deepEqual(played, ['turn-start']);

        mock.timers.tick(1000 * (TURN_SECONDS - 1));
        assert.equal(game.turn_timer, 1);
        assert.deepEqual(played, ['turn-start', 'vine-boom']);
        assert.equal(game.is_applying_score, false);

        mock.timers.tick(1000);
        assert.equal(game.turn_timer, 0);
        assert.equal(game.is_applying_score, true);

        mock.timers.tick(5000);
        assert.equal(game.turn_timer, 0, 'the interval is cleared');
    } finally {
        mock.timers.reset();
    }
});

test('ending a turn early stops the timer and booms', () => {
    mock.timers.enable({ apis: ['setInterval'] });
    try {
        const { loadSound, played } = recordingSounds();
        const game = newGame({ loadSound });
        game.setUp();
        game.startTurn();
        mock.timers.tick(3000);
        game.forceEndTurn();

        assert.equal(game.turn_timer, 0);
        assert.equal(game.is_applying_score, true);
        assert.deepEqual(played, ['turn-start', 'vine-boom']);

        mock.timers.tick(30000);
        assert.deepEqual(played, ['turn-start', 'vine-boom'], 'no second boom from the cleared timer');
    } finally {
        mock.timers.reset();
    }
});

test('teams take turns in index order and players rotate within their team', () => {
    const game = newGame({ teams: 2, playersPerTeam: 2 });
    game.setUp();

    const turns: string[] = [];
    for (let i = 0; i < 4; i++) {
        turns.push(`${game.activeTeam().name}/${game.activeTeam().activePlayer()!.name}`);
        playTurn(game, 0);
    }

    const [team0, team1] = [game.teams.find(t => t.index === 0)!, game.teams.find(t => t.index === 1)!];
    const name = (team: typeof team0, index: number) => `${team.name}/${team.players.find(p => p.index === index)!.name}`;
    assert.deepEqual(turns, [name(team0, 0), name(team1, 0), name(team0, 1), name(team1, 1)]);
});

test('the guessed words are added to the score, and reaching the target wins', () => {
    const game = newGame({ maxScore: 10 });
    game.setUp();
    const first = game.activeTeam();

    playTurn(game, 5);
    assert.equal(first.score, 5);
    assert.equal(game.is_finished, false);

    playTurn(game, 2);
    playTurn(game, 5);
    assert.equal(first.score, 10);
    assert.equal(game.is_finished, true);
    assert.equal(game.winning_team, first);
});

test('restart keeps the teams, resets the scores and goes back to setup', () => {
    const game = newGame({ maxScore: 5 });
    game.setUp();
    playTurn(game, 5);
    game.restart();

    assert.deepEqual(game.teams.map(t => t.score), [0, 0]);
    assert.equal(game.teams.length, 2);
    assert.equal(game.is_finished, false);
    assert.equal(game.is_in_progress, false);
    assert.equal(game.winning_team, null);
    assert.equal(game.canLoadSaved(), false, 'no "Ga verder" after restarting');
});

test('a game saved after a turn resumes with the same teams, scores and turn', () => {
    const game = newGame();
    game.setUp();
    playTurn(game, 3);
    playTurn(game, 1);

    const resumed = newGame();
    assert.equal(resumed.canLoadSaved(), true);
    resumed.loadSaved();

    assert.equal(resumed.active_team_index, game.active_team_index);
    assert.equal(resumed.is_in_progress, true);
    assert.equal(resumed.turn_timer, 0);
    assert.equal(resumed.is_applying_score, false);
    assert.deepEqual(
        resumed.teams.map(t => [t.name, t.score, t.index, t.active_player_index, t.players.map(p => [p.name, p.index])]),
        game.teams.map(t => [t.name, t.score, t.index, t.active_player_index, t.players.map(p => [p.name, p.index])]),
    );
    assert.equal(resumed.activeTeam().activePlayer()!.name, game.activeTeam().activePlayer()!.name);
    assert.deepEqual(resumed.available, game.available);
});

test('words from before a resume are not drawn again', () => {
    const game = newGame({ words: wordLists(4) });
    game.setUp();
    const before = [...playTurn(game, 0), ...playTurn(game, 0)];

    const resumed = newGame({ words: wordLists(4) });
    resumed.loadSaved();
    const after = [...playTurn(resumed, 0), ...playTurn(resumed, 0)];

    assert.deepEqual(after.filter(w => before.includes(w)), []);
});

test('resuming a finished game shows the winner', () => {
    const game = newGame({ maxScore: 5 });
    game.setUp();
    const winner = game.activeTeam().name;
    playTurn(game, 5);

    const resumed = newGame();
    resumed.loadSaved();

    assert.equal(resumed.is_finished, true);
    assert.equal(resumed.winning_team?.name, winner);
});

test('a new game clears the saved one; a restarted game does not', () => {
    const game = newGame();
    game.setUp();
    playTurn(game, 1);
    assert.ok(storage.getItem(STORAGE_KEY));

    newGame().setUp();
    assert.equal(storage.getItem(STORAGE_KEY), null);

    game.restart();
    playTurn(game, 1);
    game.restart();
    game.setUp();
    assert.ok(storage.getItem(STORAGE_KEY), 'restart keeps the last save until the next turn overwrites it');
});

test('an expired, corrupt or missing save is ignored', () => {
    const game = newGame();
    game.setUp();
    playTurn(game, 1);

    const saved = JSON.parse(storage.getItem(STORAGE_KEY)!);
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, expires_at: Date.now() - 1 }));
    assert.equal(newGame().canLoadSaved(), false, 'expired');

    storage.setItem(STORAGE_KEY, '{not json');
    assert.equal(newGame().canLoadSaved(), false, 'corrupt');

    storage.removeItem(STORAGE_KEY);
    const fresh = newGame();
    assert.equal(fresh.canLoadSaved(), false, 'missing');
    fresh.loadSaved();
    assert.deepEqual(fresh.teams.map(t => t.name), ['Team 1', 'Team 2'], 'loading nothing leaves the game alone');
});

test('a failing save does not break the game', (t) => {
    t.mock.method(console, 'log', () => {});
    storage.failWrites = true;
    const game = newGame();
    game.setUp();

    assert.doesNotThrow(() => playTurn(game, 2));
    assert.equal(game.canLoadSaved(), false);
});

test('without localStorage at all the game still plays', (t) => {
    t.mock.method(console, 'log', () => {});
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true, writable: true });
    const game = newGame();

    assert.doesNotThrow(() => {
        game.setUp();
        playTurn(game, 2);
    });
    assert.equal(game.canLoadSaved(), false);
});

test('the save holds only what loadSaved reads back', () => {
    const game = newGame();
    game.setUp();
    playTurn(game, 1);

    const saved = JSON.parse(storage.getItem(STORAGE_KEY)!);
    assert.deepEqual(Object.keys(saved).sort(), [
        'active_team_index', 'available', 'expires_at', 'is_finished', 'is_in_progress', 'max_score', 'teams',
    ]);
    assert.ok(!('words' in saved), 'the full word lists are not saved');
});

test('Game.emptyWordLists has every category', () => {
    assert.deepEqual(Object.keys(Game.emptyWordLists()).sort(), [...CATEGORIES].sort());
});

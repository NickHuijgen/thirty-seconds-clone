/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TURN_SECONDS } from '../models/Game.ts';
import {
    canScore, createRoom, describerId, disconnect, handle, isExpired, join, messagesFor, nextAlarm,
    parseMessage, phase, ROOM_LIFETIME, settle, START_DELAY, view, type RoomData,
} from '../server/rules.ts';
import { generateCode, MAX_MEMBERS, normaliseCode, type ClientMessage, type ServerMessage } from '../server/protocol.ts';
import { wordLists } from './helpers.ts';

const words = wordLists();
const T0 = 1_000_000;

// A room with `names` joined in order (the first is the host), each with id p1, p2, …
function roomWith(names: string[], now = T0): RoomData {
    const room = createRoom('ABCD', now, words);
    let next = 1;
    for (const name of names) {
        const result = join(room, name, undefined, now, () => `p${next++}`);
        assert.ok(result.playerId, `${name} joins`);
    }

    return room;
}

function send(room: RoomData, playerId: string, message: ClientMessage, now = T0) {
    return handle(room, playerId, message, now, words);
}

// Four players in two teams, the game started
function startedRoom(): RoomData {
    const room = roomWith(['Anna', 'Bram', 'Cas', 'Dewi']);
    send(room, 'p1', { type: 'assignPlayer', playerId: 'p1', teamIndex: 0 });
    send(room, 'p1', { type: 'assignPlayer', playerId: 'p2', teamIndex: 0 });
    send(room, 'p1', { type: 'assignPlayer', playerId: 'p3', teamIndex: 1 });
    send(room, 'p1', { type: 'assignPlayer', playerId: 'p4', teamIndex: 1 });
    assert.deepEqual(send(room, 'p1', { type: 'start' }), { changed: true });

    return room;
}

function others(room: RoomData, id: string): string[] {
    return room.members.map(m => m.id).filter(m => m !== id);
}

function wordsMessages(messages: ServerMessage[]) {
    return messages.filter(m => m.type === 'words');
}

test('the first player to join is the host, and a new room has two empty teams', () => {
    const room = roomWith(['Anna', 'Bram']);

    assert.equal(room.host_id, 'p1');
    assert.equal(phase(room, T0), 'lobby');
    assert.deepEqual(room.game.teams.map(t => [t.name, t.players.length]), [['Team 1', 0], ['Team 2', 0]]);
});

test('joining checks the name and the room size', () => {
    const room = roomWith(['Anna']);

    assert.equal(join(room, '   ', undefined, T0, () => 'x').error, 'Vul je naam in');
    assert.equal(join(room, 'anna', undefined, T0, () => 'x').error, 'Die naam is al bezet');
    assert.equal(join(room, 'Een heel erg lange naam voor dit spel', undefined, T0, () => 'p2').playerId, 'p2');
    assert.equal(room.members[1]!.name.length, 20);

    for (let i = room.members.length; i < MAX_MEMBERS; i++) {
        join(room, `Speler ${i}`, undefined, T0, () => `extra${i}`);
    }
    assert.equal(room.members.length, MAX_MEMBERS);
    assert.equal(join(room, 'Te laat', undefined, T0, () => 'x').error, 'De lobby is vol');
});

test('a player gets their own seat back, by id or by name once disconnected', () => {
    const room = roomWith(['Anna', 'Bram']);

    // By saved id, even while the old connection is still open (a refresh)
    assert.equal(join(room, 'whatever', 'p2', T0, () => 'new').playerId, 'p2');

    disconnect(room, 'p2', false);
    assert.equal(room.members[1]!.connected_since, null);
    assert.equal(join(room, 'BRAM', undefined, T0 + 5, () => 'new').playerId, 'p2');
    assert.equal(room.members.length, 2);
});

test('the host passes to whoever has been connected longest, and only while the host is away', () => {
    const room = roomWith(['Anna'], T0);
    join(room, 'Bram', undefined, T0 + 10, () => 'p2');
    join(room, 'Cas', undefined, T0 + 5, () => 'p3');

    // A second connection of the host closing changes nothing
    assert.equal(disconnect(room, 'p1', true), false);
    assert.equal(room.host_id, 'p1');

    disconnect(room, 'p1', false);
    assert.equal(room.host_id, 'p3');

    // The old host coming back doesn't take it back
    join(room, 'Anna', 'p1', T0 + 20, () => 'x');
    assert.equal(room.host_id, 'p3');
});

test('only the host changes the lobby', () => {
    const room = roomWith(['Anna', 'Bram']);

    assert.deepEqual(send(room, 'p2', { type: 'setMaxScore', score: 10 }), { changed: false });
    assert.deepEqual(send(room, 'p2', { type: 'addTeam' }), { changed: false });
    assert.deepEqual(send(room, 'p2', { type: 'assignPlayer', playerId: 'p2', teamIndex: 0 }), { changed: false });
    assert.deepEqual(send(room, 'p2', { type: 'start' }), { changed: false });
    assert.equal(room.game.teams.length, 2);

    assert.deepEqual(send(room, 'p1', { type: 'setMaxScore', score: 10 }), { changed: true });
    assert.equal(room.game.max_score, 10);
    assert.deepEqual(send(room, 'p1', { type: 'setMaxScore', score: 7 }), { changed: false }, 'only 10/25/50/100');
});

test('the host assigns players to teams; players can not pick their own team', () => {
    const room = roomWith(['Anna', 'Bram', 'Cas']);

    send(room, 'p1', { type: 'assignPlayer', playerId: 'p2', teamIndex: 1 });
    assert.deepEqual(room.game.teams[1]!.players.map(p => [p.name, p.id]), [['Bram', 'p2']]);

    // Moving to another team takes them out of the first
    send(room, 'p1', { type: 'assignPlayer', playerId: 'p2', teamIndex: 0 });
    assert.deepEqual(room.game.teams.map(t => t.players.map(p => p.id)), [['p2'], []]);

    // Back to no team
    send(room, 'p1', { type: 'assignPlayer', playerId: 'p2', teamIndex: null });
    assert.deepEqual(room.game.teams.map(t => t.players.length), [0, 0]);

    // Asking for a team that doesn't exist does nothing
    assert.deepEqual(send(room, 'p1', { type: 'assignPlayer', playerId: 'p2', teamIndex: 5 }), { changed: false });
});

test('teams: added with the next colour, renamed, removed down to two', () => {
    const room = roomWith(['Anna', 'Bram']);

    send(room, 'p1', { type: 'addTeam' });
    assert.deepEqual(room.game.teams.map(t => [t.name, t.colour]), [['Team 1', 'emerald'], ['Team 2', 'sky'], ['Team 3', 'amber']]);

    send(room, 'p1', { type: 'renameTeam', teamIndex: 2, name: '  De Winnaars  ' });
    assert.equal(room.game.teams[2]!.name, 'De Winnaars');
    assert.deepEqual(send(room, 'p1', { type: 'renameTeam', teamIndex: 2, name: '   ' }), { changed: false });

    send(room, 'p1', { type: 'assignPlayer', playerId: 'p2', teamIndex: 2 });
    send(room, 'p1', { type: 'removeTeam', teamIndex: 2 });
    assert.equal(room.game.teams.length, 2);
    assert.ok(room.game.teams.every(t => t.players.length === 0), 'its players wait for a team again');

    assert.equal(send(room, 'p1', { type: 'removeTeam', teamIndex: 0 }).error, 'Er zijn minstens 2 teams nodig');
});

test('the game starts only with at least 2 players in every team', () => {
    const room = roomWith(['Anna', 'Bram', 'Cas', 'Dewi', 'Eva']);
    send(room, 'p1', { type: 'assignPlayer', playerId: 'p1', teamIndex: 0 });
    send(room, 'p1', { type: 'assignPlayer', playerId: 'p2', teamIndex: 0 });
    send(room, 'p1', { type: 'assignPlayer', playerId: 'p3', teamIndex: 1 });

    assert.equal(send(room, 'p1', { type: 'start' }).error, 'Elk team heeft minstens 2 spelers nodig');
    assert.equal(phase(room, T0), 'lobby');

    send(room, 'p1', { type: 'assignPlayer', playerId: 'p4', teamIndex: 1 });
    assert.deepEqual(send(room, 'p1', { type: 'start' }), { changed: true });

    // Eva has no team: she watches
    assert.equal(phase(room, T0), 'pre-turn');
    assert.equal(room.turn, 1);
    const indexes = room.game.teams.map(t => t.index).sort();
    assert.deepEqual(indexes, [0, 1]);
    assert.ok(Object.values(room.game.available!).every(list => list.length === 20), 'the words are dealt');
});

test('empty teams are left out at the start, but at least 2 teams must play', () => {
    const room = roomWith(['Anna', 'Bram', 'Cas', 'Dewi']);
    send(room, 'p1', { type: 'addTeam' });
    send(room, 'p1', { type: 'assignPlayer', playerId: 'p1', teamIndex: 0 });
    send(room, 'p1', { type: 'assignPlayer', playerId: 'p2', teamIndex: 0 });

    assert.equal(send(room, 'p1', { type: 'start' }).error, 'Zet spelers in minstens 2 teams');

    send(room, 'p1', { type: 'assignPlayer', playerId: 'p3', teamIndex: 2 });
    send(room, 'p1', { type: 'assignPlayer', playerId: 'p4', teamIndex: 2 });
    assert.deepEqual(send(room, 'p1', { type: 'start' }), { changed: true });
    assert.deepEqual(room.game.teams.map(t => t.name).sort(), ['Team 1', 'Team 3']);
    assert.deepEqual(room.game.teams.map(t => t.index).sort(), [0, 1]);
});

test('only the describer starts the turn, and only once', () => {
    const room = startedRoom();
    const describer = describerId(room)!;
    const other = others(room, describer)[0]!;

    assert.deepEqual(send(room, other, { type: 'startTurn', turn: room.turn }), { changed: false });
    assert.deepEqual(send(room, describer, { type: 'startTurn', turn: room.turn + 1 }), { changed: false }, 'wrong turn');

    assert.deepEqual(send(room, describer, { type: 'startTurn', turn: room.turn }), { changed: true });
    assert.equal(phase(room, T0), 'turn');
    assert.equal(room.ends_at, T0 + TURN_SECONDS * 1000 + START_DELAY);
    assert.equal(room.active_words.length, 5);

    // A double tap
    assert.deepEqual(send(room, describer, { type: 'startTurn', turn: room.turn }), { changed: false });
});

test('during the turn only the describer receives the words', () => {
    const room = startedRoom();
    const describer = describerId(room)!;
    send(room, describer, { type: 'startTurn', turn: room.turn });

    const state = view(room, T0 + 1000);
    assert.deepEqual(state.active_words, []);
    assert.equal(state.ends_at, room.ends_at);
    assert.ok(!JSON.stringify(state).includes(room.active_words[0]!), 'no word anywhere in the shared state');

    for (const id of others(room, describer)) {
        const messages = messagesFor(room, id, T0 + 1000);
        assert.deepEqual(wordsMessages(messages), []);
        assert.ok(!JSON.stringify(messages).includes(room.active_words[0]!));
    }

    assert.deepEqual(wordsMessages(messagesFor(room, describer, T0 + 1000)), [
        { type: 'words', turn: room.turn, words: room.active_words },
    ]);

    // The shared state never carries the remaining word lists
    assert.ok(!('available' in state.game));
});

test('when time is up, everyone sees the words; the alarm or the next message ends the turn', () => {
    const room = startedRoom();
    const describer = describerId(room)!;
    send(room, describer, { type: 'startTurn', turn: room.turn });
    const turnWords = [...room.active_words];
    const end = room.ends_at!;

    assert.equal(nextAlarm(room), end);
    assert.equal(settle(room, end - 1, words), false);
    assert.equal(phase(room, end), 'scoring', 'past ends_at counts as scoring even before the alarm');

    assert.equal(settle(room, end, words), true);
    assert.equal(room.is_applying_score, true);
    assert.equal(room.ends_at, null);
    assert.equal(nextAlarm(room), room.last_activity + ROOM_LIFETIME);

    for (const id of room.members.map(m => m.id)) {
        const [state] = messagesFor(room, id, end);
        assert.equal(state!.type, 'state');
        assert.deepEqual(state!.type === 'state' && state!.state.active_words, turnWords);
    }
    assert.deepEqual(wordsMessages(messagesFor(room, describer, end)), []);
});

test('a tick that arrives before the alarm still counts', () => {
    const room = startedRoom();
    const describer = describerId(room)!;
    send(room, describer, { type: 'startTurn', turn: room.turn });
    const end = room.ends_at!;

    const result = send(room, describer, { type: 'setWord', turn: room.turn, index: 0, guessed: true }, end + 50);
    assert.deepEqual(result, { changed: true });
    assert.deepEqual(room.guessed, [0]);
    assert.equal(room.is_applying_score, true);
});

test('ending early: only the describer, only during the turn', () => {
    const room = startedRoom();
    const describer = describerId(room)!;

    assert.deepEqual(send(room, describer, { type: 'endTurnEarly', turn: room.turn }), { changed: false }, 'not started');
    send(room, describer, { type: 'startTurn', turn: room.turn });
    assert.deepEqual(send(room, others(room, describer)[0]!, { type: 'endTurnEarly', turn: room.turn }), { changed: false });

    assert.deepEqual(send(room, describer, { type: 'endTurnEarly', turn: room.turn }, T0 + 3000), { changed: true });
    assert.equal(phase(room, T0 + 3000), 'scoring');
    assert.equal(room.ends_at, null);
    assert.ok(view(room, T0 + 3000).active_words.length === 5);
});

test('finishing before time is up does nothing', () => {
    const room = startedRoom();
    const describer = describerId(room)!;
    send(room, describer, { type: 'startTurn', turn: room.turn });

    assert.deepEqual(send(room, describer, { type: 'finishTurn', turn: room.turn }, T0 + 1000), { changed: false });
    assert.deepEqual(send(room, describer, { type: 'setWord', turn: room.turn, index: 0, guessed: true }, T0 + 1000), { changed: false });
    assert.equal(phase(room, T0 + 1000), 'turn');
});

test('the describer ticks words live, idempotently, and the score comes from the ticks', () => {
    const room = startedRoom();
    const describer = describerId(room)!;
    const team = room.game.teams.find(t => t.index === room.game.active_team_index)!;
    send(room, describer, { type: 'startTurn', turn: room.turn });
    send(room, describer, { type: 'endTurnEarly', turn: room.turn });
    const turn = room.turn;
    const turnWords = [...room.active_words];

    assert.deepEqual(send(room, describer, { type: 'setWord', turn, index: 3, guessed: true }), { changed: true });
    assert.deepEqual(send(room, describer, { type: 'setWord', turn, index: 3, guessed: true }), { changed: false }, 'repeat');
    send(room, describer, { type: 'setWord', turn, index: 0, guessed: true });
    send(room, describer, { type: 'setWord', turn, index: 1, guessed: true });
    send(room, describer, { type: 'setWord', turn, index: 1, guessed: false });
    assert.deepEqual(room.guessed, [0, 3]);
    assert.deepEqual(view(room, T0).guessed, [0, 3], 'everyone sees the ticks');

    // Out of range, and not the describer
    assert.deepEqual(send(room, describer, { type: 'setWord', turn, index: 5, guessed: true }), { changed: false });
    assert.deepEqual(send(room, others(room, describer)[0]!, { type: 'setWord', turn, index: 2, guessed: true }), { changed: false });

    assert.deepEqual(send(room, describer, { type: 'finishTurn', turn }), { changed: true });
    const scored = room.game.teams.find(t => t.name === team.name)!;
    assert.equal(scored.score, 2);
    assert.deepEqual(room.last_turn, { team_index: team.index, score: 2, words: turnWords, guessed: [0, 3] });
    assert.equal(room.turn, turn + 1);
    assert.equal(phase(room, T0), 'pre-turn');
    assert.deepEqual(room.active_words, []);
    assert.deepEqual(room.guessed, []);

    // A late repeat of finishTurn can't score the next turn
    assert.deepEqual(send(room, describer, { type: 'finishTurn', turn }), { changed: false });
});

test('turns pass between teams and players like on one phone', () => {
    const room = startedRoom();
    const seen: string[] = [];

    for (let i = 0; i < 4; i++) {
        const describer = describerId(room)!;
        seen.push(describer);
        send(room, describer, { type: 'startTurn', turn: room.turn });
        send(room, describer, { type: 'endTurnEarly', turn: room.turn });
        send(room, describer, { type: 'finishTurn', turn: room.turn });
    }

    assert.equal(new Set(seen).size, 4, 'all four players described once');
    const teamOf = (id: string) => room.game.teams.findIndex(t => t.players.some(p => p.id === id));
    assert.notEqual(teamOf(seen[0]!), teamOf(seen[1]!), 'teams alternate');
    assert.equal(Object.values(room.game.available!).reduce((n, l) => n + l.length, 0), 5 * 20 - 4 * 5, 'no word dealt twice');
});

test('reaching the target finishes the game; the host restarts with the same teams', () => {
    const room = startedRoom();
    send(room, 'p1', { type: 'setMaxScore', score: 10 }); // ignored mid-game
    room.game.max_score = 10;
    room.game.teams.forEach(t => t.score = 9);

    const describer = describerId(room)!;
    send(room, describer, { type: 'startTurn', turn: room.turn });
    send(room, describer, { type: 'endTurnEarly', turn: room.turn });
    send(room, describer, { type: 'setWord', turn: room.turn, index: 0, guessed: true });
    send(room, describer, { type: 'finishTurn', turn: room.turn });

    assert.equal(phase(room, T0), 'finished');
    assert.equal(describerId(room), null);

    assert.deepEqual(send(room, 'p2', { type: 'restart' }), { changed: false });
    assert.deepEqual(send(room, 'p1', { type: 'restart' }), { changed: true });
    assert.equal(phase(room, T0), 'lobby');
    assert.ok(room.game.teams.every(t => t.score === 0 && t.players.length === 2));
    assert.equal(room.last_turn, null);

    assert.deepEqual(send(room, 'p1', { type: 'start' }), { changed: true });
    assert.equal(phase(room, T0), 'pre-turn');
});

test('the host scores the turn when the describer is gone, but not while they are there', () => {
    const room = startedRoom();
    const describer = describerId(room)!;
    send(room, describer, { type: 'startTurn', turn: room.turn });
    send(room, describer, { type: 'endTurnEarly', turn: room.turn });

    const host = room.host_id === describer ? null : room.host_id!;
    if (host === null) {
        // The host is the describer: move the host elsewhere for this test
        room.host_id = others(room, describer)[0]!;
    }
    const scorer = room.host_id!;

    assert.equal(canScore(room, scorer), false);
    disconnect(room, describer, false);
    assert.equal(canScore(room, scorer), true);

    assert.deepEqual(send(room, scorer, { type: 'setWord', turn: room.turn, index: 2, guessed: true }), { changed: true });
    assert.deepEqual(send(room, scorer, { type: 'finishTurn', turn: room.turn }), { changed: true });
    assert.equal(room.last_turn!.score, 1);
});

test('a late joiner watches until the host gives them a seat at the end of a team\'s rotation', () => {
    const room = startedRoom();
    join(room, 'Eva', undefined, T0, () => 'p5');
    assert.ok(room.game.teams.every(t => !t.players.some(p => p.id === 'p5')));

    send(room, 'p1', { type: 'assignPlayer', playerId: 'p5', teamIndex: 0 });
    // Every change rebuilds the stored game, so look the team up again
    const team = room.game.teams[0]!;
    assert.deepEqual(team.players.map(p => p.index).sort(), [0, 1, 2]);
    assert.equal(team.players.find(p => p.id === 'p5')!.index, 2);

    // Seats can't move mid-game
    assert.equal(send(room, 'p1', { type: 'assignPlayer', playerId: 'p5', teamIndex: 1 }).error, 'Van team wisselen kan alleen vóór het spel');
});

test('kicking: the host only, never themselves, and teams keep their turn order', () => {
    const room = startedRoom();
    join(room, 'Eva', undefined, T0, () => 'p5');
    send(room, 'p1', { type: 'assignPlayer', playerId: 'p5', teamIndex: 0 });
    const team = room.game.teams[0]!;

    assert.deepEqual(send(room, 'p2', { type: 'kick', playerId: 'p3' }), { changed: false });
    assert.deepEqual(send(room, 'p1', { type: 'kick', playerId: 'p1' }), { changed: false });

    // Take out the first non-host in the team's rotation; the others close ranks in the same order.
    // (Kicking the describer is allowed here too: their turn hasn't started.)
    const order = [...team.players].sort((a, b) => a.index - b.index).map(p => p.id);
    const target = order.find(id => id !== room.host_id)!;
    const rest = order.filter(id => id !== target);
    const result = send(room, 'p1', { type: 'kick', playerId: target });
    assert.equal(result.kicked, target);

    const after = room.game.teams.find(t => t.name === team.name)!;
    assert.deepEqual([...after.players].sort((a, b) => a.index - b.index).map(p => p.id), rest);
    assert.deepEqual(after.players.map(p => p.index).sort(), [0, 1]);
    assert.ok(after.active_player_index < after.players.length);
    assert.ok(!room.members.some(m => m.id === target));
});

// A started game with these team sizes: players p1, p2, … filled in team by team (p1 is the host)
function gameWith(teamSizes: number[]): RoomData {
    const total = teamSizes.reduce((a, b) => a + b, 0);
    const room = roomWith(Array.from({ length: total }, (_, i) => `Speler ${i + 1}`));
    for (let t = 2; t < teamSizes.length; t++) {
        send(room, 'p1', { type: 'addTeam' });
    }
    let next = 1;
    teamSizes.forEach((size, team) => {
        for (let i = 0; i < size; i++) {
            send(room, 'p1', { type: 'assignPlayer', playerId: `p${next++}`, teamIndex: team });
        }
    });
    assert.deepEqual(send(room, 'p1', { type: 'start' }), { changed: true });

    return room;
}

const teamNameOf = (room: RoomData, id: string) => room.game.teams.find(t => t.players.some(p => p.id === id))?.name;

// The game never waits for someone who left: these are the ways it used to get stuck
test('a player who leaves before their turn: the next teammate is up', () => {
    const room = gameWith([3, 3]);
    const leaver = describerId(room)!;
    const team = teamNameOf(room, leaver)!;

    const result = send(room, leaver, { type: 'leave' });
    assert.equal(result.left, leaver);
    assert.equal(result.notice, undefined, 'nothing to announce: the game simply goes on');
    assert.ok(!room.members.some(m => m.id === leaver));
    assert.equal(phase(room, T0), 'pre-turn');
    assert.equal(teamNameOf(room, describerId(room)!), team, 'the same team goes on with the next player');

    assert.deepEqual(send(room, describerId(room)!, { type: 'startTurn', turn: room.turn }), { changed: true });
});

test('a describer who leaves mid-turn or while scoring: that turn does not count, the next team is up', () => {
    for (const during of ['turn', 'scoring'] as const) {
        const room = gameWith([3, 3]);
        const leaver = describerId(room)!;
        const team = teamNameOf(room, leaver)!;
        send(room, leaver, { type: 'startTurn', turn: room.turn });
        if (during === 'scoring') {
            send(room, leaver, { type: 'endTurnEarly', turn: room.turn });
            send(room, leaver, { type: 'setWord', turn: room.turn, index: 0, guessed: true });
        }
        const turn = room.turn;

        send(room, leaver, { type: 'leave' }, T0 + 5000);

        assert.equal(phase(room, T0 + 5000), 'pre-turn', during);
        assert.equal(room.turn, turn + 1, 'messages about the old turn are out of date');
        assert.deepEqual(room.active_words, []);
        assert.deepEqual(room.guessed, []);
        assert.equal(room.ends_at, null);
        assert.ok(room.game.teams.every(t => t.score === 0), 'the turn scored nothing');
        assert.notEqual(teamNameOf(room, describerId(room)!), team, 'the other team is up');
        assert.equal(nextAlarm(room), room.last_activity + ROOM_LIFETIME, 'no alarm for a turn that is gone');

        const left = room.game.teams.find(t => t.name === team)!;
        assert.deepEqual(left.players.map(p => p.index).sort(), [0, 1], 'the team closes ranks');
        assert.ok(left.active_player_index < left.players.length);
    }
});

test('a team with fewer than 2 players stops while the game goes on; whoever is left watches', () => {
    const room = gameWith([2, 2, 2]);
    // Someone from a team that isn't up
    const up = teamNameOf(room, describerId(room)!)!;
    const quiet = room.game.teams.find(t => t.name !== up)!;
    const [leaver, remaining] = quiet.players.map(p => p.id) as [string, string];

    const result = send(room, leaver, { type: 'leave' });

    assert.equal(result.notice, `${quiet.name} doet niet meer mee: te weinig spelers`);
    assert.equal(room.game.teams.length, 2);
    assert.equal(teamNameOf(room, remaining), undefined, 'the last one has no team any more');
    assert.ok(room.members.some(m => m.id === remaining), '...but is still in the room');
    assert.deepEqual(room.game.teams.map(t => t.index).sort(), [0, 1]);
    assert.equal(teamNameOf(room, describerId(room)!), up, 'the team that was up still is');
    assert.equal(phase(room, T0), 'pre-turn');

    // The host (who may have changed, if the host was the one leaving) can seat them in another team
    send(room, room.host_id!, { type: 'assignPlayer', playerId: remaining, teamIndex: 0 });
    assert.ok(teamNameOf(room, remaining));
});

test('the team that is up stopping mid-turn: the turn does not count and the next team is up', () => {
    const room = gameWith([2, 2, 2]);
    const describer = describerId(room)!;
    const up = teamNameOf(room, describer)!;
    const teammate = room.game.teams.find(t => t.name === up)!.players.find(p => p.id !== describer)!.id;
    send(room, describer, { type: 'startTurn', turn: room.turn });

    // Not the describer, but their only teammate
    send(room, teammate, { type: 'leave' });

    assert.equal(phase(room, T0), 'pre-turn');
    assert.equal(room.game.teams.length, 2);
    assert.notEqual(teamNameOf(room, describerId(room)!), up);
    assert.equal(teamNameOf(room, describer), undefined);
});

test('fewer than 4 players: the game stops and everyone is back in the lobby, with every team', () => {
    // Two teams of two: anyone leaving leaves 3 players (and a team of 1)
    const small = gameWith([2, 2]);
    const result = send(small, describerId(small)!, { type: 'leave' });
    assert.equal(result.notice, 'Het spel is gestopt: minder dan 4 spelers');
    assert.equal(phase(small, T0), 'lobby');
    assert.ok(small.game.teams.every(t => t.score === 0));
    // Back in the lobby with both teams, the one with a player short included: no team disappears
    assert.deepEqual(small.game.teams.map(t => t.players.length).sort(), [1, 2]);

    // Teams of three and two, a turn played: 4 players left after one leaves, 3 after the next.
    // (Also one team of two short: the game stops rather than that team.)
    const room = gameWith([3, 2]);
    const describer = describerId(room)!;
    send(room, describer, { type: 'startTurn', turn: room.turn });
    send(room, describer, { type: 'endTurnEarly', turn: room.turn });
    send(room, describer, { type: 'setWord', turn: room.turn, index: 0, guessed: true });
    send(room, describer, { type: 'finishTurn', turn: room.turn });

    const big = room.game.teams.find(t => t.players.length === 3)!;
    assert.equal(send(room, big.players[0]!.id, { type: 'leave' }).notice, undefined, '4 players: on we go');
    assert.equal(phase(room, T0), 'pre-turn');

    const stillBig = room.game.teams.find(t => t.name === big.name)!;
    assert.equal(send(room, stillBig.players[0]!.id, { type: 'leave' }).notice, 'Het spel is gestopt: minder dan 4 spelers');
    assert.equal(phase(room, T0), 'lobby');
    assert.ok(room.game.teams.every(t => t.score === 0), 'scores reset, like Begin opnieuw');
    assert.equal(room.game.teams.length, 2);
});

test('the host leaving passes the host on; anyone can leave at any time', () => {
    const room = roomWith(['Anna', 'Bram', 'Cas']);
    assert.deepEqual(send(room, 'p1', { type: 'leave' }), { changed: true, left: 'p1', notice: undefined });
    assert.equal(room.host_id, 'p2');
    assert.deepEqual(room.members.map(m => m.id), ['p2', 'p3']);
});

test('the host removing someone works the same as them leaving', () => {
    const room = gameWith([3, 3]);
    const describer = describerId(room)!;
    const host = describer === 'p1' ? room.members.find(m => m.id !== 'p1')!.id : 'p1';
    room.host_id = host;
    send(room, describer, { type: 'startTurn', turn: room.turn });

    assert.equal(send(room, host, { type: 'kick', playerId: describer }).kicked, describer);
    assert.equal(phase(room, T0), 'pre-turn');
    assert.ok(describerId(room) && describerId(room) !== describer);

    const small = gameWith([2, 2]);
    const target = small.members.find(m => m.id !== 'p1')!.id;
    assert.equal(send(small, 'p1', { type: 'kick', playerId: target }).notice, 'Het spel is gestopt: minder dan 4 spelers');
});

test('messages from strangers and malformed messages are ignored', () => {
    const room = startedRoom();
    const before = JSON.stringify(room);

    assert.deepEqual(send(room, 'nobody', { type: 'start' }), { changed: false });
    assert.deepEqual(send(room, 'p1', { type: 'nonsense' } as unknown as ClientMessage), { changed: false });
    assert.deepEqual(send(room, 'p1', { type: 'renameTeam', teamIndex: 'x', name: 5 } as unknown as ClientMessage), { changed: false });
    assert.equal(JSON.stringify(room), before);

    assert.equal(parseMessage('not json'), null);
    assert.equal(parseMessage('{"no":"type"}'), null);
    assert.equal(parseMessage('null'), null);
    assert.deepEqual(parseMessage('{"type":"start"}'), { type: 'start' });
});

test('a room expires 4 hours after the last activity, and activity moves that back', () => {
    const room = roomWith(['Anna', 'Bram']);

    assert.equal(nextAlarm(room), T0 + ROOM_LIFETIME);
    assert.equal(isExpired(room, T0 + ROOM_LIFETIME - 1), false);

    send(room, 'p1', { type: 'addTeam' }, T0 + 60_000);
    assert.equal(nextAlarm(room), T0 + 60_000 + ROOM_LIFETIME);
    assert.equal(isExpired(room, T0 + ROOM_LIFETIME), false);
    assert.equal(isExpired(room, T0 + 60_000 + ROOM_LIFETIME), true);

    // Something that changes nothing isn't activity
    send(room, 'p2', { type: 'addTeam' }, T0 + 120_000);
    assert.equal(room.last_activity, T0 + 60_000);
});

test('room codes: 4 characters without O, 0, I or 1, case-insensitive', () => {
    let i = 0;
    const code = generateCode(length => Uint8Array.from({ length }, () => i++ * 37));
    assert.match(code, /^[A-HJ-NP-Z2-9]{4}$/);

    assert.equal(normaliseCode(' abcd '), 'ABCD');
    assert.equal(normaliseCode('AB0D'), null);
    assert.equal(normaliseCode('ABIC'), null);
    assert.equal(normaliseCode('ABC'), null);
    assert.equal(normaliseCode('ABCDE'), null);
});

test('the room state survives a round trip through storage', () => {
    const room = startedRoom();
    const describer = describerId(room)!;
    send(room, describer, { type: 'startTurn', turn: room.turn });

    // Durable Object storage keeps structured clones; JSON is the stricter test
    const stored: RoomData = JSON.parse(JSON.stringify(room));
    assert.deepEqual(stored, room);
    assert.equal(describerId(stored), describer);
    assert.deepEqual(wordsMessages(messagesFor(stored, describer, T0 + 1000)), wordsMessages(messagesFor(room, describer, T0 + 1000)));
});

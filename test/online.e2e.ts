/// <reference types="node" />
// End-to-end check of online play against a running Worker: four phones (WebSocket clients) create a
// room, join, play turns and reconnect. Not part of `npm test` (that needs no server):
//
//   npm run dev                                  # or: npm run build && npx wrangler dev
//   npm run test:online                          # against http://localhost:5173
//   npm run test:online -- http://localhost:8787
//
// It plays one turn to the end of the timer, so it takes about 45 seconds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TURN_SECONDS } from '../models/Game.ts';
import { CLOSE_KICKED, CLOSE_ROOM_GONE, type ClientMessage, type RoomView, type ServerMessage } from '../server/protocol.ts';
import { clockOffset, type ClockSample } from '../utils/clock.ts';

const BASE = process.argv.find(arg => /^https?:\/\//.test(arg)) ?? 'http://localhost:5173';
const WS_BASE = BASE.replace(/^http/, 'ws');

class Phone {
    name: string;
    ws!: WebSocket;
    messages: ServerMessage[] = [];
    state: RoomView | null = null;
    playerId: string | null = null;
    closeCode: number | null = null;
    private waiters: { check: () => boolean, resolve: () => void }[] = [];

    constructor(name: string) {
        this.name = name;
    }

    async connect(code: string, playerId?: string): Promise<void> {
        this.ws = new WebSocket(`${WS_BASE}/ws/${code}`);
        this.closeCode = null;
        this.ws.addEventListener('message', (event) => {
            const message = JSON.parse(String(event.data)) as ServerMessage;
            this.messages.push(message);
            if (message.type === 'welcome') {
                this.playerId = message.playerId;
                this.state = message.state;
            }
            if (message.type === 'state') {
                this.state = message.state;
            }
            this.notify();
        });
        this.ws.addEventListener('close', (event) => {
            this.closeCode = event.code;
            this.notify();
        });
        await new Promise((resolve, reject) => {
            this.ws.addEventListener('open', resolve, { once: true });
            this.ws.addEventListener('error', reject, { once: true });
        });
        this.send({ type: 'join', name: this.name, playerId });
        await this.until(() => this.playerId !== null && this.state !== null, 'welcome');
    }

    send(message: ClientMessage): void {
        this.ws.send(JSON.stringify(message));
    }

    until(check: () => boolean, what: string, timeout = 5000): Promise<void> {
        if (check()) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`${this.name}: timed out waiting for ${what}`)), timeout);
            this.waiters.push({ check, resolve: () => { clearTimeout(timer); resolve(); } });
        });
    }

    private notify(): void {
        this.waiters = this.waiters.filter(waiter => {
            if (waiter.check()) {
                waiter.resolve();
                return false;
            }
            return true;
        });
    }

    // Clock offset from five pings, like the app
    async syncClock(): Promise<number> {
        const samples: ClockSample[] = [];
        for (let i = 0; i < 5; i++) {
            const before = this.messages.length;
            const t0 = Date.now();
            this.send({ type: 'ping', t0 });
            await this.until(() => this.messages.slice(before).some(m => m.type === 'pong' && m.t0 === t0), 'pong');
            const pong = this.messages.slice(before).find(m => m.type === 'pong' && m.t0 === t0)!;
            samples.push({ t0, server: (pong as { server: number }).server, t1: Date.now() });
        }

        return clockOffset(samples)!;
    }

    wordsSeen(): string[] {
        return this.messages.flatMap(m => m.type === 'words' ? m.words : []);
    }

    close(): void {
        this.ws.close();
    }
}

async function newRoom(): Promise<string> {
    const response = await fetch(`${BASE}/api/rooms`, { method: 'POST' });
    assert.equal(response.status, 200);
    const { code } = await response.json() as { code: string };
    assert.match(code, /^[A-HJ-NP-Z2-9]{4}$/);

    return code;
}

// The host can change mid-game (when the describer refreshes and happens to be the host), so look it up
function hostOf(phones: Phone[]): Phone {
    const id = phones.find(p => p.state)!.state!.host_id;
    const phone = phones.find(p => p.playerId === id);
    assert.ok(phone, 'the host is one of the phones');

    return phone;
}

function describerOf(phones: Phone[]): Phone {
    const id = phones[0]!.state!.describer_id;
    const phone = phones.find(p => p.playerId === id);
    assert.ok(phone, 'the describer is one of the phones');

    return phone;
}

test('four phones play a game online', { timeout: 120_000 }, async (t) => {
    const code = await newRoom();
    const [anna, bram, cas, dewi] = ['Anna', 'Bram', 'Cas', 'Dewi'].map(name => new Phone(name)) as [Phone, Phone, Phone, Phone];
    const phones = [anna, bram, cas, dewi];
    const extra: Phone[] = [];
    // Open sockets would keep the process (and a failing run) from ever exiting
    t.after(() => [...phones, ...extra].forEach(phone => phone.close()));

    await anna.connect(code);
    // Codes are case-insensitive
    await bram.connect(code.toLowerCase());
    await cas.connect(code);
    await dewi.connect(code);

    await t.test('the first phone is the host; everyone sees everyone', async () => {
        await anna.until(() => anna.state!.members.length === 4, '4 members');
        assert.equal(anna.state!.host_id, anna.playerId);
        assert.deepEqual(anna.state!.members.map(m => m.name), ['Anna', 'Bram', 'Cas', 'Dewi']);
    });

    await t.test('only the host sets up teams', async () => {
        bram.send({ type: 'assignPlayer', playerId: bram.playerId!, teamIndex: 0 });
        bram.send({ type: 'start' });
        await new Promise(resolve => setTimeout(resolve, 300));
        assert.ok(anna.state!.game.teams.every(team => team.players.length === 0));

        anna.send({ type: 'setMaxScore', score: 10 });
        anna.send({ type: 'renameTeam', teamIndex: 0, name: 'De Bazen' });
        anna.send({ type: 'assignPlayer', playerId: anna.playerId!, teamIndex: 0 });
        anna.send({ type: 'assignPlayer', playerId: bram.playerId!, teamIndex: 0 });
        anna.send({ type: 'assignPlayer', playerId: cas.playerId!, teamIndex: 1 });
        anna.send({ type: 'start' });
        await anna.until(() => anna.messages.some(m => m.type === 'error' && m.message === 'Elk team heeft minstens 2 spelers nodig'), 'start refused');

        anna.send({ type: 'assignPlayer', playerId: dewi.playerId!, teamIndex: 1 });
        anna.send({ type: 'start' });
        await Promise.all(phones.map(p => p.until(() => !!p.state?.game.is_in_progress, 'game started')));
        assert.equal(dewi.state!.game.max_score, 10);
        assert.ok(dewi.state!.game.teams.some(team => team.name === 'De Bazen'));
    });

    await t.test('a full turn: words only to the describer, the server ends it, everyone sees the ticks', async () => {
        const describer = describerOf(phones);
        const others = phones.filter(p => p !== describer);
        const offsets = await Promise.all(phones.map(p => p.syncClock()));
        assert.ok(offsets.every(offset => Math.abs(offset) < 1000), 'same machine, so the offsets are small');

        const turn = describer.state!.turn;
        others[0]!.send({ type: 'startTurn', turn });
        await new Promise(resolve => setTimeout(resolve, 200));
        assert.equal(anna.state!.ends_at, null, 'only the describer can start');

        const startedAt = Date.now();
        describer.send({ type: 'startTurn', turn });
        await Promise.all(phones.map(p => p.until(() => p.state!.ends_at !== null, 'turn running')));
        await describer.until(() => describer.wordsSeen().length === 5, 'words');

        const words = describer.wordsSeen();
        const endsAt = describer.state!.ends_at!;
        assert.ok(Math.abs(endsAt - (startedAt + TURN_SECONDS * 1000 + 500)) < 1000);
        // Every phone counts down to the same moment
        assert.ok(phones.every(p => p.state!.ends_at === endsAt));

        for (const phone of others) {
            const raw = JSON.stringify(phone.messages);
            assert.ok(words.every(word => !raw.includes(word)), `${phone.name} never received a word during the turn`);
        }

        // Finishing early isn't allowed before time is up
        describer.send({ type: 'finishTurn', turn });

        // A refresh during the turn: the describer gets the words again
        const describerId = describer.playerId!;
        describer.close();
        // Watched from a phone that stayed connected (the describer may well be Anna)
        const watcher = others[0]!;
        await watcher.until(() => watcher.state!.members.find(m => m.id === describerId)?.connected === false, 'describer gone');
        describer.messages = [];
        describer.playerId = null;
        await describer.connect(code, describerId);
        assert.equal(describer.playerId, describerId, 'same seat');
        await describer.until(() => describer.wordsSeen().length === 5, 'words again after reconnect');
        assert.deepEqual(describer.wordsSeen(), words);

        // The server ends the turn on its own (alarm), within a second of ends_at
        const arrived = new Map<Phone, number>();
        await Promise.all(phones.map(p => p.until(() => p.state!.is_applying_score, 'turn ended', 40_000)
            .then(() => arrived.set(p, Date.now()))));
        const latest = Math.max(...arrived.values());
        assert.ok(latest - endsAt < 1500, `turn ended ${latest - endsAt} ms after ends_at`);
        const spread = latest - Math.min(...arrived.values());
        assert.ok(spread < 200, `all phones heard within ${spread} ms`);

        for (const phone of phones) {
            assert.deepEqual(phone.state!.active_words, words, `${phone.name} sees the words after the turn`);
        }

        describer.send({ type: 'setWord', turn, index: 0, guessed: true });
        describer.send({ type: 'setWord', turn, index: 2, guessed: true });
        await Promise.all(others.map(p => p.until(() => p.state!.guessed.length === 2, 'live ticks')));
        assert.deepEqual(others[0]!.state!.guessed, [0, 2]);

        // Someone else can't tick or finish
        others[0]!.send({ type: 'setWord', turn, index: 1, guessed: true });
        others[0]!.send({ type: 'finishTurn', turn });
        await new Promise(resolve => setTimeout(resolve, 200));
        assert.deepEqual(anna.state!.guessed, [0, 2]);

        describer.send({ type: 'finishTurn', turn });
        await Promise.all(phones.map(p => p.until(() => p.state!.turn === turn + 1, 'next turn')));
        assert.deepEqual(anna.state!.last_turn?.words, words);
        assert.deepEqual(anna.state!.last_turn?.guessed, [0, 2]);
        assert.equal(anna.state!.last_turn?.score, 2);
        assert.notEqual(anna.state!.describer_id, describerId, 'the next team is up');
    });

    await t.test('ending a turn early, and turn order', async () => {
        const seen = new Set<string>();
        for (let i = 0; i < 3; i++) {
            const describer = describerOf(phones);
            seen.add(describer.playerId!);
            const turn = describer.state!.turn;
            describer.send({ type: 'startTurn', turn });
            await describer.until(() => describer.state!.ends_at !== null, 'started');
            describer.send({ type: 'endTurnEarly', turn });
            await Promise.all(phones.map(p => p.until(() => p.state!.is_applying_score && p.state!.turn === turn, 'ended early')));
            describer.send({ type: 'finishTurn', turn });
            await Promise.all(phones.map(p => p.until(() => p.state!.turn === turn + 1, 'next')));
        }
        assert.equal(seen.size, 3, 'the remaining three players each had a turn');
    });

    await t.test('a late joiner watches, and the host gives them a seat', async () => {
        const eva = new Phone('Eva');
        extra.push(eva);
        await eva.connect(code);
        assert.ok(eva.state!.game.is_in_progress);
        assert.ok(eva.state!.game.teams.every(team => !team.players.some(p => p.id === eva.playerId)));

        const host = hostOf(phones);
        host.send({ type: 'assignPlayer', playerId: eva.playerId!, teamIndex: 1 });
        await eva.until(() => eva.state!.game.teams[1]!.players.some(p => p.id === eva.playerId), 'seated');

        host.send({ type: 'kick', playerId: eva.playerId! });
        await eva.until(() => eva.closeCode !== null, 'kicked');
        assert.equal(eva.closeCode, CLOSE_KICKED);
        assert.ok(eva.messages.some(m => m.type === 'error' && m.message === 'Je bent uit de lobby gehaald'));
    });

    await t.test('the host leaving passes the host to the longest-connected phone', async () => {
        const host = hostOf(phones);
        const hostId = host.playerId!;
        const watcher = phones.find(p => p !== host)!;
        host.close();
        await watcher.until(() => watcher.state!.host_id !== hostId, 'new host');
        const next = watcher.state!.members.find(m => m.id === watcher.state!.host_id)!;
        assert.equal(next.connected, true, 'the new host is connected');

        host.playerId = null;
        await host.connect(code, hostId);
        assert.equal(host.playerId, hostId);
        assert.notEqual(host.state!.host_id, hostId, 'coming back does not take the host back');
    });

});

test('a player leaving never stalls the game; below 4 players it stops', { timeout: 60_000 }, async (t) => {
    const code = await newRoom();
    const phones = ['Anna', 'Bram', 'Cas', 'Dewi', 'Eva', 'Fien'].map(name => new Phone(name));
    t.after(() => phones.forEach(phone => phone.close()));
    for (const phone of phones) {
        await phone.connect(code);
    }
    const [anna] = phones as [Phone];
    await anna.until(() => anna.state!.members.length === 6, '6 members');
    phones.forEach((phone, i) => anna.send({ type: 'assignPlayer', playerId: phone.playerId!, teamIndex: i < 3 ? 0 : 1 }));
    anna.send({ type: 'start' });
    await Promise.all(phones.map(p => p.until(() => !!p.state?.game.is_in_progress, 'started')));

    let present = [...phones];
    const leave = async (phone: Phone) => {
        phone.send({ type: 'leave' });
        await phone.until(() => phone.closeCode !== null, `${phone.name} disconnected`);
        present = present.filter(p => p !== phone);
        await Promise.all(present.map(p => p.until(() => p.state!.members.length === present.length, `${phone.name} gone`)));
    };

    // Whoever is up leaves before starting their turn (the situation that used to hang): a teammate is up
    const leaver = describerOf(phones);
    const team = (p: Phone) => p.state!.game.teams.find(t => t.players.some(x => x.id === p.playerId))?.name;
    const leaverTeam = team(leaver);
    await leave(leaver);
    const teammate = describerOf(present);
    assert.equal(team(teammate), leaverTeam);
    let turn = teammate.state!.turn;
    teammate.send({ type: 'startTurn', turn });
    await Promise.all(present.map(p => p.until(() => p.state!.ends_at !== null, 'the game goes on')));
    teammate.send({ type: 'endTurnEarly', turn });
    await teammate.until(() => teammate.state!.is_applying_score, 'scoring');
    teammate.send({ type: 'finishTurn', turn });
    await Promise.all(present.map(p => p.until(() => p.state!.turn === turn + 1, 'next turn')));

    // The other team's describer leaves mid-turn: that turn doesn't count, back to the first team
    const other = describerOf(present);
    assert.notEqual(team(other), leaverTeam);
    turn = other.state!.turn;
    other.send({ type: 'startTurn', turn });
    await teammate.until(() => teammate.state!.ends_at !== null, 'other turn running');
    await leave(other);
    await Promise.all(present.map(p => p.until(() => p.state!.ends_at === null && p.state!.turn === turn + 1, 'turn voided')));
    assert.equal(teammate.state!.game.is_in_progress, true, '4 players: still playing');
    assert.equal(team(describerOf(present)), leaverTeam);

    // One more leaves: 3 players, the game stops and everyone hears why
    const before = new Map(present.map(p => [p, p.messages.length]));
    await leave(present.find(p => p !== teammate && p.playerId !== teammate.state!.host_id)!);
    await Promise.all(present.map(p => p.until(() => !p.state!.game.is_in_progress, 'back to the lobby')));
    // The notice follows the new state
    await Promise.all(present.map(p => p.until(() => p.messages.slice(before.get(p))
        .some(m => m.type === 'error' && m.message === 'Het spel is gestopt: minder dan 4 spelers'), 'notice')));
});

test('a room that does not exist', async () => {
    const ws = new WebSocket(`${WS_BASE}/ws/ZZZZ`);
    const result = await new Promise<{ code: number, messages: string[] }>((resolve) => {
        const messages: string[] = [];
        ws.addEventListener('open', () => ws.send(JSON.stringify({ type: 'join', name: 'Anna' })));
        ws.addEventListener('message', event => messages.push(String(event.data)));
        ws.addEventListener('close', event => resolve({ code: event.code, messages }));
    });

    assert.equal(result.code, CLOSE_ROOM_GONE);
    assert.ok(result.messages.some(m => m.includes('Lobby niet gevonden')));
});

test('the Worker only answers /api and /ws; the site is still served as before', async () => {
    assert.equal((await fetch(`${BASE}/api/nothing`)).status, 404);
    assert.equal((await fetch(`${BASE}/api/rooms`)).status, 404, 'GET does not create a room');
    assert.equal((await fetch(`${BASE}/ws/ABCD`)).status, 426, 'a WebSocket address without an upgrade');
    assert.equal((await fetch(`${BASE}/ws/AB0D`)).status, 404, 'not a valid code');

    const page = await fetch(`${BASE}/online/ABCD`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<div id="app">/);
});

/// <reference types="node" />
// Bot players for trying online play by hand: they join a room over the same WebSocket as a phone,
// send the same messages, and play their part, so one person (or agent) can play a whole game. Only
// against a local dev server. See "Bots" in AGENTS.md.
//
//   npm run dev                       # the bots need the dev server (or `npx wrangler dev`)
//   npm run bots                      # 3 bots + you: a team game; open the link it prints
//   npm run bots -- --bots 2          # 2 bots + you: a trio
//   npm run bots -- --bots 1          # 1 bot + you: a duo
//   npm run bots -- --help            # every option
import { parseArgs } from 'node:util';
import {
    CLOSE_KICKED, CLOSE_LEFT, CLOSE_ROOM_GONE, playsWithoutTeams, type ClientMessage, type RoomView, type ServerMessage,
} from '../server/protocol.ts';

const HELP = `Bot players for online play, against a local dev server.

  npm run bots -- [options]

  --bots N        how many bots (default 3; names Anna, Bram, Cas, …)
  --humans N      wait for this many other players before starting (default 1; 0 starts straight away)
  --code XXXX     join this room instead of creating one (if a person is the host there, they start)
  --base URL      the dev server (default http://localhost:5173; a phone on the Wi-Fi needs the
                  network address \`npm run dev -- --host\` prints, e.g. http://192.168.1.20:5173)
  --veto MODE     how bots veto a person's turn: alternate (default: every other turn), always, never
  --score N       target score: 10 (default), 25, 50 or 100
  --delay S       seconds between everyone being there and the start (default 5)

With 2 or 3 players in the room the game is a duo or trio; with 4 or more the host bot puts everyone in
two teams, alternating in the order they joined. Bots describe their own turns (stop after a few seconds,
tick 2 words, "Klaar"; after a veto they untick one and finish again), veto a person's turns when they
may, and the host bot starts a new game 15 s after a win. Stop them with Ctrl+C.`;

const NAMES = ['Anna', 'Bram', 'Cas', 'Dewi', 'Eva', 'Fien', 'Gijs', 'Hanna', 'Ilse', 'Joris'];

const { values: options } = parseArgs({
    options: {
        bots: { type: 'string', default: '3' },
        humans: { type: 'string', default: '1' },
        code: { type: 'string' },
        base: { type: 'string', default: 'http://localhost:5173' },
        veto: { type: 'string', default: 'alternate' },
        score: { type: 'string', default: '10' },
        delay: { type: 'string', default: '5' },
        help: { type: 'boolean', default: false },
    },
});

if (options.help) {
    console.log(HELP);
    process.exit(0);
}

const BOTS = Number(options.bots);
const HUMANS = Number(options.humans);
const SCORE = Number(options.score);
const DELAY = Number(options.delay) * 1000;
const VETO = options.veto;
const BASE = options.base.replace(/\/$/, '');

function fail(message: string): never {
    console.error(`${message}\n\n${HELP}`);
    process.exit(1);
}

if (!Number.isInteger(BOTS) || BOTS < 1 || BOTS > NAMES.length) fail(`--bots must be 1 to ${NAMES.length}`);
if (!Number.isInteger(HUMANS) || HUMANS < 0) fail('--humans must be 0 or more');
if (![10, 25, 50, 100].includes(SCORE)) fail('--score must be 10, 25, 50 or 100');
if (!['alternate', 'always', 'never'].includes(VETO)) fail('--veto must be alternate, always or never');

// Never production: every room there counts against the Workers Free plan
const host = new URL(BASE).hostname;
if (!/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)|\.local$/.test(host)) {
    fail(`Bots only play against a local dev server, not ${host}`);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const log = (...parts: unknown[]) => console.log(new Date().toLocaleTimeString('nl-NL'), ...parts);

class Bot {
    name: string;
    playerId: string | null = null;
    state: RoomView | null = null;
    ws: WebSocket | null = null;

    constructor(name: string) {
        this.name = name;
    }

    // Joins, and rejoins the same seat whenever the connection drops (a dev server restart keeps the
    // room in .wrangler/state/)
    async connect(code: string): Promise<void> {
        const ws = new WebSocket(`${BASE.replace(/^http/, 'ws')}/ws/${code}`);
        this.ws = ws;

        ws.addEventListener('message', event => this.receive(JSON.parse(String(event.data)) as ServerMessage));
        ws.addEventListener('close', async event => {
            if ([CLOSE_ROOM_GONE, CLOSE_KICKED, CLOSE_LEFT].includes(event.code)) {
                log(`${this.name}: ${event.reason || 'connection closed'}; stopping`);
                process.exit(0);
            }
            log(`${this.name}: connection lost, reconnecting…`);
            for (;;) {
                await sleep(1000);
                try {
                    await this.connect(code);
                    log(`${this.name}: back in`);
                    return;
                } catch {
                    // Server still restarting
                }
            }
        });

        await new Promise((resolve, reject) => {
            ws.addEventListener('open', resolve, { once: true });
            ws.addEventListener('error', reject, { once: true });
        });
        this.send({ type: 'join', name: this.name, playerId: this.playerId ?? undefined });
        while (!this.state) {
            await sleep(50);
        }
    }

    receive(message: ServerMessage): void {
        if (message.type === 'welcome') {
            this.playerId = message.playerId;
            this.state = message.state;
        } else if (message.type === 'state') {
            this.state = message.state;
        } else if (message.type === 'error') {
            // Notices go to everyone: log them once, from the first bot
            if (this === bots[0]) {
                log(`(server) ${message.message}`);
            }
        }
    }

    send(message: ClientMessage): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
}

async function createRoom(): Promise<string> {
    const response = await fetch(`${BASE}/api/rooms`, { method: 'POST' });
    if (!response.ok) {
        fail(`Creating a room failed (${response.status}). Is \`npm run dev\` running at ${BASE}?`);
    }

    return (await response.json() as { code: string }).code;
}

let code: string;
try {
    code = options.code?.toUpperCase() ?? await createRoom();
} catch {
    fail(`No dev server at ${BASE}. Start it with \`npm run dev\` (or \`npm run dev -- --host\` for phones).`);
}

const bots = NAMES.slice(0, BOTS).map(name => new Bot(name));
for (const bot of bots) {
    await bot.connect(code);
}

console.log(`\nRoom ${code}: open ${BASE}/online/${code}`);
console.log(`Bots: ${bots.map(b => b.name).join(', ')}. ${HUMANS > 0 ? `Waiting for ${HUMANS} more player${HUMANS > 1 ? 's' : ''}.` : ''}\n`);

const isBot = (id: string | null) => bots.some(b => b.playerId === id);
const botById = (id: string | null) => bots.find(b => b.playerId === id);

// What the screens would show: the same as phase() in server/rules.ts
function phaseOf(s: RoomView): 'lobby' | 'pre-turn' | 'turn' | 'scoring' | 'review' | 'finished' {
    if (s.game.is_finished) return 'finished';
    if (!s.game.is_in_progress) return 'lobby';
    if (s.review_ends_at !== null) return 'review';
    if (s.is_applying_score) return 'scoring';
    if (s.ends_at !== null) return 'turn';

    return 'pre-turn';
}

// The same rule as canVeto() in server/rules.ts
function canVeto(s: RoomView, id: string | null): boolean {
    const active = s.game.teams.find(t => t.index === s.game.active_team_index);
    const seated = s.game.teams.some(t => t.players.some(p => p.id === id));

    return s.game.mode !== 'duo' && seated && !!active && !active.players.some(p => p.id === id);
}

const done = new Set<string>();
let lastStart = 0;
let humanReviews = 0;
let waitingLogged = false;

// Once something is decided for this turn, it's never done twice
function once(key: string): boolean {
    if (done.has(key)) {
        return false;
    }
    done.add(key);

    return true;
}

async function startGame(s: RoomView): Promise<void> {
    const hostBot = botById(s.host_id)!;
    log(`${hostBot.name} starts the game (${s.members.length} players, to ${SCORE})`);
    hostBot.send({ type: 'setMaxScore', score: SCORE });

    if (!playsWithoutTeams(s.members.length)) {
        // Two teams, alternating in join order
        while ((hostBot.state?.game.teams.length ?? 0) < 2) {
            hostBot.send({ type: 'addTeam' });
            await sleep(300);
        }
        s.members.forEach((member, i) => hostBot.send({ type: 'assignPlayer', playerId: member.id, teamIndex: i % 2 }));
        await sleep(500);
    }
    hostBot.send({ type: 'start' });
}

for (;;) {
    await sleep(300);
    const s = bots[0]!.state!;
    const phase = phaseOf(s);
    const hostBot = botById(s.host_id);
    const describer = botById(s.describer_id);

    if (phase === 'lobby') {
        const humans = s.members.filter(m => !isBot(m.id)).length;
        if (!hostBot) {
            if (!waitingLogged) {
                log('A person is the host: waiting for them to start');
                waitingLogged = true;
            }
        } else if (humans >= HUMANS && s.members.length >= 2 && Date.now() - lastStart > 10_000) {
            lastStart = Date.now();
            await sleep(DELAY);
            const latest = bots[0]!.state!;
            if (phaseOf(latest) === 'lobby') {
                await startGame(latest);
            }
        }
        continue;
    }
    waitingLogged = false;

    if (phase === 'finished') {
        if (hostBot && once(`finished:${s.turn}`)) {
            const winner = [...s.game.teams].sort((a, b) => b.score - a.score)[0];
            log(`${winner?.name} won; a new game in 15 s`);
            await sleep(15_000);
            hostBot.send({ type: 'restart' });
        }
        continue;
    }

    if (describer) {
        if (phase === 'pre-turn' && once(`start:${s.turn}`)) {
            await sleep(3000);
            log(`${describer.name} starts a turn`);
            describer.send({ type: 'startTurn', turn: s.turn });
        } else if (phase === 'turn' && once(`end:${s.turn}`)) {
            await sleep(5000);
            describer.send({ type: 'endTurnEarly', turn: s.turn });
        } else if (phase === 'scoring' && !s.vetoed && once(`score:${s.turn}`)) {
            await sleep(1500);
            describer.send({ type: 'setWord', turn: s.turn, index: 0, guessed: true });
            describer.send({ type: 'setWord', turn: s.turn, index: 1, guessed: true });
            await sleep(1500);
            log(`${describer.name}: "Klaar" with 2 guessed`);
            describer.send({ type: 'finishTurn', turn: s.turn });
        } else if (phase === 'scoring' && s.vetoed && once(`rescore:${s.turn}`)) {
            // Vetoed: take the last tick back and finish again (that one counts straight away)
            await sleep(2500);
            const last = s.guessed[s.guessed.length - 1];
            if (last !== undefined) {
                describer.send({ type: 'setWord', turn: s.turn, index: last, guessed: false });
            }
            await sleep(1000);
            log(`${describer.name}: scored again after the veto, ${Math.max(0, s.guessed.length - 1)} guessed`);
            describer.send({ type: 'finishTurn', turn: s.turn });
        }
        continue;
    }

    // A person's turn: veto their ticks during the review, if a bot may
    if (phase === 'review' && once(`review:${s.turn}`)) {
        const vetoer = bots.find(b => canVeto(s, b.playerId));
        const wants = VETO === 'always' || (VETO === 'alternate' && humanReviews++ % 2 === 0);
        if (vetoer && wants) {
            await sleep(1500);
            vetoer.send({ type: 'veto', turn: s.turn });
        } else if (vetoer) {
            log('No veto this time: the review runs out');
        }
    }
}

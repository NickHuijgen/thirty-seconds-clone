// The rules of an online room: joining, the lobby, and playing turns with the same Game model as the
// one-phone mode. Plain TypeScript without Cloudflare, so `node --test` runs it (test/rules.test.ts);
// server/Room.ts is the Durable Object that stores a RoomData and sends what this module decides.
import Game, { TURN_SECONDS, type LastTurn, type SavedGame, type WordLists } from '../models/Game.ts';
import Team from '../models/Team.ts';
import Player from '../models/Player.ts';
import { MAX_MEMBERS, MAX_NAME_LENGTH, type ClientMessage, type RoomView, type ServerMessage } from './protocol.ts';

// A room is deleted this long after anything last happened in it, like a saved game on one phone
export const ROOM_LIFETIME = 4 * 60 * 60 * 1000;

// The turn ends this long after TURN_SECONDS, so every phone has the start before the countdown runs
export const START_DELAY = 500;

export const SCORE_OPTIONS = [10, 25, 50, 100];

export interface Member {
    id: string;
    name: string;
    joined_at: number;
    // When the current connection opened; null while disconnected. The host passes to the member
    // who has been connected longest.
    connected_since: number | null;
}

export interface RoomData {
    code: string;
    last_activity: number;
    host_id: string | null;
    members: Member[];
    game: SavedGame;
    // What the local save leaves out, because one phone never resumes mid-turn
    active_words: string[];
    is_applying_score: boolean;
    last_turn: LastTurn | null;
    turn: number;
    ends_at: number | null;
    guessed: number[];
}

export type Phase = 'lobby' | 'pre-turn' | 'turn' | 'scoring' | 'finished';

export interface Result {
    // Shown to the sender, in Dutch
    error?: string;
    // Something changed: store the room and send everyone the new state
    changed: boolean;
    // A member the host removed; their connections are closed
    kicked?: string;
    // The sender left the room for good; their connections are closed
    left?: string;
    // Something everyone should be told (a team stopped, the game stopped), in Dutch
    notice?: string;
}

const NONE: Result = { changed: false };
const CHANGED: Result = { changed: true };

function fail(error: string): Result {
    return { error, changed: false };
}

export function createRoom(code: string, now: number, words: WordLists): RoomData {
    const game = new Game(25, words);
    game.addTeam(new Team('Team 1'));
    game.addTeam(new Team('Team 2'));

    return {
        code,
        last_activity: now,
        host_id: null,
        members: [],
        game: toStored(game),
        active_words: [],
        is_applying_score: false,
        last_turn: null,
        turn: 0,
        ends_at: null,
        guessed: [],
    };
}

// The room's game as a Game object, with everything the local save leaves out put back
export function loadGame(room: RoomData, words: WordLists): Game {
    const game = Game.fromSaved(room.game, words);
    game.active_words = [...room.active_words];
    game.is_applying_score = room.is_applying_score;
    game.last_turn = room.last_turn;

    return game;
}

function storeGame(room: RoomData, game: Game): void {
    room.game = toStored(game);
    room.active_words = game.active_words;
    room.is_applying_score = game.is_applying_score;
    room.last_turn = game.last_turn;
}

function toStored(game: Game): SavedGame {
    // The room's own lifetime applies (ROOM_LIFETIME), not the local save's
    return { ...game.toSaved(), expires_at: 0 };
}

export function phase(room: RoomData, now: number): Phase {
    if (room.game.is_finished) {
        return 'finished';
    }
    if (!room.game.is_in_progress) {
        return 'lobby';
    }
    if (room.is_applying_score) {
        return 'scoring';
    }
    if (room.ends_at !== null) {
        return now >= room.ends_at ? 'scoring' : 'turn';
    }

    return 'pre-turn';
}

// Ends a turn whose time is up. The alarm does this on time, but an alarm can fire a little late:
// every message runs this first, so the describer's first tick isn't refused in the meantime.
export function settle(room: RoomData, now: number, words: WordLists): boolean {
    if (room.ends_at === null || room.is_applying_score || now < room.ends_at) {
        return false;
    }

    const game = loadGame(room, words);
    game.endTurn();
    storeGame(room, game);
    room.ends_at = null;

    return true;
}

export function describerId(room: RoomData): string | null {
    if (!room.game.is_in_progress || room.game.is_finished) {
        return null;
    }

    const team = room.game.teams.find(t => t.index === room.game.active_team_index);
    const player = team?.players.find(p => p.index === team.active_player_index);

    return player?.id ?? null;
}

function isConnected(room: RoomData, id: string | null): boolean {
    return room.members.some(m => m.id === id && m.connected_since !== null);
}

// Who may tick the words: the describer, or the host when the describer isn't there
export function canScore(room: RoomData, playerId: string): boolean {
    const describer = describerId(room);

    return playerId === describer || (playerId === room.host_id && !isConnected(room, describer));
}

// The host stays the host while connected; otherwise it passes to whoever has been connected longest
function ensureHost(room: RoomData): void {
    if (isConnected(room, room.host_id)) {
        return;
    }

    const longest = room.members
        .filter(m => m.connected_since !== null)
        .sort((a, b) => a.connected_since! - b.connected_since!)[0];

    if (longest) {
        room.host_id = longest.id;
    }
}

function cleanName(name: unknown): string {
    return typeof name === 'string' ? name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH) : '';
}

// A new connection asks for a seat: their own again (playerId, or a disconnected member's name), or a new one
export function join(room: RoomData, name: unknown, playerId: unknown, now: number, newId: () => string): Result & { playerId?: string } {
    const existing = typeof playerId === 'string' ? room.members.find(m => m.id === playerId) : undefined;

    if (existing) {
        existing.connected_since ??= now;
        room.last_activity = now;
        ensureHost(room);

        return { changed: true, playerId: existing.id };
    }

    const clean = cleanName(name);

    if (!clean) {
        return fail('Vul je naam in');
    }

    const sameName = room.members.find(m => m.name.toLowerCase() === clean.toLowerCase());

    if (sameName) {
        // Someone who lost their saved seat (another browser, cleared storage) gets it back by name
        if (sameName.connected_since === null) {
            sameName.connected_since = now;
            room.last_activity = now;
            ensureHost(room);

            return { changed: true, playerId: sameName.id };
        }

        return fail('Die naam is al bezet');
    }

    if (room.members.length >= MAX_MEMBERS) {
        return fail('De lobby is vol');
    }

    const member: Member = { id: newId(), name: clean, joined_at: now, connected_since: now };
    room.members.push(member);
    room.last_activity = now;
    ensureHost(room);

    return { changed: true, playerId: member.id };
}

// `stillConnected`: the same member has another connection open (a second tab)
export function disconnect(room: RoomData, playerId: string, stillConnected: boolean): boolean {
    const member = room.members.find(m => m.id === playerId);

    if (!member || stillConnected || member.connected_since === null) {
        return false;
    }

    member.connected_since = null;
    ensureHost(room);

    return true;
}

export function handle(room: RoomData, playerId: string, message: ClientMessage, now: number, words: WordLists): Result {
    if (!room.members.some(m => m.id === playerId)) {
        return NONE;
    }

    const settled = settle(room, now, words);
    const result = apply(room, playerId, message, now, words);

    if (result.changed) {
        room.last_activity = now;
    }

    return settled ? { ...result, changed: true } : result;
}

function apply(room: RoomData, playerId: string, message: ClientMessage, now: number, words: WordLists): Result {
    const isHost = playerId === room.host_id;
    const current = phase(room, now);

    switch (message.type) {
        case 'setMaxScore': {
            if (!isHost || current !== 'lobby' || !SCORE_OPTIONS.includes(message.score)) {
                return NONE;
            }
            room.game.max_score = message.score;

            return CHANGED;
        }

        case 'addTeam': {
            if (!isHost || current !== 'lobby') {
                return NONE;
            }
            const game = loadGame(room, words);
            game.addTeam(new Team('Team ' + (game.teamCount() + 1)));
            storeGame(room, game);

            return CHANGED;
        }

        case 'removeTeam': {
            if (!isHost || current !== 'lobby') {
                return NONE;
            }
            const game = loadGame(room, words);
            const team = game.teams[message.teamIndex];
            if (!team) {
                return NONE;
            }
            if (game.teams.length <= 2) {
                return fail('Er zijn minstens 2 teams nodig');
            }
            // Its players go back to waiting for a team
            game.removeTeam(team);
            storeGame(room, game);

            return CHANGED;
        }

        case 'renameTeam': {
            const team = room.game.teams[message.teamIndex];
            const name = cleanName(message.name);
            if (!isHost || current !== 'lobby' || !team || !name || name === team.name) {
                return NONE;
            }
            team.name = name;

            return CHANGED;
        }

        case 'assignPlayer':
            return assignPlayer(room, isHost, message.playerId, message.teamIndex, current, words);

        case 'kick':
            return kick(room, isHost, playerId, message.playerId, current, words);

        case 'leave':
            return { changed: true, left: playerId, notice: removeMember(room, playerId, current, words) ?? undefined };

        case 'start': {
            if (!isHost || current !== 'lobby') {
                return NONE;
            }
            const game = loadGame(room, words);
            // Teams nobody was put in just don't play
            const playing = game.teams.filter(team => team.players.length > 0);
            if (playing.length < 2) {
                return fail('Zet spelers in minstens 2 teams');
            }
            if (playing.some(team => team.players.length < 2)) {
                return fail('Elk team heeft minstens 2 spelers nodig');
            }
            game.teams = playing;
            // setUp shuffles the teams and players and deals the word lists. Its clearSaved() finds no
            // localStorage on the server and does nothing.
            game.setUp();
            storeGame(room, game);
            room.turn += 1;
            room.ends_at = null;
            room.guessed = [];

            return CHANGED;
        }

        case 'restart': {
            if (!isHost || current !== 'finished') {
                return NONE;
            }
            const game = loadGame(room, words);
            game.restart();
            storeGame(room, game);
            room.ends_at = null;
            room.guessed = [];

            return CHANGED;
        }

        case 'startTurn': {
            if (current !== 'pre-turn' || message.turn !== room.turn || playerId !== describerId(room)) {
                return NONE;
            }
            const game = loadGame(room, words);
            game.beginTurn();
            storeGame(room, game);
            room.ends_at = now + TURN_SECONDS * 1000 + START_DELAY;
            room.guessed = [];

            return CHANGED;
        }

        case 'endTurnEarly': {
            if (current !== 'turn' || message.turn !== room.turn || playerId !== describerId(room)) {
                return NONE;
            }
            const game = loadGame(room, words);
            game.endTurn();
            storeGame(room, game);
            room.ends_at = null;

            return CHANGED;
        }

        case 'setWord': {
            const { index, guessed } = message;
            if (current !== 'scoring' || message.turn !== room.turn || !canScore(room, playerId)
                || !Number.isInteger(index) || index < 0 || index >= room.active_words.length) {
                return NONE;
            }
            // Setting rather than toggling, so a repeated message changes nothing
            if (room.guessed.includes(index) === Boolean(guessed)) {
                return NONE;
            }
            room.guessed = guessed
                ? [...room.guessed, index].sort((a, b) => a - b)
                : room.guessed.filter(i => i !== index);

            return CHANGED;
        }

        case 'finishTurn': {
            if (current !== 'scoring' || message.turn !== room.turn || !canScore(room, playerId)) {
                return NONE;
            }
            const game = loadGame(room, words);
            const turnWords = [...game.active_words];
            // The score is the ticks the server holds, never a number from a phone
            game.scoreTurn(room.guessed.length);
            game.last_turn = { ...game.last_turn!, words: turnWords, guessed: room.guessed };
            game.active_words = [];
            storeGame(room, game);
            room.turn += 1;
            room.ends_at = null;
            room.guessed = [];

            return CHANGED;
        }

        default:
            return NONE;
    }
}

function assignPlayer(room: RoomData, isHost: boolean, targetId: string, teamIndex: number | null, current: Phase, words: WordLists): Result {
    const member = room.members.find(m => m.id === targetId);
    if (!isHost || !member || current === 'finished') {
        return NONE;
    }

    const game = loadGame(room, words);
    const from = game.teams.find(team => team.players.some(p => p.id === targetId));
    const to = teamIndex === null ? undefined : game.teams[teamIndex];

    if ((teamIndex !== null && !to) || from === to) {
        return NONE;
    }

    if (current === 'lobby') {
        from?.removePlayer(from.players.find(p => p.id === targetId)!);
        to?.addPlayer(new Player(member.name, member.id));
        storeGame(room, game);

        return CHANGED;
    }

    // During a game a seat can only be filled, not moved: moving would rewrite whose turn it is
    if (from || !to) {
        return fail('Van team wisselen kan alleen vóór het spel');
    }

    // A new player joins the end of their team's rotation, so the indexes stay 0…n-1
    const player = new Player(member.name, member.id);
    player.index = to.players.length;
    to.addPlayer(player);
    storeGame(room, game);

    return CHANGED;
}

function kick(room: RoomData, isHost: boolean, playerId: string, targetId: string, current: Phase, words: WordLists): Result {
    if (!isHost || targetId === playerId || !room.members.some(m => m.id === targetId)) {
        return NONE;
    }

    return { changed: true, kicked: targetId, notice: removeMember(room, targetId, current, words) ?? undefined };
}

// A game needs at least this many players in teams, and a team at least MIN_TEAM_SIZE
export const MIN_PLAYERS = 4;
export const MIN_TEAM_SIZE = 2;

// Takes someone out of the room for good: they left ("Verlaat lobby"), or the host removed them.
// (A phone that only lost its connection keeps its seat; see disconnect().) Mid-game nobody is ever
// left waiting for them. If what's left can't make a game — fewer than MIN_PLAYERS players or fewer
// than 2 teams of MIN_TEAM_SIZE — the game stops and everyone is back in the lobby with the teams as
// they are, to be shared out again. Otherwise it goes on: a turn they were describing doesn't count
// and the next team is up, their team closes ranks, and a team left too small stops (whoever is left
// watches until the host seats them elsewhere). Returns what everyone should be told, if anything.
function removeMember(room: RoomData, targetId: string, current: Phase, words: WordLists): string | null {
    const game = loadGame(room, words);
    const team = game.teams.find(t => t.players.some(p => p.id === targetId));
    const betweenGames = current === 'lobby' || current === 'finished';
    let notice: string | null = null;

    if (team && !betweenGames) {
        const isActiveTeam = team.index === game.active_team_index;
        const running = current === 'turn' || current === 'scoring';
        const wasDescriber = targetId === describerId(room);

        removeFromTeam(team, targetId, false);

        // Decided before any team is dropped: a stopped game keeps every team for the lobby
        const playing = game.teams.filter(t => t.players.length >= MIN_TEAM_SIZE);
        const playingCount = playing.reduce((count, t) => count + t.players.length, 0);

        if (playing.length < 2 || playingCount < MIN_PLAYERS) {
            game.restart();
            storeGame(room, game);
            room.ends_at = null;
            room.guessed = [];

            return finishRemoval(room, targetId, `Het spel is gestopt: minder dan ${MIN_PLAYERS} spelers`);
        }

        const stops = team.players.length < MIN_TEAM_SIZE;

        // The turn can't go on without its describer or its team
        const voidTurn = running && (wasDescriber || (stops && isActiveTeam));
        if (voidTurn) {
            game.active_words = [];
            game.is_applying_score = false;
            game.turn_timer = 0;
            room.ends_at = null;
            room.guessed = [];
            // Anything still on its way about this turn is now out of date
            room.turn += 1;
        }

        if (stops) {
            dropTeam(game, team);
            notice = `${team.name} doet niet meer mee: te weinig spelers`;
        } else if (voidTurn) {
            // The team's next player is already up (removeFromTeam), so only the team moves on
            game.active_team_index = (game.active_team_index + 1) % game.teams.length;
        }
    } else if (team) {
        removeFromTeam(team, targetId, true);
    }

    storeGame(room, game);

    return finishRemoval(room, targetId, notice);
}

function finishRemoval(room: RoomData, targetId: string, notice: string | null): string | null {
    room.members = room.members.filter(m => m.id !== targetId);

    if (room.host_id === targetId) {
        room.host_id = null;
        ensureHost(room);
    }

    return notice;
}

// A team leaves the game; its players are left without a team. The others keep their order with
// indexes 0…n-1, and if it was that team's turn, the next team is up.
function dropTeam(game: Game, team: Team): void {
    game.teams = game.teams.filter(t => t !== team);
    [...game.teams]
        .sort((a, b) => a.index - b.index)
        .forEach((t, index) => t.index = index);

    if (team.index < game.active_team_index) {
        game.active_team_index -= 1;
    }
    game.active_team_index %= Math.max(game.teams.length, 1);
}

// Takes a player out of a team. During a game the others close ranks, in the same order, so the
// indexes stay 0…n-1 and the turn passes to whoever was next. Between games the order doesn't
// matter yet: setUp shuffles it again.
function removeFromTeam(team: Team, playerId: string, betweenGames: boolean): void {
    const player = team.players.find(p => p.id === playerId)!;
    team.removePlayer(player);

    if (betweenGames || team.players.length === 0) {
        return;
    }

    team.players
        .sort((a, b) => a.index - b.index)
        .forEach((p, index) => p.index = index);

    if (player.index < team.active_player_index) {
        team.active_player_index -= 1;
    }
    team.active_player_index %= team.players.length;
}

// When the Durable Object's single alarm should next go off: the end of the running turn, or the
// moment the room expires, whichever comes first
export function nextAlarm(room: RoomData): number {
    const expires = room.last_activity + ROOM_LIFETIME;

    return room.ends_at !== null && !room.is_applying_score ? Math.min(room.ends_at, expires) : expires;
}

export function isExpired(room: RoomData, now: number): boolean {
    return now >= room.last_activity + ROOM_LIFETIME;
}

export function view(room: RoomData, now: number): RoomView {
    const running = phase(room, now) === 'turn';
    const { available: _, ...game } = room.game;

    return {
        code: room.code,
        host_id: room.host_id,
        members: room.members.map(m => ({ id: m.id, name: m.name, connected: m.connected_since !== null })),
        game,
        turn: room.turn,
        describer_id: describerId(room),
        ends_at: running ? room.ends_at : null,
        is_applying_score: room.is_applying_score,
        active_words: running ? [] : room.active_words,
        guessed: room.guessed,
        last_turn: room.last_turn,
    };
}

// Everything one phone should get after a change: the state, plus the words if it's their running turn
export function messagesFor(room: RoomData, playerId: string, now: number): ServerMessage[] {
    const messages: ServerMessage[] = [{ type: 'state', state: view(room, now) }];

    if (phase(room, now) === 'turn' && playerId === describerId(room)) {
        messages.push({ type: 'words', turn: room.turn, words: room.active_words });
    }

    return messages;
}

// Turns raw text from a socket into a message, or null for anything malformed
export function parseMessage(raw: string): ClientMessage | null {
    try {
        const message = JSON.parse(raw);

        return message && typeof message === 'object' && typeof message.type === 'string' ? message : null;
    } catch {
        return null;
    }
}

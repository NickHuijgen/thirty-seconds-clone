// The messages between a phone and its room, shared by the server (server/) and the client
// (composables/useOnlineGame.ts). Plain types and helpers only: this file is type-checked for both the
// browser and the Worker, so it can't use anything specific to either.
import type { LastTurn, SavedGame } from '../models/Game.ts';

export type ClientMessage =
    | { type: 'join', name: string, playerId?: string }
    | { type: 'ping', t0: number }
    // "Verlaat lobby": out of the room for good. A lost connection just keeps the seat.
    | { type: 'leave' }
    // Host only, in the lobby (assignPlayer and kick also during a game)
    | { type: 'setMaxScore', score: number }
    | { type: 'addTeam' }
    | { type: 'removeTeam', teamIndex: number }
    | { type: 'renameTeam', teamIndex: number, name: string }
    | { type: 'assignPlayer', playerId: string, teamIndex: number | null }
    | { type: 'kick', playerId: string }
    | { type: 'start' }
    | { type: 'restart' }
    // The describer only (scoring also the host, when the describer is gone). `turn` is the turn number
    // from the state, so a late or repeated message can't act on the next turn.
    | { type: 'startTurn', turn: number }
    | { type: 'endTurnEarly', turn: number }
    | { type: 'setWord', turn: number, index: number, guessed: boolean }
    | { type: 'finishTurn', turn: number };

export type ServerMessage =
    | { type: 'welcome', playerId: string, state: RoomView }
    | { type: 'pong', t0: number, server: number }
    | { type: 'state', state: RoomView }
    // Only to the describer, only while their turn runs
    | { type: 'words', turn: number, words: string[] }
    | { type: 'error', message: string };

export interface MemberView {
    id: string;
    name: string;
    connected: boolean;
}

// What every phone sees. The same for everyone: the words of a running turn are never in here.
export interface RoomView {
    code: string;
    host_id: string | null;
    members: MemberView[];
    // Teams, scores and turn order, without the remaining word lists
    game: SavedGame;
    turn: number;
    describer_id: string | null;
    // Server time (epoch ms) at which the running turn ends; null outside a turn
    ends_at: number | null;
    is_applying_score: boolean;
    // Empty while a turn runs; the turn's words from the moment it ends
    active_words: string[];
    // Indexes into active_words the describer has ticked as guessed
    guessed: number[];
    last_turn: LastTurn | null;
}

// Close codes for connections the client shouldn't retry
export const CLOSE_ROOM_GONE = 4404;
export const CLOSE_KICKED = 4403;
export const CLOSE_LEFT = 4410;

export const MAX_MEMBERS = 20;
export const MAX_NAME_LENGTH = 20;

// No O/0 or I/1, so a code read out loud or off a screen can't be mistyped
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 4;

// Room codes are case-insensitive
export function normaliseCode(code: string): string | null {
    const upper = code.trim().toUpperCase();

    return upper.length === CODE_LENGTH && [...upper].every(c => CODE_ALPHABET.includes(c)) ? upper : null;
}

// `random` returns CODE_LENGTH bytes; crypto.getRandomValues in the Worker
export function generateCode(random: (length: number) => Uint8Array): string {
    // 256 is a multiple of the alphabet's 32 letters, so every letter is equally likely
    return [...random(CODE_LENGTH)].map(byte => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

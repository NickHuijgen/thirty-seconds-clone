/// <reference types="node" />
import Game, { type LoadSound, type Sound, type WordLists } from '../models/Game.ts';
import Team from '../models/Team.ts';
import Player from '../models/Player.ts';

// A Map-backed localStorage; Node has no localStorage of its own by default
export class MemoryStorage {
    items = new Map<string, string>();
    failWrites = false;

    getItem(key: string): string | null {
        return this.items.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        if (this.failWrites) {
            throw new Error('QuotaExceededError');
        }
        this.items.set(key, String(value));
    }

    removeItem(key: string): void {
        this.items.delete(key);
    }
}

export function installStorage(): MemoryStorage {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });

    return storage;
}

export function wordLists(perCategory = 20): WordLists {
    const list = (prefix: string) => Array.from({ length: perCategory }, (_, i) => `${prefix} ${i + 1}`);

    return {
        people: list('Persoon'),
        places: list('Plaats'),
        wildcards: list('Wildcard'),
        media: list('Film'),
        brands: list('Merk'),
    };
}

// Records every sound that's played, in order
export function recordingSounds(): { loadSound: LoadSound, played: Sound[] } {
    const played: Sound[] = [];
    const loadSound: LoadSound = sound => ({ play: () => played.push(sound) });

    return { loadSound, played };
}

// The same starting point as pages/game.vue: two teams of two
export function newGame(options: { maxScore?: number, words?: WordLists, loadSound?: LoadSound, teams?: number, playersPerTeam?: number } = {}): Game {
    const game = new Game(options.maxScore ?? 50, options.words ?? wordLists(), options.loadSound);
    let player = 1;

    for (let t = 1; t <= (options.teams ?? 2); t++) {
        const team = new Team(`Team ${t}`);
        for (let p = 0; p < (options.playersPerTeam ?? 2); p++) {
            team.addPlayer(new Player(`Speler ${player++}`));
        }
        game.addTeam(team);
    }

    return game;
}

// Plays one turn the way the screens do: start, end early, score
export function playTurn(game: Game, guessed: number): string[] {
    game.startTurn();
    const words = [...game.active_words];
    game.forceEndTurn();
    game.finishTurn(guessed);

    return words;
}

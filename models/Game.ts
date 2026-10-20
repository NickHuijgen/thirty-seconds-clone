import Team, { TEAM_COLOURS, type TeamColour } from './Team.ts';
import Player from './Player.ts';

export const CATEGORIES = ['people', 'places', 'wildcards', 'media', 'brands'] as const;

export type Category = typeof CATEGORIES[number];

export type WordLists = Record<Category, string[]>;

export type Sound = 'turn-start' | 'vine-boom';

// Returns a loaded sound that can be played later; injected so the game logic runs without a browser
export type LoadSound = (sound: Sound) => { play(): void };

export const TURN_SECONDS = 30;

export const STORAGE_KEY = 'thirty-seconds-game';

const SAVE_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

const silent: LoadSound = () => ({ play() {} });

export default class Game {
    max_score: number;
    teams: Team[] = [];
    is_in_progress: boolean = false;
    active_team_index: number = 0;
    active_words: string[] = [];
    interval: ReturnType<typeof setInterval> | undefined = undefined;

    words: WordLists;
    available: WordLists = Game.emptyWordLists();

    loadSound: LoadSound;

    turn_timer: number = 0;

    is_applying_score: boolean = false;
    is_finished: boolean = false;
    is_restarted: boolean = false;

    winning_team: Team | null = null;

    // The score of the turn that just ended, for the "+3" on the leaderboard. Not saved: a resume doesn't replay it.
    last_turn: { team_index: number, score: number } | null = null;

    public constructor(max_score: number, words: WordLists, loadSound: LoadSound = silent) {
        this.max_score = max_score;
        this.words = words;
        this.loadSound = loadSound;
    }

    public restart(): void {
        this.winning_team = null;
        this.is_finished = false;
        this.is_in_progress = false;
        this.is_applying_score = false;
        this.is_restarted = true;
        this.active_words = [];
        this.last_turn = null;

        this.teams.forEach(team => {
            team.score = 0;
            team.active_player_index = 0;
        });
    }

    public addTeam(team: Team) {
        team.colour = this.nextColour();
        this.teams.push(team);
    }

    // The first colour no other team has, so a removed team's colour comes back first
    public nextColour(): TeamColour {
        const used = this.teams.map(team => team.colour);

        return TEAM_COLOURS.find(colour => !used.includes(colour))
            ?? TEAM_COLOURS[this.teams.length % TEAM_COLOURS.length]!;
    }

    public removeTeam(team: Team) {
        this.teams = this.teams.filter(t => t !== team);
    }

    public setUp(): void {
        if (!this.is_restarted) {
            Game.clearSaved();
        }
        this.generateTeamIndexes();

        for (const category of CATEGORIES) {
            this.available[category] = [...this.words[category]];
        }

        this.last_turn = null;
        this.is_restarted = false;
        this.is_in_progress = true;
    }

    public startTurn(): void {
        this.setActiveWords();

        this.loadSound('turn-start').play();

        const timeUp = this.loadSound('vine-boom');

        this.turn_timer = TURN_SECONDS;
        this.interval = setInterval(() => {
            this.turn_timer -= 1;

            if (this.turn_timer === 1) {
                timeUp.play();
            }

            if (this.turn_timer <= 0) {
                clearInterval(this.interval);

                this.is_applying_score = true;
            }
        }, 1000);
    }

    public forceEndTurn(): void {
        clearInterval(this.interval);
        this.turn_timer = 0;

        this.loadSound('vine-boom').play();

        this.is_applying_score = true;
    }

    public finishTurn(score: number): void {
        this.is_applying_score = false;

        this.activeTeam().score += score;
        this.last_turn = { team_index: this.activeTeam().index, score };

        if (this.activeTeam().score >= this.max_score) {
            this.is_finished = true;
            this.winning_team = this.activeTeam();
        }

        this.goNextTurn();
        this.save();
    }

    public generateTeamIndexes(): void {
        for (let i = this.teams.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            // @ts-ignore
            [this.teams[i], this.teams[j]] = [this.teams[j], this.teams[i]];
        }

        // Assign random indexes
        this.teams.forEach((team, index) => {
            team.index = index;

            team.generatePlayerIndexes();
        });
    }

    public goNextTurn(): void {
        this.activeTeam().goNextTurn();

        this.active_team_index = (this.active_team_index + 1) % this.teams.length;
    }

    public activeTeam(): Team {
        // @ts-ignore
        return this.teams.filter(t => t.index === this.active_team_index)[0];
    }

    public setActiveWords(): void {
        this.active_words = CATEGORIES.map(category => this.getRandom(this.available[category]));

        // Remove the words right away, so a game saved after this turn doesn't offer them again
        this.setUsed();
    }

    public getRandom(array: string[]): string {
        // @ts-ignore
        return array[Math.floor(Math.random() * array.length)];
    }

    public setUsed(): void {
        for (const category of CATEGORIES) {
            this.available[category] = this.available[category].filter(w => !this.active_words.includes(w));
        }
    }

    public nextUpTeam(): Team {
        const next_team_index = (this.active_team_index + 1) % this.teams.length;

        // @ts-ignore
        return this.teams.filter(t => t.index === next_team_index)[0];
    }

    public teamCount(): number {
        return this.teams.length;
    }

    public playerCount(): number {
        let count = 0;

        this.teams.forEach(team => {
            count += team.playerCount();
        });

        return count;
    }

    public save(): void {
        const saved = {
            expires_at: Date.now() + SAVE_DURATION,
            max_score: this.max_score,
            teams: this.teams.map(team => ({
                name: team.name,
                score: team.score,
                index: team.index,
                active_player_index: team.active_player_index,
                colour: team.colour,
                players: team.players.map(player => ({ name: player.name, index: player.index })),
            })),
            is_in_progress: this.is_in_progress,
            active_team_index: this.active_team_index,
            is_finished: this.is_finished,
            available: this.available,
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        } catch (error) {
            // Private browsing or full storage: the game still works, it just can't be resumed
            console.log('Saving the game failed:', error);
        }
    }

    public loadSaved(): void {
        const saved = Game.readSaved();

        if (!saved || this.is_restarted) {
            return;
        }

        this.active_words = [];
        this.last_turn = null;
        this.max_score = saved.max_score;
        this.teams = saved.teams.map((team: any, index: number) => {
            const newTeam = new Team(team.name);
            // Saves from before team colours existed get one by position
            newTeam.colour = TEAM_COLOURS.includes(team.colour) ? team.colour : TEAM_COLOURS[index % TEAM_COLOURS.length]!;
            newTeam.score = team.score;
            newTeam.index = team.index;
            newTeam.active_player_index = team.active_player_index;
            newTeam.players = team.players.map((player: any) => {
                const newPlayer = new Player(player.name);
                newPlayer.index = player.index;

                return newPlayer;
            });

            return newTeam;
        });
        this.is_in_progress = saved.is_in_progress;
        this.active_team_index = saved.active_team_index;
        this.turn_timer = 0;
        this.is_applying_score = false;
        this.is_finished = saved.is_finished;
        this.winning_team = this.teams.find(team => team.score >= this.max_score) ?? null;

        for (const category of CATEGORIES) {
            this.available[category] = saved.available?.[category] ?? [...this.words[category]];
        }
    }

    public canLoadSaved(): boolean {
        return Game.readSaved() !== null && !this.is_restarted;
    }

    public static readSaved(): any | null {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');

            if (!saved || !(saved.expires_at > Date.now())) {
                return null;
            }

            return saved;
        } catch {
            return null;
        }
    }

    public static clearSaved(): void {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // Nothing saved if storage isn't available
        }
    }

    public static emptyWordLists(): WordLists {
        return { people: [], places: [], wildcards: [], media: [], brands: [] };
    }
}

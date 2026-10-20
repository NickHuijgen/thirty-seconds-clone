import Player from './Player.ts';

// Each team gets one of these, so you can see whose turn it is from across the room.
// The classes and hex values that go with each live in utils/teamColours.ts.
export const TEAM_COLOURS = ['emerald', 'sky', 'amber', 'rose', 'violet', 'orange', 'teal', 'pink'] as const;

export type TeamColour = typeof TEAM_COLOURS[number];

export default class Team {
    name: string;
    score: number;
    players: Player[];
    index: number = 0;
    active_player_index: number = 0;
    colour: TeamColour = 'emerald';

    public constructor(name: string) {
        this.name = name;
        this.score = 0;
        this.players = [];
    }

    public addPlayer(player: Player): void {
        this.players.push(player);
    }

    public removePlayer(player: Player): void {
        this.players = this.players.filter(p => p !== player);
    }

    public generatePlayerIndexes(): void {
        // Shuffle the players array
        for (let i = this.players.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            // @ts-ignore
            [this.players[i], this.players[j]] = [this.players[j], this.players[i]];
        }

        // Assign random indexes
        this.players.forEach((player, index) => {
            player.index = index;
        });
    }

    public goNextTurn(): void {
        this.active_player_index = (this.active_player_index + 1) % this.players.length;
    }

    public activePlayer(): Player|undefined {
        return this.players.filter(t => t.index === this.active_player_index)[0];
    }

    public inactivePlayers(): Player[] {
        return this.players.filter(p => p !== this.activePlayer());
    }

    public playerCount(): number {
        return this.players.length;
    }
}

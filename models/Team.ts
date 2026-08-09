import Player from './Player';

export default class Team {
    name: string;
    score: number;
    players: Player[];
    index: number = 0;
    active_player_index: number = 0;

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

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

    public addPlayer(player: Player) {
        this.players.push(player);
    }

    public removePlayer(player: Player) {
        this.players = this.players.filter(p => p !== player);
    }

    public generatePlayerIndexes() {
        // Shuffle the players array
        for (let i = this.players.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.players[i], this.players[j]] = [this.players[j], this.players[i]];
        }

        // Assign random indexes
        this.players.forEach((player, index) => {
            player.index = index;
        });
    }

    public goNextTurn() {
        this.active_player_index = (this.active_player_index + 1) % this.players.length;
    }

    public activePlayer() {
        return this.players[this.active_player_index];
    }
}

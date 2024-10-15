import Player from './Player';

export default class Team {
    name: string;
    score: number;
    players: Player[];

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
}

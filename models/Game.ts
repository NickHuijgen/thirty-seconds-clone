import Team from './Team';

export default class Game {
    max_score: number;
    teams: Team[] = [];
    is_in_progress: boolean = false;
    active_team_index: number = 0;

    public constructor(max_score: number) {
        this.max_score = max_score;
    }

    public addTeam(team: Team) {
        this.teams.push(team);
    }

    public removeTeam(team: Team) {
        this.teams = this.teams.filter(t => t !== team);
    }

    public start() {
        this.is_in_progress = true;

        this.generateTeamIndexes();
    }

    public generateTeamIndexes() {
        for (let i = this.teams.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.teams[i], this.teams[j]] = [this.teams[j], this.teams[i]];
        }

        // Assign random indexes
        this.teams.forEach((team, index) => {
            team.index = index;

            team.generatePlayerIndexes();
        });
    }

    public goNextTurn() {
        this.active_team_index = (this.active_team_index + 1) % this.teams.length;

        this.teams[this.active_team_index].goNextTurn();
    }

    public activeTeam() {
        return this.teams[this.active_team_index];
    }
}

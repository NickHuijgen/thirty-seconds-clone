export default class Player {
    max_score: number

    teams: Team[]

    public constructor(max_score: number) {
        this.max_score = max_score
    }

    public addTeam(team: Team) {
        this.teams.push(team)
    }
}

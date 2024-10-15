import Team from './Team';
import people from '../public/people.json';
import places from '../public/places.json';
import wildcards from '../public/wildcards.json';
import media from '../public/media.json';
import brands from '../public/brands.json';

export default class Game {
    max_score: number;
    teams: Team[] = [];
    is_in_progress: boolean = false;
    active_team_index: number = 0;
    active_words: string[] = []
    used_words: string[] = []

    available_people: string[] = [];
    available_places: string[] = [];
    available_wildcards: string[] = [];
    available_media: string[] = [];
    available_brands: string[] = [];

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
        this.generateTeamIndexes();

        this.available_people = people.data;
        this.available_places = places.data;
        this.available_wildcards = wildcards.data;
        this.available_media = media.data;
        this.available_brands = brands.data;

        this.setActiveWords();

        this.is_in_progress = true;
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

        this.setActiveWords();
    }

    public activeTeam() {
        return this.teams[this.active_team_index];
    }

    public setActiveWords() {
        this.used_words = [
            ...this.used_words,
            ...this.active_words
        ];

        this.active_words = [];

        this.setUsed();

        this.active_words = [
            this.getRandom(this.available_people),
            this.getRandom(this.available_places),
            this.getRandom(this.available_wildcards),
            this.getRandom(this.available_media),
            this.getRandom(this.available_brands),
        ];
    }

    public getRandom(array: string[]) {
        return array[Math.floor(Math.random() * array.length)];
    }

    public setUsed() {
        this.available_people = this.available_people.filter(p => !this.used_words.includes(p));
        this.available_places = this.available_places.filter(p => !this.used_words.includes(p));
        this.available_wildcards = this.available_wildcards.filter(p => !this.used_words.includes(p));
        this.available_media = this.available_media.filter(p => !this.used_words.includes(p));
        this.available_brands = this.available_brands.filter(p => !this.used_words.includes(p));
    }
}

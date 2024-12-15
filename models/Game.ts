import Team from './Team';
import people from '../public/people.json';
import places from '../public/places.json';
import wildcards from '../public/wildcards.json';
import media from '../public/media.json';
import brands from '../public/brands.json';
import vineBoom from "public/sounds/vine-boom.mp3";
import Player from "~/models/Player";

export default class Game {
    max_score: number;
    teams: Team[] = [];
    is_in_progress: boolean = false;
    active_team_index: number = 0;
    active_words: string[] = []

    available_people: string[] = [];
    available_places: string[] = [];
    available_wildcards: string[] = [];
    available_media: string[] = [];
    available_brands: string[] = [];

    turn_timer: number = 0;

    is_applying_score: boolean = false;
    is_finished: boolean = false;
    is_restarted: boolean = false;

    winning_team: Team | null = null;

    public constructor(max_score: number) {
        this.max_score = max_score;
    }

    public restart() {
        this.winning_team = null;
        this.is_finished = false;
        this.is_in_progress = false;
        this.is_applying_score = false;
        this.is_restarted = true;
        this.active_words = [];

        this.teams.forEach(team => {
            team.score = 0;
            team.active_player_index = 0;
        });
    }

    public addTeam(team: Team) {
        this.teams.push(team);
    }

    public removeTeam(team: Team) {
        this.teams = this.teams.filter(t => t !== team);
    }

    public setUp() {
        if (!this.is_restarted) {
            Game.clearCookies();
        }
        this.generateTeamIndexes();

        this.available_people = people.data;
        this.available_places = places.data;
        this.available_wildcards = wildcards.data;
        this.available_media = media.data;
        this.available_brands = brands.data;

        this.is_restarted = false;
        this.is_in_progress = true;
    }

    public start() {
        this.goNextTurn();
    }

    public startTurn() {
        this.setActiveWords();

        this.turn_timer = 30;
        const interval = setInterval(() => {
            this.turn_timer -= 1;

            if (this.turn_timer === 1) {
                let play: () => void;

                play = () => {
                    const audio = new Audio(vineBoom);
                    const promise = audio.play();

                    if (promise !== undefined) {
                        promise.catch(error => {
                            console.log(error)
                        });
                    }
                }

                play();
            }

            if (this.turn_timer <= 0) {
                clearInterval(interval);

                this.is_applying_score = true;
            }
        }, 1000);
    }

    public finishTurn(score: number) {
        this.is_applying_score = false;

        this.activeTeam().score += score;

        if (this.activeTeam().score >= this.max_score) {
            this.is_finished = true;
            this.winning_team = this.activeTeam();
        }

        this.goNextTurn();
        this.saveToCookies();
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
        this.teams[this.active_team_index].goNextTurn();

        this.active_team_index = (this.active_team_index + 1) % this.teams.length;
    }

    public activeTeam() {
        return this.teams.filter(t => t.index === this.active_team_index)[0];
    }

    public setActiveWords() {
        this.setUsed();

        this.active_words = [];

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
        this.available_people = this.available_people.filter(p => !this.active_words.includes(p));
        this.available_places = this.available_places.filter(p => !this.active_words.includes(p));
        this.available_wildcards = this.available_wildcards.filter(p => !this.active_words.includes(p));
        this.available_media = this.available_media.filter(p => !this.active_words.includes(p));
        this.available_brands = this.available_brands.filter(p => !this.active_words.includes(p));
    }

    public nextUpTeam() {
        const next_team_index = (this.active_team_index + 1) % this.teams.length;

        return this.teams[next_team_index];
    }

    public teamCount() {
        return this.teams.length;
    }

    public playerCount() {
        let count = 0;

        this.teams.forEach(team => {
            count += team.playerCount();
        });

        return count;
    }

    public saveToCookies() {
        const now = new Date();
        const time = now.getTime();
        const expireTime = time + 4 * 60 * 60 * 1000; // 4 hours in milliseconds
        now.setTime(expireTime);

        const { available_people, available_places, available_wildcards, available_media, available_brands, ...gameData } = this;

        document.cookie = `game_data=${JSON.stringify(gameData)};expires=${now.toUTCString()};path=/`;
        document.cookie = `available_people=${JSON.stringify(available_people)};expires=${now.toUTCString()};path=/`;
        document.cookie = `available_places=${JSON.stringify(available_places)};expires=${now.toUTCString()};path=/`;
        document.cookie = `available_wildcards=${JSON.stringify(available_wildcards)};expires=${now.toUTCString()};path=/`;
        document.cookie = `available_media=${JSON.stringify(available_media)};expires=${now.toUTCString()};path=/`;
        document.cookie = `available_brands=${JSON.stringify(available_brands)};expires=${now.toUTCString()};path=/`;
    }

    public getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
    };

    public loadFromCookies() {
        if (!this.canLoadFromCookies()) {
            return null;
        }

        const gameData = JSON.parse(this.getCookie('game_data') || '{}');
        this.active_words = [];
        this.max_score = gameData.max_score;
        this.teams = gameData.teams.map((team: any) => {
            const newTeam = new Team(team.name);
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
        this.is_in_progress = gameData.is_in_progress;
        this.active_team_index = gameData.active_team_index;
        this.turn_timer = gameData.turn_timer;
        this.is_applying_score = gameData.is_applying_score;
        this.is_finished = gameData.is_finished;
        this.winning_team = null;

        this.available_people = JSON.parse(this.getCookie('available_people') || '[]');
        this.available_places = JSON.parse(this.getCookie('available_places') || '[]');
        this.available_wildcards = JSON.parse(this.getCookie('available_wildcards') || '[]');
        this.available_media = JSON.parse(this.getCookie('available_media') || '[]');
        this.available_brands = JSON.parse(this.getCookie('available_brands') || '[]');
    }

    public static clearCookies() {
        document.cookie = 'game_data=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
        document.cookie = 'available_people=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
        document.cookie = 'available_places=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
        document.cookie = 'available_wildcards=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
        document.cookie = 'available_media=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
        document.cookie = 'available_brands=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
    }

    public canLoadFromCookies() {
        return this.getCookie('game_data') !== null && !this.is_restarted;
    }
}

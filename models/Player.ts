export default class Player {
    name: string
    is_playing: boolean = false;
    index: number = 0;

    public constructor(name: string) {
        this.name = name
    }
}

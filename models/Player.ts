export default class Player {
    name: string
    index: number = 0;
    // Online play: which connection this seat belongs to. Empty on one phone, where nobody needs one.
    id: string;

    public constructor(name: string, id: string = '') {
        this.name = name
        this.id = id;
    }
}

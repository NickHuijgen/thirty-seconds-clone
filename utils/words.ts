import people from '../public/people.json';
import places from '../public/places.json';
import wildcards from '../public/wildcards.json';
import media from '../public/media.json';
import brands from '../public/brands.json';
import type { WordLists } from '~/models/Game';

export const words: WordLists = {
    people: people.data,
    places: places.data,
    wildcards: wildcards.data,
    media: media.data,
    brands: brands.data,
};

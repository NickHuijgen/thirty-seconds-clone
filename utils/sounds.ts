import vineBoom from '../public/sounds/vine-boom.mp3';
import turnStart from '../public/sounds/turn-start.mp3';
// The "bruh" meme clip from MyInstants (https://www.myinstants.com/en/instant/bruh/); no licence stated
import bruh from '../public/sounds/bruh.mp3';
import type { LoadSound, Sound } from '~/models/Game';

const urls: Record<Sound, string> = {
    'turn-start': turnStart,
    'vine-boom': vineBoom,
    'bruh': bruh,
};

export const loadSound: LoadSound = (sound) => {
    const audio = new Audio(urls[sound]);
    audio.load();

    return {
        play() {
            audio.play()?.catch(error => {
                console.log('Audio play failed:', error);
            });
        },
    };
};

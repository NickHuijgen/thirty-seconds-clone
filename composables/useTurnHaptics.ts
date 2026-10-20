import { watch, type Ref } from 'vue';
import type Game from '~/models/Game';

// Vibrates at 5 seconds left and when the turn ends, so the player describing feels it without looking.
// Android only: iOS doesn't let web pages vibrate, and `navigator.vibrate` simply isn't there.
export function useTurnHaptics(game: Ref<Game>) {
    function vibrate(pattern: number | number[]) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }

    watch(() => game.value.turn_timer, (seconds, previous) => {
        if (seconds === 5 && previous === 6) {
            vibrate(80);
        }
    });

    watch(() => game.value.is_applying_score, (scoring) => {
        if (scoring) {
            vibrate([150, 80, 150]);
        }
    });
}

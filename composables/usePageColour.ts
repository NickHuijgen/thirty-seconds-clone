import { onMounted, watch } from 'vue';

// Colours the page behind the current screen. iOS Safari shows that colour under its address bar
// and toolbar, and older iOS versions tint the status bar with `theme-color`; without this both stay
// white (or keep whatever colour Safari picked up last) whatever the screen looks like.
export function usePageColour(colour: () => string) {
    function apply(value: string) {
        document.documentElement.style.backgroundColor = value;
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', value);
    }

    onMounted(() => apply(colour()));
    watch(colour, apply);
}

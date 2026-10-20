import type { Ref } from 'vue';

// Keeps the screen on while `active` is true, so the phone doesn't lock while it's passed around.
// The browser drops the lock whenever the page is hidden, so it's requested again when the page comes back.
export function useWakeLock(active: Ref<boolean>) {
    let sentinel: WakeLockSentinel | null = null;
    let requesting = false;

    async function acquire() {
        if (sentinel || requesting || !('wakeLock' in navigator) || document.visibilityState !== 'visible') {
            return;
        }

        requesting = true;
        try {
            sentinel = await navigator.wakeLock.request('screen');
            sentinel.addEventListener('release', () => {
                sentinel = null;
            });
        } catch (error) {
            console.log('Wake lock failed:', error);
        } finally {
            requesting = false;
        }

        // The game may have ended while the request was pending
        if (!active.value) {
            release();
        }
    }

    function release() {
        sentinel?.release();
        sentinel = null;
    }

    function onVisibilityChange() {
        if (active.value) {
            acquire();
        }
    }

    watch(active, isActive => isActive ? acquire() : release(), { immediate: true });

    onMounted(() => document.addEventListener('visibilitychange', onVisibilityChange));

    onUnmounted(() => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        release();
    });
}

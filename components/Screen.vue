<template>
  <!-- One full-height screen: content on top, the main action pinned at the bottom within thumb reach.
       The page itself never scrolls (main.css); only this content area does, and only when `scrollable`. -->
  <div class="flex h-dvh flex-col">
    <!-- `relative` keeps absolutely positioned children (like sr-only inputs) inside this area,
         instead of positioning them against the page and making the page taller than the screen -->
    <main
        class="relative flex-1"
        :class="scrollable ? 'overflow-y-auto overscroll-y-contain' : 'overflow-hidden'"
    >
      <div
          class="mx-auto flex w-full max-w-md flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4"
          :class="scrollable ? 'min-h-full' : 'h-full'"
      >
        <slot />
      </div>
    </main>

    <div
        v-if="$slots.action"
        class="mx-auto w-full max-w-md px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  // Turn screens fit the phone exactly and must not move under the player's thumb
  scrollable: {
    type: Boolean,
    default: true,
  },
});
</script>

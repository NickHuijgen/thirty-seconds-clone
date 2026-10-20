<template>
  <div class="bg-emerald-700 text-white [&_:focus-visible]:outline-white">
    <Screen>
      <div class="my-auto text-center">
        <span
            class="material-icons text-8xl! motion-safe:animate-bounce-in"
            aria-hidden="true"
        >
          hourglass_top
        </span>

        <h1 class="mt-4 text-4xl font-extrabold">
          Welkom bij 30 seconden!
        </h1>

        <p class="mt-3 text-lg text-emerald-50">
          Omschrijf zoveel mogelijk woorden voor je team, op één telefoon die de kring rondgaat.
        </p>

        <p class="mt-6 font-semibold text-emerald-100">
          Ben je klaar om te spelen?
        </p>
      </div>

      <template #action>
        <RouterLink
            to="/game"
            class="flex h-14 w-full items-center justify-center rounded-2xl bg-white text-lg font-semibold text-emerald-700 shadow-lg transition active:scale-[0.98]"
        >
          Begin spel
        </RouterLink>
      </template>
    </Screen>
  </div>
</template>

<script setup lang="ts">
import Screen from "~/components/Screen.vue";
import { usePageColour } from "~/composables/usePageColour";
import { TEAM_STYLES } from "~/utils/teamColours";

usePageColour(() => TEAM_STYLES.emerald.hex);
</script>

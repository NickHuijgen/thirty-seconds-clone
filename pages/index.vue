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
          Omschrijf zoveel mogelijk woorden voor je team, binnen 30 seconden.
        </p>

        <p class="mt-6 font-semibold text-emerald-100">
          Hoe spelen jullie?
        </p>
      </div>

      <template #action>
        <div class="space-y-3">
          <RouterLink
              to="/game"
              class="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left text-emerald-700 shadow-lg transition active:scale-[0.98]"
          >
            <span
                class="material-icons"
                aria-hidden="true"
            >
              smartphone
            </span>
            <span class="flex-1">
              <span class="block text-lg font-semibold">Spelen op één telefoon</span>
              <span class="block text-sm text-gray-600">De telefoon gaat de kring rond, werkt ook zonder internet</span>
            </span>
          </RouterLink>
          <RouterLink
              to="/online"
              class="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-emerald-900 px-4 py-3 text-left text-white shadow-lg ring-2 ring-white/40 transition active:scale-[0.98]"
          >
            <span
                class="material-icons"
                aria-hidden="true"
            >
              devices
            </span>
            <span class="flex-1">
              <span class="block text-lg font-semibold">Online spelen</span>
              <span class="block text-sm text-emerald-100">Iedereen op zijn eigen telefoon, met een lobbycode</span>
            </span>
          </RouterLink>
        </div>
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

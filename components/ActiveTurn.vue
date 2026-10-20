<template>
  <div class="bg-gray-50 text-gray-900">
    <!-- The team's colour along the top. Fixed, so it adds no height to the screen. -->
    <div
        class="pointer-events-none fixed inset-x-0 top-0 z-10 h-2"
        :class="style.bar"
        aria-hidden="true"
    />

    <Screen :scrollable="false">
      <div class="flex items-center justify-between gap-4">
        <div class="min-w-0">
          <p
              class="truncate text-sm font-semibold"
              :class="style.text"
          >
            {{ team.name }}
          </p>
          <p class="truncate text-lg font-bold">
            {{ team.activePlayer()?.name }} omschrijft
          </p>
          <p class="text-sm text-gray-500">
            Tik op de klok om te stoppen
          </p>
        </div>

        <button
            type="button"
            class="relative shrink-0 rounded-full"
            :class="{ 'motion-safe:animate-urgent': urgency === 'urgent' }"
            aria-label="Beëindig beurt"
            @click="game.forceEndTurn()"
        >
          <svg
              class="size-24"
              viewBox="0 0 36 36"
              aria-hidden="true"
          >
            <path
                class="circle-bg"
                d="M18 2.0845
             a 15.9155 15.9155 0 0 1 0 31.831
             a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
                class="circle"
                :class="RING[urgency].stroke"
                :stroke-dasharray="`${(game.turn_timer / TURN_SECONDS) * 100}, 100`"
                d="M18 2.0845
             a 15.9155 15.9155 0 0 1 0 31.831
             a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <text
                x="18"
                y="21.5"
                class="timer-text"
                :class="RING[urgency].text"
            >{{ game.turn_timer }}</text>
          </svg>
        </button>
      </div>

      <p
          class="sr-only"
          aria-live="polite"
      >
        {{ countdownAnnouncement }}
      </p>

      <!-- min-h-0 lets the cards shrink to fit short phones; the screen never scrolls -->
      <ul class="mt-6 flex min-h-0 flex-1 flex-col gap-3">
        <li
            v-for="(word, index) in game.active_words"
            :key="index"
            class="flex min-h-0 flex-1 items-center gap-3 rounded-2xl bg-white px-4 shadow-sm motion-safe:animate-deal-in"
            :style="{ animationDelay: `${index * 50}ms` }"
        >
          <span
              class="material-icons shrink-0 text-gray-400"
              aria-hidden="true"
          >
            {{ categoryOf(index).icon }}
          </span>
          <span class="sr-only">{{ categoryOf(index).label }}:</span>
          <span class="line-clamp-2 text-[clamp(1.25rem,3.4dvh,1.5rem)] leading-tight font-bold break-words">{{ word }}</span>
        </li>
      </ul>
    </Screen>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Game, { CATEGORIES, TURN_SECONDS } from "~/models/Game";
import Screen from "~/components/Screen.vue";
import { CATEGORY_INFO } from "~/utils/categories";
import { PAGE_GREY, TEAM_STYLES } from "~/utils/teamColours";
import { usePageColour } from "~/composables/usePageColour";

const props = defineProps({
  game: {
    type: Game,
    required: true,
  },
});

const RING = {
  calm: { stroke: 'stroke-green-500', text: 'fill-gray-800' },
  warning: { stroke: 'stroke-amber-500', text: 'fill-amber-700' },
  urgent: { stroke: 'stroke-red-500', text: 'fill-red-700' },
};

const team = computed(() => props.game.activeTeam());
const style = computed(() => TEAM_STYLES[team.value.colour]);

usePageColour(() => PAGE_GREY);

const urgency = computed(() => {
  if (props.game.turn_timer <= 5) {
    return 'urgent';
  }

  return props.game.turn_timer <= 10 ? 'warning' : 'calm';
});

// active_words holds one word per category, in CATEGORIES order
function categoryOf(index: number) {
  return CATEGORY_INFO[CATEGORIES[index]!];
}

// Only a few moments are announced; reading out every second would drown out the players
const countdownAnnouncement = computed(() => {
  if (props.game.turn_timer <= 5) {
    return 'Nog 5 seconden';
  }

  if (props.game.turn_timer <= 10) {
    return 'Nog 10 seconden';
  }

  return '';
});
</script>

<style scoped>
.circle-bg {
  fill: none;
  stroke: #e5e7eb;
  stroke-width: 3.8;
}

.circle {
  fill: none;
  stroke-width: 2.8;
  stroke-linecap: round;
  transition-property: stroke-dasharray, stroke;
  transition-duration: 0.3s;
}

.timer-text {
  transition: fill 0.3s;
  font-size: 0.6em;
  font-weight: 700;
  text-anchor: middle;
}
</style>

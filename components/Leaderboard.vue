<template>
  <div>
    <h2 class="sr-only">
      Tussenstand
    </h2>
    <TransitionGroup
        tag="ol"
        name="leaderboard"
        class="space-y-3"
    >
      <li
          v-for="team in rows"
          :key="team.index"
          class="relative"
      >
        <div class="flex items-baseline justify-between gap-3">
          <span class="flex min-w-0 items-center gap-2 font-semibold">
            <span
                class="size-3 shrink-0 rounded-full"
                :class="TEAM_STYLES[team.colour].bar"
                aria-hidden="true"
            />
            <span class="truncate">{{ team.name }}</span>
          </span>
          <span class="shrink-0 tabular-nums text-gray-600">
            <span class="font-semibold text-gray-900">{{ shownScore(team) }}</span> / {{ game.max_score }}
          </span>
        </div>

        <div class="mt-1.5 h-2.5 overflow-hidden rounded-full bg-gray-200">
          <div
              class="h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
              :class="TEAM_STYLES[team.colour].bar"
              :style="{ width: `${Math.min(shownScore(team) / game.max_score, 1) * 100}%` }"
          />
        </div>

        <span
            v-if="gained(team) > 0"
            class="pointer-events-none absolute -top-3 right-0 rounded-full bg-gray-900 px-2 py-0.5 text-sm font-bold text-white opacity-0 motion-safe:animate-score-pop"
            aria-hidden="true"
        >
          +{{ gained(team) }}
        </span>
      </li>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import Game from "~/models/Game";
import type Team from "~/models/Team";
import { TEAM_STYLES } from "~/utils/teamColours";

const props = defineProps({
  game: {
    type: Game,
    required: true,
  },
});

// The board first shows the scores from before the last turn, then moves to the new ones,
// so the bar grows and the row slides into its new place
const settled = ref(false);
let timeout: ReturnType<typeof setTimeout> | undefined;

function gained(team: Team): number {
  return props.game.last_turn?.team_index === team.index ? props.game.last_turn.score : 0;
}

function shownScore(team: Team): number {
  return settled.value ? team.score : team.score - gained(team);
}

// Sort a copy, so rendering never reorders the game's own teams array
const rows = computed(() => [...props.game.teams].sort((a, b) => shownScore(b) - shownScore(a)));

onMounted(() => {
  timeout = setTimeout(() => settled.value = true, 400);
});

onUnmounted(() => clearTimeout(timeout));
</script>

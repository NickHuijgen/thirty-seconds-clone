<template>
  <div
      class="text-white [&_:focus-visible]:outline-white"
      :class="style.solid"
  >
    <Confetti :colours="[...style.confetti, '#ffffff', '#facc15']" />

    <Screen>
      <div class="pt-6 text-center">
        <span
            class="material-icons text-8xl! text-yellow-300 motion-safe:animate-bounce-in"
            aria-hidden="true"
        >
          emoji_events
        </span>
        <h1 class="mt-2 text-4xl font-extrabold break-words motion-safe:animate-bounce-in [animation-delay:150ms]">
          {{ game.winning_team?.name }} heeft gewonnen!
        </h1>
      </div>

      <div class="mt-8 rounded-2xl bg-white p-4 text-gray-900 shadow-lg">
        <Leaderboard :game="game" />
      </div>

      <template #action>
        <ActionButton
            class="bg-white"
            :class="style.text"
            @click="restartGame()"
        >
          Begin opnieuw
        </ActionButton>
      </template>
    </Screen>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Game from "~/models/Game";
import Leaderboard from "~/components/Leaderboard.vue";
import Confetti from "~/components/Confetti.vue";
import Screen from "~/components/Screen.vue";
import ActionButton from "~/components/ActionButton.vue";
import { TEAM_STYLES } from "~/utils/teamColours";
import { usePageColour } from "~/composables/usePageColour";

const props = defineProps({
  game: {
    type: Game,
    required: true,
  },
});

const emit = defineEmits(['restart-game']);

const style = computed(() => TEAM_STYLES[props.game.winning_team?.colour ?? 'emerald']);

usePageColour(() => style.value.hex);

function restartGame() {
  emit('restart-game');
}
</script>

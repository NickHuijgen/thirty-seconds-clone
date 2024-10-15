<template>
  <div>
    <p class="text-xl font-bold">
      {{ game.winning_team?.name}} heeft gewonnen!
    </p>

    <Leaderboard :game="game" />

    <div class="pt-6 flex justify-center">
      <button
          type="button"
          class="px-8 py-3 font-semibold rounded bg-gradient-to-br text-white shadow-2xl hover:bg-gradient-to-tr from-emerald-600 to-emerald-800"
          @click="restartGame()"
      >
        Begin opnieuw
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import Game from "~/models/Game";

const props = defineProps({
  game: {
    type: Game,
    required: true,
  },
});

const emit = defineEmits(['restart-game']);

function restartGame() {
  emit('restart-game');
}
</script>

<style scoped>

</style>

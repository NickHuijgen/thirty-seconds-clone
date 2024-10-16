<template>
  <div>
    <p class="text-center">
      {{ game.activeTeam().name }} is aan de beurt
    </p>

    <p class="text-xl text-center">
      Geef de telefoon aan <b>{{ game.activeTeam().activePlayer().name }}</b>
    </p>
  </div>

  <div class="pt-6 flex justify-center">
    <button
        type="button"
        class="px-8 py-3 font-semibold rounded bg-gradient-to-br text-white shadow-2xl hover:bg-gradient-to-tr from-emerald-600 to-emerald-800"
        @click="game.startTurn()"
    >
      Start beurt
    </button>
  </div>

  <Leaderboard :game="game" />

  <div class="py-4 text-sm text-gray-500">
    <p>
      Deze spelers mogen raden:
    </p>

    <p
        v-for="(player, index) in game.activeTeam().inactivePlayers()"
        :key="index"
    >
      {{ player.name }}
    </p>
  </div>

  <p class="text-sm text-gray-500">
    Volgende beurt is {{ game.nextUpTeam().nextUpPlayer().name }} van {{ game.nextUpTeam().name }} aan de beurt
  </p>
</template>

<script setup lang="ts">
import Game from "~/models/Game";
import Leaderboard from "~/components/Leaderboard.vue";

const props = defineProps({
  game: {
    type: Game,
    required: true,
  },
});
</script>

<style scoped>

</style>

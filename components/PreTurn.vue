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
        @click="game.startTurnTimer()"
    >
      Start beurt
    </button>
  </div>
</template>

<script setup lang="ts">
import Team from "~/models/Team";
import PlayerSetup from "~/components/PlayerSetup.vue";
import Player from "~/models/Player";
import RemoveButton from "~/components/RemoveButton.vue";
import Game from "~/models/Game";

const props = defineProps({
  game: {
    type: Game,
    required: true,
  },
});
</script>

<style scoped>

</style>

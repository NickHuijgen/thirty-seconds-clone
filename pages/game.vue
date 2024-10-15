<template>
  <div class="h-screen w-full bg-gradient-to-tr from-green-100 to-blue-200 flex justify-center">
    <div class="my-auto bg-white p-4 rounded-md shadow-2xl">
      <SetupForm
          v-if="!game.is_in_progress"
          :game="game"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Game from "~/models/game.ts";
import Team from "~/models/team.ts";
import SetupForm from "~/components/GameSetup.vue";

const game: Game = ref(new Game(20))

game.value.addTeam(new Team('Team 1'))

</script>

<style scoped>

</style>

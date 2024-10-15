<template>
  <div class="h-screen overflow-y-auto w-full bg-gradient-to-tr from-green-100 to-blue-200 flex justify-center">
    <div class="my-auto bg-white p-4 rounded-md shadow-2xl">
      <SetupForm
          v-if="!game.is_in_progress"
          :game="game"
      />
      <Playing
        :game="game"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Game from "~/models/game.ts";
import Team from "~/models/team.ts";
import SetupForm from "~/components/GameSetup.vue";
import Player from "~/models/Player";
import Playing from "~/components/Playing.vue";

const game: Game = ref(new Game(50))

const team1 = new Team('Team 1');

team1.addPlayer(new Player('Speler 1'));
team1.addPlayer(new Player('Speler 2'));

game.value.addTeam(team1);

const team2 = new Team('Team 2');

team2.addPlayer(new Player('Speler 1'));
team2.addPlayer(new Player('Speler 2'));

game.value.addTeam(team2);

</script>

<style scoped>

</style>

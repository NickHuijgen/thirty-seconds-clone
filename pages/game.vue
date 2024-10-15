<template>
  <div
      class="h-screen overflow-y-auto w-full bg-gradient-to-tr from-green-100 to-blue-200 flex justify-center"
      v-if="game"
  >
    <div class="my-auto bg-white p-4 rounded-md shadow-2xl">
      <SetupForm
        v-if="!game.is_in_progress && !game.is_finished"
        :game="game"
      />
      <Playing
        v-if="game.is_in_progress && !game.is_finished"
        :game="game"
      />
      <PostGame
        v-if="game.is_finished"
        :game="game"
        @restart-game="restartGame(game)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Game from "~/models/Game.ts";
import Team from "~/models/Team.ts";
import SetupForm from "~/components/GameSetup.vue";
import Player from "~/models/Player";
import Playing from "~/components/Playing.vue";
import PostGame from "~/components/PostGame.vue";

const game: Game = ref(new Game(5))

const team1 = new Team('Team 1');

team1.addPlayer(new Player('Speler 1'));
team1.addPlayer(new Player('Speler 2'));

game.value.addTeam(team1);

const team2 = new Team('Team 2');

team2.addPlayer(new Player('Speler 1'));
team2.addPlayer(new Player('Speler 2'));

game.value.addTeam(team2);

function restartGame(game: Game) {
  game.restart();
}

</script>

<style scoped>

</style>

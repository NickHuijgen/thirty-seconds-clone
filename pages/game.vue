<template>
  <div
      class="h-screen p-4 overflow-y-auto w-full bg-linear-to-tr from-green-100 to-blue-200 flex justify-center"
      v-if="game"
  >
    <div class="my-auto bg-white p-4 rounded-md shadow-2xl">
      <SetupForm
        v-if="!game.is_in_progress && !game.is_finished"
        :game="game"
        @resume-game="resumeGame()"
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
import Game from "~/models/Game";
import Team from "~/models/Team";
import SetupForm from "~/components/GameSetup.vue";
import Player from "~/models/Player";
import Playing from "~/components/Playing.vue";
import PostGame from "~/components/PostGame.vue";
import { words } from "~/utils/words";
import { loadSound } from "~/utils/sounds";
import { useWakeLock } from "~/composables/useWakeLock";

const game = ref(new Game(50, words, loadSound));

useWakeLock(computed(() => game.value.is_in_progress && !game.value.is_finished));

const team1 = new Team('Team 1');

team1.addPlayer(new Player('Speler 1'));
team1.addPlayer(new Player('Speler 2'));

game.value.addTeam(team1);

const team2 = new Team('Team 2');

team2.addPlayer(new Player('Speler 3'));
team2.addPlayer(new Player('Speler 4'));

game.value.addTeam(team2);

function restartGame(game: Game) {
  game.restart();
}

function resumeGame() {
  game.value.loadSaved();
}
</script>

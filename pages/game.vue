<template>
  <Transition
      name="screen"
      mode="out-in"
  >
    <SetupForm
        v-if="!game.is_in_progress && !game.is_finished"
        key="setup"
        :game="game"
        @resume-game="resumeGame()"
    />
    <Playing
        v-else-if="!game.is_finished"
        key="playing"
        :game="game"
        :guessed="guessed"
        @start-turn="game.startTurn()"
        @end-turn="game.forceEndTurn()"
        @toggle-word="toggleWord"
        @finish-turn="finishTurn()"
    />
    <PostGame
        v-else
        key="finished"
        :game="game"
        @restart-game="restartGame(game)"
    />
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import Game from "~/models/Game";
import Team from "~/models/Team";
import SetupForm from "~/components/GameSetup.vue";
import Player from "~/models/Player";
import Playing from "~/components/Playing.vue";
import PostGame from "~/components/PostGame.vue";
import { words } from "~/utils/words";
import { loadSound } from "~/utils/sounds";
import { useWakeLock } from "~/composables/useWakeLock";
import { useTurnHaptics } from "~/composables/useTurnHaptics";

const game = ref(new Game(50, words, loadSound));

// The words ticked on the scoring screen, as indexes into active_words
const guessed = ref<number[]>([]);

useWakeLock(computed(() => game.value.is_in_progress && !game.value.is_finished));
useTurnHaptics(game);

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

function toggleWord(index: number) {
  guessed.value = guessed.value.includes(index)
    ? guessed.value.filter(i => i !== index)
    : [...guessed.value, index];
}

function finishTurn() {
  game.value.finishTurn(guessed.value.length);
  guessed.value = [];
}

function resumeGame() {
  game.value.loadSaved();
}
</script>

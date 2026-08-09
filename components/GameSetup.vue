<template>
  <div class="grid gris-cols-1">
    <button
        v-if="game.canLoadFromCookies()"
        type="button"
        class="px-8 py-3 mb-2 font-semibold rounded bg-gradient-to-br text-white shadow-2xl hover:bg-gradient-to-tr from-emerald-600 to-emerald-800"
        @click="emit('start-from-cookies')"
    >
      Ga verder met bestaand spel
    </button>

    <div class="pt-2">
      <p class="text-2xl font-bold text-gray-600 mb-2">
        30 seconds
      </p>

      <p class="text-gray-600 mb-4">
        Wie en welk team begint wordt willekeurig bepaald
      </p>
    </div>

    <div class="pt-2">
      <p class="font-semibold text-lg mb-1">
        Teams
      </p>

      <div
          v-for="(team, index) in game.teams"
          :key="index"
          class="border-2 border-gray-200 shadow-sm rounded-md p-4 mb-4"
      >
        <TeamSetup
            :team="team"
            :game="game"
            :can-remove="game.teams.length > 2"
            :index="index"
            @remove-team="removeTeam(game, team)"
        />
      </div>
    </div>

    <div class="flex pb-4">
      <button
          type="button"
          class="px-2 py-0.5 border-2 border-gray-200 shadow-sm rounded-md text-gray-700"
          @click="addTeam(game)"
      >
        + Voeg team toe
      </button>
    </div>

    <div class="py-4">
      <p class="font-semibold">
        Regels
      </p>

      <label
          for="max_score"
          class="block mb-2 text-sm"
      >
        Tot de hoeveel punten spelen we?
      </label>
      <select
          v-model="game.max_score"
          name="max_score"
          id="max_score"
          class="w-full px-3 py-2 border rounded-md dark:border-gray-300 dark:bg-gray-50 dark:text-gray-800"
      >
        <option :value="10">10</option>
        <option :value="25">25</option>
        <option :value="50">50</option>
        <option :value="100">100</option>
      </select>
    </div>

    <div class="pt-3 flex justify-center pb-8">
      <button
          type="button"
          class="px-8 py-3 font-semibold rounded bg-gradient-to-br text-white shadow-2xl hover:bg-gradient-to-tr from-emerald-600 to-emerald-800"
          @click="finishSetup(game)"
      >
        Begin nieuw spel
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import Game from "~/models/Game";
import TeamSetup from "~/components/TeamSetup.vue";
import Team from "~/models/Team";
import Player from "~/models/Player";

defineProps({
  game: {
    type: Game,
    required: true,
  },
});

const emit = defineEmits(['start-from-cookies']);

function addTeam(game: Game) {
  const team = new Team('Team ' + (game.teamCount() + 1));

  const currentPlayerCount = game.playerCount();

  team.addPlayer(new Player('Speler ' + (currentPlayerCount + 1)));
  team.addPlayer(new Player('Speler ' + (currentPlayerCount + 2)));

  game.addTeam(team);
}

function removeTeam(game: Game, team: Team) {
  game.removeTeam(team);
}

function finishSetup(game: Game) {
  game.setUp();
}
</script>

<style scoped>

</style>

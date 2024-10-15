<template>
  <div class="grid gris-cols-1 sm:grid-cols-2">
    <div class="p-4">
      <p class="text-lg text-gray-600 mb-2">
        Game setup
      </p>

      <p class="text-gray-600 mb-4">
        Maximaal 4 teams. Maximaal 4 spelers per team.
      </p>

      <div>
        <label
            for="max_score"
            class="block mb-2 text-sm text-gray-600"
        >
          Tot de hoeveel punten spelen we? (maximaal)
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
    </div>

    <div>
      <button
          type="button"
          class="px-8 py-3 font-semibold rounded bg-gradient-to-br text-white shadow-2xl hover:bg-gradient-to-tr from-emerald-600 to-emerald-800"
          @click="addTeam(game)"
      >
        Voeg team toe
      </button>

      <div
          v-for="(team, index) in game.teams"
          :key="index"
          class="border-2 p-4 shadow-xl my-2"
      >
        <TeamSetup
            :team="team"
            @remove-team="removeTeam(game, team)"
            :can-remove="game.teams.length > 1"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Game from "~/models/Game";
import TeamSetup from "~/components/TeamSetup.vue";
import Team from "~/models/Team";
import Player from "~/models/Player";

const props = defineProps({
  game: {
    type: Game,
    required: true,
  },
});

function addTeam(game) {
  const team = new Team('Team ' + (game.teams.length + 1));

  team.addPlayer(new Player('Speler 1'));

  game.addTeam(team);
}

function removeTeam(game, team) {
  game.removeTeam(team);
}
</script>

<style scoped>

</style>

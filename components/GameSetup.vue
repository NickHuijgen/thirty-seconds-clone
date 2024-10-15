<template>
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
      />
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

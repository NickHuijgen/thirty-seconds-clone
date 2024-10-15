<template>
  <div>
    <button
        type="button"
        class="px-8 py-3 font-semibold rounded bg-gradient-to-br text-white shadow-2xl hover:bg-gradient-to-tr from-emerald-600 to-emerald-800"
        @click="addTeam(game)"
    >
      Voeg team toe
    </button>

    <div class="border-2 p-4 shadow-2xl">
      <div
          v-for="(team, index) in game.teams"
          :key="index"
      >
        <TeamSetup
            :team="team"
            @remove-team="(team) => removeTeam(game, team)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Game from "~/models/Game";
import TeamSetup from "~/components/TeamSetup.vue";
import Team from "~/models/Team";

const props = defineProps({
  game: {
    type: Game,
    required: true,
  },
});

function addTeam(game) {
  game.addTeam(new Team('Team ' + (game.teams.length + 1)));
}

function removeTeam(game, team) {
  game.removeTeam(team);
}
</script>

<style scoped>

</style>

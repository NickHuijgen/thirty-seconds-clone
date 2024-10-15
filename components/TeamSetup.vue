<template>
  <div class="relative">
    <RemoveButton @click="removeTeam(team)" />

    <div>
      <label
          for="team_name"
          class="block mb-1"
      >
        Team naam
      </label>
      <input
          v-model="team.name"
          type="text"
          name="team_name"
          id="team_name"
          placeholder="Team naam"
          class="w-full px-3 py-2 border rounded-md dark:border-gray-300 dark:bg-gray-50 dark:text-gray-800"
      >
    </div>

    <p>
      Spelers
    </p>
    <button
        type="button"
        class="px-8 py-3 font-semibold rounded bg-gradient-to-br text-white shadow-2xl hover:bg-gradient-to-tr from-emerald-600 to-emerald-800"
        @click="addPlayer(team)"
    >
      Voeg speler toe
    </button>

    <div
        v-for="(player, index) in team.players"
        :key="index"
    >
      <PlayerSetup
          :player="player"
          @remove-player="(player) => removePlayer(team, player)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Team from "~/models/Team";
import PlayerSetup from "~/components/PlayerSetup.vue";
import Player from "~/models/Player";
import RemoveButton from "~/components/RemoveButton.vue";

const emit = defineEmits(['remove-team']);

const props = defineProps({
  team: {
    type: Team,
    required: true,
  },
});

function addPlayer(team) {
  team.addPlayer(new Player('Player ' + (team.players.length + 1)));
}

function removeTeam(team) {
  emit('remove-team', team);
}

function removePlayer(team, player) {
  team.removePlayer(player);
}
</script>

<style scoped>

</style>

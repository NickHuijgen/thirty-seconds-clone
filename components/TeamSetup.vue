<template>
  <div class="mb-1 font-medium">
    Team {{ index + 1 }}
  </div>

  <div class="relative">
    <RemoveButton
        :can-remove="canRemove"
        @click="removeTeam()"
    />

    <div>
      <input
          v-model="team.name"
          type="text"
          name="team_name"
          id="team_name"
          placeholder="Team naam"
          class="w-full px-3 py-2 border rounded-md dark:border-gray-300 dark:bg-gray-50 dark:text-gray-800"
      >
    </div>

    <div class="pt-4">
      <p class="font-medium">
        Spelers
      </p>

      <div
          v-for="(player, index) in team.players"
          :key="index"
          class="py-2 mb-1"
      >
        <PlayerSetup
            :player="player"
            @remove-player="removePlayer(team, player)"
            :can-remove="team.players.length > 2"
        />
      </div>

      <div class="pt-2">
        <button
            type="button"
            class="px-2 py-0.5 border-2 border-gray-200 shadow-sm rounded-md text-gray-700"
            @click="addPlayer(team)"
        >
          + Voeg speler toe
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Team from "~/models/Team";
import PlayerSetup from "~/components/PlayerSetup.vue";
import Player from "~/models/Player";
import RemoveButton from "~/components/RemoveButton.vue";
import Game from "~/models/Game";

const emit = defineEmits(['remove-team']);

const props = defineProps({
  index: {
    type: Number,
    required: true,
  },

  team: {
    type: Team,
    required: true,
  },

  canRemove: {
    type: Boolean,
    required: true,
  },

  game: {
    type: Game,
    required: true,
  },
});

function addPlayer(team: Team) {
  team.addPlayer(new Player('Speler ' + (props.game?.playerCount() + 1)));
}

function removeTeam() {
  emit('remove-team');
}

function removePlayer(team: Team, player: Player) {
  team.removePlayer(player);
}
</script>

<style scoped>

</style>

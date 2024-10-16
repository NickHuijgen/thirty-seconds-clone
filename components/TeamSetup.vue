<template>
  <div class="relative">
    <RemoveButton
        :can-remove="canRemove"
        @click="removeTeam()"
    />

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

    <div class="pt-8">
      <div class="grid grid-cols-2">
        <p>
          Spelers
        </p>

        <button
            type="button"
            class="font-semibold rounded bg-gradient-to-br text-white shadow-2xl hover:bg-gradient-to-tr from-emerald-600 to-emerald-800"
            @click="addPlayer(team)"
        >
          Voeg speler toe
        </button>
      </div>

      <div
          v-for="(player, index) in team.players"
          :key="index"
          class="shadow-xl p-4 mb-1"
      >
        <PlayerSetup
            :player="player"
            @remove-player="removePlayer(team, player)"
            :can-remove="team.players.length > 2"
        />
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

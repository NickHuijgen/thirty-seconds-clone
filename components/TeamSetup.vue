<template>
  <div
      class="relative rounded-2xl border-l-8 bg-white p-4 shadow-sm"
      :class="TEAM_STYLES[team.colour].border"
  >
    <RemoveButton
        class="absolute top-1 right-1"
        :can-remove="canRemove"
        label="Verwijder team"
        @click="removeTeam()"
    />

    <label
        :for="inputId"
        class="mb-1 block text-sm font-semibold"
        :class="TEAM_STYLES[team.colour].text"
    >
      Team {{ index + 1 }}
    </label>
    <input
        v-model="team.name"
        type="text"
        name="team_name"
        :id="inputId"
        placeholder="Team naam"
        class="h-12 w-full rounded-xl border-2 px-3 text-lg font-semibold"
    >

    <p class="mt-4 mb-2 text-sm font-semibold text-gray-600">
      Spelers
    </p>

    <div class="space-y-2">
      <PlayerSetup
          v-for="(player, index) in team.players"
          :key="index"
          :player="player"
          @remove-player="removePlayer(team, player)"
          :can-remove="team.players.length > 2"
      />
    </div>

    <button
        type="button"
        class="mt-3 flex h-11 items-center gap-1 rounded-xl px-3 font-semibold"
        :class="[TEAM_STYLES[team.colour].soft, TEAM_STYLES[team.colour].text]"
        @click="addPlayer(team)"
    >
      <span
          class="material-icons text-xl!"
          aria-hidden="true"
      >
        person_add
      </span>
      Voeg speler toe
    </button>
  </div>
</template>

<script setup lang="ts">
import { useId } from "vue";
import Team from "~/models/Team";
import PlayerSetup from "~/components/PlayerSetup.vue";
import Player from "~/models/Player";
import RemoveButton from "~/components/RemoveButton.vue";
import Game from "~/models/Game";
import { TEAM_STYLES } from "~/utils/teamColours";

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

const inputId = useId();

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

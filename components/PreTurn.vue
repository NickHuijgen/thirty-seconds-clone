<template>
  <div
      class="text-white [&_:focus-visible]:outline-white"
      :class="style.solid"
  >
    <Screen>
      <div class="pt-4 text-center">
        <p class="text-lg font-semibold text-white/80">
          {{ team.name }} is aan de beurt
        </p>
        <p class="mt-6 text-xl">
          Geef de telefoon aan
        </p>
        <p class="mt-1 text-5xl font-extrabold break-words motion-safe:animate-bounce-in">
          {{ team.activePlayer()?.name }}
        </p>
      </div>

      <div class="mt-8 rounded-2xl bg-white p-4 text-gray-900 shadow-lg">
        <Leaderboard :game="game" />
      </div>

      <dl class="mt-6 space-y-2 text-white/90">
        <div>
          <dt class="text-sm font-semibold text-white/70">
            Deze spelers mogen raden
          </dt>
          <dd>{{ team.inactivePlayers().map(player => player.name).join(', ') }}</dd>
        </div>
        <div>
          <dt class="text-sm font-semibold text-white/70">
            Volgende beurt
          </dt>
          <dd>{{ game.nextUpTeam().activePlayer()?.name }} van {{ game.nextUpTeam().name }}</dd>
        </div>
      </dl>

      <template #action>
        <ActionButton
            class="bg-white"
            :class="style.text"
            @click="game.startTurn()"
        >
          Start beurt
        </ActionButton>
      </template>
    </Screen>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Game from "~/models/Game";
import Leaderboard from "~/components/Leaderboard.vue";
import Screen from "~/components/Screen.vue";
import ActionButton from "~/components/ActionButton.vue";
import { TEAM_STYLES } from "~/utils/teamColours";

const props = defineProps({
  game: {
    type: Game,
    required: true,
  },
});

const team = computed(() => props.game.activeTeam());
const style = computed(() => TEAM_STYLES[team.value.colour]);
</script>

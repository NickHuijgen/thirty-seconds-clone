<template>
  <div class="pt-4">
    <div
        v-for="(team, index) in sortedTeams"
        :key="index"
        class="flex justify-between py-2"
    >
      <div>
        {{ team.name }}:
      </div>
      <div>
        {{ team.score }} / {{ game.max_score }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Game from "~/models/Game";

const props = defineProps({
  game: {
    type: Game,
    required: true,
  },
});

// Sort a copy, so rendering never reorders the game's own teams array
const sortedTeams = computed(() => [...props.game.teams].sort((a, b) => b.score - a.score));
</script>

<style scoped>

</style>

<template>
  <div class="pt-4">
    <div
        v-for="(team, index) in game.teams.sort((a, b) => b.score - a.score)"
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

defineProps({
  game: {
    type: Game,
    required: true,
  },
});
</script>

<style scoped>

</style>

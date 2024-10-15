<template>
  <div>
    <PostTurn
      v-if="game.is_applying_score"
      :game="game"
    />
    <PreTurn
      v-else-if="game.turn_timer === 0"
      :game="game"
    />
    <ActiveTurn
      v-else
      :game="game"
    />
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
</script>

<style scoped>

</style>

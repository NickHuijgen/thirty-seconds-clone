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
import ActiveTurn from "~/components/ActiveTurn.vue";
import PostTurn from "~/components/PostTurn.vue";
import PreTurn from "~/components/PreTurn.vue";

defineProps({
  game: {
    type: Game,
    required: true,
  },
});
</script>

<style scoped>

</style>

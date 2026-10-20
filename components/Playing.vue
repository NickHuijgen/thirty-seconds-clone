<template>
  <Transition
      name="screen"
      mode="out-in"
  >
    <PostTurn
        v-if="game.is_applying_score"
        key="post-turn"
        :game="game"
    />
    <PreTurn
        v-else-if="game.turn_timer === 0"
        key="pre-turn"
        :game="game"
    />
    <ActiveTurn
        v-else
        key="active-turn"
        :game="game"
    />
  </Transition>
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

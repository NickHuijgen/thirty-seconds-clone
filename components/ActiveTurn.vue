<template>
  <div class="justify-center">
    <div class="flex justify-center items-center">
      <div class="relative">
        <svg class="timer-circle" viewBox="0 0 36 36">
          <path
              class="circle-bg"
              d="M18 2.0845
             a 15.9155 15.9155 0 0 1 0 31.831
             a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
              class="circle"
              :stroke-dasharray="`${(game.turn_timer / 30) * 100}, 100`"
              d="M18 2.0845
             a 15.9155 15.9155 0 0 1 0 31.831
             a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <text x="18" y="20.35" class="timer-text">{{ game.turn_timer }}</text>
        </svg>
      </div>
    </div>
  </div>

  <div>
    <div
        v-for="(word, index) in game.active_words"
        :key="index"
    >
      {{ word }}
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
</script>

<style scoped>
.timer-circle {
  width: 100px;
  height: 100px;
}

.circle-bg {
  fill: none;
  stroke: #eee;
  stroke-width: 3.8;
}

.circle {
  fill: none;
  stroke: #4caf50;
  stroke-width: 2.8;
  stroke-linecap: round;
  transition: stroke-dasharray 0.3s;
}

.timer-text {
  fill: #333;
  font-size: 0.5em;
  text-anchor: middle;
}
</style>

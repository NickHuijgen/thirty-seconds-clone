<template>
  <div>
    {{ game }}
  </div>
</template>

<script setup lang="ts">
import Team from "~/models/Team";
import PlayerSetup from "~/components/PlayerSetup.vue";
import Player from "~/models/Player";
import RemoveButton from "~/components/RemoveButton.vue";
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

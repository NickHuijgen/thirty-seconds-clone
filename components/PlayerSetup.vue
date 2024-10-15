<template>
  <div class="relative">
    <RemoveButton
        :can-remove="canRemove"
        @click="removePlayer(player)"
    />

    <div>
      <input
          v-model="player.name"
          type="text"
          name="player_name"
          id="player_name"
          placeholder="Speler naam"
          class="w-full px-3 py-2 border rounded-md dark:border-gray-300 dark:bg-gray-50 dark:text-gray-800"
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import Player from "~/models/Player";

const emit = defineEmits(['remove-player']);

defineProps({
  player: {
    type: Player,
    required: true,
  },

  canRemove: {
    type: Boolean,
    required: true,
  },
});

function removePlayer() {
  emit('remove-player');
}
</script>

<style scoped>

</style>

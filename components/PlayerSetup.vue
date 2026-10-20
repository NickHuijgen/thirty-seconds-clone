<template>
  <div class="relative">
    <RemoveButton
        :can-remove="canRemove"
        label="Verwijder speler"
        @click="removePlayer()"
    />

    <div>
      <label
          :for="inputId"
          class="sr-only"
      >
        Speler naam
      </label>
      <input
          v-model="player.name"
          type="text"
          name="player_name"
          :id="inputId"
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

const inputId = useId();

function removePlayer() {
  emit('remove-player');
}
</script>

<style scoped>

</style>

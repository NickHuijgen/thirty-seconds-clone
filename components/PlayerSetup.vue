<template>
  <div class="relative">
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
        class="h-11 w-full rounded-xl border bg-gray-50 px-3"
        :class="canRemove ? 'pr-11' : ''"
    >

    <RemoveButton
        class="absolute top-1/2 right-0.5 -translate-y-1/2"
        :can-remove="canRemove"
        label="Verwijder speler"
        @click="removePlayer()"
    />
  </div>
</template>

<script setup lang="ts">
import { useId } from "vue";
import Player from "~/models/Player";
import RemoveButton from "~/components/RemoveButton.vue";

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

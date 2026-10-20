<template>
  <div>
    <div>
      <p class="text-center py-8">
        Selecteer de woorden die geraden zijn
      </p>
    </div>

    <div
        v-for="(word, index) in game.active_words"
        :key="index"
        class="p-2 w-full"
    >
      <button
          type="button"
          class="relative py-2 w-64 border cursor-pointer"
          :class="{
            'bg-green-100 border-green-500': selectedWords.includes(word),
            'bg-white': !selectedWords.includes(word),
          }"
          :aria-pressed="selectedWords.includes(word)"
          @click="toggleWordSelect(word)"
      >
        <span
            v-if="selectedWords.includes(word)"
            class="material-icons absolute left-2 top-1/2 -translate-y-1/2 text-lg text-green-700"
            aria-hidden="true"
        >
          check
        </span>
        <span class="block w-full text-center">
          {{ word }}
        </span>
      </button>
    </div>

    <div class="pt-6 flex justify-center">
      <button
          type="button"
          class="px-8 py-3 font-semibold rounded-sm bg-linear-to-br text-white shadow-2xl hover:bg-linear-to-tr from-emerald-600 to-emerald-800"
          @click="game.finishTurn(selectedWords.length)"
      >
        Klaar
      </button>
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

const selectedWords = ref<string[]>([]);

function toggleWordSelect(word: string) {
  if (selectedWords.value.includes(word)) {
    selectedWords.value = selectedWords.value.filter((w) => w !== word);
  } else {
    selectedWords.value.push(word);
  }
}
</script>

<style scoped>

</style>

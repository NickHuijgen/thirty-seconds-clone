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
      <div
          class="py-2 w-64 border pointer:cursor"
          :class="{
            'bg-green-100 border-green-500': selectedWords.includes(word),
            'bg-white': !selectedWords.includes(word),
          }"
          @click="toggleWordSelect(word)"
      >
        <p class="w-full text-center">
          {{ word }}
        </p>
      </div>
    </div>

    <div class="pt-6 flex justify-center">
      <button
          type="button"
          class="px-8 py-3 font-semibold rounded bg-gradient-to-br text-white shadow-2xl hover:bg-gradient-to-tr from-emerald-600 to-emerald-800"
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

const selectedWords = ref([]);

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

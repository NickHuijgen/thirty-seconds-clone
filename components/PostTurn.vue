<template>
  <!-- Time's up: the screen's own background flashes red and fades to grey. Deliberately not a
       fixed overlay: iOS Safari tints its toolbars with the colour of fixed elements at the screen's edge. -->
  <div class="bg-gray-50 text-gray-900 motion-safe:animate-flash">
    <Screen :scrollable="false">
      <header>
        <h1 class="text-3xl font-extrabold">
          Tijd is om!
        </h1>
        <p class="mt-1 text-gray-600">
          Selecteer de woorden die geraden zijn
        </p>
      </header>

      <!-- min-h-0 lets the cards shrink to fit short phones; the screen never scrolls -->
      <ul class="mt-6 flex min-h-0 flex-1 flex-col gap-3">
        <li
            v-for="(word, index) in game.active_words"
            :key="index"
            class="flex min-h-0 flex-1"
        >
          <button
              type="button"
              class="flex min-h-0 w-full flex-1 items-center gap-3 rounded-2xl border-2 px-4 text-left shadow-sm transition-colors"
              :class="selectedWords.includes(word)
                ? 'border-green-500 bg-green-100 motion-safe:animate-pop'
                : 'border-transparent bg-white'"
              :aria-pressed="selectedWords.includes(word)"
              @click="toggleWordSelect(word)"
          >
            <span
                class="material-icons shrink-0 text-gray-400"
                aria-hidden="true"
            >
              {{ categoryOf(index).icon }}
            </span>
            <span class="sr-only">{{ categoryOf(index).label }}:</span>
            <span class="line-clamp-2 flex-1 text-[clamp(1.25rem,3.4dvh,1.5rem)] leading-tight font-bold break-words">{{ word }}</span>
            <span
                class="material-icons shrink-0 text-green-700"
                :class="selectedWords.includes(word) ? '' : 'invisible'"
                aria-hidden="true"
            >
              check_circle
            </span>
          </button>
        </li>
      </ul>

      <template #action>
        <ActionButton
            class="bg-emerald-700 text-white"
            @click="game.finishTurn(selectedWords.length)"
        >
          Klaar
          <span class="font-normal text-emerald-100">· {{ selectedWords.length }} geraden</span>
        </ActionButton>
      </template>
    </Screen>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Game, { CATEGORIES } from "~/models/Game";
import { PAGE_GREY } from "~/utils/teamColours";
import Screen from "~/components/Screen.vue";
import ActionButton from "~/components/ActionButton.vue";
import { CATEGORY_INFO } from "~/utils/categories";
import { usePageColour } from "~/composables/usePageColour";

defineProps({
  game: {
    type: Game,
    required: true,
  },
});

const selectedWords = ref<string[]>([]);

usePageColour(() => PAGE_GREY);

// active_words holds one word per category, in CATEGORIES order
function categoryOf(index: number) {
  return CATEGORY_INFO[CATEGORIES[index]!];
}

function toggleWordSelect(word: string) {
  if (selectedWords.value.includes(word)) {
    selectedWords.value = selectedWords.value.filter((w) => w !== word);
  } else {
    selectedWords.value.push(word);
  }
}
</script>

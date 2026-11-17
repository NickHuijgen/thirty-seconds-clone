<template>
  <!-- Time's up: the screen's own background flashes red and fades to grey. Deliberately not a
       fixed overlay: iOS Safari tints its toolbars with the colour of fixed elements at the screen's edge. -->
  <div class="bg-gray-50 text-gray-900 motion-safe:animate-flash">
    <Screen :scrollable="false">
      <header>
        <h1 class="text-3xl font-extrabold">
          {{ reviewing ? 'Klopt het?' : vetoed ? 'Veto!' : 'Tijd is om!' }}
        </h1>
        <p class="mt-1 text-gray-600">
          {{ subtitle }}
        </p>
        <!-- The review's countdown, draining smoothly: updated every 200 ms, with a transition just as long -->
        <div
            v-if="reviewing"
            class="mt-3 h-2 overflow-hidden rounded-full bg-gray-200"
            aria-hidden="true"
        >
          <div
              class="h-full rounded-full bg-red-600 motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-linear"
              :style="{ width: `${reviewLeft! * 100}%` }"
          />
        </div>
      </header>

      <!-- min-h-0 lets the cards shrink to fit short phones; the screen never scrolls -->
      <ul class="mt-6 flex min-h-0 flex-1 flex-col gap-3">
        <li
            v-for="(word, index) in game.active_words"
            :key="index"
            class="flex min-h-0 flex-1"
        >
          <!-- Online, the other phones watch the describer's ticks come in, read-only -->
          <button
              type="button"
              class="flex min-h-0 w-full flex-1 items-center gap-3 rounded-2xl border-2 px-4 text-left shadow-sm transition-colors disabled:cursor-default"
              :class="guessed.includes(index)
                ? 'border-green-500 bg-green-100 motion-safe:animate-pop'
                : 'border-transparent bg-white'"
              :aria-pressed="guessed.includes(index)"
              :disabled="!canScore || reviewing"
              @click="emit('toggle-word', index)"
          >
            <span
                class="material-icons shrink-0 text-gray-400"
                aria-hidden="true"
            >
              {{ categoryOf(index).icon }}
            </span>
            <span class="sr-only">{{ categoryOf(index).label }}:</span>
            <span class="line-clamp-2 flex-1 text-[clamp(1.25rem,3.4dvh,1.5rem)] leading-snug font-bold break-words">{{ word }}</span>
            <span
                class="material-icons shrink-0 text-green-700"
                :class="guessed.includes(index) ? '' : 'invisible'"
                aria-hidden="true"
            >
              check_circle
            </span>
          </button>
        </li>
      </ul>

      <template
          v-if="reviewing && canVeto"
          #action
      >
        <ActionButton
            class="bg-red-700 text-white"
            @click="emit('veto')"
        >
          <span
              class="material-icons"
              aria-hidden="true"
          >
            thumb_down
          </span>
          Veto
        </ActionButton>
      </template>
      <template
          v-else-if="reviewing"
          #action
      >
        <p class="flex h-14 items-center justify-center font-semibold text-gray-600">
          {{ guessed.length }} geraden
        </p>
      </template>
      <template
          v-else-if="canScore"
          #action
      >
        <ActionButton
            class="bg-emerald-700 text-white"
            @click="emit('finish-turn')"
        >
          Klaar
          <span class="font-normal text-emerald-100">· {{ guessed.length }} geraden</span>
        </ActionButton>
      </template>
      <template
          v-else
          #action
      >
        <p class="flex h-14 items-center justify-center font-semibold text-gray-600">
          {{ guessed.length }} geraden
        </p>
      </template>
    </Screen>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from "vue";
import Game, { CATEGORIES } from "~/models/Game";
import { PAGE_GREY } from "~/utils/teamColours";
import Screen from "~/components/Screen.vue";
import ActionButton from "~/components/ActionButton.vue";
import { CATEGORY_INFO } from "~/utils/categories";
import { usePageColour } from "~/composables/usePageColour";

const props = defineProps({
  game: {
    type: Game,
    required: true,
  },
  // Indexes into game.active_words that are ticked as guessed
  guessed: {
    type: Array as PropType<number[]>,
    required: true,
  },
  // Online, only the describer (or the host in their place) ticks the words
  canScore: {
    type: Boolean,
    default: true,
  },
  scorerName: {
    type: String,
    default: '',
  },
  // Online: how much of the review after "Klaar" is left (1 to 0), while the other teams can veto;
  // null outside it
  reviewLeft: {
    type: Number as PropType<number | null>,
    default: null,
  },
  // This turn was vetoed: the describer scores again, and that counts straight away
  vetoed: {
    type: Boolean,
    default: false,
  },
  canVeto: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits<{ 'toggle-word': [index: number], 'finish-turn': [], 'veto': [] }>();

const reviewing = computed(() => props.reviewLeft !== null);

const subtitle = computed(() => {
  if (reviewing.value) {
    return props.canVeto ? 'Niet eens met de punten? Geef een veto.' : 'De andere teams kunnen nog een veto geven…';
  }
  if (props.vetoed) {
    return props.canScore
      ? 'Selecteer opnieuw de woorden die geraden zijn. Dit telt meteen.'
      : `${props.scorerName} telt de punten opnieuw…`;
  }

  return props.canScore ? 'Selecteer de woorden die geraden zijn' : `${props.scorerName} telt de punten…`;
});

usePageColour(() => PAGE_GREY);

// active_words holds one word per category, in CATEGORIES order
function categoryOf(index: number) {
  return CATEGORY_INFO[CATEGORIES[index]!];
}

</script>

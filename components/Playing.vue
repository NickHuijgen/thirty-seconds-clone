<template>
  <Transition
      name="screen"
      mode="out-in"
  >
    <PostTurn
        v-if="game.is_applying_score"
        key="post-turn"
        :game="game"
        :guessed="guessed"
        :can-score="canScore"
        :scorer-name="scorerName"
        @toggle-word="index => emit('toggle-word', index)"
        @finish-turn="emit('finish-turn')"
    />
    <PreTurn
        v-else-if="game.turn_timer === 0"
        key="pre-turn"
        :game="game"
        :online="online"
        :is-describer="isDescriber"
        :is-guesser="isGuesser"
        @start-turn="emit('start-turn')"
    >
      <template #top>
        <slot name="pre-turn-top" />
      </template>
      <slot name="pre-turn" />
    </PreTurn>
    <ActiveTurn
        v-else
        key="active-turn"
        :game="game"
        :is-describer="isDescriber"
        :is-guesser="isGuesser"
        @end-turn="emit('end-turn')"
    />
  </Transition>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import Game from "~/models/Game";
import ActiveTurn from "~/components/ActiveTurn.vue";
import PostTurn from "~/components/PostTurn.vue";
import PreTurn from "~/components/PreTurn.vue";

// The screens of a turn. They don't change the game themselves: they emit what the player did, and the
// page decides what that means (pages/game.vue on one phone, pages/online.vue through the server).
defineProps({
  game: {
    type: Game,
    required: true,
  },
  guessed: {
    type: Array as PropType<number[]>,
    required: true,
  },
  online: {
    type: Boolean,
    default: false,
  },
  isDescriber: {
    type: Boolean,
    default: true,
  },
  isGuesser: {
    type: Boolean,
    default: false,
  },
  canScore: {
    type: Boolean,
    default: true,
  },
  scorerName: {
    type: String,
    default: '',
  },
});

const emit = defineEmits<{
  'start-turn': [],
  'end-turn': [],
  'toggle-word': [index: number],
  'finish-turn': [],
}>();
</script>
